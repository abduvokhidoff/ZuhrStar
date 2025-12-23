// src/pages/GroupStudents.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Users, Search, RefreshCw, UserPlus, ArrowLeft, Pencil, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { setCredentials } from "../../redux/authSlice";

const API_BASE =
  import.meta?.env?.VITE_API_URL?.replace(/\/$/, "") ||
  "https://zuhr-star-production.up.railway.app";

const cls = (...a) => a.filter(Boolean).join(" ");

// YYYY-MM-DD (UTC) — API dagi date bilan barqaror solishtirish uchun
const isoDate = (d) => new Date(d).toISOString().slice(0, 10);

export default function GroupStudents() {
  const navigate = useNavigate();
  const { name: routeGroupName } = useParams();
  const { state } = useLocation();
  const dispatch = useDispatch();
  const { accessToken, refreshToken } = useSelector((s) => s.auth);

  // DATA
  const [group, setGroup] = useState(state?.groupSnapshot || null);
  const [allGroups, setAllGroups] = useState([]);
  const [students, setStudents] = useState([]);
  // Attendance (bugungi)
  const [attendanceMap, setAttendanceMap] = useState({}); // { [student_id]: true|false }

  // UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Add/Attach modal
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState("attach"); // attach | create
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  // attach
  const [attachSearch, setAttachSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // create
  const [form, setForm] = useState({
    name: "",
    surname: "",
    student_phone: "",
    parents_phone: "",
    birth_date: "",
    gender: "",
    note: "",
    status: "active",
  });

  // edit
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    student_id: "",
    name: "",
    surname: "",
    student_phone: "",
    parents_phone: "",
    birth_date: "",
    gender: "",
    note: "",
    status: "active",
  });

  // ---------- AUTH ----------
  const refreshAccessToken = async () => {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Refresh non-JSON: ${text.slice(0, 160)}`);
    }
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    dispatch(
      setCredentials({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      })
    );
    return data.accessToken;
  };

  const fetchWithAuth = async (url, options = {}) => {
    const make = (t) =>
      fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${t}`,
          ...(options.headers || {}),
        },
      });

    let token = accessToken;
    let res = await make(token);
    if (res.status === 401 && refreshToken) {
      token = await refreshAccessToken();
      res = await make(token);
    }
    const txt = await res.text();
    if (!res.ok) {
      try {
        const j = JSON.parse(txt);
        throw new Error(
          `HTTP ${res.status} ${res.statusText}${j?.message ? " — " + j.message : ""}`
        );
      } catch {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
    }
    try {
      return txt ? JSON.parse(txt) : null;
    } catch {
      return null;
    }
  };

  const groupIdStr = group?.group_id ? String(group.group_id) : null;

  // ---------- LOAD ----------
  const loadAttendanceToday = async (gid) => {
    if (!gid) return setAttendanceMap({});
    try {
      // Hozircha oddiy: hammasini olib, bugungi + shu guruh bo‘yicha filtrlash
      const list = await fetchWithAuth(`${API_BASE}/api/attendance`);
      const arr = Array.isArray(list) ? list : (list?.data ?? []);
      const today = isoDate(new Date());
      const filtered = arr.filter(
        (r) =>
          String(r.group_id) === String(gid) &&
          r.date &&
          isoDate(r.date) === today
      );
      // Agar bir talaba uchun bir nechta yozuv bo‘lsa — eng so‘nggisini olamiz (updatedAt bo‘yicha)
      const map = {};
      filtered
        .sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt))
        .forEach((r) => {
          map[r.student_id] = !!r.status; // true = keldi, false = kelmadi
        });
      setAttendanceMap(map);
    } catch (e) {
      console.error(e);
      // Davomat muammo bo‘lsa ham, sahifa ishlayversin
      setAttendanceMap({});
    }
  };

  const loadAll = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");

    try {
      const [groupsRes, studentsRes] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/groups`),
        fetchWithAuth(`${API_BASE}/api/students`),
      ]);

      const groups = Array.isArray(groupsRes) ? groupsRes : [];
      setAllGroups(groups);

      const decoded = decodeURIComponent(routeGroupName || "");
      const found =
        state?.groupSnapshot ||
        groups.find((g) => (g.name || "") === decoded) ||
        null;

      setGroup(found);
      setStudents(Array.isArray(studentsRes) ? studentsRes : []);

      // Davomat (bugungi) — guruh ma’lum bo‘lsa chaqiramiz
      const gid = found?.group_id ? String(found.group_id) : null;
      await loadAttendanceToday(gid);
    } catch (e) {
      console.error(e);
      setError("Ma'lumotlarni yuklashda xatolik yuz berdi.");
      setAttendanceMap({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, routeGroupName]);

  // Guruh o‘zgarsa (masalan, state orqali), davomatni qayta olamiz
  useEffect(() => {
    if (groupIdStr) loadAttendanceToday(groupIdStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupIdStr]);

  // ------- Derivatives -------
  const groupStudents = useMemo(() => {
    if (!groupIdStr) return [];
    return students.filter((s) =>
      Array.isArray(s.groups) ? s.groups.map(String).includes(groupIdStr) : false
    );
  }, [students, groupIdStr]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return groupStudents;
    return groupStudents.filter((s) => {
      const hay = `${s.surname || ""} ${s.name || ""} ${s.student_phone || ""} ${(s.status || "")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [groupStudents, searchTerm]);

  // список для “attach”
  const attachList = useMemo(() => {
    const q = attachSearch.trim().toLowerCase();
    return students
      .filter((s) => !Array.isArray(s.groups) || !s.groups.map(String).includes(groupIdStr || ""))
      .filter((s) => {
        const hay = `${s.surname || ""} ${s.name || ""} ${s.student_phone || ""}`.toLowerCase();
        return hay.includes(q);
      });
  }, [students, attachSearch, groupIdStr]);

  // ---------- ACTIONS ----------
  const openAdd = () => {
    setModalError("");
    setSelectedStudentId("");
    setForm({
      name: "",
      surname: "",
      student_phone: "",
      parents_phone: "",
      birth_date: "",
      gender: "",
      note: "",
      status: "active",
    });
    setTab("attach");
    setModalOpen(true);
  };

  const attachExisting = async (e) => {
    e.preventDefault();
    if (!groupIdStr) return setModalError("Guruhda group_id yo‘q.");
    if (!selectedStudentId) return setModalError("O‘quvchini tanlang.");

    try {
      setSaving(true);
      const current = await fetchWithAuth(`${API_BASE}/api/students/${selectedStudentId}`);
      if (!current) throw new Error("Student not found");

      const curGroups = Array.isArray(current.groups) ? current.groups.map(String) : [];
      if (!curGroups.includes(groupIdStr)) curGroups.push(groupIdStr);

      const payload = {
        name: current.name ?? "",
        surname: current.surname ?? "",
        student_phone: current.student_phone ?? "",
        parents_phone: current.parents_phone ?? "",
        birth_date: current.birth_date ?? "",
        gender: current.gender ?? "",
        note: current.note ?? "",
        status: current.status ?? "active",
        imgURL: current.imgURL ?? undefined,
        group_attached: true,
        groups: curGroups,
      };

      await fetchWithAuth(`${API_BASE}/api/students/${selectedStudentId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setStudents((prev) =>
        prev.map((x) =>
          (x.student_id || x._id) === selectedStudentId ? { ...x, ...current, groups: curGroups } : x
        )
      );
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      setModalError("Guruhga biriktirishda xatolik yuz berdi.");
    } finally {
      setSaving(false);
    }
  };

  const createAndAttach = async (e) => {
    e.preventDefault();
    if (!groupIdStr) return setModalError("Guruhda group_id yo‘q.");
    if (!form.name.trim() || !form.surname.trim() || !form.student_phone.trim()) {
      return setModalError("Familiya, Ism va Telefon majburiy.");
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        surname: form.surname.trim(),
        student_phone: form.student_phone.trim(),
        parents_phone: form.parents_phone.trim(),
        birth_date: form.birth_date.trim(),
        gender: form.gender.trim(),
        note: form.note.trim(),
        status: form.status || "active",
        group_attached: true,
        groups: [groupIdStr],
      };

      const created = await fetchWithAuth(`${API_BASE}/api/students`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const newS = Array.isArray(created) ? created[0] : created?.data ?? created;
      if (newS) setStudents((prev) => [newS, ...prev]);

      setModalOpen(false);
    } catch (err) {
      console.error(err);
      setModalError("Yangi o‘quvchini yaratishda xatolik yuz berdi.");
    } finally {
      setSaving(false);
    }
  };

  // ----- Edit / Delete -----
  const openEdit = (s) => {
    setEditError("");
    setEditForm({
      student_id: s.student_id || s._id || "",
      name: s.name || "",
      surname: s.surname || "",
      student_phone: s.student_phone || "",
      parents_phone: s.parents_phone || "",
      birth_date: (s.birth_date || "").slice(0, 10),
      gender: s.gender || "",
      note: s.note || "",
      status: s.status || "active",
    });
    setEditOpen(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.student_id) return setEditError("Talaba ID topilmadi.");
    try {
      setEditSaving(true);
      const payload = {
        name: editForm.name.trim(),
        surname: editForm.surname.trim(),
        student_phone: editForm.student_phone.trim(),
        parents_phone: editForm.parents_phone?.trim() || undefined,
        birth_date: editForm.birth_date?.trim() || undefined,
        gender: editForm.gender?.trim() || undefined,
        note: editForm.note?.trim() || undefined,
        status: editForm.status || "active",
      };
      await fetchWithAuth(`${API_BASE}/api/students/${editForm.student_id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setStudents((prev) =>
        prev.map((x) =>
          (x.student_id || x._id) === editForm.student_id ? { ...x, ...payload } : x
        )
      );
      setEditOpen(false);
    } catch (err) {
      console.error(err);
      setEditError("O‘quvchini yangilashda xatolik yuz berdi.");
    } finally {
      setEditSaving(false);
    }
  };

  const deleteStudent = async (s) => {
    const id = s.student_id || s._id;
    if (!id) return;
    if (!window.confirm("Ushbu o‘quvchini butunlay o‘chirishni tasdiqlaysizmi?")) return;
    try {
      await fetchWithAuth(`${API_BASE}/api/students/${id}`, { method: "DELETE" });
      setStudents((prev) => prev.filter((x) => (x.student_id || x._id) !== id));
    } catch (err) {
      console.error(err);
      alert("O‘chirishda xatolik yuz berdi.");
    }
  };

  // ---------- RENDER ----------
  const total = filtered.length;
  const active = filtered.filter((x) => (x.status || "").toLowerCase() === "active").length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-2 rounded-lg hover:bg-gray-100"
              title="Orqaga"
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-xl font-semibold text-gray-800">
              {group?.name || decodeURIComponent(routeGroupName || "Guruh")}
            </h1>
          </div>
          <div className="text-sm text-gray-500">
            {group?.course ? `${group.course}` : "Guruh o‘quvchilari"}
          </div>
        </div>

        {/* Info under header */}
        {group && (
          <div className="px-1 pt-3 text-sm text-gray-600">
            <span className="mr-4">
              <b>Teacher:</b> {group.teacher_fullName || "—"}
            </span>
            <span className="mr-4">
              <b>Kunlar:</b>{" "}
              {group.days
                ? [
                  group.days.odd_days ? "Toq" : null,
                  group.days.even_days ? "Juft" : null,
                  group.days.every_days ? "Har kuni" : null,
                ].filter(Boolean).join(", ")
                : "—"}
            </span>
            <span className="mr-4">
              <b>Vaqt:</b>{" "}
              {group.start_time && group.end_time
                ? `${group.start_time}–${group.end_time}`
                : group.start_time || group.end_time || "—"}
            </span>
          </div>
        )}
      </div>

      {/* Stats + Toolbar */}
      <div className="p-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-6 border-l-4 border-emerald-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800 mb-1">{total}</div>
                <div className="text-sm text-gray-500 uppercase font-medium">JAMI O‘QUVCHILAR</div>
              </div>
              <div className="text-emerald-500">
                <Users className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800 mb-1">{active}</div>
                <div className="text-sm text-gray-500 uppercase font-medium">FAOL</div>
              </div>
              <div className="text-blue-500">
                <Users className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-orange-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800 mb-1">{total - active}</div>
                <div className="text-sm text-gray-500 uppercase font-medium">NOFAOL</div>
              </div>
              <div className="text-orange-500">
                <Users className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Qidirish ..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAll}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="Yuklashni yangilash (davomat bilan)"
            >
              <RefreshCw className="w-4 h-4" />
              Yangilash
            </button>
            <button
              onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <UserPlus className="w-4 h-4" />
              O‘quvchi qo‘shish
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 mb-6 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={loadAll}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Qayta urinish
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <div className="grid grid-cols-10 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div>#</div>
              <div className="col-span-3">F.I.Sh</div>
              <div>Telefon</div>
              <div>Jinsi</div>
              <div>Status</div>
              {/* NEW: Davomat (bugun) */}
              <div>Davomat</div>
              <div>ID</div>
              <div className="text-center">Amallar</div>
            </div>
          </div>

          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                <div className="text-gray-500">Yuklanmoqda...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Bu guruhda hozircha talabalar yo‘q.
              </div>
            ) : (
              filtered.map((s, i) => {
                const full = `${s.surname || ""} ${s.name || ""}`.trim() || "—";
                const statusOk = (s.status || "").toLowerCase() === "active";
                const sid = s.student_id || s._id;
                const came = attendanceMap[sid]; // undefined | true | false

                return (
                  <div className="px-6 py-3" key={sid || i}>
                    <div className="grid grid-cols-10 gap-4 items-center text-sm">
                      <div className="font-medium">{i + 1}</div>
                      <div className="col-span-3 font-medium text-gray-900">{full}</div>
                      <div className="text-gray-700">{s.student_phone || s.phone || "—"}</div>
                      <div className="text-gray-700">{s.gender || "—"}</div>
                      <div>
                        <span
                          className={cls(
                            "px-2 py-0.5 rounded text-white text-xs",
                            statusOk ? "bg-green-500" : "bg-red-500"
                          )}
                        >
                          {s.status || "—"}
                        </span>
                      </div>

                      {/* NEW: Davomat (только иконка) */}
                      <div className="flex items-center justify-start">
                        {came === true ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" title="Пришел" />
                        ) : came === false ? (
                          <XCircle className="w-5 h-5 text-red-600" title="Не пришел" />
                        ) : (
                          <span className="text-gray-300" title="Нет данных">—</span>
                        )}
                      </div>


                      <div className="text-gray-500">{sid || "—"}</div>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openEdit(s)}
                          className="w-9 h-9 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center transition-colors"
                          title="Tahrirlash"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteStudent(s)}
                          className="w-9 h-9 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center transition-colors"
                          title="O‘chirish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* Add / Attach Modal */}
      {modalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-[720px] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <button
                className={cls(
                  "px-4 py-2 rounded-lg border",
                  tab === "attach" ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-gray-200"
                )}
                onClick={() => setTab("attach")}
              >
                Mavjud o‘quvchini biriktirish
              </button>
              <button
                className={cls(
                  "px-4 py-2 rounded-lg border",
                  tab === "create" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-white border-gray-200"
                )}
                onClick={() => setTab("create")}
              >
                Yangi o‘quvchi yaratish
              </button>
            </div>

            {tab === "attach" ? (
              <form onSubmit={attachExisting}>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="O‘quvchi qidirish (F.I.Sh yoki telefon)..."
                    className="pl-10 pr-4 py-2 border border-gray-300  rounded-lg w-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={attachSearch}
                    onChange={(e) => setAttachSearch(e.target.value)}
                  />
                </div>

                <div className="rounded-lg divide-y max-h-72 overflow-auto">
                  {attachList.length ? (
                    attachList.map((s) => {
                      const full =
                        `${s?.surname || ""} ${s?.name || ""}`.trim() ||
                        s?.student_id ||
                        "-";
                      return (
                        <label
                          key={s.student_id || s._id}
                          className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="student"
                            className="accent-blue-600"
                            value={s.student_id || s._id}
                            checked={selectedStudentId === (s.student_id || s._id)}
                            onChange={() => setSelectedStudentId(s.student_id || s._id)}
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{full}</div>
                            <div className="text-xs text-gray-500">
                              {s.student_phone || "—"} · ID: {s.student_id || s._id}
                            </div>
                          </div>
                        </label>
                      );
                    })
                  ) : (
                    <div className="px-3 py-6 text-center text-gray-500">
                      Mos o‘quvchilar topilmadi
                    </div>
                  )}
                </div>

                {modalError && <div className="mt-3 text-sm text-red-600">{modalError}</div>}

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-60 inline-flex items-center gap-2"
                  >
                    <UserPlus size={16} />
                    {saving ? "Qo‘shilmoqda..." : "Biriktirish"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={createAndAttach}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    name="surname"
                    placeholder="Familiya *"
                    value={form.surname}
                    onChange={(e) => setForm((p) => ({ ...p, surname: e.target.value }))}
                    required
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    name="name"
                    placeholder="Ism *"
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    required
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    name="student_phone"
                    placeholder="Telefon (o‘quvchi) *"
                    value={form.student_phone}
                    onChange={(e) => setForm((p) => ({ ...p, student_phone: e.target.value }))}
                    required
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    name="parents_phone"
                    placeholder="Telefon (ota-ona)"
                    value={form.parents_phone}
                    onChange={(e) => setForm((p) => ({ ...p, parents_phone: e.target.value }))}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    name="birth_date"
                    placeholder="Tug‘ilgan sana (YYYY-MM-DD)"
                    value={form.birth_date}
                    onChange={(e) => setForm((p) => ({ ...p, birth_date: e.target.value }))}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value }))}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Jinsi</option>
                    <option value="male">Erkak</option>
                    <option value="female">Ayol</option>
                  </select>
                </div>

                <textarea
                  name="note"
                  placeholder="Izoh"
                  rows={3}
                  value={form.note}
                  onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-4"
                />

                {modalError && <div className="mt-3 text-sm text-red-600">{modalError}</div>}

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Bekor qilish
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-60"
                  >
                    {saving ? "Saqlanmoqda..." : "Yaratish va biriktirish"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <form
            onSubmit={saveEdit}
            className="bg-white p-6 rounded-xl shadow-xl w-[560px] max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-semibold mb-4">O‘quvchini tahrirlash</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                placeholder="Ism *"
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                placeholder="Familiya *"
                value={editForm.surname}
                onChange={(e) => setEditForm((p) => ({ ...p, surname: e.target.value }))}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                placeholder="Telefon (o‘quvchi) *"
                value={editForm.student_phone}
                onChange={(e) => setEditForm((p) => ({ ...p, student_phone: e.target.value }))}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <input
                placeholder="Telefon (ota-ona)"
                value={editForm.parents_phone}
                onChange={(e) => setEditForm((p) => ({ ...p, parents_phone: e.target.value }))}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                placeholder="Tug‘ilgan sana"
                value={editForm.birth_date}
                onChange={(e) => setEditForm((p) => ({ ...p, birth_date: e.target.value }))}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={editForm.gender}
                onChange={(e) => setEditForm((p) => ({ ...p, gender: e.target.value }))}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Jinsi</option>
                <option value="male">Erkak</option>
                <option value="female">Ayol</option>
              </select>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value }))}
                className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="active">Faol</option>
                <option value="inactive">Nofaol</option>
                <option value="muzlagan">Muzlagan</option>
              </select>
            </div>

            <textarea
              placeholder="Izoh"
              rows={3}
              value={editForm.note}
              onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))}
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-4"
            />

            {editError && <div className="mt-3 text-sm text-red-600">{editError}</div>}

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={editSaving}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-60"
              >
                {editSaving ? "Saqlanmoqda..." : "Saqlash"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

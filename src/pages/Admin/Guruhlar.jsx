// src/pages/Guruhlar.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Plus,
  Filter,
  Pencil,
  Trash2,
  Users,
  Search,
  Download,
  Upload,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { setCredentials } from "../../redux/authSlice";

const API_BASE =
  import.meta?.env?.VITE_API_URL?.replace(/\/$/, "") ||
  "https://zuhrstar-production.up.railway.app";

const cls = (...a) => a.filter(Boolean).join(" ");

const F0 = {
  name: "",
  course: "",
  teacher_fullName: "",
  branch: "",
  start_time: "",
  end_time: "",
  status: "active",
  days: { odd_days: false, even_days: true, every_days: false },
};

export default function Guruhlar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { accessToken, refreshToken } = useSelector((s) => s.auth);

  // DATA
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);

  // lists for selects
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [branches, setBranches] = useState([]);

  // UI/STATE
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(F0);
  const [selectedGroupName, setSelectedGroupName] = useState(null);

  // dropdown UI for course/teacher/branch
  const [showCoursesDropdown, setShowCoursesDropdown] = useState(false);
  const [showTeachersDropdown, setShowTeachersDropdown] = useState(false);
  const [showBranchesDropdown, setShowBranchesDropdown] = useState(false);

  // ---------- AUTH HELPERS ----------
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

  // ---------- LOAD DATA ----------
  const loadAll = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      const [g, s] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/groups`),
        fetchWithAuth(`${API_BASE}/api/students`),
      ]);
      setGroups(Array.isArray(g) ? g : []);
      setStudents(Array.isArray(s) ? s : []);
    } catch (e) {
      console.error(e);
      setError("Ma'lumotlarni yuklashda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  // fetch courses, teachers and branches for selects
  const loadLists = async () => {
    if (!accessToken) return;
    try {
      const [c, t, b] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/courses`),
        fetchWithAuth(`${API_BASE}/api/teachers`),
        fetchWithAuth(`${API_BASE}/api/branches`),
      ]);
      setCourses(Array.isArray(c) ? c : c?.courses || []);
      setTeachers(Array.isArray(t) ? t : t?.teachers || []);
      setBranches(Array.isArray(b) ? b : b?.branches || []);
    } catch (e) {
      console.error("Load lists error:", e);
    }
  };

  useEffect(() => {
    loadAll();
    loadLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.dropdown-container')) {
        setShowCoursesDropdown(false);
        setShowTeachersDropdown(false);
        setShowBranchesDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ---------- STATS ----------
  const totalGroups = groups.length;
  const activeGroups = groups.filter((g) => (g.status || "").toLowerCase() === "active").length;
  const emptyGroups = groups.filter((g) => !Array.isArray(g.students) || g.students.length === 0).length;
  const totalStudents = students.length;

  // ---------- FILTERING ----------
  const filteredGroups = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => {
      const hay = `${g.name || ""} ${g.course || ""} ${g.teacher_fullName || ""} ${g.branch || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [groups, searchTerm]);

  // ---------- select filtering helpers ----------
  const filteredCourses = useMemo(() => {
    const q = (form.course || "").trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => (c.name || "").toLowerCase().includes(q));
  }, [form.course, courses]);

  const filteredTeachers = useMemo(() => {
    const q = (form.teacher_fullName || "").trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => (t.fullName || "").toLowerCase().includes(q));
  }, [form.teacher_fullName, teachers]);

  const filteredBranches = useMemo(() => {
    const q = (form.branch || "").trim().toLowerCase();
    if (!q) return branches;
    return branches.filter((b) => (b.title || "").toLowerCase().includes(q));
  }, [form.branch, branches]);

  // ---------- FORM ----------
  const openCreate = () => {
    setForm(F0);
    setIsEditing(false);
    setSelectedGroupName(null);
    setModalOpen(true);
  };

  const openEdit = (g) => {
    setForm({
      ...F0,
      name: g.name || "",
      course: g.course || "",
      teacher_fullName: g.teacher_fullName || "",
      branch: g.branch || "Asosiy filial",
      start_time: g.start_time || "",
      end_time: g.end_time || "",
      status: g.status || "active",
      days: g.days || { odd_days: false, even_days: true, every_days: false },
      _id: g._id || g.group_id || undefined,
    });
    setSelectedGroupName(g.name);
    setIsEditing(true);
    setModalOpen(true);
  };

  const onFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("days.")) {
      const k = name.split(".")[1];
      setForm((p) => ({
        ...p,
        days: { ...p.days, [k]: type === "checkbox" ? checked : !!value },
      }));
      return;
    }

    if (name === "start_time") {
      const newStart = value;
      setForm((p) => {
        const duration = getSelectedCourseDuration(p.course);
        const end = duration ? calculateEndDateFromString(newStart, duration) : p.end_time;
        return { ...p, start_time: newStart, end_time: end };
      });
      return;
    }

    setForm((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const getSelectedCourseDuration = (courseName) => {
    if (!courseName) return 0;
    const found = courses.find((c) => (c.name || "") === courseName || (c.name || "").toLowerCase() === courseName.toLowerCase());
    return found ? found.duration || 0 : 0;
  };

  const calculateEndDateFromString = (startStr, months) => {
    if (!startStr) return "";
    const start = new Date(startStr);
    if (Number.isNaN(start.getTime())) return "";
    start.setMonth(start.getMonth() + Number(months || 0));
    return start.toISOString().slice(0, 10);
  };

  // when user clicks a course in dropdown
  const selectCourse = (course) => {
    const groupNumber = 1000 + groups.length + 1;
    const namePrefix = (course.name?.[0] || "G").toUpperCase();
    const generatedName = `${namePrefix}-${groupNumber}`;

    const end = form.start_time
      ? calculateEndDateFromString(form.start_time, course.duration)
      : "";

    setForm((p) => ({
      ...p,
      course: course.name,
      name: generatedName,
      end_time: end,
    }));
    setShowCoursesDropdown(false);
  };

  // when user clicks a teacher in dropdown
  const selectTeacher = (teacher) => {
    setForm((p) => ({ ...p, teacher_fullName: teacher.fullName }));
    setShowTeachersDropdown(false);
  };

  // when user clicks a branch in dropdown
  const selectBranch = (branch) => {
    setForm((p) => ({ ...p, branch: branch.title }));
    setShowBranchesDropdown(false);
  };

  const saveGroup = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");

    const payload = {
      name: form.name.trim(),
      course: form.course.trim(),
      teacher_fullName: form.teacher_fullName.trim(),
      branch: form.branch.trim(),
      start_time: form.start_time.trim(),
      end_time: form.end_time.trim(),
      status: form.status,
      days: {
        odd_days: !!form.days?.odd_days,
        even_days: !!form.days?.even_days,
        every_days: !!form.days?.every_days,
      },
    };

    try {
      if (isEditing && selectedGroupName) {
        await fetchWithAuth(
          `${API_BASE}/api/groups/${encodeURIComponent(selectedGroupName)}`,
          {
            method: "PUT",
            body: JSON.stringify(payload),
          }
        );
        const fresh = await fetchWithAuth(`${API_BASE}/api/groups`);
        setGroups(Array.isArray(fresh) ? fresh : []);
      } else {
        const created = await fetchWithAuth(`${API_BASE}/api/groups`, {
          method: "POST",
          body: JSON.stringify(payload),
        });
        const newG = Array.isArray(created) ? created[0] : created?.data ?? created;
        setGroups((prev) => (newG ? [newG, ...prev] : prev));
      }
      setModalOpen(false);
    } catch (e2) {
      console.error(e2);
      setError("Guruhni saqlashda xatolik yuz berdi.");
    } finally {
      setSaving(false);
    }
  };

  const deleteGroup = async (name) => {
    if (!window.confirm("Guruhni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await fetchWithAuth(`${API_BASE}/api/groups/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      setGroups((prev) => prev.filter((g) => g.name !== name));
    } catch (e) {
      console.error(e);
      setError("Guruhni o'chirishda xatolik yuz berdi.");
    }
  };

  // ---------- NAVIGATION TO GROUP STUDENTS ----------
  const goToGroup = (g) => {
    const name = g.name || "";
    navigate(`/admin/guruhlar/${encodeURIComponent(name)}/students`, {
      state: { groupSnapshot: g },
    });
  };

  // ---------- RENDER ----------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">GURUHLAR</h1>
          <div className="text-sm text-gray-500">Guruhlar</div>
        </div>

        {/* Modal Create/Edit */}
        {modalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
            <form
              onSubmit={saveGroup}
              className="bg-white p-6 rounded-xl shadow-xl w-[600px] max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-semibold mb-4">
                {isEditing ? "Guruhni tahrirlash" : "Yangi guruh yaratish"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* GROUP NAME (read-only auto) */}
                <input
                  name="name"
                  placeholder="Guruh nomi (avtomatik)"
                  value={form.name}
                  readOnly
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
                />

                {/* KURS - input with dropdown */}
                <div className="relative dropdown-container">
                  <input
                    name="course"
                    placeholder="Kurs nomi qidirish..."
                    value={form.course}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((p) => ({ ...p, course: val }));
                      setShowCoursesDropdown(true);
                    }}
                    onFocus={() => setShowCoursesDropdown(true)}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  {showCoursesDropdown && (
                    <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-44 overflow-y-auto z-10 shadow">
                      {filteredCourses.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">Topilmadi</div>
                      ) : (
                        filteredCourses.map((c) => (
                          <div
                            key={c.course_id || c._id || c.name}
                            onClick={() => selectCourse(c)}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                          >
                            <div className="font-medium">{c.name}</div>
                            <div className="text-xs text-gray-500">
                              {c.duration} {c.duration_type || "oy"}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* MENTOR - input with dropdown */}
                <div className="relative dropdown-container">
                  <input
                    name="teacher_fullName"
                    placeholder="Mentor F.I.Sh qidirish..."
                    value={form.teacher_fullName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((p) => ({ ...p, teacher_fullName: val }));
                      setShowTeachersDropdown(true);
                    }}
                    onFocus={() => setShowTeachersDropdown(true)}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {showTeachersDropdown && (
                    <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-44 overflow-y-auto z-10 shadow">
                      {filteredTeachers.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">Topilmadi</div>
                      ) : (
                        filteredTeachers.map((t) => (
                          <div
                            key={t._id || t.email || t.fullName}
                            onClick={() => selectTeacher(t)}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                          >
                            <div className="font-medium">{t.fullName}</div>
                            <div className="text-xs text-gray-500">{t.phone || t.email}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* BRANCH - input with dropdown */}
                <div className="relative dropdown-container">
                  <input
                    name="branch"
                    placeholder="Filial qidirish..."
                    value={form.branch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setForm((p) => ({ ...p, branch: val }));
                      setShowBranchesDropdown(true);
                    }}
                    onFocus={() => setShowBranchesDropdown(true)}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {showBranchesDropdown && (
                    <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-44 overflow-y-auto z-10 shadow">
                      {filteredBranches.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">Topilmadi</div>
                      ) : (
                        filteredBranches.map((b) => (
                          <div
                            key={b._id || b.title}
                            onClick={() => selectBranch(b)}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                          >
                            <div className="font-medium">{b.title}</div>
                            {b.description && (
                              <div className="text-xs text-gray-500">{b.description}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* START DATE */}
                <input
                  name="start_time"
                  type="date"
                  placeholder="Boshlanish sanasi"
                  value={form.start_time}
                  onChange={onFormChange}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                {/* END DATE (AUTO) */}
                <input
                  name="end_time"
                  type="date"
                  placeholder="Tugash sanasi"
                  value={form.end_time}
                  readOnly
                  className="w-full border border-gray-300 p-3 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                />

                <select
                  name="status"
                  value={form.status}
                  onChange={onFormChange}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">Faol</option>
                  <option value="completed">Yakunlangan</option>
                  <option value="inactive">Nofaol</option>
                </select>
              </div>

              {/* Days Selection */}
              <div className="grid grid-cols-3 gap-3 mt-3">
                <label className="flex items-center gap-2 border rounded-lg px-3 py-2">
                  <input
                    type="checkbox"
                    name="days.odd_days"
                    checked={!!form.days?.odd_days}
                    onChange={onFormChange}
                  />
                  <span>Toq kunlar</span>
                </label>
                <label className="flex items-center gap-2 border rounded-lg px-3 py-2">
                  <input
                    type="checkbox"
                    name="days.even_days"
                    checked={!!form.days?.even_days}
                    onChange={onFormChange}
                  />
                  <span>Juft kunlar</span>
                </label>
                <label className="flex items-center gap-2 border rounded-lg px-3 py-2">
                  <input
                    type="checkbox"
                    name="days.every_days"
                    checked={!!form.days?.every_days}
                    onChange={onFormChange}
                  />
                  <span>Har kuni</span>
                </label>
              </div>

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
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-60"
                >
                  {isEditing ? "Yangilash" : "Yaratish"}
                </button>
              </div>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </form>
          </div>
        )}
      </div>

      {/* Статистика */}
      <div className="p-6">
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {totalGroups}
                </div>
                <div className="text-sm text-gray-500 uppercase font-medium">
                  GURUHLAR SONI
                </div>
              </div>
              <div className="text-blue-500">
                <Users className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-cyan-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {activeGroups}
                </div>
                <div className="text-sm text-gray-500 uppercase font-medium">
                  FAOL
                </div>
              </div>
              <div className="text-cyan-500">
                <Users className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-orange-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {emptyGroups}
                </div>
                <div className="text-sm text-gray-500 uppercase font-medium">
                  TALABASIZ GURUHLAR
                </div>
              </div>
              <div className="text-orange-500">
                <Users className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-emerald-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {totalStudents}
                </div>
                <div className="text-sm text-gray-500 uppercase font-medium">
                  JAMI O'QUVCHILAR
                </div>
              </div>
              <div className="text-emerald-500">
                <Users className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Панель действий */}
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

            <button
              onClick={() => setShowFilter((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Filter className="w-4 h-4 text-gray-500" />
              Filter
            </button>

            <div className="relative">
              <button
                onClick={() => setShowImportExport((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-sm hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <Download className="w-4 h-4" />
                Export
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>

              {showImportExport && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                  <button className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                    <Download className="w-4 h-4" />
                    Export Excel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAll}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RefreshCw className="w-4 h-4" />
              Yangilash
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <Plus className="w-4 h-4" />
              Guruh qo'shish
            </button>
          </div>
        </div>

        {/* Ошибка */}
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

        {/* Таблица */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Заголовок таблицы */}
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <div className="grid grid-cols-11 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div>#</div>
              <div className="col-span-3">Guruh nomi</div>
              <div>Kurs</div>
              <div>Mentor</div>
              <div>Kunlar</div>
              <div>Vaqt</div>
              <div className="text-center col-span-2">Amallar</div>
            </div>
          </div>

          {/* Тело таблицы */}
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                <div className="text-gray-500">Yuklanmoqda...</div>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Hech qanday guruh topilmadi
              </div>
            ) : (
              filteredGroups.map((g, idx) => {
                const key = g.group_id || g._id || g.name || idx;
                const daysTxt = g.days
                  ? [
                      g.days.odd_days ? "Toq" : null,
                      g.days.even_days ? "Juft" : null,
                      g.days.every_days ? "Har kuni" : null,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : "—";
                const timeTxt =
                  g.start_time && g.end_time
                    ? `${g.start_time}–${g.end_time}`
                    : g.start_time || g.end_time || "—";
                const studentCount = Array.isArray(g.students)
                  ? g.students.length
                  : 0;

                return (
                  <div
                    key={key}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => goToGroup(g)}
                    title="O'quvchilar sahifasiga o'tish"
                  >
                    <div className="grid grid-cols-11 gap-4 items-center text-sm">
                      {/* # */}
                      <div className="text-gray-900">{idx + 1}</div>

                      {/* Name + badge */}
                      <div className="col-span-3 inline-flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {g.name || "—"}
                        </span>
                        <span className="inline-flex items-center text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                          <Users size={14} className="mr-1" />
                          {studentCount}
                        </span>
                      </div>

                      {/* Course */}
                      <div className="text-gray-600">{g.course || "—"}</div>

                      {/* Mentor */}
                      <div className="text-gray-600">
                        {g.teacher_fullName || "—"}
                      </div>

                      {/* Days */}
                      <div className="text-gray-600">{daysTxt}</div>

                      {/* Time */}
                      <div className="text-gray-600">{timeTxt}</div>

                      {/* Actions */}
                      <div className="flex gap-2 justify-center col-span-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(g);
                          }}
                          className="w-10 h-10 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center transition-colors"
                          title="Tahrirlash"
                        >
                          <Pencil className="w-10 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteGroup(g.name);
                          }}
                          className="w-10 h-10 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center transition-colors"
                          title="O'chirish"
                        >
                          <Trash2 className="w-10 h-5" />
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
    </div>
  );
}
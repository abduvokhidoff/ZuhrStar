import React, { useEffect, useMemo, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  Plus,
  Filter,
  Trash2,
  Search,
  Download,
  Upload,
  RefreshCw,
  Receipt,
  CreditCard,
  Wallet,
  Calendar as CalendarIcon,
  Users,
  Check as CheckIcon,
} from "lucide-react";
import { setCredentials } from "../../redux/authSlice";
import * as XLSX from "xlsx";

const API_BASE =
  import.meta?.env?.VITE_API_URL?.replace(/\/$/, "") ||
  "https://zuhrstar-production.up.railway.app";

const cls = (...a) => a.filter(Boolean).join(" ");

const P0 = {
  student_id: "",
  fullName: "",
  group_id: "",
  group_name: "",
  course: "",
  amount: "",
  method: "cash",
  date: new Date().toISOString().slice(0, 10),
  note: "",
  status: "paid", // paid | unpaid
};


export default function Tolovlar() {

  const dispatch = useDispatch();
  const { accessToken, refreshToken } = useSelector((s) => s.auth);

  // DATA
  const [checks, setChecks] = useState([]);
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);

  // UI/STATE
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // filters
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");
  const [fCourse, setFCourse] = useState("");
  const [fGroup, setFGroup] = useState("");

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(P0);

  const [searchStudent, setSearchStudent] = useState("");
  const [showStudentsDropdown, setShowStudentsDropdown] = useState(false);

  const [searchGroup, setSearchGroup] = useState("");
  const [showGroupsDropdown, setShowGroupsDropdown] = useState(false);

  const filteredStudents = students.filter(s =>
    `${s.name} ${s.surname}`.toLowerCase().includes(searchStudent.toLowerCase())
  );

  const filteredGroups = groups.filter(g =>
    g.name.toLowerCase().includes(searchGroup.toLowerCase())
  );


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

  // ---------- LOAD ----------
  const loadAll = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      const [c, s, g] = await Promise.all([
        fetchWithAuth(`${API_BASE}/api/checks`),
        fetchWithAuth(`${API_BASE}/api/students`),
        fetchWithAuth(`${API_BASE}/api/groups`),
      ]);
      setChecks(Array.isArray(c) ? c : []);
      setStudents(Array.isArray(s) ? s : []);
      setGroups(Array.isArray(g) ? g : []);
    } catch (e) {
      console.error(e);
      setError("Ma'lumotlarni yuklashda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // ---------- HELPERS ----------
  const methods = [
    { value: "cash", label: "Naqd", icon: Wallet },
    { value: "click_payme", label: "Click/Payme", icon: CreditCard },
    { value: "transfer", label: "Bank o‘tkazma", icon: Receipt },
  ];

  const formatSum = (n) => {
    const x = Number(n || 0);
    return x.toLocaleString("uz-UZ");
  };

  const getStudentName = (sid) => {
    const s = students.find((x) => String(x.student_id) === String(sid));
    if (!s) return "";
    return `${s?.surname || ""} ${s?.name || ""}`.trim().replace(/\s+/g, " ");
  };

  const uniqueCourses = useMemo(() => {
    const set = new Set();
    checks.forEach((c) => c?.course && set.add(c.course));
    groups.forEach((g) => g?.course && set.add(g.course));
    return Array.from(set);
  }, [checks, groups]);

  const filtered = useMemo(() => {
    let arr = Array.isArray(checks) ? [...checks] : [];
    const q = searchTerm.trim().toLowerCase();

    if (fStart) arr = arr.filter((c) => (c.date_Of_Create || "").slice(0, 10) >= fStart);
    if (fEnd) arr = arr.filter((c) => (c.date_Of_Create || "").slice(0, 10) <= fEnd);
    if (fCourse) arr = arr.filter((c) => (c.course || "") === fCourse);
    if (fGroup) {
      arr = arr.filter((c) => {
        if (String(c.group_id || "") === String(fGroup)) return true;
        const s = students.find((x) => String(x.student_id) === String(c.paid_student_id));
        const gs = Array.isArray(s?.groups) ? s.groups.map(String) : [];
        return gs.includes(String(fGroup));
      });
    }
    if (q) {
      arr = arr.filter((c) => {
        const fullname = c.fullName || c.student_name || getStudentName(c.paid_student_id);
        const hay = `${fullname || ""} ${c.course || ""} ${c.group_name || ""} ${c.method || ""} ${c.payment_id || ""}`
          .toLowerCase()
          .trim();
        return hay.includes(q);
      });
    }
    return arr;
  }, [checks, searchTerm, fStart, fEnd, fCourse, fGroup, students]);

  const totalAmount = useMemo(
    () => filtered.reduce((s, c) => s + Number(c.amount || 0), 0),
    [filtered]
  );

  const debtors = useMemo(
    () => filtered.filter((c) => String(c.status || "").toLowerCase() !== "paid"),
    [filtered]
  );

  // ---------- STUDENT paid UPDATE ----------
  const updateStudentPaid = async (student_id, paidBool) => {
    try {
      const current = await fetchWithAuth(`${API_BASE}/api/students/${student_id}`, {
        method: "GET",
      });
      if (!current) throw new Error("Student not found");

      const payload = {
        name: current.name ?? "",
        surname: current.surname ?? "",
        student_phone: current.student_phone ?? "",
        parents_phone: current.parents_phone ?? "",
        birth_date: current.birth_date ?? "",
        gender: current.gender ?? "",
        note: current.note ?? "",
        group_attached: current.group_attached ?? true,
        groups: Array.isArray(current.groups) ? current.groups : [],
        status: current.status ?? "active",
        imgURL: current.imgURL ?? undefined,
        paid: !!paidBool,
        balance: current.balance ?? "0",
        coinbalance: current.coinbalance ?? "0",
        teachers: Array.isArray(current.teachers) ? current.teachers : [],
      };

      await fetchWithAuth(`${API_BASE}/api/students/${student_id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setStudents((prev) =>
        prev.map((s) =>
          String(s.student_id) === String(student_id) ? { ...s, ...payload } : s
        )
      );
    } catch (e) {
      console.warn("Student paid flag update failed:", e);
    }
  };

  // ---------- FORM ----------
  const openCreate = () => {
    setForm(P0);
    setModalOpen(true);
  };

  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const onSelectStudent = (id) => {
    const s = students.find((x) => String(x.student_id) === String(id));
    setForm((p) => ({
      ...p,
      student_id: id,
      fullName:
        (s
          ? `${s?.surname || ""} ${s?.name || ""}`.trim().replace(/\s+/g, " ")
          : p.fullName) || "",
    }));
  };

  const onSelectGroup = (gid) => {
    const g = groups.find((x) => String(x.group_id) === String(gid));
    setForm((p) => ({
      ...p,
      group_id: gid,
      group_name: g?.name || "",
      course: g?.course || p.course,
    }));
  };

  const saveCheck = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");

    const payload = {
      amount: String(Number(form.amount || 0)),
      date_Of_Create: new Date(form.date || new Date()).toISOString(),
      status: form.status, // "paid" | "unpaid"
      paid_student_id: form.student_id,
      ...(form.method ? { method: form.method } : {}),
      ...(form.note?.trim() ? { note: form.note.trim() } : {}),
    };

    try {
      // Always CREATE (edit removed)
      await fetchWithAuth(`${API_BASE}/api/checks/create`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await updateStudentPaid(form.student_id, payload.status === "paid");

      const fresh = await fetchWithAuth(`${API_BASE}/api/checks`);
      setChecks(Array.isArray(fresh) ? fresh : []);
      setModalOpen(false);
    } catch (e2) {
      console.error(e2);
      setError("To‘lovni saqlashda xatolik yuz berdi.");
    } finally {
      setSaving(false);
    }
  };

  const deleteCheck = async (payment_id) => {
    if (!window.confirm("Chekni o‘chirishni tasdiqlaysizmi?")) return;
    try {
      await fetchWithAuth(`${API_BASE}/api/checks/${payment_id}`, {
        method: "DELETE",
      });
      setChecks((prev) => prev.filter((c) => c.payment_id !== payment_id));
    } catch (e) {
      console.error(e);
      setError("Chekni o‘chirishda xatolik yuz berdi.");
    }
  };

  const markCheckPaid = async (check) => {
    try {
      await fetchWithAuth(`${API_BASE}/api/checks/${check.payment_id}`, {
        method: "PUT",
        body: JSON.stringify({
          amount: String(Number(check.amount || 0)),
          date_Of_Create: new Date().toISOString(),
          status: "paid",
          paid_student_id: check.paid_student_id,
          method: check.method || "cash",
          note: check.note || "",
        }),
      });

      await updateStudentPaid(check.paid_student_id, true);

      setChecks((prev) =>
        prev.map((c) =>
          c.payment_id === check.payment_id ? { ...c, status: "paid" } : c
        )
      );
    } catch (e) {
      console.error(e);
      setError("To‘lovni tasdiqlashda xatolik yuz berdi.");
    }
  };

  // ---------- EXPORT ----------
  const exportCSV = () => {
    const header = [
      "payment_id",
      "date",
      "fullName",
      "student_id",
      "course",
      "group_name",
      "amount",
      "method",
      "status",
      "note",
    ];
    const rows = filtered.map((c) => [
      c.payment_id ?? "",
      (c.date || c.date_Of_Create || "").slice(0, 10),
      c.fullName || c.student_name || getStudentName(c.paid_student_id) || "",
      c.paid_student_id || c.student_id || "",
      c.course || "",
      c.group_name || "",
      c.amount || "",
      c.method || "",
      c.status || "",
      (c.note || "").replace(/\r?\n/g, " "),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tolovlar_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- IMPORT (Excel/CSV) ----------
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importCols, setImportCols] = useState([]);
  const [importRows, setImportRows] = useState([]);
  const [mapping, setMapping] = useState({
    student_id: "student_id",
    fullName: "fullName",
    amount: "amount",
    date: "date",
    method: "method",
    status: "status",
    note: "note",
  });
  const fileInputRef = React.useRef(null);

  const val = (row, key) => {
    if (!key) return "";
    const v = row?.[key];
    return typeof v === "string" ? v.trim() : v ?? "";
  };

  const onPickImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");

    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });

      if (!Array.isArray(json) || json.length === 0) {
        setImportError("Fayl bo‘sh yoki noto‘g‘ri format.");
        return;
      }

      const cols = Object.keys(json[0]);
      setImportCols(cols);
      setImportRows(json);

      const lowerCols = cols.map((c) => c.toLowerCase());
      const guess = (names) =>
        cols[
        lowerCols.findIndex((lc) => names.some((n) => lc === n || lc.includes(n)))
        ] || "";

      setMapping((m) => ({
        ...m,
        student_id: guess(["student_id", "id", "stu_id"]) || m.student_id,
        fullName:
          guess(["fullname", "fio", "f.i.sh", "name", "ism", "familiya"]) || m.fullName,
        amount: guess(["amount", "sum", "summa", "price"]) || m.amount,
        date: guess(["date", "sana", "created", "pay_date"]) || m.date,
        method: guess(["method", "usul", "payment", "pay_method"]) || m.method,
        status: guess(["status", "holat", "paid", "unpaid"]) || m.status,
        note: guess(["note", "izoh", "comment"]) || m.note,
      }));

      setImportOpen(true);
      e.target.value = "";
    } catch (err) {
      console.error(err);
      setImportError("Faylni o‘qishda xatolik yuz berdi.");
    }
  };

  const toISODate = (s) => {
    if (!s) return new Date().toISOString();
    if (!isNaN(Number(s))) {
      const d = XLSX.SSF.parse_date_code(Number(s));
      if (d) {
        const dt = new Date(Date.UTC(d.y, d.m - 1, d.d));
        return dt.toISOString();
      }
    }
    const dt = new Date(String(s));
    if (!isNaN(dt.getTime())) return dt.toISOString();
    return new Date().toISOString();
  };

  const normStatus = (s) => {
    const t = (s || "").toLowerCase();
    if (t.includes("paid") || t.includes("to‘langan") || t.includes("tolangan"))
      return "paid";
    if (t.includes("qarzdor") || t.includes("unpaid") || t.includes("debt"))
      return "unpaid";
    return "paid";
  };
  const normMethod = (s) => {
    const t = (s || "").toLowerCase();
    if (t.includes("transfer") || t.includes("bank")) return "transfer";
    if (t.includes("click") || t.includes("payme")) return "click_payme";
    return "cash";
  };

  const findStudentIdByName = (fullNameStr) => {
    const needle = (fullNameStr || "").toLowerCase().replace(/\s+/g, " ").trim();
    if (!needle) return "";
    const found = students.find((s) => {
      const name = `${s?.surname || ""} ${s?.name || ""}`
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
      return name === needle;
    });
    return found?.student_id || "";
  };

  const startImport = async () => {
    if (!importRows.length) return;
    setImporting(true);
    setImportError("");

    try {
      for (const row of importRows) {
        const sidFromFile = String(val(row, mapping.student_id) || "").trim();
        let sid = sidFromFile;
        if (!sid) {
          const fio = val(row, mapping.fullName);
          sid = findStudentIdByName(fio);
        }
        if (!sid) {
          console.warn("Skip row: no student_id", row);
          continue;
        }

        const payload = {
          amount: String(Number(val(row, mapping.amount) || 0)),
          date_Of_Create: toISODate(val(row, mapping.date)),
          status: normStatus(val(row, mapping.status)),
          paid_student_id: sid,
          method: normMethod(val(row, mapping.method)),
          ...(val(row, mapping.note) ? { note: val(row, mapping.note) } : {}),
        };

        await fetchWithAuth(`${API_BASE}/api/checks/create`, {
          method: "POST",
          body: JSON.stringify(payload),
        });

        await updateStudentPaid(sid, payload.status === "paid");
      }

      const fresh = await fetchWithAuth(`${API_BASE}/api/checks`);
      setChecks(Array.isArray(fresh) ? fresh : []);
      setImportOpen(false);
    } catch (err) {
      console.error(err);
      setImportError("Import jarayonida xatolik yuz berdi.");
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const header = [
      "student_id",
      "fullName",
      "amount",
      "date",
      "method",
      "status",
      "note",
    ];
    const sample = [
      ["STU_123", "Aliyev Ali", "250000", "2025-09-01", "cash", "paid", ""],
      ["", "Karimova Dilnoza", "300000", "2025-09-05", "click_payme", "unpaid", "Sentabr"],
    ];
    const csv = [header, ...sample]
      .map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tolovlar_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---------- RENDER ----------
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">TO‘LOVLAR</h1>
          <div className="text-sm text-gray-500">To‘lovlar</div>
        </div>

        {/* Modal Create (Edit removed) */}
        {modalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
            <form
              onSubmit={saveCheck}
              className="bg-white p-6 rounded-xl shadow-xl w-[680px] max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-semibold mb-4">Yangi to‘lov qo‘shish</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* O‘quvchi */}
                <div className="relative dropdown-container">
                  <input
                    placeholder="O‘quvchi qidirish..."
                    value={form.student_id ? students.find(s => s.student_id === form.student_id)?.name : searchStudent}
                    onChange={(e) => {
                      setForm(p => ({ ...p, student_id: "" })); // оставляем
                      setSearchStudent(e.target.value); // теперь ввод виден
                      setShowStudentsDropdown(true);
                    }}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {showStudentsDropdown && (
                    <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-44 overflow-y-auto z-10 shadow">
                      {filteredStudents.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">Topilmadi</div>
                      ) : (
                        filteredStudents.map(s => (
                          <div
                            key={s.student_id}
                            onClick={() => {
                              setForm(p => ({ ...p, student_id: s.student_id }));
                              setShowStudentsDropdown(false);
                            }}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                          >
                            <div className="font-medium">{s.name} {s.surname}</div>
                            <div className="text-xs text-gray-500">{s.student_phone}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Guruh */}
                <div className="relative dropdown-container">
                  <input
                    placeholder="Guruh qidirish..."
                    value={form.group_id ? groups.find(g => g.group_id === form.group_id)?.name : searchGroup}
                    onChange={(e) => {
                      setForm(p => ({ ...p, group_id: "" }));
                      setSearchGroup(e.target.value);
                      setShowGroupsDropdown(true);
                    }}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {showGroupsDropdown && (
                    <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg mt-1 max-h-44 overflow-y-auto z-10 shadow">
                      {filteredGroups.length === 0 ? (
                        <div className="p-2 text-sm text-gray-500">Topilmadi</div>
                      ) : (
                        filteredGroups.map(g => (
                          <div
                            key={g.group_id}
                            onClick={() => {
                              setForm(p => ({ ...p, group_id: g.group_id }));
                              setShowGroupsDropdown(false);
                            }}
                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                          >
                            <div className="font-medium">{g.name}</div>
                            <div className="text-xs text-gray-500">{g.course}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>


                {/* Date */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Sana</label>
                  <input
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={onFormChange}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Miqdori</label>
                  <input
                    name="amount"
                    placeholder="Summa (so'm)"
                    value={form.amount}
                    onChange={onFormChange}
                    type="number"
                    min="0"
                    className="w-full border h-[49.6px] border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{
                      MozAppearance: "textfield",
                      appearance: "textfield",        // <-- добавлено
                    }}
                  />
                </div>





                {/* Method */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">To‘lov usuli</label>
                  <select
                    name="method"
                    value={form.method}
                    onChange={onFormChange}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {methods.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Holat</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={onFormChange}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="paid">To‘langan</option>
                    <option value="unpaid">Qarzdor</option>
                  </select>
                </div>

                {/* Note */}
                <textarea
                  name="note"
                  placeholder="Izoh"
                  rows={3}
                  value={form.note}
                  onChange={onFormChange}
                  className="md:col-span-2 w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  Qo‘shish
                </button>
              </div>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </form>
          </div>
        )}

        {/* Import Modal */}
        {importOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
            <div className="bg-white p-6 rounded-xl shadow-xl w-[820px] max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Import — Excel/CSV</h2>
                <button
                  onClick={() => setImportOpen(false)}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                >
                  Yopish
                </button>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  Fayl tanlash
                </button>
                <div className="text-sm text-gray-600">
                  Ruxsat etilgan formatlar: .xlsx, .xls, .csv
                </div>
              </div>

              {importError && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                  {importError}
                </div>
              )}

              {!importRows.length ? (
                <div className="text-sm text-gray-500">
                  Fayl tanlang va ustunlarni moslang.
                </div>
              ) : (
                <>
                  {/* Mapping */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
                    {Object.keys(mapping).map((field) => (
                      <div key={field}>
                        <div className="text-xs text-gray-500 mb-1 uppercase">{field}</div>
                        <select
                          className="w-full border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          value={mapping[field] ?? ""}
                          onChange={(e) =>
                            setMapping((m) => ({ ...m, [field]: e.target.value }))
                          }
                        >
                          <option value="">— tanlang —</option>
                          {importCols.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                  {/* Preview */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 text-xs text-gray-600">
                      Preview (birinchi 15 qator)
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs border-collapse table-auto">
                        <thead className="bg-white">
                          <tr>
                            {importCols.map((c) => (
                              <th key={c} className="px-3 py-2 text-left border-b text-gray-600">
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {importRows.slice(0, 15).map((r, i) => (
                            <tr key={i} className="border-b">
                              {importCols.map((c) => (
                                <td key={c} className="px-3 py-2 whitespace-nowrap">
                                  {String(r[c] ?? "")}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 mt-5">
                    <button
                      onClick={downloadTemplate}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      Shablon (CSV)
                    </button>
                    <button
                      onClick={startImport}
                      disabled={importing}
                      className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-60"
                    >
                      {importing ? "Import qilinmoqda..." : "Import qilish"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-6 border-l-4 border-emerald-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {filtered.length}
                </div>
                <div className="text-sm text-gray-500 uppercase font-medium">
                  CHEKLAR SONI
                </div>
              </div>
              <Receipt className="w-8 h-8 text-emerald-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {formatSum(totalAmount)} so‘m
                </div>
                <div className="text-sm text-gray-500 uppercase font-medium">
                  JAMI TUSHDI
                </div>
              </div>
              <Wallet className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-orange-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {debtors.length}
                </div>
                <div className="text-sm text-gray-500 uppercase font-medium">
                  QARZDOR CHEKLAR
                </div>
              </div>
              <Users className="w-8 h-8 text-orange-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border-l-4 border-cyan-500 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800 mb-1">
                  {debtors
                    .reduce((s, c) => s + Number(c.amount || 0), 0)
                    .toLocaleString("uz-UZ")} {" "}
                  so‘m
                </div>
                <div className="text-sm text-gray-500 uppercase font-medium">
                  QARZDORLIK
                </div>
              </div>
              <CreditCard className="w-8 h-8 text-cyan-500" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Qidirish (F.I.Sh, kurs, guruh, usul)..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-72 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <button
              onClick={() => setShowFilter((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 text-gray-500" />
              Filter
            </button>

            {showFilter && (
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Boshlanish</label>
                  <input
                    type="date"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={fStart}
                    onChange={(e) => setFStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tugash</label>
                  <input
                    type="date"
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={fEnd}
                    onChange={(e) => setFEnd(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Kurs</label>
                  <select
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={fCourse}
                    onChange={(e) => setFCourse(e.target.value)}
                  >
                    <option value="">Barchasi</option>
                    {uniqueCourses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Guruh</label>
                  <select
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    value={fGroup}
                    onChange={(e) => setFGroup(e.target.value)}
                  >
                    <option value="">Barchasi</option>
                    {groups.map((g) => (
                      <option key={g.group_id} value={g.group_id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="relative">
              <button
                onClick={() => setShowImportExport((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-sm hover:bg-blue-100"
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              {showImportExport && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                  <button
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={exportCSV}
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              )}

              {/* hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={onPickImportFile}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadAll}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
            >
              <RefreshCw className="w-4 h-4" />
              Yangilash
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600"
            >
              <Plus className="w-4 h-4" />
              To‘lov qo‘shish
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

        {/* Debtors */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-orange-500" />
            <div className="text-xs font-medium text-gray-700">
              Qarzdor o‘quvchilar ro‘yxati
            </div>
            <span className="ml-2 text-xs text-gray-500">({debtors.length} ta)</span>
          </div>
          {debtors.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="text-gray-600 uppercase">
                  <tr>
                    <th className="px-3 py-2 text-left">Sana</th>
                    <th className="px-3 py-2 text-left">F.I.Sh</th>
                    <th className="px-3 py-2 text-left">Kurs</th>
                    <th className="px-3 py-2 text-left">Guruh</th>
                    <th className="px-3 py-2 text-left">Summa</th>
                    <th className="px-3 py-2 text-left">Usul</th>
                    <th className="px-3 py-2 text-left">Holat</th>
                    <th className="px-3 py-2 text-left">Amal</th>
                  </tr>
                </thead>
                <tbody>
                  {debtors.map((c, i) => (
                    <tr key={c.payment_id || i} className="border-b border-gray-200">
                      <td className="px-3 py-2">{(c.date_Of_Create || "").slice(0, 10)}</td>
                      <td className="px-3 py-2">
                        {c.fullName || c.student_name || getStudentName(c.paid_student_id) || "—"}
                      </td>
                      <td className="px-3 py-2">{c.course || "—"}</td>
                      <td className="px-3 py-2">{c.group_name || "—"}</td>
                      <td className="px-3 py-2">{formatSum(c.amount)} so‘m</td>
                      <td className="px-3 py-2">
                        {methods.find((m) => m.value === c.method)?.label || c.method}
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded text-white bg-red-500">qarzdor</span>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => markCheckPaid(c)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600"
                          title="To‘langan deb belgilash"
                        >
                          <CheckIcon size={14} />
                          To‘lash
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-4 text-sm text-gray-600">Qarzdor chek topilmadi.</div>
          )}
        </div>

        {/* Checks table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
            <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="col-span-2">Sana</div>
              <div className="col-span-3">O‘quvchi</div>
              <div>Kurs</div>
              <div>Guruh</div>
              <div>Summa</div>
              <div>Usul</div>
              <div className="text-center col-span-2">Amallar</div>
            </div>
          </div>

          <div>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                <div className="text-gray-500">Yuklanmoqda...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Hech qanday chek topilmadi
              </div>
            ) : (
              filtered.map((c, idx) => {
                const MethodIcon = methods.find((m) => m.value === c.method)?.icon || Receipt;
                const isPaid = String(c.status || "").toLowerCase() === "paid";
                return (
                  <div
                    key={c.payment_id || idx}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors border-b border-gray-200"
                  >
                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="col-span-2">
                        {(c.date || c.date_Of_Create || "").slice(0, 10)}
                      </div>
                      <div className="col-span-3">
                        <div className="font-medium text-gray-900">
                          {c.fullName || c.student_name || getStudentName(c.paid_student_id) || "—"}
                        </div>
                        <div className="text-xs text-gray-500">#{c.payment_id || "—"}</div>
                      </div>
                      <div className="text-gray-600">{c.course || "—"}</div>
                      <div className="text-gray-600">{c.group_name || "—"}</div>
                      <div className="text-gray-900 font-medium">
                        {formatSum(c.amount)} so‘m
                      </div>
                      <div className="flex items-center gap-2 text-gray-700">
                        <MethodIcon className="w-4 h-4" />
                        <span
                          className={cls(
                            "text-xs px-2 py-0.5 rounded-full",
                            c.method === "cash"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : c.method === "transfer"
                                ? "bg-blue-50 text-blue-700 border border-blue-200"
                                : "bg-cyan-50 text-cyan-700 border border-cyan-200"
                          )}
                        >
                          {methods.find((m) => m.value === c.method)?.label || c.method}
                        </span>
                      </div>
                      <div className="flex gap-2 justify-center col-span-2">
                        {!isPaid && (
                          <button
                            onClick={() => markCheckPaid(c)}
                            className="w-10 h-10 bg-emerald-500 text-white rounded-md hover:bg-emerald-600 flex items-center justify-center"
                            title="To‘langan deb belgilash"
                          >
                            <CheckIcon className="w-10 h-5" />
                          </button>
                        )}
                        {/* EDIT BUTTON REMOVED */}
                        <button
                          onClick={() => deleteCheck(c.payment_id)}
                          className="w-10 h-10 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center"
                          title="O‘chirish"
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

      {/* Hidden file input at root to be accessible */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={onPickImportFile}
      />
    </div>
  );
}

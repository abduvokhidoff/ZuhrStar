// src/pages/Mentorlar.jsx
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { useSelector, useDispatch } from "react-redux";
import { setCredentials } from "../../redux/authSlice";
import { Plus, Filter, Pencil, Trash2, Users, Search, RefreshCw } from "lucide-react";

const API_BASE =
  import.meta?.env?.VITE_API_URL?.replace(/\/$/, "") ||
  "https://zuhrstar-production.up.railway.app";

export default function Mentorlar() {
  const dispatch = useDispatch();
  const { accessToken, refreshToken } = useSelector((s) => s.auth);

  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMentor, setSelectedMentor] = useState(null);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    company: "",
    position: "",
    location: "",
    status: "active",
  });

  // --- REFRESH TOKEN ---
  const refreshAccessToken = async () => {
    const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
    dispatch(setCredentials(res.data));
    return res.data.accessToken;
  };

  // --- AXIOS INSTANCE ---
  const api = axios.create({
    baseURL: `${API_BASE}/api`,
  });

  api.interceptors.request.use((config) => {
    config.headers.Authorization = `Bearer ${accessToken}`;
    return config;
  });

  api.interceptors.response.use(
    (res) => res,
    async (err) => {
      if (err.response?.status === 401 && refreshToken) {
        const newToken = await refreshAccessToken();
        err.config.headers.Authorization = `Bearer ${newToken}`;
        return api(err.config);
      }
      throw err;
    }
  );

  // --- LOAD MENTORS ---
  const loadMentors = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/teachers");
      console.log("API Response:", res.data);
      
      // Handle nested teachers array
      if (res.data && res.data.teachers && Array.isArray(res.data.teachers)) {
        setMentors(res.data.teachers);
      } else if (Array.isArray(res.data)) {
        setMentors(res.data);
      } else {
        setMentors([]);
      }
    } catch (e) {
      console.error("Load error:", e);
      setError("Ma'lumotlarni yuklashda xatolik yuz berdi.");
      setMentors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken) loadMentors();
  }, [accessToken]);

  // --- FILTER ---
  const filteredMentors = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return mentors;
    return mentors.filter((m) =>
      `${m.fullName} ${m.phone} ${m.email} ${m.company}`
        .toLowerCase()
        .includes(q)
    );
  }, [mentors, searchTerm]);

  // --- STATS ---
  const total = mentors.length;

  // --- FORM HANDLERS ---
  const openCreate = () => {
    setForm({
      fullName: "",
      phone: "",
      email: "",
      company: "",
      position: "",
      location: "",
      status: "active",
    });
    setIsEditing(false);
    setSelectedMentor(null);
    setModalOpen(true);
  };

  const openEdit = (m) => {
    setForm({
      fullName: m.fullName || "",
      phone: m.phone || "",
      email: m.email || "",
      company: m.company || "",
      position: m.position || "",
      location: m.location || "",
      status: m.status || "active",
    });
    setSelectedMentor(m.teacher_id || m._id);
    setIsEditing(true);
    setModalOpen(true);
  };

  const onFormChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const saveMentor = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEditing && selectedMentor) {
        await api.put(`/teachers/${selectedMentor}`, form);
      } else {
        await api.post("/teachers/register", form);
      }
      setModalOpen(false);
      loadMentors();
    } catch (err) {
      console.error(err);
      setError("Mentorni saqlashda xatolik yuz berdi.");
    } finally {
      setSaving(false);
    }
  };

  const deleteMentor = async (mentor) => {
    if (!window.confirm("Mentorni o'chirishni xohlaysizmi?")) return;
    try {
      const id = mentor.teacher_id || mentor._id;
      await api.delete(`/teachers/${id}`);
      loadMentors();
    } catch (err) {
      console.error(err);
      setError("O'chirishda xatolik yuz berdi.");
    }
  };

  // --- UI ---
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">MENTORLAR</h1>
          <div className="text-sm text-gray-500">Mentorlar</div>
        </div>

        {/* Modal */}
        {modalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
            <form
              onSubmit={saveMentor}
              className="bg-white p-6 rounded-xl shadow-xl w-[600px] max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-semibold mb-4">
                {isEditing ? "Mentorni tahrirlash" : "Yangi mentor yaratish"}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {["fullName", "phone", "email", "company", "position", "location"].map((f) => (
                  <input
                    key={f}
                    name={f}
                    placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                    value={form[f]}
                    onChange={onFormChange}
                    className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                ))}
                <select
                  name="status"
                  value={form.status}
                  onChange={onFormChange}
                  className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="active">Faol</option>
                  <option value="inactive">Nofaol</option>
                </select>
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
            </form>
          </div>
        )}
      </div>

      {/* Stats - Full Width */}
      <div className="p-6">
        <div className="bg-white p-6 rounded-lg border-l-4 border-blue-500 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-3xl font-bold">{total}</div>
              <div className="text-sm text-gray-500 uppercase">JAMI MENTORLAR</div>
            </div>
            <Users className="text-blue-500 w-8 h-8" />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Search + Actions */}
      <div className="flex items-center justify-between px-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Qidirish..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowFilter((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            <Filter className="w-4 h-4 text-gray-500" /> Filter
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadMentors}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600"
          >
            <RefreshCw className="w-4 h-4" /> Yangilash
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600"
          >
            <Plus className="w-4 h-4" /> Mentor qo'shish
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm mx-6 overflow-hidden mb-10">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 grid grid-cols-7 gap-4 text-xs font-medium text-gray-500 uppercase">
          <div>#</div>
          <div>Rasm</div>
          <div>F.I.Sh</div>
          <div>Telefon</div>
          <div>Email</div>
          <div>Kompaniya</div>
          <div className="text-center">Amallar</div>
        </div>

        <div className="divide-y divide-gray-100 ">
          {loading ? (
            <div className="text-center py-8">Yuklanmoqda...</div>
          ) : filteredMentors.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Mentorlar topilmadi</div>
          ) : (
            filteredMentors.map((m, i) => (
              <div
                key={m._id || i}
                className="grid grid-cols-7 gap-4 items-center px-6 py-4 text-sm hover:bg-gray-50 transition-colors"
              >
                <div>{i + 1}</div>
                <div className="flex ">
                  <img
                    src={m.imgURL || "https://via.placeholder.com/40"}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/40";
                    }}
                  />
                </div>
                <div className="font-medium text-gray-800">{m.fullName}</div>
                <div>{m.phone || "—"}</div>
                <div>{m.email || "—"}</div>
                <div>{m.company || "—"}</div>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => openEdit(m)}
                    className="w-10 h-10 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteMentor(m)}
                    className="w-10 h-10 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
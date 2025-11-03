import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Plus,
  Filter,
  Pencil,
  Trash2,
  ChevronLeft,
  Search,
  Download,
  RefreshCw,
  Users,
  Snowflake,
  Unlock,
} from "lucide-react";

export default function Kurslar() {
  const { accessToken, refreshToken } = useSelector((state) => state.auth);

  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);     // для детейла
  const [students, setStudents] = useState([]); // для детейла

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    duration: "",
    duration_type: "month", // month | week | day
    methodology: [
      {
        month: 1,
        title: "Основы веб-разработки",
        lessons: [{ title: "Введение в HTML", description: "Основы HTML разметки" }],
      },
    ],
  });

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Панель действий
  const [search, setSearch] = useState("");
  const [showFilter, setShowFilter] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const apiBase = "https://zuhrstar-production.up.railway.app";

  // ------- утилиты нормализации -------
  const gid = (o) => String(o?._id ?? o?.id ?? o?.group_id ?? "");
  const sid = (s) => String(s?.student_id ?? s?._id ?? s?.id ?? "");
  const cid = (o) => String(o?._id ?? o?.id ?? o?.course_id ?? "");
  const courseName = (o) => String(o?.name ?? o?.title ?? "");
  const courseIdMatchesGroup = (crs, grp) => {
    const cIds = new Set([cid(crs), crs?.course_id && String(crs.course_id)]);
    const gCIds = new Set([
      cid(grp),
      grp?.course_id && String(grp.course_id),
      grp?.courseId && String(grp.courseId),
    ]);
    const byId = [...cIds].some((x) => x && [...gCIds].includes(x));
    const byName =
      (grp?.course && courseName(crs) && String(grp.course) === courseName(crs)) ||
      (grp?.course_name && String(grp.course_name) === courseName(crs));
    return byId || byName;
  };
  const studentBelongsToGroup = (stu, groupId) => {
    const arr = Array.isArray(stu?.groups) ? stu.groups.map(String) : [];
    const possible = new Set(
      [
        ...arr,
        stu?.group_id && String(stu.group_id),
        stu?.groupId && String(stu.groupId),
      ].filter(Boolean)
    );
    return possible.has(String(groupId));
  };
  const studentBelongsToAnyGroup = (stu, groupIdSet) => {
    for (const k of groupIdSet) if (studentBelongsToGroup(stu, k)) return true;
    return false;
  };

  // ------- даты/продолжительность -------
  const safeDate = (v) => {
    const raw =
      v?.start_date ||
      v?.started_at ||
      v?.date_Of_Create ||
      v?.createdAt ||
      v?.created_at ||
      v?.date ||
      null;
    const d = raw ? new Date(raw) : null;
    return isNaN(d?.getTime?.()) ? null : d;
  };
  const addByDuration = (start, amount, type) => {
    const d = new Date(start);
    if (type === "day") d.setDate(d.getDate() + Number(amount || 0));
    else if (type === "week") d.setDate(d.getDate() + 7 * Number(amount || 0));
    else d.setMonth(d.getMonth() + Number(amount || 0)); // month (по умолчанию)
    return d;
  };

  // ------- токен-рефреш (заглушка редирект) -------
  const refreshAccessToken = async () => {
    try {
      throw new Error("Refresh token invalid");
    } catch (err) {
      console.error("Token refresh failed:", err);
      window.location.href = "/login";
      throw err;
    }
  };

  // ------- fetch c авторизацией -------
  const fetchWithAuth = async (url, options = {}) => {
    let token = accessToken;

    const makeRequest = async (tokenToUse) => {
      return await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenToUse}`,
          ...(options.headers || {}),
        },
      });
    };

    try {
      let response = await makeRequest(token);
      if (response.status === 401 && refreshToken) {
        token = await refreshAccessToken();
        response = await makeRequest(token);
      }
      if (!response.ok) {
        const txt = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status}: ${txt || response.statusText}`);
      }
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } catch (error) {
      console.error("Fetch error:", error);
      setError("Ma'lumotlarda xatolik yuz berdi.");
      throw error;
    }
  };

  // ------- ручная заморозка/разморозка (как в Oquvchilar) -------
  const setStudentStatus = async (studentId, nextStatus) => {
    await fetchWithAuth(`${apiBase}/api/students/${studentId}`, {
      method: "PUT",
      body: JSON.stringify({ status: nextStatus }),
    });
    setStudents((prev) =>
      prev.map((s) =>
        sid(s) === String(studentId) ? { ...s, status: nextStatus } : s
      )
    );
  };
  const freezeStudent = (studentId) => setStudentStatus(studentId, "muzlagan");
  const unfreezeStudent = (studentId) => setStudentStatus(studentId, "active");

  // ------- загрузка курсов -------
  const loadCourses = async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWithAuth(`${apiBase}/api/courses`);
      setCourses(Array.isArray(data) ? data : data?.data || []);
    } catch {
      setError("Ma'lumotlarni olishda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // ------- фильтр -------
  const filteredCourses = useMemo(
    () =>
      courses.filter((course) =>
        (course?.name || "").toLowerCase().includes(search.toLowerCase())
      ),
    [courses, search]
  );

  // ------- детали курса + авто-заморозка -------
  const openCourseDetail = async (course) => {
    setSelectedCourse(course);
    setDetailLoading(true);
    setError(null);
    try {
      const [g, s] = await Promise.all([
        fetchWithAuth(`${apiBase}/api/groups`),
        fetchWithAuth(`${apiBase}/api/students`),
      ]);
      const groupsList = Array.isArray(g) ? g : g?.data || [];
      const studentsList = Array.isArray(s) ? s : s?.data || [];
      setGroups(groupsList);
      setStudents(studentsList);

      // === АВТО-ЗАМОРОЗКА: если срок курса истёк для группы ===
      // Определим группы этого курса и какие из них «expired»
      const courseGroups = groupsList.filter((gr) => courseIdMatchesGroup(course, gr));
      const now = new Date();

      // Соберём промисы на заморозку для активных студентов просроченных групп
      const freezePromises = [];
      for (const gr of courseGroups) {
        const start = safeDate(gr);
        if (!start) continue;
        const end = addByDuration(start, course?.duration || 0, course?.duration_type || "month");
        const expired = now >= end;
        if (!expired) continue;

        // замораживаем всех активных студентов этой группы
        for (const stu of studentsList) {
          const belongs = studentBelongsToGroup(stu, gid(gr));
          const isActive = String(stu?.status || "").toLowerCase() === "active";
          if (belongs && isActive) {
            const id = sid(stu);
            if (!id) continue;
            freezePromises.push(
              fetchWithAuth(`${apiBase}/api/students/${id}`, {
                method: "PUT",
                body: JSON.stringify({ status: "muzlagan" }),
              }).then(() => {
                stu.status = "muzlagan"; // обновим локально
              }).catch(() => { })
            );
          }
        }
      }
      if (freezePromises.length) {
        await Promise.allSettled(freezePromises);
        // синхронизируем состояние
        setStudents([...studentsList]);
      }
    } catch {
      /* fetchWithAuth уже проставит setError при необходимости */
    } finally {
      setDetailLoading(false);
    }
  };

  const closeCourseDetail = () => setSelectedCourse(null);

  // ------- CRUD -------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const sanitizedData = {
      ...formData,
      price: Number(formData.price),
      duration: Number(formData.duration),
    };

    setIsSubmitting(true);

    try {
      if (isEditing && selectedCourse) {
        await fetchWithAuth(`${apiBase}/api/courses/id/${selectedCourse._id}`, {
          method: "PUT",
          body: JSON.stringify(sanitizedData),
        });
        setCourses((prev) =>
          prev.map((c) => (c._id === selectedCourse._id ? { ...c, ...sanitizedData } : c))
        );
      } else {
        const created = await fetchWithAuth(`${apiBase}/api/courses`, {
          method: "POST",
          body: JSON.stringify(sanitizedData),
        });
        const newCourse = Array.isArray(created) ? created[0] : created?.data ?? created;
        if (newCourse) setCourses((prev) => [...prev, newCourse]);
      }

      setModalOpen(false);
      setIsEditing(false);
      setSelectedCourse(null);
      setFormData({
        name: "",
        price: "",
        duration: "",
        duration_type: "month",
        methodology: [
          {
            month: 1,
            title: "Основы веб-разработки",
            lessons: [{ title: "Введение в HTML", description: "Основы HTML разметки" }],
          },
        ],
      });
    } catch {
      setError("Kursni saqlashda xatolik yuz berdi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (course) => {
    setSelectedCourse(course);
    setFormData({
      name: course.name,
      price: course.price,
      duration: course.duration,
      duration_type: course.duration_type || "month",
      methodology: course.methodology || [{ month: 1, title: "", lessons: [] }],
    });
    setIsEditing(true);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Kursni o'chirishni tasdiqlaysizmi?")) return;
    try {
      await fetchWithAuth(`${apiBase}/api/courses/id/${id}`, { method: "DELETE" });
      setCourses((prev) => prev.filter((c) => c._id !== id));
      if (selectedCourse?._id === id) setSelectedCourse(null);
    } catch {
      setError("Kursni o'chirishda xatolik yuz berdi.");
    }
  };

  // ------- вычисления для детейла (включая просроченные группы) -------
  const detailData = useMemo(() => {
    if (!selectedCourse) return { courseGroups: [], courseStudents: [], expiredGroupIds: new Set() };
    const course = selectedCourse;
    const courseGroups = groups.filter((g) => courseIdMatchesGroup(course, g));
    const groupIdSet = new Set(courseGroups.map(gid).filter(Boolean));
    const courseStudents = students.filter((stu) => studentBelongsToAnyGroup(stu, groupIdSet));

    const expiredGroupIds = new Set();
    const now = new Date();
    for (const gr of courseGroups) {
      const start = safeDate(gr);
      if (!start) continue;
      const end = addByDuration(start, course?.duration || 0, course?.duration_type || "month");
      if (now >= end) expiredGroupIds.add(gid(gr));
    }

    return { courseGroups, courseStudents, expiredGroupIds };
  }, [selectedCourse, groups, students]);

  // ------- статистика -------
  const totalCourses = courses.length;
  const totalGroups = courses.reduce(
    (sum, c) => sum + (Number(c.groups_count) || 0),
    0
  );
  const avgPrice =
    totalCourses > 0
      ? Math.round(
        courses.reduce((s, c) => s + (Number(c.price) || 0), 0) / totalCourses
      )
      : 0;
  const longCourses = courses.filter((c) => Number(c.duration) >= 6).length;

  if (!accessToken) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-red-500 text-lg font-semibold">
          Avtorizatsiya qilinmagan!
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-800">KURSLAR</h1>
          <div className="text-sm text-gray-500">Kurslar</div>
        </div>

        {/* Modal: create/edit */}
        {modalOpen && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
            <form
              onSubmit={handleSubmit}
              className="bg-white p-6 rounded-xl shadow-xl w-[600px] max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-xl font-semibold mb-4">
                {isEditing ? "Kursni tahrirlash" : "Yangi kurs yaratish"}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  name="name"
                  placeholder="Kurs nomi *"
                  value={formData.name}
                  onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                  required
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  name="price"
                  type="number"
                  placeholder="Narx *"
                  value={formData.price}
                  onChange={(e) => setFormData((p) => ({ ...p, price: e.target.value }))}
                  required
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  name="duration"
                  type="number"
                  placeholder="Davomiylik *"
                  value={formData.duration}
                  onChange={(e) => setFormData((p) => ({ ...p, duration: e.target.value }))}
                  required
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  name="duration_type"
                  value={formData.duration_type}
                  onChange={(e) => setFormData((p) => ({ ...p, duration_type: e.target.value }))}
                  required
                  className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="month">Oy</option>
                  <option value="week">Hafta</option>
                  <option value="day">Kun</option>
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
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-60"
                >
                  {isEditing ? "Yangilash" : "Yaratish"}
                </button>
              </div>

              {error && (
                <p className="mt-3 text-sm text-red-600">{error}</p>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Статистика — карточки */}
      {!selectedCourse && (
        <div className="p-6">
          <div className="grid  gap-4 mb-6">
            <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500 shadow-sm ">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-gray-800 mb-1">
                    {totalCourses}
                  </div>
                  <div className="text-sm text-gray-500 uppercase font-medium">
                    KURSLAR SONI
                  </div>
                </div>
                <div className="text-blue-500">
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
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={loading}
                />
              </div>

              <button
                onClick={() => setShowFilter((v) => !v)}
                className={`flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${loading ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                disabled={loading}
              >
                <Filter className="w-4 h-4 text-gray-500" />
                Filter
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowImportExport((v) => !v)}
                  className={`flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-sm hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${loading ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  disabled={loading}
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
                onClick={loadCourses}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <RefreshCw className="w-4 h-4" />
                Yangilash
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    name: "",
                    price: "",
                    duration: "",
                    duration_type: "month",
                    methodology: [
                      {
                        month: 1,
                        title: "Основы веб-разработки",
                        lessons: [{ title: "Введение в HTML", description: "Основы HTML разметки" }],
                      },
                    ],
                  });
                  setModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                disabled={loading}
              >
                <Plus className="w-4 h-4" />
                Kurs qo'shish
              </button>
            </div>
          </div>

          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 mb-6 rounded-lg flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={loadCourses}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Qayta urinish
              </button>
            </div>
          )}

          {/* Таблица курсов */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div>ID</div>
                <div className="col-span-3">Kurs nomi</div>
                <div>Davomiylik</div>
                <div>Guruhlar soni</div>
                <div>Narx</div>
                <div className="text-center col-span-3">Amallar</div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
                  <div className="text-gray-500">Yuklanmoqda...</div>
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Kurslar mavjud emas
                </div>
              ) : (
                filteredCourses.map((course, index) => (
                  <div
                    key={course._id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => openCourseDetail(course)}
                  >
                    <div className="grid grid-cols-12 gap-4 items-center text-sm">
                      <div className="text-gray-900">
                        {index + 1}
                      </div>


                      <div className="col-span-3">
                        <span className="font-medium">
                          {course.name}
                        </span>
                      </div>

                      <div className="text-gray-600">
                        {course.duration} {course.duration_type === "week" ? "hafta" : course.duration_type === "day" ? "kun" : "oy"}
                      </div>

                      <div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
                          {course.groups_count}
                        </span>
                      </div>

                      <div className="font-medium text-sm text-gray-800">
                        {Number(course.price).toLocaleString()} UZS
                      </div>

                      <div className="flex gap-2 justify-center col-span-3">
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleEdit(course);
                          }}
                          className="w-10 h-10 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center transition-colors"
                          title="Tahrirlash"
                        >
                          <Pencil className="w-10 h-5" />
                        </button>
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleDelete(course._id);
                          }}
                          className="w-10 h-10 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center transition-colors"
                          title="O‘chirish"
                        >
                          <Trash2 className="w-10 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Детальный экран курса */}
      {selectedCourse && (
        <div className="p-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-5">
                <button
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border font-semibold"
                  onClick={closeCourseDetail}
                >
                  <ChevronLeft size={18} />
                  Ortga
                </button>
                <h2 className="text-2xl font-semibold text-gray-700">
                  <span className="text-gray-900">{selectedCourse.name}</span>
                </h2>
              </div>
              {detailLoading ? (
                <span className="text-sm text-gray-500">Yuklanmoqda...</span>
              ) : error ? (
                <span className="text-sm text-red-600">{error}</span>
              ) : null}
            </div>

            {/* Группы курса */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Guruhlar</h3>
              <div className="flex flex-wrap gap-2">
                {detailData.courseGroups.length ? (
                  detailData.courseGroups.map((g) => {
                    const expired = detailData.expiredGroupIds.has(gid(g));
                    return (
                      <span
                        key={gid(g)}
                        className={
                          "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs " +
                          (expired
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-blue-50 text-blue-800 border-blue-200")
                        }
                        title={expired ? "Окончание длительности курса — группа просрочена" : "Активная группа"}
                      >
                        {g.name || g.group_name || gid(g)}
                        {expired && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold">
                            Expired
                          </span>
                        )}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-sm text-gray-500">Guruhlar topilmadi</span>
                )}
              </div>
            </div>

            {/* Ученики курса */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                O‘quvchilar ({detailData.courseStudents.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-gray-700">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">F.I.Sh</th>
                      <th className="px-4 py-3 text-left">Telefon</th>
                      <th className="px-4 py-3 text-left">Guruh(lar)</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-center">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {detailData.courseStudents.length ? (
                      detailData.courseStudents.map((s, i) => {
                        const full =
                          `${s?.surname || ""} ${s?.name || ""}`.trim() ||
                          s?.student_id ||
                          "-";
                        const phone = s?.student_phone || s?.phone || "-";
                        const gIdsOfStudent = new Set(
                          (Array.isArray(s?.groups) ? s.groups.map(String) : [])
                            .concat([s?.group_id, s?.groupId].filter(Boolean).map(String))
                        );
                        const groupNames = detailData.courseGroups
                          .filter((g) => gIdsOfStudent.has(gid(g)))
                          .map((g) => g.name || g.group_name || gid(g));
                        const status = String(s?.status || "").toLowerCase();

                        return (
                          <tr key={s._id || s.id || s.student_id || i}>
                            <td className="px-4 py-2">{i + 1}</td>
                            <td className="px-4 py-2">{full}</td>
                            <td className="px-4 py-2">{phone}</td>
                            <td className="px-4 py-2">
                              {groupNames.length ? groupNames.join(", ") : "—"}
                            </td>
                            <td className="px-4 py-2">
                              <span
                                className={
                                  "px-2 py-1 rounded text-white " +
                                  (status === "active" ? "bg-green-600" : "bg-gray-500")
                                }
                              >
                                {s.status || "—"}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex items-center justify-center gap-2">
                                {status === "muzlagan" ? (
                                  <button
                                    onClick={() => unfreezeStudent(sid(s))}
                                    className="w-9 h-9 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center transition-colors"
                                    title="Aktivlashtirish"
                                  >
                                    <Unlock className="w-5 h-5" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => freezeStudent(sid(s))}
                                    className="w-9 h-9 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center transition-colors"
                                    title="Muzlatish"
                                  >
                                    <Snowflake className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-gray-500">
                          O‘quvchilar topilmadi
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

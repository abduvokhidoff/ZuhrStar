import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as RTooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line
} from 'recharts';

const API_BASE = 'https://zuhrstar-production.up.railway.app/api';
const REFRESH_URL = `${API_BASE}/auth/refresh`;

// ---- Enhanced API client with better refresh token handling ----
const createApiClient = (getTokens, onTokens, onLogout) => {
  let isRefreshing = false;
  let refreshQueue = [];

  const processQueue = (error, token = null) => {
    refreshQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    refreshQueue = [];
  };

  const makeRequest = async (url, options = {}) => {
    const { accessToken } = getTokens();

    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (response.status === 401 && !options._retry) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            refreshQueue.push({ resolve, reject });
          }).then((token) => {
            return makeRequest(url, {
              ...options,
              headers: {
                ...options.headers,
                Authorization: `Bearer ${token}`,
              },
              _retry: true,
            });
          });
        }

        isRefreshing = true;
        options._retry = true;

        try {
          const { refreshToken } = getTokens();
          if (!refreshToken) {
            throw new Error('No refresh token available');
          }

          const refreshResponse = await fetch(REFRESH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (!refreshResponse.ok) {
            throw new Error('Refresh token expired');
          }

          const refreshData = await refreshResponse.json();
          const newAccessToken = refreshData?.accessToken || refreshData?.access_token;
          const newRefreshToken = refreshData?.refreshToken || refreshData?.refresh_token || refreshToken;

          if (!newAccessToken) {
            throw new Error('No access token in refresh response');
          }

          onTokens({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
          });

          processQueue(null, newAccessToken);

          return makeRequest(url, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${newAccessToken}`,
            },
            _retry: true,
          });

        } catch (refreshError) {
          processQueue(refreshError, null);
          onLogout();
          throw refreshError;
        } finally {
          isRefreshing = false;
        }
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      throw error;
    }
  };

  return {
    get: (endpoint) => makeRequest(`${API_BASE}${endpoint}`),
    post: (endpoint, data) => makeRequest(`${API_BASE}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  };
};

// ---- Helper functions ----
const n = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
};

const money = (v) => {
  try {
    return n(v).toLocaleString('uz-UZ') + " so'm";
  } catch {
    return `${n(v)} so'm`;
  }
};


const isPaid = (student) => {
  if (typeof student?.paid === 'boolean') return student.paid;
  if (typeof student?.isPaid === 'boolean') return student.isPaid;
  const status = String(student?.paymentStatus || student?.status || '').toLowerCase();
  return ['paid', 'tolagan', "to'lagan"].includes(status);
};

const isActive = (student) => {
  const status = String(student?.status || '').toLowerCase();
  return ['active', 'faol', 'aktiv'].includes(status);
};

const getTeacherId = (teacher) => {
  return teacher?.teacher_id || teacher?.id || teacher?._id || teacher?.uuid || teacher?.teacherId;
};

const getTeacherName = (teacher) => {
  if (teacher?.fullName) return teacher.fullName;
  const firstName = teacher?.firstName || teacher?.first_name || '';
  const lastName = teacher?.lastName || teacher?.last_name || '';
  return [firstName, lastName].filter(Boolean).join(' ') || "Noma'lum o'qituvchi";
};

const getStudentTeacherIds = (student) => {
  // Multiple possible formats for teacher assignment
  if (Array.isArray(student?.teachers)) return student.teachers;
  if (Array.isArray(student?.teacherIds)) return student.teacherIds;
  if (student?.teacherId) return [student.teacherId];
  if (student?.teacher_id) return [student.teacher_id];
  if (student?.teacher) return [student.teacher];
  return [];
};

export default function Finance() {
  const dispatch = useDispatch();
  const accessToken = useSelector(s => s?.auth?.accessToken);
  const refreshToken = useSelector(s => s?.auth?.refreshToken);

  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const api = useMemo(() => createApiClient(
    () => ({ accessToken, refreshToken }),
    ({ accessToken: a, refreshToken: r }) => {
      dispatch({
        type: 'auth/setTokens',
        payload: { accessToken: a, refreshToken: r }
      });
    },
    () => {
      dispatch({ type: 'auth/logout' });
    }
  ), [accessToken, refreshToken, dispatch]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // Parallel API calls
        const [studentsData, teachersData, salariesData, checksData] = await Promise.allSettled([
          api.get('/students'),
          api.get('/teachers'),
          api.get('/salaries'),
          api.get('/checks')
        ]);

        if (!isMounted) return;

        // Handle students
        if (studentsData.status === 'fulfilled') {
          const students = studentsData.value?.students || studentsData.value || [];
          setStudents(Array.isArray(students) ? students : []);
        } else {
          console.error('Students fetch failed:', studentsData.reason);
          setStudents([]);
        }

        // Handle teachers
        if (teachersData.status === 'fulfilled') {
          const teachers = teachersData.value?.teachers || teachersData.value || [];
          setTeachers(Array.isArray(teachers) ? teachers : []);
        } else {
          console.error('Teachers fetch failed:', teachersData.reason);
          setTeachers([]);
        }

        // Handle salaries
        if (salariesData.status === 'fulfilled') {
          const salaries = salariesData.value?.salaries || salariesData.value || [];
          setSalaries(Array.isArray(salaries) ? salaries : []);
        } else {
          console.error('Salaries fetch failed:', salariesData.reason);
          setSalaries([]);
        }

        // Handle checks
        if (checksData.status === 'fulfilled') {
          const checks = checksData.value?.checks || checksData.value || [];
          setChecks(Array.isArray(checks) ? checks : []);
        } else {
          console.error('Checks fetch failed:', checksData.reason);
          setChecks([]);
        }

        setUpdatedAt(new Date());


      } catch (e) {
        if (isMounted) {
          setError(e?.message || "Ma'lumotlarni yuklashda xatolik");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();
    return () => { isMounted = false; };
  }, [api]);

  // Calculate student statistics
  const studentStats = useMemo(() => {
    const total = students.length;
    const paid = students.filter(isPaid).length;
    const unpaid = total - paid;
    const active = students.filter(isActive).length;
    const inactive = total - active;
    const totalBalance = students.reduce((sum, student) => sum + n(student?.balance || student?.amount), 0);

    return { total, paid, unpaid, active, inactive, totalBalance };
  }, [students]);

  // Create salary map from API data
  const salaryMap = useMemo(() => {
    const map = new Map();
    salaries.forEach(salary => {
      const teacherId = salary?.teacherId || salary?.teacher_id || salary?.teacher || salary?.id;
      const amount = n(salary?.amount || salary?.total || salary?.salary);
      if (teacherId) {
        map.set(teacherId, amount);
      }
    });
    return map;
  }, [salaries]);

  // Calculate teacher rows with proper salary calculation
  const teacherRows = useMemo(() => {
    return teachers.map(teacher => {
      const teacherId = getTeacherId(teacher);
      const role = teacher?.role || teacher?.position || 'Teacher';

      // Find students assigned to this teacher
      const assignedStudents = students.filter(student => {
        const studentTeacherIds = getStudentTeacherIds(student);
        return studentTeacherIds.includes(teacherId);
      });

      // Dynamic base salary calculation based on student count and role
      let baseSalary = 0;
      const studentCount = assignedStudents.length;

      if (role === 'HeadMentor' || role === 'head_mentor') {
        baseSalary = 8_000_000 + (studentCount * 300_000); // HeadMentor gets more per student
      } else if (role === 'Mentor' || role === 'mentor') {
        baseSalary = 5_000_000 + (studentCount * 250_000); // Mentor gets medium per student
      } else {
        baseSalary = 4_000_000 + (studentCount * 200_000); // Teacher gets base per student
      }

      // Additional bonuses
      const paidBonus = assignedStudents.filter(isPaid).length * 100_000; // Bonus for paid students
      const calculatedSalary = baseSalary + paidBonus;

      // Use API salary if available, otherwise use calculated
      const apiSalary = salaryMap.get(teacherId);
      const totalSalary = apiSalary || calculatedSalary;

      return {
        id: teacherId,
        name: getTeacherName(teacher),
        phone: teacher?.phone || teacher?.phoneNumber || '',
        role,
        studentCount: assignedStudents.length,
        paidStudentsCount: assignedStudents.filter(isPaid).length,
        baseSalary,
        bonus: paidBonus,
        totalSalary,
        source: apiSalary ? 'API' : 'Hisoblangan'
      };
    });
  }, [teachers, students, salaryMap]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalSalaries = teacherRows.reduce((sum, row) => sum + n(row.totalSalary), 0);

    const successfulChecks = checks.filter(check => {
      const status = String(check?.status || '').toLowerCase();
      return !status || ['paid', 'success', 'tasdiqlandi', 'tolagan'].includes(status);
    });

    const totalRevenue = successfulChecks.reduce((sum, check) => {
      return sum + n(check?.amount || check?.sum || check?.total);
    }, 0);

    return { totalSalaries, totalRevenue };
  }, [teacherRows, checks]);

  // Chart data
  const paymentChartData = useMemo(() => [
    { name: "To'lagan", value: studentStats.paid, color: '#10B981' },
    { name: "To'lamagan", value: studentStats.unpaid, color: '#EF4444' },
  ], [studentStats]);

  const statusChartData = useMemo(() => [
    { name: 'Faol', count: studentStats.active },
    { name: 'Nofaol', count: studentStats.inactive },
  ], [studentStats]);


  // Fixed salary chart data + dual axis for better readability
  const salaryChartData = useMemo(() => {
    return teacherRows.map(row => ({
      name: row.name.split(' ')[0] || row.name, // First name only for chart
      salaryM: Math.round(row.totalSalary / 1_000_000 * 10) / 10,
      students: row.studentCount
    }));
  }, [teacherRows]);

  const revenueMonthly = useMemo(() => {
    const monthlyMap = new Map();

    checks.forEach(check => {
      const dateStr = check?.date || check?.createdAt || check?.paidAt || check?.updatedAt;
      const date = new Date(dateStr);

      if (!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const amount = n(check?.amount || check?.sum || check?.total);
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + amount);
      }
    });

    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue }));
  }, [checks]);

  const emptyState = (
    <div className="grid place-items-center h-80 text-center">
      <div className="space-y-2">
        <div className="text-3xl">🗂</div>
        <p className="text-slate-500">Hozircha ma'lumot yo'q</p>
      </div>
    </div>
  );

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-2 sm:p-4 md:p-6">
        <div className="min-h-[60vh] grid place-items-center">
          <div className="w-full max-w-3xl space-y-4 sm:space-y-6 px-2">
            <div className="h-8 sm:h-11 w-2/3 rounded-xl sm:rounded-2xl bg-white/70 animate-pulse backdrop-blur-sm" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 sm:h-24 rounded-xl sm:rounded-2xl bg-white/70 backdrop-blur-sm animate-pulse shadow-lg" />
              ))}
            </div>
            <div className="text-center text-slate-600">
              <div className="inline-flex items-center gap-3">
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm sm:text-base">Ma'lumotlar yuklanmoqda...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-2 sm:p-4 md:p-6">
        <div className="min-h-[60vh] grid place-items-center px-2">
          <div className="flex flex-col sm:flex-row items-center gap-4 rounded-xl sm:rounded-2xl p-4 sm:p-6 bg-white/90 backdrop-blur-sm shadow-xl max-w-lg">
            <div className="text-2xl sm:text-3xl">⚠️</div>
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-semibold text-slate-800">Xatolik yuz berdi</h3>
              <p className="text-red-600 mb-3 text-sm sm:text-base">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-4 sm:px-5 py-2 sm:py-2.5 text-white font-semibold text-sm sm:text-base transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Qayta urinish
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-indigo-100 p-2 sm:p-3 md:p-5">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent mb-1">
                Moliyaviy boshqaruv
              </h1>
              <p className="text-sm sm:text-base text-slate-600/90">O'quvchilar to'lovi, o'qituvchilar oyligi va tushumlar tahlili</p>
            </div>
            {updatedAt && (
              <span className="text-xs sm:text-sm text-slate-600 bg-white/70 ring-1 ring-slate-200 backdrop-blur px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg">
                <span className="hidden sm:inline">Yangilandi: </span>
                <span className="sm:hidden">Yangilangan: </span>
                {updatedAt.toLocaleString('uz-UZ', { 
                  month: 'short', 
                  day: 'numeric', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            )}
          </div>
        </header>

        {/* Top stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {/* Card */}
          <div className="rounded-xl sm:rounded-2xl bg-white/80 ring-1 ring-slate-200 backdrop-blur-sm p-3 sm:p-4 lg:p-5 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-slate-600">Jami o'quvchilar</span>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.95 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z" /></svg>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-800">{studentStats.total}</div>
            <div className="mt-2 sm:mt-3 h-1 sm:h-1.5 w-full bg-slate-200 rounded-full">
              <div className="h-1 sm:h-1.5 bg-slate-600 rounded-full w-full" />
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 ring-1 ring-blue-200/60 backdrop-blur-sm p-3 sm:p-4 lg:p-5 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-blue-700">Faol o'quvchilar</span>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z" /></svg>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-blue-900">{studentStats.active}</div>
            <div className="mt-2 sm:mt-3 h-1 sm:h-1.5 w-full bg-blue-200 rounded-full">
              <div className="h-1 sm:h-1.5 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full" style={{ width: `${studentStats.total > 0 ? (studentStats.active / studentStats.total) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 ring-1 ring-emerald-200/60 backdrop-blur-sm p-3 sm:p-4 lg:p-5 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-emerald-700">To'laganlar</span>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" /></svg>
            </div>
            <div className="text-xl sm:text-2xl lg:text-3xl font-black text-emerald-900">{studentStats.paid}</div>
            <div className="mt-2 sm:mt-3 h-1 sm:h-1.5 w-full bg-emerald-200 rounded-full">
              <div className="h-1 sm:h-1.5 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full" style={{ width: `${studentStats.total > 0 ? (studentStats.paid / studentStats.total) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 ring-1 ring-purple-200/60 backdrop-blur-sm p-3 sm:p-4 lg:p-5 shadow-lg hover:shadow-xl transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs sm:text-sm text-purple-700">Umumiy balans</span>
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" viewBox="0 0 24 24" fill="currentColor"><path d="M11 17h2v-6h3l-4-4-4 4h3zM5 18h14v2H5z" /></svg>
            </div>
            <div className="text-lg sm:text-xl lg:text-2xl font-black text-purple-900">
              <span className="sm:hidden">{money(studentStats.totalBalance).replace(" so'm", "").substring(0, 8)}...</span>
              <span className="hidden sm:inline">{money(studentStats.totalBalance)}</span>
            </div>
            <div className="mt-2 sm:mt-3 h-1 sm:h-1.5 w-full bg-purple-200 rounded-full">
              <div className="h-1 sm:h-1.5 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full w-[85%]" />
            </div>
          </div>
        </section>

        {/* Charts row 1 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="rounded-xl sm:rounded-2xl bg-white/80 ring-1 ring-slate-200 backdrop-blur-sm p-4 sm:p-6 shadow-xl hover:shadow-2xl transition-all">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4">O'quvchilar to'lov holati</h3>
            <div className="h-64 sm:h-80">
              {paymentChartData.reduce((s, d) => s + d.value, 0) === 0 ? (
                emptyState
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={paymentChartData}
                      dataKey="value"
                      innerRadius={40}
                      outerRadius={window.innerWidth < 640 ? 80 : 120}
                      label={({ name, value }) => window.innerWidth < 640 ? `${value}` : `${name}: ${value}`}
                      labelLine={false}
                    >
                      {paymentChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RTooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl bg-white/80 ring-1 ring-slate-200 backdrop-blur-sm p-4 sm:p-6 shadow-xl hover:shadow-2xl transition-all">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4">O'quvchilar holati</h3>
            <div className="h-64 sm:h-80">
              {statusChartData.reduce((s, d) => s + d.count, 0) === 0 ? (
                emptyState
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }} />
                    <RTooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="url(#blueGradient)" />
                    <defs>
                      <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#1D4ED8" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </section>


        {/* Charts row 2 */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="rounded-xl sm:rounded-2xl bg-white/80 ring-1 ring-slate-200 backdrop-blur-sm p-4 sm:p-6 shadow-xl hover:shadow-2xl transition-all">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4">Oyliklar (o'qituvchi kesimida)</h3>
            <div className="h-64 sm:h-80">
              {salaryChartData.length === 0 ? (
                emptyState
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salaryChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#64748b" 
                      tick={{ fontSize: window.innerWidth < 640 ? 9 : 12 }} 
                      interval={0} 
                      angle={window.innerWidth < 640 ? -45 : 0} 
                      textAnchor={window.innerWidth < 640 ? "end" : "middle"}
                      height={window.innerWidth < 640 ? 60 : 40} 
                    />
                    {/* Dual Y axis: left for salary (mln), right for students */}
                    <YAxis yAxisId="left" stroke="#64748b" tick={{ fontSize: window.innerWidth < 640 ? 9 : 12 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748b" tick={{ fontSize: window.innerWidth < 640 ? 9 : 12 }} />
                    <RTooltip
                      formatter={(value, name) => {
                        if (name === 'salaryM') {
                          return [`${value} mln so'm`, 'Oylik'];
                        }
                        if (name === 'students') return [value, "O'quvchilar"];
                        return [value, name];
                      }}
                      labelFormatter={(label) => `${label}`}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    />
                    <Legend formatter={(v) => v === 'salaryM' ? 'Oylik (mln)' : "O'quvchilar"} />
                    <Bar yAxisId="left" dataKey="salaryM" fill="url(#emeraldGradient)" radius={[8, 8, 0, 0]} />
                    <Bar yAxisId="right" dataKey="students" fill="url(#indigoGradient)" radius={[8, 8, 0, 0]} />
                    <defs>
                      <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#047857" />
                      </linearGradient>
                      <linearGradient id="indigoGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366F1" />
                        <stop offset="100%" stopColor="#4338CA" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>


          <div className="rounded-xl sm:rounded-2xl bg-white/80 ring-1 ring-slate-200 backdrop-blur-sm p-4 sm:p-6 shadow-xl hover:shadow-2xl transition-all">
            <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-4">Oylik tushum (checks)</h3>
            <div className="h-64 sm:h-80">
              {revenueMonthly.length === 0 ? (
                emptyState
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueMonthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: window.innerWidth < 640 ? 9 : 12 }} />
                    <YAxis stroke="#64748b" tick={{ fontSize: window.innerWidth < 640 ? 9 : 12 }} />
                    <RTooltip
                      formatter={(value) => money(value)}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', border: 'none', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="#0EA5E9" 
                      strokeWidth={window.innerWidth < 640 ? 3 : 4} 
                      dot={{ fill: '#0EA5E9', strokeWidth: 2, r: window.innerWidth < 640 ? 3 : 5 }} 
                      activeDot={{ r: window.innerWidth < 640 ? 5 : 7, stroke: '#0EA5E9', strokeWidth: 2 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 sm:gap-3">
              <span className="inline-flex items-center rounded-full bg-gradient-to-r from-sky-100 to-sky-200 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-sky-800">
                <span className="hidden sm:inline">Jami tushum: </span>
                <span className="sm:hidden">Tushum: </span>
                <b className="ml-1 text-xs sm:text-sm">
                  <span className="sm:hidden">{money(totals.totalRevenue).replace(" so'm", "").substring(0, 10)}...</span>
                  <span className="hidden sm:inline">{money(totals.totalRevenue)}</span>
                </b>
              </span>
            </div>
          </div>
        </section>

        {/* Teachers table */}
        <section className="rounded-xl sm:rounded-2xl bg-white/80 ring-1 ring-slate-200 backdrop-blur-sm p-4 sm:p-6 shadow-xl hover:shadow-2xl transition-all">
          <div className="flex flex-col gap-4 mb-4 sm:mb-6">
            <h3 className="text-base sm:text-lg font-bold text-slate-800">O'qituvchilar batafsil ma'lumot</h3>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-emerald-100 to-emerald-200 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-emerald-800">
                  <span className="hidden sm:inline">Jami oylik: </span>
                  <span className="sm:hidden">Oylik: </span>
                  <b className="ml-1">
                    <span className="sm:hidden">{money(totals.totalSalaries).replace(" so'm", "").substring(0, 8)}...</span>
                    <span className="hidden sm:inline">{money(totals.totalSalaries)}</span>
                  </b>
                </span>
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-blue-100 to-blue-200 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-blue-800">
                  O'qituvchilar: <b className="ml-1">{teachers.length}</b>
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Table (Cards on small screens) */}
          <div className="block sm:hidden space-y-3">
            {teacherRows.length > 0 ? (
              teacherRows.map((row, idx) => (
                <div key={row.id || idx} className="rounded-lg bg-white/60 backdrop-blur-sm ring-1 ring-slate-200 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-slate-800 text-sm">{row.name}</h4>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${
                        row.role === 'HeadMentor' || row.role === 'head_mentor'
                          ? 'bg-purple-100 text-purple-700'
                          : row.role === 'Mentor' || row.role === 'mentor'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}>
                        {row.role}
                      </span>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      row.source === 'API' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {row.source}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">Telefon:</span>
                      <p className="font-medium text-slate-700">{row.phone || "—"}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">O'quvchilar:</span>
                      <p className="font-medium text-slate-700">{row.studentCount}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">To'laganlar:</span>
                      <p className="font-medium text-emerald-700">{row.paidStudentsCount}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Jami oylik:</span>
                      <p className="font-bold text-slate-900 text-sm">{money(row.totalSalary).replace(" so'm", "").substring(0, 10)}...</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">👨‍🏫</div>
                <p className="text-slate-500">O'qituvchilar topilmadi</p>
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto rounded-xl bg-white/60 backdrop-blur-sm ring-1 ring-slate-200">
            <div className="overflow-visible">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur border-b border-slate-200">
                  <tr className="text-left text-[12px] font-semibold uppercase tracking-wider text-slate-600">
                    <th className="px-3 lg:px-5 py-3 rounded-tl-xl">#</th>
                    <th className="px-3 lg:px-5 py-3">O'qituvchi</th>
                    <th className="px-3 lg:px-5 py-3">Lavozim</th>
                    <th className="px-3 lg:px-5 py-3 hidden md:table-cell">Telefon</th>
                    <th className="px-3 lg:px-5 py-3 text-right">O'quvchilar</th>
                    <th className="px-3 lg:px-5 py-3 text-right">To'lov qilgan</th>
                    <th className="px-3 lg:px-5 py-3 text-right hidden lg:table-cell">Bazaviy</th>
                    <th className="px-3 lg:px-5 py-3 text-right hidden lg:table-cell">Bonus</th>
                    <th className="px-3 lg:px-5 py-3 text-right">Jami oylik</th>
                    <th className="px-3 lg:px-5 py-3 rounded-tr-xl">Manba</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60">
                  {teacherRows.length > 0 ? (
                    teacherRows.map((row, idx) => (
                      <tr key={row.id || idx} className="odd:bg-white/40 hover:bg-white/70 transition-colors">
                        <td className="px-3 lg:px-5 py-3 text-slate-600 font-medium">{idx + 1}</td>
                        <td className="px-3 lg:px-5 py-3 font-semibold text-slate-800">
                          <div className="truncate max-w-[120px] sm:max-w-none">{row.name}</div>
                        </td>
                        <td className="px-3 lg:px-5 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-medium ${
                            row.role === 'HeadMentor' || row.role === 'head_mentor'
                              ? 'bg-purple-100 text-purple-700'
                              : row.role === 'Mentor' || row.role === 'mentor'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}>
                            {row.role}
                          </span>
                        </td>
                        <td className="px-3 lg:px-5 py-3 hidden md:table-cell">
                          {row.phone ? (
                            <a href={`tel:${row.phone}`} className="text-blue-600 hover:text-blue-800 font-medium hover:underline">{row.phone}</a>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 lg:px-5 py-3 text-right font-semibold text-slate-700">{row.studentCount}</td>
                        <td className="px-3 lg:px-5 py-3 text-right">
                          <span className="inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[12px] font-semibold">
                            {row.paidStudentsCount}
                          </span>
                        </td>
                        <td className="px-3 lg:px-5 py-3 text-right font-medium text-slate-700 hidden lg:table-cell">
                          <div className="truncate">{money(row.baseSalary).replace(" so'm", "").substring(0, 8)}...</div>
                        </td>
                        <td className="px-3 lg:px-5 py-3 text-right hidden lg:table-cell">
                          <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 text-[12px] font-semibold">
                            {money(row.bonus).replace(" so'm", "").substring(0, 6)}...
                          </span>
                        </td>
                        <td className="px-3 lg:px-5 py-3 text-right font-extrabold text-base text-slate-900">
                          <div className="truncate">{money(row.totalSalary).replace(" so'm", "").substring(0, 10)}...</div>
                        </td>
                        <td className="px-3 lg:px-5 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-[11px] font-semibold ${
                            row.source === 'API' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {row.source}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="text-4xl">👨‍🏫</div>
                          <div className="text-slate-500 font-medium">O'qituvchilar topilmadi</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Enhanced note */}
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-50/80 to-indigo-50/60 ring-1 ring-slate-200">
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              <span className="font-semibold text-slate-700">💡 Eslatma:</span> Bazaviy oylik — rollar va o'quvchilar soni asosida avtomatik hisoblanadi.
              Agar API'dan oylik ma'lumoti kelsa, u ustuvor olinadi va "API" sifatida belgilanadi.
              Hisoblangan oyliklar esa "Hisoblangan" deb ko'rsatiladi.
            </p>
          </div>
        </section>

        {/* Enhanced Footer */}
        <footer className="text-center py-4 sm:py-6">
          <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-full bg-white/70 ring-1 ring-slate-200 backdrop-blur shadow-lg">
            <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse" />
            <span className="text-xs sm:text-sm font-medium text-slate-600">
              © {new Date().getFullYear()} Moliyaviy boshqaruv paneli
            </span>
            <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse" />
          </div>
        </footer>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell, Tooltip as RTooltip,
  BarChart, Bar
} from 'recharts';

const Dashboard = () => {
  const [loading, setLoading] = useState({
    users: true,
    teachers: true,
    students: true,
    groups: true,
    courses: true,
    checks: true
  });
  const [error, setError] = useState(null);
  const accessToken = useSelector(state => state.auth.accessToken);
  const [groupcount, setGroupCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [employee, setEmployee] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [checks, setChecks] = useState([]);
  const [studentsMap, setStudentsMap] = useState({});

  const studentRegistrationByMonth = useMemo(() => {
    const monthCounts = {};
    const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
    
    students.forEach(student => {
      if (student.createdAt) {
        const date = new Date(student.createdAt);
        const monthYear = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
        monthCounts[monthYear] = (monthCounts[monthYear] || 0) + 1;
      }
    });

    return Object.entries(monthCounts)
      .map(([month, count]) => ({ month, count }))
      .slice(-6);
  }, [students]);

  const genderDistribution = useMemo(() => {
    const male = students.filter(s => s.gender === 'Erkak').length;
    const female = students.filter(s => s.gender === 'Ayol').length;
    
    return [
      { name: 'Erkak', value: male, color: '#3B82F6' },
      { name: 'Ayol', value: female, color: '#EC4899' }
    ];
  }, [students]);

  // Calculate revenue by month from checks
  const revenueMonthly = useMemo(() => {
    const monthlyMap = new Map();

    checks.forEach(check => {
      const dateStr = check?.date || check?.createdAt || check?.paidAt || check?.updatedAt || check?.date_Of_Create || check?.date_of_payment;
      const date = new Date(dateStr);

      if (!isNaN(date.getTime())) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const amount = Number(check?.amount || check?.sum || check?.total || 0);
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + amount);
      }
    });

    return Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue }));
  }, [checks]);

  // Calculate total revenue
  const totalRevenue = useMemo(() => {
    const successfulChecks = checks.filter(check => {
      const status = String(check?.status || '').toLowerCase();
      return !status || ['paid', 'success', 'tasdiqlandi', 'tolagan'].includes(status);
    });

    return successfulChecks.reduce((sum, check) => {
      return sum + Number(check?.amount || check?.sum || check?.total || 0);
    }, 0);
  }, [checks]);

  const formatValue = (value) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(0) + 'k';
    }
    return value.toString();
  };

  const money = (v) => {
    try {
      const num = Number(v) || 0;
      return num.toLocaleString('uz-UZ') + " so'm";
    } catch {
      return `${Number(v) || 0} so'm`;
    }
  };

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    const fetchUsers = async () => {
      try {
        const res = await axios.get("https://zuhrstar-production.up.railway.app/api/users", {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal
        });
        const admins = Array.isArray(res.data?.admins) ? res.data.admins : [];
        setEmployee(admins);
        setLoading(prev => ({ ...prev, users: false }));
      } catch (err) {
        if (axios.isCancel(err)) return;
        console.error("Ошибка при загрузке сотрудников:", err);
        setLoading(prev => ({ ...prev, users: false }));
      }
    };
    fetchUsers();
    return () => controller.abort();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    const fetchTeachers = async () => {
      try {
        const res = await axios.get("https://zuhrstar-production.up.railway.app/api/teachers", {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal
        });
        const teachersData = Array.isArray(res.data?.teachers) ? res.data.teachers : (Array.isArray(res.data) ? res.data : []);
        setTeachers(teachersData);
        setLoading(prev => ({ ...prev, teachers: false }));
      } catch (err) {
        if (axios.isCancel(err)) return;
        console.error("Ошибка при загрузке учителей:", err);
        setLoading(prev => ({ ...prev, teachers: false }));
      }
    };
    fetchTeachers();
    return () => controller.abort();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    const fetchChecks = async () => {
      try {
        const res = await axios.get("https://zuhrstar-production.up.railway.app/api/checks", {
          headers: { Authorization: `Bearer ${accessToken}` },
          signal: controller.signal
        });
        const checksData = Array.isArray(res.data?.checks) ? res.data.checks : (Array.isArray(res.data) ? res.data : []);
        setChecks(checksData);

        // Fetch student details for each check
        const studentIds = [...new Set(checksData.map(c => c.paid_student_id).filter(Boolean))];
        const studentsMapTemp = {};

        await Promise.allSettled(
          studentIds.map(async (studentId) => {
            try {
              const studentRes = await axios.get(`https://zuhrstar-production.up.railway.app/api/students/${studentId}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
                signal: controller.signal
              });
              studentsMapTemp[studentId] = studentRes.data;
            } catch (err) {
              console.error(`Failed to fetch student ${studentId}:`, err);
              studentsMapTemp[studentId] = null;
            }
          })
        );

        setStudentsMap(studentsMapTemp);
        setLoading(prev => ({ ...prev, checks: false }));
      } catch (err) {
        if (axios.isCancel(err)) return;
        console.error("Ошибка при загрузке чеков:", err);
        setLoading(prev => ({ ...prev, checks: false }));
      }
    };
    fetchChecks();
    return () => controller.abort();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    axios.get('https://zuhrstar-production.up.railway.app/api/students', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    })
      .then(res => {
        const studentsData = Array.isArray(res.data) ? res.data : [];
        setStudents(studentsData);
        setStudentCount(studentsData.length);
        setLoading(prev => ({ ...prev, students: false }));
      })
      .catch(err => {
        if (!axios.isCancel(err)) console.error("Ошибка при загрузке студентов:", err);
        setLoading(prev => ({ ...prev, students: false }));
      });
    return () => controller.abort();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    axios.get('https://zuhrstar-production.up.railway.app/api/groups', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    })
      .then(res => {
        const groups = Array.isArray(res.data) ? res.data : [];
        setGroupCount(groups.length);
        setLoading(prev => ({ ...prev, groups: false }));
      })
      .catch(err => {
        if (!axios.isCancel(err)) console.error("Ошибка при загрузке групп:", err);
        setLoading(prev => ({ ...prev, groups: false }));
      });
    return () => controller.abort();
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    const controller = new AbortController();
    axios.get('https://zuhrstar-production.up.railway.app/api/courses', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
    })
      .then(res => {
        const courses = Array.isArray(res.data) ? res.data : [];
        setCourseCount(courses.length);
        setLoading(prev => ({ ...prev, courses: false }));
      })
      .catch(err => {
        if (!axios.isCancel(err)) console.error("Ошибка при загрузке курсов:", err);
        setLoading(prev => ({ ...prev, courses: false }));
      });
    return () => controller.abort();
  }, [accessToken]);

  const combinedEmployees = useMemo(() => {
    const combined = [...employee];
    const remainingSlots = 8 - employee.length;
    if (remainingSlots > 0 && teachers.length > 0) {
      combined.push(...teachers.slice(0, remainingSlots));
    }
    return combined.slice(0, 8);
  }, [employee, teachers]);

  const totalEmployeeCount = useMemo(() => {
    return employee.length + teachers.length;
  }, [employee, teachers]);

  const studentStats = useMemo(() => {
    const totalStudents = students.length;
    const paid = students.filter(s => s.paid === true).length;
    const unpaid = students.filter(s => s.paid === false || s.paid === undefined).length;
    const active = students.filter(s => s.status === 'active').length;
    const inactive = students.filter(s => s.status === 'inactive' || !s.status).length;
    const totalBalance = students.reduce((sum, student) => {
      const balance = parseFloat(student?.balance || 0);
      return sum + (isNaN(balance) ? 0 : balance);
    }, 0);
    return { total: totalStudents, paid, unpaid, active, inactive, totalBalance };
  }, [students]);

  const paymentChartData = useMemo(() => [
    { name: "To'lagan", value: studentStats.paid, color: '#10B981' },
    { name: "To'lamagan", value: studentStats.unpaid, color: '#EF4444' },
  ], [studentStats]);

  const emptyState = (
    <div className="grid place-items-center h-full text-center">
      <div className="space-y-2">
        <div className="text-3xl">🗂</div>
        <p className="text-slate-500">Hozircha ma'lumot yo'q</p>
      </div>
    </div>
  );

  const renderInsideLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) => {
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.38;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    const text = window.innerWidth < 640 ? `${value}` : `${name}: ${value}`;
    return (
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
        style={{ fontWeight: 700, fontSize: window.innerWidth < 640 ? 12 : 14 }}
        stroke="white" strokeWidth={3} paintOrder="stroke" fill="#0f172a">
        {text}
      </text>
    );
  };

  const isLoading = Object.values(loading).some(val => val === true);

  if (isLoading) {
    return (
      <div className='bg-[#F5F4F6] min-h-screen p-3 sm:p-4 md:p-6'>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white w-full h-[120px] sm:h-[142px] rounded-lg p-4 sm:p-6">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-[#F5F4F6] min-h-screen p-3 sm:p-4 md:p-6'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6 sm:mb-8 md:mb-[50px]'>
        <div className='flex flex-col justify-center items-start'>
          <p className='text-sm sm:text-[16px] font-[400] text-[#7D8592]'>Qaytganizga xursandmiz!</p>
          <h1 className='text-2xl sm:text-3xl md:text-[36px] font-[700] text-[#0A1629]'>Home</h1>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-6">
        <div className="bg-white w-full p-4 sm:p-6 h-[120px] sm:h-[142px] rounded-lg shadow-sm">
          <div className='flex justify-start items-center gap-2'>
            <div className='w-[6px] h-[22px] rounded-r-[4px] bg-[#643DFF]'></div>
            <p className='text-xs sm:text-[14px] font-[500] text-[#858D9D]'>O'quvchilar soni</p>
          </div>
          <div className='flex flex-col justify-start items-start pl-[14px] sm:pl-[20px] mt-4 sm:mt-6'>
            <p className='text-xl sm:text-2xl font-bold text-gray-900'>{studentCount}</p>
          </div>
        </div>

        <div className="bg-white w-full p-4 sm:p-6 h-[120px] sm:h-[142px] rounded-lg shadow-sm">
          <div className='flex justify-start items-center gap-2'>
            <div className='w-[6px] h-[22px] rounded-r-[4px] bg-[#14B8A6]'></div>
            <p className='text-xs sm:text-[14px] font-[500] text-[#858D9D]'>Guruhlar soni</p>
          </div>
          <div className='flex flex-col justify-start items-start pl-[14px] mt-4'>
            <p className='text-xl sm:text-2xl font-bold text-gray-900'>{groupcount}</p>
          </div>
        </div>

        <div className="bg-white w-full p-4 sm:p-6 h-[120px] sm:h-[142px] rounded-lg shadow-sm">
          <div className='flex justify-start items-center gap-2'>
            <div className='w-[6px] h-[22px] rounded-r-[4px] bg-[#8B5CF6]'></div>
            <p className='text-xs sm:text-[14px] font-[500] text-[#858D9D]'>Xodimlar soni</p>
          </div>
          <div className='flex flex-col justify-start items-start pl-[14px] mt-4'>
            <p className='text-xl sm:text-2xl font-bold text-gray-900'>{totalEmployeeCount}</p>
          </div>
        </div>

        <div className="bg-white w-full p-4 sm:p-6 h-[120px] sm:h-[142px] rounded-lg shadow-sm">
          <div className='flex justify-start items-center gap-2'>
            <div className='w-[6px] h-[22px] rounded-r-[4px] bg-[#F59E0B]'></div>
            <p className='text-xs sm:text-[14px] font-[500] text-[#858D9D]'>Kurslar soni</p>
          </div>
          <div className='flex flex-col justify-start items-start pl-[14px] mt-4'>
            <p className='text-xl sm:text-2xl font-bold text-gray-900'>{courseCount}</p>
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-[20px] font-[600] text-gray-700">Oylik tushum</h2>
          <span className="inline-flex items-center rounded-full bg-sky-50 border border-sky-200 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-sky-800">
            <span className="hidden sm:inline">Jami tushum: </span>
            <span className="sm:hidden">Tushum: </span>
            <b className="ml-1">{money(totalRevenue)}</b>
          </span>
        </div>

        <div className="h-64 sm:h-80 md:h-96">
          {revenueMonthly.length === 0 ? (
            emptyState
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueMonthly} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280" 
                  tick={{ fontSize: window.innerWidth < 640 ? 9 : 12 }} 
                />
                <YAxis 
                  stroke="#6b7280" 
                  tick={{ fontSize: window.innerWidth < 640 ? 9 : 12 }}
                  tickFormatter={(value) => formatValue(value)}
                />
                <RTooltip
                  formatter={(value) => money(value)}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px', 
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
                  }}
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
      </div>

      {/* Charts Row */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6'>
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h3 className="text-lg sm:text-[20px] font-[600] text-[#333843] mb-4">Ro'yxatdan o'tish</h3>
          <div className="h-48 sm:h-56">
            {studentRegistrationByMonth.length === 0 ? emptyState : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studentRegistrationByMonth} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#9CA3AF' }} angle={-15} textAnchor="end" height={60} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <RTooltip />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h3 className="text-lg sm:text-[20px] font-[600] text-[#333843] mb-4">Jinsi bo'yicha</h3>
          <div className="h-48 sm:h-56">
            {studentStats.total === 0 ? emptyState : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={genderDistribution} dataKey="value" innerRadius={40} outerRadius={70}
                    label={renderInsideLabel} labelLine={false} paddingAngle={2}>
                    {genderDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <h3 className="text-lg sm:text-[20px] font-[600] text-[#333843] mb-4">To'lov holati</h3>
          <div className="h-48 sm:h-56">
            {studentStats.total === 0 ? emptyState : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentChartData} dataKey="value" innerRadius={40} outerRadius={70}
                    label={renderInsideLabel} labelLine={false} paddingAngle={2}>
                    {paymentChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Employees */}
      <div className='flex flex-col lg:flex-row justify-between gap-6 items-start mt-8 sm:mt-[46px] mb-6'>
        <div className="flex-1 bg-white rounded-[24px] p-4 sm:p-6">
          <div className='flex justify-between items-center mb-4'>
            <p className='text-lg sm:text-[22px] font-[700]'>Xodimlar</p>
            <a href="/super-admin/employees" className='text-sm sm:text-[16px] font-[600] text-[#3F8CFF] whitespace-nowrap'>Hammasini korish &gt;</a>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {combinedEmployees.map((user, index) => (
              <div key={user._id || index} className="bg-[#F4F9FD] rounded-[20px] p-3 sm:p-4 flex justify-center text-center items-center flex-col">
                <img className="mb-2 w-[40px] h-[40px] sm:w-[45px] sm:h-[45px] rounded-full object-cover" src={user.imgURL || user.image || 'https://via.placeholder.com/50'} alt="" />
                <p className="mb-[2px] text-sm sm:text-[15px] font-[700] truncate w-full">{user.fullName || user.name || 'N/A'}</p>
                <p className="text-xs sm:text-[13px] text-gray-600 truncate w-full">{user.role || user.position || "O'qituvchi"}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
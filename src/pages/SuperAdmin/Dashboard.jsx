import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis,
  PieChart, Pie, Cell, Tooltip as RTooltip,
  BarChart, Bar
} from 'recharts';

const Dashboard = () => {
  const [paymentsData, setPaymentsData] = useState([]);
  const [loading, setLoading] = useState({
    users: true,
    teachers: true,
    students: true,
    groups: true,
    courses: true,
    payments: true
  });
  const [error, setError] = useState(null);
  const accessToken = useSelector(state => state.auth.accessToken);
  const [groupcount, setGroupCount] = useState(0);
  const [studentCount, setStudentCount] = useState(0);
  const [courseCount, setCourseCount] = useState(0);
  const [employee, setEmployee] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);

  const staticData = [
    { day: 1, click: 220000, payme: 180000 },
    { day: 2, click: 870000, payme: 940000 },
    { day: 3, click: 115000, payme: 125000 },
    { day: 4, click: 0, payme: 145000 },
    { day: 5, click: 620000, payme: 0 },
    { day: 6, click: 330000, payme: 400000 },
    { day: 7, click: 980000, payme: 910000 },
    { day: 8, click: 1450000, payme: 1350000 },
    { day: 9, click: 65000, payme: 59000 },
    { day: 10, click: 780000, payme: 760000 },
    { day: 11, click: 125000, payme: 111000 },
    { day: 12, click: 0, payme: 134000 },
    { day: 13, click: 490000, payme: 0 },
    { day: 14, click: 720000, payme: 710000 },
    { day: 15, click: 880000, payme: 910000 },
    { day: 16, click: 1430000, payme: 1380000 },
    { day: 17, click: 330000, payme: 290000 },
    { day: 18, click: 150000, payme: 170000 },
    { day: 19, click: 1150000, payme: 1110000 },
    { day: 20, click: 810000, payme: 790000 },
    { day: 21, click: 97000, payme: 104000 },
    { day: 22, click: 1350000, payme: 1320000 },
    { day: 23, click: 420000, payme: 450000 },
    { day: 24, click: 570000, payme: 500000 },
    { day: 25, click: 380000, payme: 350000 },
    { day: 26, click: 1200000, payme: 1180000 },
    { day: 27, click: 255000, payme: 300000 },
    { day: 28, click: 1480000, payme: 1495000 },
    { day: 29, click: 700000, payme: 690000 },
    { day: 30, click: 50000, payme: 47000 }
  ];

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
    let mounted = true;
    (async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!mounted) return;
        setPaymentsData(staticData);
        setLoading(prev => ({ ...prev, payments: false }));
      } catch (err) {
        if (!mounted) return;
        setError(err.message);
        setLoading(prev => ({ ...prev, payments: false }));
      }
    })();
    return () => { mounted = false; };
  }, []);

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

  const formatValue = (value) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(0) + ' 000 000';
    } else if (value >= 1000) {
      return Math.floor(value / 1000) + ' 000';
    }
    return value.toString();
  };

  const formatValueShort = (value) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(0) + 'k';
    }
    return value.toString();
  };

  const CustomTooltipArea = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-700">{`Day ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${formatValue(entry.value)} so'm`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

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
          <p className='text-sm sm:text-[16px] font-[400] text-[#7D8592]'>Welcome back!</p>
          <h1 className='text-2xl sm:text-3xl md:text-[36px] font-[700] text-[#0A1629]'>Dashboard</h1>
        </div>
        <p className='py-[6px] px-[12px] sm:px-[15px] bg-[#E6EDF5] rounded-[14px] text-xs sm:text-sm whitespace-nowrap'>
          Nov 16, 2020 - Dec 16, 2020
        </p>
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

      {/* Payments Chart */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-[20px] font-[600] text-gray-700">To'lovlar</h2>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-xs sm:text-sm text-gray-600">CLICK</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-teal-400"></div>
              <span className="text-xs sm:text-sm text-gray-600">Payme</span>
            </div>
          </div>
        </div>

        <div className="h-64 sm:h-80 md:h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={paymentsData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
              <defs>
                <linearGradient id="colorClick" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorPayme" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <YAxis domain={[0, 'dataMax']} tickFormatter={(value) => formatValueShort(value)} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
              <RTooltip content={<CustomTooltipArea />} />
              <Area type="monotone" dataKey="click" stroke="#3B82F6" strokeWidth={2} fill="url(#colorClick)" name="Click" />
              <Area type="monotone" dataKey="payme" stroke="#2DD4BF" strokeWidth={2} fill="url(#colorPayme)" name="Payme" />
            </AreaChart>
          </ResponsiveContainer>
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

      {/* Employees and Plans */}
      <div className='flex flex-col lg:flex-row justify-between gap-6 items-start mt-8 sm:mt-[46px] mb-6'>
        <div className="flex-1 bg-white rounded-[24px] p-4 sm:p-6">
          <div className='flex justify-between items-center mb-4'>
            <p className='text-lg sm:text-[22px] font-[700]'>Xodimlar</p>
            <a href="/super-admin/employees" className='text-sm sm:text-[16px] font-[600] text-[#3F8CFF] whitespace-nowrap'>View all &gt;</a>
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

        <div className='w-full lg:w-[340px] rounded-[24px] bg-white p-4 sm:p-6'>
          <div className='flex justify-between items-center mb-4'>
            <p className='text-lg sm:text-[22px] font-[700]'>Plans</p>
            <a href="#" className='text-sm sm:text-[16px] font-[600] text-[#3F8CFF]'>View all &gt;</a>
          </div>
          <div className='flex flex-col justify-center items-center gap-3 sm:gap-4'>
            {[1, 2, 3].map((i) => (
              <div key={i} className="py-[8px] min-h-[80px] sm:min-h-[90px] border-l-[4px] pl-4 sm:pl-[20px] rounded-[2px] border-[#3F8CFF] w-full">
                <div className='flex justify-between items-start'>
                  <p className="text-sm sm:text-base">Presentation of the new department</p>
                </div>
                <div className='flex mt-2 sm:mt-[9px] justify-between items-center'>
                  <p className="text-xs sm:text-sm text-gray-600">Today | 5:00 PM</p>
                  <div className='flex justify-center items-center gap-[6px] px-[9px] py-[6px] bg-[#F4F9FD] rounded-[8px] text-[#7D8592] text-xs sm:text-[14px] font-[700]'>
                    <p>4h</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
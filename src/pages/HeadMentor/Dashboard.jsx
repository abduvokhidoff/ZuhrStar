import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';

const API = 'https://zuhrstar-production.up.railway.app/api';

const Dashboard = () => {
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get token and user info from Redux store
  const { accessToken, user } = useSelector((state) => state.auth);

  const mentorName = user?.name || user?.username || 'Mentor';
  const role = user?.role || 'Mentor';

  useEffect(() => {
    // Check if token exists
    if (!accessToken) {
      setError('Tizimga kirishingiz kerak');
      setLoading(false);
      return;
    }

    const headers = { Authorization: `Bearer ${accessToken}` };

    const fetchData = async () => {
      try {
        const endpoints = ['students', 'groups', 'attendance', 'lessons'];
        const responses = await Promise.all(
          endpoints.map(e => fetch(`${API}/${e}`, { headers }))
        );

        responses.forEach((res, i) => {
          console.log(`Status (${endpoints[i]}):`, res.status);
        });

        const allOk = responses.every(res => res.ok || res.status === 404);
        if (!allOk) {
          throw new Error('API dan maʼlumot olishda xatolik yuz berdi.');
        }

        const data = await Promise.all(
          responses.map(async (res, i) =>
            res.status === 404 ? [] : await res.json()
          )
        );

        setStudents(data[0]);
        setGroups(data[1].reverse()); // Guruhlarni teskari tartibda o'rnatish
        setAttendance(data[2]);
        setLessons(Array.isArray(data[3]) ? data[3] : []);
        setLoading(false);
      } catch (err) {
        console.error('API Error:', err);
        setError('Xatolik: ' + err.message);
        setLoading(false);
      }
    };

    fetchData();
  }, [accessToken]);

  const today = new Date();
  const day = today.getDate();
  const weekday = today.getDay();
  const isOdd = day % 2 === 1;

  // Guruhlardan darslar yaratish
  const groupLessons = groups.map((group, index) => {
    const times = ['09:00', '11:00', '14:00', '16:00'];
    const durations = ['1s', '1.5s', '2s', '1s'];
    return {
      time: times[index % times.length],
      duration: durations[index % durations.length],
      groupId: group._id || `${index + 1}`,
      groupName: group.name || `Guruh #${index + 1}`,
      dayType: index % 3 // 0-yakshanba, 1-toq, 2-juft
    };
  });

  // Kun turi bo'yicha darslarni filtrlash
  const filteredLessons = groupLessons.filter(lesson => {
    if (weekday === 0) return lesson.dayType === 0; // Yakshanba
    if (isOdd) return lesson.dayType === 1; // Toq kun
    return lesson.dayType === 2; // Juft kun
  });

  const getEndTime = (startTime) => {
    const [h, m] = startTime.split(':').map(Number);
    return `${(h + 1).toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const attendancePercentage = attendance.length
    ? Math.round((attendance.filter(a => a.present).length / attendance.length) * 100)
    : 0;

  const chartData = Array.from({ length: 30 }, (_, i) => {
    const factor = Math.random() * 0.2 + 0.9;
    return {
      day: i + 1,
      students: Math.floor(students.length * factor),
      groups: Math.floor(groups.length * factor)
    };
  });

  const dailyData = chartData.map(item => ({
    day: item.day,
    beginners: Math.ceil(item.students * 0.6),
    advanced: Math.floor(item.students * 0.4),
  }));

  // Format functions
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

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  // Custom tooltips
  const CustomTooltipArea = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-700">{`Kun ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomTooltipBar = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-700">{`Kun ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className='bg-gray-50 min-h-screen p-6'>
        <div className="animate-pulse">
          <div className="grid grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white w-full h-36 rounded-lg p-6">
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
          <div className="bg-white h-96 rounded-lg mb-6"></div>
          <div className="flex gap-6">
            <div className="bg-white w-full h-64 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='bg-gray-50 min-h-screen p-6 flex items-center justify-center'>
        <div className="text-center">
          <p className="text-red-500 text-lg font-semibold mb-2">Xatolik yuz berdi:</p>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Qayta yuklash
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-gray-50 min-h-screen p-6'>
      {/* Header */}
      <div className='flex justify-between items-end mb-12'>
        <div className='flex flex-col justify-center items-start'>
          <p className='text-base font-normal text-gray-500'>Xush kelibsiz, {mentorName}!</p>
          <h1 className='text-4xl font-bold text-gray-900'>Boshqaruv paneli</h1>
        </div>
        <p className='py-1.5 px-4 bg-blue-100 rounded-2xl text-blue-800'>
          {today.toLocaleDateString('uz-UZ', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-white w-full p-6 h-36 rounded-lg shadow-sm">
          <div className='flex justify-start items-center gap-2'>
            <div className='w-1.5 h-6 rounded-r bg-purple-600'></div>
            <p className='text-sm font-medium text-gray-500'>Mentorlar</p>
          </div>
          <div className='flex flex-col justify-start items-start pl-3.5 mt-4'>
            <p className='text-2xl font-bold text-gray-900'>1</p>
            <p className='text-sm text-green-600'>Siz faol mentor</p>
          </div>
        </div>

        <div className="bg-white w-full p-6 h-36 rounded-lg shadow-sm">
          <div className='flex justify-start items-center gap-2'>
            <div className='w-1.5 h-6 rounded-r bg-teal-600'></div>
            <p className='text-sm font-medium text-gray-500'>O'quvchilar</p>
          </div>
          <div className='flex flex-col justify-start items-start pl-3.5 mt-4'>
            <p className='text-2xl font-bold text-gray-900'>{students.length}</p>
            <p className='text-sm text-blue-600'>Jami o'quvchilar</p>
          </div>
        </div>

        <div className="bg-white w-full p-6 h-36 rounded-lg shadow-sm">
          <div className='flex justify-start items-center gap-2'>
            <div className='w-1.5 h-6 rounded-r bg-violet-500'></div>
            <p className='text-sm font-medium text-gray-500'>Guruhlar</p>
          </div>
          <div className='flex flex-col justify-start items-start pl-3.5 mt-4'>
            <p className='text-2xl font-bold text-gray-900'>{groups.length}</p>
            <p className='text-sm text-teal-600'>Faol guruhlar</p>
          </div>
        </div>

        <div className="bg-white w-full p-6 h-36 rounded-lg shadow-sm">
          <div className='flex justify-start items-center gap-2'>
            <div className='w-1.5 h-6 rounded-r bg-amber-500'></div>
            <p className='text-sm font-medium text-gray-500'>Davomat</p>
          </div>
          <div className='flex flex-col justify-start items-start pl-3.5 mt-4'>
            <p className='text-2xl font-bold text-gray-900'>{attendancePercentage}%</p>
            <p className='text-sm text-teal-500'>Umumiy davomat</p>
          </div>
        </div>
      </div>

      {/* Today's Lessons Card */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-6">Bugungi darslar</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredLessons.length > 0 ? filteredLessons.map((lesson, i) => {
            const endTime = getEndTime(lesson.time);
            return (
              <div key={i} className="bg-blue-50 p-4 border-l-4 border-blue-500 rounded">
                <p className="text-blue-800 font-medium">
                  {lesson.time} - {endTime}
                </p>
                <p className="text-blue-600 text-sm mt-1">{lesson.groupName}</p>
                <p className="text-blue-400 text-xs mt-1">
                  {lesson.dayType === 0 ? 'Yakshanba' :
                    lesson.dayType === 1 ? 'Toq kun' : 'Juft kun'}
                </p>
              </div>
            );
          }) : (
            <div className="col-span-4 text-gray-500 text-center py-8">
              Bugun dars yo'q
            </div>
          )}
        </div>
      </div>

      {/* Area Chart - Students Performance */}
      <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-700">O'quvchilar natijalari</h2>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-sm text-gray-600">O'quvchilar</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-teal-400"></div>
              <span className="text-sm text-gray-600">Guruhlar</span>
            </div>
          </div>
        </div>

        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <defs>
                <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorGroups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
              />

              <YAxis
                domain={[0, 'dataMax']}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
              />

              <Tooltip content={<CustomTooltipArea />} />

              <Area
                type="monotone"
                dataKey="students"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#colorStudents)"
                name="O'quvchilar"
              />

              <Area
                type="monotone"
                dataKey="groups"
                stroke="#2DD4BF"
                strokeWidth={2}
                fill="url(#colorGroups)"
                name="Guruhlar"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart - Student Levels */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className='flex justify-between items-center mb-6'>
          <p className='text-xl font-semibold text-gray-700'>O'quvchilar darajasi</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-600"></div>
              <span className="text-sm text-gray-600">Boshlang'ich</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-400"></div>
              <span className="text-sm text-gray-600">Yuqori</span>
            </div>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dailyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              barCategoryGap="20%"
            >
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                interval={2}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                tickFormatter={formatValueShort}
              />
              <Tooltip content={<CustomTooltipBar />} />
              <Bar
                dataKey="beginners"
                fill="#2563EB"
                name="Boshlang'ich"
                radius={[2, 2, 0, 0]}
                maxBarSize={15}
              />
              <Bar
                dataKey="advanced"
                fill="#FB923C"
                name="Yuqori"
                radius={[2, 2, 0, 0]}
                maxBarSize={15}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Students and Groups Section */}
      <div className='flex justify-between gap-8 mb-8'>
        {/* Students List */}
        <div className="bg-white h-auto w-3/5 rounded-3xl p-8">
          <div className='flex justify-between items-center mb-6'>
            <p className='text-2xl font-bold'>O'quvchilar</p>
            <a href="#" className='text-base font-semibold text-blue-500'>Barchasini ko'rish &gt;</a>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {students.slice(0, 8).map((student, index) => (
              <div key={index} className="bg-blue-50 px-8 rounded-3xl py-4 flex justify-center text-center items-center flex-col w-44 h-44">
                <div className='w-12 h-12 bg-blue-500 rounded-full mb-4 flex items-center justify-center text-white font-bold'>
                  {student.name ? student.name.charAt(0).toUpperCase() : 'O'}
                </div>
                <p className='mb-1 text-base font-bold'>{student.name || 'O\'quvchi'}</p>
                <p className='mb-2 text-sm text-gray-600'>{student.level || 'Boshlang\'ich'}</p>
                <p className='px-2 h-5 flex justify-center items-center text-xs py-1 border border-gray-400 text-gray-600 rounded'>
                  {student.group || 'Guruh'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Groups/Lessons Section */}
        <div className='w-2/5 h-auto rounded-3xl bg-white p-8'>
          <div className='flex justify-between items-center mb-6'>
            <p className='text-2xl font-bold'>Darslar</p>
            <a href="#" className='text-base font-semibold text-blue-500'>Barchasini ko'rish &gt;</a>
          </div>
          <div className='flex flex-col gap-8'>
            {filteredLessons.slice(0, 3).map((lesson, index) => (
              <div key={index} className="py-2 h-26 border-l-4 pl-5 rounded border-blue-500">
                <div className='flex justify-between items-start'>
                  <p className="font-medium">{lesson.groupName} darsi</p>
                  <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className='flex mt-2 justify-between items-center'>
                  <p className="text-sm text-gray-600">Bugun | {lesson.time}</p>
                  <div className='flex justify-center items-center gap-1.5 px-2 py-1.5 bg-blue-50 rounded-lg text-gray-600 text-sm font-bold'>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                    </svg>
                    <p>{lesson.duration}</p>
                  </div>
                </div>
              </div>
            ))}
            {filteredLessons.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Bugun dars yo'q
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Groups Statistics */}
      <h2 className='text-2xl font-bold text-gray-900 mt-10 ml-2 mb-8'>Guruhlar statistikasi</h2>
      <div className="flex flex-col gap-5">
        {groups.map((group, index) => (
          <div key={index} className="relative w-full h-36 bg-white rounded-3xl flex justify-between items-center px-16 py-8">
            <div className='flex justify-center items-start flex-col gap-6'>
              <div className='flex justify-start items-center gap-7'>
                <div className='w-12 bg-blue-800 rounded-lg h-12 flex items-center justify-center text-white font-bold'>
                  G{index + 1}
                </div>
                <div className='flex flex-col justify-center items-start gap-1'>
                  <p className='text-gray-400 text-sm font-normal'>{group._id ? group._id.slice(-6).toUpperCase() : `GR000${index + 1}`}</p>
                  <p className='text-lg font-bold'>{group.name || `Guruh ${index + 1}`}</p>
                </div>
              </div>
              <div className='flex justify-between gap-24 items-center'>
                <p className='text-sm font-semibold'>Yaratilgan: {group.createdAt ? new Date(group.createdAt).toLocaleDateString('uz-UZ') : 'Sep 12, 2020'}</p>
                <p className='text-sm font-bold text-yellow-500'>{group.level || 'Yuqori'}</p>
              </div>
            </div>
            <div className="absolute h-36 w-0.5 bg-gray-200 left-1/2 -translate-x-1/2"></div>
            <div className='flex flex-col mr-48 justify-center items-start gap-4'>
              <p className='text-base font-bold text-gray-900'>Guruh ma'lumotlari</p>
              <div className='flex justify-center items-center gap-16'>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Jami o'quvchilar</p>
                  <p className="text-lg font-bold">{group.students?.length || group.totalStudents || '12'}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Faol</p>
                  <p className="text-lg font-bold">{group.activeStudents || (group.students?.length ? Math.floor(group.students.length * 0.8) : '10')}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">To'xtatilgan</p>
                  <p className="text-lg font-bold">{group.pausedStudents || (group.students?.length ? Math.floor(group.students.length * 0.2) : '2')}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Hozircha guruhlar mavjud emas
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
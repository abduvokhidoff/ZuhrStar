import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Eye, Search, CreditCard, TrendingUp, Users, DollarSign, Download, Filter, Calendar, FileText } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, Title, Tooltip, Legend, ArcElement, PointElement } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { setCredentials, logout } from '../../redux/authSlice';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

const Dashboard = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector((state) => state.auth.accessToken);
  const refreshToken = useSelector((state) => state.auth.refreshToken);
  const user = useSelector((state) => state.auth.user);

  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('Barchasi');
  const [selectedDateRange, setSelectedDateRange] = useState('bu_oy');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalType, setPaymentModalType] = useState('');
  const [newPayment, setNewPayment] = useState({
    studentId: '',
    amount: '',
    method: 'cash',
    date: new Date().toISOString().split('T')[0]
  });

  const [paymentStats, setPaymentStats] = useState({
    totalRevenue: 0,
    paidStudents: 0,
    unpaidStudents: 0,
    monthlyGrowth: 0,
    averagePayment: 0
  });

  const refreshAccessToken = useCallback(async () => {
    if (isRefreshing) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return accessToken;
    }

    if (!refreshToken) {
      setError('Sessiya tugagan. Iltimos, qayta kiring.');
      dispatch(logout());
      return null;
    }

    setIsRefreshing(true);
    try {
      const response = await fetch('https://zuhrstar-production.up.railway.app/api/users/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) throw new Error('Tokenni yangilab boʻlmadi.');

      const data = await response.json();
      if (!data.accessToken) throw new Error('accessToken yoʻq');

      dispatch(setCredentials({
        user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      }));

      return data.accessToken;
    } catch (err) {
      setError(err.message || 'Tokenni yangilashda xatolik');
      dispatch(logout());
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshToken, dispatch, user, isRefreshing, accessToken]);

  const makeAuthenticatedRequest = useCallback(async (url, options = {}) => {
    const attemptRequest = async (tokenToUse) => {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenToUse}`,
          ...options.headers,
        },
      });

      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (!newToken) throw new Error('Authentication failed');
        return await attemptRequest(newToken);
      }

      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      return response;
    };

    try {
      if (!accessToken) throw new Error('No access token available');
      return await attemptRequest(accessToken);
    } catch (error) {
      throw error;
    }
  }, [accessToken, refreshAccessToken]);


  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch students
      const studentsResponse = await makeAuthenticatedRequest('https://zuhrstar-production.up.railway.app/api/students');
      const studentsData = await studentsResponse.json();

      // Fetch payments (checks)
      const paymentsResponse = await makeAuthenticatedRequest('https://zuhrstar-production.up.railway.app/api/checks');
      const paymentsData = await paymentsResponse.json();

      // Fetch courses
      const coursesResponse = await makeAuthenticatedRequest('https://zuhrstar-production.up.railway.app/api/Courses');
      const coursesData = await coursesResponse.json();

      // Transform students data to match expected format
      const transformedStudents = studentsData.map(student => ({
        id: student._id || student.id,
        name: student.name,
        surname: student.surname,
        student_phone: student.student_phone,
        parents_phone: student.parents_phone,
        birth_date: student.birth_date,
        gender: student.gender,
        note: student.note,
        group_attached: student.group_attached,
        paid: student.paid,
        status: student.status,
        imgURL: student.imgURL,
        balance: student.balance || 850000,
        course: student.course || 'Front-end',
        group: student.group || 'Guruh 1',
        lastPayment: student.lastPayment
      }));

      // Transform payments data to match expected format
      const transformedPayments = paymentsData.map(payment => ({
        id: payment._id || payment.id,
        studentId: payment.paid_student_id,
        amount: parseInt(payment.amount),
        date: payment.date_Of_Create,
        method: payment.method || 'cash',
        status: payment.status,
        receiptNumber: payment.receiptNumber || `RCP-${Date.now()}`
      }));

      // Transform courses data to match expected format
      const transformedCourses = coursesData.map(course => ({
        id: course._id || course.course_id,
        name: course.name,
        price: parseInt(course.price),
        duration: course.duration,
        duration_type: course.duration_type,
        groups_count: course.groups_count,
        methodology: course.methodology,
        fee: parseInt(course.price)
      }));

      // Generate monthly stats from payments data
      const monthlyStatsData = generateMonthlyStats(transformedPayments);

      setStudents(transformedStudents);
      setPayments(transformedPayments);
      setMonthlyStats(monthlyStatsData);
      setCourses(transformedCourses);

      // Calculate payment stats
      const paidCount = transformedStudents.filter(s => s.paid).length;
      const unpaidCount = transformedStudents.filter(s => !s.paid).length;
      const totalRevenue = transformedPayments.reduce((sum, payment) => sum + payment.amount, 0);
      const latestGrowth = monthlyStatsData[monthlyStatsData.length - 1]?.growth || 0;
      const avgPayment = transformedCourses.length > 0 ? transformedCourses[0].price : 850000;

      setPaymentStats({
        totalRevenue,
        paidStudents: paidCount,
        unpaidStudents: unpaidCount,
        monthlyGrowth: latestGrowth,
        averagePayment: avgPayment
      });

    } catch (err) {
      setError(err.message || 'Ma\'lumotlar olishda xatolik');
    } finally {
      setLoading(false);
    }
  }, [makeAuthenticatedRequest]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const generateMonthlyStats = (payments) => {
    const monthlyData = {};

    payments.forEach(payment => {
      const date = new Date(payment.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: date,
          revenue: 0,
          count: 0
        };
      }

      monthlyData[monthKey].revenue += payment.amount;
      monthlyData[monthKey].count += 1;
    });


    const statsArray = Object.values(monthlyData).sort((a, b) => new Date(a.month) - new Date(b.month));

    return statsArray.map((stat, index) => ({
      month: stat.month,
      revenue: stat.revenue,
      growth: index > 0 ? ((stat.revenue - statsArray[index - 1].revenue) / statsArray[index - 1].revenue * 100).toFixed(1) : 0
    }));
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_phone?.includes(searchTerm);

    const matchesStatus =
      selectedStatus === 'Barchasi' ||
      (selectedStatus === 'Faol' && student.status === 'active') ||
      (selectedStatus === 'Nofaol' && student.status !== 'active') ||
      (selectedStatus === 'Toʻlangan' && student.paid) ||
      (selectedStatus === 'Qarzdor' && !student.paid);

    return matchesSearch && matchesStatus;
  });

  const paymentStatusData = {
    labels: ['Toʻlangan', 'Qarzdor'],
    datasets: [
      {
        data: [paymentStats.paidStudents, paymentStats.unpaidStudents],
        backgroundColor: ['#10b981', '#ef4444'],
        hoverBackgroundColor: ['#059669', '#dc2626'],
        borderWidth: 0,
      },
    ],
  };

  const monthlyRevenueData = {
    labels: monthlyStats.map(stat => {
      const date = new Date(stat.month);
      return date.toLocaleDateString('uz-UZ', { month: 'short' });
    }),
    datasets: [
      {
        label: 'Tushumlar (UZS)',
        data: monthlyStats.map(stat => stat.revenue),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      },
    ],
  };

  const revenueLineData = {
    labels: monthlyStats.map(stat => {
      const date = new Date(stat.month);
      return date.toLocaleDateString('uz-UZ', { month: 'short' });
    }),
    datasets: [
      {
        label: 'Oylik oʻsish (%)',
        data: monthlyStats.map(stat => stat.growth),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
    },
    cutout: '70%',
  };

  const exportToCSV = () => {
    const csvContent = [
      ['ID', 'Ism', 'Familiya', 'Telefon', 'Holati', 'Tolov holati', 'Balans', 'Kurs', 'Guruh'],
      ...filteredStudents.map((student, index) => [
        index + 1,
        student.name,
        student.surname,
        student.student_phone,
        student.status === 'active' ? 'Faol' : 'Nofaol',
        student.paid ? 'Tolangan' : 'Qarzdor',
        student.paid ? '0 UZS' : formatCurrency(student.balance),
        student.course,
        student.group
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `talabalar_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


  const viewStudentDetails = (student) => {
    alert(`${student.name} ${student.surname} ning batafsil ma'lumotlari:\n\n` +
      `Kurs: ${student.course}\n` +
      `Guruh: ${student.group}\n` +
      `Telefon: ${student.student_phone}\n` +
      `Tug'ilgan sana: ${new Date(student.birth_date).toLocaleDateString('uz-UZ')}\n` +
      `Holati: ${student.status === 'active' ? 'Faol' : 'Nofaol'}\n` +
      `Balans: ${student.paid ? '0 UZS' : formatCurrency(student.balance)}\n` +
      `Oxirgi to'lov: ${student.lastPayment ? new Date(student.lastPayment).toLocaleDateString('uz-UZ') : 'Hech qachon'}`);
  };

  const generateReceipt = (student) => {
    const receiptNumber = `RCP-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    alert(`Kvitansiya yaratildi!\n\nTalaba: ${student.name} ${student.surname}\nKvitansiya raqami: ${receiptNumber}\nSana: ${new Date().toLocaleDateString('uz-UZ')}`);
  };

  const openPaymentModal = (type) => {
    setPaymentModalType(type);
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setNewPayment({
      studentId: '',
      amount: '',
      method: 'cash',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();

    if (!newPayment.studentId || !newPayment.amount) {
      alert('Barcha maydonlarni to\'ldiring!');
      return;
    }

    const receiptNumber = `RCP-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}${new Date().getDate().toString().padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const payment = {
      id: payments.length + 1,
      studentId: newPayment.studentId,
      amount: parseInt(newPayment.amount),
      date: newPayment.date,
      method: newPayment.method,
      status: 'paid',
      receiptNumber
    };

    setPayments([...payments, payment]);

    setStudents(students.map(student =>
      student.id === newPayment.studentId
        ? { ...student, paid: true, balance: 0, lastPayment: newPayment.date }
        : student
    ));

    setPaymentStats(prev => ({
      ...prev,
      paidStudents: prev.paidStudents + (students.find(s => s.id === newPayment.studentId && !s.paid) ? 1 : 0),
      unpaidStudents: prev.unpaidStudents - (students.find(s => s.id === newPayment.studentId && !s.paid) ? 1 : 0),
      totalRevenue: prev.totalRevenue + parseInt(newPayment.amount)
    }));

    alert(`To'lov muvaffaqiyatli qo'shildi!\nKvitansiya raqami: ${receiptNumber}`);
    closePaymentModal();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-lg text-red-600 bg-red-50 border border-red-200 rounded-lg m-6">
        Xatolik: {error}
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'dashboard'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'students'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Talabalar
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-2 rounded-lg transition-colors ${activeTab === 'payments'
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Toʻlovlar
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'dashboard' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Umumiy tushum</p>
                    <h3 className="text-2xl font-bold">{formatCurrency(paymentStats.totalRevenue)}</h3>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-200" />
                </div>
                <div className="mt-4 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1" />
                  <span className="text-sm">+{paymentStats.monthlyGrowth}% bu oyda</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Toʻlagan talabalar</p>
                    <h3 className="text-2xl font-bold">{paymentStats.paidStudents}</h3>
                  </div>
                  <Users className="w-8 h-8 text-green-200" />
                </div>
                <div className="mt-4">
                  <span className="text-sm">Jami talabalarning {Math.round((paymentStats.paidStudents / (paymentStats.paidStudents + paymentStats.unpaidStudents)) * 100)}%</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-red-100 text-sm">Qarzdor talabalar</p>
                    <h3 className="text-2xl font-bold">{paymentStats.unpaidStudents}</h3>
                  </div>
                  <CreditCard className="w-8 h-8 text-red-200" />
                </div>
                <div className="mt-4">
                  <span className="text-sm">Umumiy qarz: {formatCurrency(
                    students.filter(s => !s.paid).reduce((sum, s) => sum + s.balance, 0)
                  )}</span>
                </div>
              </div>


              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">Oʻrtacha toʻlov</p>
                    <h3 className="text-2xl font-bold">{formatCurrency(paymentStats.averagePayment)}</h3>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-200" />
                </div>
                <div className="mt-4">
                  <span className="text-sm">Oylik oʻrtacha</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Oylik tushumlar</h3>
                  <select className="px-3 py-1 border border-gray-200 rounded-lg text-sm">
                    <option>2024 yil</option>
                  </select>
                </div>
                <div className="h-80">
                  <Bar data={monthlyRevenueData} options={chartOptions} />
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Toʻlov holati</h3>
                <div className="h-80">
                  <Doughnut data={paymentStatusData} options={doughnutOptions} />
                </div>
                <div className="mt-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Toʻlangan</span>
                    <span className="text-sm font-medium text-green-600">{paymentStats.paidStudents}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Qarzdor</span>
                    <span className="text-sm font-medium text-red-600">{paymentStats.unpaidStudents}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Oʻsish dinamikasi</h3>
              <div className="h-64">
                <Line data={revenueLineData} options={chartOptions} />
              </div>
            </div>
          </>
        )}

        {activeTab === 'students' && (
          <>
            <div className="bg-white rounded-xl p-6 shadow-sm border mb-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Qidirish..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                  />
                </div>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Barchasi">Barchasi</option>
                  <option value="Faol">Faol</option>
                  <option value="Nofaol">Nofaol</option>
                  <option value="Toʻlangan">Toʻlangan</option>
                  <option value="Qarzdor">Qarzdor</option>
                </select>


                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Talaba</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Holati</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Toʻlov holati</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balans</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oxirgi toʻlov</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredStudents.map((student, index) => (
                      <tr key={student.id || index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <img
                              src={student.imgURL || 'https://via.placeholder.com/40'}
                              onError={(e) => { e.target.src = 'https://via.placeholder.com/40'; }}
                              className="h-10 w-10 rounded-full object-cover"
                              alt=""
                            />
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {student.name} {student.surname}
                              </div>
                              <div className="text-sm text-gray-500">{student.student_phone}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${student.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                            }`}>
                            {student.status === 'active' ? 'Faol' : 'Nofaol'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${student.paid
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }`}>
                            {student.paid ? 'Toʻlangan' : 'Qarzdor'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-medium ${student.paid ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {student.paid ? '0 UZS' : formatCurrency(student.balance)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">

                          {student.lastPayment ? new Date(student.lastPayment).toLocaleDateString('uz-UZ') : 'Hech qachon'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => viewStudentDetails(student)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Batafsil ma'lumot"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => generateReceipt(student)}
                              className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Kvitansiya yaratish"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredStudents.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                  <p>Hech qanday ma'lumot topilmadi</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
              <span>Jami: {filteredStudents.length} ta yozuv</span>
              <span>Sahifa 1 dan 1</span>
            </div>
          </>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <CreditCard className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Online to'lov</h3>
                    <p className="text-sm text-gray-500">Click, Payme, Uzcard</p>
                  </div>
                </div>
                <button
                  onClick={() => openPaymentModal('online')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sozlamalar
                </button>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Naqd to'lov</h3>
                    <p className="text-sm text-gray-500">Ofisda to'lash</p>
                  </div>
                </div>
                <button
                  onClick={() => openPaymentModal('cash')}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Qo'shish
                </button>
              </div>


              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Bank o'tkazmasi</h3>
                    <p className="text-sm text-gray-500">Hisob raqam orqali</p>
                  </div>
                </div>
                <button
                  onClick={() => openPaymentModal('bank')}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Hisob raqam
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">So'nggi to'lovlar</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Talaba</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Miqdor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuli</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sana</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Holati</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amallar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {payments.map((payment) => {
                      const student = students.find(s => s.id === payment.studentId);
                      return (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <img
                                src={student?.imgURL || 'https://via.placeholder.com/32'}
                                className="h-8 w-8 rounded-full object-cover"
                                alt=""
                              />
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {student?.name} {student?.surname}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {formatCurrency(payment.amount)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${payment.method === 'online' ? 'bg-blue-100 text-blue-800' :
                                payment.method === 'cash' ? 'bg-green-100 text-green-800' :
                                  'bg-purple-100 text-purple-800'
                              }`}>
                              {payment.method === 'online' ? 'Online' :
                                payment.method === 'cash' ? 'Naqd' : 'Karta'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(payment.date).toLocaleDateString('uz-UZ')}
                          </td>
                          <td className="px-6 py-4">

                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Amalga oshirilgan
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => alert(`Kvitansiya raqami: ${payment.receiptNumber}`)}
                              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                            >
                              Kvitansiya
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">To'lov usullari statistikasi</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Online to'lovlar</span>
                    <span className="text-sm font-medium text-blue-600">
                      {payments.filter(p => p.method === 'online').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Naqd to'lovlar</span>
                    <span className="text-sm font-medium text-green-600">
                      {payments.filter(p => p.method === 'cash').length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Karta to'lovlari</span>
                    <span className="text-sm font-medium text-purple-600">
                      {payments.filter(p => p.method === 'card').length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bu oydagi to'lovlar</h3>
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {formatCurrency(payments.reduce((sum, payment) => sum + payment.amount, 0))}
                </div>
                <p className="text-sm text-gray-500">
                  {payments.length} ta to'lov amalga oshirilgan
                </p>
              </div>
            </div>

            {showPaymentModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-md">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {paymentModalType === 'online' && 'Online to\'lov sozlamalari'}
                      {paymentModalType === 'cash' && 'Naqd to\'lov qo\'shish'}
                      {paymentModalType === 'bank' && 'Bank hisob raqami'}
                    </h3>
                    <button
                      onClick={closePaymentModal}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>


                  {paymentModalType === 'online' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2">Online to'lov tizimlariga ulanish:</h4>
                        <div className="space-y-2 text-sm text-blue-700">
                          <div>• Click: API kaliti kiritish</div>
                          <div>• Payme: Merchant ID sozlash</div>
                          <div>• Uzcard: Token olish</div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">API kaliti</label>
                          <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="API kalitini kiriting" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Merchant ID</label>
                          <input type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Merchant ID kiriting" />
                        </div>
                        <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                          Saqlash
                        </button>
                      </div>
                    </div>
                  )}

                  {paymentModalType === 'cash' && (
                    <form onSubmit={handlePaymentSubmit} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Talabani tanlang</label>
                        <select
                          value={newPayment.studentId}
                          onChange={(e) => setNewPayment({ ...newPayment, studentId: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        >
                          <option value="">Talabani tanlang</option>
                          {students.map(student => (
                            <option key={student.id} value={student.id}>
                              {student.name} {student.surname} - {student.course}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To'lov miqdori (UZS)</label>
                        <input
                          type="number"
                          value={newPayment.amount}
                          onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="850000"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To'lov usuli</label>
                        <select
                          value={newPayment.method}
                          onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                          <option value="cash">Naqd pul</option>
                          <option value="card">Bank kartasi</option>
                          <option value="online">Online to'lov</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">To'lov sanasi</label>
                        <input
                          type="date"

                          value={newPayment.date}
                          onChange={(e) => setNewPayment({ ...newPayment, date: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          required
                        />
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={closePaymentModal}
                          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                          Bekor qilish
                        </button>
                        <button
                          type="submit"
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          To'lov qo'shish
                        </button>
                      </div>
                    </form>
                  )}

                  {paymentModalType === 'bank' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <h4 className="font-medium text-purple-900 mb-2">Bank hisob raqamlari:</h4>
                        <div className="space-y-2 text-sm text-purple-700">
                          <div><strong>Milliy Bank:</strong> 8600 4954 2187 3456</div>
                          <div><strong>Agrobank:</strong> 8600 1234 5678 9012</div>
                          <div><strong>Xalq Banki:</strong> 8600 9876 5432 1098</div>
                        </div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600">
                          <strong>Tashkilot:</strong> ZuhrStar IT Academy<br />
                          <strong>STIR:</strong> 123456789<br />
                          <strong>MFO:</strong> 00014
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText('8600 4954 2187 3456');
                          alert('Hisob raqam nusxalandi!');
                        }}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        Hisob raqamni nusxalash
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

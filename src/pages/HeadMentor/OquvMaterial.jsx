import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Plus, BookOpen, Users, Calendar, CheckCircle, Clock, Star, Zap, AlertCircle } from 'lucide-react';

const OquvMaterial = () => {
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [newTopic, setNewTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vazifalar');
  const [error, setError] = useState(null);

  // Redux-dan accessToken va user olish
  const { accessToken, user } = useSelector((state) => state.auth);

  // API config
  const config = {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  };

  // Kurslarni API'dan olish
  const fetchCourses = async () => {
    if (!accessToken) {
      setError('Token mavjud emas. Iltimos qayta kiring.');
      setDataLoading(false);
      return;
    }

    try {
      setDataLoading(true);
      setError(null);

      const response = await fetch('https://zuhrstar-production.up.railway.app/api/courses', {
        method: 'GET',
        headers: config.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setCourses(data);

      if (data.length > 0) {
        setSelectedCourse(data[0]);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Kurslarni yuklashda xatolik yuz berdi. Internetni tekshiring.');
    } finally {
      setDataLoading(false);
    }
  };

  // Gruppalarni API'dan olish
  const fetchGroups = async () => {
    if (!accessToken) return;

    try {
      const response = await fetch('https://zuhrstar-production.up.railway.app/api/groups', {
        method: 'GET',
        headers: config.headers
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      // Gruppalar yuklanmasa ham ishlashi uchun
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchCourses();
      fetchGroups();
    }
  }, [accessToken]);

  // Yangi mavzu qo'shish (API bilan)
  const handleAddTopic = async () => {
    if (!newTopic.trim() || !selectedCourse || !accessToken) return;

    const updatedCourse = {
      ...selectedCourse,
      methodology: [
        ...selectedCourse.methodology,
        {
          month: selectedCourse.methodology.length + 1,
          title: newTopic,
          lessons: []
        }
      ]
    };

    try {
      setLoading(true);

      const response = await fetch(
        `https://zuhrstar-production.up.railway.app/api/courses/${selectedCourse.course_id}`,
        {
          method: 'PUT',
          headers: config.headers,
          body: JSON.stringify(updatedCourse)
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Ma'lumotlarni qayta yuklash
      await fetchCourses();
      setNewTopic('');
      setError(null);
    } catch (error) {
      console.error('Error adding topic:', error);
      setError('Mavzu qo\'shishda xatolik yuz berdi. Qaytadan urinib ko\'ring.');

      // Xatolik bo'lganda lokal o'zgarish
      setSelectedCourse(updatedCourse);
      const updatedCourses = courses.map(c =>
        c.course_id === selectedCourse.course_id ? updatedCourse : c
      );
      setCourses(updatedCourses);
      setNewTopic('');
    } finally {
      setLoading(false);
    }
  };

  // Har bir kurs uchun gruppalar sonini hisoblash
  const getCourseGroupsCount = (courseName) => {
    return groups.filter(group => group.course === courseName).length;
  };

  // Har bir kurs uchun jami talabalar sonini hisoblash
  const getCourseStudentsCount = (courseName) => {
    const courseGroups = groups.filter(group => group.course === courseName);
    return courseGroups.reduce((total, group) => total + (group.students?.length || 0), 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4 shadow-lg">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
            O'quv Materiallari
          </h1>
          <p className="text-gray-600 text-lg">
            {user ? `Salom, ${user.fullName }!` : 'Barcha kurslaringizni boshqaring va yangi mavzular qo\'shing'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="text-red-700">{error}</div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        )}

        {/* Kurslar Grid */}
        {dataLoading ? (
          <div className="flex items-center justify-center py-12 mb-8">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Kurslar yuklanmoqda...</p>
            </div>
          </div>
        ) : !accessToken ? (
          <div className="text-center py-12 mb-8">
            <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-600 mb-2">Avtorizatsiya kerak</h3>
            <p className="text-gray-500">Iltimos avval tizimga kiring</p>
          </div>
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {courses.map((course) => (
              <div
                key={course.course_id}
                onClick={() => setSelectedCourse(course)}
                className={`bg-white rounded-2xl shadow-lg p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 ${selectedCourse?.course_id === course.course_id
                    ? 'border-blue-500 ring-4 ring-blue-100'
                    : 'border-transparent hover:border-blue-200'
                  }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="text-sm font-medium">4.9</span>
                  </div>
                </div>

                <h3 className="font-bold text-lg text-gray-800 mb-2">{course.name}</h3>
                <p className="text-gray-600 text-sm mb-4">
                  {course.duration} {course.duration_type === 'month' ? 'oy' : 'kun'} davomiyligi
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-gray-500">
                      <Users className="w-4 h-4" />
                      <span>{getCourseStudentsCount(course.name)} talaba</span>
                    </div>
                    <div className="flex items-center gap-1 text-blue-500">
                      <Clock className="w-4 h-4" />
                      <span>{course.methodology?.length || 0} mavzu</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-green-600 font-medium">{parseInt(course.price).toLocaleString()} so'm</span>
                    <span className="text-purple-600">{getCourseGroupsCount(course.name)} guruh</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 mb-8">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">Kurslar topilmadi</h3>
            <p className="text-gray-500">Hozircha hech qanday kurs mavjud emas</p>
          </div>
        )}

        {/* Modullar va Yangi mavzu qo'shish */}
        {selectedCourse && (
          <div className="space-y-6">
            {/* Modul sarlavhasi */}
            <div className="bg-gray-100 rounded-xl p-4">
              <h2 className="text-xl font-bold text-gray-700">Modul</h2>
            </div>

            {/* Mavzular ro'yxati */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
              <div className="space-y-0">
                {selectedCourse.methodology && selectedCourse.methodology.length > 0 ? (
                  selectedCourse.methodology.map((module, index) => (
                    <div
                      key={index}
                      className={`border-b border-gray-100 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200 ${index === selectedCourse.methodology.length - 1 ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-blue-600 font-bold text-lg">
                          {index + 1}.
                        </span>
                        <span className="text-gray-800 font-medium text-lg">
                          {module.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p>Hali mavzular yo'q</p>
                  </div>
                )}
              </div>
            </div>

            {/* Yangi mavzu qo'shish */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="font-bold text-xl text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="w-6 h-6 text-blue-500" />
                Yangi mavzu qo'shish
              </h3>

              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Yangi mavzu nomini kiriting..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-300 text-gray-700 placeholder-gray-400"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTopic()}
                  />
                </div>
                <button
                  onClick={handleAddTopic}
                  disabled={loading || !newTopic.trim()}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Yuklanmoqda...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Qo'shish
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}


      </div>
    </div>
  );
};

export default OquvMaterial;
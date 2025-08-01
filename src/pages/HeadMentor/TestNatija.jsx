import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

// API Base URL
const API_BASE = 'https://zuhrstar-production.up.railway.app/api';

const TestNatija = () => {
  // Get the Token from Redux store
  const TOKEN = useSelector(state => state.auth.accessToken);

  // State management
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScore, setFilterScore] = useState('all');

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const headers = { 
          'Authorization': `Bearer ${TOKEN}`,
          'Content-Type': 'application/json'
        };

        // Fetch students
        const studentsResponse = await fetch(`${API_BASE}/students`, { headers });
        if (!studentsResponse.ok) {
          throw new Error(`Failed to fetch students: ${studentsResponse.status}`);
        }
        const studentsData = await studentsResponse.json();
        setStudents(Array.isArray(studentsData.data) ? studentsData.data : studentsData);

        // Fetch courses
        const coursesResponse = await fetch(`${API_BASE}/courses`, { headers });
        if (!coursesResponse.ok) {
          throw new Error(`Failed to fetch courses: ${coursesResponse.status}`);
        }
        const coursesData = await coursesResponse.json();
        setCourses(Array.isArray(coursesData.data) ? coursesData.data : coursesData);

      } catch (err) {
        console.error('API error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (TOKEN) {
      fetchData();
    } else {
      setError('Authentication token not found');
      setLoading(false);
    }
  }, [TOKEN]);

  // Get filtered students based on search term
  const getFilteredStudents = () => {
    let filteredStudents = students;

    // Filter by search term
    if (searchTerm) {
      filteredStudents = filteredStudents.filter(student =>
        student.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.surname?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filteredStudents;
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('uz-UZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen ">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-blue-600 font-medium">Ma'lumotlar yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">
                  📚 Kurslar va O'quvchilar Boshqaruvi
                </h1>
                <p className="text-gray-600">O'quvchilarni va kurslarni kuzatib boring va tahlil qiling</p>
              </div>
              <div className="text-right">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl shadow-lg">
                  <p className="text-sm opacity-90">Jami o'quvchilar</p>
                  <p className="text-2xl font-bold">{students.length}</p>
                </div>
              </div>
            </div>
            
            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600 text-sm">⚠️ {error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Courses Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-blue-100 overflow-hidden"
            >
              {/* Course Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 text-white">
                <h3 className="text-lg font-bold mb-1">{course.name || course.title}</h3>
                <div className="flex items-center justify-between text-sm opacity-90">
                  <span>💰 {parseInt(course.price || 0).toLocaleString()} so'm</span>
                  <span>⏱️ {course.duration} {course.duration_type || 'oy'}</span>
                </div>
                <div className="mt-2 text-xs">
                  👥 {course.groups_count || course.student_count || 0} ta guruh
                </div>
              </div>

              {/* Students List */}
              <div className="p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                  📝 O'quvchilar ({students.length})
                </h4>

                {students.length > 0 ? (
                  <div className="space-y-2">
                    {getFilteredStudents().map((student) => (
                      <div
                        key={student.id}
                        className="bg-gradient-to-r from-gray-50 to-blue-50 p-3 rounded-xl cursor-pointer 
                                   hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 
                                   transform hover:scale-105 shadow-sm hover:shadow-md border border-gray-200"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-sm font-medium text-gray-800 truncate">
                            {student.name} {student.surname}
                          </h5>
                        </div>

                        <div className="flex items-center justify-between text-xs text-gray-600">
                          <span>🎓 Kurslar: {course.name}</span>
                          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                            📅 {formatDate(student.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-4xl mb-2">📚</div>
                    <p className="text-sm">Hali o'quvchilar yo'q</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {courses.length === 0 && !loading && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-600 mb-2">Kurslar mavjud emas</h3>
            <p className="text-gray-500">
              {error ? 'Ma\'lumotlarni yuklashda xatolik yuz berdi' : 'Hozircha hech qanday kurs qo\'shilmagan'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestNatija;

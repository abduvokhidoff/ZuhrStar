import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, Edit, Eye, Users, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../redux/authSlice';

const Mentorlar = () => {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [mentorToDelete, setMentorToDelete] = useState(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    password: '',
    date_of_birth: '2025-08-06',
    gender: 'erkak',
    role: 'Mentor',
    company: '',
    position: '',
    location: '',
    skype_username: '',
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = useSelector(state => state.auth.accessToken);

  const fetchMentors = async () => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch('https://zuhrstar-production.up.railway.app/api/teachers', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessages = {
          401: 'Authentication failed. Please log in again.',
          403: 'You do not have permission to access this resource.',
          500: 'Server error. Please try again later.',
        };
        if (response.status === 401) {
          dispatch(logout());
          navigate('/login');
        }
        throw new Error(errorMessages[response.status] || `HTTP error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const formattedMentors = data.teachers && Array.isArray(data.teachers)
        ? data.teachers.map(teacher => ({
          id: teacher.teacher_id || teacher._id || teacher.email,
          name: teacher.fullName || 'N/A',
          username: teacher.email || 'N/A',
          phone: teacher.phone || 'N/A',
          role: teacher.role || 'Teacher',
        }))
        : [];
      setMentors(formattedMentors);
    } catch (error) {
      setError(error.message || 'Ma\'lumotlarni yuklashda xato');
      setMentors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMentors();
  }, [token]);

  const handleEdit = async (teacherId) => {
    if (!token) {
      setFormError('No authentication token found. Please log in.');
      return;
    }

    try {
      setFormLoading(true);
      setFormError(null);
      setIsAddingNew(false);
      const response = await fetch(`https://zuhrstar-production.up.railway.app/api/teachers/${teacherId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          dispatch(logout());
          navigate('/login');
        }
        throw new Error('Failed to fetch teacher data');
      }

      const data = await response.json();
      setFormData({
        fullName: data.fullName || '',
        phone: data.phone || '',
        email: data.email || '',
        password: '',
        date_of_birth: data.date_of_birth || '2025-08-06',
        gender: data.gender || 'erkak',
        role: data.role || 'Mentor',
        company: data.company || '',
        position: data.position || '',
        location: data.location || '',
        skype_username: data.skype_username || '',
      });
      setSelectedMentor(teacherId);
    } catch (error) {
      setFormError(error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setSelectedMentor(null);
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      password: '',
      date_of_birth: '2025-08-06',
      gender: 'erkak',
      role: 'Mentor',
      company: '',
      position: '',
      location: '',
      skype_username: '',
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setFormError('No authentication token found. Please log in.');
      return;
    }

    try {
      setFormLoading(true);
      setFormError(null);

      const payload = { ...formData };
      if (!payload.password) {
        delete payload.password;
      }

      const url = isAddingNew
        ? 'https://zuhrstar-production.up.railway.app/api/teachers/register'
        : `https://zuhrstar-production.up.railway.app/api/teachers/${selectedMentor}`;
      const method = isAddingNew ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          dispatch(logout());
          navigate('/login');
        }
        throw new Error(`Failed to ${isAddingNew ? 'create' : 'update'} teacher: ${errorText}`);
      }

      setSelectedMentor(null);
      setIsAddingNew(false);
      fetchMentors();
    } catch (error) {
      setFormError(error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCloseModal = () => {
    setSelectedMentor(null);
    setIsAddingNew(false);
    setFormError(null);
  };

  const filteredMentors = mentors.filter(mentor =>
    mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mentor.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    mentor.phone.includes(searchQuery)
  );

  const handleView = (teacherId) => navigate(`/mentors/${teacherId}`);
  const handleUsers = (teacherId) => console.log(`Manage users for mentor ${teacherId}`);

  const handleDelete = async (teacherId) => {
    setMentorToDelete(teacherId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!token) {
      setError('No authentication token found. Please log in.');
      setDeleteModalOpen(false);
      return;
    }

    try {
      const response = await fetch(`https://zuhrstar-production.up.railway.app/api/teachers/${mentorToDelete}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (response.status === 401) {
          dispatch(logout());
          navigate('/login');
        }
        throw new Error(`Failed to delete mentor: ${errorText}`);
      }

      fetchMentors();
    } catch (error) {
      setError(error.message || 'Failed to delete mentor');
    } finally {
      setDeleteModalOpen(false);
      setMentorToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setMentorToDelete(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">XODIMLAR</h1>
          <span className="text-sm text-gray-500">Xodimlar</span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Qidirish ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center space-x-3 ml-6">
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
              <Filter className="w-4 h-4" />
              <span>Filter</span>
            </button>
            <button
              onClick={handleAddNew}
              className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
            >
              <Plus className="w-4 h-4" />
              <span>Foydalanuvchi qo'shish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
          <button
            onClick={fetchMentors}
            className="ml-4 px-4 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">Ism</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">Foydalanuvchi nomi</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">Telefon</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">Rol</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-600">Harakatlar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <svg className="animate-spin h-5 w-5 mr-3 text-blue-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-16 0z" />
                      </svg>
                      Yuklanmoqda...
                    </div>
                  </td>
                </tr>
              ) : filteredMentors.length > 0 ? (
                filteredMentors.map((mentor) => (
                  <tr key={mentor.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-sm text-gray-600">{mentor.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{mentor.username}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{mentor.phone}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-600">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${mentor.role === 'Teacher' ? 'bg-teal-100 text-teal-700' : 'bg-purple-100 text-purple-700'
                          }`}
                      >
                        {mentor.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUsers(mentor.id)}
                          className="w-8 h-8 bg-emerald-100 hover:bg-emerald-200 rounded flex items-center justify-center"
                        >
                          <Users className="w-4 h-4 text-emerald-600" />
                        </button>
                        <button
                          onClick={() => handleEdit(mentor.id)}
                          className="w-8 h-8 bg-blue-100 hover:bg-blue-200 rounded flex items-center justify-center"
                        >
                          <Edit className="w-4 h-4 text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleView(mentor.id)}
                          className="w-8 h-8 bg-indigo-100 hover:bg-indigo-200 rounded flex items-center justify-center"
                        >
                          <Eye className="w-4 h-4 text-indigo-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(mentor.id)}
                          className="w-8 h-8 bg-red-100 hover:bg-red-200 rounded flex items-center justify-center"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    Hech qanday xodim topilmadi
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(selectedMentor || isAddingNew) && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{isAddingNew ? 'Add New Mentor' : 'Edit Mentor'}</h2>
              <button onClick={handleCloseModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            {formError && <p className="text-red-500 mb-4">{formError}</p>}
            {formLoading && <p>Loading...</p>}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-600">To'liq ismi</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Telefon raqami</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Parol</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  required={isAddingNew}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Tug'ulgan sanasi</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Jinsi</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="erkak">Erkak</option>
                  <option value="ayol">Ayol</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600">Role</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="Mentor">Mentor</option>
                  <option value="Teacher">Teacher</option>
                </select>
              </div>
            </form>
            <div className="mt-6 flex justify-end gap-4">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={formLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300"
              >
                {formLoading ? (isAddingNew ? 'Creating...' : 'Updating...') : (isAddingNew ? 'Create' : 'Update')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">O'chirishni tasdiqlang</h2>
              <button onClick={cancelDelete} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Rostdan ham ushbu foydalanuvchini o'chirmoqchimisiz?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Bekor qilish
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Ha, o'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mentorlar;
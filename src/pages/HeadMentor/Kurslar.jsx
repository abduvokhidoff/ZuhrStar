import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  Calendar,
  BarChart3,
  Settings,
  Search,
  Filter,
  Plus,
  Edit,
  Eye,
  Trash2,
  Download,
  ChevronDown,
  TrendingUp,
  DollarSign,
  User,
  Headphones,
  X,
  Save
} from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { logout, setCredentials } from '../../redux/authSlice'; // Update with your correct path

const Kurslar = () => {
  const [activeTab, setActiveTab] = useState('kurslar');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [viewingId, setViewingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [kurslarData, setKurslarData] = useState([]);

  // Redux hooks
  const dispatch = useDispatch();
  const { accessToken, refreshToken } = useSelector(state => state.auth);

  // API base URL
  const API_BASE_URL = 'https://zuhrstar-production.up.railway.app/api';

  // Function to refresh the access token
  const refreshAccessToken = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        // Update both tokens in Redux store
        dispatch(setCredentials({
          user: JSON.parse(localStorage.getItem('user')),
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || refreshToken // Keep the same refresh token if not returned
        }));
        return data.accessToken;
      } else {
        // If refresh fails, logout the user
        dispatch(logout());
        return null;
      }
    } catch (error) {
      console.error('Token refresh error:', error);
      dispatch(logout());
      return null;
    }
  };

  // Enhanced fetch function with token refresh logic
  const authFetch = async (url, options = {}) => {
    // Add authorization header if access token exists
    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
    };

    let response = await fetch(url, { ...options, headers });

    // If 401, try to refresh token and retry
    if (response.status === 401) {
      const newAccessToken = await refreshAccessToken();

      if (newAccessToken) {
        // Retry with new token
        headers['Authorization'] = `Bearer ${newAccessToken}`;
        response = await fetch(url, { ...options, headers });
      } else {
        // Logout if refresh failed
        dispatch(logout());
        return response; // Return the original 401 response
      }
    }

    return response;
  };

  // ... rest of your component code remains the same ...

  // Barcha kurslarni olish
  const fetchKurslar = async () => {
    try {
      setLoading(true);
      console.log('Kurslarni olish uchun so\'rov yuborilmoqda...');

      const response = await authFetch(`${API_BASE_URL}/courses`, {
        method: 'GET'
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Olingan ma\'lumotlar:', data);
        setKurslarData(Array.isArray(data) ? data : []);
      } else {
        const errorText = await response.text();
        console.error('Kurslarni olishda xatolik:', response.status, errorText);
        alert(`Kurslarni olishda xatolik: ${response.status}`);
      }
    } catch (error) {
      console.error('Kurslarni olishda xatolik:', error);
      alert('Kurslarni olishda xatolik yuz berdi!');
    } finally {
      setLoading(false);
    }
  };

  // Komponent yuklanganda kurslarni olish
  useEffect(() => {
    if (accessToken) {
      fetchKurslar();
    }
  }, [accessToken]);

  // Yangi kurs qo'shish
  const handleAddKurs = async () => {
    try {
      // Validatsiya
      if (!newKurs.name.trim()) {
        alert('Kurs nomini kiriting!');
        return;
      }
      if (!newKurs.duration) {
        alert('Kurs davomiyligini kiriting!');
        return;
      }
      if (!newKurs.price.trim()) {
        alert('Kurs narxini kiriting!');
        return;
      }
      if (newKurs.groups_count <= 0) {
        alert('Guruhlar sonini kiriting!');
        return;
      }

      setLoading(true);
      console.log('Yangi kurs qo\'shish uchun so\'rov:', newKurs);

      // Duration ni integer ga aylantirish
      const kursData = {
        ...newKurs,
        duration: parseInt(newKurs.duration),
        groups_count: parseInt(newKurs.groups_count)
      };

      console.log('Yuborilayotgan ma\'lumot:', kursData);

      const response = await authFetch(`${API_BASE_URL}/courses`, {
        method: 'POST',
        body: JSON.stringify(kursData)
      });

      console.log('Add response status:', response.status);

      if (response.ok) {
        const addedKurs = await response.json();
        console.log('Qo\'shilgan kurs:', addedKurs);

        setKurslarData(prev => [...prev, addedKurs]);
        setNewKurs({
          name: '',
          duration: '',
          duration_type: 'month',
          groups_count: 0,
          price: ''
        });
        setShowAddForm(false);
        alert('Kurs muvaffaqiyatli qo\'shildi!');
      } else {
        const errorText = await response.text();
        console.error('Kurs qo\'shishda xatolik:', response.status, errorText);
        alert(`Kurs qo\'shishda xatolik: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error('Kurs qo\'shishda xatolik:', error);
      alert('Kurs qo\'shishda xatolik yuz berdi!');
    } finally {
      setLoading(false);
    }
  };

  // Kursni yangilash
  const handleSave = async () => {
    try {
      // Validatsiya
      if (!editForm.name?.trim()) {
        alert('Kurs nomini kiriting!');
        return;
      }

      setLoading(true);
      console.log('Kursni yangilash uchun so\'rov:', editForm);

      // Duration va groups_count ni integer ga aylantirish
      const updateData = {
        ...editForm,
        duration: parseInt(editForm.duration),
        groups_count: parseInt(editForm.groups_count)
      };

      console.log('Yangilanayotgan ma\'lumot:', updateData);

      const response = await authFetch(`${API_BASE_URL}/courses/${editingId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      console.log('Update response status:', response.status);

      if (response.ok) {
        const updatedKurs = await response.json();
        console.log('Yangilangan kurs:', updatedKurs);

        setKurslarData(prev =>
          prev.map(kurs =>
            kurs.name === editingId ? { ...kurs, ...updatedKurs } : kurs
          )
        );
        setEditingId(null);
        setEditForm({});
        alert('Kurs muvaffaqiyatli yangilandi!');
      } else {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || await response.text();
        console.error('Kursni yangilashda xatolik:', response.status, errorMessage);
        alert(`Kursni yangilashda xatolik: ${errorMessage || response.status}`);
      }
    } catch (error) {
      console.error('Kursni yangilashda xatolik:', error);
      alert('Kursni yangilashda xatolik yuz berdi!');
    } finally {
      setLoading(false);
    }
  };

  // Kursni o'chirish
  const handleDelete = async (id) => {
    if (window.confirm('Bu kursni o\'chirmoqchimisiz?')) {
      try {
        setLoading(true);
        console.log('Kursni o\'chirish uchun so\'rov ID:', id);

        const response = await authFetch(`${API_BASE_URL}/courses/${id}`, {
          method: 'DELETE'
        });

        console.log('Delete response status:', response.status);

        if (response.ok || response.status === 204) {
          setKurslarData(prev => prev.filter(kurs => kurs.name !== id));
          alert('Kurs muvaffaqiyatli o\'chirildi!');
        } else if (response.status === 404) {
          alert('Kurs topilmadi! U allaqachon o\'chirilgan bo\'lishi mumkin.');
          fetchKurslar(); // Yangi ma'lumotlarni yuklab olish
        } else {
          const errorData = await response.json().catch(() => null);
          const errorMessage = errorData?.message || await response.text();
          console.error('Kursni o\'chirishda xatolik:', response.status, errorMessage);
          alert(`Kursni o\'chirishda xatolik: ${errorMessage || response.status}`);
        }
      } catch (error) {
        console.error('Kursni o\'chirishda xatolik:', error);
        alert('Kursni o\'chirishda xatolik yuz berdi!');
      } finally {
        setLoading(false);
      }
    }
  };

  // Yangi kurs qo'shish formasi
  const [newKurs, setNewKurs] = useState({
    name: '',
    duration: '',
    duration_type: 'month',
    groups_count: 0,
    price: ''
  });

  // Search funksiyasi - API field nomlarini hisobga olish
  const filteredKurslar = kurslarData.filter(kurs =>
    kurs.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kurs.price?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    kurs.name?.toString().includes(searchTerm)
  );

  // Ko'rish funksiyasi
  const handleView = (id) => {
    setViewingId(viewingId === id ? null : id);
  };

  // Tahrirlash funksiyasi
  const handleEdit = (kurs) => {
    setEditingId(kurs.name);
    setEditForm({ ...kurs });
  };

  // Tahrirlashni bekor qilish
  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="w-full overflow-hidden">
        {/* Header */}
        <div className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-800">Kurslar</h2>
              {loading && <div className="text-blue-600">Yuklanmoqda...</div>}
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                <Plus className="w-4 h-4 mr-2 inline" />
                Kurs qo'shish
              </button>
            </div>
          </div>
        </div>

        {/* Kurs qo'shish modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">Yangi kurs qo'shish</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kurs nomi *
                  </label>
                  <input
                    type="text"
                    value={newKurs.name}
                    onChange={(e) => setNewKurs({ ...newKurs, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Kurs nomini kiriting"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Davomiyligi *
                  </label>
                  <input
                    type="number"
                    value={newKurs.duration}
                    onChange={(e) => setNewKurs({ ...newKurs, duration: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Masalan: 6"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Davomiylik turi
                  </label>
                  <select
                    value={newKurs.duration_type}
                    onChange={(e) => setNewKurs({ ...newKurs, duration_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="month">Oy</option>
                    <option value="week">Hafta</option>
                    <option value="day">Kun</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Guruhlar soni *
                  </label>
                  <input
                    type="number"
                    value={newKurs.groups_count}
                    onChange={(e) => setNewKurs({ ...newKurs, groups_count: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Masalan: 2"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Narxi *
                  </label>
                  <input
                    type="text"
                    value={newKurs.price}
                    onChange={(e) => setNewKurs({ ...newKurs, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Masalan: 500000"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setNewKurs({
                      name: '',
                      duration: '',
                      duration_type: 'month',
                      groups_count: 0,
                      price: ''
                    });
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  disabled={loading}
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleAddKurs}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? 'Qo\'shilmoqda...' : 'Qo\'shish'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Kurslar Content */}
        <div className="p-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Kurs nomi, narxi yoki ID bo'yicha qidirish..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Filter className="w-4 h-4 mr-2 inline" />
                Filter
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kurs nomi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Davomiyligi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guruhlar soni</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Narxi</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Harakatlar</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredKurslar.map((kurs) => (
                    <React.Fragment key={kurs.name}>
                      <tr key={kurs.name} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{kurs.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {editingId === kurs.name ? (
                            <input
                              type="text"
                              value={editForm.name || ''}
                              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            kurs.name
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {editingId === kurs.name ? (
                            <div className="flex items-center space-x-1">
                              <input
                                type="number"
                                value={editForm.duration || ''}
                                onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                                min="1"
                              />
                              <select
                                value={editForm.duration_type || 'month'}
                                onChange={(e) => setEditForm({ ...editForm, duration_type: e.target.value })}
                                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="month">oy</option>
                                <option value="week">hafta</option>
                                <option value="day">kun</option>
                              </select>
                            </div>
                          ) : (
                            `${kurs.duration} ${kurs.duration_type || 'oy'}`
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {editingId === kurs.name ? (
                              <input
                                type="number"
                                value={editForm.groups_count || ''}
                                onChange={(e) => setEditForm({ ...editForm, groups_count: e.target.value })}
                                className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-blue-500"
                                min="0"
                              />
                            ) : (
                              kurs.groups_count || 0
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {editingId === kurs.name ? (
                            <input
                              type="text"
                              value={editForm.price || ''}
                              onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                              className="w-32 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            kurs.price
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {editingId === kurs.name ? (
                              <>
                                <button
                                  onClick={handleSave}
                                  className="text-green-600 hover:text-green-800 disabled:opacity-50"
                                  title="Saqlash"
                                  disabled={loading}
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={handleCancel}
                                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                                  title="Bekor qilish"
                                  disabled={loading}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleView(kurs.name)}
                                  className="text-blue-600 hover:text-blue-800"
                                  title="Ko'rish"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleEdit(kurs)}
                                  className="text-yellow-600 hover:text-yellow-800 disabled:opacity-50"
                                  title="Tahrirlash"
                                  disabled={loading}
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(kurs.name)}
                                  className="text-red-600 hover:text-red-800 disabled:opacity-50"
                                  title="O'chirish"
                                  disabled={loading}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Detailed View Row */}
                      {viewingId === kurs.name && (
                        <tr key={`detail-${kurs.name}`} className="bg-blue-50">
                          <td colSpan="6" className="px-6 py-4">
                            <div className="bg-white rounded-lg p-4 shadow-sm">
                              <h4 className="font-semibold text-gray-800 mb-3">Kurs haqida batafsil ma'lumot</h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <span className="block text-sm font-medium text-gray-500">ID:</span>
                                  <span className="text-sm text-gray-900">{kurs.name}</span>
                                </div>
                                <div>
                                  <span className="block text-sm font-medium text-gray-500">Kurs nomi:</span>
                                  <span className="text-sm text-gray-900">{kurs.name}</span>
                                </div>
                                <div>
                                  <span className="block text-sm font-medium text-gray-500">Davomiyligi:</span>
                                  <span className="text-sm text-gray-900">{kurs.duration} {kurs.duration_type || 'oy'}</span>
                                </div>
                                <div>
                                  <span className="block text-sm font-medium text-gray-500">Guruhlar soni:</span>
                                  <span className="text-sm text-gray-900">{kurs.groups_count || 0} ta</span>
                                </div>
                                <div>
                                  <span className="block text-sm font-medium text-gray-500">Narxi:</span>
                                  <span className="text-sm text-gray-900">{kurs.price}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Qidiruv natijalari */}
          {searchTerm && (
            <div className="mt-4 text-sm text-gray-600">
              "{searchTerm}" bo'yicha {filteredKurslar.length} ta natija topildi
            </div>
          )}

          {/* Ma'lumot yo'q xabari */}
          {!loading && kurslarData.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Hozircha kurslar mavjud emas
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default Kurslar;
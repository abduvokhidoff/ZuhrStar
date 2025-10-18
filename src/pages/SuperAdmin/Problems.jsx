import React, { useEffect, useMemo, useReducer, useCallback, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  AlertCircle, Clock, CheckCircle, User, Phone, Mail, Calendar, MessageSquare, Search, RefreshCw,
  Users, Shield, GraduationCap, UserCheck
} from 'lucide-react';
import { setCredentials, logout } from '../../redux/authSlice';

// ===== Config =====
const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_BASE) ||
  'https://zuhrstar-production.up.railway.app/api';

const PAGE_SIZE = 6;

// Reporter Type enum
const REPORTER_TYPES = {
  STUDENT: 'student',
  ADMIN: 'admin',
  TEACHER: 'teacher',
};

// Reporter Type UI config
const REPORTER_CONFIG = {
  [REPORTER_TYPES.STUDENT]: {
    icon: <GraduationCap className="w-4 h-4" />,
    text: 'Студенты',
    badgeClass: 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white',
    countTextClass: 'text-blue-600',
    dotClass: 'bg-blue-100',
  },
  [REPORTER_TYPES.ADMIN]: {
    icon: <Shield className="w-4 h-4" />,
    text: 'Админы',
    badgeClass: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    countTextClass: 'text-purple-600',
    dotClass: 'bg-purple-100',
  },
  [REPORTER_TYPES.TEACHER]: {
    icon: <Users className="w-4 h-4" />,
    text: 'Учителя',
    badgeClass: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
    countTextClass: 'text-green-600',
    dotClass: 'bg-green-100',
  },
};

const safeString = (v) => (typeof v === 'string' ? v : '');
const norm = (v) => safeString(v).toLowerCase().trim();
const toDate = (v) => (v ? new Date(v) : null);
const formatDate = (v, opts = {}) => {
  const d = toDate(v);
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('uz-UZ', opts);
};
const formatDateTime = (v) => {
  const d = toDate(v);
  if (!d || Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('uz-UZ');
};

function useDebounced(value, delay = 400) {
  const [deb, setDeb] = React.useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return deb;
}

// ===== Skeleton Components =====
const SkeletonCard = () => (
  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-pulse">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2 rounded-full bg-gray-200 w-10 h-10"></div>
      <div className="h-5 bg-gray-200 rounded w-1/3"></div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
      <div className="flex gap-2">
        <div className="h-5 bg-gray-200 rounded w-16"></div>
        <div className="h-5 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
    <div className="bg-gray-100 rounded-lg p-3 mb-4">
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
    <div className="flex justify-between items-center">
      <div className="flex gap-3">
        <div className="h-3 bg-gray-200 rounded w-20"></div>
        <div className="h-3 bg-gray-200 rounded w-24"></div>
      </div>
      <div className="h-5 bg-gray-200 rounded w-16"></div>
    </div>
  </div>
);

const SkeletonOperator = () => (
  <div className="bg-white rounded-lg p-4 border-2 border-gray-200 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gray-200"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

const SkeletonStats = () => (
  <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-20"></div>
        <div className="h-8 bg-gray-200 rounded w-12"></div>
      </div>
      <div className="w-12 h-12 rounded-full bg-gray-200"></div>
    </div>
  </div>
);

// ===== State =====
const initialState = {
  complaints: [],
  admins: [],
  teachers: [],
  loading: true,
  error: null,
  search: '',
  reporterFilter: 'all',
  sortBy: 'date_desc',
  page: 1,
  refreshing: false,
  assignLoading: false,
  dragOverTarget: null, // New state for tracking drag over target
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_DATA':
      return { ...state, complaints: action.payload, loading: false, refreshing: false, error: null };
    case 'SET_ADMINS':
      return { ...state, admins: action.payload };
    case 'SET_TEACHERS':
      return { ...state, teachers: action.payload };
    case 'SET_ERROR':
      return { ...state, loading: false, refreshing: false, error: action.payload || 'Xatolik yuz berdi' };
    case 'LOADING':
      return { ...state, loading: true, error: null };
    case 'REFRESHING':
      return { ...state, refreshing: true, error: null };
    case 'SET_SEARCH':
      return { ...state, search: action.payload, page: 1 };
    case 'SET_FILTER':
      return { ...state, reporterFilter: action.payload, page: 1 };
    case 'SET_SORT':
      return { ...state, sortBy: action.payload };
    case 'SET_PAGE':
      return { ...state, page: action.payload };
    case 'SET_ASSIGN_LOADING':
      return { ...state, assignLoading: action.payload };
    case 'SET_DRAG_OVER_TARGET':
      return { ...state, dragOverTarget: action.payload };
    case 'UPDATE_COMPLAINT':
      return {
        ...state,
        complaints: state.complaints.map(c =>
          (c._id === action.payload._id || c.id === action.payload.id)
            ? { ...c, ...action.payload }
            : c
        )
      };
    default:
      return state;
  }
}

const getId = (obj) => obj?.id ?? obj?._id ?? obj?.uuid ?? null;

const Problems = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { complaints, admins, teachers, loading, error, search, reporterFilter, sortBy, page, refreshing, assignLoading, dragOverTarget } = state;
  const [draggedItem, setDraggedItem] = useState(null);

  const debouncedSearch = useDebounced(search, 400);
  const abortRef = useRef(null);

  const reduxDispatch = useDispatch();
  const accessToken = useSelector(s => s.auth.accessToken);
  const refreshToken = useSelector(s => s.auth.refreshToken);
  const user = useSelector(s => s.auth.user);

  // ===== Refresh access token =====
  const refreshingRef = useRef(false);
  const refreshAccessToken = useCallback(async () => {
    if (refreshingRef.current) {
      await new Promise(r => setTimeout(r, 300));
      return accessToken;
    }
    if (!refreshToken) {
      reduxDispatch(logout());
      dispatch({ type: 'SET_ERROR', payload: 'Требуется авторизация.' });
      return null;
    }
    refreshingRef.current = true;
    try {
      const res = await fetch(`${API_BASE}/users/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });
      if (!res.ok) throw new Error('Ошибка обновления токена');
      const data = await res.json();
      if (!data.accessToken) throw new Error('accessToken отсутствует в ответе');
      reduxDispatch(setCredentials({
        user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      }));
      return data.accessToken;
    } catch (e) {
      reduxDispatch(logout());
      dispatch({ type: 'SET_ERROR', payload: e.message || 'Ошибка при обновлении токена' });
      return null;
    } finally {
      refreshingRef.current = false;
    }
  }, [accessToken, refreshToken, reduxDispatch, user]);

  // ===== Generic fetch with 401 retry =====
  const authedFetch = useCallback(async (path, options = {}) => {
    const attempt = async (tokenToUse) => {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
          Authorization: `Bearer ${tokenToUse}`,
        },
      });
      if (res.status === 401) return { needRefresh: true };
      return { res };
    };

    const token = accessToken;
    if (!token) {
      const newTok = await refreshAccessToken();
      if (!newTok) throw new Error('Нет accessToken');
      const { res, needRefresh } = await attempt(newTok);
      if (needRefresh) throw new Error('Авторизация не удалась');
      return res;
    }

    const first = await attempt(token);
    if (first.needRefresh) {
      const newTok = await refreshAccessToken();
      if (!newTok) throw new Error('Не удалось обновить accessToken');
      const second = await attempt(newTok);
      if (second.needRefresh) throw new Error('Авторизация не удалась');
      return second.res;
    }
    return first.res;
  }, [accessToken, refreshAccessToken]);

  // ===== Load data =====
  const fetchComplaints = useCallback(async ({ refreshing = false } = {}) => {
    try {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      if (refreshing) dispatch({ type: 'REFRESHING' });
      else dispatch({ type: 'LOADING' });

      const res = await authedFetch('/problems', {
        method: 'GET',
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Ma'lumotlarni olishda xatolik (${res.status})`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.problems || data?.data || [];
      dispatch({ type: 'SET_DATA', payload: list });
    } catch (e) {
      if (e.name === 'AbortError') return;
      dispatch({ type: 'SET_ERROR', payload: e.message });
    }
  }, [authedFetch]);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await authedFetch('/users');
      if (!res.ok) throw new Error('Adminlarni olishda xatolik');
      const data = await res.json();
      dispatch({ type: 'SET_ADMINS', payload: data.admins || [] });
    } catch (e) {
      console.error('Adminlarni yuklashda xatolik:', e);
    }
  }, [authedFetch]);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await authedFetch('/teachers');
      if (!res.ok) throw new Error('O\'qituvchilarni olishda xatolik');
      const data = await res.json();
      dispatch({ type: 'SET_TEACHERS', payload: data.teachers || [] });
    } catch (e) {
      console.error('O\'qituvchilarni yuklashda xatolik:', e);
    }
  }, [authedFetch]);

  useEffect(() => {
    fetchComplaints();
    fetchAdmins();
    fetchTeachers();
    return () => abortRef.current?.abort();
  }, [fetchComplaints, fetchAdmins, fetchTeachers]);

  const handleRefresh = useCallback(() => {
    fetchComplaints({ refreshing: true });
    fetchAdmins();
    fetchTeachers();
  }, [fetchComplaints, fetchAdmins, fetchTeachers]);

  // ===== Stats =====
  const reporterCounts = useMemo(() => ({
    student: complaints.filter((c) => (c.reporterType || '').toLowerCase() === REPORTER_TYPES.STUDENT).length,
    admin: complaints.filter((c) => (c.reporterType || '').toLowerCase() === REPORTER_TYPES.ADMIN).length,
    teacher: complaints.filter((c) => (c.reporterType || '').toLowerCase() === REPORTER_TYPES.TEACHER).length,
  }), [complaints]);

  // ===== Filter + Sort =====
  const filteredSorted = useMemo(() => {
    const q = norm(debouncedSearch);
    const list = complaints.filter((c) => {
      const studentName = c.studentName || c.student?.full_name || c.reporterName || '';
      const matchSearch =
        !q ||
        norm(studentName).includes(q) ||
        norm(c.description).includes(q) ||
        norm(c.title).includes(q) ||
        norm(c.category).includes(q) ||
        norm(c.email).includes(q) ||
        norm(c.phone).includes(q) ||
        String(getId(c) || '').includes(q);
      const rt = (c.reporterType || '').toLowerCase();
      const matchReporter = reporterFilter === 'all' || rt === reporterFilter;
      return matchSearch && matchReporter;
    });

    const sorted = [...list].sort((a, b) => {
      const aDate = toDate(a.date || a.createdAt || a.created_at)?.getTime() || 0;
      const bDate = toDate(b.date || b.createdAt || b.created_at)?.getTime() || 0;
      switch (sortBy) {
        case 'date_asc':
          return aDate - bDate;
        case 'status':
          return norm(a.status).localeCompare(norm(b.status));
        case 'name': {
          const an = norm(a.studentName || a.student?.full_name || a.reporterName || '');
          const bn = norm(b.studentName || b.student?.full_name || b.reporterName || '');
          return an.localeCompare(bn);
        }
        case 'course':
          return norm(a.course).localeCompare(norm(b.course || ''));
        case 'date_desc':
        default:
          return bDate - aDate;
      }
    });

    return sorted;
  }, [complaints, debouncedSearch, reporterFilter, sortBy]);

  // ===== Pagination =====
  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pagedItems = useMemo(() => {
    const start = (pageSafe - 1) * PAGE_SIZE;
    return filteredSorted.slice(start, start + PAGE_SIZE);
  }, [filteredSorted, pageSafe]);

  // ===== Handlers =====
  const onSearch = useCallback((e) => dispatch({ type: 'SET_SEARCH', payload: e.target.value }), []);
  const onFilter = useCallback((val) => dispatch({ type: 'SET_FILTER', payload: val }), []);
  const onSort = useCallback((e) => dispatch({ type: 'SET_SORT', payload: e.target.value }), []);
  const goPage = useCallback((p) => dispatch({ type: 'SET_PAGE', payload: p }), []);

  // ===== Enhanced Drag & Drop =====
  const handleDragStart = useCallback((e, complaint) => {
    setDraggedItem(complaint);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
    dispatch({ type: 'SET_DRAG_OVER_TARGET', payload: null });
  }, []);

  const handleDragOver = useCallback((e, operator) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const operatorId = getId(operator);
    if (dragOverTarget !== operatorId) {
      dispatch({ type: 'SET_DRAG_OVER_TARGET', payload: operatorId });
    }
  }, [dragOverTarget]);

  const handleDragLeave = useCallback((e) => {
    // Only clear drag over target if we're leaving the drop zone completely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      dispatch({ type: 'SET_DRAG_OVER_TARGET', payload: null });
    }
  }, []);

  const handleDrop = useCallback(async (e, operator) => {
    e.preventDefault();
    dispatch({ type: 'SET_DRAG_OVER_TARGET', payload: null });

    if (!draggedItem || assignLoading) return;

    dispatch({ type: 'SET_ASSIGN_LOADING', payload: true });

    try {
      const problemId = getId(draggedItem);
      const operatorId = getId(operator);

      const res = await authedFetch(`/problems/${problemId}/assign`, {
        method: 'PUT',
        body: JSON.stringify({ assignedTo: operatorId }),
      });

      if (!res.ok) throw new Error('Назначение не удалось');

      const updatedProblem = await res.json();
      dispatch({ type: 'UPDATE_COMPLAINT', payload: updatedProblem });

      // Success notification could be added here
    } catch (e) {
      console.error('Ошибка назначения:', e);
      // Error notification could be added here
    } finally {
      dispatch({ type: 'SET_ASSIGN_LOADING', payload: false });
      setDraggedItem(null);
    }
  }, [draggedItem, assignLoading, authedFetch]);

  // ===== Skeleton Loading =====
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <MessageSquare className="w-8 h-8 text-blue-600 mr-3" />
              <div className="h-10 bg-gray-200 rounded w-48 animate-pulse"></div>
            </div>

            {/* Statistics Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {Array(3).fill(0).map((_, i) => (
                <SkeletonStats key={i} />
              ))}
            </div>
          </div>

          {/* Main Layout Skeleton */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Side - Problems List Skeleton */}
            <div className="col-span-8">
              {/* Search Skeleton */}
              <div className="mb-6">
                <div className="h-10 bg-gray-200 rounded-lg animate-pulse"></div>
              </div>

              {/* Problems List Skeleton */}
              <div className="space-y-4">
                {Array(PAGE_SIZE).fill(0).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </div>

            {/* Right Side - Operators Skeleton */}
            <div className="col-span-4">
              <div className="h-8 bg-gray-200 rounded w-32 mb-6 animate-pulse"></div>

              {/* Admins Skeleton */}
              <div className="mb-8">
                <div className="h-6 bg-gray-200 rounded w-20 mb-4 animate-pulse"></div>
                <div className="space-y-3">
                  {Array(3).fill(0).map((_, i) => (
                    <SkeletonOperator key={i} />
                  ))}
                </div>
              </div>

              {/* Teachers Skeleton */}
              <div>
                <div className="h-6 bg-gray-200 rounded w-20 mb-4 animate-pulse"></div>
                <div className="space-y-3">
                  {Array(4).fill(0).map((_, i) => (
                    <SkeletonOperator key={i} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-red-100 flex items-center justify-between text-red-600">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 mr-3" />
              <span className="text-lg font-medium">Xatolik: {error}</span>
            </div>
            <button
              onClick={handleRefresh}
              className="ml-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
            >
              <RefreshCw className={refreshing ? 'animate-spin w-4 h-4' : 'w-4 h-4'} />
              Qayta urinish
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== Main View =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-6">
            <MessageSquare className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Muammolar
            </h1>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { reporterType: REPORTER_TYPES.STUDENT, count: reporterCounts.student },
              { reporterType: REPORTER_TYPES.ADMIN, count: reporterCounts.admin },
              { reporterType: REPORTER_TYPES.TEACHER, count: reporterCounts.teacher },
            ].map(({ reporterType, count }) => (
              <div
                key={reporterType}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => onFilter(reporterType)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">{REPORTER_CONFIG[reporterType].text}</p>
                    <p className={`text-3xl font-bold ${REPORTER_CONFIG[reporterType].countTextClass}`}>{count}</p>
                  </div>
                  <div className={`p-3 rounded-full ${REPORTER_CONFIG[reporterType].dotClass}`}>
                    {REPORTER_CONFIG[reporterType].icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Layout: Left + Right */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Side - Problems List */}
          <div className="col-span-8">
            {/* Search */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Ism, sarlavha, kategoriya yoki ID bo'yicha qidirish..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={search}
                  onChange={onSearch}
                />
              </div>
            </div>

            {/* Problems List */}
            {filteredSorted.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-gray-100">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">Muammolar topilmadi</h3>
                <p className="text-gray-500">Qidiruv yoki filterni o'zgartirib ko'ring.</p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {pagedItems.map((item) => {
                    const id = getId(item);
                    const studentName = item.studentName || item.student?.full_name || item.reporterName || 'Noma\'lum';
                    const created = item.created_at || item.createdAt || item.date;
                    const isDragging = draggedItem && getId(draggedItem) === id;

                    return (
                      <div
                        key={id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item)}
                        onDragEnd={handleDragEnd}
                        className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group cursor-move ${isDragging ? 'opacity-50 rotate-3 scale-95' : ''
                          }`}
                      >
                        <div className="p-6">
                          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 rounded-full group-hover:bg-blue-100 transition-colors bg-gray-100">
                                  <User className="w-4 h-4 text-gray-600 group-hover:text-blue-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">{studentName}</h3>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{formatDate(created)}</span>
                                </div>
                                {item.title && (
                                  <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                    {item.title}
                                  </div>
                                )}
                                {item.category && (
                                  <div className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                                    {item.category}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mb-4">
                            <div className="bg-gray-50 rounded-lg p-3 border-l-3 border-blue-500">
                              <p className="text-gray-700 text-sm leading-relaxed">
                                {safeString(item.description) || '—'}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-xs text-gray-500">
                            <div className="flex gap-3">
                              {item.phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  <span>{item.phone}</span>
                                </div>
                              )}
                              {item.email && (
                                <div className="flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  <span>{item.email}</span>
                                </div>
                              )}
                            </div>
                            <span className="bg-gray-100 px-2 py-1 rounded">ID: #{id ?? '—'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Jami: {filteredSorted.length} | Sahifa {pageSafe} / {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => goPage(Math.max(1, pageSafe - 1))}
                      disabled={pageSafe === 1}
                      className="px-3 py-2 rounded-lg border border-gray-200 bg-white disabled:opacity-50"
                    >
                      Oldingi
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .slice(Math.max(0, pageSafe - 3), Math.max(0, pageSafe - 3) + 5)
                      .map((p) => (
                        <button
                          key={p}
                          onClick={() => goPage(p)}
                          className={`px-3 py-2 rounded-lg border border-gray-200 ${p === pageSafe ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'
                            }`}
                        >
                          {p}
                        </button>
                      ))}
                    <button
                      onClick={() => goPage(Math.min(totalPages, pageSafe + 1))}
                      disabled={pageSafe === totalPages}
                      className="px-3 py-2 rounded-lg border border-gray-200 bg-white disabled:opacity-50"
                    >
                      Keyingi
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Side - Operators */}
          <div className="col-span-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Операторы</h2>

            {/* Admins */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Админы
              </h3>
              <div className="space-y-3">
                {admins.map((admin) => {
                  const adminId = getId(admin);
                  const isActive = draggedItem && dragOverTarget === adminId;

                  return (
                    <div
                      key={adminId}
                      onDragOver={(e) => handleDragOver(e, admin)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, admin)}
                      className={`bg-white rounded-lg p-4 border-2 border-dashed transition-all duration-200 cursor-pointer transform ${isActive
                          ? 'border-purple-500 bg-purple-100 shadow-lg scale-105 ring-2 ring-purple-200'
                          : draggedItem
                            ? 'border-purple-300 bg-purple-50 hover:border-purple-400 hover:bg-purple-100'
                            : 'border-gray-200 hover:border-purple-400 hover:bg-purple-50'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isActive
                            ? 'bg-purple-200'
                            : 'bg-purple-100'
                          }`}>
                          <Shield className={`w-4 h-4 ${isActive
                              ? 'text-purple-700'
                              : 'text-purple-600'
                            }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate transition-colors ${isActive
                              ? 'text-purple-900'
                              : 'text-gray-900'
                            }`}>
                            {admin.fullName}
                          </p>
                          <p className={`text-sm capitalize transition-colors ${isActive
                              ? 'text-purple-700'
                              : 'text-purple-600'
                            }`}>
                            {admin.role}
                          </p>
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Teachers */}
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Учителя
              </h3>
              <div className="space-y-3">
                {teachers.map((teacher) => {
                  const teacherId = getId(teacher);
                  const isActive = draggedItem && dragOverTarget === teacherId;

                  return (
                    <div
                      key={teacherId}
                      onDragOver={(e) => handleDragOver(e, teacher)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, teacher)}
                      className={`bg-white rounded-lg p-4 border-2 border-dashed transition-all duration-200 cursor-pointer transform ${isActive
                          ? 'border-green-500 bg-green-100 shadow-lg scale-105 ring-2 ring-green-200'
                          : draggedItem
                            ? 'border-green-300 bg-green-50 hover:border-green-400 hover:bg-green-100'
                            : 'border-gray-200 hover:border-green-400 hover:bg-green-50'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isActive
                            ? 'bg-green-200'
                            : 'bg-green-100'
                          }`}>
                          <GraduationCap className={`w-4 h-4 ${isActive
                              ? 'text-green-700'
                              : 'text-green-600'
                            }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium truncate transition-colors ${isActive
                              ? 'text-green-900'
                              : 'text-gray-900'
                            }`}>
                            {teacher.fullName}
                          </p>
                          <p className={`text-sm capitalize transition-colors ${isActive
                              ? 'text-green-700'
                              : 'text-green-600'
                            }`}>
                            {teacher.role}
                          </p>
                        </div>
                        {isActive && (
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Drag Instructions */}
            {draggedItem && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200 animate-pulse">
                <div className="flex items-center gap-2 text-blue-800">
                  <UserCheck className="w-4 h-4" />
                  <p className="text-sm font-medium">Перетащите проблему на оператора для назначения</p>
                </div>
              </div>
            )}

            {/* Loading indicator for assignment */}
            {assignLoading && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 text-yellow-800">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                  <p className="text-sm font-medium">Назначение проблемы...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Problems;
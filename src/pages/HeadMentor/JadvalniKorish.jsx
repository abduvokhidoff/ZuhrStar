import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { setCredentials, logout } from '../../redux/authSlice';

const DAYS_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const DAYS_ENG = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const ROOMS = [
  { id: 1, name: 'Хона 1', color: 'bg-blue-100 border-blue-300' },
  { id: 2, name: 'Хона 2', color: 'bg-green-100 border-green-300' },
  { id: 3, name: 'Хона 3', color: 'bg-purple-100 border-purple-300' },
];

const JadvalniKorish = () => {
  const dispatch = useDispatch();
  const accessToken = useSelector(state => state.auth.accessToken);
  const refreshToken = useSelector(state => state.auth.refreshToken);
  const user = useSelector(state => state.auth.user);

  const [currentDate] = useState(new Date());
  const [selectedDayIdx, setSelectedDayIdx] = useState(new Date().getDay());
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const timeSlots = Array.from({ length: 32 }, (_, i) => {
    const hour = Math.floor(i / 2) + 6;
    const minute = i % 2 === 0 ? '00' : '30';
    return `${hour.toString().padStart(2, '0')}:${minute}`;
  });

  const getWeekType = (date) => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    return weekNumber % 2 === 1 ? 'odd' : 'even';
  };

  const refreshAccessToken = useCallback(async () => {
    if (isRefreshing) {
      await new Promise(resolve => setTimeout(resolve, 500));
      return accessToken;
    }

    if (!refreshToken) {
      setError('Требуется авторизация.');
      dispatch(logout());
      return null;
    }

    setIsRefreshing(true);
    try {
      const response = await fetch('https://zuhrstar-production.up.railway.app/api/users/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }) // убедись, что поле именно так называется
      });

      if (!response.ok) throw new Error('Ошибка обновления токена');

      const data = await response.json();
      if (!data.accessToken) throw new Error('accessToken отсутствует в ответе');

      dispatch(setCredentials({
        user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken
      }));

      return data.accessToken;
    } catch (err) {
      setError(err.message || 'Ошибка при обновлении токена');
      dispatch(logout());
      return null;
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshToken, dispatch, user, isRefreshing, accessToken]);

  const fetchGroups = useCallback(async () => {
    const attemptFetch = async (tokenToUse) => {
      const response = await fetch('https://zuhrstar-production.up.railway.app/api/groups/', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        const newToken = await refreshAccessToken();
        if (!newToken) throw new Error('Не удалось обновить accessToken');
        return await attemptFetch(newToken);
      }

      if (!response.ok) throw new Error(`Ошибка ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Неверный формат данных');
      return data;
    };


    try {
      setLoading(true);
      const token = accessToken;
      if (!token) throw new Error('Нет accessToken');
      const groupsData = await attemptFetch(token);
      setGroups(groupsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, refreshAccessToken]);

  useEffect(() => {
    fetchGroups();
  }, [accessToken, refreshToken]);

  const handleDaySelect = (idx) => setSelectedDayIdx(idx);
  const handlePreviousDay = () => setSelectedDayIdx(prev => (prev === 0 ? 6 : prev - 1));
  const handleNextDay = () => setSelectedDayIdx(prev => (prev === 6 ? 0 : prev + 1));
  const handleRefresh = () => fetchGroups();
  const handleRoomSelect = (roomId) => setSelectedRoomId(roomId);

  function isGroupActiveToday(group) {
    if (!group || group.status !== 'active') return false;
    const weekType = getWeekType(currentDate);
    const days = group.days || {};
    if (days.every_days) return true;
    if (selectedDayIdx === 0 && days.sunday) return true;
    if (selectedDayIdx === 6 && days.saturday) return true;
    if (weekType === 'odd' && days.odd_days) return true;
    if (weekType === 'even' && days.even_days) return true;
    return days[DAYS_ENG[selectedDayIdx]] === true;
  }

  function getGroupBlock(group) {
    const startPosition = getTimeSlotPosition(group.start_time);
    const endPosition = getTimeSlotPosition(group.end_time);
    const width = Math.max(endPosition - startPosition, 5);
    return {
      startTime: group.start_time,
      endTime: group.end_time,
      subject: group.course || group.name,
      color: 'bg-blue-500',
      startPosition,
      width,
      border: '2px solid white',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    };
  }

  function getTimeSlotPosition(time) {
    if (!time) return -100;
    const [hour, minute] = time.split(':').map(Number);
    const totalMinutes = hour * 60 + minute;
    const min = 6 * 60;
    if (totalMinutes < min || totalMinutes >= 22 * 60) return -100;
    return ((totalMinutes - min) / (16 * 60)) * 100;
  }

  const filteredGroups = groups.filter(isGroupActiveToday);
  const roomsWithGroups = ROOMS.map((room, i) => ({
    ...room,
    group: filteredGroups[i] || null,
    hasGroup: !!filteredGroups[i],
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto bg-white rounded-lg shadow-sm">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h1 className="text-xl font-medium text-gray-700">Дашборд HeadMentor</h1>
          <button onClick={handleRefresh} className="p-2 text-gray-400 hover:text-gray-600" aria-label="Refresh">
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center border-b border-gray-200 bg-gray-50 px-4 py-2">
          <button onClick={handlePreviousDay} className="p-1 text-gray-400 hover:text-gray-600">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex space-x-2 mx-4">
            {DAYS_RU.map((day, idx) => (
              <button
                key={day}
                onClick={() => handleDaySelect(idx)}
                className={`px-3 py-1 rounded ${selectedDayIdx === idx ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 border'}`}
              >
                {day}
              </button>
            ))}
          </div>
          <button onClick={handleNextDay} className="p-1 text-gray-400 hover:text-gray-600">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 bg-gray-50">
          <div className="w-48 p-4 font-semibold text-gray-700">Хоналар</div>
          <div className="flex-1 flex">
            {timeSlots.map((time) => (
              <div key={time} className="flex-1 text-center py-3 text-xs text-gray-600 border-l border-gray-200">{time}</div>
            ))}
          </div>
        </div>


        {loading ? (
          <div className="p-8 text-center text-gray-500">Загрузка...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {roomsWithGroups.map((room) => {
              const block = room.group && selectedRoomId === room.id ? getGroupBlock(room.group) : null;
              const isSelected = selectedRoomId === room.id;
              return (
                <div key={room.id} className="flex min-h-20">
                  <div
                    className={`w-48 p-4 border-r border-gray-200 flex flex-col justify-center ${room.color} cursor-pointer ${isSelected ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
                      }`}
                    onClick={() => handleRoomSelect(room.id)}
                  >
                    <div className="text-sm font-bold text-gray-900 mb-2">{room.name}</div>
                    {room.hasGroup ? (
                      <div className="text-center">
                        <div className={`text-lg font-bold mb-1 ${isSelected ? 'text-blue-600' : 'text-gray-700'}`}>
                          {room.group.name}
                        </div>
                        <div className="text-sm text-gray-700">{room.group.course}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {room.group.start_time} - {room.group.end_time}
                        </div>
                        {isSelected && (
                          <div className="text-xs text-blue-600 font-medium mt-1">← Кликните для просмотра расписания</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="text-lg text-gray-400 font-medium">Бўш</div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 relative">
                    <div className="absolute inset-0 flex">
                      {timeSlots.map((_, i) => (
                        <div key={i} className="flex-1 border-l border-gray-100 min-h-20"></div>
                      ))}
                    </div>
                    <div className="relative p-2 min-h-20 flex items-center">
                      {block && (
                        <div
                          className={`absolute ${block.color} text-white text-xs px-2 py-1 rounded font-medium`}
                          style={{
                            left: `${block.startPosition}%`,
                            width: `${block.width}%`,
                            height: '32px',
                            lineHeight: '24px',
                            border: block.border,
                            boxShadow: block.boxShadow,
                          }}
                        >
                          {block.subject} <span className="ml-2">({block.startTime} - {block.endTime})</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default JadvalniKorish;

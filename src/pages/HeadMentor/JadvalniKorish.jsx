import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { setCredentials, logout } from '../../redux/authSlice';

const DAYS_RU = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const DAYS_ENG = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Toq/Juft/Har kuni/Yakshanba tugmalari
const DAY_FILTERS = [
  { key: 'odd_days', label: 'Тоқ', color: 'bg-blue-500' },
  { key: 'even_days', label: 'Жуфт', color: 'bg-green-500' },
  { key: 'every_days', label: 'Ҳар куни', color: 'bg-purple-500' },
  { key: 'sunday', label: 'Якшанба', color: 'bg-orange-500' },
];

const ROOMS = [
  { id: 1, name: 'Хона 1', color: 'bg-blue-100 border-blue-300' },
  { id: 2, name: 'Хона 2', color: 'bg-green-100 border-green-300' },
  { id: 3, name: 'Хона 3', color: 'bg-purple-100 border-purple-300' },
];

const JadvalniKorish = () => {
	const dispatch = useDispatch()
	const accessToken = useSelector(state => state.auth.accessToken)
	const refreshToken = useSelector(state => state.auth.refreshToken)
	const user = useSelector(state => state.auth.user)

	const [currentDate] = useState(new Date())
	const [selectedFilter, setSelectedFilter] = useState('odd_days') // Toq/Juft/Har kuni filter
	const [groups, setGroups] = useState([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)
	const [isRefreshing, setIsRefreshing] = useState(false)
	const [hoveredGroup, setHoveredGroup] = useState(null)
	const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })

	// 1 soatlik time slotlar - 8:00 dan 20:00 gacha (ertalab 8 dan kech 8 gacha) + 20:00 ham qo'shildi
	const timeSlots = Array.from({ length: 13 }, (_, i) => {
		const hour = i + 8
		return `${hour.toString().padStart(2, '0')}:00`
	})

	const getWeekType = date => {
		const startOfYear = new Date(date.getFullYear(), 0, 1)
		const weekNumber = Math.ceil(
			((date - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7
		)
		return weekNumber % 2 === 1 ? 'odd' : 'even'
	}

	const refreshAccessToken = useCallback(async () => {
		if (isRefreshing) {
			await new Promise(resolve => setTimeout(resolve, 500))
			return accessToken
		}

		if (!refreshToken) {
			setError('Требуется авторизация.')
			dispatch(logout())
			return null
		}

		setIsRefreshing(true)
		try {
			const response = await fetch(
				'https://zuhrstar-production.up.railway.app/api/users/refresh',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ refreshToken }),
				}
			)

			if (!response.ok) throw new Error('Ошибка обновления токена')

			const data = await response.json()
			if (!data.accessToken) throw new Error('accessToken отсутствует в ответе')

			dispatch(
				setCredentials({
					user,
					accessToken: data.accessToken,
					refreshToken: data.refreshToken,
				})
			)

			return data.accessToken
		} catch (err) {
			setError(err.message || 'Ошибка при обновлении токена')
			dispatch(logout())
			return null
		} finally {
			setIsRefreshing(false)
		}
	}, [refreshToken, dispatch, user, isRefreshing, accessToken])

	const fetchGroups = useCallback(async () => {
		const attemptFetch = async tokenToUse => {
			const response = await fetch(
				'https://zuhrstar-production.up.railway.app/api/groups/',
				{
					method: 'GET',
					headers: {
						Authorization: `Bearer ${tokenToUse}`,
						'Content-Type': 'application/json',
					},
				}
			)

			if (response.status === 401) {
				const newToken = await refreshAccessToken()
				if (!newToken) throw new Error('Не удалось обновить accessToken')
				return await attemptFetch(newToken)
			}

			if (!response.ok) throw new Error(`Ошибка ${response.status}`)
			const data = await response.json()
			if (!Array.isArray(data)) throw new Error('Неверный формат данных')
			return data
		}

		try {
			setLoading(true)
			const token = accessToken
			if (!token) throw new Error('Нет accessToken')
			const groupsData = await attemptFetch(token)
			setGroups(groupsData)
		} catch (err) {
			setError(err.message)
		} finally {
			setLoading(false)
		}
	}, [accessToken, refreshAccessToken])

	useEffect(() => {
		fetchGroups()
	}, [accessToken, refreshToken])

	const handleFilterSelect = filterKey => setSelectedFilter(filterKey)
	const handleRefresh = () => fetchGroups()

	function isGroupActiveForFilter(group) {
		if (!group || group.status !== 'active') return false
		const days = group.days || {}

		// Tanlangan filterga qarab guruhni ko'rsatish
		if (selectedFilter === 'every_days') return days.every_days
		if (selectedFilter === 'odd_days') return days.odd_days
		if (selectedFilter === 'even_days') return days.even_days
		if (selectedFilter === 'sunday') return days.sunday

		return false
	}

	function getGroupBlock(group) {
		const startPosition = getTimeSlotPosition(group.start_time)
		const endPosition = getTimeSlotPosition(group.end_time)
		const width = Math.max(endPosition - startPosition, 6.25) // Minimum 1 soatlik joy
		return {
			startTime: group.start_time,
			endTime: group.end_time,
			subject: group.course || group.name,
			color: 'bg-blue-500',
			startPosition,
			width,
			border: '2px solid white',
			boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
			group: group, // Gruppaning to'liq ma'lumotini saqlash
		}
	}

	function getTimeSlotPosition(time) {
		if (!time) return -100
		const [hour, minute] = time.split(':').map(Number)
		const totalMinutes = hour * 60 + minute
		const startMinutes = 8 * 60 // 8:00
		const endMinutes = 21 * 60 // 21:00 (20:00 gacha bo'lishi uchun)

		if (totalMinutes < startMinutes || totalMinutes >= endMinutes) return -100

		// 13 soatlik davr (8:00 - 21:00)
		return ((totalMinutes - startMinutes) / (13 * 60)) * 100
	}

	const handleMouseEnter = (event, group) => {
		setHoveredGroup(group)
		setTooltipPosition({
			x: event.clientX,
			y: event.clientY,
		})
	}

	const handleMouseLeave = () => {
		setHoveredGroup(null)
	}

	const handleMouseMove = event => {
		if (hoveredGroup) {
			setTooltipPosition({
				x: event.clientX,
				y: event.clientY,
			})
		}
	}

	const getDaysList = days => {
		if (!days) return 'Белгиланмаган'

		const activeDays = []
		if (days.odd_days) activeDays.push('Тоқ куннар')
		if (days.even_days) activeDays.push('Жуфт куннар')
		if (days.every_days) activeDays.push('Ҳар куни')
		if (days.sunday) activeDays.push('Якшанба')

		return activeDays.length > 0 ? activeDays.join(', ') : 'Белгиланмаган'
	}

	const filteredGroups = groups.filter(isGroupActiveForFilter)

	return (
		<div className='min-h-screen bg-gray-50 p-4' onMouseMove={handleMouseMove}>
			<div className='max-w-7xl mx-auto bg-white rounded-lg shadow-sm'>
				<div className='flex items-center justify-between p-6 border-b border-gray-200'>
					<h1 className='text-xl font-medium text-gray-700'>
						Dashboard HeadMentor
					</h1>
					<button
						onClick={handleRefresh}
						className='p-2 text-gray-400 hover:text-gray-600'
						aria-label='Refresh'
					>
						<RefreshCw
							className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
						/>
					</button>
				</div>

				{/* Filter tugmalari - chiroyliroq dizayn */}
				<div className='bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 px-6 py-4'>
					<div className='flex space-x-3'>
						{DAY_FILTERS.map(filter => (
							<button
								key={filter.key}
								onClick={() => handleFilterSelect(filter.key)}
								className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 shadow-sm ${
									selectedFilter === filter.key
										? `${filter.color} text-white shadow-lg`
										: 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
								}`}
							>
								{filter.label}
							</button>
						))}
					</div>
				</div>

				{/* Time header */}
				<div className='flex border-b border-gray-200 bg-gray-50'>
					<div className='flex-1 flex'>
						{timeSlots.map(time => (
							<div
								key={time}
								className='flex-1 text-center py-3 text-sm font-medium text-gray-600 border-l border-gray-200'
							>
								{time}
							</div>
						))}
					</div>
				</div>

				{loading ? (
					<div className='p-8 text-center text-gray-500'>Загрузка...</div>
				) : error ? (
					<div className='p-8 text-center text-red-500'>{error}</div>
				) : (
					<div className='divide-y divide-gray-200'>
						{ROOMS.map(room => {
							// Har bir xona uchun birinchi mos keluvchi guruhni topish
							const roomGroup = filteredGroups.find(
								(group, index) => index % ROOMS.length === room.id - 1
							)
							const block = roomGroup ? getGroupBlock(roomGroup) : null

							return (
								<div key={room.id} className='flex min-h-20'>
									<div className='flex-1 relative'>
										{/* Time grid lines */}
										<div className='absolute inset-0 flex'>
											{timeSlots.map((_, i) => (
												<div
													key={i}
													className='flex-1 border-l border-gray-100 min-h-20'
												></div>
											))}
										</div>

										{/* Group block */}
										<div className='relative p-2 min-h-20 flex items-center'>
											{block && (
												<div
													className={`absolute ${block.color} text-white text-xs px-2 py-1 rounded font-medium cursor-pointer hover:opacity-90 transition-opacity`}
													style={{
														left: `${block.startPosition}%`,
														width: `${block.width}%`,
														height: '32px',
														lineHeight: '24px',
														border: block.border,
														boxShadow: block.boxShadow,
													}}
													onMouseEnter={e => handleMouseEnter(e, block.group)}
													onMouseLeave={handleMouseLeave}
												>
													{block.subject}{' '}
													<span className='ml-2'>
														({block.startTime} - {block.endTime})
													</span>
												</div>
											)}
										</div>
									</div>
								</div>
							)
						})}
					</div>
				)}
			</div>

			{/* Tooltip */}
			{hoveredGroup && (
				<div
					className='fixed z-50 bg-gray-800 text-white text-sm rounded-lg shadow-xl p-4 max-w-xs pointer-events-none'
					style={{
						left: tooltipPosition.x + 10,
						top: tooltipPosition.y - 10,
						transform: 'translateY(-100%)',
					}}
				>
					<div className='space-y-2'>
						<div className='font-semibold text-blue-300 border-b border-gray-600 pb-2'>
							{hoveredGroup.name}
						</div>

						<div className='space-y-1 text-xs'>
							<div>
								<span className='text-gray-300'>Курс:</span>{' '}
								<span className='text-white'>
									{hoveredGroup.course || 'Белгиланмаган'}
								</span>
							</div>

							<div>
								<span className='text-gray-300'>Ўқитувчи:</span>{' '}
								<span className='text-white'>
									{hoveredGroup.teacher_fullName || 'Белгиланмаган'}
								</span>
							</div>

							<div>
								<span className='text-gray-300'>Филиал:</span>{' '}
								<span className='text-white'>
									{hoveredGroup.branch || 'Белгиланмаган'}
								</span>
							</div>

							<div>
								<span className='text-gray-300'>Куннар:</span>{' '}
								<span className='text-white'>
									{getDaysList(hoveredGroup.days)}
								</span>
							</div>

							<div>
								<span className='text-gray-300'>Талабалар сони:</span>{' '}
								<span className='text-white'>
									{hoveredGroup.students ? hoveredGroup.students.length : 0}
								</span>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default JadvalniKorish

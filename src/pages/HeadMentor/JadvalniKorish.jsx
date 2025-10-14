import React, { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RefreshCw } from 'lucide-react'
import { setCredentials, logout } from '../../redux/authSlice'

const DAY_FILTERS = [
	{ key: 'odd_days', label: 'Тоқ', color: 'bg-blue-500' },
	{ key: 'even_days', label: 'Жуфт', color: 'bg-green-500' },
	{ key: 'every_days', label: 'Ҳар куни', color: 'bg-purple-500' },
	{ key: 'sunday', label: 'Якшанба', color: 'bg-orange-500' },
]

const JadvalniKorish = () => {
	const dispatch = useDispatch()
	const accessToken = useSelector(state => state.auth.accessToken)
	const refreshToken = useSelector(state => state.auth.refreshToken)
	const user = useSelector(state => state.auth.user)

	const [selectedFilter, setSelectedFilter] = useState('odd_days')
	const [groups, setGroups] = useState([])
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState(null)
	const [hoveredGroup, setHoveredGroup] = useState(null)
	const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
	const [isRefreshing, setIsRefreshing] = useState(false)

	const timeSlots = Array.from({ length: 13 }, (_, i) => `${i + 8}:00`)

	const refreshAccessToken = useCallback(async () => {
		if (!refreshToken) {
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
			dispatch(
				setCredentials({
					user,
					accessToken: data.accessToken,
					refreshToken: data.refreshToken,
				})
			)
			return data.accessToken
		} catch (err) {
			setError(err.message)
			dispatch(logout())
			return null
		} finally {
			setIsRefreshing(false)
		}
	}, [refreshToken, dispatch, user])

	const fetchGroups = useCallback(async () => {
		try {
			setLoading(true)
			const token = accessToken
			if (!token) throw new Error('Нет accessToken')
			let response = await fetch(
				'https://zuhrstar-production.up.railway.app/api/groups/',
				{
					method: 'GET',
					headers: { Authorization: `Bearer ${token}` },
				}
			)

			if (response.status === 401) {
				const newToken = await refreshAccessToken()
				if (!newToken) throw new Error('Не удалось обновить accessToken')
				response = await fetch(
					'https://zuhrstar-production.up.railway.app/api/groups/',
					{
						method: 'GET',
						headers: { Authorization: `Bearer ${newToken}` },
					}
				)
			}

			const data = await response.json()
			setGroups(Array.isArray(data) ? data : [])
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
		if (selectedFilter === 'every_days') return days.every_days
		if (selectedFilter === 'odd_days') return days.odd_days
		if (selectedFilter === 'even_days') return days.even_days
		if (selectedFilter === 'sunday') return days.sunday
		return false
	}

	const filteredGroups = groups.filter(isGroupActiveForFilter)

	// === Dinamik xona soni (guruhlar soniga qarab)
	const ROOMS = filteredGroups.map((_, i) => ({
		id: i + 1,
		name: `Хона ${i + 1}`,
		color: i % 2 === 0 ? 'bg-blue-50' : 'bg-green-50',
	}))

	function getTimeSlotPosition(time) {
		if (!time) return -100
		const [hour, minute] = time.split(':').map(Number)
		const totalMinutes = hour * 60 + minute
		const startMinutes = 8 * 60
		const endMinutes = 21 * 60
		if (totalMinutes < startMinutes || totalMinutes >= endMinutes) return -100
		return ((totalMinutes - startMinutes) / (13 * 60)) * 100
	}

	const getGroupBlock = group => {
		const startPosition = getTimeSlotPosition(group.start_time)
		const endPosition = getTimeSlotPosition(group.end_time)
		return {
			startTime: group.start_time,
			endTime: group.end_time,
			subject: group.course || group.name,
			startPosition,
			width: Math.max(endPosition - startPosition, 6.25),
			color: 'bg-blue-500',
			group,
		}
	}

	const handleMouseEnter = (event, group) => {
		setHoveredGroup(group)
		setTooltipPosition({ x: event.clientX, y: event.clientY })
	}

	const handleMouseLeave = () => setHoveredGroup(null)

	const handleMouseMove = event => {
		if (hoveredGroup) {
			setTooltipPosition({ x: event.clientX, y: event.clientY })
		}
	}

	const getDaysList = days => {
		if (!days) return 'Белгиланмаган'
		const activeDays = []
		if (days.odd_days) activeDays.push('Тоқ кунлар')
		if (days.even_days) activeDays.push('Жуфт кунлар')
		if (days.every_days) activeDays.push('Ҳар куни')
		if (days.sunday) activeDays.push('Якшанба')
		return activeDays.join(', ')
	}

	return (
		<div className='min-h-screen bg-gray-50 p-4' onMouseMove={handleMouseMove}>
			<div className='max-w-7xl mx-auto bg-white rounded-lg shadow-sm'>
				{/* Header */}
				<div className='flex items-center justify-between p-6 border-b border-gray-200'>
					<h1 className='text-xl font-medium text-gray-700'>
						Dashboard HeadMentor
					</h1>
					<button
						onClick={handleRefresh}
						className='p-2 text-gray-400 hover:text-gray-600'
					>
						<RefreshCw
							className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
						/>
					</button>
				</div>

				{/* Filter buttons */}
				<div className='bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 px-6 py-4'>
					<div className='flex space-x-3'>
						{DAY_FILTERS.map(filter => (
							<button
								key={filter.key}
								onClick={() => handleFilterSelect(filter.key)}
								className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
									selectedFilter === filter.key
										? `${filter.color} text-white shadow-lg`
										: 'bg-white text-gray-700 border-2 border-gray-200 hover:bg-gray-50'
								}`}
							>
								{filter.label}
							</button>
						))}
					</div>
				</div>

				{/* Time header */}
				<div className='flex border-b border-gray-200 bg-gray-50'>
					{timeSlots.map(time => (
						<div
							key={time}
							className='flex-1 text-center py-3 text-sm font-medium text-gray-600 border-l border-gray-200'
						>
							{time}
						</div>
					))}
				</div>

				{/* Groups by room */}
				{loading ? (
					<div className='p-8 text-center text-gray-500'>Загрузка...</div>
				) : error ? (
					<div className='p-8 text-center text-red-500'>{error}</div>
				) : (
					<div className='divide-y divide-gray-200'>
						{ROOMS.map((room, i) => {
							const group = filteredGroups[i]
							if (!group) return null
							const block = getGroupBlock(group)

							return (
								<div key={room.id} className='flex min-h-20 relative'>
									{/* Grid */}
									<div className='absolute inset-0 flex'>
										{timeSlots.map((_, j) => (
											<div
												key={j}
												className='flex-1 border-l border-gray-100'
											></div>
										))}
									</div>

									{/* Group Block */}
									<div
										className={`absolute ${block.color} text-white text-xs px-2 py-1 rounded font-medium cursor-pointer hover:opacity-90 transition-opacity`}
										style={{
											left: `${block.startPosition}%`,
											width: `${block.width}%`,
											height: '36px',
											top: '12px',
										}}
										onMouseEnter={e => handleMouseEnter(e, block.group)}
										onMouseLeave={handleMouseLeave}
									>
										{block.subject} ({block.startTime}-{block.endTime})
									</div>

									{/* Room Label */}
									<div className='absolute left-2 top-1/2 -translate-y-1/2 text-gray-700 font-medium'>
										{room.name}
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
						<div className='text-xs space-y-1'>
							<p>Курс: {hoveredGroup.course || 'Белгиланмаган'}</p>
							<p>Ўқитувчи: {hoveredGroup.teacher_fullName || '—'}</p>
							<p>Кунлар: {getDaysList(hoveredGroup.days)}</p>
							<p>Талабалар сони: {hoveredGroup.students?.length || 0}</p>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default JadvalniKorish

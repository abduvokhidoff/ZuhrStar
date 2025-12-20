import React, { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { RefreshCw } from 'lucide-react'
import { setCredentials, logout } from '../../redux/authSlice'

// ❌ Sunday removed
const DAY_FILTERS = [
	{ key: 'odd_days', label: 'Toq', color: 'bg-blue-500' },
	{ key: 'even_days', label: 'Juft', color: 'bg-blue-500' },
	{ key: 'every_days', label: 'Har kuni', color: 'bg-blue-500' },
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

	// === Static 12 rooms ===
	const ROOMS = Array.from({ length: 12 }, (_, i) => ({
		id: i + 1,
		name: `Xona ${i + 1}`,
		color: i % 2 === 0 ? 'bg-blue-50' : 'bg-green-50',
	}))

	// === Refresh Token ===
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

	// === Fetch Groups ===
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

	// === Sunday removed ===
	function isGroupActiveForFilter(group) {
		if (!group || group.status !== 'active') return false
		const days = group.days || {}
		if (selectedFilter === 'every_days') return days.every_days
		if (selectedFilter === 'odd_days') return days.odd_days
		if (selectedFilter === 'even_days') return days.even_days
		return false
	}

	const filteredGroups = groups.filter(isGroupActiveForFilter)

	function getTimeSlotPosition(time) {
		if (!time) return -100
		const [hour, minute] = time.split(':').map(Number)
		const totalMinutes = hour * 60 + minute
		const startMinutes = 8 * 60
		const endMinutes = 21 * 60
		if (totalMinutes < startMinutes || totalMinutes >= endMinutes) return -100
		return ((totalMinutes - startMinutes) / (13 * 60)) * 100
	}

	// === Random colors for groups ===
	const COLORS = [
		'bg-blue-500',
		'bg-green-500',
		'bg-purple-500',
		'bg-pink-500',
		'bg-yellow-500',
		'bg-indigo-500',
		'bg-red-500',
		'bg-teal-500',
		'bg-orange-500',
		'bg-cyan-500',
	]

	const getGroupBlock = (group, index) => {
		const startPosition = getTimeSlotPosition(group.start_time)
		const endPosition = getTimeSlotPosition(group.end_time)
		return {
			startTime: group.start_time,
			endTime: group.end_time,
			subject: group.course || group.name,
			startPosition,
			width: Math.max(endPosition - startPosition, 6.25),
			color: COLORS[index % COLORS.length],
			group,
		}
	}

	// === Check if two groups overlap ===
	const doGroupsOverlap = (group1, group2) => {
		const start1 = group1.start_time
		const end1 = group1.end_time
		const start2 = group2.start_time
		const end2 = group2.end_time

		return start1 < end2 && end1 > start2
	}

	// === Assign rooms to groups ===
	const assignRoomsToGroups = () => {
		const roomAssignments = Array.from({ length: 12 }, () => [])

		filteredGroups.forEach(group => {
			let assigned = false

			// Try to find a room without overlap
			for (let roomIndex = 0; roomIndex < 12; roomIndex++) {
				const roomGroups = roomAssignments[roomIndex]
				const hasOverlap = roomGroups.some(existingGroup =>
					doGroupsOverlap(group, existingGroup)
				)

				if (!hasOverlap) {
					roomAssignments[roomIndex].push(group)
					assigned = true
					break
				}
			}

			// If no room found, add to first room (shouldn't happen with 12 rooms)
			if (!assigned) {
				roomAssignments[0].push(group)
			}
		})

		return roomAssignments
	}

	const roomAssignments = assignRoomsToGroups()

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

	// === Sunday removed ===
	const getDaysList = days => {
		if (!days) return 'Белгиланмаган'
		const activeDays = []
		if (days.odd_days) activeDays.push('Тоқ кунлар')
		if (days.even_days) activeDays.push('Жуфт кунлар')
		if (days.every_days) activeDays.push('Ҳар куни')
		return activeDays.join(', ')
	}

	return (
		<div className='min-h-screen bg-gray-50 p-4' onMouseMove={handleMouseMove}>
			<div className='max-w-7xl mx-auto bg-white rounded-lg shadow-sm'>

				{/* DAY FILTERS (No Sunday) */}
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

				{/* Time Header */}
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

				{/* Groups */}
				{loading ? (
					<div className='p-8 text-center text-gray-500'>Загрузка...</div>
				) : error ? (
					<div className='p-8 text-center text-red-500'>{error}</div>
				) : (
					<div className='divide-y divide-gray-200'>
						{ROOMS.map((room, roomIndex) => {
							const roomGroups = roomAssignments[roomIndex]

							return (
								<div
									key={room.id}
									className='flex min-h-20 relative hover:bg-gray-50 transition-colors'
								>
									{/* Grid */}
									<div className='absolute inset-0 flex'>
										{timeSlots.map((_, j) => (
											<div
												key={j}
												className='flex-1 border-l border-gray-100'
											></div>
										))}
									</div>

									{/* Multiple Groups in one room */}
									{roomGroups.map((group, groupIndex) => {
										const block = getGroupBlock(group, groupIndex)
										return (
											<div
												key={`${room.id}-${groupIndex}`}
												className={`absolute ${block.color} text-white text-xs px-2 py-1 rounded-lg font-medium cursor-pointer hover:opacity-90 hover:scale-105 transition-all duration-200 shadow-md`}
												style={{
													left: `${block.startPosition}%`,
													width: `${block.width}%`,
													height: '36px',
													top: '12px',
												}}
												onMouseEnter={e => handleMouseEnter(e, block.group)}
												onMouseLeave={handleMouseLeave}
											>
												<div className='truncate'>
													{block.subject} ({block.startTime}-{block.endTime})
												</div>
											</div>
										)
									})}

									{/* Room Label */}
									<div className='absolute left-2 top-1/2 -translate-y-1/2 text-gray-700 font-semibold text-sm bg-white px-2 py-1 rounded shadow-sm'>
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

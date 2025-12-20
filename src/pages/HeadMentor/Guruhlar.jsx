import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setCredentials } from '../../redux/authSlice'
import {
	Clock,
	Code,
	Search,
	Users,
	ChevronLeft,
	Check,
	X,
	ChevronDown,
	Loader2,
	GraduationCap,
	User,
} from 'lucide-react'

const API_BASE = 'https://zuhr-star-production.up.railway.app/api'

// === Yordamchi funksiyalar ===
const gid = g => String(g?.group_id ?? g?.id ?? g?._id ?? '')
const sid = s => String(s?.student_id ?? s?.studentId ?? s?.id ?? s?._id ?? '')
const attKey = (g, s, dateStr) => `${g}:${s}:${dateStr}`

const niceStudent = s => {
	const nameParts = [s?.full_name || s?.fullName, s?.name, s?.surname].filter(
		Boolean
	)
	const name = nameParts.join(' ').trim() || "Noma'lum"
	return { ...s, name }
}

// NEW CONFIG — weekday-based class rule
// Mon=1 Tue=2 Wed=3 Thu=4 Fri=5 Sat=6 Sun=0
const getWeekdayConfig = group => {
	const days = group?.days || {}
	return {
		odd: !!days.odd_days, // Mon, Wed, Fri
		even: !!days.even_days, // Tue, Thu, Sat
		every: !!days.every_days,
	}
}

// FIXED — now using weekday instead of date number
const isClassDay = (dayOfMonth, group) => {
	const cfg = getWeekdayConfig(group)
	if (cfg.every) return true
	const date = new Date(group.selectedYear, group.selectedMonth, dayOfMonth)
	const weekday = date.getDay() // 0=Sun ... 6=Sat
	if (cfg.odd && [1, 3, 5].includes(weekday)) return true // Mon Wed Fri
	if (cfg.even && [2, 4, 6].includes(weekday)) return true // Tue Thu Sat
	return false
}

const daysBadge = g => {
	const cfg = getWeekdayConfig(g)
	if (cfg.every) return 'Har kuni'
	if (cfg.odd) return 'Toq kunlar (Dush, Chorsh, Jum)'
	if (cfg.even) return 'Juft kunlar (Sesh, Paysh, Shan)'
	return '—'
}

// Helper: build local YYYY-MM-DD from a Date (avoids toISOString timezone shifts)
const toLocalDateStr = d => {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
		2,
		'0'
	)}-${String(d.getDate()).padStart(2, '0')}`
}

const Guruhlar = () => {
	const dispatch = useDispatch()
	const accessToken = useSelector(state => state.auth.accessToken)
	const refreshToken = useSelector(state => state.auth.refreshToken)

	// === State ===
	const [groups, setGroups] = useState([])
	const [selectedGroup, setSelectedGroup] = useState(null)
	const [students, setStudents] = useState([])
	const [attendance, setAttendance] = useState({})
	const [showOptions, setShowOptions] = useState(null)
	const [selectedMonth, setSelectedMonth] = useState(null)
	const [search, setSearch] = useState('')
	const [isLoading, setIsLoading] = useState({ boot: true, attendance: false })

	// === Oylar ===
	const months = useMemo(() => {
		const now = new Date()
		const result = []
		for (let i = -3; i <= 3; i++) {
			const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
			result.push({
				label: d.toLocaleDateString('en-US', {
					month: 'long',
					year: '2-digit',
				}),
				month: d.getMonth(),
				year: d.getFullYear(),
				isCurrent:
					d.getMonth() === now.getMonth() &&
					d.getFullYear() === now.getFullYear(),
			})
		}
		return result
	}, [])

	useEffect(() => {
		const current = months.find(m => m.isCurrent)
		if (current) setSelectedMonth(current)
	}, [months])

	// === Oy kunlari (dateStr: YYYY-MM-DD local) ===
	const monthDays = useMemo(() => {
		if (!selectedMonth) return []
		const y = selectedMonth.year
		const m = selectedMonth.month
		const daysInMonth = new Date(y, m + 1, 0).getDate()
		return Array.from({ length: daysInMonth }, (_, i) => {
			const day = i + 1
			const d = new Date(y, m, day)
			const isoLocal = toLocalDateStr(d) // local YYYY-MM-DD
			const now = new Date()
			const isToday =
				day === now.getDate() && m === now.getMonth() && y === now.getFullYear()
			const dateLabel = `${String(day).padStart(2, '0')}.${String(
				m + 1
			).padStart(2, '0')}`
			const dayName = d.toLocaleDateString('uz-UZ', { weekday: 'short' })
			return { day, date: d, dateStr: isoLocal, isToday, dateLabel, dayName }
		})
	}, [selectedMonth])

	// === FIXED: weekday-based filtering ===
	const classDays = useMemo(() => {
		if (!selectedGroup) return monthDays
		return monthDays.filter(d =>
			isClassDay(d.day, {
				...selectedGroup,
				selectedYear: selectedMonth?.year,
				selectedMonth: selectedMonth?.month,
			})
		)
	}, [monthDays, selectedGroup, selectedMonth])

	// === Token yangilash ===
	const refreshAccessToken = useCallback(async () => {
		if (!refreshToken) return null
		try {
			const res = await fetch(`${API_BASE}/users/refresh`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refreshToken }),
			})
			if (!res.ok) throw new Error('Token refresh failed')
			const data = await res.json()
			dispatch(setCredentials(data))
			return data.accessToken
		} catch (err) {
			console.error('refreshAccessToken error:', err)
			return null
		}
	}, [refreshToken, dispatch])

	// === Avtorizatsiyali fetch ===
	const authFetch = useCallback(
		async (url, opts = {}) => {
			const attempt = async token => {
				const headers = {
					Authorization: token ? `Bearer ${token}` : undefined,
					'Content-Type': 'application/json',
					...(opts.headers || {}),
				}
				const res = await fetch(url, { ...opts, headers })
				if (res.status === 401) throw new Error('401')
				if (!res.ok) {
					const text = await res.text()
					throw new Error(text || `HTTP ${res.status}`)
				}
				const ct = res.headers.get('content-type') || ''
				if (ct.includes('application/json')) return await res.json()
				return null
			}

			try {
				return await attempt(accessToken)
			} catch (e) {
				if (String(e.message).includes('401')) {
					const newToken = await refreshAccessToken()
					if (!newToken) throw e
					return await attempt(newToken)
				}
				throw e
			}
		},
		[accessToken, refreshAccessToken]
	)

	// === Guruhlar yuklash ===
	useEffect(() => {
		if (!accessToken) return
		const load = async () => {
			setIsLoading(prev => ({ ...prev, boot: true }))
			try {
				const gRes = await authFetch(`${API_BASE}/groups`)
				const groupList = Array.isArray(gRes) ? gRes : gRes?.groups || []
				setGroups(groupList)
			} catch (err) {
				console.error('Guruhlar yuklashda xato:', err)
			} finally {
				setIsLoading(prev => ({ ...prev, boot: false }))
			}
		}
		load()
	}, [accessToken, authFetch])

	// === Guruh tanlanganda talabalar yuklash ===
	const handleGroupClick = async group => {
		setSelectedGroup(group)
		setStudents([])
		try {
			// if students are embedded in group, use them, else fetch if API provides endpoint
			const studentsInGroup = (group.students || []).map(niceStudent)
			setStudents(studentsInGroup)
		} catch (err) {
			console.error(err)
		}
	}

	// === Davomat yuklash ===
	const loadAttendance = useCallback(async () => {
		if (!selectedGroup || !selectedMonth) return
		setIsLoading(prev => ({ ...prev, attendance: true }))
		try {
			// Use local YYYY-MM-DD strings to avoid timezone shifts
			const startDate = new Date(selectedMonth.year, selectedMonth.month, 1)
			const endDate = new Date(selectedMonth.year, selectedMonth.month + 1, 0)
			const start = toLocalDateStr(startDate)
			const end = toLocalDateStr(endDate)

			const groupParam =
				selectedGroup.group_id ?? selectedGroup.id ?? gid(selectedGroup)
			const res = await authFetch(
				`${API_BASE}/attendance?group_id=${groupParam}&start=${start}&end=${end}`
			)
			const data = Array.isArray(res) ? res : res?.attendance || []
			const map = {}
			data.forEach(r => {
				// Normalize date coming from backend (attempt to parse date portion)
				let dateStr = r.date || r.dateStr || ''
				// If backend sent ISO with time, extract YYYY-MM-DD
				if (dateStr.includes('T')) dateStr = dateStr.split('T')[0]
				// If backend returned UTC-shifted YYYY-MM-DD, keep as-is; we match local dateStr format above
				if (!dateStr) return
				const key = attKey(gid(selectedGroup), sid(r), dateStr)
				map[key] =
					r.status === 'present' || r.status === true ? 'present' : 'absent'
			})
			setAttendance(map)
		} catch (err) {
			console.error('Davomat yuklashda xato:', err)
		} finally {
			setIsLoading(prev => ({ ...prev, attendance: false }))
		}
	}, [selectedGroup, selectedMonth, authFetch])

	useEffect(() => {
		if (selectedGroup) loadAttendance()
	}, [selectedGroup, selectedMonth, loadAttendance])

	// === Vaqtni tekshirish ===
	const canMarkAttendance = dateStr => {
		if (!selectedGroup) {
			return { allowed: false, message: 'Guruh tanlanmagan.' }
		}

		const now = new Date()

		// Parse the date string correctly (YYYY-MM-DD format), assuming local date
		const parts = dateStr.split('-').map(Number)
		if (parts.length !== 3) {
			return { allowed: false, message: "Noto'g'ri sana formatı." }
		}
		const [year, month, day] = parts
		const selectedDate = new Date(year, month - 1, day)

		// Set time to start of day for accurate comparison
		const todayStart = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate()
		)
		todayStart.setHours(0, 0, 0, 0)

		const selectedStart = new Date(
			selectedDate.getFullYear(),
			selectedDate.getMonth(),
			selectedDate.getDate()
		)
		selectedStart.setHours(0, 0, 0, 0)

		// Check if the selected date is in the past
		if (selectedStart.getTime() < todayStart.getTime()) {
			return {
				allowed: false,
				message: "O'tgan kunlar uchun davomat belgilab bo'lmaydi!",
			}
		}

		// Check if the selected date is in the future
		if (selectedStart.getTime() > todayStart.getTime()) {
			return {
				allowed: false,
				message: "Kelajak kunlar uchun davomat belgilab bo'lmaydi!",
			}
		}

		// It's today, now check class time
		const startTime = selectedGroup?.start_time || '00:00'
		const endTime = selectedGroup?.end_time || '23:59'

		// Parse time strings safely (fallback if format unexpected)
		const parseTime = t => {
			const p = String(t)
				.split(':')
				.map(n => Number(n))
			const h = Number.isFinite(p[0]) ? p[0] : 0
			const mm = Number.isFinite(p[1]) ? p[1] : 0
			return {
				h: Math.max(0, Math.min(23, h)),
				m: Math.max(0, Math.min(59, mm)),
			}
		}
		const s = parseTime(startTime)
		const e = parseTime(endTime)

		// Current time in minutes since midnight
		const currentMinutes = now.getHours() * 60 + now.getMinutes()
		const classStartMinutes = s.h * 60 + s.m
		const classEndMinutes = e.h * 60 + e.m

		// Helper to format HH:MM nicely
		const formatTime = timeStr => {
			const parts = String(timeStr).split(':')
			const hh = parts[0] ? String(parts[0]).padStart(2, '0') : '00'
			const mm = parts[1] ? String(parts[1]).padStart(2, '0') : '00'
			return `${hh}:${mm}`
		}

		// Check if current time is before class starts
		if (currentMinutes < classStartMinutes) {
			return {
				allowed: false,
				message: `Dars hali boshlanmagan! Dars vaqti: ${formatTime(
					startTime
				)} - ${formatTime(endTime)}`,
			}
		}

		// Check if current time is after class ends
		if (currentMinutes > classEndMinutes) {
			return {
				allowed: false,
				message: `Dars tugagan! Dars vaqti: ${formatTime(
					startTime
				)} - ${formatTime(endTime)}`,
			}
		}

		return { allowed: true }
	}

	// === Davomat belgilash ===
	const markAttendance = async (studentIdRaw, dateStr, status) => {
		// Vaqtni tekshirish
		const timeCheck = canMarkAttendance(dateStr)
		if (!timeCheck.allowed) {
			alert(timeCheck.message)
			return
		}
		const studentId = String(studentIdRaw)
		const key = attKey(gid(selectedGroup), studentId, dateStr)
		const prev = attendance[key]
		setAttendance(prevMap => ({ ...prevMap, [key]: status }))

		try {
			const groupVal =
				selectedGroup.group_id ?? selectedGroup.id ?? gid(selectedGroup)
			const groupNumeric = Number(groupVal)
			const studentNumeric = Number(studentId)
			const payload = {
				group_id: !Number.isNaN(groupNumeric) ? groupNumeric : groupVal,
				student_id: !Number.isNaN(studentNumeric) ? studentNumeric : studentId,
				groupId: gid(selectedGroup),
				studentId: studentId,
				date: dateStr,
				status: status === 'present',
			}
			await authFetch(`${API_BASE}/attendance`, {
				method: 'POST',
				body: JSON.stringify(payload),
			})
			setShowOptions(null)
		} catch (err) {
			console.error('Davomat belgilashda xato:', err)
			setAttendance(prevMap => ({ ...prevMap, [key]: prev }))
			let errMsg = err?.message ?? String(err)
			try {
				const parsed = JSON.parse(errMsg)
				if (parsed?.message) errMsg = parsed.message
			} catch {}
			alert('Xatolik: ' + errMsg)
		}
	}

	const getStatusCls = s =>
		s === 'present'
			? 'bg-[#4ADE80] text-white'
			: s === 'absent'
			? 'bg-[#EF4444] text-white'
			: 'bg-gray-100 border border-gray-300'

	const filteredGroups = groups.filter(g =>
		(g.name || '').toLowerCase().includes(search.toLowerCase())
	)

	// === YUKLANMOQDA ===
	if (isLoading.boot) {
		return (
			<div className='min-h-screen flex items-center justify-center'>
				<Loader2 className='w-8 h-8 animate-spin text-[#0066CC]' />
			</div>
		)
	}

	// === GURUHLAR RO'YXATI ===
	if (!selectedGroup) {
		return (
			<div className='min-h-screen px-6 py-8'>
				<div className='flex justify-between items-center mb-6'>
					<div>
						<h1 className='text-3xl font-bold text-gray-900'>Guruhlar</h1>
						<p className='text-gray-600 text-sm mt-1'>
							Barcha guruhlar va ularning ma'lumotlari
						</p>
					</div>
					<div className='flex items-center gap-3'>
						<div className='bg-white px-4 py-2 flex items-center gap-2 rounded-lg border'>
							<Search size={16} className='text-gray-400' />
							<input
								type='text'
								value={search}
								onChange={e => setSearch(e.target.value)}
								className='outline-none text-sm w-48'
								placeholder='Guruh qidirish...'
							/>
						</div>
					</div>
				</div>

				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
					{filteredGroups.map(group => (
						<div
							key={gid(group)}
							onClick={() => handleGroupClick(group)}
							className='bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all cursor-pointer'
						>
							<div className='p-5'>
								<div className='flex justify-between items-start mb-4'>
									<div>
										<h3 className='font-bold text-lg text-gray-900'>
											{group.name}
										</h3>
										<p className='text-[#0066CC] text-sm mt-1'>
											{group.course}
										</p>
									</div>
									<div className='bg-[#E6F2FF] p-2 rounded-lg'>
										<Code size={20} className='text-[#0066CC]' />
									</div>
								</div>

								<div className='space-y-3 text-sm text-gray-700'>
									<div className='flex items-center gap-2'>
										<Clock size={16} className='text-[#0066CC]' />
										<span>
											{group.start_time} - {group.end_time}
										</span>
									</div>
									<div className='flex items-center gap-2'>
										<User size={16} className='text-[#0066CC]' />
										<span>{group.teacher_fullName || '—'}</span>
									</div>
									<div className='flex items-center gap-2'>
										<Users size={16} className='text-[#0066CC]' />
										<span>{group.students?.length || 0} o'quvchi</span>
									</div>
								</div>

								<div className='mt-4 pt-4 border-t'>
									<span className='inline-block bg-[#E6F2FF] text-[#0066CC] px-3 py-1.5 rounded-full text-xs font-semibold'>
										{daysBadge(group)}
									</span>
								</div>
							</div>
						</div>
					))}
				</div>
			</div>
		)
	}

	// === DAVOMAT JADVALI ===
	return (
		<div className='h-screen  flex flex-col overflow-hidden'>
			{/* Header with back button */}
			<div className='bg-white border-b shadow-sm flex-shrink-0'>
				<div className='max-w-7xl mx-auto px-6 py-4 flex items-center justify-between'>
					<div className='flex items-center gap-4'>
						<button
							onClick={() => setSelectedGroup(null)}
							className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
							title='Ortga'
						>
							<ChevronLeft className='w-5 h-5 text-gray-600' />
						</button>
						<GraduationCap className='w-6 h-6 text-[#0066CC]' />
						<h1 className='text-xl font-bold text-gray-900'>Davomat jadvali</h1>
					</div>

					<div className='relative'>
						<select
							value={gid(selectedGroup)}
							onChange={e => {
								const g = groups.find(x => gid(x) === e.target.value)
								if (g) handleGroupClick(g)
							}}
							className='appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-10 font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0066CC]'
						>
							{groups.map(g => (
								<option key={gid(g)} value={gid(g)}>
									{g.name}
								</option>
							))}
						</select>
						<ChevronDown className='absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none' />
					</div>
				</div>
			</div>

			<div className='max-w-7xl mx-auto px-6 py-6 flex-1 flex flex-col overflow-hidden w-full'>
				{/* Stats */}
				<div className='grid grid-cols-4 gap-4 mb-6 flex-shrink-0'>
					<div className='bg-white border border-gray-200 rounded-xl p-4'>
						<div className='text-sm text-gray-500 mb-2'>Yo'nalish</div>
						<div className='text-2xl font-bold text-[#0066CC] mb-1'>
							{selectedGroup.course || '—'}
						</div>
						<div className='text-xs text-gray-600'>{selectedGroup.name}</div>
					</div>
					<div className='bg-white border border-gray-200 rounded-xl p-4'>
						<div className='text-sm text-gray-500 mb-2'>Darslar soni</div>
						<div className='text-2xl font-bold text-[#0066CC]'>
							{classDays.length}
						</div>
					</div>
					<div className='bg-white border border-gray-200 rounded-xl p-4'>
						<div className='text-sm text-gray-500 mb-2'>Dars vaqti</div>
						<div className='text-2xl font-bold text-[#0066CC]'>
							{selectedGroup.start_time?.substring(0, 5) || '—'}
						</div>
					</div>
					<div className='bg-white border border-gray-200 rounded-xl p-4'>
						<div className='text-sm text-gray-500 mb-2'>Dars kunlari</div>
						<div className='text-2xl font-bold text-[#0066CC]'>
							{daysBadge(selectedGroup)}
						</div>
					</div>
				</div>

				{/* Oylar */}
				<div className='flex gap-2 mb-6 overflow-x-auto pb-2 flex-shrink-0'>
					{months.map((m, i) => (
						<button
							key={i}
							onClick={() => setSelectedMonth(m)}
							className={`px-5 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
								selectedMonth?.label === m.label
									? 'bg-[#0066CC] text-white'
									: 'bg-white text-gray-700 border border-gray-300 hover:border-[#0066CC]'
							}`}
						>
							{m.label}
						</button>
					))}
				</div>

				{/* Jadval */}
				{isLoading.attendance ? (
					<div className='flex items-center justify-center h-64'>
						<Loader2 className='w-8 h-8 animate-spin text-[#0066CC]' />
					</div>
				) : (
					<div className='bg-white border border-gray-200 rounded-lg overflow-hidden flex-1 min-h-0'>
						<div className='overflow-auto h-full'>
							<table className='w-full'>
								<thead className='sticky top-0 z-20 bg-white'>
									<tr className='border-b border-gray-200 bg-[#F8FAFC]'>
										<th className='sticky left-0 bg-[#F8FAFC] z-30 text-left px-4 py-3 font-semibold text-gray-700 border-r border-gray-200 min-w-[400px]'>
											O'quvchilar ro'yxati
										</th>
										{classDays.map(d => (
											<th
												key={d.dateStr}
												className='px-2 py-3 text-center min-w-[70px]'
											>
												<div className='text-xs font-semibold text-gray-700'>
													{d.dateLabel}
												</div>
												<div className='text-[10px] text-gray-500 mt-0.5 uppercase'>
													{d.dayName}
												</div>
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{students.map((s, i) => {
										const student = niceStudent(s)
										return (
											<tr
												key={sid(student)}
												className='border-b border-gray-100 hover:bg-gray-50'
											>
												<td className='sticky left-0 bg-white z-10 px-4 py-3 border-r border-gray-200'>
													<div className='flex items-center gap-3'>
														<span className='w-[30px] h-[30px] rounded-full bg-[#0066CC] text-white text-sm flex items-center justify-center font-semibold'>
															{i + 1}
														</span>
														<span className='font-medium text-gray-900'>
															{student.name}
														</span>
													</div>
												</td>

												{classDays.map(d => {
													const key = attKey(
														gid(selectedGroup),
														sid(student),
														d.dateStr
													)
													const status = attendance[key]
													return (
														<td
															key={d.dateStr}
															className='px-2 py-2 text-center relative'
														>
															<button
																onClick={() =>
																	setShowOptions(
																		showOptions === key ? null : key
																	)
																}
																className={`w-9 h-9 rounded-md flex items-center justify-center mx-auto transition-all ${getStatusCls(
																	status
																)}`}
															>
																{status === 'present' && (
																	<Check className='w-4 h-4' />
																)}
																{status === 'absent' && (
																	<X className='w-4 h-4' />
																)}
															</button>

															{showOptions === key && (
																<div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20'>
																	<div className='bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-2'>
																		<button
																			onClick={() =>
																				markAttendance(
																					sid(student),
																					d.dateStr,
																					'present'
																				)
																			}
																			className='w-10 h-10 bg-[#4ADE80] text-white rounded-md flex items-center justify-center hover:bg-[#22C55E] transition'
																		>
																			<Check className='w-5 h-5' />
																		</button>
																		<button
																			onClick={() =>
																				markAttendance(
																					sid(student),
																					d.dateStr,
																					'absent'
																				)
																			}
																			className='w-10 h-10 bg-[#EF4444] text-white rounded-md flex items-center justify-center hover:bg-[#DC2626] transition'
																		>
																			<X className='w-5 h-5' />
																		</button>
																	</div>
																	<div className='absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white' />
																</div>
															)}
														</td>
													)
												})}
											</tr>
										)
									})}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</div>

			{showOptions && (
				<div
					className='fixed inset-0 z-10'
					onClick={() => setShowOptions(null)}
				/>
			)}
		</div>
	)
}

export default Guruhlar

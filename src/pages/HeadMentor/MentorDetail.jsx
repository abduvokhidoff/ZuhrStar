// MentorDetail.jsx
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setCredentials } from '../../redux/authSlice' // adjust path if needed
import { useParams, useNavigate } from 'react-router-dom'
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

const API_BASE = 'https://zuhrstar-production.up.railway.app/api'

// ----------------- helpers -----------------
const gid = g => String(g?.group_id ?? g?.id ?? g?._id ?? '')
const sid = s => String(s?.student_id ?? s?.studentId ?? s?._id ?? '')
const attKey = (g, s, dateStr) => `${g}:${s}:${dateStr}`

const niceStudent = s => {
	const nameParts = [s?.name, s?.surname].filter(Boolean)
	const name = nameParts.join(' ').trim() || "Noma'lum"
	return { ...s, name }
}

// weekdays rules (Mon=1 ... Sun=0)
const getWeekdayConfig = group => {
	const days = group?.days || {}
	return {
		odd: !!days.odd_days, // Mon Wed Fri
		even: !!days.even_days, // Tue Thu Sat
		every: !!days.every_days,
	}
}

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

const toLocalDateStr = d => {
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
		2,
		'0'
	)}-${String(d.getDate()).padStart(2, '0')}`
}

// Uzbek month names
const getUzbekMonthName = (month, year) => {
	const monthNames = [
		'Yanvar',
		'Fevral',
		'Mart',
		'Aprel',
		'May',
		'Iyun',
		'Iyul',
		'Avgust',
		'Sentabr',
		'Oktabr',
		'Noyabr',
		'Dekabr',
	]
	return `${monthNames[month]} '${String(year).slice(-2)}`
}

// ----------------- component -----------------
const MentorDetail = () => {
	const { id } = useParams()
	const navigate = useNavigate()
	const dispatch = useDispatch()
	const accessToken = useSelector(state => state.auth.accessToken)
	const refreshToken = useSelector(state => state.auth.refreshToken)

	const [mentor, setMentor] = useState(null)
	const [groups, setGroups] = useState([])
	const [selectedGroup, setSelectedGroup] = useState(null)
	const [students, setStudents] = useState([])
	const [attendance, setAttendance] = useState({})
	const [showOptions, setShowOptions] = useState(null)
	const [isLoading, setIsLoading] = useState({ boot: true, attendance: false })

	// === Months (range -3..+3) ===
	const months = useMemo(() => {
		const now = new Date()
		const result = []
		for (let i = -3; i <= 3; i++) {
			const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
			result.push({
				label: getUzbekMonthName(d.getMonth(), d.getFullYear()),
				month: d.getMonth(),
				year: d.getFullYear(),
				isCurrent:
					d.getMonth() === now.getMonth() &&
					d.getFullYear() === now.getFullYear(),
			})
		}
		return result
	}, [])

	const [selectedMonth, setSelectedMonth] = useState(() => {
		const now = new Date()
		return {
			month: now.getMonth(),
			year: now.getFullYear(),
			label: getUzbekMonthName(now.getMonth(), now.getFullYear()),
			isCurrent: true,
		}
	})

	useEffect(() => {
		const current = months.find(m => m.isCurrent)
		if (current) setSelectedMonth(current)
	}, [months])

	// monthDays local list
	const monthDays = useMemo(() => {
		if (!selectedMonth) return []
		const y = selectedMonth.year
		const m = selectedMonth.month
		const daysInMonth = new Date(y, m + 1, 0).getDate()
		return Array.from({ length: daysInMonth }, (_, i) => {
			const day = i + 1
			const d = new Date(y, m, day)
			const isoLocal = toLocalDateStr(d)
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

	// classDays filtered by group's weekday rules
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

	// --- token refresh + authFetch ---
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

	// --- load mentor ---
	useEffect(() => {
		if (!accessToken || !id) return
		const load = async () => {
			try {
				const res = await authFetch(`${API_BASE}/teachers/${id}`)
				// backend may return {teacher: {...}} or teacher object directly
				const teacher = res?.teacher ?? res
				setMentor(teacher)
			} catch (err) {
				console.error('Error fetching mentor:', err)
			}
		}
		load()
	}, [id, accessToken, authFetch])

	// --- load groups ---
	useEffect(() => {
		if (!accessToken) return
		const load = async () => {
			setIsLoading(prev => ({ ...prev, boot: true }))
			try {
				const gRes = await authFetch(`${API_BASE}/groups`)
				const groupList = Array.isArray(gRes) ? gRes : gRes?.groups || []
				setGroups(groupList)
			} catch (err) {
				console.error('Error fetching groups:', err)
			} finally {
				setIsLoading(prev => ({ ...prev, boot: false }))
			}
		}
		load()
	}, [accessToken, authFetch])

	// when select a group -> set students from group
	const handleGroupClick = group => {
		setSelectedGroup(group)
		setStudents((group.students || []).map(niceStudent))
	}

	// --- load attendance for selectedGroup & month ---
	const loadAttendance = useCallback(async () => {
		if (!selectedGroup || !selectedMonth) return
		setIsLoading(prev => ({ ...prev, attendance: true }))
		try {
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
				let dateStr = r.date || r.dateStr || ''
				if (dateStr.includes('T')) dateStr = dateStr.split('T')[0]
				if (!dateStr) return
				const key = attKey(gid(selectedGroup), sid(r), dateStr)
				map[key] =
					r.status === true || r.status === 'present' ? 'present' : 'absent'
			})
			setAttendance(map)
		} catch (err) {
			console.error('Error loading attendance:', err)
		} finally {
			setIsLoading(prev => ({ ...prev, attendance: false }))
		}
	}, [selectedGroup, selectedMonth, authFetch])

	useEffect(() => {
		if (selectedGroup) loadAttendance()
	}, [selectedGroup, selectedMonth, loadAttendance])

	// --- can mark attendance (time rules) ---
	const canMarkAttendance = dateStr => {
		if (!selectedGroup) return { allowed: false, message: 'Guruh tanlanmagan.' }
		const now = new Date()
		const parts = dateStr.split('-').map(Number)
		if (parts.length !== 3)
			return { allowed: false, message: "Noto'g'ri sana formatı." }
		const [year, month, day] = parts
		const selectedDate = new Date(year, month - 1, day)

		const todayStart = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate()
		)
		const selectedStart = new Date(
			selectedDate.getFullYear(),
			selectedDate.getMonth(),
			selectedDate.getDate()
		)

		todayStart.setHours(0, 0, 0, 0)
		selectedStart.setHours(0, 0, 0, 0)
		if (selectedStart.getTime() < todayStart.getTime()) {
			return {
				allowed: false,
				message: "O'tgan kunlar uchun davomat belgilab bo'lmaydi!",
			}
		}
		if (selectedStart.getTime() > todayStart.getTime()) {
			return {
				allowed: false,
				message: "Kelajak kunlar uchun davomat belgilab bo'lmaydi!",
			}
		}

		// today => check class time
		const startTime = selectedGroup?.start_time || '00:00'
		const endTime = selectedGroup?.end_time || '23:59'
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
		const currentMinutes = now.getHours() * 60 + now.getMinutes()
		const classStartMinutes = s.h * 60 + s.m
		const classEndMinutes = e.h * 60 + e.m
		const formatTime = t => {
			const parts = String(t).split(':')
			const hh = parts[0] ? String(parts[0]).padStart(2, '0') : '00'
			const mm = parts[1] ? String(parts[1]).padStart(2, '0') : '00'
			return `${hh}:${mm}`
		}
		if (currentMinutes < classStartMinutes) {
			return {
				allowed: false,
				message: `Dars hali boshlanmagan! Dars vaqti: ${formatTime(
					startTime
				)} - ${formatTime(endTime)}`,
			}
		}
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

	// --- mark attendance ---
	const markAttendance = async (studentIdRaw, dateStr, status) => {
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
			console.error('Error posting attendance:', err)
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

	// ----------------- render -----------------
	if (isLoading.boot) {
		return (
			<div className='min-h-screen bg-gray-50 flex items-center justify-center'>
				<Loader2 className='w-8 h-8 animate-spin text-[#0066CC]' />
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-[#F5F7FA] px-6 py-6'>
			{/* Header */}
			<div className='bg-white rounded-2xl w-full py-6 px-6 flex items-center justify-between shadow-sm mb-6'>
				<div className='flex flex-col gap-1'>
					<h1 className='font-bold text-3xl text-[#0071ca]'>
						{mentor?.fullName ?? 'Mentor'}
					</h1>
					<p className='text-gray-600'>Guruhlari va davomat</p>
				</div>
				<div className='flex gap-3 items-center'>
					<button
						onClick={() => navigate('/head-mentor/mentorlar')}
						className='border border-gray-400 rounded-lg px-5 py-2 text-gray-700 hover:bg-gray-800 hover:text-white transition-all'
					>
						Ortga
					</button>
				</div>
			</div>

			{/* Groups list (left/top) */}
			<div className='bg-white rounded-2xl py-5 px-6 flex flex-col gap-4 shadow-sm mb-6'>
				<h2 className='text-2xl font-semibold text-[#0071ca]'>Guruhlar</h2>
				<div className='flex flex-wrap gap-3'>
					{groups
						.filter(g => g.teacher_fullName === mentor?.fullName)
						.map(v => (
							<button
								key={v._id}
								onClick={() => handleGroupClick(v)}
								className={`transition-all w-[19%] py-4 rounded-xl flex flex-col items-start px-4 shadow-sm hover:shadow-md ${
									selectedGroup && selectedGroup._id === v._id
										? 'bg-blue-100 border-l-[6px] border-blue-600'
										: 'bg-[#f5f9ff] border-l-[4px] border-[#49a8f1]'
								}`}
							>
								<p className='font-semibold'>
									{v.start_time} - {v.end_time}
								</p>
								<p className='text-gray-600'>{v.name}</p>
								<p className='text-gray-500 text-sm'>
									{v.days?.every_days
										? 'Har kuni'
										: v.days?.even_days
										? 'Juft kunlar'
										: v.days?.odd_days
										? 'Toq kunlar'
										: 'Kunlar belgilanmagan'}
								</p>
							</button>
						))}
				</div>
			</div>

			{/* If no group selected show message */}
			{!selectedGroup ? (
				<div className='bg-white rounded-2xl py-6 px-6 shadow-sm'>
					<p className='text-gray-500'>Iltimos, avval guruh tanlang.</p>
				</div>
			) : (
				// Attendance view (Guruhlar-style)
				<div className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
					{/* Month buttons */}
					<div className='flex gap-2 p-4 overflow-x-auto border-b'>
						{months.map((m, i) => (
							<button
								key={i}
								onClick={() => setSelectedMonth(m)}
								className={`px-5 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
									selectedMonth?.label === m.label
										? 'bg-[#0066CC] text-white'
										: 'bg-white text-gray-700 border border-gray-300'
								}`}
							>
								{m.label}
							</button>
						))}
					</div>

					{/* Table */}
					{isLoading.attendance ? (
						<div className='flex items-center justify-center h-64'>
							<Loader2 className='w-8 h-8 animate-spin text-[#0066CC]' />
						</div>
					) : (
						<div className='overflow-auto max-h-[60vh]'>
							<table className='w-full'>
								<thead className='sticky top-0 z-20 bg-white'>
									<tr className='border-b border-gray-200 bg-[#F8FAFC]'>
										<th className='sticky left-0 bg-[#F8FAFC] z-30 text-left px-4 py-3 font-semibold text-gray-700 border-r border-gray-200 min-w-[360px]'>
											O'quvchilar
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
														<div>
															<div className='font-medium text-gray-900'>
																{student.name}
															</div>
															<div className='text-xs text-gray-500'>
																{student.student_phone}
															</div>
														</div>
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
					)}
				</div>
			)}
			{/* backdrop to close options */}
			{showOptions && (
				<div
					className='fixed inset-0 z-10'
					onClick={() => setShowOptions(null)}
				/>
			)}
		</div>
	)
}

export default MentorDetail

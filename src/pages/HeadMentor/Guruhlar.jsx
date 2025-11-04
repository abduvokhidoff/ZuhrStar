import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setCredentials } from '../../redux/authSlice'
import {
  Clock, Code, Search, Users, ChevronLeft, Check, X, ChevronDown, Loader2, GraduationCap, User
} from 'lucide-react'

const API_BASE = 'https://zuhrstar-production.up.railway.app/api'

// === Yordamchi funksiyalar ===
const gid = (g) => String(g?.group_id ?? g?.id ?? g?._id ?? "")
const sid = (s) => String(s?.student_id ?? s?.studentId ?? s?.id ?? s?._id ?? "")
const attKey = (g, s, dateStr) => `${g}:${s}:${dateStr}`

const niceStudent = (s) => {
  const name = s.full_name || s.fullName || `${s.name || ""} ${s.surname || ""}`.trim() || "Noma'lum"
  return { ...s, name }
}

const getDaysConfig = (g) => {
  const d = g?.days || {}
  return { odd: !!d.odd_days, even: !!d.even_days, every: !!d.every_days }
}
const isClassDay = (dayNumber, group) => {
  const cfg = getDaysConfig(group)
  if (cfg.every) return true
  if (cfg.odd && dayNumber % 2 === 1) return true
  if (cfg.even && dayNumber % 2 === 0) return true
  return false
}
const daysBadge = (g) => {
  const cfg = getDaysConfig(g)
  if (cfg.every) return "Har kuni"
  if (cfg.odd) return "Toq kunlar"
  if (cfg.even) return "Juft kunlar"
  return "—"
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

	// === Oy kunlari (dateStr: YYYY-MM-DD) ===
	const monthDays = useMemo(() => {
		if (!selectedMonth) return []
		const y = selectedMonth.year
		const m = selectedMonth.month
		return Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => {
			const day = i + 1
			const d = new Date(y, m, day)
			const iso = d.toISOString().split('T')[0]
			return {
				day,
				date: d,
				dateStr: iso,
				isToday:
					day === new Date().getDate() &&
					m === new Date().getMonth() &&
					y === new Date().getFullYear(),
				dateLabel: `${String(day).padStart(2, '0')}.${String(m + 1).padStart(
					2,
					'0'
				)}`,
				dayName: d.toLocaleDateString('uz-UZ', { weekday: 'short' }),
			}
		})
	}, [selectedMonth])

	const classDays = useMemo(() => {
		if (!selectedGroup) return monthDays
		return monthDays.filter(d => isClassDay(d.day, selectedGroup))
	}, [monthDays, selectedGroup])

	// === Token yangilash ===
	const refreshAccessToken = useCallback(async () => {
		if (!refreshToken) return null
		const res = await fetch(`${API_BASE}/users/refresh`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refreshToken }),
		})
		if (!res.ok) throw new Error('Token refresh failed')
		const data = await res.json()
		dispatch(setCredentials(data))
		return data.accessToken
	}, [refreshToken, dispatch])

	// === Avtorizatsiyali fetch ===
	const authFetch = useCallback(
		async (url, opts = {}) => {
			const attempt = async token => {
				const res = await fetch(url, {
					...opts,
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
						...(opts.headers || {}),
					},
				})
				if (res.status === 401) throw new Error('401')
				if (!res.ok) {
					const text = await res.text()
					throw new Error(text || `HTTP ${res.status}`)
				}
				try {
					return await res.json()
				} catch {
					return null
				}
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
			const start = new Date(selectedMonth.year, selectedMonth.month, 1)
				.toISOString()
				.split('T')[0]
			const end = new Date(selectedMonth.year, selectedMonth.month + 1, 0)
				.toISOString()
				.split('T')[0]

			const groupParam =
				selectedGroup.group_id ?? selectedGroup.id ?? gid(selectedGroup)
			const res = await authFetch(
				`${API_BASE}/attendance?group_id=${groupParam}&start=${start}&end=${end}`
			)

			console.log('API Response:', res) // Debug uchun

			const data = Array.isArray(res) ? res : res?.attendance || []
			console.log('Attendance Data:', data) // Debug uchun

			const map = {}
			data.forEach(r => {
				console.log('Record:', r) // Har bir yozuvni ko'rish
				const dateStr = (r.date || '').split('T')[0]
				if (!dateStr) return
				const key = attKey(gid(selectedGroup), sid(r), dateStr)
				map[key] =
					r.status === 'present' || r.status === true ? 'present' : 'absent'
				console.log(`Key: ${key}, Status: ${map[key]}`) // Key va status ni ko'rish
			})
			console.log('Final Attendance Map:', map) // Oxirgi map
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

	// === Davomat belgilash ===
	const markAttendance = async (studentIdRaw, dateStr, status) => {
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

			console.log('Sending payload:', payload) // Debug uchun

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
		g.name?.toLowerCase().includes(search.toLowerCase())
	)

	// === YUKLANMOQDA ===
	if (isLoading.boot) {
		return (
			<div className='min-h-screen bg-gray-50 flex items-center justify-center'>
				<Loader2 className='w-8 h-8 animate-spin text-[#0066CC]' />
			</div>
		)
	}

	// === GURUHLAR RO'YXATI ===
	if (!selectedGroup) {
		return (
			<div className='min-h-screen bg-gray-50 px-6 py-8'>
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
		<div className='h-screen bg-[#F5F7FA] flex flex-col overflow-hidden'>
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

				{/* Jadval - scrollable container */}
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
										<th className='sticky left-0 bg-[#F8FAFC] z-30 text-left px-4 py-3 font-semibold text-gray-700 border-r border-gray-200 min-w-[200px]'>
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
														<span className='w-7 h-7 rounded-full bg-[#0066CC] text-white text-sm flex items-center justify-center font-semibold'>
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

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setCredentials, logout } from "../../redux/authSlice";
import { Users, BookOpen, Calendar, AlertTriangle, RefreshCw, Check, X, GraduationCap, ChevronDown, Loader2 } from "lucide-react";

const API_BASE = "https://zuhrstar-production.up.railway.app/api";

const A = (v) => (Array.isArray(v?.data) ? v.data : Array.isArray(v) ? v : []);
const gid = (g) => String(g?.group_id ?? g?.id ?? g?._id ?? "");
const sid = (s) => String(s?.student_id ?? s?.studentId ?? s?.id ?? s?._id ?? s?.code ?? "");
const sGroups = (s) => {
  const r = [];
  if (Array.isArray(s?.groups)) r.push(...s.groups.map(String));
  if (s?.group_id) r.push(String(s.group_id));
  if (s?.groupId) r.push(String(s.groupId));
  return Array.from(new Set(r));
};
const attKey = (g, s, d) => `${g}:${s}:${d}`;
const normName = (t) => (t ? String(t).trim().toLowerCase() : "");
const gTeacherNames = (g) => {
  const arr = Array.isArray(g?.teachers) ? g.teachers : [];
  const list = [
    g?.teacher_fullName, g?.teacherFullName, g?.teacher_name, g?.teacherName,
    g?.fullName, g?.owner_name, g?.ownerFullName, g?.teacher?.fullName, g?.teacher?.name,
    ...arr.map((t) => t?.fullName || t?.full_name || t?.name)
  ].filter(Boolean).map(normName);
  return Array.from(new Set(list));
};
const niceStudent = (s) => {
  const name = s.full_name || s.fullName || `${s.name || ""} ${s.surname || ""}`.trim() || "Nomalum talaba";
  return { ...s, name };
};

const getDaysConfig = (g) => {
  const d = g?.days || {};
  return { odd: !!d.odd_days, even: !!d.even_days, every: !!d.every_days };
};

const isClassDay = (dayNumber, group) => {
  const cfg = getDaysConfig(group);
  if (cfg.every) return true;
  if (cfg.odd && dayNumber % 2 === 1) return true;
  if (cfg.even && dayNumber % 2 === 0) return true;
  return false;
};

const daysBadge = (g) => {
  const cfg = getDaysConfig(g);
  if (cfg.every) return "Har kuni";
  if (cfg.odd) return "Toq kunlar";
  if (cfg.even) return "Juft kunlar";
  return "—";
};

export default function Guruhlar() {
	const dispatch = useDispatch()
	const navigate = useNavigate()
	const accessToken = useSelector(s => s?.auth?.accessToken)
	const refreshToken = useSelector(s => s?.auth?.refreshToken)
	const user = useSelector(s => s?.auth?.user)
	const teacherNameRedux =
		useSelector(
			s =>
				s?.auth?.user?.fullName ||
				s?.auth?.user?.full_name ||
				s?.auth?.user?.name
		) || ''

	const [loading, setLoading] = useState({ boot: true, attendance: false })
	const [error, setError] = useState(null)
	const [allGroups, setAllGroups] = useState([])
	const [groups, setGroups] = useState([])
	const [allStudents, setAllStudents] = useState([])
	const [students, setStudents] = useState([])
	const [selectedGroup, setSelectedGroup] = useState(null)
	const [attendance, setAttendance] = useState({})
	const [showOptions, setShowOptions] = useState(null)
	const [selectedMonth, setSelectedMonth] = useState(null)

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

	const startOfMonthISO = useMemo(() => {
		if (!selectedMonth) return null
		const d = new Date(selectedMonth.year, selectedMonth.month, 1)
		d.setHours(0, 0, 0, 0)
		return d.toISOString()
	}, [selectedMonth])

	const endOfMonthISO = useMemo(() => {
		if (!selectedMonth) return null
		const d = new Date(selectedMonth.year, selectedMonth.month + 1, 0)
		d.setHours(23, 59, 59, 999)
		return d.toISOString()
	}, [selectedMonth])

	const monthDays = useMemo(() => {
		if (!selectedMonth) return []
		const y = selectedMonth.year
		const m = selectedMonth.month
		const today = new Date()
		return Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => {
			const day = i + 1
			const d = new Date(y, m, day)
			const dayOfWeek = d.getDay()
			// Yakshanba (0) va Seshanba (2) ni o'tkazib yuborish
			if (dayOfWeek === 0 || dayOfWeek === 2) return null
			return {
				day,
				date: d,
				isWeekend: dayOfWeek === 6,
				isToday:
					day === today.getDate() &&
					m === today.getMonth() &&
					y === today.getFullYear(),
				dateLabel: `${String(day).padStart(2, '0')}.${String(m + 1).padStart(
					2,
					'0'
				)}`,
				dayName: d.toLocaleDateString('uz-UZ', { weekday: 'short' }),
			}
		}).filter(Boolean)
	}, [selectedMonth])

	const classDays = useMemo(() => {
		if (!selectedGroup) return monthDays
		return monthDays.filter(d => isClassDay(d.day, selectedGroup))
	}, [monthDays, selectedGroup])

	const refreshAccessToken = useCallback(async () => {
		if (!refreshToken) {
			dispatch(logout())
			return null
		}
		const r = await fetch(`${API_BASE}/auth/refresh`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ refreshToken }),
		})
		if (!r.ok) {
			dispatch(logout())
			throw new Error('Token refresh failed')
		}
		const data = await r.json()
		dispatch(
			setCredentials({
				accessToken: data.accessToken,
				refreshToken: data.refreshToken,
			})
		)
		return data.accessToken
	}, [refreshToken, dispatch])

	const authFetch = useCallback(
		async (url, opts = {}) => {
			const attempt = async token => {
				const r = await fetch(url, {
					...opts,
					headers: {
						Authorization: `Bearer ${token}`,
						...(opts.body ? { 'Content-Type': 'application/json' } : {}),
						...(opts.headers || {}),
					},
				})
				if (r.status === 401) throw new Error('401')
				if (!r.ok) throw new Error(await r.text())
				return r.json().catch(() => ({}))
			}
			try {
				return await attempt(accessToken || (await refreshAccessToken()))
			} catch (e) {
				if (String(e.message).includes('401')) {
					const t = await refreshAccessToken()
					if (!t) throw e
					return await attempt(t)
				}
				throw e
			}
		},
		[accessToken, refreshAccessToken]
	)

	const loadAttendance = useCallback(
		async group => {
			const g = gid(group)
			if (!g || !startOfMonthISO || !endOfMonthISO) {
				setAttendance({})
				return
			}
			setLoading(p => ({ ...p, attendance: true }))
			try {
				console.log('📡 ATTENDANCE REQUEST:', {
					group_id: g,
					start_date: startOfMonthISO,
					end_date: endOfMonthISO,
					url: `${API_BASE}/Attendance?group_id=${g}&start_date=${startOfMonthISO}&end_date=${endOfMonthISO}`,
				})

				const data = await authFetch(
					`${API_BASE}/Attendance?group_id=${g}&start_date=${startOfMonthISO}&end_date=${endOfMonthISO}`
				)

				console.log('✅ ATTENDANCE RESPONSE:', {
					data: data,
					isArray: Array.isArray(data),
					count: Array.isArray(data) ? data.length : 0,
				})

				const map = {}
				if (Array.isArray(data)) {
					data.forEach(r => {
						const d = new Date(r.date).getDate()
						const key = attKey(String(r.group_id), String(r.student_id), d)
						map[key] = r.status ? 'present' : 'absent'
						console.log(
							`  → Day ${d}: Student ${r.student_id} = ${
								r.status ? 'PRESENT' : 'ABSENT'
							}`
						)
					})
				}

				console.log('📊 PROCESSED ATTENDANCE MAP:', map)
				setAttendance(map)
			} catch (err) {
				console.error('❌ ATTENDANCE ERROR:', err)
			} finally {
				setLoading(p => ({ ...p, attendance: false }))
			}
		},
		[authFetch, startOfMonthISO, endOfMonthISO]
	)

	useEffect(() => {
		;(async () => {
			try {
				setLoading(p => ({ ...p, boot: true }))
				if (!accessToken && !refreshToken) return

				const [gRaw, sRaw] = await Promise.all([
					authFetch(`${API_BASE}/groups`),
					authFetch(`${API_BASE}/students`),
				])

				const gList = A(gRaw)
				const sList = A(sRaw).map(niceStudent)
				setAllGroups(gList)
				setAllStudents(sList)

				const norm = normName(teacherNameRedux)
				const filtered = gList.filter(g => {
					const names = gTeacherNames(g)
					return names.some(
						n => n === norm || n.includes(norm) || norm.includes(n)
					)
				})
				setGroups(filtered)

				if (filtered.length) {
					const first = filtered[0]
					setSelectedGroup(first)
					const st = sList
						.filter(s => sGroups(s).some(x => String(x) === gid(first)))
						.map(niceStudent)
					setStudents(st)
				}
			} catch (e) {
				setError(String(e?.message || e))
			} finally {
				setLoading(p => ({ ...p, boot: false }))
			}
		})()
	}, [accessToken, refreshToken, authFetch, teacherNameRedux])

	useEffect(() => {
		if (selectedGroup && startOfMonthISO && endOfMonthISO) {
			console.log(
				'🔄 RELOADING ATTENDANCE - Month changed:',
				selectedMonth?.label
			)
			loadAttendance(selectedGroup)
		}
	}, [selectedGroup, startOfMonthISO, endOfMonthISO, loadAttendance])

	const handleGroupSelect = async g => {
		setSelectedGroup(g)
		const st = allStudents
			.filter(s => sGroups(s).some(x => String(x) === gid(g)))
			.map(niceStudent)
		setStudents(st)
	}

	const markAttendance = async (studentId, day, status) => {
		const g = gid(selectedGroup)
		if (!g) return
		const k = attKey(g, studentId, day)
		const prev = attendance[k] ?? null

		try {
			setAttendance(p => ({ ...p, [k]: status }))
			const d = new Date(selectedMonth.year, selectedMonth.month, Number(day))
			d.setHours(8, 30, 0, 0)

			await authFetch(`${API_BASE}/Attendance`, {
				method: 'POST',
				body: JSON.stringify({
					date: d.toISOString(),
					group_id: g,
					student_id: String(studentId),
					status: status === 'present',
				}),
			})
			setShowOptions(null)
		} catch (e) {
			setAttendance(p => ({ ...p, [k]: prev }))
		}
	}

	const getStatusCls = s =>
		s === 'present'
			? 'bg-teal-500 text-white'
			: s === 'absent'
			? 'bg-red-500 text-white'
			: 'bg-gray-100 border border-gray-300'

	if (loading.boot) {
		return (
			<div className='min-h-screen bg-gray-50 flex items-center justify-center'>
				<Loader2 className='w-8 h-8 animate-spin text-blue-600' />
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-gray-50'>
			<div className='bg-white border-b shadow-sm'>
				<div className='max-w-7xl mx-auto px-6 py-4 flex items-center justify-between'>
					<div className='flex items-center gap-4'>
						<GraduationCap className='w-6 h-6 text-[#0066CC]' />
						<h1 className='text-xl font-bold text-gray-900'>Mentor Panel</h1>
						{selectedGroup && (
							<div className='relative ml-8'>
								<select
									value={gid(selectedGroup)}
									onChange={e => {
										const g = groups.find(x => gid(x) === e.target.value)
										if (g) handleGroupSelect(g)
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
						)}
					</div>
					<button
						onClick={() => window.location.reload()}
						className='p-2 hover:bg-gray-100 rounded-lg'
					>
						<RefreshCw className='w-5 h-5 text-gray-600' />
					</button>
				</div>
			</div>

			{error && (
				<div className='max-w-7xl mx-auto px-6 mt-4'>
					<div className='bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3'>
						<AlertTriangle className='w-5 h-5 text-red-600 flex-shrink-0 mt-0.5' />
						<div className='text-sm text-red-700'>{error}</div>
					</div>
				</div>
			)}

			<div className='max-w-7xl mx-auto px-6 py-6'>
				{!selectedGroup ? (
					<div className='text-center py-16'>
						<p className='text-gray-500'>Guruh topilmadi</p>
					</div>
				) : (
					<>
						<div className='grid grid-cols-5 gap-4 mb-6'>
							<div className='bg-white border border-gray-200 rounded-lg p-4'>
								<div className='text-xs text-gray-500 mb-1'>Yo'nalish</div>
								<div className='text-lg font-bold text-[#0099CC]'>
									{selectedGroup?.course || selectedGroup?.courseName || '—'}
								</div>
							</div>
							<div className='bg-white border border-gray-200 rounded-lg p-4'>
								<div className='text-xs text-gray-500 mb-1'>Darslar soni</div>
								<div className='text-lg font-bold text-[#0099CC]'>
									{selectedGroup?.lessons_count || students.length || '—'}
								</div>
							</div>
							<div className='bg-white border border-gray-200 rounded-lg p-4'>
								<div className='text-xs text-gray-500 mb-1'>Dars vaqti</div>
								<div className='text-lg font-bold text-[#0099CC]'>
									{selectedGroup?.start_time || '—'}
								</div>
							</div>
							<div className='bg-white border border-gray-200 rounded-lg p-4'>
								<div className='text-xs text-gray-500 mb-1'>Dars kunlari</div>
								<div className='text-lg font-bold text-[#0099CC]'>
									{daysBadge(selectedGroup)}
								</div>
							</div>
							<div className='bg-white border border-gray-200 rounded-lg p-4'>
								<div className='text-xs text-gray-500 mb-1'>Dars honasi</div>
								<div className='text-lg font-bold text-[#0099CC]'>
									{selectedGroup?.room || selectedGroup?.branch || '—'}
								</div>
							</div>
						</div>

						<div className='flex items-center justify-between mb-6 border-b border-gray-200 pb-3'>
							<div className='text-lg font-semibold text-[#0099CC]'>
								Davomat
							</div>
							<button
								onClick={() =>
									navigate('/mentor/guruhlar/dars-jadvali', {
										state: { group: selectedGroup },
									})
								}
								className='px-6 py-2 bg-[#0066CC] text-white rounded-lg hover:bg-[#0052A3] font-semibold flex items-center gap-2'
							>
								<BookOpen className='w-4 h-4' />
								Dars jadvali
							</button>
						</div>

						<div className='flex gap-2 mb-6 overflow-x-auto pb-2'>
							{months.map((m, i) => (
								<button
									key={i}
									onClick={() => setSelectedMonth(m)}
									className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap ${
										selectedMonth?.label === m.label
											? 'bg-[#0066CC] text-white'
											: 'bg-white text-gray-700 border border-gray-300'
									}`}
								>
									{m.label}
								</button>
							))}
						</div>

						{loading.attendance ? (
							<div className='flex items-center justify-center h-64'>
								<Loader2 className='w-8 h-8 animate-spin text-[#0066CC]' />
							</div>
						) : (
							<div className='bg-white border border-gray-200 rounded-lg overflow-hidden'>
								<div className='overflow-x-auto'>
									<table className='w-full'>
										<thead>
											<tr className='border-b border-gray-200'>
												<th className='sticky left-0 bg-white z-10 text-left px-4 py-3 font-semibold text-gray-700 border-r border-gray-200'>
													O'quvchilar ro'yxati
												</th>
												{classDays.map(d => (
													<th
														key={d.day}
														className='px-2 py-3 text-center min-w-[60px]'
													>
														<div className='text-xs font-semibold text-gray-700'>
															{d.dateLabel}
														</div>
														<div className='text-[10px] text-gray-500 mt-0.5'>
															{d.dayName}
														</div>
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{students.map((s, i) => (
												<tr
													key={sid(s)}
													className='border-b border-gray-100 hover:bg-gray-50'
												>
													<td className='sticky left-0 bg-white z-10 px-4 py-3 border-r border-gray-200'>
														<div className='flex items-center gap-3'>
															<span className='w-6 h-6 rounded-full bg-[#0066CC] text-white text-xs flex items-center justify-center font-semibold'>
																{i + 1}
															</span>
															<span className='font-medium text-gray-900'>
																{s.name}
															</span>
														</div>
													</td>
													{classDays.map(d => {
														const k = attKey(gid(selectedGroup), sid(s), d.day)
														const status = attendance[k] || null

														return (
															<td
																key={d.day}
																className='px-2 py-2 text-center relative'
															>
																<button
																	onClick={() =>
																		setShowOptions(k === showOptions ? null : k)
																	}
																	className={`w-8 h-8 rounded-md flex items-center justify-center mx-auto ${getStatusCls(
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

																{showOptions === k && (
																	<div className='absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20'>
																		<div className='bg-white rounded-lg shadow-lg border border-gray-200 p-2 flex gap-2'>
																			<button
																				onClick={() =>
																					markAttendance(
																						sid(s),
																						d.day,
																						'present'
																					)
																				}
																				className='w-10 h-10 bg-teal-500 text-white rounded-md flex items-center justify-center hover:bg-teal-600'
																			>
																				<Check className='w-5 h-5' />
																			</button>
																			<button
																				onClick={() =>
																					markAttendance(
																						sid(s),
																						d.day,
																						'absent'
																					)
																				}
																				className='w-10 h-10 bg-red-500 text-white rounded-md flex items-center justify-center hover:bg-red-600'
																			>
																				<X className='w-5 h-5' />
																			</button>
																		</div>
																		<div className='absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white' />
																	</div>
																)}
															</td>
														)
													})}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}
					</>
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

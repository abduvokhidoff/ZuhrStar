import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setCredentials, logout } from "../../redux/authSlice";
import {
  Users, BookOpen, Calendar, AlertTriangle, ChevronRight, RefreshCw,
  Check, X, GraduationCap, Clock, MapPin, Loader2, Sparkles
} from "lucide-react";

const API_BASE = "https://zuhrstar-production.up.railway.app/api";

/* ---------- Helpers (ixcham) ---------- */
const A = (v) => (Array.isArray(v?.data) ? v.data : Array.isArray(v) ? v : []);
const gid = (g) => String(g?.group_id ?? g?.id ?? g?._id ?? "");
const sid = (s) =>
  String(s?.student_id ?? s?.studentId ?? s?.id ?? s?._id ?? s?.code ?? "");
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
  const name =
    s.full_name || s.fullName || `${s.name || ""} ${s.surname || ""}`.trim() || "Nomalum talaba";
  return { ...s, name };
};

/* --- Days config (boolean) --- */
const getDaysConfig = (g) => {
  const d = g?.days || {};
  return {
    odd: !!d.odd_days,     // toq kunlar
    even: !!d.even_days,   // juft kunlar
    every: !!d.every_days, // har kuni
  };
};

const isClassDay = (dayNumber, group) => {
  const cfg = getDaysConfig(group);
  if (cfg.every) return true;                      // har kuni
  if (cfg.odd && dayNumber % 2 === 1) return true; // toq: 1,3,5,...
  if (cfg.even && dayNumber % 2 === 0) return true;// juft: 2,4,6,...
  return false;                                    // belgilanmagan: dars yo‘q
};

const daysBadge = (g) => {
  const cfg = getDaysConfig(g);
  if (cfg.every) return "Har kuni";
  if (cfg.odd) return "Toq kunlar";
  if (cfg.even) return "Juft kunlar";
  return "Kun belgilanmagan";
};

/* ---------- Component ---------- */
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

	const [loading, setLoading] = useState({
		boot: true,
		groups: false,
		students: false,
		attendance: false,
	})
	const [error, setError] = useState(null)

	const [allGroups, setAllGroups] = useState([])
	const [groups, setGroups] = useState([])
	const [allStudents, setAllStudents] = useState([])
	const [students, setStudents] = useState([])

	const [selectedGroup, setSelectedGroup] = useState(null)
	const [selectedGroupKey, setSelectedGroupKey] = useState(null)

	const [attendance, setAttendance] = useState({})
	const [showOptions, setShowOptions] = useState(null)
	const [hoveredCell, setHoveredCell] = useState(null)

	const [currentTeacherName, setCurrentTeacherName] = useState(
		teacherNameRedux || ''
	)
	const currentTeacherEmail = user?.email || user?.mail || ''

	// oy bosh/oxiri
	const startOfMonthISO = useMemo(() => {
		const d = new Date()
		d.setDate(1)
		d.setHours(0, 0, 0, 0)
		return d.toISOString()
	}, [])
	const endOfMonthISO = useMemo(() => {
		const d = new Date()
		d.setMonth(d.getMonth() + 1, 0)
		d.setHours(23, 59, 59, 999)
		return d.toISOString()
	}, [])
	const monthDays = useMemo(() => {
		const t = new Date()
		const y = t.getFullYear()
		const m = t.getMonth()
		return Array.from({ length: new Date(y, m + 1, 0).getDate() }, (_, i) => {
			const day = i + 1,
				d = new Date(y, m, day)
			return {
				day,
				date: d,
				isWeekend: [0, 6].includes(d.getDay()),
				isToday: day === t.getDate(),
				dateLabel: d.toLocaleDateString('uz-UZ', {
					day: '2-digit',
					month: '2-digit',
				}),
				dayName: d.toLocaleDateString('uz-UZ', { weekday: 'short' }),
				dayOfWeek: d.getDay(), // 0 = yakshanba, 1 = dushanba, ..., 6 = shanba
			}
		})
	}, [])
	const currentMonth = new Date().toLocaleDateString('uz-UZ', {
		month: 'long',
		year: 'numeric',
	})

	// Faqat dars kunlarini ko'rsatish uchun
	const classDays = useMemo(() => {
		if (!selectedGroup) return monthDays

		return monthDays.filter(d => isClassDay(d.day, selectedGroup))
	}, [monthDays, selectedGroup])

	/* ---- Auth fetch + refresh (ixcham) ---- */
	const refreshAccessToken = useCallback(async () => {
		if (!refreshToken) {
			setError('Avtorizatsiya kerak.')
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
			throw new Error('Token yangilashda xato')
		}
		const data = await r.json()
		if (!data?.accessToken) throw new Error('accessToken topilmadi')
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

	/* ---- Data loaders ---- */
	const loadGroups = useCallback(async () => {
		setLoading(p => ({ ...p, groups: true }))
		try {
			const raw = await authFetch(`${API_BASE}/groups`)
			const list = A(raw)
			setAllGroups(list)
			return list
		} finally {
			setLoading(p => ({ ...p, groups: false }))
		}
	}, [authFetch])

	const loadStudents = useCallback(async () => {
		setLoading(p => ({ ...p, students: true }))
		try {
			const raw = await authFetch(`${API_BASE}/students`)
			const list = A(raw).map(niceStudent)
			setAllStudents(list)
			return list
		} finally {
			setLoading(p => ({ ...p, students: false }))
		}
	}, [authFetch])

	const loadAttendance = useCallback(
		async group => {
			const g = gid(group)
			if (!g) {
				setAttendance({})
				return
			}
			setLoading(p => ({ ...p, attendance: true }))
			try {
				console.log('Loading attendance for group:', g)
				console.log('Date range:', {
					start: startOfMonthISO,
					end: endOfMonthISO,
				})

				const data = await authFetch(
					`${API_BASE}/Attendance?group_id=${g}&start_date=${startOfMonthISO}&end_date=${endOfMonthISO}`
				)
				console.log('Attendance API response:', data)

				const map = {}
				if (Array.isArray(data)) {
					data.forEach(r => {
						const d = new Date(r.date).getDate()
						map[attKey(String(r.group_id), String(r.student_id), d)] = r.status
							? 'present'
							: 'absent'
					})
				}
				console.log('Processed attendance map:', map)
				setAttendance(map)
			} catch (error) {
				console.error('Error loading attendance:', error)
			} finally {
				setLoading(p => ({ ...p, attendance: false }))
			}
		},
		[authFetch, startOfMonthISO, endOfMonthISO]
	)

	/* ---- Boot ---- */
	useEffect(() => {
		;(async () => {
			try {
				setLoading(p => ({ ...p, boot: true }))
				if (!accessToken && !refreshToken) {
					setError('Avtorizatsiya kerak. Tizimga kiring.')
					return
				}

				// optional: o‘qituvchilar orqali ismni aniqlash
				let resolved = currentTeacherName
				if (!resolved && user?.email) {
					const tRaw = await authFetch(`${API_BASE}/teachers`).catch(() => ({}))
					const tList = A(tRaw?.teachers ?? tRaw)
					const byMail = tList.find(
						t => t?.email && t.email === currentTeacherEmail
					)
					resolved = byMail?.fullName || teacherNameRedux || ''
					setCurrentTeacherName(resolved)
				}

				const [gList, sList] = await Promise.all([loadGroups(), loadStudents()])
				const norm = normName(resolved || teacherNameRedux || '')
				const filtered = gList.filter(g => {
					const names = gTeacherNames(g)
					return (
						names.length &&
						names.some(n => n === norm || n.includes(norm) || norm.includes(n))
					)
				})
				setGroups(filtered)

				if (filtered.length) {
					const first = filtered[0]
					setSelectedGroup(first)
					setSelectedGroupKey(gid(first))
					const g = gid(first)
					const st = sList
						.filter(s => sGroups(s).some(x => String(x) === g))
						.map(niceStudent)
					setStudents(st)
					await loadAttendance(first)
				}
			} catch (e) {
				setError(String(e?.message || e))
			} finally {
				setLoading(p => ({ ...p, boot: false }))
			}
		})()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [accessToken, refreshToken])

	/* ---- UI actions ---- */
	const handleGroupSelect = async g => {
		setSelectedGroup(g)
		setSelectedGroupKey(gid(g))
		const st = allStudents
			.filter(s => sGroups(s).some(x => String(x) === gid(g)))
			.map(niceStudent)
		setStudents(st)
		await loadAttendance(g)
	}

	// Endi faqat dars kunlari ko'rsatiladi, shuning uchun har doim backendga yozamiz
	const quickToggle = async (studentId, day) => {
		const g = gid(selectedGroup)
		if (!g) return

		const k = attKey(g, studentId, day)
		const next = attendance[k] === 'present' ? 'absent' : 'present'
		const prev = attendance[k] ?? null

		console.log('Quick toggle:', {
			groupId: g,
			studentId,
			day,
			current: attendance[k],
			next,
		})

		try {
			setAttendance(p => ({ ...p, [k]: next }))
			const now = new Date()
			const d = new Date(now.getFullYear(), now.getMonth(), Number(day))
			d.setHours(8, 30, 0, 0)

			const payload = {
				date: d.toISOString(),
				group_id: g,
				student_id: String(studentId),
				status: next === 'present',
			}

			console.log('Attendance POST payload:', payload)

			const response = await authFetch(`${API_BASE}/Attendance`, {
				method: 'POST',
				body: JSON.stringify(payload),
			})

			console.log('Attendance POST response:', response)
		} catch (e) {
			console.error('Attendance POST error:', e)
			setAttendance(p => ({ ...p, [k]: prev }))
			setError(`Davomatni saqlashda xatolik: ${e.message || e}`)
		}
	}

	const goDarsJadvali = () => {
		if (!selectedGroup) return
		navigate('dars-jadvali', { state: { group: selectedGroup } })
	}

	// Yangi attendance belgilash funksiyasi
	const markAttendance = async (studentId, day, status) => {
		const g = gid(selectedGroup)
		if (!g) return

		const k = attKey(g, studentId, day)
		const prev = attendance[k] ?? null

		console.log('Mark attendance:', { groupId: g, studentId, day, status })

		try {
			setAttendance(p => ({ ...p, [k]: status }))
			const now = new Date()
			const d = new Date(now.getFullYear(), now.getMonth(), Number(day))
			d.setHours(8, 30, 0, 0)

			const payload = {
				date: d.toISOString(),
				group_id: g,
				student_id: String(studentId),
				status: status === 'present',
			}

			console.log('Attendance POST payload:', payload)

			const response = await authFetch(`${API_BASE}/Attendance`, {
				method: 'POST',
				body: JSON.stringify(payload),
			})

			console.log('Attendance POST response:', response)
			setShowOptions(null) // Options ni yopish
		} catch (e) {
			console.error('Attendance POST error:', e)
			setAttendance(p => ({ ...p, [k]: prev }))
			setError(`Davomatni saqlashda xatolik: ${e.message || e}`)
		}
	}

	/* ---- Render ---- */
	const hasGroups = groups.length > 0
	const getStatusCls = s =>
		s === 'present'
			? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow'
			: s === 'absent'
			? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow'
			: 'bg-white border-2 border-gray-200 hover:border-blue-300'

	return (
		<div className='min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/30 to-cyan-50/20 relative overflow-hidden'>
			{/* header */}
			<div className='sticky top-0 z-20 backdrop-blur-2xl bg-white/70 border-b border-gray-200/50 shadow'>
				<div className='max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between'>
					<div className='flex items-center gap-4'>
						<div className='relative w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 via-sky-600 to-cyan-500 text-white flex items-center justify-center shadow'>
							<GraduationCap className='w-8 h-8' />
							<div className='absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse' />
						</div>
						<div>
							<h1 className='text-2xl font-black bg-gradient-to-r from-blue-700 via-sky-700 to-cyan-600 bg-clip-text text-transparent'>
								Mentor Paneli
							</h1>
							<p className='text-xs text-gray-600'>
								Sizning guruhlaringiz va davomat
							</p>
						</div>
					</div>
					<button
						onClick={() => window.location.reload()}
						className='group px-5 py-3 rounded-2xl bg-white hover:bg-gradient-to-br hover:from-blue-600 hover:to-cyan-600 border-2 border-gray-200 hover:border-transparent text-gray-700 hover:text-white font-bold transition-all shadow'
					>
						<RefreshCw className='w-5 h-5 group-hover:rotate-180 transition-transform' />
					</button>
				</div>
			</div>

			{error && (
				<div className='max-w-7xl mx-auto px-4 sm:px-6 mt-6'>
					<div className='rounded-2xl border-2 border-rose-300 bg-gradient-to-r from-rose-50 to-red-50 p-5 flex items-start gap-4 shadow'>
						<div className='w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center'>
							<AlertTriangle className='w-6 h-6 text-white' />
						</div>
						<div>
							<div className='font-bold text-rose-900'>Xatolik</div>
							<div className='text-sm text-rose-700'>{error}</div>
						</div>
					</div>
				</div>
			)}

			<div className='max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6'>
				{/* Groups list */}
				<div className='lg:col-span-1'>
					<div className='bg-white/80 rounded-3xl shadow border overflow-hidden'>
						<div className='relative bg-gradient-to-br from-blue-700 via-sky-600 to-cyan-500 p-6 text-white'>
							<div className='relative flex items-center gap-3 mb-2'>
								<div className='w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center'>
									<Users className='w-6 h-6' />
								</div>
								<h2 className='text-xl font-bold'>Guruhlar</h2>
							</div>
							<p className='text-blue-50/90 text-sm flex items-center gap-2'>
								<Sparkles className='w-4 h-4' /> Jami: {groups.length} ta
							</p>
						</div>

						{loading.boot || loading.groups ? (
							<div className='p-12 text-center'>
								<Loader2 className='w-8 h-8 animate-spin mx-auto text-blue-600 mb-3' />
								<p className='text-gray-500 text-sm'>Yuklanmoqda...</p>
							</div>
						) : !hasGroups ? (
							<div className='p-12 text-center text-gray-500'>
								Guruhlar topilmadi
							</div>
						) : (
							<div className='divide-y divide-gray-100'>
								{groups.map(g => {
									const active = selectedGroupKey === gid(g)
									return (
										<button
											key={gid(g)}
											onClick={() => handleGroupSelect(g)}
											className={`w-full text-left p-5 transition ${
												active
													? 'bg-gradient-to-r from-blue-50 to-sky-50 border-l-4 border-blue-600'
													: 'hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-200'
											}`}
										>
											<div className='flex items-center justify-between'>
												<div className='min-w-0 flex-1'>
													<div className='font-bold text-gray-900 truncate mb-2'>
														{g?.name || 'Nomsiz guruh'}
													</div>
													<div className='flex items-center gap-2 text-xs text-gray-600 mb-2'>
														<span className='px-2 py-1 rounded bg-blue-100 text-blue-700 font-semibold flex items-center gap-1'>
															<Clock className='w-3 h-3' />{' '}
															{g?.start_time ?? '--'}–{g?.end_time ?? '--'}
														</span>
														<span className='px-2 py-1 rounded bg-violet-100 text-violet-700 font-semibold'>
															{daysBadge(g)}
														</span>
													</div>
													<div className='flex items-center gap-2 text-xs text-gray-600'>
														<span className='px-2 py-1 rounded bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-1'>
															<MapPin className='w-3 h-3' /> {g?.branch || '—'}
														</span>
													</div>
												</div>
												<ChevronRight
													className={`w-6 h-6 ${
														active
															? 'rotate-90 text-blue-600 scale-125'
															: 'text-gray-400'
													} transition`}
												/>
											</div>
										</button>
									)
								})}
							</div>
						)}
					</div>
				</div>

				{/* Attendance + header */}
				<div className='lg:col-span-3'>
					<div className='bg-white/80 rounded-3xl shadow border overflow-visible'>
						<div className='p-6 border-b flex items-center justify-between bg-gradient-to-r from-white to-sky-50/30'>
							<div className='flex items-center gap-4'>
								<div className='w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-100 to-cyan-200 flex items-center justify-center shadow'>
									<Calendar className='w-6 h-6 text-blue-600' />
								</div>
								<div>
									<h3 className='font-black text-gray-900'>Davomat jadvali</h3>
									<p className='text-xs text-gray-600'>
										{selectedGroup
											? `${selectedGroup.name} — ${currentMonth}`
											: currentMonth}
									</p>
								</div>
							</div>

							<button
								disabled={!selectedGroup}
								onClick={goDarsJadvali}
								className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-3 ${
									selectedGroup
										? 'bg-gradient-to-r from-blue-700 via-sky-600 to-cyan-600 text-white'
										: 'bg-gray-100 text-gray-400 cursor-not-allowed'
								}`}
							>
								<BookOpen className='w-5 h-5' />
								<span className='hidden sm:inline'>Dars dasturi</span>
							</button>
						</div>

						{/* Placeholder if none */}
						{!selectedGroup && hasGroups && (
							<div className='p-16 text-center'>
								<div className='w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-100 via-sky-100 to-cyan-100 flex items-center justify-center shadow'>
									<Calendar className='w-12 h-12 text-blue-600' />
								</div>
								<p className='text-gray-900 font-bold text-xl mb-2'>
									Guruhni tanlang
								</p>
								<p className='text-sm text-gray-600'>
									Davomatni ko‘rish uchun chapdan guruhni tanlang
								</p>
							</div>
						)}

						{(loading.students || loading.attendance) && selectedGroup && (
							<div className='p-16 text-center'>
								<Loader2 className='w-12 h-12 animate-spin mx-auto text-blue-600 mb-4' />
								<p className='text-gray-600'>Yuklanmoqda...</p>
							</div>
						)}

						{selectedGroup && !loading.students && !loading.attendance && (
							<div
								className='overflow-x-auto'
								onScroll={() => setShowOptions(null)}
								onClick={e => {
									// Agar katak emas, boshqa joyga bosilgan bo'lsa options ni yopish
									if (!e.target.closest('[data-attendance-cell]')) {
										setShowOptions(null)
									}
								}}
							>
								<div className='min-w-max'>
									{/* header row */}
									<div className='flex bg-gradient-to-r from-gray-50 to-sky-50/50 border-b-2 border-gray-200 sticky top-0 z-30 shadow-sm'>
										<div className='w-72 px-5 py-4 font-bold text-gray-800 border-r-2 border-gray-200 sticky left-0 z-40 bg-gradient-to-r from-white to-sky-50/30 backdrop-blur-sm'>
											<div className='flex items-center gap-3'>
												<div className='w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center shadow'>
													<Users className='w-5 h-5 text-white' />
												</div>
												<span>Talabalar ({students.length})</span>
											</div>
										</div>

										{classDays.map(d => (
											<div
												key={`hdr-${d.day}`}
												className={`w-14 px-1 py-3 text-center border-r-2 h-16 flex-shrink-0
                          ${d.isWeekend ? 'bg-slate-100/80' : 'bg-white'}
                          ${
														d.isToday
															? 'ring-4 ring-blue-400 ring-inset bg-gradient-to-b from-blue-100 to-cyan-100'
															: ''
													}`}
											>
												<div
													className={`text-xs font-bold ${
														d.isToday ? 'text-blue-900' : 'text-gray-700'
													}`}
												>
													{d.dateLabel}
												</div>
												<div
													className={`text-[10px] mt-1 font-semibold ${
														d.isToday ? 'text-blue-700' : 'text-gray-500'
													}`}
												>
													{d.dayName}
												</div>
											</div>
										))}
									</div>

									{/* rows */}
									<div className='divide-y divide-gray-100'>
										{students.map((s, i) => {
											const rowKey = sid(s) || `row-${i}`
											return (
												<div
													key={rowKey}
													className='flex hover:bg-gradient-to-r hover:from-sky-50/30 hover:to-cyan-50/20'
												>
													<div
														className='w-72 px-5 py-4 border-r-2 border-gray-200 bg-white/90 sticky left-0 z-10'
														title={s.name}
													>
														<div className='flex items-center gap-3'>
															<div className='w-10 h-10 rounded-xl bg-gradient-to-br from-blue-700 to-sky-600 text-white text-sm flex items-center justify-center font-black shadow'>
																{i + 1}
															</div>
															<div className='min-w-0 flex-1'>
																<div className='text-sm font-bold text-gray-900 truncate'>
																	{s.name}
																</div>
																{s?.phone && (
																	<div className='text-[11px] text-gray-600 truncate'>
																		{s.phone}
																	</div>
																)}
															</div>
														</div>
													</div>

													{classDays.map(d => {
														const g = gid(selectedGroup)
														const k = attKey(g, sid(s), d.day)
														const status = attendance[k] || null
														const classDay = isClassDay(d.day, selectedGroup)

														// Endi faqat dars kunlari ko'rsatiladi, shuning uchun har doim classDay = true
														const effectiveStatus = status || 'absent'

														return (
															<div
																key={`c-${rowKey}-${d.day}`}
																data-attendance-cell
																className={`w-14 px-1 border-r-2 border-gray-100 relative flex items-center justify-center h-16 flex-shrink-0
                                  ${
																		d.isWeekend ? 'bg-slate-50/50' : 'bg-white'
																	}`}
																title={`${d.dateLabel} – bosib davomatni belgilang`}
															>
																{/* Asosiy katak */}
																<button
																	onClick={() =>
																		setShowOptions(k === showOptions ? null : k)
																	}
																	className={`w-10 h-10 rounded-xl text-sm font-black transition-all cursor-pointer ${getStatusCls(
																		effectiveStatus
																	)} hover:scale-105`}
																>
																	{effectiveStatus === 'present' && (
																		<Check className='w-5 h-5 mx-auto' />
																	)}
																	{effectiveStatus === 'absent' && (
																		<X className='w-5 h-5 mx-auto' />
																	)}
																</button>

																{/* Yuqorida ochiladigan 2ta tugma */}
																{showOptions === k && (
																	<div className='absolute -top-20 left-1/2 -translate-x-1/2 z-30'>
																		<div className='bg-white rounded-2xl shadow-lg border border-gray-200 p-2 flex gap-2'>
																			{/* Present tugmasi */}
																			<button
																				onClick={() =>
																					markAttendance(
																						sid(s),
																						d.day,
																						'present'
																					)
																				}
																				className='w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-xl font-black shadow hover:scale-110 transition-all duration-200 flex items-center justify-center'
																				title='Bor'
																			>
																				<Check className='w-6 h-6' />
																			</button>

																			{/* Absent tugmasi */}
																			<button
																				onClick={() =>
																					markAttendance(
																						sid(s),
																						d.day,
																						'absent'
																					)
																				}
																				className='w-12 h-12 bg-gradient-to-br from-rose-500 to-red-600 text-white rounded-xl font-black shadow hover:scale-110 transition-all duration-200 flex items-center justify-center'
																				title="Yo'q"
																			>
																				<X className='w-6 h-6' />
																			</button>
																		</div>
																		{/* Ko'rsatkich uchburchagi */}
																		<div className='absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white' />
																	</div>
																)}
															</div>
														)
													})}
												</div>
											)
										})}
									</div>
								</div>
							</div>
						)}
					</div>
				</div>
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

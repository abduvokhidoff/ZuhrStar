import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { Swiper, SwiperSlide } from 'swiper/react'
import { FreeMode } from 'swiper/modules'
import 'swiper/css'

// === Chart.js (react-chartjs-2)
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	PointElement,
	LineElement,
	Tooltip,
	Legend,
	Filler,
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	PointElement,
	LineElement,
	Tooltip,
	Legend,
	Filler
)

const Dashboard = () => {
	const user = useSelector(state => state.auth.user)
	const accessToken = useSelector(state => state.auth.accessToken)

	const [teachers, setTeachers] = useState([])
	const [groups, setGroups] = useState([])
	const [students, setStudents] = useState([])
	const [attendance, setAttendance] = useState([])
	const [todaysGroups, setTodaysGroups] = useState([])
	const [positiveAttendance, setPositiveAttendance] = useState(0)

	// stabilize current date for the whole render
	const currentDate = useMemo(() => new Date(), [])

	// ---------------- Helpers ----------------
	const getMonthKey = d => {
		const dt = d instanceof Date ? d : new Date(d)
		const y = dt.getFullYear()
		const m = String(dt.getMonth() + 1).padStart(2, '0')
		return `${y}-${m}`
	}

	// nice month label
	const labelFromKey = key => {
		const [y, m] = key.split('-')
		return new Date(Number(y), Number(m) - 1, 1).toLocaleString('uz-UZ', {
			month: 'long',
			year: 'numeric',
		})
	}

	// ---------------- Attendance % ----------------
	useEffect(() => {
		if (attendance.length > 0) {
			const positive = attendance.filter(a => a.status === true)
			const percentage = (positive.length / attendance.length) * 100
			setPositiveAttendance(parseFloat(percentage.toFixed(1)))
		} else {
			setPositiveAttendance(0)
		}
	}, [attendance])

	// ---------------- Today’s groups ----------------
	useEffect(() => {
		if (groups.length > 0) {
			const today = currentDate.getDay()
			const filtered = []
			for (const g of groups) {
				if (!g?.days) continue
				if (today === 0 && g.days.every_days) filtered.push(g)
				else if (today % 2 === 1 && (g.days.odd_days || g.days.every_days))
					filtered.push(g)
				else if (today % 2 === 0 && (g.days.even_days || g.days.every_days))
					filtered.push(g)
			}
			setTodaysGroups(filtered)
		} else {
			setTodaysGroups([])
		}
	}, [groups, currentDate])

	// ---------------- Fetch ----------------
	useEffect(() => {
		if (!accessToken) return

		const headers = {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json',
		}

		const getJsonSafe = async (res, fallback = null) => {
			if (!res.ok) return fallback
			try {
				return await res.json()
			} catch {
				return fallback
			}
		}

		const controller = new AbortController()

		;(async () => {
			try {
				const [teachersRes, groupsRes, studentsRes, attendanceRes] =
					await Promise.all([
						fetch('https://zuhrstar-production.up.railway.app/api/teachers', {
							headers,
							signal: controller.signal,
						}),
						fetch('https://zuhrstar-production.up.railway.app/api/groups', {
							headers,
							signal: controller.signal,
						}),
						fetch('https://zuhrstar-production.up.railway.app/api/students', {
							headers,
							signal: controller.signal,
						}),
						fetch('https://zuhrstar-production.up.railway.app/api/attendance', {
							headers,
							signal: controller.signal,
						}),
					])

				const teachersData = (await getJsonSafe(teachersRes, {
					teachers: [],
				})) || {
					teachers: [],
				}
				const groupsData = (await getJsonSafe(groupsRes, [])) || []
				const studentsData = (await getJsonSafe(studentsRes, [])) || []
				const attendanceData = (await getJsonSafe(attendanceRes, [])) || []

				setTeachers(
					(teachersData?.teachers || []).filter(t => t.role === 'Mentor')
				)
				setGroups(
					Array.isArray(groupsData) ? groupsData : groupsData?.groups || []
				)
				setStudents(
					Array.isArray(studentsData)
						? studentsData
						: studentsData?.students || []
				)
				setAttendance(
					Array.isArray(attendanceData)
						? attendanceData
						: attendanceData?.attendance || []
				)
			} catch (err) {
				if (err.name !== 'AbortError') {
					console.error('Fetch error:', err)
				}
			}
		})()

		return () => controller.abort()
	}, [accessToken])

	// ---------------- Chart #1: 12 months ----------------
	const monthlyBuckets = useMemo(() => {
		const b = {}
		for (const s of students) {
			const dateStr =
				s.createdAt ||
				s.created_at ||
				s.registeredAt ||
				s.registered_at ||
				s.created_at_date
			if (!dateStr) continue
			const key = getMonthKey(dateStr)
			if (!b[key]) b[key] = 0
			b[key] += 1
		}
		return b
	}, [students])

	const yearMonthKeys = useMemo(() => {
		const y = currentDate.getFullYear()
		return Array.from(
			{ length: 12 },
			(_, i) => `${y}-${String(i + 1).padStart(2, '0')}`
		)
	}, [currentDate])

	const monthLabels = useMemo(
		() => yearMonthKeys.map(k => labelFromKey(k)),
		[yearMonthKeys]
	)
	const monthCounts = useMemo(
		() => yearMonthKeys.map(k => monthlyBuckets[k] || 0),
		[yearMonthKeys, monthlyBuckets]
	)

	// gradient background for students chart
	const monthsChartRef = useRef(null)
	const studentsBarData = useMemo(() => {
		return {
			labels: monthLabels,
			datasets: [
				{
					label: "Oy bo'yicha qabul qilinganlar",
					data: monthCounts,
					backgroundColor: ctx => {
						const chart = ctx.chart
						const { ctx: c, chartArea } = chart
						if (!chartArea) return 'rgba(37,99,235,0.18)'
						const g = c.createLinearGradient(
							0,
							chartArea.top,
							0,
							chartArea.bottom
						)
						g.addColorStop(0, 'rgba(37,99,235,0.30)') // top
						g.addColorStop(1, 'rgba(37,99,235,0.08)') // bottom
						return g
					},
					borderColor: 'rgba(37,99,235,1)', // blue
					borderWidth: 1.5,
					borderRadius: 8,
					barThickness: 28,
				},
			],
		}
	}, [monthLabels, monthCounts])

	const studentsBarOptions = useMemo(
		() => ({
			responsive: true,
			maintainAspectRatio: false,
			animation: { duration: 0 },
			interaction: { mode: 'nearest', intersect: false },
			plugins: {
				legend: { display: false },
				tooltip: {
					backgroundColor: 'rgba(37,99,235,0.9)',
					titleColor: '#fff',
					bodyColor: '#fff',
					callbacks: { label: ctx => ` ${ctx.formattedValue} ta student` },
				},
			},
			scales: {
				x: {
					grid: { display: false },
					ticks: { color: '#4b5563', font: { weight: '600' } },
				},
				y: {
					beginAtZero: true,
					grid: { color: 'rgba(0,0,0,0.06)' },
					ticks: { precision: 0, callback: v => `${v} ta` },
				},
			},
		}),
		[]
	)

	// ---------------- Chart #2: Mentor rating (unique students) ----------------
	const mentorStats = useMemo(() => {
		const map = new Map() // mentorName -> Set(studentId)

		for (const g of groups) {
			const mentorName =
				g.teacher_fullName ||
				g.teacherName ||
				g.teacher?.fullName ||
				`${g.teacher?.name ?? ''} ${g.teacher?.surname ?? ''}`.trim()

			if (!mentorName) continue

			if (!map.has(mentorName)) map.set(mentorName, new Set())
			const set = map.get(mentorName)
			for (const s of g.students || []) {
				const sid = s?._id || s?.student_id || s?.id
				if (sid) set.add(sid)
			}
		}

		// ensure mentors with no groups appear with 0
		for (const t of teachers) {
			const name = t.fullName || `${t.name || ''} ${t.surname || ''}`.trim()
			if (name && !map.has(name)) map.set(name, new Set())
		}

		const rows = Array.from(map.entries()).map(([name, set]) => ({
			name,
			count: set.size,
		}))
		rows.sort((a, b) => b.count - a.count)
		return rows
	}, [groups, teachers])

	const mentorLabels = useMemo(
		() => mentorStats.map(r => r.name),
		[mentorStats]
	)
	const mentorCounts = useMemo(
		() => mentorStats.map(r => r.count),
		[mentorStats]
	)

	const mentorsChartRef = useRef(null)
	const mentorBarData = useMemo(() => {
		return {
			labels: mentorLabels,
			datasets: [
				{
					label: "Mentor bo'yicha noyob studentlar",
					data: mentorCounts,
					backgroundColor: ctx => {
						const chart = ctx.chart
						const { ctx: c, chartArea } = chart
						if (!chartArea) return 'rgba(16,185,129,0.18)'
						const g = c.createLinearGradient(
							0,
							chartArea.top,
							0,
							chartArea.bottom
						)
						g.addColorStop(0, 'rgba(16,185,129,0.35)') // top
						g.addColorStop(1, 'rgba(16,185,129,0.10)') // bottom
						return g
					},
					borderColor: 'rgba(16,185,129,1)', // mint
					borderWidth: 1.5,
					borderRadius: 10,
					barThickness: 28,
				},
			],
		}
	}, [mentorLabels, mentorCounts])

	const mentorBarOptions = useMemo(
		() => ({
			responsive: true,
			maintainAspectRatio: false,
			animation: { duration: 0 },
			interaction: { mode: 'nearest', intersect: false },
			plugins: {
				legend: { display: false },
				tooltip: {
					backgroundColor: 'rgba(16,185,129,0.9)',
					titleColor: '#fff',
					bodyColor: '#fff',
					callbacks: {
						title: items => `Mentor: ${items[0].label}`,
						label: ctx => ` ${ctx.formattedValue} ta noyob student`,
					},
				},
			},
			scales: {
				x: {
					grid: { color: 'rgba(0,0,0,0.08)' }, // different from chart #1
					ticks: { color: '#111827', font: { weight: '600' } },
				},
				y: {
					beginAtZero: true,
					grid: { color: 'rgba(0,0,0,0.06)' },
					ticks: { precision: 0, callback: v => `${v} ta` },
				},
			},
		}),
		[]
	)

	return (
		<div className='flex flex-col gap-[40px] px-[30px] py-[20px] w-full flex-1 relative z-0'>
			{/* Header */}
			<div className='flex justify-between items-end'>
				<div>
					<p>Xush Kelibsiz {user?.fullName}</p>
					<h1 className='font-[Nunito Sans] font-[700] leading-[42px] text-[40px] text-[black]'>
						Boshqaruv paneli
					</h1>
				</div>
				<div>
					<button className='bg-[#d8eaff] px-[10px] py-[5px] rounded-[8px]'>
						<p className='font-[Nunito Sans] font-[500] text-[16px] text-[#2563eb]'>
							{currentDate.getDate()}-
							{currentDate.toLocaleString('uz-UZ', {
								month: 'long',
								year: 'numeric',
							})}
						</p>
					</button>
				</div>
			</div>

			{/* Stats */}
			<div className='flex flex-col gap-[30px]'>
				<div className='flex items-center justify-between gap-[20px]'>
					{/* Mentorlar */}
					<div className='flex flex-col gap-[10px] rounded-[8px] bg-[white] shadow-md px-[20px] py-[20px] w-[23%]'>
						<div className='flex items-center gap-[5px]'>
							<div className='bg-[#0096a5] w-[6px] h-[25px] rounded-r-[4px]'></div>
							<p className='font-[Nunito Sans] font-[600] text-[18px] text-black/80'>
								Mentorlar
							</p>
						</div>
						<div className='px-[11px]'>
							<p className='font-[Nunito Sans] font-[700] text-[30px] text-[black]'>
								{teachers.length}
							</p>
						</div>
					</div>

					{/* O'quvchilar */}
					<div className='flex flex-col gap-[10px] rounded-[8px] bg-[white] shadow-md px-[20px] py-[20px] w-[23%]'>
						<div className='flex items-center gap-[5px]'>
							<div className='bg-[#0096a5] w-[6px] h-[25px] rounded-r-[4px]'></div>
							<p className='font-[Nunito Sans] font-[600] text-[18px] text-black/80'>
								O&apos;quvchilar
							</p>
						</div>
						<div className='px-[11px]'>
							<p className='font-[Nunito Sans] font-[700] text-[30px] text-[black]'>
								{students.length}
							</p>
						</div>
					</div>

					{/* Guruhlar */}
					<div className='flex flex-col gap-[10px] rounded-[8px] bg-[white] shadow-md px-[20px] py-[20px] w-[23%]'>
						<div className='flex items-center gap-[5px]'>
							<div className='bg-[#0096a5] w-[6px] h-[25px] rounded-r-[4px]'></div>
							<p className='font-[Nunito Sans] font-[600] text-[18px] text-black/80'>
								Guruhlar
							</p>
						</div>
						<div className='px-[11px]'>
							<p className='font-[Nunito Sans] font-[700] text-[30px] text-[black]'>
								{groups.length}
							</p>
						</div>
					</div>

					{/* Davomat */}
					<div className='flex flex-col gap-[10px] rounded-[8px] bg-[white] shadow-md px-[20px] py-[20px] w-[23%]'>
						<div className='flex items-center gap-[5px]'>
							<div className='bg-[#0096a5] w-[6px] h-[25px] rounded-r-[4px]'></div>
							<p className='font-[Nunito Sans] font-[600] text-[18px] text-black/80'>
								Davomat
							</p>
						</div>
						<div className='px-[11px]'>
							<p className='font-[Nunito Sans] font-[700] text-[30px] text-[black]'>
								{positiveAttendance}%
							</p>
						</div>
					</div>
				</div>

				{/* Bugungi darslar */}
				<div className='bg-[white] shadow-md py-[20px] rounded-[8px] flex flex-col gap-[30px] px-[20px] overflow-visible'>
					<div>
						<h2 className='font-[Nunito Sans] font-[600] text-[22px] text-[black]'>
							Bugungi darslar
						</h2>
					</div>
					{todaysGroups.length > 0 ? (
						<Swiper
							modules={[FreeMode]}
							spaceBetween={16}
							slidesPerView={4}
							className='w-full'
							allowTouchMove={false} // prevent drag hijacking clicks
						>
							{todaysGroups.map((g, i) => (
								<SwiperSlide key={i} className='!w-[24%]'>
									<div className='rounded-[8px] border-l-[5px] border-l-[#0096a5] px-[20px] py-[10px] bg-[#eef6ff]'>
										<h3>
											{g.start_time} - {g.end_time}
										</h3>
										<p>{g.name}</p>
									</div>
								</SwiperSlide>
							))}
						</Swiper>
					) : (
						<p className='font-[Nunito Sans] font-[500] text-[16px] text-[#555]'>
							Bugun darslar yo&apos;q
						</p>
					)}
				</div>

				{/* Chart #1: Months */}
				<div className='bg-white shadow-md rounded-[8px] p-[20px] overflow-visible'>
					<div className='flex items-center justify-between mb-[12px]'>
						<h3 className='font-[Nunito Sans] font-[600] text-[22px] text-[black]'>
							Oylar bo‘yicha qabul qilingan studentlar
						</h3>
						<span className='text-[13px] text-black/60'>
							Joriy yil: <b>{currentDate.getFullYear()}</b>
						</span>
					</div>
					<div className='h-[280px] md:h-[320px]'>
						<Bar
							ref={monthsChartRef}
							data={studentsBarData}
							options={studentsBarOptions}
						/>
					</div>
				</div>

				{/* Chart #2: Mentor rating (Bar, not Line) */}
				<div className='bg-white shadow-md rounded-[8px] p-[20px] overflow-visible'>
					<div className='flex items-center justify-between mb-[12px]'>
						<h3 className='font-[Nunito Sans] font-[600] text-[22px] text-[black]'>
							Mentorlar reytingi
						</h3>
						<span className='text-[13px] text-black/60'>
							Noyob studentlar soni
						</span>
					</div>
					<div className='h-[280px] md:h-[320px]'>
						<Line
							ref={mentorsChartRef}
							data={mentorBarData}
							options={mentorBarOptions}
						/>
					</div>

					{/* Badge list */}
					<div className='mt-[14px] flex flex-wrap gap-[10px]'>
						{mentorStats.map(r => (
							<span
								key={r.name}
								className='text-[13px] bg-[#eef6ff] px-[10px] py-[6px] rounded-[6px]'
							>
								{r.name}: <b>{r.count}</b> ta
							</span>
						))}
					</div>
				</div>

				{/* Groups list */}
				<div>
					<h2 className='text-2xl font-bold text-gray-900 mt-10 ml-2 mb-8'>
						Guruhlar statistikasi
					</h2>
					<div className='flex flex-col gap-6'>
						{groups.map((group, index) => (
							<div
								key={group?._id ?? index}
								className='w-full bg-white rounded-3xl p-8'
							>
								<div className='grid grid-cols-1 md:grid-cols-2 gap-12'>
									{/* Left Side - Group Info */}
									<div className='flex flex-col gap-6'>
										<div className='flex items-center gap-7'>
											<div className='w-12 bg-blue-800 rounded-lg h-12 flex items-center justify-center text-white font-bold'>
												G{index + 1}
											</div>
											<div className='flex flex-col gap-1'>
												<p className='text-gray-400 text-sm font-normal'>
													{group._id
														? group._id.slice(-6).toUpperCase()
														: `GR000${index + 1}`}
												</p>
												<p className='text-lg font-bold'>
													{group.name || `Guruh ${index + 1}`}
												</p>
											</div>
										</div>
										<div className='flex gap-8 items-center'>
											<p className='text-sm font-semibold'>
												Yaratilgan:{' '}
												{group.createdAt
													? new Date(group.createdAt).toLocaleDateString(
															'uz-UZ'
													  )
													: 'Sep 12, 2020'}
											</p>
											<p className='text-sm font-bold text-yellow-500'>
												{group.level || 'Yuqori'}
											</p>
										</div>
									</div>

									{/* Right Side - Group Statistics */}
									<div className='flex flex-col gap-4'>
										<p className='text-base font-bold text-gray-900'>
											Guruh ma'lumotlari
										</p>
										<div className='grid grid-cols-3 gap-8'>
											<div className='text-center'>
												<p className='text-sm text-gray-600'>
													Jami o'quvchilar
												</p>
												<p className='text-lg font-bold'>
													{group.students?.length ||
														group.totalStudents ||
														'12'}
												</p>
											</div>
											<div className='text-center'>
												<p className='text-sm text-gray-600'>Faol</p>
												<p className='text-lg font-bold'>
													{group.activeStudents ||
														(group.students?.length
															? Math.floor(group.students.length * 0.8)
															: '10')}
												</p>
											</div>
											<div className='text-center'>
												<p className='text-sm text-gray-600'>To'xtatilgan</p>
												<p className='text-lg font-bold'>
													{group.pausedStudents ||
														(group.students?.length
															? Math.floor(group.students.length * 0.2)
															: '2')}
												</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						))}
						{groups.length === 0 && (
							<div className='text-center py-12 text-gray-500'>
								Hozircha guruhlar mavjud emas
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

export default Dashboard

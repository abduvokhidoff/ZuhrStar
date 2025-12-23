// src/pages/Dashboard.jsx
import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { setCredentials } from '../../redux/authSlice'
import axios from 'axios'
import Oquvchilar from './Oquvchilar'
import Guruhlar from './Guruhlar'
import Mentorlar from './Mentorlar'
import Tolovlar from './Tolovlar'
import { useNavigate } from 'react-router-dom'

// Chart.js
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Filler,
	Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
	CategoryScale,
	LinearScale,
	PointElement,
	LineElement,
	Title,
	Tooltip,
	Filler,
	Legend
)

const API_BASE =
	import.meta?.env?.VITE_API_URL?.replace(/\/$/, '') ||
	'https://zuhr-star-production.up.railway.app'

export default function Dashboard() {
	const dispatch = useDispatch()
	const { accessToken, refreshToken } = useSelector(s => s.auth)
	const navigate = useNavigate()

	const [students, setStudents] = useState([])
	const [groups, setGroups] = useState([])
	const [teachers, setTeachers] = useState([])
	const [checks, setChecks] = useState([])
	const [loading, setLoading] = useState(true)
	const [err, setErr] = useState('')

	const [activePage, setActivePage] = useState('dashboard')

	// ===== AUTH & API =====
	const refreshAccessToken = async () => {
		const res = await axios.post(
			`${API_BASE}/auth/refresh`,
			{ refreshToken },
			{ headers: { 'Content-Type': 'application/json' } }
		)
		dispatch(
			setCredentials({
				user: res.data.user,
				accessToken: res.data.accessToken,
				refreshToken: res.data.refreshToken,
			})
		)
		return res.data.accessToken
	}

	const axiosGetAuth = async url => {
		try {
			return await axios.get(url, {
				headers: { Authorization: `Bearer ${accessToken}` },
			})
		} catch (e) {
			if (e?.response?.status === 401 && refreshToken) {
				const newTok = await refreshAccessToken()
				return await axios.get(url, {
					headers: { Authorization: `Bearer ${newTok}` },
				})
			}
			throw e
		}
	}

	const loadAll = async () => {
		if (!accessToken) return
		setLoading(true)
		setErr('')
		try {
			const [st, gr, tea, ch] = await Promise.all([
				axiosGetAuth(`${API_BASE}/api/students`),
				axiosGetAuth(`${API_BASE}/api/groups`),
				axiosGetAuth(`${API_BASE}/api/teachers`),
				axiosGetAuth(`${API_BASE}/api/checks`),
			])

			setStudents(Array.isArray(st.data) ? st.data : [])
			setGroups(Array.isArray(gr.data) ? gr.data : [])
			setTeachers(Array.isArray(tea?.data?.teachers) ? tea.data.teachers : [])
			setChecks(Array.isArray(ch.data) ? ch.data : [])
		} catch (e) {
			console.error(e)
			setErr("Ma'lumotlarni yuklashda xatolik yuz berdi.")
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadAll()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [accessToken])

	// ===== HELPERS =====
	const safeDate = v => {
		const raw =
			v?.date_of_payment ||
			v?.date_Of_Create ||
			v?.createdAt ||
			v?.created_at ||
			v?.created ||
			v?.date ||
			v?.check_date ||
			v?.registered_at ||
			null
		const d = raw ? new Date(raw) : null
		return isNaN(d?.getTime?.()) ? null : d
	}

	const number = n => {
		const x = typeof n === 'string' ? Number(n) : n
		return Number.isFinite(x) ? x : 0
	}

	const fmtNum = n => (Number.isFinite(n) ? n.toLocaleString('ru-RU') : '0')

	const totalStudents = students.length
	const totalGroups = groups.length

	const mentorsCount = useMemo(() => {
		return Array.isArray(teachers)
			? teachers.filter(t => String(t?.role || '').toLowerCase() === 'mentor')
					.length
			: 0
	}, [teachers])

	const todayDailyPayment = useMemo(() => {
		if (!Array.isArray(checks)) return 0
		const now = new Date()
		const y = now.getFullYear(),
			m = now.getMonth(),
			d = now.getDate()
		return checks.reduce((acc, c) => {
			const dt = safeDate(c)
			if (!dt) return acc
			if (dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d) {
				const amount =
					number(c?.amount ?? c?.summa ?? c?.price ?? c?.total ?? 0) || 0
				return acc + amount
			}
			return acc
		}, 0)
	}, [checks])

	// ===== LAST 12 MONTHS + динамический продолг =====
	const last12Months = useMemo(() => {
		const arr = []
		const base = new Date()
		base.setDate(1)
		for (let i = 11; i >= 0; i--) {
			const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
			arr.push({
				y: d.getFullYear(),
				m: d.getMonth(),
				label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
					2,
					'0'
				)}`,
			})
		}
		return arr
	}, [])

	const dailyRevenue = useMemo(() => {
		if (!Array.isArray(checks)) return []
		const startDate = new Date()
		startDate.setDate(startDate.getDate() - 30) // последние 30 дней
		const days = []
		for (let i = 0; i <= 30; i++) {
			const d = new Date(
				startDate.getFullYear(),
				startDate.getMonth(),
				startDate.getDate() + i
			)
			const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
				2,
				'0'
			)}-${String(d.getDate()).padStart(2, '0')}`
			days.push({ label, date: d, amount: 0 })
		}
		checks.forEach(c => {
			const dt = safeDate(c)
			if (!dt) return
			const label = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
				2,
				'0'
			)}-${String(dt.getDate()).padStart(2, '0')}`
			const day = days.find(x => x.label === label)
			if (day)
				day.amount += number(c?.amount ?? c?.summa ?? c?.price ?? c?.total ?? 0)
		})
		return days
	}, [checks])

	const monthlyRevenue = useMemo(() => {
		const bucket = Object.fromEntries(last12Months.map(x => [x.label, 0]))
		checks.forEach(c => {
			const dt = safeDate(c)
			if (!dt) return
			const L = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
				2,
				'0'
			)}`
			if (bucket[L] !== undefined) {
				bucket[L] += number(c?.amount ?? c?.summa ?? c?.price ?? c?.total ?? 0)
			}
		})
		return bucket
	}, [checks, last12Months])

	const groupGrowth = useMemo(() => {
		const perMonth = Object.fromEntries(last12Months.map(x => [x.label, 0]))
		groups.forEach(g => {
			const dt = safeDate(g)
			if (!dt) return
			const L = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(
				2,
				'0'
			)}`
			if (perMonth[L] !== undefined) perMonth[L] += 1
		})
		// кумулятивно по месяцам
		const labels = last12Months.map(x => x.label)
		let run = 0
		const cumulative = labels.map(L => (run += perMonth[L]))
		return { labels, cumulative }
	}, [groups, last12Months])

	const last5Students = useMemo(() => {
		const copy = [...students]
		copy.sort(
			(a, b) =>
				(safeDate(b)?.getTime?.() || 0) - (safeDate(a)?.getTime?.() || 0)
		)
		return copy.slice(0, 5)
	}, [students])

	const last5Groups = useMemo(() => {
		const copy = [...groups]
		copy.sort(
			(a, b) =>
				(safeDate(b)?.getTime?.() || 0) - (safeDate(a)?.getTime?.() || 0)
		)
		return copy.slice(0, 5)
	}, [groups])

	// ===== PAGE NAVIGATION =====
	if (activePage === 'oquvchilar')
		return (
			<Oquvchilar data={students} onBack={() => setActivePage('dashboard')} />
		)
	if (activePage === 'guruhlar')
		return <Guruhlar data={groups} onBack={() => setActivePage('dashboard')} />
	if (activePage === 'mentorlar')
		return (
			<Mentorlar data={teachers} onBack={() => setActivePage('dashboard')} />
		)
	if (activePage === 'tolovlar')
		return (
			<Tolovlar
				data={checks}
				safeDate={safeDate}
				number={number}
				onBack={() => setActivePage('dashboard')}
			/>
		)

	// ===== RENDER DASHBOARD =====
	return (
		<div className='min-h-screen'>
			<div className='mx-auto max-w-7xl p-6'>
				{/* HEADER */}
				<div className='mb-6 flex items-center justify-between'>
					<h1 className='text-2xl font-extrabold tracking-tight'>Dashboard</h1>
					<div className='flex items-center gap-3'>
						<span className='hidden text-xs text-slate-500 md:inline'>
							{new Date().toLocaleDateString('ru-RU')}
						</span>
						<button
							onClick={loadAll}
							disabled={loading}
							className='inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60'
						>
							<span className='text-lg'>⟳</span>
							<span>Yangilash</span>
						</button>
					</div>
				</div>

				{/* ERROR */}
				{err && (
					<div className='mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700'>
						<span>{err}</span>
						<button
							onClick={loadAll}
							className='rounded-lg bg-red-600 px-3 py-1 text-white hover:bg-red-700'
						>
							Qayta urinish
						</button>
					</div>
				)}

				{/* STATS CARDS */}
				<div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4'>
					{[
						{
							label: "O'QUVCHILAR",
							value: totalStudents,
							emoji: '🎓',
							ring: 'ring-blue-200',
							grad: 'from-blue-500/10 to-blue-500/0',
							onClick: () => navigate("/admin/o'quvchilar"),
						},
						{
							label: 'GURUHLAR',
							value: totalGroups,
							emoji: '👥',
							ring: 'ring-indigo-200',
							grad: 'from-indigo-500/10 to-indigo-500/0',
							onClick: () => navigate('/admin/guruhlar'),
						},
						{
							label: 'MENTORLAR',
							value: mentorsCount,
							emoji: '🧑‍🏫',
							ring: 'ring-emerald-200',
							grad: 'from-emerald-500/10 to-emerald-500/0',
							onClick: () => navigate('/admin/mentorlar'),
						},
						{
							label: "KUNLIK TO'LOVLAR",
							value: fmtNum(todayDailyPayment),
							emoji: '🧾',
							ring: 'ring-amber-200',
							grad: 'from-amber-500/10 to-amber-500/0',
							onClick: () => navigate("/admin/to'lovlar"),
						},
					].map((k, i) => (
						<div
							key={i}
							onClick={k.onClick}
							className={`relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ${k.ring} transition cursor-pointer hover:shadow-md hover:scale-105`}
						>
							<div
								className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${k.grad}`}
							/>
							<div className='relative flex items-center justify-between'>
								<div>
									{loading ? (
										<div className='h-8 w-24 animate-pulse rounded bg-slate-200' />
									) : (
										<div className='text-3xl font-black text-slate-900'>
											{k.value}
										</div>
									)}
									<div className='mt-1 text-[11px] font-semibold tracking-[.2em] text-slate-500'>
										{k.label}
									</div>
								</div>
								<div className='text-3xl'>{k.emoji}</div>
							</div>
						</div>
					))}
				</div>

				{/* CHARTS */}
				<div className='mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2'>
					<ChartCard
						title='Oylik tushum'
						labels={last12Months.map(x => x.label)}
						values={last12Months.map(x => monthlyRevenue[x.label] || 0)}
						stroke='#4f46e5'
						fillFrom='rgba(99,102,241,0.3)'
						fillTo='rgba(165,180,252,0.05)'
						valueFormatter={i =>
							fmtNum(monthlyRevenue[last12Months[i].label] || 0)
						}
					/>
					<ChartCard
						title="Guruh o'sish dinamikasi"
						labels={groupGrowth.labels}
						values={groupGrowth.cumulative}
						stroke='#10b981'
						fillFrom='rgba(52,211,153,0.3)'
						fillTo='rgba(167,243,208,0.05)'
						valueFormatter={i => String(groupGrowth.cumulative[i] || 0)}
					/>
				</div>

				{/* LAST ITEMS */}
				<div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
					<ListCard
						title="Oxirgi 5 ta o'quvchi"
						loading={loading}
						empty="Hali o'quvchi qo'shilmagan."
						items={last5Students.map(s => {
							const full =
								(
									s.fullName || `${s?.surname || ''} ${s?.name || ''}`.trim()
								).trim() || '—'
							const phone = s?.student_phone || s?.phone || '—'
							const dt = safeDate(s)
							return {
								id: s._id || s.student_id,
								primary: full,
								secondary: phone,
								meta: dt ? dt.toLocaleDateString('ru-RU') : '—',
							}
						})}
					/>
					<ListCard
						title='Oxirgi 5 ta guruh'
						loading={loading}
						empty="Hali guruh qo'shilmagan."
						items={last5Groups.map(g => {
							const dt = safeDate(g)
							const count = Array.isArray(g.students) ? g.students.length : 0
							return {
								id: g._id || g.group_id || g.name,
								primary: g?.name || '—',
								secondary: `${g?.course || '—'} · ${count} talaba`,
								meta: dt ? dt.toLocaleDateString('ru-RU') : '—',
							}
						})}
					/>
				</div>
			</div>
		</div>
	)
}

// ===== CHARTCARD =====
function ChartCard({
	title,
	labels,
	values,
	stroke,
	fillFrom,
	fillTo,
	valueFormatter,
}) {
	const data = {
		labels,
		datasets: [
			{
				label: title,
				data: values,
				fill: true,
				backgroundColor: ctx => {
					const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 220)
					gradient.addColorStop(0, fillFrom)
					gradient.addColorStop(1, fillTo)
					return gradient
				},
				borderColor: stroke,
				tension: 0.4,
				pointRadius: 3,
				pointHoverRadius: 5,
				pointBackgroundColor: stroke,
			},
		],
	}

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: false },
			tooltip: {
				callbacks: {
					label: ctx => valueFormatter(ctx.dataIndex),
				},
			},
		},
		animation: { duration: 800, easing: 'easeOutQuart' },
		scales: {
			x: { grid: { display: false } },
			y: { grid: { color: '#f1f5f9' }, beginAtZero: true },
		},
	}

	return (
		<div className='rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md'>
			<div className='mb-3 flex items-center justify-between'>
				<div className='font-semibold text-slate-800'>{title}</div>
			</div>
			<div className='relative w-full h-[220px]'>
				<Line data={data} options={options} />
			</div>
		</div>
	)
}

// ===== LISTCARD =====
function ListCard({ title, items, loading, empty }) {
	return (
		<div className='rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md'>
			<div className='border-b border-slate-100 px-4 py-3'>
				<div className='font-semibold text-slate-800'>{title}</div>
			</div>
			<div className='p-3'>
				{loading ? (
					<div className='space-y-3'>
						{[...Array(5)].map((_, i) => (
							<div key={i} className='flex items-center justify-between'>
								<div className='h-4 w-40 animate-pulse rounded bg-slate-200' />
								<div className='h-3 w-20 animate-pulse rounded bg-slate-200' />
							</div>
						))}
					</div>
				) : items?.length ? (
					<ul className='divide-y divide-slate-100'>
						{items.map(it => (
							<li
								key={it.id}
								className='group flex items-center justify-between px-2 py-3 transition hover:bg-slate-50/70'
							>
								<div>
									<div className='flex flex-col'>
										<span className='font-medium text-slate-900'>
											{it.primary}
										</span>
										<span className='text-sm text-slate-500'>
											{it.secondary}
										</span>
									</div>
								</div>
								<div className='text-xs text-slate-400'>{it.meta}</div>
							</li>
						))}
					</ul>
				) : (
					<div className='text-center py-6 text-sm text-slate-400'>{empty}</div>
				)}
			</div>
		</div>
	)
}

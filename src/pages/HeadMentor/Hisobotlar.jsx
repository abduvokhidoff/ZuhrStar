// Hisobotlar.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Eye, Search, Download, TrendingUp } from 'lucide-react'
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	LineElement,
	Title,
	Tooltip,
	Legend,
	ArcElement,
	PointElement,
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'
import { setCredentials, logout } from '../../redux/authSlice'

ChartJS.register(
	CategoryScale,
	LinearScale,
	BarElement,
	LineElement,
	PointElement,
	Title,
	Tooltip,
	Legend,
	ArcElement
)

// ------- Configuration: adapt if your backend fields differ -------
const API_BASE = 'https://zuhr-star-production.up.railway.app'
const PAYMENT_ENDPOINT = '/api/checks'
const STUDENTS_ENDPOINT = '/api/students'
const COURSES_ENDPOINT = '/api/Courses'
const GROUPS_ENDPOINT = '/api/groups'
// If your payment date field is named differently, update here:
const PAYMENT_DATE_FIELD = 'date_Of_Create' // or 'date_of_payment'
// ------------------------------------------------------------------

const Hisobotlar = () => {
	const dispatch = useDispatch()
	const { accessToken, refreshToken, user } = useSelector(s => s.auth || {})
	const [students, setStudents] = useState([])
	const [notFilteredPayments, setNotFilteredPayments] = useState([])
	const [payments, setPayments] = useState([])
	const [courses, setCourses] = useState([])
	const [groups, setGroups] = useState([])
	const [loading, setLoading] = useState(true)

	// UI state
	const [searchTerm, setSearchTerm] = useState('')
	const [selectedStatus, setSelectedStatus] = useState('Barchasi')
	const [activeTab, setActiveTab] = useState('dashboard')
	const [showOnlyThisMonth, setShowOnlyThisMonth] = useState(true) // shows only current month's payments by default

	// previous stats placeholder (keeps your original logic)
	const [previousStats, setPreviousStats] = useState({
		total: 0,
		active: 0,
		paid: 0,
		revenue: 0,
	})

	// ---------- Token refresh + request wrapper ----------
	const refreshAccessToken = useCallback(async () => {
		if (!refreshToken) {
			dispatch(logout())
			return null
		}
		try {
			const res = await fetch(`${API_BASE}/api/users/refresh`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refreshToken }),
			})
			if (!res.ok) throw new Error('refresh failed')
			const data = await res.json()
			dispatch(
				setCredentials({
					user,
					accessToken: data.accessToken,
					refreshToken: data.refreshToken,
				})
			)
			return data.accessToken
		} catch (err) {
			dispatch(logout())
			return null
		}
	}, [refreshToken, dispatch, user])

	const makeRequest = useCallback(
		async (url, options = {}) => {
			const attempt = async token => {
				const res = await fetch(url, {
					...options,
					headers: {
						'Content-Type': 'application/json',
						Authorization: token ? `Bearer ${token}` : undefined,
						...options.headers,
					},
				})
				if (res.status === 401) {
					const newToken = await refreshAccessToken()
					if (!newToken) throw new Error('unauthorized')
					return attempt(newToken)
				}
				if (!res.ok) {
					// try to read body if JSON for debugging
					let txt = ''
					try {
						txt = await res.text()
					} catch {}
					const err = new Error(`Request failed: ${res.status} ${txt}`)
					err.status = res.status
					throw err
				}
				return res
			}
			return attempt(accessToken)
		},
		[accessToken, refreshAccessToken]
	)
	// -----------------------------------------------------

	// ---------- Fetch all data ----------
	const fetchData = useCallback(async () => {
		try {
			setLoading(true)

			const [studentsRes, paymentsRes, coursesRes, groupsRes] =
				await Promise.all([
					makeRequest(`${API_BASE}${STUDENTS_ENDPOINT}`),
					makeRequest(`${API_BASE}${PAYMENT_ENDPOINT}`),
					makeRequest(`${API_BASE}${COURSES_ENDPOINT}`),
					makeRequest(`${API_BASE}${GROUPS_ENDPOINT}`),
				])

			const studentsData = await studentsRes.json()
			const paymentsData = await paymentsRes.json()
			const coursesData = await coursesRes.json()
			const groupsData = await groupsRes.json()

			// If your API returns wrapper { data: [...] } adjust here:
			// const paymentsArr = paymentsData.data || paymentsData;
			const studentsArr = Array.isArray(studentsData)
				? studentsData
				: studentsData
			const paymentsArr = Array.isArray(paymentsData)
				? paymentsData
				: paymentsData
			const coursesArr = Array.isArray(coursesData) ? coursesData : coursesData
			const groupsArr = Array.isArray(groupsData) ? groupsData : groupsData

			setStudents(studentsArr || [])
			setNotFilteredPayments(paymentsArr || [])
			setPayments(paymentsArr || [])
			setCourses(coursesArr || [])
			setGroups(groupsArr || [])

			// build previous month stats example (same idea as your initial code)
			const now = new Date()
			const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
			const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

			const lastMonthPayments = (paymentsArr || []).filter(p => {
				const d = new Date(p[PAYMENT_DATE_FIELD])
				return d >= lastMonthStart && d <= lastMonthEnd
			})

			setPreviousStats({
				total: (studentsArr?.length || 0) * 0.9,
				active:
					(studentsArr?.filter(s => s.status === 'active').length || 0) * 0.9,
				paid: (studentsArr?.filter(s => s.paid === true).length || 0) * 1.1,
				revenue: lastMonthPayments.reduce((sum, p) => {
					const v = parseInt(p.amount) || 0
					return sum + v
				}, 0),
			})
		} catch (err) {
			// keep logging but do not crash UI
			// eslint-disable-next-line no-console
			console.error('fetchData error', err)
		} finally {
			setLoading(false)
		}
	}, [makeRequest])

	useEffect(() => {
		fetchData()
	}, [fetchData])

	// ---------- Derived / computed data (useMemo) ----------
	const totalStudents = useMemo(() => students.length, [students])
	const activeStudents = useMemo(
		() => students.filter(s => s.status === 'active').length,
		[students]
	)
	const paidStudents = useMemo(
		() => students.filter(s => s.paid === true).length,
		[students]
	)

	// paymentsFiltered: apply "this month" filter if set
	const paymentsFiltered = useMemo(() => {
		if (!Array.isArray(payments)) return []
		if (!showOnlyThisMonth) return payments

		const now = new Date()
		const month = now.getMonth()
		const year = now.getFullYear()

		return payments.filter(p => {
			const raw = p[PAYMENT_DATE_FIELD] || p.date_of_payment || p.date
			if (!raw) return false
			const d = new Date(raw)
			return d.getMonth() === month && d.getFullYear() === year
		})
	}, [payments, showOnlyThisMonth])

	// totalRevenue based on filtered payments (so charts and cards show the same)
	const totalRevenue = useMemo(
		() =>
			paymentsFiltered.reduce((sum, p) => {
				const v = parseInt(p.amount)
				return sum + (isNaN(v) ? 0 : v)
			}, 0),
		[paymentsFiltered]
	)

	// Growth calculations
	const computeGrowth = (current, prev) => {
		if (!prev || prev === 0) return '0.00'
		return (((current - prev) / prev) * 100).toFixed(2)
	}

	const totalGrowth = computeGrowth(totalStudents, previousStats.total)
	const activeGrowth = computeGrowth(activeStudents, previousStats.active)
	const paidGrowth = computeGrowth(paidStudents, previousStats.paid)
	const revenueGrowth = computeGrowth(totalRevenue, previousStats.revenue)

	// Monthly aggregation for charts (for current year)
	const monthlyPayments = useMemo(() => {
		// create 12 months
		const months = Array.from({ length: 12 }, (_, i) => ({
			month: i,
			total: 0,
		}))
		const yearNow = new Date().getFullYear()
		;(payments || []).forEach(p => {
			const raw = p[PAYMENT_DATE_FIELD] || p.date_of_payment || p.date
			if (!raw) return
			const d = new Date(raw)
			if (d.getFullYear() !== yearNow) return // only current year
			const m = d.getMonth()
			const amount = parseInt(p.amount)
			months[m].total += isNaN(amount) ? 0 : amount
		})

		const labels = [
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

		return months.map((m, idx) => ({ month: labels[idx], total: m.total }))
	}, [payments])

	// Course distribution (students counted uniquely per group)
	const courseDistribution = useMemo(() => {
		if (!Array.isArray(courses) || !Array.isArray(groups)) return []

		const courseMap = {}
		courses.forEach(c => {
			const name = c.name || c.title || 'Unknown'
			courseMap[name] = new Set()
		})

		const uniqueStudents = new Set()

		;(groups || []).forEach(g => {
			const courseName = g.course || g.courseName || ''
			if (!courseName || !courseMap[courseName]) return
			const arr = Array.isArray(g.students) ? g.students : []
			arr.forEach(sid => {
				courseMap[courseName].add(sid)
				uniqueStudents.add(sid)
			})
		})

		const totalForCalc =
			uniqueStudents.size > 0 ? uniqueStudents.size : totalStudents

		const result = Object.keys(courseMap)
			.map(name => {
				const count = courseMap[name].size
				const percentage = totalForCalc > 0 ? (count / totalForCalc) * 100 : 0
				return { name, count, percentage: Math.round(percentage) }
			})
			.filter(c => c.count > 0)

		// normalize if rounding error
		let sumPerc = result.reduce((s, r) => s + r.percentage, 0)
		if (sumPerc !== 100 && result.length > 0) {
			result[0].percentage = result[0].percentage + (100 - sumPerc)
		}

		return result
	}, [courses, groups, totalStudents])
	// -------------------------------------------------------

	// ----------------- Utilities -----------------
	const formatCurrency = amount => {
		const n = Number(amount) || 0
		return new Intl.NumberFormat('uz-UZ').format(n) + ' UZS'
	}

	const formatRevenueShort = amount => {
		const n = Number(amount) || 0
		if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
		if (n >= 1000) return Math.round(n / 1000) + 'K'
		return n
	}
	// ---------------------------------------------

	// --------------- CSV Export ------------------
	const exportToCSV = () => {
		const rows = [
			['ID', 'Ism', 'Familiya', 'Telefon', 'Holati', 'Tolov', 'Balans'],
			...students.map((s, i) => [
				i + 1,
				s.name || '',
				s.surname || '',
				s.student_phone || '',
				s.status === 'active' ? 'Faol' : 'Nofaol',
				s.paid ? 'Toʻlangan' : 'Qarzdor',
				s.balance || 0,
			]),
		]
		const csv = rows
			.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
			.join('\n')
		const blob = new Blob([csv], { type: 'text/csv' })
		const link = document.createElement('a')
		link.href = URL.createObjectURL(blob)
		link.download = `talabalar_${new Date().toISOString().split('T')[0]}.csv`
		link.click()
	}
	// ----------------------------------------------

	// -------------- Chart datasets ----------------
	const lineChartData = useMemo(
		() => ({
			labels: monthlyPayments.map(m => m.month),
			datasets: [
				{
					label: "Oylar bo'yicha tushum (ming so'm)",
					data: monthlyPayments.map(m => Math.round(m.total)),
					borderColor: '#0066cc',
					backgroundColor: 'rgba(0,102,204,0.08)',
					tension: 0.35,
					fill: true,
					pointRadius: 0,
					borderWidth: 2,
				},
			],
		}),
		[monthlyPayments]
	)

	const doughnutData = useMemo(() => {
		const paidCount = paymentsFiltered.length
		const unpaidCount = Math.max(0, totalStudents - (paidCount || 0))
		return {
			labels: ['Toʻlangan', 'Toʻlanmagan'],
			datasets: [
				{
					data: [paidCount, unpaidCount],
					backgroundColor: ['#0066cc', '#e5e7eb'],
					borderWidth: 0,
				},
			],
		}
	}, [paymentsFiltered, totalStudents])

	// ------------------------------------------------

	// If loading show spinner
	if (loading) {
		return (
			<div className='flex items-center justify-center h-screen bg-gray-50'>
				<div className='animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent'></div>
			</div>
		)
	}

	// Filter students for list
	const filteredStudents = students.filter(s => {
		const matchSearch =
			s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			s.surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			(s.student_phone || '').includes(searchTerm)
		const matchStatus =
			selectedStatus === 'Barchasi' ||
			(selectedStatus === 'Faol' && s.status === 'active') ||
			(selectedStatus === 'Nofaol' && s.status === 'inactive') ||
			(selectedStatus === 'Toʻlangan' && s.paid === true) ||
			(selectedStatus === 'Qarzdor' && s.paid === false)
		return matchSearch && matchStatus
	})

	const paidPercentage =
		totalStudents > 0 ? ((paidStudents / totalStudents) * 100).toFixed(1) : 0
	const unpaidPercentage =
		totalStudents > 0
			? (((totalStudents - paidStudents) / totalStudents) * 100).toFixed(1)
			: 0

	// ---------- JSX (kept UI/layout similar to your original) ----------
	return (
		<div className='min-h-screen'>
			<div className='bg-white border-b border-gray-200'>
				<div className='px-8 py-4'>
					<div className='flex items-center justify-between'>
						<div className='flex space-x-8'>
							{['dashboard', 'students', 'payments'].map(tab => (
								<button
									key={tab}
									onClick={() => setActiveTab(tab)}
									className={`px-1 py-2 text-sm font-medium border-b-2 transition-colors ${
										activeTab === tab
											? 'border-blue-600 text-gray-900'
											: 'border-transparent text-gray-500 hover:text-gray-700'
									}`}
								>
									{tab === 'dashboard'
										? 'Dashboards'
										: tab === 'students'
										? 'Talabalar'
										: 'Toʻlovlar'}
								</button>
							))}
						</div>
						<div className='text-sm text-gray-500'>
							<label className='mr-3 text-xs text-gray-600'>Sana:</label>
							<select
								value={showOnlyThisMonth ? 'thisMonth' : 'all'}
								onChange={e =>
									setShowOnlyThisMonth(e.target.value === 'thisMonth')
								}
								className='px-2 py-1 border rounded'
							>
								<option value='thisMonth'>Hozirgi oy (Hozirgi yil)</option>
								<option value='all'>Barcha to'lovlar</option>
							</select>
						</div>
					</div>
				</div>
			</div>

			<div className='px-8 py-6'>
				{activeTab === 'dashboard' && (
					<div className='space-y-6'>
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
							<div className='bg-white rounded-xl p-6 border border-gray-200 shadow-sm'>
								<p className='text-sm text-gray-600 mb-2'>Jami talabalar</p>
								<div className='flex items-end justify-between'>
									<h3 className='text-4xl font-bold text-gray-900'>
										{totalStudents}
									</h3>
									<span
										className={`text-xs font-medium flex items-center px-2 py-1 rounded ${
											parseFloat(totalGrowth) >= 0
												? 'text-green-600 bg-green-50'
												: 'text-red-600 bg-red-50'
										}`}
									>
										{parseFloat(totalGrowth) >= 0 ? '+' : ''}
										{totalGrowth}%{' '}
										<TrendingUp
											className={`w-3 h-3 ml-1 ${
												parseFloat(totalGrowth) < 0 ? 'rotate-180' : ''
											}`}
										/>
									</span>
								</div>
							</div>

							<div className='bg-white rounded-xl p-6 border border-gray-200 shadow-sm'>
								<p className='text-sm text-gray-600 mb-2'>Faol talabalar</p>
								<div className='flex items-end justify-between'>
									<h3 className='text-4xl font-bold text-gray-900'>
										{activeStudents}
									</h3>
									<span
										className={`text-xs font-medium flex items-center px-2 py-1 rounded ${
											parseFloat(activeGrowth) >= 0
												? 'text-green-600 bg-green-50'
												: 'text-red-600 bg-red-50'
										}`}
									>
										{parseFloat(activeGrowth) >= 0 ? '+' : ''}
										{activeGrowth}%{' '}
										<TrendingUp
											className={`w-3 h-3 ml-1 ${
												parseFloat(activeGrowth) < 0 ? 'rotate-180' : ''
											}`}
										/>
									</span>
								</div>
							</div>

							<div className='bg-white rounded-xl p-6 border border-gray-200 shadow-sm'>
								<p className='text-sm text-gray-600 mb-2'>Toʻlagan talabalar</p>
								<div className='flex items-end justify-between'>
									<h3 className='text-4xl font-bold text-gray-900'>
										{paidStudents}
									</h3>
									<span
										className={`text-xs font-medium flex items-center px-2 py-1 rounded ${
											parseFloat(paidGrowth) >= 0
												? 'text-green-600 bg-green-50'
												: 'text-red-600 bg-red-50'
										}`}
									>
										{parseFloat(paidGrowth) >= 0 ? '+' : ''}
										{paidGrowth}%{' '}
										<TrendingUp
											className={`w-3 h-3 ml-1 ${
												parseFloat(paidGrowth) < 0 ? 'rotate-180' : ''
											}`}
										/>
									</span>
								</div>
							</div>

							<div className='bg-white rounded-xl p-6 border border-gray-200 shadow-sm'>
								<p className='text-sm text-gray-600 mb-2'>Umumiy tushum</p>
								<div className='flex items-end justify-between'>
									<h3 className='text-4xl font-bold text-gray-900'>
										{formatRevenueShort(totalRevenue)}
									</h3>
									<span
										className={`text-xs font-medium flex items-center px-2 py-1 rounded ${
											parseFloat(revenueGrowth) >= 0
												? 'text-green-600 bg-green-50'
												: 'text-red-600 bg-red-50'
										}`}
									>
										{parseFloat(revenueGrowth) >= 0 ? '+' : ''}
										{revenueGrowth}%{' '}
										<TrendingUp
											className={`w-3 h-3 ml-1 ${
												parseFloat(revenueGrowth) < 0 ? 'rotate-180' : ''
											}`}
										/>
									</span>
								</div>
							</div>
						</div>

						<div className='bg-white rounded-xl p-6 border border-gray-200 shadow-sm'>
							<div className='flex items-center justify-end mb-6'>
								<div className='flex space-x-2'></div>
							</div>
							<div className='h-80'>
								<Line
									data={lineChartData}
									options={{
										responsive: true,
										maintainAspectRatio: false,
										plugins: { legend: { display: false } },
										scales: {
											y: {
												beginAtZero: true,
												grid: { color: 'rgba(0,0,0,0.05)' },
												ticks: { color: '#9ca3af' },
											},
											x: {
												grid: { display: false },
												ticks: { color: '#9ca3af' },
											},
										},
									}}
								/>
							</div>
						</div>

						<div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
							<div className='bg-white rounded-xl p-6 border border-gray-200 shadow-sm'>
								<h3 className='text-base font-semibold text-gray-900 mb-6'>
									Toʻlov holati
								</h3>
								<div className='flex items-center justify-between'>
									<div className='w-64 h-64'>
										<Doughnut
											data={doughnutData}
											options={{
												responsive: true,
												maintainAspectRatio: true,
												plugins: { legend: { display: false } },
												cutout: '70%',
											}}
										/>
									</div>
									<div className='space-y-4'>
										<div className='flex items-center'>
											<div className='w-3 h-3 rounded-full bg-blue-600 mr-3'></div>
											<span className='text-sm text-gray-700'>
												Toʻlangan {paidPercentage}%
											</span>
										</div>
										<div className='flex items-center'>
											<div className='w-3 h-3 rounded-full bg-gray-300 mr-3'></div>
											<span className='text-sm text-gray-700'>
												Toʻlanmagan {unpaidPercentage}%
											</span>
										</div>
									</div>
								</div>
							</div>

							<div className='bg-white rounded-xl p-6 border border-gray-200 shadow-sm'>
								<h3 className='text-base font-semibold text-gray-900 mb-6'>
									Kurslar bo'yicha
								</h3>
								<div className='space-y-4'>
									{courseDistribution.length > 0 ? (
										courseDistribution.map((course, i) => (
											<div
												key={i}
												className='flex items-center justify-between'
											>
												<span className='text-sm text-gray-800 w-48 truncate font-medium'>
													{course.name}
												</span>
												<div className='flex items-center space-x-3 flex-1'>
													<div className='flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden'>
														<div
															className='h-full bg-blue-600 rounded-full transition-all duration-500'
															style={{ width: `${course.percentage}%` }}
														/>
													</div>
													<span className='text-sm text-gray-700 w-12 text-right font-medium'>
														{course.percentage}%
													</span>
												</div>
											</div>
										))
									) : (
										<div className='text-center text-gray-500 py-8'>
											Ma'lumot topilmadi
										</div>
									)}
								</div>
							</div>
						</div>

						<div className='bg-white rounded-xl p-6 border border-gray-200 shadow-sm'>
							<h3 className='text-base font-semibold text-gray-900 mb-6'>
								Toʻlovlar tarixi
							</h3>
							<table className='w-full'>
								<thead className='border-b border-gray-200'>
									<tr>
										<th className='text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase'>
											TALABA
										</th>
										<th className='text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase'>
											MIQDOR
										</th>
										<th className='text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase'>
											SANA
										</th>
									</tr>
								</thead>
								<tbody>
									{paymentsFiltered.slice(0, 5).map(p => {
										const student = students.find(
											s =>
												s.student_id === p.paid_student_id ||
												s._id === p.paid_student_id
										)
										return (
											<tr
												key={p._id || Math.random()}
												className='border-b border-gray-100'
											>
												<td className='py-4 px-4 text-sm text-gray-900'>
													{student
														? `${student.name} ${student.surname}`
														: p.paid_student_id}
												</td>
												<td className='py-4 px-4 text-sm text-gray-900'>
													{formatCurrency(p.amount)}
												</td>
												<td className='py-4 px-4 text-sm text-gray-500'>
													{new Date(
														p[PAYMENT_DATE_FIELD] || p.date_of_payment || p.date
													).toLocaleDateString('uz-UZ')}
												</td>
											</tr>
										)
									})}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{activeTab === 'students' && (
					<>
						<div className='bg-white rounded-xl p-6 border border-gray-200 shadow-sm mb-6'>
							<div className='flex items-center gap-4'>
								<div className='relative'>
									<Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4' />
									<input
										type='text'
										placeholder='Qidirish...'
										value={searchTerm}
										onChange={e => setSearchTerm(e.target.value)}
										className='pl-10 pr-4 py-2 border border-gray-200 rounded-lg w-64 focus:outline-none focus:border-blue-600'
									/>
								</div>
								<select
									value={selectedStatus}
									onChange={e => setSelectedStatus(e.target.value)}
									className='px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-600'
								>
									<option>Barchasi</option>
									<option>Faol</option>
									<option>Nofaol</option>
									<option>Toʻlangan</option>
									<option>Qarzdor</option>
								</select>
								<button
									onClick={exportToCSV}
									className='px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors'
								>
									<Download className='w-4 h-4' /> Export
								</button>
							</div>
						</div>

						<div className='bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden'>
							<table className='w-full'>
								<thead className='bg-gray-50 border-b border-gray-200'>
									<tr>
										{[
											'Talaba',
											'Telefon',
											'Holati',
											'Toʻlov',
											'Balans',
											'Amallar',
										].map(h => (
											<th
												key={h}
												className='px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase'
											>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody className='divide-y divide-gray-100'>
									{filteredStudents.map(s => (
										<tr
											key={s._id}
											className='hover:bg-gray-50 transition-colors'
										>
											<td className='px-6 py-4'>
												<div className='flex items-center'>
													<img
														src={s.imgURL || 'https://via.placeholder.com/40'}
														className='h-10 w-10 rounded-full object-cover'
														alt=''
													/>
													<div className='ml-4'>
														<div className='text-sm font-medium text-gray-900'>
															{s.name} {s.surname}
														</div>
													</div>
												</div>
											</td>
											<td className='px-6 py-4 text-sm text-gray-600'>
												{s.student_phone}
											</td>
											<td className='px-6 py-4'>
												<span
													className={`px-3 py-1 text-xs font-medium rounded-full ${
														s.status === 'active'
															? 'bg-green-100 text-green-700'
															: 'bg-gray-100 text-gray-700'
													}`}
												>
													{s.status === 'active' ? 'Faol' : 'Nofaol'}
												</span>
											</td>
											<td className='px-6 py-4'>
												<span
													className={`px-3 py-1 text-xs font-medium rounded-full ${
														s.paid
															? 'bg-green-100 text-green-700'
															: 'bg-red-100 text-red-700'
													}`}
												>
													{s.paid ? 'Toʻlangan' : 'Qarzdor'}
												</span>
											</td>
											<td className='px-6 py-4 text-sm font-medium text-gray-900'>
												{s.balance || 0} UZS
											</td>
											<td className='px-6 py-4'>
												<button className='p-2 text-gray-400 hover:text-blue-600 rounded-lg transition-colors'>
													<Eye className='w-4 h-4' />
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</>
				)}

				{activeTab === 'payments' && (
					<div className='bg-white rounded-xl p-6 border border-gray-200 shadow-sm'>
						<h3 className='text-lg font-semibold text-gray-900 mb-6'>
							Toʻlovlar tarixi
						</h3>
						<table className='w-full'>
							<thead className='bg-gray-50 border-b border-gray-200'>
								<tr>
									{['TALABA', 'MIQDOR', 'SANA'].map(h => (
										<th
											key={h}
											className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase'
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody className='divide-y divide-gray-100'>
								{(paymentsFiltered || []).map(p => {
									const student = students.find(
										s =>
											s.student_id === p.paid_student_id ||
											s._id === p.paid_student_id
									)
									return (
										<tr
											key={p._id || Math.random()}
											className='hover:bg-gray-50'
										>
											<td className='px-6 py-4 text-sm text-gray-900'>
												{student
													? `${student.name || ''} ${student.surname || ''}`
													: p.paid_student_id}
											</td>
											<td className='px-6 py-4 text-sm text-gray-900'>
												{formatCurrency(p.amount)}
											</td>
											<td className='px-6 py-4 text-sm text-gray-500'>
												{new Date(
													p[PAYMENT_DATE_FIELD] || p.date_of_payment || p.date
												).toLocaleDateString('uz-UZ')}
											</td>
										</tr>
									)
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	)
}

export default Hisobotlar

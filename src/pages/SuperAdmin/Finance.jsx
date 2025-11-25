import React, { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
	ResponsiveContainer,
	PieChart,
	Pie,
	Cell,
	Tooltip as RTooltip,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Legend,
	LineChart,
	Line,
} from 'recharts'

const API_BASE = 'https://zuhrstar-production.up.railway.app/api'
const REFRESH_URL = `${API_BASE}/auth/refresh`

// ---- Enhanced API client with better refresh token handling ----
const createApiClient = (getTokens, onTokens, onLogout) => {
	let isRefreshing = false
	let refreshQueue = []

	const processQueue = (error, token = null) => {
		refreshQueue.forEach(({ resolve, reject }) => {
			if (error) {
				reject(error)
			} else {
				resolve(token)
			}
		})
		refreshQueue = []
	}

	const makeRequest = async (url, options = {}) => {
		const { accessToken } = getTokens()

		const config = {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				...(accessToken && { Authorization: `Bearer ${accessToken}` }),
			},
			...options,
		}

		try {
			const response = await fetch(url, config)

			if (response.status === 401 && !options._retry) {
				if (isRefreshing) {
					return new Promise((resolve, reject) => {
						refreshQueue.push({ resolve, reject })
					}).then(token => {
						return makeRequest(url, {
							...options,
							headers: {
								...options.headers,
								Authorization: `Bearer ${token}`,
							},
							_retry: true,
						})
					})
				}

				isRefreshing = true
				options._retry = true

				try {
					const { refreshToken } = getTokens()
					if (!refreshToken) {
						throw new Error('No refresh token available')
					}

					const refreshResponse = await fetch(REFRESH_URL, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ refreshToken }),
					})

					if (!refreshResponse.ok) {
						throw new Error('Refresh token expired')
					}

					const refreshData = await refreshResponse.json()
					const newAccessToken =
						refreshData?.accessToken || refreshData?.access_token
					const newRefreshToken =
						refreshData?.refreshToken ||
						refreshData?.refresh_token ||
						refreshToken

					if (!newAccessToken) {
						throw new Error('No access token in refresh response')
					}

					onTokens({
						accessToken: newAccessToken,
						refreshToken: newRefreshToken,
					})

					processQueue(null, newAccessToken)

					return makeRequest(url, {
						...options,
						headers: {
							...options.headers,
							Authorization: `Bearer ${newAccessToken}`,
						},
						_retry: true,
					})
				} catch (refreshError) {
					processQueue(refreshError, null)
					onLogout()
					throw refreshError
				} finally {
					isRefreshing = false
				}
			}

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			return response.json()
		} catch (error) {
			throw error
		}
	}

	return {
		get: endpoint => makeRequest(`${API_BASE}${endpoint}`),
		post: (endpoint, data) =>
			makeRequest(`${API_BASE}${endpoint}`, {
				method: 'POST',
				body: JSON.stringify(data),
			}),
	}
}

// ---- Helper functions ----
const n = v => {
	if (v === null || v === undefined || v === '') return 0
	const num = Number(v)
	return Number.isFinite(num) ? num : 0
}

const money = v => {
	try {
		return n(v).toLocaleString('uz-UZ') + " so'm"
	} catch {
		return `${n(v)} so'm`
	}
}

const isPaid = student => {
	if (typeof student?.paid === 'boolean') return student.paid
	if (typeof student?.isPaid === 'boolean') return student.isPaid
	const status = String(
		student?.paymentStatus || student?.status || ''
	).toLowerCase()
	return ['paid', 'tolagan', "to'lagan"].includes(status)
}

const isActive = student => {
	const status = String(student?.status || '').toLowerCase()
	return ['active', 'faol', 'aktiv'].includes(status)
}

export default function Finance() {
	const dispatch = useDispatch()
	const accessToken = useSelector(s => s?.auth?.accessToken)
	const refreshToken = useSelector(s => s?.auth?.refreshToken)

	const [students, setStudents] = useState([])
	const [salaries, setSalaries] = useState([])
	const [checks, setChecks] = useState([])
	const [teachers, setTeachers] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [updatedAt, setUpdatedAt] = useState(null)
	const [showSalaryForm, setShowSalaryForm] = useState(false)
	const [salaryForm, setSalaryForm] = useState({
		teacherId: '',
		month: new Date().getMonth() + 1,
		year: new Date().getFullYear(),
		baseSalary: '',
		bonuses: '',
		deductions: '',
		notes: '',
	})
	const [submitting, setSubmitting] = useState(false)
	const [studentsMap, setStudentsMap] = useState({})

	const api = useMemo(
		() =>
			createApiClient(
				() => ({ accessToken, refreshToken }),
				({ accessToken: a, refreshToken: r }) => {
					dispatch({
						type: 'auth/setTokens',
						payload: { accessToken: a, refreshToken: r },
					})
				},
				() => {
					dispatch({ type: 'auth/logout' })
				}
			),
		[accessToken, refreshToken, dispatch]
	)

	useEffect(() => {
		let isMounted = true

		const fetchData = async () => {
			try {
				setLoading(true)
				setError('')

				const [studentsData, salariesData, checksData, teachersData] =
					await Promise.allSettled([
						api.get('/students'),
						api.get('/salaries'),
						api.get('/checks'),
						api.get('/teachers'),
					])

				if (!isMounted) return

				if (studentsData.status === 'fulfilled') {
					const students =
						studentsData.value?.students || studentsData.value || []
					setStudents(Array.isArray(students) ? students : [])
				} else {
					console.error('Students fetch failed:', studentsData.reason)
					setStudents([])
				}

				if (salariesData.status === 'fulfilled') {
					const salaries =
						salariesData.value?.salaries || salariesData.value || []
					setSalaries(Array.isArray(salaries) ? salaries : [])
				} else {
					console.error('Salaries fetch failed:', salariesData.reason)
					setSalaries([])
				}

				if (checksData.status === 'fulfilled') {
					const checks = checksData.value?.checks || checksData.value || []
					const checksArray = Array.isArray(checks) ? checks : []
					setChecks(checksArray)

					// Fetch student details for each check
					const studentIds = [
						...new Set(checksArray.map(c => c.paid_student_id).filter(Boolean)),
					]
					const studentsMapTemp = {}

					await Promise.allSettled(
						studentIds.map(async studentId => {
							try {
								const studentData = await api.get(`/students/${studentId}`)
								studentsMapTemp[studentId] = studentData
							} catch (err) {
								console.error(`Failed to fetch student ${studentId}:`, err)
								studentsMapTemp[studentId] = null
							}
						})
					)

					if (isMounted) {
						setStudentsMap(studentsMapTemp)
					}
				} else {
					console.error('Checks fetch failed:', checksData.reason)
					setChecks([])
				}

				if (teachersData.status === 'fulfilled') {
					const teachers =
						teachersData.value?.teachers || teachersData.value || []
					setTeachers(Array.isArray(teachers) ? teachers : [])
				} else {
					console.error('Teachers fetch failed:', teachersData.reason)
					setTeachers([])
				}

				setUpdatedAt(new Date())
			} catch (e) {
				if (isMounted) {
					setError(e?.message || "Ma'lumotlarni yuklashda xatolik")
				}
			} finally {
				if (isMounted) {
					setLoading(false)
				}
			}
		}

		fetchData()
		return () => {
			isMounted = false
		}
	}, [api])

	// Calculate student statistics
	const studentStats = useMemo(() => {
		const total = students.length
		const paid = students.filter(isPaid).length
		const unpaid = total - paid
		const active = students.filter(isActive).length
		const inactive = total - active
		const totalBalance = students.reduce(
			(sum, student) => sum + n(student?.balance || student?.amount),
			0
		)

		return { total, paid, unpaid, active, inactive, totalBalance }
	}, [students])

	// Calculate totals
	const totals = useMemo(() => {
		const totalSalaries = salaries.reduce(
			(sum, s) => sum + n(s?.finalSalary || 0),
			0
		)

		const successfulChecks = checks.filter(check => {
			const status = String(check?.status || '').toLowerCase()
			return (
				!status ||
				['paid', 'success', 'tasdiqlandi', 'tolagan'].includes(status)
			)
		})

		const totalRevenue = successfulChecks.reduce((sum, check) => {
			return sum + n(check?.amount || check?.sum || check?.total)
		}, 0)

		return { totalSalaries, totalRevenue }
	}, [salaries, checks])

	// Chart data
	const paymentChartData = useMemo(
		() => [
			{ name: "To'lagan", value: studentStats.paid, color: '#10B981' },
			{ name: "To'lamagan", value: studentStats.unpaid, color: '#EF4444' },
		],
		[studentStats]
	)

	const statusChartData = useMemo(
		() => [
			{ name: 'Faol', count: studentStats.active },
			{ name: 'Nofaol', count: studentStats.inactive },
		],
		[studentStats]
	)

	const salaryLineData = useMemo(() => {
		return salaries.map(s => ({
			name: s?.teacher?.fullName || "Noma'lum",
			salary: n(s?.finalSalary || 0),
			date: `${s?.month || '?'}/${s?.year || '?'}`,
			month: s?.month || 0,
			year: s?.year || 0,
		}))
	}, [salaries])

	const revenueMonthly = useMemo(() => {
		const monthlyMap = new Map()

		checks.forEach(check => {
			const dateStr =
				check?.date ||
				check?.createdAt ||
				check?.paidAt ||
				check?.updatedAt ||
				check?.date_Of_Create ||
				check?.date_of_payment
			const date = new Date(dateStr)

			if (!isNaN(date.getTime())) {
				const monthKey = `${date.getFullYear()}-${String(
					date.getMonth() + 1
				).padStart(2, '0')}`
				const amount = n(check?.amount || check?.sum || check?.total)
				monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + amount)
			}
		})

		return Array.from(monthlyMap.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([month, revenue]) => ({ month, revenue }))
	}, [checks])

	const handleSalaryFormChange = (field, value) => {
		setSalaryForm(prev => ({ ...prev, [field]: value }))
	}

	const handleCreateSalary = async e => {
		e.preventDefault()

		if (!salaryForm.teacherId) {
			alert("O'qituvchini tanlang")
			return
		}

		setSubmitting(true)
		try {
			const payload = {
				teacherId: salaryForm.teacherId,
				month: Number(salaryForm.month),
				year: Number(salaryForm.year),
				baseSalary: Number(salaryForm.baseSalary) || 0,
				bonuses: Number(salaryForm.bonuses) || 0,
				deductions: Number(salaryForm.deductions) || 0,
				notes: salaryForm.notes || '',
			}

			await api.post('/salaries/create', payload)

			// Reset form
			setSalaryForm({
				teacherId: '',
				month: new Date().getMonth() + 1,
				year: new Date().getFullYear(),
				baseSalary: '',
				bonuses: '',
				deductions: '',
				notes: '',
			})

			setShowSalaryForm(false)

			// Reload page to show new data
			window.location.reload()
		} catch (err) {
			alert(err?.message || "Oylik qo'shishda xatolik yuz berdi")
		} finally {
			setSubmitting(false)
		}
	}

	const emptyState = (
		<div className='grid place-items-center h-80 text-center'>
			<div className='space-y-2'>
				<div className='text-3xl'>🗂</div>
				<p className='text-gray-500'>Hozircha ma'lumot yo'q</p>
			</div>
		</div>
	)

	// Loading state
	if (loading) {
		return (
			<div className='min-h-screen overflow-x-hidden bg-gray-50 p-2 sm:p-4 md:p-6'>
				<div className='max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8'>
					{/* Header skeleton */}
					<div className='pt-2'>
						<div className='h-8 sm:h-10 md:h-12 w-64 sm:w-80 bg-gray-200 rounded animate-pulse mb-2' />
						<div className='h-4 sm:h-5 w-48 sm:w-64 bg-gray-200 rounded animate-pulse' />
					</div>

					{/* Stats cards skeleton */}
					<div className='grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6'>
						{Array.from({ length: 4 }).map((_, i) => (
							<div
								key={i}
								className='rounded-lg sm:rounded-xl bg-white border border-gray-200 p-3 sm:p-4 lg:p-5'
							>
								<div className='h-4 w-20 bg-gray-200 rounded animate-pulse mb-3' />
								<div className='h-8 sm:h-10 w-16 bg-gray-200 rounded animate-pulse mb-2' />
								<div className='h-1 sm:h-1.5 w-full bg-gray-200 rounded-full animate-pulse' />
							</div>
						))}
					</div>

					{/* Chart skeleton */}
					<div className='rounded-lg sm:rounded-xl bg-white border border-gray-200 p-4 sm:p-6'>
						<div className='h-6 w-48 bg-gray-200 rounded animate-pulse mb-4' />
						<div className='h-64 sm:h-80 bg-gray-100 rounded animate-pulse' />
					</div>

					{/* Two charts skeleton */}
					<div className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
						{Array.from({ length: 2 }).map((_, i) => (
							<div
								key={i}
								className='rounded-lg sm:rounded-xl bg-white border border-gray-200 p-4 sm:p-6'
							>
								<div className='h-6 w-40 bg-gray-200 rounded animate-pulse mb-4' />
								<div className='h-64 sm:h-80 bg-gray-100 rounded animate-pulse' />
							</div>
						))}
					</div>

					{/* Loading indicator */}
					<div className='text-center py-8'>
						<div className='inline-flex items-center gap-3 text-gray-600'>
							<div className='w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin' />
							<span className='text-sm'>Ma'lumotlar yuklanmoqda...</span>
						</div>
					</div>
				</div>
			</div>
		)
	}

	// Error state
	if (error) {
		return (
			<div className='min-h-screen overflow-x-hidden bg-gray-50 p-2 sm:p-4 md:p-6'>
				<div className='min-h-[60vh] grid place-items-center px-2'>
					<div className='flex flex-col sm:flex-row items-center gap-4 rounded-lg p-4 sm:p-6 bg-white shadow-lg max-w-lg border border-gray-200'>
						<div className='text-2xl sm:text-3xl'>⚠️</div>
						<div className='text-center sm:text-left'>
							<h3 className='text-lg font-semibold text-gray-800'>
								Xatolik yuz berdi
							</h3>
							<p className='text-red-600 mb-3 text-sm sm:text-base'>{error}</p>
							<button
								onClick={() => window.location.reload()}
								className='inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 px-4 sm:px-5 py-2 sm:py-2.5 text-white font-semibold text-sm sm:text-base transition-all duration-200 shadow hover:shadow-md'
							>
								Qayta urinish
							</button>
						</div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen overflow-x-hidden bg-gray-50 p-2 sm:p-4 md:p-6'>
			<div className='max-w-7xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8'>
				{/* Header */}
				<header className='flex flex-col gap-3 pt-2'>
					<div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3'>
						<div>
							<h1 className='text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-1'>
								Moliyaviy boshqaruv
							</h1>
							<p className='text-sm sm:text-base text-gray-600'>
								O'quvchilar to'lovi, o'qituvchilar oyligi va tushumlar tahlili
							</p>
						</div>
						{updatedAt && (
							<span className='text-xs sm:text-sm text-gray-600 bg-white border border-gray-200 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg'>
								<span className='hidden sm:inline'>Yangilandi: </span>
								<span className='sm:hidden'>Yangilangan: </span>
								{updatedAt.toLocaleString('uz-UZ', {
									month: 'short',
									day: 'numeric',
									hour: '2-digit',
									minute: '2-digit',
								})}
							</span>
						)}
					</div>
				</header>

				{/* Top stats */}
				<section className='grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 lg:gap-6'>
					<div className='rounded-lg sm:rounded-xl bg-white border border-gray-200 p-3 sm:p-4 lg:p-5 shadow-sm hover:shadow-md transition-all'>
						<div className='flex items-center justify-between mb-2'>
							<span className='text-xs sm:text-sm text-gray-600'>
								Jami o'quvchilar
							</span>
							<svg
								className='w-4 h-4 sm:w-5 sm:h-5 text-gray-400'
								viewBox='0 0 24 24'
								fill='currentColor'
							>
								<path d='M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.95 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z' />
							</svg>
						</div>
						<div className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>
							{studentStats.total}
						</div>
						<div className='mt-2 sm:mt-3 h-1 sm:h-1.5 w-full bg-gray-200 rounded-full'>
							<div className='h-1 sm:h-1.5 bg-gray-600 rounded-full w-full' />
						</div>
					</div>

					<div className='rounded-lg sm:rounded-xl bg-white border border-blue-200 p-3 sm:p-4 lg:p-5 shadow-sm hover:shadow-md transition-all'>
						<div className='flex items-center justify-between mb-2'>
							<span className='text-xs sm:text-sm text-blue-700'>
								Faol o'quvchilar
							</span>
							<svg
								className='w-4 h-4 sm:w-5 sm:h-5 text-blue-500'
								viewBox='0 0 24 24'
								fill='currentColor'
							>
								<path d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4Zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4Z' />
							</svg>
						</div>
						<div className='text-xl sm:text-2xl lg:text-3xl font-bold text-blue-900'>
							{studentStats.active}
						</div>
						<div className='mt-2 sm:mt-3 h-1 sm:h-1.5 w-full bg-blue-200 rounded-full'>
							<div
								className='h-1 sm:h-1.5 bg-blue-600 rounded-full'
								style={{
									width: `${
										studentStats.total > 0
											? (studentStats.active / studentStats.total) * 100
											: 0
									}%`,
								}}
							/>
						</div>
					</div>

					<div className='rounded-lg sm:rounded-xl bg-white border border-green-200 p-3 sm:p-4 lg:p-5 shadow-sm hover:shadow-md transition-all'>
						<div className='flex items-center justify-between mb-2'>
							<span className='text-xs sm:text-sm text-green-700'>
								To'laganlar
							</span>
							<svg
								className='w-4 h-4 sm:w-5 sm:h-5 text-green-600'
								viewBox='0 0 24 24'
								fill='currentColor'
							>
								<path d='M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z' />
							</svg>
						</div>
						<div className='text-xl sm:text-2xl lg:text-3xl font-bold text-green-900'>
							{studentStats.paid}
						</div>
						<div className='mt-2 sm:mt-3 h-1 sm:h-1.5 w-full bg-green-200 rounded-full'>
							<div
								className='h-1 sm:h-1.5 bg-green-600 rounded-full'
								style={{
									width: `${
										studentStats.total > 0
											? (studentStats.paid / studentStats.total) * 100
											: 0
									}%`,
								}}
							/>
						</div>
					</div>

					<div className='rounded-lg sm:rounded-xl bg-white border border-purple-200 p-3 sm:p-4 lg:p-5 shadow-sm hover:shadow-md transition-all'>
						<div className='flex items-center justify-between mb-2'>
							<span className='text-xs sm:text-sm text-purple-700'>
								Umumiy balans
							</span>
							<svg
								className='w-4 h-4 sm:w-5 sm:h-5 text-purple-600'
								viewBox='0 0 24 24'
								fill='currentColor'
							>
								<path d='M11 17h2v-6h3l-4-4-4 4h3zM5 18h14v2H5z' />
							</svg>
						</div>
						<div className='text-lg sm:text-xl lg:text-2xl font-bold text-purple-900'>
							<span className='sm:hidden'>
								{money(studentStats.totalBalance)
									.replace(" so'm", '')
									.substring(0, 8)}
								...
							</span>
							<span className='hidden sm:inline'>
								{money(studentStats.totalBalance)}
							</span>
						</div>
						<div className='mt-2 sm:mt-3 h-1 sm:h-1.5 w-full bg-purple-200 rounded-full'>
							<div className='h-1 sm:h-1.5 bg-purple-600 rounded-full w-[85%]' />
						</div>
					</div>
				</section>

				{/* Salaries Line Chart */}
				<section className='rounded-lg sm:rounded-xl bg-white border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all'>
					<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4'>
						<h3 className='text-base sm:text-lg font-bold text-gray-800'>
							O'qituvchilar oyligi
						</h3>
						<span className='inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs sm:text-sm font-semibold text-blue-800'>
							Jami: {money(totals.totalSalaries)}
						</span>
					</div>
					<div className='h-64 sm:h-80'>
						{salaryLineData.length === 0 ? (
							emptyState
						) : (
							<ResponsiveContainer width='100%' height='100%'>
								<LineChart data={salaryLineData}>
									<CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
									<XAxis
										dataKey='name'
										stroke='#6b7280'
										tick={{ fontSize: window.innerWidth < 640 ? 9 : 12 }}
										angle={window.innerWidth < 640 ? -45 : 0}
										textAnchor={window.innerWidth < 640 ? 'end' : 'middle'}
										height={window.innerWidth < 640 ? 60 : 40}
									/>
									<YAxis
										stroke='#6b7280'
										tick={{ fontSize: window.innerWidth < 640 ? 9 : 12 }}
									/>
									<RTooltip
										formatter={(value, name, props) => [
											money(value),
											`Oylik (${props.payload.date})`,
										]}
										contentStyle={{
											backgroundColor: 'rgba(255, 255, 255, 0.98)',
											border: '1px solid #e5e7eb',
											borderRadius: '8px',
											boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
										}}
									/>
									<Line
										type='monotone'
										dataKey='salary'
										stroke='#3b82f6'
										strokeWidth={window.innerWidth < 640 ? 2 : 3}
										dot={{
											fill: '#3b82f6',
											strokeWidth: 2,
											r: window.innerWidth < 640 ? 3 : 5,
										}}
										activeDot={{
											r: window.innerWidth < 640 ? 5 : 7,
											stroke: '#3b82f6',
											strokeWidth: 2,
										}}
									/>
								</LineChart>
							</ResponsiveContainer>
						)}
					</div>
				</section>

				{/* Charts row 1 */}
				<section className='grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6'>
					<div className='rounded-lg sm:rounded-xl bg-white border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all'>
						<h3 className='text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4'>
							O'quvchilar holati
						</h3>
						<div className='h-64 sm:h-80'>
							{statusChartData.reduce((s, d) => s + d.count, 0) === 0 ? (
								emptyState
							) : (
								<ResponsiveContainer width='100%' height='100%'>
									<BarChart data={statusChartData}>
										<CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
										<XAxis
											dataKey='name'
											stroke='#6b7280'
											tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
										/>
										<YAxis
											stroke='#6b7280'
											tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
										/>
										<RTooltip
											contentStyle={{
												backgroundColor: 'rgba(255, 255, 255, 0.98)',
												border: '1px solid #e5e7eb',
												borderRadius: '8px',
												boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
											}}
										/>
										<Bar dataKey='count' radius={[8, 8, 0, 0]} fill='#3b82f6' />
									</BarChart>
								</ResponsiveContainer>
							)}
						</div>
					</div>

					<div className='rounded-lg sm:rounded-xl bg-white border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all'>
						<h3 className='text-base sm:text-lg font-bold text-gray-800 mb-3 sm:mb-4'>
							O'quvchilar to'lov holati
						</h3>

						<div className='h-64 sm:h-80'>
							{paymentChartData.reduce((s, d) => s + d.value, 0) === 0 ? (
								emptyState
							) : (
								<ResponsiveContainer width='100%' height='100%'>
									<PieChart>
										<Pie
											data={paymentChartData}
											dataKey='value'
											innerRadius={40}
											outerRadius={window.innerWidth < 640 ? 80 : 120}
											label={({ name, value }) =>
												window.innerWidth < 640
													? `${value}`
													: `${name}: ${value}`
											}
											labelLine={false}
										>
											{paymentChartData.map((entry, index) => (
												<Cell key={`cell-${index}`} fill={entry.color} />
											))}
										</Pie>

										<RTooltip
											contentStyle={{
												backgroundColor: 'rgba(255, 255, 255, 0.98)',
												border: '1px solid #e5e7eb',
												borderRadius: '8px',
												boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
											}}
										/>
									</PieChart>
								</ResponsiveContainer>
							)}
						</div>
					</div>
				</section>

				{/* Revenue Chart with Checks Table */}
				<section className='rounded-lg sm:rounded-xl bg-white border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all'>
					<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4'>
						<h3 className='text-base sm:text-lg font-bold text-gray-800'>
							Oylik tushum (checks)
						</h3>
						<span className='inline-flex items-center rounded-full bg-sky-50 border border-sky-200 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-sky-800'>
							<span className='hidden sm:inline'>Jami tushum: </span>
							<span className='sm:hidden'>Tushum: </span>
							<b className='ml-1'>
								<span className='sm:hidden'>
									{money(totals.totalRevenue)
										.replace(" so'm", '')
										.substring(0, 10)}
									...
								</span>
								<span className='hidden sm:inline'>
									{money(totals.totalRevenue)}
								</span>
							</b>
						</span>
					</div>

					<div className='h-64 sm:h-80 mb-6'>
						{revenueMonthly.length === 0 ? (
							emptyState
						) : (
							<ResponsiveContainer width='100%' height='100%'>
								<LineChart data={revenueMonthly}>
									<CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
									<XAxis
										dataKey='month'
										stroke='#6b7280'
										tick={{ fontSize: window.innerWidth < 640 ? 9 : 12 }}
									/>
									<YAxis
										stroke='#6b7280'
										tick={{ fontSize: window.innerWidth < 640 ? 9 : 12 }}
									/>
									<RTooltip
										formatter={value => money(value)}
										contentStyle={{
											backgroundColor: 'rgba(255, 255, 255, 0.98)',
											border: '1px solid #e5e7eb',
											borderRadius: '8px',
											boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
										}}
									/>
									<Line
										type='monotone'
										dataKey='revenue'
										stroke='#0EA5E9'
										strokeWidth={window.innerWidth < 640 ? 3 : 4}
										dot={{
											fill: '#0EA5E9',
											strokeWidth: 2,
											r: window.innerWidth < 640 ? 3 : 5,
										}}
										activeDot={{
											r: window.innerWidth < 640 ? 5 : 7,
											stroke: '#0EA5E9',
											strokeWidth: 2,
										}}
									/>
								</LineChart>
							</ResponsiveContainer>
						)}
					</div>

					{/* Checks Table */}
					<div className='mt-6'>
						<h4 className='text-sm sm:text-base font-semibold text-gray-700 mb-3'>
							Barcha to'lovlar
						</h4>

						{/* Mobile Cards */}
						<div className='block sm:hidden space-y-3'>
							{checks.length > 0 ? (
								checks.map((check, idx) => {
									const student = studentsMap[check.paid_student_id]
									const studentName = student
										? `${student.name || ''} ${student.surname || ''}`.trim()
										: 'Yuklanmoqda...'
									const studentPhone = student?.student_phone || '—'

									return (
										<div
											key={check._id || idx}
											className='rounded-lg bg-gray-50 border border-gray-200 p-3'
										>
											<div className='flex items-start justify-between mb-2'>
												<div>
													<div className='text-sm font-bold text-gray-900'>
														{studentName}
													</div>
													<div className='text-xs text-gray-600'>
														{studentPhone}
													</div>
												</div>
												<span
													className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
														check.status === 'paid' ||
														check.status === 'success'
															? 'bg-green-100 text-green-800'
															: 'bg-yellow-100 text-yellow-800'
													}`}
												>
													{check.status || 'pending'}
												</span>
											</div>
											<div className='space-y-1 text-xs'>
												<div className='flex justify-between'>
													<span className='text-gray-500'>O'quvchi ID:</span>
													<span className='font-mono text-xs text-gray-600'>
														{check.paid_student_id || 'N/A'}
													</span>
												</div>
												<div className='flex justify-between'>
													<span className='text-gray-500'>To'lov ID:</span>
													<span className='font-mono text-xs text-gray-600'>
														{check.payment_id || '—'}
													</span>
												</div>
												<div className='flex justify-between'>
													<span className='text-gray-500'>Summa:</span>
													<span className='font-bold text-gray-900'>
														{money(check.amount)}
													</span>
												</div>
												<div className='flex justify-between'>
													<span className='text-gray-500'>To'langan:</span>
													<span className='font-medium text-gray-700'>
														{check.date_of_payment
															? new Date(
																	check.date_of_payment
															  ).toLocaleDateString('uz-UZ')
															: '—'}
													</span>
												</div>
											</div>
										</div>
									)
								})
							) : (
								<div className='text-center py-8'>
									<div className='text-3xl mb-2'>💳</div>
									<p className='text-gray-500'>To'lovlar topilmadi</p>
								</div>
							)}
						</div>

						{/* Desktop Table */}
						<div className='hidden sm:block overflow-x-auto rounded-lg border border-gray-200'>
							<table className='min-w-full text-sm'>
								<thead className='bg-gray-50 border-b border-gray-200'>
									<tr className='text-left text-xs font-semibold uppercase tracking-wider text-gray-600'>
										<th className='px-4 py-3'>Ism</th>
										<th className='px-4 py-3'>Telefon</th>
										<th className='px-4 py-3'>O'quvchi ID</th>
										<th className='px-4 py-3'>To'lov ID</th>
										<th className='px-4 py-3 text-right'>Summa</th>
										<th className='px-4 py-3'>To'langan</th>
										<th className='px-4 py-3'>Status</th>
									</tr>
								</thead>
								<tbody className='divide-y divide-gray-200'>
									{checks.length > 0 ? (
										checks.map((check, idx) => {
											const student = studentsMap[check.paid_student_id]
											const studentName = student
												? `${student.name || ''} ${
														student.surname || ''
												  }`.trim()
												: 'Yuklanmoqda...'
											const studentPhone = student?.student_phone || '—'

											return (
												<tr
													key={check._id || idx}
													className='hover:bg-gray-50 transition-colors'
												>
													<td className='px-4 py-3 font-semibold text-gray-900'>
														{studentName}
													</td>
													<td className='px-4 py-3 text-gray-700'>
														{studentPhone}
													</td>
													<td className='px-4 py-3 font-mono text-xs text-gray-600'>
														{check.paid_student_id || 'N/A'}
													</td>
													<td className='px-4 py-3 font-mono text-xs text-gray-600'>
														{check.payment_id || '—'}
													</td>
													<td className='px-4 py-3 text-right font-bold text-gray-900'>
														{money(check.amount)}
													</td>
													<td className='px-4 py-3 text-gray-700'>
														{check.date_of_payment
															? new Date(
																	check.date_of_payment
															  ).toLocaleDateString('uz-UZ', {
																	day: '2-digit',
																	month: 'short',
																	year: 'numeric',
															  })
															: '—'}
													</td>
													<td className='px-4 py-3'>
														<span
															className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
																check.status === 'paid' ||
																check.status === 'success'
																	? 'bg-green-100 text-green-800'
																	: 'bg-yellow-100 text-yellow-800'
															}`}
														>
															{check.status || 'pending'}
														</span>
													</td>
												</tr>
											)
										})
									) : (
										<tr>
											<td colSpan={7} className='px-6 py-12 text-center'>
												<div className='flex flex-col items-center gap-3'>
													<div className='text-4xl'>💳</div>
													<div className='text-gray-500 font-medium'>
														To'lovlar topilmadi
													</div>
												</div>
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					</div>
				</section>

				{/* Salaries Table */}
				<section className='rounded-lg sm:rounded-xl bg-white border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all'>
					<div className='flex flex-col gap-4 mb-4 sm:mb-6'>
						<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
							<h3 className='text-base sm:text-lg font-bold text-gray-800'>
								O'qituvchilar batafsil ma'lumot
							</h3>
							<button
								onClick={() => setShowSalaryForm(true)}
								className='inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-white font-semibold text-sm transition-all duration-200 shadow hover:shadow-md'
							>
								<svg
									className='w-5 h-5'
									fill='none'
									stroke='currentColor'
									viewBox='0 0 24 24'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M12 4v16m8-8H4'
									/>
								</svg>
								<span>Oylik qo'shish</span>
							</button>
						</div>
						<div className='flex flex-wrap gap-2 sm:gap-3'>
							<span className='inline-flex items-center rounded-full bg-green-50 border border-green-200 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-green-800'>
								<span className='hidden sm:inline'>Jami oylik: </span>
								<span className='sm:hidden'>Oylik: </span>
								<b className='ml-1'>
									<span className='sm:hidden'>
										{money(totals.totalSalaries)
											.replace(" so'm", '')
											.substring(0, 8)}
										...
									</span>
									<span className='hidden sm:inline'>
										{money(totals.totalSalaries)}
									</span>
								</b>
							</span>
							<span className='inline-flex items-center rounded-full bg-blue-50 border border-blue-200 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-blue-800'>
								O'qituvchilar: <b className='ml-1'>{salaries.length}</b>
							</span>
						</div>
					</div>

					{/* Mobile Table (Cards on small screens) */}
					<div className='block sm:hidden space-y-3'>
						{salaries.length > 0 ? (
							salaries.map((salary, idx) => (
								<div
									key={salary._id || idx}
									className='rounded-lg bg-gray-50 border border-gray-200 p-4'
								>
									<div className='flex items-start justify-between mb-3'>
										<div>
											<h4 className='font-semibold text-gray-800 text-sm'>
												{salary?.teacher?.fullName || "Noma'lum"}
											</h4>
											<span
												className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-1 ${
													salary?.teacher?.role === 'HeadMentor' ||
													salary?.teacher?.role === 'head_mentor'
														? 'bg-purple-100 text-purple-700'
														: salary?.teacher?.role === 'Mentor' ||
														  salary?.teacher?.role === 'mentor'
														? 'bg-blue-100 text-blue-700'
														: 'bg-gray-100 text-gray-700'
												}`}
											>
												{salary?.teacher?.role || 'Teacher'}
											</span>
										</div>
										<span
											className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
												salary?.status === 'paid'
													? 'bg-green-100 text-green-800'
													: salary?.status === 'pending'
													? 'bg-yellow-100 text-yellow-800'
													: 'bg-gray-100 text-gray-800'
											}`}
										>
											{salary?.status || 'pending'}
										</span>
									</div>

									<div className='grid grid-cols-2 gap-3 text-xs'>
										<div>
											<span className='text-gray-500'>Oy:</span>
											<p className='font-medium text-gray-700'>
												{salary?.month || '?'}/{salary?.year || '?'}
											</p>
										</div>
										<div>
											<span className='text-gray-500'>Bazaviy oylik:</span>
											<p className='font-medium text-gray-700'>
												{money(salary?.baseSalary || 0).substring(0, 8)}...
											</p>
										</div>
										<div>
											<span className='text-gray-500'>Bonus:</span>
											<p className='font-medium text-green-700'>
												{money(salary?.bonuses || 0).substring(0, 6)}...
											</p>
										</div>
										<div>
											<span className='text-gray-500'>Chegirma:</span>
											<p className='font-medium text-red-700'>
												{money(salary?.deductions || 0).substring(0, 6)}...
											</p>
										</div>
										<div className='col-span-2'>
											<span className='text-gray-500'>Jami oylik:</span>
											<p className='font-bold text-gray-900 text-sm'>
												{money(salary?.finalSalary || 0)}
											</p>
										</div>
										{salary?.notes && (
											<div className='col-span-2'>
												<span className='text-gray-500'>Izoh:</span>
												<p className='font-medium text-gray-700 text-xs'>
													{salary.notes}
												</p>
											</div>
										)}
									</div>
								</div>
							))
						) : (
							<div className='text-center py-8'>
								<div className='text-3xl mb-2'>👨‍🏫</div>
								<p className='text-gray-500'>Oylik ma'lumotlari topilmadi</p>
							</div>
						)}
					</div>

					{/* Desktop Table */}
					<div className='hidden sm:block overflow-x-auto rounded-lg border border-gray-200'>
						<table className='min-w-full text-sm'>
							<thead className='bg-gray-50 border-b border-gray-200'>
								<tr className='text-left text-xs font-semibold uppercase tracking-wider text-gray-600'>
									<th className='px-3 lg:px-5 py-3'>#</th>
									<th className='px-3 lg:px-5 py-3'>O'qituvchi</th>
									<th className='px-3 lg:px-5 py-3'>Lavozim</th>
									<th className='px-3 lg:px-5 py-3'>Oy/Yil</th>
									<th className='px-3 lg:px-5 py-3 text-right'>Bazaviy</th>
									<th className='px-3 lg:px-5 py-3 text-right'>Bonus</th>
									<th className='px-3 lg:px-5 py-3 text-right'>Chegirma</th>
									<th className='px-3 lg:px-5 py-3 text-right'>Jami oylik</th>
									<th className='px-3 lg:px-5 py-3'>Status</th>
									<th className='px-3 lg:px-5 py-3 hidden xl:table-cell'>
										Izoh
									</th>
								</tr>
							</thead>
							<tbody className='divide-y divide-gray-200'>
								{salaries.length > 0 ? (
									salaries.map((salary, idx) => (
										<tr
											key={salary._id || idx}
											className='hover:bg-gray-50 transition-colors'
										>
											<td className='px-3 lg:px-5 py-3 text-gray-600 font-medium'>
												{idx + 1}
											</td>
											<td className='px-3 lg:px-5 py-3 font-semibold text-gray-800'>
												<div className='truncate max-w-[150px]'>
													{salary?.teacher?.fullName || "Noma'lum"}
												</div>
											</td>
											<td className='px-3 lg:px-5 py-3'>
												<span
													className={`inline-flex items-center rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-medium ${
														salary?.teacher?.role === 'HeadMentor' ||
														salary?.teacher?.role === 'head_mentor'
															? 'bg-purple-100 text-purple-700'
															: salary?.teacher?.role === 'Mentor' ||
															  salary?.teacher?.role === 'mentor'
															? 'bg-blue-100 text-blue-700'
															: 'bg-gray-100 text-gray-700'
													}`}
												>
													{salary?.teacher?.role || 'Teacher'}
												</span>
											</td>
											<td className='px-3 lg:px-5 py-3 text-gray-700 font-medium'>
												{salary?.month || '?'}/{salary?.year || '?'}
											</td>
											<td className='px-3 lg:px-5 py-3 text-right font-medium text-gray-700'>
												<div className='truncate'>
													{money(salary?.baseSalary || 0)}
												</div>
											</td>
											<td className='px-3 lg:px-5 py-3 text-right'>
												<span className='inline-flex items-center rounded-full bg-green-50 text-green-700 px-2 py-0.5 text-xs font-semibold'>
													{money(salary?.bonuses || 0).substring(0, 8)}...
												</span>
											</td>
											<td className='px-3 lg:px-5 py-3 text-right'>
												<span className='inline-flex items-center rounded-full bg-red-50 text-red-700 px-2 py-0.5 text-xs font-semibold'>
													{money(salary?.deductions || 0).substring(0, 8)}...
												</span>
											</td>
											<td className='px-3 lg:px-5 py-3 text-right font-bold text-base text-gray-900'>
												<div className='truncate'>
													{money(salary?.finalSalary || 0)}
												</div>
											</td>
											<td className='px-3 lg:px-5 py-3'>
												<span
													className={`inline-flex items-center rounded-full px-2 sm:px-2.5 py-0.5 sm:py-1 text-xs font-semibold ${
														salary?.status === 'paid'
															? 'bg-green-100 text-green-800'
															: salary?.status === 'pending'
															? 'bg-yellow-100 text-yellow-800'
															: 'bg-gray-100 text-gray-800'
													}`}
												>
													{salary?.status || 'pending'}
												</span>
											</td>
											<td className='px-3 lg:px-5 py-3 hidden xl:table-cell'>
												<div className='text-xs text-gray-600 truncate max-w-[150px]'>
													{salary?.notes || '—'}
												</div>
											</td>
										</tr>
									))
								) : (
									<tr>
										<td colSpan={10} className='px-6 py-12 text-center'>
											<div className='flex flex-col items-center gap-3'>
												<div className='text-4xl'>👨‍🏫</div>
												<div className='text-gray-500 font-medium'>
													Oylik ma'lumotlari topilmadi
												</div>
											</div>
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				</section>
			</div>

			{/* Salary Creation Sliding Panel */}
			{showSalaryForm && (
				<>
					{/* Backdrop */}
					<div
						className='fixed inset-0 bg-white/20 backdrop-blur-md z-40 transition-opacity'
						onClick={() => setShowSalaryForm(false)}
					/>

					{/* Sliding Panel */}
					<div className='fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto'>
						<div className='p-6'>
							{/* Header */}
							<div className='flex items-center justify-between mb-6'>
								<h2 className='text-xl font-bold text-gray-900'>
									Yangi oylik qo'shish
								</h2>
								<button
									onClick={() => setShowSalaryForm(false)}
									className='text-gray-400 hover:text-gray-600 transition-colors'
								>
									<svg
										className='w-6 h-6'
										fill='none'
										stroke='currentColor'
										viewBox='0 0 24 24'
									>
										<path
											strokeLinecap='round'
											strokeLinejoin='round'
											strokeWidth={2}
											d='M6 18L18 6M6 6l12 12'
										/>
									</svg>
								</button>
							</div>

							{/* Form */}
							<form onSubmit={handleCreateSalary} className='space-y-5'>
								{/* Teacher Select */}
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-2'>
										O'qituvchi <span className='text-red-500'>*</span>
									</label>
									<select
										value={salaryForm.teacherId}
										onChange={e =>
											handleSalaryFormChange('teacherId', e.target.value)
										}
										required
										className='w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
									>
										<option value=''>O'qituvchini tanlang</option>
										{teachers.map(teacher => (
											<option key={teacher._id} value={teacher._id}>
												{teacher.fullName || teacher.name} -{' '}
												{teacher.role || 'Teacher'}
											</option>
										))}
									</select>
								</div>

								{/* Month & Year */}
								<div className='grid grid-cols-2 gap-4'>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-2'>
											Oy <span className='text-red-500'>*</span>
										</label>
										<select
											value={salaryForm.month}
											onChange={e =>
												handleSalaryFormChange('month', e.target.value)
											}
											required
											className='w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
										>
											{Array.from({ length: 12 }, (_, i) => i + 1).map(
												month => (
													<option key={month} value={month}>
														{month}
													</option>
												)
											)}
										</select>
									</div>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-2'>
											Yil <span className='text-red-500'>*</span>
										</label>
										<input
											type='number'
											value={salaryForm.year}
											onChange={e =>
												handleSalaryFormChange('year', e.target.value)
											}
											required
											min='2020'
											max='2100'
											className='w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
										/>
									</div>
								</div>

								{/* Base Salary */}
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-2'>
										Bazaviy oylik <span className='text-red-500'>*</span>
									</label>
									<input
										type='number'
										value={salaryForm.baseSalary}
										onChange={e =>
											handleSalaryFormChange('baseSalary', e.target.value)
										}
										required
										min='0'
										placeholder='500000'
										className='w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
									/>
								</div>

								{/* Bonuses */}
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-2'>
										Bonus
									</label>
									<input
										type='number'
										value={salaryForm.bonuses}
										onChange={e =>
											handleSalaryFormChange('bonuses', e.target.value)
										}
										min='0'
										placeholder='0'
										className='w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all'
									/>
								</div>

								{/* Deductions */}
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-2'>
										Chegirma
									</label>
									<input
										type='number'
										value={salaryForm.deductions}
										onChange={e =>
											handleSalaryFormChange('deductions', e.target.value)
										}
										min='0'
										placeholder='0'
										className='w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all'
									/>
								</div>

								{/* Notes */}
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-2'>
										Izoh
									</label>
									<textarea
										value={salaryForm.notes}
										onChange={e =>
											handleSalaryFormChange('notes', e.target.value)
										}
										rows={3}
										placeholder="Qo'shimcha ma'lumot..."
										className='w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none'
									/>
								</div>

								{/* Summary */}
								{salaryForm.baseSalary && (
									<div className='rounded-lg bg-gray-50 border border-gray-200 p-4'>
										<div className='text-sm text-gray-600 mb-2'>
											Jami oylik:
										</div>
										<div className='text-2xl font-bold text-gray-900'>
											{money(
												(Number(salaryForm.baseSalary) || 0) +
													(Number(salaryForm.bonuses) || 0) -
													(Number(salaryForm.deductions) || 0)
											)}
										</div>
									</div>
								)}

								{/* Action Buttons */}
								<div className='flex gap-3 pt-4'>
									<button
										type='button'
										onClick={() => setShowSalaryForm(false)}
										disabled={submitting}
										className='flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50'
									>
										Bekor qilish
									</button>
									<button
										type='submit'
										disabled={submitting}
										className='flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
									>
										{submitting ? (
											<span className='flex items-center justify-center gap-2'>
												<div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
												Saqlanmoqda...
											</span>
										) : (
											'Saqlash'
										)}
									</button>
								</div>
							</form>
						</div>
					</div>
				</>
			)}
		</div>
	)
}

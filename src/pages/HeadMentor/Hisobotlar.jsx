import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Eye, Search, Download, TrendingUp } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, Title, Tooltip, Legend, ArcElement, PointElement } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { setCredentials, logout } from '../../redux/authSlice';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, ArcElement);

const Hisobotlar = () => {
	const dispatch = useDispatch()
	const { accessToken, refreshToken, user } = useSelector(state => state.auth)

	const [students, setStudents] = useState([])
	const [payments, setPayments] = useState([])
	const [courses, setCourses] = useState([])
	const [groups, setGroups] = useState([])
	const [loading, setLoading] = useState(true)
	const [searchTerm, setSearchTerm] = useState('')
	const [selectedStatus, setSelectedStatus] = useState('Barchasi')
	const [activeTab, setActiveTab] = useState('dashboard')
	const [previousStats, setPreviousStats] = useState({
		total: 0,
		active: 0,
		paid: 0,
		revenue: 0,
	})

	const refreshAccessToken = useCallback(async () => {
		if (!refreshToken) {
			dispatch(logout())
			return null
		}
		try {
			const res = await fetch(
				'https://zuhrstar-production.up.railway.app/api/users/refresh',
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ refreshToken }),
				}
			)
			if (!res.ok) throw new Error()
			const data = await res.json()
			dispatch(
				setCredentials({
					user,
					accessToken: data.accessToken,
					refreshToken: data.refreshToken,
				})
			)
			return data.accessToken
		} catch {
			dispatch(logout())
			return null
		}
	}, [refreshToken, dispatch, user])

	const makeRequest = useCallback(
		async (url, options = {}) => {
			const attemptRequest = async token => {
				const res = await fetch(url, {
					...options,
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`,
						...options.headers,
					},
				})
				if (res.status === 401) {
					const newToken = await refreshAccessToken()
					if (!newToken) throw new Error()
					return await attemptRequest(newToken)
				}
				if (!res.ok) throw new Error()
				return res
			}
			return await attemptRequest(accessToken)
		},
		[accessToken, refreshAccessToken]
	)

	const fetchData = useCallback(async () => {
		try {
			setLoading(true)
			const [studentsRes, paymentsRes, coursesRes, groupsRes] =
				await Promise.all([
					makeRequest(
						'https://zuhrstar-production.up.railway.app/api/students'
					),
					makeRequest('https://zuhrstar-production.up.railway.app/api/checks'),
					makeRequest('https://zuhrstar-production.up.railway.app/api/Courses'),
					makeRequest('https://zuhrstar-production.up.railway.app/api/groups'),
				])

			const studentsData = await studentsRes.json()
			const paymentsData = await paymentsRes.json()
			const coursesData = await coursesRes.json()
			const groupsData = await groupsRes.json()

			setStudents(studentsData)
			setPayments(paymentsData)
			setCourses(coursesData)
			setGroups(groupsData)

			const now = new Date()
			const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
			const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

			const lastMonthPayments = paymentsData.filter(p => {
				const date = new Date(p.date_Of_Create)
				return date >= lastMonth && date <= lastMonthEnd
			})

			setPreviousStats({
				total: studentsData.length * 0.9,
				active: studentsData.filter(s => s.status === 'active').length * 0.9,
				paid: studentsData.filter(s => s.paid === true).length * 1.1,
				revenue: lastMonthPayments.reduce(
					(sum, p) => sum + parseInt(p.amount),
					0
				),
			})
		} catch (err) {
			console.error(err)
		} finally {
			setLoading(false)
		}
	}, [makeRequest])

	useEffect(() => {
		fetchData()
	}, [fetchData])

	const totalStudents = students.length
	const activeStudents = students.filter(s => s.status === 'active').length
	const paidStudents = students.filter(s => s.paid === true).length
	const totalRevenue = payments.reduce((sum, p) => sum + parseInt(p.amount), 0)

	const totalGrowth =
		previousStats.total > 0
			? (
					((totalStudents - previousStats.total) / previousStats.total) *
					100
			  ).toFixed(2)
			: 0
	const activeGrowth =
		previousStats.active > 0
			? (
					((activeStudents - previousStats.active) / previousStats.active) *
					100
			  ).toFixed(2)
			: 0
	const paidGrowth =
		previousStats.paid > 0
			? (
					((paidStudents - previousStats.paid) / previousStats.paid) *
					100
			  ).toFixed(2)
			: 0
	const revenueGrowth =
		previousStats.revenue > 0
			? (
					((totalRevenue - previousStats.revenue) / previousStats.revenue) *
					100
			  ).toFixed(2)
			: 0

	const monthlyPayments = (() => {
		const months = [
			'Jan',
			'Feb',
			'Mar',
			'Apr',
			'May',
			'Jun',
			'Jul',
			'Aug',
			'Sep',
			'Oct',
			'Nov',
			'Dec',
		]
		const data = months.map(m => ({ month: m, total: 0 }))

		payments.forEach(p => {
			const date = new Date(p.date_Of_Create)
			const monthIndex = date.getMonth()
			data[monthIndex].total += parseInt(p.amount)
		})

		return data
	})()

	const courseDistribution = (() => {
		// Debug: Ma'lumotlarni ko'rish
		console.log('Groups:', groups)
		console.log('Courses:', courses)
		console.log('Total Students:', totalStudents)

		const courseStats = {}
		const uniqueStudents = new Set()

		courses.forEach(course => {
			courseStats[course.name] = new Set()
		})

		// Har bir talabani faqat bir marta sanash uchun
		groups.forEach(group => {
			console.log(
				'Processing group:',
				group.name,
				'Course:',
				group.course,
				'Students:',
				group.students
			)

			if (group.course && courseStats.hasOwnProperty(group.course)) {
				if (Array.isArray(group.students)) {
					group.students.forEach(studentId => {
						courseStats[group.course].add(studentId)
						uniqueStudents.add(studentId)
					})
				}
			}
		})

		console.log('Course Stats:', courseStats)
		console.log('Total Unique Students in Groups:', uniqueStudents.size)

		// Agar gurppalarda talaba bo'lmasa, jami talabalardan foydalanamiz
		const totalForCalculation =
			uniqueStudents.size > 0 ? uniqueStudents.size : totalStudents

		const coursesWithData = courses
			.map(course => {
				const count = courseStats[course.name].size
				const percentage =
					totalForCalculation > 0 ? (count / totalForCalculation) * 100 : 0

				return {
					name: course.name,
					count: count,
					percentage: percentage,
				}
			})
			.filter(c => c.count > 0)

		// Agar hech qanday ma'lumot bo'lmasa
		if (coursesWithData.length === 0) {
			return []
		}

		// Foizlarni normalize qilamiz
		let totalPercentage = coursesWithData.reduce(
			(sum, c) => sum + Math.round(c.percentage),
			0
		)

		if (totalPercentage !== 100 && coursesWithData.length > 0) {
			const diff = 100 - totalPercentage
			coursesWithData[0].percentage =
				Math.round(coursesWithData[0].percentage) + diff
			for (let i = 1; i < coursesWithData.length; i++) {
				coursesWithData[i].percentage = Math.round(
					coursesWithData[i].percentage
				)
			}
		} else {
			coursesWithData.forEach(c => (c.percentage = Math.round(c.percentage)))
		}

		console.log('Final Course Distribution:', coursesWithData)

		return coursesWithData
	})()

	const paidPercentage =
		totalStudents > 0 ? ((paidStudents / totalStudents) * 100).toFixed(1) : 0
	const unpaidPercentage =
		totalStudents > 0
			? (((totalStudents - paidStudents) / totalStudents) * 100).toFixed(1)
			: 0

	const filteredStudents = students.filter(s => {
		const matchSearch =
			s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			s.surname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			s.student_phone?.includes(searchTerm)
		const matchStatus =
			selectedStatus === 'Barchasi' ||
			(selectedStatus === 'Faol' && s.status === 'active') ||
			(selectedStatus === 'Nofaol' && s.status === 'inactive') ||
			(selectedStatus === 'Toʻlangan' && s.paid === true) ||
			(selectedStatus === 'Qarzdor' && s.paid === false)
		return matchSearch && matchStatus
	})

	const formatCurrency = amount =>
		new Intl.NumberFormat('uz-UZ').format(amount) + ' UZS'
	const formatRevenue = amount => {
		if (amount >= 1000000) return (amount / 1000000).toFixed(1) + 'M'
		if (amount >= 1000) return (amount / 1000).toFixed(0) + 'K'
		return amount
	}

	const exportToCSV = () => {
		const csv = [
			['ID', 'Ism', 'Familiya', 'Telefon', 'Holati', 'Tolov', 'Balans'],
			...filteredStudents.map((s, i) => [
				i + 1,
				s.name,
				s.surname,
				s.student_phone,
				s.status === 'active' ? 'Faol' : 'Nofaol',
				s.paid ? 'Tolangan' : 'Qarzdor',
				s.balance || 0,
			]),
		]
			.map(row => row.join(','))
			.join('\n')
		const blob = new Blob([csv], { type: 'text/csv' })
		const link = document.createElement('a')
		link.href = URL.createObjectURL(blob)
		link.download = `talabalar_${new Date().toISOString().split('T')[0]}.csv`
		link.click()
	}

	if (loading)
		return (
			<div className='flex items-center justify-center h-screen bg-gray-50'>
				<div className='animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent'></div>
			</div>
		)

	return (
		<div className='min-h-screen bg-gray-50'>
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
						<div className='text-sm text-gray-500'></div>
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
										{formatRevenue(totalRevenue)}
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
									data={{
										labels: monthlyPayments.map(m => m.month),
										datasets: [
											{
												data: monthlyPayments.map(m => m.total / 1000),
												borderColor: '#0066cc',
												backgroundColor: 'rgba(0, 102, 204, 0.1)',
												tension: 0.4,
												fill: true,
												pointRadius: 0,
												borderWidth: 3,
											},
										],
									}}
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
											data={{
												labels: ['Toʻlangan', 'Toʻlanmagan'],
												datasets: [
													{
														data: [paidPercentage, unpaidPercentage],
														backgroundColor: ['#0066cc', '#e5e7eb'],
														borderWidth: 0,
													},
												],
											}}
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
														></div>
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
									{payments.slice(0, 5).map(p => {
										const student = students.find(
											s => s.student_id === p.paid_student_id
										)
										return (
											<tr key={p._id} className='border-b border-gray-100'>
												<td className='py-4 px-4 text-sm text-gray-900'>
													{student
														? `${student.name} ${student.surname}`
														: p.paid_student_id}
												</td>
												<td className='py-4 px-4 text-sm text-gray-900'>
													{formatCurrency(p.amount)}
												</td>
												<td className='py-4 px-4 text-sm text-gray-500'>
													{new Date(p.date_Of_Create).toLocaleDateString(
														'uz-UZ'
													)}
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
									<Download className='w-4 h-4' />
									Export
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
								{payments.map(p => {
									const student = students.find(
										s => s.student_id === p.paid_student_id
									)
									return (
										<tr key={p._id} className='hover:bg-gray-50'>
											<td className='px-6 py-4 text-sm text-gray-900'>
												{student
													? `${student.name} ${student.surname}`
													: p.paid_student_id}
											</td>
											<td className='px-6 py-4 text-sm text-gray-900'>
												{formatCurrency(p.amount)}
											</td>
											<td className='px-6 py-4 text-sm text-gray-500'>
												{new Date(p.date_Of_Create).toLocaleDateString('uz-UZ')}
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

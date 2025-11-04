import React, { useState, useEffect } from 'react'

const Dashboard = () => {
	const [studentsCount, setStudentsCount] = useState(0)
	const [groupsCount, setGroupsCount] = useState(0)
	const [loading, setLoading] = useState(true)
	const [studentsData, setStudentsData] = useState([])
	const [studentsLoading, setStudentsLoading] = useState(true)
	const [groupsData, setGroupsData] = useState([])
	const [filteredGroups, setFilteredGroups] = useState([])
	const [selectedGroup, setSelectedGroup] = useState(null)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [salaries, setSalaries] = useState(0)
	const AUTH_TOKEN =
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4YTMyNTdkN2E4ZjEwMDdkMDExY2EyOCIsInJvbGUiOiJNZW50b3IiLCJpYXQiOjE3NjE2NTIzMzIsImV4cCI6MTc2MTY1OTUzMn0.HF6ChyqKfS1BlZOXqVuKHPkcqj_63k2J2P3zybCrg_0'
	const BASE_URL = 'https://zuhrstar-production.up.railway.app/api'
	const TEACHER_NAME = 'Abduvohid Xoshimov'

	useEffect(() => {
		const fetchData = async () => {
			try {
				setLoading(true)
				setStudentsLoading(true)

				const [groupsResponse, studentsResponse, salariesResponse] =
					await Promise.all([
						fetch(`${BASE_URL}/groups`, {
							method: 'GET',
							headers: {
								Authorization: `Bearer ${AUTH_TOKEN}`,
								'Content-Type': 'application/json',
							},
						}),
						fetch(`${BASE_URL}/students`, {
							method: 'GET',
							headers: {
								Authorization: `Bearer ${AUTH_TOKEN}`,
								'Content-Type': 'application/json',
							},
						}),
						fetch(`${BASE_URL}/salaries`, {
							method: 'GET',
							headers: {
								Authorization: `Bearer ${AUTH_TOKEN}`,
								'Content-Type': 'application/json',
							},
						}),
					])

				if (
					!groupsResponse.ok ||
					!studentsResponse.ok ||
					!salariesResponse.ok
				) {
					throw new Error("API dan ma'lumot olishda xatolik")
				}

				const [groupsDataResponse, studentsDataResponse, salariesData] =
					await Promise.all([
						groupsResponse.json(),
						studentsResponse.json(),
						salariesResponse.json(),
					])

				console.log("=== API MA'LUMOTLARI ===")
				console.log('Groups:', groupsDataResponse)
				console.log('Students:', studentsDataResponse)
				console.log('Salaries:', salariesData)

				setGroupsData(groupsDataResponse)

				const abduvohidGroups = groupsDataResponse.filter(
					group => group.teacher_fullName === TEACHER_NAME
				)

				console.log('Abduvohid guruhlari:', abduvohidGroups)

				setFilteredGroups(abduvohidGroups)
				const totalGroups = abduvohidGroups.length
				setGroupsCount(totalGroups)

				let totalStudents = 0
				abduvohidGroups.forEach(group => {
					if (group.students && Array.isArray(group.students)) {
						totalStudents += group.students.length
					}
				})
				setStudentsCount(totalStudents)

				setStudentsData(studentsDataResponse)

				if (Array.isArray(salariesData) && salariesData.length > 0) {
					setSalaries(salariesData[0].amount || 0)
				} else if (salariesData.amount) {
					setSalaries(salariesData.amount)
				}
			} catch (error) {
				console.error('API xatoligi:', error)
				setStudentsCount(0)
				setGroupsCount(0)
				setStudentsData([])
				setGroupsData([])
				setFilteredGroups([])
				setSalaries(0)
			} finally {
				setLoading(false)
				setStudentsLoading(false)
			}
		}

		fetchData()
	}, [])

	const getAbduvohidStudents = () => {
		if (!Array.isArray(filteredGroups) || !Array.isArray(studentsData)) {
			console.log("❌ Ma'lumotlar massiv emas")
			return []
		}

		const abduvohidStudentIds = []
		filteredGroups.forEach(group => {
			if (group.students && Array.isArray(group.students)) {
				abduvohidStudentIds.push(...group.students)
			}
		})

		console.log("=== O'QUVCHI FILTRLASH ===")
		console.log('Student IDlar:', abduvohidStudentIds)
		console.log('Barcha students:', studentsData.length)

		const abduvohidStudents = studentsData.filter(student =>
			abduvohidStudentIds.includes(student._id)
		)

		console.log("Topilgan o'quvchilar:", abduvohidStudents.length)
		console.log("O'quvchilar ma'lumoti:", abduvohidStudents)

		return abduvohidStudents
	}

	const isExcellentStudent = student => {
		if (!student) return false

		const note = (student.note || '').toLowerCase().trim()

		const excellentKeywords = [
			'отличник',
			'otlichnik',
			'excellent',
			"a'lo",
			'alo',
			'5',
			'five',
		]

		const isExcellent = excellentKeywords.some(keyword =>
			note.includes(keyword)
		)

		if (isExcellent) {
			console.log(`✅ ${student.name}: "${student.note}" - EXCELLENT`)
		}

		return isExcellent
	}

	const getStudentsStats = () => {
		const abduvohidStudents = getAbduvohidStudents()

		console.log('=== STATISTIKA HISOBLASH ===')
		console.log("Jami o'quvchilar:", abduvohidStudents.length)

		if (abduvohidStudents.length === 0) {
			console.log("❌ O'quvchilar topilmadi")
			return { excellent: 0, others: 0, total: 0, excellentPercentage: 0 }
		}

		abduvohidStudents.forEach(student => {
			console.log(`Student: ${student.name}, Note: "${student.note}"`)
		})

		const excellent = abduvohidStudents.filter(isExcellentStudent).length
		const others = abduvohidStudents.length - excellent
		const total = abduvohidStudents.length
		const excellentPercentage = total > 0 ? (excellent / total) * 100 : 0

		console.log('📊 NATIJA:', {
			excellent,
			others,
			total,
			excellentPercentage: excellentPercentage.toFixed(1) + '%',
		})

		return { excellent, others, total, excellentPercentage }
	}

	const { excellent, others, total, excellentPercentage } = getStudentsStats()

	const getStatusBg = status => {
		if (status === 'active') {
			return 'bg-green-100 text-green-600'
		} else if (status === 'inactive') {
			return 'bg-red-100 text-red-600'
		} else {
			return 'bg-gray-100 text-gray-600'
		}
	}

	const getStatusCircleColor = status => {
		if (status === 'active') {
			return 'bg-emerald-500'
		} else {
			return 'bg-gray-400'
		}
	}

	const openGroupModal = group => {
		setSelectedGroup(group)
		setIsModalOpen(true)
	}

	const closeModal = () => {
		setIsModalOpen(false)
		setSelectedGroup(null)
	}

	return (
		<div className='relative min-h-screen bg-gray-50 p-6'>
			<div className='mb-8'>
				<h1 className='text-4xl font-bold text-gray-800 mb-2'>Dashboard</h1>
				<p className='text-gray-500'>Salom, Mentor!</p>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
				<div className='relative bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-6 shadow-lg overflow-hidden'>
					<div className='absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16'></div>
					<div className='relative z-10'>
						<div>
							<p className='text-white/90 text-sm font-medium mb-2'>
								O'quvchilar Soni
							</p>
							<p className='text-white text-4xl font-bold'>
								{loading ? '...' : studentsCount}
							</p>
						</div>
					</div>
				</div>

				<div className='relative bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-6 shadow-lg overflow-hidden'>
					<div className='absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16'></div>
					<div className='relative z-10'>
						<div>
							<p className='text-white/90 text-sm font-medium mb-2'>
								Guruhlar Soni
							</p>
							<p className='text-white text-4xl font-bold'>
								{loading ? '...' : groupsCount}
							</p>
						</div>
					</div>
				</div>

				<div className='relative bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-6 shadow-lg overflow-hidden'>
					<div className='absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16'></div>
					<div className='relative z-10'>
						<div>
							<p className='text-white/90 text-sm font-medium mb-2'>
								Oylik ish haqi
							</p>
							<p className='text-white text-4xl font-bold'>
								{salaries.toLocaleString()} so'm
							</p>
						</div>
					</div>
				</div>
			</div>

			<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
				<div className='lg:col-span-2 bg-white rounded-lg p-6 shadow-sm'>
					<h2 className='text-xl font-bold text-gray-800 mb-6'>Top Students</h2>
					{studentsLoading ? (
						<div className='text-center py-8'>Yuklanmoqda...</div>
					) : (
						<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
							{getAbduvohidStudents()
								.filter(isExcellentStudent)
								.slice(0, 8)
								.map((student, index) => (
									<div
										key={student._id || index}
										className='bg-blue-50 rounded-2xl text-center p-4 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:bg-blue-100'
									>
										<div className='relative mb-4 flex justify-center'>
											<div className='w-12 h-12 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center'>
												<span className='text-white font-bold text-lg'>
													{student.name
														? student.name.charAt(0).toUpperCase()
														: 'S'}
												</span>
											</div>
										</div>
										<h3 className='text-lg font-bold text-gray-800 mb-1 truncate'>
											{student.name
												? `${student.name} ${student.surname || ''}`.trim()
												: "Noma'lum O'quvchi"}
										</h3>
										<p className='text-gray-600 mb-2 text-sm truncate'>
											{student.gender || "Gender noma'lum"}
										</p>
										<span className='inline-block px-3 py-1 text-xs font-medium text-white bg-emerald-500 rounded-full'>
											{student.note || 'Отличник'}
										</span>
									</div>
								))}
							{getAbduvohidStudents().filter(isExcellentStudent).length ===
								0 && (
								<div className='col-span-full text-center py-8'>
									<div className='text-gray-400 text-5xl mb-4'>🎓</div>
									<p className='text-gray-500 font-medium'>
										Hozircha "Отличник" statusidagi o'quvchilar yo'q
									</p>
									<p className='text-gray-400 text-sm mt-2'>
										Jami {getAbduvohidStudents().length} ta o'quvchi mavjud
									</p>
								</div>
							)}
						</div>
					)}
				</div>

				<div className='bg-white rounded-lg p-6 shadow-sm'>
					<h2 className='text-xl font-bold text-gray-800 mb-6'>
						Students Performance
					</h2>
					{studentsLoading ? (
						<div className='flex items-center justify-center h-full'>
							<p className='text-gray-500'>Yuklanmoqda...</p>
						</div>
					) : (
						<div className='flex flex-col items-center'>
							<div className='relative mb-6'>
								<svg width='180' height='180' className='transform -rotate-90'>
									<circle
										cx='90'
										cy='90'
										r='65'
										fill='none'
										stroke='#EF4444'
										strokeWidth='15'
										strokeDasharray='408'
										strokeDashoffset='0'
										strokeLinecap='round'
									/>
									<circle
										cx='90'
										cy='90'
										r='65'
										fill='none'
										stroke='#10B981'
										strokeWidth='15'
										strokeDasharray='408'
										strokeDashoffset={408 - (408 * excellentPercentage) / 100}
										strokeLinecap='round'
										className='transition-all duration-1000 ease-out'
									/>
								</svg>
								<div className='absolute inset-0 flex flex-col items-center justify-center'>
									<div className='text-2xl font-bold text-gray-800'>
										{total}
									</div>
									<div className='text-xs text-gray-500 font-medium'>Jami</div>
								</div>
								<div className='absolute -top-2 -right-2 bg-gray-800 text-white px-2 py-1 rounded text-xs font-medium'>
									{excellentPercentage.toFixed(1)}%
								</div>
							</div>
							<div className='w-full space-y-3'>
								<div className='flex justify-between items-center'>
									<div className='flex items-center space-x-2'>
										<div className='w-3 h-3 bg-green-500 rounded-full'></div>
										<span className='text-sm font-medium text-gray-700'>
											Отличник
										</span>
									</div>
									<span className='text-sm font-bold text-green-500'>
										{excellent}
									</span>
								</div>
								<div className='flex justify-between items-center'>
									<div className='flex items-center space-x-2'>
										<div className='w-3 h-3 bg-red-500 rounded-full'></div>
										<span className='text-sm font-medium text-gray-700'>
											Boshqalar
										</span>
									</div>
									<span className='text-sm font-bold text-red-500'>
										{others}
									</span>
								</div>
							</div>
							<div className='mt-4 text-center'>
								<p className='text-xs text-gray-500'>
									A'lo o'quvchilar foizi: {excellentPercentage.toFixed(1)}%
								</p>
							</div>
							{total === 0 && (
								<div className='mt-4 text-center'>
									<p className='text-sm text-gray-500'>
										Hozircha o'quvchilar ma'lumoti yo'q
									</p>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			<div className='w-full max-w-4xl bg-white shadow-lg mt-10 rounded-2xl p-8'>
				<div className='flex justify-between items-center mb-8'>
					<p className='font-bold text-2xl text-gray-800'>
						Guruhlar ({filteredGroups.length})
					</p>
				</div>

				{loading ? (
					<div className='w-full text-center text-gray-500 py-8'>
						Yuklanmoqda...
					</div>
				) : filteredGroups.length === 0 ? (
					<div className='w-full text-center text-gray-500 py-8'>
						<p className='text-lg'>Hozircha guruhlar topilmadi</p>
					</div>
				) : (
					<div className='flex flex-col gap-6'>
						<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
							{filteredGroups.slice(0, 4).map((group, index) => (
								<div
									key={group._id || index}
									className='bg-blue-50 rounded-2xl text-center p-4 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg hover:bg-blue-100'
									onClick={() => openGroupModal(group)}
								>
									<div className='relative mb-4 flex justify-center'>
										<div
											className={`w-12 h-12 rounded-full border-2 border-white ${getStatusCircleColor(
												group.status
											)}`}
										></div>
									</div>
									<h3 className='text-lg font-bold text-gray-800 mb-1 truncate'>
										{group.name || "Noma'lum Guruh"}
									</h3>
									<p className='text-gray-600 mb-2 truncate'>
										{group.course || "Kurs noma'lum"}
									</p>
									<span className='inline-block px-3 py-1 text-xs font-medium text-gray-600 bg-white rounded-full'>
										{group.teacher_fullName?.split(' ')[0] || "O'qituvchi"}
									</span>
									<div className='mt-2 text-xs text-gray-500'>
										O'quvchilar: {group.students?.length || 0}
									</div>
								</div>
							))}
						</div>
						{filteredGroups.length > 4 && (
							<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
								{filteredGroups.slice(4, 8).map((group, index) => (
									<div
										key={group._id || index + 4}
										className='bg-blue-50 rounded-2xl text-center p-4 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg hover:bg-blue-100'
										onClick={() => openGroupModal(group)}
									>
										<div className='relative mb-4 flex justify-center'>
											<div
												className={`w-12 h-12 rounded-full border-2 border-white ${getStatusCircleColor(
													group.status
												)}`}
											></div>
										</div>
										<h3 className='text-lg font-bold text-gray-800 mb-1 truncate'>
											{group.name || "Noma'lum Guruh"}
										</h3>
										<p className='text-gray-600 mb-2 truncate'>
											{group.course || "Kurs noma'lum"}
										</p>
										<span className='inline-block px-3 py-1 text-xs font-medium text-gray-600 bg-white rounded-full'>
											{group.teacher_fullName?.split(' ')[0] || "O'qituvchi"}
										</span>
										<div className='mt-2 text-xs text-gray-500'>
											O'quvchilar: {group.students?.length || 0}
										</div>
									</div>
								))}
							</div>
						)}

						{filteredGroups.length > 8 && (
							<div className='text-center mt-4'>
								<p className='text-gray-600'>
									va yana {filteredGroups.length - 8} ta guruh...
								</p>
							</div>
						)}
					</div>
				)}
			</div>

			{isModalOpen && selectedGroup && (
				<div
					className='fixed inset-0 backdrop-blur-lg flex items-center justify-center z-50'
					onClick={closeModal}
				>
					<div
						className='bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto'
						onClick={e => e.stopPropagation()}
					>
						<div className='flex items-center justify-between mb-6 border-b pb-4'>
							<div className='flex items-center space-x-4'>
								<div
									className={`w-16 h-16 rounded-full border-4 border-white shadow-lg ${getStatusCircleColor(
										selectedGroup.status
									)}`}
								></div>
								<div>
									<h2 className='text-2xl font-bold text-gray-800'>
										{selectedGroup.name}
									</h2>
									<p className='text-gray-500'>{selectedGroup.course}</p>
								</div>
							</div>
							<button
								onClick={closeModal}
								className='text-gray-400 hover:text-gray-600 text-3xl font-bold w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors'
							>
								×
							</button>
						</div>

						<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
							<div className='bg-blue-50 rounded-xl p-4'>
								<div className='flex items-center space-x-3'>
									<div className='w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center'>
										<svg
											className='w-6 h-6 text-white'
											fill='none'
											stroke='currentColor'
											viewBox='0 0 24 24'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth={2}
												d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
											/>
										</svg>
									</div>
									<div>
										<p className='text-sm text-gray-600'>O'qituvchi</p>
										<p className='font-semibold text-gray-800'>
											{selectedGroup.teacher_fullName || "Ma'lumot yo'q"}
										</p>
									</div>
								</div>
							</div>

							<div className='bg-green-50 rounded-xl p-4'>
								<div className='flex items-center space-x-3'>
									<div className='w-12 h-12 bg-green-500 rounded-full flex items-center justify-center'>
										<svg
											className='w-6 h-6 text-white'
											fill='none'
											stroke='currentColor'
											viewBox='0 0 24 24'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth={2}
												d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2M7 21h2m-2 0H3m2 0v-3a2 2 0 012-2h2a2 2 0 012 2v3'
											/>
										</svg>
									</div>
									<div>
										<p className='text-sm text-gray-600'>Filial</p>
										<p className='font-semibold text-gray-800'>
											{selectedGroup.branch || "Ma'lumot yo'q"}
										</p>
									</div>
								</div>
							</div>

							<div className='bg-orange-50 rounded-xl p-4'>
								<div className='flex items-center space-x-3'>
									<div className='w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center'>
										<svg
											className='w-6 h-6 text-white'
											fill='none'
											stroke='currentColor'
											viewBox='0 0 24 24'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth={2}
												d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
											/>
										</svg>
									</div>
									<div>
										<p className='text-sm text-gray-600'>Dars vaqti</p>
										<p className='font-semibold text-gray-800'>
											{selectedGroup.start_time || "Ma'lumot yo'q"} -{' '}
											{selectedGroup.end_time || "Ma'lumot yo'q"}
										</p>
									</div>
								</div>
							</div>

							<div className='bg-purple-50 rounded-xl p-4'>
								<div className='flex items-center space-x-3'>
									<div className='w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center'>
										<svg
											className='w-6 h-6 text-white'
											fill='none'
											stroke='currentColor'
											viewBox='0 0 24 24'
										>
											<path
												strokeLinecap='round'
												strokeLinejoin='round'
												strokeWidth={2}
												d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
											/>
										</svg>
									</div>
									<div>
										<p className='text-sm text-gray-600'>Holat</p>
										<span
											className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${getStatusBg(
												selectedGroup.status
											)}`}
										>
											{selectedGroup.status === 'active' ? 'Faol' : 'Nofaol'}
										</span>
									</div>
								</div>
							</div>
						</div>

						{selectedGroup.students && selectedGroup.students.length > 0 && (
							<div className='mt-6'>
								<h3 className='text-lg font-bold text-gray-800 mb-4'>
									O'quvchilar ({selectedGroup.students.length})
								</h3>
								<div className='bg-gray-50 rounded-xl p-4 max-h-40 overflow-y-auto'>
									<div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
										{selectedGroup.students.map((student, index) => {
											const studentInfo = studentsData.find(
												s => s._id === student
											)

											return (
												<div
													key={student || index}
													className='bg-white rounded-lg p-3 border-l-4 border-blue-500'
												>
													<div className='flex flex-col'>
														<p className='font-medium text-gray-800 text-sm'>
															{studentInfo && studentInfo.name
																? `${studentInfo.name} ${
																		studentInfo.surname || ''
																  }`.trim()
																: `O'quvchi ${index + 1}`}
														</p>
														<p className='text-gray-600 text-xs mt-1'>
															📱{' '}
															{studentInfo &&
															studentInfo.student_phone &&
															studentInfo.student_phone.trim() !== ''
																? studentInfo.student_phone
																: "Telefon yo'q"}
														</p>
													</div>
												</div>
											)
										})}
									</div>
								</div>
							</div>
						)}

						<div className='mt-8 flex justify-end space-x-4'>
							<button
								onClick={closeModal}
								className='px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors'
							>
								Yopish
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default Dashboard

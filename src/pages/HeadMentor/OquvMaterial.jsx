import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSelector } from 'react-redux'
import {
	Plus,
	BookOpen,
	Users,
	Calendar,
	CheckCircle,
	Clock,
	Star,
	Zap,
	AlertCircle,
	ArrowLeft,
	Edit,
	Trash2,
	X,
} from 'lucide-react'

const UnifiedCourses = () => {
	const { accessToken, user } = useSelector(state => state.auth)

	// States
	const [courses, setCourses] = useState([])
	const [selectedCourse, setSelectedCourse] = useState(null)
	const [editingCourse, setEditingCourse] = useState(null)
	const [loading, setLoading] = useState(false)
	const [dataLoading, setDataLoading] = useState(true)
	const [error, setError] = useState(null)

	// Form states
	const [newMethodTitle, setNewMethodTitle] = useState('')
	const [newLessonTitle, setNewLessonTitle] = useState('')
	const [newLessonDesc, setNewLessonDesc] = useState('')
	const [selectedMonth, setSelectedMonth] = useState(null)
	const [showAddMethod, setShowAddMethod] = useState(false)

	// API config
	const config = useMemo(
		() => ({
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
			},
		}),
		[accessToken]
	)

	// Memosizatsiyalangan API funksiyalar
	const fetchCourses = useCallback(async () => {
		if (!accessToken) {
			setError('Avtorizatsiya tokeni mavjud emas')
			setDataLoading(false)
			return
		}

		try {
			setDataLoading(true)
			setError(null)

			const response = await fetch(
				'https://zuhr-star-production.up.railway.app/api/courses',
				{
					method: 'GET',
					headers: config.headers,
				}
			)

			if (response.status === 401) {
				throw new Error('Avtorizatsiya xatosi. Kirish tokenini tekshiring.')
			}

			if (!response.ok) {
				throw new Error(`HTTP xato! status: ${response.status}`)
			}

			const data = await response.json()
			setCourses(data)
		} catch (error) {
			console.error('Kurslarni yuklashda xato:', error)
			setError("Kurslarni yuklab bo'lmadi. Internet aloqasini tekshiring.")
		} finally {
			setDataLoading(false)
		}
	}, [accessToken, config.headers])

	const fetchCourse = useCallback(
		async courseId => {
			if (!accessToken) return

			try {
				setLoading(true)
				const response = await fetch(
					`https://zuhr-star-production.up.railway.app/api/courses/id/${courseId}`,
					{
						headers: config.headers,
					}
				)

				if (!response.ok) {
					throw new Error(`HTTP xato! status: ${response.status}`)
				}

				const data = await response.json()
				setSelectedCourse(data)
			} catch (error) {
				console.error('Kursni yuklashda xato:', error)
				setError("Kursni yuklab bo'lmadi")
			} finally {
				setLoading(false)
			}
		},
		[accessToken, config.headers]
	)

	const updateCourse = useCallback(
		async (courseId, updatedData) => {
			if (!accessToken) return

			try {
				setLoading(true)
				const response = await fetch(
					`https://zuhr-star-production.up.railway.app/api/courses/id/${courseId}`,
					{
						method: 'PUT',
						headers: config.headers,
						body: JSON.stringify(updatedData),
					}
				)

				if (!response.ok) {
					throw new Error(`HTTP xato! status: ${response.status}`)
				}

				const data = await response.json()
				setSelectedCourse(data)
				await fetchCourses()
				setError(null)
			} catch (error) {
				console.error('Kursni yangilashda xato:', error)
				setError("Kursni yangilab bo'lmadi")
			} finally {
				setLoading(false)
			}
		},
		[accessToken, config.headers, fetchCourses]
	)

	const deleteCourse = useCallback(
		async courseId => {
			if (!window.confirm("Bu kursni o'chirishga ishonchingiz komilmi?")) return

			try {
				setLoading(true)
				const response = await fetch(
					`https://zuhr-star-production.up.railway.app/api/courses/id/${courseId}`,
					{
						method: 'DELETE',
						headers: config.headers,
					}
				)

				if (!response.ok) {
					throw new Error(`HTTP xato! status: ${response.status}`)
				}

				setSelectedCourse(null)
				await fetchCourses()
				setError(null)
			} catch (error) {
				console.error("Kursni o'chirishda xato:", error)
				setError("Kursni o'chirib bo'lmadi")
			} finally {
				setLoading(false)
			}
		},
		[accessToken, config.headers, fetchCourses]
	)

	const addMethodology = useCallback(async () => {
		if (!newMethodTitle.trim() || !selectedCourse) return

		const methodology = selectedCourse.methodology || []
		const nextMonth = methodology.length + 1

		const newMethod = {
			month: nextMonth,
			title: newMethodTitle,
			lessons: [],
		}

		const updatedCourse = {
			...selectedCourse,
			methodology: [...methodology, newMethod],
		}

		await updateCourse(selectedCourse._id, updatedCourse)
		setNewMethodTitle('')
		setShowAddMethod(false)
	}, [newMethodTitle, selectedCourse, updateCourse])

	const addLesson = useCallback(
		async monthIndex => {
			if (!newLessonTitle.trim() || !newLessonDesc.trim() || !selectedCourse)
				return

			const methodology = [...selectedCourse.methodology]
			const newLesson = {
				title: newLessonTitle,
				description: newLessonDesc,
			}

			methodology[monthIndex].lessons.push(newLesson)

			const updatedCourse = {
				...selectedCourse,
				methodology,
			}

			await updateCourse(selectedCourse._id, updatedCourse)
			setNewLessonTitle('')
			setNewLessonDesc('')
			setSelectedMonth(null)
		},
		[newLessonTitle, newLessonDesc, selectedCourse, updateCourse]
	)

	const removeMethodology = useCallback(
		async monthIndex => {
			if (
				!window.confirm("Bu oyni o'chirishni xohlaysizmi?") ||
				!selectedCourse
			)
				return

			const methodology = selectedCourse.methodology.filter(
				(_, index) => index !== monthIndex
			)
			const updatedCourse = {
				...selectedCourse,
				methodology,
			}

			await updateCourse(selectedCourse._id, updatedCourse)
		},
		[selectedCourse, updateCourse]
	)

	const removeLesson = useCallback(
		async (monthIndex, lessonIndex) => {
			if (
				!window.confirm("Bu darsni o'chirishni xohlaysizmi?") ||
				!selectedCourse
			)
				return

			const methodology = [...selectedCourse.methodology]
			methodology[monthIndex].lessons = methodology[monthIndex].lessons.filter(
				(_, index) => index !== lessonIndex
			)

			const updatedCourse = {
				...selectedCourse,
				methodology,
			}

			await updateCourse(selectedCourse._id, updatedCourse)
		},
		[selectedCourse, updateCourse]
	)

	useEffect(() => {
		if (accessToken) {
			fetchCourses()
		}
	}, [accessToken, fetchCourses])

	// Kurslar ro'yxati ko'rinishi
	const CoursesView = useMemo(
		() => (
			<div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4'>
				<div className='max-w-7xl mx-auto'>
					{/* Sarlavha */}
					<div className='text-center mb-8'>
						<div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4 shadow-lg'>
							<BookOpen className='w-8 h-8 text-white' />
						</div>
						<h1 className='text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2'>
							Kurslar
						</h1>
						<p className='text-gray-600 text-lg'>
							{user ? `Xush kelibsiz, ${user.fullName}!` : ''}
						</p>
					</div>

					{/* Xato xabari */}
					{error && (
						<div className='mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3'>
							<AlertCircle className='w-5 h-5 text-red-500 flex-shrink-0' />
							<div className='text-red-700'>{error}</div>
							<button
								onClick={() => setError(null)}
								className='ml-auto text-red-500 hover:text-red-700'
							>
								<X className='w-4 h-4' />
							</button>
						</div>
					)}

					{/* Kurslar jadvali */}
					{dataLoading ? (
						<div className='flex items-center justify-center py-12 mb-8'>
							<div className='text-center'>
								<div className='w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
								<p className='text-gray-600 text-lg'>Kurslar qidirilmoqda...</p>
							</div>
						</div>
					) : !accessToken ? (
						<div className='text-center py-12 mb-8'>
							<AlertCircle className='w-16 h-16 text-red-300 mx-auto mb-4' />
							<p className='text-gray-500'>Tizimga kiring</p>
						</div>
					) : courses.length > 0 ? (
						<div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8'>
							{courses.map(course => (
								<div
									key={course._id}
									className='bg-white rounded-2xl shadow-lg p-6 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 border-transparent hover:border-blue-200'
								>
									<div className='flex items-center justify-between mb-4'>
										<div className='w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center'>
											<BookOpen className='w-6 h-6 text-white' />
										</div>
										<div className='flex items-center gap-1 text-yellow-500'>
											<Star className='w-4 h-4 fill-current' />
											<span className='text-sm font-medium'>4.9</span>
										</div>
									</div>

									<h3 className='font-bold text-lg text-gray-800 mb-2'>
										{course.name}
									</h3>
									<p className='text-gray-600 text-sm mb-4'>
										{course.duration}{' '}
										{course.duration_type === 'month'
											? 'oy'
											: course.duration_type}{' '}
										davomiyligi
									</p>

									<div className='space-y-2 text-sm mb-4'>
										<div className='flex items-center justify-between'>
											<div className='flex items-center gap-1 text-gray-500'>
												<Users className='w-4 h-4' />
												<span>{course.groups_count} guruh</span>
											</div>
											<div className='flex items-center gap-1 text-blue-500'>
												<Clock className='w-4 h-4' />
												<span>{course.methodology?.length || 0} oy</span>
											</div>
										</div>
										<div className='flex items-center justify-between'>
											<span className='text-green-600 font-medium'>
												{parseInt(course.price).toLocaleString()} so'm
											</span>
										</div>
									</div>

									<button
										onClick={() => fetchCourse(course._id)}
										className='w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl'
									>
										Batafsil
									</button>
								</div>
							))}
						</div>
					) : (
						<div className='text-center py-12 mb-8'>
							<BookOpen className='w-16 h-16 text-gray-300 mx-auto mb-4' />
							<h3 className='text-lg font-medium text-gray-600 mb-2'>
								Kurslar topilmadi
							</h3>
						</div>
					)}
				</div>
			</div>
		),
		[user, error, dataLoading, accessToken, courses, fetchCourse]
	)

	// Kurs tafsilotlari ko'rinishi
	const CourseDetails = useMemo(() => {
		if (!selectedCourse) return null

		return (
			<div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4'>
				<div className='max-w-6xl mx-auto'>
					{/* Orqaga va tugmalar */}
					<div className='flex items-center justify-between mb-8'>
						<button
							onClick={() => setSelectedCourse(null)}
							className='flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200'
						>
							<ArrowLeft className='w-5 h-5' />
							Orqaga
						</button>
						<div className='flex gap-3'>
							<button
								onClick={() => setEditingCourse(selectedCourse)}
								className='flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors duration-200 shadow-lg'
							>
								<Edit className='w-4 h-4' />
								Tahrirlash
							</button>
							<button
								onClick={() => deleteCourse(selectedCourse._id)}
								className='flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors duration-200 shadow-lg'
							>
								<Trash2 className='w-4 h-4' />
								O'chirish
							</button>
						</div>
					</div>

					{/* Kurs ma'lumotlari */}
					<div className='bg-white rounded-2xl shadow-lg p-8 mb-6 border border-gray-100'>
						<h1 className='text-3xl font-bold text-gray-800 mb-6'>
							{selectedCourse.name}
						</h1>

						<div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
							<div className='text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl'>
								<p className='text-green-600 text-sm font-medium'>Narxi</p>
								<p className='text-2xl font-bold text-green-700'>
									{parseInt(selectedCourse.price).toLocaleString()} so'm
								</p>
							</div>
							<div className='text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl'>
								<p className='text-blue-600 text-sm font-medium'>Davomiyligi</p>
								<p className='text-2xl font-bold text-blue-700'>
									{selectedCourse.duration}{' '}
									{selectedCourse.duration_type === 'month'
										? 'oy'
										: selectedCourse.duration_type}
								</p>
							</div>
							<div className='text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl'>
								<p className='text-purple-600 text-sm font-medium'>
									Guruhlar soni
								</p>
								<p className='text-2xl font-bold text-purple-700'>
									{selectedCourse.groups_count}
								</p>
							</div>
						</div>

						{/* Metodologiya bo'limi */}
						<div className='flex justify-between items-center mb-6'>
							<h2 className='text-2xl font-semibold text-gray-800'>
								Kurs metodologiyasi
							</h2>
							<button
								onClick={() => setShowAddMethod(true)}
								className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg'
							>
								<Plus className='w-4 h-4' />
								Oy qo'shish
							</button>
						</div>

						{/* Yangi oy qo'shish formasi */}
						{showAddMethod && (
							<div className='bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6'>
								<h3 className='font-semibold text-blue-800 mb-4'>
									Yangi oy qo'shish
								</h3>
								<div className='flex flex-col md:flex-row gap-4'>
									<input
										type='text'
										placeholder='Oy nomi'
										value={newMethodTitle}
										onChange={e => setNewMethodTitle(e.target.value)}
										className='flex-1 px-4 py-3 border border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-300'
										autoFocus
									/>
									<div className='flex gap-2'>
										<button
											onClick={addMethodology}
											disabled={loading || !newMethodTitle.trim()}
											className='px-6 py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 disabled:opacity-50 transition-colors duration-200'
										>
											{loading ? 'Qo‘shilmoqda...' : 'Qo‘shish'}
										</button>
										<button
											onClick={() => {
												setShowAddMethod(false)
												setNewMethodTitle('')
											}}
											className='px-6 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors duration-200'
										>
											Bekor qilish
										</button>
									</div>
								</div>
							</div>
						)}

						{/* Metodologiya kontenti */}
						{selectedCourse.methodology &&
						selectedCourse.methodology.length > 0 ? (
							<div className='space-y-6'>
								{selectedCourse.methodology.map((method, monthIndex) => (
									<div
										key={monthIndex}
										className='bg-gray-50 border border-gray-200 rounded-xl p-6'
									>
										<div className='flex justify-between items-center mb-4'>
											<h3 className='text-xl font-semibold text-gray-800'>
												{method.month}-oy: {method.title}
											</h3>
											<div className='flex gap-2'>
												<button
													onClick={() => setSelectedMonth(monthIndex)}
													className='flex items-center gap-1 px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors duration-200'
												>
													<Plus className='w-3 h-3' />
													Dars
												</button>
												<button
													onClick={() => removeMethodology(monthIndex)}
													className='flex items-center gap-1 px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors duration-200'
												>
													<Trash2 className='w-3 h-3' />
													O'chirish
												</button>
											</div>
										</div>

										{/* Dars qo'shish formasi */}
										{selectedMonth === monthIndex && (
											<div className='bg-white border border-blue-200 rounded-xl p-4 mb-4'>
												<h4 className='font-semibold text-blue-800 mb-3'>
													Dars qo'shish
												</h4>
												<div className='space-y-3'>
													<input
														type='text'
														placeholder='Dars nomi'
														value={newLessonTitle}
														onChange={e => setNewLessonTitle(e.target.value)}
														className='w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none'
														autoFocus
													/>
													<textarea
														placeholder='Dars tavsifi'
														value={newLessonDesc}
														onChange={e => setNewLessonDesc(e.target.value)}
														className='w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none h-20 resize-none'
													/>
													<div className='flex gap-2'>
														<button
															onClick={() => addLesson(monthIndex)}
															disabled={
																!newLessonTitle.trim() || !newLessonDesc.trim()
															}
															className='px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors duration-200'
														>
															Qo'shish
														</button>
														<button
															onClick={() => {
																setSelectedMonth(null)
																setNewLessonTitle('')
																setNewLessonDesc('')
															}}
															className='px-4 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors duration-200'
														>
															Bekor qilish
														</button>
													</div>
												</div>
											</div>
										)}

										{/* Darslar ro'yxati */}
										{method.lessons && method.lessons.length > 0 ? (
											<div className='space-y-3'>
												{method.lessons.map((lesson, lessonIndex) => (
													<div
														key={lessonIndex}
														className='bg-white rounded-xl p-4 border border-gray-200'
													>
														<div className='flex justify-between items-start'>
															<div className='flex-1'>
																<h4 className='font-medium text-gray-800 mb-2'>
																	{lesson.title}
																</h4>
																<p className='text-gray-600 text-sm'>
																	{lesson.description}
																</p>
															</div>
															<button
																onClick={() =>
																	removeLesson(monthIndex, lessonIndex)
																}
																className='ml-4 text-red-500 hover:text-red-700 transition-colors duration-200'
															>
																<Trash2 className='w-4 h-4' />
															</button>
														</div>
													</div>
												))}
											</div>
										) : (
											<div className='text-center py-8'>
												<BookOpen className='w-12 h-12 text-gray-300 mx-auto mb-3' />
												<p className='text-gray-500'>Darslar mavjud emas</p>
											</div>
										)}
									</div>
								))}
							</div>
						) : (
							<div className='text-center py-12'>
								<BookOpen className='w-16 h-16 text-gray-300 mx-auto mb-4' />
								<p className='text-gray-500 text-lg'>
									Metodologiya qo'shilmagan
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		)
	}, [
		selectedCourse,
		showAddMethod,
		newMethodTitle,
		selectedMonth,
		newLessonTitle,
		newLessonDesc,
		loading,
		addMethodology,
		removeMethodology,
		addLesson,
		removeLesson,
		deleteCourse,
	])

	// Kurs tahrirlash formasi
	const EditCourseForm = useMemo(() => {
		if (!editingCourse) return null

		const EditForm = () => {
			const [formData, setFormData] = useState({
				name: editingCourse.name,
				price: editingCourse.price,
				duration: editingCourse.duration,
				duration_type: editingCourse.duration_type,
				groups_count: editingCourse.groups_count,
			})

			const handleSubmit = useCallback(async () => {
				await updateCourse(editingCourse._id, formData)
				setEditingCourse(null)
			}, [formData, editingCourse._id, updateCourse])

			const handleInputChange = useCallback((field, value) => {
				setFormData(prev => ({ ...prev, [field]: value }))
			}, [])

			return (
				<div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4'>
					<div className='max-w-2xl mx-auto'>
						<div className='bg-white rounded-2xl shadow-lg border border-gray-100 p-8'>
							<div className='text-center mb-8'>
								<div className='inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4'>
									<Edit className='w-6 h-6 text-white' />
								</div>
								<h2 className='text-2xl font-bold text-gray-800'>
									Kursni tahrirlash
								</h2>
							</div>

							<div className='space-y-6'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-2'>
										Kurs nomi
									</label>
									<input
										type='text'
										value={formData.name}
										onChange={e => handleInputChange('name', e.target.value)}
										className='w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-300'
									/>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-2'>
										Narxi
									</label>
									<input
										type='number'
										value={formData.price}
										onChange={e => handleInputChange('price', e.target.value)}
										className='w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-300'
									/>
								</div>

								<div className='grid grid-cols-2 gap-4'>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-2'>
											Davomiyligi
										</label>
										<input
											type='number'
											value={formData.duration}
											onChange={e =>
												handleInputChange(
													'duration',
													parseInt(e.target.value) || 0
												)
											}
											className='w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-300'
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-2'>
											Davomiylik turi
										</label>
										<select
											value={formData.duration_type}
											onChange={e =>
												handleInputChange('duration_type', e.target.value)
											}
											className='w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-300'
										>
											<option value='month'>Oy</option>
											<option value='week'>Hafta</option>
											<option value='day'>Kun</option>
										</select>
									</div>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-2'>
										Guruhlar soni
									</label>
									<input
										type='number'
										value={formData.groups_count}
										onChange={e =>
											handleInputChange(
												'groups_count',
												parseInt(e.target.value) || 0
											)
										}
										className='w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-300'
									/>
								</div>

								<div className='flex gap-4 pt-4'>
									<button
										onClick={handleSubmit}
										disabled={loading}
										className='flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-medium hover:from-green-600 hover:to-green-700 disabled:opacity-50 transition-all duration-300 shadow-lg'
									>
										{loading ? 'Saqlanmoqda...' : "O'zgarishlarni saqlash"}
									</button>
									<button
										onClick={() => setEditingCourse(null)}
										className='flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 rounded-xl font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg'
									>
										Bekor qilish
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)
		}

		return <EditForm />
	}, [editingCourse, loading, updateCourse])

	// Asosiy render
	if (editingCourse) {
		return EditCourseForm
	}

	if (selectedCourse) {
		return CourseDetails
	}

	return CoursesView
}

export default UnifiedCourses

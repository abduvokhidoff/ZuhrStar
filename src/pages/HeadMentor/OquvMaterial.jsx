import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Plus, BookOpen, Users, Calendar, CheckCircle, Clock, Star, Zap, AlertCircle, ArrowLeft, Edit, Trash2, X, Upload, File, Download } from 'lucide-react';

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
	const [selectedFile, setSelectedFile] = useState(null)
	const [uploadingFile, setUploadingFile] = useState(false)

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

	// Мемоизированные функции API
	const fetchCourses = useCallback(async () => {
		if (!accessToken) {
			setError('Токен авторизации отсутствует')
			setDataLoading(false)
			return
		}

		try {
			setDataLoading(true)
			setError(null)

			const response = await fetch(
				'https://zuhrstar-production.up.railway.app/api/courses',
				{
					method: 'GET',
					headers: config.headers,
				}
			)

			if (response.status === 401) {
				throw new Error('Ошибка авторизации. Проверьте токен доступа.')
			}

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}

			const data = await response.json()
			setCourses(data)
		} catch (error) {
			console.error('Error fetching courses:', error)
			setError('Не удалось загрузить курсы. Проверьте подключение к интернету.')
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
					`https://zuhrstar-production.up.railway.app/api/courses/id/${courseId}`,
					{
						headers: config.headers,
					}
				)

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`)
				}

				const data = await response.json()
				setSelectedCourse(data)
			} catch (error) {
				console.error('Error fetching course:', error)
				setError('Не удалось загрузить курс')
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
					`https://zuhrstar-production.up.railway.app/api/courses/id/${courseId}`,
					{
						method: 'PUT',
						headers: config.headers,
						body: JSON.stringify(updatedData),
					}
				)

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`)
				}

				const data = await response.json()
				setSelectedCourse(data)
				await fetchCourses()
				setError(null)
			} catch (error) {
				console.error('Error updating course:', error)
				setError('Не удалось обновить курс')
			} finally {
				setLoading(false)
			}
		},
		[accessToken, config.headers, fetchCourses]
	)

	const deleteCourse = useCallback(
		async courseId => {
			if (!window.confirm('Вы уверены, что хотите удалить этот курс?')) return

			try {
				setLoading(true)
				const response = await fetch(
					`https://zuhrstar-production.up.railway.app/api/courses/id/${courseId}`,
					{
						method: 'DELETE',
						headers: config.headers,
					}
				)

				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`)
				}

				setSelectedCourse(null)
				await fetchCourses()
				setError(null)
			} catch (error) {
				console.error('Error deleting course:', error)
				setError('Не удалось удалить курс')
			} finally {
				setLoading(false)
			}
		},
		[accessToken, config.headers, fetchCourses]
	)

	const convertFileToBase64 = useCallback((file) => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader()
			reader.readAsDataURL(file)
			reader.onload = () => resolve(reader.result)
			reader.onerror = error => reject(error)
		})
	}, [])

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

			try {
				setUploadingFile(true)
				
				const methodology = [...selectedCourse.methodology]
				const newLesson = {
					title: newLessonTitle,
					description: newLessonDesc,
				}

				// Если есть файл, конвертируем в base64 и добавляем
				if (selectedFile) {
					const base64File = await convertFileToBase64(selectedFile)
					const fileType = selectedFile.type
					
					// Определяем категорию файла
					let fileCategory = 'docs'
					if (fileType.includes('pdf')) {
						fileCategory = 'pdfs'
					} else if (fileType.includes('image')) {
						fileCategory = 'images'
					}

					newLesson.fileUrl = base64File
					newLesson.fileName = selectedFile.name
					newLesson.fileType = fileType
					newLesson.fileCategory = fileCategory
				}

				methodology[monthIndex].lessons.push(newLesson)

				const updatedCourse = {
					...selectedCourse,
					methodology,
				}

				await updateCourse(selectedCourse._id, updatedCourse)
				setNewLessonTitle('')
				setNewLessonDesc('')
				setSelectedFile(null)
				setSelectedMonth(null)
			} catch (error) {
				console.error('Error adding lesson:', error)
				setError('Не удалось добавить урок')
			} finally {
				setUploadingFile(false)
			}
		},
		[
			newLessonTitle,
			newLessonDesc,
			selectedFile,
			selectedCourse,
			updateCourse,
			convertFileToBase64,
		]
	)

	const removeMethodology = useCallback(
		async monthIndex => {
			if (!window.confirm('Удалить этот месяц?') || !selectedCourse) return

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
			if (!window.confirm('Удалить этот урок?') || !selectedCourse) return

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

	const handleFileSelect = useCallback((e) => {
		const file = e.target.files[0]
		if (file) {
			const allowedTypes = [
				'application/pdf',
				'application/msword',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				'application/vnd.ms-powerpoint',
				'application/vnd.openxmlformats-officedocument.presentationml.presentation',
				'application/vnd.ms-excel',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'image/jpeg',
				'image/jpg',
				'image/png',
				'image/gif',
			]
			
			// Проверяем размер файла (макс 10MB)
			if (file.size > 10 * 1024 * 1024) {
				setError('Файл слишком большой. Максимальный размер: 10MB')
				setSelectedFile(null)
				return
			}
			
			if (allowedTypes.includes(file.type)) {
				setSelectedFile(file)
				setError(null)
			} else {
				setError('Неподдерживаемый формат файла. Разрешены: PDF, Word, PowerPoint, Excel, изображения')
				setSelectedFile(null)
			}
		}
	}, [])

	const downloadFile = useCallback((fileUrl, fileName) => {
		if (fileUrl.startsWith('data:')) {
			// Если это base64, создаем ссылку для скачивания
			const link = document.createElement('a')
			link.href = fileUrl
			link.download = fileName || 'file'
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
		} else {
			// Если это обычная ссылка, открываем в новой вкладке
			window.open(fileUrl, '_blank')
		}
	}, [])

	useEffect(() => {
		if (accessToken) {
			fetchCourses()
		}
	}, [accessToken, fetchCourses])

	// Мемоизированный компонент списка курсов
	const CoursesView = useMemo(
		() => (
			<div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4'>
				<div className='max-w-7xl mx-auto'>
					{/* Header */}
					<div className='text-center mb-8'>
						<div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full mb-4 shadow-lg'>
							<BookOpen classNzame='w-8 h-8 text-white' />
						</div>
						<h1 className='text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2'>
							Управление курсами
						</h1>
						<p className='text-gray-600 text-lg'>
							{user
								? `Добро пожаловать, ${user.fullName}!`
								: 'Управляйте всеми курсами и их содержанием'}
						</p>
					</div>

					{/* Error Message */}
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

					{/* Курсы Grid */}
					{dataLoading ? (
						<div className='flex items-center justify-center py-12 mb-8'>
							<div className='text-center'>
								<div className='w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
								<p className='text-gray-600 text-lg'>Загрузка курсов...</p>
							</div>
						</div>
					) : !accessToken ? (
						<div className='text-center py-12 mb-8'>
							<AlertCircle className='w-16 h-16 text-red-300 mx-auto mb-4' />
							<h3 className='text-lg font-medium text-red-600 mb-2'>
								Требуется авторизация
							</h3>
							<p className='text-gray-500'>Пожалуйста, войдите в систему</p>
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
											? 'месяцев'
											: course.duration_type}{' '}
										длительность
									</p>

									<div className='space-y-2 text-sm mb-4'>
										<div className='flex items-center justify-between'>
											<div className='flex items-center gap-1 text-gray-500'>
												<Users className='w-4 h-4' />
												<span>{course.groups_count} групп</span>
											</div>
											<div className='flex items-center gap-1 text-blue-500'>
												<Clock className='w-4 h-4' />
												<span>{course.methodology?.length || 0} тем</span>
											</div>
										</div>
										<div className='flex items-center justify-between'>
											<span className='text-green-600 font-medium'>
												{parseInt(course.price).toLocaleString()} сум
											</span>
										</div>
									</div>

									<button
										onClick={() => fetchCourse(course._id)}
										className='w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl'
									>
										Подробнее
									</button>
								</div>
							))}
						</div>
					) : (
						<div className='text-center py-12 mb-8'>
							<BookOpen className='w-16 h-16 text-gray-300 mx-auto mb-4' />
							<h3 className='text-lg font-medium text-gray-600 mb-2'>
								Курсы не найдены
							</h3>
							<p className='text-gray-500'>Пока нет доступных курсов</p>
						</div>
					)}
				</div>
			</div>
		),
		[user, error, dataLoading, accessToken, courses, fetchCourse]
	)

	// Мемоизированный компонент деталей курса
	const CourseDetails = useMemo(() => {
		if (!selectedCourse) return null

		return (
			<div className='min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4'>
				<div className='max-w-6xl mx-auto'>
					{/* Header */}
					<div className='flex items-center justify-between mb-8'>
						<button
							onClick={() => setSelectedCourse(null)}
							className='flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200'
						>
							<ArrowLeft className='w-5 h-5' />
							Назад к курсам
						</button>
						<div className='flex gap-3'>
							<button
								onClick={() => setEditingCourse(selectedCourse)}
								className='flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors duration-200 shadow-lg'
							>
								<Edit className='w-4 h-4' />
								Редактировать
							</button>
							<button
								onClick={() => deleteCourse(selectedCourse._id)}
								className='flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors duration-200 shadow-lg'
							>
								<Trash2 className='w-4 h-4' />
								Удалить
							</button>
						</div>
					</div>

					{/* Error Message */}
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

					{/* Course Info */}
					<div className='bg-white rounded-2xl shadow-lg p-8 mb-6 border border-gray-100'>
						<h1 className='text-3xl font-bold text-gray-800 mb-6'>
							{selectedCourse.name}
						</h1>

						<div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
							<div className='text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl'>
								<p className='text-green-600 text-sm font-medium'>Стоимость</p>
								<p className='text-2xl font-bold text-green-700'>
									{parseInt(selectedCourse.price).toLocaleString()} сум
								</p>
							</div>
							<div className='text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl'>
								<p className='text-blue-600 text-sm font-medium'>
									Длительность
								</p>
								<p className='text-2xl font-bold text-blue-700'>
									{selectedCourse.duration}{' '}
									{selectedCourse.duration_type === 'month'
										? 'мес.'
										: selectedCourse.duration_type}
								</p>
							</div>
							<div className='text-center p-6 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl'>
								<p className='text-purple-600 text-sm font-medium'>Групп</p>
								<p className='text-2xl font-bold text-purple-700'>
									{selectedCourse.groups_count}
								</p>
							</div>
						</div>

						{/* Methodology Section */}
						<div className='flex justify-between items-center mb-6'>
							<h2 className='text-2xl font-semibold text-gray-800'>
								Методология курса
							</h2>
							<button
								onClick={() => setShowAddMethod(true)}
								className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg'
							>
								<Plus className='w-4 h-4' />
								Добавить месяц
							</button>
						</div>

						{/* Add Method Form */}
						{showAddMethod && (
							<div className='bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6'>
								<h3 className='font-semibold text-blue-800 mb-4'>
									Добавить новый месяц
								</h3>
								<div className='flex flex-col md:flex-row gap-4'>
									<input
										type='text'
										placeholder='Название месяца'
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
											{loading ? 'Добавление...' : 'Добавить'}
										</button>
										<button
											onClick={() => {
												setShowAddMethod(false)
												setNewMethodTitle('')
											}}
											className='px-6 py-3 bg-gray-500 text-white rounded-xl font-medium hover:bg-gray-600 transition-colors duration-200'
										>
											Отмена
										</button>
									</div>
								</div>
							</div>
						)}

						{/* Methodology Content */}
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
												Месяц {method.month}: {method.title}
											</h3>
											<div className='flex gap-2'>
												<button
													onClick={() => setSelectedMonth(monthIndex)}
													className='flex items-center gap-1 px-3 py-1 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors duration-200'
												>
													<Plus className='w-3 h-3' />
													Урок
												</button>
												<button
													onClick={() => removeMethodology(monthIndex)}
													className='flex items-center gap-1 px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors duration-200'
												>
													<Trash2 className='w-3 h-3' />
													Удалить
												</button>
											</div>
										</div>

										{/* Add Lesson Form */}
										{selectedMonth === monthIndex && (
											<div className='bg-white border border-blue-200 rounded-xl p-4 mb-4'>
												<h4 className='font-semibold text-blue-800 mb-3'>
													Добавить урок
												</h4>
												<div className='space-y-3'>
													<input
														type='text'
														placeholder='Название урока'
														value={newLessonTitle}
														onChange={e => setNewLessonTitle(e.target.value)}
														className='w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none'
														autoFocus
													/>
													<textarea
														placeholder='Описание урока'
														value={newLessonDesc}
														onChange={e => setNewLessonDesc(e.target.value)}
														className='w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none h-20 resize-none'
													/>
													
													{/* File Upload Section */}
													<div className='border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-blue-400 transition-colors duration-200'>
														<input
															type='file'
															id='file-upload'
															onChange={handleFileSelect}
															accept='.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif'
															className='hidden'
														/>
														<label
															htmlFor='file-upload'
															className='flex flex-col items-center cursor-pointer'
														>
															<Upload className='w-8 h-8 text-gray-400 mb-2' />
															<span className='text-sm text-gray-600 mb-1'>
																Загрузить файл (необязательно)
															</span>
															<span className='text-xs text-gray-400'>
																PDF, Word, PowerPoint, Excel, изображения (макс. 10MB)
															</span>
														</label>
														
														{selectedFile && (
															<div className='mt-3 flex items-center justify-between bg-blue-50 p-3 rounded-lg'>
																<div className='flex items-center gap-2'>
																	<File className='w-5 h-5 text-blue-500' />
																	<div className='flex flex-col'>
																		<span className='text-sm text-gray-700'>
																			{selectedFile.name}
																		</span>
																		<span className='text-xs text-gray-500'>
																			{(selectedFile.size / 1024).toFixed(2)} KB
																		</span>
																	</div>
																</div>
																<button
																	onClick={() => setSelectedFile(null)}
																	className='text-red-500 hover:text-red-700'
																>
																	<X className='w-4 h-4' />
																</button>
															</div>
														)}
													</div>

													<div className='flex gap-2'>
														<button
															onClick={() => addLesson(monthIndex)}
															disabled={
																!newLessonTitle.trim() || !newLessonDesc.trim() || uploadingFile
															}
															className='px-4 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors duration-200'
														>
															{uploadingFile ? 'Загрузка файла...' : loading ? 'Добавление...' : 'Добавить'}
														</button>
														<button
															onClick={() => {
																setSelectedMonth(null)
																setNewLessonTitle('')
																setNewLessonDesc('')
																setSelectedFile(null)
															}}
															className='px-4 py-2 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-colors duration-200'
														>
															Отмена
														</button>
													</div>
												</div>
											</div>
										)}

										{/* Lessons List */}
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
																<p className='text-gray-600 text-sm mb-3'>
																	{lesson.description}
																</p>
																
																{lesson.fileUrl && (
																	<button
																		onClick={() => downloadFile(lesson.fileUrl, lesson.fileName)}
																		className='inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors duration-200'
																	>
																		<Download className='w-4 h-4' />
																		<span>{lesson.fileName || 'Скачать файл'}</span>
																	</button>
																)}
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
												<p className='text-gray-500'>Уроки не добавлены</p>
											</div>
										)}
									</div>
								))}
							</div>
						) : (
							<div className='text-center py-12'>
								<BookOpen className='w-16 h-16 text-gray-300 mx-auto mb-4' />
								<p className='text-gray-500 text-lg'>
									Методология не добавлена
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
		selectedFile,
		loading,
		uploadingFile,
		error,
		addMethodology,
		removeMethodology,
		addLesson,
		removeLesson,
		deleteCourse,
		handleFileSelect,
		downloadFile,
	])

	// Мемоизированный компонент редактирования курса
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
			}, [formData])

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
									Редактирование курса
								</h2>
							</div>

							<div className='space-y-6'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-2'>
										Название курса
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
										Стоимость
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
											Длительность
										</label>
										<input
											type='number'
											value={formData.duration}
											onChange={e =>
												handleInputChange('duration', parseInt(e.target.value))
											}
											className='w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-300'
										/>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-2'>
											Тип длительности
										</label>
										<select
											value={formData.duration_type}
											onChange={e =>
												handleInputChange('duration_type', e.target.value)
											}
											className='w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all duration-300'
										>
											<option value='month'>Месяцы</option>
											<option value='year'>Годы</option>
										</select>
									</div>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-2'>
										Количество групп
									</label>
									<input
										type='number'
										value={formData.groups_count}
										onChange={e =>
											handleInputChange(
												'groups_count',
												parseInt(e.target.value)
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
										{loading ? 'Сохранение...' : 'Сохранить изменения'}
									</button>
									<button
										onClick={() => setEditingCourse(null)}
										className='flex-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white py-3 rounded-xl font-medium hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg'
									>
										Отмена
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

	// Основной рендер
	if (editingCourse) {
		return EditCourseForm
	}

	if (selectedCourse) {
		return CourseDetails
	}

	return CoursesView
}

export default UnifiedCourses
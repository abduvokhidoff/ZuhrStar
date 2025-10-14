import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setCredentials } from '../../redux/authSlice'
import {
	Clock,
	Code,
	Search,
	MapPin,
	Book,
	User,
	X,
	Users,
	Plus,
	ChevronLeft,
	Calendar,
	CheckCircle,
	XCircle,
} from 'lucide-react'

const Guruhlar = () => {
	const dispatch = useDispatch()
	const accessToken = useSelector(state => state.auth.accessToken)
	const refreshToken = useSelector(state => state.auth.refreshToken)

	const [groups, setGroups] = useState([])
	const [teachers, setTeachers] = useState([])
	const [courses, setCourses] = useState([])
	const [search, setSearch] = useState('')
	const [selectedGroup, setSelectedGroup] = useState(null)
	const [showCreateModal, setShowCreateModal] = useState(false)
	const [isCreating, setIsCreating] = useState(false)
	const [isLoadingTeachers, setIsLoadingTeachers] = useState(true)
	const [isLoadingCourses, setIsLoadingCourses] = useState(true)
	const [attendance, setAttendance] = useState([])
	const [isLoadingAttendance, setIsLoadingAttendance] = useState(false)
	const [currentMonth, setCurrentMonth] = useState(new Date())
	const [showAttendanceModal, setShowAttendanceModal] = useState(false)
	const [selectedStudent, setSelectedStudent] = useState(null)
	const [selectedDate, setSelectedDate] = useState(null)

	const [newGroup, setNewGroup] = useState({
		name: '',
		course: '',
		courseId: '',
		teacher: '',
		branch: '',
		days: { odd_days: false, even_days: false, every_days: false },
		start_time: '',
		end_time: '',
		students: [],
		telegramChatId: '',
	})

	const resetForm = () => {
		setNewGroup({
			name: '',
			course: '',
			courseId: '',
			teacher: '',
			branch: '',
			days: { odd_days: false, even_days: false, every_days: false },
			start_time: '',
			end_time: '',
			students: [],
			telegramChatId: '',
		})
	}

	const handleInputChange = (field, value) => {
		setNewGroup(prev => ({ ...prev, [field]: value }))
	}

	const handleTeacherChange = id => {
		setNewGroup(prev => ({ ...prev, teacher: id }))
	}

	const handleCourseChange = val => {
		const c = courses.find(
			x => String(x._id || x.id || x.name) === String(val) || x.name === val
		)
		setNewGroup(prev => ({
			...prev,
			course: c?.name || '',
			courseId: c?._id || c?.id || '',
		}))
	}

	const handleDaysChange = dayType => {
		setNewGroup(prev => ({
			...prev,
			days: {
				odd_days: dayType === 'odd_days',
				even_days: dayType === 'even_days',
				every_days: dayType === 'every_days',
			},
		}))
	}

	const fetchTeachers = async token => {
		try {
			const res = await fetch(
				'https://zuhrstar-production.up.railway.app/api/teachers',
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				}
			)

			if (res.status === 401) {
				const refreshRes = await fetch(
					'https://zuhrstar-production.up.railway.app/api/users/refresh',
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ refreshToken }),
					}
				)
				if (!refreshRes.ok) throw new Error('Token refresh failed.')
				const refreshData = await refreshRes.json()
				dispatch(setCredentials(refreshData))
				return fetchTeachers(refreshData.accessToken)
			}

			if (!res.ok) throw new Error('Failed to fetch teachers')

			const data = await res.json()
			const list = Array.isArray(data.teachers)
				? data.teachers
				: Array.isArray(data)
				? data
				: []
			setTeachers(list)
		} catch (err) {
			console.error('Error fetching teachers:', err.message)
			setTeachers([])
		} finally {
			setIsLoadingTeachers(false)
		}
	}

	const fetchCourses = async token => {
		try {
			const res = await fetch(
				'https://zuhrstar-production.up.railway.app/api/courses',
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				}
			)

			if (res.status === 401) {
				const refreshRes = await fetch(
					'https://zuhrstar-production.up.railway.app/api/users/refresh',
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ refreshToken }),
					}
				)
				if (!refreshRes.ok) throw new Error('Token refresh failed.')
				const refreshData = await refreshRes.json()
				dispatch(setCredentials(refreshData))
				return fetchCourses(refreshData.accessToken)
			}

			if (!res.ok) throw new Error('Failed to fetch courses')

			const data = await res.json()
			const list = Array.isArray(data.courses)
				? data.courses
				: Array.isArray(data)
				? data
				: []
			setCourses(list)
		} catch (err) {
			console.error('Error fetching courses:', err.message)
			setCourses([])
		} finally {
			setIsLoadingCourses(false)
		}
	}

	const fetchGroups = async token => {
		try {
			const res = await fetch(
				'https://zuhrstar-production.up.railway.app/api/groups',
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				}
			)

			if (res.status === 401) {
				const refreshRes = await fetch(
					'https://zuhrstar-production.up.railway.app/api/users/refresh',
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ refreshToken }),
					}
				)
				if (!refreshRes.ok) throw new Error('Token refresh failed.')
				const refreshData = await refreshRes.json()
				dispatch(setCredentials(refreshData))
				return fetchGroups(refreshData.accessToken)
			}

			if (!res.ok) throw new Error('Failed to fetch groups')

			const data = await res.json()
			setGroups(Array.isArray(data) ? data : [])
		} catch (err) {
			console.error('Error fetching groups:', err.message)
		}
	}

	const fetchAttendance = async (token, groupId) => {
		setIsLoadingAttendance(true)
		try {
			const res = await fetch(
				`https://zuhrstar-production.up.railway.app/api/attendance?groupId=${groupId}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				}
			)

			if (res.status === 401) {
				const refreshRes = await fetch(
					'https://zuhrstar-production.up.railway.app/api/users/refresh',
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ refreshToken }),
					}
				)
				if (!refreshRes.ok) throw new Error('Token refresh failed.')
				const refreshData = await refreshRes.json()
				dispatch(setCredentials(refreshData))
				return fetchAttendance(refreshData.accessToken, groupId)
			}

			if (!res.ok) throw new Error('Failed to fetch attendance')

			const data = await res.json()
			setAttendance(Array.isArray(data) ? data : [])
		} catch (err) {
			console.error('Error fetching attendance:', err.message)
			setAttendance([])
		} finally {
			setIsLoadingAttendance(false)
		}
	}

	const markAttendance = async (studentId, date, status) => {
		try {
			const res = await fetch(
				'https://zuhrstar-production.up.railway.app/api/attendance',
				{
					method: 'POST',
					headers: {
						Authorization: `Bearer ${accessToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						groupId: selectedGroup._id,
						studentId,
						date: date.toISOString().split('T')[0],
						status,
					}),
				}
			)

			if (!res.ok) throw new Error('Failed to mark attendance')

			await fetchAttendance(accessToken, selectedGroup._id)
			setShowAttendanceModal(false)
		} catch (err) {
			console.error('Error marking attendance:', err)
			alert("Davomat qo'yishda xatolik: " + err.message)
		}
	}

	const postGroup = async (token, payload, url) => {
		const res = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		})
		const rawText = await res.text()
		let parsed
		try {
			parsed = rawText ? JSON.parse(rawText) : {}
		} catch {
			parsed = { message: rawText }
		}
		return { res, parsed, rawText }
	}

	const createGroup = async token => {
		try {
			if (!newGroup.teacher) {
				alert("Iltimos, o'qituvchini tanlang!")
				return
			}

			const selectedTeacher = teachers.find(t => t._id === newGroup.teacher)
			if (!selectedTeacher) {
				alert("Tanlangan o'qituvchi topilmadi!")
				return
			}

			const d = newGroup.days || {}
			const safeDays =
				d.odd_days || d.even_days || d.every_days
					? {
							odd_days: !!d.odd_days,
							even_days: !!d.even_days,
							every_days: !!d.every_days,
					  }
					: { odd_days: false, even_days: false, every_days: true }

			const chatId =
				newGroup.telegramChatId && String(newGroup.telegramChatId).trim()
					? String(newGroup.telegramChatId).trim()
					: `grp_${Date.now()}`

			const payload = {
				teacher: newGroup.teacher,
				teacher_id: newGroup.teacher,
				teacher_fullName: selectedTeacher.fullName,
				name: (newGroup.name || 'Yangi guruh').trim(),
				course: newGroup.course || 'Temp',
				...(newGroup.courseId ? { course_id: newGroup.courseId } : {}),
				branch: (newGroup.branch || 'Main').trim(),
				start_time: newGroup.start_time || '09:00',
				end_time: newGroup.end_time || '10:00',
				days: safeDays,
				students: Array.isArray(newGroup.students) ? newGroup.students : [],
				telegramChatId: chatId,
			}

			let { res, parsed, rawText } = await postGroup(
				token,
				payload,
				'https://zuhrstar-production.up.railway.app/api/groups'
			)

			if (res.status === 404) {
				const second = await postGroup(
					token,
					payload,
					'https://zuhrstar-production.up.railway.app/api/groups/'
				)
				res = second.res
				parsed = second.parsed
				rawText = second.rawText
			}

			if (res.status === 401) {
				const refreshRes = await fetch(
					'https://zuhrstar-production.up.railway.app/api/users/refresh',
					{
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ refreshToken }),
					}
				)
				if (!refreshRes.ok) throw new Error('Token refresh failed.')
				const refreshData = await refreshRes.json()
				dispatch(setCredentials(refreshData))
				return createGroup(refreshData.accessToken)
			}

			if (!res.ok) {
				const msg =
					(parsed && (parsed.error || parsed.message)) ||
					rawText ||
					`HTTP ${res.status}`
				throw new Error(msg)
			}

			const created = parsed
			setGroups(prev => [...prev, created])
			setShowCreateModal(false)
			resetForm()
			return created
		} catch (err) {
			console.error('Error creating group:', err)
			alert('Guruh yaratishda xatolik: ' + (err?.message || String(err)))
		}
	}

	const handleSubmit = async e => {
		e.preventDefault()
		if (!newGroup.teacher) {
			alert("Iltimos, o'qituvchini tanlang!")
			return
		}
		setIsCreating(true)
		await createGroup(accessToken)
		setIsCreating(false)
	}

	useEffect(() => {
		if (accessToken) {
			fetchGroups(accessToken)
			fetchTeachers(accessToken)
			fetchCourses(accessToken)
		}
	}, [accessToken])

	const isClassDay = (date, groupDays) => {
		if (!groupDays) return false
		if (groupDays.every_days) return true
		const dayOfMonth = date.getDate()
		if (groupDays.odd_days && dayOfMonth % 2 !== 0) return true
		if (groupDays.even_days && dayOfMonth % 2 === 0) return true
		return false
	}

	const getClassDaysInMonth = (date, groupDays) => {
		const year = date.getFullYear()
		const month = date.getMonth()
		const firstDay = new Date(year, month, 1)
		const lastDay = new Date(year, month + 1, 0)
		const days = []

		for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
			if (isClassDay(d, groupDays)) {
				days.push(new Date(d))
			}
		}
		return days
	}

	const isClassTimeNow = group => {
		const now = new Date()

		if (!isClassDay(now, group.days)) return false

		const [startHour, startMin] = group.start_time.split(':').map(Number)
		const [endHour, endMin] = group.end_time.split(':').map(Number)

		const currentHour = now.getHours()
		const currentMin = now.getMinutes()
		const currentTime = currentHour * 60 + currentMin
		const startTime = startHour * 60 + startMin
		const endTime = endHour * 60 + endMin

		return currentTime >= startTime && currentTime <= endTime
	}

	const getAttendanceStatus = (studentId, date) => {
		const dateStr = date.toISOString().split('T')[0]
		const record = attendance.find(
			a => a.studentId === studentId && a.date?.split('T')[0] === dateStr
		)
		if (record) {
			return record.status === 'present' ? 'present' : 'absent'
		}
		return 'unmarked'
	}

	const formatDays = days => {
		if (!days) return 'Nomaʼlum'
		if (days.every_days) return 'Har kuni'
		if (days.odd_days) return 'Toq kunlar'
		if (days.even_days) return 'Juft kunlar'
		return 'Nomaʼlum'
	}

	const filteredGroups = groups.filter(g =>
		g.name?.toLowerCase().includes(search.toLowerCase())
	)

	const daysInMonth = selectedGroup
		? getClassDaysInMonth(currentMonth, selectedGroup.days)
		: []
	const monthNames = [
		'Yanvar',
		'Fevral',
		'Mart',
		'Aprel',
		'May',
		'Iyun',
		'Iyul',
		'Avgust',
		'Sentyabr',
		'Oktyabr',
		'Noyabr',
		'Dekabr',
	]
	const monthName = `${
		monthNames[currentMonth.getMonth()]
	} ${currentMonth.getFullYear()}`

	const handleGroupClick = group => {
		setSelectedGroup(group)
		if (group._id) {
			fetchAttendance(accessToken, group._id)
		}
	}

	const previousMonth = () => {
		const newMonth = new Date(currentMonth)
		newMonth.setMonth(newMonth.getMonth() - 1)
		setCurrentMonth(newMonth)
	}

	const nextMonth = () => {
		const newMonth = new Date(currentMonth)
		newMonth.setMonth(newMonth.getMonth() + 1)
		setCurrentMonth(newMonth)
	}

	const handleCellClick = (student, date) => {
		if (isClassTimeNow(selectedGroup)) {
			setSelectedStudent(student)
			setSelectedDate(date)
			setShowAttendanceModal(true)
		}
	}

	if (selectedGroup) {
		return (
			<div className='h-screen'>
				{/* Header with group info */}
				<div className='bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl'>
					<div className='px-6 py-4'>
						<button
							onClick={() => setSelectedGroup(null)}
							className='flex items-center gap-2 mb-3 hover:bg-white/10 px-3 py-1 rounded-xl transition-all text-white font-semibold text-sm'
						>
							<ChevronLeft size={16} />
							<span>Orqaga</span>
						</button>

						<div className='flex items-start justify-between'>
							<div className='flex-1'>
								<h1 className='text-2xl font-bold text-white mb-2'>
									{selectedGroup.name} - Davomat
								</h1>
								<div className='flex flex-wrap gap-3 text-white/90'>
									<div className='flex items-center gap-2 bg-white/10 px-3 py-1 rounded-xl text-sm'>
										<Users size={14} />
										<span className='font-medium'>
											{selectedGroup.students?.length || 0} o'quvchi
										</span>
									</div>
									<div className='flex items-center gap-2 bg-white/10 px-3 py-1 rounded-xl text-sm'>
										<MapPin size={14} />
										<span className='font-medium'>{selectedGroup.branch}</span>
									</div>
								</div>
							</div>

							{/* Group details cards */}
							<div className='flex gap-2'>
								<div className='bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/20'>
									<div className='text-xs text-white/70 mb-1'>Kurs</div>
									<div className='font-bold text-white text-sm'>
										{selectedGroup.course}
									</div>
								</div>
								<div className='bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/20'>
									<div className='text-xs text-white/70 mb-1'>O'qituvchi</div>
									<div className='font-bold text-white text-sm'>
										{selectedGroup.teacher_fullName || '—'}
									</div>
								</div>
								<div className='bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/20'>
									<div className='text-xs text-white/70 mb-1'>Vaqt</div>
									<div className='font-bold text-white text-sm'>
										{selectedGroup.start_time} - {selectedGroup.end_time}
									</div>
								</div>
								<div className='bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/20'>
									<div className='text-xs text-white/70 mb-1'>Kunlar</div>
									<div className='font-bold text-white text-sm'>
										{formatDays(selectedGroup.days)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Calendar Navigation */}
				<div className='bg-white border-b border-gray-200 shadow-sm'>
					<div className='px-6 py-3'>
						<div className='flex justify-between items-center overflwo'>
							<h2 className='text-lg font-bold text-gray-800 flex items-center gap-2'>
								<Calendar className='text-blue-600' size={20} />
								Davomat jadvali
							</h2>
							<div className='flex items-center gap-3'>
								<button
									onClick={previousMonth}
									className='p-1 hover:bg-gray-100 rounded-xl transition-all'
								>
									<ChevronLeft size={20} />
								</button>
								<span className='font-bold text-lg min-w-[160px] text-center text-gray-800'>
									{monthName}
								</span>
								<button
									onClick={nextMonth}
									className='p-1 hover:bg-gray-100 rounded-xl transition-all'
								>
									<ChevronLeft size={20} className='rotate-180' />
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Content - No scroll */}
				<div className='h-[calc(100vh-200px)] px-6 py-4'>
					<div className='bg-white rounded-xl shadow-lg h-full overflow-hidden'>
						{isLoadingAttendance ? (
							<div className='p-8 text-center h-full flex flex-col items-center justify-center'>
								<div className='inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent'></div>
								<p className='mt-3 text-gray-600 text-sm'>Yuklanmoqda...</p>
							</div>
						) : selectedGroup.students && selectedGroup.students.length > 0 ? (
							<div className='h-full'>
								<table className='w-full'>
									<thead className='sticky top-0 bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200'>
										<tr>
											<th className='px-4 py-2 text-left font-bold text-gray-800 w-60'>
												<div className='flex items-center gap-2'>
													<Users size={16} className='text-blue-600' />
													<span className='text-sm'>O'quvchi</span>
												</div>
											</th>
											{daysInMonth.map((day, idx) => {
												const dayNum = day.getDate()
												const weekDay = day.toLocaleDateString('uz-UZ', {
													weekday: 'short',
												})
												const isToday =
													day.toDateString() === new Date().toDateString()
												return (
													<th
														key={idx}
														className={`px-2 py-2 text-center ${
															isToday ? 'bg-blue-100' : ''
														}`}
													>
														<div className='flex flex-col items-center gap-0'>
															<span
																className={`font-bold text-sm ${
																	isToday ? 'text-blue-600' : 'text-gray-800'
																}`}
															>
																{dayNum}
															</span>
															<span className='text-xs text-gray-500 uppercase font-semibold'>
																{weekDay}
															</span>
														</div>
													</th>
												)
											})}
										</tr>
									</thead>
									<tbody>
										{selectedGroup.students.map((student, sIdx) => (
											<tr
												key={sIdx}
												className='border-b border-gray-100 hover:bg-blue-50/50 transition-colors'
											>
												<td className='px-4 py-2 font-medium text-gray-800'>
													<div className='flex items-center gap-2'>
														<div className='w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow'>
															{(student.fullName || student.name || 'N')
																.charAt(0)
																.toUpperCase()}
														</div>
														<div>
															<p className='font-semibold text-xs'>
																{student.fullName || student.name}
															</p>
															{student.phone && (
																<p className='text-xs text-gray-500'>
																	{student.phone}
																</p>
															)}
														</div>
													</div>
												</td>
												{daysInMonth.map((day, dIdx) => {
													const status = getAttendanceStatus(
														student._id || student.id,
														day
													)
													const canMark =
														isClassTimeNow(selectedGroup) &&
														day.toISOString().split('T')[0] ===
															new Date().toISOString().split('T')[0]
													const isToday =
														day.toDateString() === new Date().toDateString()

													return (
														<td
															key={dIdx}
															className={`px-2 py-2 text-center ${
																canMark
																	? 'cursor-pointer hover:bg-blue-200'
																	: ''
															} ${isToday ? 'bg-blue-50' : ''}`}
															onClick={() =>
																canMark && handleCellClick(student, day)
															}
														>
															{status === 'present' && (
																<div className='inline-flex items-center justify-center w-6 h-6 bg-green-100 rounded-lg'>
																	<CheckCircle
																		className='text-green-600'
																		size={16}
																	/>
																</div>
															)}
															{status === 'absent' && (
																<div className='inline-flex items-center justify-center w-6 h-6 bg-red-100 rounded-lg'>
																	<XCircle className='text-red-600' size={16} />
																</div>
															)}
															{status === 'unmarked' && (
																<div className='inline-flex items-center justify-center w-6 h-6 bg-gray-50 rounded-lg border border-dashed border-gray-300'></div>
															)}
														</td>
													)
												})}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						) : (
							<div className='p-8 text-center h-full flex flex-col items-center justify-center text-gray-500'>
								<Users size={40} className='mx-auto mb-3 text-gray-400' />
								<p className='text-base'>
									Bu guruhda hozircha o'quvchilar yo'q
								</p>
							</div>
						)}
					</div>
				</div>

				{showAttendanceModal && selectedStudent && selectedDate && (
					<div className='fixed inset-0 flex items-center justify-center z-50'>
						<div
							className='absolute inset-0 bg-black/50 backdrop-blur-sm'
							onClick={() => setShowAttendanceModal(false)}
						/>
						<div className='relative bg-white rounded-xl shadow-lg p-6 z-10 w-[350px]'>
							<h3 className='text-xl font-bold text-gray-900 mb-4 text-center'>
								Davomat qo'yish
							</h3>
							<div className='mb-4 text-center'>
								<p className='text-base font-semibold text-gray-800'>
									{selectedStudent.fullName || selectedStudent.name}
								</p>
								<p className='text-sm text-gray-500 mt-1'>
									{selectedDate.toLocaleDateString('uz-UZ', {
										day: 'numeric',
										month: 'long',
									})}
								</p>
							</div>
							<div className='flex gap-3'>
								<button
									onClick={() =>
										markAttendance(
											selectedStudent._id || selectedStudent.id,
											selectedDate,
											'present'
										)
									}
									className='flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow hover:shadow-md'
								>
									<CheckCircle size={20} />
									Keldi
								</button>
								<button
									onClick={() =>
										markAttendance(
											selectedStudent._id || selectedStudent.id,
											selectedDate,
											'absent'
										)
									}
									className='flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow hover:shadow-md'
								>
									<XCircle size={20} />
									Kelmadi
								</button>
							</div>
							<button
								onClick={() => setShowAttendanceModal(false)}
								className='w-full mt-3 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-all font-semibold text-sm'
							>
								Bekor qilish
							</button>
						</div>
					</div>
				)}
			</div>
		)
	}

	return (
		<div className=' px-6 py-8'>
			<div className='h-full flex flex-col'>
				<div className='flex justify-between items-center mb-6'>
					<div>
						<h1 className='text-3xl font-bold text-gray-900 mb-1'>Guruhlar</h1>
						<p className='text-gray-600 text-sm'>
							Barcha guruhlar va ularning ma'lumotlari
						</p>
					</div>
					<div className='flex items-center gap-3'>
						<div className='bg-white px-4 py-2 flex items-center gap-2 rounded-xl shadow border border-gray-100'>
							<Search size={16} className='text-gray-400' />
							<input
								type='text'
								value={search}
								onChange={e => setSearch(e.target.value)}
								className='outline-none text-sm w-48'
								placeholder='Guruh qidirish...'
							/>
						</div>
						<button
							onClick={() => setShowCreateModal(true)}
							className='bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:shadow-lg hover:scale-105 transition-all font-semibold text-sm'
						>
							<Plus size={16} />
							Yangi guruh
						</button>
					</div>
				</div>

				<div className='flex-1 '>
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4'>
						{filteredGroups.map(group => (
							<div
								key={group._id}
								onClick={() => handleGroupClick(group)}
								className='bg-white rounded-xl p-5 shadow hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 hover:scale-[1.02] group'
							>
								<div className='flex justify-between items-start mb-4'>
									<div>
										<h3 className='font-bold text-lg text-gray-900 mb-1 group-hover:text-blue-600 transition-colors'>
											{group.name}
										</h3>
										<p className='text-gray-600 text-sm'>{group.course}</p>
									</div>
									<div className='bg-gradient-to-br from-blue-100 to-indigo-100 p-2 rounded-xl group-hover:from-blue-200 group-hover:to-indigo-200 transition-all'>
										<Code size={24} className='text-blue-600' />
									</div>
								</div>

								<div className='space-y-2'>
									<div className='flex items-center gap-2 text-gray-700 text-sm'>
										<div className='bg-blue-50 p-1 rounded-lg'>
											<Clock size={14} className='text-blue-600' />
										</div>
										<span className='font-medium'>
											{group.start_time} - {group.end_time}
										</span>
									</div>

									<div className='flex items-center gap-2 text-gray-700 text-sm'>
										<div className='bg-blue-50 p-1 rounded-lg'>
											<User size={14} className='text-blue-600' />
										</div>
										<span className='font-medium'>
											{group.teacher_fullName || '—'}
										</span>
									</div>

									<div className='flex items-center gap-2 text-gray-700 text-sm'>
										<div className='bg-blue-50 p-1 rounded-lg'>
											<Users size={14} className='text-blue-600' />
										</div>
										<span className='font-medium'>
											{group.students?.length || 0} o'quvchi
										</span>
									</div>

									<div className='pt-2 mt-2 border-t border-gray-100'>
										<span className='inline-block bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 px-3 py-1 rounded-xl text-xs font-semibold'>
											{formatDays(group.days)}
										</span>
									</div>
								</div>
							</div>
						))}
					</div>

					{filteredGroups.length === 0 && (
						<div className='text-center py-12 h-full flex flex-col items-center justify-center'>
							<Users size={48} className='mx-auto text-gray-300 mb-3' />
							<p className='text-base text-gray-500'>Guruhlar topilmadi</p>
						</div>
					)}
				</div>
			</div>

			{showCreateModal && (
				<div className='fixed inset-0 flex items-center justify-center z-50'>
					<div
						className='absolute inset-0 bg-black/50 backdrop-blur-sm'
						onClick={() => {
							setShowCreateModal(false)
							resetForm()
						}}
					/>
					<div className='relative bg-white rounded-xl shadow-lg w-[600px] max-h-[85vh] overflow-y-auto p-6 z-10'>
						<button
							onClick={() => {
								setShowCreateModal(false)
								resetForm()
							}}
							className='absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full transition-all'
						>
							<X size={20} />
						</button>

						<div className='mb-6'>
							<h2 className='text-2xl font-bold text-gray-900 mb-1'>
								Yangi guruh yaratish
							</h2>
							<p className='text-gray-600 text-sm'>
								Barcha maydonlarni to'ldiring va yangi guruh yarating
							</p>
						</div>

						<form onSubmit={handleSubmit} className='space-y-4'>
							<div className='grid grid-cols-2 gap-4'>
								<div>
									<label className='block text-sm font-semibold text-gray-700 mb-1'>
										Guruh nomi
									</label>
									<input
										type='text'
										value={newGroup.name}
										onChange={e => handleInputChange('name', e.target.value)}
										className='w-full px-3 py-2 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm'
										placeholder='Masalan: Guruh 1'
									/>
								</div>

								<div>
									<label className='block text-sm font-semibold text-gray-700 mb-1'>
										Kurs
									</label>
									<select
										value={newGroup.courseId || newGroup.course}
										onChange={e => handleCourseChange(e.target.value)}
										className='w-full px-3 py-2 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm'
									>
										<option value=''>Kursni tanlang</option>
										{isLoadingCourses ? (
											<option value='' disabled>
												Yuklanmoqda...
											</option>
										) : courses.length > 0 ? (
											courses.map(c => (
												<option
													key={c._id || c.id || c.name}
													value={c._id || c.id || c.name}
												>
													{c.name}
												</option>
											))
										) : (
											<option value='' disabled>
												Kurslar topilmadi
											</option>
										)}
									</select>
								</div>
							</div>

							<div className='grid grid-cols-2 gap-4'>
								<div>
									<label className='block text-sm font-semibold text-gray-700 mb-1'>
										O'qituvchi *
									</label>
									<select
										value={newGroup.teacher}
										onChange={e => handleTeacherChange(e.target.value)}
										className='w-full px-3 py-2 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm'
										required
									>
										<option value=''>O'qituvchini tanlang</option>
										{isLoadingTeachers ? (
											<option value='' disabled>
												Yuklanmoqda...
											</option>
										) : teachers.length > 0 ? (
											teachers.map(t => (
												<option key={t._id} value={t._id}>
													{t.fullName} {t.phone ? `(${t.phone})` : ''}
												</option>
											))
										) : (
											<option value='' disabled>
												O'qituvchilar topilmadi
											</option>
										)}
									</select>
								</div>

								<div>
									<label className='block text-sm font-semibold text-gray-700 mb-1'>
										Filial
									</label>
									<input
										type='text'
										value={newGroup.branch}
										onChange={e => handleInputChange('branch', e.target.value)}
										className='w-full px-3 py-2 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm'
										placeholder='Masalan: Markaziy filial'
									/>
								</div>
							</div>

							<div className='grid grid-cols-2 gap-4'>
								<div>
									<label className='block text-sm font-semibold text-gray-700 mb-1'>
										Boshlanish vaqti
									</label>
									<input
										type='time'
										value={newGroup.start_time}
										onChange={e =>
											handleInputChange('start_time', e.target.value)
										}
										className='w-full px-3 py-2 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm'
									/>
								</div>
								<div>
									<label className='block text-sm font-semibold text-gray-700 mb-1'>
										Tugash vaqti
									</label>
									<input
										type='time'
										value={newGroup.end_time}
										onChange={e =>
											handleInputChange('end_time', e.target.value)
										}
										className='w-full px-3 py-2 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm'
									/>
								</div>
							</div>

							<div>
								<label className='block text-sm font-semibold text-gray-700 mb-2'>
									Dars kunlari
								</label>
								<div className='flex gap-3'>
									<label className='flex items-center px-3 py-2 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 transition-all text-sm'>
										<input
											type='radio'
											name='days'
											checked={newGroup.days.odd_days}
											onChange={() => handleDaysChange('odd_days')}
											className='mr-2 w-3 h-3'
										/>
										<span className='font-medium'>Toq kunlar</span>
									</label>
									<label className='flex items-center px-3 py-2 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 transition-all text-sm'>
										<input
											type='radio'
											name='days'
											checked={newGroup.days.even_days}
											onChange={() => handleDaysChange('even_days')}
											className='mr-2 w-3 h-3'
										/>
										<span className='font-medium'>Juft kunlar</span>
									</label>
									<label className='flex items-center px-3 py-2 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 transition-all text-sm'>
										<input
											type='radio'
											name='days'
											checked={newGroup.days.every_days}
											onChange={() => handleDaysChange('every_days')}
											className='mr-2 w-3 h-3'
										/>
										<span className='font-medium'>Har kuni</span>
									</label>
								</div>
							</div>

							<div>
								<label className='block text-sm font-semibold text-gray-700 mb-1'>
									Telegram chat ID
								</label>
								<input
									type='text'
									value={newGroup.telegramChatId}
									onChange={e =>
										handleInputChange('telegramChatId', e.target.value)
									}
									className='w-full px-3 py-2 border-2 border-gray-200 rounded-xl outline-none focus:border-blue-500 transition-all text-sm'
									placeholder='Masalan: grp_12345'
								/>
							</div>

							<div className='flex justify-end gap-3 pt-4 border-t border-gray-200'>
								<button
									type='button'
									onClick={() => {
										setShowCreateModal(false)
										resetForm()
									}}
									className='px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-xl transition-all font-semibold text-sm'
								>
									Bekor qilish
								</button>
								<button
									type='submit'
									disabled={isCreating}
									className='bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2 rounded-xl hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:hover:scale-100 font-semibold text-sm'
								>
									{isCreating ? 'Yaratilmoqda...' : 'Guruh yaratish'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	)
}

export default Guruhlar

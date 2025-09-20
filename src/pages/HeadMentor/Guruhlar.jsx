import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setCredentials } from '../../redux/authSlice'
import { Clock, Code, Search, MapPin, Book, User, X, Users, Plus } from 'lucide-react'

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

	// UI holati (teacher ID majburiy; qolganlari ixtiyoriy)
	const [newGroup, setNewGroup] = useState({
		name: '',
		course: '', // kurs nomi (select)
		courseId: '', // kurs ID (agar kerak bo‘lsa)
		teacher: '', // TEACHER ID (majburiy)
		branch: '',
		days: { odd_days: false, even_days: false, every_days: false },
		start_time: '',
		end_time: '',
		students: [],
		telegramChatId: '', // backend talab qilyapti — bo‘sh bo‘lmasin
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

	// Teacher ID tanlash
	const handleTeacherChange = id => {
		setNewGroup(prev => ({ ...prev, teacher: id }))
	}

	// Kurs tanlash (nom + id)
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

	// Kunlar radio
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

	// ---------- API: Teachers ----------
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

	// ---------- API: Courses ----------
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

	// ---------- API: Groups list ----------
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

	// ---------- Helper: POST + parse ----------
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

	// ---------- Create Group (teacher ID bo'yicha) ----------
	const createGroup = async token => {
		try {
			if (!newGroup.teacher) {
				alert("Iltimos, o'qituvchini tanlang!")
				return
			}

			// Find selected teacher to get full name
			const selectedTeacher = teachers.find(t => t._id === newGroup.teacher)
			if (!selectedTeacher) {
				alert("Tanlangan o'qituvchi topilmadi!")
				return
			}

			// Days normalize (bo'sh bo'lsa -> every_days: true)
			const d = newGroup.days || {}
			const safeDays =
				d.odd_days || d.even_days || d.every_days
					? {
							odd_days: !!d.odd_days,
							even_days: !!d.even_days,
							every_days: !!d.every_days,
					  }
					: { odd_days: false, even_days: false, every_days: true }

			// telegramChatId bo'sh bo'lmasin
			const chatId =
				newGroup.telegramChatId && String(newGroup.telegramChatId).trim()
					? String(newGroup.telegramChatId).trim()
					: `grp_${Date.now()}`

			// Payload: teacher ID va full name majburiy.
			const payload = {
				teacher: newGroup.teacher, // <-- ID
				teacher_id: newGroup.teacher, // (moslik uchun)
				teacher_fullName: selectedTeacher.fullName, // <-- Full name (server talab qiladi)
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

			console.log('[groups:create] payload =>', payload)

			// 1-urinish: /api/groups
			let { res, parsed, rawText } = await postGroup(
				token,
				payload,
				'https://zuhrstar-production.up.railway.app/api/groups'
			)

			// 404 bo‘lsa: /api/groups/ ga fallback
			if (res.status === 404) {
				console.warn('[groups:create] 404 -> fallback /api/groups/')
				const second = await postGroup(
					token,
					payload,
					'https://zuhrstar-production.up.railway.app/api/groups/'
				)
				res = second.res
				parsed = second.parsed
				rawText = second.rawText
			}

			// 401 -> refresh
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
				console.error(
					'[groups:create] status:',
					res.status,
					'body:',
					parsed || rawText
				)
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

	// Submit
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

	return (
		<div className='px-[30px] py-[50px] flex flex-col gap-[50px] relative'>
			{/* Header */}
			<div className='flex justify-between items-center'>
				<h1 className='text-[36px] font-[Nunito Sans] text-[#0A1629]'>
					Guruhlar
				</h1>
				<div className='flex items-center gap-4'>
					<div className='bg-[white] px-[20px] py-[8px] flex items-center gap-[12px] rounded-[15px] shadow-sm'>
						<Search size={16} />
						<input
							type='text'
							value={search}
							onChange={e => setSearch(e.target.value)}
							className='outline-none text-[18px]'
							placeholder='Guruh nomi...'
						/>
					</div>
					<button
						onClick={() => setShowCreateModal(true)}
						className='bg-[#348cff] text-white px-4 py-2 rounded-[15px] flex items-center gap-2 hover:bg-[#2d7ae6] transition-colors shadow-sm'
					>
						<Plus size={18} />
						Guruh qo'shish
					</button>
				</div>
			</div>

			{/* Group Cards */}
			<div className='flex flex-wrap gap-[20px] items-start'>
				{filteredGroups.map(group => (
					<div
						key={group._id}
						onClick={() => setSelectedGroup(group)}
						className='bg-white w-[32%] rounded-[20px] p-[25px] shadow hover:shadow-md transition-all duration-300 cursor-pointer'
					>
						<div className='flex justify-between items-center'>
							<p className='font-semibold text-xl'>{group.name}</p>
							<div className='bg-[#eaf3ff] p-2 rounded'>
								<Code size={28} className='text-[#348cff]' />
							</div>
						</div>

						<div className='flex flex-col gap-[10px] mt-[15px]'>
							<div className='flex items-center gap-[10px]'>
								<Clock size={16} className='text-[#348cff]' />
								<span>
									Vaqti: {group.start_time} - {group.end_time}
								</span>
							</div>
							<div className='flex items-center gap-[10px]'>
								<Book size={16} className='text-[#348cff]' />
								<span>Kurs: {group.course}</span>
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Create Group Modal */}
			{showCreateModal && (
				<div className='fixed inset-0 flex items-center justify-center z-50'>
					<div
						className='absolute inset-0 bg-black/40 backdrop-blur-sm'
						onClick={() => {
							setShowCreateModal(false)
							resetForm()
						}}
					/>
					<div className='relative bg-white rounded-2xl shadow-lg w-[700px] max-h-[90vh] overflow-y-auto p-6 z-10'>
						<button
							onClick={() => {
								setShowCreateModal(false)
								resetForm()
							}}
							className='absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full'
						>
							<X size={20} />
						</button>

						<div className='mb-6'>
							<h2 className='text-2xl font-bold text-[#0A1629]'>
								Yangi guruh yaratish
							</h2>
							<p className='text-sm text-gray-500 mt-1'>
								Istalgan o'qituvchi uchun yangi guruh yarating. O'qituvchini
								tanlang va guruh ma'lumotlarini to'ldiring.
							</p>
						</div>

						<form onSubmit={handleSubmit} className='space-y-4'>
							<div className='grid grid-cols-2 gap-4'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Guruh nomi
									</label>
									<input
										type='text'
										value={newGroup.name}
										onChange={e => handleInputChange('name', e.target.value)}
										className='w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-[#348cff]'
										placeholder='Guruh nomi'
									/>
								</div>

								{/* Kurs select */}
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Kurs
									</label>
									<select
										value={newGroup.courseId || newGroup.course}
										onChange={e => handleCourseChange(e.target.value)}
										className='w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-[#348cff]'
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
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										O&apos;qituvchi *
									</label>
									<select
										value={newGroup.teacher}
										onChange={e => handleTeacherChange(e.target.value)}
										className='w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-[#348cff]'
										required
									>
										<option value=''>O&apos;qituvchini tanlang</option>
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
												O&apos;qituvchilar topilmadi
											</option>
										)}
									</select>
								</div>

								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Filial
									</label>
									<input
										type='text'
										value={newGroup.branch}
										onChange={e => handleInputChange('branch', e.target.value)}
										className='w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-[#348cff]'
										placeholder='Filial nomi'
									/>
								</div>
							</div>

							<div className='grid grid-cols-2 gap-4'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Boshlanish vaqti
									</label>
									<input
										type='time'
										value={newGroup.start_time}
										onChange={e =>
											handleInputChange('start_time', e.target.value)
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-[#348cff]'
									/>
								</div>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Tugash vaqti
									</label>
									<input
										type='time'
										value={newGroup.end_time}
										onChange={e =>
											handleInputChange('end_time', e.target.value)
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-[#348cff]'
									/>
								</div>
							</div>

							<div>
								<label className='block text-sm font-medium text-gray-700 mb-2'>
									Dars kunlari
								</label>
								<div className='flex gap-4'>
									<label className='flex items-center'>
										<input
											type='radio'
											name='days'
											checked={newGroup.days.odd_days}
											onChange={() => handleDaysChange('odd_days')}
											className='mr-2'
										/>
										Toq kunlar
									</label>
									<label className='flex items-center'>
										<input
											type='radio'
											name='days'
											checked={newGroup.days.even_days}
											onChange={() => handleDaysChange('even_days')}
											className='mr-2'
										/>
										Juft kunlar
									</label>
									<label className='flex items-center'>
										<input
											type='radio'
											name='days'
											checked={newGroup.days.every_days}
											onChange={() => handleDaysChange('every_days')}
											className='mr-2'
										/>
										Har kuni
									</label>
								</div>
							</div>

							<div className='grid grid-cols-2 gap-4'>
								<div>
									<label className='block text-sm font-medium text-gray-700 mb-1'>
										Telegram chat ID *
									</label>
									<input
										type='text'
										value={newGroup.telegramChatId}
										onChange={e =>
											handleInputChange('telegramChatId', e.target.value)
										}
										className='w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-[#348cff]'
										placeholder='Masalan: grp_12345'
									/>
								</div>
								<div />
							</div>

							<div className='flex justify-end gap-4 pt-4'>
								<button
									type='button'
									onClick={() => {
										setShowCreateModal(false)
										resetForm()
									}}
									className='px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'
								>
									Bekor qilish
								</button>
								<button
									type='submit'
									disabled={isCreating}
									className='bg-[#348cff] text-white px-6 py-2 rounded-lg hover:bg-[#2d7ae6] transition-colors disabled:opacity-50'
								>
									{isCreating ? 'Yaratilmoqda...' : 'Guruh yaratish'}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* View Group Modal */}
			{selectedGroup && (
				<div className='fixed inset-0 flex items-center justify-center z-50'>
					<div
						className='absolute inset-0 bg-black/40 backdrop-blur-sm'
						onClick={() => setSelectedGroup(null)}
					/>
					<div className='relative bg-white rounded-2xl shadow-lg w-[600px] max-h-[90vh] overflow-y-auto p-6 z-10 animate-fadeIn'>
						<button
							onClick={() => setSelectedGroup(null)}
							className='absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full'
						>
							<X size={20} />
						</button>

						<div className='flex justify-between items-center'>
							<h2 className='text-2xl font-bold text-[#0A1629]'>
								{selectedGroup.name}
							</h2>
							<div className='bg-[#eaf3ff] p-2 rounded'>
								<Code size={28} className='text-[#348cff]' />
							</div>
						</div>

						<div className='flex flex-col gap-4 mt-6'>
							<div className='flex items-center gap-2'>
								<Clock size={18} className='text-[#348cff]' />
								<span>
									Vaqti: {selectedGroup.start_time} - {selectedGroup.end_time}
								</span>
							</div>
							<div className='flex items-center gap-2'>
								<Book size={18} className='text-[#348cff]' />
								<span>Kurs: {selectedGroup.course}</span>
							</div>
							<div className='flex items-center gap-2'>
								<User size={18} className='text-[#348cff]' />
								<span>
									O&apos;qituvchi:{' '}
									{selectedGroup.teacher_fullName ??
										selectedGroup.teacher?.fullName ??
										'—'}
								</span>
							</div>

							<div className='flex items-start gap-2'>
								<Users size={18} className='text-[#348cff] mt-1' />
								<div className='flex flex-col'>
									<span>O&apos;quvchilar:</span>
									<div className='ml-2 mt-1 flex flex-col gap-1'>
										{selectedGroup.students &&
										selectedGroup.students.length > 0 ? (
											selectedGroup.students.map((s, idx) => (
												<p key={idx} className='text-gray-700 text-sm'>
													{s.fullName || s.name}
												</p>
											))
										) : (
											<p className='text-gray-500 text-sm'>
												Hozircha o&apos;quvchilar yo&apos;q
											</p>
										)}
									</div>
								</div>
							</div>

							<div className='flex items-center gap-2'>
								<MapPin size={18} className='text-[#348cff]' />
								<span>Filial: {selectedGroup.branch}</span>
							</div>

							<p className='text-[#348cff] font-medium'>
								Dars kunlari: {formatDays(selectedGroup.days)}
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default Guruhlar

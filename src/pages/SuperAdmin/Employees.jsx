import React, { useEffect, useState } from 'react'
import filter from '../../assets/filter_employees.png'
import more from '../../assets/more.png'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { Eye, EyeOff } from 'lucide-react'

const EmployeeSkeleton = () => (
	<div className='employee bg-white w-[100%] rounded-[20px] flex justify-between items-center pl-[38px] pr-[38px] py-[20px] animate-pulse'>
		<div className='flex justify-center items-center gap-[24px]'>
			<div className='w-[48px] h-[48px] bg-gray-300 rounded-full'></div>
			<div className='flex flex-col justify-center items-start gap-y-[2px]'>
				<div className='h-4 bg-gray-300 rounded w-[120px] mb-1'></div>
				<div className='h-3 bg-gray-300 rounded w-[100px] mb-1'></div>
				<div className='h-3 bg-gray-300 rounded w-[140px]'></div>
			</div>
		</div>
		<div className='flex absolute left-[388px] flex-col justify-center items-start gap-y-[4px]'>
			<div className='h-3 bg-gray-300 rounded w-[50px] mb-1'></div>
			<div className='h-4 bg-gray-300 rounded w-[60px]'></div>
		</div>
		<div className='flex absolute left-[536px] flex-col justify-center items-start gap-y-[4px]'>
			<div className='h-3 bg-gray-300 rounded w-[80px] mb-1'></div>
			<div className='h-4 bg-gray-300 rounded w-[90px]'></div>
		</div>
		<div className='flex absolute left-[684px] flex-col justify-center items-start gap-y-[4px]'>
			<div className='h-3 bg-gray-300 rounded w-[30px] mb-1'></div>
			<div className='h-4 bg-gray-300 rounded w-[70px]'></div>
		</div>
		<div className='flex absolute left-[831px] flex-col justify-center items-start gap-y-[4px]'>
			<div className='h-3 bg-gray-300 rounded w-[40px] mb-1'></div>
			<div className='h-4 bg-gray-300 rounded w-[80px]'></div>
		</div>
		<div className='relative'>
			<div className='w-[24px] h-[24px] bg-gray-300 rounded'></div>
		</div>
	</div>
)

function Employees() {
	const accessToken = useSelector(state => state.auth.accessToken)
	const [selectedKind, setSelectedKind] = useState(null) // 'user' | 'teacher'
	const [selectedId, setSelectedId] = useState(null) // admin_id | teacher_id | _id | id

	const [users, setUsers] = useState([])
	const [teachers, setTeachers] = useState([])
	const [allPeople, setAllPeople] = useState([])
	const [loading, setLoading] = useState(false)
	const [showForm, setShowForm] = useState(false)
	const [formData, setFormData] = useState({
		fullName: '',
		phone: '',
		password: '',
		email: '',
		date_of_birth: '',
		gender: '',
		role: 'Mentor',
	})
	const [selectedUser, setSelectedUser] = useState(null)
	const [showEditModal, setShowEditModal] = useState(false)
	const [showConfirmDelete, setShowConfirmDelete] = useState(false)
	const [showMenuId, setShowMenuId] = useState(null)
	const [isDeleting, setIsDeleting] = useState(false)
	const [showPassword, setShowPassword] = useState(false)

	const combinedPeople = [
		...(Array.isArray(users) ? users.map(u => ({ ...u, __kind: 'user' })) : []),
		...(Array.isArray(teachers)
			? teachers.map(t => ({ ...t, __kind: 'teacher' }))
			: []),
	]

	const formatRole = role => {
		switch (role) {
			case 'superadmin':
				return 'Super Admin'
			case 'HeadMentor':
				return 'Head Mentor'
			case 'SupportTeacher':
				return 'Support Teacher'
			case 'admin':
				return 'Admin'
			default:
				return role || 'No Role'
		}
	}
	const fetchData = async () => {
		if (!accessToken) return
		setLoading(true)
		try {
			const [usersRes, teachersRes] = await Promise.all([
				axios.get('https://zuhr-star-production.up.railway.app/api/users', {
					headers: { Authorization: `Bearer ${accessToken}` },
				}),
				axios.get('https://zuhr-star-production.up.railway.app/api/teachers', {
					headers: { Authorization: `Bearer ${accessToken}` },
				}),
			])

			let usersData = []
			if (Array.isArray(usersRes.data)) {
				usersData = usersRes.data
			} else if (usersRes.data?.users) {
				usersData = usersRes.data.users
			} else if (usersRes.data?.data) {
				usersData = usersRes.data.data
			}

			let teachersData = []
			if (Array.isArray(teachersRes.data)) {
				teachersData = teachersRes.data
			} else if (teachersRes.data?.teachers) {
				teachersData = teachersRes.data.teachers
			} else if (teachersRes.data?.data) {
				teachersData = teachersRes.data.data
			}

			setUsers(usersData)
			setTeachers(teachersData)

			// объединяем
			setAllPeople([
				...usersData.map(u => ({ ...u, type: 'user' })),
				...teachersData.map(t => ({ ...t, type: 'teacher' })),
			])
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchData()
	}, [accessToken])

	const fetchUsers = async () => {
		if (!accessToken) return
		setLoading(true)
		try {
			const res = await axios.get(
				'https://zuhr-star-production.up.railway.app/api/users',
				{
					headers: { Authorization: `Bearer ${accessToken}` },
				}
			)
			let usersData = []
			if (Array.isArray(res.data)) {
				usersData = res.data
			} else if (res.data && Array.isArray(res.data.users)) {
				usersData = res.data.users
			} else if (res.data && Array.isArray(res.data.data)) {
				usersData = res.data.data
			} else if (res.data && typeof res.data === 'object') {
				const keys = Object.keys(res.data)
				for (const key of keys) {
					if (Array.isArray(res.data[key])) {
						usersData = res.data[key]
						break
					}
				}
			}
			setUsers(usersData)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchUsers()
	}, [accessToken])

	useEffect(() => {
		const handleClickOutside = () => setShowMenuId(null)
		if (showMenuId) {
			document.addEventListener('click', handleClickOutside)
			return () => document.removeEventListener('click', handleClickOutside)
		}
	}, [showMenuId])

	const handleInputChange = e => {
		const { name, value } = e.target
		setFormData(prev => ({ ...prev, [name]: value }))
	}

	const handleSubmit = async e => {
		e.preventDefault()

		if (showEditModal && selectedUser) {
			const url =
				selectedKind === 'teacher'
					? `https://zuhr-star-production.up.railway.app/api/teachers/${selectedId}`
					: `https://zuhr-star-production.up.railway.app/api/users/${selectedId}`

			await axios.put(url, formData, {
				headers: { Authorization: `Bearer ${accessToken}` },
			})

			setShowEditModal(false)
			setSelectedUser(null)
			setSelectedKind(null)
			setSelectedId(null)
			fetchData()
			return
		}

		// Создание нового сотрудника
		const role = formData.role.toLowerCase()
		let endpoint = ''
		let apiData = {}

		if (role === 'admin' || role === 'superadmin') {
			// Для users/register - только основные поля
			endpoint = 'https://zuhr-star-production.up.railway.app/api/users/register'
			apiData = {
				fullName: formData.fullName,
				phone: formData.phone,
				email: formData.email,
				password: formData.password,
				date_of_birth: formData.date_of_birth,
				gender: formData.gender,
				role: formData.role,
			}
		} else {
			// Для teachers/register - добавляем дополнительные поля автоматически
			endpoint =
				'https://zuhr-star-production.up.railway.app/api/teachers/register'
			apiData = {
				fullName: formData.fullName,
				phone: formData.phone,
				email: formData.email,
				password: formData.password,
				date_of_birth: formData.date_of_birth,
				gender: formData.gender,
				role: formData.role,
				company: 'ZuhrStar',
				position: 'Teacher',
				location: 'Tashkent, Uzbekistan',
				skype_username: `${formData.fullName
					.toLowerCase()
					.replace(/\s+/g, '.')}.skype`,
				imgURL:
					'https://tse3.mm.bing.net/th/id/OIP.5B1_LC8l5QuZADslXf8HdgHaHa?cb=thvnextc1&rs=1&pid=ImgDetMain&o=7&rm=3',
			}
		}

		try {
			await axios.post(endpoint, apiData, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					'Content-Type': 'application/json',
				},
			})

			// Закрываем форму и очищаем данные
			setShowForm(false)
			setFormData({
				fullName: '',
				phone: '',
				password: '',
				email: '',
				date_of_birth: '',
				gender: '',
				role: 'Mentor',
			})

			// Обновляем данные через 2 секунды
			setTimeout(() => {
				window.location.reload()
			}, 100)
		} catch (error) {
			console.error('Error creating employee:', error)
			// Здесь можно добавить обработку ошибок, например показать уведомление
		}
	}

	const handleEditClick = person => {
		const kind = person.__kind // 'user' | 'teacher'
		const id =
			kind === 'user'
				? person.admin_id || person._id || person.id
				: person.teacher_id || person._id || person.id

		setSelectedKind(kind)
		setSelectedId(id)
		setSelectedUser(person)

		setFormData({
			fullName: person.fullName || '',
			phone: person.phone || '',
			password: '',
			email: person.email || '',
			date_of_birth: person.date_of_birth
				? person.date_of_birth.slice(0, 10)
				: '',
			gender: person.gender || '',
			role: person.role || 'Mentor',
		})

		setShowEditModal(true)
		setShowMenuId(null)
	}

	const handleDeleteClick = person => {
		const kind = person.__kind
		const id =
			kind === 'user'
				? person.admin_id || person._id || person.id
				: person.teacher_id || person._id || person.id

		setSelectedKind(kind)
		setSelectedId(id)
		setSelectedUser(person)
		setShowConfirmDelete(true)
		setShowMenuId(null)
	}

	const confirmDelete = async () => {
		if (!selectedId || !selectedKind) return
		setIsDeleting(true)

		const url =
			selectedKind === 'teacher'
				? `https://zuhr-star-production.up.railway.app/api/teachers/${selectedId}`
				: `https://zuhr-star-production.up.railway.app/api/users/${selectedId}`

		await axios.delete(url, {
			headers: { Authorization: `Bearer ${accessToken}` },
		})

		setShowConfirmDelete(false)
		setSelectedUser(null)
		setSelectedKind(null)
		setSelectedId(null)
		setIsDeleting(false)
		fetchData()
	}

	const calculateAge = birthDateString => {
		const birthDate = new Date(birthDateString)
		const today = new Date()
		let age = today.getFullYear() - birthDate.getFullYear()
		const m = today.getMonth() - birthDate.getMonth()
		if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--
		return age
	}

	// === ВСТАВЛЕННАЯ ФУНКЦИЯ ===
	// Держим скелетон, пока не подгрузятся и users, и teachers.
	const pageIsLoading = () => {
		// если любой из массивов пока пуст или идёт общий loading — показываем скелетон
		const usersReady = Array.isArray(users) && users.length > 0
		const teachersReady = Array.isArray(teachers) && teachers.length > 0
		return loading || !usersReady || !teachersReady
	}

	return (
		<div className='relative bg-[#F4F9FD] pb-[107px] px-[40px]'>
			<div className='flex justify-between items-center mt-[30px]'>
				<h1 className='max-[360px]:text-[20px] max-[600px]:text-[26px] text-[36px] font-[700] font-[Nunito_sans]'>
					Xodimlar (
					{(Array.isArray(users) ? users.length : 0) +
						(Array.isArray(teachers) ? teachers.length : 0)}
					)
				</h1>
				<div className='w-[151px] max-[1000px]:hidden h-[40px] flex justify-center items-center bg-[#3F8CFF] rounded-[20px]'>
					<p className='text-[16px] font-[700] font-[Nunito_sans] text-white'>
						List
					</p>
				</div>
				<div className='flex justify-center items-center gap-[24px]'>
					<button
						onClick={() => setShowForm(true)}
						style={{ boxShadow: '0px 6px 12px 0px #3F8CFF43' }}
						className='max-[600px]:w-[100px] flex justify-center items-center bg-[#3F8CFF] text-white w-[179px] h-[48px] rounded-[14px] text-[16px] font-[700] font-[Nunito_sans]'
					>
						+ <p className='max-[600px]:hidden pl-[6px] pr-[6px]'>Xodim</p>{' '}
						qoshish
					</button>
				</div>
			</div>

			{(showForm || showEditModal) && (
				<div className='fixed inset-0 z-50 flex justify-center items-center bg-black/40 backdrop-blur-sm'>
					<div className='relative h-[600px] bg-white rounded-[16px] p-[24px] w-[90%] max-w-[450px] flex flex-col shadow-lg'>
						<button
							onClick={() => {
								setShowForm(false)
								setShowEditModal(false)
								setSelectedUser(null)
							}}
							className='absolute top-3 right-4 text-gray-400 hover:text-gray-600 text-xl'
						>
							×
						</button>
						<h2 className='text-[20px] font-[700] text-[#0A1629] mb-[10px]'>
							{showEditModal ? 'Edit Employee' : 'Add Employee'}
						</h2>
						<form
							onSubmit={handleSubmit}
							className='flex flex-col gap-[12px] h-full'
						>
							<div
								className='flex flex-col gap-[12px] overflow-y-auto pr-1'
								style={{ maxHeight: '430px' }}
							>
								<input
									name='fullName'
									value={formData.fullName}
									onChange={handleInputChange}
									placeholder='Full Name *'
									required
									className='border border-gray-300 rounded-[10px] p-2 outline-none'
								/>
								<input
									name='email'
									type='email'
									value={formData.email}
									onChange={handleInputChange}
									placeholder='Email *'
									required
									className='border border-gray-300 rounded-[10px] p-2 outline-none'
								/>
								<input
									name='phone'
									value={formData.phone}
									onChange={handleInputChange}
									placeholder='Phone Number *'
									required
									className='border border-gray-300 rounded-[10px] p-2 outline-none'
								/>
								<div className='relative'>
									<input
										type={showPassword ? 'text' : 'password'}
										name='password'
										value={formData.password}
										onChange={handleInputChange}
										placeholder='Password *'
										required={!showEditModal}
										className='border border-gray-300 rounded-[10px] p-2 pr-10 outline-none w-full'
									/>
									<button
										type='button'
										onClick={() => setShowPassword(!showPassword)}
										className='absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
									>
										{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
									</button>
								</div>
								<input
									name='date_of_birth'
									type='date'
									value={formData.date_of_birth}
									onChange={handleInputChange}
									className='border border-gray-300 rounded-[10px] p-2 outline-none'
								/>
								<select
									name='gender'
									value={formData.gender}
									onChange={handleInputChange}
									className='border border-gray-300 rounded-[10px] p-2 outline-none'
									required={!showEditModal}
								>
									<option value=''>Select Gender</option>
									<option value='erkak'>Erkak (Male)</option>
									<option value='ayol'>Ayol (Female)</option>
								</select>
								<select
									name='role'
									value={formData.role}
									onChange={handleInputChange}
									className='border border-gray-300 rounded-[10px] p-2 outline-none'
								>
									<option value='Mentor'>Mentor</option>
									<option value='HeadMentor'>HeadMentor</option>
									<option value='superadmin'>superadmin</option>
									<option value='admin'>admin</option>
									<option value='SupportTeacher'>SupportTeacher</option>
									<option value='Teacher'>Teacher</option>
								</select>
							</div>
							<button
								type='submit'
								className='bg-[#3F8CFF] text-white py-2 rounded-[10px] font-[700] font-[Nunito_sans] mt-auto'
							>
								{showEditModal ? 'Update' : 'Submit'}
							</button>
						</form>
					</div>
				</div>
			)}

			{showConfirmDelete && (
				<div className='fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50'>
					<div className='bg-white p-6 rounded-[10px] w-[300px] text-center shadow'>
						<p className='text-lg font-semibold mb-4'>
							Вы точно хотите удалить?
						</p>
						<div className='flex justify-center gap-4'>
							<button
								onClick={confirmDelete}
								disabled={isDeleting}
								className='bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 disabled:opacity-50'
							>
								{isDeleting ? 'Удаление...' : 'Да'}
							</button>
							<button
								onClick={() => {
									setShowConfirmDelete(false)
									setSelectedUser(null)
								}}
								disabled={isDeleting}
								className='bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 disabled:opacity-50'
							>
								Отмена
							</button>
						</div>
					</div>
				</div>
			)}

			<div className='all_employees max-[720px]:justify-center flex justify-between items-center gap-y-[20px] flex-wrap mt-[50px]'>
				{pageIsLoading() ? (
					Array.from({ length: 5 }, (_, index) => (
						<EmployeeSkeleton key={index} />
					))
				) : combinedPeople.length === 0 ? (
					<div className='w-full text-center text-gray-500 text-lg mt-8'>
						Нет сотрудников для отображения
					</div>
				) : (
					combinedPeople.map(person => (
						<div
							key={
								person._id || person.id || person.teacher_id || Math.random()
							}
							className='employee max-[900px]:w-[280px] max-[720px]:w-[280xp] max-[900px]:h-[450px] max-[900px]:flex-col max-[1170px]:px-[14px] relative bg-white w-[100%] rounded-[20px] flex justify-between items-center px-[38px] py-[20px]'
						>
							<div className='flex max-[900px]:mb-[20px] max-[900px]:mt-[20px] max-[900px]:flex-col max-[900px]:justify-center max-[900px]:items-center justify-center items-center max-[900px]:gap-[6px] gap-[24px]'>
								<img
									className='w-[50px]  max-[900px]:w-[100px] max-[900px]:h-[100px] h-[50px]'
									src={person.imgURL}
									alt=''
								/>
								<div className='flex flex-col justify-center max-[900px]:items-center items-start max-[900px]:gap-y-[0px] gap-y-[2px]'>
									<p className='text-[#0A1629] max-[380px]:text-[16px] max-[900px]:text-[22px] text-[16px] font-[700] font-[nunito_sans]'>
										{person.fullName || 'No Name'}
									</p>
									<p className='text-[#91929E] text-[14px] font-[400] font-[nunito_sans]'>
										{person.phone || 'No Phone'}
									</p>
									<p className='text-[#91929E] text-[12px] font-[400] font-[nunito_sans]'>
										{person.email || 'No Email'}
									</p>
								</div>
							</div>

							<div className='flex max-[380px]:hidden max-[900px]:block max-[900px]:left-[50px] max-[900px]:top-[360px] max-[1000px]:hidden absolute max-[1170px]:left-[320px] left-[388px] flex-col justify-center items-start gap-y-[4px]'>
								<p className='text-[#91929E] text-[14px] font-[400] font-[nunito_sans]'>
									Gender
								</p>
								<p className='text-[16px] text-[#0A1629]'>
									{person.gender || 'No Gender'}
								</p>
							</div>

							<div className='flex max-[380px]:hidden max-[900px]:block max-[900px]:left-[160px] max-[900px]:top-[360px] max-[1300px]:hidden absolute left-[536px] flex-col justify-center items-start gap-y-[4px]'>
								<p className='text-[#91929E] text-[14px] font-[400] font-[nunito_sans]'>
									Date of Birth
								</p>
								<p className='text-[16px] text-[#0A1629]'>
									{person.date_of_birth
										? person.date_of_birth.slice(0, 10)
										: 'No Data'}
								</p>
							</div>

							<div className='flex max-[380px]:items-center max-[380px]:left-[42%] max-[380px]:top-[320px] max-[1000px]:left-[320px] max-[900px]:left-[50px] max-[900px]:top-[280px] max-[1170px]:left-[390px] max-[1300px]:left-[470px] absolute left-[684px] flex-col justify-center items-start gap-y-[4px]'>
								<p className='text-[#91929E] text-[14px] font-[400] font-[nunito_sans]'>
									Age
								</p>
								<p className='text-[16px] max-[900px]:hidden text-[#0A1629]'>
									{person.date_of_birth
										? calculateAge(person.date_of_birth) + ' years old'
										: 'No Age'}
								</p>
								<p className='text-[16px] min-[900px]:hidden text-[#0A1629]'>
									{person.date_of_birth
										? calculateAge(person.date_of_birth) + ' y.o'
										: 'No Age'}
								</p>
							</div>

							<div className='flex max-[380px]:top-[250px] max-[380px]:left-[32%] max-[380px]:items-center max-[1000px]:left-[430px] max-[900px]:left-[160px] max-[900px]:top-[280px] z-40 max-[1170px]:left-[500px] max-[1300px]:left-[580px] absolute left-[831px] flex-col justify-center items-start gap-y-[4px]'>
								<p className='text-[#91929E] text-[14px] font-[400] font-[nunito_sans]'>
									Role
								</p>
								<p className='text-[16px] font-[600] text-[#0A1629]'>
									{formatRole?.(person.role) || 'Teacher'}
								</p>
							</div>

							{(person.__kind === 'user' || person.__kind === 'teacher') && (
								<div className='max-[900px]:absolute max-[900px]:right-[20px] max-[900px]:top-[20px]'>
									<button
										onClick={e => {
											e.stopPropagation()
											const key =
												person.__kind === 'user'
													? person.admin_id || person._id || person.id
													: person.teacher_id || person._id || person.id
											const menuKey = `${person.__kind}-${key}`
											setShowMenuId(showMenuId === menuKey ? null : menuKey)
										}}
										className='w-[32px] h-[32px] flex items-center justify-center rounded-full hover:bg-gray-100 transition-all duration-200 group'
									>
										<div className='flex flex-col gap-[3px]'>
											<div className='w-[4px] h-[4px] bg-gray-400 rounded-full group-hover:bg-[#3F8CFF] transition-colors'></div>
											<div className='w-[4px] h-[4px] bg-gray-400 rounded-full group-hover:bg-[#3F8CFF] transition-colors'></div>
											<div className='w-[4px] h-[4px] bg-gray-400 rounded-full group-hover:bg-[#3F8CFF] transition-colors'></div>
										</div>
									</button>

									{(() => {
										const key =
											person.__kind === 'user'
												? person.admin_id || person._id || person.id
												: person.teacher_id || person._id || person.id
										const menuKey = `${person.__kind}-${key}`
										return showMenuId === menuKey ? (
											<div className='absolute top-[70px] right-[10px] mt-0 bg-white border border-gray-200 rounded-[12px] shadow-lg w-[140px] z-50 overflow-hidden animate-fadeIn'>
												<button
													onClick={e => {
														e.stopPropagation()
														handleEditClick(person)
													}}
													className='w-full px-4 py-3 text-sm text-left hover:bg-blue-50 transition-colors duration-150 flex items-center gap-2 text-gray-700 hover:text-[#3F8CFF]'
												>
													<svg
														className='w-4 h-4'
														fill='none'
														stroke='currentColor'
														viewBox='0 0 24 24'
													>
														<path
															strokeLinecap='round'
															strokeLinejoin='round'
															strokeWidth={2}
															d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
														/>
													</svg>
													Изменить
												</button>
												<div className='border-t border-gray-100'></div>
												<button
													onClick={e => {
														e.stopPropagation()
														handleDeleteClick(person)
													}}
													className='w-full px-4 py-3 text-sm text-left hover:bg-red-50 transition-colors duration-150 flex items-center gap-2 text-red-500'
												>
													<svg
														className='w-4 h-4'
														fill='none'
														stroke='currentColor'
														viewBox='0 0 24 24'
													>
														<path
															strokeLinecap='round'
															strokeLinejoin='round'
															strokeWidth={2}
															d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
														/>
													</svg>
													Удалить
												</button>
											</div>
										) : null
									})()}
								</div>
							)}
						</div>
					))
				)}
			</div>
		</div>
	)
}

export default Employees

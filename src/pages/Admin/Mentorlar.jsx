// src/pages/Mentorlar.jsx
import React, { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { setCredentials } from '../../redux/authSlice'
import {
	Filter,
	Search,
	RefreshCw,
	Users,
	ArrowLeft,
	Calendar,
	Clock,
	MapPin,
} from 'lucide-react'

const API_BASE =
	import.meta?.env?.VITE_API_URL?.replace(/\/$/, '') ||
	'https://zuhrstar-production.up.railway.app'

export default function Mentorlar() {
	const dispatch = useDispatch()
	const navigate = useNavigate()
	const { accessToken, refreshToken } = useSelector(s => s.auth)

	const [mentors, setMentors] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [searchTerm, setSearchTerm] = useState('')
	const [showFilter, setShowFilter] = useState(false)

	// Новые состояния для групп
	const [showGroups, setShowGroups] = useState(false)
	const [mentorGroups, setMentorGroups] = useState([])
	const [loadingGroups, setLoadingGroups] = useState(false)
	const [currentMentor, setCurrentMentor] = useState(null)

	// --- REFRESH TOKEN ---
	const refreshAccessToken = async () => {
		const res = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken })
		dispatch(setCredentials(res.data))
		return res.data.accessToken
	}

	// --- AXIOS INSTANCE ---
	const api = axios.create({
		baseURL: `${API_BASE}/api`,
	})

	api.interceptors.request.use(config => {
		config.headers.Authorization = `Bearer ${accessToken}`
		return config
	})

	api.interceptors.response.use(
		res => res,
		async err => {
			if (err.response?.status === 401 && refreshToken) {
				const newToken = await refreshAccessToken()
				err.config.headers.Authorization = `Bearer ${newToken}`
				return api(err.config)
			}
			throw err
		}
	)

	// --- LOAD MENTORS ---
	const loadMentors = async () => {
		setLoading(true)
		setError('')
		try {
			const res = await api.get('/teachers')
			console.log('API Response:', res.data)

			let teachersData = []

			// Handle nested teachers array
			if (res.data && res.data.teachers && Array.isArray(res.data.teachers)) {
				teachersData = res.data.teachers
			} else if (Array.isArray(res.data)) {
				teachersData = res.data
			}

			// Filter only mentors with role "MENTOR"
			const mentorsOnly = teachersData.filter(
				teacher => teacher.role === 'Mentor' || teacher.Role === 'Mentor'
			)

			console.log('Filtered Mentors:', mentorsOnly)
			setMentors(mentorsOnly)
		} catch (e) {
			console.error('Load error:', e)
			setError("Ma'lumotlarni yuklashda xatolik yuz berdi.")
			setMentors([])
		} finally {
			setLoading(false)
		}
	}

	// --- LOAD MENTOR GROUPS ---
	const loadMentorGroups = async mentor => {
		setLoadingGroups(true)
		setError('')
		setCurrentMentor(mentor)
		setShowGroups(true)

		try {
			// Загружаем все группы
			const res = await api.get('/groups')
			console.log('Groups Response:', res.data)

			let allGroups = []
			if (Array.isArray(res.data)) {
				allGroups = res.data
			} else if (res.data && Array.isArray(res.data.groups)) {
				allGroups = res.data.groups
			}

			// Фильтруем группы по имени преподавателя
			const mentorFullName = mentor.fullName || mentor.FullName || ''
			const filteredGroups = allGroups.filter(
				group => group.teacher_fullName === mentorFullName
			)

			console.log('Filtered Groups for mentor:', filteredGroups)
			setMentorGroups(filteredGroups)
		} catch (e) {
			console.error('Load groups error:', e)
			setError('Guruhlarni yuklashda xatolik yuz berdi.')
			setMentorGroups([])
		} finally {
			setLoadingGroups(false)
		}
	}

	useEffect(() => {
		if (accessToken) loadMentors()
	}, [accessToken])

	// --- FILTER ---
	const filteredMentors = useMemo(() => {
		const q = searchTerm.trim().toLowerCase()
		if (!q) return mentors
		return mentors.filter(m =>
			`${m.fullName} ${m.phone} ${m.email} ${m.company}`
				.toLowerCase()
				.includes(q)
		)
	}, [mentors, searchTerm])

	// --- STATS ---
	const total = mentors.length

	// --- BACK TO MENTORS LIST ---
	const backToMentors = () => {
		setShowGroups(false)
		setCurrentMentor(null)
		setMentorGroups([])
	}

	// --- FORMAT DAY TYPE ---
	const formatDayType = days => {
		if (!days) return '—'
		if (days.every_days) return 'Har kuni'
		if (days.odd_days) return 'Toq kunlari'
		if (days.even_days) return 'Juft kunlari'
		return '—'
	}

	// --- NAVIGATE TO GROUP ---
	const goToGroup = group => {
		const id = group._id || group.group_id

		navigate(`/admin/guruhlar/`, {
			state: { group },
		})
	}

	// --- IF SHOWING GROUPS VIEW ---
	if (showGroups) {
		return (
			<div className='min-h-screen bg-gray-50'>
				{/* Header */}
				<div className='bg-white border-b border-gray-200 px-6 py-4'>
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-4'>
							<button
								onClick={backToMentors}
								className='flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors'
							>
								<ArrowLeft className='w-4 h-4' /> Orqaga
							</button>
							<div>
								<h1 className='text-xl font-semibold text-gray-800'>
									{currentMentor?.fullName} - GURUHLARI
								</h1>
								<div className='text-sm text-gray-500 mt-1'>
									{currentMentor?.email || currentMentor?.phone}
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Mentor Info Card */}
				<div className='p-6'>
					<div className='bg-white rounded-lg shadow-sm p-6 mb-6'>
						<div className='flex items-center gap-4'>
							<img
								src={currentMentor?.imgURL || 'https://via.placeholder.com/80'}
								alt={currentMentor?.fullName}
								className='w-20 h-20 rounded-full object-cover'
								onError={e => {
									e.target.src = 'https://via.placeholder.com/80'
								}}
							/>
							<div className='flex-1'>
								<h2 className='text-2xl font-bold text-gray-900 mb-2'>
									{currentMentor?.fullName}
								</h2>
								<div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
									<div>
										<span className='text-gray-500'>Telefon:</span>
										<p className='font-medium text-gray-900'>
											{currentMentor?.phone || '—'}
										</p>
									</div>
									<div>
										<span className='text-gray-500'>Email:</span>
										<p className='font-medium text-gray-900'>
											{currentMentor?.email || '—'}
										</p>
									</div>
									<div>
										<span className='text-gray-500'>Kompaniya:</span>
										<p className='font-medium text-gray-900'>
											{currentMentor?.company || '—'}
										</p>
									</div>
									<div>
										<span className='text-gray-500'>Lavozim:</span>
										<p className='font-medium text-gray-900'>
											{currentMentor?.position || '—'}
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>

					{/* Stats */}
					<div className='bg-white rounded-lg p-6 border-l-4 border-blue-500 shadow-sm mb-6'>
						<div className='flex justify-between items-center'>
							<div>
								<div className='text-3xl font-bold text-gray-800'>
									{mentorGroups.length}
								</div>
								<div className='text-sm text-gray-500 uppercase'>
									JAMI GURUHLAR
								</div>
							</div>
							<Users className='text-blue-500 w-8 h-8' />
						</div>
					</div>

					{/* Error Message */}
					{error && (
						<div className='mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm'>
							{error}
						</div>
					)}

					{/* Groups List */}
					{loadingGroups ? (
						<div className='text-center py-12'>
							<div className='animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3' />
							<div className='text-gray-500'>Guruhlar yuklanmoqda...</div>
						</div>
					) : mentorGroups.length === 0 ? (
						<div className='bg-white rounded-lg shadow-sm p-12 text-center'>
							<Users className='w-16 h-16 text-gray-300 mx-auto mb-4' />
							<p className='text-gray-500 text-lg'>
								Bu mentor hali guruhga biriktirilmagan
							</p>
						</div>
					) : (
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
							{mentorGroups.map((group, idx) => (
								<div
									key={group._id || idx}
									onClick={() => goToGroup(group)}
									className='bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200 cursor-pointer hover:border-blue-300'
								>
									<div className='flex items-start justify-between mb-4'>
										<div className='flex-1'>
											<h3 className='text-lg font-bold text-gray-900 mb-1'>
												{group.name || 'Guruh nomi'}
											</h3>
											<p className='text-sm text-gray-600'>
												{group.course || 'Kurs'}
											</p>
										</div>
										<span
											className={`px-3 py-1 rounded-full text-xs font-medium ${
												group.status === 'active'
													? 'bg-green-100 text-green-700'
													: 'bg-gray-100 text-gray-700'
											}`}
										>
											{group.status === 'active' ? 'Faol' : 'Nofaol'}
										</span>
									</div>

									<div className='space-y-3'>
										<div className='flex items-center gap-2 text-sm text-gray-600'>
											<MapPin className='w-4 h-4 text-gray-400' />
											<span>{group.branch || '—'}</span>
										</div>

										<div className='flex items-center gap-2 text-sm text-gray-600'>
											<Clock className='w-4 h-4 text-gray-400' />
											<span>
												{group.start_time || '—'} - {group.end_time || '—'}
											</span>
										</div>

										<div className='flex items-center gap-2 text-sm text-gray-600'>
											<Calendar className='w-4 h-4 text-gray-400' />
											<span>{formatDayType(group.days)}</span>
										</div>

										<div className='pt-3 border-t border-gray-200'>
											<div className='flex items-center justify-between'>
												<span className='text-sm text-gray-500'>
													O'quvchilar:
												</span>
												<span className='font-semibold text-blue-600'>
													{group.students?.length || 0}
												</span>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		)
	}

	// --- MAIN MENTORS LIST VIEW ---
	return (
		<div className='min-h-screen bg-gray-50'>
			{/* Header */}
			<div className='bg-white border-b border-gray-200 px-6 py-4'>
				<div className='flex items-center justify-between'>
					<h1 className='text-xl font-semibold text-gray-800'>MENTORLAR</h1>
					<div className='text-sm text-gray-500'>Mentorlar</div>
				</div>
			</div>

			{/* Stats - Full Width */}
			<div className='p-6'>
				<div className='bg-white p-6 rounded-lg border-l-4 border-blue-500 shadow-sm'>
					<div className='flex justify-between items-center'>
						<div>
							<div className='text-3xl font-bold'>{total}</div>
							<div className='text-sm text-gray-500 uppercase'>
								JAMI MENTORLAR
							</div>
						</div>
						<Users className='text-blue-500 w-8 h-8' />
					</div>
				</div>
			</div>

			{/* Error Message */}
			{error && (
				<div className='mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm'>
					{error}
				</div>
			)}

			{/* Search + Actions */}
			<div className='flex items-center justify-between px-6 mb-6'>
				<div className='flex items-center gap-3'>
					<div className='relative'>
						<Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4' />
						<input
							type='text'
							placeholder='Qidirish...'
							className='pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 text-sm focus:ring-2 focus:ring-blue-500 outline-none'
							value={searchTerm}
							onChange={e => setSearchTerm(e.target.value)}
						/>
					</div>
					<button
						onClick={() => setShowFilter(v => !v)}
						className='flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50'
					>
						<Filter className='w-4 h-4 text-gray-500' /> Filter
					</button>
				</div>

				<div className='flex items-center gap-3'>
					<button
						onClick={loadMentors}
						className='flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600'
					>
						<RefreshCw className='w-4 h-4' /> Yangilash
					</button>
				</div>
			</div>

			{/* Table */}
			<div className='bg-white rounded-lg shadow-sm mx-6 overflow-hidden mb-10'>
				<div className='bg-gray-50 px-6 py-3 border-b border-gray-200'>
					<div className='grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider'>
						<div className='col-span-1'>#</div>
						<div className='col-span-1'>Rasm</div>
						<div className='col-span-3'>F.I.Sh</div>
						<div className='col-span-2'>Telefon</div>
						<div className='col-span-3'>Email</div>
						<div className='col-span-2'>Kompaniya</div>
					</div>
				</div>

				<div className='divide-y divide-gray-100'>
					{loading ? (
						<div className='text-center py-8'>
							<div className='animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2' />
							<div className='text-gray-500'>Yuklanmoqda...</div>
						</div>
					) : filteredMentors.length === 0 ? (
						<div className='text-center py-8 text-gray-500'>
							Mentorlar topilmadi
						</div>
					) : (
						filteredMentors.map((m, i) => (
							<div
								key={m._id || i}
								onClick={() => loadMentorGroups(m)}
								className='px-6 py-4 hover:bg-blue-50 transition-colors cursor-pointer'
							>
								<div className='grid grid-cols-12 gap-4 items-center text-sm'>
									<div className='col-span-1 text-gray-900 font-medium'>
										{i + 1}
									</div>
									<div className='col-span-1'>
										<img
											src={m.imgURL || 'https://via.placeholder.com/40'}
											alt=''
											className='w-10 h-10 rounded-full object-cover'
											onError={e => {
												e.target.src = 'https://via.placeholder.com/40'
											}}
										/>
									</div>
									<div className='col-span-3 font-medium text-gray-900'>
										{m.fullName}
									</div>
									<div className='col-span-2 text-gray-600'>
										{m.phone || '—'}
									</div>
									<div className='col-span-3 text-gray-600'>
										{m.email || '—'}
									</div>
									<div className='col-span-2 text-gray-600'>
										{m.company || '—'}
									</div>
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	)
}

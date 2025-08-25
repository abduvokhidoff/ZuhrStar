import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setCredentials } from '../../redux/authSlice'
import { Clock, Code, Search, MapPin, Book, User, X } from 'lucide-react'

const Guruhlar = () => {
	const dispatch = useDispatch()
	const accessToken = useSelector(state => state.auth.accessToken)
	const refreshToken = useSelector(state => state.auth.refreshToken)

	const [groups, setGroups] = useState([])
	const [search, setSearch] = useState('')
	const [selectedGroup, setSelectedGroup] = useState(null)

	// Fetch all groups with refresh logic
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
				// Refresh token
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

	useEffect(() => {
		if (accessToken) fetchGroups(accessToken)
	}, [accessToken])

	// Format schedule
	const formatDays = days => {
		if (!days) return 'Nomaʼlum'
		if (days.every_days) return 'Har kuni'
		if (days.odd_days) return 'Toq kunlar'
		if (days.even_days) return 'Juft kunlar'
		return 'Nomaʼlum'
	}

	// Filter groups by search
	const filteredGroups = groups.filter(group =>
		group.name?.toLowerCase().includes(search.toLowerCase())
	)

	return (
		<div className='px-[30px] py-[50px] flex flex-col gap-[50px] relative'>
			{/* Header */}
			<div className='flex justify-between items-center'>
				<h1 className='text-[36px] font-[Nunito Sans] text-[#0A1629]'>
					Guruhlar
				</h1>
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
			</div>

			{/* Group Cards */}
			<div className='flex flex-wrap gap-[20px] items-start'>
				{filteredGroups.map(group => (
					<div
						key={group._id}
						onClick={() => setSelectedGroup(group)}
						className='bg-white w-[32%] rounded-[20px] p-[25px] shadow hover:shadow-md transition-all duration-300 cursor-pointer'
					>
						{/* Header */}
						<div className='flex justify-between items-center'>
							<p className='font-semibold text-xl'>{group.name}</p>
							<div className='bg-[#eaf3ff] p-2 rounded'>
								<Code size={28} className='text-[#348cff]' />
							</div>
						</div>

						{/* Basic Info */}
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

			{/* Modal */}
			{selectedGroup && (
				<div className='fixed inset-0 flex items-center justify-center z-50'>
					{/* Background Blur */}
					<div
						className='absolute inset-0 bg-black/40 backdrop-blur-sm'
						onClick={() => setSelectedGroup(null)}
					></div>

					{/* Modal Content */}
					<div className='relative bg-white rounded-2xl shadow-lg w-[600px] max-h-[90vh] overflow-y-auto p-6 z-10 animate-fadeIn'>
						{/* Close Button */}
						<button
							className='absolute top-4 right-4 text-gray-500 hover:text-gray-700'
							onClick={() => setSelectedGroup(null)}
						>
						
						</button>

						{/* Modal Header */}
						<div className='flex justify-between items-center'>
							<h2 className='text-2xl font-bold text-[#0A1629]'>
								{selectedGroup.name}
							</h2>
							<div className='bg-[#eaf3ff] p-2 rounded'>
								<Code size={28} className='text-[#348cff]' />
							</div>
						</div>

						{/* Details */}
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
								<span>O'qituvchi: {selectedGroup.teacher_fullName}</span>
							</div>
							<div className='flex items-center gap-2'>
								<MapPin size={18} className='text-[#348cff]' />
								<span>Filial: {selectedGroup.branch}</span>
							</div>

							<p className='text-[#348cff] font-medium'>
								Dars kunlari: {formatDays(selectedGroup.days)}
							</p>

							{selectedGroup.room && (
								<p className='text-gray-600'>Xona: {selectedGroup.room}</p>
							)}
							{selectedGroup.students_count !== undefined && (
								<p className='text-gray-600'>
									O'quvchilar soni: {selectedGroup.students_count}
								</p>
							)}
							{selectedGroup.max_students && (
								<p className='text-gray-600'>
									Maksimal o'quvchilar: {selectedGroup.max_students}
								</p>
							)}
							{selectedGroup.description && (
								<p className='text-gray-700 text-sm'>
									<strong>Tavsif:</strong> {selectedGroup.description}
								</p>
							)}
							{selectedGroup.price && (
								<p className='text-[#348cff] font-semibold text-lg'>
									Narx: {selectedGroup.price} so'm
								</p>
							)}
							{selectedGroup.status && (
								<span
									className={`px-3 py-1 rounded-full text-sm font-medium ${
										selectedGroup.status === 'active'
											? 'bg-green-100 text-green-800'
											: selectedGroup.status === 'inactive'
											? 'bg-red-100 text-red-800'
											: 'bg-yellow-100 text-yellow-800'
									}`}
								>
									Holat:{' '}
									{selectedGroup.status === 'active'
										? 'Faol'
										: selectedGroup.status === 'inactive'
										? 'Nofaol'
										: selectedGroup.status}
								</span>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default Guruhlar

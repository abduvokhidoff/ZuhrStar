import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setCredentials } from '../../redux/authSlice'
import { Clock, Code, Search, MapPin, Book, User } from 'lucide-react'

const Guruhlar = () => {
	const dispatch = useDispatch()
	const accessToken = useSelector(state => state.auth.accessToken)
	const refreshToken = useSelector(state => state.auth.refreshToken)

	const [groups, setGroups] = useState([])
	const [search, setSearch] = useState('')

	

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
	console.log(groups)

	return (
		<div className=' px-[30px] py-[50px] flex flex-col gap-[50px]'>
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
			<div className='flex flex-wrap gap-[20px]'>
				{filteredGroups.map(group => (
					<div
						key={group._id}
						className='bg-white w-[32%] rounded-[20px] p-[25px] shadow hover:shadow-md transition'
					>
						{/* Header */}
						<div className='flex justify-between items-center'>
							<p className='font-semibold text-xl'>{group.name}</p>
							<div className='bg-[#eaf3ff] p-2 rounded'>
								<Code size={28} className='text-[#348cff]' />
							</div>
						</div>

						{/* Info */}
						<div className='flex flex-col gap-[10px]'>
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
							<div className='flex items-center gap-[10px]'>
								<User size={16} className='text-[#348cff]' />
								<span>Teacher: {group.teacher_phone}</span>
							</div>
							<div className='flex items-center gap-[10px]'>
								<MapPin size={16} className='text-[#348cff]' />
								<span>Filial: {group.branch}</span>
							</div>
							<p className='text-[#348cff] font-medium'>
								Dars kunlari: {formatDays(group.days)}
							</p>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

export default Guruhlar

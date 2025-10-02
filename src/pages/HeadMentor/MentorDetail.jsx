import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'

const MentorDetail = () => {
	const { id } = useParams()
	const accessToken = useSelector(state => state.auth.accessToken)
	const navigate = useNavigate()

	const [mentor, setMentor] = useState(null)
	const [groups, setGroups] = useState([])
	const [selectedGroup, setSelectedGroup] = useState(null)

	useEffect(() => {
		fetch(`https://zuhrstar-production.up.railway.app/api/teachers/${id}`, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
		})
			.then(res => res.json())
			.then(data => setMentor(data.teacher))
			.catch(err => console.error('Error fetching mentor:', err))
	}, [id, accessToken])

	useEffect(() => {
		fetch('https://zuhrstar-production.up.railway.app/api/groups', {
			method: 'GET',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
		})
			.then(res => res.json())
			.then(data => setGroups(data))
			.catch(err => console.error('Error fetching groups:', err))
	}, [accessToken])

	const attachedGroups = mentor
		? groups.filter(group => group.teacher_fullName === mentor.fullName)
		: []

	// update selected group when attachedGroups change
	useEffect(() => {
		if (attachedGroups.length > 0) {
			setSelectedGroup(attachedGroups[0].group_id)
		}
	}, [attachedGroups])

	if (!mentor) {
		return (
			<div className='flex justify-center items-center h-screen'>
				<p className='text-lg font-semibold'>Loading mentor...</p>
			</div>
		)
	}

	return (
		<div className='flex flex-col gap-[30px] px-[30px] py-[20px]'>
			<div className='bg-[white] rounded-[20px] w-[100%] py-[25px] px-[20px] flex items-center justify-between'>
				<div className='flex flex-col gap-[5px]'>
					<h1 className='font-[Nunito Sans] font-[700] text-[40px] bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent'>
						{mentor.fullName}
					</h1>
					<p className='font-[Nunito Sans] font-[500] text-[18px] text-[#343434]'>
						Guruhlari va davomat
					</p>
				</div>
				<div>
					<button
						onClick={() => navigate('/head-mentor/mentorlar')}
						className='font-[Nunito Sans] font-[600] text-[16px] text-[#343434] border border-[#343434] rounded-[10px] px-[20px] py-[10px] hover:bg-[#343434] hover:text-[white] transition-all duration-300'
					>
						Ortga
					</button>
				</div>
			</div>

			{/* Groups Section */}
			<div className='bg-[white] rounded-[20px] w-[100%] py-[20px] px-[20px] flex flex-col gap-[20px] '>
				<h2 className='text-[25px] font-bold bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent '>
					Guruhlar
				</h2>
				<div className='flex items-center gap-[10px] flex-wrap'>
					{attachedGroups.length > 0 ? (
						attachedGroups.map(v => (
							<button
								key={v._id}
								onClick={() => setSelectedGroup(v.group_id)}
								className={`${
									selectedGroup === v.group_id
										? 'border-l-[6px] border-blue-600 bg-blue-100'
										: 'border-l-[4px] border-[#49a8f1] bg-[#49a8f136]'
								} w-[20%] py-[20px] rounded-[12px] flex flex-col items-start px-[10px]`}
							>
								<p className='font-semibold'>
									{v.start_time} - {v.end_time}
								</p>
								<p className='text-gray-600'>{v.name}</p>
								<p>
									{v.days.every_days
										? 'Har kuni'
										: v.days.even_days
										? 'Juft kunlar'
										: v.days.odd_days
										? 'Toq kunlar'
										: 'Kunlar belgilanmagan'}
								</p>
							</button>
						))
					) : (
						<p className='text-gray-500'>Bu mentor uchun guruhlar topilmadi.</p>
					)}
				</div>
			</div>

			{/* Attendance section */}
			<div className='flex flex-col gap-[10px] px-[10px] py-[20px] bg-[white] rounded-[20px]'>
				<div className='flex items-center justify-between '>
					<div>
						<h3>Davomat</h3>
						<p>
							{selectedGroup
								? `Tanlangan guruh: ${selectedGroup}`
								: 'Hech qanday guruh tanlanmadi'}
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}

export default MentorDetail

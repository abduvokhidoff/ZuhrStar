import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Check, X } from 'lucide-react'

const MentorDetail = () => {
	const { id } = useParams()
	const accessToken = useSelector(state => state.auth.accessToken)
	const navigate = useNavigate()

	const [mentor, setMentor] = useState(null)
	const [groups, setGroups] = useState([])
	const [selectedGroup, setSelectedGroup] = useState(null)
	const [attendance, setAttendance] = useState({})
	const [activeKey, setActiveKey] = useState(null)

	const today = new Date()
	const currentMonth = today.getMonth()
	const currentYear = today.getFullYear()
	const currentMonthName = today.toLocaleString('default', { month: 'long' })

	// === Fetch Mentor ===
	useEffect(() => {
		fetch(`https://zuhrstar-production.up.railway.app/api/teachers/${id}`, {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
		})
			.then(res => res.json())
			.then(data => setMentor(data.teacher))
			.catch(err => console.error('Error fetching mentor:', err))
	}, [id, accessToken])

	// === Fetch Groups ===
	useEffect(() => {
		fetch('https://zuhrstar-production.up.railway.app/api/groups', {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
		})
			.then(res => res.json())
			.then(data => setGroups(data))
			.catch(err => console.error('Error fetching groups:', err))
	}, [accessToken])

	// === Filter Groups belonging to Mentor ===
	const attachedGroups = mentor
		? groups.filter(g => g.teacher_fullName === mentor.fullName)
		: []

	// === Generate 12 Lesson Dates ===
	const generateLessonDates = group => {
		if (!group) return []
		const days = []
		const start = new Date(currentYear, currentMonth, 1)
		const end = new Date(currentYear, currentMonth + 1, 0)
		let lessonCount = 0

		for (
			let d = new Date(start);
			d <= end && lessonCount < 12;
			d.setDate(d.getDate() + 1)
		) {
			const day = d.getDay()
			if (
				group.days.every_days ||
				(group.days.even_days && [2, 4, 6].includes(day)) ||
				(group.days.odd_days && [1, 3, 5].includes(day))
			) {
				days.push(new Date(d))
				lessonCount++
			}
		}
		return days
	}

	const lessonDates = generateLessonDates(selectedGroup)

	// === Fetch Attendance ===
	useEffect(() => {
		if (!selectedGroup) return

		fetch('https://zuhrstar-production.up.railway.app/api/attendance', {
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${accessToken}`,
			},
		})
			.then(res => res.json())
			.then(data => {
				const filtered = data.filter(
					a => a.group_id === (selectedGroup.group_id || selectedGroup._id)
				)
				const obj = {}
				filtered.forEach(a => {
					obj[`${a.student_id}-${a.date}`] = a.status
				})
				setAttendance(obj)
			})
			.catch(err => console.error('Error fetching attendance:', err))
	}, [selectedGroup, accessToken])

	// === Post Attendance ===
	const postAttendance = async (studentId, date, status) => {
		if (!selectedGroup) return
		const key = `${studentId}-${date}`
		setAttendance(prev => ({ ...prev, [key]: status }))
		setActiveKey(null)

		try {
			await fetch('https://zuhrstar-production.up.railway.app/api/attendance', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${accessToken}`,
				},
				body: JSON.stringify({
					date,
					group_id: selectedGroup.group_id || selectedGroup._id,
					student_id: studentId,
					status,
				}),
			})
		} catch (err) {
			console.error('Error posting attendance:', err)
		}
	}

	if (!mentor) {
		return (
			<div className='flex justify-center items-center h-screen'>
				<p className='text-lg font-semibold'>Loading mentor...</p>
			</div>
		)
	}

	return (
		<div className='flex flex-col gap-8 px-8 py-6'>
			{/* Header */}
			<div className='bg-white rounded-2xl w-full py-6 px-6 flex items-center justify-between shadow-sm'>
				<div className='flex flex-col gap-1'>
					<h1 className='font-bold text-4xl text-[#0071ca]'>
						{mentor.fullName}
					</h1>
					<p className='text-gray-600'>Guruhlari va davomat</p>
				</div>
				<button
					onClick={() => navigate('/head-mentor/mentorlar')}
					className='border border-gray-400 rounded-lg px-5 py-2 text-gray-700 hover:bg-gray-800 hover:text-white transition-all'
				>
					Ortga
				</button>
			</div>

			{/* Groups */}
			<div className='bg-white rounded-2xl py-5 px-6 flex flex-col gap-4 shadow-sm'>
				<h2 className='text-2xl font-semibold text-[#0071ca]'>Guruhlar</h2>
				<div className='flex flex-wrap gap-3'>
					{attachedGroups.length > 0 ? (
						attachedGroups.map(v => (
							<button
								key={v._id}
								onClick={() => setSelectedGroup(v)}
								className={`transition-all w-[19%] py-4 rounded-xl flex flex-col items-start px-4 shadow-sm hover:shadow-md ${
									selectedGroup && selectedGroup._id === v._id
										? 'bg-blue-100 border-l-[6px] border-blue-600'
										: 'bg-[#f5f9ff] border-l-[4px] border-[#49a8f1]'
								}`}
							>
								<p className='font-semibold'>
									{v.start_time} - {v.end_time}
								</p>
								<p className='text-gray-600'>{v.name}</p>
								<p className='text-gray-500 text-sm'>
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

			{/* Attendance */}
			<div className='bg-white rounded-2xl py-6 px-6 shadow-sm relative'>
				<div className='flex items-center justify-between mb-4'>
					<div>
						<h3 className='text-2xl font-semibold text-[#0071ca]'>Davomat</h3>
						<p className='text-gray-600'>
							{selectedGroup
								? `Tanlangan guruh: ${selectedGroup.name}`
								: 'Hech qanday guruh tanlanmadi'}
						</p>
					</div>
					<div className='px-4 py-2 rounded-lg bg-blue-50 text-blue-700 font-medium'>
						{currentMonthName} {currentYear}
					</div>
				</div>

				{selectedGroup ? (
					<div
						className='overflow-x-auto relative'
						style={{ overflow: 'visible' }}
					>
						<table className='min-w-full border border-gray-200 rounded-lg overflow-visible relative'>
							<thead className='bg-blue-50'>
								<tr>
									<th className='py-3 px-4 font-semibold text-gray-700 text-left w-[200px]'>
										O‘quvchi
									</th>
									{lessonDates.map((date, idx) => (
										<th
											key={idx}
											className={`py-3 px-4 text-sm text-gray-600 text-center w-[60px] ${
												date.getDate() === today.getDate()
													? 'bg-blue-100 font-bold text-blue-700 rounded-t-lg'
													: ''
											}`}
										>
											{date.getDate()}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{selectedGroup.students.map(student => (
									<tr
										key={student.student_id}
										className='border-t hover:bg-gray-50 relative'
									>
										<td className='py-3 px-4 font-medium text-gray-800 whitespace-nowrap'>
											{student.name} {student.surname}
										</td>
										{lessonDates.map((date, idx) => {
											const localDate = new Date(
												date.getFullYear(),
												date.getMonth(),
												date.getDate(),
												12,
												0,
												0
											)
											const dateStr = localDate.toISOString()
											const key = `${student.student_id}-${dateStr}`
											const status = attendance[key]

											return (
												<td
													key={idx}
													className='py-2 px-4 text-center relative'
													style={{ overflow: 'visible' }}
												>
													{status === true ? (
														<div className='w-6 h-6 bg-green-500 rounded-full mx-auto shadow-sm'></div>
													) : status === false ? (
														<div className='w-6 h-6 bg-red-500 rounded-full mx-auto shadow-sm'></div>
													) : (
														<div
															onClick={() =>
																setActiveKey(activeKey === key ? null : key)
															}
															className='relative w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded-full flex items-center justify-center mx-auto cursor-pointer transition-all'
															style={{ overflow: 'visible', zIndex: 20 }}
														>
															<Plus size={16} className='text-gray-600' />
															{activeKey === key && (
																<div
																	className='absolute bottom-8 left-1/2 -translate-x-1/2 bg-white border rounded-lg shadow-md p-2 flex gap-2'
																	style={{
																		zIndex: 9999,
																		whiteSpace: 'nowrap',
																	}}
																>
																	<Check
																		size={16}
																		onClick={() =>
																			postAttendance(
																				student.student_id,
																				dateStr,
																				true
																			)
																		}
																		className='text-green-500 cursor-pointer hover:scale-110 transition-transform'
																	/>
																	<X
																		size={16}
																		onClick={() =>
																			postAttendance(
																				student.student_id,
																				dateStr,
																				false
																			)
																		}
																		className='text-red-500 cursor-pointer hover:scale-110 transition-transform'
																	/>
																</div>
															)}
														</div>
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
					<p className='text-gray-500'>Iltimos, avval guruh tanlang.</p>
				)}
			</div>
		</div>
	)
}

export default MentorDetail

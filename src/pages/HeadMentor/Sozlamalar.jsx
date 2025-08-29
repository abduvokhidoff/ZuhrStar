import {
	User,
	Mail,
	MapPin,
	Calendar,
	Building2,
	Phone,
	Users,
	X,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

const Sozlamalar = () => {
	const [users, setUsers] = useState([])
	const [loading, setLoading] = useState(true)
	const [isEditing, setIsEditing] = useState(false)
	const [formData, setFormData] = useState({})
	const user1 = useSelector(state => state.auth.user)
	const accessToken = useSelector(state => state.auth.accessToken)

	const user2 = users.find(v => v.fullName === user1?.fullName)

	const formatDate = dateString => {
		if (!dateString) return '—'
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		})
	}

	// GET all teachers
	useEffect(() => {
		const fetchUsers = async () => {
			try {
				const res = await fetch(
					'https://zuhrstar-production.up.railway.app/api/teachers',
					{
						headers: {
							Authorization: `Bearer ${accessToken}`,
							'Content-Type': 'application/json',
						},
					}
				)
				const data = await res.json()
				setUsers(data.teachers || [])
			} catch (err) {
				console.error('Fetch error:', err)
			} finally {
				setLoading(false)
			}
		}
		fetchUsers()
	}, [accessToken])

	// PUT update teacher
	const handleSave = async () => {
		try {
			const res = await fetch(
				`https://zuhrstar-production.up.railway.app/api/teachers/${user2?._id}`,
				{
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${accessToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(formData),
				}
			)

			if (!res.ok) throw new Error('Failed to update teacher')

			const updated = await res.json()

			// update state
			setUsers(prev => prev.map(u => (u._id === updated._id ? updated : u)))
			setIsEditing(false)
		} catch (err) {
			console.error('Update error:', err)
		}
	}

	if (loading) {
		return (
			<div className='min-h-screen bg-gray-50 p-6'>
				<div className='max-w-4xl mx-auto'>
					<div className='h-64 bg-gradient-to-r from-blue-200 to-purple-200 animate-pulse rounded-3xl mb-6' />
					<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6'>
						<div className='h-6 w-32 bg-gray-200 animate-pulse mb-4'></div>
						<div className='h-5 w-64 bg-gray-200 animate-pulse'></div>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-gray-50 p-6'>
			<div className='max-w-4xl mx-auto'>
				{/* Cover + Profile */}
				<div
					className='rounded-3xl mb-6 relative overflow-hidden'
					style={{ height: '22rem' }}
				>

					<div className='relative z-10 flex flex-col md:flex-row items-center md:items-end justify-between h-full p-8'>
						<div className='flex flex-col items-center md:items-start'>
							<div className='w-32 h-32 rounded-full overflow-hidden border-4 border-white bg-white shadow-lg mb-4 flex items-center justify-center'>
								{user2?.imgURL ? (
									<img
										className='w-full h-full object-cover'
										src={user2.imgURL}
										alt={user2.fullName}
									/>
								) : (
									<div className='w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center'>
										<User className='w-16 h-16 text-white' />
									</div>
								)}
							</div>
							<h1 className='text-3xl font-bold text-gray-900 mb-1'>
								{user2?.fullName || 'User Name'}
							</h1>
							<div className='flex flex-col md:flex-row items-center gap-2 text-gray-700'>
								<span>{user2?.position || 'Position'}</span>
								{user2?.company && <span>@{user2.company}</span>}
								{user2?.location && (
									<div className='flex items-center gap-1'>
										<MapPin className='w-4 h-4 text-gray-400' />
										<span>{user2.location}</span>
									</div>
								)}
							</div>
						</div>

						<div className='flex gap-2 mt-4 md:mt-0'>
							<button
								onClick={() => {
									setFormData(user2)
									setIsEditing(true)
								}}
								className='px-6 py-2 text-blue-600 border border-blue-200 rounded-lg bg-white/70 hover:bg-white transition'
							>
								Change
							</button>
							<button className='px-6 py-2 text-red-600 border border-red-200 rounded-lg bg-white/70 hover:bg-white transition'>
								Delete
							</button>
						</div>
					</div>
				</div>

				{/* Information Card */}
				<div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
					<div className='flex justify-between items-center p-6 border-b border-gray-100'>
						<div className='flex items-center gap-3'>
							<Users className='w-5 h-5 text-gray-400' />
							<span className='font-medium text-gray-700'>Meeting ID</span>
						</div>
						<div className='text-right'>
							<div className='font-semibold text-xl text-gray-900'>
								{user2?._id || '000-000-000'}
							</div>
							<div className='text-sm text-gray-500'>
								https://meeting/{user2?._id || '000000000'}
							</div>
						</div>
					</div>

					<div className='flex justify-between items-center p-6 border-b border-gray-100'>
						<div className='flex items-center gap-3'>
							<Mail className='w-5 h-5 text-gray-400' />
							<span>Email</span>
						</div>
						<div className='font-medium text-gray-900'>
							{user2?.email || 'user@example.com'}
						</div>
					</div>

					<div className='flex justify-between items-center p-6 border-b border-gray-100'>
						<div className='flex items-center gap-3'>
							<Building2 className='w-5 h-5 text-gray-400' />
							<span>Position</span>
						</div>
						<div className='font-medium text-gray-900'>
							{user2?.position || 'Employee'}
						</div>
					</div>

					<div className='flex justify-between items-center p-6 border-b border-gray-100'>
						<div className='flex items-center gap-3'>
							<Phone className='w-5 h-5 text-gray-400' />
							<span>Phone</span>
						</div>
						<div className='font-medium text-gray-900'>
							{user2?.phone || '+998 00 000 0000'}
						</div>
					</div>

					<div className='flex justify-between items-center p-6 border-b border-gray-100'>
						<div className='flex items-center gap-3'>
							<Calendar className='w-5 h-5 text-gray-400' />
							<span>Birth Date</span>
						</div>
						<div className='font-medium text-gray-900'>
							{formatDate(user2?.date_of_birth)}
						</div>
					</div>

					<div className='flex justify-between items-center p-6'>
						<div className='flex items-center gap-3'>
							<User className='w-5 h-5 text-gray-400' />
							<span>Gender</span>
						</div>
						<div className='font-medium text-gray-900'>
							{user2?.gender || 'Not specified'}
						</div>
					</div>
				</div>
			</div>

			{/* Modal for Edit */}
			{isEditing && (
				<div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'>
					<div className='bg-white rounded-2xl p-6 w-full max-w-lg relative'>
						<button
							onClick={() => setIsEditing(false)}
							className='absolute top-3 right-3 text-gray-500 hover:text-gray-700'
						>
							<X className='w-6 h-6' />
						</button>

						<h2 className='text-xl font-bold mb-4'>Edit Profile</h2>

						<div className='space-y-4'>
							<input
								type='text'
								placeholder='Full Name'
								defaultValue={user2?.fullName}
								onChange={e =>
									setFormData({ ...formData, fullName: e.target.value })
								}
								className='border p-2 w-full rounded'
							/>
							<input
								type='text'
								placeholder='Email'
								defaultValue={user2?.email}
								onChange={e =>
									setFormData({ ...formData, email: e.target.value })
								}
								className='border p-2 w-full rounded'
							/>
							<input
								type='text'
								placeholder='Phone'
								defaultValue={user2?.phone}
								onChange={e =>
									setFormData({ ...formData, phone: e.target.value })
								}
								className='border p-2 w-full rounded'
							/>

							<div className='flex gap-2 justify-end'>
								<button
									onClick={handleSave}
									className='px-6 py-2 bg-blue-600 text-white rounded-lg'
								>
									Save
								</button>
								<button
									onClick={() => setIsEditing(false)}
									className='px-6 py-2 bg-gray-300 rounded-lg'
								>
									Cancel
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default Sozlamalar

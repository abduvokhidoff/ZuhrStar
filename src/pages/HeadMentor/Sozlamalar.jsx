import {
	User,
	Mail,
	MapPin,
	Calendar,
	Building2,
	Phone,
	Users,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

const Sozlamalar = () => {
	const [users, setUsers] = useState([])
	const [loading, setLoading] = useState(true)
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
				{/* Cover Photo Section */}
				<div
					className='h-64 rounded-3xl mb-6 flex items-center w-full justify-end pr-6 pt-4 bg-cover bg-center bg-no-repeat'
					style={{
						backgroundImage: `url('https://images.unsplash.com/photo-1559827260-dc66d52bef19?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
					}}
				></div>

				{/* Profile Information Card */}
				<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6'>
					<div className='flex flex-col md:flex-row gap-6'>
						{/* Profile Picture */}
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
							<div className='flex flex-col md:flex-row items-center gap-2 text-gray-600'>
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

						{/* Buttons */}
						<div className='flex-1 flex justify-center md:justify-end items-start gap-2'>
							<button className='px-6 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50'>
								Change
							</button>
							<button className='px-6 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50'>
								Delete
							</button>
						</div>
					</div>
				</div>

				{/* Information Card */}
				<div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
					{/* Meeting ID */}
					<div className='flex justify-between items-center p-6 border-b border-gray-100'>
						<div className='flex items-center gap-3'>
							<Users className='w-5 h-5 text-gray-400' />
							<span className='font-medium text-gray-700'>Meeting ID</span>
						</div>
						<div className='text-right'>
							<div className='font-semibold text-xl text-gray-900'>
								{user2?.id || '000-000-000'}
							</div>
							<div className='text-sm text-gray-500'>
								https://meeting/{user2?.id || '000000000'}
							</div>
						</div>
					</div>

					{/* Email */}
					<div className='flex justify-between items-center p-6 border-b border-gray-100'>
						<div className='flex items-center gap-3'>
							<Mail className='w-5 h-5 text-gray-400' />
							<span>Email</span>
						</div>
						<div className='font-medium text-gray-900'>
							{user2?.email || 'user@example.com'}
						</div>
					</div>

					{/* Position */}
					<div className='flex justify-between items-center p-6 border-b border-gray-100'>
						<div className='flex items-center gap-3'>
							<Building2 className='w-5 h-5 text-gray-400' />
							<span>Position</span>
						</div>
						<div className='font-medium text-gray-900'>
							{user2?.position || 'Employee'}
						</div>
					</div>

					{/* Phone */}
					<div className='flex justify-between items-center p-6 border-b border-gray-100'>
						<div className='flex items-center gap-3'>
							<Phone className='w-5 h-5 text-gray-400' />
							<span>Phone</span>
						</div>
						<div className='font-medium text-gray-900'>
							{user2?.phone || '+998 00 000 0000'}
						</div>
					</div>

					{/* Birth Date */}
					<div className='flex justify-between items-center p-6 border-b border-gray-100'>
						<div className='flex items-center gap-3'>
							<Calendar className='w-5 h-5 text-gray-400' />
							<span>Birth Date</span>
						</div>
						<div className='font-medium text-gray-900'>
							{formatDate(user2?.date_of_birth)}
						</div>
					</div>

					{/* Gender */}
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
		</div>
	)
}

export default Sozlamalar

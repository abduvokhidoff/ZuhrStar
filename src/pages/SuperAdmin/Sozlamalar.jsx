import {
	User,
	Mail,
	MapPin,
	Calendar,
	Building2,
	Phone,
	Camera,
	Trash2,
	CheckCircle,
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
					'https://zuhr-star-production.up.railway.app/api/users',
					{
						headers: {
							Authorization: `Bearer ${accessToken}`,
							'Content-Type': 'application/json',
						},
					}
				)
				const data = await res.json()
				setUsers(data.admins || [])
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
			<div className='min-h-screen bg-gray-50 p-3 sm:p-6'>
				<div className='max-w-2xl mx-auto'>
					{/* Header Skeleton */}
					<div className='mb-6 sm:mb-8 text-center'>
						<div className='h-6 sm:h-8 w-40 sm:w-48 bg-gray-200 rounded-lg animate-pulse mb-2 mx-auto'></div>
						<div className='h-3 sm:h-4 w-48 sm:w-64 bg-gray-200 rounded animate-pulse mx-auto'></div>
					</div>

					{/* Profile Card Skeleton */}
					<div className='bg-white rounded-2xl shadow-md p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 max-w-xs sm:max-w-sm mx-auto'>
						<div className='text-center'>
							<div className='w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-gray-200 rounded-full animate-pulse mx-auto mb-4 sm:mb-6'></div>
							<div className='h-5 sm:h-6 w-32 sm:w-40 bg-gray-200 rounded animate-pulse mx-auto mb-3'></div>
							<div className='h-4 w-20 sm:w-24 bg-gray-200 rounded-full animate-pulse mx-auto mb-2'></div>
							<div className='h-3 w-24 sm:w-32 bg-gray-200 rounded animate-pulse mx-auto mb-2'></div>
							<div className='h-3 w-20 sm:w-28 bg-gray-200 rounded animate-pulse mx-auto'></div>
						</div>
					</div>

					{/* Info Cards Skeleton */}
					<div className='grid gap-3 sm:gap-4'>
						{[1, 2, 3, 4, 5, 6].map(i => (
							<div
								key={i}
								className='bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6'
							>
								<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4'>
									<div className='flex items-center gap-3 sm:gap-4'>
										<div className='w-5 h-5 bg-gray-200 rounded animate-pulse flex-shrink-0'></div>
										<div className='flex-1'>
											<div className='h-4 sm:h-5 w-24 sm:w-32 bg-gray-200 rounded animate-pulse mb-2'></div>
											<div className='h-3 w-32 sm:w-40 bg-gray-200 rounded animate-pulse'></div>
										</div>
									</div>
									<div className='h-4 sm:h-5 w-32 sm:w-48 bg-gray-200 rounded animate-pulse ml-8 sm:ml-0'></div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-gray-50 p-3 sm:p-6'>
			<div className='max-w-2xl mx-auto'>
				{/* Header */}
				<div className='mb-6 sm:mb-8 text-center'>
					<h1 className='text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2'>
						Account Settings
					</h1>
					<p className='text-gray-600 text-sm sm:text-base md:text-lg'>
						Manage your profile information and account preferences
					</p>
				</div>

				{/* Profile Header Card - Responsive Square */}
				<div className='bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 md:p-8 mb-6 sm:mb-8 max-w-xs sm:max-w-sm mx-auto'>
					<div className='text-center'>
						{/* Profile Picture */}
						<div className='relative inline-block mb-4 sm:mb-6'>
							<div className='w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden shadow-lg'>
								{user2?.imgURL ? (
									<img
										className='w-full h-full object-cover'
										src={user2.imgURL}
										alt={user2.fullName}
									/>
								) : (
									<div className='w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center'>
										<User className='w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-white' />
									</div>
								)}
							</div>
							<button className='absolute bottom-1 right-1 sm:bottom-2 sm:right-2 bg-blue-600 hover:bg-blue-700 text-white p-1.5 sm:p-2 md:p-2.5 rounded-full shadow-lg transition-all duration-200 hover:scale-110'>
								<Camera className='w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4' />
							</button>
						</div>

						{/* User Info */}
						<div>
							<h2 className='text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2 sm:mb-3 flex items-center justify-center gap-1.5 sm:gap-2'>
								<span className='truncate max-w-[200px] sm:max-w-none'>
									{user2?.fullName || 'User Name'}
								</span>
								<CheckCircle className='w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0' />
							</h2>
							<div className='mb-3 sm:mb-4'>
								<span className='inline-block bg-blue-100 text-blue-800 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium mb-2 sm:mb-3'>
									{user2?.role || 'Role'}
								</span>
								<p className='text-gray-600 text-xs sm:text-sm truncate max-w-[200px] mx-auto'>
									ID: {user2?.admin_id || 'N/A'}
								</p>
							</div>
							{user2?.location && (
								<div className='flex items-center justify-center gap-1 text-gray-500'>
									<MapPin className='w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0' />
									<span className='text-xs sm:text-sm truncate max-w-[150px]'>
										{user2.location}
									</span>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Information Cards - Responsive Grid */}
				<div className='grid gap-3 sm:gap-4'>
					{/* Email */}
					<div className='bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200'>
						<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4'>
							<div className='flex items-center gap-3 sm:gap-4 min-w-0 flex-1'>
								<div className='p-2 sm:p-3 bg-green-100 rounded-lg sm:rounded-xl flex-shrink-0'>
									<Mail className='w-4 h-4 sm:w-5 sm:h-5 text-green-600' />
								</div>
								<div className='min-w-0 flex-1'>
									<h3 className='font-semibold text-gray-900 mb-0.5 sm:mb-1 text-sm sm:text-base'>
										Email Address
									</h3>
									<p className='text-xs sm:text-sm text-gray-500'>
										Your primary email for communications
									</p>
								</div>
							</div>
							<div className='font-medium text-gray-900 text-sm sm:text-base ml-7 sm:ml-0 truncate max-w-full sm:max-w-xs'>
								{user2?.email || 'user@example.com'}
							</div>
						</div>
					</div>

					{/* Role */}
					<div className='bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200'>
						<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4'>
							<div className='flex items-center gap-3 sm:gap-4 min-w-0 flex-1'>
								<div className='p-2 sm:p-3 bg-purple-100 rounded-lg sm:rounded-xl flex-shrink-0'>
									<Building2 className='w-4 h-4 sm:w-5 sm:h-5 text-purple-600' />
								</div>
								<div className='min-w-0 flex-1'>
									<h3 className='font-semibold text-gray-900 mb-0.5 sm:mb-1 text-sm sm:text-base'>
										Role
									</h3>
									<p className='text-xs sm:text-sm text-gray-500'>
										Your role and permissions level
									</p>
								</div>
							</div>
							<div className='font-medium text-gray-900 text-sm sm:text-base ml-7 sm:ml-0'>
								{user2?.role || 'User'}
							</div>
						</div>
					</div>

					{/* Phone Number */}
					<div className='bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200'>
						<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4'>
							<div className='flex items-center gap-3 sm:gap-4 min-w-0 flex-1'>
								<div className='p-2 sm:p-3 bg-orange-100 rounded-lg sm:rounded-xl flex-shrink-0'>
									<Phone className='w-4 h-4 sm:w-5 sm:h-5 text-orange-600' />
								</div>
								<div className='min-w-0 flex-1'>
									<h3 className='font-semibold text-gray-900 mb-0.5 sm:mb-1 text-sm sm:text-base'>
										Phone Number
									</h3>
									<p className='text-xs sm:text-sm text-gray-500'>
										Your contact phone number
									</p>
								</div>
							</div>
							<div className='font-medium text-gray-900 text-sm sm:text-base ml-7 sm:ml-0'>
								{user2?.phone || '+998 00 000 0000'}
							</div>
						</div>
					</div>

					{/* Birth Date */}
					<div className='bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200'>
						<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4'>
							<div className='flex items-center gap-3 sm:gap-4 min-w-0 flex-1'>
								<div className='p-2 sm:p-3 bg-pink-100 rounded-lg sm:rounded-xl flex-shrink-0'>
									<Calendar className='w-4 h-4 sm:w-5 sm:h-5 text-pink-600' />
								</div>
								<div className='min-w-0 flex-1'>
									<h3 className='font-semibold text-gray-900 mb-0.5 sm:mb-1 text-sm sm:text-base'>
										Birth Date
									</h3>
									<p className='text-xs sm:text-sm text-gray-500'>
										Your date of birth
									</p>
								</div>
							</div>
							<div className='font-medium text-gray-900 text-sm sm:text-base ml-7 sm:ml-0'>
								{formatDate(user2?.date_of_birth)}
							</div>
						</div>
					</div>

					{/* Gender */}
					<div className='bg-white rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200'>
						<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4'>
							<div className='flex items-center gap-3 sm:gap-4 min-w-0 flex-1'>
								<div className='p-2 sm:p-3 bg-indigo-100 rounded-lg sm:rounded-xl flex-shrink-0'>
									<User className='w-4 h-4 sm:w-5 sm:h-5 text-indigo-600' />
								</div>
								<div className='min-w-0 flex-1'>
									<h3 className='font-semibold text-gray-900 mb-0.5 sm:mb-1 text-sm sm:text-base'>
										Gender
									</h3>
									<p className='text-xs sm:text-sm text-gray-500'>
										Your gender identity
									</p>
								</div>
							</div>
							<div className='font-medium text-gray-900 text-sm sm:text-base ml-7 sm:ml-0'>
								{user2?.gender || 'Not specified'}
							</div>
						</div>
					</div>

					{/* Danger Zone */}
					<div className='bg-red-50 rounded-xl sm:rounded-2xl shadow-md p-4 sm:p-6 mt-6 sm:mt-8'>
						<div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4'>
							<div className='flex items-center gap-3 sm:gap-4 min-w-0 flex-1'>
								<div className='p-2 sm:p-3 bg-red-100 rounded-lg sm:rounded-xl flex-shrink-0'>
									<Trash2 className='w-4 h-4 sm:w-5 sm:h-5 text-red-600' />
								</div>
								<div className='min-w-0 flex-1'>
									<h3 className='font-semibold text-red-900 mb-0.5 sm:mb-1 text-sm sm:text-base'>
										Delete Account
									</h3>
									<p className='text-xs sm:text-sm text-red-700'>
										Permanently delete your account and all data
									</p>
								</div>
							</div>
							<button className='px-4 py-2 sm:px-6 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg sm:rounded-xl transition-all duration-200 font-medium hover:scale-105 text-sm sm:text-base w-full sm:w-auto'>
								Delete Account
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

export default Sozlamalar

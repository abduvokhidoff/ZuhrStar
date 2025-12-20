import {
	User,
	Mail,
	Edit3,
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
		return date.toLocaleDateString('uz-UZ', {
			day: '2-digit',
			month: 'short',
			year: 'numeric',
		})
	}

	useEffect(() => {
		const fetchUsers = async () => {
			try {
				const res = await fetch(
					'https://zuhr-star-production.up.railway.app/api/teachers',
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
				console.error('Maʼlumotlarni yuklashda xato:', err)
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
					{/* Cover Photo Skeleton */}
					<div className='h-64 bg-gradient-to-r from-blue-200 to-purple-200 animate-pulse rounded-3xl mb-6 flex items-center justify-end pr-6 pt-4'>
						<div className='w-28 h-10 bg-white bg-opacity-30 rounded-lg animate-pulse'></div>
					</div>
					{/* Profile Section Skeleton */}
					<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6'>
						<div className='flex flex-col md:flex-row gap-6'>
							<div className='flex flex-col items-center md:items-start'>
								<div className='w-32 h-32 bg-gray-200 rounded-full animate-pulse mb-4'></div>
								<div className='h-8 w-48 bg-gray-200 rounded animate-pulse mb-2'></div>
								<div className='h-5 w-64 bg-gray-200 rounded animate-pulse'></div>
							</div>
							<div className='flex-1 flex justify-end'>
								<div className='flex gap-2'>
									<div className='w-16 h-8 bg-gray-200 rounded animate-pulse'></div>
									<div className='w-16 h-8 bg-gray-200 rounded animate-pulse'></div>
								</div>
							</div>
						</div>
					</div>
					{/* Info Cards Skeleton */}
					<div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
						{[1, 2, 3, 4, 5, 6].map(i => (
							<div
								key={i}
								className='flex justify-between items-center p-6 border-b border-gray-100 last:border-b-0'
							>
								<div className='h-5 w-32 bg-gray-200 rounded animate-pulse'></div>
								<div className='h-5 w-48 bg-gray-200 rounded animate-pulse'></div>
								<div className='w-10 h-6 bg-gray-200 rounded animate-pulse'></div>
							</div>
						))}
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className='min-h-screen bg-gray-50 p-6'>
			<div className='max-w-4xl mx-auto'>
				{/* Profil ma'lumotlari */}
				<div className='bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mb-6'>
					<div className='flex flex-col md:flex-row gap-6'>
						{/* Rasm va asosiy ma'lumot */}
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
							<h1 className='text-3xl font-bold text-gray-900 mb-1 text-center md:text-left'>
								{user2?.fullName || 'Foydalanuvchi nomi'}
							</h1>
							<div className='flex flex-col md:flex-row items-center gap-2 text-gray-600 text-center md:text-left'>
								<span className='font-medium'>
									{user2?.position || 'Lavozim'}
								</span>
								<span className='hidden md:inline'>
									@{user2?.company || 'Kompaniya'}
								</span>
								{user2?.location && (
									<div className='flex items-center gap-1'>
										<MapPin className='w-4 h-4 text-gray-400' />
										<span>{user2.location}</span>
									</div>
								)}
							</div>
						</div>
						{/* Amallar tugmalari */}
						<div className='flex-1 flex justify-center md:justify-end items-start'>
							<div className='flex gap-2'>
								<button className='px-6 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors font-medium'>
									O‘zgartirish
								</button>
								<button className='px-6 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium'>
									O‘chirish
								</button>
							</div>
						</div>
					</div>
				</div>

				{/* Batafsil ma'lumotlar */}
				<div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
					{/* Shaxsiy uchrashuv ID */}
					<div className='flex flex-col md:flex-row md:justify-between md:items-center gap-4 p-6 border-b border-gray-100'>
						<div className='flex items-center gap-3'>
							<Users className='w-5 h-5 text-gray-400' />
							<span className='font-medium text-gray-700'>
								Shaxsiy uchrashuv ID
							</span>
						</div>
						<div className='flex-1 md:text-right'>
							<div className='font-semibold text-xl text-gray-900'>
								{user2?.phone?.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3') ||
									'000-000-0000'}
							</div>
							<div className='text-sm text-gray-500'>
								https://meeting/{user2?.phone || '000000000'}
							</div>
						</div>
						<button className='text-blue-600 font-medium hover:text-blue-700 transition-colors'>
							Tahrirlash
						</button>
					</div>

					{/* Email */}
					<div className='flex flex-col md:flex-row md:justify-between md:items-center gap-4 p-6 border-b border-gray-100'>
						<div className='flex items-center gap-3'>
							<Mail className='w-5 h-5 text-gray-400' />
							<span className='font-medium text-gray-700'>Email</span>
						</div>
						<div className='flex-1 md:text-right font-medium text-gray-900'>
							{user2?.email || 'user@example.com'}
						</div>
						<button className='text-blue-600 font-medium hover:text-blue-700 transition-colors'>
							Tahrirlash
						</button>
					</div>

					{/* Lavozim turi */}
					<div className='flex flex-col md:flex-row md:justify-between md:items-center gap-4 p-6 border-b border-gray-100'>
						<div className='flex items-center gap-3'>
							<Building2 className='w-5 h-5 text-gray-400' />
							<span className='font-medium text-gray-700'>Lavozim turi</span>
						</div>
						<div className='flex-1 md:text-right'>
							<div className='flex flex-col md:flex-row md:items-center md:justify-end gap-2'>
								<span className='font-medium text-gray-900'>
									{user2?.position || 'Xodim'}
								</span>
								<button className='text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors self-start md:self-center'>
									Yangilash
								</button>
							</div>
						</div>
						<button className='text-blue-600 font-medium hover:text-blue-700 transition-colors'>
							Tahrirlash
						</button>
					</div>

					{/* Telefon raqami */}
					<div className='flex flex-col md:flex-row md:justify-between md:items-center gap-4 p-6 border-b border-gray-100'>
						<div className='flex items-center gap-3'>
							<Phone className='w-5 h-5 text-gray-400' />
							<span className='font-medium text-gray-700'>Telefon raqami</span>
						</div>
						<div className='flex-1 md:text-right font-medium text-gray-900'>
							{user2?.phone || '+998 00 000 0000'}
						</div>
						<button className='text-blue-600 font-medium hover:text-blue-700 transition-colors'>
							Tahrirlash
						</button>
					</div>

					{/* Tug‘ilgan kun */}
					<div className='flex flex-col md:flex-row md:justify-between md:items-center gap-4 p-6 border-b border-gray-100'>
						<div className='flex items-center gap-3'>
							<Calendar className='w-5 h-5 text-gray-400' />
							<span className='font-medium text-gray-700'>Tug‘ilgan sana</span>
						</div>
						<div className='flex-1 md:text-right font-medium text-gray-900'>
							{formatDate(user2?.date_of_birth)}
						</div>
						<button className='text-blue-600 font-medium hover:text-blue-700 transition-colors'>
							Tahrirlash
						</button>
					</div>

					{/* Jinsi */}
					<div className='flex flex-col md:flex-row md:justify-between md:items-center gap-4 p-6'>
						<div className='flex items-center gap-3'>
							<User className='w-5 h-5 text-gray-400' />
							<span className='font-medium text-gray-700'>Jinsi</span>
						</div>
						<div className='flex-1 md:text-right font-medium text-gray-900'>
							{user2?.gender === 'male'
								? 'Erkak'
								: user2?.gender === 'female'
								? 'Ayol'
								: 'Ko‘rsatilmagan'}
						</div>
						<button className='text-blue-600 font-medium hover:text-blue-700 transition-colors'>
							Tahrirlash
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default Sozlamalar

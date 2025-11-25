import React, { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setCredentials, logout } from '../../redux/authSlice'

const API = 'https://zuhrstar-production.up.railway.app/api'

const Avatar = ({ src, alt, size = 80 }) => (
	<div
		className='rounded-full overflow-hidden ring-4 ring-white shadow-lg'
		style={{ width: size, height: size }}
	>
		{src ? (
			<img src={src} alt={alt} className='w-full h-full object-cover' />
		) : (
			<div className='w-full h-full bg-gradient-to-br from-blue-500 to-blue-300 flex items-center justify-center text-white text-2xl font-bold'>
				{alt?.[0]?.toUpperCase() || '?'}
			</div>
		)}
	</div>
)

const Card = ({ children, className = '' }) => (
	<div
		className={
			'bg-white rounded-3xl border border-slate-100 shadow-sm ' + className
		}
	>
		{children}
	</div>
)

const Input = ({ label, value }) => (
	<div>
		<label className='block text-sm font-medium text-slate-700 mb-2'>
			{label}
		</label>
		<input
			value={value || ''}
			readOnly
			className='w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm'
		/>
	</div>
)

const Select = ({ label, value }) => (
	<div>
		<label className='block text-sm font-medium text-slate-700 mb-2'>
			{label}
		</label>
		<div className='relative'>
			<select
				value={value || ''}
				disabled
				className='w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm appearance-none'
			>
				<option>{value || 'Select'}</option>
			</select>
			<svg
				className='absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none'
				fill='none'
				viewBox='0 0 24 24'
				stroke='currentColor'
			>
				<path
					strokeLinecap='round'
					strokeLinejoin='round'
					strokeWidth={2}
					d='M19 9l-7 7-7-7'
				/>
			</svg>
		</div>
	</div>
)

const Skeleton = ({ className = '' }) => (
	<div className={'animate-pulse bg-slate-200 rounded ' + className} />
)

const Sozlamalar = () => {
	const dispatch = useDispatch()
	const accessToken = useSelector(s => s?.auth?.accessToken)
	const refreshToken = useSelector(s => s?.auth?.refreshToken)
	const userFromRedux = useSelector(s => s?.auth?.user)

	const [user, setUser] = useState(null)
	const [loading, setLoading] = useState(true)
	const [authError, setAuthError] = useState(false)

	const refreshAccessToken = useCallback(async () => {
		if (!refreshToken) {
			dispatch(logout())
			return null
		}

		try {
			const r = await fetch(`${API}/auth/refresh`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ refreshToken }),
			})

			if (!r.ok) {
				dispatch(logout())
				throw new Error('Token yangilashda xato')
			}

			const data = await r.json()
			if (!data?.accessToken) throw new Error('accessToken topilmadi')

			dispatch(
				setCredentials({
					user: data.user,
					accessToken: data.accessToken,
					refreshToken: data.refreshToken || refreshToken,
				})
			)

			return data.accessToken
		} catch (e) {
			dispatch(logout())
			throw e
		}
	}, [refreshToken, dispatch])

	const authFetch = useCallback(
		async (url, opts = {}) => {
			const attempt = async token => {
				const r = await fetch(url, {
					...opts,
					headers: {
						Authorization: `Bearer ${token}`,
						...(opts.body ? { 'Content-Type': 'application/json' } : {}),
						...(opts.headers || {}),
					},
				})

				if (r.status === 401) throw new Error('401')
				if (!r.ok) throw new Error(await r.text())
				return r.json().catch(() => ({}))
			}

			try {
				return await attempt(accessToken || (await refreshAccessToken()))
			} catch (e) {
				if (String(e.message).includes('401')) {
					const t = await refreshAccessToken()
					if (!t) throw e
					return await attempt(t)
				}
				throw e
			}
		},
		[accessToken, refreshAccessToken]
	)

	useEffect(() => {
		;(async () => {
			try {
				setLoading(true)
				setAuthError(false)

				if (!accessToken && !refreshToken) {
					setAuthError(true)
					setLoading(false)
					return
				}

				if (userFromRedux) {
					setUser(userFromRedux)
					setLoading(false)
					return
				}

				try {
					const data = await authFetch(`${API}/admins`)
					const admins = data?.admins || []

					const adminId = localStorage.getItem('admin_id')
					const email = localStorage.getItem('email')
					const found =
						admins.find(a => a.admin_id === adminId || a.email === email) ||
						admins[0]

					if (found) {
						setUser(found)
						setLoading(false)
						return
					}
				} catch (adminErr) {
					console.log('Admin API not found, trying user from token')
				}

				const localEmail = localStorage.getItem('email')
				const localName =
					localStorage.getItem('fullName') || localStorage.getItem('name')
				const localRole = localStorage.getItem('role')

				if (localEmail || localName) {
					setUser({
						email: localEmail,
						fullName: localName || 'Admin',
						role: localRole || 'admin',
						admin_id:
							localStorage.getItem('admin_id') ||
							localStorage.getItem('user_id'),
					})
				}

				setLoading(false)
			} catch (err) {
				console.error('Load error:', err)
				if (err.message.includes('401') || err.message.includes('Token')) {
					setAuthError(true)
				}
				setLoading(false)
			}
		})()
	}, [accessToken, refreshToken, authFetch, userFromRedux])

	const name = user?.fullName || user?.name || 'Admin'
	const role = user?.role || 'admin'
	const gender =
		user?.gender === 'erkak'
			? 'Erkak'
			: user?.gender === 'ayol'
			? 'Ayol'
			: user?.gender || ''

	if (authError) {
		return (
			<div className='min-h-screen bg-slate-50 flex items-center justify-center p-6'>
				<Card className='p-8 text-center max-w-md'>
					<div className='w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-4'>
						<svg
							className='w-8 h-8 text-yellow-600'
							fill='none'
							viewBox='0 0 24 24'
							stroke='currentColor'
						>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth={2}
								d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
							/>
						</svg>
					</div>
					<h3 className='text-lg font-semibold text-slate-900 mb-2'>
						Kirish talab qilinadi
					</h3>
					<p className='text-slate-600 text-sm mb-6'>
						Tizimga kirishingiz kerak
					</p>
					<button
						onClick={() => (window.location.href = '/login')}
						className='px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition'
					>
						Tizimga kirish
					</button>
				</Card>
			</div>
		)
	}

	if (loading) {
		return (
			<div className='min-h-screen bg-slate-50'>
				<div className='max-w-5xl mx-auto p-6'>
					<Skeleton className='h-8 w-48 mb-2' />
					<Skeleton className='h-4 w-32 mb-8' />
					<Card className='p-8'>
						<div className='flex items-start gap-6 mb-8'>
							<Skeleton className='w-20 h-20 rounded-full' />
							<div className='flex-1'>
								<Skeleton className='h-6 w-48 mb-2' />
								<Skeleton className='h-4 w-32' />
							</div>
						</div>
						<div className='grid grid-cols-2 gap-6'>
							{Array(6)
								.fill(0)
								.map((_, i) => (
									<Skeleton key={i} className='h-12' />
								))}
						</div>
					</Card>
				</div>
			</div>
		)
	}

	if (!user) return null

	return (
		<div className='min-h-screen'>
			<div className='max-w-5xl mx-auto p-6'>
				<div className='mb-8'>
					<div className='flex items-center justify-between mb-2'>
						<h1 className='text-2xl font-bold text-slate-900'>
							Welcome, {name.split(' ')[0]}
						</h1>
						<div className='flex items-center gap-2'>
							<button className='p-2 hover:bg-slate-100 rounded-lg transition'>
								<svg
									className='w-5 h-5 text-slate-600'
									fill='none'
									viewBox='0 0 24 24'
									stroke='currentColor'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
									/>
								</svg>
							</button>

							<img
								src={
									user.imgURL ||
									'https://cdn-icons-png.freepik.com/512/3682/3682323.png'
								}
								alt=''
								className=' border w-[50px] rounded-full border-blue-600'
							/>
						</div>
					</div>
					<p className='text-sm text-slate-500'>
						{new Date().toLocaleDateString('en-US', {
							weekday: 'short',
							day: '2-digit',
							month: 'short',
							year: 'numeric',
						})}
					</p>
				</div>

				<Card className='p-8'>
					<div className='flex items-start gap-6 mb-8 pb-8 border-b border-slate-100'>
						<img
							className='w-[80px] h-[80px] rounded-full border border-blue-600'
							src='https://cdn-icons-png.freepik.com/512/3682/3682323.png'
							alt=''
						/>
						<div className='flex-1'>
							<h2 className='text-xl font-semibold text-slate-900 mb-1'>
								{name}
							</h2>
							<p className='text-sm text-slate-600'>{user.email || '-'}</p>
							<p className='text-xs text-blue-600 font-medium mt-1 uppercase'>
								{role}
							</p>
						</div>
					</div>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'>
						<Input label='Full Name' value={name} />
						<Input
							label='Admin ID'
							value={user.admin_id || user.user_id || '-'}
						/>
						<Input label='Role' value={role} />
						<Input label='Phone' value={user.phone || '-'} />
						<Input label='Location' value={user.location || '-'} />
						<Input label='Company' value={user.company || 'ZuhrStar'} />
					</div>
					<div>
						<h3 className='text-sm font-semibold text-slate-900 mb-4'>
							My email Address
						</h3>
						<div className='flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100'>
							<div className='w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0'>
								<svg
									className='w-5 h-5 text-blue-600'
									fill='none'
									viewBox='0 0 24 24'
									stroke='currentColor'
								>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
									/>
								</svg>
							</div>
							<div className='flex-1 min-w-0'>
								<div className='text-sm font-medium text-slate-900 truncate'>
									{user.email || '-'}
								</div>
								<div className='text-xs text-slate-500 mt-0.5'>Active</div>
							</div>
						</div>
					</div>
				</Card>
				<div className='mt-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
					<Card className='p-4'>
						<div className='text-xs text-slate-500 mb-1'>Position</div>
						<div className='text-sm font-medium text-slate-900'>
							{user.position || role || 'Administrator'}
						</div>
					</Card>
					<Card className='p-4'>
						<div className='text-xs text-slate-500 mb-1'>Email</div>
						<div className='text-sm font-medium text-slate-900'>
							{user.email || '-'}
						</div>
					</Card>
					<Card className='p-4'>
						<div className='text-xs text-slate-500 mb-1'>Phone</div>
						<div className='text-sm font-medium text-slate-900'>
							{user.phone || '-'}
						</div>
					</Card>
				</div>
			</div>
		</div>
	)
}

export default Sozlamalar

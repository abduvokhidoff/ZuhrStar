import React, { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import {
	Plus,
	X,
	User,
	Phone,
	Mail,
	Instagram,
	Calendar,
	MoreVertical,
	Trash2,
	Search,
	Filter,
	TrendingUp,
	Clock,
} from 'lucide-react'

// Skeleton Components
const SkeletonCard = () => (
	<div className='bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse'>
		<div className='flex items-start justify-between mb-4'>
			<div className='flex items-center space-x-3'>
				<div className='w-12 h-12 bg-gray-200 rounded-full'></div>
				<div className='space-y-2'>
					<div className='h-5 bg-gray-200 rounded w-32'></div>
					<div className='h-3 bg-gray-200 rounded w-24'></div>
				</div>
			</div>
			<div className='w-20 h-6 bg-gray-200 rounded-full'></div>
		</div>
		<div className='space-y-3'>
			<div className='h-3 bg-gray-200 rounded w-full'></div>
			<div className='h-3 bg-gray-200 rounded w-3/4'></div>
		</div>
	</div>
)

const SkeletonGrid = () => (
	<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
		{[...Array(6)].map((_, index) => (
			<SkeletonCard key={index} />
		))}
	</div>
)

const SOURCE_IMAGES = {
	instagram:
		'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/120px-Instagram_icon.png',
	telegram:
		'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Telegram_logo.svg/120px-Telegram_logo.svg.png',
	'call-center': 'https://cdn-icons-png.flaticon.com/512/925/925076.png',
	website: 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png',
	friend:
		'https://cdn3.iconfinder.com/data/icons/people-pictogram/100/people_friends-512.png',
	default:
		'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/OOjs_UI_icon_tag.svg/120px-OOjs_UI_icon_tag.svg.png',
}

const normalizeSource = raw => {
	const s = String(raw || '')
		.trim()
		.toLowerCase()
	if (!s) return 'default'
	if (s.includes('insta')) return 'instagram'
	if (s.includes('tg') || s.includes('telegram')) return 'telegram'
	if (s.includes('call')) return 'call-center'
	if (
		s.includes('site') ||
		s.includes('web') ||
		s.includes('landing') ||
		s.includes('website')
	)
		return 'website'
	if (s.includes('friend') || s.includes('refer') || s.includes('dost'))
		return 'friend'
	return 'default'
}

const getSourceAvatar = source => {
	const key = normalizeSource(source)
	const src = SOURCE_IMAGES[key] || SOURCE_IMAGES.default
	const alt =
		{
			instagram: 'Instagram',
			telegram: 'Telegram',
			'call-center': 'Call Center',
			website: 'Website/Landing',
			friend: 'Friend/Referral',
			default: 'Source',
		}[key] || 'Source'

	return (
		<div className='w-12 h-12 rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 ring-2 ring-white shadow-md flex items-center justify-center flex-shrink-0'>
			<img
				src={src}
				alt={alt}
				className='w-full h-full object-contain p-2'
				loading='lazy'
				referrerPolicy='no-referrer'
				onError={e => {
					e.currentTarget.src = SOURCE_IMAGES.default
				}}
			/>
		</div>
	)
}

const Marketing = () => {
	const accessToken = useSelector(state => state.auth.accessToken)
	const [leads, setLeads] = useState([])
	const [total, setTotal] = useState(0)
	const [loading, setLoading] = useState(true)
	const [isModalOpen, setIsModalOpen] = useState(false)
	const [creating, setCreating] = useState(false)
	const [openMenuId, setOpenMenuId] = useState(null)
	const [deletingId, setDeletingId] = useState(null)
	const [deleteModalOpen, setDeleteModalOpen] = useState(false)
	const [leadToDelete, setLeadToDelete] = useState(null)
	const [searchTerm, setSearchTerm] = useState('')
	const [formData, setFormData] = useState({
		source: 'instagram',
		name: '',
		phone: '',
		email: '',
		username: '',
		utm_source: '',
		utm_medium: '',
		utm_campaign: '',
		utm_term: '',
		utm_content: '',
		referrer_user_id: '',
		note: '',
	})

	const fetchLeads = async () => {
		try {
			setLoading(true)
			const response = await fetch(
				'https://zuhrstar-production.up.railway.app/api/leads/all',
				{
					method: 'GET',
					headers: {
						accept: 'application/json',
						Authorization: `Bearer ${accessToken}`,
					},
				}
			)

			if (response.ok) {
				const data = await response.json()
				if (data.success && Array.isArray(data.data)) {
					setLeads(data.data)
					setTotal(data.total || data.data.length)
				} else if (Array.isArray(data)) {
					setLeads(data)
					setTotal(data.length)
				} else if (data && Array.isArray(data.leads)) {
					setLeads(data.leads)
					setTotal(data.total || data.leads.length)
				} else {
					setLeads([])
					setTotal(0)
				}
			}
		} catch (error) {
			console.error('Error fetching leads:', error)
		} finally {
			setLoading(false)
		}
	}

	const createLead = async e => {
		e.preventDefault()
		try {
			setCreating(true)
			const response = await fetch(
				'https://zuhrstar-production.up.railway.app/api/leads/intake',
				{
					method: 'POST',
					headers: {
						accept: 'application/json',
						Authorization: `Bearer ${accessToken}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify(formData),
				}
			)

			if (response.ok) {
				const newLead = await response.json()
				setLeads(prev => (Array.isArray(prev) ? [newLead, ...prev] : [newLead]))
				setTotal(prev => prev + 1)
				setIsModalOpen(false)
				setFormData({
					source: 'instagram',
					name: '',
					phone: '',
					email: '',
					username: '',
					utm_source: '',
					utm_medium: '',
					utm_campaign: '',
					utm_term: '',
					utm_content: '',
					referrer_user_id: '',
					note: '',
				})
			}
		} catch (error) {
			console.error('Error creating lead:', error)
		} finally {
			setCreating(false)
		}
	}

	const deleteLead = async () => {
		try {
			setDeletingId(leadToDelete._id || leadToDelete.id)
			const response = await fetch(
				`https://zuhrstar-production.up.railway.app/api/leads/${
					leadToDelete._id || leadToDelete.id
				}`,
				{
					method: 'DELETE',
					headers: {
						accept: 'application/json',
						Authorization: `Bearer ${accessToken}`,
					},
				}
			)

			if (response.ok) {
				setLeads(prev =>
					prev.filter(
						lead =>
							(lead._id || lead.id) !== (leadToDelete._id || leadToDelete.id)
					)
				)
				setTotal(prev => prev - 1)
				setDeleteModalOpen(false)
				setLeadToDelete(null)
				setOpenMenuId(null)
			}
		} catch (error) {
			console.error('Error deleting lead:', error)
		} finally {
			setDeletingId(null)
		}
	}

	const handleInputChange = e => {
		const { name, value } = e.target
		setFormData(prev => ({
			...prev,
			[name]: value,
		}))
	}

	const filteredLeads = Array.isArray(leads)
		? leads.filter(
				lead =>
					lead.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					lead.phone?.includes(searchTerm) ||
					lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
					lead.username?.toLowerCase().includes(searchTerm.toLowerCase())
		  )
		: []

	useEffect(() => {
		if (accessToken) {
			fetchLeads()
		}
	}, [accessToken])

	useEffect(() => {
		const handleClickOutside = () => {
			setOpenMenuId(null)
		}

		if (openMenuId) {
			document.addEventListener('click', handleClickOutside)
			return () => document.removeEventListener('click', handleClickOutside)
		}
	}, [openMenuId])

	const getStatusColor = status => {
		switch (status) {
			case 'new':
				return 'bg-emerald-500'
			case 'contacted':
				return 'bg-blue-500'
			case 'qualified':
				return 'bg-amber-500'
			case 'converted':
				return 'bg-purple-500'
			default:
				return 'bg-gray-400'
		}
	}

	return (
		<div className='min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-4 lg:p-8'>
			<div className='max-w-7xl mx-auto'>
				{/* Header */}
				<div className='mb-8'>
					<div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6'>
						<div>
							<h1 className='text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-800 bg-clip-text text-transparent mb-2'>
								Marketing Leads
							</h1>
							<p className='text-gray-600'>
								Управляйте своими лидами эффективно
							</p>
						</div>
						<button
							onClick={() => setIsModalOpen(true)}
							className='group relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl hover:scale-105 w-full lg:w-auto justify-center'
						>
							<div className='absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700'></div>
							<Plus className='w-5 h-5 relative z-10' />
							<span className='relative z-10'>Создать Lead</span>
						</button>
					</div>

					{/* Stats Cards */}
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
						<div className='bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow'>
							<div className='flex items-center justify-between mb-4'>
								<div className='p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg'>
									<User className='w-6 h-6 text-white' />
								</div>
								<TrendingUp className='w-5 h-5 text-green-500' />
							</div>
							<p className='text-gray-600 text-sm mb-1'>Всего лидов</p>
							{loading ? (
								<div className='h-8 w-16 bg-gray-200 rounded animate-pulse'></div>
							) : (
								<p className='text-3xl font-bold text-gray-900'>
									{total || filteredLeads.length}
								</p>
							)}
						</div>

						<div className='bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow'>
							<div className='flex items-center justify-between mb-4'>
								<div className='p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg'>
									<Clock className='w-6 h-6 text-white' />
								</div>
								<Calendar className='w-5 h-5 text-blue-500' />
							</div>
							<p className='text-gray-600 text-sm mb-1'>Сегодня</p>
							{loading ? (
								<div className='h-8 w-12 bg-gray-200 rounded animate-pulse'></div>
							) : (
								<p className='text-3xl font-bold text-gray-900'>
									{
										filteredLeads.filter(lead => {
											const leadDate = new Date(
												lead.createdAt || lead.created_at
											)
											const today = new Date()
											return leadDate.toDateString() === today.toDateString()
										}).length
									}
								</p>
							)}
						</div>

						<div className='bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow'>
							<div className='flex items-center justify-between mb-4'>
								<div className='p-3 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 shadow-lg'>
									<Instagram className='w-6 h-6 text-white' />
								</div>
							</div>
							<p className='text-gray-600 text-sm mb-1'>Instagram</p>
							{loading ? (
								<div className='h-8 w-12 bg-gray-200 rounded animate-pulse'></div>
							) : (
								<p className='text-3xl font-bold text-gray-900'>
									{
										filteredLeads.filter(
											lead => normalizeSource(lead.source) === 'instagram'
										).length
									}
								</p>
							)}
						</div>

						<div className='bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow'>
							<div className='flex items-center justify-between mb-4'>
								<div className='p-3 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg'>
									<Filter className='w-6 h-6 text-white' />
								</div>
							</div>
							<p className='text-gray-600 text-sm mb-1'>Активные</p>
							{loading ? (
								<div className='h-8 w-12 bg-gray-200 rounded animate-pulse'></div>
							) : (
								<p className='text-3xl font-bold text-gray-900'>
									{
										filteredLeads.filter(lead => lead.status !== 'converted')
											.length
									}
								</p>
							)}
						</div>
					</div>

					{/* Search Bar */}
					<div className='relative'>
						<Search className='absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400' />
						<input
							type='text'
							placeholder='Поиск по имени, телефону, email...'
							value={searchTerm}
							onChange={e => setSearchTerm(e.target.value)}
							className='w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm'
						/>
					</div>
				</div>

				{/* Leads Grid */}
				{loading ? (
					<SkeletonGrid />
				) : !Array.isArray(filteredLeads) || filteredLeads.length === 0 ? (
					<div className='bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100'>
						<div className='w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-4'>
							<User className='w-10 h-10 text-gray-400' />
						</div>
						<h3 className='text-xl font-semibold text-gray-900 mb-2'>
							Лиды не найдены
						</h3>
						<p className='text-gray-500 mb-6'>
							{searchTerm
								? 'Попробуйте изменить параметры поиска'
								: 'Создайте первый лид, нажав кнопку выше'}
						</p>
					</div>
				) : (
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
						{filteredLeads.map((lead, index) => (
							<div
								key={lead._id || lead.id || index}
								className='bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 hover:scale-[1.02] group'
							>
								{/* Header */}
								<div className='flex items-start justify-between mb-4'>
									<div className='flex items-center space-x-3 flex-1 min-w-0'>
										{getSourceAvatar(lead.source_raw)}
										<div className='flex-1 min-w-0'>
											<h3
												className='font-semibold text-gray-900 truncate text-lg'
												title={lead.name}
											>
												{lead.name}
											</h3>
											<p
												className='text-sm text-gray-500 truncate'
												title={lead.username}
											>
												@{lead.username}
											</p>
										</div>
									</div>

									{/* Menu */}
									<div className='relative'>
										<button
											onClick={e => {
												e.stopPropagation()
												setOpenMenuId(
													openMenuId === (lead._id || lead.id)
														? null
														: lead._id || lead.id
												)
											}}
											className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100'
										>
											<MoreVertical className='w-5 h-5' />
										</button>

										{openMenuId === (lead._id || lead.id) && (
											<div className='absolute right-0 top-10 w-40 bg-white rounded-xl shadow-xl border border-gray-200 z-10 overflow-hidden'>
												<button
													onClick={e => {
														e.stopPropagation()
														setLeadToDelete(lead)
														setDeleteModalOpen(true)
														setOpenMenuId(null)
													}}
													className='w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2'
												>
													<Trash2 className='w-4 h-4' />
													Удалить
												</button>
											</div>
										)}
									</div>
								</div>

								{/* Status Badge */}
								<div className='mb-4'>
									<span
										className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white ${getStatusColor(
											lead.status
										)}`}
									>
										<span className='w-1.5 h-1.5 bg-white rounded-full mr-2'></span>
										{lead.status}
									</span>
								</div>

								{/* Contact Info */}
								<div className='space-y-3 mb-4'>
									{lead.phone && (
										<div className='flex items-center text-sm text-gray-700 bg-gray-50 rounded-lg p-3'>
											<Phone className='w-4 h-4 mr-3 text-blue-500 flex-shrink-0' />
											<span className='truncate' title={lead.phone}>
												{lead.phone}
											</span>
										</div>
									)}
									{lead.email && (
										<div className='flex items-center text-sm text-gray-700 bg-gray-50 rounded-lg p-3'>
											<Mail className='w-4 h-4 mr-3 text-purple-500 flex-shrink-0' />
											<span className='truncate' title={lead.email}>
												{lead.email}
											</span>
										</div>
									)}
								</div>

								{/* Footer */}
								<div className='flex items-center justify-between pt-4 border-t border-gray-100'>
									<div className='flex items-center text-xs text-gray-500'>
										<Calendar className='w-3.5 h-3.5 mr-1.5' />
										{lead.createdAt
											? new Date(lead.createdAt).toLocaleDateString('ru-RU', {
													day: 'numeric',
													month: 'short',
											  })
											: 'Неизвестно'}
									</div>
									{lead.lead_id && (
										<div
											className='text-xs font-mono text-gray-400 truncate max-w-[100px]'
											title={lead.lead_id}
										>
											{lead.lead_id}
										</div>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{/* Create Lead Modal */}
			{isModalOpen && (
				<div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
					<div className='bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
						<div className='sticky top-0 bg-white p-6 border-b border-gray-200 rounded-t-3xl z-10'>
							<div className='flex justify-between items-center'>
								<h2 className='text-2xl font-bold text-gray-900'>Новый лид</h2>
								<button
									onClick={() => setIsModalOpen(false)}
									className='text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors'
								>
									<X className='w-6 h-6' />
								</button>
							</div>
						</div>

						<div className='p-6 space-y-6'>
							<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
								<div>
									<label className='block text-sm font-semibold text-gray-700 mb-2'>
										Источник
									</label>
									<select
										name='source'
										value={formData.source}
										onChange={handleInputChange}
										className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white'
										required
									>
										<option value='instagram'>Instagram</option>
										<option value='telegram'>Telegram</option>
										<option value='call-center'>Call Center</option>
										<option value='website'>Website / Landing</option>
										<option value='friend'>Friend</option>
									</select>
								</div>

								<div>
									<label className='block text-sm font-semibold text-gray-700 mb-2'>
										Имя
									</label>
									<input
										type='text'
										name='name'
										value={formData.name}
										onChange={handleInputChange}
										className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
										required
									/>
								</div>

								<div>
									<label className='block text-sm font-semibold text-gray-700 mb-2'>
										Телефон
									</label>
									<input
										type='tel'
										name='phone'
										value={formData.phone}
										onChange={handleInputChange}
										placeholder='+998901234567'
										className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
										required
									/>
								</div>

								<div>
									<label className='block text-sm font-semibold text-gray-700 mb-2'>
										Email
									</label>
									<input
										type='email'
										name='email'
										value={formData.email}
										onChange={handleInputChange}
										className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
									/>
								</div>

								<div>
									<label className='block text-sm font-semibold text-gray-700 mb-2'>
										Username
									</label>
									<input
										type='text'
										name='username'
										value={formData.username}
										onChange={handleInputChange}
										placeholder='username'
										className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
									/>
								</div>

								<div>
									<label className='block text-sm font-semibold text-gray-700 mb-2'>
										Реферер
									</label>
									<input
										type='text'
										name='referrer_user_id'
										value={formData.referrer_user_id}
										onChange={handleInputChange}
										className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
									/>
								</div>
							</div>

							<div className='border-t pt-6'>
								<h3 className='text-lg font-semibold text-gray-900 mb-4'>
									UTM Параметры
								</h3>
								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									<input
										type='text'
										name='utm_source'
										value={formData.utm_source}
										onChange={handleInputChange}
										placeholder='UTM Source'
										className='px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
									/>
									<input
										type='text'
										name='utm_medium'
										value={formData.utm_medium}
										onChange={handleInputChange}
										placeholder='UTM Medium'
										className='px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
									/>
									<input
										type='text'
										name='utm_campaign'
										value={formData.utm_campaign}
										onChange={handleInputChange}
										placeholder='UTM Campaign'
										className='px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
									/>
									<input
										type='text'
										name='utm_term'
										value={formData.utm_term}
										onChange={handleInputChange}
										placeholder='UTM Term'
										className='px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
									/>
									<input
										type='text'
										name='utm_content'
										value={formData.utm_content}
										onChange={handleInputChange}
										placeholder='UTM Content'
										className='md:col-span-2 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
									/>
								</div>
							</div>

							<div>
								<label className='block text-sm font-semibold text-gray-700 mb-2'>
									Заметка
								</label>
								<textarea
									name='note'
									value={formData.note}
									onChange={handleInputChange}
									rows={3}
									className='w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
									placeholder='Дополнительная информация...'
								/>
							</div>

							<div className='flex gap-3 pt-6 border-t'>
								<button
									type='button'
									onClick={() => setIsModalOpen(false)}
									className='flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors'
								>
									Отмена
								</button>
								<button
									type='button'
									onClick={createLead}
									disabled={creating}
									className='flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl'
								>
									{creating ? 'Создание...' : 'Создать лид'}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Delete Confirmation Modal */}
			{deleteModalOpen && (
				<div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
					<div className='bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden'>
						<div className='p-6'>
							<div className='flex items-center gap-4 mb-6'>
								<div className='p-4 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg'>
									<Trash2 className='w-6 h-6 text-white' />
								</div>
								<div>
									<h3 className='text-xl font-bold text-gray-900'>
										Удалить лида
									</h3>
									<p className='text-sm text-gray-600'>
										Это действие нельзя отменить
									</p>
								</div>
							</div>

							{leadToDelete && (
								<div className='mb-6 p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200'>
									<p className='text-sm text-gray-700 mb-2'>
										<span className='font-semibold'>Лид:</span>{' '}
										{leadToDelete.name}
									</p>
									{leadToDelete.phone && (
										<p className='text-sm text-gray-700'>
											<span className='font-semibold'>Телефон:</span>{' '}
											{leadToDelete.phone}
										</p>
									)}
								</div>
							)}

							<div className='flex gap-3'>
								<button
									type='button'
									onClick={() => {
										setDeleteModalOpen(false)
										setLeadToDelete(null)
									}}
									className='flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors'
								>
									Отмена
								</button>
								<button
									type='button'
									onClick={deleteLead}
									disabled={deletingId}
									className='flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-medium hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2'
								>
									{deletingId ? (
										<>
											<div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
											Удаление...
										</>
									) : (
										<>
											<Trash2 className='w-4 h-4' />
											Удалить
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export default Marketing

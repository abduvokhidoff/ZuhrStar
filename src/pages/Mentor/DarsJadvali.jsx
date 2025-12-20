import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { BookOpen, ArrowLeft, GraduationCap, Clock, DollarSign, Calendar, CheckCircle2 } from 'lucide-react';

const API_BASE = 'https://zuhr-star-production.up.railway.app/api';
const COURSE_FILTER_NAME = 'Front-end';

export default function DarsJadvali() {
	const { state } = useLocation()
	const navigate = useNavigate()
	const token = useSelector(s => s?.auth?.accessToken)
	const group = state?.group

	const [course, setCourse] = useState(null)
	const [loading, setLoading] = useState(true)

	const authFetch = url =>
		fetch(url, {
			headers: token ? { Authorization: `Bearer ${token}` } : {},
		}).then(r => {
			if (!r.ok) throw new Error('API error')
			return r.json()
		})

	useEffect(() => {
		if (!group) {
			navigate('/mentor/guruhlar', { replace: true })
			return
		}
		;(async () => {
			try {
				const list = await authFetch(`${API_BASE}/courses`)
				const arr = Array.isArray(list?.data)
					? list.data
					: Array.isArray(list)
					? list
					: []

				const byName = arr.find(
					c =>
						String(c?.name || '')
							.trim()
							.toLowerCase() === COURSE_FILTER_NAME.toLowerCase()
				)
				const byGroupId =
					arr.find(
						c =>
							group?.courseId &&
							(c.course_id === group.courseId ||
								c._id === group.courseId ||
								c.id === group.courseId)
					) || null
				const byGroupName =
					arr.find(c => group?.courseName && c.name === group.courseName) ||
					null

				setCourse(byName || byGroupId || byGroupName || null)
			} finally {
				setLoading(false)
			}
		})()
	}, [group, navigate])

	if (!group) return null

	return (
		<div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-indigo-50/30'>
			<div className='max-w-6xl mx-auto p-4 sm:p-8'>
				{/* Header */}
				<div className='mb-8'>
					<button
						onClick={() => navigate(-1)}
						className='mb-6 px-5 py-2.5 rounded-xl bg-white shadow-sm border border-gray-200 text-gray-700 hover:bg-gray-50 hover:shadow transition-all flex items-center gap-2 font-medium'
					>
						<ArrowLeft className='w-4 h-4' /> Ortga
					</button>

					<div className='bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex items-center gap-4'>
						<div className='w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg'>
							<GraduationCap className='w-8 h-8' />
						</div>
						<div className='flex-1'>
							<h1 className='text-2xl font-bold text-gray-900 mb-1'>
								Dars dasturi
							</h1>
							<p className='text-sm text-gray-600'>
								{group.name}{' '}
								{course?.name || group?.courseName
									? `• ${course?.name || group?.courseName}`
									: ''}
							</p>
						</div>
					</div>
				</div>

				{loading ? (
					<div className='bg-white rounded-2xl shadow-lg p-16 text-center'>
						<div className='w-16 h-16 mx-auto mb-4 border-4 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
						<p className='text-gray-600 font-medium'>Yuklanmoqda...</p>
					</div>
				) : !course ? (
					<div className='bg-white rounded-2xl shadow-lg p-16 text-center'>
						<div className='w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center'>
							<BookOpen className='w-12 h-12 text-blue-600' />
						</div>
						<p className='text-xl text-gray-800 font-semibold'>
							Kurs topilmadi
						</p>
						<p className='text-sm text-gray-500 mt-2'>
							Ushbu guruh uchun kurs ma'lumotlari mavjud emas
						</p>
					</div>
				) : (
					<>
						{/* Course Stats */}
						<div className='grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8'>
							<StatCard
								icon={<BookOpen className='w-5 h-5' />}
								label='Kurs nomi'
								value={course.name}
								gradient='from-blue-500 to-indigo-500'
							/>
							<StatCard
								icon={<DollarSign className='w-5 h-5' />}
								label='Kurs narxi'
								value={`${(parseInt(course.price, 10) || 0).toLocaleString(
									'uz-UZ'
								)} so'm`}
								gradient='from-emerald-500 to-teal-500'
							/>
							<StatCard
								icon={<Clock className='w-5 h-5' />}
								label='Davomiyligi'
								value={`${course.duration ?? '—'} ${
									course.duration_type === 'month'
										? 'oy'
										: course.duration_type === 'day'
										? 'kun'
										: ''
								}`}
								gradient='from-amber-500 to-orange-500'
							/>
						</div>

						{/* Methodology Cards */}
						{Array.isArray(course.methodology) && course.methodology.length ? (
							<div className='space-y-6'>
								{course.methodology.map((m, idx) => (
									<div
										key={idx}
										className='bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300'
									>
										<div className='px-6 py-5 bg-gradient-to-r from-gray-50 via-blue-50 to-indigo-50 border-b border-gray-200'>
											<div className='flex items-center justify-between flex-wrap gap-3'>
												<div className='flex items-center gap-3'>
													{m?.month && (
														<span className='w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md'>
															{m.month}
														</span>
													)}
													<div>
														<h3 className='text-lg font-bold text-gray-900'>
															{m?.month ? `${m.month}-oy: ` : ''}
															{m?.title || '—'}
														</h3>
														<p className='text-xs text-gray-500 mt-0.5'>
															{Array.isArray(m?.lessons)
																? `${m.lessons.length} ta dars mavjud`
																: 'Darslar mavjud emas'}
														</p>
													</div>
												</div>
												<div className='flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'>
													<Calendar className='w-4 h-4' />
													<span className='font-semibold text-sm'>
														{Array.isArray(m?.lessons)
															? `${m.lessons.length} dars`
															: '0'}
													</span>
												</div>
											</div>
										</div>

										{Array.isArray(m?.lessons) && m.lessons.length > 0 && (
											<div className='p-6'>
												<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
													{m.lessons.map((l, i) => (
														<div
															key={i}
															className='bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all duration-200'
														>
															<div className='flex items-start justify-between mb-4'>
																<h4 className='font-bold text-lg text-blue-600'>
																	Dars {i + 1}
																</h4>
																<div className='w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm'>
																	{i + 1}
																</div>
															</div>

															<h5 className='font-semibold text-gray-900 mb-3 text-base'>
																{l?.title || '—'}
															</h5>

															{l?.description && (
																<p className='text-sm text-gray-600 leading-relaxed mb-4'>
																	{l.description}
																</p>
															)}

															<div className='flex items-center gap-2 text-xs text-gray-500 pt-3 border-t border-gray-100'>
																<BookOpen className='w-4 h-4' />
																<span>{m?.month}-oy dasturi</span>
															</div>
														</div>
													))}
												</div>
											</div>
										)}
									</div>
								))}
							</div>
						) : (
							<div className='bg-white rounded-2xl shadow-lg p-16 text-center'>
								<div className='w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center'>
									<BookOpen className='w-12 h-12 text-gray-400' />
								</div>
								<p className='text-xl text-gray-800 font-semibold'>
									Metodologiya qo'shilmagan
								</p>
								<p className='text-sm text-gray-500 mt-2'>
									Ushbu kurs uchun hali dars dasturi kiritilmagan
								</p>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	)
}

function StatCard({ icon, label, value, gradient }) {
	return (
		<div className='bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300'>
			<div className='flex items-center gap-3 mb-3'>
				<div
					className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} text-white flex items-center justify-center shadow-md`}
				>
					{icon}
				</div>
				<span className='text-xs font-bold uppercase tracking-wider text-gray-500'>
					{label}
				</span>
			</div>
			<div className='text-lg font-bold text-gray-900'>{value}</div>
		</div>
	)
}

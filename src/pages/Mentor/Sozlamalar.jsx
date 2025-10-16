// Sozlamalar.jsx (Tailwind-only, brand ko‘k: #1777C9)
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
// ❗️ o'zingizdagi slice manzilini qo'ying
// import { setCredentials, logout } from "@/store/authSlice";

const BRAND = '#1777C9'

/* -------------------- UI helpers -------------------- */
const humanDate = d => {
	try {
		if (!d) return '-'
		const dt = new Date(d)
		if (Number.isNaN(dt.getTime())) return d
		return dt.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: '2-digit',
		})
	} catch {
		return d || '-'
	}
}
const safe = (v, f = '-') => (v === null || v === undefined || v === '' ? f : v)

const Avatar = ({ src, alt, size = 56 }) => (
	<div
		className='rounded-full overflow-hidden ring-2 ring-white shadow-[0_8px_24px_-8px_rgba(2,6,23,.25)]'
		style={{ width: size, height: size }}
	>
		{src ? (
			<img
				src={src}
				alt={alt || 'avatar'}
				className='w-full h-full object-cover'
			/>
		) : (
			<div className='w-full h-full bg-gradient-to-br from-[#1777C9] to-[#6ea8ff]' />
		)}
	</div>
)

const PillTabs = ({ items, active, onChange }) => (
	<div className='inline-flex rounded-2xl bg-white/70 backdrop-blur border border-slate-200 p-1 shadow-sm'>
		{items.map(t => {
			const isActive = active === t.key
			return (
				<button
					key={t.key}
					onClick={() => onChange(t.key)}
					className={[
						'px-4 py-2 rounded-xl text-sm font-medium transition',
						isActive
							? 'bg-[#1777C9] text-white shadow-[0_6px_18px_-6px_rgba(23,119,201,.7)]'
							: 'text-slate-600 hover:text-slate-800 hover:bg-slate-100',
					].join(' ')}
				>
					{t.label}
				</button>
			)
		})}
	</div>
)

const KV = ({ label, value }) => (
	<div className='py-1'>
		<div className='text-slate-500 text-[11px] mb-0.5'>{label}</div>
		<div className='text-slate-900 text-[13px] font-medium break-all'>
			{safe(value)}
		</div>
	</div>
)

const Card = ({ children, className = '' }) => (
	<div
		className={
			'bg-white/80 backdrop-blur rounded-2xl border border-slate-200 shadow-[0_12px_30px_-12px_rgba(2,6,23,.2)] ' +
			className
		}
	>
		{children}
	</div>
)

const IconBtn = ({ title, onClick, children }) => (
	<button
		title={title}
		onClick={onClick}
		className='p-2 rounded-xl bg-white/80 hover:bg-white border border-slate-200 text-slate-500 hover:text-slate-700 transition shadow-sm'
	>
		{children}
	</button>
)

const PrimaryBtn = ({ children, onClick, className = '' }) => (
	<button
		onClick={onClick}
		className={
			'px-4 py-2 rounded-xl text-white bg-[#1777C9] hover:bg-[#0f62a7] shadow-[0_10px_24px_-10px_rgba(23,119,201,.9)] transition ' +
			className
		}
	>
		{children}
	</button>
)

const GhostBtn = ({ children, onClick }) => (
	<button
		onClick={onClick}
		className='px-4 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition'
	>
		{children}
	</button>
)

const Skeleton = ({ className = '' }) => (
	<div className={'animate-pulse bg-slate-200 rounded-md ' + className} />
)

/* -------------------- API config -------------------- */
const API_BASE = 'https://zuhrstar-production.up.railway.app/api'
const INFO_USERS_URL = `${API_BASE}/info-Users`

const REFRESH_ENDPOINTS = [
	`${API_BASE}/auth/refresh`,
	`${API_BASE}/auth/refresh-token`,
	`${API_BASE}/auth/refresh_token`,
	`${API_BASE}/auth/refreshToken`,
]

/* -------------------- Token helpers -------------------- */
function getTokensFromUrl() {
	try {
		const params = new URLSearchParams(window.location.search)
		const access = params.get('accessToken') || params.get('access_token')
		const refresh = params.get('refreshToken') || params.get('refresh_token')
		return { access, refresh }
	} catch {
		return { access: null, refresh: null }
	}
}


function mergeAndDispatchTokens(dispatch, currentUser, newAccess, newRefresh) {
  dispatch(
    setCredentials({
      user: currentUser || null,
      accessToken: newAccess ?? null,
      refreshToken: newRefresh ?? null,
    })
  );
  if (newAccess) localStorage.setItem("accessToken", newAccess);
  if (newRefresh) localStorage.setItem("refreshToken", newRefresh);
  if (!newAccess) localStorage.removeItem("accessToken");
  if (!newRefresh) localStorage.removeItem("refreshToken");
}

/* -------------------- Refresh flow -------------------- */
function buildRefreshAttempts(refreshToken) {
  return [
    { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }) },
    { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: refreshToken }) },
    { headers: { "Content-Type": "application/json", "x-refresh-token": refreshToken }, body: JSON.stringify({}) },
  ];
}
function extractTokens(obj) {
  if (!obj || typeof obj !== "object") return {};
  const access =
    obj.accessToken || obj.access_token || obj.token || obj?.data?.accessToken || obj?.data?.access_token;
  const refresh =
    obj.refreshToken || obj.refresh_token || obj?.data?.refreshToken || obj?.data?.refresh_token;
  return { access, refresh };
}

async function tryRefreshOnceCorsSafe({ refreshToken }) {
  if (!refreshToken) throw new Error("Refresh token yo‘q");
  let lastErr;
  for (const url of REFRESH_ENDPOINTS) {
    for (const attempt of buildRefreshAttempts(refreshToken)) {
      try {
        const res = await fetch(url, { method: "POST", headers: attempt.headers, body: attempt.body });
        if (!res.ok) {
          if (res.status === 404) {
            lastErr = new Error(`404 at ${url}`);
            continue;
          }
          let msg = `Refresh failed (${res.status})`;
          try {
            const j = await res.json();
            msg = j?.message || msg;
          } catch {}
          lastErr = new Error(msg);
          continue;
        }
        const data = await res.json().catch(() => ({}));
        const { access, refresh } = extractTokens(data);
        if (!access && !refresh) {
          lastErr = new Error("Refresh javobida token topilmadi");
          continue;
        }
        return { accessToken: access || null, refreshToken: refresh || null };
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw lastErr || new Error("Refresh muvaffaqiyatsiz");
}

/* -------------------- authFetch -------------------- */
async function authFetch(
  input,
  options = {},
  { retryOn401 = true, accessToken, refreshToken, onRefreshOk, onRefreshFail } = {}
) {
  const headers = new Headers(options.headers || {});
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  let res = await fetch(input, { ...options, headers });
  if (res.status !== 401 || !retryOn401) return res;

  try {
    const refreshed = await tryRefreshOnceCorsSafe({ refreshToken });
    onRefreshOk?.(refreshed);
  } catch {
    onRefreshFail?.();
    throw new Error("Sessiya tugadi, iltimos qayta kiring");
  }

  const headers2 = new Headers(options.headers || {});
  const latestAccess = localStorage.getItem("accessToken");
  if (latestAccess) headers2.set("Authorization", `Bearer ${latestAccess}`);
  res = await fetch(input, { ...options, headers: headers2 });
  return res;
}

/* -------------------- Session info -------------------- */
const buildSessionInfo = (access) => {
  const role = (localStorage.getItem("role") || "mentor").toLowerCase();
  const teacherId =
    localStorage.getItem("teacher_id") ||
    localStorage.getItem("teacherId") ||
    localStorage.getItem("mentor_teacher_id") ||
    null;

  let email =
    localStorage.getItem("email") ||
    localStorage.getItem("userEmail") ||
    localStorage.getItem("mentor_email") ||
    null;


  if (!email && access && access.split(".").length === 3) {
    try {
      const payload = JSON.parse(atob(access.split(".")[1]));
      email = payload?.email || payload?.user?.email || email;
    } catch {}
  }
  return { role, teacherId, email: email ? String(email).toLowerCase() : null };
};

/* -------------------- Component -------------------- */
const Sozlamalar = () => {
	const navigate = useNavigate()
	const dispatch = useDispatch()

	// Redux persisted auth
	const reduxUser = useSelector(s => s?.auth?.user) || null
	const reduxAccess = useSelector(s => s?.auth?.accessToken) || null
	const reduxRefresh = useSelector(s => s?.auth?.refreshToken) || null

	// URL tokens -> Redux/LS
	useEffect(() => {
		const { access, refresh } = getTokensFromUrl()
		if (access || refresh) {
			mergeAndDispatchTokens(
				dispatch,
				reduxUser,
				access || reduxAccess,
				refresh || reduxRefresh
			)
		}
	}, []) // eslint-disable-line

	const accessToken =
		useSelector(s => s?.auth?.accessToken) ||
		localStorage.getItem('accessToken')
	const refreshToken =
		useSelector(s => s?.auth?.refreshToken) ||
		localStorage.getItem('refreshToken')

	const session = useMemo(() => buildSessionInfo(accessToken), [accessToken])

	const [tab, setTab] = useState('info')
	const [currentUser, setCurrentUser] = useState(null)
	const [allUsers, setAllUsers] = useState([])
	const [loading, setLoading] = useState(true)
	const [needsAuth, setNeedsAuth] = useState(false)
	const [error, setError] = useState(null)

	const onRefreshOk = useCallback(
		({ accessToken: newAccess, refreshToken: newRefresh }) => {
			mergeAndDispatchTokens(
				dispatch,
				reduxUser,
				newAccess ?? accessToken,
				newRefresh ?? refreshToken
			)
		},
		[dispatch, reduxUser, accessToken, refreshToken]
	)

	const onRefreshFail = useCallback(() => {
		dispatch(logout())
		localStorage.removeItem('accessToken')
		localStorage.removeItem('refreshToken')
		setNeedsAuth(true)
	}, [dispatch])

	const fetchInfoUsers = useCallback(
		async signal => {
			const res = await authFetch(
				INFO_USERS_URL,
				{ method: 'GET', signal },
				{
					retryOn401: true,
					accessToken,
					refreshToken,
					onRefreshOk,
					onRefreshFail,
				}
			)
			if (!res.ok) {
				const j = await res.json().catch(() => ({}))
				throw new Error(
					j?.message || `Ma'lumotlarni yuklashda xatolik: ${res.status}`
				)
			}
			const data = await res.json().catch(() => ({}))
			return Array.isArray(data?.infoUsers) ? data.infoUsers : []
		},
		[accessToken, refreshToken, onRefreshOk, onRefreshFail]
	)

	const load = useCallback(
		async signal => {
			try {
				setLoading(true)
				setError(null)
				setNeedsAuth(false)

				const a = accessToken
				const r = refreshToken
				if (!a && !r) {
					setNeedsAuth(true)
					setLoading(false)
					return
				}

				if (!a && r) {
					try {
						const refreshed = await tryRefreshOnceCorsSafe({ refreshToken: r })
						onRefreshOk(refreshed)
					} catch {
						onRefreshFail()
						setLoading(false)
						return
					}
				}

				const list = await fetchInfoUsers(signal)

				const me =
					list.find(
						u =>
							(session.teacherId && u?.teacher_id === session.teacherId) ||
							(session.email &&
								u?.email &&
								String(u.email).toLowerCase() === session.email)
					) ||
					list[0] ||
					null

				setCurrentUser(me)
				if (session.role === 'admin' || session.role === 'superadmin') {
					setAllUsers(list)
				} else {
					setAllUsers([])
				}
				setLoading(false)
			} catch (err) {
				console.error('Fetch data error:', err.message)
				setError(err.message || 'Xatolik yuz berdi')
				setLoading(false)
			}
		},
		[
			accessToken,
			refreshToken,
			session.teacherId,
			session.email,
			session.role,
			fetchInfoUsers,
			onRefreshOk,
			onRefreshFail,
		]
	)

	useEffect(() => {
		const ctrl = new AbortController()
		load(ctrl.signal)
		return () => ctrl.abort()
	}, [load])

	const onManualRefresh = useCallback(() => {
		const ctrl = new AbortController()
		load(ctrl.signal)
	}, [load])

	const getFullName = user => {
		if (!user) return '-'
		if (user.fullName) return user.fullName
		if (user.firstname || user.lastname) {
			return `${user.firstname || ''} ${user.lastname || ''}`.trim() || '-'
		}
		return '-'
	}

	const tabs = useMemo(
		() => [
			{ key: 'info', label: "Ma'lumotlar" },
			...(session.role === 'admin' || session.role === 'superadmin'
				? [{ key: 'team', label: 'Barcha Mentorlar' }]
				: []),
		],
		[session.role]
	)

	const renderGender = g => {
		if (!g) return '-'
		const v = String(g).toLowerCase()
		if (v === 'erkak' || v === 'male' || v === 'm') return 'Erkak'
		if (v === 'ayol' || v === 'female' || v === 'f') return 'Ayol'
		return g
	}

	return (
		<div className='min-h-screen bg-gradient-to-b from-white to-slate-50'>
			{/* Top brand bar */}
			<div
				className='h-1 w-full'
				style={{ backgroundImage: `linear-gradient(90deg, ${BRAND}, #5ca6f7)` }}
			/>

			<div className='max-w-7xl mx-auto p-6'>
				{/* Header */}
				<div className='flex items-center justify-between mb-6'>
					<div className='flex items-center gap-3'>
						<div className='w-9 h-9 rounded-xl bg-gradient-to-br from-[#1777C9] to-[#6ea8ff] grid place-items-center text-white font-bold shadow-[0_10px_24px_-10px_rgba(23,119,201,.9)]'>
							S
						</div>
						<div>
							<h1 className='text-2xl font-bold text-slate-900'>Sozlamalar</h1>
							<p className='text-slate-500 text-sm'>
								Mentor profili va jamoa ma’lumotlari
							</p>
						</div>
					</div>

					<div className='flex items-center gap-2'>
						<IconBtn title='Yangilash' onClick={onManualRefresh}>
							<svg className='w-5 h-5' viewBox='0 0 20 20' fill='currentColor'>
								<path
									fillRule='evenodd'
									d='M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z'
									clipRule='evenodd'
								/>
							</svg>
						</IconBtn>
						<IconBtn title='Sozlamalar'>
							<svg className='w-5 h-5' viewBox='0 0 20 20' fill='currentColor'>
								<path
									fillRule='evenodd'
									d='M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z'
									clipRule='evenodd'
								/>
							</svg>
						</IconBtn>
					</div>
				</div>

				{/* Tabs */}
				<div className='mb-6'>
					<PillTabs items={tabs} active={tab} onChange={setTab} />
				</div>

				{/* States */}
				{needsAuth ? (
					<Card className='p-8 text-center'>
						<p className='text-slate-900 font-semibold mb-2'>
							Kirish talab qilinadi
						</p>
						<p className='text-slate-500 text-sm mb-6'>
							Davom etish uchun tizimga kiring. Agar sizda havola orqali
							tokenlar kelishi kerak bo‘lsa, URL’ga{' '}
							<code className='px-1 py-0.5 bg-slate-100 rounded'>
								?accessToken=...&amp;refreshToken=...
							</code>{' '}
							qo‘shib yuboring.
						</p>
						<div className='flex items-center gap-3 justify-center'>
							<PrimaryBtn onClick={() => navigate('/login')}>
								Login sahifasiga o‘tish
							</PrimaryBtn>
							<GhostBtn onClick={onManualRefresh}>Qayta tekshirish</GhostBtn>
						</div>
					</Card>
				) : loading ? (
					<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
						<Card className='p-6'>
							<div className='flex flex-col items-center'>
								<Skeleton className='w-20 h-20 rounded-full mb-4' />
								<Skeleton className='w-40 h-4 mb-2' />
								<Skeleton className='w-24 h-3 mb-6' />
								<div className='w-full space-y-3'>
									{Array.from({ length: 6 }).map((_, i) => (
										<Skeleton key={i} className='w-full h-3' />
									))}
								</div>
							</div>
						</Card>
						<Card className='p-6 md:col-span-2'>
							<Skeleton className='w-48 h-4 mb-6' />
							<div className='grid grid-cols-2 gap-6'>
								{Array.from({ length: 10 }).map((_, i) => (
									<Skeleton key={i} className='w-full h-6' />
								))}
							</div>
						</Card>
					</div>
				) : error ? (
					<Card className='p-6 border-red-200 bg-red-50/70'>
						<div className='text-center'>
							<p className='text-red-600 mb-4'>Xatolik: {error}</p>
							<PrimaryBtn
								onClick={onManualRefresh}
								className='bg-red-500 hover:bg-red-600 shadow-none'
							>
								Qayta urinish
							</PrimaryBtn>
						</div>
					</Card>
				) : !currentUser ? (
					<Card className='p-6 border-yellow-200 bg-yellow-50/70'>
						<p className='text-yellow-700 text-center'>Ma'lumot topilmadi</p>
					</Card>
				) : (
					<>
						{/* Info */}
						{tab === 'info' && (
							<div className='flex flex-col lg:flex-row gap-6'>
								{/* Left */}
								<div className='lg:w-80 shrink-0'>
									<Card className='p-6'>
										<div className='text-center mb-6'>
											<div className='relative inline-block'>
												<Avatar
													src={currentUser.imgURL}
													alt={getFullName(currentUser)}
													size={88}
												/>
												{/* online dot */}
												<span className='absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white grid place-items-center'>
													<span className='w-3.5 h-3.5 rounded-full bg-[#22c55e]' />
												</span>
											</div>
											<h3 className='font-semibold text-slate-900 text-lg mt-3'>
												{getFullName(currentUser)}
											</h3>
											<p className='text-slate-500 text-sm'>
												{safe(currentUser.position)}
											</p>
											<p className='text-slate-400 text-xs mt-1'>
												{safe(currentUser.teacher_id)}
											</p>
										</div>

										<div className='mb-6'>
											<h4 className='font-semibold text-slate-900 mb-3 text-sm'>
												Asosiy ma'lumotlar
											</h4>
											<div className='space-y-3'>
												<KV label='Lavozim' value={currentUser.position} />
												<KV label='Kompaniya' value={currentUser.company} />
												<KV label='Joylashuv' value={currentUser.location} />
												<KV
													label="Tug'ilgan sana"
													value={humanDate(currentUser.date_of_birth)}
												/>
												<KV
													label='Jinsi'
													value={renderGender(currentUser.gender)}
												/>
											</div>
										</div>

										<div className='mb-6'>
											<h4 className='font-semibold text-slate-900 mb-3 text-sm'>
												Kontakt ma'lumotlari
											</h4>
											<div className='space-y-3'>
												<KV label='Email' value={currentUser.email} />
												<KV label='Telefon' value={currentUser.phone} />
												<KV label='Skype' value={currentUser.skype_username} />
											</div>
										</div>

										<div>
											<h4 className='font-semibold text-slate-900 mb-3 text-sm'>
												Tizim ma'lumotlari
											</h4>
											<div className='space-y-3'>
												<KV label='ID' value={currentUser._id} />
												<KV label='Teacher ID' value={currentUser.teacher_id} />
												<KV
													label="Qo'shilgan sana"
													value={humanDate(currentUser.createdAt)}
												/>
												<KV
													label='Yangilangan sana'
													value={humanDate(currentUser.updatedAt)}
												/>
											</div>
										</div>
									</Card>
								</div>

								{/* Right */}
								<div className='flex-1'>
									<Card className='p-6'>
										<div className='flex items-center justify-between mb-4'>
											<h3 className='font-semibold text-slate-900 text-lg'>
												To'liq ma'lumotlar
											</h3>
											<a
												className='text-sm text-[#1777C9] hover:underline'
												href={currentUser.imgURL || '#'}
												target='_blank'
												rel='noreferrer'
											>
												Profil rasmini ko‘rish
											</a>
										</div>

										<div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
											<InfoItem
												label="To'liq ismi"
												value={getFullName(currentUser)}
											/>
											<InfoItem
												label='Lavozim'
												value={safe(currentUser.position)}
											/>
											<InfoItem
												label='Kompaniya'
												value={safe(currentUser.company)}
											/>
											<InfoItem
												label='Joylashuv'
												value={safe(currentUser.location)}
											/>
											<InfoItem label='Email' value={safe(currentUser.email)} />
											<InfoItem
												label='Telefon'
												value={safe(currentUser.phone)}
											/>
											<InfoItem
												label='Skype'
												value={safe(currentUser.skype_username)}
											/>
											<InfoItem
												label='Jinsi'
												value={renderGender(currentUser.gender)}
											/>
											<InfoItem
												label="Tug'ilgan sana"
												value={humanDate(currentUser.date_of_birth)}
											/>
											<InfoItem
												label='Teacher ID'
												value={safe(currentUser.teacher_id)}
											/>
											<div className='sm:col-span-2'>
												<InfoItem
													label='Database ID'
													value={safe(currentUser._id)}
													mono
												/>
											</div>
											<InfoItem
												label="Qo'shilgan sana"
												value={humanDate(currentUser.createdAt)}
											/>
											<InfoItem
												label='Yangilangan sana'
												value={humanDate(currentUser.updatedAt)}
											/>
										</div>
									</Card>
								</div>
							</div>
						)}

						{/* Team */}
						{tab === 'team' &&
							(session.role === 'admin' || session.role === 'superadmin') && (
								<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
									{allUsers.map(user => (
										<Card
											key={user._id}
											className='p-6 hover:shadow-[0_16px_40px_-20px_rgba(23,119,201,.45)] hover:border-[#1777C9]/30 transition'
										>
											<div className='text-center'>
												<Avatar
													src={user.imgURL}
													alt={getFullName(user)}
													size={64}
												/>
												<h3 className='font-semibold text-slate-900 mt-4'>
													{getFullName(user)}
												</h3>
												<p className='text-sm text-slate-500 mb-1'>
													{safe(user.position)}
												</p>
												<p className='text-xs text-slate-400'>
													{safe(user.teacher_id)}
												</p>

												<div className='space-y-2 text-left mt-4 pt-4 border-t border-slate-100'>
													<Row label='Kompaniya' value={safe(user.company)} />
													<Row label='Joylashuv' value={safe(user.location)} />
													<Row
														label='Email'
														value={safe(user.email)}
														truncate
													/>
													<Row label='Telefon' value={safe(user.phone)} />
												</div>
											</div>
										</Card>
									))}
								</div>
							)}
					</>
				)}
			</div>
		</div>
	)
}

/* --------- small presentational atoms --------- */
const InfoItem = ({ label, value, mono = false }) => (
	<div>
		<div className='text-sm text-slate-500 mb-1'>{label}</div>
		<div
			className={
				'text-slate-900 font-medium ' +
				(mono ? 'text-xs font-mono break-all' : '')
			}
		>
			{value}
		</div>
	</div>
)

const Row = ({ label, value, truncate }) => (
	<div className='flex items-center justify-between gap-2 text-xs'>
		<span className='text-slate-500'>{label}:</span>
		<span
			className={
				'text-slate-900 font-medium ' +
				(truncate ? 'truncate max-w-[160px]' : '')
			}
		>
			{value}
		</span>
	</div>
)

export default Sozlamalar
 
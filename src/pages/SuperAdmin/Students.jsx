import React, { useState, useEffect } from 'react'
import {
	Search,
	Plus,
	Eye,
	Edit,
	Trash2,
	Users,
	UserCheck,
	AlertTriangle,
	CreditCard,
	Snowflake,
	Unlock,
	Download,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../../redux/authSlice'
import * as XLSX from 'xlsx'

const Oquvchilar = () => {
	const navigate = useNavigate()
	const dispatch = useDispatch()
	const token = useSelector(state => state.auth.accessToken)

	const [students, setStudents] = useState([])
	const [groups, setGroups] = useState([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [showImportExport, setShowImportExport] = useState(false)
	const [searchTerm, setSearchTerm] = useState('')
	const [selectedStudents, setSelectedStudents] = useState(new Set())
	const [showCreate, setShowCreate] = useState(false)
	const [showUpdate, setShowUpdate] = useState(false)
	const [showDetails, setShowDetails] = useState(false)
	const [selectedStudent, setSelectedStudent] = useState(null)

	const [form, setForm] = useState({
		name: '',
		surname: '',
		student_phone: '',
		parents_phone: '',
		birth_date: '',
		gender: '',
		note: '',
		group_attached: true,
		password: '',
		id: '',
		group_id: '', // group.group_id (string)
		student_id: '',
	})

	const [createForm, setCreateForm] = useState({
		name: '',
		surname: '',
		student_phone: '',
		parents_phone: '',
		birth_date: '',
		gender: '',
		note: '',
		group_attached: true,
		password: '',
		group_id: '', // group.group_id (string)
		imgURL:
			'https://tse3.mm.bing.net/th/id/OIP.5B1_LC815QuZADs1Xf8HdgHaHa?cb=thvnextc1&rs=1&pid=ImgDetMain&o=7&rm=3', // default like your example
	})

	const [updateMessage, setUpdateMessage] = useState({ text: '', type: '' })

	const API_BASE = 'https://zuhrstar-production.up.railway.app/api'

	const authGuard = response => {
		if (response.status === 401) {
			dispatch(logout())
			navigate('/login')
		}
	}

	const fetchStudents = async () => {
		if (!token) {
			setError('No authentication token found. Please log in.')
			setLoading(false)
			dispatch(logout())
			navigate('/login')
			return
		}
		try {
			setLoading(true)
			setError('')
			const response = await fetch(`${API_BASE}/students`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			})
			if (!response.ok) {
				authGuard(response)
				const errorMessages = {
					403: 'You do not have permission to access this resource.',
					500: 'Server error. Please try again later.',
				}
				throw new Error(
					errorMessages[response.status] ||
						`HTTP error! Status: ${response.status}`
				)
			}
			const data = await response.json()
			setStudents(Array.isArray(data) ? data : [])
		} catch (err) {
			console.error('Fetch error:', err)
			setError(err.message || "Ma'lumotlarni yuklashda xato")
		} finally {
			setLoading(false)
		}
	}

	const fetchGroups = async () => {
		if (!token) return
		try {
			const response = await fetch(`${API_BASE}/groups`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			})
			if (!response.ok) {
				authGuard(response)
				throw new Error('Guruhlarni yuklashda xato')
			}
			const data = await response.json()
			setGroups(Array.isArray(data) ? data : [])
		} catch (err) {
			console.error('Group fetch error:', err)
		}
	}

	useEffect(() => {
		fetchStudents()
		fetchGroups()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [token])

	const totalStudents = students.length
	const activeStudents = students.filter(student => student.active).length
	const noGroupStudents = students.filter(
		student => (student.groups?.length || 0) === 0
	).length
	const debtors = students.filter(student => student.paid === false).length

	const handleSelectAll = e => {
		if (e.target.checked) setSelectedStudents(new Set(students.map(s => s._id)))
		else setSelectedStudents(new Set())
	}

	const handleSelectStudent = id => {
		const next = new Set(selectedStudents)
		next.has(id) ? next.delete(id) : next.add(id)
		setSelectedStudents(next)
	}

	const filteredStudents = students.filter(
		s =>
			s.name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
			s.surname?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
			s.student_phone?.includes(searchTerm)
	)

	const handleDelete = async studentId => {
		if (!token) {
			setError('No authentication token found. Please log in.')
			dispatch(logout())
			navigate('/login')
			return
		}
		try {
			const response = await fetch(`${API_BASE}/students/${studentId}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
			})
			if (!response.ok) {
				authGuard(response)
				const errorData = await safeJson(response)
				const errorMessages = {
					403: 'You do not have permission to access this resource.',
					500: 'Server error. Please try again later.',
				}
				throw new Error(
					errorData?.message ||
						errorMessages[response.status] ||
						'Serverdan xatolik.'
				)
			}
			setStudents(prev =>
				prev.filter(s => s._id !== studentId && s.student_id !== studentId)
			)
			setSelectedStudents(prev => {
				const ns = new Set(prev)
				ns.delete(studentId)
				return ns
			})
		} catch (err) {
			console.error('Delete error:', err)
			setError(err.message || "O'quvchi o'chirishda xato")
		}
	}

	const safeJson = async res => {
		try {
			return await res.json()
		} catch {
			return null
		}
	}

	// ====== helpers to read server error text when JSON not provided
	const readErrorMessage = async response => {
		let serverMsg = ''
		try {
			// try json first
			const asJson = await response.clone().json()
			if (asJson && (asJson.message || asJson.error)) {
				serverMsg = asJson.message || asJson.error
			}
		} catch {
			try {
				// then try text
				const asText = await response.text()
				if (asText) serverMsg = asText
			} catch {
				/* ignore */
			}
		}
		return serverMsg
	}

	// === EDIT (fill modal only)
	const handleEdit = student => {
		if (!student._id) {
			setUpdateMessage({ text: 'Invalid student ID', type: 'error' })
			return
		}
		setForm({
			name: student.name || '',
			surname: student.surname || '',
			student_phone: student.student_phone || '',
			parents_phone: student.parents_phone || '',
			birth_date: (student.birth_date || '').slice(0, 10),
			gender: student.gender || '',
			note: student.note || '',
			group_attached:
				student.group_attached !== undefined ? student.group_attached : true,
			password: '',
			id: student._id || '',
			student_id: student.student_id || '',
			group_id:
				student.groups && student.groups.length > 0
					? String(student.groups[0])
					: '',
		})
		setUpdateMessage({ text: '', type: '' })
		setShowUpdate(true)
	}

	// === Freeze / Unfreeze
	const handleMuzlatish = async id => {
		if (!token) {
			setError('No authentication token found. Please log in.')
			dispatch(logout())
			navigate('/login')
			return
		}
		try {
			setError('')
			const res = await fetch(`${API_BASE}/students/${id}`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ status: 'muzlagan' }),
			})
			if (!res.ok) {
				authGuard(res)
				const serverMsg = await readErrorMessage(res)
				throw new Error(serverMsg || 'HTTP ' + res.status)
			}
			setStudents(prev =>
				prev.map(s =>
					s.student_id === id || s._id === id ? { ...s, status: 'muzlagan' } : s
				)
			)
		} catch (e) {
			console.error('Freeze error:', e)
			setError(e.message || "Holatni o'zgartirishda xato")
		}
	}

	const deleteMuzlatish = async id => {
		if (!token) {
			setError('No authentication token found. Please log in.')
			dispatch(logout())
			navigate('/login')
			return
		}
		try {
			setError('')
			const res = await fetch(`${API_BASE}/students/${id}`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ status: 'active' }),
			})
			if (!res.ok) {
				authGuard(res)
				const serverMsg = await readErrorMessage(res)
				throw new Error(serverMsg || 'HTTP ' + res.status)
			}
			setStudents(prev =>
				prev.map(s =>
					s.student_id === id || s._id === id ? { ...s, status: 'active' } : s
				)
			)
		} catch (e) {
			console.error('Unfreeze error:', e)
			setError(e.message || "Holatni o'zgartirishda xato")
		}
	}

	// === CREATE (payload exactly like your sample)
	const handleCreate = async () => {
		const {
			name,
			surname,
			student_phone,
			birth_date,
			gender,
			password,
			parents_phone,
			note,
			group_attached,
			group_id,
			imgURL,
		} = createForm

		if (
			!name?.trim() ||
			!surname?.trim() ||
			!student_phone?.trim() ||
			!birth_date?.trim() ||
			!gender?.trim() ||
			!password?.trim()
		) {
			setUpdateMessage({
				text: "Iltimos, barcha majburiy maydonlarni to'ldiring (Ism, Familiya, Telefon raqami, Tug'ilgan sana, Jins, Parol)",
				type: 'error',
			})
			return
		}
		const phoneRegex = /^\+998\d{9}$/
		if (!phoneRegex.test(student_phone)) {
			setUpdateMessage({
				text: "Telefon raqami +998 bilan boshlanib, 9 ta raqamdan iborat bo'lishi kerak",
				type: 'error',
			})
			return
		}
		if (!token) {
			setUpdateMessage({
				text: 'No authentication token found. Please log in.',
				type: 'error',
			})
			dispatch(logout())
			navigate('/login')
			return
		}

		try {
			const payload = {
				// EXACTLY like your sample body:
				name: name.trim(),
				surname: surname.trim(),
				student_phone: student_phone.trim(),
				parents_phone: parents_phone?.trim() || undefined,
				birth_date: birth_date.trim(), // YYYY-MM-DD
				gender: gender.trim(),
				note: note?.trim() || undefined,
				group_attached: !!group_attached,
				groups: group_id ? [String(group_id)] : [],
				password: password.trim(),
				paid: false,
				status: 'active',
				imgURL:
					imgURL?.trim() ||
					'https://tse3.mm.bing.net/th/id/OIP.5B1_LC815QuZADs1Xf8HdgHaHa?cb=thvnextc1&rs=1&pid=ImgDetMain&o=7&rm=3',

				// extra fields (har ehtimolga) — many backends still expect these:
				balance: '0',
				coinbalance: '0',
				teachers: [],
			}

			const response = await fetch(`${API_BASE}/students`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			})

			if (!response.ok) {
				authGuard(response)
				const serverMsg = await readErrorMessage(response)
				throw new Error(serverMsg || 'Ошибка при создании студента')
			}

			setUpdateMessage({
				text: "O'quvchi muvaffaqiyatli qo'shildi!",
				type: 'success',
			})
			setTimeout(() => {
				setShowCreate(false)
				setUpdateMessage({ text: '', type: '' })
			}, 800)
			fetchStudents()

			setCreateForm({
				name: '',
				surname: '',
				student_phone: '',
				parents_phone: '',
				birth_date: '',
				gender: '',
				note: '',
				group_attached: true,
				password: '',
				group_id: '',
				imgURL:
					'https://tse3.mm.bing.net/th/id/OIP.5B1_LC815QuZADs1Xf8HdgHaHa?cb=thvnextc1&rs=1&pid=ImgDetMain&o=7&rm=3',
			})
		} catch (err) {
			console.error('Create error:', err)
			setUpdateMessage({
				text: err.message || "O'quvchi qo'shishda xato",
				type: 'error',
			})
		}
	}

	// === UPDATE
	const handleUpdate = async () => {
		const {
			student_id,
			name,
			surname,
			student_phone,
			birth_date,
			gender,
			parents_phone,
			note,
			password,
			group_attached,
			group_id,
		} = form

		if (
			!student_id?.trim() ||
			!name?.trim() ||
			!surname?.trim() ||
			!student_phone?.trim() ||
			!birth_date?.trim() ||
			!gender?.trim()
		) {
			setUpdateMessage({
				text: "Iltimos, barcha majburiy maydonlarni to'ldiring",
				type: 'error',
			})
			return
		}
		const phoneRegex = /^\+998\d{9}$/
		if (!phoneRegex.test(student_phone)) {
			setUpdateMessage({
				text: "Telefon raqami +998 bilan boshlanib, 9 ta raqamdan iborat bo'lishi kerak",
				type: 'error',
			})
			return
		}
		if (!token) {
			setUpdateMessage({
				text: 'Token topilmadi. Iltimos, qayta kiring.',
				type: 'error',
			})
			dispatch(logout())
			navigate('/login')
			return
		}

		try {
			const payload = {
				name: name.trim(),
				surname: surname.trim(),
				student_phone: student_phone.trim(),
				parents_phone: parents_phone?.trim() || undefined,
				birth_date: birth_date.trim(),
				gender: gender.trim(),
				note: note?.trim() || undefined,
				group_attached: !!group_attached,
			}
			if (password?.trim()) payload.password = password.trim()
			if (group_id) payload.groups = [String(group_id)]

			const response = await fetch(`${API_BASE}/students/${student_id}`, {
				method: 'PUT',
				headers: {
					Authorization: `Bearer ${token}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			})

			if (!response.ok) {
				authGuard(response)
				const serverMsg = await readErrorMessage(response)
				throw new Error(serverMsg || "Noma'lum xato")
			}

			setUpdateMessage({
				text: "O'quvchi muvaffaqiyatli yangilandi!",
				type: 'success',
			})
			setTimeout(() => {
				setShowUpdate(false)
				setUpdateMessage({ text: '', type: '' })
			}, 800)
			fetchStudents()
		} catch (err) {
			setUpdateMessage({
				text: err.message || 'Yangilashda xatolik yuz berdi',
				type: 'error',
			})
		}
	}

	const handleViewDetails = student => {
		if (!student._id) {
			setUpdateMessage({ text: 'Invalid student ID', type: 'error' })
			return
		}
		setSelectedStudent(student)
		setShowDetails(true)
	}

	const handleExportExcel = () => {
		try {
			const dataToExport = filteredStudents.map((student, index) => ({
				'№': index + 1,
				Ism: student.name || '',
				Familiya: student.surname || '',
				'Telefon raqami': student.student_phone || '',
				'Ota-ona telefoni': student.parents_phone || '',
				"Tug'ilgan sana": student.birth_date || '',
				Jinsi: student.gender || '',
				Guruh: (student.groups?.length || 0) > 0 ? 'Guruhda' : 'Guruhsiz',
				Balans: student.balance || '0 UZS',
				Holati: student.active ? 'Faol' : 'Nofaol',
				Eslatma: student.note || '',
			}))
			const worksheet = XLSX.utils.json_to_sheet(dataToExport)
			const workbook = XLSX.utils.book_new()
			XLSX.utils.book_append_sheet(workbook, worksheet, "O'quvchilar")
			const fileName = `oquvchilar_${
				new Date().toISOString().split('T')[0]
			}.xlsx`
			XLSX.writeFile(workbook, fileName)
			setUpdateMessage({
				text: 'Excel fayl muvaffaqiyatli yuklab olindi!',
				type: 'success',
			})
			setTimeout(() => setUpdateMessage({ text: '', type: '' }), 3000)
		} catch (error) {
			console.error('Export error:', error)
			setUpdateMessage({
				text: 'Excel export qilishda xatolik yuz berdi',
				type: 'error',
			})
			setTimeout(() => setUpdateMessage({ text: '', type: '' }), 3000)
		}
		setShowImportExport(false)
	}

	return (
		<div className='min-h-screen bg-gray-50'>
			{/* Header */}
			<div className='bg-white border-b border-gray-200 px-6 py-4'>
				<div className='flex items-center justify-between'>
					<h1 className='text-xl font-semibold text-gray-800'>O'QUVCHILAR</h1>
					<div className='text-sm text-gray-500'>O'quvchilar</div>
				</div>

				{/* CREATE MODAL */}
				{showCreate && (
					<div className='fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50'>
						<div className='bg-white p-6 rounded-xl shadow-xl w-96 max-h-[90vh] overflow-y-auto'>
							<h2 className='text-xl font-semibold mb-4'>O'quvchi Qo'shish</h2>
							{updateMessage.text && (
								<div
									className={`mb-4 p-3 rounded-lg text-sm ${
										updateMessage.type === 'error'
											? 'bg-red-100 text-red-700'
											: 'bg-green-100 text-green-700'
									}`}
								>
									{updateMessage.text}
								</div>
							)}
							<input
								type='text'
								placeholder='Ism *'
								className='w-full border border-gray-300 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={createForm.name}
								onChange={e =>
									setCreateForm({ ...createForm, name: e.target.value })
								}
							/>
							<input
								type='text'
								placeholder='Familiya *'
								className='w-full border border-gray-300 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={createForm.surname}
								onChange={e =>
									setCreateForm({ ...createForm, surname: e.target.value })
								}
							/>
							<input
								type='text'
								placeholder='Telefon raqami (+998xxxxxxxxx) *'
								className='w-full border border-gray-300 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={createForm.student_phone}
								onChange={e =>
									setCreateForm({
										...createForm,
										student_phone: e.target.value,
									})
								}
							/>
							<input
								type='text'
								placeholder='Ota-ona telefoni (ixtiyoriy)'
								className='w-full border border-gray-300 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={createForm.parents_phone}
								onChange={e =>
									setCreateForm({
										...createForm,
										parents_phone: e.target.value,
									})
								}
							/>
							<input
								type='date'
								placeholder="Tug'ilgan sana *"
								className='w-full border border-gray-300 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={createForm.birth_date}
								onChange={e =>
									setCreateForm({ ...createForm, birth_date: e.target.value })
								}
							/>
							<select
								className='w-full border border-gray-300 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={createForm.gender}
								onChange={e =>
									setCreateForm({ ...createForm, gender: e.target.value })
								}
							>
								<option value=''>Jinsni tanlang *</option>
								<option value='Erkak'>Erkak</option>
								<option value='Ayol'>Ayol</option>
							</select>

							{/* Always use group.group_id */}
							<select
								className='w-full border border-gray-300 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={createForm.group_id}
								onChange={e =>
									setCreateForm({ ...createForm, group_id: e.target.value })
								}
							>
								<option value=''>Guruhni tanlang (ixtiyoriy)</option>
								{groups.map(group => (
									<option key={group._id} value={group.group_id}>
										{group.name}
									</option>
								))}
							</select>

							<input
								type='text'
								placeholder='Eslatma (ixtiyoriy)'
								className='w-full border border-gray-300 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={createForm.note}
								onChange={e =>
									setCreateForm({ ...createForm, note: e.target.value })
								}
							/>

							{/* NEW: imgURL to match your sample */}
							<input
								type='text'
								placeholder='Rasm URL (ixtiyoriy)'
								className='w-full border border-gray-300 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={createForm.imgURL}
								onChange={e =>
									setCreateForm({ ...createForm, imgURL: e.target.value })
								}
							/>

							<input
								type='password'
								placeholder='Parol *'
								className='w-full border border-gray-300 p-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={createForm.password}
								onChange={e =>
									setCreateForm({ ...createForm, password: e.target.value })
								}
							/>

							<div className='flex justify-end gap-3'>
								<button
									onClick={() => {
										setCreateForm({
											name: '',
											surname: '',
											student_phone: '',
											parents_phone: '',
											birth_date: '',
											gender: '',
											note: '',
											group_attached: true,
											password: '',
											group_id: '',
											imgURL:
												'https://tse3.mm.bing.net/th/id/OIP.5B1_LC815QuZADs1Xf8HdgHaHa?cb=thvnextc1&rs=1&pid=ImgDetMain&o=7&rm=3',
										})
										setShowCreate(false)
										setUpdateMessage({ text: '', type: '' })
									}}
									className='px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200'
								>
									Bekor qilish
								</button>
								<button
									onClick={handleCreate}
									className='px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
								>
									Saqlash
								</button>
							</div>
						</div>
					</div>
				)}

				{/* UPDATE MODAL */}
				{showUpdate && (
					<div className='fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50'>
						<div className='bg-white p-6 rounded-xl shadow-xl w-96 max-h-[90vh] overflow-y-auto'>
							<h2 className='text-xl font-semibold mb-4'>
								O'quvchi ma'lumotlarini yangilash
							</h2>
							{updateMessage.text && (
								<div
									className={`mb-4 p-3 rounded-lg text-sm ${
										updateMessage.type === 'error'
											? 'bg-red-100 text-red-700'
											: 'bg-green-100 text-green-700'
									}`}
								>
									{updateMessage.text}
								</div>
							)}
							<input
								type='text'
								placeholder='Ism *'
								className='w-full border border-gray-300 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={form.name}
								onChange={e => setForm({ ...form, name: e.target.value })}
							/>
							<input
								type='text'
								placeholder='Familiya *'
								className='w-full border border-gray-300 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={form.surname}
								onChange={e => setForm({ ...form, surname: e.target.value })}
							/>
							<input
								type='text'
								placeholder='Telefon raqami (+998xxxxxxxxx) *'
								className='w-full border border-gray-300 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={form.student_phone}
								onChange={e =>
									setForm({ ...form, student_phone: e.target.value })
								}
							/>
							<input
								type='text'
								placeholder='Ota-ona telefoni (ixtiyoriy)'
								className='w-full border border-gray-300 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={form.parents_phone}
								onChange={e =>
									setForm({ ...form, parents_phone: e.target.value })
								}
							/>
							<input
								type='date'
								placeholder="Tug'ilgan sana *"
								className='w-full border border-gray-300 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={form.birth_date}
								onChange={e => setForm({ ...form, birth_date: e.target.value })}
							/>

							<select
								className='w-full border border-gray-300 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={form.group_id}
								onChange={e => setForm({ ...form, group_id: e.target.value })}
							>
								<option value=''>Guruhni tanlang (ixtiyoriy)</option>
								{groups.map(group => (
									<option key={group._id} value={group.group_id}>
										{group.name}
									</option>
								))}
							</select>

							<input
								type='text'
								placeholder='Eslatma (ixtiyoriy)'
								className='w-full border border-gray-300 p-3 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={form.note}
								onChange={e => setForm({ ...form, note: e.target.value })}
							/>
							<input
								type='password'
								placeholder='Yangi parol (ixtiyoriy)'
								className='w-full border border-gray-300 p-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500'
								value={form.password}
								onChange={e => setForm({ ...form, password: e.target.value })}
							/>

							<div className='flex justify-end gap-3'>
								<button
									onClick={() => {
										setForm({
											name: '',
											surname: '',
											student_phone: '',
											parents_phone: '',
											birth_date: '',
											gender: '',
											note: '',
											group_attached: true,
											password: '',
											id: '',
											student_id: '',
											group_id: '',
										})
										setShowUpdate(false)
										setUpdateMessage({ text: '', type: '' })
									}}
									className='px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200'
								>
									Bekor qilish
								</button>
								<button
									onClick={handleUpdate}
									className='px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
								>
									Saqlash
								</button>
							</div>
						</div>
					</div>
				)}

				{/* DETAILS MODAL */}
				{showDetails && selectedStudent && (
					<div className='fixed inset-0 flex items-center justify-center backdrop-blur-sm z-50'>
						<div className='bg-white p-6 rounded-xl shadow-xl w-96 max-h-[90vh] overflow-y-auto'>
							<h2 className='text-xl font-semibold mb-4 text-gray-800'>
								O'quvchi ma'lumotlari
							</h2>
							<div className='space-y-3'>
								<div className='flex items-center gap-3'>
									<div className='w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-lg font-medium text-blue-700'>
										{selectedStudent.name?.charAt(0)}
										{selectedStudent.surname?.charAt(0)}
									</div>
									<div>
										<h3 className='font-semibold text-lg text-gray-900'>
											{selectedStudent.name} {selectedStudent.surname}
										</h3>
										<p className='text-gray-600 text-sm'>
											{selectedStudent.student_phone || 'Kiritilmagan'}
										</p>
									</div>
								</div>
								<div className='border-t border-gray-200 pt-3 space-y-2'>
									<p className='text-sm'>
										<span className='font-medium text-gray-700'>
											Ota-ona telefoni:
										</span>{' '}
										<span className='text-gray-600'>
											{selectedStudent.parents_phone || 'Kiritilmagan'}
										</span>
									</p>
									<p className='text-sm'>
										<span className='font-medium text-gray-700'>
											Tug'ilgan sana:
										</span>{' '}
										<span className='text-gray-600'>
											{(selectedStudent.birth_date || '').slice(0, 10) ||
												'Kiritilmagan'}
										</span>
									</p>
									<p className='text-sm'>
										<span className='font-medium text-gray-700'>Jinsi:</span>{' '}
										<span className='text-gray-600'>
											{selectedStudent.gender || 'Kiritilmagan'}
										</span>
									</p>
									<p className='text-sm'>
										<span className='font-medium text-gray-700'>Guruh:</span>{' '}
										<span className='text-blue-600 text-sm'>
											{(selectedStudent.groups?.length || 0) > 0
												? 'Guruhda'
												: 'Guruhsiz'}
										</span>
									</p>
									<p className='text-sm'>
										<span className='font-medium text-gray-700'>Balans:</span>{' '}
										<span
											className={
												selectedStudent.balance?.includes('-')
													? 'text-red-600 font-medium'
													: 'text-green-600 font-medium'
											}
										>
											{selectedStudent.balance || '0 UZS'}
										</span>
									</p>
									<p className='text-sm'>
										<span className='font-medium text-gray-700'>Holati:</span>{' '}
										<span
											className={
												selectedStudent.status === 'active'
													? 'text-green-600 font-medium'
													: 'text-red-600 font-medium'
											}
										>
											{selectedStudent.status}
										</span>
									</p>
									{selectedStudent.note && (
										<p className='text-sm'>
											<span className='font-medium text-gray-700'>
												Eslatma:
											</span>{' '}
											<span className='text-gray-600'>
												{selectedStudent.note}
											</span>
										</p>
									)}
								</div>
							</div>
							<div className='flex justify-end mt-6'>
								<button
									onClick={() => setShowDetails(false)}
									className='px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors'
								>
									Yopish
								</button>
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Stats */}
			<div className='p-6'>
				<div className='grid grid-cols-4 gap-4 mb-6'>
					<div className='bg-white rounded-lg p-6 border-l-4 border-blue-500 shadow-sm'>
						<div className='flex items-center justify-between'>
							<div>
								<div className='text-3xl font-bold text-gray-800 mb-1'>
									{totalStudents}
								</div>
								<div className='text-sm text-gray-500 uppercase font-medium'>
									O'QUVCHILAR SONI
								</div>
							</div>
							<div className='text-blue-500'>
								<Users className='w-8 h-8' />
							</div>
						</div>
					</div>
					<div className='bg-white rounded-lg p-6 border-l-4 border-cyan-500 shadow-sm'>
						<div className='flex items-center justify-between'>
							<div>
								<div className='text-3xl font-bold text-gray-800 mb-1'>
									{activeStudents}
								</div>
								<div className='text-sm text-gray-500 uppercase font-medium'>
									FAOL
								</div>
							</div>
							<div className='text-cyan-500'>
								<UserCheck className='w-8 h-8' />
							</div>
						</div>
					</div>
					<div className='bg-white rounded-lg p-6 border-l-4 border-orange-500 shadow-sm'>
						<div className='flex items-center justify-between'>
							<div>
								<div className='text-3xl font-bold text-gray-800 mb-1'>
									{noGroupStudents}
								</div>
								<div className='text-sm text-gray-500 uppercase font-medium'>
									GURUHSIZ O'QUVCHILAR
								</div>
							</div>
							<div className='text-orange-500'>
								<AlertTriangle className='w-8 h-8' />
							</div>
						</div>
					</div>
					<div className='bg-white rounded-lg p-6 border-l-4 border-red-500 shadow-sm'>
						<div className='flex items-center justify-between'>
							<div>
								<div className='text-3xl font-bold text-gray-800 mb-1'>
									{debtors}
								</div>
								<div className='text-sm text-gray-500 uppercase font-medium'>
									QARZDOR
								</div>
							</div>
							<div className='text-red-500'>
								<CreditCard className='w-8 h-8' />
							</div>
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className='flex items-center justify-between mb-6'>
					<div className='flex items-center space-x-3'>
						<div className='relative'>
							<Search className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4' />
							<input
								type='text'
								placeholder='Qidirish ...'
								className='pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
								value={searchTerm}
								onChange={e => setSearchTerm(e.target.value)}
							/>
						</div>

						<div className='relative'>
							<button
								onClick={() => setShowImportExport(!showImportExport)}
								className='flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-sm hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500'
							>
								<Download className='w-4 h-4' /> Import/Export
								<svg
									className='w-4 h-4'
									fill='currentColor'
									viewBox='0 0 20 20'
								>
									<path
										fillRule='evenodd'
										d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'
										clipRule='evenodd'
									/>
								</svg>
							</button>
							{showImportExport && (
								<div className='absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10'>
									<button
										onClick={handleExportExcel}
										className='flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50'
									>
										<Download className='w-4 h-4' /> Export Excel
									</button>
								</div>
							)}
						</div>
					</div>

					<div className='flex items-center gap-3'>
						<button
							onClick={() => setShowCreate(true)}
							className='flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500'
						>
							<Plus className='w-4 h-4' /> O'quvchi qo'shish
						</button>
					</div>
				</div>

				{/* Error */}
				{error && (
					<div className='bg-red-50 border border-red-200 text-red-700 px-6 py-4 mb-6 rounded-lg flex items-center justify-between'>
						<span>{error}</span>
						<button
							onClick={fetchStudents}
							className='px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600'
						>
							Qayta urinish
						</button>
					</div>
				)}

				{/* Table */}
				<div className='bg-white rounded-lg shadow-sm overflow-hidden'>
					<div className='bg-gray-50 px-6 py-3 border-b border-gray-200'>
						<div className='grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider'>
							<div className='flex items-center'>
								<input
									type='checkbox'
									className='mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
									checked={
										selectedStudents.size === students.length &&
										students.length > 0
									}
									onChange={handleSelectAll}
								/>
								ID
							</div>
							<div className='col-span-3'>To'liq ismi</div>
							<div className='col-span-2'>Telefon raqami</div>
							<div className='col-span-2'>Guruh</div>
							<div>Filial</div>
							<div>Balans</div>
							<div className='text-center'>Amallar</div>
						</div>
					</div>

					<div className='divide-y divide-gray-100'>
						{loading ? (
							<div className='text-center py-8'>
								<div className='animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2'></div>
								<div className='text-gray-500'>Yuklanmoqda...</div>
							</div>
						) : filteredStudents.length === 0 ? (
							<div className='text-center py-8 text-gray-500'>
								Hech qanday o'quvchi topilmadi
							</div>
						) : (
							filteredStudents.map((student, idx) => (
								<div
									key={student._id || idx}
									className={
										student.status === 'muzlagan'
											? 'px-6 py-4 bg-gray-300 hover:bg-gray-400 transition-colors'
											: 'px-6 py-4 hover:bg-gray-50 transition-colors'
									}
								>
									<div className='grid grid-cols-12 gap-4 items-center text-sm'>
										<div className='flex items-center'>
											<input
												type='checkbox'
												className='mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
												checked={selectedStudents.has(student._id)}
												onChange={() => handleSelectStudent(student._id)}
											/>
											<span className='text-gray-900'>{idx + 1}</span>
										</div>

										<div className='col-span-3 flex items-center'>
											<div className='w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-700 mr-3'>
												{student.name?.charAt(0)}
											</div>
											<span className='font-medium text-gray-900'>
												{student.name} {student.surname}
											</span>
										</div>

										<div className='col-span-2 text-gray-600'>
											{student.student_phone}
										</div>

										<div className='col-span-2'>
											<span className='text-blue-600 text-sm'>
												{(student.groups?.length || 0) > 0
													? 'Guruhda'
													: 'Guruhsiz'}
											</span>
										</div>

										<div>
											<span className='px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium'>
												Asosiy filial
											</span>
										</div>

										<div
											className={`font-medium text-sm ${
												student.balance?.includes('-')
													? 'text-red-600'
													: 'text-green-600'
											}`}
										>
											{student.balance || '0 UZS'}
										</div>

										<div className='flex gap-2 justify-center'>
											<button
												onClick={() => handleViewDetails(student)}
												className='w-10 h-10 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center justify-center transition-colors'
												title="Ko'rish"
												disabled={student.status === 'muzlagan'}
											>
												<Eye className='w-10 h-5' />
											</button>
											<button
												onClick={() => handleEdit(student)}
												className='w-10 h-10 bg-orange-500 text-white rounded-md hover:bg-orange-600 flex items-center justify-center transition-colors'
												title='Tahrirlash'
												disabled={student.status === 'muzlagan'}
											>
												<Edit className='w-10 h-5' />
											</button>
											<button
												onClick={() => handleDelete(student.student_id)}
												className='w-10 h-10 bg-red-500 text-white rounded-md hover:bg-red-600 flex items-center justify-center transition-colors'
												title="O'chirish"
												disabled={student.status === 'muzlagan'}
											>
												<Trash2 className='w-10 h-5' />
											</button>
											{student.status === 'muzlagan' ? (
												<button
													onClick={() => deleteMuzlatish(student.student_id)}
													className='w-10 h-10 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center transition-colors'
													title='Aktivlashtirish'
												>
													<Unlock className='w-10 h-5' />
												</button>
											) : (
												<button
													onClick={() => handleMuzlatish(student.student_id)}
													className='w-10 h-10 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center justify-center transition-colors'
													title='Muzlatish'
												>
													<Snowflake className='w-10 h-5' />
												</button>
											)}
										</div>
									</div>
								</div>
							))
						)}
					</div>
				</div>
			</div>
		</div>
	)
}

export default Oquvchilar
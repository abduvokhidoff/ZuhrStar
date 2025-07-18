import React from 'react'
import { useDispatch } from 'react-redux'
import { logout } from '../redux/authSlice'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'

const Navbar = () => {
	const dispatch = useDispatch()
	const navigate = useNavigate()

	const handleLogout = () => {
		dispatch(logout()) // Clear Redux state and localStorage
		navigate('/') // Redirect to login page
	}

	return (
		<div className='w-full h-[60px] bg-white flex justify-end items-center px-6 shadow'>
			<button
				onClick={handleLogout}
				className='flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition'
			>
				<LogOut size={18} />
				Logout
			</button>
		</div>
	)
}

export default Navbar

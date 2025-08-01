import React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { logout } from '../redux/authSlice'
import { useNavigate } from 'react-router-dom'
import { LogOut, Search, User } from 'lucide-react'

const Navbar = () => {
	const dispatch = useDispatch()
	const navigate = useNavigate()
	const user = useSelector(state => state.auth.user)

	const handleLogout = () => {
		dispatch(logout()) // Clear Redux state and localStorage
		navigate('/') // Redirect to login page
	}

	return (
		<div className='w-full h-[70px] flex justify-between items-center px-[24px] '>
			{/* Search bar */}
			<div className='w-[40%]'>
				<div className='flex items-center gap-[10px] px-[20px] py-[10px] rounded-[10px] bg-[white] w-[100%]'>
					<Search size={20} />
					<input
						type='text'
						placeholder='Search'
						className='outline-none w-[100%]'
					/>
				</div>
			</div>

			{/* User info & logout */}
			<div className='flex items-center gap-[20px]'>
				<div className='px-[10px] py-[10px] rounded-[10px] bg-[white] flex items-center gap-[10px]'>
					{/* User icon */}
					<div className='flex items-center justify-center px-[5px] py-[5px] bg-[#eaf3ff] rounded-[10px]'>
						<User size={20} className='text-[black]' />
					</div>

					{/* Username */}
					<p className='font-[Nunito Sans] font-[600] text-[14px] text-[black]'>
						<span className='font-[700]'>Hello</span>{' '}
						{user?.fullName || 'Guest'}
					</p>
				</div>

				{/* Logout button */}
				<button
					onClick={handleLogout}
					className='flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition'
				>
					<LogOut size={18} />
					Logout
				</button>
			</div>
		</div>
	)
}

export default Navbar

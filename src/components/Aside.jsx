import React from 'react'
import {
	LayoutGrid,
	Layers,
	Calendar,
	Plane,
	MessagesSquare,
	FolderOpen,
	Folder,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import logo from '../assets/logo.png'
import { NavLink } from 'react-router-dom'

const Aside = () => {
	const user = useSelector(state => state.auth.user)

	if (!user) return null

	// Define role-specific menu items
	const menusByRole = {
		Mentor: [
			{ icon: LayoutGrid, label: 'Dashboard' },
			{ icon: Calendar, label: 'Calendar' },
			{ icon: Plane, label: 'Trips' },
		],
		HeadMentor: [
			// Super Mentor
			{ icon: LayoutGrid, label: 'Dashboard',  },
			{ icon: Layers, label: 'Oquvchilar', path:`o'quvchilar` },
			{ icon: Calendar, label: 'Kurslar', path: `kurslar` },
			{ icon: Plane, label: 'Mentorlar', path: 'mentorlar' },
			{ icon: MessagesSquare, label: 'Guruhlar', path: 'guruhlar' },
			{ icon: FolderOpen, label: 'Hisobotlar', path: 'hisobotlar' },
			{ icon: FolderOpen, label: 'Sozlamalar', path: 'sozlamalar' },
		],
		Admin: [
			{ icon: LayoutGrid, label: 'Dashboard' },
			{ icon: FolderOpen, label: 'Projects' },
			{ icon: Folder, label: 'Archive' },
		],
		SuperAdmin: [
			{ icon: LayoutGrid, label: 'Dashboard' },
			{ icon: Layers, label: 'Manage' },
			{ icon: MessagesSquare, label: 'Messages' },
			{ icon: FolderOpen, label: 'Storage' },
		],
	}

	const menuItems = menusByRole[user.role] || []

	return (
		<aside className='w-[207px] bg-[#f8faff] h-screen px-[15px] flex flex-col items-start fixed top-0 left-0 bg-[white] rounded-[20px] shadow-md '>
			<div>
				<img src={logo} alt="" />
			</div>
			<div className='gap-[15px] flex flex-col items-start'>
				{menuItems.map((item, index) => {
					const Icon = item.icon
					return (
						<NavLink
							key={index}
							to={item.path}
							className='flex items-center gap-[15px] bg-[white] w-[100%] px-[8px] py-[10px] rounded-[10px]'
						>
							<Icon
								className='text-gray-500 group-hover:text-blue-500 transition duration-150'
								size={24}
							/>
							<p>{item.label}</p>
						</NavLink>
					)
				})}
			</div>
		</aside>
	)
}

export default Aside

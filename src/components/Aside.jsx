import React from 'react'
import {
	LayoutGrid,
	Layers,
	Calendar,
	Plane,
	MessagesSquare,
	FolderOpen,
	Folder,
	UserRound,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import logo from '../assets/logo.png'
import { NavLink, useLocation } from 'react-router-dom'

const Aside = () => {
	const user = useSelector(state => state.auth.user)
	const location = useLocation()

	if (!user) return null

	// Define role-specific menu items
	//har bitta rolaga ozini arrayi bor oshani ichida object ochish kere
	// icon bu ikonkasi
	//label bu button ustidagi titleli
	//path bu unga ob boruvchi yol
	//path routesdagi path bilan bir-xil bolishi shart

	const menusByRole = {
		mentor: [
			{ icon: LayoutGrid, label: 'Dashboard', path: '/mentor/' },
			{ icon: Layers, label: `O'quvchilar`, path: `/mentor/o'quvchilar` },
			{ icon: Calendar, label: 'Kurslar', path: '/mentor/kurslar' },
			{ icon: MessagesSquare, label: 'Guruhlar', path: '/mentor/guruhlar' },
			{ icon: FolderOpen, label: 'Sozlamalar', path: '/mentor/sozlamalar' },
		],
		headmentor: [
			{ icon: LayoutGrid, label: 'Dashboard', path: '/head-mentor/' },
			{ icon: Layers, label: 'Oquvchilar', path: `/head-mentor/o'quvchilar` },
			{ icon: Calendar, label: 'Kurslar', path: `/head-mentor/kurslar` },
			{ icon: Plane, label: 'Mentorlar', path: '/head-mentor/mentorlar' },
			{
				icon: MessagesSquare,
				label: 'Guruhlar',
				path: '/head-mentor/guruhlar',
			},
			{
				icon: FolderOpen,
				label: 'Hisobotlar',
				path: '/head-mentor/hisobotlar',
			},
			{
				icon: FolderOpen,
				label: 'Sozlamalar',
				path: '/head-mentor/sozlamalar',
			},
		],
		admin: [
			{ icon: LayoutGrid, label: 'Dashboard', path: '/admin/' },
			{ icon: Layers, label: `O'quvchilar`, path: `/admin/o'quvchilar` },
			{ icon: Calendar, label: 'Kurslar', path: '/admin/kurslar' },
			{ icon: Plane, label: 'Mentorlar', path: '/admin/mentorlar' },
			{ icon: UserRound, label: `To'lovlar`, path: `/admin/to'lovlar` },
			{ icon: MessagesSquare, label: 'Guruhlar', path: '/admin/guruhlar' },
			{ icon: FolderOpen, label: 'Google Meet', path: '/admin/google-meet' },
			{
				icon: FolderOpen,
				label: 'Bildirishnomalar',
				path: '/admin/bildirishnomalar',
			},
			{ icon: FolderOpen, label: 'Sozlamalar', path: '/admin/sozlamalar' },
		],
		superadmin: [
			{ icon: LayoutGrid, label: 'Dashboard', path: '/super-admin/' },
			{ icon: Layers, label: `Students`, path: `/super-admin/students` },
			{ icon: Calendar, label: 'Calendar', path: '/super-admin/calendar' },
			{ icon: Plane, label: 'Finance', path: '/super-admin/finance' },
			{
				icon: MessagesSquare,
				label: 'Employees',
				path: '/super-admin/employees',
			},
			{ icon: FolderOpen, label: 'Marketing', path: '/super-admin/marketing' },
			{ icon: FolderOpen, label: 'Groups', path: '/super-admin/groups' },
			{ icon: FolderOpen, label: 'Problems', path: '/super-admin/problems' },
			{
				icon: FolderOpen,
				label: 'Sozlamalar',
				path: '/super-admin/sozlamalar',
			},
		],
		supportteacher: [
			{ icon: LayoutGrid, label: 'Dashboard', path: '/support-mentor/' },
			{ icon: Layers, label: `Darslar`, path: `/support-mentor/darslar` }
		],
	}

	const menuItems = menusByRole[user.role.toLowerCase()] || []

	return (
		<aside className='w-[207px] bg-[#f8faff] h-screen px-[15px] py-[40px] flex flex-col items-start gap-[42px] fixed top-0 left-0 bg-[white]'>
			<div>
				<img src={logo} className='w-[50px]' alt='' />
			</div>
			<div className='gap-[15px] flex flex-col items-start w-[100%]'>
				{menuItems.map((item, index) => {
					const Icon = item.icon
					return (
						<NavLink
							key={index}
							to={item.path}
							className={`flex items-center gap-[15px]  w-[100%] px-[8px] py-[10px] rounded-[10px] ${
								item.path === location.pathname ? 'bg-[#ebf3ff]' : 'bg-[white]'
							}`}
						>
							<Icon
								className={
									item.path === location.pathname
										? 'text-[#3F8CFF]'
										: 'text-[#7D8592]'
								}
								size={24}
							/>
							<p
								className={`font-[Nunito Sans] font-[600] ${
									item.path === location.pathname
										? 'text-[#3F8CFF]'
										: 'text-[#7D8592]'
								}`}
							>
								{item.label}
							</p>
						</NavLink>
					)
				})}
			</div>
		</aside>
	)
}

export default Aside

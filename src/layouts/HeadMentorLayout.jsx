import React from 'react'
import Aside from '../components/Aside'
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'

const HeadMentorLayout = () => {
	return (
		<div className='flex'>
			<div>
				<Aside />
			</div>
			<div className='ml-[207px] w-full flex flex-col gap-[20px]'>
				<Navbar />
				<Outlet />
			</div>
		</div>
	)
}

export default HeadMentorLayout

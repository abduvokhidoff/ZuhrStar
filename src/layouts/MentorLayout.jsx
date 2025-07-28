import React from 'react'
import Navbar from '../components/Navbar'
import Aside from '../components/Aside'
import { Outlet } from 'react-router-dom'

const MentorLayout = () => {
  return (
		<div className='flex'>
			<div>
				<Aside />
			</div>
			<div className='ml-[207px] w-full flex flex-col '>
				<Navbar />
				<Outlet />
			</div>
		</div>
	)
}

export default MentorLayout
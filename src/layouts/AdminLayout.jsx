import React from 'react'
import Aside from '../components/Aside'
import Navbar from '../components/Navbar'
import { Outlet } from 'react-router-dom'

const AdminLayout = () => {
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

export default AdminLayout
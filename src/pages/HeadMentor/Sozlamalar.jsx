import { User } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

const Sozlamalar = () => {
	const [users, setUsers] = useState([])
	const user1 = useSelector(state => state.auth.user)
	const accessToken = useSelector(state => state.auth.accessToken)

	const user2 = users.find(v => v.fullName === user1?.fullName)

	useEffect(() => {
		const fetchUsers = async () => {
			try {
				const res = await fetch(
					'https://zuhrstar-production.up.railway.app/api/teachers',
					{
						headers: {
							Authorization: `Bearer ${accessToken}`,
							'Content-Type': 'application/json',
						},
					}
				)
				const data = await res.json()
				setUsers(data.teachers || [])
			} catch (err) {
				console.error('Fetch error:', err)
			}
		}
		fetchUsers()
	}, [accessToken])

	return (
		<div className='flex flex-col gap-[40px] px-[24px] py-[40px]'>
			<div>
				<h1 className='text-[36px] font-[Nunito Sans] text-[#0A1629]'>
					About Me
				</h1>
			</div>
			<div>
				<div className='flex items-center flex-col rounded-[20px] bg-[white] w-[30%] py-[30px]'>
					<div className='flex flex-col gap-[10px] items-center '>
						<div className='w-[60px] h-[60px] rounded-[50%] overflow-hidden flex items-center justify-center bg-gray-100'>
							{user2?.imgURL ? (
								<img className='w-[80px] h-[60px]' src={user2.imgURL} alt='' />
							) : (
								<User className='w-[40px] h-[40px] text-gray-500' />
							)}
						</div>
						<p className='font-[Nunito Sans] font-[600] text-[black] text-[24px]'>
							{user2?.fullName || 'undefined'}
						</p>
					</div>
				</div>
				<div></div>
			</div>
		</div>
	)
}

export default Sozlamalar

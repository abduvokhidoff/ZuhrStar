import React, { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'

const Yigilish = () => {
	const [newGroups, setNewGroups] = useState([])
	const [filteredGroups, setFilteredGroups] = useState([])
	const [addNewStudent, setAddNewStudent] = useState(false)
	const [isGroup, setIsGroup] = useState(false)
	const [loading, setLoading] = useState(true) // loading state
	const accessToken = useSelector(state => state.auth.accessToken)

	useEffect(() => {
		const fetchGroups = async () => {
			setLoading(true)
			try {
				const res = await fetch(
					'https://zuhrstar-production.up.railway.app/api/groups',
					{
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${accessToken}`,
						},
					}
				)
				const data = await res.json()
				setNewGroups(data)
			} catch (err) {
				console.error('Fetch error:', err)
			} finally {
				setLoading(false)
			}
		}

		fetchGroups()
	}, [accessToken])

	useEffect(() => {
		const filteredGroup = newGroups.filter(
			group => group.status === 'Yigilinvoti'
		)

		if (filteredGroup.length > 0) {
			setIsGroup(true)
			setFilteredGroups(filteredGroup)
		} else {
			setIsGroup(false)
			setFilteredGroups([])
		}
	}, [newGroups])

	if (loading) {
		return (
			<div className='flex items-center justify-center h-[90vh] w-full'>
				<p className='font-[Nunito Sans] font-[600] text-[24px] text-[#7c8594] text-center'>
					Yuklanmoqda...
				</p>
			</div>
		)
	}

	return (
		<div>
			{isGroup ? (
				<div className='flex flex-col gap-[30px] px-[20px] py-[30px]'>
					<div>
						<h1 className='text-[24px] font-semibold '>
							Yangi guruhlar
						</h1>
						<p className=''>
							Guruhlar soni: {filteredGroups.length}
						</p>
					</div>

					<div className='overflow-x-auto shadow-md rounded-[10px] '>
						<table className='w-full text-center '>
							<thead className='text-[#6a7283] font-semibold'>
								<tr className='bg-[#ddecff] border-b border-[#9f9f9f]'>
									<th className='px-4 py-2 first:rounded-tl-[10px] font-[Nunito Sans] font-[400] last:rounded-tr-[10px]'>
										ID
									</th>
									<th className='px-4 py-2 font-[Nunito Sans] font-[400]'>
										Name
									</th>
									<th className='px-4 py-2 font-[Nunito Sans] font-[400]'>
										Course
									</th>
									<th className='px-4 py-2 font-[Nunito Sans] font-[400]'>
										Status
									</th>
									<th className='px-4 py-2 font-[Nunito Sans] font-[400]'>
										Add
									</th>
								</tr>
							</thead>
							<tbody className='text-[black] font-[Nunito Sans]'>
								{filteredGroups.map((v, i) => (
									<tr key={v._id}>
										<td className='px-4 py-2'>{i + 1}</td>
										<td className='px-4 py-2'>{v.name}</td>
										<td className='px-4 py-2'>{v.course}</td>
										<td className='px-4 py-2'>
											<div className='px-[5px] py-[5px] rounded-[5px] bg-[#33b78f33] text-[#00A86B]'>
												{v.status}
											</div>
										</td>
										<td className='px-4 py-2'>
											<button
												className='w-[32px] h-[32px] rounded-[5px] bg-[#ff5300] text-white flex items-center justify-center mx-auto'
												onClick={() => setAddNewStudent(true)}
											>
												+
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			) : (
				<div className='flex items-center justify-center h-[90vh] w-full'>
					<p className='font-[Nunito Sans] font-[600] text-[30px] text-[#7c8594] text-center'>
						Yangi ochilgan grouppalar yo‘q!!
					</p>
				</div>
			)}
		</div>
	)
}

export default Yigilish

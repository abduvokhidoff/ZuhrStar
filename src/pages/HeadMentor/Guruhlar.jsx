import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setCredentials } from '../../redux/authSlice'

const Guruhlar = () => {
	const dispatch = useDispatch()
	const accessToken = useSelector(state => state.auth.accessToken)
	const refreshToken = useSelector(state => state.auth.refreshToken)
	const [groups, setGroups] = useState(null)

	const fetchGroups = async token => {
		try {
			const res = await fetch(
				'https://zuhrstar-production.up.railway.app/api/groups',
				{
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`,
						'Content-Type': 'application/json',
					},
				}
			)

			if (res.status === 401) {
				// Access token expired — try refreshing
				const refreshRes = await fetch(
					'https://zuhrstar-production.up.railway.app/api/users/refresh',
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({ refreshToken }),
					}
				)

				if (!refreshRes.ok) {
					throw new Error('Refresh token failed')
				}

				const refreshData = await refreshRes.json()
				const newAccessToken = refreshData.accessToken
				const newRefreshToken = refreshData.refreshToken

				// ✅ Save to Redux
				dispatch(
					setCredentials({
						accessToken: newAccessToken,
						refreshToken: newRefreshToken,
					})
				)

				// Retry fetch with new token
				return fetchGroups(newAccessToken)
			}

			if (!res.ok) {
				throw new Error('Failed to fetch groups')
			}

			const data = await res.json()
			setGroups(data)
		} catch (error) {
			console.error('Error fetching groups:', error)
		}
	}

	useEffect(() => {
		if (accessToken) {
			fetchGroups(accessToken)
		}
	}, [accessToken])

	return (
		<div>
			<h2 className='flex item'>Guruhlar</h2>

		</div>
	)
}

export default Guruhlar

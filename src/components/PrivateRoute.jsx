import React from 'react'
import { useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'

const PrivateRoute = () => {
	const accessToken = useSelector(state => state.auth.accessToken)
	const user = useSelector(state => state.auth.user)

	if (!accessToken) {
		return <Navigate to='/login' replace />
	}

	// Redirect by role
	if (user.role === 'HeadMentor') {
		return <Navigate to='/head-mentor' replace />
	}
	if (user.role === 'Mentor') {
		return <Navigate to='/mentor' replace />
	}
	if (user.role === 'Admin') {
		return <Navigate to='/admin' replace />
	}
	if (user.role === 'SuperAdmin') {
		return <Navigate to='/super-admin' replace />
	}
	if (user.role === 'SupportMentor') {
		return <Navigate to='/support-mentor' replace />
	}

}

export default PrivateRoute

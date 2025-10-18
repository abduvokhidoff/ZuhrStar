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
	if (user.role.toLowerCase() === 'headmentor') {
		return <Navigate to='/head-mentor/' replace />
	}
	if (user.role.toLowerCase() === 'mentor') {
		return <Navigate to='/mentor/' replace />
	}
	if (user.role.toLowerCase() === 'admin') {
		return <Navigate to='/admin/' replace />
	}
	if (user.role.toLowerCase() === 'superadmin') {
		return <Navigate to='/super-admin/' replace />
	}
	if (user.role.toLowerCase() === 'supportteacher') {
		return <Navigate to='/support-mentor/' replace />
	}

}

export default PrivateRoute

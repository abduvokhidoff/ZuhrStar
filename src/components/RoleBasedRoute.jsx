import React from 'react'
import { useSelector } from 'react-redux'
import { Navigate, Outlet } from 'react-router-dom'

const RoleBasedRoute = ({ allowedRoles = [] }) => {
	const accessToken = useSelector(state => state.auth.accessToken)
	const user = useSelector(state => state.auth.user)

	if (!accessToken) {
		return <Navigate to='/login' replace />
	}

	// Agar allowedRoles yo'q bo'lsa (bosh sahifa uchun), foydalanuvchini o'z roliga yo'naltirish
	if (allowedRoles.length === 0) {
		switch (user.role.toLowerCase()) {
			case 'headmentor':
				return <Navigate to='/head-mentor/' replace />
			case 'mentor':
				return <Navigate to='/mentor/' replace />
			case 'admin':
				return <Navigate to='/admin/' replace />
			case 'superadmin':
				return <Navigate to='/super-admin/' replace />
			case 'supportteacher':
				return <Navigate to='/support-mentor/' replace />
			default:
				return <Navigate to='/login' replace />
		}
	}

	// Faqat ruxsat etilgan roldagi foydalanuvchi kirishi mumkin
	if (!allowedRoles.includes(user.role.toLowerCase())) {
		// Notog'ri routega urinish - uni to'g'ri layoutga yo'naltirish
		switch (user.role.toLowerCase()) {
			case 'headmentor':
				return <Navigate to='/head-mentor/' replace />
			case 'mentor':
				return <Navigate to='/mentor/' replace />
			case 'admin':
				return <Navigate to='/admin/' replace />
			case 'superadmin':
				return <Navigate to='/super-admin/' replace />
			case 'supportteacher':
				return <Navigate to='/support-mentor/' replace />
			default:
				return <Navigate to='/login' replace />
		}
	}

	return <Outlet />
}

export default RoleBasedRoute

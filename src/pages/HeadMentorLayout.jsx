// ClearReduxButton.js
import React from 'react'
import { useDispatch } from 'react-redux'
import { logout } from '../redux/authSlice'
import { useNavigate } from 'react-router-dom'

const HeadMentorLayout = () => {
	const dispatch = useDispatch()
  const navigate = useNavigate()

	const handleClearRedux = () => {
		dispatch(logout())
    navigate('/')
		console.log('Redux state cleared! ✅')

	}

	return (
		<button
			onClick={handleClearRedux}
			className='bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors'
		>
			Clear Redux
		</button>
	)
}

export default HeadMentorLayout

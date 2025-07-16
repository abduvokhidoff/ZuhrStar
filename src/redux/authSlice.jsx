import { createSlice } from '@reduxjs/toolkit'

// Load initial state from localStorage
const loadFromStorage = () => {
	try {
		const user = localStorage.getItem('user')
		const accessToken = localStorage.getItem('accessToken')
		const refreshToken = localStorage.getItem('refreshToken')

		if (user && accessToken && refreshToken) {
			return {
				user: JSON.parse(user),
				accessToken,
				refreshToken,
			}
		}
	} catch (error) {
		console.error('Error loading from localStorage:', error)
	}

	return {
		user: null,
		accessToken: null,
		refreshToken: null,
	}
}

const initialState = loadFromStorage()

const authSlice = createSlice({
	name: 'auth',
	initialState,
	reducers: {
		setCredentials: (state, action) => {
			const { user, accessToken, refreshToken } = action.payload
			state.user = user
			state.accessToken = accessToken
			state.refreshToken = refreshToken

			// Save to localStorage
			localStorage.setItem('user', JSON.stringify(user))
			localStorage.setItem('accessToken', accessToken)
			localStorage.setItem('refreshToken', refreshToken)
		},
		logout: state => {
			state.user = null
			state.accessToken = null
			state.refreshToken = null

			// Clear localStorage
			localStorage.removeItem('user')
			localStorage.removeItem('accessToken')
			localStorage.removeItem('refreshToken')
		},
	},
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer

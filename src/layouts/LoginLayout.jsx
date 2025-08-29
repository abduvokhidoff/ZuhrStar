import React, { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { setCredentials } from '../redux/authSlice'
import axios from 'axios'
import logowhite from '../assets/logowhite.png'
import logo from '../assets/logo.png'
import { ArrowRight, Eye, EyeClosed } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import AOS from 'aos'
import 'aos/dist/aos.css'

const LoginLayout = () => {
	const [showLoginForm, setShowLoginForm] = useState(false)
	const dispatch = useDispatch()
	const navigate = useNavigate()
	const [showPassword, setShowPassword] = useState(false)
	const [phoneNumber, setPhoneNumber] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	useEffect(() => {
		AOS.init({ duration: 1000, once: true })

		const timer = setTimeout(() => {
			setShowLoginForm(true)
		}, 2000)
		return () => clearTimeout(timer)
	}, [])

	const handleLogin = async () => {
		setLoading(true)
		setError('')
		try {
			const res = await axios.post(
				'https://zuhrstar-production.up.railway.app/api/auth/login',
				{
					phone: phoneNumber,
					password: password,
				}
			)

			const { accessToken, refreshToken, user } = res.data
			dispatch(setCredentials({ user, accessToken, refreshToken }))
			navigate('/')
		} catch (error) {
			setError('Invalid phone or password')
		}
		setLoading(false)
	}

	return (
		<div className='w-screen h-screen relative overflow-hidden'>
			{/* LEFT PANEL (Intro) */}
			<div
				className={`absolute inset-0 bg-[#3F8CFF] px-[94px] py-[60px] flex items-center justify-center transition-opacity duration-1000 ${
					showLoginForm ? 'opacity-0 pointer-events-none' : 'opacity-100'
				}`}
			>
				<img
					className='w-[500px]'
					data-aos='zoom-in'
					src={logowhite}
					alt='logo'
				/>
			</div>

			{/* RIGHT PANEL (Login Form) */}
			<div
				className={`absolute inset-0 px-[139px] flex flex-col justify-center items-center transition-opacity duration-1000 ${
					showLoginForm ? 'opacity-100' : 'opacity-0 pointer-events-none'
				}`}
			>
				<div className='flex flex-col gap-[33px] w-[40%] z-[2]'>
					<div className='flex flex-col items-center justify-center gap-[23px]'>
						<img className='w-[150px]' src={logo} alt="" />
						<h2 className='text-center text-[#0A1629] text-[25px] font-[700]'>
							Sign In to ZuhrStar
						</h2>
					</div>

					<form
						onSubmit={e => e.preventDefault()}
						className='flex flex-col gap-[29px] w-full'
					>
						{/* Phone */}
						<div className='flex flex-col gap-[7px]'>
							<label className='text-[#7D8592] font-[600] text-[16px]'>
								Phone Number
							</label>
							<input
								type='text'
								value={phoneNumber}
								onChange={e => setPhoneNumber(e.target.value)}
								placeholder='yourphonenumber'
								className='px-[18px] py-[12px] border-2 border-[#D8E0F0] rounded-[14px] outline-none'
							/>
						</div>

						{/* Password */}
						<div className='flex flex-col gap-[7px]'>
							<label className='text-[#7D8592] font-[600] text-[16px]'>
								Password
							</label>
							<div className='px-[18px] py-[12px] border-2 border-[#D8E0F0] rounded-[14px] flex items-center justify-between'>
								<input
									type={showPassword ? 'text' : 'password'}
									value={password}
									onChange={e => setPassword(e.target.value)}
									placeholder='yourpassword'
									className='w-full outline-none'
								/>
								<button
									type='button'
									onClick={() => setShowPassword(prev => !prev)}
								>
									{showPassword ? (
										<EyeClosed size={24} className='text-[#aab0bf]' />
									) : (
										<Eye size={24} className='text-[#aab0bf]' />
									)}
								</button>
							</div>
						</div>

						{error && <p className='text-red-500'>{error}</p>}

						{/* Submit Button */}
						<div className='flex justify-center w-full'>
							<button
								onClick={handleLogin}
								className='bg-[#3F8CFF] w-[50%] flex items-center justify-center gap-[7px] h-[48px] rounded-[14px] text-white'
								disabled={loading}
							>
								{loading ? 'Loading...' : 'Sign In'}
								<ArrowRight size={16} />
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	)
}

export default LoginLayout

import React, { useState } from 'react'
import { useDispatch } from 'react-redux'
import { setCredentials } from '../redux/authSlice'
import axios from 'axios'
import logo from '../assets/logo.png'
import login from '../assets/login.png'
import { ArrowRight, Eye, EyeClosed } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const LoginLayout = () => {
	const dispatch = useDispatch()
	const navigate = useNavigate()
	const [showPassword, setShowPassword] = useState(false)
	const [phoneNumber, setPhoneNumber] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)

	const handleLogin = async () => {
		setLoading(true)
		setError('')
		try {
			const res = await axios.post(
				'https://zuhrstar-production.up.railway.app/api/users/login',
				{
					phone: phoneNumber,
					password: password,
				}
			)

			const { accessToken, refreshToken, user } = res.data

			// Store in Redux (this will also save to localStorage)
			dispatch(setCredentials({ user, accessToken, refreshToken }))

			console.log('Login success ✅')
		} catch (err) {
			setError('Invalid phone or password')
			console.error(err)
		}
		setLoading(false)

		navigate('/')

	}

	return (
		<div className='flex items-center justify-center'>
			{/* LEFT SIDE */}
			<div className='w-[50%] bg-[#3F8CFF] h-[100vh] px-[94px] flex flex-col gap-[45px] items-start py-[60px]'>
				<div className='flex flex-col gap-[50px] items-start'>
					<div className='flex items-center gap-[30px]'>
						<img className='w-[50px]' src={logo} alt='logo' />
						<p className='font-[700] text-[30px] text-white'>Woorkroom</p>
					</div>
					<h1 className='font-[700] text-[40px] text-white leading-[56px]'>
						Your place to work <br /> Plan. Create. Control.
					</h1>
				</div>
				<img className='w-[500px] h-[373px]' src={login} alt='login visual' />
			</div>

			{/* RIGHT SIDE */}
			<div className='w-[50%] px-[139px] flex flex-col gap-[49px]'>
				<div className='flex flex-col gap-[33px] w-[100%]'>
					<h2 className='text-center text-[#0A1629] text-[25px] font-[700]'>
						Sign In to Woorkroom
					</h2>

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
									{showPassword ? <EyeClosed size={24} /> : <Eye size={24} />}
								</button>
							</div>
						</div>

						{error && <p className='text-red-500'>{error}</p>}
					</form>
				</div>

				{/* Submit Button */}
				<div className='flex justify-center w-[100%]'>
					<button
						onClick={handleLogin}
						className='bg-[#3F8CFF] w-[38%] flex items-center justify-center gap-[7px] h-[48px] rounded-[14px] text-white'
						disabled={loading}
					>
						{loading ? 'Loading...' : 'Sign In'}
						<ArrowRight size={16} />
					</button>
				</div>
			</div>
		</div>
	)
}

export default LoginLayout

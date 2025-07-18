import { createBrowserRouter } from 'react-router-dom'
import LoginLayout from '../layouts/LoginLayout'
import SuperAdminLayout from '../layouts/SuperAdminLayout'
import AdminLayout from '../layouts/AdminLayout'
import MentorLayout from '../layouts/MentorLayout'
import PrivateRoute from '../components/PrivateRoute'
import HeadMentorLayout from '../layouts/HeadMentorLayout'
import SupportMentorLayout from '../layouts/SupportMentorLayout'
import HeadMentorDashboard from '../pages/HeadMentor/Dashboard'
import HeadMentorOquvchilar from '../pages/HeadMentor/Oquvchilar'
import HeadMentorKurslar from '../pages/HeadMentor/Kurslar'
import HeadMentorMentorlar from '../pages/HeadMentor/Mentorlar'
import HeadMentorGuruhlar from '../pages/HeadMentor/Guruhlar'
import HeadMentorHisobotlar from '../pages/HeadMentor/Hisobotlar'
import HeadMentorSozlamalar from '../pages/HeadMentor/Sozlamalar'


const routes = createBrowserRouter([
	{
		path: '/login',
		element: <LoginLayout />,
	},
	{
		path: '/',
		element: <PrivateRoute />,
	},
	{
		path: '/super-admin',
		element: <SuperAdminLayout />,
	},
	{
		path: '/admin',
		element: <AdminLayout />,
	},
	{
		path: '/head-mentor',
		element: <HeadMentorLayout />,
		children: [
			{
				index: true,
				element: <HeadMentorDashboard />,
			},
			{
				path: `/head-mentor/o'quvchilar`,
				element: <HeadMentorOquvchilar />,
			},
			{
				path: `/head-mentor/kurslar`,
				element: <HeadMentorKurslar />,
			},
			{
				path: `/head-mentor/mentorlar`,
				element: <HeadMentorMentorlar />,
			},
			{
				path: `/head-mentor/guruhlar`,
				element: <HeadMentorGuruhlar />,
			},
			{
				path: `/head-mentor/hisobotlar`,
				element: <HeadMentorHisobotlar />,
			},
			{
				path: `/head-mentor/sozlamalar`,
				element: <HeadMentorSozlamalar />,
			},
		],
	},
	{
		path: '/mentor',
		element: <MentorLayout />,
	},
	{
		path: '/support-mentor',
		element: <SupportMentorLayout />,
	},
])

export default routes

import { createBrowserRouter } from 'react-router-dom'
import LoginLayout from '../pages/LoginLayout'
import SuperAdminLayout from '../pages/SuperAdminLayout'
import AdminLayout from '../pages/AdminLayout'
import MentorLayout from '../pages/MentorLayout'
import PrivateRoute from '../components/PrivateRoute'
import HeadMentorLayout from '../pages/HeadMentorLayout'
import SupportMentorLayout from '../pages/SupportMentorLayout'


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

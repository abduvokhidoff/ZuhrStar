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

import AdminDashboard from '../pages/Admin/Dashboard'
import AdminOquvchilar from '../pages/Admin/Oquvchilar'
import AdminKurslar from '../pages/Admin/Kurlsar'
import AdminMentorlar from '../pages/Admin/Mentorlar'
import AdminTolovlar from '../pages/Admin/Tolovlar'
import AdminGuruhlar from '../pages/Admin/Guruhlar'
import AdminGoogleMeet from '../pages/Admin/GoogleMeet'
import AdminBildirishnomalar from '../pages/Admin/Bildirishnomalar'
import AdminSozlamalar from '../pages/Admin/Sozlamalar'

import SuperAdminDashboard from '../pages/SuperAdmin/Dashboard'
import SuperAdminStudents from '../pages/SuperAdmin/Students'
import SuperAdminCalendar from '../pages/SuperAdmin/Calendar'
import SuperAdminFinance from '../pages/SuperAdmin/Finance'
import SuperAdminEmployees from '../pages/SuperAdmin/Employees'
import SuperAdminMarketing from '../pages/SuperAdmin/Marketing'
import SuperAdminGroups from '../pages/SuperAdmin/Groups'
import SuperAdminProblems from '../pages/SuperAdmin/Problems'
import SuperAdminSozlamalar from '../pages/SuperAdmin/Sozlamalar'

import MentorDashboard from '../pages/Mentor/Dashboard'
import MentorOquvchilar from '../pages/Mentor/Oquvchilar'
import MentorKurslar from '../pages/Mentor/Kurslar'
import MentorGuruhlar from '../pages/Mentor/Guruhlar'
import MentorSozlamalar from '../pages/Mentor/Sozlamalar'
import MentorGoogleMeet from '../pages/Mentor/GoogleMeet'

import SupportMentorDashboard from '../pages/SupportMentor/Dashboard'
import SupportMentorDarslar from '../pages/SupportMentor/QoshimchaDarslar'

//Nomlari bir xil bob qomasin
//Asideda elemnt qoshilib path berilgan bolishi shart


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
		path: '/super-admin/',
		element: <SuperAdminLayout />,
		children: [
			{
				index: true,
				element: <SuperAdminDashboard />,
			},
			{
				path: `/super-admin/students`,
				element: <SuperAdminStudents />,
			},
			{
				path: `/super-admin/calendar`,
				element: <SuperAdminCalendar />,
			},
			{
				path: `/super-admin/finance`,
				element: <SuperAdminFinance />,
			},
			{
				path: `/super-admin/employees`,
				element: <SuperAdminEmployees />,
			},
			{
				path: `/super-admin/marketing`,
				element: <SuperAdminMarketing />,
			},
			{
				path: `/super-admin/groups`,
				element: <SuperAdminGroups />,
			},
			{
				path: `/super-admin/problems`,
				element: <SuperAdminProblems />,
			},
			{
				path: `/super-admin/sozlamalar`,
				element: <SuperAdminSozlamalar />,
			},
		],
	},
	{
		path: '/admin/',
		element: <AdminLayout />,
		children: [
			{
				index: true,
				element: <AdminDashboard />,
			},
			{
				path: `/admin/o'quvchilar`,
				element: <AdminOquvchilar />,
			},
			{
				path: `/admin/kurslar`,
				element: <AdminKurslar />,
			},
			{
				path: `/admin/mentorlar`,
				element: <AdminMentorlar />,
			},
			{
				path: `/admin/to'lovlar`,
				element: <AdminTolovlar />,
			},
			{
				path: `/admin/guruhlar`,
				element: <AdminGuruhlar />,
			},
			{
				path: `/admin/google-meet`,
				element: <AdminGoogleMeet />,
			},
			{
				path: `/admin/bildirishnomalar`,
				element: <AdminBildirishnomalar />,
			},
			{
				path: `/admin/sozlamalar`,
				element: <AdminSozlamalar />,
			},
		],
	},
	{
		path: '/head-mentor/',
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
		path: '/mentor/',
		element: <MentorLayout />,
		children: [
			{
				index: true,
				element: <MentorDashboard />,
			},
			{
				path: `/mentor/o'quvchilar`,
				element: <MentorOquvchilar />,
			},
			{
				path: `/mentor/kurslar`,
				element: <MentorKurslar />,
			},
			{
				path: `/mentor/guruhlar`,
				element: <MentorGuruhlar />,
			},
			{
				path: `/mentor/sozlamalar`,
				element: <MentorSozlamalar />,
			},
			{
				path: `/mentor/google-meet`,
				element: <MentorGoogleMeet />,
			},
		],
	},
	{
		path: '/support-mentor/',
		element: <SupportMentorLayout />,
		children: [
			{
				index: true,
				element: <SupportMentorDashboard />,
			},
			{
				path: '/support-mentor/darslar',
				element: <SupportMentorDarslar />,
			},
		],
	},
])

export default routes

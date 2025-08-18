import { createBrowserRouter } from 'react-router-dom'
import RoleBasedRoute from '../components/RoleBasedRoute'
import LoginLayout from '../layouts/LoginLayout'
import SuperAdminLayout from '../layouts/SuperAdminLayout'
import AdminLayout from '../layouts/AdminLayout'
import MentorLayout from '../layouts/MentorLayout'
import HeadMentorLayout from '../layouts/HeadMentorLayout'
import SupportMentorLayout from '../layouts/SupportMentorLayout'

import HeadMentorDashboard from '../pages/HeadMentor/Dashboard'
import HeadMentorOquvchilar from '../pages/HeadMentor/Oquvchilar'
import HeadMentorKurslar from '../pages/HeadMentor/Kurslar'
import HeadMentorMentorlar from '../pages/HeadMentor/Mentorlar'
import HeadMentorGuruhlar from '../pages/HeadMentor/Guruhlar'
import HeadMentorHisobotlar from '../pages/HeadMentor/Hisobotlar'
import HeadMentorSozlamalar from '../pages/HeadMentor/Sozlamalar'
import HeadMentorJadval from '../pages/HeadMentor/JadvalniKorish'
import HeadMentorTest from '../pages/HeadMentor/TestNatija'
import HeadMentorMaterial from '../pages/HeadMentor/OquvMaterial'

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

const routes = createBrowserRouter([
	{
		path: '/login',
		element: <LoginLayout />,
	},

	// Root route: foydalanuvchi roliga qarab redirect bo'ladi
	{
		path: '/',
		element: <RoleBasedRoute />,
	},

	// Superadmin
	{
		element: <RoleBasedRoute allowedRoles={['superadmin']} />,
		children: [
			{
				path: '/super-admin/',
				element: <SuperAdminLayout />,
				children: [
					{ index: true, element: <SuperAdminDashboard /> },
					{ path: 'students', element: <SuperAdminStudents /> },
					{ path: 'calendar', element: <SuperAdminCalendar /> },
					{ path: 'finance', element: <SuperAdminFinance /> },
					{ path: 'employees', element: <SuperAdminEmployees /> },
					{ path: 'marketing', element: <SuperAdminMarketing /> },
					{ path: 'groups', element: <SuperAdminGroups /> },
					{ path: 'problems', element: <SuperAdminProblems /> },
					{ path: 'sozlamalar', element: <SuperAdminSozlamalar /> },
				],
			},
		],
	},

	// Admin
	{
		element: <RoleBasedRoute allowedRoles={['admin']} />,
		children: [
			{
				path: '/admin/',
				element: <AdminLayout />,
				children: [
					{ index: true, element: <AdminDashboard /> },
					{ path: "o'quvchilar", element: <AdminOquvchilar /> },
					{ path: 'kurslar', element: <AdminKurslar /> },
					{ path: 'mentorlar', element: <AdminMentorlar /> },
					{ path: "to'lovlar", element: <AdminTolovlar /> },
					{ path: 'guruhlar', element: <AdminGuruhlar /> },
					{ path: 'google-meet', element: <AdminGoogleMeet /> },
					{ path: 'bildirishnomalar', element: <AdminBildirishnomalar /> },
					{ path: 'sozlamalar', element: <AdminSozlamalar /> },
				],
			},
		],
	},

	// Head Mentor
	{
		element: <RoleBasedRoute allowedRoles={['headmentor']} />,
		children: [
			{
				path: '/head-mentor/',
				element: <HeadMentorLayout />,
				children: [
					{ index: true, element: <HeadMentorDashboard /> },
					{ path: "o'quvchilar", element: <HeadMentorOquvchilar /> },
					{ path: 'kurslar', element: <HeadMentorKurslar /> },
					{ path: 'mentorlar', element: <HeadMentorMentorlar /> },
					{ path: 'material', element: <HeadMentorMaterial /> },
					{ path: 'guruhlar', element: <HeadMentorGuruhlar /> },
					{ path: 'jadval', element: <HeadMentorJadval /> },
					{ path: 'hisobotlar', element: <HeadMentorHisobotlar /> },
					{ path: 'test', element: <HeadMentorTest /> },
					{ path: 'sozlamalar', element: <HeadMentorSozlamalar /> },
				],
			},
		],
	},

	// Mentor
	{
		element: <RoleBasedRoute allowedRoles={['mentor']} />,
		children: [
			{
				path: '/mentor/',
				element: <MentorLayout />,
				children: [
					{ index: true, element: <MentorDashboard /> },
					{ path: "o'quvchilar", element: <MentorOquvchilar /> },
					{ path: 'kurslar', element: <MentorKurslar /> },
					{ path: 'guruhlar', element: <MentorGuruhlar /> },
					{ path: 'sozlamalar', element: <MentorSozlamalar /> },
					{ path: 'google-meet', element: <MentorGoogleMeet /> },
				],
			},
		],
	},

	// Support Mentor
	{
		element: <RoleBasedRoute allowedRoles={['supportteacher']} />,
		children: [
			{
				path: '/support-mentor/',
				element: <SupportMentorLayout />,
				children: [
					{ index: true, element: <SupportMentorDashboard /> },
					{ path: 'darslar', element: <SupportMentorDarslar /> },
				],
			},
		],
	},
])

export default routes

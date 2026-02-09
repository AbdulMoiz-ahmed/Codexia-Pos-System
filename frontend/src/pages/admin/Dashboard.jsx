import { useState, useEffect } from 'react'
import { useNavigate, Routes, Route, Link, useLocation } from 'react-router-dom'
import { authService } from '../../services/authService'
import DashboardHome from './DashboardHome'
import TenantsPage from './TenantsPage'
import PackagesPage from './PackagesPage'
import BookingsPage from './BookingsPage'

export default function Dashboard() {
    const navigate = useNavigate()
    const location = useLocation()
    const [user, setUser] = useState(null)

    useEffect(() => {
        const currentUser = authService.getUser()
        if (!currentUser || !currentUser.is_super_admin) {
            navigate('/login')
            return
        }
        setUser(currentUser)
    }, [navigate])

    const handleLogout = async () => {
        await authService.logout()
        navigate('/login')
    }

    const isActive = (path) => {
        return location.pathname === path || location.pathname.startsWith(path + '/')
    }

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Navigation */}
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center space-x-8">
                            <h1 className="text-2xl font-bold text-primary-600">POS + ERP SaaS</h1>
                            <span className="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full font-medium">
                                Super Admin
                            </span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-700">Welcome, {user?.first_name}</span>
                            <button onClick={handleLogout} className="btn-secondary">
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Tab Navigation */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <nav className="flex space-x-8">
                        <Link
                            to="/admin"
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${location.pathname === '/admin'
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Dashboard
                        </Link>
                        <Link
                            to="/admin/tenants"
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${isActive('/admin/tenants')
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Tenants
                        </Link>
                        <Link
                            to="/admin/packages"
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${isActive('/admin/packages')
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Packages
                        </Link>
                        <Link
                            to="/admin/bookings"
                            className={`py-4 px-1 border-b-2 font-medium text-sm ${isActive('/admin/bookings')
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Bookings
                        </Link>
                    </nav>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Routes>
                    <Route index element={<DashboardHome />} />
                    <Route path="tenants" element={<TenantsPage />} />
                    <Route path="packages" element={<PackagesPage />} />
                    <Route path="bookings" element={<BookingsPage />} />
                </Routes>
            </div>
        </div>
    )
}

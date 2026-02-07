import { useState, useEffect } from 'react'
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom'
import { authService } from '../../services/authService'
import api from '../../services/api'
import CustomerDashboardHome from './CustomerDashboardHome'
import POSSystem from './POSSystem'
import InventoryManagement from './InventoryManagement'
import SubscriptionPage from './SubscriptionPage'
import SalesPage from './Sales/SalesPage'
import PurchaseSuppliersPage from './Purchase/SuppliersPage'
import HREmployeesPage from './HR/EmployeesPage'
import AccountingPage from './Accounting/AccountingPage'
import ManufacturingPage from './Manufacturing/ManufacturingPage'
import AssetsPage from './Assets/AssetsPage'
import ActivityLogsPage from './ActivityLogsPage'
import SettingsPage from './SettingsPage'
import ExpiryBanner, { ExpiredOverlay } from '../../components/ExpiryBanner'

export default function CustomerDashboard() {
    const navigate = useNavigate()
    const location = useLocation()
    const [user, setUser] = useState(null)
    const [enabledModules, setEnabledModules] = useState([])
    const [loading, setLoading] = useState(true)
    const [isDemo, setIsDemo] = useState(false)
    const [demoTimeRemaining, setDemoTimeRemaining] = useState('')
    const [subscriptionStatus, setSubscriptionStatus] = useState(null)

    useEffect(() => {
        const currentUser = authService.getUser()
        if (!currentUser) {
            navigate('/customer/login')
            return
        }
        // Allow demo users even if they don't have tenant_name
        if (currentUser.is_super_admin) {
            navigate('/login')
            return
        }
        setUser(currentUser)
        setIsDemo(currentUser.is_demo || false)
        loadEnabledModules()
    }, [navigate])

    // Update demo time remaining
    useEffect(() => {
        if (!isDemo || !user?.expires_at) return

        const updateTime = () => {
            const expiresAt = new Date(user.expires_at)
            const now = new Date()
            const diff = expiresAt - now

            if (diff <= 0) {
                authService.logout()
                navigate('/demo/login')
                return
            }

            const hours = Math.floor(diff / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            setDemoTimeRemaining(`${hours}h ${minutes}m remaining`)
        }

        updateTime()
        const interval = setInterval(updateTime, 60000)
        return () => clearInterval(interval)
    }, [isDemo, user])

    const loadEnabledModules = async () => {
        try {
            const response = await api.get('/customer/subscription')
            setEnabledModules(response.data.enabled_modules || [])
            setSubscriptionStatus(response.data.status)
            if (response.data.is_demo) {
                setIsDemo(true)
            }
        } catch (error) {
            console.error('Error loading modules:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = async () => {
        await authService.logout()
        navigate(isDemo ? '/demo/login' : '/customer/login')
    }

    const isModuleEnabled = (module) => {
        return enabledModules.includes(module)
    }

    if (!user || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Expired Overlay - blocks all access when expired */}
            {subscriptionStatus === 'expired' && !isDemo && (
                <ExpiredOverlay onLogout={handleLogout} />
            )}

            {/* Expiry Warning Banner - shows when subscription is expiring soon */}
            {!isDemo && <ExpiryBanner />}

            {/* Demo Banner */}
            {isDemo && (
                <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-2 px-4 text-center text-sm">
                    <span className="font-medium">🎮 Demo Mode</span>
                    <span className="mx-2">|</span>
                    <span>⏰ {demoTimeRemaining}</span>
                    <span className="mx-2">|</span>
                    <span>Experience all features - no credit card required</span>
                </div>
            )}

            {/* Top Navigation */}
            <nav className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center space-x-8">
                            <h1 className="text-2xl font-bold text-primary-600">POS + ERP</h1>
                            <span className={`text-sm px-3 py-1 rounded-full font-medium ${isDemo ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'}`}>
                                {isDemo ? '🎮 Demo' : (user?.tenant_name || 'Customer')}
                            </span>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="text-gray-700">Welcome, {user?.name || user?.first_name}</span>
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
                    <nav className="flex space-x-8 overflow-x-auto">
                        <Link
                            to="/customer/dashboard"
                            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${location.pathname === '/customer/dashboard'
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Dashboard
                        </Link>

                        {isModuleEnabled('pos') && (
                            <Link
                                to="/customer/dashboard/pos"
                                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${location.pathname.includes('/pos')
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                POS
                            </Link>
                        )}

                        {isModuleEnabled('inventory') && (
                            <Link
                                to="/customer/dashboard/inventory"
                                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${location.pathname.includes('/inventory')
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Inventory
                            </Link>
                        )}

                        {isModuleEnabled('sales') && (
                            <Link
                                to="/customer/dashboard/sales"
                                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${location.pathname.includes('/sales')
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Sales & CRM
                            </Link>
                        )}

                        {isModuleEnabled('purchase') && (
                            <Link
                                to="/customer/dashboard/purchase"
                                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${location.pathname.includes('/purchase')
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Purchase
                            </Link>
                        )}

                        {isModuleEnabled('hr') && (
                            <Link
                                to="/customer/dashboard/hr"
                                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${location.pathname.includes('/hr')
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                HR & Payroll
                            </Link>
                        )}

                        {isModuleEnabled('accounting') && (
                            <Link
                                to="/customer/dashboard/accounting"
                                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${location.pathname.includes('/accounting')
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Accounting
                            </Link>
                        )}

                        {isModuleEnabled('manufacturing') && (
                            <Link
                                to="/customer/dashboard/manufacturing"
                                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${location.pathname.includes('/manufacturing')
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Manufacturing
                            </Link>
                        )}

                        {isModuleEnabled('assets') && (
                            <Link
                                to="/customer/dashboard/assets"
                                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${location.pathname.includes('/assets')
                                    ? 'border-primary-500 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Fixed Assets
                            </Link>
                        )}

                        <Link
                            to="/customer/dashboard/subscription"
                            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${location.pathname.includes('/subscription')
                                ? 'border-primary-500 text-primary-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            Subscription
                        </Link>

                        {/* Admin-only tabs */}
                        {(user?.role === 'admin' || !user?.role) && (
                            <>
                                <Link
                                    to="/customer/dashboard/activity"
                                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${location.pathname.includes('/activity')
                                        ? 'border-primary-500 text-primary-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    Activity Logs
                                </Link>

                                <Link
                                    to="/customer/dashboard/settings"
                                    className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${location.pathname.includes('/settings')
                                        ? 'border-primary-500 text-primary-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    ⚙️ Settings
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Routes>
                    <Route index element={<CustomerDashboardHome />} />
                    {isModuleEnabled('pos') && <Route path="pos" element={<POSSystem />} />}
                    {isModuleEnabled('inventory') && <Route path="inventory" element={<InventoryManagement />} />}
                    {isModuleEnabled('sales') && <Route path="sales" element={<SalesPage />} />}
                    {isModuleEnabled('purchase') && <Route path="purchase" element={<PurchaseSuppliersPage />} />}
                    {isModuleEnabled('hr') && <Route path="hr" element={<HREmployeesPage />} />}
                    {isModuleEnabled('accounting') && <Route path="accounting" element={<AccountingPage />} />}
                    {isModuleEnabled('manufacturing') && <Route path="manufacturing" element={<ManufacturingPage />} />}
                    {isModuleEnabled('assets') && <Route path="assets" element={<AssetsPage />} />}
                    <Route path="subscription" element={<SubscriptionPage />} />
                    <Route path="activity" element={<ActivityLogsPage />} />
                    <Route path="settings" element={<SettingsPage />} />
                </Routes>
            </div>
        </div>
    )
}

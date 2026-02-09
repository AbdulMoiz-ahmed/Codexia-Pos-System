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
    const [sidebarOpen, setSidebarOpen] = useState(true)

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

    const navItems = [
        { path: '/customer/dashboard', label: 'Dashboard', enabled: true },
        { path: '/customer/dashboard/pos', label: 'POS', enabled: isModuleEnabled('pos') },
        { path: '/customer/dashboard/inventory', label: 'Inventory', enabled: isModuleEnabled('inventory') },
        { path: '/customer/dashboard/sales', label: 'Sales & CRM', enabled: isModuleEnabled('sales') },
        { path: '/customer/dashboard/purchase', label: 'Purchase', enabled: isModuleEnabled('purchase') },
        { path: '/customer/dashboard/hr', label: 'HR & Payroll', enabled: isModuleEnabled('hr') },
        { path: '/customer/dashboard/accounting', label: 'Accounting', enabled: isModuleEnabled('accounting') },
        { path: '/customer/dashboard/manufacturing', label: 'Manufacturing', enabled: isModuleEnabled('manufacturing') },
        { path: '/customer/dashboard/assets', label: 'Fixed Assets', enabled: isModuleEnabled('assets') },
        { path: '/customer/dashboard/subscription', label: 'Subscription', enabled: true },
        { path: '/customer/dashboard/activity', label: 'Activity Logs', enabled: user?.role === 'admin' || !user?.role },
        { path: '/customer/dashboard/settings', label: 'Settings', enabled: user?.role === 'admin' || !user?.role },
    ]

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
                <div className="bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-2 px-4 text-center text-sm fixed top-0 left-0 right-0 z-50">
                    <span className="font-medium">Demo Mode</span>
                    <span className="mx-2">|</span>
                    <span>{demoTimeRemaining}</span>
                    <span className="mx-2">|</span>
                    <span>Experience all features - no credit card required</span>
                </div>
            )}

            {/* Top Header */}
            <header className={`bg-white shadow-sm border-b fixed top-0 right-0 left-0 z-40 ${isDemo ? 'mt-10' : ''}`}>
                <div className="flex justify-between items-center h-16 px-4">
                    <div className="flex items-center">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden mr-4 p-2 rounded-md text-gray-600 hover:bg-gray-100"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h1 className="text-2xl font-bold text-primary-600">POS + ERP</h1>
                    </div>
                    <button onClick={handleLogout} className="btn-secondary">
                        Logout
                    </button>
                </div>
            </header>

            {/* Sidebar */}
            <aside className={`fixed left-0 ${isDemo ? 'top-26' : 'top-16'} bottom-0 w-64 bg-white border-r shadow-lg transform transition-transform duration-300 ease-in-out z-30 ${
                sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            } lg:translate-x-0`}>
                <style>{`
                    aside::-webkit-scrollbar {
                        width: 6px;
                    }
                    aside::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    aside::-webkit-scrollbar-thumb {
                        background: #cbd5e1;
                        border-radius: 3px;
                    }
                    aside::-webkit-scrollbar-thumb:hover {
                        background: #94a3b8;
                    }
                    .sidebar-nav {
                        scrollbar-width: thin;
                        scrollbar-color: #cbd5e1 transparent;
                    }
                `}</style>
                <div className="flex flex-col h-full">
                    {/* User Profile Section */}
                    <div className="p-4 border-b bg-gradient-to-r from-primary-50 to-primary-100">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold text-lg">
                                {(user?.name || user?.first_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {user?.name || user?.first_name}
                                </p>
                                <p className="text-xs text-gray-600 truncate">
                                    {isDemo ? 'Demo Account' : (user?.tenant_name || 'Customer')}
                                </p>
                                {user?.email && (
                                    <p className="text-xs text-gray-500 truncate">
                                        {user.email}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Navigation Links */}
                    <nav className="flex-1 overflow-y-auto py-4 sidebar-nav">
                        <div className="px-2 space-y-1">
                            {navItems.map((item) => {
                                if (!item.enabled) return null;
                                
                                const isActive = item.path === '/customer/dashboard' 
                                    ? location.pathname === '/customer/dashboard'
                                    : location.pathname.startsWith(item.path);

                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => window.innerWidth < 1024 && setSidebarOpen(false)}
                                        className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                                            isActive
                                                ? 'bg-primary-600 text-white shadow-md'
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t bg-gray-50">
                        <div className="text-xs text-gray-500 text-center">
                            <p className="font-medium">Role: <span className="text-gray-700">{user?.role || 'Admin'}</span></p>
                            {user?.tenant_id && (
                                <p className="mt-1">ID: {user.tenant_id}</p>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className={`${isDemo ? 'pt-26' : 'pt-16'} lg:pl-64 transition-all duration-300`}>
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
            </main>
        </div>
    )
}

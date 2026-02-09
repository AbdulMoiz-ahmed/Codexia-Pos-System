import { useState, useEffect } from 'react'
import { Badge } from '../../components/UIComponents'
import { TrialStatusCard } from '../../components/ExpiryBanner'
import api from '../../services/api'

export default function SubscriptionPage() {
    const [subscription, setSubscription] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadSubscription()
    }, [])

    const loadSubscription = async () => {
        try {
            const response = await api.get('/customer/subscription')
            const data = response.data

            setSubscription({
                package: data.package,
                status: data.status,
                startDate: data.start_date,
                expiryDate: data.expiry_date,
                modules: data.enabled_modules || [],
                limits: data.limits || {},
                isDemo: data.is_demo || false,
                companyName: data.company_name,
                email: data.email
            })
        } catch (error) {
            console.error('Error loading subscription:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    }

    if (!subscription) {
        return <div className="p-6 text-center text-gray-500">Failed to load subscription details</div>
    }

    const getDaysRemaining = () => {
        if (!subscription.expiryDate) return 0
        const expiry = new Date(subscription.expiryDate)
        const today = new Date()
        return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    }

    const daysRemaining = getDaysRemaining()

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Subscription Management</h2>

            {/* Status Card - Shows trial/active/expired status prominently */}
            <div className="mb-6">
                <TrialStatusCard
                    status={subscription.status}
                    daysRemaining={daysRemaining}
                    expiryDate={subscription.expiryDate}
                    packageName={subscription.package}
                />
            </div>

            {/* Current Plan Details */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-900">{subscription.package}</h3>
                        <p className="text-gray-600 mt-1">
                            {subscription.status === 'trial'
                                ? '🎁 Free Trial Period'
                                : subscription.status === 'active'
                                    ? '✅ Active Subscription'
                                    : '⚠️ Subscription Expired'}
                        </p>
                    </div>
                    <StatusBadge status={subscription.status} />
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500">Start Date</p>
                        <p className="text-lg font-semibold">
                            {subscription.startDate ? new Date(subscription.startDate).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500">Expiry Date</p>
                        <p className="text-lg font-semibold">
                            {subscription.expiryDate ? new Date(subscription.expiryDate).toLocaleDateString() : 'N/A'}
                        </p>
                    </div>
                    <div className={`rounded-lg p-4 ${daysRemaining <= 7 ? 'bg-red-50' : 'bg-green-50'}`}>
                        <p className={`text-sm ${daysRemaining <= 7 ? 'text-red-600' : 'text-green-600'}`}>Days Remaining</p>
                        <p className={`text-lg font-bold ${daysRemaining <= 7 ? 'text-red-700' : 'text-green-700'}`}>
                            {daysRemaining > 0 ? daysRemaining : 'Expired'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Enabled Modules */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">📦 Enabled Modules</h3>
                <div className="flex flex-wrap gap-2">
                    {subscription.modules.length > 0 ? (
                        subscription.modules.map(module => (
                            <span key={module} className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium capitalize">
                                {module}
                            </span>
                        ))
                    ) : (
                        <span className="text-gray-500">No modules enabled</span>
                    )}
                </div>
            </div>

            {/* Plan Limits */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Plan Limits</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <LimitCard label="Users" value={subscription.limits.users} />
                    <LimitCard label="Branches" value={subscription.limits.branches} />
                    <LimitCard label="Warehouses" value={subscription.limits.warehouses} />
                    <LimitCard label="Transactions" value={subscription.limits.transactions} />
                </div>
            </div>

            {/* Renewal / Upgrade Section */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {subscription.status === 'expired' ? '🔄 Renew Your Subscription' : '⬆️ Upgrade or Renew'}
                </h3>

                {(subscription.status === 'trial' || subscription.status === 'expired' || daysRemaining <= 14) && (
                    <div className={`rounded-xl p-5 mb-4 ${subscription.status === 'expired' ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
                        <h4 className="font-semibold text-gray-800 mb-3">
                            {subscription.status === 'trial'
                                ? '🚀 Ready to Subscribe?'
                                : subscription.status === 'expired'
                                    ? '⚠️ Subscription Expired'
                                    : '⏰ Renew Before Expiry'}
                        </h4>
                        <p className="text-gray-600 mb-4">
                            {subscription.status === 'trial'
                                ? 'Upgrade to a paid plan to continue using all features after your trial ends.'
                                : subscription.status === 'expired'
                                    ? 'Your subscription has expired. Renew now to restore access to all features.'
                                    : 'Your subscription is about to expire. Renew now to avoid any interruption.'}
                        </p>

                        <div className="bg-white rounded-lg p-4 mb-4">
                            <h5 className="font-medium text-gray-800 mb-2">📞 Contact Us to Subscribe/Renew</h5>
                            <div className="grid md:grid-cols-3 gap-3 text-sm">
                                <a href="mailto:support@pos-erp.com" className="flex items-center gap-2 text-primary-600 hover:underline">
                                    <span>📧</span> support@pos-erp.com
                                </a>
                                <a href="tel:+923001234567" className="flex items-center gap-2 text-primary-600 hover:underline">
                                    <span>📞</span> +92 300 1234567
                                </a>
                                <a href="https://wa.me/923001234567" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 hover:underline">
                                    <span>💬</span> WhatsApp
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex gap-4">
                    <a
                        href="mailto:support@pos-erp.com?subject=Subscription%20Inquiry"
                        className="btn-primary"
                    >
                        {subscription.status === 'expired' ? 'Request Renewal' : 'Upgrade Plan'}
                    </a>
                    <button className="btn-secondary" onClick={() => window.location.reload()}>
                        Refresh Status
                    </button>
                </div>
            </div>
        </div>
    )
}

function StatusBadge({ status }) {
    const styles = {
        active: 'bg-green-100 text-green-700 border-green-200',
        trial: 'bg-blue-100 text-blue-700 border-blue-200',
        expired: 'bg-red-100 text-red-700 border-red-200'
    }

    const labels = {
        active: '✅ ACTIVE',
        trial: '🎉 FREE TRIAL',
        expired: '⚠️ EXPIRED'
    }

    return (
        <span className={`px-3 py-1.5 rounded-full text-sm font-bold border ${styles[status] || styles.expired}`}>
            {labels[status] || status?.toUpperCase()}
        </span>
    )
}

function LimitCard({ label, value }) {
    return (
        <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-xl font-bold text-gray-800">
                {value === -1 || value === undefined ? '∞' : value || 'Unlimited'}
            </p>
        </div>
    )
}


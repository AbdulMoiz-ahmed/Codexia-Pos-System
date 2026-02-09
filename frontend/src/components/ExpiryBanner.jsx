import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'

/**
 * ExpiryBanner - Shows a warning banner when subscription is expiring soon
 * Displays different colors based on urgency:
 * - Yellow: 7+ days remaining
 * - Orange: 3-7 days remaining
 * - Red: Less than 3 days or expired
 */
export default function ExpiryBanner() {
    const [subscription, setSubscription] = useState(null)
    const [dismissed, setDismissed] = useState(false)

    useEffect(() => {
        loadSubscription()
    }, [])

    const loadSubscription = async () => {
        try {
            const response = await api.get('/customer/subscription')
            setSubscription(response.data)
        } catch (error) {
            console.error('Error loading subscription:', error)
        }
    }

    if (!subscription || dismissed) return null

    const getDaysRemaining = () => {
        if (!subscription.expiry_date) return 999
        const expiry = new Date(subscription.expiry_date)
        const today = new Date()
        return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
    }

    const days = getDaysRemaining()
    const status = subscription.status

    // Don't show banner if more than 14 days remaining and not on trial
    if (days > 14 && status !== 'trial') return null

    // Don't show for demo users - they have their own banner
    if (subscription.is_demo) return null

    // Determine banner style based on urgency
    const getBannerStyle = () => {
        if (status === 'expired' || days <= 0) {
            return {
                bg: 'bg-gradient-to-r from-red-600 to-red-700',
                icon: '🚫',
                text: 'Your subscription has expired!',
                subtext: 'Please renew to continue using all features.',
                showRenew: true
            }
        }
        if (days <= 3) {
            return {
                bg: 'bg-gradient-to-r from-red-500 to-orange-500',
                icon: '⚠️',
                text: `${status === 'trial' ? 'Trial' : 'Subscription'} expires in ${days} day${days === 1 ? '' : 's'}!`,
                subtext: 'Renew now to avoid interruption.',
                showRenew: true
            }
        }
        if (days <= 7) {
            return {
                bg: 'bg-gradient-to-r from-orange-500 to-yellow-500',
                icon: '⏰',
                text: `${status === 'trial' ? 'Trial' : 'Subscription'} expires in ${days} days`,
                subtext: 'Consider renewing soon.',
                showRenew: true
            }
        }
        if (status === 'trial') {
            return {
                bg: 'bg-gradient-to-r from-blue-500 to-indigo-500',
                icon: '🎉',
                text: `You're on a free trial - ${days} days remaining`,
                subtext: 'Explore all features!',
                showRenew: false
            }
        }
        return null
    }

    const style = getBannerStyle()
    if (!style) return null

    return (
        <div className={`${style.bg} text-white py-2 px-4 shadow-lg`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                    <span className="text-xl">{style.icon}</span>
                    <div>
                        <span className="font-semibold">{style.text}</span>
                        <span className="hidden sm:inline text-white/80 ml-2">- {style.subtext}</span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {style.showRenew && (
                        <Link
                            to="/customer/dashboard/subscription"
                            className="bg-white text-gray-800 px-4 py-1.5 rounded-lg font-medium hover:bg-gray-100 transition-colors text-sm"
                        >
                            View Subscription
                        </Link>
                    )}
                    <button
                        onClick={() => setDismissed(true)}
                        className="text-white/70 hover:text-white text-xl"
                        title="Dismiss"
                    >
                        ×
                    </button>
                </div>
            </div>
        </div>
    )
}

/**
 * ExpiredOverlay - Full screen overlay when license is expired
 * Prevents access to the app and shows renewal instructions
 */
export function ExpiredOverlay({ onLogout }) {
    return (
        <div className="fixed inset-0 bg-gray-900/95 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">⏰</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Subscription Expired
                </h2>
                <p className="text-gray-600 mb-6">
                    Your subscription has expired. To continue using the POS system and access your data,
                    please contact our team to renew your subscription.
                </p>

                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <h3 className="font-semibold text-gray-800 mb-2">Contact Us to Renew</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                        <p>📧 Email: <a href="mailto:support@pos-erp.com" className="text-primary-600 hover:underline">support@pos-erp.com</a></p>
                        <p>📞 Phone: <a href="tel:+923001234567" className="text-primary-600 hover:underline">+92 300 1234567</a></p>
                        <p>💬 WhatsApp: <a href="https://wa.me/923001234567" className="text-primary-600 hover:underline">Chat with us</a></p>
                    </div>
                </div>

                <div className="flex gap-3 justify-center">
                    <button
                        onClick={onLogout}
                        className="btn-secondary"
                    >
                        Logout
                    </button>
                    <a
                        href="mailto:support@pos-erp.com?subject=Subscription%20Renewal%20Request"
                        className="btn-primary"
                    >
                        Request Renewal
                    </a>
                </div>
            </div>
        </div>
    )
}

/**
 * TrialStatusCard - Displays trial/subscription status in a card format
 * Use this on the SubscriptionPage for detailed view
 */
export function TrialStatusCard({ status, daysRemaining, expiryDate, packageName }) {
    const getStatusInfo = () => {
        if (status === 'expired') {
            return {
                color: 'red',
                title: 'Subscription Expired',
                description: 'Your subscription has expired. Please renew to continue.',
                icon: '🚫',
                bgGradient: 'from-red-500 to-red-600'
            }
        }
        if (status === 'trial') {
            if (daysRemaining <= 3) {
                return {
                    color: 'orange',
                    title: 'Trial Ending Soon',
                    description: `Your free trial expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}. Subscribe to keep access.`,
                    icon: '⚠️',
                    bgGradient: 'from-orange-500 to-red-500'
                }
            }
            return {
                color: 'blue',
                title: 'Free Trial',
                description: `You have ${daysRemaining} days to explore all features.`,
                icon: '🎉',
                bgGradient: 'from-blue-500 to-indigo-500'
            }
        }
        if (daysRemaining <= 7) {
            return {
                color: 'yellow',
                title: 'Renew Soon',
                description: `Your subscription expires in ${daysRemaining} days.`,
                icon: '⏰',
                bgGradient: 'from-yellow-500 to-orange-500'
            }
        }
        return {
            color: 'green',
            title: 'Active Subscription',
            description: `Your ${packageName} plan is active.`,
            icon: '✅',
            bgGradient: 'from-green-500 to-emerald-500'
        }
    }

    const info = getStatusInfo()

    return (
        <div className={`bg-gradient-to-br ${info.bgGradient} rounded-xl p-6 text-white shadow-lg`}>
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{info.icon}</span>
                        <h3 className="text-xl font-bold">{info.title}</h3>
                    </div>
                    <p className="text-white/80">{info.description}</p>
                    {expiryDate && (
                        <p className="mt-3 text-sm text-white/70">
                            Expires: {new Date(expiryDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    )}
                </div>
                <div className="text-right">
                    <div className="text-4xl font-bold">{daysRemaining}</div>
                    <div className="text-sm text-white/70">days left</div>
                </div>
            </div>
        </div>
    )
}

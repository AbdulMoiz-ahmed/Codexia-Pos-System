import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { publicService } from '../services/authService'

export default function CheckoutPage() {
    const navigate = useNavigate()
    const { packageId } = useParams()
    const [selectedPackage, setSelectedPackage] = useState(null)
    const [loadingPackage, setLoadingPackage] = useState(true)

    const [formData, setFormData] = useState({
        company_name: '',
        email: '',
        contact_person: '',
        phone: '',
        address: {
            street: '',
            city: '',
            state: '',
            country: 'Pakistan',
            postal_code: ''
        }
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)
    const [bookingId, setBookingId] = useState(null)
    const [step, setStep] = useState(1)

    useEffect(() => {
        loadPackage()
    }, [packageId])

    const loadPackage = async () => {
        try {
            const data = await publicService.getPackage(packageId)
            setSelectedPackage(data.package)
        } catch (error) {
            console.error('Error loading package:', error)
            navigate('/')
        } finally {
            setLoadingPackage(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const data = await publicService.checkout({
                package_id: selectedPackage._id,
                ...formData
            })

            setBookingId(data.booking_id)
            setSuccess(true)
        } catch (err) {
            setError(err.response?.data?.error || 'Checkout failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target

        if (name.startsWith('address.')) {
            const addressField = name.split('.')[1]
            setFormData({
                ...formData,
                address: {
                    ...formData.address,
                    [addressField]: value
                }
            })
        } else {
            setFormData({
                ...formData,
                [name]: value
            })
        }
    }

    if (loadingPackage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                    <p className="text-gray-600">Loading package details...</p>
                </div>
            </div>
        )
    }

    if (!selectedPackage) {
        return null
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center py-12 px-4">
                <div className="max-w-2xl w-full">
                    {/* Success Animation */}
                    <div className="bg-white rounded-3xl shadow-2xl shadow-indigo-500/10 p-10 text-center border border-gray-100">
                        <div className="relative mx-auto w-24 h-24 mb-6">
                            <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-25"></div>
                            <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>

                        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">
                            Booking Successful! 🎉
                        </h2>
                        <p className="text-gray-600 mb-8">
                            Thank you for choosing <span className="font-semibold text-indigo-600">{selectedPackage.display_name}</span>
                        </p>

                        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-6 mb-6 text-white">
                            <p className="text-sm opacity-80 mb-1">Your Booking ID</p>
                            <p className="text-3xl font-bold tracking-wider">{bookingId}</p>
                        </div>

                        <div className="bg-gray-50 rounded-2xl p-6 mb-6 text-left">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <span className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">📋</span>
                                What Happens Next?
                            </h3>
                            <ol className="space-y-3">
                                {[
                                    'Our team will review your booking within 24 hours',
                                    'You\'ll receive an email with payment instructions',
                                    'After payment confirmation, your account will be activated',
                                    'You\'ll receive login credentials to access your dashboard'
                                ].map((step, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                                            {i + 1}
                                        </span>
                                        <span className="text-gray-700">{step}</span>
                                    </li>
                                ))}
                            </ol>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                            <span className="text-xl">⚠️</span>
                            <p className="text-sm text-yellow-800 text-left">
                                <strong>Important:</strong> Please save your Booking ID for future reference.
                            </p>
                        </div>

                        <Link
                            to="/"
                            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Return to Home
                        </Link>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            {/* Header */}
            <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-100 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                                <span className="text-white font-bold text-lg">CX</span>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                    POS + ERP
                                </h1>
                                <p className="text-xs text-gray-500 -mt-1">by CODEXIA SOLUTIONS</p>
                            </div>
                        </Link>
                        <Link
                            to="/"
                            className="text-gray-600 hover:text-indigo-600 font-medium flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Home
                        </Link>
                    </div>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto px-4 py-12">
                {/* Progress Steps */}
                <div className="flex justify-center mb-12">
                    <div className="flex items-center gap-4">
                        {['Select Plan', 'Your Details', 'Confirmation'].map((label, i) => (
                            <div key={i} className="flex items-center">
                                <div className={`flex items-center gap-2 ${i <= step ? 'text-indigo-600' : 'text-gray-400'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i < step ? 'bg-indigo-600 text-white' :
                                            i === step ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-600' :
                                                'bg-gray-100 text-gray-400'
                                        }`}>
                                        {i < step ? '✓' : i + 1}
                                    </div>
                                    <span className="hidden sm:inline font-medium">{label}</span>
                                </div>
                                {i < 2 && <div className={`w-12 h-0.5 mx-2 ${i < step ? 'bg-indigo-600' : 'bg-gray-200'}`}></div>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-500/5 border border-gray-100 overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8">
                                <h2 className="text-2xl font-bold mb-2">Complete Your Booking</h2>
                                <p className="text-indigo-100">Fill in your details to get started with {selectedPackage.display_name}</p>
                            </div>

                            <form onSubmit={handleSubmit} className="p-8">
                                {error && (
                                    <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
                                        <span className="text-xl">⚠️</span>
                                        {error}
                                    </div>
                                )}

                                {/* Company Information */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">🏢</span>
                                        Company Information
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Company Name *
                                            </label>
                                            <input
                                                type="text"
                                                name="company_name"
                                                required
                                                value={formData.company_name}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                                placeholder="Your company name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Contact Person *
                                            </label>
                                            <input
                                                type="text"
                                                name="contact_person"
                                                required
                                                value={formData.contact_person}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                                placeholder="Full name"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Email Address *
                                            </label>
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                value={formData.email}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                                placeholder="email@company.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Phone Number *
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                required
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                                placeholder="+92 300 1234567"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Business Address */}
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                        <span className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600">📍</span>
                                        Business Address
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Street Address
                                            </label>
                                            <input
                                                type="text"
                                                name="address.street"
                                                value={formData.address.street}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                                placeholder="Office address"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                                            <input
                                                type="text"
                                                name="address.city"
                                                value={formData.address.city}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                                placeholder="City"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">State/Province</label>
                                            <input
                                                type="text"
                                                name="address.state"
                                                value={formData.address.state}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                                placeholder="Province"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                                            <input
                                                type="text"
                                                name="address.country"
                                                value={formData.address.country}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Postal Code</label>
                                            <input
                                                type="text"
                                                name="address.postal_code"
                                                value={formData.address.postal_code}
                                                onChange={handleChange}
                                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                                                placeholder="Postal code"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Submit */}
                                <div className="border-t border-gray-100 pt-6">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                Processing...
                                            </span>
                                        ) : (
                                            <span className="flex items-center justify-center gap-2">
                                                Submit Booking
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                </svg>
                                            </span>
                                        )}
                                    </button>
                                    <p className="text-sm text-gray-500 text-center mt-4">
                                        By submitting, you agree to our Terms of Service and Privacy Policy
                                    </p>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-3xl shadow-xl shadow-indigo-500/5 border border-gray-100 p-6 sticky top-24">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h3>

                            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 mb-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-xl font-bold text-gray-900">{selectedPackage.display_name}</h4>
                                        <p className="text-sm text-gray-600">{selectedPackage.description}</p>
                                    </div>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-extrabold text-indigo-600">
                                        PKR {selectedPackage.price.toLocaleString()}
                                    </span>
                                    <span className="text-gray-500">/{selectedPackage.billing_cycle}</span>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <h4 className="font-medium text-gray-900">Includes:</h4>
                                {(selectedPackage.features || []).slice(0, 5).map((feature, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                        <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-sm text-gray-700">{feature}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                                <span className="text-2xl">🎁</span>
                                <div>
                                    <p className="font-medium text-green-800">{selectedPackage.trial_days} Days Free Trial</p>
                                    <p className="text-sm text-green-600">No payment required now</p>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <div className="flex items-center gap-3 text-sm text-gray-600">
                                    <span className="text-xl">🔒</span>
                                    <span>Secure checkout by CODEXIA SOLUTIONS</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

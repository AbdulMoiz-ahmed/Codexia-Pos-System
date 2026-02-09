import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function DemoRequestPage() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [credentials, setCredentials] = useState(null)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        package_interest: 'professional'
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await api.post('/demo/request', formData)
            setCredentials(res.data.credentials)
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create demo account')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white mb-2">Try Demo</h1>
                    <p className="text-primary-200">
                        Get instant access to our full-featured demo
                    </p>
                </div>

                {!credentials ? (
                    /* Request Form */
                    <div className="bg-white rounded-2xl shadow-2xl p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">
                            Request Demo Access
                        </h2>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Full Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="John Doe"
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
                                    className="input-field"
                                    placeholder="john@company.com"
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
                                    className="input-field"
                                    placeholder="0300-1234567"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Company Name
                                </label>
                                <input
                                    type="text"
                                    name="company"
                                    value={formData.company}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="Optional"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Interested Package
                                </label>
                                <select
                                    name="package_interest"
                                    value={formData.package_interest}
                                    onChange={handleChange}
                                    className="input-field"
                                >
                                    <option value="starter">Starter</option>
                                    <option value="professional">Professional</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full btn-primary py-3 text-lg"
                            >
                                {loading ? 'Creating Demo...' : 'Get Instant Demo Access'}
                            </button>
                        </form>

                        <div className="mt-6 text-center text-sm text-gray-500">
                            Already have credentials?{' '}
                            <Link to="/demo/login" className="text-primary-600 hover:underline font-medium">
                                Login to Demo
                            </Link>
                        </div>
                    </div>
                ) : (
                    /* Credentials Display */
                    <div className="bg-white rounded-2xl shadow-2xl p-8">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900">Demo Account Created!</h2>
                            <p className="text-gray-500 mt-2">Your demo credentials are ready</p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-6 mb-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Username</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <code className="flex-1 bg-white px-4 py-2 rounded-lg border font-mono text-lg">
                                            {credentials.username}
                                        </code>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(credentials.username)}
                                            className="p-2 hover:bg-gray-200 rounded"
                                            title="Copy"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase">Password</label>
                                    <div className="flex items-center gap-2 mt-1">
                                        <code className="flex-1 bg-white px-4 py-2 rounded-lg border font-mono text-lg">
                                            {credentials.password}
                                        </code>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(credentials.password)}
                                            className="p-2 hover:bg-gray-200 rounded"
                                            title="Copy"
                                        >
                                            📋
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                            <div className="flex gap-3">
                                <span className="text-yellow-600 text-xl">⏰</span>
                                <div>
                                    <p className="font-medium text-yellow-800">Demo expires in 24 hours</p>
                                    <p className="text-sm text-yellow-600">
                                        All your demo data will be deleted after expiry
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate('/demo/login')}
                            className="w-full btn-primary py-3 text-lg"
                        >
                            Go to Demo Login →
                        </button>
                    </div>
                )}

                <div className="text-center mt-6">
                    <Link to="/" className="text-primary-200 hover:text-white text-sm">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        </div>
    )
}

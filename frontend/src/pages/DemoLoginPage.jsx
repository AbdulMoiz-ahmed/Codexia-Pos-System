import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

export default function DemoLoginPage() {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    })

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const res = await api.post('/demo/login', formData)

            // Store token as access_token - same key as authService uses
            localStorage.setItem('access_token', res.data.token)
            localStorage.setItem('user', JSON.stringify({
                ...res.data.user,
                is_demo: true
            }))

            // Navigate to the REAL customer dashboard
            navigate('/customer/dashboard')
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-600 via-teal-600 to-cyan-700 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur rounded-full px-4 py-2 mb-4">
                        <span className="text-white font-medium">🎮 Demo Portal</span>
                    </div>
                    <h1 className="text-4xl font-bold text-white mb-2">Demo Login</h1>
                    <p className="text-teal-200">
                        Experience our full-featured POS system
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">
                        Login to Demo
                    </h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                name="username"
                                required
                                value={formData.username}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="demo_xxxxxx"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                name="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold py-3 rounded-lg text-lg transition-all"
                        >
                            {loading ? 'Logging in...' : 'Enter Demo Portal'}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-500">
                        Don't have demo credentials?{' '}
                        <Link to="/demo/request" className="text-teal-600 hover:underline font-medium">
                            Request Demo Access
                        </Link>
                    </div>
                </div>

                <div className="text-center mt-6 space-x-4">
                    <Link to="/" className="text-teal-200 hover:text-white text-sm">
                        ← Back to Home
                    </Link>
                    <span className="text-teal-400">|</span>
                    <Link to="/login" className="text-teal-200 hover:text-white text-sm">
                        Customer Login
                    </Link>
                </div>
            </div>
        </div>
    )
}

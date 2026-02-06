import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '../services/authService'
import { useToast } from '../components/Toast'

export default function CustomerLoginPage() {
    const navigate = useNavigate()
    const toast = useToast()
    const [formData, setFormData] = useState({
        identifier: '',
        password: ''
    })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const data = await authService.login(formData.identifier, formData.password)

            // Redirect based on user role
            if (data.user.is_super_admin) {
                navigate('/admin')
            } else {
                navigate('/customer/dashboard')
            }
            toast.success('Login successful!')
        } catch (err) {
            toast.error(err.response?.data?.error || 'Login failed. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full">
                <div className="bg-white rounded-2xl shadow-xl p-8 animate-scale-in">
                    <div className="text-center mb-8">
                        <Link to="/" className="text-3xl font-bold text-primary-600">
                            POS + ERP SaaS
                        </Link>
                        <h2 className="mt-4 text-2xl font-bold text-gray-900">
                            Customer Portal
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            Sign in to access your dashboard
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
                                Username or Email
                            </label>
                            <input
                                id="identifier"
                                name="identifier"
                                type="text"
                                required
                                value={formData.identifier}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="Enter your username or email"
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                className="input-field"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center">
                                <input
                                    id="remember-me"
                                    name="remember-me"
                                    type="checkbox"
                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                />
                                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                                    Remember me
                                </label>
                            </div>

                            <div className="text-sm">
                                <a href="#" className="font-medium text-primary-600 hover:text-primary-500">
                                    Forgot password?
                                </a>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary"
                        >
                            {loading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link to="/" className="text-sm text-primary-600 hover:text-primary-500">
                            ← Back to home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

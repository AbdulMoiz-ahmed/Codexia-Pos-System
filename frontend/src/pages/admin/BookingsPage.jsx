import { useState, useEffect } from 'react'
import { adminService } from '../../services/authService'
import { useToast } from '../../components/Toast'
import { Badge } from '../../components/UIComponents'
import api from '../../services/api'

export default function BookingsPage() {
    const toast = useToast()
    const [bookings, setBookings] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCredentialsModal, setShowCredentialsModal] = useState(false)
    const [credentials, setCredentials] = useState(null)

    useEffect(() => {
        loadBookings()
    }, [])

    const loadBookings = async () => {
        try {
            const response = await api.get('/admin/bookings')
            setBookings(response.data.bookings || [])
        } catch (error) {
            toast.error('Failed to load bookings')
        } finally {
            setLoading(false)
        }
    }

    const handleApprove = async (bookingId) => {
        try {
            const response = await api.post(`/admin/bookings/${bookingId}/approve`)
            toast.success('Booking approved successfully!')

            // Show credentials modal
            if (response.data.user) {
                setCredentials(response.data.user)
                setShowCredentialsModal(true)
            }

            loadBookings()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to approve booking')
        }
    }

    const handleReject = async (bookingId) => {
        if (!confirm('Are you sure you want to reject this booking?')) return

        try {
            await api.post(`/admin/bookings/${bookingId}/reject`)
            toast.success('Booking rejected')
            loadBookings()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to reject booking')
        }
    }

    const handleRevertStatus = async (bookingId) => {
        if (!confirm('Revert this booking back to pending status?')) return

        try {
            await api.put(`/admin/bookings/${bookingId}/status`, { status: 'pending' })
            toast.success('Booking status reverted to pending')
            loadBookings()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to revert status')
        }
    }

    const getStatusBadge = (status) => {
        const variants = {
            pending: 'warning',
            approved: 'success',
            rejected: 'danger'
        }
        return <Badge variant={variants[status] || 'default'}>{status.toUpperCase()}</Badge>
    }

    if (loading) {
        return <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Booking Requests</h2>
                <span className="text-sm text-gray-600">
                    {bookings.filter(b => b.status === 'pending').length} pending
                </span>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Package</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {bookings.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                    No bookings found
                                </td>
                            </tr>
                        ) : (
                            bookings.map((booking) => (
                                <tr key={booking._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{booking.company_name}</div>
                                        <div className="text-sm text-gray-500">{booking.email}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">{booking.contact_person}</div>
                                        <div className="text-sm text-gray-500">{booking.phone}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        {booking.package_name || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {getStatusBadge(booking.status)}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(booking.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium">
                                        {booking.status === 'pending' ? (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleApprove(booking._id)}
                                                    className="text-green-600 hover:text-green-900"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleReject(booking._id)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleRevertStatus(booking._id)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                >
                                                    Revert to Pending
                                                </button>
                                                {booking.temp_password && (
                                                    <button
                                                        onClick={() => {
                                                            setCredentials({
                                                                email: booking.email,
                                                                temp_password: booking.temp_password,
                                                                login_url: 'http://localhost:3000/customer/login'
                                                            })
                                                            setShowCredentialsModal(true)
                                                        }}
                                                        className="text-primary-600 hover:text-primary-900"
                                                    >
                                                        View Credentials
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Credentials Modal */}
            {showCredentialsModal && credentials && (
                <CredentialsModal
                    credentials={credentials}
                    onClose={() => setShowCredentialsModal(false)}
                />
            )}
        </div>
    )
}

function CredentialsModal({ credentials, onClose }) {
    const [copied, setCopied] = useState(false)

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const copyAll = () => {
        const text = `Login URL: ${credentials.login_url}\nEmail: ${credentials.email}\nPassword: ${credentials.temp_password}`
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 animate-scale-in">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">Customer Login Credentials</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-blue-800 font-medium mb-2">✅ Tenant account created successfully!</p>
                    <p className="text-blue-700 text-sm">Send these credentials to the customer via email or WhatsApp.</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Login URL</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={credentials.login_url}
                                readOnly
                                className="input-field flex-1 bg-gray-50"
                            />
                            <button
                                onClick={() => copyToClipboard(credentials.login_url)}
                                className="btn-secondary"
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={credentials.email}
                                readOnly
                                className="input-field flex-1 bg-gray-50"
                            />
                            <button
                                onClick={() => copyToClipboard(credentials.email)}
                                className="btn-secondary"
                            >
                                Copy
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Temporary Password</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={credentials.temp_password}
                                readOnly
                                className="input-field flex-1 bg-gray-50 font-mono"
                            />
                            <button
                                onClick={() => copyToClipboard(credentials.temp_password)}
                                className="btn-secondary"
                            >
                                Copy
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                        <strong>Note:</strong> Customer should change this password after first login.
                    </p>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button onClick={copyAll} className="btn-secondary">
                        {copied ? '✓ Copied!' : 'Copy All'}
                    </button>
                    <button onClick={onClose} className="btn-primary">
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}

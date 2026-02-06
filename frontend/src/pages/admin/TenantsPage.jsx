import { useState, useEffect } from 'react'
import { adminService } from '../../services/authService'
import api from '../../services/api'

export default function TenantsPage() {
    const [tenants, setTenants] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showLicenseModal, setShowLicenseModal] = useState(false)
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [editingTenant, setEditingTenant] = useState(null)
    const [newPassword, setNewPassword] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        loadTenants()
    }, [])

    const loadTenants = async () => {
        try {
            const data = await adminService.getTenants({ search: searchTerm })
            setTenants(data.items || [])
        } catch (error) {
            console.error('Error loading tenants:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateTenant = () => {
        setEditingTenant(null)
        setShowModal(true)
    }

    const handleEditTenant = (tenant) => {
        setEditingTenant(tenant)
        setShowModal(true)
    }

    const handleManageLicense = (tenant) => {
        setEditingTenant(tenant)
        setShowLicenseModal(true)
    }

    const handleResetPassword = async (tenant) => {
        if (!confirm(`Reset password for ${tenant.company_name}?`)) return

        try {
            // Find user for this tenant
            const response = await api.get(`/admin/tenants/${tenant._id}/users`)
            const users = response.data.users || []

            if (users.length === 0) {
                alert('No users found for this tenant')
                return
            }

            // Reset password for first user (admin)
            const passwordResponse = await api.post(`/admin/users/${users[0]._id}/reset-password`)

            setNewPassword({
                email: passwordResponse.data.email,
                password: passwordResponse.data.new_password,
                company: tenant.company_name
            })
            setShowPasswordModal(true)
        } catch (error) {
            alert(error.response?.data?.error || 'Failed to reset password')
        }
    }

    const handleSearch = () => {
        setLoading(true)
        loadTenants()
    }

    const getStatusBadge = (status) => {
        if (status === 'active') {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Active</span>
        } else if (status === 'trial') {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Trial</span>
        } else if (status === 'expired') {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Expired</span>
        } else {
            return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">Suspended</span>
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Tenant Management</h2>
                <button onClick={handleCreateTenant} className="btn-primary">
                    + Create Tenant
                </button>
            </div>

            {/* Search */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Search tenants by name, email, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="input-field flex-1"
                    />
                    <button onClick={handleSearch} className="btn-primary">
                        Search
                    </button>
                </div>
            </div>

            {/* Tenants Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Company
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Contact
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Package
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                License Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Users
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {tenants.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center">
                                        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                        <p className="text-lg font-medium">No tenants found</p>
                                        <p className="text-sm">Create your first tenant to get started</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            tenants.map((tenant) => (
                                <tr key={tenant._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{tenant.company_name}</div>
                                            <div className="text-sm text-gray-500">{tenant.tenant_id}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm text-gray-900">{tenant.contact_person}</div>
                                            <div className="text-sm text-gray-500">{tenant.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{tenant.license?.package_name || 'Not Assigned'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {tenant.license?.status ? getStatusBadge(tenant.license.status) : <span className="text-gray-400">-</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {tenant.limits?.users || 0}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button
                                            onClick={() => handleEditTenant(tenant)}
                                            className="text-primary-600 hover:text-primary-900 mr-3"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleManageLicense(tenant)}
                                            className="text-blue-600 hover:text-blue-900 mr-3"
                                        >
                                            License
                                        </button>
                                        <button
                                            onClick={() => handleResetPassword(tenant)}
                                            className="text-orange-600 hover:text-orange-900"
                                        >
                                            Reset Password
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <TenantModal
                    tenant={editingTenant}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        setShowModal(false)
                        loadTenants()
                    }}
                />
            )}

            {/* License Management Modal */}
            {showLicenseModal && (
                <LicenseModal
                    tenant={editingTenant}
                    onClose={() => setShowLicenseModal(false)}
                    onSave={() => {
                        setShowLicenseModal(false)
                        loadTenants()
                    }}
                />
            )}
        </div>
    )
}

function TenantModal({ tenant, onClose, onSave }) {
    const [formData, setFormData] = useState({
        company_name: tenant?.company_name || '',
        email: tenant?.email || '',
        contact_person: tenant?.contact_person || '',
        phone: tenant?.phone || '',
        address: tenant?.address || {}
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (tenant) {
                await adminService.updateTenant(tenant._id, formData)
            } else {
                await adminService.createTenant(formData)
            }
            onSave()
        } catch (err) {
            setError(err.response?.data?.error || 'Operation failed')
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">
                            {tenant ? 'Edit Tenant' : 'Create New Tenant'}
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
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
                                className="input-field"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email *
                            </label>
                            <input
                                type="email"
                                name="email"
                                required
                                value={formData.email}
                                onChange={handleChange}
                                className="input-field"
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
                                className="input-field"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="input-field"
                            />
                        </div>

                        <div className="flex justify-end space-x-4 pt-4">
                            <button type="button" onClick={onClose} className="btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" disabled={loading} className="btn-primary">
                                {loading ? 'Saving...' : tenant ? 'Update Tenant' : 'Create Tenant'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

function LicenseModal({ tenant, onClose, onSave }) {
    const [packages, setPackages] = useState([])
    const [formData, setFormData] = useState({
        package_id: tenant?.license?.package_id || '',
        status: tenant?.license?.status || 'trial',
        trial_days: 14,
        credit_days: 0
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        loadPackages()
    }, [])

    const loadPackages = async () => {
        try {
            const response = await api.get('/public/packages')
            setPackages(response.data.packages || [])
        } catch (error) {
            console.error('Error loading packages:', error)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            const selectedPackage = packages.find(p => p._id === formData.package_id)

            const licenseData = {
                package_id: formData.package_id,
                package_name: selectedPackage?.name,
                status: formData.status,
                start_date: new Date().toISOString(),
                expiry_date: new Date(Date.now() + formData.trial_days * 24 * 60 * 60 * 1000).toISOString(),
                credit_days: formData.credit_days,
                auto_renew: false
            }

            await api.put(`/admin/tenants/${tenant._id}/license`, { license: licenseData })

            // Also update modules and limits
            if (selectedPackage) {
                await api.put(`/admin/tenants/${tenant._id}/modules`, {
                    modules: selectedPackage.modules.filter(m => m.enabled).map(m => m.name)
                })
            }

            onSave()
        } catch (err) {
            setError(err.response?.data?.error || 'Operation failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">
                            Manage License - {tenant?.company_name}
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Package *
                            </label>
                            <select
                                value={formData.package_id}
                                onChange={(e) => setFormData({ ...formData, package_id: e.target.value })}
                                className="input-field"
                                required
                            >
                                <option value="">-- Select Package --</option>
                                {packages.map(pkg => (
                                    <option key={pkg._id} value={pkg._id}>
                                        {pkg.display_name} - PKR {pkg.price.toLocaleString()}/{pkg.billing_cycle}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                License Status *
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                className="input-field"
                                required
                            >
                                <option value="trial">Trial</option>
                                <option value="active">Active</option>
                                <option value="expired">Expired</option>
                                <option value="suspended">Suspended</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Trial/License Days
                            </label>
                            <input
                                type="number"
                                value={formData.trial_days}
                                onChange={(e) => setFormData({ ...formData, trial_days: parseInt(e.target.value) })}
                                className="input-field"
                                min="1"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Credit Days (Grace Period)
                            </label>
                            <input
                                type="number"
                                value={formData.credit_days}
                                onChange={(e) => setFormData({ ...formData, credit_days: parseInt(e.target.value) })}
                                className="input-field"
                                min="0"
                            />
                        </div>

                        <div className="flex justify-end space-x-4 pt-4">
                            <button type="button" onClick={onClose} className="btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" disabled={loading} className="btn-primary">
                                {loading ? 'Saving...' : 'Assign License'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

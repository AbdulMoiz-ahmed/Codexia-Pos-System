import { useState, useEffect } from 'react'
import api from '../../services/api'

export default function PackagesPage() {
    const [packages, setPackages] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingPackage, setEditingPackage] = useState(null)

    useEffect(() => {
        loadPackages()
    }, [])

    const loadPackages = async () => {
        try {
            const response = await api.get('/public/packages')
            setPackages(response.data.packages || [])
        } catch (error) {
            console.error('Error loading packages:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreatePackage = () => {
        setEditingPackage(null)
        setShowModal(true)
    }

    const handleEditPackage = (pkg) => {
        setEditingPackage(pkg)
        setShowModal(true)
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
                <h2 className="text-3xl font-bold text-gray-900">Package Management</h2>
                <button onClick={handleCreatePackage} className="btn-primary">
                    + Create Package
                </button>
            </div>

            {/* Packages Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {packages.map((pkg) => (
                    <div key={pkg._id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">{pkg.display_name}</h3>
                                <p className="text-sm text-gray-500">{pkg.name}</p>
                            </div>
                            {pkg.is_active ? (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    Active
                                </span>
                            ) : (
                                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                    Inactive
                                </span>
                            )}
                        </div>

                        <p className="text-gray-600 mb-4">{pkg.description}</p>

                        <div className="mb-4">
                            <span className="text-3xl font-bold text-primary-600">
                                PKR {pkg.price.toLocaleString()}
                            </span>
                            <span className="text-gray-600">/{pkg.billing_cycle}</span>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Limits:</p>
                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                <div>Users: {pkg.limits?.users}</div>
                                <div>Branches: {pkg.limits?.branches}</div>
                                <div>Warehouses: {pkg.limits?.warehouses}</div>
                                <div>Transactions: {pkg.limits?.monthly_transactions?.toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="mb-4">
                            <p className="text-sm font-medium text-gray-700 mb-2">Enabled Modules:</p>
                            <div className="flex flex-wrap gap-1">
                                {pkg.modules?.filter(m => m.enabled).map((module) => (
                                    <span
                                        key={module.name}
                                        className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
                                    >
                                        {module.name}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4 border-t">
                            <button
                                onClick={() => handleEditPackage(pkg)}
                                className="flex-1 btn-primary text-sm"
                            >
                                Edit
                            </button>
                            <button className="flex-1 btn-secondary text-sm">
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {packages.length === 0 && (
                <div className="bg-white rounded-lg shadow p-12 text-center">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="text-lg font-medium text-gray-900 mb-2">No packages found</p>
                    <p className="text-gray-500 mb-4">Create your first package to get started</p>
                    <button onClick={handleCreatePackage} className="btn-primary">
                        Create Package
                    </button>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <PackageModal
                    package={editingPackage}
                    onClose={() => setShowModal(false)}
                    onSave={() => {
                        setShowModal(false)
                        loadPackages()
                    }}
                />
            )}
        </div>
    )
}

function PackageModal({ package: pkg, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: pkg?.name || '',
        display_name: pkg?.display_name || '',
        description: pkg?.description || '',
        price: pkg?.price || 0,
        currency: pkg?.currency || 'PKR',
        billing_cycle: pkg?.billing_cycle || 'monthly',
        trial_days: pkg?.trial_days || 14,
        is_active: pkg?.is_active ?? true,
        limits: {
            users: pkg?.limits?.users || 5,
            branches: pkg?.limits?.branches || 1,
            warehouses: pkg?.limits?.warehouses || 1,
            monthly_transactions: pkg?.limits?.monthly_transactions || 1000
        },
        modules: pkg?.modules || [
            { name: 'pos', enabled: true, isBase: false },
            { name: 'inventory', enabled: true, isBase: false },
            { name: 'sales', enabled: false, isBase: false },
            { name: 'purchase', enabled: false, isBase: false },
            { name: 'accounting', enabled: false, isBase: false },
            { name: 'hr', enabled: false, isBase: false },
            { name: 'manufacturing', enabled: false, isBase: false },
            { name: 'assets', enabled: false, isBase: false },
            { name: 'activity_logs', enabled: true, isBase: true },
            { name: 'settings', enabled: true, isBase: true }
        ]
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (pkg) {
                await api.put(`/admin/packages/${pkg._id}`, formData)
            } else {
                await api.post('/admin/packages', formData)
            }
            onSave()
        } catch (err) {
            setError(err.response?.data?.error || 'Operation failed')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        })
    }

    const handleLimitChange = (e) => {
        setFormData({
            ...formData,
            limits: {
                ...formData.limits,
                [e.target.name]: parseInt(e.target.value) || 0
            }
        })
    }

    const handleModuleToggle = (moduleName) => {
        setFormData({
            ...formData,
            modules: formData.modules.map(m =>
                m.name === moduleName ? { ...m, enabled: !m.enabled } : m
            )
        })
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">
                            {pkg ? 'Edit Package' : 'Create New Package'}
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

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Package Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    required
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="e.g., Starter"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Display Name *
                                </label>
                                <input
                                    type="text"
                                    name="display_name"
                                    required
                                    value={formData.display_name}
                                    onChange={handleChange}
                                    className="input-field"
                                    placeholder="e.g., Starter Plan"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description *
                            </label>
                            <textarea
                                name="description"
                                required
                                value={formData.description}
                                onChange={handleChange}
                                rows="3"
                                className="input-field"
                            />
                        </div>

                        {/* Pricing */}
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Price *
                                </label>
                                <input
                                    type="number"
                                    name="price"
                                    required
                                    value={formData.price}
                                    onChange={handleChange}
                                    className="input-field"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Billing Cycle *
                                </label>
                                <select
                                    name="billing_cycle"
                                    value={formData.billing_cycle}
                                    onChange={handleChange}
                                    className="input-field"
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Trial Days
                                </label>
                                <input
                                    type="number"
                                    name="trial_days"
                                    value={formData.trial_days}
                                    onChange={handleChange}
                                    className="input-field"
                                />
                            </div>
                        </div>

                        {/* Limits */}
                        <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">Limits</h4>
                            <div className="grid md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Max Users
                                    </label>
                                    <input
                                        type="number"
                                        name="users"
                                        value={formData.limits.users}
                                        onChange={handleLimitChange}
                                        className="input-field"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Max Branches
                                    </label>
                                    <input
                                        type="number"
                                        name="branches"
                                        value={formData.limits.branches}
                                        onChange={handleLimitChange}
                                        className="input-field"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Max Warehouses
                                    </label>
                                    <input
                                        type="number"
                                        name="warehouses"
                                        value={formData.limits.warehouses}
                                        onChange={handleLimitChange}
                                        className="input-field"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Monthly Transactions
                                    </label>
                                    <input
                                        type="number"
                                        name="monthly_transactions"
                                        value={formData.limits.monthly_transactions}
                                        onChange={handleLimitChange}
                                        className="input-field"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Modules */}
                        <div>
                            <h4 className="text-lg font-semibold text-gray-900 mb-3">Enabled Modules</h4>
                            <p className="text-sm text-gray-500 mb-3">Base modules (Activity Logs, Settings) are included in all packages.</p>
                            <div className="grid md:grid-cols-4 gap-3">
                                {formData.modules.map((module) => (
                                    <label
                                        key={module.name}
                                        className={`flex items-center space-x-2 ${module.isBase ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={module.enabled}
                                            onChange={() => !module.isBase && handleModuleToggle(module.name)}
                                            disabled={module.isBase}
                                            className={`h-4 w-4 focus:ring-primary-500 border-gray-300 rounded ${module.isBase ? 'text-green-600' : 'text-primary-600'}`}
                                        />
                                        <span className={`text-sm capitalize ${module.isBase ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
                                            {module.name.replace('_', ' ')}
                                            {module.isBase && <span className="text-xs ml-1">(Base)</span>}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Active Status */}
                        <div>
                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    checked={formData.is_active}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">Active (visible to customers)</span>
                            </label>
                        </div>

                        <div className="flex justify-end space-x-4 pt-4 border-t">
                            <button type="button" onClick={onClose} className="btn-secondary">
                                Cancel
                            </button>
                            <button type="submit" disabled={loading} className="btn-primary">
                                {loading ? 'Saving...' : pkg ? 'Update Package' : 'Create Package'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

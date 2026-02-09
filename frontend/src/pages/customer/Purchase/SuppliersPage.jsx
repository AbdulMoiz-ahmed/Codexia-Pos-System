import { useState, useEffect } from 'react'
import api from '../../../services/api'
import { useToast } from '../../../components/Toast'
import AccountsPayablePage from './AccountsPayablePage'
import PurchaseOrdersPage from './PurchaseOrdersPage'

export default function SuppliersPage() {
    const toast = useToast()
    const [activeTab, setActiveTab] = useState('orders')
    const [suppliers, setSuppliers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState(null)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        payment_terms: 'Net 30'
    })

    const tabs = [
        { id: 'orders', label: 'Purchase Orders', icon: '📦' },
        { id: 'payables', label: 'Accounts Payable', icon: '💸' },
        { id: 'suppliers', label: 'Suppliers', icon: '🏭' }
    ]

    useEffect(() => {
        loadSuppliers()
    }, [])

    const loadSuppliers = async () => {
        try {
            const response = await api.get('/purchase/suppliers')
            setSuppliers(response.data.suppliers || [])
        } catch (error) {
            if (error.response?.status === 403) {
                toast.error('Purchase module not enabled in your plan')
            } else {
                toast.error('Failed to load suppliers')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editingSupplier) {
                await api.put(`/purchase/suppliers/${editingSupplier._id}`, formData)
                toast.success('Supplier updated')
            } else {
                await api.post('/purchase/suppliers', formData)
                toast.success('Supplier created')
            }
            setShowModal(false)
            resetForm()
            loadSuppliers()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this supplier?')) return
        try {
            await api.delete(`/purchase/suppliers/${id}`)
            toast.success('Supplier deleted')
            loadSuppliers()
        } catch (error) {
            toast.error('Failed to delete supplier')
        }
    }

    const handleEdit = (supplier) => {
        setEditingSupplier(supplier)
        setFormData({
            name: supplier.name,
            email: supplier.email || '',
            phone: supplier.phone || '',
            company: supplier.company || '',
            payment_terms: supplier.payment_terms || 'Net 30'
        })
        setShowModal(true)
    }

    const resetForm = () => {
        setFormData({ name: '', email: '', phone: '', company: '', payment_terms: 'Net 30' })
        setEditingSupplier(null)
    }

    if (loading) {
        return <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Purchase Management</h2>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 bg-white rounded-lg p-1 shadow-sm overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-2 whitespace-nowrap ${activeTab === tab.id
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <span className="text-base sm:text-lg">{tab.icon}</span>
                        <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Purchase Orders Tab */}
            {activeTab === 'orders' && (
                <PurchaseOrdersPage />
            )}

            {/* Accounts Payable Tab */}
            {activeTab === 'payables' && (
                <AccountsPayablePage />
            )}

            {/* Suppliers Tab */}
            {activeTab === 'suppliers' && (
                <div>
                    <div className="flex justify-end mb-3 sm:mb-4">
                        <button onClick={() => setShowModal(true)} className="btn-primary text-xs sm:text-sm whitespace-nowrap">
                            + Add Supplier
                        </button>
                    </div>

                    <div className="bg-white rounded-lg shadow overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Email</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Company</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Payment Terms</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {suppliers.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-2 sm:px-6 py-8 text-center text-gray-500 text-xs sm:text-sm">
                                            No suppliers found. Add your first supplier!
                                        </td>
                                    </tr>
                                ) : (
                                    suppliers.map((supplier) => (
                                        <tr key={supplier._id} className="hover:bg-gray-50">
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">{supplier.name}</td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500 hidden sm:table-cell">{supplier.email || '-'}</td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500">{supplier.phone || '-'}</td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500 hidden lg:table-cell">{supplier.company || '-'}</td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500 hidden md:table-cell">{supplier.payment_terms}</td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium">
                                                <button onClick={() => handleEdit(supplier)} className="text-primary-600 hover:text-primary-900 mr-2">
                                                    ✏️
                                                </button>
                                                <button onClick={() => handleDelete(supplier._id)} className="text-red-600 hover:text-red-900">
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                        <h3 className="text-xl sm:text-2xl font-bold mb-4">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Name *</label>
                                    <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Email</label>
                                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-field text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Phone</label>
                                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-field text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Company</label>
                                    <input type="text" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} className="input-field text-sm" />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Payment Terms</label>
                                    <select value={formData.payment_terms} onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })} className="input-field text-sm w-full">
                                        <option value="Net 30">Net 30</option>
                                        <option value="Net 60">Net 60</option>
                                        <option value="COD">COD</option>
                                        <option value="Advance">Advance</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary text-xs sm:text-sm">Cancel</button>
                                <button type="submit" className="btn-primary text-xs sm:text-sm">{editingSupplier ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

import { useState, useEffect } from 'react'
import api from '../../../services/api'
import { useToast } from '../../../components/Toast'
import { Badge } from '../../../components/UIComponents'

export default function CustomersPage() {
    const toast = useToast()
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState(null)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        credit_limit: 0
    })

    useEffect(() => {
        loadCustomers()
    }, [])

    const loadCustomers = async () => {
        try {
            const response = await api.get('/sales/customers')
            setCustomers(response.data.customers || [])
        } catch (error) {
            if (error.response?.status === 403) {
                toast.error('Sales module not enabled in your plan')
            } else {
                toast.error('Failed to load customers')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editingCustomer) {
                await api.put(`/sales/customers/${editingCustomer._id}`, formData)
                toast.success('Customer updated successfully')
            } else {
                await api.post('/sales/customers', formData)
                toast.success('Customer created successfully')
            }
            setShowModal(false)
            resetForm()
            loadCustomers()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this customer?')) return
        try {
            await api.delete(`/sales/customers/${id}`)
            toast.success('Customer deleted')
            loadCustomers()
        } catch (error) {
            toast.error('Failed to delete customer')
        }
    }

    const handleEdit = (customer) => {
        setEditingCustomer(customer)
        setFormData({
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            company: customer.company || '',
            credit_limit: customer.credit_limit || 0
        })
        setShowModal(true)
    }

    const resetForm = () => {
        setFormData({ name: '', email: '', phone: '', company: '', credit_limit: 0 })
        setEditingCustomer(null)
    }

    if (loading) {
        return <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Customers</h2>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    Add Customer
                </button>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Credit Limit</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {customers.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                    No customers found. Add your first customer!
                                </td>
                            </tr>
                        ) : (
                            customers.map((customer) => (
                                <tr key={customer._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{customer.email}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{customer.phone}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{customer.company || '-'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">PKR {customer.credit_limit?.toLocaleString() || 0}</td>
                                    <td className="px-6 py-4 text-sm font-medium">
                                        <button onClick={() => handleEdit(customer)} className="text-primary-600 hover:text-primary-900 mr-3">
                                            Edit
                                        </button>
                                        <button onClick={() => handleDelete(customer._id)} className="text-red-600 hover:text-red-900">
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
                        <h3 className="text-2xl font-bold mb-4">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Company</label>
                                    <input
                                        type="text"
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Credit Limit</label>
                                    <input
                                        type="number"
                                        value={formData.credit_limit}
                                        onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) })}
                                        className="input-field"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingCustomer ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

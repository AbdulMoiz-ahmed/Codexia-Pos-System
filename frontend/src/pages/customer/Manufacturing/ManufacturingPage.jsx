import { useState, useEffect } from 'react'
import { Badge, StatCard, EmptyState } from '../../../components/UIComponents'
import api from '../../../services/api'
import { useToast } from '../../../components/Toast'

export default function ManufacturingPage() {
    const [boms, setBoms] = useState([])
    const [workOrders, setWorkOrders] = useState([])
    const [activeTab, setActiveTab] = useState('orders')
    const [showModal, setShowModal] = useState(false)
    const [loading, setLoading] = useState(true)
    const toast = useToast()

    useEffect(() => {
        loadData()
    }, [activeTab])

    const loadData = async () => {
        setLoading(true)
        try {
            if (activeTab === 'bom') {
                const res = await api.get('/manufacturing/bom')
                setBoms(res.data)
            } else {
                const res = await api.get('/manufacturing/work-orders')
                setWorkOrders(res.data)
            }
        } catch (error) {
            console.error('Error loading data:', error)
            toast.error('Failed to load manufacturing data')
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (data) => {
        try {
            if (activeTab === 'bom') {
                await api.post('/manufacturing/bom', data)
            } else {
                await api.post('/manufacturing/work-orders', data)
            }
            toast.success('Created successfully')
            setShowModal(false)
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Manufacturing</h1>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    {activeTab === 'bom' ? 'New BOM' : 'New Work Order'}
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`${activeTab === 'orders' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Work Orders
                    </button>
                    <button
                        onClick={() => setActiveTab('bom')}
                        className={`${activeTab === 'bom' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        Bill of Materials
                    </button>
                </nav>
            </div>

            {loading ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-12 bg-white rounded shadow"></div>
                </div>
            ) : (
                <>
                    {activeTab === 'bom' && (
                        <div className="bg-white shadow overflow-hidden sm:rounded-md">
                            <ul className="divide-y divide-gray-200">
                                {boms.length === 0 ? <EmptyState message="No BOMs found" /> : boms.map(bom => (
                                    <li key={bom._id} className="px-6 py-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{bom.product_name}</p>
                                                <p className="text-sm text-gray-500">Yield: {bom.quantity}</p>
                                            </div>
                                            <Badge variant="success">Active</Badge>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {activeTab === 'orders' && (
                        <div className="bg-white shadow overflow-hidden sm:rounded-md">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {workOrders.length === 0 ? (
                                        <tr><td colSpan="4"><EmptyState message="No work orders" /></td></tr>
                                    ) : workOrders.map(order => (
                                        <tr key={order._id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {order.product_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {order.quantity}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant={order.status === 'completed' ? 'success' : order.status === 'pending' ? 'warning' : 'default'}>
                                                    {order.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {order.due_date ? new Date(order.due_date).toLocaleDateString() : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" onClick={() => setShowModal(false)}>
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">
                                    {activeTab === 'bom' ? 'New BOM' : 'New Work Order'}
                                </h3>
                                <CreateForm type={activeTab} onSubmit={handleCreate} onCancel={() => setShowModal(false)} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function CreateForm({ type, onSubmit, onCancel }) {
    const [formData, setFormData] = useState(type === 'bom' ? {
        product_name: '', quantity: 1, components: []
    } : {
        bom_id: '', quantity: 1, due_date: ''
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        // Mock data for missing fields
        if (type === 'bom') {
            formData.product_id = 'mock_id'
            formData.components = [] // Simplified
        }
        onSubmit(formData)
    }

    if (type === 'bom') {
        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                <input required placeholder="Product Name" className="input-field" value={formData.product_name} onChange={e => setFormData({ ...formData, product_name: e.target.value })} />
                <input type="number" required placeholder="Yield Quantity" className="input-field" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })} />
                <div className="p-2 bg-yellow-50 text-xs text-yellow-800 rounded">
                    Components selection is simplified for this demo.
                </div>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">Create</button>
                </div>
            </form>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Ideally select BOM from dropdown */}
            <input required placeholder="BOM ID (Copy from BOM list)" className="input-field" value={formData.bom_id} onChange={e => setFormData({ ...formData, bom_id: e.target.value })} />
            <input type="number" required placeholder="Quantity" className="input-field" value={formData.quantity} onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) })} />
            <input type="date" className="input-field" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} />
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
            </div>
        </form>
    )
}

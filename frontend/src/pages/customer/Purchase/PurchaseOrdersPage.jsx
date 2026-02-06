import { useState, useEffect } from 'react'
import api from '../../../services/api'
import { useToast } from '../../../components/Toast'

export default function PurchaseOrdersPage() {
    const toast = useToast()
    const [purchaseOrders, setPurchaseOrders] = useState([])
    const [suppliers, setSuppliers] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [selectedSupplier, setSelectedSupplier] = useState(null)
    const [orderItems, setOrderItems] = useState([])
    const [paymentType, setPaymentType] = useState('credit')
    const [dueDate, setDueDate] = useState('')
    const [submitting, setSubmitting] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [poRes, suppliersRes, productsRes] = await Promise.all([
                api.get('/purchase/purchase-orders'),
                api.get('/purchase/suppliers'),
                api.get('/customer/products')
            ])
            setPurchaseOrders(poRes.data.purchase_orders || [])
            setSuppliers(suppliersRes.data.suppliers || [])
            setProducts(productsRes.data.products || [])
        } catch (error) {
            toast.error('Failed to load data')
        } finally {
            setLoading(false)
        }
    }

    const addProductToOrder = (product) => {
        const existing = orderItems.find(item => item.product_id === product._id)
        if (existing) {
            setOrderItems(orderItems.map(item =>
                item.product_id === product._id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ))
        } else {
            setOrderItems([...orderItems, {
                product_id: product._id,
                name: product.name,
                sku: product.sku,
                quantity: 1,
                unit_price: product.cost || product.price || 0
            }])
        }
    }

    const updateItemQuantity = (productId, quantity) => {
        if (quantity <= 0) {
            setOrderItems(orderItems.filter(item => item.product_id !== productId))
        } else {
            setOrderItems(orderItems.map(item =>
                item.product_id === productId ? { ...item, quantity } : item
            ))
        }
    }

    const updateItemPrice = (productId, price) => {
        setOrderItems(orderItems.map(item =>
            item.product_id === productId ? { ...item, unit_price: parseFloat(price) || 0 } : item
        ))
    }

    const getSubtotal = () => orderItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)

    const resetForm = () => {
        setSelectedSupplier(null)
        setOrderItems([])
        setPaymentType('credit')
        setDueDate('')
    }

    const handleSubmit = async () => {
        if (!selectedSupplier) {
            toast.warning('Please select a supplier')
            return
        }
        if (orderItems.length === 0) {
            toast.warning('Please add at least one product')
            return
        }

        setSubmitting(true)
        try {
            await api.post('/purchase/purchase-orders', {
                supplier_id: selectedSupplier._id,
                supplier_name: selectedSupplier.name,
                items: orderItems,
                subtotal: getSubtotal(),
                tax: 0,
                total: getSubtotal(),
                payment_type: paymentType,
                due_date: dueDate || null
            })
            toast.success('Purchase order created successfully!')
            setShowModal(false)
            resetForm()
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create PO')
        } finally {
            setSubmitting(false)
        }
    }

    const handleReceive = async (po) => {
        if (po.status === 'received') {
            toast.warning('This PO has already been received')
            return
        }
        try {
            await api.post(`/purchase/purchase-orders/${po._id}/receive`, {})
            toast.success('PO received! Stock has been updated.')
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to receive PO')
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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Purchase Orders</h2>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    + Create Purchase Order
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
                    <p className="text-sm text-gray-500">Total POs</p>
                    <p className="text-2xl font-bold text-blue-600">{purchaseOrders.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-yellow-500">
                    <p className="text-sm text-gray-500">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                        {purchaseOrders.filter(po => po.status === 'pending').length}
                    </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
                    <p className="text-sm text-gray-500">Received</p>
                    <p className="text-2xl font-bold text-green-600">
                        {purchaseOrders.filter(po => po.status === 'received').length}
                    </p>
                </div>
            </div>

            {/* PO List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO #</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {purchaseOrders.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                    <span className="text-4xl block mb-2">📦</span>
                                    No purchase orders yet. Create your first PO!
                                </td>
                            </tr>
                        ) : (
                            purchaseOrders.map(po => (
                                <tr key={po._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-mono font-medium text-primary-600">{po.po_number}</td>
                                    <td className="px-6 py-4 font-medium">{po.supplier_name}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{po.items?.length || 0} items</td>
                                    <td className="px-6 py-4 font-bold">PKR {po.total?.toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${po.status === 'received'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {po.status === 'received' ? '✓ Received' : '⏳ Pending'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${po.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                                                po.payment_status === 'partial' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {po.payment_status === 'paid' ? 'Paid' :
                                                po.payment_status === 'partial' ? 'Partial' : 'Unpaid'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {new Date(po.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        {po.status !== 'received' && (
                                            <button
                                                onClick={() => handleReceive(po)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                                            >
                                                📦 Receive
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create PO Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b">
                            <h3 className="text-2xl font-bold text-gray-900">Create Purchase Order</h3>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            <div className="grid lg:grid-cols-2 gap-6">
                                {/* Left: Supplier & Products */}
                                <div className="space-y-4">
                                    {/* Supplier Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Select Supplier *</label>
                                        <select
                                            value={selectedSupplier?._id || ''}
                                            onChange={(e) => setSelectedSupplier(suppliers.find(s => s._id === e.target.value))}
                                            className="input-field"
                                        >
                                            <option value="">-- Select Supplier --</option>
                                            {suppliers.map(s => (
                                                <option key={s._id} value={s._id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Payment Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['cash', 'credit'].map(type => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setPaymentType(type)}
                                                    className={`py-2 px-4 rounded-lg border-2 font-medium capitalize ${paymentType === type
                                                            ? type === 'credit'
                                                                ? 'border-orange-500 bg-orange-50 text-orange-700'
                                                                : 'border-green-500 bg-green-50 text-green-700'
                                                            : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    {type === 'cash' ? '💵 Cash' : '📝 Credit'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {paymentType === 'credit' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                                            <input
                                                type="date"
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                                className="input-field"
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                    )}

                                    {/* Products */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Add Products</label>
                                        <div className="border rounded-lg max-h-48 overflow-auto">
                                            {products.map(product => (
                                                <div
                                                    key={product._id}
                                                    onClick={() => addProductToOrder(product)}
                                                    className="flex justify-between items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                                                >
                                                    <div>
                                                        <p className="font-medium">{product.name}</p>
                                                        <p className="text-xs text-gray-500">{product.sku}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-medium">PKR {(product.cost || product.price || 0).toLocaleString()}</p>
                                                        <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Order Items */}
                                <div className="space-y-4">
                                    <label className="block text-sm font-medium text-gray-700">Order Items</label>

                                    {orderItems.length === 0 ? (
                                        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                                            Click products to add them to the order
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {orderItems.map(item => (
                                                <div key={item.product_id} className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                                                    <div className="flex-1">
                                                        <p className="font-medium">{item.name}</p>
                                                        <p className="text-xs text-gray-500">{item.sku}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItemQuantity(item.product_id, parseInt(e.target.value) || 0)}
                                                            className="w-16 text-center border rounded px-2 py-1"
                                                            min="1"
                                                        />
                                                        <span className="text-gray-400">×</span>
                                                        <input
                                                            type="number"
                                                            value={item.unit_price}
                                                            onChange={(e) => updateItemPrice(item.product_id, e.target.value)}
                                                            className="w-24 text-right border rounded px-2 py-1"
                                                        />
                                                    </div>
                                                    <p className="w-24 text-right font-bold">
                                                        PKR {(item.quantity * item.unit_price).toLocaleString()}
                                                    </p>
                                                    <button
                                                        onClick={() => updateItemQuantity(item.product_id, 0)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Total */}
                                    <div className="bg-primary-50 rounded-lg p-4 flex justify-between items-center">
                                        <span className="text-lg font-medium text-primary-700">Total</span>
                                        <span className="text-2xl font-bold text-primary-700">
                                            PKR {getSubtotal().toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => { setShowModal(false); resetForm(); }}
                                className="btn-secondary"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="btn-primary"
                                disabled={submitting}
                            >
                                {submitting ? 'Creating...' : 'Create Purchase Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

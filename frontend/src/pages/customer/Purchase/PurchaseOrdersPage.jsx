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
    const [lowStockItems, setLowStockItems] = useState([])

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
            const allProducts = productsRes.data.products || []
            setProducts(allProducts)
            
            const lowStock = allProducts.filter(product => {
                const reorderLevel = product.reorder_level || 10
                return product.stock <= reorderLevel
            })
            setLowStockItems(lowStock)
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
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Purchase Orders</h2>
                    <p className="text-gray-500 mt-1 text-sm sm:text-base">Manage purchase orders and inventory restocking</p>
                </div>
                <button onClick={() => setShowModal(true)} className="btn-primary whitespace-nowrap">
                    + Create PO
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                <StatCard title="Total POs" value={purchaseOrders.length} color="blue" />
                <StatCard title="Pending" value={purchaseOrders.filter(po => po.status === 'pending').length} color="yellow" />
                <StatCard title="Received" value={purchaseOrders.filter(po => po.status === 'received').length} color="green" />
                <StatCard title="Low Stock" value={lowStockItems.length} color="red" />
            </div>

            {/* Low Stock Alerts */}
            {lowStockItems.length > 0 && (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-red-50">
                        <div className="flex items-start sm:items-center gap-2 text-red-800">
                            <svg className="w-4 sm:w-5 h-4 sm:h-5 flex-shrink-0 mt-0.5 sm:mt-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <h3 className="font-bold text-sm sm:text-base">
                                Low Stock Alert <span className="block sm:inline sm:ml-1">({lowStockItems.length} items)</span>
                            </h3>
                        </div>
                    </div>
                    <div className="p-4 sm:p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {lowStockItems.map(item => (
                                <div key={item._id} className="bg-orange-50 border border-orange-200 rounded-lg p-3 sm:p-4">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-900 truncate text-sm sm:text-base">{item.name}</h4>
                                            <p className="text-xs text-gray-500 font-mono truncate">{item.sku || 'N/A'}</p>
                                        </div>
                                        <span className="bg-red-100 text-red-700 px-2 py-0.5 text-xs rounded-full font-semibold flex-shrink-0">
                                            LOW
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-xs sm:text-sm mb-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Stock:</span>
                                            <span className="font-bold text-red-600">{item.stock} units</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Reorder:</span>
                                            <span className="font-semibold">{item.reorder_level || 10} units</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Need:</span>
                                            <span className="font-bold text-orange-600">
                                                {Math.max(0, (item.reorder_level || 10) - item.stock)} units
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            addProductToOrder(item)
                                            setShowModal(true)
                                        }}
                                        className="w-full bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-medium py-2 rounded-lg transition-colors"
                                    >
                                        Create PO
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* PO List */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO #</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Supplier</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Items</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Payment</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Date</th>
                            <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {purchaseOrders.length === 0 ? (
                            <tr>
                                <td colSpan="8" className="px-3 sm:px-6 py-8 sm:py-12 text-center text-gray-500">
                                    <span className="text-2xl sm:text-4xl block mb-2">📦</span>
                                    <p className="text-sm sm:text-base">No purchase orders yet.</p>
                                    <p className="text-xs sm:text-sm">Create your first PO!</p>
                                </td>
                            </tr>
                        ) : (
                            purchaseOrders.map(po => (
                                <tr key={po._id} className="hover:bg-gray-50">
                                    <td className="px-3 sm:px-6 py-4 font-mono font-medium text-primary-600 text-xs sm:text-base">{po.po_number}</td>
                                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-500 hidden sm:table-cell text-sm">{po.supplier_name}</td>
                                    <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">{po.items?.length || 0}</td>
                                    <td className="px-3 sm:px-6 py-4 font-bold text-gray-500 text-xs sm:text-sm">PKR {po.total?.toLocaleString()}</td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                            po.status === 'received'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {po.status === 'received' ? '✓' : '⏳'}
                                        </span>
                                    </td>
                                    <td className="px-3 sm:px-6 py-4 hidden sm:table-cell">
                                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                            po.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                                            po.payment_status === 'partial' ? 'bg-orange-100 text-orange-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {po.payment_status === 'paid' ? 'Paid' :
                                                po.payment_status === 'partial' ? 'Partial' : 'Unpaid'}
                                        </span>
                                    </td>
                                    <td className="px-3 sm:px-6 py-4 text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                                        {new Date(po.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-3 sm:px-6 py-4">
                                        {po.status !== 'received' && (
                                            <button
                                                onClick={() => handleReceive(po)}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap"
                                            >
                                                Receive
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl w-full max-w-2xl sm:max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
                        <div className="p-4 sm:p-6 border-b">
                            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Create Purchase Order</h3>
                        </div>

                        <div className="flex-1 overflow-auto p-4 sm:p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                                {/* Left: Supplier & Products */}
                                <div className="space-y-3 sm:space-y-4">
                                    {/* Supplier Selection */}
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Select Supplier *</label>
                                        <select
                                            value={selectedSupplier?._id || ''}
                                            onChange={(e) => setSelectedSupplier(suppliers.find(s => s._id === e.target.value))}
                                            className="input-field text-sm"
                                        >
                                            <option value="">-- Select Supplier --</option>
                                            {suppliers.map(s => (
                                                <option key={s._id} value={s._id}>{s.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Payment Type */}
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Payment Type</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {['cash', 'credit'].map(type => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setPaymentType(type)}
                                                    className={`py-2 px-2 sm:px-4 rounded-lg border-2 font-medium capitalize text-xs sm:text-sm ${
                                                        paymentType === type
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
                                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Due Date</label>
                                            <input
                                                type="date"
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                                className="input-field text-sm"
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                    )}

                                    {/* Products */}
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Add Products</label>
                                        <div className="border rounded-lg max-h-40 sm:max-h-64 overflow-auto">
                                            {products.map(product => (
                                                <div
                                                    key={product._id}
                                                    onClick={() => addProductToOrder(product)}
                                                    className="flex justify-between items-center p-2 sm:p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 text-xs sm:text-sm"
                                                >
                                                    <div className="min-w-0">
                                                        <p className="font-medium truncate">{product.name}</p>
                                                        <p className="text-xs text-gray-500 truncate">{product.sku}</p>
                                                    </div>
                                                    <div className="text-right flex-shrink-0 ml-2">
                                                        <p className="font-medium truncate">PKR {(product.cost || product.price || 0).toLocaleString()}</p>
                                                        <p className="text-xs text-gray-500">S: {product.stock}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Order Items */}
                                <div className="space-y-3 sm:space-y-4">
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700">Order Items</label>

                                    {orderItems.length === 0 ? (
                                        <div className="bg-gray-50 rounded-lg p-6 sm:p-8 text-center text-gray-500 text-xs sm:text-base">
                                            Click products to add them to the order
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-40 sm:max-h-56 overflow-auto">
                                            {orderItems.map(item => (
                                                <div key={item.product_id} className="bg-gray-50 rounded-lg p-2 sm:p-3 flex flex-col sm:flex-row sm:items-center gap-2 text-xs sm:text-sm">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{item.name}</p>
                                                        <p className="text-xs text-gray-500 truncate">{item.sku}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={(e) => updateItemQuantity(item.product_id, parseInt(e.target.value) || 0)}
                                                            className="w-12 sm:w-16 text-center border rounded px-1 sm:px-2 py-1 text-xs"
                                                            min="1"
                                                        />
                                                        <span className="text-gray-400">×</span>
                                                        <input
                                                            type="number"
                                                            value={item.unit_price}
                                                            onChange={(e) => updateItemPrice(item.product_id, e.target.value)}
                                                            className="w-14 sm:w-24 text-right border rounded px-1 sm:px-2 py-1 text-xs"
                                                        />
                                                    </div>
                                                    <p className="text-right font-bold flex-shrink-0">
                                                        {(item.quantity * item.unit_price).toLocaleString()}
                                                    </p>
                                                    <button
                                                        onClick={() => updateItemQuantity(item.product_id, 0)}
                                                        className="text-red-500 hover:text-red-700 flex-shrink-0"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Total */}
                                    <div className="bg-primary-50 rounded-lg p-3 sm:p-4 flex justify-between items-center">
                                        <span className="text-sm sm:text-lg font-medium text-primary-700">Total</span>
                                        <span className="text-lg sm:text-2xl font-bold text-primary-700">
                                            PKR {getSubtotal().toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-3 sm:p-6 border-t bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
                            <button
                                onClick={() => { setShowModal(false); resetForm(); }}
                                className="btn-secondary text-sm sm:text-base"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="btn-primary text-sm sm:text-base"
                                disabled={submitting}
                            >
                                {submitting ? 'Creating...' : 'Create PO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function StatCard({ title, value, color }) {
    const colors = {
        blue: 'from-blue-500 to-blue-600',
        yellow: 'from-yellow-500 to-yellow-600',
        green: 'from-green-500 to-green-600',
        red: 'from-red-500 to-red-600'
    }

    return (
        <div className={`bg-gradient-to-br ${colors[color]} rounded-lg p-3 sm:p-4 lg:p-5 text-white shadow`}>
            <p className="text-xs sm:text-sm opacity-90">{title}</p>
            <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
        </div>
    )
}
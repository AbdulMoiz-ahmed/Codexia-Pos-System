import { useState, useEffect } from 'react'
import { useToast } from '../../components/Toast'
import api from '../../services/api'

export default function POSSystem() {
    const toast = useToast()
    const [products, setProducts] = useState([])
    const [customers, setCustomers] = useState([])
    const [cart, setCart] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)

    // Payment & Checkout State
    const [showCheckoutModal, setShowCheckoutModal] = useState(false)
    const [showReceiptModal, setShowReceiptModal] = useState(false)
    const [lastReceipt, setLastReceipt] = useState(null)
    const [checkoutData, setCheckoutData] = useState({
        customer_id: '',
        customer_name: 'Walk-in Customer',
        payment_type: 'cash',  // cash or credit
        payment_method: 'cash',
        discount_type: 'fixed',
        discount: 0,
        tax_rate: 0,
        amount_paid: 0,
        due_date: '',
        notes: ''
    })
    const [selectedCustomer, setSelectedCustomer] = useState(null)

    useEffect(() => {
        loadProducts()
        loadCustomers()
    }, [])

    const loadProducts = async () => {
        try {
            const res = await api.get('/inventory/products')
            setProducts(res.data || [])
        } catch (error) {
            toast.error('Failed to load products')
        } finally {
            setLoading(false)
        }
    }

    const loadCustomers = async () => {
        try {
            const res = await api.get('/pos/customers')
            setCustomers(res.data.customers || [])
        } catch (error) {
            console.log('No customers module or empty')
        }
    }

    const addToCart = (product) => {
        if (product.stock <= 0) {
            toast.warning('Product is out of stock')
            return
        }

        const existing = cart.find(item => item._id === product._id)
        if (existing) {
            if (existing.quantity >= product.stock) {
                toast.warning('Cannot add more than available stock')
                return
            }
            setCart(cart.map(item =>
                item._id === product._id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ))
        } else {
            setCart([...cart, { ...product, quantity: 1 }])
        }
        toast.success(`${product.name} added to cart`)
    }

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item._id !== productId))
    }

    const updateQuantity = (productId, quantity) => {
        if (quantity <= 0) {
            removeFromCart(productId)
        } else {
            const product = cart.find(item => item._id === productId)
            const originalProduct = products.find(p => p._id === productId)
            if (quantity > originalProduct?.stock) {
                toast.warning('Cannot exceed available stock')
                return
            }
            setCart(cart.map(item =>
                item._id === productId ? { ...item, quantity } : item
            ))
        }
    }

    const getSubtotal = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
    }

    const getDiscountAmount = () => {
        const subtotal = getSubtotal()
        if (checkoutData.discount_type === 'percentage') {
            return (subtotal * checkoutData.discount) / 100
        }
        return checkoutData.discount
    }

    const getTaxAmount = () => {
        const subtotal = getSubtotal()
        const discount = getDiscountAmount()
        return ((subtotal - discount) * checkoutData.tax_rate) / 100
    }

    const getTotal = () => {
        return getSubtotal() - getDiscountAmount() + getTaxAmount()
    }

    const getChange = () => {
        return Math.max(0, checkoutData.amount_paid - getTotal())
    }

    const openCheckout = () => {
        if (cart.length === 0) {
            toast.warning('Cart is empty')
            return
        }
        setCheckoutData(prev => ({
            ...prev,
            amount_paid: getTotal()
        }))
        setShowCheckoutModal(true)
    }

    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast.warning('Cart is empty')
            return
        }

        // Cash sale validation
        if (checkoutData.payment_type === 'cash' && checkoutData.amount_paid < getTotal()) {
            toast.warning('Amount paid is less than total')
            return
        }

        // Credit sale requires customer
        if (checkoutData.payment_type === 'credit' && !checkoutData.customer_id) {
            toast.warning('Customer is required for credit sales')
            return
        }

        try {
            const payload = {
                items: cart.map(item => ({
                    id: item._id,
                    quantity: item.quantity,
                    name: item.name,
                    price: item.price
                })),
                ...checkoutData
            }

            const res = await api.post('/pos/sales', payload)

            setLastReceipt({
                ...res.data.receipt,
                items: cart,
                customer_name: checkoutData.customer_name,
                payment_method: checkoutData.payment_method,
                date: new Date().toLocaleString()
            })

            toast.success('Sale completed successfully!')
            setCart([])
            setShowCheckoutModal(false)
            setShowReceiptModal(true)

            // Reset checkout data
            setCheckoutData({
                customer_id: '',
                customer_name: 'Walk-in Customer',
                payment_type: 'cash',
                payment_method: 'cash',
                discount_type: 'fixed',
                discount: 0,
                tax_rate: 0,
                amount_paid: 0,
                due_date: '',
                notes: ''
            })
            setSelectedCustomer(null)

            loadProducts()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Checkout failed')
        }
    }

    const handleCustomerChange = (customerId) => {
        if (customerId) {
            const customer = customers.find(c => c._id === customerId)
            setSelectedCustomer(customer)
            setCheckoutData(prev => ({
                ...prev,
                customer_id: customerId,
                customer_name: customer?.name || 'Walk-in Customer'
            }))
        } else {
            setSelectedCustomer(null)
            setCheckoutData(prev => ({
                ...prev,
                customer_id: '',
                customer_name: 'Walk-in Customer'
            }))
        }
    }

    const filteredProducts = products.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode?.includes(searchTerm) ||
        p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="grid lg:grid-cols-3 gap-6">
            {/* Products Section */}
            <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Products</h2>

                    {/* Search */}
                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Search by name, SKU or barcode..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-field"
                        />
                    </div>

                    {/* Products Grid */}
                    <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                        {filteredProducts.map(product => (
                            <div
                                key={product._id}
                                className={`border rounded-lg p-4 transition-all cursor-pointer ${product.stock > 0
                                    ? 'hover:shadow-md hover:border-primary-300'
                                    : 'opacity-50 cursor-not-allowed'
                                    }`}
                                onClick={() => addToCart(product)}
                            >
                                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                                    {product.image ? (
                                        <img
                                            src={`http://localhost:5000${product.image}`}
                                            alt={product.name}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.style.display = 'none';
                                                e.target.nextSibling.style.display = 'block';
                                            }}
                                        />
                                    ) : null}
                                    <svg className={`w-12 h-12 text-gray-400 ${product.image ? 'hidden' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                                <p className="text-xs text-gray-500">{product.sku}</p>
                                <div className="flex justify-between items-center mt-2">
                                    <span className={`text-sm ${product.stock <= 5 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                                        Stock: {product.stock}
                                    </span>
                                    <span className="text-lg font-bold text-primary-600">
                                        PKR {product.price?.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Cart Section */}
            <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-6 sticky top-4">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Cart</h2>

                    {cart.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <svg className="w-16 h-16 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p>Cart is empty</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                                {cart.map(item => (
                                    <div key={item._id} className="flex items-center justify-between border-b pb-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 truncate">{item.name}</p>
                                            <p className="text-sm text-gray-500">PKR {item.price?.toLocaleString()} × {item.quantity}</p>
                                        </div>
                                        <div className="flex items-center gap-2 ml-2">
                                            <button
                                                onClick={() => updateQuantity(item._id, item.quantity - 1)}
                                                className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                            >
                                                -
                                            </button>
                                            <span className="w-8 text-center font-medium">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item._id, item.quantity + 1)}
                                                className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center"
                                            >
                                                +
                                            </button>
                                            <button
                                                onClick={() => removeFromCart(item._id)}
                                                className="ml-1 text-red-600 hover:text-red-800"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t pt-4 mb-4 space-y-2">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal:</span>
                                    <span>PKR {getSubtotal().toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold">
                                    <span>Total:</span>
                                    <span className="text-primary-600">PKR {getSubtotal().toLocaleString()}</span>
                                </div>
                            </div>

                            <button
                                onClick={openCheckout}
                                className="w-full btn-primary text-lg py-3"
                            >
                                Proceed to Checkout
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Checkout Modal */}
            {showCheckoutModal && (
                <CheckoutModal
                    cart={cart}
                    customers={customers}
                    selectedCustomer={selectedCustomer}
                    checkoutData={checkoutData}
                    setCheckoutData={setCheckoutData}
                    onCustomerChange={handleCustomerChange}
                    getSubtotal={getSubtotal}
                    getDiscountAmount={getDiscountAmount}
                    getTaxAmount={getTaxAmount}
                    getTotal={getTotal}
                    getChange={getChange}
                    onClose={() => setShowCheckoutModal(false)}
                    onConfirm={handleCheckout}
                />
            )}

            {/* Receipt Modal */}
            {showReceiptModal && lastReceipt && (
                <ReceiptModal
                    receipt={lastReceipt}
                    onClose={() => setShowReceiptModal(false)}
                />
            )}
        </div>
    )
}

function CheckoutModal({
    cart, customers, selectedCustomer, checkoutData, setCheckoutData, onCustomerChange,
    getSubtotal, getDiscountAmount, getTaxAmount, getTotal, getChange,
    onClose, onConfirm
}) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">Checkout</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Left Column - Options */}
                        <div className="space-y-4">
                            {/* Customer Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
                                <select
                                    value={checkoutData.customer_id}
                                    onChange={(e) => onCustomerChange(e.target.value)}
                                    className="input-field"
                                >
                                    <option value="">Walk-in Customer</option>
                                    {customers.map(c => (
                                        <option key={c._id} value={c._id}>{c.name} - {c.phone}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Customer Credit Info */}
                            {selectedCustomer && (
                                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-blue-700">Credit Limit:</span>
                                        <span className="font-medium">PKR {(selectedCustomer.credit_limit || 0).toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-blue-700">Current Balance:</span>
                                        <span className={`font-medium ${selectedCustomer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            PKR {(selectedCustomer.balance || 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {/* Payment Type (Cash vs Credit) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['cash', 'credit'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => setCheckoutData(prev => ({
                                                ...prev,
                                                payment_type: type,
                                                amount_paid: type === 'cash' ? getTotal() : 0
                                            }))}
                                            className={`py-3 px-4 rounded-lg border-2 font-medium capitalize transition-all ${checkoutData.payment_type === type
                                                ? type === 'credit'
                                                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                                                    : 'border-green-500 bg-green-50 text-green-700'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            {type === 'cash' ? '💵 Cash Sale' : '📝 Credit Sale'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Method (only for cash) */}
                            {checkoutData.payment_type === 'cash' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['cash', 'card', 'transfer'].map(method => (
                                            <button
                                                key={method}
                                                onClick={() => setCheckoutData(prev => ({ ...prev, payment_method: method }))}
                                                className={`py-2 px-4 rounded-lg border-2 font-medium capitalize transition-all ${checkoutData.payment_method === method
                                                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                {method}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Due Date (only for credit) */}
                            {checkoutData.payment_type === 'credit' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                                    <input
                                        type="date"
                                        value={checkoutData.due_date}
                                        onChange={(e) => setCheckoutData(prev => ({ ...prev, due_date: e.target.value }))}
                                        className="input-field"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Leave empty for default 30 days</p>
                                </div>
                            )}

                            {/* Discount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Discount</label>
                                <div className="flex gap-2">
                                    <select
                                        value={checkoutData.discount_type}
                                        onChange={(e) => setCheckoutData(prev => ({ ...prev, discount_type: e.target.value }))}
                                        className="input-field w-32"
                                    >
                                        <option value="fixed">Fixed (PKR)</option>
                                        <option value="percentage">Percent (%)</option>
                                    </select>
                                    <input
                                        type="number"
                                        min="0"
                                        value={checkoutData.discount}
                                        onChange={(e) => setCheckoutData(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
                                        className="input-field flex-1"
                                        placeholder="0"
                                    />
                                </div>
                            </div>

                            {/* Tax Rate */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={checkoutData.tax_rate}
                                    onChange={(e) => setCheckoutData(prev => ({ ...prev, tax_rate: parseFloat(e.target.value) || 0 }))}
                                    className="input-field"
                                    placeholder="0"
                                />
                            </div>

                            {/* Amount Paid (for cash) */}
                            {checkoutData.payment_type === 'cash' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={checkoutData.amount_paid}
                                        onChange={(e) => setCheckoutData(prev => ({ ...prev, amount_paid: parseFloat(e.target.value) || 0 }))}
                                        className="input-field text-lg font-bold"
                                    />
                                </div>
                            )}

                            {/* Notes */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                                <textarea
                                    value={checkoutData.notes}
                                    onChange={(e) => setCheckoutData(prev => ({ ...prev, notes: e.target.value }))}
                                    className="input-field"
                                    rows="2"
                                    placeholder="Optional notes..."
                                />
                            </div>
                        </div>

                        {/* Right Column - Summary */}
                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="font-bold text-gray-900 mb-4">Order Summary</h4>

                            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                                {cart.map(item => (
                                    <div key={item._id} className="flex justify-between text-sm">
                                        <span>{item.name} × {item.quantity}</span>
                                        <span>PKR {(item.price * item.quantity).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal:</span>
                                    <span>PKR {getSubtotal().toLocaleString()}</span>
                                </div>
                                {getDiscountAmount() > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>Discount:</span>
                                        <span>- PKR {getDiscountAmount().toLocaleString()}</span>
                                    </div>
                                )}
                                {getTaxAmount() > 0 && (
                                    <div className="flex justify-between text-gray-600">
                                        <span>Tax ({checkoutData.tax_rate}%):</span>
                                        <span>PKR {getTaxAmount().toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                                    <span>Total:</span>
                                    <span className="text-primary-600">PKR {getTotal().toLocaleString()}</span>
                                </div>
                                {checkoutData.payment_type === 'cash' && getChange() > 0 && (
                                    <div className="flex justify-between text-lg font-semibold text-green-600 bg-green-50 p-2 rounded">
                                        <span>Change:</span>
                                        <span>PKR {getChange().toLocaleString()}</span>
                                    </div>
                                )}
                                {checkoutData.payment_type === 'credit' && (
                                    <div className="bg-orange-50 p-3 rounded-lg mt-2">
                                        <div className="flex justify-between text-orange-700 font-medium">
                                            <span>Amount Due:</span>
                                            <span>PKR {getTotal().toLocaleString()}</span>
                                        </div>
                                        <p className="text-xs text-orange-600 mt-1">Customer will be billed for this amount</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button onClick={onClose} className="btn-secondary">Cancel</button>
                        <button
                            onClick={onConfirm}
                            className={`px-8 ${checkoutData.payment_type === 'credit' ? 'bg-orange-600 hover:bg-orange-700 text-white font-medium py-2 rounded-lg' : 'btn-primary'}`}
                        >
                            {checkoutData.payment_type === 'credit' ? 'Create Credit Sale' : 'Complete Sale'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ReceiptModal({ receipt, onClose }) {
    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4">
                <div className="p-6" id="receipt-content">
                    <div className="text-center mb-6">
                        <h3 className="text-2xl font-bold text-gray-900">Receipt</h3>
                        <p className="text-gray-500">{receipt.receipt_number}</p>
                        <p className="text-sm text-gray-400">{receipt.date}</p>
                    </div>

                    <div className="border-t border-b border-dashed py-4 mb-4">
                        <p className="text-center font-medium">{receipt.customer_name}</p>
                    </div>

                    <div className="space-y-2 mb-4">
                        {receipt.items.map(item => (
                            <div key={item._id} className="flex justify-between text-sm">
                                <span>{item.name} × {item.quantity}</span>
                                <span>PKR {(item.price * item.quantity).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-dashed pt-4 space-y-2">
                        <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>PKR {receipt.subtotal?.toLocaleString()}</span>
                        </div>
                        {receipt.discount > 0 && (
                            <div className="flex justify-between text-green-600">
                                <span>Discount:</span>
                                <span>- PKR {receipt.discount?.toLocaleString()}</span>
                            </div>
                        )}
                        {receipt.tax > 0 && (
                            <div className="flex justify-between">
                                <span>Tax:</span>
                                <span>PKR {receipt.tax?.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between text-xl font-bold pt-2 border-t">
                            <span>Total:</span>
                            <span>PKR {receipt.total?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Paid ({receipt.payment_method}):</span>
                            <span>PKR {receipt.amount_paid?.toLocaleString()}</span>
                        </div>
                        {receipt.change_due > 0 && (
                            <div className="flex justify-between font-semibold text-green-600">
                                <span>Change:</span>
                                <span>PKR {receipt.change_due?.toLocaleString()}</span>
                            </div>
                        )}
                    </div>

                    <div className="text-center mt-6 pt-4 border-t border-dashed">
                        <p className="text-gray-500 text-sm">Thank you for your purchase!</p>
                    </div>
                </div>

                <div className="flex gap-3 p-4 border-t bg-gray-50 rounded-b-xl">
                    <button onClick={handlePrint} className="btn-secondary flex-1">
                        Print Receipt
                    </button>
                    <button onClick={onClose} className="btn-primary flex-1">
                        Done
                    </button>
                </div>
            </div>
        </div>
    )
}

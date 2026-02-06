import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useToast } from '../components/Toast'

// Demo API helper - uses demo token
const demoApi = {
    get: async (url) => {
        const token = localStorage.getItem('demo_token')
        const res = await fetch(`/api/demo${url}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!res.ok) throw new Error((await res.json()).error)
        return res.json()
    },
    post: async (url, data) => {
        const token = localStorage.getItem('demo_token')
        const res = await fetch(`/api/demo${url}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        if (!res.ok) throw new Error((await res.json()).error)
        return res.json()
    },
    put: async (url, data) => {
        const token = localStorage.getItem('demo_token')
        const res = await fetch(`/api/demo${url}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        })
        if (!res.ok) throw new Error((await res.json()).error)
        return res.json()
    },
    delete: async (url) => {
        const token = localStorage.getItem('demo_token')
        const res = await fetch(`/api/demo${url}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!res.ok) throw new Error((await res.json()).error)
        return res.json()
    }
}

export default function DemoPortal() {
    const navigate = useNavigate()
    const toast = useToast()
    const [user, setUser] = useState(null)
    const [activeTab, setActiveTab] = useState('dashboard')
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState(null)
    const [timeRemaining, setTimeRemaining] = useState('')

    useEffect(() => {
        const demoUser = localStorage.getItem('demo_user')
        if (!demoUser) {
            navigate('/demo/login')
            return
        }
        setUser(JSON.parse(demoUser))
        loadDashboard()
    }, [])

    // Update time remaining every minute
    useEffect(() => {
        if (!user) return

        const updateTime = () => {
            const expiresAt = new Date(user.expires_at)
            const now = new Date()
            const diff = expiresAt - now

            if (diff <= 0) {
                handleLogout()
                return
            }

            const hours = Math.floor(diff / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            setTimeRemaining(`${hours}h ${minutes}m`)
        }

        updateTime()
        const interval = setInterval(updateTime, 60000)
        return () => clearInterval(interval)
    }, [user])

    const loadDashboard = async () => {
        try {
            const data = await demoApi.get('/dashboard')
            setStats(data)
        } catch (error) {
            if (error.message.includes('expired') || error.message.includes('authentication')) {
                handleLogout()
            }
        } finally {
            setLoading(false)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('demo_token')
        localStorage.removeItem('demo_user')
        navigate('/demo/login')
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-2xl">🎮</span>
                            <div>
                                <h1 className="text-xl font-bold">Demo Portal</h1>
                                <p className="text-teal-200 text-sm">Welcome, {user?.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-white/20 backdrop-blur px-4 py-2 rounded-lg">
                                <span className="text-sm">⏰ Time Left: </span>
                                <span className="font-bold">{timeRemaining}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* Navigation Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto">
                    {['dashboard', 'pos', 'inventory', 'customers', 'sales'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap transition ${activeTab === tab
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {tab === 'pos' ? 'POS System' : tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {activeTab === 'dashboard' && <DemoDashboard stats={stats} />}
                {activeTab === 'pos' && <DemoPOS toast={toast} onSaleComplete={loadDashboard} />}
                {activeTab === 'inventory' && <DemoInventory toast={toast} />}
                {activeTab === 'customers' && <DemoCustomers toast={toast} />}
                {activeTab === 'sales' && <DemoSales />}
            </div>
        </div>
    )
}

function DemoDashboard({ stats }) {
    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>

            {/* Stats Grid */}
            <div className="grid md:grid-cols-4 gap-4 mb-6">
                <StatCard title="Today's Sales" value={`PKR ${stats?.todaySales?.toLocaleString() || 0}`} color="teal" icon="💰" />
                <StatCard title="Products" value={stats?.totalProducts || 0} color="blue" icon="📦" />
                <StatCard title="Customers" value={stats?.totalCustomers || 0} color="purple" icon="👥" />
                <StatCard title="Low Stock" value={stats?.lowStock || 0} color="yellow" icon="⚠️" />
            </div>

            {/* Recent Sales */}
            <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Sales</h3>
                {stats?.recentSales?.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-2 text-sm font-medium text-gray-500">Receipt</th>
                                    <th className="text-left py-2 text-sm font-medium text-gray-500">Customer</th>
                                    <th className="text-left py-2 text-sm font-medium text-gray-500">Amount</th>
                                    <th className="text-left py-2 text-sm font-medium text-gray-500">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recentSales.map(sale => (
                                    <tr key={sale._id} className="border-b">
                                        <td className="py-3 font-medium">{sale.receipt_number}</td>
                                        <td className="py-3 text-gray-600">{sale.customer_name}</td>
                                        <td className="py-3 font-semibold text-teal-600">PKR {sale.total_amount?.toLocaleString()}</td>
                                        <td className="py-3 text-sm text-gray-500">{new Date(sale.created_at).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-center py-8 text-gray-500">No sales yet. Try out the POS System!</p>
                )}
            </div>
        </div>
    )
}

function StatCard({ title, value, color, icon }) {
    const colors = {
        teal: 'from-teal-500 to-cyan-500',
        blue: 'from-blue-500 to-indigo-500',
        purple: 'from-purple-500 to-pink-500',
        yellow: 'from-yellow-500 to-orange-500'
    }
    return (
        <div className={`bg-gradient-to-br ${colors[color]} rounded-xl p-5 text-white`}>
            <div className="flex justify-between">
                <div>
                    <p className="text-sm opacity-90">{title}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                </div>
                <span className="text-3xl opacity-80">{icon}</span>
            </div>
        </div>
    )
}

function DemoPOS({ toast, onSaleComplete }) {
    const [products, setProducts] = useState([])
    const [cart, setCart] = useState([])
    const [loading, setLoading] = useState(true)
    const [showCheckout, setShowCheckout] = useState(false)

    useEffect(() => {
        loadProducts()
    }, [])

    const loadProducts = async () => {
        try {
            const data = await demoApi.get('/products')
            setProducts(data || [])
        } catch (error) {
            toast.error('Failed to load products')
        } finally {
            setLoading(false)
        }
    }

    const addToCart = (product) => {
        const existing = cart.find(item => item._id === product._id)
        if (existing) {
            setCart(cart.map(item =>
                item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
            ))
        } else {
            setCart([...cart, { ...product, quantity: 1 }])
        }
    }

    const removeFromCart = (id) => setCart(cart.filter(item => item._id !== id))

    const updateQuantity = (id, qty) => {
        if (qty <= 0) return removeFromCart(id)
        setCart(cart.map(item => item._id === id ? { ...item, quantity: qty } : item))
    }

    const getTotal = () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

    const handleCheckout = async () => {
        try {
            await demoApi.post('/sales', {
                items: cart.map(item => ({ id: item._id, name: item.name, price: item.price, quantity: item.quantity })),
                payment_method: 'cash'
            })
            toast.success('Sale completed!')
            setCart([])
            setShowCheckout(false)
            loadProducts()
            onSaleComplete()
        } catch (error) {
            toast.error(error.message)
        }
    }

    return (
        <div className="grid lg:grid-cols-3 gap-6">
            {/* Products */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-bold mb-4">Products</h3>
                <div className="grid md:grid-cols-3 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
                    {products.map(product => (
                        <div
                            key={product._id}
                            onClick={() => product.stock > 0 && addToCart(product)}
                            className={`border rounded-lg p-3 cursor-pointer transition ${product.stock > 0 ? 'hover:border-teal-400' : 'opacity-50 cursor-not-allowed'
                                }`}
                        >
                            <div className="h-20 bg-gray-100 rounded flex items-center justify-center mb-2">
                                <span className="text-3xl">📦</span>
                            </div>
                            <p className="font-medium truncate">{product.name}</p>
                            <p className="text-xs text-gray-500">Stock: {product.stock}</p>
                            <p className="font-bold text-teal-600">PKR {product.price?.toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Cart */}
            <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-bold mb-4">Cart ({cart.length})</h3>
                {cart.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">Cart is empty</p>
                ) : (
                    <>
                        <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
                            {cart.map(item => (
                                <div key={item._id} className="flex justify-between items-center border-b pb-2">
                                    <div className="flex-1">
                                        <p className="font-medium text-sm">{item.name}</p>
                                        <p className="text-xs text-gray-500">PKR {item.price} × {item.quantity}</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => updateQuantity(item._id, item.quantity - 1)} className="w-6 h-6 rounded bg-gray-200">-</button>
                                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                                        <button onClick={() => updateQuantity(item._id, item.quantity + 1)} className="w-6 h-6 rounded bg-gray-200">+</button>
                                        <button onClick={() => removeFromCart(item._id)} className="ml-1 text-red-500">×</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="border-t pt-4">
                            <div className="flex justify-between text-xl font-bold mb-4">
                                <span>Total:</span>
                                <span className="text-teal-600">PKR {getTotal().toLocaleString()}</span>
                            </div>
                            <button onClick={handleCheckout} className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-semibold">
                                Complete Sale
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}

function DemoInventory({ toast }) {
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editProduct, setEditProduct] = useState(null)

    useEffect(() => { loadProducts() }, [])

    const loadProducts = async () => {
        try {
            const data = await demoApi.get('/products')
            setProducts(data || [])
        } catch (error) {
            toast.error('Failed to load products')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (productData) => {
        try {
            if (editProduct) {
                await demoApi.put(`/products/${editProduct._id}`, productData)
                toast.success('Product updated')
            } else {
                await demoApi.post('/products', productData)
                toast.success('Product created')
            }
            setShowModal(false)
            setEditProduct(null)
            loadProducts()
        } catch (error) {
            toast.error(error.message)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this product?')) return
        try {
            await demoApi.delete(`/products/${id}`)
            toast.success('Product deleted')
            loadProducts()
        } catch (error) {
            toast.error(error.message)
        }
    }

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between mb-4">
                <h3 className="text-lg font-bold">Inventory ({products.length} products)</h3>
                <button onClick={() => { setEditProduct(null); setShowModal(true) }} className="bg-teal-600 text-white px-4 py-2 rounded-lg">
                    + Add Product
                </button>
            </div>

            <table className="min-w-full">
                <thead>
                    <tr className="border-b">
                        <th className="text-left py-2">Name</th>
                        <th className="text-left py-2">SKU</th>
                        <th className="text-left py-2">Price</th>
                        <th className="text-left py-2">Stock</th>
                        <th className="text-left py-2">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {products.map(p => (
                        <tr key={p._id} className="border-b">
                            <td className="py-3 font-medium">{p.name}</td>
                            <td className="py-3 text-gray-500">{p.sku}</td>
                            <td className="py-3">PKR {p.price?.toLocaleString()}</td>
                            <td className="py-3">
                                <span className={`px-2 py-1 rounded text-xs ${p.stock < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                    {p.stock}
                                </span>
                            </td>
                            <td className="py-3">
                                <button onClick={() => { setEditProduct(p); setShowModal(true) }} className="text-teal-600 mr-2">Edit</button>
                                <button onClick={() => handleDelete(p._id)} className="text-red-600">Delete</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {showModal && (
                <ProductModal product={editProduct} onClose={() => { setShowModal(false); setEditProduct(null) }} onSave={handleSave} />
            )}
        </div>
    )
}

function ProductModal({ product, onClose, onSave }) {
    const [form, setForm] = useState({
        name: product?.name || '',
        sku: product?.sku || '',
        category: product?.category || '',
        price: product?.price || 0,
        cost: product?.cost || 0,
        stock: product?.stock || 0
    })

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-bold mb-4">{product ? 'Edit Product' : 'Add Product'}</h3>
                <div className="space-y-3">
                    <input placeholder="Name" className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    <input placeholder="SKU" className="input-field" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} disabled={!!product} />
                    <input placeholder="Category" className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} />
                    <div className="grid grid-cols-3 gap-2">
                        <input type="number" placeholder="Price" className="input-field" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} />
                        <input type="number" placeholder="Cost" className="input-field" value={form.cost} onChange={e => setForm({ ...form, cost: +e.target.value })} />
                        <input type="number" placeholder="Stock" className="input-field" value={form.stock} onChange={e => setForm({ ...form, stock: +e.target.value })} />
                    </div>
                </div>
                <div className="flex gap-2 mt-4">
                    <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
                    <button onClick={() => onSave(form)} className="flex-1 bg-teal-600 text-white py-2 rounded-lg">Save</button>
                </div>
            </div>
        </div>
    )
}

function DemoCustomers({ toast }) {
    const [customers, setCustomers] = useState([])
    const [showModal, setShowModal] = useState(false)

    useEffect(() => { loadCustomers() }, [])

    const loadCustomers = async () => {
        try {
            const data = await demoApi.get('/customers')
            setCustomers(data.customers || [])
        } catch (error) {
            toast.error('Failed to load customers')
        }
    }

    const handleAdd = async (customerData) => {
        try {
            await demoApi.post('/customers', customerData)
            toast.success('Customer added')
            setShowModal(false)
            loadCustomers()
        } catch (error) {
            toast.error(error.message)
        }
    }

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <div className="flex justify-between mb-4">
                <h3 className="text-lg font-bold">Customers ({customers.length})</h3>
                <button onClick={() => setShowModal(true)} className="bg-teal-600 text-white px-4 py-2 rounded-lg">
                    + Add Customer
                </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
                {customers.map(c => (
                    <div key={c._id} className="border rounded-lg p-4">
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-sm text-gray-500">{c.email}</p>
                        <p className="text-sm text-gray-500">{c.phone}</p>
                    </div>
                ))}
            </div>

            {showModal && (
                <CustomerModal onClose={() => setShowModal(false)} onSave={handleAdd} />
            )}
        </div>
    )
}

function CustomerModal({ onClose, onSave }) {
    const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' })

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
                <h3 className="text-xl font-bold mb-4">Add Customer</h3>
                <div className="space-y-3">
                    <input placeholder="Name" className="input-field" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                    <input placeholder="Email" className="input-field" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                    <input placeholder="Phone" className="input-field" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                    <input placeholder="Company" className="input-field" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
                </div>
                <div className="flex gap-2 mt-4">
                    <button onClick={onClose} className="flex-1 btn-secondary">Cancel</button>
                    <button onClick={() => onSave(form)} className="flex-1 bg-teal-600 text-white py-2 rounded-lg">Save</button>
                </div>
            </div>
        </div>
    )
}

function DemoSales() {
    const [sales, setSales] = useState([])

    useEffect(() => {
        const load = async () => {
            try {
                const data = await demoApi.get('/sales')
                setSales(data || [])
            } catch (error) {
                console.error(error)
            }
        }
        load()
    }, [])

    return (
        <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-bold mb-4">Sales History ({sales.length})</h3>
            <table className="min-w-full">
                <thead>
                    <tr className="border-b">
                        <th className="text-left py-2">Receipt</th>
                        <th className="text-left py-2">Customer</th>
                        <th className="text-left py-2">Items</th>
                        <th className="text-left py-2">Total</th>
                        <th className="text-left py-2">Date</th>
                    </tr>
                </thead>
                <tbody>
                    {sales.map(s => (
                        <tr key={s._id} className="border-b">
                            <td className="py-3 font-medium">{s.receipt_number}</td>
                            <td className="py-3">{s.customer_name}</td>
                            <td className="py-3">{s.items?.length || 0} items</td>
                            <td className="py-3 font-bold text-teal-600">PKR {s.total_amount?.toLocaleString()}</td>
                            <td className="py-3 text-sm text-gray-500">{new Date(s.created_at).toLocaleString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

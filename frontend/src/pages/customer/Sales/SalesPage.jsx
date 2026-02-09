import { useState, useEffect } from 'react'
import api from '../../../services/api'
import { useToast } from '../../../components/Toast'
import CreditSalesPage from './CreditSalesPage'

export default function SalesPage() {
    const toast = useToast()
    const [activeTab, setActiveTab] = useState('history')
    const [sales, setSales] = useState([])
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterPayment, setFilterPayment] = useState('all')
    const [analytics, setAnalytics] = useState(null)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [salesRes, customersRes, statsRes] = await Promise.all([
                api.get('/pos/history'),
                api.get('/sales/customers'),
                api.get('/customer/stats')
            ])
            setSales(salesRes.data || [])
            setCustomers(customersRes.data.customers || [])

            // Calculate analytics from stats and sales
            const salesData = salesRes.data || []
            const stats = statsRes.data || {}

            // Group by payment method
            const byPayment = salesData.reduce((acc, sale) => {
                const method = sale.payment_method || 'cash'
                acc[method] = (acc[method] || 0) + (sale.total_amount || 0)
                return acc
            }, {})

            // Group by customer
            const byCustomer = salesData.reduce((acc, sale) => {
                const customer = sale.customer_name || 'Walk-in'
                if (!acc[customer]) acc[customer] = { count: 0, amount: 0 }
                acc[customer].count++
                acc[customer].amount += sale.total_amount || 0
                return acc
            }, {})

            // Top products
            const productCounts = {}
            salesData.forEach(sale => {
                (sale.items || []).forEach(item => {
                    const name = item.name || 'Unknown'
                    if (!productCounts[name]) productCounts[name] = { count: 0, revenue: 0 }
                    productCounts[name].count += item.quantity || 1
                    productCounts[name].revenue += (item.price || 0) * (item.quantity || 1)
                })
            })
            const topProducts = Object.entries(productCounts)
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5)

            setAnalytics({
                todaySales: stats.todaySales || 0,
                weekSales: stats.weekSales || 0,
                monthSales: stats.monthSales || 0,
                totalTransactions: salesData.length,
                avgTransactionValue: salesData.length > 0
                    ? salesData.reduce((sum, s) => sum + (s.total_amount || 0), 0) / salesData.length
                    : 0,
                byPayment,
                topCustomers: Object.entries(byCustomer)
                    .map(([name, data]) => ({ name, ...data }))
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 5),
                topProducts,
                dailySales: stats.dailySales || []
            })
        } catch (error) {
            console.error('Error loading data:', error)
            toast.error('Failed to load sales data')
        } finally {
            setLoading(false)
        }
    }

    const filteredSales = sales.filter(sale => {
        const matchesSearch =
            (sale.receipt_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (sale.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase())
        const matchesPayment = filterPayment === 'all' || sale.payment_method === filterPayment
        return matchesSearch && matchesPayment
    })

    const tabs = [
        { id: 'history', label: 'Sales History', icon: '📋' },
        { id: 'credit', label: 'Credit Sales', icon: '📝' },
        { id: 'analytics', label: 'Analytics', icon: '📊' },
        { id: 'customers', label: 'Customers', icon: '👥' }
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6 gap-2">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Sales & CRM</h2>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 bg-white rounded-lg p-1 shadow-sm w-full overflow-x-auto no-scrollbar scroll-smooth">
                <div className="flex flex-nowrap gap-2">
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
            </div>

            {/* Sales History Tab */}
            {activeTab === 'history' && (
                <div className="space-y-3 sm:space-y-4">
                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow p-2 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                            <input
                                type="text"
                                placeholder="Search by receipt # or customer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-field text-sm"
                            />
                        </div>
                        <select
                            value={filterPayment}
                            onChange={(e) => setFilterPayment(e.target.value)}
                            className="input-field text-sm w-full sm:w-40"
                        >
                            <option value="all">All Payments</option>
                            <option value="cash">Cash</option>
                            <option value="card">Card</option>
                            <option value="transfer">Transfer</option>
                        </select>
                        <button onClick={loadData} className="btn-secondary text-xs sm:text-sm whitespace-nowrap">
                            🔄 Refresh
                        </button>
                    </div>

                    {/* Sales Table */}
                    <div className="bg-white rounded-lg shadow overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt #</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Customer</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Payment</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredSales.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-2 sm:px-6 py-8 text-center text-gray-500 text-xs sm:text-sm">
                                            <span className="text-3xl sm:text-4xl block mb-2">📭</span>
                                            No sales found. Make some sales in the POS!
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSales.map((sale) => (
                                        <tr key={sale._id} className="hover:bg-gray-50">
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium text-primary-600">
                                                {sale.receipt_number}
                                            </td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
                                                {sale.customer_name || 'Walk-in'}
                                            </td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500">
                                                {sale.items?.length || 0}
                                            </td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm font-bold text-green-600">
                                                PKR {sale.total_amount?.toLocaleString()}
                                            </td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 hidden md:table-cell">
                                                <span className={`px-2 py-1 text-xs rounded-full capitalize inline-block ${sale.payment_method === 'cash'
                                                    ? 'bg-green-100 text-green-700'
                                                    : sale.payment_method === 'card'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-purple-100 text-purple-700'
                                                    }`}>
                                                    {sale.payment_method}
                                                </span>
                                            </td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500 hidden lg:table-cell">
                                                {new Date(sale.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary */}
                    {filteredSales.length > 0 && (
                        <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-lg p-3 sm:p-4 text-white text-sm sm:text-base">
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
                                <span>Showing {filteredSales.length} sales</span>
                                <span className="font-bold">
                                    Total: PKR {filteredSales.reduce((sum, s) => sum + (s.total_amount || 0), 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && analytics && (
                <div className="space-y-4 sm:space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                        <StatCard title="Today's Sales" value={`PKR ${analytics.todaySales?.toLocaleString()}`} color="blue" icon="💰" />
                        <StatCard title="This Week" value={`PKR ${analytics.weekSales?.toLocaleString()}`} color="indigo" icon="📅" />
                        <StatCard title="This Month" value={`PKR ${analytics.monthSales?.toLocaleString()}`} color="purple" icon="📆" />
                        <StatCard title="Avg. Txn" value={`PKR ${Math.round(analytics.avgTransactionValue).toLocaleString()}`} color="green" icon="📊" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                        {/* Sales by Payment Method */}
                        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-6">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">💳 Sales by Payment</h3>
                            <div className="space-y-2 sm:space-y-3">
                                {Object.entries(analytics.byPayment).map(([method, amount]) => {
                                    const total = Object.values(analytics.byPayment).reduce((a, b) => a + b, 0)
                                    const percentage = total > 0 ? ((amount / total) * 100).toFixed(1) : 0
                                    return (
                                        <div key={method} className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                            <span className={`w-16 sm:w-20 text-xs sm:text-sm font-medium capitalize ${method === 'cash' ? 'text-green-600' :
                                                method === 'card' ? 'text-blue-600' : 'text-purple-600'
                                                }`}>{method}</span>
                                            <div className="flex-1 min-w-[80px] bg-gray-200 rounded-full h-3 sm:h-4 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${method === 'cash' ? 'bg-green-500' :
                                                        method === 'card' ? 'bg-blue-500' : 'bg-purple-500'
                                                        }`}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <span className="text-xs sm:text-sm text-right font-medium flex-shrink-0">
                                                {percentage}%
                                            </span>
                                        </div>
                                    )
                                })}
                                {Object.keys(analytics.byPayment).length === 0 && (
                                    <p className="text-gray-500 text-center py-4 text-sm">No payment data yet</p>
                                )}
                            </div>
                        </div>

                        {/* Top Products */}
                        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-6">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">🏆 Top Selling Products</h3>
                            <div className="space-y-2 sm:space-y-3">
                                {analytics.topProducts.map((product, index) => (
                                    <div key={product.name} className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                            index === 1 ? 'bg-gray-300 text-gray-700' :
                                                index === 2 ? 'bg-orange-300 text-orange-800' :
                                                    'bg-gray-100 text-gray-600'
                                            }`}>{index + 1}</span>
                                        <span className="flex-1 font-medium truncate">{product.name}</span>
                                        <span className="text-gray-500 flex-shrink-0">{product.count}</span>
                                        <span className="font-bold text-green-600 flex-shrink-0">PKR {(product.revenue / 1000).toFixed(0)}k</span>
                                    </div>
                                ))}
                                {analytics.topProducts.length === 0 && (
                                    <p className="text-gray-500 text-center py-4">No product data yet</p>
                                )}
                            </div>
                        </div>

                        {/* Daily Sales Chart */}
                        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-6 lg:col-span-2">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">📈 Sales Trend (Last 7 Days)</h3>
                            <div className="flex items-end justify-between gap-1 h-32 sm:h-40">
                                {analytics.dailySales.map((day, index) => {
                                    const maxAmount = Math.max(...analytics.dailySales.map(d => d.amount || 0), 1)
                                    const height = ((day.amount || 0) / maxAmount) * 100
                                    return (
                                        <div key={index} className="flex flex-col items-center flex-1 gap-1">
                                            <span className="text-xs text-gray-500 hidden sm:inline">
                                                PKR {((day.amount || 0) / 1000).toFixed(0)}k
                                            </span>
                                            <div
                                                className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-lg transition-all hover:from-primary-600 hover:to-primary-500"
                                                style={{ height: `${Math.max(height, 5)}%`, minHeight: '6px' }}
                                                title={`PKR ${(day.amount || 0).toLocaleString()}`}
                                            />
                                            <span className="text-xs text-gray-500">{day.date.split('-')[2]}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Top Customers */}
                        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-6 lg:col-span-2">
                            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">👥 Top Customers</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                                {analytics.topCustomers.map((customer, index) => (
                                    <div key={customer.name} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-2 sm:p-3 lg:p-4 text-center text-xs sm:text-sm">
                                        <div className={`w-8 sm:w-10 h-8 sm:h-10 mx-auto rounded-full flex items-center justify-center text-white font-bold mb-1 text-xs sm:text-sm ${index === 0 ? 'bg-yellow-500' :
                                            index === 1 ? 'bg-gray-400' :
                                                index === 2 ? 'bg-orange-400' : 'bg-primary-500'
                                            }`}>
                                            {customer.name.charAt(0).toUpperCase()}
                                        </div>
                                        <p className="font-medium text-gray-900 truncate" title={customer.name}>{customer.name}</p>
                                        <p className="text-xs text-gray-500">{customer.count} orders</p>
                                        <p className="text-sm sm:text-base font-bold text-green-600">PKR {(customer.amount / 1000).toFixed(0)}k</p>
                                    </div>
                                ))}
                                {analytics.topCustomers.length === 0 && (
                                    <p className="text-gray-500 text-center py-4 col-span-5">No customer data yet</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Credit Sales Tab */}
            {activeTab === 'credit' && (
                <CreditSalesPage />
            )}

            {/* Customers Tab */}
            {activeTab === 'customers' && (
                <CustomersTab customers={customers} onRefresh={loadData} toast={toast} />
            )}
        </div>
    )
}

function StatCard({ title, value, color, icon }) {
    const colors = {
        blue: 'from-blue-500 to-blue-600',
        indigo: 'from-indigo-500 to-indigo-600',
        purple: 'from-purple-500 to-purple-600',
        green: 'from-green-500 to-green-600'
    }
    return (
        <div className={`bg-gradient-to-br ${colors[color]} rounded-lg sm:rounded-xl p-2 sm:p-4 lg:p-5 text-white shadow-lg`}>
            <div className="flex justify-between items-start gap-1">
                <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium opacity-90 truncate">{title}</p>
                    <p className="text-sm sm:text-lg lg:text-2xl font-bold mt-1 break-words">{value}</p>
                </div>
                <span className="text-lg sm:text-2xl lg:text-3xl opacity-80 flex-shrink-0">{icon}</span>
            </div>
        </div>
    )
}

function CustomersTab({ customers, onRefresh, toast }) {
    const [showModal, setShowModal] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState(null)
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', company: '', credit_limit: 0
    })

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
            onRefresh()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this customer?')) return
        try {
            await api.delete(`/sales/customers/${id}`)
            toast.success('Customer deleted')
            onRefresh()
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

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 mb-3 sm:mb-4">
                <p className="text-sm sm:text-base text-gray-600">{customers.length} customers</p>
                <button onClick={() => setShowModal(true)} className="btn-primary text-xs sm:text-sm whitespace-nowrap">
                    + Add Customer
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
                            <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Credit Limit</th>
                            <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {customers.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="px-2 sm:px-6 py-8 text-center text-gray-500 text-xs sm:text-sm">
                                    No customers found. Add your first customer!
                                </td>
                            </tr>
                        ) : (
                            customers.map((customer) => (
                                <tr key={customer._id} className="hover:bg-gray-50">
                                    <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium text-gray-900">{customer.name}</td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500 hidden sm:table-cell">{customer.email}</td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500">{customer.phone}</td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500 hidden lg:table-cell">{customer.company || '-'}</td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500 hidden md:table-cell">PKR {customer.credit_limit?.toLocaleString() || 0}</td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium">
                                        <button onClick={() => handleEdit(customer)} className="text-primary-600 hover:text-primary-900 mr-2 sm:mr-3">
                                            ✏️
                                        </button>
                                        <button onClick={() => handleDelete(customer._id)} className="text-red-600 hover:text-red-900">
                                            🗑️
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
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                        <h3 className="text-xl sm:text-2xl font-bold mb-4">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="input-field text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Email *</label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="input-field text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Phone *</label>
                                    <input
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="input-field text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Company</label>
                                    <input
                                        type="text"
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                        className="input-field text-sm"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Credit Limit</label>
                                    <input
                                        type="number"
                                        value={formData.credit_limit}
                                        onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) })}
                                        className="input-field text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary text-xs sm:text-sm">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary text-xs sm:text-sm">
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

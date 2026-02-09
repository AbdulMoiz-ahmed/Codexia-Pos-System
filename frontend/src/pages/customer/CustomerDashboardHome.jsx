import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

export default function CustomerDashboardHome() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [lowStockItems, setLowStockItems] = useState([])

    useEffect(() => {
        loadStats()
        loadLowStockItems()
    }, [])

    const loadStats = async () => {
        try {
            const res = await api.get('/customer/stats')
            setStats(res.data)
        } catch (error) {
            console.error('Error loading stats:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadLowStockItems = async () => {
        try {
            const res = await api.get('/customer/products')
            const allProducts = res.data.products || []
            // Filter items where stock <= reorder_level or stock < 10 if no reorder_level set
            const lowStock = allProducts.filter(product => {
                const reorderLevel = product.reorder_level || 10
                return product.stock <= reorderLevel
            })
            setLowStockItems(lowStock)
        } catch (error) {
            console.error('Error loading low stock items:', error)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    const maxSale = Math.max(...(stats?.dailySales?.map(d => d.amount) || [1]))

    return (
        <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Dashboard Overview</h2>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
                <StatCard
                    title="Today's Sales"
                    value={`PKR ${stats?.todaySales?.toLocaleString() || 0}`}
                    subtitle={`${stats?.todayTransactions || 0} transactions`}
                    color="blue"
                    icon="💰"
                />
                <StatCard
                    title="This Week"
                    value={`PKR ${stats?.weekSales?.toLocaleString() || 0}`}
                    subtitle={`${stats?.weekTransactions || 0} transactions`}
                    color="indigo"
                    icon="📊"
                />
                <StatCard
                    title="Low Stock Items"
                    value={stats?.lowStock || 0}
                    subtitle={`${stats?.outOfStock || 0} out of stock`}
                    color={stats?.lowStock > 0 ? "yellow" : "green"}
                    icon="⚠️"
                />
                <StatCard
                    title="Total Products"
                    value={stats?.totalProducts || 0}
                    subtitle={`${stats?.totalCustomers || 0} customers`}
                    color="green"
                    icon="📦"
                />
            </div>

            <div className="grid lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
                {/* Sales Chart */}
                <div className="lg:col-span-2 bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Sales Trend (Last 7 Days)</h3>
                    <div className="flex items-end justify-between gap-1 sm:gap-2 h-32 sm:h-40">
                        {stats?.dailySales?.map((day, index) => (
                            <div key={index} className="flex flex-col items-center flex-1">
                                <div
                                    className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-lg transition-all hover:from-primary-600 hover:to-primary-500"
                                    style={{
                                        height: `${Math.max((day.amount / maxSale) * 100, 5)}%`,
                                        minHeight: '6px'
                                    }}
                                    title={`PKR ${day.amount?.toLocaleString()}`}
                                />
                                <span className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">{day.date}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-2 text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t">
                        <span>Weekly Total: <strong className="text-gray-900">PKR {stats?.weekSales?.toLocaleString()}</strong></span>
                        <span>Monthly Total: <strong className="text-gray-900">PKR {stats?.monthSales?.toLocaleString()}</strong></span>
                    </div>
                </div>

                {/* Low Stock Alerts */}
                <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6">
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <h3 className="text-base sm:text-lg font-bold text-gray-900">Low Stock Alerts</h3>
                        {lowStockItems.length > 0 && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">
                                {lowStockItems.length}
                            </span>
                        )}
                    </div>
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {lowStockItems.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <span className="text-4xl mb-2 block">✅</span>
                                <p>All items are well stocked!</p>
                            </div>
                        ) : (
                            lowStockItems.slice(0, 10).map(item => (
                                <div key={item._id} className="border border-orange-200 rounded-lg p-3 bg-gradient-to-r from-red-50 to-orange-50 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-bold text-gray-900 truncate">{item.name}</p>
                                                <span className="px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold whitespace-nowrap">
                                                    ⚠️ LOW
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                                                <div>
                                                    <span className="text-gray-500">SKU:</span>
                                                    <span className="ml-1 font-mono font-semibold text-gray-900">{item.sku || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Category:</span>
                                                    <span className="ml-1 font-semibold text-gray-900">{item.category || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Stock:</span>
                                                    <span className="ml-1 font-bold text-red-600">{item.stock} units</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Reorder:</span>
                                                    <span className="ml-1 font-semibold text-gray-900">{item.reorder_level || 10} units</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Price:</span>
                                                    <span className="ml-1 font-semibold text-gray-900">PKR {(item.price || 0).toLocaleString()}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Cost:</span>
                                                    <span className="ml-1 font-semibold text-gray-900">PKR {(item.cost || 0).toLocaleString()}</span>
                                                </div>
                                                {item.supplier && (
                                                    <div className="col-span-2">
                                                        <span className="text-gray-500">Supplier:</span>
                                                        <span className="ml-1 font-semibold text-gray-900">{item.supplier}</span>
                                                    </div>
                                                )}
                                                <div className="col-span-2">
                                                    <span className="text-gray-500">Shortage:</span>
                                                    <span className="ml-1 font-bold text-orange-600">
                                                        {Math.max(0, (item.reorder_level || 10) - item.stock)} units needed
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <Link
                                            to="/customer/dashboard/purchase"
                                            className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-colors"
                                        >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            Order
                                        </Link>
                                    </div>
                                </div>
                            ))
                        )}
                        {lowStockItems.length > 10 && (
                            <div className="text-center pt-2">
                                <Link to="/customer/dashboard/inventory" className="text-sm text-primary-600 hover:text-primary-800 font-medium">
                                    View all {lowStockItems.length} low stock items →
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Sales */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900">Recent Sales</h3>
                    <Link to="/customer/pos" className="text-sm text-primary-600 hover:text-primary-800">
                        View All →
                    </Link>
                </div>
                {stats?.recentSales?.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase">Receipt #</th>
                                    <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                                    <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                                    <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase">Payment</th>
                                    <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.recentSales.map(sale => (
                                    <tr key={sale._id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="py-3 font-medium text-gray-900">{sale.receipt_number}</td>
                                        <td className="py-3 text-gray-600">{sale.customer_name || 'Walk-in'}</td>
                                        <td className="py-3 font-semibold text-primary-600">
                                            PKR {sale.total_amount?.toLocaleString()}
                                        </td>
                                        <td className="py-3">
                                            <span className={`px-2 py-1 text-xs rounded-full capitalize ${sale.payment_method === 'cash'
                                                    ? 'bg-green-100 text-green-700'
                                                    : sale.payment_method === 'card'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-purple-100 text-purple-700'
                                                }`}>
                                                {sale.payment_method}
                                            </span>
                                        </td>
                                        <td className="py-3 text-sm text-gray-500">
                                            {new Date(sale.created_at).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <span className="text-4xl mb-2 block">🛒</span>
                        <p>No sales yet today</p>
                        <Link to="/customer/pos" className="text-primary-600 hover:underline text-sm">
                            Make your first sale →
                        </Link>
                    </div>
                )}
            </div>
        </div>
    )
}

function StatCard({ title, value, subtitle, color, icon }) {
    const colors = {
        blue: 'from-blue-500 to-blue-600',
        indigo: 'from-indigo-500 to-indigo-600',
        green: 'from-green-500 to-green-600',
        yellow: 'from-yellow-500 to-yellow-600',
        red: 'from-red-500 to-red-600',
        purple: 'from-purple-500 to-purple-600'
    }

    return (
        <div className={`bg-gradient-to-br ${colors[color]} rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6 text-white shadow-lg`}>
            <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium opacity-90 truncate">{title}</p>
                    <p className="text-xl sm:text-2xl font-bold mt-1">{value}</p>
                    {subtitle && <p className="text-xs opacity-75 mt-1 truncate">{subtitle}</p>}
                </div>
                <span className="text-2xl sm:text-3xl opacity-80 flex-shrink-0">{icon}</span>
            </div>
        </div>
    )
}

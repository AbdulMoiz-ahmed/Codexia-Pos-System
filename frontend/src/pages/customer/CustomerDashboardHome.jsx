import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../../services/api'

export default function CustomerDashboardHome() {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadStats()
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
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Overview</h2>

            {/* Main Stats Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

            <div className="grid lg:grid-cols-3 gap-6 mb-8">
                {/* Sales Chart */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Sales Trend (Last 7 Days)</h3>
                    <div className="flex items-end justify-between gap-2 h-40">
                        {stats?.dailySales?.map((day, index) => (
                            <div key={index} className="flex flex-col items-center flex-1">
                                <div
                                    className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-lg transition-all hover:from-primary-600 hover:to-primary-500"
                                    style={{
                                        height: `${Math.max((day.amount / maxSale) * 100, 5)}%`,
                                        minHeight: '8px'
                                    }}
                                    title={`PKR ${day.amount?.toLocaleString()}`}
                                />
                                <span className="text-xs text-gray-500 mt-2">{day.date}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 mt-4 pt-4 border-t">
                        <span>Weekly Total: <strong className="text-gray-900">PKR {stats?.weekSales?.toLocaleString()}</strong></span>
                        <span>Monthly Total: <strong className="text-gray-900">PKR {stats?.monthSales?.toLocaleString()}</strong></span>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                        <Link
                            to="/customer/pos"
                            className="flex items-center gap-3 p-3 rounded-lg bg-primary-50 hover:bg-primary-100 transition-colors"
                        >
                            <span className="text-2xl">🛒</span>
                            <div>
                                <p className="font-medium text-primary-900">New Sale</p>
                                <p className="text-xs text-primary-600">Open POS System</p>
                            </div>
                        </Link>
                        <Link
                            to="/customer/inventory"
                            className="flex items-center gap-3 p-3 rounded-lg bg-green-50 hover:bg-green-100 transition-colors"
                        >
                            <span className="text-2xl">📦</span>
                            <div>
                                <p className="font-medium text-green-900">Add Product</p>
                                <p className="text-xs text-green-600">Manage Inventory</p>
                            </div>
                        </Link>
                        <Link
                            to="/customer/sales"
                            className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors"
                        >
                            <span className="text-2xl">📄</span>
                            <div>
                                <p className="font-medium text-purple-900">Create Invoice</p>
                                <p className="text-xs text-purple-600">Sales & Invoices</p>
                            </div>
                        </Link>
                        <Link
                            to="/customer/subscription"
                            className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors"
                        >
                            <span className="text-2xl">⚙️</span>
                            <div>
                                <p className="font-medium text-orange-900">Subscription</p>
                                <p className="text-xs text-orange-600">View Plan & License</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Recent Sales */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900">Recent Sales</h3>
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
        <div className={`bg-gradient-to-br ${colors[color]} rounded-xl p-6 text-white shadow-lg`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium opacity-90">{title}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                    {subtitle && <p className="text-xs opacity-75 mt-1">{subtitle}</p>}
                </div>
                <span className="text-3xl opacity-80">{icon}</span>
            </div>
        </div>
    )
}

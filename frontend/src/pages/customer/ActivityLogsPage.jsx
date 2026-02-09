import { useState, useEffect } from 'react'
import api from '../../services/api'
import { useToast } from '../../components/Toast'

export default function ActivityLogsPage() {
    const toast = useToast()
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)
    const [summary, setSummary] = useState(null)
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 })
    const [filter, setFilter] = useState({ type: '', entity_type: '' })

    const activityTypeColors = {
        'LOGIN': 'bg-green-100 text-green-800',
        'LOGOUT': 'bg-gray-100 text-gray-800',
        'LOGIN_FAILED': 'bg-red-100 text-red-800',
        'SALE_CREATED': 'bg-blue-100 text-blue-800',
        'SALE_VOIDED': 'bg-red-100 text-red-800',
        'PAYMENT_RECEIVED': 'bg-emerald-100 text-emerald-800',
        'PRODUCT_CREATED': 'bg-indigo-100 text-indigo-800',
        'PRODUCT_UPDATED': 'bg-yellow-100 text-yellow-800',
        'PRODUCT_DELETED': 'bg-red-100 text-red-800',
        'PO_CREATED': 'bg-purple-100 text-purple-800',
        'PO_RECEIVED': 'bg-teal-100 text-teal-800',
        'CUSTOMER_CREATED': 'bg-cyan-100 text-cyan-800',
        'CUSTOMER_UPDATED': 'bg-cyan-100 text-cyan-800',
        'JOURNAL_CREATED': 'bg-violet-100 text-violet-800',
        'SETTINGS_UPDATED': 'bg-orange-100 text-orange-800'
    }

    const activityIcons = {
        'LOGIN': '🔓',
        'LOGOUT': '🔒',
        'LOGIN_FAILED': '⚠️',
        'SALE_CREATED': '🛒',
        'SALE_VOIDED': '❌',
        'PAYMENT_RECEIVED': '💰',
        'PRODUCT_CREATED': '📦',
        'PRODUCT_UPDATED': '✏️',
        'PRODUCT_DELETED': '🗑️',
        'PO_CREATED': '📋',
        'PO_RECEIVED': '📥',
        'CUSTOMER_CREATED': '👤',
        'CUSTOMER_UPDATED': '👤',
        'JOURNAL_CREATED': '📒',
        'SETTINGS_UPDATED': '⚙️'
    }

    useEffect(() => {
        loadLogs()
        loadSummary()
    }, [pagination.page, filter])

    const loadLogs = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit
            })
            if (filter.type) params.append('type', filter.type)
            if (filter.entity_type) params.append('entity_type', filter.entity_type)

            const res = await api.get(`/activity/?${params}`)
            setLogs(res.data.logs || [])
            setPagination(prev => ({ ...prev, ...res.data.pagination }))
        } catch (error) {
            console.error('Error loading logs:', error)
            toast.error('Failed to load activity logs')
        } finally {
            setLoading(false)
        }
    }

    const loadSummary = async () => {
        try {
            const res = await api.get('/activity/summary?days=7')
            setSummary(res.data)
        } catch (error) {
            console.error('Error loading summary:', error)
        }
    }

    const formatDate = (dateStr) => {
        const date = new Date(dateStr)
        return date.toLocaleString()
    }

    const formatTimeAgo = (dateStr) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diff = Math.floor((now - date) / 1000)

        if (diff < 60) return 'Just now'
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
        return `${Math.floor(diff / 86400)}d ago`
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Activity Logs</h1>
                    <p className="text-gray-600 mt-1">Track all system activities and user actions</p>
                </div>
                <button onClick={loadLogs} className="btn-secondary flex items-center gap-2">
                    🔄 Refresh
                </button>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid md:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white shadow-lg">
                        <p className="text-sm font-medium opacity-90">Total Activities (7 days)</p>
                        <p className="text-3xl font-bold mt-1">{summary.total?.toLocaleString()}</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white shadow-lg">
                        <p className="text-sm font-medium opacity-90">Logins</p>
                        <p className="text-3xl font-bold mt-1">{summary.by_type?.LOGIN || 0}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white shadow-lg">
                        <p className="text-sm font-medium opacity-90">Sales</p>
                        <p className="text-3xl font-bold mt-1">{summary.by_type?.SALE_CREATED || 0}</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-5 text-white shadow-lg">
                        <p className="text-sm font-medium opacity-90">Failed Logins</p>
                        <p className="text-3xl font-bold mt-1">{summary.by_type?.LOGIN_FAILED || 0}</p>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm flex flex-wrap gap-4 items-center">
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Activity Type</label>
                    <select
                        value={filter.type}
                        onChange={e => setFilter(prev => ({ ...prev, type: e.target.value }))}
                        className="input-field min-w-[180px]"
                    >
                        <option value="">All Types</option>
                        <option value="LOGIN">Login</option>
                        <option value="LOGOUT">Logout</option>
                        <option value="LOGIN_FAILED">Failed Login</option>
                        <option value="SALE_CREATED">Sale Created</option>
                        <option value="PAYMENT_RECEIVED">Payment Received</option>
                        <option value="PRODUCT_CREATED">Product Created</option>
                        <option value="PRODUCT_UPDATED">Product Updated</option>
                    </select>
                </div>
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Entity Type</label>
                    <select
                        value={filter.entity_type}
                        onChange={e => setFilter(prev => ({ ...prev, entity_type: e.target.value }))}
                        className="input-field min-w-[150px]"
                    >
                        <option value="">All Entities</option>
                        <option value="sale">Sales</option>
                        <option value="product">Products</option>
                        <option value="customer">Customers</option>
                        <option value="supplier">Suppliers</option>
                    </select>
                </div>
                {(filter.type || filter.entity_type) && (
                    <button
                        onClick={() => setFilter({ type: '', entity_type: '' })}
                        className="text-sm text-indigo-600 hover:underline mt-5"
                    >
                        Clear Filters
                    </button>
                )}
            </div>

            {/* Activity Log Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <p className="text-4xl mb-3">📋</p>
                        <p className="text-lg font-medium">No activity logs yet</p>
                        <p className="text-sm">Activities will appear here as they occur</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Activity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {logs.map((log, idx) => (
                                <tr key={log._id || idx} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${activityTypeColors[log.activity_type] || 'bg-gray-100 text-gray-800'}`}>
                                            <span>{activityIcons[log.activity_type] || '📌'}</span>
                                            {log.activity_type?.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-gray-900 font-medium">{log.user_name || 'System'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-gray-800 text-sm">{log.description}</p>
                                        {log.entity_name && (
                                            <p className="text-gray-500 text-xs mt-1">
                                                {log.entity_type}: {log.entity_name}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-gray-600 text-sm font-mono">{log.ip_address || '-'}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-gray-900 text-sm">{formatTimeAgo(log.timestamp)}</p>
                                        <p className="text-gray-500 text-xs">{formatDate(log.timestamp)}</p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex justify-between items-center bg-white rounded-xl p-4 shadow-sm">
                    <p className="text-sm text-gray-600">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                            disabled={pagination.page === 1}
                            className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <span className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium">
                            {pagination.page}
                        </span>
                        <button
                            onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                            disabled={pagination.page >= pagination.pages}
                            className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

import { useState, useEffect } from 'react'
import { useToast } from '../../../components/Toast'
import api from '../../../services/api'

export default function CreditSalesPage() {
    const toast = useToast()
    const [creditSales, setCreditSales] = useState([])
    const [loading, setLoading] = useState(true)
    const [totalOutstanding, setTotalOutstanding] = useState(0)
    const [selectedSale, setSelectedSale] = useState(null)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentData, setPaymentData] = useState({ amount: 0, payment_method: 'cash' })
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        loadCreditSales()
    }, [])

    const loadCreditSales = async () => {
        try {
            const res = await api.get('/pos/credit-sales')
            setCreditSales(res.data.credit_sales || [])
            setTotalOutstanding(res.data.total_outstanding || 0)
        } catch (error) {
            toast.error('Failed to load credit sales')
        } finally {
            setLoading(false)
        }
    }

    const openPaymentModal = (sale) => {
        setSelectedSale(sale)
        setPaymentData({ amount: sale.amount_due, payment_method: 'cash' })
        setShowPaymentModal(true)
    }

    const handleRecordPayment = async () => {
        if (!selectedSale || paymentData.amount <= 0) {
            toast.warning('Please enter a valid amount')
            return
        }

        setProcessing(true)
        try {
            await api.post(`/pos/sales/${selectedSale._id}/payment`, paymentData)
            toast.success('Payment recorded successfully!')
            setShowPaymentModal(false)
            setSelectedSale(null)
            loadCreditSales()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to record payment')
        } finally {
            setProcessing(false)
        }
    }

    const getDueStatus = (sale) => {
        if (!sale.due_date) return { text: 'No due date', color: 'gray' }
        const dueDate = new Date(sale.due_date)
        const today = new Date()
        const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24))

        if (daysUntilDue < 0) return { text: `${Math.abs(daysUntilDue)} days overdue`, color: 'red' }
        if (daysUntilDue <= 7) return { text: `Due in ${daysUntilDue} days`, color: 'orange' }
        return { text: `Due in ${daysUntilDue} days`, color: 'green' }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-orange-500">
                    <h3 className="text-sm font-medium text-gray-500">Total Outstanding</h3>
                    <p className="text-3xl font-bold text-orange-600 mt-2">
                        PKR {totalOutstanding.toLocaleString()}
                    </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-blue-500">
                    <h3 className="text-sm font-medium text-gray-500">Credit Sales Count</h3>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{creditSales.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-red-500">
                    <h3 className="text-sm font-medium text-gray-500">Overdue</h3>
                    <p className="text-3xl font-bold text-red-600 mt-2">
                        {creditSales.filter(s => {
                            if (!s.due_date) return false
                            return new Date(s.due_date) < new Date()
                        }).length}
                    </p>
                </div>
            </div>

            {/* Credit Sales Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-900">Credit Sales (Accounts Receivable)</h2>
                    <p className="text-gray-500 mt-1">Manage unpaid customer invoices and record payments</p>
                </div>

                {creditSales.length === 0 ? (
                    <div className="p-12 text-center">
                        <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-gray-900">No outstanding credit sales</h3>
                        <p className="text-gray-500">All customer dues have been paid</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Receipt #</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {creditSales.map(sale => {
                                    const dueStatus = getDueStatus(sale)
                                    return (
                                        <tr key={sale._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono text-sm font-medium text-gray-900">
                                                    {sale.receipt_number}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <p className="font-medium text-gray-900">{sale.customer_name}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(sale.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-medium">
                                                PKR {sale.total_amount?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-green-600">
                                                PKR {sale.amount_paid?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-bold text-orange-600">
                                                PKR {sale.amount_due?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs rounded-full font-medium
                                                    ${dueStatus.color === 'red' ? 'bg-red-100 text-red-700' :
                                                        dueStatus.color === 'orange' ? 'bg-orange-100 text-orange-700' :
                                                            dueStatus.color === 'green' ? 'bg-green-100 text-green-700' :
                                                                'bg-gray-100 text-gray-600'}`}>
                                                    {dueStatus.text}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => openPaymentModal(sale)}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                                >
                                                    💰 Record Payment
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedSale && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Record Payment</h3>

                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Receipt:</span>
                                <span className="font-mono font-medium">{selectedSale.receipt_number}</span>
                            </div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-600">Customer:</span>
                                <span className="font-medium">{selectedSale.customer_name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Amount Due:</span>
                                <span className="font-bold text-orange-600">PKR {selectedSale.amount_due?.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Amount</label>
                                <input
                                    type="number"
                                    value={paymentData.amount}
                                    onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                    className="input-field text-lg font-bold"
                                    max={selectedSale.amount_due}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['cash', 'bank'].map(method => (
                                        <button
                                            key={method}
                                            onClick={() => setPaymentData(prev => ({ ...prev, payment_method: method }))}
                                            className={`py-3 px-4 rounded-lg border-2 font-medium capitalize transition-all ${paymentData.payment_method === method
                                                    ? 'border-green-500 bg-green-50 text-green-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            {method === 'cash' ? '💵 Cash' : '🏦 Bank Transfer'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="flex-1 btn-secondary"
                                disabled={processing}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRecordPayment}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg"
                                disabled={processing}
                            >
                                {processing ? 'Processing...' : 'Confirm Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

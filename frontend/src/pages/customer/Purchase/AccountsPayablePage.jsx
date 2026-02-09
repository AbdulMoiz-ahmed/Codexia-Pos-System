import { useState, useEffect } from 'react'
import { useToast } from '../../../components/Toast'
import api from '../../../services/api'

export default function AccountsPayablePage() {
    const toast = useToast()
    const [payables, setPayables] = useState([])
    const [loading, setLoading] = useState(true)
    const [totalPayable, setTotalPayable] = useState(0)
    const [selectedPO, setSelectedPO] = useState(null)
    const [showPaymentModal, setShowPaymentModal] = useState(false)
    const [paymentData, setPaymentData] = useState({ amount: 0, payment_method: 'cash' })
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        loadPayables()
    }, [])

    const loadPayables = async () => {
        try {
            const res = await api.get('/purchase/payables')
            setPayables(res.data.payables || [])
            setTotalPayable(res.data.total_payable || 0)
        } catch (error) {
            toast.error('Failed to load payables')
        } finally {
            setLoading(false)
        }
    }

    const openPaymentModal = (po) => {
        setSelectedPO(po)
        setPaymentData({ amount: po.amount_due || po.total, payment_method: 'bank' })
        setShowPaymentModal(true)
    }

    const handleMakePayment = async () => {
        if (!selectedPO || paymentData.amount <= 0) {
            toast.warning('Please enter a valid amount')
            return
        }

        setProcessing(true)
        try {
            await api.post(`/purchase/purchase-orders/${selectedPO._id}/payment`, paymentData)
            toast.success('Payment made successfully!')
            setShowPaymentModal(false)
            setSelectedPO(null)
            loadPayables()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to make payment')
        } finally {
            setProcessing(false)
        }
    }

    const handleReceivePO = async (po) => {
        if (po.status === 'received') {
            toast.warning('This PO has already been received')
            return
        }

        try {
            await api.post(`/purchase/purchase-orders/${po._id}/receive`, {})
            toast.success('PO received! Stock has been updated.')
            loadPayables()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to receive PO')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-6 border-l-4 border-red-500">
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500">Total Accounts Payable</h3>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-red-600 mt-2">
                        PKR {totalPayable.toLocaleString()}
                    </p>
                </div>
                <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-6 border-l-4 border-blue-500">
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500">Unpaid POs</h3>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-blue-600 mt-2">{payables.length}</p>
                </div>
                <div className="bg-white rounded-lg sm:rounded-xl shadow-sm p-3 sm:p-6 border-l-4 border-yellow-500">
                    <h3 className="text-xs sm:text-sm font-medium text-gray-500">Pending Receive</h3>
                    <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-yellow-600 mt-2">
                        {payables.filter(p => p.status === 'pending').length}
                    </p>
                </div>
            </div>

            {/* Payables Table */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
                <div className="p-3 sm:p-6 border-b">
                    <h2 className="text-base sm:text-xl font-bold text-gray-900">Accounts Payable (Vendor Dues)</h2>
                    <p className="text-xs sm:text-base text-gray-500 mt-1">Manage outstanding vendor payments and receive purchase orders</p>
                </div>

                {payables.length === 0 ? (
                    <div className="p-8 sm:p-12 text-center">
                        <svg className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 mx-auto mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-base sm:text-lg font-medium text-gray-900">No outstanding payables</h3>
                        <p className="text-xs sm:text-sm text-gray-500">All vendor dues have been cleared</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">PO #</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Supplier</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Date</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Paid</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Due</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {payables.map(po => (
                                    <tr key={po._id} className="hover:bg-gray-50">
                                        <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
                                            <span className="font-mono text-xs sm:text-sm font-medium text-gray-900">{po.po_number}</span>
                                        </td>
                                        <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 hidden sm:table-cell">
                                            <p className="font-medium text-xs sm:text-sm text-gray-900">{po.supplier_name}</p>
                                        </td>
                                        <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                                            {new Date(po.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 font-medium text-xs sm:text-sm">
                                            PKR {po.total?.toLocaleString()}
                                        </td>
                                        <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-green-600 text-xs sm:text-sm hidden lg:table-cell">
                                            PKR {(po.amount_paid || 0).toLocaleString()}
                                        </td>
                                        <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 font-bold text-red-600 text-xs sm:text-sm">
                                            PKR {(po.amount_due || po.total).toLocaleString()}
                                        </td>
                                        <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
                                            <div className="flex flex-col gap-0.5">
                                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium inline-block w-fit
                                                    ${po.status === 'received' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {po.status === 'received' ? '✓' : '⏳'}
                                                </span>
                                                <span className={`px-2 py-0.5 text-xs rounded-full font-medium inline-block w-fit
                                                    ${po.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                                                        po.payment_status === 'partial' ? 'bg-orange-100 text-orange-700' :
                                                            'bg-red-100 text-red-700'}`}>
                                                    {po.payment_status === 'paid' ? 'Paid' :
                                                        po.payment_status === 'partial' ? 'Partial' : 'Unpaid'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
                                            <div className="flex gap-1 sm:gap-2 flex-col sm:flex-row">
                                                {po.status !== 'received' && (
                                                    <button
                                                        onClick={() => handleReceivePO(po)}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
                                                    >
                                                        📦
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => openPaymentModal(po)}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap"
                                                >
                                                    💸
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedPO && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Make Payment to Vendor</h3>

                        <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 space-y-2 text-xs sm:text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">PO Number:</span>
                                <span className="font-mono font-medium">{selectedPO.po_number}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Supplier:</span>
                                <span className="font-medium">{selectedPO.supplier_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Amount Due:</span>
                                <span className="font-bold text-red-600">PKR {(selectedPO.amount_due || selectedPO.total)?.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Payment Amount</label>
                                <input
                                    type="number"
                                    value={paymentData.amount}
                                    onChange={(e) => setPaymentData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                                    className="input-field text-lg sm:text-xl font-bold w-full"
                                    max={selectedPO.amount_due || selectedPO.total}
                                />
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Payment Method</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['cash', 'bank'].map(method => (
                                        <button
                                            key={method}
                                            onClick={() => setPaymentData(prev => ({ ...prev, payment_method: method }))}
                                            className={`py-2 px-2 sm:px-4 rounded-lg border-2 font-medium capitalize transition-all text-xs sm:text-sm ${paymentData.payment_method === method
                                                    ? 'border-green-500 bg-green-50 text-green-700'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            {method === 'cash' ? '💵 Cash' : '🏦 Bank'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="flex-1 btn-secondary text-xs sm:text-sm"
                                disabled={processing}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleMakePayment}
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm"
                                disabled={processing}
                            >
                                {processing ? 'Processing...' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

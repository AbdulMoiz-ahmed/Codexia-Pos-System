import { useState, useEffect } from 'react'
import api from '../../../services/api'
import { useToast } from '../../../components/Toast'

export default function ReportsPage() {
    const toast = useToast()
    const [activeTab, setActiveTab] = useState('summary')
    const [loading, setLoading] = useState(true)
    const [summary, setSummary] = useState(null)
    const [trialBalance, setTrialBalance] = useState(null)
    const [profitLoss, setProfitLoss] = useState(null)
    const [balanceSheet, setBalanceSheet] = useState(null)
    const [agedReceivables, setAgedReceivables] = useState(null)
    const [agedPayables, setAgedPayables] = useState(null)

    const tabs = [
        { id: 'summary', label: 'Summary', icon: '📊' },
        { id: 'pnl', label: 'Profit & Loss', icon: '💰' },
        { id: 'balance', label: 'Balance Sheet', icon: '⚖️' },
        { id: 'trial', label: 'Trial Balance', icon: '📋' },
        { id: 'receivables', label: 'Aged Receivables', icon: '📥' },
        { id: 'payables', label: 'Aged Payables', icon: '📤' }
    ]

    useEffect(() => {
        loadData()
    }, [activeTab])

    const loadData = async () => {
        setLoading(true)
        try {
            switch (activeTab) {
                case 'summary':
                    const sumRes = await api.get('/accounting/reports/summary')
                    setSummary(sumRes.data)
                    break
                case 'trial':
                    const trialRes = await api.get('/accounting/reports/trial-balance')
                    setTrialBalance(trialRes.data)
                    break
                case 'pnl':
                    const pnlRes = await api.get('/accounting/reports/profit-loss')
                    setProfitLoss(pnlRes.data)
                    break
                case 'balance':
                    const bsRes = await api.get('/accounting/reports/balance-sheet')
                    setBalanceSheet(bsRes.data)
                    break
                case 'receivables':
                    const arRes = await api.get('/accounting/reports/aged-receivables')
                    setAgedReceivables(arRes.data)
                    break
                case 'payables':
                    const apRes = await api.get('/accounting/reports/aged-payables')
                    setAgedPayables(apRes.data)
                    break
            }
        } catch (error) {
            console.error('Error loading report:', error)
            toast.error('Failed to load report data')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Financial Reports</h2>
                <button onClick={loadData} className="btn-secondary">
                    🔄 Refresh
                </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-lg p-1 shadow-sm">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === tab.id
                            ? 'bg-primary-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        <span>{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <>
                    {activeTab === 'summary' && summary && <SummaryReport data={summary} />}
                    {activeTab === 'pnl' && profitLoss && <ProfitLossReport data={profitLoss} />}
                    {activeTab === 'balance' && balanceSheet && <BalanceSheetReport data={balanceSheet} />}
                    {activeTab === 'trial' && trialBalance && <TrialBalanceReport data={trialBalance} />}
                    {activeTab === 'receivables' && agedReceivables && <AgedReceivablesReport data={agedReceivables} />}
                    {activeTab === 'payables' && agedPayables && <AgedPayablesReport data={agedPayables} />}
                </>
            )}
        </div>
    )
}

function SummaryReport({ data }) {
    const cards = [
        { label: 'Cash Balance', value: data.cash_balance, color: 'green', icon: '💵' },
        { label: 'Accounts Receivable', value: data.accounts_receivable, color: 'blue', icon: '📥' },
        { label: 'Accounts Payable', value: data.accounts_payable, color: 'red', icon: '📤' },
        { label: 'Net Position', value: data.net_position, color: 'purple', icon: '💎' },
        { label: 'Month Sales', value: data.month_sales, color: 'indigo', icon: '🛒' },
        { label: 'Total Revenue', value: data.total_revenue, color: 'emerald', icon: '📈' },
        { label: 'Total Expenses', value: data.total_expenses, color: 'orange', icon: '📉' },
        { label: 'Net Profit', value: data.net_profit, color: data.net_profit >= 0 ? 'green' : 'red', icon: '🎯' }
    ]

    const colorMap = {
        green: 'from-green-500 to-green-600',
        blue: 'from-blue-500 to-blue-600',
        red: 'from-red-500 to-red-600',
        purple: 'from-purple-500 to-purple-600',
        indigo: 'from-indigo-500 to-indigo-600',
        emerald: 'from-emerald-500 to-emerald-600',
        orange: 'from-orange-500 to-orange-600'
    }

    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, i) => (
                <div key={i} className={`bg-gradient-to-br ${colorMap[card.color]} rounded-xl p-5 text-white shadow-lg`}>
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium opacity-90">{card.label}</p>
                            <p className="text-2xl font-bold mt-1">PKR {card.value?.toLocaleString()}</p>
                        </div>
                        <span className="text-3xl opacity-80">{card.icon}</span>
                    </div>
                </div>
            ))}
        </div>
    )
}

function ProfitLossReport({ data }) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
                <h3 className="text-xl font-bold">Profit & Loss Statement</h3>
                <span className="text-sm text-gray-500">
                    {new Date(data.period?.start).toLocaleDateString()} - {new Date(data.period?.end).toLocaleDateString()}
                </span>
            </div>

            {/* Revenue */}
            <div>
                <h4 className="font-bold text-green-700 mb-2">Revenue</h4>
                <div className="bg-green-50 rounded-lg p-4">
                    {data.revenue?.accounts?.map((acc, i) => (
                        <div key={i} className="flex justify-between py-1">
                            <span>{acc.name}</span>
                            <span>PKR {acc.amount?.toLocaleString()}</span>
                        </div>
                    ))}
                    <div className="flex justify-between pt-2 mt-2 border-t border-green-200 font-bold">
                        <span>Total Revenue</span>
                        <span>PKR {data.revenue?.total?.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* COGS */}
            <div className="flex justify-between py-3 border-b">
                <span className="font-medium">Cost of Goods Sold</span>
                <span className="font-bold text-gray-700">PKR {data.cost_of_goods_sold?.toLocaleString()}</span>
            </div>

            {/* Gross Profit */}
            <div className="flex justify-between py-3 bg-blue-50 rounded-lg px-4">
                <span className="font-bold text-blue-700">Gross Profit</span>
                <span className="font-bold text-blue-700">PKR {data.gross_profit?.toLocaleString()}</span>
            </div>

            {/* Expenses */}
            <div>
                <h4 className="font-bold text-red-700 mb-2">Expenses</h4>
                <div className="bg-red-50 rounded-lg p-4">
                    {data.expenses?.accounts?.map((acc, i) => (
                        <div key={i} className="flex justify-between py-1">
                            <span>{acc.name}</span>
                            <span>PKR {acc.amount?.toLocaleString()}</span>
                        </div>
                    ))}
                    <div className="flex justify-between pt-2 mt-2 border-t border-red-200 font-bold">
                        <span>Total Expenses</span>
                        <span>PKR {data.expenses?.total?.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Net Profit */}
            <div className={`flex justify-between py-4 rounded-lg px-4 ${data.net_profit >= 0 ? 'bg-green-600' : 'bg-red-600'} text-white`}>
                <span className="text-lg font-bold">Net Profit</span>
                <span className="text-lg font-bold">PKR {data.net_profit?.toLocaleString()}</span>
            </div>
        </div>
    )
}

function BalanceSheetReport({ data }) {
    return (
        <div className="grid lg:grid-cols-2 gap-6">
            {/* Assets */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-xl font-bold text-blue-700 mb-4 border-b pb-2">Assets</h3>
                {data.assets?.accounts?.map((acc, i) => (
                    <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-700">{acc.code} - {acc.name}</span>
                        <span className="font-medium">PKR {acc.balance?.toLocaleString()}</span>
                    </div>
                ))}
                <div className="flex justify-between py-3 mt-2 bg-blue-50 rounded-lg px-3 font-bold text-blue-700">
                    <span>Total Assets</span>
                    <span>PKR {data.assets?.total?.toLocaleString()}</span>
                </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="space-y-6">
                {/* Liabilities */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-xl font-bold text-red-700 mb-4 border-b pb-2">Liabilities</h3>
                    {data.liabilities?.accounts?.length > 0 ? (
                        data.liabilities.accounts.map((acc, i) => (
                            <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                                <span className="text-gray-700">{acc.code} - {acc.name}</span>
                                <span className="font-medium">PKR {acc.balance?.toLocaleString()}</span>
                            </div>
                        ))
                    ) : (
                        <p className="text-gray-500 py-2">No liabilities</p>
                    )}
                    <div className="flex justify-between py-3 mt-2 bg-red-50 rounded-lg px-3 font-bold text-red-700">
                        <span>Total Liabilities</span>
                        <span>PKR {data.liabilities?.total?.toLocaleString()}</span>
                    </div>
                </div>

                {/* Equity */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="text-xl font-bold text-purple-700 mb-4 border-b pb-2">Equity</h3>
                    {data.equity?.accounts?.map((acc, i) => (
                        <div key={i} className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-700">{acc.code} - {acc.name}</span>
                            <span className="font-medium">PKR {acc.balance?.toLocaleString()}</span>
                        </div>
                    ))}
                    <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-700 italic">Retained Earnings</span>
                        <span className="font-medium">PKR {data.equity?.retained_earnings?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-3 mt-2 bg-purple-50 rounded-lg px-3 font-bold text-purple-700">
                        <span>Total Equity</span>
                        <span>PKR {data.equity?.total?.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Balance Check */}
            <div className="lg:col-span-2">
                <div className={`flex justify-between items-center p-4 rounded-lg ${data.is_balanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <span className="font-bold text-lg">
                        {data.is_balanced ? '✓ Balance Sheet is Balanced' : '⚠ Balance Sheet is NOT Balanced'}
                    </span>
                    <span className="font-bold">
                        Liabilities + Equity = PKR {data.total_liabilities_equity?.toLocaleString()}
                    </span>
                </div>
            </div>
        </div>
    )
}

function TrialBalanceReport({ data }) {
    const types = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']

    return (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full">
                <thead className="bg-gray-800 text-white">
                    <tr>
                        <th className="px-6 py-3 text-left">Code</th>
                        <th className="px-6 py-3 text-left">Account Name</th>
                        <th className="px-6 py-3 text-left">Type</th>
                        <th className="px-6 py-3 text-right">Debit</th>
                        <th className="px-6 py-3 text-right">Credit</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {types.map(type => (
                        data.trial_balance?.[type]?.map((acc, i) => (
                            <tr key={`${type}-${i}`} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-mono text-sm">{acc.code}</td>
                                <td className="px-6 py-3">{acc.name}</td>
                                <td className="px-6 py-3">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${type === 'Asset' ? 'bg-blue-100 text-blue-700' :
                                        type === 'Liability' ? 'bg-red-100 text-red-700' :
                                            type === 'Equity' ? 'bg-purple-100 text-purple-700' :
                                                type === 'Revenue' ? 'bg-green-100 text-green-700' :
                                                    'bg-orange-100 text-orange-700'
                                        }`}>
                                        {type}
                                    </span>
                                </td>
                                <td className="px-6 py-3 text-right font-mono">
                                    {acc.debit > 0 ? `PKR ${acc.debit.toLocaleString()}` : '-'}
                                </td>
                                <td className="px-6 py-3 text-right font-mono">
                                    {acc.credit > 0 ? `PKR ${acc.credit.toLocaleString()}` : '-'}
                                </td>
                            </tr>
                        ))
                    ))}
                </tbody>
                <tfoot className="bg-gray-100 font-bold">
                    <tr>
                        <td colSpan="3" className="px-6 py-4">TOTALS</td>
                        <td className="px-6 py-4 text-right font-mono">PKR {data.total_debit?.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right font-mono">PKR {data.total_credit?.toLocaleString()}</td>
                    </tr>
                </tfoot>
            </table>

            <div className={`p-4 ${data.is_balanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {data.is_balanced ? '✓ Trial Balance is in balance' : '⚠ Trial Balance is NOT in balance - Please review entries'}
            </div>
        </div>
    )
}

function AgedReceivablesReport({ data }) {
    const buckets = [
        { key: 'current', label: 'Current (0-30 days)', bgClass: 'bg-green-50', borderClass: 'border-green-500', textClass: 'text-green-700', headerBg: 'bg-green-100', headerText: 'text-green-800' },
        { key: 'days_31_60', label: '31-60 days', bgClass: 'bg-yellow-50', borderClass: 'border-yellow-500', textClass: 'text-yellow-700', headerBg: 'bg-yellow-100', headerText: 'text-yellow-800' },
        { key: 'days_61_90', label: '61-90 days', bgClass: 'bg-orange-50', borderClass: 'border-orange-500', textClass: 'text-orange-700', headerBg: 'bg-orange-100', headerText: 'text-orange-800' },
        { key: 'over_90', label: 'Over 90 days', bgClass: 'bg-red-50', borderClass: 'border-red-500', textClass: 'text-red-700', headerBg: 'bg-red-100', headerText: 'text-red-800' }
    ]

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-5 gap-4">
                {buckets.map(bucket => (
                    <div key={bucket.key} className={`${bucket.bgClass} border-l-4 ${bucket.borderClass} rounded-lg p-4`}>
                        <p className="text-sm text-gray-700 font-medium">{bucket.label}</p>
                        <p className={`text-xl font-bold ${bucket.textClass}`}>
                            PKR {data[bucket.key]?.total?.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">{data[bucket.key]?.items?.length || 0} invoices</p>
                    </div>
                ))}
                <div className="bg-indigo-600 rounded-lg p-4 text-white">
                    <p className="text-sm font-medium">Grand Total</p>
                    <p className="text-xl font-bold">PKR {data.grand_total?.toLocaleString()}</p>
                </div>
            </div>

            {/* Detail Tables */}
            {buckets.map(bucket => (
                data[bucket.key]?.items?.length > 0 && (
                    <div key={bucket.key} className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className={`${bucket.headerBg} px-6 py-3 border-b`}>
                            <h4 className={`font-bold ${bucket.headerText}`}>{bucket.label}</h4>
                        </div>
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Receipt #</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Customer</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Paid</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Due</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Days</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {data[bucket.key].items.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-mono text-sm text-gray-900">{item.receipt_number}</td>
                                        <td className="px-4 py-2 text-gray-900">{item.customer_name}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-2 text-right text-gray-900">PKR {item.total?.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right text-green-600 font-medium">PKR {item.paid?.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right font-bold text-red-600">PKR {item.due?.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right text-gray-900">{item.days_old}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ))}
        </div>
    )
}

function AgedPayablesReport({ data }) {
    const buckets = [
        { key: 'current', label: 'Current (0-30 days)', bgClass: 'bg-green-50', borderClass: 'border-green-500', textClass: 'text-green-700', headerBg: 'bg-green-100', headerText: 'text-green-800' },
        { key: 'days_31_60', label: '31-60 days', bgClass: 'bg-yellow-50', borderClass: 'border-yellow-500', textClass: 'text-yellow-700', headerBg: 'bg-yellow-100', headerText: 'text-yellow-800' },
        { key: 'days_61_90', label: '61-90 days', bgClass: 'bg-orange-50', borderClass: 'border-orange-500', textClass: 'text-orange-700', headerBg: 'bg-orange-100', headerText: 'text-orange-800' },
        { key: 'over_90', label: 'Over 90 days', bgClass: 'bg-red-50', borderClass: 'border-red-500', textClass: 'text-red-700', headerBg: 'bg-red-100', headerText: 'text-red-800' }
    ]

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-5 gap-4">
                {buckets.map(bucket => (
                    <div key={bucket.key} className={`${bucket.bgClass} border-l-4 ${bucket.borderClass} rounded-lg p-4`}>
                        <p className="text-sm text-gray-700 font-medium">{bucket.label}</p>
                        <p className={`text-xl font-bold ${bucket.textClass}`}>
                            PKR {data[bucket.key]?.total?.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-600">{data[bucket.key]?.items?.length || 0} POs</p>
                    </div>
                ))}
                <div className="bg-red-600 rounded-lg p-4 text-white">
                    <p className="text-sm font-medium">Grand Total</p>
                    <p className="text-xl font-bold">PKR {data.grand_total?.toLocaleString()}</p>
                </div>
            </div>

            {/* Detail Tables */}
            {buckets.map(bucket => (
                data[bucket.key]?.items?.length > 0 && (
                    <div key={bucket.key} className="bg-white rounded-xl shadow-sm overflow-hidden">
                        <div className={`${bucket.headerBg} px-6 py-3 border-b`}>
                            <h4 className={`font-bold ${bucket.headerText}`}>{bucket.label}</h4>
                        </div>
                        <table className="min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">PO #</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Supplier</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Paid</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Due</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Days</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {data[bucket.key].items.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-mono text-sm text-gray-900">{item.po_number}</td>
                                        <td className="px-4 py-2 text-gray-900">{item.supplier_name}</td>
                                        <td className="px-4 py-2 text-sm text-gray-600">{new Date(item.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-2 text-right text-gray-900">PKR {item.total?.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right text-green-600 font-medium">PKR {item.paid?.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right font-bold text-red-600">PKR {item.due?.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-right text-gray-900">{item.days_old}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )
            ))}
        </div>
    )
}

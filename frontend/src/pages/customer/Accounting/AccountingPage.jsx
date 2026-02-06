import { useState, useEffect } from 'react'
import { Badge, StatCard, EmptyState } from '../../../components/UIComponents'
import api from '../../../services/api'
import { useToast } from '../../../components/Toast'
import ReportsPage from './ReportsPage'

export default function AccountingPage() {
    const [accounts, setAccounts] = useState([])
    const [journalEntries, setJournalEntries] = useState([])
    const [activeTab, setActiveTab] = useState('journal')
    const [showModal, setShowModal] = useState(false)
    const [modalMode, setModalMode] = useState('create') // 'create', 'edit', 'view'
    const [selectedEntry, setSelectedEntry] = useState(null)
    const [loading, setLoading] = useState(true)
    const toast = useToast()

    useEffect(() => {
        loadData()
    }, [activeTab])

    // Always load accounts for journal entry form
    useEffect(() => {
        loadAccounts()
    }, [])

    const loadAccounts = async () => {
        try {
            const res = await api.get('/accounting/accounts')
            setAccounts(res.data || [])
        } catch (error) {
            console.error('Error loading accounts:', error)
        }
    }

    const loadData = async () => {
        setLoading(true)
        try {
            if (activeTab === 'accounts') {
                const res = await api.get('/accounting/accounts')
                setAccounts(res.data || [])
            } else {
                const res = await api.get('/accounting/journal')
                setJournalEntries(res.data || [])
            }
        } catch (error) {
            console.error('Error loading data:', error)
            toast.error('Failed to load accounting data')
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (data) => {
        try {
            if (activeTab === 'accounts') {
                await api.post('/accounting/accounts', data)
            } else {
                await api.post('/accounting/journal', data)
            }
            toast.success('Created successfully')
            setShowModal(false)
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create')
        }
    }

    const handleUpdate = async (data) => {
        try {
            await api.put(`/accounting/journal/${selectedEntry._id}`, data)
            toast.success('Updated successfully')
            setShowModal(false)
            setSelectedEntry(null)
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update')
        }
    }

    const handleDelete = async (entryId) => {
        if (!window.confirm('Are you sure you want to delete this journal entry? This will reverse the account balances.')) {
            return
        }
        try {
            await api.delete(`/accounting/journal/${entryId}`)
            toast.success('Deleted successfully')
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete')
        }
    }

    const openViewModal = (entry) => {
        setSelectedEntry(entry)
        setModalMode('view')
        setShowModal(true)
    }

    const openEditModal = (entry) => {
        setSelectedEntry(entry)
        setModalMode('edit')
        setShowModal(true)
    }

    const openCreateModal = () => {
        setSelectedEntry(null)
        setModalMode('create')
        setShowModal(true)
    }

    // Calculate totals for accounts by type
    const getAccountTotals = () => {
        const totals = { Asset: 0, Liability: 0, Equity: 0, Revenue: 0, Expense: 0 }
        accounts.forEach(acc => {
            if (totals[acc.type] !== undefined) {
                totals[acc.type] += acc.balance || 0
            }
        })
        return totals
    }

    // Get account name by ID or use stored values
    const getAccountName = (line) => {
        // If line has account_id, try to look it up
        if (line.account_id) {
            const account = accounts.find(a => a._id === line.account_id)
            if (account) return `${account.code} - ${account.name}`
        }
        // Fall back to stored account_code and account_name
        if (line.account_code && line.account_name) {
            return `${line.account_code} - ${line.account_name}`
        }
        if (line.account_name) return line.account_name
        return 'Unknown Account'
    }

    const totals = getAccountTotals()

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">📊 Accounting</h1>
                <button onClick={openCreateModal} className="btn-primary">
                    {activeTab === 'accounts' ? '+ Add Account' : '+ New Journal Entry'}
                </button>
            </div>

            {/* Summary Cards */}
            {accounts.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4">
                        <p className="text-sm text-blue-600 font-medium">Assets</p>
                        <p className="text-xl font-bold text-blue-800">PKR {totals.Asset.toLocaleString()}</p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4">
                        <p className="text-sm text-red-600 font-medium">Liabilities</p>
                        <p className="text-xl font-bold text-red-800">PKR {totals.Liability.toLocaleString()}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                        <p className="text-sm text-purple-600 font-medium">Equity</p>
                        <p className="text-xl font-bold text-purple-800">PKR {totals.Equity.toLocaleString()}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4">
                        <p className="text-sm text-green-600 font-medium">Revenue</p>
                        <p className="text-xl font-bold text-green-800">PKR {totals.Revenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4">
                        <p className="text-sm text-orange-600 font-medium">Expenses</p>
                        <p className="text-xl font-bold text-orange-800">PKR {totals.Expense.toLocaleString()}</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('journal')}
                        className={`${activeTab === 'journal' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        📝 Journal Entries
                    </button>
                    <button
                        onClick={() => setActiveTab('accounts')}
                        className={`${activeTab === 'accounts' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        📋 Chart of Accounts
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`${activeTab === 'reports' ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2`}
                    >
                        📊 Financial Reports
                    </button>
                </nav>
            </div>

            {loading ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-12 bg-white rounded shadow"></div>
                    <div className="h-12 bg-white rounded shadow"></div>
                </div>
            ) : (
                <>
                    {activeTab === 'accounts' && (
                        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {accounts.length === 0 ? (
                                        <tr><td colSpan="4"><EmptyState message="No accounts found. Add your first account to get started." /></td></tr>
                                    ) : accounts.map(account => (
                                        <tr key={account._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded font-mono text-sm">{account.code}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Badge variant={
                                                    account.type === 'Asset' ? 'primary' :
                                                        account.type === 'Liability' ? 'danger' :
                                                            account.type === 'Revenue' ? 'success' :
                                                                account.type === 'Expense' ? 'warning' : 'default'
                                                }>{account.type}</Badge>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                                                PKR {(account.balance || 0).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'journal' && (
                        <div className="bg-white shadow-lg rounded-xl overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {journalEntries.length === 0 ? (
                                        <tr><td colSpan="5"><EmptyState message="No journal entries. Create your first entry using the button above." /></td></tr>
                                    ) : journalEntries.map(entry => (
                                        <tr key={entry._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openViewModal(entry)}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(entry.date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                                                    {entry.reference || `JE-${entry._id?.slice(-6)}`}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-900">
                                                {entry.description}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                                                PKR {(entry.total_amount || 0).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => openViewModal(entry)}
                                                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                                                    >
                                                        👁 View
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(entry)}
                                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(entry._id)}
                                                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                    >
                                                        🗑 Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'reports' && (
                        <ReportsPage />
                    )}
                </>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center">
                        <div className="fixed inset-0 transition-opacity" onClick={() => { setShowModal(false); setSelectedEntry(null); }}>
                            <div className="absolute inset-0 bg-gray-900 opacity-50"></div>
                        </div>

                        <div className="inline-block bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 w-full max-w-3xl relative z-10">
                            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">
                                    {activeTab === 'accounts' ? '📋 New Account' :
                                        modalMode === 'view' ? '📄 Journal Entry Details' :
                                            modalMode === 'edit' ? '✏️ Edit Journal Entry' : '📝 New Journal Entry'}
                                </h3>
                                <button onClick={() => { setShowModal(false); setSelectedEntry(null); }} className="text-white hover:text-gray-200">
                                    ✕
                                </button>
                            </div>
                            <div className="p-6">
                                {modalMode === 'view' && selectedEntry ? (
                                    <JournalEntryDetail
                                        entry={selectedEntry}
                                        accounts={accounts}
                                        getAccountName={getAccountName}
                                        onEdit={() => setModalMode('edit')}
                                        onClose={() => { setShowModal(false); setSelectedEntry(null); }}
                                    />
                                ) : (
                                    <CreateForm
                                        type={activeTab}
                                        mode={modalMode}
                                        accounts={accounts}
                                        initialData={selectedEntry}
                                        onSubmit={modalMode === 'edit' ? handleUpdate : handleCreate}
                                        onCancel={() => { setShowModal(false); setSelectedEntry(null); }}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function JournalEntryDetail({ entry, accounts, getAccountName, onEdit, onClose }) {
    const totalDebit = entry.lines?.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0) || 0
    const totalCredit = entry.lines?.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0) || 0

    return (
        <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="text-lg font-bold text-gray-900">{new Date(entry.date).toLocaleDateString()}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500">Reference</p>
                    <p className="text-lg font-bold text-gray-900">{entry.reference || `JE-${entry._id?.slice(-6)}`}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-lg font-bold text-indigo-600">PKR {(entry.total_amount || 0).toLocaleString()}</p>
                </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500">Description</p>
                <p className="text-gray-900">{entry.description}</p>
            </div>

            {/* Line Items */}
            <div>
                <h4 className="font-bold text-gray-900 mb-3">📋 Line Items</h4>
                <div className="border rounded-xl overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {entry.lines?.map((line, idx) => (
                                <tr key={idx}>
                                    <td className="px-4 py-3 text-sm text-gray-900">
                                        {getAccountName(line)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                        {parseFloat(line.debit) > 0 ? `PKR ${parseFloat(line.debit).toLocaleString()}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                        {parseFloat(line.credit) > 0 ? `PKR ${parseFloat(line.credit).toLocaleString()}` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-100">
                            <tr>
                                <td className="px-4 py-3 text-sm font-bold text-gray-700">Totals</td>
                                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                                    PKR {totalDebit.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                                    PKR {totalCredit.toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between bg-green-50 rounded-xl p-4">
                <div className="flex items-center gap-2">
                    <span className="text-green-600">✅</span>
                    <span className="text-green-700 font-medium">Entry is balanced and posted</span>
                </div>
                <Badge variant="success">Posted</Badge>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
                <button onClick={onClose} className="btn-secondary">Close</button>
                <button onClick={onEdit} className="btn-primary">✏️ Edit Entry</button>
            </div>
        </div>
    )
}

function CreateForm({ type, mode, accounts, initialData, onSubmit, onCancel }) {
    const [formData, setFormData] = useState(() => {
        if (type === 'accounts') {
            return { code: '', name: '', type: 'Asset', description: '' }
        }
        if (mode === 'edit' && initialData) {
            return {
                date: initialData.date?.split('T')[0] || new Date().toISOString().split('T')[0],
                description: initialData.description || '',
                reference: initialData.reference || '',
                lines: initialData.lines?.map(line => ({
                    account_id: line.account_id || '',
                    account_name: line.account_name || '',
                    debit: line.debit || 0,
                    credit: line.credit || 0
                })) || [
                        { account_id: '', account_name: '', debit: 0, credit: 0 },
                        { account_id: '', account_name: '', debit: 0, credit: 0 }
                    ]
            }
        }
        return {
            date: new Date().toISOString().split('T')[0],
            description: '',
            reference: '',
            lines: [
                { account_id: '', account_name: '', debit: 0, credit: 0 },
                { account_id: '', account_name: '', debit: 0, credit: 0 }
            ]
        }
    })

    const [errors, setErrors] = useState({})

    // Calculate totals
    const totalDebit = formData.lines?.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0) || 0
    const totalCredit = formData.lines?.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0) || 0
    const isBalanced = totalDebit === totalCredit && totalDebit > 0

    const addLine = () => {
        setFormData({
            ...formData,
            lines: [...formData.lines, { account_id: '', account_name: '', debit: 0, credit: 0 }]
        })
    }

    const removeLine = (index) => {
        if (formData.lines.length > 2) {
            const newLines = formData.lines.filter((_, i) => i !== index)
            setFormData({ ...formData, lines: newLines })
        }
    }

    const updateLine = (index, field, value) => {
        const newLines = [...formData.lines]
        if (field === 'account_id') {
            const selectedAccount = accounts.find(a => a._id === value)
            newLines[index] = {
                ...newLines[index],
                account_id: value,
                account_name: selectedAccount ? `${selectedAccount.code} - ${selectedAccount.name}` : ''
            }
        } else {
            newLines[index] = { ...newLines[index], [field]: value }
            // If debit is entered, clear credit and vice versa
            if (field === 'debit' && parseFloat(value) > 0) {
                newLines[index].credit = 0
            } else if (field === 'credit' && parseFloat(value) > 0) {
                newLines[index].debit = 0
            }
        }
        setFormData({ ...formData, lines: newLines })
    }

    const handleSubmit = (e) => {
        e.preventDefault()

        if (type === 'journal') {
            const newErrors = {}
            if (!formData.description) newErrors.description = 'Description is required'
            if (!isBalanced) newErrors.balance = 'Debits must equal Credits'

            const hasEmptyAccounts = formData.lines.some(line => !line.account_id)
            if (hasEmptyAccounts) newErrors.accounts = 'All lines must have an account selected'

            if (Object.keys(newErrors).length > 0) {
                setErrors(newErrors)
                return
            }

            const submitData = {
                ...formData,
                total_amount: totalDebit,
                lines: formData.lines.filter(line => line.account_id && (line.debit > 0 || line.credit > 0))
            }
            onSubmit(submitData)
        } else {
            onSubmit(formData)
        }
    }

    if (type === 'accounts') {
        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Code *</label>
                        <input
                            required
                            placeholder="e.g. 1001"
                            className="input-field"
                            value={formData.code}
                            onChange={e => setFormData({ ...formData, code: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Account Type *</label>
                        <select
                            className="input-field"
                            value={formData.type}
                            onChange={e => setFormData({ ...formData, type: e.target.value })}
                        >
                            <option value="Asset">Asset</option>
                            <option value="Liability">Liability</option>
                            <option value="Equity">Equity</option>
                            <option value="Revenue">Revenue</option>
                            <option value="Expense">Expense</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Name *</label>
                    <input
                        required
                        placeholder="e.g. Cash in Bank"
                        className="input-field"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                        placeholder="Optional description"
                        className="input-field"
                        rows={2}
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                    <button type="submit" className="btn-primary">Create Account</button>
                </div>
            </form>
        )
    }

    // Journal Entry Form
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                        type="date"
                        required
                        className="input-field"
                        value={formData.date}
                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                    />
                </div>
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                    <input
                        placeholder="e.g. INV-001"
                        className="input-field"
                        value={formData.reference}
                        onChange={e => setFormData({ ...formData, reference: e.target.value })}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                    required
                    placeholder="Describe this journal entry"
                    className="input-field"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>

            {/* Line Items */}
            <div>
                <div className="flex justify-between items-center mb-3">
                    <label className="block text-sm font-medium text-gray-700">Line Items</label>
                    <button
                        type="button"
                        onClick={addLine}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        + Add Line
                    </button>
                </div>

                {accounts.length === 0 ? (
                    <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm">
                        ⚠️ No accounts found. Please create accounts in the "Chart of Accounts" tab first.
                    </div>
                ) : (
                    <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Debit</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28">Credit</th>
                                    <th className="px-3 py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {formData.lines.map((line, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-3 py-2">
                                            <select
                                                value={line.account_id}
                                                onChange={e => updateLine(index, 'account_id', e.target.value)}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                                            >
                                                <option value="">Select Account...</option>
                                                {['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].map(acctType => {
                                                    const typeAccounts = accounts.filter(a => a.type === acctType)
                                                    if (typeAccounts.length === 0) return null
                                                    return (
                                                        <optgroup key={acctType} label={acctType}>
                                                            {typeAccounts.map(acc => (
                                                                <option key={acc._id} value={acc._id}>
                                                                    {acc.code} - {acc.name}
                                                                </option>
                                                            ))}
                                                        </optgroup>
                                                    )
                                                })}
                                            </select>
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={line.debit || ''}
                                                onChange={e => updateLine(index, 'debit', parseFloat(e.target.value) || 0)}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                                                placeholder="0.00"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={line.credit || ''}
                                                onChange={e => updateLine(index, 'credit', parseFloat(e.target.value) || 0)}
                                                className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-indigo-200 focus:border-indigo-500"
                                                placeholder="0.00"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            {formData.lines.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeLine(index)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-100">
                                <tr>
                                    <td className="px-3 py-2 text-right font-medium text-gray-700">Totals:</td>
                                    <td className="px-3 py-2 text-right font-bold text-gray-900">
                                        {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-3 py-2 text-right font-bold text-gray-900">
                                        {totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {errors.accounts && <p className="text-red-500 text-xs mt-1">{errors.accounts}</p>}
            </div>

            {/* Balance Check */}
            <div className={`p-3 rounded-lg flex items-center gap-2 ${isBalanced ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {isBalanced ? (
                    <>
                        <span className="text-lg">✅</span>
                        <span className="font-medium">Entry is balanced</span>
                    </>
                ) : (
                    <>
                        <span className="text-lg">⚠️</span>
                        <span className="font-medium">
                            Difference: PKR {Math.abs(totalDebit - totalCredit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                    </>
                )}
            </div>
            {errors.balance && <p className="text-red-500 text-xs">{errors.balance}</p>}

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                <button
                    type="submit"
                    disabled={!isBalanced || accounts.length === 0}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {mode === 'edit' ? 'Update Entry' : 'Post Journal Entry'}
                </button>
            </div>
        </form>
    )
}

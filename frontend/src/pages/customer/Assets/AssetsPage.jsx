import { useState, useEffect } from 'react'
import { Badge, EmptyState } from '../../../components/UIComponents'
import api from '../../../services/api'
import { useToast } from '../../../components/Toast'

export default function AssetsPage() {
    const [assets, setAssets] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [loading, setLoading] = useState(true)
    const toast = useToast()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const res = await api.get('/assets/registry')
            setAssets(res.data || [])
        } catch (error) {
            console.error('Error loading assets:', error)
            toast.error('Failed to load assets')
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (data) => {
        try {
            await api.post('/assets/registry', data)
            toast.success('Asset created successfully')
            setShowModal(false)
            loadData()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create asset')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Fixed Assets</h1>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    Register Asset
                </button>
            </div>

            {loading ? (
                <div className="animate-pulse space-y-4">
                    <div className="h-12 bg-white rounded shadow"></div>
                </div>
            ) : (
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {assets.length === 0 ? (
                                <tr><td colSpan="5"><EmptyState message="No assets registered" /></td></tr>
                            ) : assets.map(asset => (
                                <tr key={asset._id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                                        <div className="text-sm text-gray-500">{asset.serial_number}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {asset.category}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        PKR {asset.purchase_cost?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(asset.purchase_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge variant={asset.status === 'active' ? 'success' : 'default'}>
                                            {asset.status}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-10 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" onClick={() => setShowModal(false)}>
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Register New Asset</h3>
                                <CreateForm onSubmit={handleCreate} onCancel={() => setShowModal(false)} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function CreateForm({ onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        name: '', category: 'Equipment', purchase_cost: '', purchase_date: new Date().toISOString().split('T')[0], serial_number: ''
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        onSubmit(formData)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input required placeholder="Asset Name" className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            <select className="input-field" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                <option value="Equipment">Equipment</option>
                <option value="Furniture">Furniture</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Computers">Computers</option>
                <option value="Building">Building</option>
            </select>
            <input required placeholder="Serial Number" className="input-field" value={formData.serial_number} onChange={e => setFormData({ ...formData, serial_number: e.target.value })} />
            <input type="number" required placeholder="Purchase Cost" className="input-field" value={formData.purchase_cost} onChange={e => setFormData({ ...formData, purchase_cost: e.target.value })} />
            <input type="date" required className="input-field" value={formData.purchase_date} onChange={e => setFormData({ ...formData, purchase_date: e.target.value })} />

            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Register</button>
            </div>
        </form>
    )
}

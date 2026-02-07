import { useState, useEffect } from 'react'
import api from '../../../services/api'
import { useToast } from '../../../components/Toast'
import { Badge } from '../../../components/UIComponents'

const ROLES = [
    { id: 'admin', name: 'Admin', description: 'Full access to all modules + Activity Logs & Settings' },
    { id: 'sales_manager', name: 'Sales Manager', modules: ['pos', 'sales', 'inventory'] },
    { id: 'inventory_manager', name: 'Inventory Manager', modules: ['inventory', 'purchase'] },
    { id: 'hr_manager', name: 'HR Manager', modules: ['hr'] },
    { id: 'accountant', name: 'Accountant', modules: ['accounting', 'assets'] },
    { id: 'production_manager', name: 'Production Manager', modules: ['manufacturing', 'inventory'] },
    { id: 'custom', name: 'Custom', description: 'Select specific permissions' }
]

// Available modules for custom role assignment
// Note: Activity Logs & Settings are admin-only features, not modules
const ALL_MODULES = [
    { id: 'pos', name: 'Point of Sale', description: 'Process sales transactions' },
    { id: 'inventory', name: 'Inventory', description: 'Manage products & stock' },
    { id: 'sales', name: 'Sales & CRM', description: 'Customers & invoices' },
    { id: 'purchase', name: 'Purchase', description: 'Suppliers & orders' },
    { id: 'hr', name: 'HR & Payroll', description: 'Employees & attendance' },
    { id: 'accounting', name: 'Accounting', description: 'Accounts & journal entries' },
    { id: 'manufacturing', name: 'Manufacturing', description: 'BOMs & work orders' },
    { id: 'assets', name: 'Assets', description: 'Asset registry' }
]

export default function EmployeesPage() {
    const toast = useToast()
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showUserModal, setShowUserModal] = useState(false)
    const [isEditingUser, setIsEditingUser] = useState(false)
    const [selectedEmployee, setSelectedEmployee] = useState(null)
    const [editingEmployee, setEditingEmployee] = useState(null)
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        salary: 0
    })
    const [userFormData, setUserFormData] = useState({
        email: '',
        username: '',
        password: '',
        confirm_password: '',
        role: 'admin',
        allowed_modules: []
    })

    useEffect(() => {
        loadEmployees()
    }, [])

    const loadEmployees = async () => {
        try {
            const response = await api.get('/hr/employees')
            setEmployees(response.data.employees || [])
        } catch (error) {
            if (error.response?.status === 403) {
                toast.error('HR module not enabled in your plan')
            } else {
                toast.error('Failed to load employees')
            }
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            if (editingEmployee) {
                await api.put(`/hr/employees/${editingEmployee._id}`, formData)
                toast.success('Employee updated')
            } else {
                await api.post('/hr/employees', formData)
                toast.success('Employee created')
            }
            setShowModal(false)
            resetForm()
            loadEmployees()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Operation failed')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Delete this employee? This will also delete their user account if it exists.')) return
        try {
            await api.delete(`/hr/employees/${id}`)
            toast.success('Employee deleted')
            loadEmployees()
        } catch (error) {
            toast.error('Failed to delete employee')
        }
    }

    const handleEdit = (employee) => {
        setEditingEmployee(employee)
        setFormData({
            first_name: employee.first_name,
            last_name: employee.last_name,
            email: employee.email || '',
            phone: employee.phone || '',
            department: employee.department || '',
            position: employee.position || '',
            salary: employee.salary || 0
        })
        setShowModal(true)
    }

    const handleCreateUser = (employee) => {
        setSelectedEmployee(employee)
        setIsEditingUser(false)
        setUserFormData({
            email: employee.email || '',
            username: employee.email?.split('@')[0] || '',
            password: '',
            confirm_password: '',
            role: 'admin',
            allowed_modules: []
        })
        setShowUserModal(true)
    }

    const handleEditUser = async (employee) => {
        try {
            const response = await api.get(`/hr/employees/${employee._id}/user`)
            const user = response.data.user
            setSelectedEmployee(employee)
            setIsEditingUser(true)
            setUserFormData({
                email: user.email || '',
                username: user.username || '',
                password: '',
                confirm_password: '',
                role: user.role || 'admin',
                allowed_modules: user.allowed_modules || []
            })
            setShowUserModal(true)
        } catch (error) {
            toast.error('Failed to load user details')
        }
    }

    const handleUserSubmit = async (e) => {
        e.preventDefault()

        if (userFormData.password && userFormData.password !== userFormData.confirm_password) {
            toast.error('Passwords do not match')
            return
        }

        if (!isEditingUser && userFormData.password.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        try {
            if (isEditingUser) {
                // Only send fields that have values
                const updateData = { role: userFormData.role, allowed_modules: userFormData.allowed_modules }
                if (userFormData.username) updateData.username = userFormData.username
                if (userFormData.password) {
                    updateData.password = userFormData.password
                    updateData.confirm_password = userFormData.confirm_password
                }
                await api.put(`/hr/employees/${selectedEmployee._id}/user`, updateData)
                toast.success('User account updated')
            } else {
                await api.post(`/hr/employees/${selectedEmployee._id}/create-user`, userFormData)
                toast.success('User account created')
            }
            setShowUserModal(false)
            loadEmployees()
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save user')
        }
    }

    const handleModuleToggle = (moduleId) => {
        setUserFormData(prev => ({
            ...prev,
            allowed_modules: prev.allowed_modules.includes(moduleId)
                ? prev.allowed_modules.filter(m => m !== moduleId)
                : [...prev.allowed_modules, moduleId]
        }))
    }

    const resetForm = () => {
        setFormData({ first_name: '', last_name: '', email: '', phone: '', department: '', position: '', salary: 0 })
        setEditingEmployee(null)
    }

    const getRoleName = (roleId) => {
        const role = ROLES.find(r => r.id === roleId)
        return role ? role.name : roleId
    }

    const getRoleBadges = (employee) => {
        if (!employee.user_details) return null;

        const details = employee.user_details;

        return (
            <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">User:</span>
                    <span className="text-sm font-mono text-gray-800">{details.username}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">Role:</span>
                    <Badge variant="purple">{getRoleName(details.role)}</Badge>
                </div>
                {details.role === 'custom' && details.allowed_modules && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {details.allowed_modules.slice(0, 3).map(mod => (
                            <span key={mod} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 uppercase">
                                {mod}
                            </span>
                        ))}
                        {details.allowed_modules.length > 3 && (
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200">
                                +{details.allowed_modules.length - 3}
                            </span>
                        )}
                    </div>
                )}
            </div>
        )
    }

    if (loading) {
        return <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-900">Employees</h2>
                <button onClick={() => setShowModal(true)} className="btn-primary">
                    Add Employee
                </button>
            </div>

            {/* Info box about login */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-blue-800 text-sm">
                    💡 <strong>Employee Login:</strong> Employees with user accounts can login at <code className="bg-blue-100 px-1 rounded">/customer/login</code> using their username/email and password.
                </p>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User Account</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {employees.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                                    No employees found. Add your first employee!
                                </td>
                            </tr>
                        ) : (
                            employees.map((employee) => (
                                <tr key={employee._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{employee.first_name} {employee.last_name}</div>
                                        <div className="text-xs text-mono text-gray-500 mb-1">{employee.employee_id}</div>
                                        <div className="text-xs text-gray-500">{employee.email || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">{employee.position || '-'}</div>
                                        <div className="text-xs text-gray-500">{employee.department || '-'}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {employee.has_user_account ? (
                                            <div className="space-y-2">
                                                {getRoleBadges(employee)}
                                                <button
                                                    onClick={() => handleEditUser(employee)}
                                                    className="text-xs text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1 mt-1"
                                                >
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                                    Edit Account
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleCreateUser(employee)}
                                                className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded hover:bg-teal-200 transition flex items-center gap-1"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
                                                Create User
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium">
                                        <div className="flex gap-3">
                                            <button onClick={() => handleEdit(employee)} className="text-primary-600 hover:text-primary-900">
                                                Edit Info
                                            </button>
                                            <button onClick={() => handleDelete(employee._id)} className="text-red-600 hover:text-red-900">
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Employee Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6">
                        <h3 className="text-2xl font-bold mb-4">{editingEmployee ? 'Edit Employee' : 'Add Employee'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name *</label>
                                    <input type="text" required value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name *</label>
                                    <input type="text" required value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                    <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                                    <input type="text" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                                    <input type="text" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className="input-field" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Salary</label>
                                    <input type="number" value={formData.salary} onChange={(e) => setFormData({ ...formData, salary: parseFloat(e.target.value) })} className="input-field" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">Cancel</button>
                                <button type="submit" className="btn-primary">{editingEmployee ? 'Update' : 'Create'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Create/Edit User Account Modal */}
            {showUserModal && selectedEmployee && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-2xl font-bold mb-2">
                            {isEditingUser ? 'Edit User Account' : 'Create User Account'}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            For: <strong>{selectedEmployee.first_name} {selectedEmployee.last_name}</strong>
                        </p>

                        <form onSubmit={handleUserSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Email {!isEditingUser && '*'}
                                    </label>
                                    <input
                                        type="email"
                                        required={!isEditingUser}
                                        disabled={isEditingUser}
                                        value={userFormData.email}
                                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                                        className={`input-field ${isEditingUser ? 'bg-gray-100' : ''}`}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Username {!isEditingUser && '*'}
                                    </label>
                                    <input
                                        type="text"
                                        required={!isEditingUser}
                                        value={userFormData.username}
                                        onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Password {!isEditingUser && '*'}
                                        {isEditingUser && <span className="text-gray-400 font-normal"> (leave blank to keep current)</span>}
                                    </label>
                                    <input
                                        type="password"
                                        required={!isEditingUser}
                                        value={userFormData.password}
                                        onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Confirm Password {!isEditingUser && '*'}
                                    </label>
                                    <input
                                        type="password"
                                        required={!isEditingUser && userFormData.password}
                                        value={userFormData.confirm_password}
                                        onChange={(e) => setUserFormData({ ...userFormData, confirm_password: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                                <select
                                    value={userFormData.role}
                                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value, allowed_modules: [] })}
                                    className="input-field"
                                >
                                    {ROLES.map(role => (
                                        <option key={role.id} value={role.id}>
                                            {role.name} {role.modules ? `(${role.modules.join(', ')})` : role.description ? `- ${role.description}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Custom Permissions */}
                            {userFormData.role === 'custom' && (
                                <div className="border rounded-lg p-4 bg-gray-50">
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Select Module Permissions</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {ALL_MODULES.map(module => (
                                            <label
                                                key={module.id}
                                                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${userFormData.allowed_modules.includes(module.id)
                                                    ? 'bg-primary-50 border-primary-300'
                                                    : 'bg-white border-gray-200 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={userFormData.allowed_modules.includes(module.id)}
                                                    onChange={() => handleModuleToggle(module.id)}
                                                    className="mt-1"
                                                />
                                                <div>
                                                    <div className="font-medium text-gray-900">{module.name}</div>
                                                    <div className="text-xs text-gray-500">{module.description}</div>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    {/* Note about admin-only features */}
                                    <p className="text-xs text-gray-500 mt-3 italic">
                                        Note: Activity Logs & Settings are admin-only features.
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowUserModal(false)} className="btn-secondary">
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {isEditingUser ? 'Update User' : 'Create User Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

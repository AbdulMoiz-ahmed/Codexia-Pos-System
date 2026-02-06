export function EmptyState({ icon, title, description, action }) {
    return (
        <div className="text-center py-12">
            <div className="flex justify-center mb-4">
                {icon || (
                    <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                )}
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
            {description && <p className="text-gray-500 mb-4">{description}</p>}
            {action}
        </div>
    )
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) {
    if (!isOpen) return null

    const buttonStyles = {
        danger: 'bg-red-600 hover:bg-red-700 text-white',
        warning: 'bg-yellow-600 hover:bg-yellow-700 text-white',
        primary: 'bg-primary-600 hover:bg-primary-700 text-white'
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button onClick={onClose} className="btn-secondary">
                        {cancelText}
                    </button>
                    <button onClick={onConfirm} className={`px-4 py-2 rounded-lg font-medium transition-colors ${buttonStyles[type]}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}

export function Badge({ children, variant = 'default' }) {
    const variants = {
        default: 'bg-gray-100 text-gray-800',
        primary: 'bg-blue-100 text-blue-800',
        success: 'bg-green-100 text-green-800',
        warning: 'bg-yellow-100 text-yellow-800',
        danger: 'bg-red-100 text-red-800'
    }

    return (
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${variants[variant]}`}>
            {children}
        </span>
    )
}

export function StatCard({ title, value, icon, trend, trendValue }) {
    return (
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                    {trend && (
                        <p className={`text-sm mt-2 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {trend === 'up' ? '↑' : '↓'} {trendValue}
                        </p>
                    )}
                </div>
                {icon && (
                    <div className="bg-primary-100 p-3 rounded-full">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    )
}

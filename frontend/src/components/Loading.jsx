export function LoadingSkeleton({ rows = 5 }) {
    return (
        <div className="animate-pulse space-y-4">
            {[...Array(rows)].map((_, i) => (
                <div key={i} className="flex gap-4">
                    <div className="h-12 bg-gray-200 rounded w-full"></div>
                </div>
            ))}
        </div>
    )
}

export function CardSkeleton() {
    return (
        <div className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
    )
}

export function TableSkeleton({ rows = 5, cols = 6 }) {
    return (
        <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {[...Array(cols)].map((_, i) => (
                            <th key={i} className="px-6 py-3">
                                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {[...Array(rows)].map((_, i) => (
                        <tr key={i}>
                            {[...Array(cols)].map((_, j) => (
                                <td key={j} className="px-6 py-4">
                                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

export function Spinner({ size = 'md' }) {
    const sizes = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
        xl: 'h-16 w-16'
    }

    return (
        <div className="flex items-center justify-center">
            <div className={`animate-spin rounded-full border-b-2 border-primary-600 ${sizes[size]}`}></div>
        </div>
    )
}

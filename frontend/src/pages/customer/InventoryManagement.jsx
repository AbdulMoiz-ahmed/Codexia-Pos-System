import { useState, useEffect } from 'react'
import { useToast } from '../../components/Toast'
import { EmptyState } from '../../components/UIComponents'
import api from '../../services/api'

export default function InventoryManagement() {
    const toast = useToast()
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [showProductModal, setShowProductModal] = useState(false)
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [showAdjustModal, setShowAdjustModal] = useState(false)
    const [editingProduct, setEditingProduct] = useState(null)
    const [editingCategory, setEditingCategory] = useState(null)
    const [adjustingProduct, setAdjustingProduct] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [activeTab, setActiveTab] = useState('products')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [productsRes, categoriesRes, statsRes] = await Promise.all([
                api.get('/inventory/products'),
                api.get('/inventory/categories'),
                api.get('/inventory/stats')
            ])
            setProducts(productsRes.data || [])
            setCategories(categoriesRes.data.categories || [])
            setStats(statsRes.data)
        } catch (error) {
            toast.error('Failed to load inventory data')
        } finally {
            setLoading(false)
        }
    }

    const handleCreateProduct = () => {
        setEditingProduct(null)
        setShowProductModal(true)
    }

    const handleEditProduct = (product) => {
        setEditingProduct(product)
        setShowProductModal(true)
    }

    const handleDeleteProduct = async (id) => {
        if (confirm('Delete this product?')) {
            try {
                await api.delete(`/inventory/products/${id}`)
                setProducts(products.filter(p => p._id !== id))
                toast.success('Product deleted')
                loadData()
            } catch (error) {
                toast.error('Failed to delete product')
            }
        }
    }

    const handleAdjustStock = (product) => {
        setAdjustingProduct(product)
        setShowAdjustModal(true)
    }

    const handleCreateCategory = () => {
        setEditingCategory(null)
        setShowCategoryModal(true)
    }

    const handleEditCategory = (category) => {
        setEditingCategory(category)
        setShowCategoryModal(true)
    }

    const handleDeleteCategory = async (id) => {
        if (confirm('Delete this category?')) {
            try {
                await api.delete(`/inventory/categories/${id}`)
                toast.success('Category deleted')
                loadData()
            } catch (error) {
                toast.error(error.response?.data?.error || 'Failed to delete category')
            }
        }
    }

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = !categoryFilter || p.category === categoryFilter
        return matchesSearch && matchesCategory
    })

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div>
            {/* Stats Cards */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6">
                    <StatCard title="Total Products" value={stats.total_products} color="blue" />
                    <StatCard title="Low Stock" value={stats.low_stock_count} color="yellow" />
                    <StatCard title="Out of Stock" value={stats.out_of_stock} color="red" />
                    <StatCard title="Stock Value" value={`PKR ${stats.total_stock_value?.toLocaleString()}`} color="green" />
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 sm:gap-4 mb-4 sm:mb-6 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('products')}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'products'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    Products
                </button>
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'categories'
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    Categories
                </button>
            </div>

            {activeTab === 'products' ? (
                <>
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Products</h2>
                        </div>
                        <button onClick={handleCreateProduct} className="btn-primary whitespace-nowrap">
                            + Add Product
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4 sm:mb-6">
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <input
                                type="text"
                                placeholder="Search products by name or SKU..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input-field flex-1"
                            />
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="input-field w-48"
                            >
                                <option value="">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat._id} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Products Table */}
                    <div className="bg-white rounded-lg shadow overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">SKU</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Category</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Price</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Cost</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                                    <th className="px-2 sm:px-4 lg:px-6 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-2 sm:px-6 py-12">
                                            <EmptyState
                                                title="No products found"
                                                description="Add your first product to get started"
                                                action={
                                                    <button onClick={handleCreateProduct} className="btn-primary mt-4">
                                                        Add Product
                                                    </button>
                                                }
                                            />
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map(product => (
                                        <tr key={product._id} className="hover:bg-gray-50">
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
                                                <div className="font-medium text-gray-900 text-sm">{product.name}</div>
                                                {product.barcode && (
                                                    <div className="text-xs text-gray-400">{product.barcode}</div>
                                                )}
                                            </td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500 hidden sm:table-cell">{product.sku}</td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 hidden lg:table-cell">
                                                <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                                                    {product.category || 'Uncategorized'}
                                                </span>
                                            </td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 hidden sm:table-cell">
                                                PKR {product.price?.toLocaleString()}
                                            </td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4 text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                                                PKR {product.cost?.toLocaleString()}
                                            </td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full inline-block ${product.stock <= 0
                                                    ? 'bg-red-100 text-red-800'
                                                    : product.stock <= (product.min_stock || 10)
                                                        ? 'bg-yellow-100 text-yellow-800'
                                                        : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {product.stock}
                                                </span>
                                            </td>
                                            <td className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
                                                <div className="flex gap-1 sm:gap-2">
                                                    <button
                                                        onClick={() => handleAdjustStock(product)}
                                                        className="text-blue-600 hover:text-blue-900 px-1 py-1 text-xs"
                                                        title="Adjust Stock"
                                                    >
                                                        ±
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditProduct(product)}
                                                        className="text-primary-600 hover:text-primary-900 px-1 py-1 text-xs"
                                                        title="Edit"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteProduct(product._id)}
                                                        className="text-red-600 hover:text-red-900 px-1 py-1 text-xs"
                                                        title="Delete"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <>
                    {/* Categories Tab */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Categories</h2>
                        <button onClick={handleCreateCategory} className="btn-primary whitespace-nowrap">
                            + Add Category
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {categories.length === 0 ? (
                            <div className="col-span-1 sm:col-span-2 lg:col-span-3 bg-white rounded-lg shadow p-8 sm:p-12">
                                <EmptyState
                                    title="No categories"
                                    description="Create categories to organize your products"
                                    action={
                                        <button onClick={handleCreateCategory} className="btn-primary mt-4">
                                            Add Category
                                        </button>
                                    }
                                />
                            </div>
                        ) : (
                            categories.map(category => (
                                <div key={category._id} className="bg-white rounded-lg shadow p-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div
                                            className="w-4 h-4 rounded-full"
                                            style={{ backgroundColor: category.color || '#6366f1' }}
                                        />
                                        <h3 className="font-semibold text-gray-900">{category.name}</h3>
                                    </div>
                                    {category.description && (
                                        <p className="text-sm text-gray-500 mb-3">{category.description}</p>
                                    )}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEditCategory(category)}
                                            className="text-sm text-primary-600 hover:text-primary-900"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCategory(category._id)}
                                            className="text-sm text-red-600 hover:text-red-900"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            )}

            {/* Product Modal */}
            {showProductModal && (
                <ProductModal
                    product={editingProduct}
                    categories={categories}
                    onClose={() => setShowProductModal(false)}
                    onSave={async (productData) => {
                        try {
                            if (editingProduct) {
                                await api.put(`/inventory/products/${productData._id}`, productData)
                                toast.success('Product updated')
                            } else {
                                await api.post('/inventory/products', productData)
                                toast.success('Product created')
                            }
                            setShowProductModal(false)
                            loadData()
                        } catch (error) {
                            toast.error(error.response?.data?.error || 'Failed to save product')
                        }
                    }}
                />
            )}

            {/* Category Modal */}
            {showCategoryModal && (
                <CategoryModal
                    category={editingCategory}
                    onClose={() => setShowCategoryModal(false)}
                    onSave={async (categoryData) => {
                        try {
                            if (editingCategory) {
                                await api.put(`/inventory/categories/${categoryData._id}`, categoryData)
                                toast.success('Category updated')
                            } else {
                                await api.post('/inventory/categories', categoryData)
                                toast.success('Category created')
                            }
                            setShowCategoryModal(false)
                            loadData()
                        } catch (error) {
                            toast.error(error.response?.data?.error || 'Failed to save category')
                        }
                    }}
                />
            )}

            {/* Stock Adjustment Modal */}
            {showAdjustModal && adjustingProduct && (
                <StockAdjustModal
                    product={adjustingProduct}
                    onClose={() => setShowAdjustModal(false)}
                    onSave={async (adjustment, reason) => {
                        try {
                            await api.post(`/inventory/products/${adjustingProduct._id}/adjust-stock`, {
                                adjustment,
                                reason
                            })
                            toast.success('Stock adjusted successfully')
                            setShowAdjustModal(false)
                            loadData()
                        } catch (error) {
                            toast.error(error.response?.data?.error || 'Failed to adjust stock')
                        }
                    }}
                />
            )}
        </div>
    )
}

function StatCard({ title, value, color }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-700 border-blue-200',
        yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        green: 'bg-green-50 text-green-700 border-green-200'
    }

    return (
        <div className={`rounded-lg p-2 sm:p-3 lg:p-4 border ${colors[color]}`}>
            <p className="text-xs sm:text-sm font-medium opacity-75 truncate">{title}</p>
            <p className="text-sm sm:text-lg lg:text-2xl font-bold mt-1 break-words">{value}</p>
        </div>
    )
}

function ProductModal({ product, categories, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: product?.name || '',
        sku: product?.sku || '',
        category: product?.category || '',
        category_id: product?.category_id || '',
        price: product?.price || 0,
        cost: product?.cost || 0,
        stock: product?.stock || 0,
        min_stock: product?.min_stock || 10,
        barcode: product?.barcode || '',
        description: product?.description || '',
        unit: product?.unit || 'pcs',
        image: product?.image || ''
    })
    const [imageFile, setImageFile] = useState(null)
    const [imagePreview, setImagePreview] = useState(product?.image || '')
    const [uploading, setUploading] = useState(false)

    const handleCategoryChange = (categoryId) => {
        const category = categories.find(c => c._id === categoryId)
        setFormData({
            ...formData,
            category_id: categoryId,
            category: category?.name || ''
        })
    }

    const handleImageChange = (e) => {
        const file = e.target.files[0]
        if (file) {
            // Validate file type
            const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
            if (!allowedTypes.includes(file.type)) {
                alert('Invalid file type. Please upload PNG, JPG, GIF, or WebP images.')
                return
            }
            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                alert('File too large. Maximum size is 5MB.')
                return
            }
            setImageFile(file)
            setImagePreview(URL.createObjectURL(file))
        }
    }

    const removeImage = () => {
        setImageFile(null)
        setImagePreview('')
        setFormData({ ...formData, image: '' })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setUploading(true)

        let imageUrl = formData.image

        // Upload image if a new file was selected
        if (imageFile) {
            try {
                const uploadData = new FormData()
                uploadData.append('image', imageFile)

                const response = await fetch('http://localhost:5000/uploads/product-image', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    },
                    body: uploadData
                })

                if (response.ok) {
                    const result = await response.json()
                    imageUrl = result.image_url
                } else {
                    console.error('Failed to upload image')
                }
            } catch (error) {
                console.error('Image upload error:', error)
            }
        }

        setUploading(false)
        onSave({ ...product, ...formData, image: imageUrl })
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">
                        {product ? 'Edit Product' : 'Add New Product'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Product Image */}
                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Product Image</label>
                        <div className="flex items-start gap-3 sm:gap-4 flex-col sm:flex-row">
                            <div className="relative flex-shrink-0">
                                {imagePreview ? (
                                    <div className="relative">
                                        <img
                                            src={imagePreview.startsWith('blob:') ? imagePreview : `http://localhost:5000${imagePreview}`}
                                            alt="Product preview"
                                            className="w-24 sm:w-32 h-24 sm:h-32 object-cover rounded-lg border border-gray-200"
                                        />
                                        <button
                                            type="button"
                                            onClick={removeImage}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-24 sm:w-32 h-24 sm:h-32 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                                        <svg className="w-8 sm:w-10 h-8 sm:h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                                    onChange={handleImageChange}
                                    className="hidden"
                                    id="product-image-input"
                                />
                                <label
                                    htmlFor="product-image-input"
                                    className="inline-flex items-center px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                                >
                                    <svg className="w-3 sm:w-4 h-3 sm:h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                    </svg>
                                    Choose Image
                                </label>
                                <p className="text-xs text-gray-500 mt-2">PNG, JPG, GIF, WebP up to 5MB</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Product Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="input-field text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">SKU *</label>
                            <input
                                type="text"
                                required
                                value={formData.sku}
                                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                className="input-field text-sm"
                                disabled={!!product}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Category</label>
                            <select
                                value={formData.category_id}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                className="input-field text-sm"
                            >
                                <option value="">Uncategorized</option>
                                {categories.map(cat => (
                                    <option key={cat._id} value={cat._id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Barcode</label>
                            <input
                                type="text"
                                value={formData.barcode}
                                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                className="input-field text-sm"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Price *</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                                className="input-field text-xs sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Cost</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.cost}
                                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                                className="input-field text-xs sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Stock *</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={formData.stock}
                                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                                className="input-field text-xs sm:text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Min Stock</label>
                            <input
                                type="number"
                                min="0"
                                value={formData.min_stock}
                                onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
                                className="input-field text-xs sm:text-sm"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="input-field text-sm"
                            rows="2"
                        />
                    </div>

                    <div className="flex justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary text-xs sm:text-sm">Cancel</button>
                        <button type="submit" className="btn-primary text-xs sm:text-sm" disabled={uploading}>
                            {uploading ? 'Uploading...' : 'Save Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function CategoryModal({ category, onClose, onSave }) {
    const [formData, setFormData] = useState({
        name: category?.name || '',
        description: category?.description || '',
        color: category?.color || '#6366f1'
    })

    const handleSubmit = (e) => {
        e.preventDefault()
        onSave({ ...category, ...formData })
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">
                        {category ? 'Edit Category' : 'Add Category'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="input-field"
                            rows="2"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                        <input
                            type="color"
                            value={formData.color}
                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                            className="h-10 w-full rounded cursor-pointer"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary">Save Category</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function StockAdjustModal({ product, onClose, onSave }) {
    const [adjustment, setAdjustment] = useState(0)
    const [reason, setReason] = useState('')

    const handleSubmit = (e) => {
        e.preventDefault()
        if (adjustment === 0) return
        onSave(adjustment, reason)
    }

    const newStock = product.stock + adjustment

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-900">Adjust Stock</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">Current Stock: {product.stock}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Adjustment (+ to add, - to remove)
                        </label>
                        <input
                            type="number"
                            value={adjustment}
                            onChange={(e) => setAdjustment(parseInt(e.target.value) || 0)}
                            className="input-field text-center text-2xl font-bold"
                        />
                    </div>

                    <div className="text-center py-2">
                        <span className="text-gray-500">New Stock: </span>
                        <span className={`text-xl font-bold ${newStock < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {newStock}
                        </span>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="input-field"
                        >
                            <option value="">Select reason...</option>
                            <option value="Received shipment">Received shipment</option>
                            <option value="Damaged goods">Damaged goods</option>
                            <option value="Inventory count">Inventory count</option>
                            <option value="Return from customer">Return from customer</option>
                            <option value="Given as sample">Given as sample</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={adjustment === 0 || newStock < 0}
                        >
                            Confirm Adjustment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

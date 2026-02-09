import api from './api'

export const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password })
        if (response.data.access_token) {
            localStorage.setItem('access_token', response.data.access_token)
            localStorage.setItem('refresh_token', response.data.refresh_token)
            localStorage.setItem('user', JSON.stringify(response.data.user))
        }
        return response.data
    },

    logout: async () => {
        try {
            await api.post('/auth/logout')
        } finally {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('user')
        }
    },

    getCurrentUser: async () => {
        const response = await api.get('/auth/me')
        return response.data
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('access_token')
    },

    getUser: () => {
        const user = localStorage.getItem('user')
        return user ? JSON.parse(user) : null
    }
}

export const adminService = {
    getDashboard: async () => {
        const response = await api.get('/admin/dashboard')
        return response.data
    },

    getTenants: async (params) => {
        const response = await api.get('/admin/tenants', { params })
        return response.data
    },

    createTenant: async (data) => {
        const response = await api.post('/admin/tenants', data)
        return response.data
    },

    updateTenant: async (id, data) => {
        const response = await api.put(`/admin/tenants/${id}`, data)
        return response.data
    },

    updateLicense: async (id, license) => {
        const response = await api.put(`/admin/tenants/${id}/license`, { license })
        return response.data
    },

    updateModules: async (id, modules) => {
        const response = await api.put(`/admin/tenants/${id}/modules`, { modules })
        return response.data
    }
}

export const publicService = {
    getPackages: async () => {
        const response = await api.get('/public/packages')
        return response.data
    },

    getPackage: async (id) => {
        const response = await api.get(`/public/packages/${id}`)
        return response.data
    },

    checkout: async (data) => {
        const response = await api.post('/public/checkout', data)
        return response.data
    }
}

export const customerService = {
    getDashboard: async () => {
        const response = await api.get('/customer/dashboard')
        return response.data
    },

    getProducts: async (params) => {
        const response = await api.get('/customer/products', { params })
        return response.data
    },

    createProduct: async (data) => {
        const response = await api.post('/customer/products', data)
        return response.data
    },

    updateProduct: async (id, data) => {
        const response = await api.put(`/customer/products/${id}`, data)
        return response.data
    },

    deleteProduct: async (id) => {
        const response = await api.delete(`/customer/products/${id}`)
        return response.data
    },

    createTransaction: async (data) => {
        const response = await api.post('/customer/transactions', data)
        return response.data
    },

    getSubscription: async () => {
        const response = await api.get('/customer/subscription')
        return response.data
    }
}

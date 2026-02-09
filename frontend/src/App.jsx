
import {
    createBrowserRouter,
    RouterProvider,
    createRoutesFromElements,
    Route,
    Navigate,
} from 'react-router-dom'
import { ToastProvider } from './components/Toast'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import CustomerLoginPage from './pages/CustomerLoginPage'
import AdminDashboard from './pages/admin/Dashboard'
import CustomerDashboard from './pages/customer/CustomerDashboard'
import CheckoutPage from './pages/CheckoutPage'
import DemoRequestPage from './pages/DemoRequestPage'
import DemoLoginPage from './pages/DemoLoginPage'
import DemoPortal from './pages/DemoPortal'

const router = createBrowserRouter(
    createRoutesFromElements(
        <>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/customer/login" element={<CustomerLoginPage />} />
            <Route path="/checkout/:packageId" element={<CheckoutPage />} />
            <Route path="/admin/*" element={<AdminDashboard />} />
            <Route path="/customer/dashboard/*" element={<CustomerDashboard />} />

            {/* Demo Portal Routes */}
            <Route path="/demo/request" element={<DemoRequestPage />} />
            <Route path="/demo/login" element={<DemoLoginPage />} />
            <Route path="/demo/portal" element={<DemoPortal />} />

            <Route path="*" element={<Navigate to="/" replace />} />
        </>
    ),
    {
        future: {
            v7_startTransition: true,
            v7_relativeSplatPath: true,
        },
    }
)

function App() {
    return (
        <ToastProvider>
            <RouterProvider router={router} />
        </ToastProvider>
    )
}

export default App


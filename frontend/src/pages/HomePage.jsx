import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { publicService } from '../services/authService'

export default function HomePage() {
    const navigate = useNavigate()
    const [packages, setPackages] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeFaq, setActiveFaq] = useState(null)

    useEffect(() => {
        loadPackages()
    }, [])

    const loadPackages = async () => {
        try {
            const data = await publicService.getPackages()
            setPackages(data.packages || [])
        } catch (error) {
            console.error('Error loading packages:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleFaq = (index) => {
        setActiveFaq(activeFaq === index ? null : index)
    }

    const faqs = [
        { question: 'What is POS software and how does it work?', answer: 'POS (Point of Sale) software is a digital system that helps businesses process transactions, manage inventory, track sales, and handle customer relationships all in one place.' },
        { question: 'Can I use this POS system for multiple locations?', answer: 'Yes, our POS system supports multi-location businesses with centralized management, inventory sync, and consolidated reporting across all your stores.' },
        { question: 'Is my data secure with your POS software?', answer: 'Absolutely! We use bank-grade encryption, secure cloud storage, and regular backups to ensure your business data is always protected.' },
        { question: 'Do you offer training and support?', answer: 'Yes, we provide comprehensive training, 24/7 customer support, and detailed documentation to help you get the most out of our software.' },
        { question: 'What payment methods are supported?', answer: 'Our POS supports cash, credit/debit cards, mobile payments, and various digital wallets to accommodate all your customers.' },
    ]

    const testimonials = [
        { name: 'Ahmed Khan', role: 'Restaurant Owner', text: 'This POS system transformed our restaurant operations. Order management is now seamless and our staff loves how easy it is to use.' },
        { name: 'Fatima Ali', role: 'Retail Store Manager', text: 'The inventory tracking feature has saved us countless hours. We never run out of stock anymore and our customers are happier.' },
        { name: 'Hassan Malik', role: 'Grocery Store Owner', text: 'Best investment for our business. The reporting features help us make better decisions every day.' },
    ]

    const industries = [
        { icon: '🍽️', name: 'Restaurants' },
        { icon: '🛒', name: 'Retail Stores' },
        { icon: '🥗', name: 'Grocery' },
        { icon: '💊', name: 'Pharmacy' },
        { icon: '👗', name: 'Fashion' },
        { icon: '⚡', name: 'Electronics' },
    ]

    const blogPosts = [
        { title: '10 Ways to Boost Your Retail Sales', category: 'Business Tips', image: '📊' },
        { title: 'The Future of POS Technology', category: 'Technology', image: '🚀' },
        { title: 'Managing Inventory Like a Pro', category: 'Guides', image: '📦' },
    ]

    return (
        <div className="min-h-screen bg-white overflow-hidden">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16 items-center">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-lg">POS</span>
                            </div>
                            <span className="text-xl font-bold text-gray-800">QuickPOS</span>
                        </div>
                        <div className="hidden md:flex items-center space-x-8">
                            <a href="#features" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">Features</a>
                            <a href="#pricing" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">Pricing</a>
                            <a href="#blog" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">Blog</a>
                            <a href="#faq" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">FAQ</a>
                            <a href="#contact" className="text-gray-600 hover:text-emerald-600 transition-colors font-medium">Contact</a>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link to="/customer/login" className="text-gray-600 hover:text-emerald-600 font-medium hidden sm:block">Login</Link>
                            <Link to="/demo/login" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold transition-all shadow-lg shadow-emerald-500/30">
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-4xl mx-auto mb-12">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
                            Maximize sales with our advanced
                            <span className="text-emerald-500"> POS software solutions</span>
                        </h1>
                        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                            Streamline your business operations with our powerful, easy-to-use point of sale system designed for modern businesses.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                to="/demo/login"
                                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold text-lg transition-all shadow-lg shadow-emerald-500/30 inline-flex items-center justify-center gap-2"
                            >
                                Get Started Free <span>→</span>
                            </Link>
                            <a
                                href="#features"
                                className="px-8 py-4 border-2 border-gray-200 text-gray-700 rounded-lg font-semibold text-lg hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                            >
                                Learn More
                            </a>
                        </div>
                    </div>

                    {/* Dashboard Mockup */}
                    <div className="relative mx-auto max-w-5xl">
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-3xl p-8 shadow-2xl">
                            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                                {/* Browser Chrome */}
                                <div className="bg-gray-100 px-4 py-3 flex items-center gap-2 border-b">
                                    <div className="flex gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                    </div>
                                    <div className="flex-1 mx-4">
                                        <div className="bg-white rounded-lg px-4 py-1.5 text-sm text-gray-400">quickpos.app/dashboard</div>
                                    </div>
                                </div>
                                {/* Dashboard Content */}
                                <div className="p-6 bg-gray-50">
                                    <div className="grid grid-cols-4 gap-4 mb-6">
                                        <div className="bg-emerald-500 rounded-xl p-4 text-white">
                                            <p className="text-sm opacity-80">Today's Sales</p>
                                            <p className="text-2xl font-bold">PKR 125,000</p>
                                        </div>
                                        <div className="bg-blue-500 rounded-xl p-4 text-white">
                                            <p className="text-sm opacity-80">Orders</p>
                                            <p className="text-2xl font-bold">48</p>
                                        </div>
                                        <div className="bg-purple-500 rounded-xl p-4 text-white">
                                            <p className="text-sm opacity-80">Products</p>
                                            <p className="text-2xl font-bold">1,234</p>
                                        </div>
                                        <div className="bg-orange-500 rounded-xl p-4 text-white">
                                            <p className="text-sm opacity-80">Customers</p>
                                            <p className="text-2xl font-bold">567</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="col-span-2 bg-white rounded-xl p-4 shadow-sm">
                                            <div className="flex justify-between items-center mb-4">
                                                <span className="font-semibold text-gray-800">Sales Analytics</span>
                                                <span className="text-sm text-emerald-600">View All</span>
                                            </div>
                                            <div className="h-32 flex items-end gap-2">
                                                {[40, 65, 45, 80, 55, 75, 90, 60, 85, 70, 95, 80].map((h, i) => (
                                                    <div key={i} className="flex-1 bg-emerald-100 rounded-t" style={{ height: `${h}%` }}>
                                                        <div className="w-full bg-emerald-500 rounded-t h-1/2 mt-auto"></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-xl p-4 shadow-sm">
                                            <span className="font-semibold text-gray-800">Top Products</span>
                                            <div className="mt-4 space-y-3">
                                                {['Product A', 'Product B', 'Product C'].map((p, i) => (
                                                    <div key={i} className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 text-sm font-bold">
                                                            {i + 1}
                                                        </div>
                                                        <span className="text-sm text-gray-600">{p}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Decorative elements */}
                        <div className="absolute -top-4 -left-4 w-20 h-20 bg-emerald-200 rounded-full opacity-50 blur-xl"></div>
                        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-teal-200 rounded-full opacity-50 blur-xl"></div>
                    </div>
                </div>
            </section>

            {/* Delightfully Simple Section */}
            <section id="features" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
                                Easy to Use
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">
                                Delightfully Simple And Receptively
                                <span className="text-emerald-500"> Get Started Get System</span>
                            </h2>
                            <p className="text-lg text-gray-600 mb-8">
                                Our intuitive interface ensures your team can start using the system within minutes. No technical expertise required - just plug in and start selling.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-gray-700">Quick 5-minute setup process</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-gray-700">User-friendly touch interface</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <span className="text-gray-700">Comprehensive training included</span>
                                </li>
                            </ul>
                        </div>
                        <div className="relative">
                            <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl p-8 shadow-xl">
                                <div className="bg-white rounded-xl shadow-lg p-6">
                                    <div className="flex items-center justify-between mb-6">
                                        <span className="text-lg font-bold text-gray-800">Quick Sale</span>
                                        <span className="text-emerald-600 font-semibold">PKR 2,500</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((n, i) => (
                                            <button key={i} className="bg-gray-100 hover:bg-emerald-100 rounded-lg py-3 text-lg font-medium text-gray-700 transition-colors">
                                                {n}
                                            </button>
                                        ))}
                                    </div>
                                    <button className="w-full bg-emerald-500 text-white py-3 rounded-lg font-semibold hover:bg-emerald-600 transition-colors">
                                        Complete Sale
                                    </button>
                                </div>
                            </div>
                            <div className="absolute -top-6 -right-6 w-24 h-24 bg-emerald-400 rounded-2xl -z-10 opacity-30"></div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Powerful Features Section */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
                            Features
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                            Powerful Features with
                            <span className="text-emerald-500"> Incredible Design</span>
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Everything you need to run your business efficiently, all in one powerful platform.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { icon: '🛒', title: 'Point of Sale', desc: 'Fast & intuitive POS with barcode scanning, receipt printing, and offline mode.' },
                            { icon: '📦', title: 'Inventory Management', desc: 'Real-time stock tracking, low-stock alerts, and multi-warehouse support.' },
                            { icon: '👥', title: 'Customer Management', desc: 'Customer profiles, purchase history, and loyalty program integration.' },
                            { icon: '📊', title: 'Sales Analytics', desc: 'Detailed reports, sales trends, and actionable business insights.' },
                            { icon: '💳', title: 'Payment Processing', desc: 'Accept all payment types including cards, cash, and digital wallets.' },
                            { icon: '👨‍💼', title: 'Employee Management', desc: 'Staff scheduling, performance tracking, and role-based access.' },
                        ].map((feature, i) => (
                            <div
                                key={i}
                                className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-emerald-200"
                            >
                                <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 group-hover:bg-emerald-500 transition-all">
                                    <span className="group-hover:grayscale group-hover:brightness-[10]">{feature.icon}</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                                <p className="text-gray-600">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Industries Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="relative order-2 lg:order-1">
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-8 text-white">
                                <div className="text-center mb-8">
                                    <div className="w-32 h-32 mx-auto bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                                        <span className="text-6xl">🖥️</span>
                                    </div>
                                    <h3 className="text-2xl font-bold">All-in-One POS Terminal</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/10 rounded-xl p-4 text-center">
                                        <span className="text-2xl">💳</span>
                                        <p className="text-sm mt-2">Card Payments</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-4 text-center">
                                        <span className="text-2xl">📱</span>
                                        <p className="text-sm mt-2">Mobile Pay</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-4 text-center">
                                        <span className="text-2xl">🧾</span>
                                        <p className="text-sm mt-2">Print Receipts</p>
                                    </div>
                                    <div className="bg-white/10 rounded-xl p-4 text-center">
                                        <span className="text-2xl">📊</span>
                                        <p className="text-sm mt-2">Analytics</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="order-1 lg:order-2">
                            <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
                                Industries
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">
                                Our Software Caters for
                                <span className="text-emerald-500"> Wide Range of Business and Industries</span>
                            </h2>
                            <p className="text-lg text-gray-600 mb-8">
                                Whether you run a restaurant, retail store, or service business, our flexible POS system adapts to your unique needs.
                            </p>
                            <div className="grid grid-cols-3 gap-4">
                                {industries.map((ind, i) => (
                                    <div key={i} className="bg-gray-50 hover:bg-emerald-50 rounded-xl p-4 text-center transition-colors cursor-pointer group">
                                        <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">{ind.icon}</span>
                                        <span className="text-sm text-gray-700 font-medium">{ind.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
                            Pricing
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                            Transparent Pricing Plans, Find the
                            <span className="text-emerald-500"> Perfect Fit for Your Needs</span>
                        </h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            Choose the plan that works best for your business. All plans include free updates and support.
                        </p>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-3 gap-8">
                            {packages.map((pkg, i) => (
                                <div
                                    key={pkg._id}
                                    className={`relative bg-white rounded-3xl p-8 shadow-lg transition-all hover:-translate-y-2 ${i === 1 ? 'ring-2 ring-emerald-500 scale-105' : ''
                                        }`}
                                >
                                    {i === 1 && (
                                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-500 text-white text-sm font-bold rounded-full">
                                            Most Popular
                                        </div>
                                    )}

                                    <div className="text-center mb-8">
                                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{pkg.display_name}</h3>
                                        <p className="text-gray-600 text-sm">{pkg.description}</p>
                                    </div>

                                    <div className="text-center mb-8">
                                        <span className="text-5xl font-extrabold text-gray-900">
                                            PKR {(pkg.price / 1000).toFixed(0)}K
                                        </span>
                                        <span className="text-gray-600">/{pkg.billing_cycle}</span>
                                    </div>

                                    <ul className="space-y-4 mb-8">
                                        {(pkg.features || []).slice(0, 5).map((feature, idx) => (
                                            <li key={idx} className="flex items-start gap-3">
                                                <div className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <svg className="w-3 h-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                </div>
                                                <span className="text-gray-700">{feature}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    <button
                                        onClick={() => navigate(`/checkout/${pkg._id}`)}
                                        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${i === 1
                                            ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'
                                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                                            }`}
                                    >
                                        Get Started
                                    </button>

                                    <p className="text-center text-sm text-gray-500 mt-4">
                                        🎁 {pkg.trial_days} days free trial
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            {/* Testimonials Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
                            Testimonials
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                            Voices of Delight: Testimonials from
                            <span className="text-emerald-500"> Hearts to Our Excellence</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {testimonials.map((t, i) => (
                            <div key={i} className="bg-gray-50 rounded-2xl p-8 relative">
                                <div className="absolute -top-4 left-8 text-emerald-500 text-6xl opacity-20">"</div>
                                <p className="text-gray-700 mb-6 relative z-10">{t.text}</p>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">
                                        {t.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{t.name}</p>
                                        <p className="text-sm text-gray-500">{t.role}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-3xl sm:text-4xl font-extrabold mb-6">
                        Upgrade Your Business with Our Cutting-edge POS Solutions!
                    </h2>
                    <p className="text-xl text-emerald-100 mb-8">
                        Join thousands of businesses already using our platform. Start your free trial today and see the difference.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/demo/login"
                            className="px-8 py-4 bg-white text-emerald-600 rounded-xl font-bold text-lg hover:bg-emerald-50 transition-all"
                        >
                            🚀 Start Free Trial
                        </Link>
                        <a
                            href="#contact"
                            className="px-8 py-4 border-2 border-white text-white rounded-xl font-bold text-lg hover:bg-white/10 transition-all"
                        >
                            Contact Sales
                        </a>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-20 bg-white">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
                            FAQ
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                            Have Some Questions
                            <span className="text-emerald-500"> And Answer</span>
                        </h2>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, i) => (
                            <div key={i} className="border border-gray-200 rounded-2xl overflow-hidden">
                                <button
                                    onClick={() => toggleFaq(i)}
                                    className="w-full flex justify-between items-center p-6 text-left bg-white hover:bg-gray-50 transition-colors"
                                >
                                    <span className="font-semibold text-gray-900">{faq.question}</span>
                                    <span className={`text-emerald-500 text-2xl transition-transform ${activeFaq === i ? 'rotate-45' : ''}`}>
                                        +
                                    </span>
                                </button>
                                {activeFaq === i && (
                                    <div className="px-6 pb-6 text-gray-600 bg-gray-50">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Blog Section */}
            <section id="blog" className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
                            Blog
                        </span>
                        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
                            Insights & Inspiration: Explore Our Blog
                            <span className="text-emerald-500"> for Knowledge and Ideas</span>
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {blogPosts.map((post, i) => (
                            <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow group cursor-pointer">
                                <div className="h-48 bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                                    <span className="text-6xl group-hover:scale-110 transition-transform">{post.image}</span>
                                </div>
                                <div className="p-6">
                                    <span className="text-sm text-emerald-600 font-medium">{post.category}</span>
                                    <h3 className="text-xl font-bold text-gray-900 mt-2 group-hover:text-emerald-600 transition-colors">
                                        {post.title}
                                    </h3>
                                    <a href="#" className="text-emerald-600 font-medium mt-4 inline-flex items-center gap-1 hover:gap-2 transition-all">
                                        Read More <span>→</span>
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact Section */}
            <section id="contact" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid lg:grid-cols-2 gap-16">
                        <div>
                            <span className="inline-block px-4 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium mb-4">
                                Contact
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-6">
                                Get in Touch!
                                <span className="text-emerald-500"> Reach out to us Today</span>
                            </h2>
                            <p className="text-lg text-gray-600 mb-8">
                                Have questions? Our team is here to help. Reach out and we'll get back to you within 24 hours.
                            </p>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 text-xl">
                                        📧
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Email</p>
                                        <a href="mailto:info@quickpos.app" className="text-gray-900 font-medium hover:text-emerald-600">info@quickpos.app</a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 text-xl">
                                        📞
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Phone</p>
                                        <a href="tel:+923001234567" className="text-gray-900 font-medium hover:text-emerald-600">+92 300 1234567</a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 text-xl">
                                        💬
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">WhatsApp</p>
                                        <a href="https://wa.me/923001234567" target="_blank" rel="noopener noreferrer" className="text-gray-900 font-medium hover:text-emerald-600">Chat with us</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 rounded-3xl p-8">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Send us a message</h3>
                            <form className="space-y-4">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <input type="text" placeholder="Your Name" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all" />
                                    <input type="email" placeholder="Email Address" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all" />
                                </div>
                                <input type="text" placeholder="Subject" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all" />
                                <textarea rows={4} placeholder="Your Message" className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all resize-none"></textarea>
                                <button type="submit" className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/30">
                                    Send Message
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-white pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-8 mb-12">
                        <div className="md:col-span-2">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold">POS</span>
                                </div>
                                <span className="font-bold text-lg">QuickPOS</span>
                            </div>
                            <p className="text-gray-400 mb-4 max-w-sm">
                                Modern POS software solution designed to help businesses streamline their operations and maximize sales.
                            </p>
                            <div className="flex gap-4">
                                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-emerald-600 rounded-lg flex items-center justify-center transition-colors">
                                    <span>📘</span>
                                </a>
                                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-emerald-600 rounded-lg flex items-center justify-center transition-colors">
                                    <span>📷</span>
                                </a>
                                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-emerald-600 rounded-lg flex items-center justify-center transition-colors">
                                    <span>💼</span>
                                </a>
                                <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-emerald-600 rounded-lg flex items-center justify-center transition-colors">
                                    <span>🐦</span>
                                </a>
                            </div>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Product</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                                <li><Link to="/demo/login" className="hover:text-white transition-colors">Free Trial</Link></li>
                                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-bold mb-4">Company</h4>
                            <ul className="space-y-2 text-gray-400">
                                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                                <li><a href="#contact" className="hover:text-white transition-colors">Contact</a></li>
                                <li><a href="#blog" className="hover:text-white transition-colors">Blog</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-gray-800 pt-8 text-center text-gray-500 text-sm">
                        <p>© 2026 QuickPOS. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}

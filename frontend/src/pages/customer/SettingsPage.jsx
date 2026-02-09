import { useState, useEffect } from 'react'
import api from '../../services/api'
import { useToast } from '../../components/Toast'

export default function SettingsPage() {
    const toast = useToast()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [activeTab, setActiveTab] = useState('tax')

    const [settings, setSettings] = useState({
        tax: { enabled: true, name: 'GST', rate: 17, inclusive: false },
        currency: { code: 'PKR', symbol: 'Rs.', name: 'Pakistani Rupee', decimal_places: 0, symbol_position: 'before' },
        business: { name: '', address: '', phone: '', email: '', receipt_footer: '' },
        sms: { enabled: false, provider: '', sender_id: '', api_key: '', api_secret: '' },
        invoice: { prefix: 'INV-', starting_number: 1, terms: '', notes: '' }
    })

    useEffect(() => {
        loadSettings()
    }, [])

    const loadSettings = async () => {
        try {
            const res = await api.get('/settings/')
            setSettings(res.data)
        } catch (error) {
            console.error('Error loading settings:', error)
        } finally {
            setLoading(false)
        }
    }

    const saveSettings = async (category) => {
        setSaving(true)
        try {
            await api.put(`/settings/${category}`, settings[category])
            toast.success(`${category.charAt(0).toUpperCase() + category.slice(1)} settings saved!`)
        } catch (error) {
            toast.error('Failed to save settings')
        } finally {
            setSaving(false)
        }
    }

    const updateSetting = (category, field, value) => {
        setSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [field]: value
            }
        }))
    }

    const tabs = [
        { id: 'tax', label: 'Tax Settings', icon: '💰' },
        { id: 'currency', label: 'Currency', icon: '💱' },
        { id: 'business', label: 'Business Info', icon: '🏢' },
        { id: 'sms', label: 'SMS Notifications', icon: '📱' },
        { id: 'invoice', label: 'Invoice Settings', icon: '📄' }
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
                <p className="text-gray-600 mt-1">Configure tax, currency, and other system preferences</p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="border-b">
                    <nav className="flex overflow-x-auto">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 whitespace-nowrap ${activeTab === tab.id
                                        ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6">
                    {/* Tax Settings */}
                    {activeTab === 'tax' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Tax Configuration</h3>
                                    <p className="text-sm text-gray-500">Configure how tax is applied to sales</p>
                                </div>
                                <label className="flex items-center gap-3">
                                    <span className="text-sm text-gray-600">Enable Tax</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.tax.enabled}
                                        onChange={e => updateSetting('tax', 'enabled', e.target.checked)}
                                        className="w-5 h-5 rounded text-indigo-600"
                                    />
                                </label>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tax Name</label>
                                    <input
                                        type="text"
                                        value={settings.tax.name}
                                        onChange={e => updateSetting('tax', 'name', e.target.value)}
                                        className="input-field"
                                        placeholder="e.g., GST, VAT, Sales Tax"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
                                    <input
                                        type="number"
                                        value={settings.tax.rate}
                                        onChange={e => updateSetting('tax', 'rate', parseFloat(e.target.value))}
                                        className="input-field"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                    />
                                </div>
                            </div>

                            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                <input
                                    type="checkbox"
                                    checked={settings.tax.inclusive}
                                    onChange={e => updateSetting('tax', 'inclusive', e.target.checked)}
                                    className="w-5 h-5 rounded text-indigo-600"
                                />
                                <div>
                                    <span className="font-medium text-gray-900">Tax Inclusive Pricing</span>
                                    <p className="text-sm text-gray-500">Product prices already include tax</p>
                                </div>
                            </label>

                            <button
                                onClick={() => saveSettings('tax')}
                                disabled={saving}
                                className="btn-primary"
                            >
                                {saving ? 'Saving...' : 'Save Tax Settings'}
                            </button>
                        </div>
                    )}

                    {/* Currency Settings */}
                    {activeTab === 'currency' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Currency Configuration</h3>
                                <p className="text-sm text-gray-500">Set your default currency format</p>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency Code</label>
                                    <input
                                        type="text"
                                        value={settings.currency.code}
                                        onChange={e => updateSetting('currency', 'code', e.target.value.toUpperCase())}
                                        className="input-field"
                                        placeholder="PKR"
                                        maxLength={3}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Symbol</label>
                                    <input
                                        type="text"
                                        value={settings.currency.symbol}
                                        onChange={e => updateSetting('currency', 'symbol', e.target.value)}
                                        className="input-field"
                                        placeholder="Rs."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency Name</label>
                                    <input
                                        type="text"
                                        value={settings.currency.name}
                                        onChange={e => updateSetting('currency', 'name', e.target.value)}
                                        className="input-field"
                                        placeholder="Pakistani Rupee"
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Decimal Places</label>
                                    <select
                                        value={settings.currency.decimal_places}
                                        onChange={e => updateSetting('currency', 'decimal_places', parseInt(e.target.value))}
                                        className="input-field"
                                    >
                                        <option value={0}>0 (1,234)</option>
                                        <option value={2}>2 (1,234.00)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Symbol Position</label>
                                    <select
                                        value={settings.currency.symbol_position}
                                        onChange={e => updateSetting('currency', 'symbol_position', e.target.value)}
                                        className="input-field"
                                    >
                                        <option value="before">Before amount (Rs. 1,234)</option>
                                        <option value="after">After amount (1,234 Rs.)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-4 bg-indigo-50 rounded-lg">
                                <p className="text-sm text-gray-600 mb-1">Preview:</p>
                                <p className="text-2xl font-bold text-indigo-600">
                                    {settings.currency.symbol_position === 'before'
                                        ? `${settings.currency.symbol} 12,345${settings.currency.decimal_places > 0 ? '.00' : ''}`
                                        : `12,345${settings.currency.decimal_places > 0 ? '.00' : ''} ${settings.currency.symbol}`
                                    }
                                </p>
                            </div>

                            <button
                                onClick={() => saveSettings('currency')}
                                disabled={saving}
                                className="btn-primary"
                            >
                                {saving ? 'Saving...' : 'Save Currency Settings'}
                            </button>
                        </div>
                    )}

                    {/* Business Info */}
                    {activeTab === 'business' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Business Information</h3>
                                <p className="text-sm text-gray-500">This information appears on receipts and invoices</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                                    <input
                                        type="text"
                                        value={settings.business.name}
                                        onChange={e => updateSetting('business', 'name', e.target.value)}
                                        className="input-field"
                                        placeholder="Your Business Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                                    <input
                                        type="text"
                                        value={settings.business.phone}
                                        onChange={e => updateSetting('business', 'phone', e.target.value)}
                                        className="input-field"
                                        placeholder="+92 300 1234567"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={settings.business.email}
                                    onChange={e => updateSetting('business', 'email', e.target.value)}
                                    className="input-field"
                                    placeholder="contact@yourbusiness.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                                <textarea
                                    value={settings.business.address}
                                    onChange={e => updateSetting('business', 'address', e.target.value)}
                                    className="input-field"
                                    rows={3}
                                    placeholder="Street Address, City, Country"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Footer Message</label>
                                <input
                                    type="text"
                                    value={settings.business.receipt_footer}
                                    onChange={e => updateSetting('business', 'receipt_footer', e.target.value)}
                                    className="input-field"
                                    placeholder="Thank you for your business!"
                                />
                            </div>

                            <button
                                onClick={() => saveSettings('business')}
                                disabled={saving}
                                className="btn-primary"
                            >
                                {saving ? 'Saving...' : 'Save Business Info'}
                            </button>
                        </div>
                    )}

                    {/* SMS Settings */}
                    {activeTab === 'sms' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">SMS Notifications</h3>
                                    <p className="text-sm text-gray-500">Configure SMS for due reminders and notifications</p>
                                </div>
                                <label className="flex items-center gap-3">
                                    <span className="text-sm text-gray-600">Enable SMS</span>
                                    <input
                                        type="checkbox"
                                        checked={settings.sms.enabled}
                                        onChange={e => updateSetting('sms', 'enabled', e.target.checked)}
                                        className="w-5 h-5 rounded text-indigo-600"
                                    />
                                </label>
                            </div>

                            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <p className="text-sm text-yellow-800">
                                    ⚠️ <strong>Coming Soon:</strong> SMS integration is under development.
                                    Configure your settings now and they'll be ready when the feature launches.
                                </p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">SMS Provider</label>
                                    <select
                                        value={settings.sms.provider}
                                        onChange={e => updateSetting('sms', 'provider', e.target.value)}
                                        className="input-field"
                                    >
                                        <option value="">Select Provider</option>
                                        <option value="twilio">Twilio</option>
                                        <option value="nexmo">Nexmo/Vonage</option>
                                        <option value="local">Local SMS Gateway</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Sender ID</label>
                                    <input
                                        type="text"
                                        value={settings.sms.sender_id}
                                        onChange={e => updateSetting('sms', 'sender_id', e.target.value)}
                                        className="input-field"
                                        placeholder="YOUR_BUSINESS"
                                    />
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">API Key</label>
                                    <input
                                        type="password"
                                        value={settings.sms.api_key || ''}
                                        onChange={e => updateSetting('sms', 'api_key', e.target.value)}
                                        className="input-field"
                                        placeholder="••••••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">API Secret</label>
                                    <input
                                        type="password"
                                        value={settings.sms.api_secret || ''}
                                        onChange={e => updateSetting('sms', 'api_secret', e.target.value)}
                                        className="input-field"
                                        placeholder="••••••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => saveSettings('sms')}
                                disabled={saving}
                                className="btn-primary"
                            >
                                {saving ? 'Saving...' : 'Save SMS Settings'}
                            </button>
                        </div>
                    )}

                    {/* Invoice Settings */}
                    {activeTab === 'invoice' && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Invoice Configuration</h3>
                                <p className="text-sm text-gray-500">Customize invoice numbering and default text</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Invoice Prefix</label>
                                    <input
                                        type="text"
                                        value={settings.invoice.prefix}
                                        onChange={e => updateSetting('invoice', 'prefix', e.target.value)}
                                        className="input-field"
                                        placeholder="INV-"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Starting Number</label>
                                    <input
                                        type="number"
                                        value={settings.invoice.starting_number}
                                        onChange={e => updateSetting('invoice', 'starting_number', parseInt(e.target.value))}
                                        className="input-field"
                                        min="1"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
                                <input
                                    type="text"
                                    value={settings.invoice.terms}
                                    onChange={e => updateSetting('invoice', 'terms', e.target.value)}
                                    className="input-field"
                                    placeholder="Payment due within 30 days"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Default Notes</label>
                                <textarea
                                    value={settings.invoice.notes}
                                    onChange={e => updateSetting('invoice', 'notes', e.target.value)}
                                    className="input-field"
                                    rows={3}
                                    placeholder="Additional notes to include on invoices"
                                />
                            </div>

                            <button
                                onClick={() => saveSettings('invoice')}
                                disabled={saving}
                                className="btn-primary"
                            >
                                {saving ? 'Saving...' : 'Save Invoice Settings'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

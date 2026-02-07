"""
Settings Service - System Configuration Management
Handles tax, currency, and other tenant-specific settings
"""
from flask import current_app
from bson import ObjectId
from app.utils.helpers import get_current_utc_time, is_demo_request, get_collection_name
from app.middleware.auth import get_current_user


# Default settings for new tenants
DEFAULT_SETTINGS = {
    'tax': {
        'enabled': True,
        'name': 'GST',
        'rate': 17.0,  # Pakistan GST rate
        'inclusive': False,  # Tax added on top of price
    },
    'currency': {
        'code': 'PKR',
        'symbol': 'Rs.',
        'name': 'Pakistani Rupee',
        'decimal_places': 0,
        'symbol_position': 'before',  # 'before' or 'after'
        'thousand_separator': ',',
        'decimal_separator': '.',
    },
    'business': {
        'name': '',
        'address': '',
        'phone': '',
        'email': '',
        'logo_url': '',
        'receipt_footer': 'Thank you for your business!',
    },
    'sms': {
        'enabled': False,
        'provider': '',  # 'twilio', 'nexmo', 'local'
        'api_key': '',
        'api_secret': '',
        'sender_id': '',
        'templates': {
            'invoice_created': 'Dear {customer_name}, your invoice #{invoice_number} for {amount} has been created.',
            'payment_received': 'Dear {customer_name}, we have received your payment of {amount}. Thank you!',
            'due_reminder': 'Dear {customer_name}, your outstanding balance is {amount}. Please clear your dues. Thank you.',
        }
    },
    'invoice': {
        'prefix': 'INV-',
        'starting_number': 1,
        'terms': 'Payment due within 30 days',
        'notes': '',
    }
}


def get_settings_collection():
    """Get the settings collection"""
    return current_app.db[get_collection_name('settings')]


def get_tenant_filter():
    """Get tenant filter for data isolation"""
    user = get_current_user()
    if is_demo_request():
        return {'demo_user_id': user['_id']}
    return {'tenant_id': ObjectId(user['tenant_id'])}


def get_settings():
    """
    Get all settings for current tenant
    Creates default settings if none exist
    """
    try:
        settings = get_settings_collection().find_one(get_tenant_filter())
        
        if not settings:
            # Create default settings
            settings = {
                **get_tenant_filter(),
                **DEFAULT_SETTINGS,
                'created_at': get_current_utc_time()
            }
            get_settings_collection().insert_one(settings)
        
        return settings
    except Exception as e:
        print(f"Error getting settings: {e}")
        return DEFAULT_SETTINGS


def update_settings(category, data):
    """
    Update settings for a specific category
    
    Args:
        category: Settings category (tax, currency, business, sms, invoice)
        data: Dict of settings to update
    
    Returns:
        Updated settings document
    """
    try:
        settings_coll = get_settings_collection()
        filter_query = get_tenant_filter()
        
        # Ensure settings exist
        existing = settings_coll.find_one(filter_query)
        if not existing:
            # Create with defaults first
            new_settings = {
                **filter_query,
                **DEFAULT_SETTINGS,
                'created_at': get_current_utc_time()
            }
            settings_coll.insert_one(new_settings)
        
        # Build update query for nested category
        update_data = {}
        for key, value in data.items():
            update_data[f'{category}.{key}'] = value
        
        update_data['updated_at'] = get_current_utc_time()
        
        settings_coll.update_one(
            filter_query,
            {'$set': update_data}
        )
        
        return get_settings()
        
    except Exception as e:
        print(f"Error updating settings: {e}")
        raise e


def get_tax_settings():
    """Get just tax settings"""
    settings = get_settings()
    return settings.get('tax', DEFAULT_SETTINGS['tax'])


def get_currency_settings():
    """Get just currency settings"""
    settings = get_settings()
    return settings.get('currency', DEFAULT_SETTINGS['currency'])


def format_currency(amount):
    """Format an amount according to currency settings"""
    try:
        currency = get_currency_settings()
        
        # Round to decimal places
        decimal_places = currency.get('decimal_places', 0)
        formatted_amount = f"{amount:,.{decimal_places}f}"
        
        # Replace separators if needed
        if currency.get('thousand_separator') != ',':
            formatted_amount = formatted_amount.replace(',', currency.get('thousand_separator', ','))
        
        # Add symbol
        symbol = currency.get('symbol', 'Rs.')
        if currency.get('symbol_position') == 'after':
            return f"{formatted_amount} {symbol}"
        else:
            return f"{symbol} {formatted_amount}"
            
    except:
        return f"Rs. {amount:,.0f}"


def calculate_tax(amount):
    """Calculate tax on an amount"""
    try:
        tax = get_tax_settings()
        if not tax.get('enabled', False):
            return 0
        
        rate = tax.get('rate', 0)
        
        if tax.get('inclusive', False):
            # Tax is already in the amount, extract it
            return round(amount * rate / (100 + rate), 2)
        else:
            # Tax is added on top
            return round(amount * rate / 100, 2)
            
    except:
        return 0

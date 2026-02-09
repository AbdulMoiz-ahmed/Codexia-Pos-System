"""
Utility Helper Functions
"""
from datetime import datetime, timezone
from bson import ObjectId
from flask import g
import secrets
import string


def get_current_utc_time():
    """Get current UTC time"""
    return datetime.now(timezone.utc)


def is_demo_request():
    """Check if current request is from a demo user"""
    return hasattr(g, 'is_demo') and g.is_demo


def get_collection_name(base_name):
    """Get the appropriate collection name based on demo status.
    For demo users, returns 'demo_' prefixed collection.
    For regular users, returns the original collection name.
    """
    if is_demo_request():
        # Map regular collection names to demo equivalents
        demo_mappings = {
            # Inventory
            'products': 'demo_products',
            'categories': 'demo_categories',
            'stock_adjustments': 'demo_stock_adjustments',
            # POS & Sales
            'sales_pos': 'demo_sales',
            'transactions': 'demo_sales',
            'invoices': 'demo_invoices',
            'customers': 'demo_customers_crm',
            # Purchase
            'suppliers': 'demo_suppliers',
            'purchase_orders': 'demo_purchase_orders',
            # HR
            'employees': 'demo_employees',
            'attendance': 'demo_attendance',
            # Accounting
            'accounts': 'demo_accounts',
            'journal_entries': 'demo_journal_entries',
            # Manufacturing
            'boms': 'demo_boms',
            'work_orders': 'demo_work_orders',
            # Assets
            'assets': 'demo_assets',
        }
        return demo_mappings.get(base_name, f'demo_{base_name}')
    return base_name


def get_user_id_field():
    """Get the field name used to filter data.
    Demo users use 'demo_user_id', regular users use 'tenant_id'.
    """
    return 'demo_user_id' if is_demo_request() else 'tenant_id'


def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            elif isinstance(value, list):
                result[key] = [serialize_doc(item) if isinstance(item, (dict, ObjectId)) else item for item in value]
            else:
                result[key] = value
        return result
    
    return doc


def generate_tenant_id():
    """Generate unique tenant ID"""
    timestamp = datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')
    return f"TEN-{timestamp}"


def is_valid_email(email):
    """Basic email validation"""
    import re
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def paginate(query_result, page=1, per_page=10):
    """Paginate query results"""
    skip = (page - 1) * per_page
    
    # Convert cursor to list first to avoid exhaustion issues
    if hasattr(query_result, '__iter__') and not isinstance(query_result, list):
        all_items = list(query_result)
    else:
        all_items = query_result
    
    total = len(all_items)
    items = all_items[skip:skip + per_page]
    
    return {
        'items': items,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page if total > 0 else 0
    }


def generate_username(company_name, db):
    """Generate unique username from company name"""
    import re
    
    # Clean company name - remove special chars, convert to lowercase
    clean_name = re.sub(r'[^a-zA-Z0-9]', '', company_name).lower()
    
    # Take first 8 characters
    base_username = clean_name[:8] if len(clean_name) >= 8 else clean_name
    
    # Ensure minimum length
    if len(base_username) < 4:
        base_username = base_username + 'user'
    
    # Check if username exists
    username = base_username
    counter = 1
    
    while db.users.find_one({'username': username}):
        username = f"{base_username}{counter}"
        counter += 1
    
    return username


def validate_required_fields(data, required_fields):
    """Check if all required fields are present in the data"""
    if not data:
        return False
    
    for field in required_fields:
        if field not in data:
            return False
            
        value = data[field]
        if value is None:
            return False
            
        if isinstance(value, str) and not value.strip():
            return False
            
        if isinstance(value, (list, dict)) and len(value) == 0:
            return False
            
    return True

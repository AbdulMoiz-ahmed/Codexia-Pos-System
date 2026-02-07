"""
Tenant Model
"""
from flask import current_app
from bson import ObjectId
from app.utils.helpers import generate_tenant_id, get_current_utc_time, serialize_doc
from app.utils.constants import LICENSE_STATUS_TRIAL


class Tenant:
    """Tenant model for database operations"""
    
    collection_name = 'tenants'
    
    @staticmethod
    def create(data):
        """Create a new tenant"""
        db = current_app.db
        
        # Generate tenant ID
        data['tenant_id'] = generate_tenant_id()
        
        # Set defaults
        data.setdefault('is_active', True)
        data.setdefault('created_at', get_current_utc_time())
        
        # Set default license if not provided
        if 'license' not in data:
            data['license'] = {
                'package_id': None,
                'package_name': None,
                'status': LICENSE_STATUS_TRIAL,
                'start_date': get_current_utc_time(),
                'expiry_date': None,
                'auto_renew': False,
                'credit_days': 0
            }
        
        # Set default limits if not provided
        if 'limits' not in data:
            data['limits'] = {
                'max_users': 5,
                'max_branches': 1,
                'max_warehouses': 1,
                'max_monthly_transactions': 1000
            }
        
        # Set default enabled modules
        data.setdefault('enabled_modules', [])
        
        result = db.tenants.insert_one(data)
        return Tenant.find_by_id(result.inserted_id)
    
    @staticmethod
    def find_by_id(tenant_id):
        """Find tenant by ID"""
        db = current_app.db
        if isinstance(tenant_id, str) and len(tenant_id) == 24:
            try:
                tenant_id = ObjectId(tenant_id)
            except:
                pass
        return db.tenants.find_one({'_id': tenant_id})
    
    @staticmethod
    def find_by_tenant_id(tenant_id):
        """Find tenant by tenant_id string"""
        db = current_app.db
        return db.tenants.find_one({'tenant_id': tenant_id})
    
    @staticmethod
    def find_by_email(email):
        """Find tenant by email"""
        db = current_app.db
        # Normalize email to lowercase for case-insensitive matching
        return db.tenants.find_one({'email': email.lower().strip()})
    
    @staticmethod
    def find_all(filters=None):
        """Find all tenants"""
        db = current_app.db
        query = filters if filters else {}
        return list(db.tenants.find(query))
    
    @staticmethod
    def update(tenant_id, data):
        """Update tenant"""
        db = current_app.db
        if isinstance(tenant_id, str):
            try:
                tenant_id = ObjectId(tenant_id)
            except:
                pass
        
        db.tenants.update_one({'_id': tenant_id}, {'$set': data})
        return Tenant.find_by_id(tenant_id)
    
    @staticmethod
    def update_license(tenant_id, license_data):
        """Update tenant license"""
        db = current_app.db
        if isinstance(tenant_id, str):
            try:
                tenant_id = ObjectId(tenant_id)
            except:
                pass
        
        db.tenants.update_one(
            {'_id': tenant_id},
            {'$set': {'license': license_data}}
        )
        return Tenant.find_by_id(tenant_id)
    
    @staticmethod
    def update_modules(tenant_id, modules):
        """Update enabled modules"""
        db = current_app.db
        if isinstance(tenant_id, str):
            try:
                tenant_id = ObjectId(tenant_id)
            except:
                pass
        
        db.tenants.update_one(
            {'_id': tenant_id},
            {'$set': {'enabled_modules': modules}}
        )
        return Tenant.find_by_id(tenant_id)
    
    @staticmethod
    def to_dict(tenant):
        """Convert tenant document to dictionary"""
        if not tenant:
            return None
        return serialize_doc(tenant)

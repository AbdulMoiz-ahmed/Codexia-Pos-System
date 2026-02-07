"""
Database initialization utilities
"""
import bcrypt
from flask import current_app
from app.utils.constants import ROLE_SUPER_ADMIN
from app.utils.helpers import get_current_utc_time


def initialize_super_admin():
    """Create super admin user if not exists"""
    db = current_app.db
    
    # Check if super admin exists
    super_admin = db.users.find_one({'is_super_admin': True})
    
    if not super_admin:
        # Hash password
        password_hash = bcrypt.hashpw(
            current_app.config['SUPER_ADMIN_PASSWORD'].encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')
        
        # Create super admin
        super_admin_data = {
            'tenant_id': None,  # Super admin doesn't belong to any tenant
            'username': 'superadmin',
            'email': current_app.config['SUPER_ADMIN_EMAIL'],
            'password_hash': password_hash,
            'first_name': 'Super',
            'last_name': 'Admin',
            'phone': None,
            'avatar_url': None,
            'role_id': None,
            'role_name': ROLE_SUPER_ADMIN,
            'is_super_admin': True,
            'branch_ids': [],
            'default_branch_id': None,
            'is_active': True,
            'last_login': None,
            'created_at': get_current_utc_time()
        }
        
        db.users.insert_one(super_admin_data)
        print(f"✅ Super admin created: {current_app.config['SUPER_ADMIN_EMAIL']}")
    else:
        print(f"✅ Super admin already exists")

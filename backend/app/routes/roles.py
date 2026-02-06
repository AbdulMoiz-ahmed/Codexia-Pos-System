"""
Roles & Permissions Configuration
"""
from flask import Blueprint, jsonify
from app.middleware.auth import tenant_required

roles_bp = Blueprint('roles', __name__)

# Available modules in the system
ALL_MODULES = ['pos', 'inventory', 'sales', 'purchase', 'hr', 'accounting', 'manufacturing', 'assets']

# Role definitions with their allowed modules
ROLE_DEFINITIONS = {
    'admin': {
        'name': 'Admin',
        'description': 'Full access to all modules',
        'modules': ALL_MODULES
    },
    'sales_manager': {
        'name': 'Sales Manager',
        'description': 'Manage POS, sales, and view inventory',
        'modules': ['pos', 'sales', 'inventory']
    },
    'inventory_manager': {
        'name': 'Inventory Manager',
        'description': 'Manage inventory and purchases',
        'modules': ['inventory', 'purchase']
    },
    'hr_manager': {
        'name': 'HR Manager',
        'description': 'Manage employees and attendance',
        'modules': ['hr']
    },
    'accountant': {
        'name': 'Accountant',
        'description': 'Manage accounting and assets',
        'modules': ['accounting', 'assets']
    },
    'production_manager': {
        'name': 'Production Manager',
        'description': 'Manage manufacturing and inventory',
        'modules': ['manufacturing', 'inventory']
    },
    'custom': {
        'name': 'Custom',
        'description': 'Select specific module permissions',
        'modules': []  # Will be set per-user
    }
}


def get_role_modules(role, custom_modules=None):
    """Get the modules allowed for a role"""
    if role == 'custom' and custom_modules:
        return custom_modules
    return ROLE_DEFINITIONS.get(role, {}).get('modules', [])


def user_has_module_access(user, module):
    """Check if user has access to a specific module"""
    role = user.get('role', 'custom')
    
    # Admin has access to everything
    if role == 'admin':
        return True
    
    # For custom role, check allowed_modules
    if role == 'custom':
        allowed = user.get('allowed_modules', [])
        return module in allowed
    
    # For predefined roles, check role definition
    role_def = ROLE_DEFINITIONS.get(role)
    if role_def:
        return module in role_def['modules']
    
    return False


@roles_bp.route('/list', methods=['GET'])
@tenant_required
def get_roles():
    """Get all available roles"""
    roles = []
    for key, value in ROLE_DEFINITIONS.items():
        roles.append({
            'id': key,
            'name': value['name'],
            'description': value['description'],
            'modules': value['modules']
        })
    
    return jsonify({
        'roles': roles,
        'all_modules': ALL_MODULES
    }), 200

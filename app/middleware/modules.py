"""
Module Permission Middleware
Checks if tenant has access to specific modules AND if user has role permission
"""
from functools import wraps
from flask import jsonify, request, g
from app.middleware.auth import get_current_user


def module_required(module_name):
    """
    Decorator to check if user's tenant has access to a specific module
    AND if the user's role has permission to access it
    Usage: @module_required('sales')
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get current user
            user = get_current_user()
            if not user:
                return jsonify({'error': 'Unauthorized'}), 401
            
            # Super admin has access to all modules
            if user.get('is_super_admin'):
                return f(*args, **kwargs)
            
            # Demo users have access to all modules
            if user.get('is_demo') or (hasattr(g, 'is_demo') and g.is_demo):
                return f(*args, **kwargs)
            
            # Get tenant
            from app.models.tenant import Tenant
            tenant = Tenant.find_by_id(user.get('tenant_id'))
            
            if not tenant:
                return jsonify({'error': 'Tenant not found'}), 404
            
            # Check if module is enabled for tenant
            enabled_modules = tenant.get('enabled_modules', [])
            
            if module_name not in enabled_modules:
                return jsonify({
                    'error': f'Module "{module_name}" is not enabled for your account',
                    'message': 'Please upgrade your plan to access this feature'
                }), 403
            
            # Check user's role-based permission
            user_role = user.get('role', 'admin')  # Default to admin for backwards compatibility
            
            # Admin role has access to all tenant modules
            if user_role == 'admin':
                return f(*args, **kwargs)
            
            # Check role-based access
            from app.routes.roles import user_has_module_access
            if not user_has_module_access(user, module_name):
                return jsonify({
                    'error': f'Your role does not have access to the "{module_name}" module',
                    'message': 'Contact your administrator to update your permissions'
                }), 403
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

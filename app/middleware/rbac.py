"""
RBAC (Role-Based Access Control) Middleware
"""
from functools import wraps
from flask import jsonify
from app.middleware.auth import get_current_user


def permission_required(module, action):
    """
    Check if user has required permission
    
    Args:
        module: Module name (e.g., 'pos', 'inventory')
        action: Action name (e.g., 'view', 'create', 'edit', 'delete')
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # Super admin has all permissions
            if user.get('is_super_admin', False):
                return fn(*args, **kwargs)
            
            # Check user permissions
            # For now, we'll implement a simple check
            # In future, this will check against role permissions
            required_permission = f"{module}.{action}"
            
            # TODO: Implement full RBAC with role-based permissions
            # For now, allow all authenticated users
            # This will be enhanced in Phase 3
            
            return fn(*args, **kwargs)
        return wrapper
    return decorator

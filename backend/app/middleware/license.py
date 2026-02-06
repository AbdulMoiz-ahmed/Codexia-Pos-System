"""
License Validation Middleware
"""
from functools import wraps
from flask import jsonify
from datetime import datetime, timezone
from app.middleware.auth import get_current_user
from app.models.tenant import Tenant
from app.utils.constants import LICENSE_STATUS_ACTIVE, LICENSE_STATUS_TRIAL


def license_required(module_name=None):
    """
    Validate license before allowing access
    
    Args:
        module_name: Optional module name to check if enabled
    """
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = get_current_user()
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # Super admin bypass license check
            if user.get('is_super_admin', False):
                return fn(*args, **kwargs)
            
            # Get tenant
            tenant_id = user.get('tenant_id')
            if not tenant_id:
                return jsonify({'error': 'No tenant associated with user'}), 403
            
            tenant = Tenant.find_by_tenant_id(tenant_id)
            if not tenant:
                return jsonify({'error': 'Tenant not found'}), 404
            
            # Check if tenant is active
            if not tenant.get('is_active', False):
                return jsonify({'error': 'Account is suspended'}), 403
            
            # Check license status
            license_info = tenant.get('license', {})
            license_status = license_info.get('status')
            
            # Allow trial and active licenses
            if license_status not in [LICENSE_STATUS_ACTIVE, LICENSE_STATUS_TRIAL]:
                # Check if in credit period
                expiry_date = license_info.get('expiry_date')
                credit_days = license_info.get('credit_days', 0)
                
                if expiry_date and credit_days > 0:
                    # Calculate credit expiry
                    from datetime import timedelta
                    credit_expiry = expiry_date + timedelta(days=credit_days)
                    
                    if datetime.now(timezone.utc) <= credit_expiry:
                        # Still in credit period
                        return fn(*args, **kwargs)
                
                return jsonify({
                    'error': 'License expired',
                    'message': 'Your subscription has expired. Please renew to continue.'
                }), 403
            
            # Check if module is enabled (if module_name provided)
            if module_name:
                enabled_modules = tenant.get('enabled_modules', [])
                if module_name not in enabled_modules:
                    return jsonify({
                        'error': 'Module not enabled',
                        'message': f'The {module_name} module is not included in your subscription plan.'
                    }), 403
            
            return fn(*args, **kwargs)
        return wrapper
    return decorator

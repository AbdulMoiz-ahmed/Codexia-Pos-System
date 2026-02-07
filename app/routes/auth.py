"""
Authentication Routes
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from app.models.user import User
from app.models.tenant import Tenant
from app.utils.helpers import is_valid_email
from app.middleware.auth import get_current_user
from app.utils.activity_service import log_activity

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/login', methods=['POST'])
def login():
    """User login"""
    try:
        data = request.get_json()
        
        # Validate input
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Username/Email and password are required'}), 400
        
        login_identifier = data['email'].lower().strip()  # Can be username or email
        password = data['password']
        
        # Find user by username OR email
        user = User.find_by_username(login_identifier)
        if not user:
            user = User.find_by_email(login_identifier)
        
        if not user:
            # Log failed login attempt
            log_activity(
                activity_type='LOGIN_FAILED',
                description=f'Failed login attempt for: {login_identifier}',
                metadata={'attempted_identifier': login_identifier}
            )
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Verify password
        if not User.verify_password(user, password):
            log_activity(
                activity_type='LOGIN_FAILED',
                description=f'Invalid password for user: {login_identifier}',
                user_id=str(user.get('_id')),
                user_name=user.get('name') or user.get('email')
            )
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check if user is active
        if not user.get('is_active', False):
            return jsonify({'error': 'Account is inactive'}), 403
        
        # If not super admin, check tenant status
        if not user.get('is_super_admin', False):
            if user.get('tenant_id'):
                tenant = Tenant.find_by_id(user.get('tenant_id'))
                if not tenant or not tenant.get('is_active', True):  # Default to True if not set
                    return jsonify({'error': 'Account is suspended'}), 403
        
        # Update last login
        User.update_last_login(user['_id'])
        
        # Create tokens
        access_token = create_access_token(identity=str(user['_id']))
        refresh_token = create_refresh_token(identity=str(user['_id']))
        
        # Return user info and tokens
        user_data = User.to_dict(user)
        
        # Log successful login
        log_activity(
            activity_type='LOGIN',
            description=f'User logged in: {user.get("email")}',
            user_id=str(user.get('_id')),
            user_name=user.get('name') or user.get('email'),
            tenant_id=str(user.get('tenant_id')) if user.get('tenant_id') else None
        )
        
        return jsonify({
            'message': 'Login successful',
            'user': user_data,
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    try:
        user_id = get_jwt_identity()
        access_token = create_access_token(identity=user_id)
        
        return jsonify({
            'access_token': access_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    """Get current user info"""
    try:
        user = get_current_user()
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = User.to_dict(user)
        
        # If tenant user, include tenant info
        if not user.get('is_super_admin', False) and user.get('tenant_id'):
            tenant = Tenant.find_by_id(user.get('tenant_id'))
            if tenant:
                user_data['tenant'] = Tenant.to_dict(tenant)
                user_data['tenant_name'] = tenant.get('company_name')
        
        return jsonify(user_data), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """User logout"""
    try:
        # Log logout
        user = get_current_user()
        if user:
            log_activity(
                activity_type='LOGOUT',
                description=f'User logged out: {user.get("email")}',
                user_id=str(user.get('_id')),
                user_name=user.get('name') or user.get('email')
            )
        
        return jsonify({'message': 'Logout successful'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

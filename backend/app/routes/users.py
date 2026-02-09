"""
User Management Routes - For tenant-level user management
"""
from flask import Blueprint, request, jsonify, current_app
from app.middleware.auth import tenant_required, get_current_user
from app.models.user import User
from app.utils.helpers import serialize_doc, get_current_utc_time
from bson import ObjectId

users_bp = Blueprint('users', __name__)

# Available roles
AVAILABLE_ROLES = ['admin', 'sales_manager', 'inventory_manager', 'hr_manager', 'accountant', 'production_manager', 'custom']

# All selectable modules (Activity Logs & Settings are admin-only UI features, not modules)
ALL_MODULES = ['pos', 'inventory', 'sales', 'purchase', 'hr', 'accounting', 'manufacturing', 'assets']


@users_bp.route('/', methods=['GET'])
@tenant_required
def get_users():
    """Get all users in current tenant"""
    try:
        user = get_current_user()
        tenant_id = user.get('tenant_id')
        
        # Only admin can manage users
        if user.get('role') not in ['admin', None]:  # None for backwards compatibility
            return jsonify({'error': 'Only admins can view users'}), 403
        
        db = current_app.db
        users = list(db.users.find({'tenant_id': ObjectId(tenant_id)}))
        
        # Serialize and remove password hashes
        serialized_users = []
        for u in users:
            user_data = serialize_doc(u)
            user_data.pop('password_hash', None)
            serialized_users.append(user_data)
        
        return jsonify({'users': serialized_users}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/', methods=['POST'])
@tenant_required
def create_user():
    """Create a new user in current tenant"""
    try:
        current_user = get_current_user()
        tenant_id = current_user.get('tenant_id')
        
        # Only admin can create users
        if current_user.get('role') not in ['admin', None]:
            return jsonify({'error': 'Only admins can create users'}), 403
        
        data = request.get_json()
        db = current_app.db
        
        # Validate required fields
        required = ['email', 'username', 'password', 'first_name']
        for field in required:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check email uniqueness
        email = data['email'].lower().strip()
        if db.users.find_one({'email': email}):
            return jsonify({'error': 'Email already exists'}), 400
        
        # Check username uniqueness
        username = data['username'].lower().strip()
        if db.users.find_one({'username': username}):
            return jsonify({'error': 'Username already exists'}), 400
        
        # Validate role
        role = data.get('role', 'custom')
        if role not in AVAILABLE_ROLES:
            return jsonify({'error': 'Invalid role'}), 400
        
        # Prepare user data
        user_data = {
            'email': email,
            'username': username,
            'password': data['password'],
            'first_name': data['first_name'],
            'last_name': data.get('last_name', ''),
            'tenant_id': ObjectId(tenant_id),
            'role': role,
            'allowed_modules': data.get('allowed_modules', []) if role == 'custom' else [],
            'is_active': True,
            'is_super_admin': False,
            'created_at': get_current_utc_time()
        }
        
        new_user = User.create(user_data)
        user_response = serialize_doc(new_user)
        user_response.pop('password_hash', None)
        
        return jsonify({
            'message': 'User created successfully',
            'user': user_response
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/<user_id>', methods=['GET'])
@tenant_required
def get_user(user_id):
    """Get a specific user"""
    try:
        current_user = get_current_user()
        tenant_id = current_user.get('tenant_id')
        
        db = current_app.db
        user = db.users.find_one({
            '_id': ObjectId(user_id),
            'tenant_id': ObjectId(tenant_id)
        })
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = serialize_doc(user)
        user_data.pop('password_hash', None)
        
        return jsonify({'user': user_data}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/<user_id>/role', methods=['PUT'])
@tenant_required
def update_user_role(user_id):
    """Update user's role"""
    try:
        current_user = get_current_user()
        tenant_id = current_user.get('tenant_id')
        
        # Only admin can update roles
        if current_user.get('role') not in ['admin', None]:
            return jsonify({'error': 'Only admins can update user roles'}), 403
        
        # Prevent self-demotion
        if str(current_user.get('_id')) == user_id:
            return jsonify({'error': 'Cannot change your own role'}), 400
        
        data = request.get_json()
        new_role = data.get('role')
        
        if new_role not in AVAILABLE_ROLES:
            return jsonify({'error': 'Invalid role'}), 400
        
        db = current_app.db
        
        # Find user in same tenant
        user = db.users.find_one({
            '_id': ObjectId(user_id),
            'tenant_id': ObjectId(tenant_id)
        })
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Update role
        update_data = {'role': new_role}
        
        # If changing to custom role, set allowed_modules
        if new_role == 'custom':
            update_data['allowed_modules'] = data.get('allowed_modules', [])
        else:
            # Clear custom modules for non-custom roles
            update_data['allowed_modules'] = []
        
        db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': update_data}
        )
        
        updated_user = db.users.find_one({'_id': ObjectId(user_id)})
        user_response = serialize_doc(updated_user)
        user_response.pop('password_hash', None)
        
        return jsonify({
            'message': 'User role updated successfully',
            'user': user_response
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/<user_id>/modules', methods=['PUT'])
@tenant_required
def update_user_modules(user_id):
    """Update user's custom modules (only for custom role)"""
    try:
        current_user = get_current_user()
        tenant_id = current_user.get('tenant_id')
        
        # Only admin can update modules
        if current_user.get('role') not in ['admin', None]:
            return jsonify({'error': 'Only admins can update user modules'}), 403
        
        data = request.get_json()
        modules = data.get('modules', [])
        
        # Validate modules
        for module in modules:
            if module not in ALL_MODULES:
                return jsonify({'error': f'Invalid module: {module}'}), 400
        
        db = current_app.db
        
        # Find user in same tenant
        user = db.users.find_one({
            '_id': ObjectId(user_id),
            'tenant_id': ObjectId(tenant_id)
        })
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Only update if user has custom role
        if user.get('role') != 'custom':
            return jsonify({'error': 'Can only set custom modules for users with custom role'}), 400
        
        # Set the custom modules
        db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'allowed_modules': modules}}
        )
        
        updated_user = db.users.find_one({'_id': ObjectId(user_id)})
        user_response = serialize_doc(updated_user)
        user_response.pop('password_hash', None)
        
        return jsonify({
            'message': 'User modules updated successfully',
            'user': user_response
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/<user_id>/status', methods=['PUT'])
@tenant_required
def update_user_status(user_id):
    """Activate or deactivate a user"""
    try:
        current_user = get_current_user()
        tenant_id = current_user.get('tenant_id')
        
        # Only admin can update status
        if current_user.get('role') not in ['admin', None]:
            return jsonify({'error': 'Only admins can update user status'}), 403
        
        # Prevent self-deactivation
        if str(current_user.get('_id')) == user_id:
            return jsonify({'error': 'Cannot change your own status'}), 400
        
        data = request.get_json()
        is_active = data.get('is_active', True)
        
        db = current_app.db
        
        # Find user in same tenant
        user = db.users.find_one({
            '_id': ObjectId(user_id),
            'tenant_id': ObjectId(tenant_id)
        })
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': {'is_active': is_active}}
        )
        
        return jsonify({
            'message': f"User {'activated' if is_active else 'deactivated'} successfully"
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/<user_id>', methods=['DELETE'])
@tenant_required
def delete_user(user_id):
    """Delete a user"""
    try:
        current_user = get_current_user()
        tenant_id = current_user.get('tenant_id')
        
        # Only admin can delete users
        if current_user.get('role') not in ['admin', None]:
            return jsonify({'error': 'Only admins can delete users'}), 403
        
        # Prevent self-deletion
        if str(current_user.get('_id')) == user_id:
            return jsonify({'error': 'Cannot delete yourself'}), 400
        
        db = current_app.db
        
        # Find user in same tenant
        result = db.users.delete_one({
            '_id': ObjectId(user_id),
            'tenant_id': ObjectId(tenant_id)
        })
        
        if result.deleted_count == 0:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'message': 'User deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@users_bp.route('/roles', methods=['GET'])
@tenant_required
def get_available_roles():
    """Get available roles and their module permissions"""
    from app.routes.roles import ROLE_DEFINITIONS, ALL_MODULES
    
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

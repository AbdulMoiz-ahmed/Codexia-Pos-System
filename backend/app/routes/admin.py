"""
Super Admin Routes
"""
from flask import Blueprint, request, jsonify
from app.middleware.auth import super_admin_required
from app.models.tenant import Tenant
from app.models.user import User
from app.utils.helpers import serialize_doc, paginate
from flask import current_app

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/dashboard', methods=['GET'])
@super_admin_required
def dashboard():
    """Get dashboard statistics"""
    try:
        db = current_app.db
        
        # Count statistics
        total_tenants = db.tenants.count_documents({})
        active_tenants = db.tenants.count_documents({'is_active': True})
        total_users = db.users.count_documents({'is_super_admin': False})
        
        # License statistics
        from app.utils.constants import LICENSE_STATUS_ACTIVE, LICENSE_STATUS_TRIAL, LICENSE_STATUS_EXPIRED
        active_licenses = db.tenants.count_documents({'license.status': LICENSE_STATUS_ACTIVE})
        trial_licenses = db.tenants.count_documents({'license.status': LICENSE_STATUS_TRIAL})
        expired_licenses = db.tenants.count_documents({'license.status': LICENSE_STATUS_EXPIRED})
        
        return jsonify({
            'total_tenants': total_tenants,
            'active_tenants': active_tenants,
            'total_users': total_users,
            'licenses': {
                'active': active_licenses,
                'trial': trial_licenses,
                'expired': expired_licenses
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/tenants', methods=['GET'])
@super_admin_required
def get_tenants():
    """Get all tenants"""
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        search = request.args.get('search', '')
        
        db = current_app.db
        query = {}
        
        # Search filter
        if search:
            query['$or'] = [
                {'company_name': {'$regex': search, '$options': 'i'}},
                {'email': {'$regex': search, '$options': 'i'}},
                {'tenant_id': {'$regex': search, '$options': 'i'}}
            ]
        
        # Get tenants with pagination
        tenants_cursor = db.tenants.find(query).sort('created_at', -1)
        result = paginate(tenants_cursor, page, per_page)
        
        # Serialize
        result['items'] = [serialize_doc(t) for t in result['items']]
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/tenants/<tenant_id>', methods=['GET'])
@super_admin_required
def get_tenant(tenant_id):
    """Get tenant details"""
    try:
        tenant = Tenant.find_by_id(tenant_id)
        
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404
        
        return jsonify(serialize_doc(tenant)), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/tenants', methods=['POST'])
@super_admin_required
def create_tenant():
    """Create new tenant"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['company_name', 'email', 'contact_person']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Check if email already exists
        existing = Tenant.find_by_email(data['email'])
        if existing:
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create tenant
        tenant = Tenant.create(data)
        
        return jsonify({
            'message': 'Tenant created successfully',
            'tenant': serialize_doc(tenant)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/tenants/<tenant_id>', methods=['PUT'])
@super_admin_required
def update_tenant(tenant_id):
    """Update tenant"""
    try:
        data = request.get_json()
        
        tenant = Tenant.find_by_id(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404
        
        # Update tenant
        updated_tenant = Tenant.update(tenant_id, data)
        
        return jsonify({
            'message': 'Tenant updated successfully',
            'tenant': serialize_doc(updated_tenant)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/tenants/<tenant_id>/license', methods=['PUT'])
@super_admin_required
def update_license(tenant_id):
    """Update tenant license"""
    try:
        data = request.get_json()
        
        tenant = Tenant.find_by_id(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404
        
        # Update license
        license_data = data.get('license', {})
        updated_tenant = Tenant.update_license(tenant_id, license_data)
        
        return jsonify({
            'message': 'License updated successfully',
            'tenant': serialize_doc(updated_tenant)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/tenants/<tenant_id>/modules', methods=['PUT'])
@super_admin_required
def update_modules(tenant_id):
    """Update tenant modules"""
    try:
        data = request.get_json()
        
        tenant = Tenant.find_by_id(tenant_id)
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404
        
        # Update modules
        modules = data.get('modules', [])
        updated_tenant = Tenant.update_modules(tenant_id, modules)
        
        return jsonify({
            'message': 'Modules updated successfully',
            'tenant': serialize_doc(updated_tenant)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/packages', methods=['GET'])
@super_admin_required
def get_packages():
    """Get all packages"""
    try:
        db = current_app.db
        packages = list(db.packages.find().sort('price', 1))
        
        return jsonify({
            'packages': [serialize_doc(p) for p in packages]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/packages', methods=['POST'])
@super_admin_required
def create_package():
    """Create new package"""
    try:
        data = request.get_json()
        from app.utils.helpers import get_current_utc_time
        
        # Add metadata
        data['is_custom'] = False
        data['created_at'] = get_current_utc_time()
        
        db = current_app.db
        result = db.packages.insert_one(data)
        
        package = db.packages.find_one({'_id': result.inserted_id})
        
        return jsonify({
            'message': 'Package created successfully',
            'package': serialize_doc(package)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/packages/<package_id>', methods=['PUT'])
@super_admin_required
def update_package(package_id):
    """Update package"""
    try:
        from bson import ObjectId
        data = request.get_json()
        
        db = current_app.db
        package = db.packages.find_one({'_id': ObjectId(package_id)})
        
        if not package:
            return jsonify({'error': 'Package not found'}), 404
        
        # Update package
        db.packages.update_one(
            {'_id': ObjectId(package_id)},
            {'$set': data}
        )
        
        updated_package = db.packages.find_one({'_id': ObjectId(package_id)})
        
        return jsonify({
            'message': 'Package updated successfully',
            'package': serialize_doc(updated_package)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/packages/<package_id>', methods=['DELETE'])
@super_admin_required
def delete_package(package_id):
    """Delete package"""
    try:
        from bson import ObjectId
        db = current_app.db
        
        package = db.packages.find_one({'_id': ObjectId(package_id)})
        if not package:
            return jsonify({'error': 'Package not found'}), 404
        
        # Check if any tenant is using this package
        tenant_count = db.tenants.count_documents({'license.package_id': ObjectId(package_id)})
        if tenant_count > 0:
            return jsonify({
                'error': f'Cannot delete package. {tenant_count} tenant(s) are using this package.'
            }), 400
        
        db.packages.delete_one({'_id': ObjectId(package_id)})
        
        return jsonify({'message': 'Package deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/bookings', methods=['GET'])
@super_admin_required
def get_bookings():
    """Get all bookings"""
    try:
        db = current_app.db
        bookings = list(db.bookings.find().sort('created_at', -1))
        
        return jsonify({
            'bookings': [serialize_doc(b) for b in bookings]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/bookings/<booking_id>/approve', methods=['POST'])
@super_admin_required
def approve_booking(booking_id):
    """Approve booking and create tenant"""
    try:
        from bson import ObjectId
        from app.utils.helpers import get_current_utc_time
        from datetime import timedelta
        from app.utils.constants import LICENSE_STATUS_TRIAL
        
        db = current_app.db
        
        # Get booking
        booking = db.bookings.find_one({'_id': ObjectId(booking_id)})
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        if booking['status'] != 'pending':
            return jsonify({'error': 'Booking already processed'}), 400
        
        # Check if tenant already exists with this email
        email = booking['email'].lower().strip()
        existing_tenant = Tenant.find_by_email(email)
        if existing_tenant:
            return jsonify({'error': 'A tenant with this email already exists'}), 400
        
        # Check if user already exists with this email
        existing_user = db.users.find_one({'email': email})
        if existing_user:
            return jsonify({'error': 'A user with this email already exists'}), 400
        
        # Get package details - handle both ObjectId and string
        package_id = booking['package_id']
        if isinstance(package_id, str):
            package_id = ObjectId(package_id)
        
        package = db.packages.find_one({'_id': package_id})
        if not package:
            return jsonify({'error': 'Package not found'}), 404
        
        # Create tenant
        trial_days = int(package.get('trial_days', 14))  # Convert to int
        
        tenant_data = {
            'company_name': booking['company_name'],
            'email': booking['email'],
            'contact_person': booking['contact_person'],
            'phone': booking.get('phone', ''),
            'address': booking.get('address', {}),
            'license': {
                'package_id': package_id,
                'package_name': package.get('name', package.get('display_name', 'Unknown')),
                'status': LICENSE_STATUS_TRIAL,
                'start_date': get_current_utc_time(),
                'expiry_date': get_current_utc_time() + timedelta(days=trial_days),
                'auto_renew': False,
                'credit_days': 0
            },
            'limits': package.get('limits', {}),
            'enabled_modules': [m['name'] for m in package.get('modules', []) if m.get('enabled', False)]
        }
        
        tenant = Tenant.create(tenant_data)
        
        # Create user account for the tenant
        from app.models.user import User
        from app.utils.helpers import generate_username
        import secrets
        
        # Generate username from company name
        username = generate_username(booking['company_name'], db)
        
        # Generate temporary password
        temp_password = secrets.token_urlsafe(12)  # Random secure password
        
        user_data = {
            'username': username,
            'email': booking['email'],
            'password': temp_password,  # Will be hashed by User.create
            'first_name': booking['contact_person'].split()[0] if booking['contact_person'] else 'Admin',
            'last_name': ' '.join(booking['contact_person'].split()[1:]) if len(booking['contact_person'].split()) > 1 else '',
            'tenant_id': tenant['_id'],
            'is_super_admin': False,
            'is_active': True
        }
        
        user = User.create(user_data)
        
        # Update booking status with credentials
        db.bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {'$set': {
                'status': 'approved',
                'approved_at': get_current_utc_time(),
                'tenant_id': tenant['_id'],
                'user_id': user['_id'],
                'username': username,
                'temp_password': temp_password  # Store for reference (in production, send via email)
            }}
        )
        
        return jsonify({
            'message': 'Booking approved and tenant created successfully',
            'tenant': serialize_doc(tenant),
            'user': {
                'username': username,
                'email': user['email'],
                'temp_password': temp_password,
                'login_url': 'http://localhost:3000/customer/login'
            }
        }), 200
        
    except Exception as e:
        print(f"Error approving booking: {str(e)}")  # Debug logging
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/bookings/<booking_id>/reject', methods=['POST'])
@super_admin_required
def reject_booking(booking_id):
    """Reject booking"""
    try:
        from bson import ObjectId
        from app.utils.helpers import get_current_utc_time
        
        db = current_app.db
        
        booking = db.bookings.find_one({'_id': ObjectId(booking_id)})
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        if booking['status'] != 'pending':
            return jsonify({'error': 'Booking already processed'}), 400
        
        # Update booking status
        db.bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {'$set': {'status': 'rejected', 'rejected_at': get_current_utc_time()}}
        )
        
        return jsonify({'message': 'Booking rejected'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/bookings/<booking_id>/status', methods=['PUT'])
@super_admin_required
def update_booking_status(booking_id):
    """Update booking status (for reverting)"""
    try:
        from bson import ObjectId
        from app.utils.helpers import get_current_utc_time
        
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['pending', 'approved', 'rejected']:
            return jsonify({'error': 'Invalid status'}), 400
        
        db = current_app.db
        
        # Get the booking first
        booking = db.bookings.find_one({'_id': ObjectId(booking_id)})
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        # If reverting from approved to pending, delete the tenant and user
        if booking.get('status') == 'approved' and new_status == 'pending':
            # Delete the user that was created
            if booking.get('user_id'):
                db.users.delete_one({'_id': booking['user_id']})
            
            # Delete the tenant that was created
            if booking.get('tenant_id'):
                db.tenants.delete_one({'_id': booking['tenant_id']})
        
        # Update booking status and clear tenant/user references if reverting
        update_data = {
            'status': new_status,
            'updated_at': get_current_utc_time()
        }
        
        # Clear references when reverting to pending
        if new_status == 'pending':
            update_data['tenant_id'] = None
            update_data['user_id'] = None
            update_data['username'] = None
            update_data['temp_password'] = None
            update_data['approved_at'] = None
        
        db.bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {'$set': update_data}
        )
        
        return jsonify({'message': 'Booking status updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500



@admin_bp.route('/users/<user_id>/reset-password', methods=['POST'])
@super_admin_required
def reset_user_password(user_id):
    """Reset user password (for tenant users)"""
    try:
        from bson import ObjectId
        from app.models.user import User
        import secrets
        
        db = current_app.db
        
        # Generate new password
        new_password = secrets.token_urlsafe(12)
        
        # Update user password
        user = User.update(user_id, {'password': new_password})
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'message': 'Password reset successfully',
            'email': user['email'],
            'new_password': new_password
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

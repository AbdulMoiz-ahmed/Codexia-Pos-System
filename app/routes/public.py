"""
Public Routes (No authentication required)
"""
from flask import Blueprint, request, jsonify
from app.utils.helpers import serialize_doc
from flask import current_app

public_bp = Blueprint('public', __name__)


@public_bp.route('/packages', methods=['GET'])
def get_packages():
    """Get all available packages"""
    try:
        db = current_app.db
        
        # Get active packages
        packages = list(db.packages.find({'is_active': True}).sort('price', 1))
        
        return jsonify({
            'packages': [serialize_doc(p) for p in packages]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@public_bp.route('/packages/<package_id>', methods=['GET'])
def get_package(package_id):
    """Get package details"""
    try:
        from bson import ObjectId
        db = current_app.db
        
        package = db.packages.find_one({'_id': ObjectId(package_id)})
        
        if not package:
            return jsonify({'error': 'Package not found'}), 404
        
        return jsonify({
            'package': serialize_doc(package)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@public_bp.route('/checkout', methods=['POST'])
def checkout():
    """Submit package purchase request"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['package_id', 'company_name', 'email', 'contact_person', 'phone']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        db = current_app.db
        from bson import ObjectId
        from app.utils.helpers import get_current_utc_time
        from app.utils.constants import BOOKING_STATUS_PENDING
        from app.models.tenant import Tenant
        
        # Normalize email for validation
        email = data['email'].lower().strip()
        
        # Check if email already exists in bookings
        existing_booking = db.bookings.find_one({'email': email})
        if existing_booking:
            return jsonify({'error': 'This email already has a pending or processed booking'}), 400
        
        # Check if email already exists in tenants
        existing_tenant = Tenant.find_by_email(email)
        if existing_tenant:
            return jsonify({'error': 'This email is already registered as a tenant'}), 400
        
        # Verify package exists
        package = db.packages.find_one({'_id': ObjectId(data['package_id'])})
        if not package:
            return jsonify({'error': 'Package not found'}), 404
        
        # Create booking
        booking_data = {
            'package_id': ObjectId(data['package_id']),
            'package_name': package['name'],
            'company_name': data['company_name'],
            'email': data['email'].lower().strip(),
            'contact_person': data['contact_person'],
            'phone': data['phone'],
            'address': data.get('address', {}),
            'status': BOOKING_STATUS_PENDING,
            'created_at': get_current_utc_time()
        }
        
        result = db.bookings.insert_one(booking_data)
        
        return jsonify({
            'message': 'Booking submitted successfully',
            'booking_id': str(result.inserted_id),
            'status': BOOKING_STATUS_PENDING
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@public_bp.route('/bookings/<booking_id>', methods=['GET'])
def get_booking(booking_id):
    """Check booking status"""
    try:
        from bson import ObjectId
        db = current_app.db
        
        booking = db.bookings.find_one({'_id': ObjectId(booking_id)})
        
        if not booking:
            return jsonify({'error': 'Booking not found'}), 404
        
        return jsonify(serialize_doc(booking)), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

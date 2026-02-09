"""
Assets Module Routes
"""
from flask import Blueprint, request, jsonify, current_app
from app.middleware.auth import tenant_required, get_current_user
from app.middleware.modules import module_required
from app.utils.helpers import get_current_utc_time, serialize_doc, validate_required_fields, is_demo_request, get_collection_name
from bson import ObjectId

assets_bp = Blueprint('assets', __name__)


def get_tenant_filter():
    """Get the filter for tenant/demo data isolation"""
    user = get_current_user()
    if is_demo_request():
        return {'demo_user_id': user['_id']}
    return {'tenant_id': user['tenant_id']}


def get_assets_collection():
    return current_app.db[get_collection_name('assets')]


@assets_bp.route('/registry', methods=['GET'])
@tenant_required
@module_required('assets')
def get_assets():
    """Get all assets"""
    try:
        assets = list(get_assets_collection().find(get_tenant_filter()))
        return jsonify(serialize_doc(assets)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assets_bp.route('/registry', methods=['POST'])
@tenant_required
@module_required('assets')
def create_asset():
    """Create a new asset"""
    try:
        user = get_current_user()
        data = request.get_json()
        
        if not validate_required_fields(data, ['name', 'category', 'purchase_date', 'purchase_cost']):
            return jsonify({'error': 'Missing required fields'}), 400
            
        asset = {
            **get_tenant_filter(),
            'name': data['name'],
            'description': data.get('description', ''),
            'category': data['category'],
            'serial_number': data.get('serial_number', ''),
            'purchase_date': data['purchase_date'],
            'purchase_cost': float(data['purchase_cost']),
            'current_value': float(data.get('current_value', data['purchase_cost'])),
            'location': data.get('location', ''),
            'status': data.get('status', 'active'),
            'created_at': get_current_utc_time(),
            'created_by': user['_id']
        }
        
        result = get_assets_collection().insert_one(asset)
        asset['_id'] = result.inserted_id
        
        return jsonify(serialize_doc(asset)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@assets_bp.route('/registry/<asset_id>', methods=['DELETE'])
@tenant_required
@module_required('assets')
def delete_asset(asset_id):
    """Delete an asset"""
    try:
        delete_filter = get_tenant_filter()
        delete_filter['_id'] = ObjectId(asset_id)
        
        result = get_assets_collection().delete_one(delete_filter)
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Asset not found'}), 404
            
        return jsonify({'message': 'Asset deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

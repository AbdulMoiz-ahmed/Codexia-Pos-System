"""
Manufacturing Module Routes
"""
from flask import Blueprint, request, jsonify, current_app
from app.middleware.auth import tenant_required, get_current_user
from app.middleware.modules import module_required
from app.utils.helpers import get_current_utc_time, serialize_doc, validate_required_fields, is_demo_request, get_collection_name
from bson import ObjectId

manufacturing_bp = Blueprint('manufacturing', __name__)


def get_tenant_filter():
    """Get the filter for tenant/demo data isolation"""
    user = get_current_user()
    if is_demo_request():
        return {'demo_user_id': user['_id']}
    return {'tenant_id': user['tenant_id']}


def get_boms_collection():
    return current_app.db[get_collection_name('boms')]


def get_work_orders_collection():
    return current_app.db[get_collection_name('work_orders')]


# --- Bill of Materials (BOM) ---

@manufacturing_bp.route('/bom', methods=['GET'])
@tenant_required
@module_required('manufacturing')
def get_boms():
    """Get all BOMs"""
    try:
        boms = list(get_boms_collection().find(get_tenant_filter()))
        return jsonify(serialize_doc(boms)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@manufacturing_bp.route('/bom', methods=['POST'])
@tenant_required
@module_required('manufacturing')
def create_bom():
    """Create a new BOM"""
    try:
        user = get_current_user()
        data = request.get_json()
        
        if not validate_required_fields(data, ['product_id', 'product_name', 'components']):
            return jsonify({'error': 'Missing required fields'}), 400
            
        bom = {
            **get_tenant_filter(),
            'product_id': data['product_id'],
            'product_name': data['product_name'],
            'quantity': data.get('quantity', 1),
            'components': data['components'],
            'status': 'active',
            'created_at': get_current_utc_time(),
            'created_by': user['_id']
        }
        
        result = get_boms_collection().insert_one(bom)
        bom['_id'] = result.inserted_id
        
        return jsonify(serialize_doc(bom)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- Work Orders ---

@manufacturing_bp.route('/work-orders', methods=['GET'])
@tenant_required
@module_required('manufacturing')
def get_work_orders():
    """Get all work orders"""
    try:
        orders = list(get_work_orders_collection().find(get_tenant_filter()).sort('created_at', -1))
        return jsonify(serialize_doc(orders)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@manufacturing_bp.route('/work-orders', methods=['POST'])
@tenant_required
@module_required('manufacturing')
def create_work_order():
    """Create a new work order"""
    try:
        user = get_current_user()
        data = request.get_json()
        
        if not validate_required_fields(data, ['bom_id', 'quantity']):
            return jsonify({'error': 'Missing required fields'}), 400
            
        # Verify BOM exists
        bom_filter = get_tenant_filter()
        bom_id = data['bom_id']
        
        # Validate ObjectId format
        if isinstance(bom_id, str) and ObjectId.is_valid(bom_id):
            bom_filter['_id'] = ObjectId(bom_id)
            bom = get_boms_collection().find_one(bom_filter)
            if not bom:
                return jsonify({'error': 'BOM not found'}), 404
            product_name = bom['product_name']
        elif isinstance(bom_id, str):
            return jsonify({'error': 'Invalid BOM ID format'}), 400
        else:
            product_name = "Custom Production"

        order = {
            **get_tenant_filter(),
            'bom_id': data['bom_id'],
            'product_name': product_name,
            'quantity': data['quantity'],
            'start_date': data.get('start_date'),
            'due_date': data.get('due_date'),
            'status': 'pending',
            'created_at': get_current_utc_time(),
            'created_by': user['_id']
        }
        
        result = get_work_orders_collection().insert_one(order)
        order['_id'] = result.inserted_id
        
        return jsonify(serialize_doc(order)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

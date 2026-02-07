"""
Sales & CRM Module Routes
"""
from flask import Blueprint, request, jsonify, current_app
from app.middleware.auth import tenant_required, get_current_user
from app.middleware.modules import module_required
from app.utils.helpers import serialize_doc, get_current_utc_time, is_demo_request, get_collection_name
from bson import ObjectId

sales_bp = Blueprint('sales', __name__)


def get_tenant_filter():
    """Get the filter for tenant/demo data isolation"""
    user = get_current_user()
    if is_demo_request():
        return {'demo_user_id': user['_id']}
    return {'tenant_id': ObjectId(user['tenant_id'])}


def get_customers_collection():
    return current_app.db[get_collection_name('customers')]


def get_invoices_collection():
    return current_app.db[get_collection_name('invoices')]


@sales_bp.route('/customers', methods=['GET'])
@tenant_required
@module_required('sales')
def get_customers():
    """Get all customers for tenant"""
    try:
        customers = list(get_customers_collection().find(get_tenant_filter()))
        
        return jsonify({
            'customers': [serialize_doc(c) for c in customers]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/customers', methods=['POST'])
@tenant_required
@module_required('sales')
def create_customer():
    """Create new customer"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required = ['name', 'email', 'phone']
        for field in required:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        customer_data = {
            **get_tenant_filter(),
            'name': data['name'],
            'email': data['email'].lower().strip(),
            'phone': data['phone'],
            'company': data.get('company', ''),
            'address': data.get('address', {}),
            'credit_limit': data.get('credit_limit', 0),
            'balance': 0,
            'created_at': get_current_utc_time(),
            'is_active': True
        }
        
        result = get_customers_collection().insert_one(customer_data)
        customer_data['_id'] = result.inserted_id
        
        return jsonify({
            'message': 'Customer created successfully',
            'customer': serialize_doc(customer_data)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/customers/<customer_id>', methods=['PUT'])
@tenant_required
@module_required('sales')
def update_customer(customer_id):
    """Update customer"""
    try:
        data = request.get_json()
        
        update_filter = get_tenant_filter()
        update_filter['_id'] = ObjectId(customer_id)
        
        result = get_customers_collection().update_one(
            update_filter,
            {'$set': {
                'name': data.get('name'),
                'email': data.get('email'),
                'phone': data.get('phone'),
                'company': data.get('company'),
                'address': data.get('address'),
                'credit_limit': data.get('credit_limit'),
                'updated_at': get_current_utc_time()
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Customer not found'}), 404
        
        return jsonify({'message': 'Customer updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/customers/<customer_id>', methods=['DELETE'])
@tenant_required
@module_required('sales')
def delete_customer(customer_id):
    """Delete customer"""
    try:
        delete_filter = get_tenant_filter()
        delete_filter['_id'] = ObjectId(customer_id)
        
        result = get_customers_collection().delete_one(delete_filter)
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Customer not found'}), 404
        
        return jsonify({'message': 'Customer deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/invoices', methods=['GET'])
@tenant_required
@module_required('sales')
def get_invoices():
    """Get all invoices for tenant"""
    try:
        invoices = list(get_invoices_collection().find(get_tenant_filter()))
        
        return jsonify({
            'invoices': [serialize_doc(i) for i in invoices]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@sales_bp.route('/invoices', methods=['POST'])
@tenant_required
@module_required('sales')
def create_invoice():
    """Create new invoice"""
    try:
        user = get_current_user()
        data = request.get_json()
        
        # Generate invoice number
        count = get_invoices_collection().count_documents(get_tenant_filter())
        invoice_number = f"INV-{count + 1:05d}"
        
        invoice_data = {
            **get_tenant_filter(),
            'invoice_number': invoice_number,
            'customer_id': ObjectId(data['customer_id']),
            'customer_name': data['customer_name'],
            'items': data['items'],
            'subtotal': data['subtotal'],
            'tax': data.get('tax', 0),
            'discount': data.get('discount', 0),
            'total': data['total'],
            'status': 'pending',
            'due_date': data.get('due_date'),
            'created_at': get_current_utc_time(),
            'created_by': user['_id']
        }
        
        result = get_invoices_collection().insert_one(invoice_data)
        invoice_data['_id'] = result.inserted_id
        
        return jsonify({
            'message': 'Invoice created successfully',
            'invoice': serialize_doc(invoice_data)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

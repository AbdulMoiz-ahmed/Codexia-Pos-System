"""
Purchase Module Routes - With Ledger Integration and Stock Updates
"""
from flask import Blueprint, request, jsonify, current_app
from app.middleware.auth import tenant_required, get_current_user
from app.middleware.modules import module_required
from app.utils.helpers import serialize_doc, get_current_utc_time, is_demo_request, get_collection_name
from app.utils.activity_service import log_activity
from bson import ObjectId
from datetime import datetime, timedelta

purchase_bp = Blueprint('purchase', __name__)


def get_tenant_filter():
    """Get the filter for tenant/demo data isolation"""
    user = get_current_user()
    if is_demo_request():
        return {'demo_user_id': user['_id']}
    return {'tenant_id': ObjectId(user['tenant_id'])}


def get_suppliers_collection():
    return current_app.db[get_collection_name('suppliers')]


def get_purchase_orders_collection():
    return current_app.db[get_collection_name('purchase_orders')]


def get_products_collection():
    return current_app.db[get_collection_name('products')]


@purchase_bp.route('/suppliers', methods=['GET'])
@tenant_required
@module_required('purchase')
def get_suppliers():
    """Get all suppliers for tenant"""
    try:
        suppliers = list(get_suppliers_collection().find(get_tenant_filter()))
        
        return jsonify({
            'suppliers': [serialize_doc(s) for s in suppliers]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@purchase_bp.route('/suppliers', methods=['POST'])
@tenant_required
@module_required('purchase')
def create_supplier():
    """Create new supplier"""
    try:
        data = request.get_json()
        
        supplier_data = {
            **get_tenant_filter(),
            'name': data['name'],
            'email': data.get('email', ''),
            'phone': data.get('phone', ''),
            'company': data.get('company', ''),
            'address': data.get('address', {}),
            'payment_terms': data.get('payment_terms', 'Net 30'),
            'balance': 0,
            'created_at': get_current_utc_time(),
            'is_active': True
        }
        
        result = get_suppliers_collection().insert_one(supplier_data)
        supplier_data['_id'] = result.inserted_id
        
        return jsonify({
            'message': 'Supplier created successfully',
            'supplier': serialize_doc(supplier_data)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@purchase_bp.route('/suppliers/<supplier_id>', methods=['PUT'])
@tenant_required
@module_required('purchase')
def update_supplier(supplier_id):
    """Update supplier"""
    try:
        data = request.get_json()
        
        update_filter = get_tenant_filter()
        update_filter['_id'] = ObjectId(supplier_id)
        
        result = get_suppliers_collection().update_one(
            update_filter,
            {'$set': {
                **data,
                'updated_at': get_current_utc_time()
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Supplier not found'}), 404
        
        return jsonify({'message': 'Supplier updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@purchase_bp.route('/suppliers/<supplier_id>', methods=['DELETE'])
@tenant_required
@module_required('purchase')
def delete_supplier(supplier_id):
    """Delete supplier"""
    try:
        delete_filter = get_tenant_filter()
        delete_filter['_id'] = ObjectId(supplier_id)
        
        result = get_suppliers_collection().delete_one(delete_filter)
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Supplier not found'}), 404
        
        return jsonify({'message': 'Supplier deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@purchase_bp.route('/purchase-orders', methods=['GET'])
@tenant_required
@module_required('purchase')
def get_purchase_orders():
    """Get all purchase orders"""
    try:
        orders = list(get_purchase_orders_collection().find(get_tenant_filter()).sort('created_at', -1))
        
        return jsonify({
            'purchase_orders': [serialize_doc(o) for o in orders]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@purchase_bp.route('/purchase-orders', methods=['POST'])
@tenant_required
@module_required('purchase')
def create_purchase_order():
    """Create new purchase order with payment type support"""
    try:
        user = get_current_user()
        data = request.get_json()
        
        # Generate PO number
        count = get_purchase_orders_collection().count_documents(get_tenant_filter())
        po_number = f"PO-{count + 1:05d}"
        
        # Payment type (cash or credit)
        payment_type = data.get('payment_type', 'credit')
        due_date = data.get('due_date')
        if payment_type == 'credit' and not due_date:
            due_date = (datetime.utcnow() + timedelta(days=30)).isoformat()
        
        po_data = {
            **get_tenant_filter(),
            'po_number': po_number,
            'supplier_id': ObjectId(data['supplier_id']),
            'supplier_name': data['supplier_name'],
            'items': data['items'],
            'subtotal': float(data['subtotal']),
            'tax': float(data.get('tax', 0)),
            'total': float(data['total']),
            'payment_type': payment_type,
            'payment_status': 'unpaid' if payment_type == 'credit' else 'paid',
            'amount_paid': float(data['total']) if payment_type == 'cash' else 0,
            'amount_due': float(data['total']) if payment_type == 'credit' else 0,
            'due_date': due_date,
            'status': 'pending',
            'expected_date': data.get('expected_date'),
            'created_at': get_current_utc_time(),
            'created_by': user['_id']
        }
        
        result = get_purchase_orders_collection().insert_one(po_data)
        po_data['_id'] = result.inserted_id
        
        # Log activity
        log_activity(
            activity_type='PO_CREATED',
            description=f'Purchase Order {po_number} - PKR {float(data["total"]):,.0f} ({payment_type})',
            entity_type='purchase_order',
            entity_id=str(result.inserted_id),
            entity_name=po_number,
            metadata={
                'total': float(data['total']),
                'payment_type': payment_type,
                'supplier_name': data['supplier_name'],
                'items_count': len(data['items'])
            }
        )
        
        return jsonify({
            'message': 'Purchase order created successfully',
            'purchase_order': serialize_doc(po_data)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@purchase_bp.route('/purchase-orders/<po_id>/receive', methods=['POST'])
@tenant_required
@module_required('purchase')
def receive_purchase_order(po_id):
    """Receive a purchase order - updates stock and posts to ledger"""
    try:
        data = request.get_json()
        po_coll = get_purchase_orders_collection()
        products_coll = get_products_collection()
        
        po_filter = get_tenant_filter()
        po_filter['_id'] = ObjectId(po_id)
        
        po = po_coll.find_one(po_filter)
        if not po:
            return jsonify({'error': 'Purchase order not found'}), 404
        
        if po.get('status') == 'received':
            return jsonify({'error': 'Purchase order already received'}), 400
        
        # Update stock for each item
        received_items = data.get('items', po['items'])
        for item in received_items:
            product_filter = get_tenant_filter()
            product_filter['_id'] = ObjectId(item['product_id'])
            
            quantity_received = item.get('quantity_received', item.get('quantity', 0))
            
            # Update product stock
            products_coll.update_one(
                product_filter,
                {
                    '$inc': {'stock': quantity_received},
                    '$set': {
                        'cost': item.get('unit_price', 0),  # Update cost price
                        'updated_at': get_current_utc_time()
                    }
                }
            )
        
        # Update PO status
        po_coll.update_one(
            po_filter,
            {'$set': {
                'status': 'received',
                'received_at': get_current_utc_time(),
                'received_items': received_items
            }}
        )
        
        # Post to ledger
        try:
            from app.utils.ledger_service import post_purchase
            
            purchase_data = {
                '_id': po['_id'],
                'po_number': po['po_number'],
                'total': po['total']
            }
            
            post_purchase(
                purchase_data,
                str(po['supplier_id']),
                po['supplier_name'],
                po.get('payment_type', 'credit')
            )
        except Exception as ledger_error:
            print(f"Purchase ledger error: {ledger_error}")
        
        return jsonify({
            'message': 'Purchase order received - stock updated',
            'status': 'received'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@purchase_bp.route('/purchase-orders/<po_id>/payment', methods=['POST'])
@tenant_required
@module_required('purchase')
def record_vendor_payment(po_id):
    """Record a payment to vendor for a purchase order"""
    try:
        data = request.get_json()
        amount = float(data.get('amount', 0))
        payment_method = data.get('payment_method', 'cash')
        
        if amount <= 0:
            return jsonify({'error': 'Payment amount must be greater than 0'}), 400
        
        po_coll = get_purchase_orders_collection()
        po_filter = get_tenant_filter()
        po_filter['_id'] = ObjectId(po_id)
        
        po = po_coll.find_one(po_filter)
        if not po:
            return jsonify({'error': 'Purchase order not found'}), 404
        
        current_due = po.get('amount_due', po.get('total', 0))
        if current_due <= 0:
            return jsonify({'error': 'Purchase order is already fully paid'}), 400
        
        # Calculate new amounts
        new_amount_paid = po.get('amount_paid', 0) + amount
        new_amount_due = max(0, current_due - amount)
        new_status = 'paid' if new_amount_due == 0 else 'partial'
        
        # Update PO
        po_coll.update_one(
            po_filter,
            {
                '$set': {
                    'amount_paid': round(new_amount_paid, 2),
                    'amount_due': round(new_amount_due, 2),
                    'payment_status': new_status,
                    'updated_at': get_current_utc_time()
                },
                '$push': {
                    'payments': {
                        'amount': round(amount, 2),
                        'method': payment_method,
                        'date': get_current_utc_time()
                    }
                }
            }
        )
        
        # Post payment to ledger
        try:
            from app.utils.ledger_service import post_payment_made
            
            payment_data = {
                '_id': po_id,
                'amount': amount,
                'payment_method': payment_method
            }
            
            post_payment_made(
                payment_data,
                str(po['supplier_id']),
                po['supplier_name']
            )
        except Exception as ledger_error:
            print(f"Payment ledger error: {ledger_error}")
        
        return jsonify({
            'message': 'Payment recorded',
            'amount_paid': round(new_amount_paid, 2),
            'amount_due': round(new_amount_due, 2),
            'payment_status': new_status
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@purchase_bp.route('/purchase-orders/<po_id>', methods=['GET'])
@tenant_required
@module_required('purchase')
def get_purchase_order(po_id):
    """Get a specific purchase order"""
    try:
        po_filter = get_tenant_filter()
        po_filter['_id'] = ObjectId(po_id)
        
        po = get_purchase_orders_collection().find_one(po_filter)
        
        if not po:
            return jsonify({'error': 'Purchase order not found'}), 404
        
        return jsonify(serialize_doc(po)), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@purchase_bp.route('/payables', methods=['GET'])
@tenant_required
@module_required('purchase')
def get_payables():
    """Get all unpaid/partially paid purchase orders (accounts payable)"""
    try:
        filter_query = get_tenant_filter()
        filter_query['payment_status'] = {'$in': ['unpaid', 'partial']}
        
        pos = list(get_purchase_orders_collection().find(filter_query).sort('created_at', -1))
        
        total_payable = sum(po.get('amount_due', 0) for po in pos)
        
        return jsonify({
            'payables': serialize_doc(pos),
            'total_payable': round(total_payable, 2)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

"""
POS Module Routes - With Credit Sales and Ledger Integration
"""
from flask import Blueprint, request, jsonify, current_app, g
from app.middleware.auth import tenant_required, get_current_user
from app.middleware.modules import module_required
from app.utils.helpers import serialize_doc, get_current_utc_time, validate_required_fields, is_demo_request, get_collection_name
from app.utils.activity_service import log_activity
from bson import ObjectId
from datetime import datetime, timedelta

pos_bp = Blueprint('pos', __name__)


def get_tenant_filter():
    """Get the filter for tenant/demo data isolation"""
    user = get_current_user()
    if is_demo_request():
        return {'demo_user_id': user['_id']}
    return {'tenant_id': ObjectId(user['tenant_id'])}


def get_products_collection():
    """Get the appropriate products collection"""
    return current_app.db[get_collection_name('products')]


def get_sales_collection():
    """Get the appropriate sales collection"""
    return current_app.db[get_collection_name('sales_pos')]


def get_customers_collection():
    """Get the appropriate customers collection"""
    return current_app.db[get_collection_name('customers')]


@pos_bp.route('/sales', methods=['POST'])
@tenant_required
@module_required('pos')
def create_sale():
    """Record a new POS sale with cash/credit payment support"""
    try:
        user = get_current_user()
        data = request.get_json()
        
        items = data.get('items', [])
        if not items:
            return jsonify({'error': 'Cart is empty'}), 400

        subtotal = 0
        cost_total = 0
        products_coll = get_products_collection()
        
        # Validate stock and calculate subtotal + cost
        for item in items:
            product_filter = get_tenant_filter()
            product_filter['_id'] = ObjectId(item['id'])
            product = products_coll.find_one(product_filter)
            
            if not product:
                return jsonify({'error': f"Product {item['name']} not found"}), 404
                
            if product['stock'] < item['quantity']:
                return jsonify({'error': f"Insufficient stock for {product['name']}. Available: {product['stock']}"}), 400
                
            subtotal += product['price'] * item['quantity']
            cost_total += product.get('cost', 0) * item['quantity']

        # Calculate discount
        discount_type = data.get('discount_type', 'fixed')
        discount_value = float(data.get('discount', 0))
        
        if discount_type == 'percentage':
            discount_amount = (subtotal * discount_value) / 100
        else:
            discount_amount = discount_value
        
        # Calculate tax
        tax_rate = float(data.get('tax_rate', 0))
        tax_amount = ((subtotal - discount_amount) * tax_rate) / 100
        
        # Final total
        total_amount = subtotal - discount_amount + tax_amount

        # Payment type: cash or credit
        payment_type = data.get('payment_type', 'cash')
        payment_method = data.get('payment_method', 'cash')
        
        # Cash sale amounts
        amount_paid = float(data.get('amount_paid', total_amount if payment_type == 'cash' else 0))
        change_due = max(0, amount_paid - total_amount) if payment_type == 'cash' else 0
        
        # Credit sale - due date
        due_date = data.get('due_date')
        if payment_type == 'credit' and not due_date:
            # Default due date: 30 days from now
            due_date = (datetime.utcnow() + timedelta(days=30)).isoformat()
        
        # Customer info
        customer_id = data.get('customer_id')
        customer_name = data.get('customer_name', 'Walk-in Customer')
        
        # Credit sale validation
        if payment_type == 'credit':
            if not customer_id:
                return jsonify({'error': 'Customer is required for credit sales'}), 400
            
            # Check credit limit
            customer_filter = get_tenant_filter()
            customer_filter['_id'] = ObjectId(customer_id)
            customer = get_customers_collection().find_one(customer_filter)
            
            if customer:
                credit_limit = customer.get('credit_limit', 0)
                current_balance = customer.get('balance', 0)
                
                if credit_limit > 0 and (current_balance + total_amount) > credit_limit:
                    return jsonify({
                        'error': f"Credit limit exceeded. Limit: PKR {credit_limit:,.0f}, Balance: PKR {current_balance:,.0f}"
                    }), 400

        # Generate receipt number
        sales_coll = get_sales_collection()
        receipt_count = sales_coll.count_documents(get_tenant_filter())
        receipt_number = f"REC-{receipt_count + 1:06d}"

        # Payment status
        if payment_type == 'credit':
            payment_status = 'unpaid'
            amount_due = total_amount
        elif amount_paid >= total_amount:
            payment_status = 'paid'
            amount_due = 0
        else:
            payment_status = 'partial'
            amount_due = total_amount - amount_paid

        # Create Sale Record
        sale = {
            **get_tenant_filter(),
            'items': items,
            'subtotal': round(subtotal, 2),
            'cost_total': round(cost_total, 2),
            'discount_type': discount_type,
            'discount_value': discount_value,
            'discount_amount': round(discount_amount, 2),
            'tax_rate': tax_rate,
            'tax_amount': round(tax_amount, 2),
            'total_amount': round(total_amount, 2),
            'payment_type': payment_type,
            'payment_method': payment_method,
            'payment_status': payment_status,
            'amount_paid': round(amount_paid, 2),
            'amount_due': round(amount_due, 2),
            'change_due': round(change_due, 2),
            'due_date': due_date,
            'customer_id': ObjectId(customer_id) if customer_id else None,
            'customer_name': customer_name,
            'notes': data.get('notes', ''),
            'created_at': get_current_utc_time(),
            'created_by': user['_id'],
            'receipt_number': receipt_number,
            'status': 'completed'
        }
        
        # Deduct Stock
        for item in items:
            product_filter = get_tenant_filter()
            product_filter['_id'] = ObjectId(item['id'])
            products_coll.update_one(
                product_filter,
                {'$inc': {'stock': -item['quantity']}}
            )
            
        result = sales_coll.insert_one(sale)
        sale['_id'] = result.inserted_id
        
        # Double-Entry Accounting - Post to Ledger
        try:
            from app.utils.ledger_service import post_cash_sale, post_credit_sale
            
            sale_data = {
                '_id': sale['_id'],
                'receipt_number': receipt_number,
                'total_amount': round(total_amount, 2),
                'cost_amount': round(cost_total, 2)
            }
            
            if payment_type == 'cash':
                post_cash_sale(sale_data)
            else:
                post_credit_sale(sale_data, customer_id, customer_name)
                
        except Exception as ledger_error:
            print(f"Ledger posting error: {ledger_error}")
        
        # Log the sale activity
        log_activity(
            activity_type='SALE_CREATED',
            description=f'Sale {receipt_number} - PKR {round(total_amount, 2)} ({payment_type})',
            entity_type='sale',
            entity_id=str(sale['_id']),
            entity_name=receipt_number,
            metadata={
                'total_amount': round(total_amount, 2),
                'payment_type': payment_type,
                'items_count': len(items),
                'customer_name': customer_name if customer_id else 'Walk-in'
            }
        )
        
        return jsonify({
            'message': 'Sale completed' if payment_type == 'cash' else 'Credit sale recorded',
            'sale': serialize_doc(sale),
            'receipt': {
                'receipt_number': receipt_number,
                'subtotal': round(subtotal, 2),
                'discount': round(discount_amount, 2),
                'tax': round(tax_amount, 2),
                'total': round(total_amount, 2),
                'payment_type': payment_type,
                'amount_paid': round(amount_paid, 2),
                'amount_due': round(amount_due, 2),
                'change_due': round(change_due, 2),
                'due_date': due_date
            }
        }), 201

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pos_bp.route('/sales/<sale_id>/payment', methods=['POST'])
@tenant_required
@module_required('pos')
def record_payment(sale_id):
    """Record a payment against a credit sale"""
    try:
        data = request.get_json()
        amount = float(data.get('amount', 0))
        payment_method = data.get('payment_method', 'cash')
        
        if amount <= 0:
            return jsonify({'error': 'Payment amount must be greater than 0'}), 400
        
        sales_coll = get_sales_collection()
        sale_filter = get_tenant_filter()
        sale_filter['_id'] = ObjectId(sale_id)
        
        sale = sales_coll.find_one(sale_filter)
        if not sale:
            return jsonify({'error': 'Sale not found'}), 404
        
        current_due = sale.get('amount_due', 0)
        if current_due <= 0:
            return jsonify({'error': 'Sale is already fully paid'}), 400
        
        # Calculate new amounts
        new_amount_paid = sale.get('amount_paid', 0) + amount
        new_amount_due = max(0, current_due - amount)
        new_status = 'paid' if new_amount_due == 0 else 'partial'
        
        # Update sale
        sales_coll.update_one(
            sale_filter,
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
            from app.utils.ledger_service import post_payment_received
            
            payment_data = {
                '_id': sale_id,
                'amount': amount,
                'payment_method': payment_method
            }
            
            if sale.get('customer_id'):
                post_payment_received(
                    payment_data, 
                    str(sale['customer_id']), 
                    sale.get('customer_name', 'Customer')
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


@pos_bp.route('/history', methods=['GET'])
@tenant_required
@module_required('pos')
def get_sales_history():
    """Get recent sales"""
    try:
        sales = list(get_sales_collection().find(get_tenant_filter()).sort('created_at', -1).limit(50))
        return jsonify(serialize_doc(sales)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pos_bp.route('/customers', methods=['GET'])
@tenant_required
@module_required('pos')
def get_pos_customers():
    """Get customers for POS selection with balance info"""
    try:
        customer_filter = get_tenant_filter()
        if not is_demo_request():
            customer_filter['is_active'] = True
        
        customers = list(get_customers_collection().find(customer_filter).sort('name', 1))
        
        return jsonify({
            'customers': serialize_doc(customers)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pos_bp.route('/sales/<sale_id>', methods=['GET'])
@tenant_required
@module_required('pos')
def get_sale(sale_id):
    """Get sale details for receipt"""
    try:
        sale_filter = get_tenant_filter()
        sale_filter['_id'] = ObjectId(sale_id)
        
        sale = get_sales_collection().find_one(sale_filter)
        
        if not sale:
            return jsonify({'error': 'Sale not found'}), 404
        
        return jsonify(serialize_doc(sale)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@pos_bp.route('/credit-sales', methods=['GET'])
@tenant_required
@module_required('pos')
def get_credit_sales():
    """Get all credit sales with outstanding balances"""
    try:
        filter_query = get_tenant_filter()
        filter_query['payment_type'] = 'credit'
        filter_query['payment_status'] = {'$in': ['unpaid', 'partial']}
        
        sales = list(get_sales_collection().find(filter_query).sort('created_at', -1))
        
        return jsonify({
            'credit_sales': serialize_doc(sales),
            'total_outstanding': sum(s.get('amount_due', 0) for s in sales)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

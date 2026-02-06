"""
Customer/Tenant Routes
"""
from flask import Blueprint, request, jsonify, g
from app.middleware.auth import tenant_required, get_current_user
from flask import current_app
from app.utils.helpers import serialize_doc, get_current_utc_time, is_demo_request, get_collection_name
from app.models.tenant import Tenant
from bson import ObjectId

customer_bp = Blueprint('customer', __name__)


def get_tenant_filter():
    """Get the filter for tenant/demo data isolation"""
    user = get_current_user()
    if is_demo_request():
        return {'demo_user_id': user['_id']}
    return {'tenant_id': ObjectId(user['tenant_id'])}


def get_products_collection():
    return current_app.db[get_collection_name('products')]


def get_sales_collection():
    return current_app.db[get_collection_name('sales_pos')]


def get_customers_collection():
    return current_app.db[get_collection_name('customers')]


@customer_bp.route('/dashboard', methods=['GET'])
@tenant_required
def get_dashboard():
    """Get customer dashboard statistics"""
    try:
        products_coll = get_products_collection()
        sales_coll = get_sales_collection()
        
        # Get statistics
        total_products = products_coll.count_documents(get_tenant_filter())
        low_stock_filter = get_tenant_filter()
        low_stock_filter['stock'] = {'$lt': 10}
        low_stock = products_coll.count_documents(low_stock_filter)
        
        # Today's sales
        from datetime import datetime, timezone
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        sales_filter = get_tenant_filter()
        sales_filter['created_at'] = {'$gte': today_start}
        
        today_pipeline = [
            {'$match': sales_filter},
            {'$group': {'_id': None, 'total': {'$sum': '$total_amount'}}}
        ]
        today_sales_amount = list(sales_coll.aggregate(today_pipeline))
        today_sales_total = today_sales_amount[0]['total'] if today_sales_amount else 0
        
        return jsonify({
            'today_sales': today_sales_total,
            'total_products': total_products,
            'low_stock': low_stock,
            'pending_orders': 0
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customer_bp.route('/products', methods=['GET'])
@tenant_required
def get_products():
    """Get all products for tenant"""
    try:
        search = request.args.get('search', '')
        query = get_tenant_filter()
        
        if search:
            query['$or'] = [
                {'name': {'$regex': search, '$options': 'i'}},
                {'sku': {'$regex': search, '$options': 'i'}},
                {'barcode': {'$regex': search, '$options': 'i'}}
            ]
        
        products = list(get_products_collection().find(query).sort('name', 1))
        
        return jsonify({
            'products': [serialize_doc(p) for p in products]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customer_bp.route('/products', methods=['POST'])
@tenant_required
def create_product():
    """Create new product"""
    try:
        data = request.get_json()
        
        # Check SKU uniqueness
        sku_filter = get_tenant_filter()
        sku_filter['sku'] = data.get('sku')
        existing = get_products_collection().find_one(sku_filter)
        if existing:
            return jsonify({'error': 'SKU already exists'}), 400
        
        product = {
            **get_tenant_filter(),  # Adds tenant_id or demo_user_id
            'name': data['name'],
            'sku': data['sku'],
            'barcode': data.get('barcode', ''),
            'category': data.get('category', ''),
            'price': float(data.get('price', 0)),
            'cost': float(data.get('cost', 0)),
            'stock': int(data.get('stock', 0)),
            'description': data.get('description', ''),
            'created_at': get_current_utc_time(),
            'updated_at': get_current_utc_time()
        }
        
        result = get_products_collection().insert_one(product)
        product['_id'] = result.inserted_id
        
        return jsonify({
            'message': 'Product created successfully',
            'product': serialize_doc(product)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customer_bp.route('/products/<product_id>', methods=['PUT'])
@tenant_required
def update_product(product_id):
    """Update product"""
    try:
        data = request.get_json()
        db = current_app.db
        user = get_current_user()
        tenant_id = user.get('tenant_id')
        
        product = db.products.find_one({
            '_id': ObjectId(product_id),
            'tenant_id': tenant_id
        })
        
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        update_data = {
            'name': data.get('name', product['name']),
            'sku': data.get('sku', product['sku']),
            'barcode': data.get('barcode', product.get('barcode', '')),
            'category': data.get('category', product.get('category', '')),
            'price': float(data.get('price', product['price'])),
            'cost': float(data.get('cost', product.get('cost', 0))),
            'stock': int(data.get('stock', product['stock'])),
            'description': data.get('description', product.get('description', '')),
            'updated_at': get_current_utc_time()
        }
        
        db.products.update_one(
            {'_id': ObjectId(product_id)},
            {'$set': update_data}
        )
        
        updated_product = db.products.find_one({'_id': ObjectId(product_id)})
        
        return jsonify({
            'message': 'Product updated successfully',
            'product': serialize_doc(updated_product)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customer_bp.route('/products/<product_id>', methods=['DELETE'])
@tenant_required
def delete_product(product_id):
    """Delete product"""
    try:
        db = current_app.db
        user = get_current_user()
        tenant_id = user.get('tenant_id')
        
        result = db.products.delete_one({
            '_id': ObjectId(product_id),
            'tenant_id': tenant_id
        })
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Product not found'}), 404
        
        return jsonify({'message': 'Product deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customer_bp.route('/transactions', methods=['POST'])
@tenant_required
def create_transaction():
    """Create POS transaction (sale)"""
    try:
        data = request.get_json()
        db = current_app.db
        user = get_current_user()
        tenant_id = user.get('tenant_id')
        
        # Calculate total
        items = data.get('items', [])
        total_amount = sum(item['price'] * item['quantity'] for item in items)
        
        transaction = {
            'tenant_id': tenant_id,
            'user_id': user['_id'],
            'type': 'sale',
            'items': items,
            'subtotal': total_amount,
            'discount': float(data.get('discount', 0)),
            'tax': float(data.get('tax', 0)),
            'total_amount': total_amount - float(data.get('discount', 0)) + float(data.get('tax', 0)),
            'payment_method': data.get('payment_method', 'cash'),
            'status': 'completed',
            'created_at': get_current_utc_time()
        }
        
        result = db.transactions.insert_one(transaction)
        transaction['_id'] = result.inserted_id
        
        # Update stock
        for item in items:
            db.products.update_one(
                {'_id': ObjectId(item['product_id']), 'tenant_id': tenant_id},
                {'$inc': {'stock': -item['quantity']}}
            )
        
        return jsonify({
            'message': 'Transaction completed successfully',
            'transaction': serialize_doc(transaction)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customer_bp.route('/subscription', methods=['GET'])
@tenant_required
def get_subscription():
    """Get tenant subscription details"""
    try:
        from flask import g
        user = get_current_user()
        
        # Check if demo user - return all modules
        if user.get('is_demo') or (hasattr(g, 'is_demo') and g.is_demo):
            # Demo users get ALL modules
            all_modules = ['pos', 'inventory', 'sales', 'purchase', 'hr', 'accounting', 'manufacturing', 'assets']
            return jsonify({
                'package': 'Demo Package',
                'status': 'active',
                'start_date': user.get('created_at'),
                'expiry_date': user.get('expires_at'),
                'enabled_modules': all_modules,
                'limits': {
                    'max_users': 100,
                    'max_products': 10000,
                    'max_customers': 10000
                },
                'company_name': 'Demo Company',
                'email': user.get('email'),
                'is_demo': True,
                'demo_expires_at': user.get('expires_at')
            }), 200
        
        # Regular tenant flow
        tenant_id = user.get('tenant_id')
        tenant = Tenant.find_by_id(tenant_id)
        
        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404
        
        tenant_data = serialize_doc(tenant)
        
        return jsonify({
            'package': tenant_data.get('license', {}).get('package_name', 'N/A'),
            'status': tenant_data.get('license', {}).get('status', 'N/A'),
            'start_date': tenant_data.get('license', {}).get('start_date'),
            'expiry_date': tenant_data.get('license', {}).get('expiry_date'),
            'enabled_modules': tenant_data.get('enabled_modules', []),
            'limits': tenant_data.get('limits', {}),
            'company_name': tenant_data.get('company_name'),
            'email': tenant_data.get('email')
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@customer_bp.route('/stats', methods=['GET'])
@tenant_required
def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        from datetime import timedelta
        
        # Get the appropriate collections using helper functions
        # These handle both regular tenants and demo users
        products_coll = get_products_collection()
        sales_coll = get_sales_collection()
        customers_coll = get_customers_collection()
        
        # Get base filter for tenant/demo isolation
        base_filter = get_tenant_filter()
        
        # Calculate time ranges
        now = get_current_utc_time()
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_week = start_of_day - timedelta(days=7)
        start_of_month = start_of_day - timedelta(days=30)
        
        # 1. Today's Sales
        today_pipeline = [
            {'$match': {**base_filter, 'created_at': {'$gte': start_of_day}}},
            {'$group': {'_id': None, 'total': {'$sum': '$total_amount'}, 'count': {'$sum': 1}}}
        ]
        pos_today = list(sales_coll.aggregate(today_pipeline))
        today_sales = pos_today[0]['total'] if pos_today else 0
        today_transactions = pos_today[0]['count'] if pos_today else 0
        
        # 2. This Week's Sales
        week_pipeline = [
            {'$match': {**base_filter, 'created_at': {'$gte': start_of_week}}},
            {'$group': {'_id': None, 'total': {'$sum': '$total_amount'}, 'count': {'$sum': 1}}}
        ]
        pos_week = list(sales_coll.aggregate(week_pipeline))
        week_sales = pos_week[0]['total'] if pos_week else 0
        week_transactions = pos_week[0]['count'] if pos_week else 0
        
        # 3. This Month's Sales
        month_pipeline = [
            {'$match': {**base_filter, 'created_at': {'$gte': start_of_month}}},
            {'$group': {'_id': None, 'total': {'$sum': '$total_amount'}}}
        ]
        pos_month = list(sales_coll.aggregate(month_pipeline))
        month_sales = pos_month[0]['total'] if pos_month else 0
        
        # 4. Total Products
        total_products = products_coll.count_documents(base_filter)
        
        # 5. Low Stock (stock <= min_stock or < 10)
        low_stock_filter = {**base_filter, '$or': [
            {'$expr': {'$lte': ['$stock', {'$ifNull': ['$min_stock', 10]}]}},
            {'stock': {'$lt': 10}}
        ]}
        low_stock = products_coll.count_documents(low_stock_filter)
        
        # 6. Out of Stock
        out_of_stock_filter = {**base_filter, 'stock': {'$lte': 0}}
        out_of_stock = products_coll.count_documents(out_of_stock_filter)
        
        # 7. Pending Invoices - use db directly with appropriate collection
        db = current_app.db
        invoices_coll = db[get_collection_name('invoices')]
        pending_filter = {**base_filter, 'status': 'pending'}
        pending_orders = invoices_coll.count_documents(pending_filter)
        
        # 8. Recent Sales (last 5)
        recent_sales = list(sales_coll.find(base_filter).sort('created_at', -1).limit(5))
        
        # 9. Daily sales for last 7 days (for chart)
        daily_sales = []
        for i in range(7):
            day_start = start_of_day - timedelta(days=i)
            day_end = day_start + timedelta(days=1)
            day_pipeline = [
                {'$match': {**base_filter, 'created_at': {'$gte': day_start, '$lt': day_end}}},
                {'$group': {'_id': None, 'total': {'$sum': '$total_amount'}}}
            ]
            day_result = list(sales_coll.aggregate(day_pipeline))
            daily_sales.append({
                'date': day_start.strftime('%a'),
                'amount': day_result[0]['total'] if day_result else 0
            })
        daily_sales.reverse()
        
        # 10. Total customers
        total_customers = customers_coll.count_documents(base_filter)
        
        return jsonify({
            'todaySales': round(today_sales, 2),
            'todayTransactions': today_transactions,
            'weekSales': round(week_sales, 2),
            'weekTransactions': week_transactions,
            'monthSales': round(month_sales, 2),
            'totalProducts': total_products,
            'lowStock': low_stock,
            'outOfStock': out_of_stock,
            'pendingOrders': pending_orders,
            'totalCustomers': total_customers,
            'recentSales': serialize_doc(recent_sales),
            'dailySales': daily_sales
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

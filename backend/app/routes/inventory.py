"""
Inventory Module Routes
"""
from flask import Blueprint, request, jsonify, current_app, g
from app.middleware.auth import tenant_required, get_current_user
from app.middleware.modules import module_required
from app.utils.helpers import serialize_doc, get_current_utc_time, validate_required_fields, is_demo_request, get_collection_name, get_user_id_field
from bson import ObjectId

inventory_bp = Blueprint('inventory', __name__)


def get_tenant_filter():
    """Get the filter for tenant/demo data isolation"""
    user = get_current_user()
    if is_demo_request():
        return {'demo_user_id': user['_id']}
    return {'tenant_id': ObjectId(user['tenant_id'])}


def get_products_collection():
    """Get the appropriate products collection"""
    return current_app.db[get_collection_name('products')]


def get_categories_collection():
    """Get the appropriate categories collection"""
    return current_app.db[get_collection_name('categories')]


# ===== PRODUCTS =====

@inventory_bp.route('/products', methods=['GET'])
@tenant_required
@module_required('inventory')
def get_products():
    """Get all products"""
    try:
        products = list(get_products_collection().find(get_tenant_filter()).sort('name', 1))
        return jsonify(serialize_doc(products)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/products/low-stock', methods=['GET'])
@tenant_required
@module_required('inventory')
def get_low_stock_products():
    """Get products with low stock"""
    try:
        threshold = int(request.args.get('threshold', 10))
        filter_query = get_tenant_filter()
        filter_query['stock'] = {'$lte': threshold}
        
        products = list(get_products_collection().find(filter_query).sort('stock', 1))
        
        return jsonify({
            'products': serialize_doc(products),
            'count': len(products),
            'threshold': threshold
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/products', methods=['POST'])
@tenant_required
@module_required('inventory')
def create_product():
    """Create product"""
    try:
        user = get_current_user()
        data = request.get_json()
        
        if not validate_required_fields(data, ['name', 'sku', 'price', 'stock']):
             return jsonify({'error': 'Missing required fields'}), 400

        # Check if SKU already exists
        existing_filter = get_tenant_filter()
        existing_filter['sku'] = data['sku']
        if get_products_collection().find_one(existing_filter):
            return jsonify({'error': 'SKU already exists'}), 400

        product = {
            **get_tenant_filter(),  # Adds tenant_id or demo_user_id
            'name': data['name'],
            'sku': data['sku'],
            'category_id': ObjectId(data['category_id']) if data.get('category_id') else None,
            'category': data.get('category', 'Uncategorized'),
            'price': float(data['price']),
            'cost': float(data.get('cost', 0)),
            'stock': int(data['stock']),
            'min_stock': int(data.get('min_stock', 10)),
            'barcode': data.get('barcode', ''),
            'description': data.get('description', ''),
            'unit': data.get('unit', 'pcs'),
            'is_active': True,
            'created_at': get_current_utc_time(),
            'updated_at': get_current_utc_time()
        }
        
        result = get_products_collection().insert_one(product)
        product['_id'] = result.inserted_id
        
        return jsonify(serialize_doc(product)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/products/<product_id>', methods=['GET'])
@tenant_required
@module_required('inventory')
def get_product(product_id):
    """Get single product"""
    try:
        user = get_current_user()
        db = current_app.db
        
        product = db.products.find_one({
            '_id': ObjectId(product_id),
            'tenant_id': ObjectId(user['tenant_id'])
        })
        
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        return jsonify(serialize_doc(product)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/products/<product_id>', methods=['PUT'])
@tenant_required
@module_required('inventory')
def update_product(product_id):
    """Update product"""
    try:
        user = get_current_user()
        data = request.get_json()
        db = current_app.db
        
        update_data = {
            'updated_at': get_current_utc_time()
        }
        
        fields = ['name', 'sku', 'category', 'category_id', 'price', 'cost', 'stock', 'min_stock', 'barcode', 'description', 'unit', 'is_active']
        for field in fields:
            if field in data:
                update_data[field] = data[field]
                
        # Ensure correct types
        if 'price' in update_data: update_data['price'] = float(update_data['price'])
        if 'cost' in update_data: update_data['cost'] = float(update_data['cost'])
        if 'stock' in update_data: update_data['stock'] = int(update_data['stock'])
        if 'min_stock' in update_data: update_data['min_stock'] = int(update_data['min_stock'])
        if 'category_id' in update_data and update_data['category_id']:
            update_data['category_id'] = ObjectId(update_data['category_id'])

        result = db.products.update_one(
            {'_id': ObjectId(product_id), 'tenant_id': ObjectId(user['tenant_id'])},
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
             return jsonify({'error': 'Product not found'}), 404
             
        return jsonify({'message': 'Product updated'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/products/<product_id>', methods=['DELETE'])
@tenant_required
@module_required('inventory')
def delete_product(product_id):
    """Delete product"""
    try:
        user = get_current_user()
        db = current_app.db
        
        result = db.products.delete_one(
            {'_id': ObjectId(product_id), 'tenant_id': ObjectId(user['tenant_id'])}
        )
        
        if result.deleted_count == 0:
             return jsonify({'error': 'Product not found'}), 404
             
        return jsonify({'message': 'Product deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===== STOCK ADJUSTMENTS =====

@inventory_bp.route('/products/<product_id>/adjust-stock', methods=['POST'])
@tenant_required
@module_required('inventory')
def adjust_stock(product_id):
    """Adjust stock with reason tracking"""
    try:
        user = get_current_user()
        data = request.get_json()
        db = current_app.db
        
        adjustment = int(data.get('adjustment', 0))
        reason = data.get('reason', 'Manual adjustment')
        
        if adjustment == 0:
            return jsonify({'error': 'Adjustment cannot be zero'}), 400
        
        # Get current product
        product = db.products.find_one({
            '_id': ObjectId(product_id),
            'tenant_id': ObjectId(user['tenant_id'])
        })
        
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        
        new_stock = product['stock'] + adjustment
        if new_stock < 0:
            return jsonify({'error': 'Stock cannot be negative'}), 400
        
        # Update stock
        db.products.update_one(
            {'_id': ObjectId(product_id)},
            {'$set': {'stock': new_stock, 'updated_at': get_current_utc_time()}}
        )
        
        # Record adjustment history
        adjustment_record = {
            'tenant_id': ObjectId(user['tenant_id']),
            'product_id': ObjectId(product_id),
            'product_name': product['name'],
            'previous_stock': product['stock'],
            'adjustment': adjustment,
            'new_stock': new_stock,
            'reason': reason,
            'adjusted_by': ObjectId(user['_id']),
            'created_at': get_current_utc_time()
        }
        db.stock_adjustments.insert_one(adjustment_record)
        
        return jsonify({
            'message': 'Stock adjusted successfully',
            'previous_stock': product['stock'],
            'adjustment': adjustment,
            'new_stock': new_stock
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/stock-adjustments', methods=['GET'])
@tenant_required
@module_required('inventory')
def get_stock_adjustments():
    """Get stock adjustment history"""
    try:
        user = get_current_user()
        db = current_app.db
        
        adjustments = list(db.stock_adjustments.find({
            'tenant_id': ObjectId(user['tenant_id'])
        }).sort('created_at', -1).limit(100))
        
        return jsonify({
            'adjustments': serialize_doc(adjustments)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===== CATEGORIES =====

@inventory_bp.route('/categories', methods=['GET'])
@tenant_required
@module_required('inventory')
def get_categories():
    """Get all categories"""
    try:
        categories = list(get_categories_collection().find(get_tenant_filter()).sort('name', 1))
        
        return jsonify({
            'categories': serialize_doc(categories)
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/categories', methods=['POST'])
@tenant_required
@module_required('inventory')
def create_category():
    """Create category"""
    try:
        user = get_current_user()
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({'error': 'Category name is required'}), 400
        
        # Check if category already exists
        existing_filter = get_tenant_filter()
        existing_filter['name'] = {'$regex': f'^{data["name"]}$', '$options': 'i'}
        existing = get_categories_collection().find_one(existing_filter)
        if existing:
            return jsonify({'error': 'Category already exists'}), 400
        
        category = {
            **get_tenant_filter(),  # Adds tenant_id or demo_user_id
            'name': data['name'],
            'description': data.get('description', ''),
            'color': data.get('color', '#6366f1'),
            'created_at': get_current_utc_time()
        }
        
        result = get_categories_collection().insert_one(category)
        category['_id'] = result.inserted_id
        
        return jsonify({
            'message': 'Category created',
            'category': serialize_doc(category)
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/categories/<category_id>', methods=['PUT'])
@tenant_required
@module_required('inventory')
def update_category(category_id):
    """Update category"""
    try:
        data = request.get_json()
        
        update_data = {}
        if 'name' in data: update_data['name'] = data['name']
        if 'description' in data: update_data['description'] = data['description']
        if 'color' in data: update_data['color'] = data['color']
        
        update_filter = get_tenant_filter()
        update_filter['_id'] = ObjectId(category_id)
        
        result = get_categories_collection().update_one(
            update_filter,
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Category not found'}), 404
        
        # Update category name in products
        if 'name' in data:
            product_filter = get_tenant_filter()
            product_filter['category_id'] = ObjectId(category_id)
            get_products_collection().update_many(
                product_filter,
                {'$set': {'category': data['name']}}
            )
        
        return jsonify({'message': 'Category updated'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@inventory_bp.route('/categories/<category_id>', methods=['DELETE'])
@tenant_required
@module_required('inventory')
def delete_category(category_id):
    """Delete category"""
    try:
        # Check if category has products
        product_filter = get_tenant_filter()
        product_filter['category_id'] = ObjectId(category_id)
        product_count = get_products_collection().count_documents(product_filter)
        
        if product_count > 0:
            return jsonify({'error': f'Cannot delete category with {product_count} products'}), 400
        
        delete_filter = get_tenant_filter()
        delete_filter['_id'] = ObjectId(category_id)
        
        result = get_categories_collection().delete_one(delete_filter)
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Category not found'}), 404
        
        return jsonify({'message': 'Category deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===== DASHBOARD STATS =====

@inventory_bp.route('/stats', methods=['GET'])
@tenant_required
@module_required('inventory')
def get_inventory_stats():
    """Get inventory statistics"""
    try:
        user = get_current_user()
        db = current_app.db
        tenant_id = ObjectId(user['tenant_id'])
        
        # Total products
        total_products = db.products.count_documents({'tenant_id': tenant_id})
        
        # Low stock count (stock <= min_stock or stock <= 10)
        low_stock_count = db.products.count_documents({
            'tenant_id': tenant_id,
            '$expr': {'$lte': ['$stock', {'$ifNull': ['$min_stock', 10]}]}
        })
        
        # Out of stock
        out_of_stock = db.products.count_documents({
            'tenant_id': tenant_id,
            'stock': {'$lte': 0}
        })
        
        # Total stock value
        pipeline = [
            {'$match': {'tenant_id': tenant_id}},
            {'$group': {
                '_id': None,
                'total_value': {'$sum': {'$multiply': ['$stock', '$cost']}},
                'total_retail': {'$sum': {'$multiply': ['$stock', '$price']}}
            }}
        ]
        value_result = list(db.products.aggregate(pipeline))
        total_value = value_result[0]['total_value'] if value_result else 0
        total_retail = value_result[0]['total_retail'] if value_result else 0
        
        # Categories count
        categories_count = db.categories.count_documents({'tenant_id': tenant_id})
        
        return jsonify({
            'total_products': total_products,
            'low_stock_count': low_stock_count,
            'out_of_stock': out_of_stock,
            'total_stock_value': round(total_value, 2),
            'total_retail_value': round(total_retail, 2),
            'categories_count': categories_count
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

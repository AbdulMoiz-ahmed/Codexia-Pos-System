"""
Demo Portal Routes - Full Feature Demo System
"""
from flask import Blueprint, request, jsonify, current_app
from app.utils.helpers import serialize_doc, get_current_utc_time
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import secrets
import string
from werkzeug.security import generate_password_hash, check_password_hash
import jwt

demo_bp = Blueprint('demo', __name__)


def get_utc_now():
    """Get current UTC time as timezone-aware datetime"""
    return datetime.now(timezone.utc)


# ===== DEMO REQUEST & AUTH =====

@demo_bp.route('/request', methods=['POST'])
def request_demo():
    """Request demo access - creates demo customer and user with 24hr expiry"""
    try:
        data = request.get_json()
        db = current_app.db
        
        # Validate required fields
        required = ['name', 'email', 'phone']
        for field in required:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        email = data['email'].lower().strip()
        
        # Check if demo already exists for this email
        existing = db.demo_users.find_one({'email': email})
        if existing:
            # Check if expired
            expires_at = existing.get('expires_at')
            if expires_at:
                # Make timezone aware if needed
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at > get_utc_now():
                    return jsonify({'error': 'You already have an active demo account'}), 400
        
        # Generate username and password
        random_suffix = ''.join(secrets.choice(string.ascii_lowercase + string.digits) for _ in range(6))
        username = f"demo_{random_suffix}"
        password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(8))
        
        now = get_current_utc_time()
        expires_at = now + timedelta(hours=24)
        
        # Create demo customer record
        demo_customer = {
            'name': data['name'],
            'email': email,
            'phone': data['phone'],
            'company': data.get('company', ''),
            'package_interest': data.get('package_interest', 'professional'),
            'created_at': now
        }
        customer_result = db.demo_customers.insert_one(demo_customer)
        
        # Create demo user
        demo_user = {
            'demo_customer_id': customer_result.inserted_id,
            'email': email,
            'username': username,
            'password_hash': generate_password_hash(password),
            'name': data['name'],
            'expires_at': expires_at,
            'created_at': now,
            'is_active': True
        }
        user_result = db.demo_users.insert_one(demo_user)
        demo_user_id = user_result.inserted_id
        
        # Create seed data for this demo user
        _create_demo_seed_data(db, demo_user_id)
        
        return jsonify({
            'message': 'Demo account created successfully!',
            'credentials': {
                'username': username,
                'password': password,
                'expires_at': expires_at.isoformat(),
                'expires_in': '24 hours'
            },
            'login_url': '/demo/login'
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@demo_bp.route('/login', methods=['POST'])
def demo_login():
    """Demo user login"""
    try:
        data = request.get_json()
        db = current_app.db
        
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': 'Username and password required'}), 400
        
        # Find demo user
        demo_user = db.demo_users.find_one({'username': username})
        if not demo_user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check password
        if not check_password_hash(demo_user['password_hash'], password):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check expiry
        expires_at = demo_user.get('expires_at')
        if expires_at:
            # Make timezone aware if needed
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at < get_utc_now():
                return jsonify({'error': 'Demo account has expired'}), 401
        
        # Generate JWT token - exp must be a timestamp
        exp_timestamp = int(expires_at.timestamp()) if expires_at else int((get_utc_now() + timedelta(hours=24)).timestamp())
        token = jwt.encode({
            'demo_user_id': str(demo_user['_id']),
            'username': username,
            'is_demo': True,
            'exp': exp_timestamp
        }, current_app.config['SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'token': token,
            'user': {
                'id': str(demo_user['_id']),
                'username': demo_user['username'],
                'name': demo_user['name'],
                'email': demo_user['email'],
                'expires_at': demo_user['expires_at'].isoformat()
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def get_demo_user():
    """Get current demo user from token"""
    from flask import request
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        if not payload.get('is_demo'):
            return None
        
        db = current_app.db
        demo_user = db.demo_users.find_one({'_id': ObjectId(payload['demo_user_id'])})
        
        if demo_user:
            expires_at = demo_user.get('expires_at')
            if expires_at:
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at > get_utc_now():
                    return demo_user
        return None
    except:
        return None


def demo_required(f):
    """Decorator for demo-only routes"""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        demo_user = get_demo_user()
        if not demo_user:
            return jsonify({'error': 'Demo authentication required'}), 401
        return f(*args, **kwargs)
    return decorated


# ===== DEMO DASHBOARD =====

@demo_bp.route('/dashboard', methods=['GET'])
@demo_required
def get_demo_dashboard():
    """Get demo dashboard stats"""
    try:
        demo_user = get_demo_user()
        demo_user_id = demo_user['_id']
        db = current_app.db
        
        now = get_utc_now()
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_week = start_of_day - timedelta(days=7)
        
        # Today's sales
        today_pipeline = [
            {'$match': {'demo_user_id': demo_user_id, 'created_at': {'$gte': start_of_day}}},
            {'$group': {'_id': None, 'total': {'$sum': '$total_amount'}, 'count': {'$sum': 1}}}
        ]
        today_result = list(db.demo_sales.aggregate(today_pipeline))
        today_sales = today_result[0]['total'] if today_result else 0
        today_transactions = today_result[0]['count'] if today_result else 0
        
        # Products count
        total_products = db.demo_products.count_documents({'demo_user_id': demo_user_id})
        
        # Low stock
        low_stock = db.demo_products.count_documents({
            'demo_user_id': demo_user_id,
            'stock': {'$lt': 10}
        })
        
        # Customers
        total_customers = db.demo_customers_crm.count_documents({'demo_user_id': demo_user_id})
        
        # Recent sales
        recent_sales = list(db.demo_sales.find({
            'demo_user_id': demo_user_id
        }).sort('created_at', -1).limit(5))
        
        # Time remaining - handle timezone
        expires_at = demo_user.get('expires_at')
        if expires_at:
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            time_remaining = expires_at - now
            hours_remaining = max(0, time_remaining.total_seconds() / 3600)
        else:
            hours_remaining = 0
        
        return jsonify({
            'todaySales': round(today_sales, 2),
            'todayTransactions': today_transactions,
            'totalProducts': total_products,
            'lowStock': low_stock,
            'totalCustomers': total_customers,
            'recentSales': serialize_doc(recent_sales),
            'expiresAt': expires_at.isoformat() if expires_at else None,
            'hoursRemaining': round(hours_remaining, 1)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500



# ===== DEMO PRODUCTS =====

@demo_bp.route('/products', methods=['GET'])
@demo_required
def get_demo_products():
    """Get demo products"""
    try:
        demo_user = get_demo_user()
        db = current_app.db
        
        products = list(db.demo_products.find({
            'demo_user_id': demo_user['_id']
        }).sort('name', 1))
        
        return jsonify(serialize_doc(products)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@demo_bp.route('/products', methods=['POST'])
@demo_required
def create_demo_product():
    """Create demo product"""
    try:
        demo_user = get_demo_user()
        data = request.get_json()
        db = current_app.db
        
        product = {
            'demo_user_id': demo_user['_id'],
            'name': data['name'],
            'sku': data.get('sku', f"DEMO-{secrets.token_hex(3).upper()}"),
            'category': data.get('category', 'Uncategorized'),
            'price': float(data.get('price', 0)),
            'cost': float(data.get('cost', 0)),
            'stock': int(data.get('stock', 0)),
            'barcode': data.get('barcode', ''),
            'is_seed': False,
            'created_at': get_current_utc_time()
        }
        
        result = db.demo_products.insert_one(product)
        product['_id'] = result.inserted_id
        
        return jsonify(serialize_doc(product)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@demo_bp.route('/products/<product_id>', methods=['PUT'])
@demo_required
def update_demo_product(product_id):
    """Update demo product"""
    try:
        demo_user = get_demo_user()
        data = request.get_json()
        db = current_app.db
        
        update_data = {'updated_at': get_current_utc_time()}
        fields = ['name', 'sku', 'category', 'price', 'cost', 'stock', 'barcode']
        for field in fields:
            if field in data:
                update_data[field] = data[field]
        
        if 'price' in update_data: update_data['price'] = float(update_data['price'])
        if 'cost' in update_data: update_data['cost'] = float(update_data['cost'])
        if 'stock' in update_data: update_data['stock'] = int(update_data['stock'])
        
        result = db.demo_products.update_one(
            {'_id': ObjectId(product_id), 'demo_user_id': demo_user['_id']},
            {'$set': update_data}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Product not found'}), 404
        
        return jsonify({'message': 'Product updated'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@demo_bp.route('/products/<product_id>', methods=['DELETE'])
@demo_required
def delete_demo_product(product_id):
    """Delete demo product"""
    try:
        demo_user = get_demo_user()
        db = current_app.db
        
        result = db.demo_products.delete_one({
            '_id': ObjectId(product_id),
            'demo_user_id': demo_user['_id']
        })
        
        if result.deleted_count == 0:
            return jsonify({'error': 'Product not found'}), 404
        
        return jsonify({'message': 'Product deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===== DEMO CATEGORIES =====

@demo_bp.route('/categories', methods=['GET'])
@demo_required
def get_demo_categories():
    """Get demo categories"""
    try:
        demo_user = get_demo_user()
        db = current_app.db
        
        categories = list(db.demo_categories.find({
            'demo_user_id': demo_user['_id']
        }).sort('name', 1))
        
        return jsonify({'categories': serialize_doc(categories)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@demo_bp.route('/categories', methods=['POST'])
@demo_required
def create_demo_category():
    """Create demo category"""
    try:
        demo_user = get_demo_user()
        data = request.get_json()
        db = current_app.db
        
        category = {
            'demo_user_id': demo_user['_id'],
            'name': data['name'],
            'description': data.get('description', ''),
            'color': data.get('color', '#6366f1'),
            'created_at': get_current_utc_time()
        }
        
        result = db.demo_categories.insert_one(category)
        category['_id'] = result.inserted_id
        
        return jsonify({'category': serialize_doc(category)}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===== DEMO CUSTOMERS (CRM) =====

@demo_bp.route('/customers', methods=['GET'])
@demo_required
def get_demo_customers():
    """Get demo CRM customers"""
    try:
        demo_user = get_demo_user()
        db = current_app.db
        
        customers = list(db.demo_customers_crm.find({
            'demo_user_id': demo_user['_id']
        }).sort('name', 1))
        
        return jsonify({'customers': serialize_doc(customers)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@demo_bp.route('/customers', methods=['POST'])
@demo_required
def create_demo_customer():
    """Create demo CRM customer"""
    try:
        demo_user = get_demo_user()
        data = request.get_json()
        db = current_app.db
        
        customer = {
            'demo_user_id': demo_user['_id'],
            'name': data['name'],
            'email': data.get('email', ''),
            'phone': data.get('phone', ''),
            'company': data.get('company', ''),
            'address': data.get('address', ''),
            'created_at': get_current_utc_time()
        }
        
        result = db.demo_customers_crm.insert_one(customer)
        customer['_id'] = result.inserted_id
        
        return jsonify({'customer': serialize_doc(customer)}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===== DEMO POS (SALES) =====

@demo_bp.route('/sales', methods=['POST'])
@demo_required
def create_demo_sale():
    """Create demo POS sale"""
    try:
        demo_user = get_demo_user()
        data = request.get_json()
        db = current_app.db
        
        items = data.get('items', [])
        if not items:
            return jsonify({'error': 'Cart is empty'}), 400
        
        subtotal = sum(item['price'] * item['quantity'] for item in items)
        discount = float(data.get('discount', 0))
        tax = float(data.get('tax', 0))
        total = subtotal - discount + tax
        
        # Generate receipt number
        count = db.demo_sales.count_documents({'demo_user_id': demo_user['_id']})
        receipt_number = f"DEMO-{count + 1:06d}"
        
        sale = {
            'demo_user_id': demo_user['_id'],
            'items': items,
            'subtotal': round(subtotal, 2),
            'discount': round(discount, 2),
            'tax': round(tax, 2),
            'total_amount': round(total, 2),
            'payment_method': data.get('payment_method', 'cash'),
            'customer_name': data.get('customer_name', 'Walk-in Customer'),
            'receipt_number': receipt_number,
            'created_at': get_current_utc_time()
        }
        
        result = db.demo_sales.insert_one(sale)
        sale['_id'] = result.inserted_id
        
        # Update stock
        for item in items:
            db.demo_products.update_one(
                {'_id': ObjectId(item['id']), 'demo_user_id': demo_user['_id']},
                {'$inc': {'stock': -item['quantity']}}
            )
        
        return jsonify({
            'message': 'Sale completed',
            'sale': serialize_doc(sale)
        }), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@demo_bp.route('/sales', methods=['GET'])
@demo_required
def get_demo_sales():
    """Get demo sales history"""
    try:
        demo_user = get_demo_user()
        db = current_app.db
        
        sales = list(db.demo_sales.find({
            'demo_user_id': demo_user['_id']
        }).sort('created_at', -1).limit(50))
        
        return jsonify(serialize_doc(sales)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===== DEMO INVOICES =====

@demo_bp.route('/invoices', methods=['GET'])
@demo_required
def get_demo_invoices():
    """Get demo invoices"""
    try:
        demo_user = get_demo_user()
        db = current_app.db
        
        invoices = list(db.demo_invoices.find({
            'demo_user_id': demo_user['_id']
        }).sort('created_at', -1))
        
        return jsonify({'invoices': serialize_doc(invoices)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@demo_bp.route('/invoices', methods=['POST'])
@demo_required
def create_demo_invoice():
    """Create demo invoice"""
    try:
        demo_user = get_demo_user()
        data = request.get_json()
        db = current_app.db
        
        count = db.demo_invoices.count_documents({'demo_user_id': demo_user['_id']})
        invoice_number = f"DEMO-INV-{count + 1:05d}"
        
        invoice = {
            'demo_user_id': demo_user['_id'],
            'invoice_number': invoice_number,
            'customer_name': data.get('customer_name', ''),
            'items': data.get('items', []),
            'subtotal': float(data.get('subtotal', 0)),
            'tax': float(data.get('tax', 0)),
            'discount': float(data.get('discount', 0)),
            'total': float(data.get('total', 0)),
            'status': 'pending',
            'due_date': data.get('due_date'),
            'created_at': get_current_utc_time()
        }
        
        result = db.demo_invoices.insert_one(invoice)
        invoice['_id'] = result.inserted_id
        
        return jsonify({'invoice': serialize_doc(invoice)}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===== SEED DATA CREATION =====

def _create_demo_seed_data(db, demo_user_id):
    """Create seed data for new demo user"""
    now = get_current_utc_time()
    
    # Seed categories
    categories = [
        {'demo_user_id': demo_user_id, 'name': 'Electronics', 'color': '#3B82F6', 'created_at': now},
        {'demo_user_id': demo_user_id, 'name': 'Clothing', 'color': '#10B981', 'created_at': now},
        {'demo_user_id': demo_user_id, 'name': 'Food & Beverages', 'color': '#F59E0B', 'created_at': now},
    ]
    db.demo_categories.insert_many(categories)
    
    # Seed products
    products = [
        {'demo_user_id': demo_user_id, 'name': 'Wireless Earbuds', 'sku': 'DEMO-EAR001', 'category': 'Electronics', 'price': 2500, 'cost': 1800, 'stock': 50, 'is_seed': True, 'created_at': now},
        {'demo_user_id': demo_user_id, 'name': 'Smart Watch', 'sku': 'DEMO-WAT001', 'category': 'Electronics', 'price': 8500, 'cost': 6000, 'stock': 25, 'is_seed': True, 'created_at': now},
        {'demo_user_id': demo_user_id, 'name': 'USB-C Cable', 'sku': 'DEMO-CAB001', 'category': 'Electronics', 'price': 350, 'cost': 150, 'stock': 100, 'is_seed': True, 'created_at': now},
        {'demo_user_id': demo_user_id, 'name': 'Cotton T-Shirt', 'sku': 'DEMO-TSH001', 'category': 'Clothing', 'price': 1200, 'cost': 600, 'stock': 75, 'is_seed': True, 'created_at': now},
        {'demo_user_id': demo_user_id, 'name': 'Denim Jeans', 'sku': 'DEMO-JNS001', 'category': 'Clothing', 'price': 3500, 'cost': 2000, 'stock': 40, 'is_seed': True, 'created_at': now},
        {'demo_user_id': demo_user_id, 'name': 'Sports Shoes', 'sku': 'DEMO-SHO001', 'category': 'Clothing', 'price': 5500, 'cost': 3500, 'stock': 30, 'is_seed': True, 'created_at': now},
        {'demo_user_id': demo_user_id, 'name': 'Energy Drink', 'sku': 'DEMO-DRK001', 'category': 'Food & Beverages', 'price': 180, 'cost': 120, 'stock': 200, 'is_seed': True, 'created_at': now},
        {'demo_user_id': demo_user_id, 'name': 'Chocolate Bar', 'sku': 'DEMO-CHO001', 'category': 'Food & Beverages', 'price': 150, 'cost': 80, 'stock': 150, 'is_seed': True, 'created_at': now},
        {'demo_user_id': demo_user_id, 'name': 'Bottled Water', 'sku': 'DEMO-WAT002', 'category': 'Food & Beverages', 'price': 50, 'cost': 25, 'stock': 500, 'is_seed': True, 'created_at': now},
        {'demo_user_id': demo_user_id, 'name': 'Phone Case', 'sku': 'DEMO-CAS001', 'category': 'Electronics', 'price': 800, 'cost': 400, 'stock': 80, 'is_seed': True, 'created_at': now},
    ]
    db.demo_products.insert_many(products)
    
    # Seed customers
    customers = [
        {'demo_user_id': demo_user_id, 'name': 'Ahmed Khan', 'email': 'ahmed@demo.com', 'phone': '0300-1234567', 'created_at': now},
        {'demo_user_id': demo_user_id, 'name': 'Sara Ali', 'email': 'sara@demo.com', 'phone': '0321-7654321', 'created_at': now},
        {'demo_user_id': demo_user_id, 'name': 'Imran Shah', 'email': 'imran@demo.com', 'phone': '0333-1122334', 'created_at': now},
        {'demo_user_id': demo_user_id, 'name': 'Fatima Noor', 'email': 'fatima@demo.com', 'phone': '0345-5566778', 'created_at': now},
        {'demo_user_id': demo_user_id, 'name': 'Usman Raza', 'email': 'usman@demo.com', 'phone': '0312-9988776', 'created_at': now},
    ]
    db.demo_customers_crm.insert_many(customers)


# ===== CLEANUP EXPIRED DEMOS =====

def cleanup_expired_demos():
    """Delete expired demo accounts and their data - run via scheduler"""
    from flask import current_app
    db = current_app.db
    now = get_current_utc_time()
    
    # Find expired demo users
    expired_users = list(db.demo_users.find({
        'expires_at': {'$lt': now}
    }))
    
    for user in expired_users:
        user_id = user['_id']
        
        # Delete all user's demo data
        db.demo_products.delete_many({'demo_user_id': user_id})
        db.demo_sales.delete_many({'demo_user_id': user_id})
        db.demo_categories.delete_many({'demo_user_id': user_id})
        db.demo_customers_crm.delete_many({'demo_user_id': user_id})
        db.demo_invoices.delete_many({'demo_user_id': user_id})
        
        # Delete the demo user
        db.demo_users.delete_one({'_id': user_id})
    
    return len(expired_users)

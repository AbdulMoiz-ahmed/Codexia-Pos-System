"""
HR & Payroll Module Routes
"""
from flask import Blueprint, request, jsonify, current_app
from app.middleware.auth import tenant_required, get_current_user
from app.middleware.modules import module_required
from app.utils.helpers import serialize_doc, get_current_utc_time, is_demo_request, get_collection_name
from bson import ObjectId

hr_bp = Blueprint('hr', __name__)


def get_tenant_filter():
    """Get the filter for tenant/demo data isolation"""
    user = get_current_user()
    if is_demo_request():
        return {'demo_user_id': user['_id']}
    return {'tenant_id': ObjectId(user['tenant_id'])}


def get_employees_collection():
    return current_app.db[get_collection_name('employees')]


def get_attendance_collection():
    return current_app.db[get_collection_name('attendance')]


@hr_bp.route('/employees', methods=['GET'])
@tenant_required
@module_required('hr')
def get_employees():
    """Get all employees with their user account info"""
    try:
        employees = list(get_employees_collection().find(get_tenant_filter()))
        
        # Get user details for employees with accounts
        db = current_app.db
        for emp in employees:
            if emp.get('user_id'):
                user = db.users.find_one({'_id': emp['user_id']})
                if user:
                    emp['user_details'] = {
                        'username': user.get('username'),
                        'role': user.get('role'),
                        'allowed_modules': user.get('allowed_modules', [])
                    }
        
        return jsonify({
            'employees': [serialize_doc(e) for e in employees]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@hr_bp.route('/employees', methods=['POST'])
@tenant_required
@module_required('hr')
def create_employee():
    """Create new employee"""
    try:
        data = request.get_json()
        
        # Generate employee ID
        count = get_employees_collection().count_documents(get_tenant_filter())
        employee_id = f"EMP-{count + 1:04d}"
        
        employee_data = {
            **get_tenant_filter(),
            'employee_id': employee_id,
            'first_name': data['first_name'],
            'last_name': data['last_name'],
            'email': data.get('email', ''),
            'phone': data.get('phone', ''),
            'department': data.get('department', ''),
            'position': data.get('position', ''),
            'salary': data.get('salary', 0),
            'hire_date': data.get('hire_date'),
            'status': 'active',
            'created_at': get_current_utc_time()
        }
        
        result = get_employees_collection().insert_one(employee_data)
        employee_data['_id'] = result.inserted_id
        
        return jsonify({
            'message': 'Employee created successfully',
            'employee': serialize_doc(employee_data)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@hr_bp.route('/employees/<employee_id>', methods=['PUT'])
@tenant_required
@module_required('hr')
def update_employee(employee_id):
    """Update employee"""
    try:
        data = request.get_json()
        
        update_filter = get_tenant_filter()
        update_filter['_id'] = ObjectId(employee_id)
        
        result = get_employees_collection().update_one(
            update_filter,
            {'$set': {
                **data,
                'updated_at': get_current_utc_time()
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Employee not found'}), 404
        
        return jsonify({'message': 'Employee updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@hr_bp.route('/employees/<employee_id>', methods=['DELETE'])
@tenant_required
@module_required('hr')
def delete_employee(employee_id):
    """Delete employee and associated user account"""
    try:
        delete_filter = get_tenant_filter()
        delete_filter['_id'] = ObjectId(employee_id)
        
        # Find employee first to check for user account
        employee = get_employees_collection().find_one(delete_filter)
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
            
        # Delete associated user account if exists
        if employee.get('user_id'):
            current_app.db.users.delete_one({'_id': employee['user_id']})
        
        result = get_employees_collection().delete_one(delete_filter)
        
        return jsonify({'message': 'Employee and associated user account deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@hr_bp.route('/attendance', methods=['GET'])
@tenant_required
@module_required('hr')
def get_attendance():
    """Get attendance records"""
    try:
        attendance = list(get_attendance_collection().find(get_tenant_filter()))
        
        return jsonify({
            'attendance': [serialize_doc(a) for a in attendance]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@hr_bp.route('/attendance', methods=['POST'])
@tenant_required
@module_required('hr')
def mark_attendance():
    """Mark attendance"""
    try:
        data = request.get_json()
        
        attendance_data = {
            **get_tenant_filter(),
            'employee_id': ObjectId(data['employee_id']),
            'date': data['date'],
            'check_in': data.get('check_in'),
            'check_out': data.get('check_out'),
            'status': data.get('status', 'present'),
            'notes': data.get('notes', ''),
            'created_at': get_current_utc_time()
        }
        
        result = get_attendance_collection().insert_one(attendance_data)
        
        return jsonify({
            'message': 'Attendance marked successfully',
            'attendance': serialize_doc(attendance_data)
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ===== USER CREATION FROM EMPLOYEE =====

@hr_bp.route('/employees/<employee_id>/create-user', methods=['POST'])
@tenant_required
@module_required('hr')
def create_user_from_employee(employee_id):
    """Create a user account for an employee with role-based permissions"""
    try:
        import bcrypt
        from app.routes.roles import ROLE_DEFINITIONS
        
        user = get_current_user()
        data = request.get_json()
        db = current_app.db
        
        # Validate required fields
        required = ['email', 'username', 'password', 'role']
        for field in required:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        # Validate password match
        if data.get('password') != data.get('confirm_password'):
            return jsonify({'error': 'Passwords do not match'}), 400
        
        # Check if employee exists
        emp_filter = get_tenant_filter()
        emp_filter['_id'] = ObjectId(employee_id)
        employee = get_employees_collection().find_one(emp_filter)
        
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
        
        # Check if employee already has a user account
        if employee.get('user_id'):
            return jsonify({'error': 'Employee already has a user account'}), 400
        
        # Check email uniqueness
        existing_email = db.users.find_one({'email': data['email'].lower().strip()})
        if existing_email:
            return jsonify({'error': 'Email already in use'}), 400
        
        # Check username uniqueness
        existing_username = db.users.find_one({'username': data['username'].lower().strip()})
        if existing_username:
            return jsonify({'error': 'Username already in use'}), 400
        
        # Validate role
        role = data['role']
        if role not in ROLE_DEFINITIONS:
            return jsonify({'error': 'Invalid role'}), 400
        
        # Get allowed modules based on role
        if role == 'custom':
            allowed_modules = data.get('allowed_modules', [])
        else:
            allowed_modules = ROLE_DEFINITIONS[role]['modules']
        
        # Create user account
        new_user = {
            'tenant_id': ObjectId(user['tenant_id']),
            'employee_id': ObjectId(employee_id),
            'email': data['email'].lower().strip(),
            'username': data['username'].lower().strip(),
            'password_hash': bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8'),
            'first_name': employee.get('first_name', ''),
            'last_name': employee.get('last_name', ''),
            'role': role,
            'allowed_modules': allowed_modules,
            'is_active': True,
            'is_super_admin': False,
            'created_at': get_current_utc_time(),
            'created_by': user['_id']
        }
        
        result = db.users.insert_one(new_user)
        new_user['_id'] = result.inserted_id
        
        # Update employee with user_id
        get_employees_collection().update_one(
            {'_id': ObjectId(employee_id)},
            {'$set': {'user_id': result.inserted_id, 'has_user_account': True}}
        )
        
        return jsonify({
            'message': 'User account created successfully',
            'user': serialize_doc({
                '_id': new_user['_id'],
                'email': new_user['email'],
                'username': new_user['username'],
                'role': new_user['role'],
                'allowed_modules': new_user['allowed_modules']
            })
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@hr_bp.route('/employees/<employee_id>/user', methods=['GET'])
@tenant_required
@module_required('hr')
def get_employee_user(employee_id):
    """Get user account details for an employee"""
    try:
        db = current_app.db
        
        # Check if employee exists
        emp_filter = get_tenant_filter()
        emp_filter['_id'] = ObjectId(employee_id)
        employee = get_employees_collection().find_one(emp_filter)
        
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
        
        if not employee.get('user_id'):
            return jsonify({'error': 'Employee does not have a user account'}), 404
        
        user = db.users.find_one({'_id': employee['user_id']})
        if not user:
            return jsonify({'error': 'User account not found'}), 404
        
        return jsonify({
            'user': serialize_doc({
                '_id': user['_id'],
                'email': user['email'],
                'username': user['username'],
                'role': user.get('role', 'admin'),
                'allowed_modules': user.get('allowed_modules', []),
                'is_active': user.get('is_active', True),
                'created_at': user.get('created_at')
            })
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@hr_bp.route('/employees/<employee_id>/user', methods=['PUT'])
@tenant_required
@module_required('hr')
def update_employee_user(employee_id):
    """Update user account details for an employee"""
    try:
        import bcrypt
        from app.routes.roles import ROLE_DEFINITIONS
        
        data = request.get_json()
        db = current_app.db
        
        # Check if employee exists
        emp_filter = get_tenant_filter()
        emp_filter['_id'] = ObjectId(employee_id)
        employee = get_employees_collection().find_one(emp_filter)
        
        if not employee:
            return jsonify({'error': 'Employee not found'}), 404
        
        if not employee.get('user_id'):
            return jsonify({'error': 'Employee does not have a user account'}), 404
        
        user = db.users.find_one({'_id': employee['user_id']})
        if not user:
            return jsonify({'error': 'User account not found'}), 404
        
        update_data = {}
        
        # Update username if provided
        if data.get('username') and data['username'] != user.get('username'):
            existing = db.users.find_one({'username': data['username'].lower().strip(), '_id': {'$ne': user['_id']}})
            if existing:
                return jsonify({'error': 'Username already in use'}), 400
            update_data['username'] = data['username'].lower().strip()
        
        if data.get('password'):
            if data.get('password') != data.get('confirm_password'):
                return jsonify({'error': 'Passwords do not match'}), 400
            update_data['password_hash'] = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Update role if provided
        if data.get('role'):
            if data['role'] not in ROLE_DEFINITIONS:
                return jsonify({'error': 'Invalid role'}), 400
            update_data['role'] = data['role']
            
            # Update allowed modules based on role
            if data['role'] == 'custom':
                update_data['allowed_modules'] = data.get('allowed_modules', [])
            else:
                update_data['allowed_modules'] = ROLE_DEFINITIONS[data['role']]['modules']
        
        if update_data:
            update_data['updated_at'] = get_current_utc_time()
            db.users.update_one({'_id': user['_id']}, {'$set': update_data})
        
        return jsonify({'message': 'User account updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

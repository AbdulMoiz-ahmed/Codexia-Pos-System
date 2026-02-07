"""
Manual fix: Create user with correct password hashing
"""
from pymongo import MongoClient
import bcrypt
from datetime import datetime, timezone

client = MongoClient('mongodb://localhost:27017/')
db = client['pos_erp_saas']

# Delete existing user
db.users.delete_one({'email': 'raay@gmail.com'})
print('Deleted old user')

# Get tenant
tenant = db.tenants.find_one({'email': 'raay@gmail.com'})
if not tenant:
    print('ERROR: Tenant not found!')
    exit(1)

print(f'Found tenant: {tenant["company_name"]}')

# Create password
plain_password = 'TestPassword123'  # Simple password for testing
password_hash = bcrypt.hashpw(plain_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

# Create user manually
user_data = {
    'email': 'raay@gmail.com',
    'password_hash': password_hash,
    'first_name': 'Rafay',
    'last_name': '',
    'tenant_id': tenant['_id'],
    'is_super_admin': False,
    'is_active': True,
    'created_at': datetime.now(timezone.utc),
    'last_login': None
}

result = db.users.insert_one(user_data)
print(f'Created user with ID: {result.inserted_id}')

# Verify it works
verification = bcrypt.checkpw(plain_password.encode('utf-8'), password_hash.encode('utf-8'))
print(f'Password verification test: {verification}')

print(f'\n✅ User created successfully!')
print(f'Email: raay@gmail.com')
print(f'Password: {plain_password}')
print(f'Login URL: http://localhost:3000/customer/login')

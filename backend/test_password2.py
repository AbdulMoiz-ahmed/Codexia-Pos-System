from pymongo import MongoClient
import bcrypt

client = MongoClient('mongodb://localhost:27017/')
db = client['pos_erp_saas']

# Test creating a user with bcrypt the same way User.create does
test_password = '9Bgyf7KhHl6EUL4t'

# Hash it
password_hash = bcrypt.hashpw(
    test_password.encode('utf-8'),
    bcrypt.gensalt()
).decode('utf-8')

print('Original password:', test_password)
print('Hashed password:', password_hash)

# Verify it works
result = bcrypt.checkpw(
    test_password.encode('utf-8'),
    password_hash.encode('utf-8')
)
print('Verification of newly hashed:', result)

# Now check the actual user
user = db.users.find_one({'email': 'raay@gmail.com'})
if user and 'password_hash' in user:
    print('\nActual user password_hash:', user['password_hash'][:60] + '...')
    result2 = bcrypt.checkpw(
        test_password.encode('utf-8'),
        user['password_hash'].encode('utf-8')
    )
    print('Verification of actual user:', result2)

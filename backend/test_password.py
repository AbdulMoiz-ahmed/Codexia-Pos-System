from pymongo import MongoClient
import bcrypt

client = MongoClient('mongodb://localhost:27017/')
db = client['pos_erp_saas']

user = db.users.find_one({'email': 'raay@gmail.com'})

if user:
    print('User found!')
    print('Email:', user['email'])
    print('Has password_hash:', 'password_hash' in user)
    
    test_password = '9Bgyf7KhHl6EUL4t'
    
    if 'password_hash' in user:
        try:
            result = bcrypt.checkpw(
                test_password.encode('utf-8'),
                user['password_hash'].encode('utf-8')
            )
            print('Password verification result:', result)
        except Exception as e:
            print('Error during verification:', str(e))
    else:
        print('No password_hash found!')
else:
    print('User not found!')

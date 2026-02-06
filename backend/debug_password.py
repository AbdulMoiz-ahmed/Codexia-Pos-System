"""
Debug script to check password issue
"""
from pymongo import MongoClient
import bcrypt

client = MongoClient('mongodb://localhost:27017/')
db = client['pos_erp_saas']

# Check the user
user = db.users.find_one({'email': 'raay@gmail.com'})

if user:
    print('User exists!')
    print('Email:', user['email'])
    print('Has password_hash:', 'password_hash' in user)
    
    # Test with the new password
    test_password = 'NVsPrO3xk2ErAUCb'
    
    if 'password_hash' in user:
        print('\nPassword hash:', user['password_hash'][:60] + '...')
        
        # Test verification
        try:
            result = bcrypt.checkpw(
                test_password.encode('utf-8'),
                user['password_hash'].encode('utf-8')
            )
            print('Password verification:', result)
        except Exception as e:
            print('Error:', str(e))
            
        # Also test creating a new hash and verifying
        new_hash = bcrypt.hashpw(test_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        new_result = bcrypt.checkpw(test_password.encode('utf-8'), new_hash.encode('utf-8'))
        print('\nNew hash verification (should be True):', new_result)
else:
    print('User not found!')
    
# Check booking
booking = db.bookings.find_one({'email': 'raay@gmail.com'})
if booking:
    print('\nBooking status:', booking.get('status'))
    print('Temp password in booking:', booking.get('temp_password'))

"""
Quick fix script to delete test user and reset booking
"""
from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/')
db = client['pos_erp_saas']

# Delete the incorrectly created user
result = db.users.delete_one({'email': 'raay@gmail.com'})
print(f'Deleted {result.deleted_count} user(s)')

# Reset the booking to pending
booking_result = db.bookings.update_one(
    {'email': 'raay@gmail.com'},
    {'$set': {'status': 'pending'}}
)
print(f'Reset {booking_result.modified_count} booking(s) to pending')

print('\nNow you can approve the booking again in the admin panel!')
print('The new credentials will work correctly.')

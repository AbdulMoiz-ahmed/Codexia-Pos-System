"""
Clean up script - Remove all bookings and users (except super admin)
"""
from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/')
db = client['pos_erp_saas']

# Delete all bookings
bookings_result = db.bookings.delete_many({})
print(f'Deleted {bookings_result.deleted_count} bookings')

# Delete all users except super admin
users_result = db.users.delete_many({'is_super_admin': {'$ne': True}})
print(f'Deleted {users_result.deleted_count} tenant users')

# Delete all tenants
tenants_result = db.tenants.delete_many({})
print(f'Deleted {tenants_result.deleted_count} tenants')

print('\n✅ Database cleaned! Ready for fresh start.')

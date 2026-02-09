"""
Script to clear all bookings and tenants from the database
"""
from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient('mongodb://localhost:27017/pos_erp_saas')
db = client['pos_erp_saas']

print("=== Before Cleanup ===")
print(f"Bookings: {db.bookings.count_documents({})}")
print(f"Tenants: {db.tenants.count_documents({})}")
print(f"Users (non-admin): {db.users.count_documents({'is_super_admin': False})}")

# Delete all bookings
db.bookings.delete_many({})
print("\n✓ Deleted all bookings")

# Delete all tenants
db.tenants.delete_many({})
print("✓ Deleted all tenants")

# Delete all tenant users (keep super admin)
db.users.delete_many({'is_super_admin': False})
print("✓ Deleted all tenant users")

print("\n=== After Cleanup ===")
print(f"Bookings: {db.bookings.count_documents({})}")
print(f"Tenants: {db.tenants.count_documents({})}")
print(f"Users (non-admin): {db.users.count_documents({'is_super_admin': False})}")

print("\n✅ Database cleanup complete!")

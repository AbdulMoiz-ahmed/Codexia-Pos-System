from pymongo import MongoClient

client = MongoClient('mongodb://localhost:27017/')
db = client['pos_erp_saas']

# Count tenants
count = db.tenants.count_documents({})
print(f'Total tenants: {count}')

# List tenants
tenants = list(db.tenants.find())
for tenant in tenants:
    print(f"- {tenant.get('company_name')} ({tenant.get('email')})")

# Check if any exist
if count == 0:
    print('\nNo tenants found! Database was cleaned.')
else:
    print(f'\n{count} tenant(s) exist in database')

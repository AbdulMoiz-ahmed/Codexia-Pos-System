from app import create_app
from app.models.user import User

app = create_app()

with app.app_context():
    db = app.db
    # Find the user for 'checkng' company (Enterprise plan)
    # Based on previous output, company name is 'checkng'
    
    user = db.users.find_one({'username': 'checkng'})
    if user:
        # Update password directly or via model
        # Using model to hash
        User.update(user['_id'], {'password': '123456'})
        print(f"✅ Password for user '{user['username']}' reset to '123456'")
        
        # Verify tenant package
        tenant = db.tenants.find_one({'_id': user['tenant_id']})
        print(f"Tenant Package: {tenant['license']['package_name']}")
    else:
        print("❌ User 'checkng' not found")

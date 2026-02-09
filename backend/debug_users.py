from app import create_app
from bson import ObjectId

app = create_app()

with app.app_context():
    db = app.db
    
    output = []
    output.append("\n👥 USERS:")
    users = list(db.users.find())
    for u in users:
        output.append(f"User: {u.get('username')} | Email: {u.get('email')} | TenantID: {u.get('tenant_id')} | Role: {'SuperAdmin' if u.get('is_super_admin') else 'User'}")

    output.append("\n🏢 TENANTS:")
    tenants = list(db.tenants.find())
    tenant_map = {t['_id']: t.get('company_name') for t in tenants}
    for t in tenants:
        output.append(f"Tenant: {t['_id']} | Company: {t.get('company_name')} | Pkg: {t.get('license', {}).get('package_name')}")
        
    output.append("\n🔍 MAPPING CHECK:")
    for u in users:
        if u.get('tenant_id'):
            tid = u.get('tenant_id')
            tname = tenant_map.get(tid, "UNKNOWN")
            output.append(f"User '{u.get('username')}' belongs to Tenant '{tname}' ({tid})")
            
    with open('backend/users_dump.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(output))
    print("✅ Dump written to backend/users_dump.txt")

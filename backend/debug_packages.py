from app import create_app
from bson import ObjectId

app = create_app()

with app.app_context():
    db = app.db
    
    print("\n📦 PACKAGES IN DB:")
    packages = list(db.packages.find())
    package_map = {}
    for p in packages:
        print(f"ID: {p['_id']} | Name: {p.get('name')} | Display: {p.get('display_name')}")
        package_map[str(p['_id'])] = p.get('name')

    print("\n📅 BOOKINGS:")
    bookings = list(db.bookings.find())
    for b in bookings:
        pid = str(b.get('package_id'))
        pname = package_map.get(pid, "UNKNOWN")
        print(f"Booking: {b['_id']} | Company: {b.get('company_name')} | PkgID: {pid} ({pname}) | Status: {b.get('status')}")

    print("\n🏢 TENANTS:")
    tenants = list(db.tenants.find())
    for t in tenants:
        lic = t.get('license', {})
        print(f"Tenant: {t['_id']} | Company: {t.get('company_name')} | Pkg: {lic.get('package_name')} | Modules: {t.get('enabled_modules')}")

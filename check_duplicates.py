from app import create_app
app = create_app()

with app.app_context():
    db = app.db
    users = list(db.users.find())
    
    email_map = {}
    for u in users:
        email = u.get('email')
        if email in email_map:
            email_map[email].append(u['username'])
        else:
            email_map[email] = [u['username']]
            
    print("\n📧 DUPLICATE EMAILS CHECK:")
    found = False
    for email, usernames in email_map.items():
        if len(usernames) > 1:
            print(f"⚠️ Email '{email}' is shared by users: {usernames}")
            found = True
            
    if not found:
        print("✅ No duplicate emails found.")

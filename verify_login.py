import requests
import json

BASE_URL = 'http://localhost:5000/api'


output_log = []

def log(msg):
    print(msg)
    output_log.append(msg)

def test_login(identifier, password):
    log(f"\n🔐 Attempting login for '{identifier}'...")
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={'email': identifier, 'password': password})
        if resp.status_code == 200:
            log("✅ Login Successful")
            data = resp.json()
            token = data['access_token']
            user = data['user']
            log(f"   User: {user.get('username')}")
            log(f"   Tenant: {user.get('tenant_name')}")
            return token
        else:
            log(f"❌ Login Failed: {resp.status_code} - {resp.text}")
            return None
    except Exception as e:
        log(f"❌ Error: {str(e)}")
        return None

def get_subscription(token):
    log("📡 Fetching Subscription...")
    try:
        headers = {'Authorization': f"Bearer {token}"}
        resp = requests.get(f"{BASE_URL}/customer/subscription", headers=headers)
        if resp.status_code == 200:
            sub = resp.json()
            log(f"✅ Subscription Data:")
            log(f"   Package: {sub.get('package')}")
            log(f"   Company: {sub.get('company_name')}")
            log(f"   Modules: {sub.get('enabled_modules')}")
        else:
            log(f"❌ Fetch Failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        log(f"❌ Error: {str(e)}")

log("--- TESTING USER CHECKNG (Enterprise) ---")
token = test_login('checkng', '123456')
if token:
    get_subscription(token)

with open('login_result.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(output_log))
print("Results written to login_result.txt")

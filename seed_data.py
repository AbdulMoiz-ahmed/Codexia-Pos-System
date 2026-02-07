"""
Seed sample data for testing
"""
from app import create_app
from app.utils.constants import (
    MODULE_POS, MODULE_INVENTORY, MODULE_SALES, MODULE_PURCHASE,
    MODULE_ACCOUNTING, MODULE_HR, MODULE_MANUFACTURING, MODULE_ASSETS,
    BILLING_CYCLE_MONTHLY
)
from app.utils.helpers import get_current_utc_time


def seed_packages():
    """Create sample packages"""
    app = create_app()
    
    with app.app_context():
        db = app.db
        
        # Check if packages already exist
        if db.packages.count_documents({}) > 0:
            print("✅ Packages already exist")
            return
        
        packages = [
            {
                'name': 'Starter',
                'display_name': 'Starter Plan',
                'description': 'Perfect for small businesses and startups',
                'price': 5000,
                'currency': 'PKR',
                'billing_cycle': BILLING_CYCLE_MONTHLY,
                'modules': [
                    {'name': MODULE_POS, 'enabled': True},
                    {'name': MODULE_INVENTORY, 'enabled': True},
                    {'name': MODULE_SALES, 'enabled': True},
                    {'name': MODULE_PURCHASE, 'enabled': False},
                    {'name': MODULE_ACCOUNTING, 'enabled': False},
                    {'name': MODULE_HR, 'enabled': False},
                    {'name': MODULE_MANUFACTURING, 'enabled': False},
                    {'name': MODULE_ASSETS, 'enabled': False}
                ],
                'limits': {
                    'users': 5,
                    'branches': 1,
                    'warehouses': 1,
                    'monthly_transactions': 1000
                },
                'features': [
                    'POS System',
                    'Basic Inventory',
                    'Sales Management',
                    'Email Support'
                ],
                'trial_days': 14,
                'is_active': True,
                'is_custom': False,
                'created_at': get_current_utc_time()
            },
            {
                'name': 'Professional',
                'display_name': 'Professional Plan',
                'description': 'For growing businesses with advanced needs',
                'price': 15000,
                'currency': 'PKR',
                'billing_cycle': BILLING_CYCLE_MONTHLY,
                'modules': [
                    {'name': MODULE_POS, 'enabled': True},
                    {'name': MODULE_INVENTORY, 'enabled': True},
                    {'name': MODULE_SALES, 'enabled': True},
                    {'name': MODULE_PURCHASE, 'enabled': True},
                    {'name': MODULE_ACCOUNTING, 'enabled': True},
                    {'name': MODULE_HR, 'enabled': True},
                    {'name': MODULE_MANUFACTURING, 'enabled': False},
                    {'name': MODULE_ASSETS, 'enabled': False}
                ],
                'limits': {
                    'users': 20,
                    'branches': 5,
                    'warehouses': 10,
                    'monthly_transactions': 10000
                },
                'features': [
                    'Full POS System',
                    'Advanced Inventory',
                    'Sales & CRM',
                    'Purchase Management',
                    'Accounting & Finance',
                    'HR & Payroll',
                    'Priority Support'
                ],
                'trial_days': 14,
                'is_active': True,
                'is_custom': False,
                'created_at': get_current_utc_time()
            },
            {
                'name': 'Enterprise',
                'display_name': 'Enterprise Plan',
                'description': 'Complete solution for large organizations',
                'price': 50000,
                'currency': 'PKR',
                'billing_cycle': BILLING_CYCLE_MONTHLY,
                'modules': [
                    {'name': MODULE_POS, 'enabled': True},
                    {'name': MODULE_INVENTORY, 'enabled': True},
                    {'name': MODULE_SALES, 'enabled': True},
                    {'name': MODULE_PURCHASE, 'enabled': True},
                    {'name': MODULE_ACCOUNTING, 'enabled': True},
                    {'name': MODULE_HR, 'enabled': True},
                    {'name': MODULE_MANUFACTURING, 'enabled': True},
                    {'name': MODULE_ASSETS, 'enabled': True}
                ],
                'limits': {
                    'users': 100,
                    'branches': 50,
                    'warehouses': 100,
                    'monthly_transactions': 100000
                },
                'features': [
                    'Full POS System',
                    'Advanced Inventory & Warehousing',
                    'Sales & CRM',
                    'Purchase Management',
                    'Complete Accounting',
                    'HR & Payroll',
                    'Manufacturing Module',
                    'Fixed Assets Management',
                    'Multi-branch Support',
                    'API Access',
                    'Dedicated Support',
                    'Custom Reports'
                ],
                'trial_days': 30,
                'is_active': True,
                'is_custom': False,
                'created_at': get_current_utc_time()
            }
        ]
        
        # Insert packages
        result = db.packages.insert_many(packages)
        print(f"✅ Created {len(result.inserted_ids)} packages")
        
        # Display packages
        for pkg in packages:
            print(f"   - {pkg['display_name']}: PKR {pkg['price']:,}/month")


if __name__ == '__main__':
    seed_packages()

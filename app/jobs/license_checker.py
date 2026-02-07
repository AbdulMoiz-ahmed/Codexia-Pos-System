"""
Background job for checking and updating license statuses
"""
from datetime import datetime, timezone, timedelta
from flask import current_app
from app.utils.constants import LICENSE_STATUS_ACTIVE, LICENSE_STATUS_EXPIRED, LICENSE_STATUS_TRIAL


def check_license_expiry():
    """
    Check all tenants for license expiry and update statuses
    This job should run daily
    """
    try:
        db = current_app.db
        now = datetime.now(timezone.utc)
        
        # Find all active or trial tenants
        tenants = list(db.tenants.find({
            'license.status': {'$in': [LICENSE_STATUS_ACTIVE, LICENSE_STATUS_TRIAL]}
        }))
        
        expired_count = 0
        
        for tenant in tenants:
            license_info = tenant.get('license', {})
            expiry_date = license_info.get('expiry_date')
            
            if not expiry_date:
                continue
            
            # Make expiry_date timezone-aware if needed
            if expiry_date.tzinfo is None:
                expiry_date = expiry_date.replace(tzinfo=timezone.utc)
            
            # Check if license has expired
            if now > expiry_date:
                credit_days = license_info.get('credit_days', 0)
                
                # Check if still in credit period
                if credit_days > 0:
                    credit_expiry = expiry_date + timedelta(days=credit_days)
                    
                    if now > credit_expiry:
                        # Credit period also expired
                        db.tenants.update_one(
                            {'_id': tenant['_id']},
                            {'$set': {'license.status': LICENSE_STATUS_EXPIRED}}
                        )
                        expired_count += 1
                        
                        # Log the expiry
                        log_license_expiry(db, tenant)
                else:
                    # No credit period, expire immediately
                    db.tenants.update_one(
                        {'_id': tenant['_id']},
                        {'$set': {'license.status': LICENSE_STATUS_EXPIRED}}
                    )
                    expired_count += 1
                    
                    # Log the expiry
                    log_license_expiry(db, tenant)
        
        print(f"✅ License check completed. {expired_count} license(s) expired.")
        return expired_count
        
    except Exception as e:
        print(f"❌ Error in license check job: {str(e)}")
        return 0


def log_license_expiry(db, tenant):
    """Log license expiry to audit logs"""
    from app.utils.helpers import get_current_utc_time
    
    audit_log = {
        'tenant_id': tenant.get('tenant_id'),
        'user_id': None,
        'action': 'license.expired',
        'module': 'licensing',
        'description': f"License expired for tenant {tenant.get('company_name')}",
        'ip_address': None,
        'user_agent': None,
        'metadata': {
            'tenant_id': tenant.get('tenant_id'),
            'company_name': tenant.get('company_name'),
            'expiry_date': tenant.get('license', {}).get('expiry_date')
        },
        'timestamp': get_current_utc_time()
    }
    
    db.audit_logs.insert_one(audit_log)


def send_expiry_reminders():
    """
    Send reminders to tenants whose licenses are about to expire
    This job should run daily
    """
    try:
        db = current_app.db
        now = datetime.now(timezone.utc)
        
        # Find tenants expiring in 7, 3, or 1 day(s)
        reminder_days = [7, 3, 1]
        
        for days in reminder_days:
            target_date = now + timedelta(days=days)
            
            # Find tenants expiring on target date
            tenants = list(db.tenants.find({
                'license.status': {'$in': [LICENSE_STATUS_ACTIVE, LICENSE_STATUS_TRIAL]},
                'license.expiry_date': {
                    '$gte': target_date,
                    '$lt': target_date + timedelta(days=1)
                }
            }))
            
            for tenant in tenants:
                # TODO: Send email reminder
                # For now, just log it
                print(f"⚠️  Reminder: {tenant.get('company_name')} license expires in {days} day(s)")
                
                # Log reminder
                log_reminder(db, tenant, days)
        
        print(f"✅ Expiry reminders sent")
        
    except Exception as e:
        print(f"❌ Error in reminder job: {str(e)}")


def log_reminder(db, tenant, days):
    """Log reminder to audit logs"""
    from app.utils.helpers import get_current_utc_time
    
    audit_log = {
        'tenant_id': tenant.get('tenant_id'),
        'user_id': None,
        'action': 'license.reminder_sent',
        'module': 'licensing',
        'description': f"Expiry reminder sent to {tenant.get('company_name')} ({days} days)",
        'ip_address': None,
        'user_agent': None,
        'metadata': {
            'tenant_id': tenant.get('tenant_id'),
            'company_name': tenant.get('company_name'),
            'days_until_expiry': days
        },
        'timestamp': get_current_utc_time()
    }
    
    db.audit_logs.insert_one(audit_log)

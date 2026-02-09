"""
Background job scheduler
"""
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from flask import current_app


scheduler = None


def init_scheduler(app):
    """Initialize and start the background scheduler"""
    global scheduler
    
    if scheduler is not None:
        return scheduler
    
    scheduler = BackgroundScheduler()
    
    # Add jobs
    with app.app_context():
        from app.jobs.license_checker import check_license_expiry, send_expiry_reminders
        
        # Run license check daily at 2 AM
        scheduler.add_job(
            func=lambda: check_license_expiry_with_context(app),
            trigger=CronTrigger(hour=2, minute=0),
            id='license_expiry_check',
            name='Check license expiry',
            replace_existing=True
        )
        
        # Run expiry reminders daily at 9 AM
        scheduler.add_job(
            func=lambda: send_expiry_reminders_with_context(app),
            trigger=CronTrigger(hour=9, minute=0),
            id='expiry_reminders',
            name='Send expiry reminders',
            replace_existing=True
        )
        
        # For testing: Run license check every hour
        # Uncomment for production and remove the hourly job
        scheduler.add_job(
            func=lambda: check_license_expiry_with_context(app),
            trigger='interval',
            hours=1,
            id='license_expiry_check_hourly',
            name='Check license expiry (hourly)',
            replace_existing=True
        )
        
        # Demo cleanup job - runs every hour to delete expired demo accounts
        scheduler.add_job(
            func=lambda: cleanup_expired_demos_with_context(app),
            trigger='interval',
            hours=1,
            id='demo_cleanup',
            name='Cleanup expired demo accounts',
            replace_existing=True
        )
    
    scheduler.start()
    print("✅ Background scheduler started")
    
    return scheduler


def check_license_expiry_with_context(app):
    """Run license check with app context"""
    with app.app_context():
        from app.jobs.license_checker import check_license_expiry
        check_license_expiry()


def send_expiry_reminders_with_context(app):
    """Run expiry reminders with app context"""
    with app.app_context():
        from app.jobs.license_checker import send_expiry_reminders
        send_expiry_reminders()


def cleanup_expired_demos_with_context(app):
    """Run demo cleanup with app context"""
    with app.app_context():
        from app.routes.demo import cleanup_expired_demos
        count = cleanup_expired_demos()
        if count > 0:
            print(f"✅ Cleaned up {count} expired demo accounts")


def shutdown_scheduler():
    """Shutdown the scheduler"""
    global scheduler
    if scheduler is not None:
        scheduler.shutdown()
        print("✅ Background scheduler stopped")

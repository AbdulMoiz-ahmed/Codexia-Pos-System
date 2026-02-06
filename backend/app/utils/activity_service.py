"""
Activity Logging Service - Comprehensive Audit Trail
Tracks all user actions for accountability and compliance
"""
from flask import current_app, request, g
from bson import ObjectId
from datetime import datetime
from app.utils.helpers import get_current_utc_time, is_demo_request, get_collection_name
from app.middleware.auth import get_current_user


# Activity Types
ACTIVITY_TYPES = {
    # Authentication
    'LOGIN': 'User logged in',
    'LOGOUT': 'User logged out',
    'LOGIN_FAILED': 'Failed login attempt',
    
    # Sales
    'SALE_CREATED': 'Sale completed',
    'SALE_VOIDED': 'Sale voided/cancelled',
    'PAYMENT_RECEIVED': 'Payment received from customer',
    
    # Inventory
    'PRODUCT_CREATED': 'Product created',
    'PRODUCT_UPDATED': 'Product updated',
    'PRODUCT_DELETED': 'Product deleted',
    'STOCK_ADJUSTED': 'Stock level adjusted',
    
    # Purchases
    'PO_CREATED': 'Purchase order created',
    'PO_RECEIVED': 'Purchase order received',
    'PO_CANCELLED': 'Purchase order cancelled',
    'PAYMENT_MADE': 'Payment made to vendor',
    
    # Customers
    'CUSTOMER_CREATED': 'Customer created',
    'CUSTOMER_UPDATED': 'Customer updated',
    'CUSTOMER_DELETED': 'Customer deleted',
    
    # Suppliers
    'SUPPLIER_CREATED': 'Supplier created',
    'SUPPLIER_UPDATED': 'Supplier updated',
    'SUPPLIER_DELETED': 'Supplier deleted',
    
    # Accounting
    'JOURNAL_CREATED': 'Journal entry created',
    'JOURNAL_UPDATED': 'Journal entry updated',
    'JOURNAL_DELETED': 'Journal entry deleted',
    'ACCOUNT_CREATED': 'Account created',
    'ACCOUNT_UPDATED': 'Account updated',
    
    # System
    'SETTINGS_UPDATED': 'System settings updated',
    'USER_CREATED': 'User account created',
    'USER_UPDATED': 'User account updated',
    'USER_DELETED': 'User account deleted',
}


def get_activity_logs_collection():
    """Get the activity logs collection"""
    return current_app.db[get_collection_name('activity_logs')]


def get_tenant_filter():
    """Get tenant filter for data isolation"""
    try:
        user = get_current_user()
        if is_demo_request():
            return {'demo_user_id': user['_id']}
        return {'tenant_id': ObjectId(user['tenant_id'])}
    except:
        return {}


def log_activity(
    activity_type,
    description=None,
    entity_type=None,
    entity_id=None,
    entity_name=None,
    old_values=None,
    new_values=None,
    metadata=None,
    user_id=None,
    user_name=None,
    tenant_id=None
):
    """
    Log an activity/action to the audit trail
    
    Args:
        activity_type: Type of activity (from ACTIVITY_TYPES)
        description: Human-readable description
        entity_type: Type of entity affected (sale, product, customer, etc.)
        entity_id: ID of the affected entity
        entity_name: Name/identifier of the entity for display
        old_values: Previous values (for updates)
        new_values: New values (for creates/updates)
        metadata: Additional context data
        user_id: Override user ID (for auth events)
        user_name: Override user name (for auth events)
        tenant_id: Override tenant ID (for auth events)
    """
    try:
        # Get current user info if not provided
        if not user_id:
            try:
                user = get_current_user()
                user_id = user.get('_id')
                user_name = user.get('name') or user.get('email', 'Unknown')
                tenant_id = user.get('tenant_id')
            except:
                user_id = None
                user_name = 'System'
        
        # Get IP address
        ip_address = None
        try:
            ip_address = request.remote_addr
        except:
            pass
        
        # Get user agent
        user_agent = None
        try:
            user_agent = request.headers.get('User-Agent', '')[:200]  # Limit length
        except:
            pass
        
        # Build log entry
        log_entry = {
            'activity_type': activity_type,
            'description': description or ACTIVITY_TYPES.get(activity_type, activity_type),
            'entity_type': entity_type,
            'entity_id': ObjectId(entity_id) if entity_id and ObjectId.is_valid(str(entity_id)) else str(entity_id) if entity_id else None,
            'entity_name': entity_name,
            'user_id': ObjectId(user_id) if user_id and ObjectId.is_valid(str(user_id)) else user_id,
            'user_name': user_name,
            'ip_address': ip_address,
            'user_agent': user_agent,
            'old_values': old_values,
            'new_values': new_values,
            'metadata': metadata or {},
            'timestamp': get_current_utc_time()
        }
        
        # Add tenant info
        if tenant_id:
            log_entry['tenant_id'] = ObjectId(tenant_id) if ObjectId.is_valid(str(tenant_id)) else tenant_id
        elif is_demo_request():
            try:
                user = get_current_user()
                log_entry['demo_user_id'] = user['_id']
            except:
                pass
        else:
            try:
                user = get_current_user()
                log_entry['tenant_id'] = ObjectId(user['tenant_id'])
            except:
                pass
        
        # Insert log
        get_activity_logs_collection().insert_one(log_entry)
        
        return True
        
    except Exception as e:
        # Don't let logging errors break the main flow
        print(f"Activity log error: {e}")
        return False


def get_activity_logs(
    activity_type=None,
    entity_type=None,
    entity_id=None,
    user_id=None,
    start_date=None,
    end_date=None,
    limit=100,
    skip=0
):
    """
    Retrieve activity logs with filtering
    
    Returns:
        List of activity log entries
    """
    try:
        filter_query = get_tenant_filter()
        
        if activity_type:
            filter_query['activity_type'] = activity_type
        
        if entity_type:
            filter_query['entity_type'] = entity_type
        
        if entity_id:
            filter_query['entity_id'] = ObjectId(entity_id) if ObjectId.is_valid(str(entity_id)) else entity_id
        
        if user_id:
            filter_query['user_id'] = ObjectId(user_id) if ObjectId.is_valid(str(user_id)) else user_id
        
        if start_date or end_date:
            filter_query['timestamp'] = {}
            if start_date:
                filter_query['timestamp']['$gte'] = start_date
            if end_date:
                filter_query['timestamp']['$lte'] = end_date
        
        logs = list(
            get_activity_logs_collection()
            .find(filter_query)
            .sort('timestamp', -1)
            .skip(skip)
            .limit(limit)
        )
        
        return logs
        
    except Exception as e:
        print(f"Error fetching activity logs: {e}")
        return []


def get_activity_summary(days=7):
    """
    Get summary statistics of activity logs
    
    Args:
        days: Number of days to look back
    
    Returns:
        Summary statistics dict
    """
    try:
        from datetime import timedelta
        
        end_date = get_current_utc_time()
        start_date = end_date - timedelta(days=days)
        
        filter_query = {
            **get_tenant_filter(),
            'timestamp': {'$gte': start_date, '$lte': end_date}
        }
        
        collection = get_activity_logs_collection()
        
        # Get counts by type
        pipeline = [
            {'$match': filter_query},
            {'$group': {
                '_id': '$activity_type',
                'count': {'$sum': 1}
            }},
            {'$sort': {'count': -1}}
        ]
        
        type_counts = list(collection.aggregate(pipeline))
        
        # Get recent activity
        recent = list(
            collection
            .find(filter_query)
            .sort('timestamp', -1)
            .limit(10)
        )
        
        # Total count
        total = collection.count_documents(filter_query)
        
        return {
            'total': total,
            'by_type': {item['_id']: item['count'] for item in type_counts},
            'recent': recent,
            'period_days': days
        }
        
    except Exception as e:
        print(f"Error getting activity summary: {e}")
        return {'total': 0, 'by_type': {}, 'recent': [], 'period_days': days}

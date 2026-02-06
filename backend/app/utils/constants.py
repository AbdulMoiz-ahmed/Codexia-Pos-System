"""
Constants used throughout the application
"""

# License Status
LICENSE_STATUS_TRIAL = 'trial'
LICENSE_STATUS_ACTIVE = 'active'
LICENSE_STATUS_EXPIRED = 'expired'
LICENSE_STATUS_SUSPENDED = 'suspended'

# Module Names
MODULE_POS = 'pos'
MODULE_INVENTORY = 'inventory'
MODULE_SALES = 'sales'
MODULE_PURCHASE = 'purchase'
MODULE_ACCOUNTING = 'accounting'
MODULE_HR = 'hr'
MODULE_MANUFACTURING = 'manufacturing'
MODULE_ASSETS = 'assets'

ALL_MODULES = [
    MODULE_POS,
    MODULE_INVENTORY,
    MODULE_SALES,
    MODULE_PURCHASE,
    MODULE_ACCOUNTING,
    MODULE_HR,
    MODULE_MANUFACTURING,
    MODULE_ASSETS
]

# User Roles
ROLE_SUPER_ADMIN = 'super_admin'
ROLE_ADMIN = 'admin'
ROLE_MANAGER = 'manager'
ROLE_CASHIER = 'cashier'
ROLE_USER = 'user'

# Permissions
PERMISSION_VIEW = 'view'
PERMISSION_CREATE = 'create'
PERMISSION_EDIT = 'edit'
PERMISSION_DELETE = 'delete'

# POS
POS_STATUS_HOLD = 'hold'
POS_STATUS_COMPLETED = 'completed'
POS_STATUS_REFUNDED = 'refunded'

# Shift Status
SHIFT_STATUS_OPEN = 'open'
SHIFT_STATUS_CLOSED = 'closed'

# Payment Methods
PAYMENT_METHOD_CASH = 'cash'
PAYMENT_METHOD_CARD = 'card'
PAYMENT_METHOD_BANK = 'bank_transfer'
PAYMENT_METHOD_MOBILE = 'mobile_payment'

# Billing Cycles
BILLING_CYCLE_MONTHLY = 'monthly'
BILLING_CYCLE_YEARLY = 'yearly'

# Booking Status
BOOKING_STATUS_PENDING = 'pending'
BOOKING_STATUS_APPROVED = 'approved'
BOOKING_STATUS_REJECTED = 'rejected'

# Stock Movement Types
STOCK_MOVEMENT_IN = 'in'
STOCK_MOVEMENT_OUT = 'out'
STOCK_MOVEMENT_TRANSFER = 'transfer'
STOCK_MOVEMENT_ADJUSTMENT = 'adjustment'

# Order Status
ORDER_STATUS_DRAFT = 'draft'
ORDER_STATUS_CONFIRMED = 'confirmed'
ORDER_STATUS_INVOICED = 'invoiced'
ORDER_STATUS_CANCELLED = 'cancelled'

# Account Types
ACCOUNT_TYPE_ASSET = 'asset'
ACCOUNT_TYPE_LIABILITY = 'liability'
ACCOUNT_TYPE_EQUITY = 'equity'
ACCOUNT_TYPE_REVENUE = 'revenue'
ACCOUNT_TYPE_EXPENSE = 'expense'

# Employment Types
EMPLOYMENT_TYPE_FULL_TIME = 'full-time'
EMPLOYMENT_TYPE_PART_TIME = 'part-time'
EMPLOYMENT_TYPE_CONTRACT = 'contract'

# Attendance Status
ATTENDANCE_STATUS_PRESENT = 'present'
ATTENDANCE_STATUS_ABSENT = 'absent'
ATTENDANCE_STATUS_LEAVE = 'leave'
ATTENDANCE_STATUS_HALF_DAY = 'half-day'

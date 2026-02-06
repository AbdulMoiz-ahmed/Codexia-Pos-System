"""
Ledger Service - Double Entry Accounting Automation
Handles automatic journal entry creation for business transactions
"""
from flask import current_app, g
from bson import ObjectId
from app.utils.helpers import get_current_utc_time, is_demo_request, get_collection_name
from app.middleware.auth import get_current_user

# Ledger Account Types
ACCOUNT_TYPES = {
    'asset': 'Asset',
    'liability': 'Liability', 
    'equity': 'Equity',
    'revenue': 'Revenue',
    'expense': 'Expense'
}

# Default System Accounts - created for each tenant
DEFAULT_ACCOUNTS = [
    # Assets
    {'code': '1001', 'name': 'Cash', 'type': 'asset', 'category': 'Current Asset'},
    {'code': '1002', 'name': 'Bank', 'type': 'asset', 'category': 'Current Asset'},
    {'code': '1100', 'name': 'Accounts Receivable', 'type': 'asset', 'category': 'Current Asset'},
    {'code': '1200', 'name': 'Inventory', 'type': 'asset', 'category': 'Current Asset'},
    {'code': '1500', 'name': 'Fixed Assets', 'type': 'asset', 'category': 'Fixed Asset'},
    
    # Liabilities
    {'code': '2001', 'name': 'Accounts Payable', 'type': 'liability', 'category': 'Current Liability'},
    {'code': '2100', 'name': 'Sales Tax Payable', 'type': 'liability', 'category': 'Current Liability'},
    
    # Equity
    {'code': '3001', 'name': 'Owner Equity', 'type': 'equity', 'category': 'Equity'},
    {'code': '3100', 'name': 'Retained Earnings', 'type': 'equity', 'category': 'Equity'},
    
    # Revenue
    {'code': '4001', 'name': 'Sales Revenue', 'type': 'revenue', 'category': 'Operating Revenue'},
    {'code': '4100', 'name': 'Service Revenue', 'type': 'revenue', 'category': 'Operating Revenue'},
    
    # Expenses
    {'code': '5001', 'name': 'Cost of Goods Sold', 'type': 'expense', 'category': 'Direct Expense'},
    {'code': '5100', 'name': 'Salary Expense', 'type': 'expense', 'category': 'Operating Expense'},
    {'code': '5200', 'name': 'Rent Expense', 'type': 'expense', 'category': 'Operating Expense'},
    {'code': '5300', 'name': 'Utilities Expense', 'type': 'expense', 'category': 'Operating Expense'},
    {'code': '5900', 'name': 'Miscellaneous Expense', 'type': 'expense', 'category': 'Operating Expense'},
]


def get_tenant_filter():
    """Get tenant filter for data isolation"""
    user = get_current_user()
    if is_demo_request():
        return {'demo_user_id': user['_id']}
    return {'tenant_id': ObjectId(user['tenant_id'])}


def get_accounts_collection():
    return current_app.db[get_collection_name('accounts')]


def get_journal_entries_collection():
    return current_app.db[get_collection_name('journal_entries')]


def get_customer_ledger_collection():
    return current_app.db[get_collection_name('customer_ledger')]


def get_vendor_ledger_collection():
    return current_app.db[get_collection_name('vendor_ledger')]


def initialize_accounts_for_tenant(tenant_id, demo_user_id=None):
    """Create default chart of accounts for a new tenant"""
    db = current_app.db
    accounts_coll = db[get_collection_name('accounts')]
    
    filter_key = 'demo_user_id' if demo_user_id else 'tenant_id'
    filter_value = demo_user_id if demo_user_id else tenant_id
    
    # Check if accounts already exist
    existing = accounts_coll.find_one({filter_key: filter_value})
    if existing:
        return  # Already initialized
    
    # Create default accounts
    accounts_to_insert = []
    for account in DEFAULT_ACCOUNTS:
        accounts_to_insert.append({
            filter_key: filter_value,
            'code': account['code'],
            'name': account['name'],
            'type': account['type'],
            'category': account['category'],
            'balance': 0.0,
            'is_system': True,
            'is_active': True,
            'created_at': get_current_utc_time()
        })
    
    if accounts_to_insert:
        accounts_coll.insert_many(accounts_to_insert)


def get_account_by_code(code):
    """Get an account by its code"""
    filter_query = get_tenant_filter()
    filter_query['code'] = code
    return get_accounts_collection().find_one(filter_query)


def get_account_by_name(name):
    """Get an account by its name"""
    filter_query = get_tenant_filter()
    filter_query['name'] = {'$regex': f'^{name}$', '$options': 'i'}
    return get_accounts_collection().find_one(filter_query)


def create_journal_entry(description, entries, reference_type=None, reference_id=None):
    """
    Create a double-entry journal entry
    
    Args:
        description: Description of the transaction
        entries: List of {account_code, account_name, debit, credit}
        reference_type: Type of source document (sale, purchase, payment, etc.)
        reference_id: ID of source document
    
    Returns:
        The created journal entry document
    """
    user = get_current_user()
    
    # Validate double-entry: total debits must equal total credits
    total_debit = sum(e.get('debit', 0) for e in entries)
    total_credit = sum(e.get('credit', 0) for e in entries)
    
    if round(total_debit, 2) != round(total_credit, 2):
        raise ValueError(f"Debits ({total_debit}) must equal Credits ({total_credit})")
    
    # Generate entry number
    journal_coll = get_journal_entries_collection()
    count = journal_coll.count_documents(get_tenant_filter())
    entry_number = f"JE-{count + 1:06d}"
    
    # Transform entries to 'lines' format for frontend compatibility
    lines = []
    for entry in entries:
        # Get account ID from account code
        account = get_account_by_code(entry['account_code'])
        lines.append({
            'account_id': str(account['_id']) if account else None,
            'account_code': entry['account_code'],
            'account_name': entry['account_name'],
            'debit': entry.get('debit', 0),
            'credit': entry.get('credit', 0)
        })
    
    # Create journal entry with consistent schema
    journal_entry = {
        **get_tenant_filter(),
        'entry_number': entry_number,
        'date': get_current_utc_time(),
        'description': description,
        'reference': entry_number,  # Use entry number as reference
        'lines': lines,  # Use 'lines' for frontend compatibility
        'total_amount': round(total_debit, 2),  # Frontend expects 'total_amount'
        'total_debit': round(total_debit, 2),
        'total_credit': round(total_credit, 2),
        'reference_type': reference_type,
        'reference_id': ObjectId(reference_id) if reference_id else None,
        'status': 'posted',
        'created_by': user['_id'],
        'created_at': get_current_utc_time()
    }

    
    result = journal_coll.insert_one(journal_entry)
    journal_entry['_id'] = result.inserted_id
    
    # Update account balances
    accounts_coll = get_accounts_collection()
    for entry in entries:
        account_filter = get_tenant_filter()
        account_filter['code'] = entry['account_code']
        
        # For assets and expenses: Debit increases, Credit decreases
        # For liabilities, equity, revenue: Credit increases, Debit decreases
        balance_change = entry.get('debit', 0) - entry.get('credit', 0)
        
        accounts_coll.update_one(
            account_filter,
            {'$inc': {'balance': balance_change}}
        )
    
    return journal_entry


# =================== TRANSACTION POSTING FUNCTIONS ===================

def post_cash_sale(sale_data):
    """
    Post journal entry for a cash sale
    Debit: Cash (increase asset)
    Credit: Sales Revenue (increase revenue)
    Also: Debit COGS, Credit Inventory for cost
    """
    entries = [
        {
            'account_code': '1001',
            'account_name': 'Cash',
            'debit': sale_data['total_amount'],
            'credit': 0
        },
        {
            'account_code': '4001',
            'account_name': 'Sales Revenue',
            'debit': 0,
            'credit': sale_data['total_amount']
        }
    ]
    
    # If we have cost information, also record COGS
    if sale_data.get('cost_amount'):
        entries.extend([
            {
                'account_code': '5001',
                'account_name': 'Cost of Goods Sold',
                'debit': sale_data['cost_amount'],
                'credit': 0
            },
            {
                'account_code': '1200',
                'account_name': 'Inventory',
                'debit': 0,
                'credit': sale_data['cost_amount']
            }
        ])
    
    return create_journal_entry(
        description=f"Cash Sale - {sale_data.get('receipt_number', '')}",
        entries=entries,
        reference_type='sale',
        reference_id=sale_data.get('_id')
    )


def post_credit_sale(sale_data, customer_id, customer_name):
    """
    Post journal entry for a credit sale
    Debit: Accounts Receivable (increase asset)
    Credit: Sales Revenue (increase revenue)
    Also updates customer ledger
    """
    entries = [
        {
            'account_code': '1100',
            'account_name': 'Accounts Receivable',
            'debit': sale_data['total_amount'],
            'credit': 0
        },
        {
            'account_code': '4001',
            'account_name': 'Sales Revenue',
            'debit': 0,
            'credit': sale_data['total_amount']
        }
    ]
    
    # Record COGS if we have cost info
    if sale_data.get('cost_amount'):
        entries.extend([
            {
                'account_code': '5001',
                'account_name': 'Cost of Goods Sold',
                'debit': sale_data['cost_amount'],
                'credit': 0
            },
            {
                'account_code': '1200',
                'account_name': 'Inventory',
                'debit': 0,
                'credit': sale_data['cost_amount']
            }
        ])
    
    journal_entry = create_journal_entry(
        description=f"Credit Sale to {customer_name} - {sale_data.get('receipt_number', '')}",
        entries=entries,
        reference_type='sale',
        reference_id=sale_data.get('_id')
    )
    
    # Update customer ledger
    update_customer_ledger(
        customer_id=customer_id,
        customer_name=customer_name,
        debit=sale_data['total_amount'],
        credit=0,
        description=f"Credit Sale - {sale_data.get('receipt_number', '')}",
        reference_type='sale',
        reference_id=sale_data.get('_id')
    )
    
    return journal_entry


def post_payment_received(payment_data, customer_id, customer_name):
    """
    Post journal entry for payment received from customer
    Debit: Cash/Bank (increase asset)
    Credit: Accounts Receivable (decrease asset)
    """
    account_code = '1002' if payment_data.get('payment_method') == 'bank' else '1001'
    account_name = 'Bank' if payment_data.get('payment_method') == 'bank' else 'Cash'
    
    entries = [
        {
            'account_code': account_code,
            'account_name': account_name,
            'debit': payment_data['amount'],
            'credit': 0
        },
        {
            'account_code': '1100',
            'account_name': 'Accounts Receivable',
            'debit': 0,
            'credit': payment_data['amount']
        }
    ]
    
    journal_entry = create_journal_entry(
        description=f"Payment from {customer_name}",
        entries=entries,
        reference_type='payment_received',
        reference_id=payment_data.get('_id')
    )
    
    # Update customer ledger
    update_customer_ledger(
        customer_id=customer_id,
        customer_name=customer_name,
        debit=0,
        credit=payment_data['amount'],
        description=f"Payment Received",
        reference_type='payment_received',
        reference_id=payment_data.get('_id')
    )
    
    return journal_entry


def post_purchase(purchase_data, vendor_id, vendor_name, payment_type='credit'):
    """
    Post journal entry for a purchase
    Debit: Inventory (increase asset)
    Credit: Accounts Payable (if credit) or Cash (if cash)
    """
    if payment_type == 'credit':
        credit_account = {'code': '2001', 'name': 'Accounts Payable'}
    else:
        credit_account = {'code': '1001', 'name': 'Cash'}
    
    entries = [
        {
            'account_code': '1200',
            'account_name': 'Inventory',
            'debit': purchase_data['total'],
            'credit': 0
        },
        {
            'account_code': credit_account['code'],
            'account_name': credit_account['name'],
            'debit': 0,
            'credit': purchase_data['total']
        }
    ]
    
    journal_entry = create_journal_entry(
        description=f"Purchase from {vendor_name} - {purchase_data.get('po_number', '')}",
        entries=entries,
        reference_type='purchase',
        reference_id=purchase_data.get('_id')
    )
    
    # Update vendor ledger for credit purchases
    if payment_type == 'credit':
        update_vendor_ledger(
            vendor_id=vendor_id,
            vendor_name=vendor_name,
            debit=0,
            credit=purchase_data['total'],
            description=f"Purchase - {purchase_data.get('po_number', '')}",
            reference_type='purchase',
            reference_id=purchase_data.get('_id')
        )
    
    return journal_entry


def post_payment_made(payment_data, vendor_id, vendor_name):
    """
    Post journal entry for payment made to vendor
    Debit: Accounts Payable (decrease liability)
    Credit: Cash/Bank (decrease asset)
    """
    account_code = '1002' if payment_data.get('payment_method') == 'bank' else '1001'
    account_name = 'Bank' if payment_data.get('payment_method') == 'bank' else 'Cash'
    
    entries = [
        {
            'account_code': '2001',
            'account_name': 'Accounts Payable',
            'debit': payment_data['amount'],
            'credit': 0
        },
        {
            'account_code': account_code,
            'account_name': account_name,
            'debit': 0,
            'credit': payment_data['amount']
        }
    ]
    
    journal_entry = create_journal_entry(
        description=f"Payment to {vendor_name}",
        entries=entries,
        reference_type='payment_made',
        reference_id=payment_data.get('_id')
    )
    
    # Update vendor ledger
    update_vendor_ledger(
        vendor_id=vendor_id,
        vendor_name=vendor_name,
        debit=payment_data['amount'],
        credit=0,
        description=f"Payment Made",
        reference_type='payment_made',
        reference_id=payment_data.get('_id')
    )
    
    return journal_entry


def post_expense(expense_data):
    """
    Post journal entry for an expense
    Debit: Expense Account
    Credit: Cash/Bank
    """
    account_code = '1002' if expense_data.get('payment_method') == 'bank' else '1001'
    account_name = 'Bank' if expense_data.get('payment_method') == 'bank' else 'Cash'
    
    # Default to miscellaneous expense if no specific account provided
    expense_account_code = expense_data.get('expense_account_code', '5900')
    expense_account_name = expense_data.get('expense_account_name', 'Miscellaneous Expense')
    
    entries = [
        {
            'account_code': expense_account_code,
            'account_name': expense_account_name,
            'debit': expense_data['amount'],
            'credit': 0
        },
        {
            'account_code': account_code,
            'account_name': account_name,
            'debit': 0,
            'credit': expense_data['amount']
        }
    ]
    
    return create_journal_entry(
        description=expense_data.get('description', 'Expense'),
        entries=entries,
        reference_type='expense',
        reference_id=expense_data.get('_id')
    )


# =================== CUSTOMER & VENDOR LEDGER FUNCTIONS ===================

def update_customer_ledger(customer_id, customer_name, debit, credit, description, reference_type=None, reference_id=None):
    """
    Update customer ledger with a transaction
    Debit = amount owed by customer (increases receivable)
    Credit = payment received (decreases receivable)
    """
    ledger_coll = get_customer_ledger_collection()
    customers_coll = current_app.db[get_collection_name('customers')]
    
    # Create ledger entry
    entry = {
        **get_tenant_filter(),
        'customer_id': ObjectId(customer_id),
        'customer_name': customer_name,
        'date': get_current_utc_time(),
        'description': description,
        'debit': round(debit, 2),
        'credit': round(credit, 2),
        'reference_type': reference_type,
        'reference_id': ObjectId(reference_id) if reference_id else None,
        'created_at': get_current_utc_time()
    }
    
    ledger_coll.insert_one(entry)
    
    # Update customer balance (debit increases balance, credit decreases)
    balance_change = debit - credit
    customer_filter = get_tenant_filter()
    customer_filter['_id'] = ObjectId(customer_id)
    
    customers_coll.update_one(
        customer_filter,
        {'$inc': {'balance': balance_change}}
    )


def update_vendor_ledger(vendor_id, vendor_name, debit, credit, description, reference_type=None, reference_id=None):
    """
    Update vendor ledger with a transaction
    Credit = amount owed to vendor (increases payable)
    Debit = payment made (decreases payable)
    """
    ledger_coll = get_vendor_ledger_collection()
    suppliers_coll = current_app.db[get_collection_name('suppliers')]
    
    # Create ledger entry
    entry = {
        **get_tenant_filter(),
        'vendor_id': ObjectId(vendor_id),
        'vendor_name': vendor_name,
        'date': get_current_utc_time(),
        'description': description,
        'debit': round(debit, 2),
        'credit': round(credit, 2),
        'reference_type': reference_type,
        'reference_id': ObjectId(reference_id) if reference_id else None,
        'created_at': get_current_utc_time()
    }
    
    ledger_coll.insert_one(entry)
    
    # Update vendor balance (credit increases balance, debit decreases)
    balance_change = credit - debit
    vendor_filter = get_tenant_filter()
    vendor_filter['_id'] = ObjectId(vendor_id)
    
    suppliers_coll.update_one(
        vendor_filter,
        {'$inc': {'balance': balance_change}}
    )


def get_customer_balance(customer_id):
    """Get current balance for a customer"""
    customers_coll = current_app.db[get_collection_name('customers')]
    customer_filter = get_tenant_filter()
    customer_filter['_id'] = ObjectId(customer_id)
    
    customer = customers_coll.find_one(customer_filter)
    return customer.get('balance', 0) if customer else 0


def get_vendor_balance(vendor_id):
    """Get current balance for a vendor"""
    suppliers_coll = current_app.db[get_collection_name('suppliers')]
    vendor_filter = get_tenant_filter()
    vendor_filter['_id'] = ObjectId(vendor_id)
    
    vendor = suppliers_coll.find_one(vendor_filter)
    return vendor.get('balance', 0) if vendor else 0

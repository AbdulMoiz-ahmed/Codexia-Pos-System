"""
Accounting Module Routes
"""
from flask import Blueprint, request, jsonify, current_app
from app.middleware.auth import tenant_required, get_current_user
from app.middleware.modules import module_required
from app.utils.helpers import get_current_utc_time, serialize_doc, validate_required_fields, is_demo_request, get_collection_name
from bson import ObjectId

accounting_bp = Blueprint('accounting', __name__)


def get_tenant_filter():
    """Get the filter for tenant/demo data isolation"""
    user = get_current_user()
    if is_demo_request():
        return {'demo_user_id': user['_id']}
    return {'tenant_id': user['tenant_id']}


def get_accounts_collection():
    return current_app.db[get_collection_name('accounts')]


def get_journal_entries_collection():
    return current_app.db[get_collection_name('journal_entries')]


# --- Chart of Accounts ---

@accounting_bp.route('/accounts', methods=['GET'])
@tenant_required
@module_required('accounting')
def get_accounts():
    """Get all accounts in Chart of Accounts"""
    try:
        accounts = list(get_accounts_collection().find(get_tenant_filter()))
        return jsonify(serialize_doc(accounts)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@accounting_bp.route('/accounts', methods=['POST'])
@tenant_required
@module_required('accounting')
def create_account():
    """Create a new account"""
    try:
        user = get_current_user()
        data = request.get_json()
        
        if not validate_required_fields(data, ['code', 'name', 'type']):
            return jsonify({'error': 'Missing required fields'}), 400
            
        account = {
            **get_tenant_filter(),
            'code': data['code'],
            'name': data['name'],
            'type': data['type'],
            'description': data.get('description', ''),
            'balance': 0.0,
            'is_active': True,
            'created_at': get_current_utc_time(),
            'created_by': user['_id']
        }
        
        result = get_accounts_collection().insert_one(account)
        account['_id'] = result.inserted_id
        
        return jsonify(serialize_doc(account)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- Journal Entries ---

@accounting_bp.route('/journal', methods=['GET'])
@tenant_required
@module_required('accounting')
def get_journal_entries():
    """Get journal entries"""
    try:
        entries = list(get_journal_entries_collection().find(get_tenant_filter()).sort('date', -1))
        return jsonify(serialize_doc(entries)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@accounting_bp.route('/journal', methods=['POST'])
@tenant_required
@module_required('accounting')
def create_journal_entry():
    """Create a new journal entry"""
    try:
        user = get_current_user()
        data = request.get_json()
        
        if not validate_required_fields(data, ['date', 'description', 'lines']):
            return jsonify({'error': 'Missing required fields'}), 400
            
        lines = data['lines']
        if not isinstance(lines, list) or len(lines) < 2:
            return jsonify({'error': 'Journal entry must have at least 2 lines'}), 400
            
        # Verify double entry balance
        total_debit = sum(float(l.get('debit', 0)) for l in lines)
        total_credit = sum(float(l.get('credit', 0)) for l in lines)
        
        if abs(total_debit - total_credit) > 0.01:
            return jsonify({'error': f'Debits ({total_debit}) do not equal Credits ({total_credit})'}), 400
            
        entry = {
            **get_tenant_filter(),
            'date': data['date'],
            'description': data['description'],
            'reference': data.get('reference', ''),
            'lines': lines,
            'total_amount': total_debit,
            'status': 'posted',
            'created_at': get_current_utc_time(),
            'created_by': user['_id']
        }
        
        result = get_journal_entries_collection().insert_one(entry)
        entry['_id'] = result.inserted_id
        
        # Update account balances
        for line in lines:
            account_id = line['account_id']
            debit = float(line.get('debit', 0))
            credit = float(line.get('credit', 0))
            change = debit - credit
            
            if isinstance(account_id, str):
                 get_accounts_collection().update_one(
                     {'_id': ObjectId(account_id)},
                     {'$inc': {'balance': change}} 
                 )

        return jsonify(serialize_doc(entry)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@accounting_bp.route('/journal/<entry_id>', methods=['GET'])
@tenant_required
@module_required('accounting')
def get_journal_entry(entry_id):
    """Get a single journal entry by ID"""
    try:
        entry = get_journal_entries_collection().find_one({
            '_id': ObjectId(entry_id),
            **get_tenant_filter()
        })
        
        if not entry:
            return jsonify({'error': 'Journal entry not found'}), 404
            
        return jsonify(serialize_doc(entry)), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@accounting_bp.route('/journal/<entry_id>', methods=['PUT'])
@tenant_required
@module_required('accounting')
def update_journal_entry(entry_id):
    """Update a journal entry"""
    try:
        user = get_current_user()
        data = request.get_json()
        
        # Get existing entry
        existing = get_journal_entries_collection().find_one({
            '_id': ObjectId(entry_id),
            **get_tenant_filter()
        })
        
        if not existing:
            return jsonify({'error': 'Journal entry not found'}), 404
        
        # Validate new lines if provided
        lines = data.get('lines', existing.get('lines', []))
        if not isinstance(lines, list) or len(lines) < 2:
            return jsonify({'error': 'Journal entry must have at least 2 lines'}), 400
            
        # Verify double entry balance
        total_debit = sum(float(l.get('debit', 0)) for l in lines)
        total_credit = sum(float(l.get('credit', 0)) for l in lines)
        
        if abs(total_debit - total_credit) > 0.01:
            return jsonify({'error': f'Debits ({total_debit}) do not equal Credits ({total_credit})'}), 400
        
        # Reverse old account balances
        for line in existing.get('lines', []):
            account_id = line.get('account_id')
            if account_id:
                debit = float(line.get('debit', 0))
                credit = float(line.get('credit', 0))
                change = -(debit - credit)  # Reverse the change
                get_accounts_collection().update_one(
                    {'_id': ObjectId(account_id)},
                    {'$inc': {'balance': change}}
                )
        
        # Apply new account balances
        for line in lines:
            account_id = line.get('account_id')
            if account_id:
                debit = float(line.get('debit', 0))
                credit = float(line.get('credit', 0))
                change = debit - credit
                get_accounts_collection().update_one(
                    {'_id': ObjectId(account_id)},
                    {'$inc': {'balance': change}}
                )
        
        # Update entry
        update_data = {
            'date': data.get('date', existing['date']),
            'description': data.get('description', existing['description']),
            'reference': data.get('reference', existing.get('reference', '')),
            'lines': lines,
            'total_amount': total_debit,
            'updated_at': get_current_utc_time(),
            'updated_by': user['_id']
        }
        
        get_journal_entries_collection().update_one(
            {'_id': ObjectId(entry_id)},
            {'$set': update_data}
        )
        
        updated_entry = get_journal_entries_collection().find_one({'_id': ObjectId(entry_id)})
        return jsonify(serialize_doc(updated_entry)), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@accounting_bp.route('/journal/<entry_id>', methods=['DELETE'])
@tenant_required
@module_required('accounting')
def delete_journal_entry(entry_id):
    """Delete a journal entry and reverse account balances"""
    try:
        # Get existing entry
        entry = get_journal_entries_collection().find_one({
            '_id': ObjectId(entry_id),
            **get_tenant_filter()
        })
        
        if not entry:
            return jsonify({'error': 'Journal entry not found'}), 404
        
        # Reverse account balances
        for line in entry.get('lines', []):
            account_id = line.get('account_id')
            if account_id:
                debit = float(line.get('debit', 0))
                credit = float(line.get('credit', 0))
                change = -(debit - credit)  # Reverse the change
                get_accounts_collection().update_one(
                    {'_id': ObjectId(account_id)},
                    {'$inc': {'balance': change}}
                )
        
        # Delete the entry
        get_journal_entries_collection().delete_one({'_id': ObjectId(entry_id)})
        
        return jsonify({'message': 'Journal entry deleted successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# --- Financial Reports ---

def get_sales_collection():
    return current_app.db[get_collection_name('sales_pos')]


def get_customers_collection():
    return current_app.db[get_collection_name('customers')]


def get_purchase_orders_collection():
    return current_app.db[get_collection_name('purchase_orders')]


def get_suppliers_collection():
    return current_app.db[get_collection_name('suppliers')]


@accounting_bp.route('/reports/trial-balance', methods=['GET'])
@tenant_required
@module_required('accounting')
def get_trial_balance():
    """Get Trial Balance report"""
    try:
        accounts = list(get_accounts_collection().find(get_tenant_filter()))
        
        # Group by account type
        trial_balance = {
            'Asset': [],
            'Liability': [],
            'Equity': [],
            'Revenue': [],
            'Expense': []
        }
        
        total_debit = 0
        total_credit = 0
        
        for acc in accounts:
            balance = acc.get('balance', 0)
            acc_type = acc.get('type', 'asset').lower()  # Normalize to lowercase
            acc_type_display = acc_type.capitalize()  # For display
            
            entry = {
                'code': acc.get('code'),
                'name': acc.get('name'),
                'type': acc_type_display,
                'debit': 0,
                'credit': 0
            }
            
            # Assets and Expenses normally have debit balances
            # Liabilities, Equity, Revenue normally have credit balances
            if acc_type in ['asset', 'expense']:
                if balance >= 0:
                    entry['debit'] = abs(balance)
                    total_debit += abs(balance)
                else:
                    entry['credit'] = abs(balance)
                    total_credit += abs(balance)
            else:
                if balance >= 0:
                    entry['credit'] = abs(balance)
                    total_credit += abs(balance)
                else:
                    entry['debit'] = abs(balance)
                    total_debit += abs(balance)
            
            if acc_type in trial_balance:
                trial_balance[acc_type].append(entry)
        
        return jsonify({
            'trial_balance': trial_balance,
            'total_debit': round(total_debit, 2),
            'total_credit': round(total_credit, 2),
            'is_balanced': abs(total_debit - total_credit) < 0.01
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@accounting_bp.route('/reports/profit-loss', methods=['GET'])
@tenant_required
@module_required('accounting')
def get_profit_loss():
    """Get Profit & Loss Statement"""
    try:
        from datetime import datetime, timedelta
        
        # Date filters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Default to current month
        if not end_date:
            end_date = datetime.utcnow()
        else:
            end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            
        if not start_date:
            start_date = end_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        
        # Get accounts
        accounts = list(get_accounts_collection().find(get_tenant_filter()))
        
        # Case-insensitive type matching (ledger_service uses lowercase)
        revenue_accounts = [a for a in accounts if a.get('type', '').lower() == 'revenue']
        expense_accounts = [a for a in accounts if a.get('type', '').lower() == 'expense']
        
        # Calculate totals
        total_revenue = sum(abs(a.get('balance', 0)) for a in revenue_accounts)
        total_expenses = sum(abs(a.get('balance', 0)) for a in expense_accounts)
        net_profit = total_revenue - total_expenses
        
        # Get sales data for the period
        sales_filter = {
            **get_tenant_filter(),
            'created_at': {'$gte': start_date, '$lte': end_date}
        }
        sales = list(get_sales_collection().find(sales_filter))
        
        gross_sales = sum(s.get('total_amount', 0) for s in sales)
        total_cogs = sum(
            sum(item.get('cost', 0) * item.get('quantity', 0) for item in s.get('items', []))
            for s in sales
        )
        gross_profit = gross_sales - total_cogs
        
        return jsonify({
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            },
            'revenue': {
                'accounts': [{'name': a['name'], 'amount': abs(a.get('balance', 0))} for a in revenue_accounts],
                'total': round(total_revenue, 2)
            },
            'cost_of_goods_sold': round(total_cogs, 2),
            'gross_profit': round(gross_profit, 2),
            'expenses': {
                'accounts': [{'name': a['name'], 'amount': abs(a.get('balance', 0))} for a in expense_accounts],
                'total': round(total_expenses, 2)
            },
            'net_profit': round(net_profit, 2),
            'gross_sales': round(gross_sales, 2)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@accounting_bp.route('/reports/balance-sheet', methods=['GET'])
@tenant_required
@module_required('accounting')
def get_balance_sheet():
    """Get Balance Sheet"""
    try:
        accounts = list(get_accounts_collection().find(get_tenant_filter()))
        
        # Group accounts (case-insensitive type matching)
        assets = [a for a in accounts if a.get('type', '').lower() == 'asset']
        liabilities = [a for a in accounts if a.get('type', '').lower() == 'liability']
        equity = [a for a in accounts if a.get('type', '').lower() == 'equity']
        revenue = [a for a in accounts if a.get('type', '').lower() == 'revenue']
        expenses = [a for a in accounts if a.get('type', '').lower() == 'expense']
        
        total_assets = sum(a.get('balance', 0) for a in assets)
        total_liabilities = sum(abs(a.get('balance', 0)) for a in liabilities)
        total_equity = sum(abs(a.get('balance', 0)) for a in equity)
        
        # Retained earnings = Revenue - Expenses
        total_revenue = sum(abs(a.get('balance', 0)) for a in revenue)
        total_expenses = sum(abs(a.get('balance', 0)) for a in expenses)
        retained_earnings = total_revenue - total_expenses
        
        return jsonify({
            'assets': {
                'accounts': [{'code': a['code'], 'name': a['name'], 'balance': a.get('balance', 0)} for a in assets],
                'total': round(total_assets, 2)
            },
            'liabilities': {
                'accounts': [{'code': a['code'], 'name': a['name'], 'balance': abs(a.get('balance', 0))} for a in liabilities],
                'total': round(total_liabilities, 2)
            },
            'equity': {
                'accounts': [{'code': a['code'], 'name': a['name'], 'balance': abs(a.get('balance', 0))} for a in equity],
                'retained_earnings': round(retained_earnings, 2),
                'total': round(total_equity + retained_earnings, 2)
            },
            'total_liabilities_equity': round(total_liabilities + total_equity + retained_earnings, 2),
            'is_balanced': abs(total_assets - (total_liabilities + total_equity + retained_earnings)) < 0.01
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@accounting_bp.route('/reports/aged-receivables', methods=['GET'])
@tenant_required
@module_required('accounting')
def get_aged_receivables():
    """Get Aged Receivables Report (Customer dues by age)"""
    try:
        from datetime import datetime, timedelta
        
        today = datetime.utcnow()
        
        # Get unpaid credit sales
        filter_query = {
            **get_tenant_filter(),
            'payment_type': 'credit',
            'payment_status': {'$in': ['unpaid', 'partial']}
        }
        
        credit_sales = list(get_sales_collection().find(filter_query))
        
        # Age buckets
        current = []      # 0-30 days
        days_31_60 = []   # 31-60 days
        days_61_90 = []   # 61-90 days
        over_90 = []      # 90+ days
        
        for sale in credit_sales:
            sale_date = sale.get('created_at', today)
            if isinstance(sale_date, str):
                sale_date = datetime.fromisoformat(sale_date.replace('Z', '+00:00'))
            
            days_old = (today - sale_date).days
            amount_due = sale.get('amount_due', 0)
            
            entry = {
                'receipt_number': sale.get('receipt_number'),
                'customer_name': sale.get('customer_name', 'Unknown'),
                'customer_id': str(sale.get('customer_id', '')),
                'date': sale_date.isoformat(),
                'total': sale.get('total_amount', 0),
                'paid': sale.get('amount_paid', 0),
                'due': amount_due,
                'days_old': days_old,
                'due_date': sale.get('due_date')
            }
            
            if days_old <= 30:
                current.append(entry)
            elif days_old <= 60:
                days_31_60.append(entry)
            elif days_old <= 90:
                days_61_90.append(entry)
            else:
                over_90.append(entry)
        
        return jsonify({
            'current': {'items': current, 'total': round(sum(e['due'] for e in current), 2)},
            'days_31_60': {'items': days_31_60, 'total': round(sum(e['due'] for e in days_31_60), 2)},
            'days_61_90': {'items': days_61_90, 'total': round(sum(e['due'] for e in days_61_90), 2)},
            'over_90': {'items': over_90, 'total': round(sum(e['due'] for e in over_90), 2)},
            'grand_total': round(sum(e['due'] for e in current + days_31_60 + days_61_90 + over_90), 2)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@accounting_bp.route('/reports/aged-payables', methods=['GET'])
@tenant_required
@module_required('accounting')
def get_aged_payables():
    """Get Aged Payables Report (Vendor dues by age)"""
    try:
        from datetime import datetime, timedelta
        
        today = datetime.utcnow()
        
        # Get unpaid purchase orders
        filter_query = {
            **get_tenant_filter(),
            'payment_status': {'$in': ['unpaid', 'partial']}
        }
        
        payables = list(get_purchase_orders_collection().find(filter_query))
        
        # Age buckets
        current = []      # 0-30 days
        days_31_60 = []   # 31-60 days
        days_61_90 = []   # 61-90 days
        over_90 = []      # 90+ days
        
        for po in payables:
            po_date = po.get('created_at', today)
            if isinstance(po_date, str):
                po_date = datetime.fromisoformat(po_date.replace('Z', '+00:00'))
            
            days_old = (today - po_date).days
            amount_due = po.get('amount_due', po.get('total', 0))
            
            entry = {
                'po_number': po.get('po_number'),
                'supplier_name': po.get('supplier_name', 'Unknown'),
                'supplier_id': str(po.get('supplier_id', '')),
                'date': po_date.isoformat(),
                'total': po.get('total', 0),
                'paid': po.get('amount_paid', 0),
                'due': amount_due,
                'days_old': days_old,
                'due_date': po.get('due_date')
            }
            
            if days_old <= 30:
                current.append(entry)
            elif days_old <= 60:
                days_31_60.append(entry)
            elif days_old <= 90:
                days_61_90.append(entry)
            else:
                over_90.append(entry)
        
        return jsonify({
            'current': {'items': current, 'total': round(sum(e['due'] for e in current), 2)},
            'days_31_60': {'items': days_31_60, 'total': round(sum(e['due'] for e in days_31_60), 2)},
            'days_61_90': {'items': days_61_90, 'total': round(sum(e['due'] for e in days_61_90), 2)},
            'over_90': {'items': over_90, 'total': round(sum(e['due'] for e in over_90), 2)},
            'grand_total': round(sum(e['due'] for e in current + days_31_60 + days_61_90 + over_90), 2)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@accounting_bp.route('/reports/summary', methods=['GET'])
@tenant_required
@module_required('accounting')
def get_financial_summary():
    """Get a quick financial summary dashboard"""
    try:
        from datetime import datetime, timedelta
        
        today = datetime.utcnow()
        month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Get accounts
        accounts = list(get_accounts_collection().find(get_tenant_filter()))
        
        # Calculate key metrics
        cash_accounts = [a for a in accounts if 'cash' in a.get('name', '').lower() or 'bank' in a.get('name', '').lower()]
        total_cash = sum(a.get('balance', 0) for a in cash_accounts)
        
        # Receivables
        ar_filter = {**get_tenant_filter(), 'payment_type': 'credit', 'payment_status': {'$in': ['unpaid', 'partial']}}
        receivables = list(get_sales_collection().find(ar_filter))
        total_receivables = sum(s.get('amount_due', 0) for s in receivables)
        
        # Payables
        ap_filter = {**get_tenant_filter(), 'payment_status': {'$in': ['unpaid', 'partial']}}
        payables = list(get_purchase_orders_collection().find(ap_filter))
        total_payables = sum(p.get('amount_due', p.get('total', 0)) for p in payables)
        
        # Month sales
        sales_filter = {**get_tenant_filter(), 'created_at': {'$gte': month_start}}
        month_sales = list(get_sales_collection().find(sales_filter))
        total_month_sales = sum(s.get('total_amount', 0) for s in month_sales)
        
        # Revenue & Expenses (case-insensitive)
        total_revenue = sum(abs(a.get('balance', 0)) for a in accounts if a.get('type', '').lower() == 'revenue')
        total_expenses = sum(abs(a.get('balance', 0)) for a in accounts if a.get('type', '').lower() == 'expense')
        
        return jsonify({
            'cash_balance': round(total_cash, 2),
            'accounts_receivable': round(total_receivables, 2),
            'accounts_payable': round(total_payables, 2),
            'net_position': round(total_cash + total_receivables - total_payables, 2),
            'month_sales': round(total_month_sales, 2),
            'total_revenue': round(total_revenue, 2),
            'total_expenses': round(total_expenses, 2),
            'net_profit': round(total_revenue - total_expenses, 2)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


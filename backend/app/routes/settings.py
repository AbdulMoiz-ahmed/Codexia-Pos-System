"""
Settings Routes - System Configuration API
"""
from flask import Blueprint, request, jsonify
from app.middleware.auth import tenant_required, get_current_user
from app.utils.helpers import serialize_doc
from app.utils.settings_service import (
    get_settings,
    update_settings,
    get_tax_settings,
    get_currency_settings,
    DEFAULT_SETTINGS
)
from app.utils.activity_service import log_activity

settings_bp = Blueprint('settings', __name__)


@settings_bp.route('/', methods=['GET'])
@tenant_required
def get_all_settings():
    """Get all settings for current tenant"""
    try:
        settings = get_settings()
        
        # Remove MongoDB _id and sensitive info
        result = {
            'tax': settings.get('tax', DEFAULT_SETTINGS['tax']),
            'currency': settings.get('currency', DEFAULT_SETTINGS['currency']),
            'business': settings.get('business', DEFAULT_SETTINGS['business']),
            'sms': {
                'enabled': settings.get('sms', {}).get('enabled', False),
                'provider': settings.get('sms', {}).get('provider', ''),
                'sender_id': settings.get('sms', {}).get('sender_id', ''),
                'templates': settings.get('sms', {}).get('templates', {}),
                # Don't expose API keys
            },
            'invoice': settings.get('invoice', DEFAULT_SETTINGS['invoice']),
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/tax', methods=['GET'])
@tenant_required
def get_tax():
    """Get tax settings"""
    try:
        tax = get_tax_settings()
        return jsonify(tax), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/tax', methods=['PUT'])
@tenant_required
def update_tax():
    """Update tax settings"""
    try:
        data = request.get_json()
        
        update_settings('tax', data)
        
        log_activity(
            activity_type='SETTINGS_UPDATED',
            description=f'Tax settings updated: {data.get("name", "GST")} @ {data.get("rate", 0)}%',
            entity_type='settings',
            entity_name='tax'
        )
        
        return jsonify({
            'message': 'Tax settings updated successfully',
            'tax': get_tax_settings()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/currency', methods=['GET'])
@tenant_required
def get_currency():
    """Get currency settings"""
    try:
        currency = get_currency_settings()
        return jsonify(currency), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/currency', methods=['PUT'])
@tenant_required
def update_currency():
    """Update currency settings"""
    try:
        data = request.get_json()
        
        update_settings('currency', data)
        
        log_activity(
            activity_type='SETTINGS_UPDATED',
            description=f'Currency settings updated: {data.get("code", "PKR")} ({data.get("symbol", "Rs.")})',
            entity_type='settings',
            entity_name='currency'
        )
        
        return jsonify({
            'message': 'Currency settings updated successfully',
            'currency': get_currency_settings()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/business', methods=['GET'])
@tenant_required
def get_business():
    """Get business settings"""
    try:
        settings = get_settings()
        return jsonify(settings.get('business', DEFAULT_SETTINGS['business'])), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/business', methods=['PUT'])
@tenant_required
def update_business():
    """Update business settings"""
    try:
        data = request.get_json()
        
        update_settings('business', data)
        
        log_activity(
            activity_type='SETTINGS_UPDATED',
            description=f'Business info updated: {data.get("name", "Business")}',
            entity_type='settings',
            entity_name='business'
        )
        
        settings = get_settings()
        return jsonify({
            'message': 'Business settings updated successfully',
            'business': settings.get('business')
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/sms', methods=['GET'])
@tenant_required
def get_sms():
    """Get SMS settings (without sensitive API keys)"""
    try:
        settings = get_settings()
        sms = settings.get('sms', DEFAULT_SETTINGS['sms'])
        
        # Return without sensitive data
        return jsonify({
            'enabled': sms.get('enabled', False),
            'provider': sms.get('provider', ''),
            'sender_id': sms.get('sender_id', ''),
            'templates': sms.get('templates', {}),
            'has_api_key': bool(sms.get('api_key')),
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/sms', methods=['PUT'])
@tenant_required
def update_sms():
    """Update SMS settings"""
    try:
        data = request.get_json()
        
        update_settings('sms', data)
        
        log_activity(
            activity_type='SETTINGS_UPDATED',
            description=f'SMS settings updated: {data.get("provider", "none")}',
            entity_type='settings',
            entity_name='sms'
        )
        
        return jsonify({
            'message': 'SMS settings updated successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/invoice', methods=['GET'])
@tenant_required
def get_invoice():
    """Get invoice settings"""
    try:
        settings = get_settings()
        return jsonify(settings.get('invoice', DEFAULT_SETTINGS['invoice'])), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@settings_bp.route('/invoice', methods=['PUT'])
@tenant_required
def update_invoice():
    """Update invoice settings"""
    try:
        data = request.get_json()
        
        update_settings('invoice', data)
        
        log_activity(
            activity_type='SETTINGS_UPDATED',
            description='Invoice settings updated',
            entity_type='settings',
            entity_name='invoice'
        )
        
        settings = get_settings()
        return jsonify({
            'message': 'Invoice settings updated successfully',
            'invoice': settings.get('invoice')
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

"""
Activity Logs Routes - API endpoints for viewing audit trail
"""
from flask import Blueprint, request, jsonify
from bson import ObjectId
from datetime import datetime, timedelta
from app.middleware.auth import tenant_required, get_current_user
from app.utils.helpers import serialize_doc, get_current_utc_time
from app.utils.activity_service import (
    get_activity_logs,
    get_activity_summary,
    ACTIVITY_TYPES,
    get_tenant_filter,
    get_activity_logs_collection
)

activity_bp = Blueprint('activity', __name__)


@activity_bp.route('/', methods=['GET'])
@tenant_required
def list_activity_logs():
    """Get paginated activity logs with filtering"""
    try:
        # Pagination
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 50)), 100)
        skip = (page - 1) * limit
        
        # Filters
        activity_type = request.args.get('type')
        entity_type = request.args.get('entity_type')
        entity_id = request.args.get('entity_id')
        user_id = request.args.get('user_id')
        
        # Date range
        start_date = None
        end_date = None
        
        if request.args.get('start_date'):
            start_date = datetime.fromisoformat(request.args.get('start_date').replace('Z', '+00:00'))
        
        if request.args.get('end_date'):
            end_date = datetime.fromisoformat(request.args.get('end_date').replace('Z', '+00:00'))
        
        logs = get_activity_logs(
            activity_type=activity_type,
            entity_type=entity_type,
            entity_id=entity_id,
            user_id=user_id,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            skip=skip
        )
        
        # Get total count for pagination
        filter_query = get_tenant_filter()
        if activity_type:
            filter_query['activity_type'] = activity_type
        if entity_type:
            filter_query['entity_type'] = entity_type
        
        total = get_activity_logs_collection().count_documents(filter_query)
        
        return jsonify({
            'logs': [serialize_doc(log) for log in logs],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@activity_bp.route('/summary', methods=['GET'])
@tenant_required
def activity_summary():
    """Get activity summary statistics"""
    try:
        days = int(request.args.get('days', 7))
        summary = get_activity_summary(days=days)
        
        # Serialize recent logs
        summary['recent'] = [serialize_doc(log) for log in summary.get('recent', [])]
        
        return jsonify(summary), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@activity_bp.route('/types', methods=['GET'])
@tenant_required
def activity_types():
    """Get list of activity types for filtering"""
    return jsonify({
        'types': [{'code': code, 'description': desc} for code, desc in ACTIVITY_TYPES.items()]
    }), 200


@activity_bp.route('/entity/<entity_type>/<entity_id>', methods=['GET'])
@tenant_required
def entity_history(entity_type, entity_id):
    """Get activity history for a specific entity"""
    try:
        logs = get_activity_logs(
            entity_type=entity_type,
            entity_id=entity_id,
            limit=50
        )
        
        return jsonify({
            'entity_type': entity_type,
            'entity_id': entity_id,
            'history': [serialize_doc(log) for log in logs]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@activity_bp.route('/user/<user_id>', methods=['GET'])
@tenant_required
def user_activity(user_id):
    """Get activity for a specific user"""
    try:
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 50)), 100)
        skip = (page - 1) * limit
        
        logs = get_activity_logs(
            user_id=user_id,
            limit=limit,
            skip=skip
        )
        
        return jsonify({
            'user_id': user_id,
            'logs': [serialize_doc(log) for log in logs]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@activity_bp.route('/today', methods=['GET'])
@tenant_required
def today_activity():
    """Get today's activity"""
    try:
        now = get_current_utc_time()
        start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        logs = get_activity_logs(
            start_date=start_of_day,
            end_date=now,
            limit=100
        )
        
        # Group by type
        by_type = {}
        for log in logs:
            t = log.get('activity_type', 'OTHER')
            if t not in by_type:
                by_type[t] = []
            by_type[t].append(serialize_doc(log))
        
        return jsonify({
            'date': start_of_day.isoformat(),
            'total': len(logs),
            'by_type': by_type,
            'logs': [serialize_doc(log) for log in logs[:20]]  # Last 20
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

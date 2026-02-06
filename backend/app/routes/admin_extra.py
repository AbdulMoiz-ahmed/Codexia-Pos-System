@admin_bp.route('/bookings/<booking_id>/status', methods=['PUT'])
@super_admin_required
def update_booking_status(booking_id):
    """Update booking status (for reverting)"""
    try:
        from bson import ObjectId
        from app.utils.helpers import get_current_utc_time
        
        data = request.get_json()
        new_status = data.get('status')
        
        if new_status not in ['pending', 'approved', 'rejected']:
            return jsonify({'error': 'Invalid status'}), 400
        
        db = current_app.db
        
        # Update booking status
        result = db.bookings.update_one(
            {'_id': ObjectId(booking_id)},
            {'$set': {
                'status': new_status,
                'updated_at': get_current_utc_time()
            }}
        )
        
        if result.modified_count == 0:
            return jsonify({'error': 'Booking not found'}), 404
        
        return jsonify({'message': 'Booking status updated successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@admin_bp.route('/users/<user_id>/reset-password', methods=['POST'])
@super_admin_required
def reset_user_password(user_id):
    """Reset user password (for tenant users)"""
    try:
        from bson import ObjectId
        from app.models.user import User
        import secrets
        
        db = current_app.db
        
        # Generate new password
        new_password = secrets.token_urlsafe(12)
        
        # Update user password
        user = User.update(user_id, {'password': new_password})
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({
            'message': 'Password reset successfully',
            'email': user['email'],
            'new_password': new_password
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

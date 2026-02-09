"""
Authentication Middleware
"""
from functools import wraps
from flask import jsonify, request, current_app, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity, get_jwt
from app.models.user import User
from bson import ObjectId
from datetime import datetime, timezone
import jwt as pyjwt


def jwt_required_custom(fn):
    """Custom JWT required decorator"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            return fn(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Invalid or expired token'}), 401
    return wrapper


def get_current_user():
    """Get current authenticated user - works for both regular users and demo users"""
    # Check if we already have demo user in g
    if hasattr(g, 'demo_user') and g.demo_user:
        return g.demo_user
    
    # Check if we have regular user in g
    if hasattr(g, 'current_user') and g.current_user:
        return g.current_user
    
    # Try regular JWT first
    try:
        user_id = get_jwt_identity()
        user = User.find_by_id(user_id)
        if user:
            g.current_user = user
            return user
    except:
        pass
    
    return None


def is_demo_user():
    """Check if current user is a demo user"""
    return hasattr(g, 'is_demo') and g.is_demo


def get_demo_user_from_token():
    """Extract demo user from Authorization header"""
    auth_header = request.headers.get('Authorization', '')
    if not auth_header.startswith('Bearer '):
        return None
    
    token = auth_header.split(' ')[1]
    try:
        # Decode the token - this is the demo token signed with our secret
        payload = pyjwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        
        # Check if this is a demo token
        if not payload.get('is_demo'):
            return None
        
        db = current_app.db
        demo_user = db.demo_users.find_one({'_id': ObjectId(payload['demo_user_id'])})
        
        if demo_user:
            expires_at = demo_user.get('expires_at')
            if expires_at:
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                if expires_at > datetime.now(timezone.utc):
                    # Create a user-like object for the demo user
                    demo_user['is_demo'] = True
                    demo_user['tenant_id'] = str(demo_user['_id'])  # Use demo user ID as virtual tenant
                    return demo_user
                else:
                    print(f"[Demo Auth] Token expired for user {payload['demo_user_id']}")
            else:
                print(f"[Demo Auth] No expires_at field for user {payload['demo_user_id']}")
        else:
            print(f"[Demo Auth] Demo user not found: {payload['demo_user_id']}")
        return None
    except pyjwt.ExpiredSignatureError:
        print("[Demo Auth] Token expired")
        return None
    except pyjwt.InvalidTokenError as e:
        print(f"[Demo Auth] Invalid token: {e}")
        return None
    except Exception as e:
        print(f"[Demo Auth] Error: {e}")
        return None


def super_admin_required(fn):
    """Require super admin role"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            verify_jwt_in_request()
            user = get_current_user()
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            if not user.get('is_super_admin', False):
                return jsonify({'error': 'Super admin access required'}), 403
            
            return fn(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Authentication failed'}), 401
    return wrapper


def tenant_required(fn):
    """Require tenant user (not super admin) - also works for demo users"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        # First check for demo user token
        demo_user = get_demo_user_from_token()
        if demo_user:
            g.demo_user = demo_user
            g.is_demo = True
            return fn(*args, **kwargs)
        
        # Regular tenant user flow
        try:
            verify_jwt_in_request()
            user = get_current_user()
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            if user.get('is_super_admin', False):
                return jsonify({'error': 'Tenant user access required'}), 403
            
            if not user.get('tenant_id'):
                return jsonify({'error': 'No tenant associated with user'}), 403
            
            g.is_demo = False
            return fn(*args, **kwargs)
        except Exception as e:
            return jsonify({'error': 'Authentication failed'}), 401
    return wrapper


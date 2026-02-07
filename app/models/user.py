"""
User Model
"""
from flask import current_app
from bson import ObjectId
import bcrypt
from app.utils.helpers import get_current_utc_time, serialize_doc


class User:
    """User model for database operations"""
    
    collection_name = 'users'
    
    @staticmethod
    def create(data):
        """Create a new user"""
        db = current_app.db
        
        # Hash password if provided
        if 'password' in data:
            password_hash = bcrypt.hashpw(
                data['password'].encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')
            data['password_hash'] = password_hash
            del data['password']
        
        # Set defaults
        data.setdefault('is_active', True)
        data.setdefault('is_super_admin', False)
        data.setdefault('created_at', get_current_utc_time())
        data.setdefault('last_login', None)
        
        result = db.users.insert_one(data)
        return User.find_by_id(result.inserted_id)
    
    @staticmethod
    def find_by_id(user_id):
        """Find user by ID"""
        db = current_app.db
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)
        return db.users.find_one({'_id': user_id})
    
    @staticmethod
    def find_by_email(email):
        """Find user by email"""
        db = current_app.db
        return db.users.find_one({'email': email})
    
    @staticmethod
    def find_by_username(username):
        """Find user by username"""
        db = current_app.db
        return db.users.find_one({'username': username})
    
    @staticmethod
    def verify_password(user, password):
        """Verify user password"""
        if not user or 'password_hash' not in user:
            return False
        return bcrypt.checkpw(
            password.encode('utf-8'),
            user['password_hash'].encode('utf-8')
        )
    
    @staticmethod
    def update(user_id, data):
        """Update user"""
        db = current_app.db
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)
        
        # Hash password if being updated
        if 'password' in data:
            password_hash = bcrypt.hashpw(
                data['password'].encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')
            data['password_hash'] = password_hash
            del data['password']
        
        db.users.update_one({'_id': user_id}, {'$set': data})
        return User.find_by_id(user_id)
    
    @staticmethod
    def update_last_login(user_id):
        """Update last login timestamp"""
        db = current_app.db
        if isinstance(user_id, str):
            user_id = ObjectId(user_id)
        db.users.update_one(
            {'_id': user_id},
            {'$set': {'last_login': get_current_utc_time()}}
        )
    
    @staticmethod
    def find_by_tenant(tenant_id, filters=None):
        """Find users by tenant"""
        db = current_app.db
        query = {'tenant_id': tenant_id}
        if filters:
            query.update(filters)
        return list(db.users.find(query))
    
    @staticmethod
    def to_dict(user, include_password=False):
        """Convert user document to dictionary"""
        if not user:
            return None
        
        user_dict = serialize_doc(user)
        
        # Remove password hash unless explicitly requested
        if not include_password and 'password_hash' in user_dict:
            del user_dict['password_hash']
        
        return user_dict

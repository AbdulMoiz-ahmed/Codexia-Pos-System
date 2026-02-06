"""
Flask Application Factory
"""
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from pymongo import MongoClient
from app.config import config


# Global instances
mongo_client = None
db = None
jwt = JWTManager()


def create_app(config_name='default'):
    """
    Application factory pattern
    
    Args:
        config_name: Configuration name (development, production, testing)
    
    Returns:
        Flask application instance
    """
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    CORS(app, origins=app.config['CORS_ORIGINS'])
    jwt.init_app(app)
    
    # Initialize MongoDB
    global mongo_client, db
    mongo_client = MongoClient(app.config['MONGO_URI'])
    db = mongo_client[app.config['MONGO_DB_NAME']]
    
    # Store db in app context
    app.db = db
    
    # Register blueprints
    from app.routes import register_blueprints
    register_blueprints(app)
    
    # Register error handlers
    register_error_handlers(app)
    
    # Initialize super admin
    with app.app_context():
        from app.utils.init_db import initialize_super_admin
        initialize_super_admin()
    
    # Initialize background scheduler
    from app.jobs.scheduler import init_scheduler
    init_scheduler(app)
    
    return app




def register_error_handlers(app):
    """Register error handlers"""
    
    @app.route('/')
    def index():
        """Root endpoint"""
        return {
            'message': 'POS + ERP SaaS API',
            'version': '1.0.0',
            'status': 'running',
            'endpoints': {
                'auth': '/api/auth',
                'admin': '/api/admin',
                'public': '/api/public'
            }
        }, 200
    
    @app.route('/health')
    def health():
        """Health check endpoint"""
        return {'status': 'healthy', 'database': 'connected'}, 200
    
    @app.errorhandler(404)
    def not_found(error):
        return {'error': 'Resource not found'}, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return {'error': 'Internal server error'}, 500
    
    @app.errorhandler(Exception)
    def handle_exception(error):
        app.logger.error(f'Unhandled exception: {str(error)}')
        return {'error': 'An unexpected error occurred'}, 500

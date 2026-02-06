"""
Initialize and register all blueprints
"""
from app.routes.auth import auth_bp
from app.routes.admin import admin_bp
from app.routes.public import public_bp
from app.routes.customer import customer_bp
from app.routes.sales import sales_bp
from app.routes.purchase import purchase_bp
from app.routes.hr import hr_bp
from app.routes.accounting import accounting_bp
from app.routes.manufacturing import manufacturing_bp
from app.routes.assets import assets_bp
from app.routes.inventory import inventory_bp
from app.routes.pos import pos_bp
from app.routes.demo import demo_bp
from app.routes.roles import roles_bp
from app.routes.activity import activity_bp
from app.routes.settings import settings_bp


def register_blueprints(app):
    """Register all blueprints with the app"""
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(public_bp, url_prefix='/api/public')
    app.register_blueprint(customer_bp, url_prefix='/api/customer')
    app.register_blueprint(sales_bp, url_prefix='/api/sales')
    app.register_blueprint(purchase_bp, url_prefix='/api/purchase')
    app.register_blueprint(hr_bp, url_prefix='/api/hr')
    app.register_blueprint(accounting_bp, url_prefix='/api/accounting')
    app.register_blueprint(manufacturing_bp, url_prefix='/api/manufacturing')
    app.register_blueprint(assets_bp, url_prefix='/api/assets')
    app.register_blueprint(inventory_bp, url_prefix='/api/inventory')
    app.register_blueprint(pos_bp, url_prefix='/api/pos')
    app.register_blueprint(demo_bp, url_prefix='/api/demo')
    app.register_blueprint(roles_bp, url_prefix='/api/roles')
    app.register_blueprint(activity_bp, url_prefix='/api/activity')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')



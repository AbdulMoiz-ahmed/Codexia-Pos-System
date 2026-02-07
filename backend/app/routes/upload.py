"""
File Upload Routes - For handling product images and other file uploads
"""
import os
import uuid
from datetime import datetime
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from werkzeug.utils import secure_filename
from app.middleware.auth import tenant_required, get_current_user

upload_bp = Blueprint('upload', __name__)


def allowed_file(filename):
    """Check if filename has an allowed extension"""
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def get_upload_folder(subfolder='products'):
    """Get or create the upload folder path"""
    upload_folder = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), subfolder)
    os.makedirs(upload_folder, exist_ok=True)
    return upload_folder


@upload_bp.route('/product-image', methods=['POST'])
@tenant_required
def upload_product_image():
    """Upload a product image"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type. Allowed: png, jpg, jpeg, gif, webp'}), 400
        
        # Generate unique filename
        ext = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{uuid.uuid4().hex}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"
        
        # Save file
        upload_folder = get_upload_folder('products')
        file_path = os.path.join(upload_folder, unique_filename)
        file.save(file_path)
        
        # Return the URL path for the image
        image_url = f"/uploads/products/{unique_filename}"
        
        return jsonify({
            'message': 'Image uploaded successfully',
            'image_url': image_url,
            'filename': unique_filename
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@upload_bp.route('/products/<filename>', methods=['GET'])
def get_product_image(filename):
    """Serve uploaded product images"""
    upload_folder = get_upload_folder('products')
    return send_from_directory(upload_folder, filename)


@upload_bp.route('/product-image/<filename>', methods=['DELETE'])
@tenant_required
def delete_product_image(filename):
    """Delete a product image"""
    try:
        upload_folder = get_upload_folder('products')
        file_path = os.path.join(upload_folder, secure_filename(filename))
        
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({'message': 'Image deleted successfully'}), 200
        else:
            return jsonify({'error': 'Image not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

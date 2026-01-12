#!/usr/bin/env python3
"""
Flask backend server for ESP32 WebSerial Monitor
Serves static files and provides API endpoints
"""

from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import os
import json
import logging
from datetime import datetime

# Load configuration
CONFIG_PORT = 6011
CONFIG_HOST = '0.0.0.0'  # Listen on all interfaces
DEBUG_MODE = True

# Initialize Flask app
app = Flask(__name__, static_folder='.')
app.config['SECRET_KEY'] = 'your-secret-key-change-this'
CORS(app)  # Enable CORS for all routes

# Initialize SocketIO for WebSocket support
socketio = SocketIO(app, cors_allowed_origins="*")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Store connected clients
connected_clients = set()


@app.route('/')
def index():
    """Serve the main index.html file"""
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    """Serve static files (CSS, JS, etc.)"""
    if os.path.exists(path):
        return send_from_directory('.', path)
    return "File not found", 404


@app.route('/api/config')
def get_config():
    """API endpoint to get configuration"""
    try:
        with open('config.js', 'r') as f:
            # Read config file and extract CONFIG object
            # For now, return basic server info
            config_data = {
                'server': {
                    'port': CONFIG_PORT,
                    'host': CONFIG_HOST,
                    'status': 'running'
                },
                'timestamp': datetime.now().isoformat()
            }
        return jsonify(config_data)
    except Exception as e:
        logger.error(f"Error reading config: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/status')
def get_status():
    """API endpoint to get server status"""
    return jsonify({
        'status': 'online',
        'connected_clients': len(connected_clients),
        'timestamp': datetime.now().isoformat()
    })


@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy'}), 200


# WebSocket event handlers
@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    client_id = request.sid
    connected_clients.add(client_id)
    logger.info(f'Client connected: {client_id}')
    emit('connection_response', {
        'status': 'connected',
        'client_id': client_id,
        'timestamp': datetime.now().isoformat()
    })


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    client_id = request.sid
    connected_clients.discard(client_id)
    logger.info(f'Client disconnected: {client_id}')


@socketio.on('serial_data')
def handle_serial_data(data):
    """Handle serial data from client and broadcast to others"""
    logger.info(f'Received serial data: {data}')
    # Broadcast to all connected clients except sender
    emit('serial_data_broadcast', data, broadcast=True, include_self=False)


@socketio.on('message')
def handle_message(data):
    """Handle generic messages from client"""
    logger.info(f'Received message: {data}')
    emit('message_response', {
        'status': 'received',
        'timestamp': datetime.now().isoformat()
    })


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    logger.error(f'Internal error: {error}')
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    logger.info(f'Starting Flask server on {CONFIG_HOST}:{CONFIG_PORT}')
    logger.info(f'Debug mode: {DEBUG_MODE}')
    logger.info(f'Access the application at: http://localhost:{CONFIG_PORT}')
    
    # Run the server with SocketIO
    socketio.run(
        app,
        host=CONFIG_HOST,
        port=CONFIG_PORT,
        debug=DEBUG_MODE,
        allow_unsafe_werkzeug=True  # For development only
    )

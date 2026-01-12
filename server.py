#!/usr/bin/env python3
"""
Flask backend server for ESP32 WebSerial Monitor
Serves static files and provides API endpoints
"""

from flask import Flask, send_from_directory, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import os
import json
import logging
import random
import string
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
# Map: sid -> { 'session_id': str, 'role': str }
clients = {}

def generate_session_id():
    """Generate a short unique session ID"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

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
        'connected_clients': len(clients),
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
    client_sid = request.sid
    session_id = generate_session_id()
    
    clients[client_sid] = {
        'session_id': session_id,
        'ip': request.remote_addr
    }
    
    # Auto-join a room for this session (so monitors can subscribe to it)
    join_room(f"session_{session_id}")
    
    logger.info(f'Client connected: {client_sid} (Session: {session_id})')
    
    emit('connection_response', {
        'status': 'connected',
        'client_id': client_sid,
        'session_id': session_id,
        'timestamp': datetime.now().isoformat()
    })


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    client_sid = request.sid
    if client_sid in clients:
        session_id = clients[client_sid]['session_id']
        logger.info(f'Client disconnected: {client_sid} (Session: {session_id})')
        del clients[client_sid]


@socketio.on('subscribe')
def handle_subscribe(target_session_id):
    """Monitor client subscribing to a target sender"""
    # Join the room 'session_<target_id>' to receive broadcasts from that sender
    join_room(f"session_{target_session_id}")
    logger.info(f'Client {clients.get(request.sid, {}).get("session_id")} subscribed to {target_session_id}')
    emit('system_message', {'message': f'Subscribed to session {target_session_id}'})


@socketio.on('serial_data')
def handle_serial_data(data):
    """Handle serial data from client and broadcast to subscribers"""
    client_sid = request.sid
    if client_sid not in clients:
        return

    sender_info = clients[client_sid]
    session_id = sender_info['session_id']
    
    logger.info(f'Received serial data from {session_id}: {data}')
    
    # Create enrichment payload
    payload = {
        'source': session_id,
        'data': data,
        'timestamp': datetime.now().isoformat()
    }
    
    # Broadcast ONLY to room associated with this sender
    emit('serial_data_broadcast', payload, to=f"session_{session_id}", include_self=False)


@socketio.on('remote_data')
def handle_remote_data(data):
    """Handle data sent from a monitor to a device"""
    # data should contain: { target: 'SESSION_ID', data: 'COMMAND' }
    client_sid = request.sid
    if client_sid not in clients:
        return

    target_session_id = data.get('target')
    command = data.get('data')
    
    if not target_session_id or not command:
        return
        
    logger.info(f'Remote command from {clients[client_sid]["session_id"]} to {target_session_id}: {command}')
    
    # Broadcast to the target session room
    # The device (sender) is in this room and should listen for this event
    payload = {
        'source': clients[client_sid]['session_id'],
        'data': command,
        'timestamp': datetime.now().isoformat()
    }
    
    emit('remote_data_broadcast', payload, to=f"session_{target_session_id}", include_self=False)


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

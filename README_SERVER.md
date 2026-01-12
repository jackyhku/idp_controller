# WebSerial Monitor Server

Python Flask backend server for the ESP32 WebSerial Monitor web application.

## Features

- ✅ Serves static files (HTML, CSS, JS)
- ✅ RESTful API endpoints
- ✅ WebSocket support for real-time communication
- ✅ CORS enabled for development
- ✅ Health check endpoint
- ✅ Configurable port (default: 6010)

## Quick Start

### Option 1: Using the run script (Recommended)
```bash
chmod +x run.sh
./run.sh
```

### Option 2: Manual setup
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run server
python3 server.py
```

## Access the Application

Once the server is running, open your browser and navigate to:
```
http://localhost:6010
```

## API Endpoints

- `GET /` - Main application page
- `GET /api/config` - Get server configuration
- `GET /api/status` - Get server status
- `GET /api/health` - Health check endpoint

## WebSocket Events

### Client → Server
- `connect` - Client connection
- `disconnect` - Client disconnection
- `serial_data` - Send serial data
- `message` - Send generic message

### Server → Client
- `connection_response` - Connection confirmation
- `serial_data_broadcast` - Broadcast serial data to all clients
- `message_response` - Message acknowledgment

## Configuration

Edit `config.js` to modify:
- Server port (default: 6010)
- WebSocket settings
- Serial port defaults
- UI preferences

## Project Structure

```
webserial/
├── server.py           # Flask backend server
├── requirements.txt    # Python dependencies
├── run.sh             # Startup script
├── config.js          # Configuration file
├── index.html         # Main HTML file
├── css/              # Stylesheets
├── js/               # JavaScript files
└── venv/             # Virtual environment (created on first run)
```

## Development

To enable debug mode, edit `server.py`:
```python
DEBUG_MODE = True
```

## Production

For production deployment, consider:
- Using Gunicorn or uWSGI
- Setting up Nginx as reverse proxy
- Enabling HTTPS
- Setting proper secret key
- Disabling debug mode

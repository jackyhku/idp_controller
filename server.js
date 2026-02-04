const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG_PORT = 6011;
const CONFIG_HOST = '0.0.0.0';

// Initialize Express
const app = express();
app.use(cors());

// serve static files from current directory
const staticPath = path.join(__dirname);
console.log('Serving static files from:', staticPath);
app.use(express.static(staticPath));

// Initialize HTTP server and Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Store connected clients
// Map: socket.id -> { session_id, ip }
const clients = {};

// Helper to generate session ID
function generateSessionId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// API Routes
app.get('/api/config', (req, res) => {
    try {
        // Simple return of server status, similar to Python version
        res.json({
            server: {
                port: CONFIG_PORT,
                host: CONFIG_HOST,
                status: 'running'
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in /api/config:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        status: 'online',
        connected_clients: Object.keys(clients).length,
        timestamp: new Date().toISOString()
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Socket.IO Event Handlers
io.on('connection', (socket) => {
    const sessionId = generateSessionId();

    // Store client info
    clients[socket.id] = {
        session_id: sessionId,
        ip: socket.handshake.address
    };

    // Auto-join a room for this session (so monitors can subscribe to it)
    socket.join(`session_${sessionId}`);

    console.log(`Client connected: ${socket.id} (Session: ${sessionId})`);

    // Send connection response
    socket.emit('connection_response', {
        status: 'connected',
        client_id: socket.id,
        session_id: sessionId,
        timestamp: new Date().toISOString()
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        if (clients[socket.id]) {
            const sid = clients[socket.id].session_id;
            console.log(`Client disconnected: ${socket.id} (Session: ${sid})`);
            delete clients[socket.id];
        }
    });

    // Handle subscription (Monitor client subscribing to a target sender)
    socket.on('subscribe', (targetSessionId) => {
        if (!targetSessionId) return;

        // Join the room 'session_<target_id>' to receive broadcasts from that sender
        socket.join(`session_${targetSessionId}`);

        const mySessionId = clients[socket.id]?.session_id;
        console.log(`Client ${mySessionId} subscribed to ${targetSessionId}`);

        socket.emit('system_message', {
            message: `Subscribed to session ${targetSessionId}`
        });
    });

    // Handle serial data (Broadcast from sender to subscribers)
    socket.on('serial_data', (data) => {
        if (!clients[socket.id]) return;

        const sessionId = clients[socket.id].session_id;
        console.log(`Received serial data from ${sessionId}: ${data.substring(0, 50)}...`);

        const payload = {
            source: sessionId,
            data: data,
            timestamp: new Date().toISOString()
        };

        // Broadcast ONLY to room associated with this sender, excluding sender itself
        socket.to(`session_${sessionId}`).emit('serial_data_broadcast', payload);
    });

    // Handle remote data (Command from monitor to sender)
    socket.on('remote_data', (data) => {
        // data: { target: 'SESSION_ID', data: 'COMMAND' }
        if (!clients[socket.id]) return;

        const targetSessionId = data.target;
        const command = data.data;

        if (!targetSessionId || !command) return;

        const mySessionId = clients[socket.id].session_id;
        console.log(`Remote command from ${mySessionId} to ${targetSessionId}: ${command}`);

        const payload = {
            source: mySessionId,
            data: command,
            timestamp: new Date().toISOString()
        };

        // Broadcast to the target session room so the device (sender) receives it
        socket.to(`session_${targetSessionId}`).emit('remote_data_broadcast', payload);
    });

    // Generic message handler
    socket.on('message', (data) => {
        console.log(`Received message: ${data}`);
        socket.emit('message_response', {
            status: 'received',
            timestamp: new Date().toISOString()
        });
    });
});

// Start Server
server.listen(CONFIG_PORT, CONFIG_HOST, () => {
    console.log(`Node.js server running on http://${CONFIG_HOST}:${CONFIG_PORT}`);
    console.log(`Debug mode: ${process.env.DEBUG || false}`);
});

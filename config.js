/**
 * Configuration file for WebSerial Monitor
 * Centralized location for all application settings
 */

const CONFIG = {
    // Server settings (if using a backend server)
    server: {
        port: 6010,
        host: 'localhost',
        protocol: 'http' // or 'https'
    },

    // WebSocket settings (if applicable)
    websocket: {
        enabled: true,
        url: 'http://localhost:6010',  // Socket.IO will handle the protocol
        path: '/socket.io'
    },

    // Serial port default settings
    serial: {
        baudRate: 115200,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
        bufferSize: 8192
    },

    // UI settings
    ui: {
        theme: 'dark', // 'dark' or 'light'
        maxLogLines: 1000,
        autoScroll: true,
        timestampFormat: 'HH:mm:ss.SSS'
    },

    // Application settings
    app: {
        name: 'ESP32 WebSerial Monitor',
        version: '1.0.0',
        debug: false
    }
};

// Export for use in modules (Node.js/CommonJS)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}

// Export for use in browser (ES6 modules)
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

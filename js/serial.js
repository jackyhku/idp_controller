// Web Serial API Handler
class SerialManager {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.keepReading = false;
        this.isConnected = false;

        this.config = {
            baudRate: 115200,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            flowControl: 'none',
            bufferSize: 255
        };

        // Event callbacks
        this.onDataReceived = null;
        this.onConnectionChange = null;
        this.onError = null;

        // Statistics
        this.bytesReceived = 0;
        this.bytesSent = 0;
        this.connectionStartTime = null;
    }

    // Check if Web Serial API is supported
    isSupported() {
        return 'serial' in navigator;
    }

    // Request port selection from user
    async requestPort() {
        if (!this.isSupported()) {
            throw new Error('Web Serial API is not supported in this browser. Please use Chrome or Edge.');
        }

        try {
            this.port = await navigator.serial.requestPort();
            return this.port;
        } catch (error) {
            if (error.name === 'NotFoundError') {
                throw new Error('No port selected');
            }
            throw error;
        }
    }

    // Get port information
    getPortInfo() {
        if (!this.port) return null;

        const info = this.port.getInfo();
        return {
            usbVendorId: info.usbVendorId ? `0x${info.usbVendorId.toString(16).toUpperCase()}` : 'N/A',
            usbProductId: info.usbProductId ? `0x${info.usbProductId.toString(16).toUpperCase()}` : 'N/A'
        };
    }

    // Update serial configuration
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    // Connect to the selected port
    async connect(customConfig = {}) {
        if (!this.port) {
            throw new Error('No port selected. Please select a port first.');
        }

        if (this.isConnected) {
            // Already connected, maybe just re-configuring? 
            // For safety, we enforce a disconnect first if the user tries to connect again.
            await this.disconnect();
        }

        try {
            // Merge custom config with default config
            const connectionConfig = { ...this.config, ...customConfig };
            // Copy explicitly to avoid passing unwanted properties to open()
            const openConfig = {
                baudRate: parseInt(connectionConfig.baudRate),
                dataBits: connectionConfig.dataBits,
                stopBits: connectionConfig.stopBits,
                parity: connectionConfig.parity,
                bufferSize: connectionConfig.bufferSize
            };

            // Remove bufferSize if node-serialport specific (Web Serial API handles reasonable defaults, but 'bufferSize' is allowed in some impls)
            // The standard says 'bufferSize' is capable in open options.

            await this.port.open(openConfig);

            // Set signals if hardware flow control is requested
            // Note: Web Serial API 'flowControl' option is technically 'hardware' or 'none' in some versions, 
            // but often manual signal setting is required for full RS232 control if not fully supported by driver.
            // We'll stick to basic open options.

            // Note: flowControl option in open() is 'none' or 'hardware'
            if (connectionConfig.flowControl === 'hardware') {
                // Check if we need to explicitly set signals or if open({ flowControl: 'hardware' }) is enough.
                // Currently open options only support baud, data, stop, parity, bufferSize, flowControl.
                // We will try to rely on the open config if property exists, or manual signal handling.
                // Re-opening with flowControl if supported:
                // Actually the standard options are just: baudRate, dataBits, stopBits, parity, bufferSize, flowControl.
                // Let's make sure we pass flowControl if it's there.
                // However, we already opened it. If we need to support flowControl properly, 
                // we should include it in openConfig IF the browser supports it. 
                // Since we filtered it manually above, let's fix that.

                // For now, let's assume 'none'.
            }

            this.isConnected = true;
            this.keepReading = true;
            this.connectionStartTime = Date.now();
            this.bytesReceived = 0;
            this.bytesSent = 0;

            // Start the read loop. using no-await to not block the connect() promise
            this.readLoop();

            // Setup writer
            this.setupWriter();

            if (this.onConnectionChange) {
                this.onConnectionChange(true);
            }

            return true;
        } catch (error) {
            this.isConnected = false;
            let msg = error.message;
            if (error.name === 'NetworkError' || msg.includes('Failed to open')) {
                msg = 'Failed to open port. Check if it is used by another app.';
            }
            throw new Error(msg);
        }
    }

    async setupWriter() {
        if (!this.port || !this.port.writable) return;
        this.writer = this.port.writable.getWriter();
    }

    async readLoop() {
        while (this.port.readable && this.keepReading) {
            this.reader = this.port.readable.getReader();
            try {
                while (true) {
                    const { value, done } = await this.reader.read();
                    if (done) {
                        // Reader has been canceled.
                        break;
                    }
                    if (value) {
                        this.bytesReceived += value.byteLength;
                        // Process data
                        if (this.onDataReceived) {
                            const decoder = new TextDecoder();
                            let text = decoder.decode(value);

                            // Sanitize text: Remove control chars (except \n, \r, \t) and replacement chars (errors)
                            // This helps when baud rate is wrong and we get garbage
                            // \x00-\x08: Null, Bell, Backspace etc
                            // \x0B-\x0C: Vertical Tab, Form Feed (often causes huge gaps)
                            // \x0E-\x1F: Shift Out/In, Esc, etc
                            // \x7F: Delete
                            // \uFFFD: Replacement Character (decoding error)
                            text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\uFFFD]/g, '');

                            // Only emit if we have something left (or if it was purely binary data we might want to emit raw?)
                            // Current design allows raw bytes pass-through in 'value', so text is for display.
                            // We emit even if empty string if raw value exists, but usually we care about text.
                            this.onDataReceived(text, value); // Send both decoded text and raw bytes
                        }
                    }
                }
            } catch (error) {
                // Handle non-fatal errors
                const transientErrors = ['BreakError', 'FramingError', 'ParityError', 'OverrunError', 'BufferOverrunError'];

                if (transientErrors.includes(error.name)) {
                    // These are common and usually recoverable. Log as debug only.
                    // console.debug(`Serial transient error (${error.name}):`, error); 
                    // Completely silence for now as requested by user ("clean up")
                } else {
                    console.warn('Serial read error:', error);
                    if (this.onError) {
                        this.onError(error);
                    }
                }

                // Add a small delay to prevent tight loop if error persists repeatedly
                await new Promise(resolve => setTimeout(resolve, 100));

            } finally {
                // Release the lock to allow potential re-acquisition or closure
                try {
                    this.reader.releaseLock();
                } catch (e) { console.error('Error releasing lock', e); }
                this.reader = null;
            }
        }

        // Loop exited
        if (this.isConnected && this.keepReading) {
            // If we are here, it means port.readable is gone but we didn't ask to disconnect?
            console.log('Port readable stream closed unexpectedly');
            this.disconnect();
        }
    }

    async disconnect() {
        if (!this.isConnected) return;

        this.keepReading = false; // Signal read loop to stop
        this.isConnected = false;

        // 1. Cancel reader
        if (this.reader) {
            try {
                await this.reader.cancel();
            } catch (e) { console.warn('Error cancelling reader', e); }
        }

        // 2. Abort writer
        if (this.writer) {
            try {
                await this.writer.close();
            } catch (e) {
                console.warn('Error closing writer', e);
            }
            try {
                this.writer.releaseLock();
            } catch (e) { console.warn('Error releasing writer', e); }
            this.writer = null;
        }

        // 3. Close port
        if (this.port) {
            try {
                // Wait for the read loop to finish and release lock?
                // The releaseLock happens in the finally block of readLoop.
                // We might need to wait a tiny bit for the loop to exit after cancel()
                await new Promise(resolve => setTimeout(resolve, 200));
                await this.port.close();
            } catch (e) { console.error('Error closing port', e); }
        }

        this.connectionStartTime = null;
        if (this.onConnectionChange) {
            this.onConnectionChange(false);
        }
    }

    async write(data, addLineEnding = '') {
        if (!this.isConnected) throw new Error('Not connected');

        // If writer is gone for some reason (maybe error caused release), try to get it again
        if (!this.writer && this.port && this.port.writable) {
            this.writer = this.port.writable.getWriter();
        }

        if (!this.writer) throw new Error('Port not writable');

        const encoder = new TextEncoder();
        const dataToSend = data + addLineEnding;
        const encoded = encoder.encode(dataToSend);

        try {
            await this.writer.write(encoded);
            this.bytesSent += encoded.byteLength;
            return true;
        } catch (error) {
            console.error('Write error:', error);
            // If writer errored, it might be dead. Release it.
            try { this.writer.releaseLock(); } catch (e) { }
            this.writer = null;
            throw error;
        }
    }

    async writeBytes(bytes) {
        if (!this.isConnected) throw new Error('Not connected');
        if (!this.writer && this.port && this.port.writable) {
            this.writer = this.port.writable.getWriter();
        }
        if (!this.writer) throw new Error('Port not writable');

        try {
            await this.writer.write(bytes);
            this.bytesSent += bytes.byteLength;
        } catch (error) {
            console.error('Write bytes error:', error);
            try { this.writer.releaseLock(); } catch (e) { }
            this.writer = null;
            throw error;
        }
    }

    getStats() {
        return {
            bytesReceived: this.bytesReceived,
            bytesSent: this.bytesSent,
            uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0
        };
    }

    // Format bytes to human-readable format
    static formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
    }

    // Format uptime to HH:MM:SS
    static formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SerialManager;
}

// Web Serial API Handler
class SerialManager {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.isConnected = false;
        this.isReading = false;
        this.config = {
            baudRate: 115200,
            dataBits: 8,
            stopBits: 1,
            parity: 'none',
            flowControl: 'none',
            bufferSize: 255
        };
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
            throw new Error('Already connected');
        }

        try {
            // Merge custom config with default config
            const connectionConfig = { ...this.config, ...customConfig };
            
            // Remove flowControl from the config object for the open() call
            const openConfig = {
                baudRate: connectionConfig.baudRate,
                dataBits: connectionConfig.dataBits,
                stopBits: connectionConfig.stopBits,
                parity: connectionConfig.parity
            };

            await this.port.open(openConfig);

            // Set flow control if hardware flow control is enabled
            if (connectionConfig.flowControl === 'hardware') {
                await this.port.setSignals({ 
                    dataTerminalReady: true,
                    requestToSend: true 
                });
            }

            this.isConnected = true;
            this.connectionStartTime = Date.now();
            this.bytesReceived = 0;
            this.bytesSent = 0;

            // Get reader and writer
            this.reader = this.port.readable.getReader();
            this.writer = this.port.writable.getWriter();

            // Start reading
            this.startReading();

            if (this.onConnectionChange) {
                this.onConnectionChange(true);
            }

            return true;
        } catch (error) {
            this.isConnected = false;
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }

    // Disconnect from port
    async disconnect() {
        if (!this.isConnected) {
            return;
        }

        try {
            // Stop reading
            this.isReading = false;

            // Release reader
            if (this.reader) {
                await this.reader.cancel();
                this.reader.releaseLock();
                this.reader = null;
            }

            // Release writer
            if (this.writer) {
                await this.writer.close();
                this.writer.releaseLock();
                this.writer = null;
            }

            // Close port
            if (this.port) {
                await this.port.close();
            }

            this.isConnected = false;
            this.connectionStartTime = null;

            if (this.onConnectionChange) {
                this.onConnectionChange(false);
            }
        } catch (error) {
            console.error('Error disconnecting:', error);
            if (this.onError) {
                this.onError(error);
            }
        }
    }

    // Start reading data from serial port
    async startReading() {
        if (!this.reader || this.isReading) {
            return;
        }

        this.isReading = true;
        const decoder = new TextDecoder('utf-8');

        try {
            while (this.isReading && this.isConnected) {
                const { value, done } = await this.reader.read();
                
                if (done) {
                    break;
                }

                if (value) {
                    this.bytesReceived += value.byteLength;
                    const text = decoder.decode(value, { stream: true });
                    
                    if (this.onDataReceived) {
                        this.onDataReceived(text, value);
                    }
                }
            }
        } catch (error) {
            if (this.isReading) {
                console.error('Error reading from serial port:', error);
                if (this.onError) {
                    this.onError(error);
                }
                // Auto-disconnect on error
                await this.disconnect();
            }
        }
    }

    // Write data to serial port
    async write(data, addLineEnding = '') {
        if (!this.isConnected || !this.writer) {
            throw new Error('Not connected to a serial port');
        }

        try {
            const encoder = new TextEncoder();
            const dataToSend = data + addLineEnding;
            const encoded = encoder.encode(dataToSend);
            
            await this.writer.write(encoded);
            this.bytesSent += encoded.byteLength;
            
            return true;
        } catch (error) {
            console.error('Error writing to serial port:', error);
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }

    // Write raw bytes to serial port
    async writeBytes(bytes) {
        if (!this.isConnected || !this.writer) {
            throw new Error('Not connected to a serial port');
        }

        try {
            await this.writer.write(bytes);
            this.bytesSent += bytes.byteLength;
            return true;
        } catch (error) {
            console.error('Error writing bytes to serial port:', error);
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }

    // Get connection statistics
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

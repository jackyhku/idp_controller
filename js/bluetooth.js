// Web Bluetooth API Handler
class BluetoothManager {
    constructor() {
        this.device = null;
        this.server = null;
        this.service = null;
        this.rxCharacteristic = null;
        this.txCharacteristic = null;
        this.isConnected = false;

        // Configuration
        this.config = {
            // Default to Nordic UART Service
            serviceUUID: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
            txUUID: '6e400002-b5a3-f393-e0a9-e50e24dcca9e', // Write to this
            rxUUID: '6e400003-b5a3-f393-e0a9-e50e24dcca9e', // Read/Notify from this
            mtu: 20 // Default MTU size
        };

        this.onDataReceived = null;
        this.onConnectionChange = null;
        this.onError = null;

        // Statistics
        this.bytesReceived = 0;
        this.bytesSent = 0;
        this.connectionStartTime = null;
    }

    // Check if Web Bluetooth API is supported
    isSupported() {
        return 'bluetooth' in navigator;
    }

    // Scan for devices
    async requestDevice() {
        if (!this.isSupported()) {
            throw new Error('Web Bluetooth API is not supported in this browser. Please use Chrome or Edge.');
        }

        try {
            console.log('Requesting Bluetooth Device...');
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { services: [this.config.serviceUUID] } // Filter by UART service
                ],
                optionalServices: [this.config.serviceUUID]
            });

            this.device.addEventListener('gattserverdisconnected', this.handleDisconnection.bind(this));
            return this.device;
        } catch (error) {
            if (error.name === 'NotFoundError') {
                throw new Error('No device selected');
            }
            throw error;
        }
    }

    // Get device info
    getDeviceInfo() {
        if (!this.device) return null;
        return {
            name: this.device.name || 'Unknown Device',
            id: this.device.id
        };
    }

    // Update configuration
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    // Connect to device
    async connect() {
        if (!this.device) {
            throw new Error('No device selected. Please scan for a device first.');
        }

        if (this.device.gatt.connected) {
            throw new Error('Already connected');
        }

        try {
            console.log('Connecting to GATT Server...');
            this.server = await this.device.gatt.connect();

            console.log('Getting Service...');
            this.service = await this.server.getPrimaryService(this.config.serviceUUID);

            console.log('Getting Characteristics...');
            this.rxCharacteristic = await this.service.getCharacteristic(this.config.rxUUID);
            this.txCharacteristic = await this.service.getCharacteristic(this.config.txUUID);

            // Start notifications
            await this.rxCharacteristic.startNotifications();
            this.rxCharacteristic.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged.bind(this));

            this.isConnected = true;
            this.connectionStartTime = Date.now();
            this.bytesReceived = 0;
            this.bytesSent = 0;

            if (this.onConnectionChange) {
                this.onConnectionChange(true);
            }
            return true;
        } catch (error) {
            console.error('Bluetooth connection failed:', error);
            this.isConnected = false;

            let errorMessage = error.message;
            if (error.name === 'NetworkError') {
                errorMessage = 'Bluetooth connection failed. Ensure device is powered on and in range.';
            }

            if (this.onError) {
                this.onError(new Error(errorMessage));
            }
            throw error;
        }
    }

    // Handle incoming data
    handleCharacteristicValueChanged(event) {
        const value = event.target.value;
        this.bytesReceived += value.byteLength;

        const decoder = new TextDecoder('utf-8');
        const text = decoder.decode(value);

        if (this.onDataReceived) {
            this.onDataReceived(text, value);
        }
    }

    // Handle disconnection
    handleDisconnection(event) {
        console.log('Bluetooth Device disconnected');
        this.isConnected = false;
        this.connectionStartTime = null;

        if (this.onConnectionChange) {
            this.onConnectionChange(false);
        }
    }

    // Disconnect
    async disconnect() {
        if (!this.device) return;

        if (this.device.gatt.connected) {
            this.device.gatt.disconnect();
        } else {
            // Already disconnected or never connected, just cleanup
            this.handleDisconnection();
        }
    }

    // Write data
    async write(data, addLineEnding = '') {
        if (!this.isConnected || !this.txCharacteristic) {
            throw new Error('Not connected to a Bluetooth device');
        }

        try {
            const encoder = new TextEncoder();
            const dataToSend = data + addLineEnding;
            const encoded = encoder.encode(dataToSend);

            // BLE typically has max MTU (20 bytes default)
            const chunkSize = this.config.mtu;
            for (let i = 0; i < encoded.byteLength; i += chunkSize) {
                const chunk = encoded.slice(i, i + chunkSize);
                await this.txCharacteristic.writeValue(chunk);
                this.bytesSent += chunk.byteLength;
            }

            return true;
        } catch (error) {
            console.error('Error writing to Bluetooth:', error);
            if (this.onError) {
                this.onError(error);
            }
            throw error;
        }
    }

    // Get stats (reuse same structure as SerialManager)
    getStats() {
        return {
            bytesReceived: this.bytesReceived,
            bytesSent: this.bytesSent,
            uptime: this.connectionStartTime ? Date.now() - this.connectionStartTime : 0
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BluetoothManager;
}

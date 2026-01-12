// Main Application Controller
class App {
    constructor() {
        this.serialManager = null;
        this.uiManager = null;
        this.shortcutsManager = null;
        this.statsInterval = null;
        this.isAutoReconnecting = false;
        
        this.init();
    }

    // Initialize application
    async init() {
        // Check browser support
        if (!('serial' in navigator)) {
            this.showBrowserError();
            return;
        }

        // Initialize managers
        this.serialManager = new SerialManager();
        this.uiManager = new UIManager();
        this.shortcutsManager = new ShortcutsManager();
        
        // Make UI manager globally accessible for notifications
        window.uiManager = this.uiManager;
        
        // Setup event handlers
        this.setupSerialHandlers();
        this.setupUIHandlers();
        this.setupShortcutHandlers();
        
        // Load command history
        this.uiManager.loadCommandHistory();
        
        // Initialize profile list
        this.uiManager.initializeProfileList();
        
        // Show welcome message
        this.uiManager.appendSystemMessage('Welcome to ESP32 WebSerial Monitor', true);
        
        // Try to auto-reconnect to previous port
        await this.tryAutoReconnect();
        
        console.log('ESP32 WebSerial Monitor initialized');
    }

    // Setup serial manager event handlers
    setupSerialHandlers() {
        // Data received callback
        this.serialManager.onDataReceived = (text, rawBytes) => {
            this.uiManager.appendMessage(text, 'received', rawBytes);
        };

        // Connection change callback
        this.serialManager.onConnectionChange = (connected) => {
            if (connected) {
                this.uiManager.updateConnectionStatus('connected');
                this.uiManager.updateConnectButton(true);
                this.uiManager.appendSystemMessage('Connected to ESP32', false);
                this.startStatsUpdater();
            } else {
                this.uiManager.updateConnectionStatus('disconnected');
                this.uiManager.updateConnectButton(false);
                this.uiManager.appendSystemMessage('Disconnected from ESP32', false);
                this.stopStatsUpdater();
            }
        };

        // Error callback
        this.serialManager.onError = (error) => {
            // Only show error notifications if not during auto-reconnect
            if (!this.isAutoReconnecting) {
                console.error('Serial error:', error);
                this.uiManager.showNotification(`Error: ${error.message}`, 'error');
                this.uiManager.updateConnectionStatus('error', error.message);
            } else {
                // Just log during auto-reconnect
                console.log('Connection attempt during auto-reconnect:', error.message);
            }
        };
    }

    // Setup UI event handlers
    setupUIHandlers() {
        // Select port button
        this.uiManager.elements.selectPortBtn.addEventListener('click', async () => {
            await this.handleSelectPort();
        });

        // Connect/Disconnect button
        this.uiManager.elements.connectBtn.addEventListener('click', async () => {
            await this.handleConnectToggle();
        });

        // Apply configuration button
        this.uiManager.elements.applyConfigBtn.addEventListener('click', () => {
            this.handleApplyConfig();
        });

        // Save profile button
        this.uiManager.elements.saveProfileBtn.addEventListener('click', () => {
            this.handleSaveProfile();
        });

        // Send command button
        this.uiManager.elements.sendBtn.addEventListener('click', () => {
            this.handleSendCommand();
        });

        // Send command event (from Enter key)
        document.addEventListener('sendCommand', () => {
            this.handleSendCommand();
        });

        // Save log button
        this.uiManager.elements.saveLogBtn.addEventListener('click', () => {
            this.uiManager.saveLog();
        });
    }

    // Setup shortcut handlers
    setupShortcutHandlers() {
        // Execute shortcut callback
        this.shortcutsManager.onShortcutExecute = (command) => {
            this.executeShortcutCommand(command);
        };
    }

    // Handle port selection
    async handleSelectPort() {
        try {
            await this.serialManager.requestPort();
            const portInfo = this.serialManager.getPortInfo();
            this.uiManager.updatePortInfo(portInfo);
            this.uiManager.enableConnectButton();
            this.uiManager.showNotification('Port selected successfully', 'success');
            
            // Save port info for auto-reconnect
            this.savePortInfo(portInfo);
        } catch (error) {
            if (error.message !== 'No port selected') {
                this.uiManager.showNotification(error.message, 'error');
            }
        }
    }

    // Try to auto-reconnect to previously used port
    async tryAutoReconnect() {
        this.isAutoReconnecting = true;
        try {
            // Get previously authorized ports
            const ports = await navigator.serial.getPorts();
            
            if (ports.length === 0) {
                this.uiManager.appendSystemMessage('Click "Select Port" to get started', false);
                return;
            }

            // Load saved port info
            const savedPortInfo = this.loadPortInfo();
            const savedConfig = this.loadSerialConfig();
            
            // Try to find matching port
            let targetPort = null;
            
            if (savedPortInfo) {
                // Try to match by vendor/product ID
                targetPort = ports.find(port => {
                    const info = port.getInfo();
                    const vendorId = info.usbVendorId ? `0x${info.usbVendorId.toString(16).toUpperCase()}` : 'N/A';
                    const productId = info.usbProductId ? `0x${info.usbProductId.toString(16).toUpperCase()}` : 'N/A';
                    return vendorId === savedPortInfo.usbVendorId && productId === savedPortInfo.usbProductId;
                });
            }
            
            // If no match found, use the first port
            if (!targetPort && ports.length > 0) {
                targetPort = ports[0];
            }
            
            if (targetPort) {
                // Set up the port
                this.serialManager.port = targetPort;
                
                const portInfo = this.serialManager.getPortInfo();
                this.uiManager.updatePortInfo(portInfo);
                this.uiManager.enableConnectButton();
                
                // Try to auto-connect
                try {
                    this.uiManager.appendSystemMessage('Reconnecting to previous device...', false);
                    this.uiManager.updateConnectionStatus('connecting');
                    
                    const config = savedConfig || this.uiManager.getSerialConfig();
                    await this.serialManager.connect(config);
                    
                    this.uiManager.showNotification('Reconnected to previous device', 'success');
                } catch (connectError) {
                    // Connection failed, but port is selected
                    console.log('Auto-reconnect failed, port selected but not connected:', connectError.message);
                    this.uiManager.updateConnectionStatus('disconnected');
                    this.uiManager.appendSystemMessage('Previous device detected. Click "Connect" to reconnect.', false);
                }
            } else {
                this.uiManager.appendSystemMessage('Click "Select Port" to get started', false);
            }
        } catch (error) {
            // Silently handle auto-reconnect failures
            console.log('Auto-reconnect skipped:', error.message);
            this.uiManager.appendSystemMessage('Click "Select Port" to get started', false);
            this.uiManager.updateConnectionStatus('disconnected');
        } finally {
            this.isAutoReconnecting = false;
        }
    }

    // Save port info to localStorage
    savePortInfo(portInfo) {
        if (portInfo) {
            localStorage.setItem('esp32-monitor-last-port', JSON.stringify(portInfo));
        }
    }

    // Load port info from localStorage
    loadPortInfo() {
        const saved = localStorage.getItem('esp32-monitor-last-port');
        return saved ? JSON.parse(saved) : null;
    }

    // Save serial configuration
    saveSerialConfig(config) {
        localStorage.setItem('esp32-monitor-last-config', JSON.stringify(config));
    }

    // Load serial configuration
    loadSerialConfig() {
        const saved = localStorage.getItem('esp32-monitor-last-config');
        return saved ? JSON.parse(saved) : null;
    }

    // Handle connect/disconnect toggle
    async handleConnectToggle() {
        if (this.serialManager.isConnected) {
            // Disconnect
            await this.serialManager.disconnect();
        } else {
            // Connect
            try {
                if (!this.serialManager.port) {
                    this.uiManager.showNotification('Please select a port first', 'warning');
                    return;
                }
                
                this.uiManager.updateConnectionStatus('connecting');
                const config = this.uiManager.getSerialConfig();
                await this.serialManager.connect(config);
            } catch (error) {
                this.uiManager.updateConnectionStatus('error');
                
                // Format error message for display
                const errorMsg = error.message.replace(/\n/g, '<br>');
                this.uiManager.showNotification(errorMsg, 'error', 5000);
                
                // Also log to console for debugging
                console.error('Connection error:', error);
            }
        }
    }

    // Handle apply configuration
    handleApplyConfig() {
        const config = this.uiManager.getSerialConfig();
        this.serialManager.updateConfig(config);
        this.uiManager.showNotification('Configuration updated', 'info');
        
        if (this.serialManager.isConnected) {
            this.uiManager.showNotification('Please reconnect for changes to take effect', 'warning');
        }
    }

    // Handle save profile
    handleSaveProfile() {
        const config = this.uiManager.getSerialConfig();
        const profileName = prompt('Enter profile name:');
        
        if (profileName) {
            const profiles = JSON.parse(localStorage.getItem('esp32-monitor-profiles') || '{}');
            profiles[profileName] = config;
            localStorage.setItem('esp32-monitor-profiles', JSON.stringify(profiles));
            this.uiManager.showNotification(`Profile "${profileName}" saved`, 'success');
        }
    }

    // Handle send command
    async handleSendCommand() {
        if (!this.serialManager.isConnected) {
            this.uiManager.showNotification('Not connected to a device', 'warning');
            return;
        }

        const command = this.uiManager.getCommand();
        if (!command.trim()) {
            return;
        }

        try {
            const lineEnding = this.uiManager.getLineEnding();
            await this.serialManager.write(command);
            
            // Add to UI
            this.uiManager.appendMessage(command, 'sent');
            
            // Add to history
            this.uiManager.addToHistory(command);
            
            // Clear input
            this.uiManager.clearCommandInput();
        } catch (error) {
            this.uiManager.showNotification(`Failed to send: ${error.message}`, 'error');
        }
    }

    // Execute shortcut command
    async executeShortcutCommand(command) {
        if (!this.serialManager.isConnected) {
            this.uiManager.showNotification('Not connected to a device', 'warning');
            return;
        }

        try {
            const lineEnding = this.uiManager.getLineEnding();
            await this.serialManager.write(command);
            
            // Add to UI
            this.uiManager.appendMessage(command, 'sent');
            
            // Add to history
            this.uiManager.addToHistory(command);
            
            this.uiManager.showNotification(`Sent: ${command}`, 'info', 1500);
        } catch (error) {
            this.uiManager.showNotification(`Failed to send: ${error.message}`, 'error');
        }
    }

    // Start statistics updater
    startStatsUpdater() {
        this.statsInterval = setInterval(() => {
            const stats = this.serialManager.getStats();
            this.uiManager.updateStats(stats);
        }, 1000);
    }

    // Stop statistics updater
    stopStatsUpdater() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
    }

    // Show browser compatibility error
    showBrowserError() {
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; flex-direction: column; font-family: sans-serif; padding: 20px; text-align: center;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 8v4m0 4h.01"/>
                </svg>
                <h1 style="margin-top: 20px; color: #2c3e50;">Web Serial API Not Supported</h1>
                <p style="color: #5a6c7d; max-width: 500px; margin-top: 10px;">
                    This application requires the Web Serial API, which is only available in Chrome and Edge browsers.
                </p>
                <p style="color: #5a6c7d; max-width: 500px; margin-top: 10px;">
                    Please use <strong>Google Chrome</strong> (version 89+) or <strong>Microsoft Edge</strong> (version 89+).
                </p>
                <a href="https://www.google.com/chrome/" style="margin-top: 20px; padding: 10px 20px; background: #3498db; color: white; text-decoration: none; border-radius: 8px;">
                    Download Chrome
                </a>
            </div>
        `;
    }
}

// Initialize application when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new App();
    });
} else {
    new App();
}

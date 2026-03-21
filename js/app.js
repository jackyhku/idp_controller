class App {
    constructor() {
        this.serialManager = new SerialManager();
        this.holdInterval = null;
        this.activeButton = null;
        this.lastA0Value = null;

        this.elements = {
            selectPortBtn: document.getElementById('selectPortBtn'),
            connectBtn: document.getElementById('connectBtn'),
            connectionStatus: document.getElementById('connectionStatus'),
            controlButtons: document.querySelectorAll('.control-btn'),
            holdButtons: document.querySelectorAll('.hold-btn'),
            actionButtons: document.querySelectorAll('.action-btn'),
            a0Value: document.getElementById('a0Value'),
            lastLine: document.getElementById('lastLine')
        };

        this.setupSerialHandlers();
        this.setupUiHandlers();
    }

    setupSerialHandlers() {
        this.serialManager.onConnectionChange = (connected) => {
            this.updateConnectionState(connected);
        };

        this.serialManager.onDataReceived = (text) => {
            this.handleIncomingSerial(text);
        };

        this.serialManager.onError = (error) => {
            this.elements.lastLine.textContent = `Serial error: ${error.message}`;
        };
    }

    setupUiHandlers() {
        this.elements.selectPortBtn.addEventListener('click', async () => {
            try {
                await this.serialManager.requestPort();
                this.elements.connectBtn.disabled = false;
                this.elements.lastLine.textContent = 'Port selected. Ready to connect.';
            } catch (error) {
                if (error.message !== 'No port selected') {
                    this.elements.lastLine.textContent = error.message;
                }
            }
        });

        this.elements.connectBtn.addEventListener('click', async () => {
            if (this.serialManager.isConnected) {
                await this.serialManager.disconnect();
                return;
            }

            try {
                this.elements.connectionStatus.textContent = 'Connecting...';
                await this.serialManager.connect();
            } catch (error) {
                this.elements.connectionStatus.textContent = 'Disconnected';
                this.elements.connectionStatus.className = 'status disconnected';
                this.elements.lastLine.textContent = `Connect failed: ${error.message}`;
            }
        });

        this.elements.controlButtons.forEach((button) => {
            button.addEventListener('pointerdown', (event) => {
                this.startHoldCommand(button, event);
            });

            button.addEventListener('pointerup', () => this.stopHoldCommand());
            button.addEventListener('pointerleave', () => this.stopHoldCommand());
            button.addEventListener('pointercancel', () => this.stopHoldCommand());
        });

        this.elements.holdButtons.forEach((button) => {
            button.addEventListener('pointerdown', (event) => {
                this.startHoldCommand(button, event);
            });

            button.addEventListener('pointerup', () => this.stopHoldCommand());
            button.addEventListener('pointerleave', () => this.stopHoldCommand());
            button.addEventListener('pointercancel', () => this.stopHoldCommand());
        });

        this.elements.actionButtons.forEach((button) => {
            button.addEventListener('click', () => {
                if (button.classList.contains('hold-btn')) {
                    return;
                }
                const command = button.dataset.command;
                if (command) {
                    this.sendCommand(command);
                }
            });
        });

        document.addEventListener('pointerup', () => this.stopHoldCommand());
    }

    updateConnectionState(connected) {
        if (connected) {
            this.elements.connectionStatus.textContent = 'Connected';
            this.elements.connectionStatus.className = 'status connected';
            this.elements.connectBtn.textContent = 'Disconnect';
            return;
        }

        this.elements.connectionStatus.textContent = 'Disconnected';
        this.elements.connectionStatus.className = 'status disconnected';
        this.elements.connectBtn.textContent = 'Connect';
        this.stopHoldCommand();
    }

    startHoldCommand(button, event) {
        event.preventDefault();

        if (!this.serialManager.isConnected) {
            this.elements.lastLine.textContent = 'Please connect first.';
            return;
        }

        const command = button.dataset.command;
        if (!command) return;

        this.stopHoldCommand(false);
        this.activeButton = button;
        button.classList.add('active');

        this.sendCommand(command);
        this.holdInterval = setInterval(() => {
            this.sendCommand(command);
        }, 500);
    }

    stopHoldCommand(sendStopCommand = true) {
        const wasHolding = Boolean(this.holdInterval || this.activeButton);

        if (this.holdInterval) {
            clearInterval(this.holdInterval);
            this.holdInterval = null;
        }

        if (this.activeButton) {
            this.activeButton.classList.remove('active');
            this.activeButton = null;
        }

        if (sendStopCommand && wasHolding && this.serialManager.isConnected) {
            this.sendCommand('Z');
        }
    }

    async sendCommand(command) {
        if (!this.serialManager.isConnected) {
            this.elements.lastLine.textContent = 'Please connect first.';
            return;
        }

        try {
            await this.serialManager.write(command, '');
        } catch (error) {
            this.stopHoldCommand();
            this.elements.lastLine.textContent = `Send failed: ${error.message}`;
        }
    }

    handleIncomingSerial(text) {
        if (!text) return;

        const cleanText = text.replace(/\r/g, ' ').replace(/\n/g, ' ').trim();
        const isNumericOnly = /^-?\d+(\s+-?\d+)*$/.test(cleanText);

        if (cleanText && !isNumericOnly) {
            this.elements.lastLine.textContent = cleanText;
        }

        const a0Pattern = /A0\s*[:=]?\s*(-?\d+)/i;
        const a0Match = cleanText.match(a0Pattern);

        if (a0Match) {
            const nextValue = a0Match[1];
            if (this.lastA0Value !== nextValue) {
                this.elements.a0Value.textContent = nextValue;
                this.lastA0Value = nextValue;
            }
            return;
        }

        const plainNumberMatch = cleanText.match(/-?\d+/);
        if (plainNumberMatch) {
            const nextValue = plainNumberMatch[0];
            if (this.lastA0Value !== nextValue) {
                this.elements.a0Value.textContent = nextValue;
                this.lastA0Value = nextValue;
            }
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App());
} else {
    new App();
}

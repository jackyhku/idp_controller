class App {
    constructor() {
        this.serialManager = new SerialManager();
        this.bluetoothManager = new BluetoothManager();
        this.activeMode = this.loadConnectionMode(); // 'serial' or 'bluetooth'
        this.holdInterval = null;
        this.activeButton = null;
        this.lastA0Value = null;
        this.customButtonsKey = 'idp-custom-buttons-v1';
        this.modeKey = 'idp-connection-mode';
        this.customButtonStates = new Map();
        this.customButtonsConfig = this.getDefaultCustomButtons();

        this.elements = {
            selectPortBtn: document.getElementById('selectPortBtn'),
            connectBtn: document.getElementById('connectBtn'),
            connectionStatus: document.getElementById('connectionStatus'),
            serialModeBtn: document.getElementById('serialModeBtn'),
            bleModeBtn: document.getElementById('bleModeBtn'),
            controlButtons: document.querySelectorAll('.control-btn'),
            holdButtons: document.querySelectorAll('.hold-btn'),
            actionButtons: document.querySelectorAll('.action-btn'),
            a0Value: document.getElementById('a0Value'),
            lastLine: document.getElementById('lastLine'),
            customButtons: document.querySelectorAll('.custom-btn'),
            customSettingsBtn: document.getElementById('customSettingsBtn'),
            customSettingsModal: document.getElementById('customSettingsModal'),
            closeCustomSettingsBtn: document.getElementById('closeCustomSettingsBtn'),
            saveCustomSettingsBtn: document.getElementById('saveCustomSettingsBtn'),
            resetCustomSettingsBtn: document.getElementById('resetCustomSettingsBtn'),
            customSettingsList: document.getElementById('customSettingsList')
        };

        this.loadCustomButtonsConfig();
        this.renderCustomButtons();
        this.setupSerialHandlers();
        this.setupBluetoothHandlers();
        this.updateModeUI();
        this.setupUiHandlers();
    }

    // Connection mode (Serial vs Bluetooth BLE)
    getActiveManager() {
        return this.activeMode === 'bluetooth' ? this.bluetoothManager : this.serialManager;
    }

    loadConnectionMode() {
        return localStorage.getItem(this.modeKey) === 'bluetooth' ? 'bluetooth' : 'serial';
    }

    saveConnectionMode() {
        localStorage.setItem(this.modeKey, this.activeMode);
    }

    async setActiveMode(mode) {
        if ((mode !== 'serial' && mode !== 'bluetooth') || this.activeMode === mode) return;

        const currentManager = this.getActiveManager();
        if (currentManager.isConnected) {
            await currentManager.disconnect();
        }

        this.activeMode = mode;
        this.saveConnectionMode();
        this.updateModeUI();

        this.elements.connectBtn.disabled = true;
        this.elements.lastLine.textContent = mode === 'bluetooth'
            ? 'Bluetooth (BLE 4.0) mode. Select your BLE device to continue.'
            : 'Serial mode. Select a serial port to continue.';
    }

    updateModeUI() {
        const isBle = this.activeMode === 'bluetooth';
        this.elements.serialModeBtn.classList.toggle('active', !isBle);
        this.elements.bleModeBtn.classList.toggle('active', isBle);
        this.elements.selectPortBtn.textContent = isBle ? 'Select BLE Device' : 'Serial Port';

        const manager = this.getActiveManager();
        if (manager.isConnected) {
            this.updateConnectionState(true, manager);
        }
    }

    getDefaultCustomButtons() {
        return [
            { label: 'Button 1', command: 'N', commandAddNewline: true, releaseCommand: '', releaseCommandAddNewline: true, repeatEnabled: false, repeatIntervalMs: 500 },
            { label: 'Button 2', command: 'O', commandAddNewline: true, releaseCommand: '', releaseCommandAddNewline: true, repeatEnabled: false, repeatIntervalMs: 500 },
            { label: 'Button 3', command: 'P', commandAddNewline: true, releaseCommand: '', releaseCommandAddNewline: true, repeatEnabled: false, repeatIntervalMs: 500 },
            { label: 'Button 4', command: 'Q', commandAddNewline: true, releaseCommand: '', releaseCommandAddNewline: true, repeatEnabled: false, repeatIntervalMs: 500 }
        ];
    }

    loadCustomButtonsConfig() {
        const raw = localStorage.getItem(this.customButtonsKey);
        if (!raw) return;

        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length === 4) {
                this.customButtonsConfig = parsed.map((item, index) => ({
                    label: (item.label || `Button ${index + 1}`).toString(),
                    command: (item.command || '').toString(),
                    commandAddNewline: item.commandAddNewline !== false,
                    releaseCommand: (item.releaseCommand || '').toString(),
                    releaseCommandAddNewline: item.releaseCommandAddNewline !== false,
                    repeatEnabled: Boolean(item.repeatEnabled),
                    repeatIntervalMs: Number(item.repeatIntervalMs) > 0 ? Number(item.repeatIntervalMs) : 500
                }));
            }
        } catch (error) {
            this.elements.lastLine.textContent = 'Failed to load custom button settings. Using defaults.';
        }
    }

    saveCustomButtonsConfig() {
        localStorage.setItem(this.customButtonsKey, JSON.stringify(this.customButtonsConfig));
    }

    setupSerialHandlers() {
        this.serialManager.onConnectionChange = (connected) => {
            this.updateConnectionState(connected, this.serialManager);
        };

        this.serialManager.onDataReceived = (text) => {
            this.handleIncomingSerial(text);
        };

        this.serialManager.onError = (error) => {
            this.elements.lastLine.textContent = `Serial error: ${error.message}`;
        };
    }

    setupBluetoothHandlers() {
        this.bluetoothManager.onConnectionChange = (connected) => {
            this.updateConnectionState(connected, this.bluetoothManager);
        };

        this.bluetoothManager.onDataReceived = (text) => {
            this.handleIncomingSerial(text);
        };

        this.bluetoothManager.onError = (error) => {
            this.elements.lastLine.textContent = `Bluetooth error: ${error.message}`;
        };
    }

    setupUiHandlers() {
        this.elements.serialModeBtn.addEventListener('click', () => this.setActiveMode('serial'));
        this.elements.bleModeBtn.addEventListener('click', () => this.setActiveMode('bluetooth'));

        this.elements.selectPortBtn.addEventListener('click', async () => {
            const manager = this.getActiveManager();
            try {
                if (this.activeMode === 'bluetooth') {
                    if (!manager.isSupported()) {
                        throw new Error('Web Bluetooth is not supported in this browser. Please use Chrome or Edge.');
                    }
                    await manager.requestDevice();
                    const deviceInfo = manager.getDeviceInfo();
                    this.elements.connectBtn.disabled = false;
                    this.elements.lastLine.textContent = `BLE device selected: ${deviceInfo.name}. Ready to connect.`;
                } else {
                    await manager.requestPort();
                    this.elements.connectBtn.disabled = false;
                    this.elements.lastLine.textContent = 'Port selected. Ready to connect.';
                }
            } catch (error) {
                if (error.message !== 'No port selected' && error.message !== 'No device selected') {
                    this.elements.lastLine.textContent = error.message;
                }
            }
        });

        this.elements.connectBtn.addEventListener('click', async () => {
            const manager = this.getActiveManager();

            if (manager.isConnected) {
                await manager.disconnect();
                return;
            }

            try {
                if (this.activeMode === 'bluetooth' && !manager.device) {
                    this.elements.lastLine.textContent = 'Please select a BLE device first.';
                    return;
                }

                this.elements.connectionStatus.textContent = 'Connecting...';
                await manager.connect();
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

        this.elements.customButtons.forEach((button) => {
            const index = Number(button.dataset.customIndex);

            button.addEventListener('pointerdown', (event) => {
                this.startCustomCommand(index, button, event);
            });

            button.addEventListener('pointerup', () => this.stopCustomCommand(index));
            button.addEventListener('pointerleave', () => this.stopCustomCommand(index));
            button.addEventListener('pointercancel', () => this.stopCustomCommand(index));
        });

        this.elements.customSettingsBtn.addEventListener('click', () => this.openCustomSettingsModal());
        this.elements.closeCustomSettingsBtn.addEventListener('click', () => this.closeCustomSettingsModal());
        this.elements.saveCustomSettingsBtn.addEventListener('click', () => this.saveCustomSettingsFromModal());
        this.elements.resetCustomSettingsBtn.addEventListener('click', () => this.resetCustomSettingsToDefault());
        this.elements.customSettingsModal.addEventListener('click', (event) => {
            if (event.target === this.elements.customSettingsModal) {
                this.closeCustomSettingsModal();
            }
        });

        document.addEventListener('pointerup', () => this.stopHoldCommand());
        document.addEventListener('pointerup', () => this.stopAllCustomCommands());
    }

    updateConnectionState(connected, manager = this.getActiveManager()) {
        if (connected) {
            let label = manager === this.bluetoothManager ? 'Bluetooth (BLE)' : 'Serial';
            if (manager === this.bluetoothManager && manager.device) {
                label += `: ${manager.device.name || 'Unknown device'}`;
            }
            this.elements.connectionStatus.textContent = `Connected (${label})`;
            this.elements.connectionStatus.className = 'status connected';
            this.elements.connectBtn.textContent = 'Disconnect';
            return;
        }

        this.elements.connectionStatus.textContent = 'Disconnected';
        this.elements.connectionStatus.className = 'status disconnected';
        this.elements.connectBtn.textContent = 'Connect';
        this.stopHoldCommand();
        this.stopAllCustomCommands();
    }

    startHoldCommand(button, event) {
        event.preventDefault();

        if (!this.getActiveManager().isConnected) {
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

        if (sendStopCommand && wasHolding && this.getActiveManager().isConnected) {
            this.sendCommand('Z');
        }
    }

    async sendCommand(command, addLineEnding = '\n') {
        const manager = this.getActiveManager();
        if (!manager.isConnected) {
            this.elements.lastLine.textContent = 'Please connect first.';
            return;
        }

        try {
            await manager.write(command, addLineEnding);
        } catch (error) {
            this.stopHoldCommand();
            this.elements.lastLine.textContent = `Send failed: ${error.message}`;
        }
    }

    renderCustomButtons() {
        this.elements.customButtons.forEach((button) => {
            const index = Number(button.dataset.customIndex);
            const config = this.customButtonsConfig[index];
            if (!config) return;

            const safeLabel = this.escapeHtml(config.label || `Button ${index + 1}`);
            const safeCommand = this.escapeHtml(config.command || '(not set)');
            button.innerHTML = `
                <span class="custom-label">${safeLabel}</span>
                <span class="custom-command">${safeCommand}</span>
            `;
        });
    }

    openCustomSettingsModal() {
        this.renderCustomSettingsModal();
        this.elements.customSettingsModal.classList.add('active');
        this.elements.customSettingsModal.setAttribute('aria-hidden', 'false');
    }

    closeCustomSettingsModal() {
        this.elements.customSettingsModal.classList.remove('active');
        this.elements.customSettingsModal.setAttribute('aria-hidden', 'true');
    }

    renderCustomSettingsModal() {
        this.elements.customSettingsList.innerHTML = '';

        this.customButtonsConfig.forEach((config, index) => {
            const item = document.createElement('div');
            item.className = 'custom-setting-item';
            item.dataset.index = index;
            item.innerHTML = `
                <div class="custom-setting-row">
                    <label class="field field-full">
                        Label
                        <input type="text" class="custom-input-label" value="${this.escapeAttribute(config.label)}" maxlength="24" placeholder="Button ${index + 1}">
                    </label>
                </div>

                <div class="custom-setting-row two-col">
                    <label class="field">
                        Press command
                        <div class="command-input-row">
                            <input type="text" class="custom-input-command" value="${this.escapeAttribute(config.command)}" maxlength="64">
                            <span class="inline-checkbox">
                                <input type="checkbox" class="custom-input-command-newline" ${config.commandAddNewline ? 'checked' : ''}>
                                Newline
                            </span>
                        </div>
                    </label>

                    <label class="field">
                        Release command
                        <div class="command-input-row">
                            <input type="text" class="custom-input-release-command" value="${this.escapeAttribute(config.releaseCommand || '')}" maxlength="64">
                            <span class="inline-checkbox">
                                <input type="checkbox" class="custom-input-release-newline" ${config.releaseCommandAddNewline ? 'checked' : ''}>
                                Newline
                            </span>
                        </div>
                    </label>
                </div>

                <div class="custom-setting-row compact-controls">
                    <label class="field field-interval">
                        Repeat interval (ms)
                        <input type="number" class="custom-input-interval" min="50" step="50" value="${config.repeatIntervalMs}">
                    </label>

                    <label class="field inline-switch">
                        <input type="checkbox" class="custom-input-repeat" ${config.repeatEnabled ? 'checked' : ''}>
                        Repeat while pressed
                    </label>
                </div>
            `;

            this.elements.customSettingsList.appendChild(item);
        });
    }

    saveCustomSettingsFromModal() {
        const items = this.elements.customSettingsList.querySelectorAll('.custom-setting-item');
        if (!items.length) return;

        this.customButtonsConfig = Array.from(items).map((item, index) => {
            const label = item.querySelector('.custom-input-label').value.trim() || `Button ${index + 1}`;
            const command = item.querySelector('.custom-input-command').value;
            const commandAddNewline = item.querySelector('.custom-input-command-newline').checked;
            const releaseCommand = item.querySelector('.custom-input-release-command').value;
            const releaseCommandAddNewline = item.querySelector('.custom-input-release-newline').checked;
            const repeatEnabled = item.querySelector('.custom-input-repeat').checked;
            const repeatIntervalMs = Math.max(50, Number(item.querySelector('.custom-input-interval').value) || 500);

            return {
                label,
                command,
                commandAddNewline,
                releaseCommand,
                releaseCommandAddNewline,
                repeatEnabled,
                repeatIntervalMs
            };
        });

        this.saveCustomButtonsConfig();
        this.renderCustomButtons();
        this.closeCustomSettingsModal();
        this.elements.lastLine.textContent = 'Custom button settings saved.';
    }

    resetCustomSettingsToDefault() {
        this.customButtonsConfig = this.getDefaultCustomButtons();
        this.saveCustomButtonsConfig();
        this.renderCustomSettingsModal();
        this.renderCustomButtons();
        this.elements.lastLine.textContent = 'Custom buttons reset to default.';
    }

    startCustomCommand(index, button, event) {
        event.preventDefault();

        const config = this.customButtonsConfig[index];
        if (!config) return;

        if (!this.getActiveManager().isConnected) {
            this.elements.lastLine.textContent = 'Please connect first.';
            return;
        }

        if (!config.command) {
            this.elements.lastLine.textContent = `Button ${index + 1} has no press command set.`;
            return;
        }

        this.stopCustomCommand(index);
        button.classList.add('active');
        this.sendCommand(config.command, config.commandAddNewline ? '\n' : '');

        const state = { button, intervalId: null };

        if (config.repeatEnabled) {
            state.intervalId = setInterval(() => {
                this.sendCommand(config.command, config.commandAddNewline ? '\n' : '');
            }, config.repeatIntervalMs);
        }

        this.customButtonStates.set(index, state);
    }

    stopCustomCommand(index) {
        const state = this.customButtonStates.get(index);
        if (!state) return;

        if (state.intervalId) {
            clearInterval(state.intervalId);
        }

        if (state.button) {
            state.button.classList.remove('active');
        }

        this.customButtonStates.delete(index);

        const config = this.customButtonsConfig[index];
        if (config && config.releaseCommand && this.getActiveManager().isConnected) {
            this.sendCommand(config.releaseCommand, config.releaseCommandAddNewline ? '\n' : '');
        }
    }

    stopAllCustomCommands() {
        const activeIndices = Array.from(this.customButtonStates.keys());
        activeIndices.forEach((index) => this.stopCustomCommand(index));
    }

    escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    escapeAttribute(value) {
        return this.escapeHtml(value).replaceAll('`', '&#96;');
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

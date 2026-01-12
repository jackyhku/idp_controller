// UI Manager - Handles all UI interactions and updates
class UIManager {
    constructor() {
        this.elements = {};
        this.commandHistory = [];
        this.historyIndex = -1;
        this.autoScroll = true;
        this.showTimestamps = true;
        this.displayFormat = 'text';
        this.theme = 'light';
        this.messageBuffer = [];

        // Message grouping
        this.lastMessageType = null;
        this.lastMessageTime = 0;
        this.lastMessageBubble = null;
        this.lastMessageSource = null;
        this.messageGroupTimeout = 1000; // 1 second default

        this.initializeElements();
        this.loadPreferences();
        this.attachEventListeners();

        // Stats tracking
        this.stats = { rx: 0, tx: 0, startTime: null };
    }

    // Initialize DOM element references
    initializeElements() {
        this.elements = {
            // Header
            connectionStatus: document.getElementById('connectionStatus'),
            themeBtn: document.getElementById('themeBtn'),
            headerBroadcastControls: document.getElementById('headerBroadcastControls'),
            settingsBtn: document.getElementById('settingsBtn'),
            closeSettingsBtn: document.getElementById('closeSettingsBtn'),
            closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
            settingsModal: document.getElementById('settingsModal'),
            helpBtn: document.getElementById('helpBtn'),

            // Sidebar
            sidebar: document.getElementById('sidebar'),
            sidebarToggle: document.getElementById('sidebarToggle'),
            selectPortBtn: document.getElementById('selectPortBtn'),
            connectBtn: document.getElementById('connectBtn'),
            portInfo: document.getElementById('portInfo'),

            // Configuration
            baudRate: document.getElementById('baudRate'),
            customBaudRate: document.getElementById('customBaudRate'),
            dataBits: document.getElementsByName('dataBits'),
            stopBits: document.getElementsByName('stopBits'),
            parity: document.getElementById('parity'),
            flowControl: document.getElementById('flowControl'),
            lineEnding: document.getElementById('lineEnding'),
            applyConfigBtn: document.getElementById('applyConfigBtn'),
            saveProfileBtn: document.getElementById('saveProfileBtn'),
            loadProfileSelect: document.getElementById('loadProfileSelect'),
            deleteProfileBtn: document.getElementById('deleteProfileBtn'),
            broadcastBtn: document.getElementById('broadcastBtn'),

            // Display Options
            timestampsBtn: document.getElementById('timestampsBtn'),
            autoScrollBtn: document.getElementById('autoScrollBtn'),
            displayFormat: document.getElementById('displayFormat'),

            // Statistics
            rxBytes: document.getElementById('rxBytes'),
            txBytes: document.getElementById('txBytes'),
            uptime: document.getElementById('uptime'),

            // Actions
            manageShortcutsBtn: document.getElementById('manageShortcutsBtn'),
            saveLogBtn: document.getElementById('saveLogBtn'),
            clearChatBtn: document.getElementById('clearChatBtn'),

            // Chat
            chatMessages: document.getElementById('chatMessages'),
            commandInput: document.getElementById('commandInput'),
            sendBtn: document.getElementById('sendBtn'),
            charCount: document.getElementById('charCount'),

            // Shortcut Bar
            shortcutBar: document.getElementById('shortcutBar'),

            // Notifications
            notifications: document.getElementById('notifications')
        };
    }

    // Attach event listeners
    attachEventListeners() {
        // Theme toggle
        this.elements.themeBtn.addEventListener('click', () => this.toggleTheme());

        // Settings toggle
        this.elements.settingsBtn.addEventListener('click', () => this.toggleSettings());
        this.elements.closeSettingsBtn.addEventListener('click', () => this.toggleSettings());
        this.elements.closeSettingsModalBtn.addEventListener('click', () => this.toggleSettings());
        this.elements.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) this.toggleSettings();
        });

        // Sidebar toggle
        this.elements.sidebarToggle.addEventListener('click', () => this.toggleSidebar());

        // Baud rate change
        this.elements.baudRate.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                this.elements.customBaudRate.style.display = 'block';
                this.elements.customBaudRate.focus();
            } else {
                this.elements.customBaudRate.style.display = 'none';
            }
        });

        // Display options
        // Display options
        this.elements.timestampsBtn.addEventListener('click', () => {
            this.showTimestamps = !this.showTimestamps;
            this.toggleButtonState(this.elements.timestampsBtn, this.showTimestamps);
            this.savePreferences();
        });

        this.elements.autoScrollBtn.addEventListener('click', () => {
            this.autoScroll = !this.autoScroll;
            this.toggleButtonState(this.elements.autoScrollBtn, this.autoScroll);
            this.savePreferences();
        });

        this.elements.displayFormat.addEventListener('change', (e) => {
            this.displayFormat = e.target.value;
            this.savePreferences();
        });

        // Profile management
        this.elements.loadProfileSelect.addEventListener('change', (e) => {
            if (e.target.value) {
                this.loadProfile(e.target.value);
            }
        });

        this.elements.deleteProfileBtn.addEventListener('click', () => {
            this.deleteProfile();
        });

        // Clear chat
        this.elements.clearChatBtn.addEventListener('click', () => this.clearChat());

        // Command input
        this.elements.commandInput.addEventListener('input', (e) => {
            this.updateCharCount();
            this.autoResizeTextarea(e.target);
        });

        this.elements.commandInput.addEventListener('keydown', (e) => {
            this.handleCommandInputKeydown(e);
        });

        // Help button
        this.elements.helpBtn.addEventListener('click', () => this.showHelp());
    }

    // Update connection status
    updateConnectionStatus(status, message = '') {
        const statusElement = this.elements.connectionStatus;
        const statusText = statusElement.querySelector('.status-text');

        // Remove all status classes
        statusElement.classList.remove('disconnected', 'connecting', 'connected', 'error');

        // Add appropriate class
        statusElement.classList.add(status);

        // Update text
        const statusMessages = {
            'disconnected': 'Disconnected',
            'connecting': 'Connecting...',
            'connected': 'Connected',
            'error': 'Error'
        };

        statusText.textContent = message || statusMessages[status] || status;
    }

    // Update server connection status
    updateServerStatus(status, message = '') {
        const statusElement = document.getElementById('serverStatus');
        if (!statusElement) return;

        const statusText = statusElement.querySelector('.status-text');

        // Remove all status classes
        statusElement.classList.remove('disconnected', 'connecting', 'connected', 'error');

        // Add appropriate class
        statusElement.classList.add(status);

        // Update text
        const statusMessages = {
            'disconnected': 'Server: Disconnected',
            'connecting': 'Server: Connecting...',
            'connected': 'Server: Connected',
            'error': 'Server: Error'
        };

        statusText.textContent = message || statusMessages[status] || `Server: ${status}`;
    }

    // Update UI based on connection mode
    updateModeUI(mode) {
        const modeTitle = document.getElementById('modeTitle');
        const selectBtnText = document.getElementById('selectBtnText');
        const selectPortBtn = document.getElementById('selectPortBtn');
        const remoteConfigSection = document.getElementById('remoteConfigSection');
        const headerBroadcastControls = document.getElementById('headerBroadcastControls');

        // Update Segmented Control State
        const btns = document.querySelectorAll('.segmented-btn');
        btns.forEach(btn => {
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        if (mode === 'serial') {
            modeTitle.textContent = 'Serial / SPP 2.0';
            selectPortBtn.style.display = 'flex';
            selectBtnText.textContent = 'Select Port';
            // if (serialConfigSection) serialConfigSection.style.display = 'block'; // Moved to Settings Modal
            if (remoteConfigSection) remoteConfigSection.style.display = 'none';
            if (headerBroadcastControls) headerBroadcastControls.style.display = 'flex';
            // if (broadcastSection) broadcastSection.style.display = 'block'; // Moved to Header
            const formatSelector = document.getElementById('formatSelectorContainer');
            if (formatSelector) formatSelector.style.display = 'block';
            this.enableConnectButton(false); // disable until port selected
        } else if (mode === 'bluetooth') {
            modeTitle.textContent = 'Bluetooth (BLE 4.0)';
            selectPortBtn.style.display = 'flex';
            selectBtnText.textContent = 'Scan Device';
            // if (serialConfigSection) serialConfigSection.style.display = 'none';
            if (remoteConfigSection) remoteConfigSection.style.display = 'none';
            if (headerBroadcastControls) headerBroadcastControls.style.display = 'flex';
            // if (broadcastSection) broadcastSection.style.display = 'block'; // Moved to Header
            this.enableConnectButton(false); // disable until device selected
        } else {
            modeTitle.textContent = 'Remote Monitor';
            selectPortBtn.style.display = 'none'; // No "Select Port" needed
            // if (serialConfigSection) serialConfigSection.style.display = 'none';
            if (remoteConfigSection) remoteConfigSection.style.display = 'block';
            if (headerBroadcastControls) headerBroadcastControls.style.display = 'none';
            // if (broadcastSection) broadcastSection.style.display = 'none'; // Moved to Header
            // Hide format selector in remote mode
            const formatSelector = document.getElementById('formatSelectorContainer');
            if (formatSelector) formatSelector.style.display = 'none';

            // Enable connect button if socket is ready (handled by logic)
            this.enableConnectButton(true);
            this.elements.connectBtn.querySelector('span')
                ? this.elements.connectBtn.querySelector('span').textContent = 'Connect' // Fallback
                : this.elements.connectBtn.innerHTML = this.getConnectBtnHTML('Connect');
        }

        // Reset port/device info
        this.elements.portInfo.style.display = 'none';

        // Don't reset connection state immediately, let App handle logic
    }

    getConnectBtnHTML(text) {
        return `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
            ${text}
        `;
    }

    // Update port/device information display
    updatePortInfo(info) {
        if (info) {
            this.elements.portInfo.style.display = 'block';
            this.elements.portInfo.innerHTML = `
                <strong>Port Info:</strong><br>
                Vendor ID: ${info.usbVendorId}<br>
                Product ID: ${info.usbProductId}
            `;
        } else {
            this.elements.portInfo.style.display = 'none';
        }
    }

    // Update session ID display
    updateSessionId(id) {
        const el = document.getElementById('mySessionId');
        const container = document.getElementById('sessionInfo');
        if (el && id) {
            el.textContent = id;
            container.style.display = 'block';
        }
    }
    // Update Bluetooth device information
    updateDeviceInfo(info) {
        if (info) {
            this.elements.portInfo.style.display = 'block';
            this.elements.portInfo.innerHTML = `
                <strong>Device Info:</strong><br>
                Name: ${info.name}<br>
                ID: ${info.id.substring(0, 8)}...
            `;
        } else {
            this.elements.portInfo.style.display = 'none';
        }
    }

    // Update connect button state
    updateConnectButton(connected) {
        const btn = this.elements.connectBtn;
        if (connected) {
            btn.textContent = 'Disconnect';
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-danger');
            this.elements.commandInput.disabled = false;
            this.elements.sendBtn.disabled = false;
        } else {
            btn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                </svg>
                Connect
            `;
            btn.classList.remove('btn-danger');
            btn.classList.add('btn-primary');
            this.elements.commandInput.disabled = true;
            this.elements.sendBtn.disabled = true;
        }
    }

    // Enable connect button
    enableConnectButton() {
        this.elements.connectBtn.disabled = false;
    }

    // Append message to chat
    appendMessage(content, type = 'received', rawBytes = null, source = null) {
        const now = Date.now();
        const timeSinceLastMessage = now - this.lastMessageTime;

        // Check if we should group this message with the previous one
        // Check if we should group this message with the previous one
        let canGroup = (
            type === this.lastMessageType &&
            type !== 'system' &&
            timeSinceLastMessage < this.messageGroupTimeout &&
            this.lastMessageBubble !== null
        );

        // For broadcast messages, only group if source matches
        if (canGroup && type === 'broadcast') {
            if (this.lastMessageSource !== source) {
                canGroup = false;
            }
        }

        const shouldGroup = canGroup;

        if (shouldGroup) {
            // Append to existing message bubble
            const contentDiv = this.lastMessageBubble.querySelector('.message-content');

            // Format content based on display format
            let formattedContent = content;
            if (this.displayFormat === 'hex' && rawBytes) {
                formattedContent = this.formatAsHex(rawBytes);
            } else if (this.displayFormat === 'mixed') {
                formattedContent = this.formatAsMixed(content);
            }

            // Append without line break - just concatenate
            contentDiv.textContent += formattedContent;

            // Update timestamp if enabled
            if (this.showTimestamps) {
                const timestampSpan = this.lastMessageBubble.querySelector('.message-timestamp');
                if (timestampSpan) {
                    timestampSpan.textContent = this.getTimestamp();
                }
            }
        } else {
            // Create new message bubble
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${type}`;

            // Add Source Label for broadcasts
            if (type === 'broadcast' && source) {
                const sourceLabel = document.createElement('div');
                sourceLabel.className = 'message-source';
                sourceLabel.innerHTML = `From: <strong>${source}</strong>`;
                sourceLabel.style.fontSize = '11px';
                sourceLabel.style.marginBottom = '2px';
                sourceLabel.style.opacity = '0.7';
                messageDiv.appendChild(sourceLabel);
            }

            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = 'message-bubble';

            // Highlight broadcast bubbles
            if (type === 'broadcast') {
                bubbleDiv.style.backgroundColor = 'var(--bg-tertiary)';
                bubbleDiv.style.color = 'var(--text-primary)';
                bubbleDiv.style.border = '1px solid var(--border-color)';
            }

            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';

            // Format content based on display format
            let formattedContent = content;
            if (this.displayFormat === 'hex' && rawBytes) {
                formattedContent = this.formatAsHex(rawBytes);
            } else if (this.displayFormat === 'mixed') {
                formattedContent = this.formatAsMixed(content);
            }

            contentDiv.textContent = formattedContent;
            bubbleDiv.appendChild(contentDiv);

            // Add timestamp if enabled
            if (this.showTimestamps && type !== 'system') {
                const timestamp = document.createElement('span');
                timestamp.className = 'message-timestamp';
                timestamp.textContent = this.getTimestamp();
                bubbleDiv.appendChild(timestamp);
            }

            messageDiv.appendChild(bubbleDiv);
            this.elements.chatMessages.appendChild(messageDiv);

            // Store reference to this bubble for potential grouping
            this.lastMessageBubble = bubbleDiv;
        }

        // Update tracking variables
        this.lastMessageType = type;
        this.lastMessageSource = source; // Track source for grouping broadcasts
        this.lastMessageTime = now;

        // Auto-scroll if enabled
        if (this.autoScroll) {
            this.scrollToBottom();
        }
    }

    // Append system message
    appendSystemMessage(message, icon = true) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'system-message';

        if (icon) {
            messageDiv.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4m0-4h.01"/>
                </svg>
            `;
        }

        const p = document.createElement('p');
        p.textContent = message;
        messageDiv.appendChild(p);

        this.elements.chatMessages.appendChild(messageDiv);

        // Reset grouping on system message
        this.lastMessageType = null;
        this.lastMessageTime = 0;
        this.lastMessageBubble = null;

        if (this.autoScroll) {
            this.scrollToBottom();
        }
    }

    // Clear chat messages
    clearChat() {
        this.elements.chatMessages.innerHTML = '';
        this.lastMessageType = null;
        this.lastMessageTime = 0;
        this.lastMessageBubble = null;
        this.appendSystemMessage('Chat cleared');
        this.showNotification('Chat cleared', 'info');
    }

    // Get current timestamp
    getTimestamp() {
        const now = new Date();
        return now.toLocaleTimeString('en-US', { hour12: false });
    }

    // Format bytes as hex
    formatAsHex(bytes) {
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, '0').toUpperCase())
            .join(' ');
    }

    // Format as mixed (text with special chars as hex)
    formatAsMixed(text) {
        return text.split('').map(char => {
            const code = char.charCodeAt(0);
            if (code < 32 || code > 126) {
                return `\\x${code.toString(16).padStart(2, '0').toUpperCase()}`;
            }
            return char;
        }).join('');
    }

    // Handle command input keydown
    handleCommandInputKeydown(e) {
        // Enter to send (Shift+Enter for new line)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const sendEvent = new CustomEvent('sendCommand');
            document.dispatchEvent(sendEvent);
            return;
        }

        // Up arrow - previous command
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.navigateHistory('up');
            return;
        }

        // Down arrow - next command
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.navigateHistory('down');
            return;
        }
    }

    // Navigate command history
    navigateHistory(direction) {
        if (this.commandHistory.length === 0) return;

        if (direction === 'up') {
            if (this.historyIndex < this.commandHistory.length - 1) {
                this.historyIndex++;
            }
        } else {
            if (this.historyIndex > -1) {
                this.historyIndex--;
            }
        }

        if (this.historyIndex >= 0) {
            this.elements.commandInput.value = this.commandHistory[this.historyIndex];
        } else {
            this.elements.commandInput.value = '';
        }

        this.updateCharCount();
    }

    // Add command to history
    addToHistory(command) {
        if (command.trim() === '') return;

        // Remove duplicate if exists
        const index = this.commandHistory.indexOf(command);
        if (index > -1) {
            this.commandHistory.splice(index, 1);
        }

        // Add to beginning
        this.commandHistory.unshift(command);

        // Limit history size
        if (this.commandHistory.length > 50) {
            this.commandHistory.pop();
        }

        // Reset index
        this.historyIndex = -1;

        // Save to localStorage
        this.saveCommandHistory();
    }

    // Get command from input
    getCommand() {
        return this.elements.commandInput.value;
    }

    // Clear command input
    clearCommandInput() {
        this.elements.commandInput.value = '';
        this.updateCharCount();
        this.autoResizeTextarea(this.elements.commandInput);
    }

    // Update character count
    updateCharCount() {
        const count = this.elements.commandInput.value.length;
        this.elements.charCount.textContent = `${count} char${count !== 1 ? 's' : ''}`;
    }

    // Auto-resize textarea
    autoResizeTextarea(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
    }

    // Scroll chat to bottom
    scrollToBottom() {
        const container = this.elements.chatMessages.parentElement;
        container.scrollTop = container.scrollHeight;
    }

    // Toggle theme
    toggleTheme() {
        this.theme = this.theme === 'light' ? 'dark' : 'light';
        document.body.classList.toggle('dark-theme');
        this.savePreferences();
        this.showNotification(`${this.theme === 'dark' ? 'Dark' : 'Light'} theme activated`, 'info');
    }

    // Toggle Settings Modal
    toggleSettings() {
        const modal = this.elements.settingsModal;
        if (modal.style.display === 'flex') {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        } else {
            modal.style.display = 'flex';
            // document.body.style.overflow = 'hidden'; // Keep body scrolling if needed, or lock it

            // Populate profile list when opening
            this.updateProfileList(this.elements.loadProfileSelect);
        }
    }


    // Toggle sidebar
    toggleSidebar() {
        this.elements.sidebar.classList.toggle('collapsed');
    }

    // Reset statistics
    resetStats() {
        this.stats = { rx: 0, tx: 0, startTime: Date.now() };
        this.updateStatsDisplay();
    }

    // Add to RX stats
    addToRxStats(bytes) {
        this.stats.rx += bytes;
        this.updateStatsDisplay();
    }

    // Add to TX stats
    addToTxStats(bytes) {
        this.stats.tx += bytes;
        this.updateStatsDisplay();
    }

    // Update statistics (can sync with external source)
    updateStats(info) {
        if (info) {
            this.stats.rx = info.bytesReceived;
            this.stats.tx = info.bytesSent;
        }
        this.updateStatsDisplay();
    }

    // Update statistics display
    updateStatsDisplay() {
        if (typeof SerialManager !== 'undefined') {
            this.elements.rxBytes.textContent = SerialManager.formatBytes(this.stats.rx);
            this.elements.txBytes.textContent = SerialManager.formatBytes(this.stats.tx);

            // For uptime, we use the local startTime
            if (this.stats.startTime) {
                const uptime = Date.now() - this.stats.startTime;
                this.elements.uptime.textContent = SerialManager.formatUptime(uptime);
            }
        }
    }

    // Show notification
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        this.elements.notifications.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    // Show help dialog
    showHelp() {
        this.appendSystemMessage('Web Serial Monitor for ESP32');
        this.appendSystemMessage('Select a port and connect to start communication');
        this.appendSystemMessage('Press Enter to send commands, Shift+Enter for new line');
        this.appendSystemMessage('Use arrow keys to navigate command history');
    }

    // Get serial configuration from UI
    getSerialConfig() {
        let baudRate = parseInt(this.elements.baudRate.value);
        if (this.elements.baudRate.value === 'custom') {
            baudRate = parseInt(this.elements.customBaudRate.value) || 115200;
        }

        let dataBits = 8;
        for (const radio of this.elements.dataBits) {
            if (radio.checked) {
                dataBits = parseInt(radio.value);
                break;
            }
        }

        let stopBits = 1;
        for (const radio of this.elements.stopBits) {
            if (radio.checked) {
                stopBits = parseInt(radio.value);
                break;
            }
        }

        return {
            baudRate: baudRate,
            dataBits: dataBits,
            stopBits: stopBits,
            parity: this.elements.parity.value,
            flowControl: this.elements.flowControl.value
        };
    }

    // Get line ending setting
    getLineEnding() {
        return this.elements.lineEnding.value;
    }

    // Save log to file
    saveLog() {
        const messages = Array.from(this.elements.chatMessages.children)
            .map(msg => msg.textContent)
            .join('\n');

        const blob = new Blob([messages], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `esp32-log-${new Date().toISOString().replace(/:/g, '-')}.txt`;
        a.click();
        URL.revokeObjectURL(url);

        this.showNotification('Log saved successfully', 'success');
    }

    // Save preferences to localStorage
    savePreferences() {
        const preferences = {
            theme: this.theme,
            showTimestamps: this.showTimestamps,
            autoScroll: this.autoScroll,
            displayFormat: this.displayFormat
        };
        localStorage.setItem('esp32-monitor-preferences', JSON.stringify(preferences));
    }

    // Load preferences from localStorage
    loadPreferences() {
        const saved = localStorage.getItem('esp32-monitor-preferences');
        if (saved) {
            const preferences = JSON.parse(saved);
            this.theme = preferences.theme || 'light';
            this.showTimestamps = preferences.showTimestamps !== false;
            this.autoScroll = preferences.autoScroll !== false;
            this.displayFormat = preferences.displayFormat || 'text';

            // Apply theme
            if (this.theme === 'dark') {
                document.body.classList.add('dark-theme');
            }

            // Update UI
            this.toggleButtonState(this.elements.timestampsBtn, this.showTimestamps);
            this.toggleButtonState(this.elements.autoScrollBtn, this.autoScroll);
            this.elements.displayFormat.value = this.displayFormat;
        }
    }

    // Helper to toggle button state
    toggleButtonState(button, isActive) {
        if (isActive) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    }

    setBroadcastEnabled(enabled) {
        this.toggleButtonState(this.elements.broadcastBtn, enabled);
    }


    // Load profile
    loadProfile(profileName) {
        const profiles = JSON.parse(localStorage.getItem('esp32-monitor-profiles') || '{}');
        const profile = profiles[profileName];

        if (!profile) {
            this.showNotification('Profile not found', 'error');
            return;
        }

        // Apply profile settings
        this.elements.baudRate.value = profile.baudRate;
        this.elements.customBaudRate.style.display = 'none';

        // Set data bits
        for (const radio of this.elements.dataBits) {
            radio.checked = parseInt(radio.value) === profile.dataBits;
        }

        // Set stop bits
        for (const radio of this.elements.stopBits) {
            radio.checked = parseInt(radio.value) === profile.stopBits;
        }

        this.elements.parity.value = profile.parity || 'none';
        this.elements.flowControl.value = profile.flowControl || 'none';

        this.showNotification(`Loaded profile: ${profileName}`, 'success');
    }

    // Delete profile
    deleteProfile() {
        const profileName = this.elements.loadProfileSelect.value;

        if (!profileName) {
            this.showNotification('Please select a profile to delete', 'warning');
            return;
        }

        if (!confirm(`Delete profile "${profileName}"?`)) {
            return;
        }

        const profiles = JSON.parse(localStorage.getItem('esp32-monitor-profiles') || '{}');
        delete profiles[profileName];
        localStorage.setItem('esp32-monitor-profiles', JSON.stringify(profiles));

        this.elements.loadProfileSelect.value = '';
        this.updateProfileList();
        this.showNotification(`Profile "${profileName}" deleted`, 'success');
    }

    // Update profile list dropdown
    updateProfileList() {
        const profiles = JSON.parse(localStorage.getItem('esp32-monitor-profiles') || '{}');
        const select = this.elements.loadProfileSelect;

        // Clear existing options (except default)
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Add profile options
        Object.keys(profiles).forEach(profileName => {
            const option = document.createElement('option');
            option.value = profileName;
            option.textContent = profileName;
            select.appendChild(option);
        });
    }

    // Initialize profile list on load
    initializeProfileList() {
        this.updateProfileList();
    }

    // Save command history
    saveCommandHistory() {
        localStorage.setItem('esp32-monitor-history', JSON.stringify(this.commandHistory));
    }

    // Load command history
    loadCommandHistory() {
        const saved = localStorage.getItem('esp32-monitor-history');
        if (saved) {
            this.commandHistory = JSON.parse(saved);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
}

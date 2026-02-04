// Shortcuts Manager - Handles customizable shortcut buttons
class ShortcutsManager {
    constructor() {
        this.shortcuts = [];
        this.modal = null;
        this.shortcutBar = null;
        this.onShortcutExecute = null;

        this.initializeElements();
        this.loadShortcuts();
        this.attachEventListeners();
    }

    // Initialize DOM elements
    initializeElements() {
        this.modal = document.getElementById('shortcutModal');
        this.shortcutBar = document.getElementById('shortcutBar');
        this.shortcutsList = document.getElementById('shortcutsList');

        this.elements = {
            manageBtn: document.getElementById('manageShortcutsBtn'),
            closeModalBtn: document.getElementById('closeModalBtn'),
            addShortcutBtn: document.getElementById('addShortcutBtn'),
            saveShortcutsBtn: document.getElementById('saveShortcutsBtn'),
            exportShortcutsBtn: document.getElementById('exportShortcutsBtn'),
            importShortcutsBtn: document.getElementById('importShortcutsBtn'),
            resetShortcutsBtn: document.getElementById('resetShortcutsBtn')
        };
    }

    // Attach event listeners
    attachEventListeners() {
        // Open modal
        this.elements.manageBtn.addEventListener('click', () => this.openModal());

        // Close modal
        this.elements.closeModalBtn.addEventListener('click', () => this.closeModal());

        // Click outside modal to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Add shortcut
        this.elements.addShortcutBtn.addEventListener('click', () => this.addShortcut());

        // Save shortcuts
        this.elements.saveShortcutsBtn.addEventListener('click', () => this.saveAndClose());

        // Export shortcuts
        this.elements.exportShortcutsBtn.addEventListener('click', () => this.exportShortcuts());

        // Import shortcuts
        this.elements.importShortcutsBtn.addEventListener('click', () => this.importShortcuts());

        // Reset to defaults
        this.elements.resetShortcutsBtn.addEventListener('click', () => this.resetToDefaults());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcut(e));
    }

    // Load shortcuts from localStorage
    loadShortcuts() {
        const saved = localStorage.getItem('esp32-monitor-shortcuts');
        if (saved) {
            this.shortcuts = JSON.parse(saved);
        } else {
            // Load default shortcuts
            this.shortcuts = this.getDefaultShortcuts();
            this.saveShortcuts();
        }
        this.renderShortcutBar();
    }

    // Get default shortcuts
    getDefaultShortcuts() {
        return [
            {
                id: this.generateId(),
                label: 'Reset',
                command: 'reset',
                icon: '🔄',
                color: '#e74c3c',
                hotkey: 'Ctrl+1',
                order: 1,
                lineEnding: ''
            },
            {
                id: this.generateId(),
                label: 'Status',
                command: 'status',
                icon: 'ℹ️',
                color: '#3498db',
                hotkey: 'Ctrl+2',
                order: 2,
                lineEnding: ''
            },
            {
                id: this.generateId(),
                label: 'Ping',
                command: 'ping',
                icon: '📡',
                color: '#2ecc71',
                hotkey: 'Ctrl+3',
                order: 3,
                lineEnding: ''
            },
            {
                id: this.generateId(),
                label: 'Help',
                command: 'help',
                icon: '❓',
                color: '#f39c12',
                hotkey: 'Ctrl+4',
                order: 4,
                lineEnding: ''
            }
        ];
    }

    // Generate unique ID
    generateId() {
        return 'shortcut-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    // Save shortcuts to localStorage
    saveShortcuts() {
        localStorage.setItem('esp32-monitor-shortcuts', JSON.stringify(this.shortcuts));
    }

    // Render shortcut bar
    renderShortcutBar() {
        this.shortcutBar.innerHTML = '';

        // Sort by order
        const sorted = [...this.shortcuts].sort((a, b) => a.order - b.order);

        sorted.forEach(shortcut => {
            const button = document.createElement('button');
            button.className = 'shortcut-btn';
            button.dataset.id = shortcut.id;
            button.title = `${shortcut.command}${shortcut.hotkey ? ' (' + shortcut.hotkey + ')' : ''}`;

            if (shortcut.color) {
                button.style.borderColor = shortcut.color;
            }

            button.innerHTML = `
                ${shortcut.icon ? `<span>${shortcut.icon}</span>` : ''}
                <span>${shortcut.label}</span>
            `;

            button.addEventListener('click', () => this.executeShortcut(shortcut.id));

            this.shortcutBar.appendChild(button);
        });
    }

    // Execute shortcut
    executeShortcut(id) {
        const shortcut = this.shortcuts.find(s => s.id === id);
        if (!shortcut) return;

        // Visual feedback
        const button = this.shortcutBar.querySelector(`[data-id="${id}"]`);
        if (button) {
            button.classList.add('clicked');
            setTimeout(() => button.classList.remove('clicked'), 300);
        }

        if (this.onShortcutExecute) {
            this.onShortcutExecute(shortcut.command, shortcut.lineEnding);
        }
    }

    // Handle keyboard shortcuts
    handleKeyboardShortcut(e) {
        // Only handle Ctrl+Number shortcuts
        if (!e.ctrlKey || e.shiftKey || e.altKey) return;

        const key = e.key;
        const hotkey = `Ctrl+${key}`;

        const shortcut = this.shortcuts.find(s => s.hotkey === hotkey);
        if (shortcut) {
            e.preventDefault();
            this.executeShortcut(shortcut.id);
        }
    }

    // Open modal
    openModal() {
        this.modal.classList.add('active');
        this.renderShortcutsList();
    }

    // Close modal
    closeModal() {
        this.modal.classList.remove('active');
    }

    // Render shortcuts list in modal
    renderShortcutsList() {
        this.shortcutsList.innerHTML = '';

        // Sort by order
        const sorted = [...this.shortcuts].sort((a, b) => a.order - b.order);

        sorted.forEach((shortcut, index) => {
            const item = this.createShortcutItem(shortcut, index);
            this.shortcutsList.appendChild(item);
        });
    }

    // Create shortcut item for modal
    createShortcutItem(shortcut, index) {
        const div = document.createElement('div');
        div.className = 'shortcut-item';
        div.dataset.id = shortcut.id;

        div.innerHTML = `
            <div class="shortcut-item-header">
                <strong>Shortcut ${index + 1}</strong>
                <div class="shortcut-item-actions">
                    <button class="icon-btn btn-move-up" title="Move Up">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M18 15l-6-6-6 6"/>
                        </svg>
                    </button>
                    <button class="icon-btn btn-move-down" title="Move Down">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path d="M6 9l6 6 6-6"/>
                        </svg>
                    </button>
                    <button class="icon-btn btn-delete" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                    </button>
                </div>
            </div>
            <label>
                Label
                <input type="text" class="input-label" value="${shortcut.label}" placeholder="e.g., Reset">
            </label>
            <label>
                Command
                <input type="text" class="input-command" value="${shortcut.command}" placeholder="e.g., reset">
            </label>
            <div style="display: flex; gap: 8px;">
                <label style="flex: 1;">
                    Icon (Emoji)
                    <input type="text" class="input-icon" value="${shortcut.icon || ''}" placeholder="e.g., 🔄" maxlength="2">
                </label>
                <label style="flex: 1;">
                    Color
                    <input type="color" class="input-color" value="${shortcut.color || '#3498db'}" style="height: 38px; padding: 2px;">
                </label>
            </div>
            <div style="display: flex; gap: 8px;">
                <label style="flex: 1;">
                    Line Ending
                    <select class="input-line-ending">
                        <option value="" ${!shortcut.lineEnding ? 'selected' : ''}>None</option>
                        <option value="\\n" ${shortcut.lineEnding === '\\n' ? 'selected' : ''}>LF (\\n)</option>
                        <option value="\\r" ${shortcut.lineEnding === '\\r' ? 'selected' : ''}>CR (\\r)</option>
                        <option value="\\r\\n" ${shortcut.lineEnding === '\\r\\n' ? 'selected' : ''}>CRLF (\\r\\n)</option>
                    </select>
                </label>
                <label style="flex: 1;">
                    Hotkey (Optional)
                    <input type="text" class="input-hotkey" value="${shortcut.hotkey || ''}" placeholder="e.g., Ctrl+1" readonly>
                </label>
            </div>
        `;

        // Attach item event listeners
        const deleteBtn = div.querySelector('.btn-delete');
        deleteBtn.addEventListener('click', () => this.deleteShortcut(shortcut.id));

        const moveUpBtn = div.querySelector('.btn-move-up');
        moveUpBtn.addEventListener('click', () => this.moveShortcut(shortcut.id, 'up'));

        const moveDownBtn = div.querySelector('.btn-move-down');
        moveDownBtn.addEventListener('click', () => this.moveShortcut(shortcut.id, 'down'));

        // Update shortcut on input change
        const inputs = div.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('change', () => this.updateShortcutFromItem(div, shortcut.id));
        });

        return div;
    }

    // Update shortcut from item inputs
    updateShortcutFromItem(itemDiv, id) {
        const shortcut = this.shortcuts.find(s => s.id === id);
        if (!shortcut) return;

        shortcut.label = itemDiv.querySelector('.input-label').value;
        shortcut.command = itemDiv.querySelector('.input-command').value;
        shortcut.icon = itemDiv.querySelector('.input-icon').value;
        shortcut.color = itemDiv.querySelector('.input-color').value;
        shortcut.lineEnding = itemDiv.querySelector('.input-line-ending').value;
        shortcut.hotkey = itemDiv.querySelector('.input-hotkey').value;
    }

    // Add new shortcut
    addShortcut() {
        const newShortcut = {
            id: this.generateId(),
            label: 'New Shortcut',
            command: 'command',
            icon: '⚡',
            color: '#3498db',
            hotkey: '',
            order: this.shortcuts.length + 1,
            lineEnding: '' // Default to None
        };

        this.shortcuts.push(newShortcut);
        this.renderShortcutsList();
    }

    // Delete shortcut
    deleteShortcut(id) {
        if (!confirm('Are you sure you want to delete this shortcut?')) return;

        this.shortcuts = this.shortcuts.filter(s => s.id !== id);
        this.renderShortcutsList();
    }

    // Move shortcut up or down
    moveShortcut(id, direction) {
        const index = this.shortcuts.findIndex(s => s.id === id);
        if (index === -1) return;

        if (direction === 'up' && index > 0) {
            [this.shortcuts[index], this.shortcuts[index - 1]] =
                [this.shortcuts[index - 1], this.shortcuts[index]];
        } else if (direction === 'down' && index < this.shortcuts.length - 1) {
            [this.shortcuts[index], this.shortcuts[index + 1]] =
                [this.shortcuts[index + 1], this.shortcuts[index]];
        }

        // Update order
        this.shortcuts.forEach((s, i) => s.order = i + 1);

        this.renderShortcutsList();
    }

    // Save and close modal
    saveAndClose() {
        // Update all shortcuts from inputs
        const items = this.shortcutsList.querySelectorAll('.shortcut-item');
        items.forEach(item => {
            const id = item.dataset.id;
            this.updateShortcutFromItem(item, id);
        });

        this.saveShortcuts();
        this.renderShortcutBar();
        this.closeModal();

        // Show notification
        if (window.uiManager) {
            window.uiManager.showNotification('Shortcuts saved successfully', 'success');
        }
    }

    // Export shortcuts
    exportShortcuts() {
        const json = JSON.stringify(this.shortcuts, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'esp32-shortcuts.json';
        a.click();
        URL.revokeObjectURL(url);

        if (window.uiManager) {
            window.uiManager.showNotification('Shortcuts exported successfully', 'success');
        }
    }

    // Import shortcuts
    importShortcuts() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const imported = JSON.parse(event.target.result);

                    if (!Array.isArray(imported)) {
                        throw new Error('Invalid format');
                    }

                    this.shortcuts = imported;
                    this.saveShortcuts();
                    this.renderShortcutsList();
                    this.renderShortcutBar();

                    if (window.uiManager) {
                        window.uiManager.showNotification('Shortcuts imported successfully', 'success');
                    }
                } catch (error) {
                    if (window.uiManager) {
                        window.uiManager.showNotification('Failed to import shortcuts: Invalid file format', 'error');
                    }
                }
            };

            reader.readAsText(file);
        });

        input.click();
    }

    // Reset to default shortcuts
    resetToDefaults() {
        if (!confirm('Are you sure you want to reset all shortcuts to defaults? This cannot be undone.')) {
            return;
        }

        this.shortcuts = this.getDefaultShortcuts();
        this.saveShortcuts();
        this.renderShortcutsList();
        this.renderShortcutBar();

        if (window.uiManager) {
            window.uiManager.showNotification('Shortcuts reset to defaults', 'info');
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShortcutsManager;
}

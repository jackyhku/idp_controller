
# Copilot Instructions

## Project Overview
This is a modern Web Serial Monitor application for ESP32/Arduino devices. It features a chatbot-style interface, dual connection modes (USB Serial & Bluetooth LE), and a Flask backend for remote monitoring.

### Tech Stack
- **Frontend**: Vanilla JavaScript (ES6+), Vanilla CSS variables (No frameworks like React/Vue).
- **Backend**: Python Flask with Flask-SocketIO.
- **Communication**: 
  - Web Serial API (USB)
  - Web Bluetooth API (BLE)
  - Socket.IO (Frontend <-> Backend)

## Architecture
- **Controller**: `js/app.js` is the main entry point. It coordinates between UI and Data Managers.
- **Managers**:
  - `js/serial.js`: Encapsulates Web Serial API logic.
  - `js/bluetooth.js`: Encapsulates Web Bluetooth API logic.
  - `js/ui.js`: Handles ALL content updates and DOM manipulation. **Do not manipulate DOM directly in other files.**
  - `js/shortcuts.js`: Manages user-configurable command shortcuts.
- **Configuration**: `config.js` holds all global constants, UUIDs, and default settings.
- **Styling**: `css/style.css` uses CSS variables for theming (Light/Dark).

## Coding Standards
1.  **UI Updates**: always use `uiManager` methods (e.g., `uiManager.appendMessage`, `uiManager.updateModeUI`). If a method doesn't exist, add it to `UIManager` class first.
2.  **Connection Modes**:
    - Respect `activeMode` ('serial' or 'bluetooth') in `app.js`.
    - Use "Serial (USB / SPP 2.0)" and "Bluetooth (BLE 4.0)" terminology in UI.
3.  **Cross-Browser**: Check for API support (`navigator.serial`, `navigator.bluetooth`) before use.
4.  **Backend**: The Flask server runs on port **6011** (default) to avoid conflicts.

## Key Features
- **Dual Mode**: User can toggle between Serial (classic COM ports/HC-05) and Bluetooth LE (ESP32 BLE).
- **Remote Monitoring**: Serial data is broadcast via Socket.IO to the backend.
- **Shortcuts**: Persistent local-storage based command shortcuts.

## Common Tasks
- **Adding a new UI feature**: 
  1. Add HTML in `index.html`.
  2. Add styles in `css/style.css`. 
  3. Add element reference and update method in `js/ui.js`.
  4. Trigger update from `js/app.js`.

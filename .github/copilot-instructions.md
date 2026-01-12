# Copilot Instructions for ESP32 WebSerial Monitor

## Big Picture Architecture
- **Frontend webapp** (HTML/JS/CSS) communicates with ESP32 via browser Web Serial API
- **Main JS modules:**
  - `app.js`: Application controller, manages state, auto-reconnect, command flow
  - `serial.js`: Handles serial port connection, config, and data transfer
  - `ui.js`: UI logic, notifications, status, and user interaction
  - `shortcuts.js`: Manages customizable command shortcuts
- **ESP32 firmware** (`ESP32_Test_Program.ino`) echoes commands, responds to specific keywords, and supports non-blocking operations
- **No backend required for basic use**; optional Flask server (`server.py`) for advanced features (WebSocket, API)

## Developer Workflows
- **Frontend:**
  - Edit JS/CSS/HTML, then reload in Chrome/Edge (Web Serial API required)
  - Use browser DevTools for debugging
- **ESP32:**
  - Edit/upload `ESP32_Test_Program.ino` via Arduino IDE
- **Backend (optional):**
  - Run `server.py` with Flask for API/WebSocket features
  - Use `run.sh` to set up Python venv and install dependencies

## Project-Specific Patterns
- **Serial port info and config** are stored in browser `localStorage` (`esp32-monitor-last-port`, `esp32-monitor-last-config`)
- **Auto-reconnect** logic in `app.js` matches previous port by USB vendor/product ID and restores config
- **Non-blocking MCU code**: All ESP32 actions (LED blink, reset) use millis()-based state machines, never delay()
- **Shortcuts**: Customizable, stored in browser, import/export as JSON
- **UI notifications**: Use multi-line messages for errors and status

## Integration Points
- **Web Serial API**: Only available in Chrome/Edge
- **ESP32**: Communicates via USB serial, expects newline-terminated commands
- **Optional Flask backend**: Serves static files, provides `/api/config`, `/api/status`, `/api/health`, and WebSocket events

## Key Files & Directories
- `index.html`: Loads all JS modules, sets up UI
- `js/app.js`: Main logic, auto-reconnect, event handlers
- `js/serial.js`: Serial connection, error handling, config
- `js/ui.js`: UI state, notifications, port info
- `ESP32_Test_Program.ino`: Example firmware, non-blocking, command parser
- `.github/copilot-instructions.md`: This file
- `README.md`: User guide, features, setup

## Examples
- **Auto-reconnect pattern:**
  ```js
  // app.js
  const ports = await navigator.serial.getPorts();
  // Match previous port by vendor/product ID
  // Restore config from localStorage
  ```
- **Non-blocking LED blink:**
  ```cpp
  // ESP32_Test_Program.ino
  if (isBlinking && millis() - lastBlinkTime >= BLINK_INTERVAL) { ... }
  ```
- **Custom shortcut import/export:**
  ```js
  // shortcuts.js
  localStorage.setItem('esp32-monitor-profiles', JSON.stringify(...));
  ```

---

If any section is unclear or missing, please provide feedback for further refinement.

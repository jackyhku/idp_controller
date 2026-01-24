# WebSerial Monitor
> **Version 1.0.0** | **Designed by Jacky CHOW** | **Jan 2026**

A modern, chatbot-style web application for communicating with ESP32 devices via USB serial connection (Web Serial API) and Bluetooth LE (Web Bluetooth API).

![WebSerial Monitor](https://img.shields.io/badge/Browser-Chrome%20%7C%20Edge-blue)
![Web Serial API](https://img.shields.io/badge/Web%20Serial%20API-Supported-green)
![Web Bluetooth API](https://img.shields.io/badge/Web%20Bluetooth%20API-Supported-lightblue)

## Features

### 🔌 Dual Connection Modes
- **Serial (USB / SPP 2.0)**: Connect via standard USB cable. Also supports Classic Bluetooth (HC-05/06) if paired via OS settings as a serial port.
- **Bluetooth (BLE 4.0)**: Connect wirelessly to ESP32 BLE devices directly from the browser (no pairing needed). Supports Nordic UART Service (NUS) by default.

### 🎨 Modern UI/UX
- **Chatbot-inspired interface** with message bubbles
- **Dark/Light theme** support with smooth transitions
- **Responsive design** that works on desktop and tablet
- **Clean Sidebar**: Focused on connection and port selection
- **Settings Modal**: Consolidated configuration and profile management
- **Toggle Controls**: Sleek light-up buttons for Broadcast, Timestamps, and Auto-scroll
- **Segmented Control** for easy mode switching

### 🔧 Full Serial/BLE Control
- **Serial**: Configurable Baud rate, Data bits, Parity, Flow control via Settings Modal.
- **Profiles**: Save and load your favorite connection configurations.
- **Line Endings**: Fast selector (None, LF, CR, CRLF) right in the input area.

### ⚡ Customizable Shortcuts
- **Quick command buttons** at the top of the interface
- **Fully customizable** - add, edit, delete, and reorder
- **Import/Export** button configurations as JSON

### 💬 Chat-Style Communication
- ESP32 messages displayed on the left (incoming)
- Your commands displayed on the right (outgoing)
- **Hex/Text/Mixed** display modes
- Command history with arrow key navigation

### 📡 Remote Monitoring (Session-Based)
- **Remote Broadcast**: Stream your local Serial/Bluetooth connection data to a remote observer.
- **Session IDs**: Unique 6-character Session IDs for secure, targeted monitoring.
- **Bi-directional**: Remote monitors can send commands back to the device.
- **Backend**: Python Flask server with Socket.IO for real-time low-latency communication.

## Browser Requirements

This application requires modern browser APIs:

- **Web Serial API**: Chrome/Edge 89+
- **Web Bluetooth API**: Chrome/Edge 56+

⚠️ **Not supported in Firefox or Safari** due to missing hardware APIs.

## Getting Started

### 1. Setup the Web Application

1. Clone this repository
2. Install Python dependencies (for remote monitoring):
   ```bash
   pip install flask flask-socketio eventlet
   ```
3. Run the backend server (default port 6015):
   ```bash
   python server.py
   ```
4. Open `http://localhost:6015` in Chrome or Edge.

### 2. Upload Test Program to ESP32

1. Open `ESP32_Test_Program.ino` in Arduino IDE
2. Select your ESP32 board and port
3. Upload the program to your ESP32

### 3. Connect and Test

1. **Select Connection Mode** in the sidebar:
   - **Serial**: For USB.
   - **Bluetooth**: For BLE devices.
2. Click **"Select Port"** or **"Scan Device"**.
3. Choose your device and click **"Connect"**.

## Remote Monitoring Guide

1. **Broadcaster (Device Owner)**:
   - Connect to your device via Serial or Bluetooth.
   - Click **"Remote Broadcast"** in the header.
   - Share the generated **Session ID** (e.g., `A1B2C3`) with your peer.

2. **Monitor (Remote Observer)**:
   - Select **"Remote"** mode in the sidebar.
   - Enter the **Session ID** provided by the broadcaster.
   - Click **"Connect"**.
   - You can now see the data stream and send commands back to the device!

## Project Structure

```
WebSerial/
├── index.html              # Main HTML page
├── css/
│   └── style.css          # Styling
├── js/
│   ├── app.js             # Main controller
│   ├── serial.js          # Web Serial manager
│   ├── bluetooth.js       # Web Bluetooth manager
│   ├── remote.js          # Remote monitoring manager
│   ├── ui.js              # UI logic
│   └── shortcuts.js       # Shortcuts logic
├── server.py              # Flask Socket.IO backend
├── config.js              # Configuration defaults
└── README.md              # Documentation
```

## Troubleshooting

### Port Selection Dialog Doesn't Appear
- Make sure you're using Chrome or Edge (v89+)
- The app must be served over HTTPS (or localhost)

### Connection Fails
- Verify correct baud rate (default: 115200)
- Ensure ESP32 is not connected to Arduino IDE monitor

## Contributing

Feel free to fork and customize this project for your needs!

## License

This project is open source and free to use under the **MIT License**.

---

**Happy Coding! 🚀**

# IDP - Web based Car Controller v0.1

A lightweight web controller for Arduino car projects using Web Serial (USB or Bluetooth SPP serial port).

## What this app does

- Connects to your Arduino serial port from Chrome/Edge.
- Sends car movement commands while you hold control buttons.
- Shows live A0 reading from incoming serial data.
- Supports Bluetooth SPP modules after system-level pairing.

## Browser requirement

- Google Chrome or Microsoft Edge (Web Serial API support required).
- Firefox/Safari are not supported for Web Serial.

## Important Bluetooth note (SPP)

Before using Bluetooth in this app:

1. Pair the Bluetooth module in your operating system first (Windows/macOS/Linux).
2. After pairing, click **Serial Port** in the app.
3. Select the paired serial device from the port picker.

The paired module may appear with your custom module name or as **SPP Dev**.

## Controls and command mapping

### Hold-to-send commands (every 33ms while pressed)

- Up: `AZ`
- Down: `EZ`
- Left: `HZ`
- Right: `BZ`
- Clockwise: `CZ`
- Anticlockwise: `GZ`

### Single-tap commands

- High Speed: `L`
- Low Speed: `M`

## A0 reading behavior

- The large A0 value updates when incoming serial contains:
  - `A0: <number>` format, or
  - plain numeric values (for example `2`).
- `--` is the initial placeholder before the first reading is received.

## Local run

```bash
npm install
npm start
```

Default URL:

- `http://127.0.0.1:6011`

Health endpoint:

- `http://127.0.0.1:6011/api/health`

## Network access

The server binds to `0.0.0.0` on port `6011`, so other devices in the same network can access it using:

- `http://<host-ip>:6011`

## Project files

- `index.html` – app UI
- `css/style.css` – app styles/theme
- `js/app.js` – controller logic and command sending
- `js/serial.js` – Web Serial manager
- `server.js` – static server and API routes

## Version

- `v0.1`

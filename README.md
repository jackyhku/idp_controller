# IDP - Web based Car Controller v0.3

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

### Hold-to-send commands (every 0.5s while pressed)

- Up: `A`
- Down: `E`
- Left: `H`
- Right: `B`
- Clockwise: `C`
- Anticlockwise: `G`

When you release a direction/turn button, the app sends `Z` once as stop command.

Example: hold Up for ~3 seconds sends `AAAAAA`, then on release sends `Z` → `AAAAAAZ`.

### Single-tap commands

- High Speed: `L`
- Low Speed: `M`

## A0 reading behavior

- The large A0 value updates when incoming serial contains:
  - `A0: <number>` format, or
  - plain numeric values (for example `2`).
- `--` is the initial placeholder before the first reading is received.

## Custom buttons (new in v0.3)

- Four extra custom buttons are available in the app.
- Each button can be configured in **Settings** with:
  - button label (default: `Button 1` ... `Button 4`),
  - press command,
  - release command (sent when button press ends),
  - optional newline checkbox for both press/release commands (Arduino IDE style),
  - repeat while pressed,
  - repeat interval (ms).
- The command configured for each custom button is shown directly on the button.

## Local run

```bash
npm install
npm start
```

Default URL:

- `http://127.0.0.1:6011`

Health endpoint:

- `http://127.0.0.1:6011/api/health`

## Deploy on Vercel

This project is ready for static deployment on Vercel.

### Steps

1. Push this repository to GitHub.
2. In Vercel, import the GitHub repository.
3. Keep default project settings (no environment variables required).
4. Deploy.

### Notes

- Web Serial works only in supported browsers (Chrome/Edge).
- Your deployed Vercel URL is HTTPS, which is required for Web Serial API.
- `server.js` is for local Node hosting; Vercel deployment uses static files from `index.html`, `css/`, and `js/`.

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

- `v0.3`

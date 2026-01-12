# ESP32 WebSerial Monitor

A modern, chatbot-style web application for communicating with ESP32 devices via USB serial connection using the Web Serial API.

![ESP32 WebSerial Monitor](https://img.shields.io/badge/Browser-Chrome%20%7C%20Edge-blue)
![Web Serial API](https://img.shields.io/badge/Web%20Serial%20API-Supported-green)

## Features

### 🎨 Modern UI/UX
- **Chatbot-inspired interface** with message bubbles
- **Dark/Light theme** support with smooth transitions
- **Responsive design** that works on desktop and tablet
- **Collapsible sidebar** for clean, focused workspace

### 🔧 Full Serial Control
- Configure all serial parameters in the UI:
  - Baud rate (with custom rate support)
  - Data bits (7/8)
  - Stop bits (1/2)
  - Parity (None/Even/Odd)
  - Flow control (None/Hardware)
  - Line endings (None/LF/CR/CRLF)
- Save and load configuration profiles

### ⚡ Customizable Shortcuts
- **Quick command buttons** at the top of the interface
- **Fully customizable** - add, edit, delete, and reorder
- Each button can have:
  - Custom label and command
  - Icon (emoji)
  - Color
  - Keyboard shortcut (Ctrl+1-9)
- **Import/Export** button configurations as JSON
- **Default shortcuts** included for common commands

### 💬 Chat-Style Communication
- ESP32 messages displayed on the left (incoming)
- Your commands displayed on the right (outgoing)
- Optional timestamps for all messages
- Command history with arrow key navigation
- Auto-scroll with manual override

### 📊 Statistics & Monitoring
- Real-time RX/TX byte counters
- Connection uptime tracking
- Save conversation logs to file
- Multiple display formats (Text, Hex, Mixed)

## Browser Requirements

This application requires the **Web Serial API**, which is only available in:
- **Google Chrome** version 89 or higher
- **Microsoft Edge** version 89 or higher

⚠️ **Not supported in Firefox or Safari**

## Getting Started

### 1. Setup the Web Application

1. Clone or download this repository
2. Open `index.html` in Chrome or Edge
   - You can simply double-click the file or
   - Use a local web server (recommended for development)

**Using a local web server (optional but recommended):**

```bash
# Using Python
python -m http.server 8000

# Using Node.js http-server
npx http-server

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in Chrome/Edge.

### 2. Upload Test Program to ESP32

1. Open `ESP32_Test_Program.ino` in Arduino IDE
2. Select your ESP32 board and port
3. Upload the program to your ESP32

### 3. Connect and Test

1. In the web app, click **"Select Port"**
2. Choose your ESP32's COM port from the browser dialog
3. Click **"Connect"** (default 115200 baud rate)
4. You should see the ESP32's welcome message
5. Try the shortcut buttons or type commands like:
   - `ping` - Get a pong response
   - `status` - View ESP32 system information
   - `help` - See all available commands
   - `led on` - Turn on the built-in LED

## Project Structure

```
WebSerial/
├── index.html              # Main HTML page
├── css/
│   └── style.css          # All styling (light/dark themes)
├── js/
│   ├── serial.js          # Web Serial API handler
│   ├── ui.js              # UI interaction logic
│   ├── shortcuts.js       # Shortcut button management
│   └── app.js             # Main application controller
├── ESP32_Test_Program.ino # Sample ESP32 test program
├── plan.md                # Project plan and documentation
└── README.md              # This file
```

## Using the Application

### Connection Configuration

1. **Select Port**: Click to choose your ESP32's serial port
2. **Configure Serial Settings**: Adjust baud rate and other parameters in the sidebar
3. **Connect**: Establish connection with configured settings

### Sending Commands

- **Type in the input box** at the bottom
- Press **Enter** to send (Shift+Enter for new line)
- Use **↑/↓ arrow keys** to navigate command history
- Click **shortcut buttons** for quick commands

### Managing Shortcuts

1. Click **"Manage Shortcuts"** in the sidebar
2. **Add** new shortcuts with the "+" button
3. **Edit** existing shortcuts (label, command, icon, color, hotkey)
4. **Reorder** shortcuts using up/down arrows
5. **Delete** shortcuts you don't need
6. **Export/Import** configurations as JSON files
7. Click **"Save"** to apply changes

### Display Options

- **Show Timestamps**: Toggle timestamps on messages
- **Auto-scroll**: Automatically scroll to latest message
- **Format**: Choose text, hex, or mixed display format

### Saving Data

- **Save Log**: Download conversation as text file
- **Clear Chat**: Remove all messages from display

## Keyboard Shortcuts

- **Enter**: Send command
- **Shift+Enter**: New line in command input
- **↑/↓**: Navigate command history
- **Ctrl+1 to Ctrl+9**: Execute configured shortcut buttons

## Default Shortcut Commands

The application comes with these default shortcuts:

1. **Reset** (Ctrl+1) - Sends `reset` to ESP32
2. **Status** (Ctrl+2) - Sends `status` to ESP32
3. **Ping** (Ctrl+3) - Sends `ping` to ESP32
4. **Help** (Ctrl+4) - Sends `help` to ESP32

You can customize these or add your own!

## ESP32 Test Program Commands

The included test program responds to:

- `ping` - Responds with "pong"
- `status` - Shows system information
- `help` - Lists all commands
- `reset` - Restarts the ESP32
- `led on` - Turns on built-in LED
- `led off` - Turns off built-in LED
- `led blink` - Blinks LED 5 times
- `echo [message]` - Echoes back your message

## Customization

### Adding Your Own Commands

Edit `ESP32_Test_Program.ino` and add commands in the `handleCommand()` function:

```cpp
else if (cmd == "mycommand") {
    Serial.println("My custom response");
}
```

### Creating Custom Shortcuts

1. Open "Manage Shortcuts" dialog
2. Add a new shortcut
3. Set the label (e.g., "My Command")
4. Set the command (e.g., "mycommand")
5. Choose an icon and color
6. Optionally set a keyboard shortcut
7. Save

## Troubleshooting

### Port Selection Dialog Doesn't Appear
- Make sure you're using Chrome or Edge (v89+)
- The app must be served over HTTPS (or localhost)
- Check browser console for errors

### Connection Fails
- Verify correct baud rate (default: 115200)
- Ensure ESP32 is not connected to Arduino IDE or another serial monitor
- Try unplugging and reconnecting the ESP32
- Check USB cable (some cables are power-only)

### No Data Received
- Verify ESP32 program is uploaded and running
- Check baud rate matches between web app and ESP32
- Try sending a command first (some ESP32s need initialization)

### Browser Compatibility
- Only Chrome and Edge support Web Serial API
- Firefox and Safari do NOT support this feature
- Make sure your browser is up to date

## Security Considerations

- Web Serial API requires **user permission** for each port access
- Must be served over **HTTPS** (localhost is exempt)
- Port access requires **user gesture** (button click)
- All data stays **client-side** - nothing is sent to a server

## Future Enhancements

Potential features for future versions:

- [ ] Data plotting/graphing for sensor values
- [ ] File upload to ESP32
- [ ] Custom protocol parsers (JSON, CSV)
- [ ] Command macros and sequences
- [ ] Session recording and playback
- [ ] Multi-device support
- [ ] WebSocket bridge to backend

## Contributing

Feel free to fork and customize this project for your needs!

## License

This project is open source and free to use.

## Resources

- [Web Serial API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Serial_API)
- [Chrome Web Serial Sample](https://googlechrome.github.io/samples/web-serial/)
- [ESP32 Documentation](https://docs.espressif.com/)

---

**Happy Coding! 🚀**

If you find this useful, please star the repository!

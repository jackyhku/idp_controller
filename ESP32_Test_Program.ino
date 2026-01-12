/*
 * ESP32 WebSerial Test Program - Non-Blocking Version
 * 
 * This is a simple test program for the ESP32 WebSerial Monitor.
 * Upload this to your ESP32 to test the web interface.
 * 
 * Features:
 * - Echo commands back to serial
 * - Respond to specific commands (ping, status, help, reset)
 * - Send periodic messages
 * - Non-blocking LED blink animation
 */

const int LED_PIN = 2; // Built-in LED on most ESP32 boards
unsigned long lastMessageTime = 0;
const unsigned long MESSAGE_INTERVAL = 5000; // 5 seconds

// Non-blocking LED blink variables
bool isBlinking = false;
int blinkCount = 0;
int blinkTarget = 0;
unsigned long lastBlinkTime = 0;
const unsigned long BLINK_INTERVAL = 200;
bool ledState = false;

// Reset timer
bool resetPending = false;
unsigned long resetTime = 0;

void setup() {
  // Initialize serial communication
  Serial.begin(115200);
  
  // Wait for serial to initialize
  delay(100);
  
  // Initialize LED pin
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // Send startup message
  Serial.println("========================================");
  Serial.println("ESP32 WebSerial Test Program");
  Serial.println("Non-Blocking Version");
  Serial.println("========================================");
  Serial.println("Ready to receive commands!");
  Serial.println("Type 'help' for available commands");
  Serial.println();
}

void loop() {
  // Check for incoming serial data
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim(); // Remove whitespace
    
    handleCommand(command);
  }
  
  // Send periodic status message
  if (millis() - lastMessageTime >= MESSAGE_INTERVAL) {
    Serial.print("[INFO] Uptime: ");
    Serial.print(millis() / 1000);
    Serial.println(" seconds");
    lastMessageTime = millis();
  }
}

void handleCommand(String command) {
  Serial.print("Received: ");
  Serial.println(command);
  
  // Convert to lowercase for comparison
  String cmd = command;
  cmd.toLowerCase();
  
  if (cmd == "ping") {
    Serial.println("pong");
    
  } else if (cmd == "status") {
    Serial.println("========== ESP32 Status ==========");
    Serial.print("Uptime: ");
    Serial.print(millis() / 1000);
    Serial.println(" seconds");
    Serial.print("Free Heap: ");
    Serial.print(ESP.getFreeHeap());
    Serial.println(" bytes");
    Serial.print("Chip Model: ");
    Serial.println(ESP.getChipModel());
    Serial.print("CPU Frequency: ");
    Serial.print(ESP.getCpuFreqMHz());
    Serial.println(" MHz");
    Serial.println("==================================");
    
  } else if (cmd == "help") {
    Serial.println("========== Available Commands ==========");
    Serial.println("ping       - Responds with 'pong'");
    Serial.println("status     - Shows ESP32 system status");
    Serial.println("help       - Shows this help message");
    Serial.println("reset      - Resets the ESP32");
    Serial.println("led on     - Turns on the built-in LED");
    Serial.println("led off    - Turns off the built-in LED");
    Serial.println("led blink  - Blinks the LED");
    Serial.println("echo [msg] - Echoes back the message");
    Serial.println("========================================");
    
  } else if (cmd == "reset") {
    Serial.println("Resetting ESP32...");
    delay(1000);
    ESP.restart();
    
  } else if (cmd == "led on" || cmd == "ledon") {
    digitalWrite(LED_PIN, HIGH);
    Serial.println("LED turned ON");
    
  } else if (cmd == "led off" || cmd == "ledoff") {
    digitalWrite(LED_PIN, LOW);
    Serial.println("LED turned OFF");
    
  } else if (cmd == "led blink" || cmd == "ledblink") {
    Serial.println("Blinking LED 5 times...");
    for (int i = 0; i < 5; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(200);
      digitalWrite(LED_PIN, LOW);
      delay(200);
    }
    Serial.println("Blink complete");
    
  } else if (command.startsWith("echo ")) {
    String message = command.substring(5);
    Serial.print("Echo: ");
    Serial.println(message);
    
  } else if (command.length() > 0) {
    Serial.print("Unknown command: ");
    Serial.println(command);
    Serial.println("Type 'help' for available commands");
    
  }
}

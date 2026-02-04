#!/bin/bash

# WebSerial Monitor Start Script (Node.js Version)

echo "Starting WebSerial Monitor..."

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "Error: Node.js could not be found. Please install Node.js to run this application."
    exit 1
fi

# Install dependencies if node_modules does not exist
if [ ! -d "node_modules" ]; then
    echo "Installing Node.js dependencies..."
    npm install
fi

# Start the server
echo "Starting Node.js server..."
npm start

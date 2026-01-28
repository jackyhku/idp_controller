#!/bin/bash
# Start WebSerial Server properly with venv

cd "$(dirname "$0")"

if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Ensure dependencies are installed (optional, but safe)
# pip install -r requirements.txt > /dev/null 2>&1

echo "Starting WebSerial Server on port 6011..."
exec python3 server.py

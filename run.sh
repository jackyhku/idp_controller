#!/bin/bash
# Run script for ESP32 WebSerial Monitor server

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}ESP32 WebSerial Monitor - Server Startup${NC}"
echo "=========================================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${GREEN}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
echo -e "${GREEN}Activating virtual environment...${NC}"
source venv/bin/activate

# Install/upgrade dependencies
echo -e "${GREEN}Installing dependencies...${NC}"
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Run the server
echo -e "${GREEN}Starting server on port 6010...${NC}"
echo "=========================================="
python3 server.py

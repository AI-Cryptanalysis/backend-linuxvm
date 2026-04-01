#!/bin/bash

# AI Security Assistant - Tool Installation Script
# Supports: Kali Linux, Debian, Ubuntu

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting tool installation for AI Security Assistant...${NC}"

# Check for root privileges
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}This script must be run as root${NC}"
   exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION_ID=$VERSION_ID
else
    OS=$(uname -s)
fi

echo -e "${YELLOW}Detected OS: $OS${NC}"

# Update package lists
echo -e "${YELLOW}Updating package lists...${NC}"

# Disable CD-ROM repository if it exists and causes issues
if grep -q "cdrom:" /etc/apt/sources.list; then
    echo -e "${YELLOW}Notice: Disabling CD-ROM repository to prevent update errors...${NC}"
    sed -i 's/^deb cdrom:/# deb cdrom:/g' /etc/apt/sources.list
fi

# Run update and ignore errors to proceed even if some repositories are unavailable
apt-get update || echo -e "${RED}Warning: Some package lists failed to update. Proceeding with installation...${NC}"

install_if_missing() {
    local tool=$1
    local package=$2
    if ! command -v "$tool" &> /dev/null; then
        echo -e "${YELLOW}Installing $tool...${NC}"
        apt-get install -y "$package"
    else
        echo -e "${GREEN}$tool is already installed.${NC}"
    fi
}

# Core Security Tools
install_if_missing "nmap" "nmap"
install_if_missing "hydra" "hydra"
install_if_missing "nikto" "nikto"

# Additional suggested tools for AI analysis
echo -e "${YELLOW}Checking for optional tools...${NC}"
install_if_missing "tshark" "tshark"

# Specific check for Kali
if [[ "$OS" == "kali" ]]; then
    echo -e "${GREEN}Kali Linux detected. Ensuring core kali metapackages are present...${NC}"
    # apt-get install -y kali-linux-default
fi

echo -e "${GREEN}Installation complete!${NC}"
echo -e "${YELLOW}Note: Some tools like Nikto may require manual updates (nikto -update).${NC}"

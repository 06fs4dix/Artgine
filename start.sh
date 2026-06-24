#!/bin/bash

# Check Node.js installation
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Opening download page..."

    if [[ "$OSTYPE" == "darwin"* ]]; then
        open https://nodejs.org/
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v xdg-open &> /dev/null; then
            xdg-open https://nodejs.org/
        elif command -v gnome-open &> /dev/null; then
            gnome-open https://nodejs.org/
        else
            echo "Cannot open browser. Please visit https://nodejs.org/ manually."
        fi
    fi

    echo "Please install Node.js and run this again."
    read -p "Press Enter to continue..."
    exit 1
fi

# Check Git installation
if ! command -v git &> /dev/null; then
    echo "Git is not installed. Opening download page..."

    if [[ "$OSTYPE" == "darwin"* ]]; then
        open https://git-scm.com/downloads
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v xdg-open &> /dev/null; then
            xdg-open https://git-scm.com/downloads
        else
            echo "Cannot open browser. Please visit https://git-scm.com/downloads manually."
        fi
    fi

    echo "Please install Git and run this again."
    read -p "Press Enter to continue..."
    exit 1
fi

if [ ! -f "desktop/Start.js" ]; then
    echo "desktop/Start.js not found. Installing submodules..."
    git submodule update --init --recursive
fi

echo "Start... desktop/Start.js"
node desktop/Start.js
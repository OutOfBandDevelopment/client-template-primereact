#!/bin/bash
# TypeScript Generator Template Project - Installation Script
# This script installs the required npm packages for generated components

set -e

echo "=========================================="
echo "TypeScript Generator - Dependency Install"
echo "=========================================="
echo ""

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed. Please install Node.js first."
    exit 1
fi

# Check if we're in a npm project
if [ ! -f "package.json" ]; then
    echo "ERROR: No package.json found in current directory."
    echo "Please run this script from your React project root."
    exit 1
fi

echo "Installing core dependencies..."
npm install \
    primereact@^10.9.6 \
    primeflex@^4.0.0 \
    primeicons@^7.0.0 \
    zod@^4.0.0 \
    react-hook-form@^7.62.0 \
    @hookform/resolvers@^5.2.1 \
    react-router-dom@^7.8.0

echo ""
echo "Installing optional dependencies..."
npm install \
    classnames@^2.5.1

echo ""
read -p "Install xlsx for Excel export? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    npm install xlsx@https://cdn.sheetjs.com/xlsx-0.20.2/xlsx-0.20.2.tgz
fi

echo ""
echo "=========================================="
echo "Installation complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Copy runtime files: cp -r runtime/* ../src/"
echo "2. Configure PrimeReact in main.tsx"
echo "3. Set up path aliases in vite.config.ts"
echo "4. Connect usePermissions to your auth system"
echo ""
echo "See docs/INTEGRATION.md for detailed instructions."

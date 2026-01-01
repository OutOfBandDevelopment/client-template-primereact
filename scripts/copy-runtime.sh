#!/bin/bash
# TypeScript Generator Template Project - Copy Runtime Files
# Copies runtime dependencies to your React project

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$(dirname "$SCRIPT_DIR")"
RUNTIME_DIR="$TEMPLATE_DIR/runtime"

echo "=========================================="
echo "TypeScript Generator - Copy Runtime Files"
echo "=========================================="
echo ""

# Check if we're in the right place
if [ ! -d "$RUNTIME_DIR" ]; then
    echo "ERROR: Runtime directory not found at $RUNTIME_DIR"
    exit 1
fi

# Determine target directory
if [ -n "$1" ]; then
    TARGET_DIR="$1"
else
    TARGET_DIR="./src"
fi

# Check if target exists
if [ ! -d "$TARGET_DIR" ]; then
    echo "ERROR: Target directory not found: $TARGET_DIR"
    echo "Usage: $0 [target_src_directory]"
    exit 1
fi

echo "Source: $RUNTIME_DIR"
echo "Target: $TARGET_DIR"
echo ""

read -p "Proceed with copy? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "Copying components..."
mkdir -p "$TARGET_DIR/components/ui/prime"
cp -r "$RUNTIME_DIR/components/ui/prime/GenericGrid" "$TARGET_DIR/components/ui/prime/"
cp -r "$RUNTIME_DIR/components/ui/prime/EntityForm" "$TARGET_DIR/components/ui/prime/"

echo "Copying utilities..."
mkdir -p "$TARGET_DIR/utils"
cp "$RUNTIME_DIR/utils/"*.ts* "$TARGET_DIR/utils/" 2>/dev/null || true

echo "Copying hooks..."
mkdir -p "$TARGET_DIR/hooks"
cp "$RUNTIME_DIR/hooks/"*.ts "$TARGET_DIR/hooks/" 2>/dev/null || true

echo "Copying types..."
mkdir -p "$TARGET_DIR/types"
cp "$RUNTIME_DIR/types/"*.ts "$TARGET_DIR/types/" 2>/dev/null || true

echo ""
echo "=========================================="
echo "Copy complete!"
echo "=========================================="
echo ""
echo "Files copied to: $TARGET_DIR"
echo ""
echo "Next steps:"
echo "1. Configure PrimeReact in main.tsx"
echo "2. Connect usePermissions to your auth system"
echo "3. Run the generator to create components"

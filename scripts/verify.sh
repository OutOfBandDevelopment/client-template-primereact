#!/bin/bash
# TypeScript Generator Template Project - Verification Script
# Checks that all required dependencies and files are in place

set -e

echo "=========================================="
echo "TypeScript Generator - Verification"
echo "=========================================="
echo ""

ERRORS=0

# Function to check if a file exists
check_file() {
    if [ -f "$1" ]; then
        echo "[OK] $1"
    else
        echo "[MISSING] $1"
        ERRORS=$((ERRORS + 1))
    fi
}

# Function to check if a directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo "[OK] $1/"
    else
        echo "[MISSING] $1/"
        ERRORS=$((ERRORS + 1))
    fi
}

# Function to check npm package
check_package() {
    if npm list "$1" &> /dev/null; then
        echo "[OK] npm: $1"
    else
        echo "[MISSING] npm: $1"
        ERRORS=$((ERRORS + 1))
    fi
}

echo "Checking npm packages..."
check_package "primereact"
check_package "primeflex"
check_package "primeicons"
check_package "zod"
check_package "react-hook-form"
check_package "@hookform/resolvers"
check_package "react-router-dom"

echo ""
echo "Checking runtime directories..."
check_dir "src/components/ui/prime/GenericGrid"
check_dir "src/components/ui/prime/EntityForm"
check_dir "src/utils"
check_dir "src/hooks"
check_dir "src/types"

echo ""
echo "Checking runtime files..."
check_file "src/components/ui/prime/GenericGrid/SimpleGenericGrid.tsx"
check_file "src/components/ui/prime/GenericGrid/FilterSidebar.tsx"
check_file "src/components/ui/prime/GenericGrid/FilterControl.tsx"
check_file "src/components/ui/prime/GenericGrid/types.ts"
check_file "src/components/ui/prime/EntityForm/EntityPage.tsx"
check_file "src/components/ui/prime/EntityForm/BasePropertyEditor.tsx"
check_file "src/utils/schemaBasedColumnBuilder.tsx"
check_file "src/utils/zodSchemaHelper.tsx"
check_file "src/utils/masterDataCache.ts"
check_file "src/hooks/useCachedApiCall.ts"
check_file "src/hooks/usePermissions.ts"
check_file "src/types/roles.ts"

echo ""
echo "Checking configuration files..."
check_file "vite.config.ts"
check_file "tsconfig.json"
check_file "package.json"

echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ]; then
    echo "All checks passed!"
    echo "=========================================="
    echo ""
    echo "Your project is ready for code generation."
    echo "Run your generator to create components."
else
    echo "Found $ERRORS issue(s)"
    echo "=========================================="
    echo ""
    echo "Please fix the missing items before proceeding."
    echo "See docs/INTEGRATION.md for help."
    exit 1
fi

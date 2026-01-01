@echo off
REM TypeScript Generator Template Project - Installation Script
REM This script installs the required npm packages for generated components

echo ==========================================
echo TypeScript Generator - Dependency Install
echo ==========================================
echo.

REM Check if npm is available
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm is not installed. Please install Node.js first.
    exit /b 1
)

REM Check if we're in a npm project
if not exist "package.json" (
    echo ERROR: No package.json found in current directory.
    echo Please run this script from your React project root.
    exit /b 1
)

echo Installing core dependencies...
call npm install primereact@^10.9.6 primeflex@^4.0.0 primeicons@^7.0.0 zod@^4.0.0 react-hook-form@^7.62.0 @hookform/resolvers@^5.2.1 react-router-dom@^7.8.0

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to install core dependencies.
    exit /b 1
)

echo.
echo Installing optional dependencies...
call npm install classnames@^2.5.1

echo.
set /p XLSX="Install xlsx for Excel export? (y/n): "
if /i "%XLSX%"=="y" (
    call npm install xlsx@https://cdn.sheetjs.com/xlsx-0.20.2/xlsx-0.20.2.tgz
)

echo.
echo ==========================================
echo Installation complete!
echo ==========================================
echo.
echo Next steps:
echo 1. Copy runtime files to your src/ directory
echo 2. Configure PrimeReact in main.tsx
echo 3. Set up path aliases in vite.config.ts
echo 4. Connect usePermissions to your auth system
echo.
echo See docs\INTEGRATION.md for detailed instructions.
pause

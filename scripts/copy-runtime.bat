@echo off
REM TypeScript Generator Template Project - Copy Runtime Files
REM Copies runtime dependencies to your React project

echo ==========================================
echo TypeScript Generator - Copy Runtime Files
echo ==========================================
echo.

REM Get script directory
set SCRIPT_DIR=%~dp0
set TEMPLATE_DIR=%SCRIPT_DIR%..
set RUNTIME_DIR=%TEMPLATE_DIR%\runtime

REM Check if runtime directory exists
if not exist "%RUNTIME_DIR%" (
    echo ERROR: Runtime directory not found at %RUNTIME_DIR%
    pause
    exit /b 1
)

REM Determine target directory
if "%~1"=="" (
    set TARGET_DIR=.\src
) else (
    set TARGET_DIR=%~1
)

REM Check if target exists
if not exist "%TARGET_DIR%" (
    echo ERROR: Target directory not found: %TARGET_DIR%
    echo Usage: %~nx0 [target_src_directory]
    pause
    exit /b 1
)

echo Source: %RUNTIME_DIR%
echo Target: %TARGET_DIR%
echo.

set /p CONFIRM="Proceed with copy? (y/n): "
if /i not "%CONFIRM%"=="y" (
    echo Aborted.
    pause
    exit /b 0
)

echo.
echo Copying components...
if not exist "%TARGET_DIR%\components\ui\prime" mkdir "%TARGET_DIR%\components\ui\prime"
xcopy /E /I /Y "%RUNTIME_DIR%\components\ui\prime\GenericGrid" "%TARGET_DIR%\components\ui\prime\GenericGrid"
xcopy /E /I /Y "%RUNTIME_DIR%\components\ui\prime\EntityForm" "%TARGET_DIR%\components\ui\prime\EntityForm"

echo Copying utilities...
if not exist "%TARGET_DIR%\utils" mkdir "%TARGET_DIR%\utils"
copy /Y "%RUNTIME_DIR%\utils\*.ts" "%TARGET_DIR%\utils\" >nul 2>&1
copy /Y "%RUNTIME_DIR%\utils\*.tsx" "%TARGET_DIR%\utils\" >nul 2>&1

echo Copying hooks...
if not exist "%TARGET_DIR%\hooks" mkdir "%TARGET_DIR%\hooks"
copy /Y "%RUNTIME_DIR%\hooks\*.ts" "%TARGET_DIR%\hooks\" >nul 2>&1

echo Copying types...
if not exist "%TARGET_DIR%\types" mkdir "%TARGET_DIR%\types"
copy /Y "%RUNTIME_DIR%\types\*.ts" "%TARGET_DIR%\types\" >nul 2>&1

echo.
echo ==========================================
echo Copy complete!
echo ==========================================
echo.
echo Files copied to: %TARGET_DIR%
echo.
echo Next steps:
echo 1. Configure PrimeReact in main.tsx
echo 2. Connect usePermissions to your auth system
echo 3. Run the generator to create components
echo.
pause

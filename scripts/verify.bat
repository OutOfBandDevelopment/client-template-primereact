@echo off
REM TypeScript Generator Template Project - Verification Script
REM Checks that all required dependencies and files are in place

setlocal enabledelayedexpansion

echo ==========================================
echo TypeScript Generator - Verification
echo ==========================================
echo.

set ERRORS=0

REM Function to check if a file exists
:check_file
if exist "%~1" (
    echo [OK] %~1
) else (
    echo [MISSING] %~1
    set /a ERRORS+=1
)
goto :eof

REM Function to check if a directory exists
:check_dir
if exist "%~1\" (
    echo [OK] %~1\
) else (
    echo [MISSING] %~1\
    set /a ERRORS+=1
)
goto :eof

echo Checking npm packages...
call npm list primereact >nul 2>&1
if %ERRORLEVEL% EQU 0 (echo [OK] npm: primereact) else (echo [MISSING] npm: primereact & set /a ERRORS+=1)

call npm list primeflex >nul 2>&1
if %ERRORLEVEL% EQU 0 (echo [OK] npm: primeflex) else (echo [MISSING] npm: primeflex & set /a ERRORS+=1)

call npm list primeicons >nul 2>&1
if %ERRORLEVEL% EQU 0 (echo [OK] npm: primeicons) else (echo [MISSING] npm: primeicons & set /a ERRORS+=1)

call npm list zod >nul 2>&1
if %ERRORLEVEL% EQU 0 (echo [OK] npm: zod) else (echo [MISSING] npm: zod & set /a ERRORS+=1)

call npm list react-hook-form >nul 2>&1
if %ERRORLEVEL% EQU 0 (echo [OK] npm: react-hook-form) else (echo [MISSING] npm: react-hook-form & set /a ERRORS+=1)

call npm list @hookform/resolvers >nul 2>&1
if %ERRORLEVEL% EQU 0 (echo [OK] npm: @hookform/resolvers) else (echo [MISSING] npm: @hookform/resolvers & set /a ERRORS+=1)

call npm list react-router-dom >nul 2>&1
if %ERRORLEVEL% EQU 0 (echo [OK] npm: react-router-dom) else (echo [MISSING] npm: react-router-dom & set /a ERRORS+=1)

echo.
echo Checking runtime directories...
call :check_dir "src\components\ui\prime\GenericGrid"
call :check_dir "src\components\ui\prime\EntityForm"
call :check_dir "src\utils"
call :check_dir "src\hooks"
call :check_dir "src\types"

echo.
echo Checking runtime files...
call :check_file "src\components\ui\prime\GenericGrid\SimpleGenericGrid.tsx"
call :check_file "src\components\ui\prime\GenericGrid\FilterSidebar.tsx"
call :check_file "src\components\ui\prime\GenericGrid\FilterControl.tsx"
call :check_file "src\components\ui\prime\GenericGrid\types.ts"
call :check_file "src\components\ui\prime\EntityForm\EntityPage.tsx"
call :check_file "src\components\ui\prime\EntityForm\BasePropertyEditor.tsx"
call :check_file "src\utils\schemaBasedColumnBuilder.tsx"
call :check_file "src\utils\zodSchemaHelper.tsx"
call :check_file "src\utils\masterDataCache.ts"
call :check_file "src\hooks\useCachedApiCall.ts"
call :check_file "src\hooks\usePermissions.ts"
call :check_file "src\types\roles.ts"

echo.
echo Checking configuration files...
call :check_file "vite.config.ts"
call :check_file "tsconfig.json"
call :check_file "package.json"

echo.
echo ==========================================
if %ERRORS% EQU 0 (
    echo All checks passed!
    echo ==========================================
    echo.
    echo Your project is ready for code generation.
    echo Run your generator to create components.
) else (
    echo Found %ERRORS% issue(s)
    echo ==========================================
    echo.
    echo Please fix the missing items before proceeding.
    echo See docs\INTEGRATION.md for help.
)
echo.
pause

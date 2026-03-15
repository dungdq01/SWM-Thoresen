@echo off
REM SWM-Thoresen Project Startup Script
REM This script starts PostgreSQL database, backend (NestJS), and frontend (Vite)

setlocal enabledelayedexpansion

echo.
echo ========================================
echo   SWM-Thoresen Project Startup
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if PostgreSQL is installed
psql --version >nul 2>&1
if errorlevel 1 (
    echo [WARNING] PostgreSQL command-line tools not found in PATH
    echo Please ensure PostgreSQL service is running manually
)

REM Get the project root directory
set PROJECT_ROOT=%~dp0
cd /d "%PROJECT_ROOT%"

echo [1/4] Starting PostgreSQL database...
REM Try to start PostgreSQL service (Windows)
sc query postgresql-x64-* >nul 2>&1
if errorlevel 1 (
    echo [WARNING] PostgreSQL service not found. Assuming it's already running or installed differently.
) else (
    net start postgresql-x64-15 >nul 2>&1
    if errorlevel 1 (
        echo [INFO] PostgreSQL service may already be running
    ) else (
        echo [OK] PostgreSQL service started
    )
)

timeout /t 3 /nobreak

echo.
echo [2/4] Installing/Updating backend dependencies...
cd /d "%PROJECT_ROOT%backend"
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install backend dependencies
    pause
    exit /b 1
)

echo.
echo [3/4] Installing/Updating frontend dependencies...
cd /d "%PROJECT_ROOT%frontend"
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo [4/4] Starting services...
echo.
echo ========================================
echo   Services will start in new windows
echo ========================================
echo.

REM Start backend in new window
echo Starting Backend (NestJS) on port 3000...
start "SWM Backend" cmd /k "cd /d "%PROJECT_ROOT%backend" && npm run start:dev"

REM Wait a bit for backend to start
timeout /t 5 /nobreak

REM Start frontend in new window
echo Starting Frontend (Vite) on port 8386...
start "SWM Frontend" cmd /k "cd /d "%PROJECT_ROOT%frontend" && npm run dev"

echo.
echo ========================================
echo   Project Started!
echo ========================================
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:8386
echo.
echo Close any window to stop that service.
echo.

pause

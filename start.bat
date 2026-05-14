@echo off
title Omni-Chats
color 0A

echo ================================================
echo   Omni-Chats — Starting up...
echo ================================================
echo.

:: Check Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed on this computer.
    echo.
    echo Please download and install Python from:
    echo   https://www.python.org/downloads/
    echo.
    echo Make sure to check "Add Python to PATH" during install.
    pause
    exit /b
)

echo [1/4] Python found.

:: Auto-update from GitHub if git is available
git --version >nul 2>&1
if errorlevel 1 (
    echo [2/4] Git not found — skipping auto-update.
    echo        Install Git from https://git-scm.com to enable auto-updates.
) else (
    echo [2/4] Checking for updates...
    git pull --quiet
    if errorlevel 1 (
        echo        Could not reach GitHub — continuing with local version.
    ) else (
        echo        Up to date.
    )
)

:: Install / update dependencies
echo [3/4] Installing dependencies...
pip install -r requirements.txt --quiet

echo [4/4] Starting Omni-Chats server...
echo.
echo ================================================
echo   App is running at: http://localhost:8000
echo   Opening your browser now...
echo   Press Ctrl+C here to stop the server.
echo ================================================
echo.

:: Open browser after a short delay
start /b cmd /c "timeout /t 2 >nul && start http://localhost:8000"

:: Start the server
python main.py

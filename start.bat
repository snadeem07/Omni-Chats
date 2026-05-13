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

echo [1/3] Python found.

:: Install dependencies
echo [2/3] Installing dependencies ^(first run only^)...
pip install -r requirements.txt --quiet

echo [3/3] Starting Omni-Chats server...
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

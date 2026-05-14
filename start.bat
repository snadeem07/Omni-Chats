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

:: ── Auto-update from GitHub using curl + PowerShell (no Git needed) ──────────
echo [2/4] Checking for updates from GitHub...

set ZIP_URL=https://github.com/snadeem07/Omni-Chats/archive/refs/heads/main.zip
set ZIP_FILE=%TEMP%\omni-chats-update.zip
set EXTRACT_DIR=%TEMP%\omni-chats-update

curl -s -L -o "%ZIP_FILE%" "%ZIP_URL%"
if errorlevel 1 (
    echo        Could not reach GitHub — continuing with local version.
    goto :install_deps
)

:: Extract ZIP and copy files over, preserving .env
powershell -NoProfile -Command ^
  "Remove-Item -Recurse -Force '%EXTRACT_DIR%' -ErrorAction SilentlyContinue; " ^
  "Expand-Archive -Path '%ZIP_FILE%' -DestinationPath '%EXTRACT_DIR%' -Force; " ^
  "$src = (Get-ChildItem '%EXTRACT_DIR%' -Directory | Select-Object -First 1).FullName; " ^
  "$dst = '%~dp0'; " ^
  "Get-ChildItem $src | Where-Object { $_.Name -ne '.env' } | ForEach-Object { " ^
  "  Copy-Item $_.FullName $dst -Recurse -Force " ^
  "}" >nul 2>&1

if errorlevel 1 (
    echo        Update extraction failed — continuing with local version.
) else (
    echo        Updated to latest version.
)

del "%ZIP_FILE%" >nul 2>&1

:install_deps
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

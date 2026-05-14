@echo off
title Omni-Chats Setup
color 0A

echo ================================================
echo   Omni-Chats — First-Time Setup
echo ================================================
echo.

:: Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed.
    echo.
    echo Please install Python from https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during install, then run this again.
    pause
    exit /b
)

:: Set install folder on Desktop
set DEST=%USERPROFILE%\Desktop\Omni-Chats

if exist "%DEST%" (
    echo Omni-Chats folder already exists at:
    echo   %DEST%
    echo.
    echo Run start.bat inside that folder instead.
    echo Or open the folder in VS Code: code "%DEST%"
    pause
    exit /b
)

echo Downloading Omni-Chats...
curl -s -L -o "%TEMP%\omni-chats.zip" "https://github.com/snadeem07/Omni-Chats/archive/refs/heads/main.zip"
if errorlevel 1 (
    echo ERROR: Could not download. Check your internet connection.
    pause
    exit /b
)

echo Extracting files...
powershell -NoProfile -Command ^
  "Expand-Archive -Path '%TEMP%\omni-chats.zip' -DestinationPath '%TEMP%\omni-chats-extracted' -Force; " ^
  "$src = (Get-ChildItem '%TEMP%\omni-chats-extracted' -Directory | Select-Object -First 1).FullName; " ^
  "Copy-Item $src '%DEST%' -Recurse -Force"
del "%TEMP%\omni-chats.zip" >nul 2>&1

:: Create .env from example
if not exist "%DEST%\.env" (
    copy "%DEST%\.env.example" "%DEST%\.env" >nul
)

echo.
echo ================================================
echo   Setup complete!  Folder: %DEST%
echo.
echo   NEXT STEP: Add your API keys to .env
echo   then press F5 in VS Code  (or run start.bat)
echo ================================================
echo.

:: Open in VS Code if installed, otherwise open folder + notepad
where code >nul 2>&1
if errorlevel 1 (
    explorer "%DEST%"
    notepad "%DEST%\.env"
) else (
    echo Opening in VS Code...
    code "%DEST%"
    notepad "%DEST%\.env"
)

pause

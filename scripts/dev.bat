@echo off
chcp 65001 >nul

REM YouTube Bulk Downloader Development Script for Windows
echo 🚀 Starting YouTube Bulk Downloader in development mode...

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    pause
    exit /b 1
)

REM Check Node.js version
for /f "tokens=1,2 delims=." %%a in ('node --version') do set NODE_VERSION=%%a
set NODE_VERSION=%NODE_VERSION:~1%
if %NODE_VERSION% LSS 18 (
    echo ❌ Node.js version 18+ is required. Current version: 
    node --version
    pause
    exit /b 1
)

REM Check if yt-dlp is installed
yt-dlp --version >nul 2>&1
if errorlevel 1 (
    echo ⚠️  yt-dlp is not installed. Please install yt-dlp first:
    echo    pip install yt-dlp
    echo    or visit: https://github.com/yt-dlp/yt-dlp#installation
    echo.
    echo Continuing anyway, but downloads may fail...
)

REM Create downloads directory if it doesn't exist
if not exist "downloads" mkdir downloads

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Set environment and start the app
echo 🌍 Starting development server...
echo 📍 App will be available at: http://localhost:5000
echo 📁 Downloads will be saved to: ./downloads/
echo.
echo Press Ctrl+C to stop the server
echo.

set NODE_ENV=development
npx tsx server/index.ts

pause 
#!/bin/bash

# YouTube Bulk Downloader Development Script
echo "🚀 Starting YouTube Bulk Downloader in development mode..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

# Check if yt-dlp is installed
if ! command -v yt-dlp &> /dev/null; then
    echo "⚠️  yt-dlp is not installed. Please install yt-dlp first:"
    echo "   pip install yt-dlp"
    echo "   or visit: https://github.com/yt-dlp/yt-dlp#installation"
    echo ""
    echo "Continuing anyway, but downloads may fail..."
fi

# Create downloads directory if it doesn't exist
mkdir -p downloads

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Set environment and start the app
echo "🌍 Starting development server..."
echo "📍 App will be available at: http://localhost:5000"
echo "📁 Downloads will be saved to: ./downloads/"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

NODE_ENV=development npx tsx server/index.ts 
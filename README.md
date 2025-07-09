## 🔴 YouTube Videos Bulk Downloader

A beautiful, modern web app to download multiple YouTube videos in bulk with real-time progress, animated backgrounds, and quality selection (720p or 480p). Built with React, TypeScript, Express, and Tailwind CSS.

---

## ✨ Features

- **Bulk Download**: Paste multiple YouTube video URLs and download them all at once.
- **Quality Selection**: Choose between 720p (High Quality, up to 720p) and 480p (Recommended, up to 480p).
- **Real-Time Progress**: See live download progress for each video.
- **Animated Backgrounds**: Lively, modern gradient blobs for a premium feel.
- **Beautiful UI**: Clean, accessible, mobile-friendly, and responsive design.
- **Download as ZIP**: Get all completed videos in a single ZIP file.
- **Individual Downloads**: Download files one by one with a modal interface.
- **Error Handling**: Clear feedback for failed downloads or invalid URLs.
- **Dark Mode**: Elegant, accessible color scheme with gradients.

---

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Radix UI, Wouter
- **Backend**: Express, TypeScript, ws (WebSocket), yt-dlp
- **Database**: Local file storage (no DB setup required)
- **Other**: Drizzle ORM, Zod, modern build tooling (Vite, tsx)

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) installed and available in your PATH
- (Windows) Use PowerShell or Git Bash for best compatibility

### 1. Clone the Repository
```sh
git clone https://github.com/nikunjraykundlia/YoutubeBulkDownloader.git
cd YoutubeBulkDownloader
```

### 2. Install Dependencies
```sh
npm install
```

### 3. Start the App (Development)
#### On Windows (PowerShell):
```sh
$env:NODE_ENV="development"; npx tsx server/index.ts
```
#### On Mac/Linux:
```sh
NODE_ENV=development npx tsx server/index.ts
```

The app will be available at [http://localhost:5000](http://localhost:5000)

---

## 📝 Usage Guide

1. **Paste YouTube video URLs** (one per line) in the input box.
2. **Select Video Quality**: 720p (High Quality, up to 720p) or 480p (Recommended, up to 480p).
   - If the selected quality is not available, the app will download the best available below that quality.
3. **Set Max Concurrent Downloads** (default: 5).
4. Click **Start Downloads**.
5. Watch real-time progress. Download completed files individually or as a ZIP.
6. Use the beautiful modal to download files one by one if needed.

---

## 🧩 Troubleshooting

- **yt-dlp not found**: Make sure `yt-dlp` is installed and in your system PATH.
- **Port 5000 in use**: Stop other apps using this port or change the port in `server/index.ts`.
- **No 720p available**: Some videos are only available in 480p or lower; the app will download the best available up to your selected quality.
- **Browser blocks multiple downloads**: Use the ZIP download for bulk, or use the modal for individual downloads.
- **Permission errors on Windows**: Run your terminal as Administrator if you encounter file access issues.

---

## ❓ FAQ

**Q: Does the app always download exactly 720p or 480p?**
- A: The app downloads the best available quality up to your selection. If 720p is not available, it will download 480p or the next best below 720p.

**Q: Can I use this for YouTube Shorts?**
- A: This app is optimized for regular YouTube video URLs. YouTube Shorts may work but are not the primary focus.

**Q: Where are my downloaded files?**
- A: Files are saved in the `downloads/` folder in your project directory and are also available for download via the web UI.

**Q: How do I update yt-dlp?**
- A: Run `python -m pip install -U yt-dlp` or follow the [yt-dlp install guide](https://github.com/yt-dlp/yt-dlp#installation).

---

## 💡 Credits

- UI inspired by modern SaaS dashboards
- Uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) for video downloads
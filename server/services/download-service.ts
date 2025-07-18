import { DownloadItem, DownloadRequest } from "@shared/schema";
import { storage } from "../storage";
import { WebSocket } from "ws";
import path from "path";
import fs from "fs-extra";
import { spawn } from "child_process";

export class DownloadService {
  private activeDownloads: Map<string, boolean> = new Map();
  private downloadQueue: string[] = [];
  private maxConcurrency: number = 5;
  private clients: Set<WebSocket> = new Set();
  private downloadsDir: string;
  private videoQuality: string = '480p';

  constructor() {
    this.downloadsDir = path.join(process.cwd(), 'downloads');
    // Ensure downloads directory exists
    fs.ensureDirSync(this.downloadsDir);
  }

  setMaxConcurrency(concurrency: number) {
    this.maxConcurrency = concurrency;
  }

  addClient(client: WebSocket) {
    this.clients.add(client);
  }

  removeClient(client: WebSocket) {
    this.clients.delete(client);
  }

  private broadcast(message: any) {
    const data = JSON.stringify(message);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  async startBulkDownload(request: DownloadRequest): Promise<void> {
    this.setMaxConcurrency(request.concurrency);

    // Create download items for each URL
    const downloadItems: DownloadItem[] = [];
    for (const url of request.urls) {
      const item = await storage.createDownloadItem({
        url,
        status: 'queued',
        progress: 0,
      });
      downloadItems.push(item);
      this.downloadQueue.push(item.id);
    }

    // Store quality preference (in a real app, this would be per-request)
    this.videoQuality = request.quality || '480p';

    // Start processing queue
    this.processQueue();

    // Broadcast initial state
    this.broadcast({
      type: 'download_started',
      items: downloadItems,
    });
  }

  private async processQueue() {
    const activeCount = this.activeDownloads.size;
    const availableSlots = this.maxConcurrency - activeCount;

    for (let i = 0; i < availableSlots && this.downloadQueue.length > 0; i++) {
      const itemId = this.downloadQueue.shift();
      if (itemId) {
        this.processDownload(itemId);
      }
    }
  }

  private async processDownload(itemId: string) {
    if (this.activeDownloads.has(itemId)) {
      return;
    }

    this.activeDownloads.set(itemId, true);

    try {
      const item = await storage.getDownloadItem(itemId);
      if (!item) return;

      // Update status to downloading
      await storage.updateDownloadItem(itemId, {
        status: 'downloading',
        progress: 0,
      });

      this.broadcast({
        type: 'download_progress',
        itemId,
        status: 'downloading',
        progress: 0,
      });

      // Download actual video with progress updates
      await this.downloadVideo(itemId, item.url);

      // Mark as completed
      await storage.updateDownloadItem(itemId, {
        status: 'completed',
        progress: 100,
      });

      this.broadcast({
        type: 'download_completed',
        itemId,
        status: 'completed',
        progress: 100,
      });

    } catch (error) {
      // Mark as failed
      await storage.updateDownloadItem(itemId, {
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      this.broadcast({
        type: 'download_failed',
        itemId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.activeDownloads.delete(itemId);
      // Continue processing queue
      this.processQueue();
    }
  }

  private async downloadVideo(itemId: string, url: string): Promise<void> {
    // Validate YouTube URL
    if (!this.isValidYouTubeUrl(url)) {
      throw new Error('Invalid YouTube URL');
    }

    // Get quality format string
    const qualityFormat = this.getQualityFormat(this.videoQuality);
    
    // Try multiple download strategies
    const strategies = [
      {
        name: 'Strategy 1: Quality-based MP4',
        args: [
          '--format', qualityFormat,
          '--output', path.join(this.downloadsDir, `${itemId}_%(title)s.%(ext)s`),
          '--newline',
          '--no-playlist',
          '--retries', '3',
          '--fragment-retries', '3',
          '--socket-timeout', '20',
          '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          url
        ]
      },
      {
        name: 'Strategy 2: Android client with quality',
        args: [
          '--format', qualityFormat,
          '--output', path.join(this.downloadsDir, `${itemId}_%(title)s.%(ext)s`),
          '--newline',
          '--no-playlist',
          '--retries', '5',
          '--fragment-retries', '5',
          '--socket-timeout', '30',
          '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          '--add-header', 'Accept-Language:en-US,en;q=0.9',
          '--extractor-args', 'youtube:player_client=android',
          url
        ]
      },
      {
        name: 'Strategy 3: Fallback with alternative client',
        args: [
          '--format', 'worst/best',
          '--output', path.join(this.downloadsDir, `${itemId}_%(title)s.%(ext)s`),
          '--newline',
          '--no-playlist',
          '--retries', '10',
          '--socket-timeout', '60',
          '--user-agent', 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          '--extractor-args', 'youtube:player_client=android,web',
          url
        ]
      }
    ];

    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      console.log(`Attempting ${strategy.name} for ${url}`);
      
      try {
        await this.attemptDownload(itemId, url, strategy.args);
        console.log(`${strategy.name} succeeded for ${url}`);
        return;
      } catch (error) {
        console.log(`${strategy.name} failed for ${url}: ${error}`);
        if (i === strategies.length - 1) {
          throw error; // Re-throw the last error if all strategies fail
        }
        // Wait before trying next strategy
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }

  private async attemptDownload(itemId: string, url: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      // Determine yt-dlp path based on environment and availability
      let ytdlpPath: string;
      let spawnArgs: string[];
      
      if (process.env.NODE_ENV === 'production') {
        // In production, try to use the local yt-dlp binary first
        const localYtDlpPath = path.join(process.cwd(), 'yt-dlp');
        const distYtDlpPath = path.join(process.cwd(), 'dist', 'yt-dlp');
        
        // On Windows, also check for .exe versions
        const localYtDlpExePath = process.platform === 'win32' ? path.join(process.cwd(), 'yt-dlp.exe') : null;
        const distYtDlpExePath = process.platform === 'win32' ? path.join(process.cwd(), 'dist', 'yt-dlp.exe') : null;
        
        if (fs.existsSync(distYtDlpPath)) {
          ytdlpPath = distYtDlpPath;
          console.log('Using yt-dlp binary from dist folder in production');
        } else if (distYtDlpExePath && fs.existsSync(distYtDlpExePath)) {
          ytdlpPath = distYtDlpExePath;
          console.log('Using yt-dlp.exe from dist folder in production');
        } else if (fs.existsSync(localYtDlpPath)) {
          ytdlpPath = localYtDlpPath;
          console.log('Using local yt-dlp binary in production');
        } else if (localYtDlpExePath && fs.existsSync(localYtDlpExePath)) {
          ytdlpPath = localYtDlpExePath;
          console.log('Using local yt-dlp.exe in production');
        } else {
          // Fallback to system yt-dlp if local binary doesn't exist
          ytdlpPath = 'yt-dlp';
          console.log('Using system yt-dlp in production (local binary not found)');
        }
        spawnArgs = args;
      } else {
        // In development, prefer local binary if it exists
        const localYtDlpPath = path.join(process.cwd(), 'yt-dlp');
        const localYtDlpExePath = process.platform === 'win32' ? path.join(process.cwd(), 'yt-dlp.exe') : null;
        
        if (fs.existsSync(localYtDlpPath)) {
          ytdlpPath = localYtDlpPath;
          console.log('Using local yt-dlp binary in development');
        } else if (localYtDlpExePath && fs.existsSync(localYtDlpExePath)) {
          ytdlpPath = localYtDlpExePath;
          console.log('Using local yt-dlp.exe in development');
        } else {
          ytdlpPath = 'yt-dlp';
          console.log('Using system yt-dlp in development (local binary not found)');
        }
        spawnArgs = args;
      }
      
      // Handle Windows execution
      if (process.platform === 'win32') {
        // On Windows, .exe files can be executed directly
        if (ytdlpPath.endsWith('.exe')) {
          // .exe files can be executed directly on Windows
          console.log('Using yt-dlp.exe directly on Windows');
        } else if (ytdlpPath !== 'yt-dlp' && !ytdlpPath.endsWith('.exe')) {
          // For non-.exe binaries, we need to use 'node' to execute them
          spawnArgs = [ytdlpPath, ...args];
          ytdlpPath = 'node';
          console.log('Using node to execute yt-dlp on Windows');
        } else {
          // For system yt-dlp, try to use it directly
          console.log('Using system yt-dlp on Windows');
        }
      }
      
      console.log(`Spawning yt-dlp with path: ${ytdlpPath}`);
      console.log(`Spawn args: ${JSON.stringify(spawnArgs)}`);
      const ytdlp = spawn(ytdlpPath, spawnArgs);

      let lastProgress = 0;
      let videoTitle = '';
      let videoSize = '';
      let errorMessages: string[] = [];

      ytdlp.stdout.on('data', (data) => {
        const output = data.toString();
        console.log(`yt-dlp stdout: ${output}`);
        
        // Extract title from various possible formats
        const titleMatches = [
          output.match(/\[info\] ([^:]+): Downloading/),
          output.match(/\[download\] Destination: .*_(.+)\./),
          output.match(/\[youtube\] \w+: Downloading.*webpage/),
        ];
        
        for (const match of titleMatches) {
          if (match && match[1]) {
            videoTitle = match[1].trim();
            break;
          }
        }

        // Extract progress with multiple patterns
        const progressMatches = [
          output.match(/\[download\]\s+(\d+\.?\d*)%/),
          output.match(/(\d+\.?\d*)%\s+of/),
        ];
        
        for (const match of progressMatches) {
          if (match && match[1]) {
            const progress = Math.round(parseFloat(match[1]));
            if (progress !== lastProgress && progress >= 0 && progress <= 100) {
              lastProgress = progress;
              
              // Update progress in storage and broadcast
              storage.updateDownloadItem(itemId, {
                status: 'downloading',
                progress,
                title: videoTitle || undefined,
              });

              this.broadcast({
                type: 'download_progress',
                itemId,
                status: 'downloading',
                progress,
              });
            }
            break;
          }
        }

        // Extract file size
        const sizeMatch = output.match(/\[download\]\s+(\d+\.?\d*\s*[KMGT]?B)/);
        if (sizeMatch) {
          videoSize = sizeMatch[1];
        }
      });

      ytdlp.stderr.on('data', (data) => {
        const error = data.toString();
        console.error(`yt-dlp stderr: ${error}`);
        errorMessages.push(error);
      });

      ytdlp.on('close', async (code) => {
        console.log(`yt-dlp process exited with code: ${code}`);
        
        if (code === 0) {
          try {
            // Find the downloaded file
            const files = await fs.readdir(this.downloadsDir);
            const downloadedFile = files.find(file => file.startsWith(itemId + '_'));
            
            if (downloadedFile) {
              const filePath = path.join(this.downloadsDir, downloadedFile);
              const stats = await fs.stat(filePath);
              const fileSize = this.formatFileSize(stats.size);
              
              // Extract clean title from filename
              const cleanTitle = downloadedFile.replace(itemId + '_', '').replace(/\.[^/.]+$/, '');
              
              // Update final item info
              await storage.updateDownloadItem(itemId, {
                title: cleanTitle,
                size: fileSize,
              });
              
              resolve();
            } else {
              reject(new Error('Downloaded file not found'));
            }
          } catch (error) {
            reject(new Error(`File processing error: ${error}`));
          }
        } else {
          // Enhanced error handling with specific error codes
          let errorMessage = `yt-dlp exited with code ${code}`;
          
          if (errorMessages.length > 0) {
            const lastError = errorMessages[errorMessages.length - 1];
            if (lastError.includes('Video unavailable')) {
              errorMessage = 'Video is unavailable or private';
            } else if (lastError.includes('Sign in to confirm')) {
              errorMessage = 'Video requires age verification';
            } else if (lastError.includes('This video is not available')) {
              errorMessage = 'Video is not available in your region';
            } else if (lastError.includes('HTTP Error 429')) {
              errorMessage = 'Rate limited by YouTube. Please try again later';
            } else if (lastError.includes('HTTP Error 403')) {
              errorMessage = 'Access denied by YouTube. Trying alternative method...';
            } else if (lastError.includes('nsig extraction failed')) {
              errorMessage = 'YouTube anti-bot protection detected. Trying alternative method...';
            } else {
              errorMessage = `Download failed: ${lastError.trim()}`;
            }
          }
          
          reject(new Error(errorMessage));
        }
      });

      ytdlp.on('error', (error) => {
        console.error(`Failed to spawn yt-dlp: ${error.message}`);
        console.error(`yt-dlp path attempted: ${ytdlpPath}`);
        console.error(`Current working directory: ${process.cwd()}`);
        console.error(`Environment: ${process.env.NODE_ENV}`);
        
        // Check if the binary exists
        if (fs.existsSync(ytdlpPath)) {
          console.error(`Binary exists at ${ytdlpPath}`);
          // Check if it's executable
          try {
            fs.accessSync(ytdlpPath, fs.constants.X_OK);
            console.error('Binary is executable');
          } catch (accessError) {
            console.error('Binary is not executable:', accessError);
          }
        } else {
          console.error(`Binary does not exist at ${ytdlpPath}`);
        }
        
        reject(new Error(`Failed to spawn yt-dlp: ${error.message}`));
      });
    });
  }

  private getQualityFormat(quality: string): string {
    switch (quality) {
      case '720p':
        return 'best[height<=720]/best[ext=mp4]/best';
      case '480p':
        return 'best[height<=480]/best[ext=mp4]/best';
      case '360p':
        return 'best[height<=360]/best[ext=mp4]/best';
      case 'worst':
        return 'worst[ext=mp4]/worst';
      case 'best':
        return 'best[ext=mp4]/best';
      default:
        return 'best[height<=480]/best[ext=mp4]/best';
    }
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  private extractVideoTitle(url: string): string {
    const videoId = url.split('/').pop()?.split('?')[0] || 'unknown';
    return `YouTube_Short_${videoId}`;
  }

  private isValidYouTubeUrl(url: string): boolean {
    // Support all YouTube URL formats:
    // - youtube.com/watch?v=VIDEO_ID
    // - youtube.com/shorts/VIDEO_ID
    // - youtu.be/VIDEO_ID
    // - youtube.com/embed/VIDEO_ID
    // - youtube.com/v/VIDEO_ID
    const youtubeRegex = /^https?:\/\/(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)/;
    return youtubeRegex.test(url);
  }

  getDownloadsDir(): string {
    return this.downloadsDir;
  }

  async retryDownload(itemId: string): Promise<void> {
    const item = await storage.getDownloadItem(itemId);
    if (!item) return;

    // Add a small delay before retrying to avoid rapid consecutive failures
    await new Promise(resolve => setTimeout(resolve, 2000));

    await storage.updateDownloadItem(itemId, {
      status: 'queued',
      progress: 0,
      error: undefined,
    });

    this.downloadQueue.push(itemId);
    this.processQueue();
  }
}

export const downloadService = new DownloadService();
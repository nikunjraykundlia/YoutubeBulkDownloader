import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { downloadService } from "./services/download-service";
import { downloadRequestSchema } from "@shared/schema";
import { z } from "zod";
import path from "path";
import fs from "fs-extra";
import archiver from "archiver";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    downloadService.addClient(ws);

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'retry_download') {
          await downloadService.retryDownload(data.itemId);
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      downloadService.removeClient(ws);
    });
  });

  // REST API routes
  app.post('/api/download/bulk', async (req, res) => {
    try {
      const request = downloadRequestSchema.parse(req.body);
      await downloadService.startBulkDownload(request);
      res.json({ success: true, message: 'Download started' });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  app.get('/api/downloads', async (req, res) => {
    try {
      const downloads = await storage.getAllDownloadItems();
      res.json(downloads);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch downloads' });
    }
  });

  app.get('/api/downloads/stats', async (req, res) => {
    try {
      const stats = await storage.getDownloadStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch stats' });
    }
  });

  app.delete('/api/downloads', async (req, res) => {
    try {
      await storage.clearAllDownloadItems();
      res.json({ success: true, message: 'All downloads cleared' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear downloads' });
    }
  });

  app.delete('/api/downloads/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteDownloadItem(id);
      if (deleted) {
        res.json({ success: true, message: 'Download deleted' });
      } else {
        res.status(404).json({ error: 'Download not found' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete download' });
    }
  });

  app.delete('/api/downloads', async (req, res) => {
    try {
      await storage.clearAllDownloadItems();
      res.json({ success: true, message: 'All downloads cleared' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear downloads' });
    }
  });

  // Individual file download endpoint
  app.get('/api/downloads/:id/file', async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.getDownloadItem(id);
      
      if (!item || item.status !== 'completed') {
        return res.status(404).json({ error: 'Download not found or not completed' });
      }

      const downloadsDir = downloadService.getDownloadsDir();
      const files = await fs.readdir(downloadsDir);
      const videoFile = files.find(f => f.startsWith(id));
      
      if (!videoFile) {
        return res.status(404).json({ error: 'File not found' });
      }

      const filepath = path.join(downloadsDir, videoFile);
      const fileExt = path.extname(videoFile);
      // Sanitize filename to prevent header injection and encoding issues
      const sanitizedTitle = (item.title || 'video')
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
        .replace(/[^\x20-\x7E]/g, '_')
        .substring(0, 100);
      const filename = `${sanitizedTitle}${fileExt}`;
      
      // Use proper header encoding for filenames with special characters
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
      res.setHeader('Content-Type', fileExt === '.mp4' ? 'video/mp4' : 'application/octet-stream');
      
      const fileStream = fs.createReadStream(filepath);
      fileStream.pipe(res);
    } catch (error) {
      console.error('File download error:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  });

  // Zip file download endpoint
  app.get('/api/downloads/zip', async (req, res) => {
    try {
      const downloads = await storage.getAllDownloadItems();
      const completedDownloads = downloads.filter(item => item.status === 'completed');
      
      if (completedDownloads.length === 0) {
        return res.status(404).json({ error: 'No completed downloads found' });
      }

      const downloadsDir = downloadService.getDownloadsDir();
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="youtube-shorts-downloads.zip"');
      
      archive.pipe(res);

      // Add each completed download to the zip
      for (const item of completedDownloads) {
        const files = await fs.readdir(downloadsDir);
        const videoFile = files.find(f => f.startsWith(item.id));
        
        if (videoFile) {
          const filepath = path.join(downloadsDir, videoFile);
          const fileExt = path.extname(videoFile);
          const filename = `${item.title || 'video'}${fileExt}`;
          archive.file(filepath, { name: filename });
        }
      }

      archive.finalize();
    } catch (error) {
      console.error('Zip download error:', error);
      res.status(500).json({ error: 'Failed to create zip file' });
    }
  });

  return httpServer;
}

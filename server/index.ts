import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import fs from "fs-extra";
import path from "path";
import { spawn } from "child_process";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint for Render
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check if yt-dlp is available
    let ytdlpStatus = 'unknown';
    let ytdlpPath = '';
    
    // Check for yt-dlp in various locations
    const possiblePaths = [
      path.join(process.cwd(), 'dist', 'yt-dlp'),
      path.join(process.cwd(), 'yt-dlp'),
      'yt-dlp'
    ];
    
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        ytdlpPath = testPath;
        break;
      }
    }
    
    if (ytdlpPath) {
      // Test if yt-dlp is executable
      try {
        const testProcess = spawn(ytdlpPath, ['--version'], { timeout: 5000 });
        await new Promise((resolve, reject) => {
          testProcess.on('close', (code) => {
            if (code === 0) {
              ytdlpStatus = 'available';
              resolve(true);
            } else {
              ytdlpStatus = 'error';
              reject(new Error(`yt-dlp exited with code ${code}`));
            }
          });
          testProcess.on('error', () => {
            ytdlpStatus = 'error';
            reject(new Error('yt-dlp spawn failed'));
          });
        });
      } catch (error) {
        ytdlpStatus = 'error';
      }
    } else {
      ytdlpStatus = 'not_found';
    }
    
    res.status(200).json({ 
      status: ytdlpStatus === 'available' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      ytdlp: {
        status: ytdlpStatus,
        path: ytdlpPath || 'not_found'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use Render's PORT environment variable or fallback to 5000
  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0"
  }, () => {
    log(`🚀 YouTube Bulk Downloader server running on port ${port}`);
    log(`📁 Downloads directory: ${process.cwd()}/downloads`);
    log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
})();

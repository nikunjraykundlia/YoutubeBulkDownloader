# 🚀 Deployment Guide for YouTube Bulk Downloader

This guide will help you deploy the YouTube Bulk Downloader to Render, a modern cloud platform that's perfect for this type of application.

## 📋 Prerequisites

- A GitHub account with this repository
- A Render account (free tier available)
- Basic understanding of web deployment

## 🎯 Quick Deploy (Recommended)

### Option 1: One-Click Deploy with render.yaml

1. **Fork this repository** to your GitHub account
2. **Sign up/Login** to [Render](https://render.com)
3. **Click "New +"** and select "Blueprint"
4. **Connect your GitHub account** and select this repository
5. **Render will automatically detect** the `render.yaml` file and configure everything
6. **Click "Apply"** and wait for deployment

### Option 2: Manual Deploy

1. **Fork this repository** to your GitHub account
2. **Sign up/Login** to [Render](https://render.com)
3. **Click "New +"** and select "Web Service"
4. **Connect your GitHub account** and select this repository
5. **Configure the service:**
   - **Name**: `youtube-bulk-downloader` (or your preferred name)
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Starter` (free tier)

6. **Add Environment Variables:**
   - `NODE_ENV`: `production`
   - `PORT`: `10000`

7. **Click "Create Web Service"**

## ⚙️ Configuration Details

### Environment Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Sets production mode |
| `PORT` | `10000` | Port for the application (Render will override this) |

### Build Process

The deployment process includes:

1. **Install Dependencies**: `npm install`
2. **Build Frontend**: Vite builds the React app
3. **Build Backend**: esbuild bundles the Express server
4. **Create Downloads Directory**: Ensures storage is available
5. **Start Server**: Runs the production server

### File Structure After Build

```
dist/
├── index.js          # Bundled Express server
├── public/           # Built React app
│   ├── index.html
│   ├── assets/
│   └── ...
└── services/         # Server services
```

## 🔧 Advanced Configuration

### Custom Domain (Optional)

1. Go to your service settings in Render
2. Click "Custom Domains"
3. Add your domain and configure DNS

### Environment-Specific Settings

You can add more environment variables for customization:

```bash
# Optional: Database URL (if you want to use PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:port/db

# Optional: Session secret
SESSION_SECRET=your-secret-key

# Optional: Max concurrent downloads
MAX_CONCURRENCY=5
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Build Fails
**Error**: `Command failed: npm run build`

**Solution**: 
- Check that all dependencies are in `package.json`
- Ensure Node.js version is 18+ in Render settings
- Check build logs for specific errors

#### 2. yt-dlp Not Found
**Error**: `yt-dlp: command not found`

**Solution**: 
- Render automatically installs yt-dlp in production
- The app is configured to use system yt-dlp
- If issues persist, check the download service logs

#### 3. Port Issues
**Error**: `EADDRINUSE`

**Solution**:
- Render automatically sets the PORT environment variable
- The app is configured to use `process.env.PORT || 5000`
- No manual port configuration needed

#### 4. File Downloads Not Working
**Error**: Files not downloading or 404 errors

**Solution**:
- Check that the downloads directory exists
- Verify file permissions in Render
- Check the storage service logs

### Health Check

The app includes a health check endpoint at `/health` that returns:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### Logs and Monitoring

1. **View Logs**: Go to your service in Render and click "Logs"
2. **Real-time Logs**: Use the "Live" tab for real-time monitoring
3. **Error Tracking**: Check the "Events" tab for deployment issues

## 🔒 Security Considerations

### Production Security

- ✅ Environment variables for sensitive data
- ✅ Input validation on all endpoints
- ✅ Rate limiting (can be added)
- ✅ CORS configuration (if needed)
- ✅ File upload restrictions

### Recommended Additions

Consider adding these security features:

```typescript
// Rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
```

## 📈 Performance Optimization

### Render-Specific Optimizations

1. **Disk Storage**: The app uses Render's disk storage for downloads
2. **Memory Management**: In-memory storage for download tracking
3. **Concurrent Downloads**: Configurable concurrency limits
4. **File Cleanup**: Automatic cleanup of old downloads

### Monitoring Performance

- **CPU Usage**: Monitor in Render dashboard
- **Memory Usage**: Check logs for memory leaks
- **Response Times**: Use the built-in logging
- **Download Speeds**: Track in the UI

## 🔄 Updates and Maintenance

### Updating the App

1. **Push changes** to your GitHub repository
2. **Render automatically deploys** new versions
3. **Monitor deployment** in the Render dashboard
4. **Check health** after deployment

### Backup Strategy

- **Code**: Backed up in GitHub
- **Downloads**: Stored on Render's persistent disk
- **Configuration**: Environment variables in Render

## 🆘 Support

### Getting Help

1. **Check Logs**: Always check Render logs first
2. **GitHub Issues**: Report bugs in the repository
3. **Render Support**: Contact Render for platform issues
4. **Community**: Check the project's community channels

### Useful Commands

```bash
# Check app status
curl https://your-app.onrender.com/health

# View recent logs
# (Use Render dashboard)

# Test download endpoint
curl -X POST https://your-app.onrender.com/api/download/bulk \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://youtube.com/watch?v=test"],"quality":"480p"}'
```

## 🎉 Success!

Once deployed, your YouTube Bulk Downloader will be available at:
`https://your-app-name.onrender.com`

The app includes:
- ✅ Real-time download progress
- ✅ Concurrent downloads
- ✅ Quality selection
- ✅ ZIP downloads
- ✅ Beautiful UI
- ✅ Mobile responsive
- ✅ WebSocket updates

Happy downloading! 🎬📥 
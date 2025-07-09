import { writeFileSync, chmodSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { platform } from 'os';

// Use different URLs for different platforms
const YT_DLP_URLS = {
  win32: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe',
  default: 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp'
};

async function downloadYtDlp() {
  try {
    const currentPlatform = platform();
    const ytDlpPath = currentPlatform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp';
    const downloadUrl = YT_DLP_URLS[currentPlatform] || YT_DLP_URLS.default;
    
    console.log(`Platform: ${currentPlatform}`);
    console.log(`Download URL: ${downloadUrl}`);
    console.log(`Target file: ${ytDlpPath}`);
    
    if (existsSync(ytDlpPath)) {
      console.log(`${ytDlpPath} already exists, skipping download`);
      
      // Make sure it's executable (Unix-like systems only)
      if (currentPlatform !== 'win32') {
        try {
          chmodSync(ytDlpPath, 0o755);
          console.log('Made existing yt-dlp executable');
        } catch (chmodError) {
          console.warn('Warning: Could not make yt-dlp executable:', chmodError.message);
        }
      }
      return;
    }
    
    console.log('Downloading yt-dlp...');
    
    // Use curl if available, otherwise use Node.js fetch
    let ytDlpContent;
    
    try {
      // Try using curl first (works on Unix-like systems and Windows with curl installed)
      ytDlpContent = execSync(`curl -L "${downloadUrl}"`, { encoding: 'buffer' });
      console.log('Downloaded using curl');
    } catch (curlError) {
      console.log('curl not available, using Node.js fetch...');
      
      // Fallback to Node.js fetch
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download yt-dlp: ${response.status} ${response.statusText}`);
      }
      ytDlpContent = Buffer.from(await response.arrayBuffer());
    }
    
    // Write the file with appropriate name
    writeFileSync(ytDlpPath, ytDlpContent);
    console.log(`${ytDlpPath} downloaded successfully`);
    
    // Make executable on Unix-like systems
    if (currentPlatform !== 'win32') {
      try {
        chmodSync(ytDlpPath, 0o755);
        console.log('Made yt-dlp executable');
      } catch (chmodError) {
        console.warn('Warning: Could not make yt-dlp executable:', chmodError.message);
      }
    } else {
      console.log('On Windows, yt-dlp.exe will be executed directly');
    }
    
  } catch (error) {
    console.error('Error downloading yt-dlp:', error.message);
    process.exit(1);
  }
}

downloadYtDlp(); 
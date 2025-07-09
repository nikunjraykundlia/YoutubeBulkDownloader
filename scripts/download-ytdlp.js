import { writeFileSync, chmodSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { platform } from 'os';

const YT_DLP_URL = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

async function downloadYtDlp() {
  try {
    // Check if yt-dlp already exists
    if (existsSync('yt-dlp')) {
      console.log('yt-dlp already exists, skipping download');
      
      // Make sure it's executable
      if (platform() !== 'win32') {
        try {
          chmodSync('yt-dlp', 0o755);
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
      ytDlpContent = execSync(`curl -L "${YT_DLP_URL}"`, { encoding: 'buffer' });
      console.log('Downloaded using curl');
    } catch (curlError) {
      console.log('curl not available, using Node.js fetch...');
      
      // Fallback to Node.js fetch
      const response = await fetch(YT_DLP_URL);
      if (!response.ok) {
        throw new Error(`Failed to download yt-dlp: ${response.status} ${response.statusText}`);
      }
      ytDlpContent = Buffer.from(await response.arrayBuffer());
    }
    
    // Write the file
    writeFileSync('yt-dlp', ytDlpContent);
    console.log('yt-dlp downloaded successfully');
    
    // Make executable on Unix-like systems
    if (platform() !== 'win32') {
      try {
        chmodSync('yt-dlp', 0o755);
        console.log('Made yt-dlp executable');
      } catch (chmodError) {
        console.warn('Warning: Could not make yt-dlp executable:', chmodError.message);
      }
    } else {
      console.log('On Windows, yt-dlp will be executed via node');
    }
    
  } catch (error) {
    console.error('Error downloading yt-dlp:', error.message);
    process.exit(1);
  }
}

downloadYtDlp(); 
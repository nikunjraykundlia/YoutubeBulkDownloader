import { unlinkSync, existsSync } from 'fs';
import { platform } from 'os';

function cleanupYtDlp() {
  console.log('🧹 Cleaning up yt-dlp files...');
  
  const currentPlatform = platform();
  const filesToRemove = [
    'yt-dlp',
    'yt-dlp.exe',
    'dist/yt-dlp',
    'dist/yt-dlp.exe'
  ];
  
  let removedCount = 0;
  
  for (const file of filesToRemove) {
    if (existsSync(file)) {
      try {
        unlinkSync(file);
        console.log(`✅ Removed: ${file}`);
        removedCount++;
      } catch (error) {
        console.log(`❌ Failed to remove ${file}: ${error.message}`);
      }
    } else {
      console.log(`ℹ️  Not found: ${file}`);
    }
  }
  
  console.log(`\n🎉 Cleanup complete! Removed ${removedCount} files.`);
  console.log(`\n💡 Now run: npm run download-ytdlp`);
}

cleanupYtDlp(); 
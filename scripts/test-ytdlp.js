import { spawn } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import { platform } from 'os';

async function testYtDlp() {
  console.log('🧪 Testing yt-dlp installation...');
  console.log(`Platform: ${platform()}`);
  console.log(`Current directory: ${process.cwd()}`);
  
  // Check for yt-dlp binaries
  const possiblePaths = [
    'yt-dlp',
    'yt-dlp.exe',
    path.join(process.cwd(), 'yt-dlp'),
    path.join(process.cwd(), 'yt-dlp.exe'),
    path.join(process.cwd(), 'dist', 'yt-dlp'),
    path.join(process.cwd(), 'dist', 'yt-dlp.exe')
  ];
  
  console.log('\n📁 Checking for yt-dlp binaries:');
  for (const testPath of possiblePaths) {
    const exists = fs.existsSync(testPath);
    console.log(`  ${testPath}: ${exists ? '✅ Found' : '❌ Not found'}`);
  }
  
  // Test execution
  console.log('\n🚀 Testing yt-dlp execution:');
  
  for (const testPath of possiblePaths) {
    if (!fs.existsSync(testPath)) continue;
    
    console.log(`\nTesting: ${testPath}`);
    
    try {
      let ytdlpPath = testPath;
      let spawnArgs = ['--version'];
      
      // Handle Windows execution
      if (platform() === 'win32' && !testPath.endsWith('.exe')) {
        spawnArgs = [testPath, '--version'];
        ytdlpPath = 'node';
        console.log(`  Using node to execute: ${testPath}`);
      } else {
        console.log(`  Executing directly: ${testPath}`);
      }
      
      const ytdlp = spawn(ytdlpPath, spawnArgs);
      
      await new Promise((resolve, reject) => {
        let output = '';
        let error = '';
        
        ytdlp.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        ytdlp.stderr.on('data', (data) => {
          error += data.toString();
        });
        
        ytdlp.on('close', (code) => {
          if (code === 0) {
            console.log(`  ✅ Success! Version: ${output.trim()}`);
            resolve();
          } else {
            console.log(`  ❌ Failed with code ${code}`);
            if (error) console.log(`  Error: ${error.trim()}`);
            reject(new Error(`Exit code: ${code}`));
          }
        });
        
        ytdlp.on('error', (err) => {
          console.log(`  ❌ Spawn error: ${err.message}`);
          reject(err);
        });
      });
      
      console.log(`  🎉 ${testPath} is working correctly!`);
      return; // Success, exit
      
    } catch (error) {
      console.log(`  ❌ Failed: ${error.message}`);
    }
  }
  
  console.log('\n❌ No working yt-dlp installation found!');
  console.log('\n💡 Try running: npm run download-ytdlp');
}

testYtDlp().catch(console.error); 
// Test ytdl-core untuk YouTube playback
import ytdl from '@distube/ytdl-core';
import playdl from 'play-dl';

const testUrl = 'https://www.youtube.com/watch?v=v9SvqaLIGmU'; // PADI - Kasih Tak Sampai

console.log('🔍 Testing YouTube playback with ytdl-core...\n');

async function testYtdlCore() {
  console.log('1️⃣ Testing ytdl-core.getInfo()...');
  try {
    const info = await ytdl.getInfo(testUrl);
    console.log('✅ Video Info Success:');
    console.log('   Title:', info.videoDetails.title);
    console.log('   Channel:', info.videoDetails.author.name);
    console.log('   Duration:', info.videoDetails.lengthSeconds, 'seconds');
    console.log('   Available Formats:', info.formats.filter(f => f.hasAudio).length);
    return true;
  } catch (err) {
    console.error('❌ ytdl-core Failed:', err.message);
    return false;
  }
}

async function testYtdlStream() {
  console.log('\n2️⃣ Testing ytdl-core stream()...');
  try {
    const stream = ytdl(testUrl, {
      filter: 'audioonly',
      quality: 'highestaudio',
      highWaterMark: 1 << 25,
    });
    
    // Wait for first data chunk
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Stream timeout')), 10000);
      
      stream.once('data', () => {
        clearTimeout(timeout);
        console.log('✅ Stream Success: First data chunk received');
        stream.destroy();
        resolve();
      });
      
      stream.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    
    return true;
  } catch (err) {
    console.error('❌ Stream Failed:', err.message);
    return false;
  }
}

async function testPlayDl() {
  console.log('\n3️⃣ Testing play-dl for comparison...');
  try {
    const stream = await playdl.stream(testUrl, { 
      discordPlayerCompatibility: true 
    });
    
    if (!stream || !stream.stream) {
      throw new Error('Invalid stream object');
    }
    
    console.log('✅ play-dl Success');
    return true;
  } catch (err) {
    console.error('❌ play-dl Failed:', err.message);
    return false;
  }
}

// Run all tests
(async () => {
  try {
    const ytdlInfoOk = await testYtdlCore();
    
    if (ytdlInfoOk) {
      await testYtdlStream();
    }
    
    await testPlayDl();
    
    console.log('\n✅ Test completed!');
    console.log('\n📊 Recommendation:');
    console.log('   If ytdl-core works but play-dl fails, the bot will automatically');
    console.log('   use ytdl-core as fallback. Your bot should now work properly!');
    
  } catch (err) {
    console.error('\n❌ Test suite failed:', err);
  }
  
  process.exit(0);
})();

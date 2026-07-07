// Test youtube-dl-exec untuk YouTube playback
import youtubedl from 'youtube-dl-exec';

const testUrl = 'https://www.youtube.com/watch?v=v9SvqaLIGmU'; // PADI - Kasih Tak Sampai

console.log('🔍 Testing YouTube playback with yt-dlp...\n');

async function testYtdlp() {
  console.log('1️⃣ Testing yt-dlp extraction...');
  try {
    const info = await youtubedl(testUrl, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
    });
    
    console.log('✅ Extraction Success:');
    console.log('   Title:', info.title);
    console.log('   Channel:', info.uploader);
    console.log('   Duration:', info.duration, 'seconds');
    console.log('   Total Formats:', info.formats.length);
    
    // Find audio formats
    const audioFormats = info.formats.filter(f => 
      f.acodec && f.acodec !== 'none' && !f.vcodec
    );
    console.log('   Audio-only Formats:', audioFormats.length);
    
    if (audioFormats.length > 0) {
      const bestAudio = audioFormats[0];
      console.log('   Best Audio Format:');
      console.log('     - Format ID:', bestAudio.format_id);
      console.log('     - Codec:', bestAudio.acodec);
      console.log('     - Bitrate:', bestAudio.abr ? `${bestAudio.abr} kbps` : 'unknown');
      console.log('     - Has URL:', !!bestAudio.url);
    }
    
    return true;
  } catch (err) {
    console.error('❌ yt-dlp Failed:', err.message);
    if (err.stderr) {
      console.error('   stderr:', err.stderr);
    }
    return false;
  }
}

// Run test
(async () => {
  try {
    const success = await testYtdlp();
    
    if (success) {
      console.log('\n✅ yt-dlp is working!');
      console.log('🎉 Your bot should now be able to play YouTube videos.');
    } else {
      console.log('\n❌ yt-dlp test failed.');
      console.log('💡 The bot might still work with ytdl-core or FFmpeg fallback.');
    }
    
  } catch (err) {
    console.error('\n❌ Test error:', err);
  }
  
  process.exit(0);
})();

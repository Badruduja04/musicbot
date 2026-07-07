// Test script untuk diagnose YouTube playback issues
import playdl from 'play-dl';

const testUrl = 'https://www.youtube.com/watch?v=v9SvqaLIGmU'; // PADI - Kasih Tak Sampai

console.log('🔍 Testing YouTube playback...\n');

async function testVideoInfo() {
  console.log('1️⃣ Testing video_info()...');
  try {
    const info = await playdl.video_info(testUrl);
    const video = info.video_details;
    console.log('✅ Video Info Success:');
    console.log('   Title:', video.title);
    console.log('   Channel:', video.channel?.name);
    console.log('   Duration:', video.durationInSec, 'seconds');
    console.log('   URL:', video.url);
    console.log('   ID:', video.id);
    return video;
  } catch (err) {
    console.error('❌ Video Info Failed:', err.message);
    return null;
  }
}

async function testStream(url) {
  console.log('\n2️⃣ Testing stream()...');
  try {
    const stream = await playdl.stream(url, { 
      discordPlayerCompatibility: true,
      quality: 2
    });
    
    if (!stream || !stream.stream) {
      console.error('❌ Stream object is invalid');
      return false;
    }
    
    console.log('✅ Stream Success:');
    console.log('   Type:', stream.type);
    console.log('   Stream:', stream.stream ? 'Created' : 'NULL');
    return true;
  } catch (err) {
    console.error('❌ Stream Failed:', err.message);
    console.error('   Stack:', err.stack);
    return false;
  }
}

async function testSearch() {
  console.log('\n3️⃣ Testing search()...');
  try {
    const results = await playdl.search('PADI Kasih Tak Sampai', { 
      source: { youtube: 'video' }, 
      limit: 1 
    });
    
    if (!results.length) {
      console.error('❌ No search results');
      return null;
    }
    
    const video = results[0];
    console.log('✅ Search Success:');
    console.log('   Title:', video.title);
    console.log('   URL:', video.url);
    return video;
  } catch (err) {
    console.error('❌ Search Failed:', err.message);
    return null;
  }
}

async function checkPlayDlConfig() {
  console.log('\n4️⃣ Checking play-dl configuration...');
  try {
    const isYtAuthorized = playdl.authorization();
    console.log('   YouTube Authorization:', isYtAuthorized ? '✅ Authorized' : '⚠️ Not authorized (may still work)');
  } catch (err) {
    console.log('   Authorization check failed:', err.message);
  }
}

// Run all tests
(async () => {
  try {
    await checkPlayDlConfig();
    
    const videoInfo = await testVideoInfo();
    
    if (videoInfo) {
      await testStream(videoInfo.url);
    } else {
      console.log('\n⚠️ Skipping stream test due to video info failure');
    }
    
    await testSearch();
    
    console.log('\n✅ All tests completed!');
    console.log('\n💡 Tips:');
    console.log('   - If stream fails with "Invalid URL", try updating play-dl: npm update play-dl');
    console.log('   - Check if YouTube is accessible from your network');
    console.log('   - Some videos may be region-locked or age-restricted');
    
  } catch (err) {
    console.error('\n❌ Test suite failed:', err);
  }
  
  process.exit(0);
})();

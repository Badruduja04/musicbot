# Perbaikan BadruMusicBot

## Tanggal: 4 Juli 2026

### ⚠️ Masalah Utama yang Diperbaiki

#### 🎵 **YouTube Stream "Invalid URL" Error**

**Gejala:**
```log
[WARN] [player] play-dl YouTube stream failed for https://www.youtube.com/watch?v=... Invalid URL
[MUSIC] ▶ "PADI - Kasih Tak Sampai..." [youtube] — guild ...
[MUSIC] Queue ended — guild ...
```
Lagu muncul sebagai "Now Playing" tapi langsung "Queue ended" tanpa terputar.

**Penyebab:**
1. `play-dl` gagal membuat stream dari URL YouTube
2. Error tidak di-handle dengan baik sehingga player langsung idle
3. Tidak ada retry mechanism atau fallback method
4. Race condition antara resource creation dan player state

**Solusi Lengkap:**

##### 1. Triple-Fallback Method (player.js)
```javascript
// Method 1: play-dl stream (fastest)
try {
  const stream = await playdl.stream(url, { 
    discordPlayerCompatibility: true,
    quality: 2 
  });
  return createAudioResource(stream.stream, ...);
} catch {
  
  // Method 2: FFmpeg with YouTube URL (reliable)
  try {
    return _ffmpegResource(url);
  } catch {
    
    // Method 3: Re-extract video info (last resort)
    const info = await playdl.video_info(url);
    const freshUrl = info.video_details.url;
    const stream = await playdl.stream(freshUrl, ...);
    return createAudioResource(stream.stream, ...);
  }
}
```

##### 2. Retry Logic dengan Auto-Skip
```javascript
let retryCount = 0;
const maxRetries = 2;

while (retryCount <= maxRetries) {
  try {
    resource = await createResource(track);
    break; // Success!
  } catch (err) {
    retryCount++;
    if (retryCount > maxRetries) {
      // Skip to next track automatically
      const hasNext = queue.next();
      if (hasNext) return playTrack(guildId, queue.currentTrack);
    }
    await wait(1000 * retryCount); // Exponential backoff
  }
}
```

##### 3. Enhanced FFmpeg Args
- Menambahkan reconnect options untuk streaming
- Separate args untuk URL vs local files
- Capture stderr untuk debugging
- Better error logging

##### 4. Player Error Recovery
- Delay 200ms sebelum auto-advance (mencegah race condition)
- Auto-skip ke track berikutnya jika playback gagal
- Preserve queue instead of immediate termination
- Better logging untuk debugging

---

### 📋 File yang Dimodifikasi

#### `src/music/player.js`
**Perubahan Utama:**
- ✅ Triple-fallback method untuk YouTube streaming
- ✅ Retry logic (3 attempts) dengan exponential backoff
- ✅ Auto-skip ke next track jika semua retry gagal
- ✅ Enhanced FFmpeg configuration
- ✅ Better error handling dan logging
- ✅ Increased delay untuk auto-advance (100ms → 200ms)
- ✅ Capture FFmpeg stderr untuk debugging

**Sebelum:**
```javascript
const stream = await playdl.stream(url, { ... });
return createAudioResource(stream.stream, ...);
// Jika error, langsung throw → Queue ended
```

**Sesudah:**
```javascript
// Try play-dl → FFmpeg → Re-extract → Auto-skip
// Dengan retry mechanism dan detailed logging
// Queue tetap berjalan meskipun 1 track gagal
```

#### `src/commands/play.js`
**Perubahan:**
- ✅ Better error feedback ke user
- ✅ Detect jika auto-skip berhasil recovery
- ✅ Informative error messages dalam Bahasa Indonesia

#### `src/commands/leave.js`
**Perubahan:**
- ✅ Double-check voice connection (sudah dari perbaikan sebelumnya)
- ✅ Force cleanup mechanism

---

### 🧪 Testing & Troubleshooting

#### Test Script
Jalankan script diagnostik untuk test YouTube playback:

```bash
node test-youtube.js
```

Script ini akan test:
1. ✅ Video info extraction
2. ✅ Stream creation
3. ✅ Search functionality
4. ✅ play-dl authorization status

#### Manual Testing Steps

**Test 1: Single YouTube Video**
```
1. /join
2. /play https://www.youtube.com/watch?v=v9SvqaLIGmU
3. Cek log - harus ada pesan "[player] ✓ ... created successfully"
4. Lagu harus terputar, bukan langsung "Queue ended"
```

**Test 2: YouTube Playlist**
```
1. /play [YouTube playlist URL]
2. Cek apakah semua video masuk queue
3. Jika ada video yang gagal, bot harus skip otomatis
```

**Test 3: Search Query**
```
1. /play PADI Kasih Tak Sampai
2. Bot harus search dan play hasil pertama
3. Status "Now Playing" harus muncul dan lagu terputar
```

**Test 4: Error Recovery**
```
1. Play beberapa lagu (mix valid dan restricted videos)
2. Bot harus skip video yang error otomatis
3. Queue tetap berjalan untuk video yang valid
```

---

### 🔍 Interpretasi Log Messages

#### Log Success:
```log
[player] Creating resource for "..." (attempt 1/3)
[player] Attempting play-dl stream for: https://...
[player] ✓ play-dl stream created successfully
[player] ✓ Resource created successfully
[MUSIC] ▶ "..." [youtube] — guild ...
```

#### Log Fallback ke FFmpeg:
```log
[player] play-dl failed: Invalid URL
[player] Attempting FFmpeg fallback for: https://...
[player] ✓ FFmpeg stream created successfully
[MUSIC] ▶ "..." [youtube] — guild ...
```

#### Log Retry & Skip:
```log
[player] Resource creation failed (attempt 1/3): ...
[player] Resource creation failed (attempt 2/3): ...
[player] All retries exhausted for "...", skipping...
[player] Skipping to next track: "..."
```

---

### 🛠️ Solusi untuk Masalah Persisten

#### Jika YouTube masih tidak bisa diputar:

**1. Update play-dl:**
```bash
npm update play-dl
npm install play-dl@latest
```

**2. Install/Update yt-dlp:**
play-dl menggunakan yt-dlp untuk YouTube. Pastikan ter-install:

```bash
# Windows (via winget)
winget install yt-dlp

# Or via pip
pip install -U yt-dlp

# Or download binary dari: https://github.com/yt-dlp/yt-dlp/releases
```

**3. Verify FFmpeg Installation:**
```bash
ffmpeg -version
```

Jika belum terinstall:
- Windows: Download dari https://www.gyan.dev/ffmpeg/builds/
- Add ke System PATH

**4. Check Network:**
- Pastikan YouTube accessible dari network Anda
- Test buka video YouTube di browser
- Check jika ada firewall/proxy yang block

**5. play-dl Authorization (Optional tapi Recommended):**
```bash
# Di terminal, jalankan:
node
```

```javascript
import playdl from 'play-dl';

// Set cookies (optional, for restricted videos)
await playdl.setToken({
  youtube: {
    cookie: 'YOUR_YOUTUBE_COOKIES'
  }
});
```

**6. Region-Locked Videos:**
Beberapa video mungkin tidak tersedia di region Anda. Coba dengan:
- Video yang tidak di-region-lock
- Gunakan VPN jika diperlukan

**7. Check Dependencies:**
```bash
npm list play-dl @discordjs/voice discord.js ffmpeg-static
```

Pastikan semua versi compatible:
- play-dl: ^1.9.7
- @discordjs/voice: ^0.16.0 atau ^0.17.0
- discord.js: ^14.x
- ffmpeg-static: ^5.x

---

### 📊 Monitoring & Debugging

#### Enable Detailed Logging:

Di `src/utils/logger.js`, pastikan log level cukup verbose untuk debugging.

#### Monitor Logs:
```bash
# Windows
Get-Content -Path "logs\bot.log" -Wait -Tail 50

# Atau buka file log di text editor
```

Perhatikan:
- `[player]` prefix = player.js logs
- `[MUSIC]` prefix = music events
- `[WARN]` = warnings (non-fatal)
- `[ERROR]` = errors (fatal for that track)

---

### ✅ Expected Behavior Setelah Perbaikan

1. **Lagu YouTube berhasil diputar** dengan salah satu dari 3 methods
2. **Jika 1 method gagal, otomatis coba method lain**
3. **Jika semua method gagal, otomatis skip** ke lagu berikutnya
4. **Queue tidak langsung ended** hanya karena 1 track error
5. **User mendapat feedback yang jelas** tentang status playback
6. **Log messages informatif** untuk debugging

---

### 🎯 Perubahan Perilaku Bot

| Sebelum | Sesudah |
|---------|---------|
| Stream error → Queue ended | Stream error → Try fallback → Auto-skip jika gagal |
| No retry mechanism | 3 attempts dengan exponential backoff |
| Silent failures | Detailed logging untuk debugging |
| User tidak tahu apa yang terjadi | User dapat feedback yang jelas |
| Queue terminated on error | Queue continues dengan track berikutnya |

---

### 🚀 Fitur Baru

1. **Triple-Fallback System** - 3 methods untuk streaming YouTube
2. **Retry Logic** - 3 attempts sebelum skip
3. **Auto-Recovery** - Skip otomatis tanpa user intervention
4. **Better Diagnostics** - test-youtube.js script untuk troubleshooting
5. **Enhanced Logging** - Detailed logs untuk tracking issues

---

### 📝 Catatan Penting

- ✅ Backward compatible - tidak ada breaking changes
- ✅ Tidak perlu update database schema
- ✅ Tidak perlu redeploy commands
- ✅ Bot akan otomatis gunakan kode baru setelah restart
- ⚠️ Beberapa video mungkin tetap tidak bisa diputar karena restriction dari YouTube (age-restricted, region-locked, copyright claim, dll)

---

### 💡 Tips Penggunaan

1. **Untuk video yang sering error**, coba gunakan:
   - Search query instead of direct URL
   - Download audio locally dan simpan di `/assets` folder

2. **Monitor logs** saat testing untuk identify pattern

3. **Jika banyak video gagal**, kemungkinan besar masalah:
   - Network/firewall issue
   - yt-dlp outdated
   - YouTube rate limiting

4. **Playlist besar** (>50 videos) mungkin perlu waktu loading lebih lama

---


**Masalah:** Bot masih berada di voice channel tetapi command `/leave` mengatakan bot tidak terhubung.

**Penyebab:** Command `/leave` hanya mengecek `getVoiceConnection()` yang mungkin tidak sinkron dengan state sebenarnya bot di voice channel.

**Solusi:** 
- Menambahkan pengecekan ganda: `getVoiceConnection()` DAN `interaction.guild.members.me.voice.channel`
- Bot sekarang akan merespon dengan benar bahkan jika connection object tidak tersedia tapi bot masih di voice channel
- Force cleanup dilakukan untuk memastikan bot benar-benar disconnect

**File yang diubah:** `src/commands/leave.js`

---

#### 2. Lagu Pertama Masuk Queue Tapi Tidak Langsung Diputar
**Masalah:** Ketika memutar lagu pertama kali, lagu masuk ke queue tapi tidak langsung diputar. Harus memutar lagu kedua baru yang pertama terputar.

**Penyebab:** Kondisi `wasEmpty` mengecek queue SETELAH track ditambahkan, sehingga selalu false.

**Solusi:**
- Mengecek `queue.isEmpty && !queue.isPlaying` SEBELUM menambahkan track
- Menambahkan pengecekan `!queue.isPlaying` untuk memastikan tidak ada yang sedang diputar
- Sekarang lagu pertama akan langsung diputar otomatis

**File yang diubah:** `src/commands/play.js`

---

#### 3. Error "Invalid URL" pada YouTube Stream
**Masalah:** 
```
[WARN] [player] play-dl YouTube stream failed for https://www.youtube.com/watch?v=... Invalid URL
[MUSIC] Queue ended — guild ...
```

**Penyebab:** 
- URL YouTube tidak valid atau tidak bisa diakses
- Tidak ada error handling yang memadai
- Gagal streaming menyebabkan queue langsung berakhir tanpa mencoba track berikutnya

**Solusi:**
- Menambahkan validasi URL YouTube sebelum streaming
- Menambahkan try-catch yang lebih robust untuk setiap jenis sumber (playlist, video, search)
- Fallback ke FFmpeg jika play-dl gagal
- Auto-recovery: Jika track gagal diputar, bot akan otomatis skip ke track berikutnya
- Penambahan delay 100ms sebelum auto-advance untuk mencegah race condition
- Error handling yang lebih informatif dengan log yang jelas

**File yang diubah:** 
- `src/commands/play.js` (function `_resolveYouTube`)
- `src/music/player.js` (function `createResource` dan event handler)

---

### Perubahan Detail

#### `src/commands/leave.js`
```javascript
// SEBELUM: Hanya cek connection
const connection = getVoiceConnection(interaction.guildId);
if (!connection) return error;

// SESUDAH: Cek connection DAN state bot di voice
const connection = getVoiceConnection(guildId);
const member = interaction.guild.members.me;
const isInVoice = member?.voice?.channel;
if (!connection && !isInVoice) return error;
```

#### `src/commands/play.js`
```javascript
// SEBELUM: Cek setelah add
const wasEmpty = queue.isEmpty;
queue.addMany(tracks);

// SESUDAH: Cek sebelum add
const wasEmpty = queue.isEmpty && !queue.isPlaying;
queue.addMany(tracks);
```

#### `src/music/player.js`
```javascript
// DITAMBAHKAN: Validasi URL YouTube
if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
  throw new Error('URL YouTube tidak valid.');
}

// DITAMBAHKAN: Double fallback dengan try-catch bersarang
try {
  const stream = await playdl.stream(url, ...);
  return createAudioResource(stream.stream, ...);
} catch (err) {
  logger.warn(`play-dl failed: ${err.message}`);
  try {
    return _ffmpegResource(url); // Fallback to FFmpeg
  } catch (ffErr) {
    throw new Error(`Gagal memutar video YouTube: ${err.message}`);
  }
}

// DITAMBAHKAN: Auto-recovery di event listener
player.on('error', (err) => {
  logger.error(`AudioPlayer error: ${err.message}`);
  // Try to skip to next track automatically
  const hasNext = q.next();
  if (hasNext && q.currentTrack) {
    playTrack(guildId, q.currentTrack).catch(...);
  }
});

// DITAMBAHKAN: Delay untuk mencegah race condition
player.on(AudioPlayerStatus.Idle, async () => {
  await new Promise(resolve => setTimeout(resolve, 100));
  // ... rest of auto-advance logic
});
```

---

### Cara Testing

1. **Test Leave Command:**
   ```
   1. Join voice channel
   2. Gunakan /play untuk memutar lagu
   3. Gunakan /leave
   4. Bot harus keluar dan memberikan konfirmasi
   5. Coba /leave lagi, harus ada pesan error yang benar
   ```

2. **Test Play First Song:**
   ```
   1. Pastikan bot tidak ada di voice dan queue kosong
   2. Join voice channel
   3. Gunakan /play dengan lagu apapun
   4. Lagu harus LANGSUNG diputar, tidak masuk queue dulu
   5. Status "Now Playing" harus muncul, bukan "Added to Queue"
   ```

3. **Test YouTube Error Handling:**
   ```
   1. Coba play YouTube URL yang valid
   2. Coba play YouTube playlist
   3. Coba play dengan search query
   4. Jika ada error, bot harus skip ke lagu berikutnya otomatis
   5. Check log untuk melihat error handling yang proper
   ```

---

### Fitur Tambahan yang Ditingkatkan

1. **Auto-Recovery:** Bot sekarang otomatis skip ke track berikutnya jika ada error saat playback
2. **Better Error Messages:** Error message lebih informatif dan dalam Bahasa Indonesia
3. **Robust Connection Checking:** Pengecekan koneksi voice channel lebih reliable
4. **Race Condition Prevention:** Delay 100ms mencegah race condition saat auto-advance

---

### Catatan Penting

- Semua perubahan backward compatible dengan kode yang ada
- Tidak ada breaking changes pada struktur data atau API
- Log messages ditingkatkan untuk debugging yang lebih baik
- Error handling lebih defensive untuk menghindari crash

---

### Jika Masih Ada Masalah

1. Pastikan semua dependencies ter-install dengan benar:
   ```bash
   npm install
   ```

2. Check log file untuk error details

3. Pastikan FFmpeg terinstall di sistem

4. Verify Discord bot permissions:
   - View Channels
   - Connect
   - Speak
   - Use Voice Activity

5. Check play-dl authorization jika YouTube masih error:
   ```bash
   npm run auth-youtube
   ```

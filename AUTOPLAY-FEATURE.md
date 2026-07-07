# 🔁 Fitur Autoplay - YouTube Autoplay

## 📌 Deskripsi

Fitur autoplay memungkinkan bot untuk **otomatis memutar lagu related** setelah queue habis, mirip seperti YouTube atau Spotify!

### ✨ Cara Kerja:
1. User memutar 1 lagu dengan `/play`
2. Lagu selesai dimainkan
3. Jika **autoplay enabled**, bot akan otomatis:
   - Mencari lagu related dari YouTube
   - Menambahkan ke queue
   - Memutar lagu tersebut
4. Proses berulang terus-menerus!

---

## 🎮 Cara Menggunakan

### Command Baru: `/autoplay`

**Deskripsi:** Toggle autoplay on/off

**Usage:**
```
/autoplay
```

**Example:**
```
User: /play PADI Kasih Tak Sampai
Bot: ▶️ Sedang Diputar - PADI - Kasih Tak Sampai

User: /autoplay
Bot: 🔁 Autoplay Enabled
     Bot akan otomatis memutar lagu related dari YouTube setelah queue habis.

[Lagu selesai]
Bot: [autoplay] Adding related track: "PADI - Semua Tentang Kita"
     ▶️ Sedang Diputar - PADI - Semua Tentang Kita

[Lagu berikutnya selesai]
Bot: [autoplay] Adding related track: "Sheila On 7 - Dan"
     ▶️ Sedang Diputar - Sheila On 7 - Dan

... dan seterusnya!
```

---

## 🛠️ Implementasi Teknis

### 1. File Baru yang Ditambahkan:

#### `src/commands/autoplay.js`
- Command untuk toggle autoplay on/off
- Menampilkan status autoplay

#### `src/music/autoplay.js`
- **`getRelatedTracks()`** - Mencari lagu related dari YouTube
- **`getTrendingTracks()`** - Fallback ke trending music jika related gagal
- **`getNextAutoplayTrack()`** - Main function untuk autoplay

### 2. File yang Dimodifikasi:

#### `src/music/queue.js`
- Added `autoplay: false` property ke GuildQueue class

#### `src/music/player.js`
- Updated auto-advance logic untuk support autoplay
- Ketika queue habis dan autoplay enabled:
  1. Fetch related track dari last played track
  2. Add ke queue
  3. Play otomatis

---

## 🎯 Fitur Autoplay

### ✅ Implemented:
- [x] Toggle autoplay on/off dengan `/autoplay` command
- [x] Fetch related videos dari YouTube based on last track
- [x] Otomatis add dan play track berikutnya
- [x] Fallback ke trending music jika related gagal
- [x] Logging untuk monitoring
- [x] Works seamlessly dengan existing queue system
- [x] Support loop modes (track/queue) dengan autoplay

### 🎵 Logika Pemilihan Lagu:

1. **Primary Method:** Search related videos menggunakan title + artist dari lagu terakhir
2. **Filter:** Remove duplicate dan video yang sama
3. **Fallback:** Jika tidak ada related, ambil dari trending music
4. **Limit:** Default 1 lagu per autoplay trigger

---

## 📊 Flow Diagram

```
Queue End Detected
       ↓
Autoplay Enabled? ──NO──→ Queue Ended (Normal)
       ↓ YES
Get Last Played Track
       ↓
Fetch Related Videos (play-dl search)
       ↓
Found? ──NO──→ Try Trending Music ──NO──→ Queue Ended
  ↓ YES              ↓ YES
Add to Queue     Add to Queue
       ↓                ↓
    Play Track ←────────┘
       ↓
  Continue Loop
```

---

## 🧪 Testing

### Test Case 1: Basic Autoplay
```
1. /play https://www.youtube.com/watch?v=...
2. /autoplay (enable)
3. Wait for song to finish
4. Bot should automatically play related song
```

### Test Case 2: Multiple Autoplay
```
1. /play [song]
2. /autoplay (enable)
3. Let it run for 5-10 songs
4. Check if variety is good
5. Check logs for any errors
```

### Test Case 3: Toggle On/Off
```
1. /autoplay (enable)
2. Wait for 2-3 autoplay songs
3. /autoplay (disable)
4. Wait for current song to finish
5. Queue should end normally
```

### Test Case 4: With Existing Queue
```
1. /play song1
2. /play song2
3. /play song3
4. /autoplay (enable)
5. Wait for all 3 songs to finish
6. Bot should autoplay after song3
```

---

## 🔍 Monitoring & Logs

### Log Messages:

**Autoplay Enabled:**
```log
[MUSIC] Autoplay enabled — Guild Name
```

**Fetching Related:**
```log
[autoplay] Queue ended, fetching related track...
[autoplay] Fetching related videos for: https://...
[autoplay] Found 1 related videos
```

**Adding Track:**
```log
[autoplay] Adding related track: "Song Title"
[MUSIC] ▶ "Song Title" [youtube] — guild 123456
```

**Fallback to Trending:**
```log
[autoplay] No related tracks, trying trending...
[autoplay] Found 1 trending videos
```

**Failure:**
```log
[autoplay] Failed: Error message
[MUSIC] Queue ended — guild 123456
```

---

## ⚙️ Configuration

### Customize Autoplay Behavior:

Di `src/music/autoplay.js`, Anda bisa modify:

```javascript
// Number of related videos to fetch
const limit = 1; // Change to 2-3 for more variety

// Search query for related
const searchQuery = `${title} ${artist}`; // Modify search logic

// Trending search query
const trendingQuery = 'trending music 2024'; // Change genre/year
```

---

## 💡 Tips & Best Practices

1. **Autoplay bekerja paling baik dengan YouTube tracks**
   - Local files tidak support autoplay
   - Direct URLs tidak support autoplay

2. **Search quality depends on track metadata**
   - Title dan artist harus accurate
   - Better metadata = better related videos

3. **Monitor logs untuk quality**
   - Check jika related videos relevan
   - Adjust search logic jika perlu

4. **Disable autoplay untuk battery saving**
   - Autoplay = continuous playback
   - Bisa consume lebih banyak resources

5. **Combine dengan loop untuk best experience**
   - `/loop queue` + autoplay = endless music!

---

## 🔧 Troubleshooting

### Issue: Related videos tidak relevan
**Solution:** 
- Check metadata quality dari track
- Modify search query di `autoplay.js`
- Increase limit untuk lebih banyak pilihan

### Issue: Autoplay tidak trigger
**Solution:**
- Check logs untuk error messages
- Verify play-dl authorization
- Check network connectivity
- Ensure last track is from YouTube

### Issue: Autoplay fetch terlalu lama
**Solution:**
- Reduce search limit
- Check YouTube API rate limiting
- Monitor network latency

### Issue: Same videos repeated
**Solution:**
- Increase search limit and randomize selection
- Implement history tracking (future enhancement)
- Use different search queries

---

## 🚀 Future Enhancements

Potential improvements untuk future:

- [ ] History tracking untuk avoid duplicates
- [ ] Genre-based autoplay preferences
- [ ] User-specific autoplay preferences
- [ ] Spotify integration untuk autoplay
- [ ] Artist-based autoplay (same artist only)
- [ ] Mood-based autoplay (chill, energetic, etc)
- [ ] Autoplay queue preview
- [ ] Smart recommendations based on listening history

---

## 📝 Notes

- Autoplay **HANYA untuk YouTube tracks**
- Autoplay akan disabled otomatis jika bot leave voice channel
- Autoplay state adalah per-guild (setiap server punya setting sendiri)
- Autoplay compatible dengan semua command lain (skip, pause, stop, etc)

---

## ✅ Deployment

Setelah update code:

1. **Deploy commands:**
   ```bash
   npm run deploy
   ```

2. **Restart bot:**
   ```bash
   node src/index.js
   ```

3. **Test autoplay:**
   ```
   /autoplay
   ```

---

**Enjoy endless music! 🎵🔁**

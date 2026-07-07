# 🌐 Multi-Server Setup Guide

## 📌 Tujuan

Membuat bot bisa digunakan di **SEMUA server Discord**, tidak hanya 1 server saja.

---

## 🔧 Setup untuk Multi-Server (Global Deployment)

### Step 1: Edit File `.env`

Buka file `.env` dan **comment atau hapus** baris `GUILD_ID`:

**Sebelum (Single Server):**
```env
DISCORD_TOKEN=MTUyMjY4NDA3OTQ5NjIzMzA2MQ.Gt5gzO...
CLIENT_ID=1522684079496233061
GUILD_ID=1412378605148835892  ← Ini membuat bot hanya bisa dipakai di 1 server
MUSIC_DIR=./assets
DEFAULT_VOLUME=100
```

**Sesudah (Multi Server - Global):**
```env
DISCORD_TOKEN=MTUyMjY4NDA3OTQ5NjIzMzA2MQ.Gt5gzO...
CLIENT_ID=1522684079496233061
# GUILD_ID=1412378605148835892  ← Di-comment atau dihapus
MUSIC_DIR=./assets
DEFAULT_VOLUME=100
```

---

### Step 2: Deploy Commands Globally

```bash
npm run deploy
```

**Output yang diharapkan:**
```
[INFO] Deploying 11 commands...
[INFO] ✅ 11 commands deployed globally
[INFO]    (Global commands can take up to 1 hour to update)
```

⚠️ **PENTING:** Global commands butuh **hingga 1 jam** untuk update di semua server!

---

### Step 3: Restart Bot

```bash
# Stop bot (Ctrl+C)
# Start bot again
node src/index.js
```

atau

```bash
npm start
```

---

### Step 4: Invite Bot ke Server Lain

#### Generate Invite Link:

1. Buka: https://discord.com/developers/applications
2. Pilih aplikasi bot Anda
3. Go to: **OAuth2** → **URL Generator**
4. Select **Scopes:**
   - [x] `bot`
   - [x] `applications.commands`

5. Select **Bot Permissions:**
   - [x] Read Messages/View Channels
   - [x] Send Messages
   - [x] Send Messages in Threads
   - [x] Embed Links
   - [x] Attach Files
   - [x] Read Message History
   - [x] Use Slash Commands
   - [x] **Connect** (Voice)
   - [x] **Speak** (Voice)
   - [x] Use Voice Activity

6. Copy **Generated URL** di bagian bawah

**Example URL:**
```
https://discord.com/oauth2/authorize?client_id=1522684079496233061&permissions=36703296&scope=bot%20applications.commands
```

7. **Paste URL ke browser** dan pilih server yang ingin ditambahkan bot

---

## 🎯 Perbedaan Guild vs Global Deploy

| Aspect | Guild Deploy | Global Deploy |
|--------|--------------|---------------|
| **Scope** | 1 server saja | Semua server |
| **Update Time** | Instant (< 1 detik) | Up to 1 hour |
| **Use Case** | Development/Testing | Production |
| **Config** | `GUILD_ID` diset | `GUILD_ID` kosong/tidak ada |
| **Commands Visible In** | 1 server only | All servers |

---

## 📝 Langkah-langkah Lengkap

### Untuk Development (1 Server - Fast Updates):
```env
# .env
GUILD_ID=1412378605148835892  # Your test server ID
```

```bash
npm run deploy  # Commands update instantly
```

✅ **Best for:** Testing, developing new features

---

### Untuk Production (All Servers):
```env
# .env
# GUILD_ID=  # Comment atau hapus
```

```bash
npm run deploy  # Commands deployed globally (wait up to 1 hour)
```

✅ **Best for:** Public bot, multiple servers

---

## 🔍 Verify Bot Status

### Check Bot Permissions di Server:

1. Buka Discord Server
2. Server Settings → Integrations
3. Cari bot Anda
4. Check permissions

### Test Commands:

Di Discord, ketik `/` dan pastikan semua commands muncul:
- `/join`
- `/play`
- `/autoplay` ← New!
- `/pause`
- `/resume`
- `/skip`
- `/stop`
- `/queue`
- `/search`
- `/volume`
- `/leave`

---

## 🚨 Troubleshooting

### Commands tidak muncul di server baru

**Cause:** Global deploy masih propagating (bisa sampai 1 jam)

**Solution:**
- Tunggu hingga 1 jam
- Atau, temporary gunakan guild deploy untuk server spesifik:
  ```env
  GUILD_ID=your_new_server_id
  ```
  ```bash
  npm run deploy
  ```

---

### Commands hilang dari server lama setelah global deploy

**Cause:** Bot mungkin masih di-deploy sebagai guild commands di server lama

**Solution:**
- Commands akan ter-replace dengan global commands setelah 1 jam
- Atau force refresh dengan:
  1. Kick bot dari server
  2. Invite kembali dengan link baru

---

### Bot tidak merespon di server baru

**Check:**
1. ✅ Bot sudah di-invite dengan permissions yang benar
2. ✅ Bot online (status hijau)
3. ✅ Commands sudah deployed globally
4. ✅ Bot punya permission untuk:
   - View channels
   - Send messages
   - Use slash commands
   - Connect to voice
   - Speak

---

### "This interaction failed"

**Causes:**
- Bot offline
- Bot tidak punya permission
- Commands belum deployed
- Bot crashed (check logs)

**Solution:**
```bash
# Check bot status
# Restart bot
node src/index.js

# Check logs
Get-Content -Path "logs\bot.log" -Tail 50
```

---

## 📊 Monitoring Multiple Servers

### Log Messages:

Bot akan log aktivitas dari semua server:

```log
[MUSIC] Joined "General" — Server A
[MUSIC] ▶ "Song Title" [youtube] — guild 123456
[MUSIC] Joined "Music Room" — Server B
[MUSIC] ▶ "Another Song" [youtube] — guild 789012
```

Each server (guild) has its own:
- ✅ Independent queue
- ✅ Independent volume settings
- ✅ Independent autoplay status
- ✅ Independent player state

---

## 🎯 Best Practices

### For Public Bot (Multi-Server):

1. **Always use global deploy** (no `GUILD_ID`)
2. **Monitor logs** untuk identify issues
3. **Rate limiting aware** - Discord has limits:
   - 50 guilds joining per day
   - 2000 commands per 5 seconds
4. **Resource management** - Each server consumes memory
5. **Error handling** - Robust error handling untuk avoid crashes

### For Private Bot (Single/Few Servers):

1. **Use guild deploy** untuk faster updates
2. **List all guild IDs** jika multiple servers (custom script)
3. **Simpler monitoring** karena user base terbatas

---

## 🔐 Security for Public Bot

### Protect Your Token:

```env
# .env (NEVER commit to GitHub!)
DISCORD_TOKEN=your_secret_token_here
```

### .gitignore (Already configured):
```gitignore
.env              # ✅ Token protected
node_modules/     # ✅ Dependencies excluded
*.log            # ✅ Logs excluded
```

### If Token Leaked:

1. **IMMEDIATELY regenerate token:**
   - https://discord.com/developers/applications
   - Bot → Reset Token

2. **Update `.env`** with new token

3. **Restart bot**

---

## 📈 Scaling Considerations

Jika bot Anda tumbuh ke **100+ servers:**

### Consider:
- **Sharding** - Discord.js sharding untuk load distribution
- **Database** - Persistent storage untuk settings
- **Monitoring** - Tools seperti PM2, Grafana
- **Hosting** - VPS/Cloud hosting instead of local
- **Caching** - Redis untuk performance
- **Load balancing** - Multiple bot instances

**Dokumentasi Discord.js Sharding:**  
https://discordjs.guide/sharding/

---

## ✅ Current Status Check

### Verify Your Setup:

```bash
# 1. Check .env
cat .env
# GUILD_ID should be commented or empty

# 2. Deploy globally
npm run deploy

# 3. Restart bot
npm start

# 4. Test di Discord
# Type / dan check semua commands muncul
```

---

## 🎉 Success Checklist

- [ ] `.env` → `GUILD_ID` commented/removed
- [ ] Commands deployed globally: `npm run deploy`
- [ ] Bot restarted
- [ ] Invite link generated dengan permissions benar
- [ ] Bot added ke multiple servers
- [ ] Commands tested di semua servers
- [ ] `/autoplay` command muncul dan berfungsi
- [ ] Each server has independent queue
- [ ] Logs show activities dari multiple servers

---

## 📞 Need Help?

Check dokumentasi:
- [README.md](README.md) - Main documentation
- [AUTOPLAY-FEATURE.md](AUTOPLAY-FEATURE.md) - Autoplay feature
- [SOLUSI-FINAL.md](SOLUSI-FINAL.md) - Troubleshooting

---

**Your bot is now ready for multi-server deployment! 🚀**

Invite ke semua server yang Anda mau dan enjoy the music! 🎵

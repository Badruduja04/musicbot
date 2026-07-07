# ⚡ Quick Multi-Server Setup

## 🎯 Goal: Bot bisa dipakai di SEMUA server Discord

---

## 🚀 Setup dalam 3 Langkah

### Step 1: Edit `.env` - Comment GUILD_ID

Buka file `.env` dan tambahkan `#` di depan `GUILD_ID`:

```env
DISCORD_TOKEN=MTUyMjY4NDA3OTQ5NjIzMzA2MQ.Gt5gzO...
CLIENT_ID=1522684079496233061
# GUILD_ID=1412378605148835892  ← Tambahkan # di depan
MUSIC_DIR=D:\untuk musik\musik
DEFAULT_VOLUME=100
```

---

### Step 2: Deploy Commands Globally

```bash
npm run deploy:global
```

**Output:**
```
[INFO] Deploying 11 commands GLOBALLY...
[WARN] ⏰ Global commands can take up to 1 HOUR to update!
[INFO] ✅ 11 commands deployed GLOBALLY
```

⏰ **Tunggu 10-60 menit** untuk commands muncul di semua server!

---

### Step 3: Restart Bot

```bash
# Stop bot (Ctrl+C jika sedang running)
npm start
```

---

## ✅ DONE! Bot sudah siap untuk multi-server!

---

## 📲 Invite Bot ke Server Lain

### Generate Invite Link:

**Option 1: Quick Link (Ganti CLIENT_ID)**
```
https://discord.com/oauth2/authorize?client_id=1522684079496233061&permissions=36703296&scope=bot%20applications.commands
```

**Option 2: Manual via Discord Developer Portal**
1. https://discord.com/developers/applications
2. Pilih aplikasi bot → OAuth2 → URL Generator
3. Check: `bot` + `applications.commands`
4. Bot Permissions:
   - Send Messages
   - Embed Links
   - Connect (Voice)
   - Speak (Voice)
   - Use Voice Activity
5. Copy link dan paste di browser

---

## 🧪 Test di Discord

Di setiap server, ketik `/` dan pastikan commands muncul:

```
/join        ✅
/play        ✅
/autoplay    ✅ NEW!
/pause       ✅
/resume      ✅
/skip        ✅
/stop        ✅
/queue       ✅
/volume      ✅
/search      ✅
/leave       ✅
```

---

## ⚠️ Important Notes

### 1. Command `/autoplay` Sekarang Sudah Available!

```
/autoplay
```
Bot akan otomatis play lagu related setelah queue habis!

### 2. Global Deploy = Slow Update (10-60 menit)

- Commands tidak langsung muncul
- Bisa sampai 1 jam
- **Be patient!** ⏰

### 3. Each Server = Independent

- Server A punya queue sendiri
- Server B punya queue sendiri
- Autoplay status per-server
- Volume setting per-server

---

## 🔄 Switch Back to Single Server (Optional)

Jika mau balik ke single server (fast updates):

### Edit `.env`:
```env
GUILD_ID=1412378605148835892  # Uncomment
```

### Deploy:
```bash
npm run deploy
```

Commands update **INSTANT** (< 1 detik)!

---

## 📊 Compare: Guild vs Global

| Feature | Guild Deploy | Global Deploy |
|---------|--------------|---------------|
| **Servers** | 1 server only | ALL servers |
| **Update Speed** | Instant | 10-60 minutes |
| **Use Case** | Development | Production |
| **Command** | `npm run deploy` | `npm run deploy:global` |

---

## 🎉 Summary

✅ **DONE:**
- [x] `.env` edited (GUILD_ID commented)
- [x] Commands deployed globally
- [x] Bot restarted
- [x] `/autoplay` command available

✅ **NOW YOU CAN:**
- Invite bot ke unlimited servers
- Each server independent
- Commands work everywhere
- Autoplay feature enabled

---

## 📚 Full Documentation

- **[MULTI-SERVER-SETUP.md](MULTI-SERVER-SETUP.md)** - Detailed guide
- **[AUTOPLAY-FEATURE.md](AUTOPLAY-FEATURE.md)** - Autoplay docs
- **[README.md](README.md)** - Main docs

---

## 🆘 Troubleshooting

### Commands tidak muncul?
**Wait 10-60 minutes** untuk global propagation

### Bot tidak respon?
1. Check bot online (green status)
2. Check permissions di server settings
3. Restart bot: `npm start`

### /autoplay tidak ada?
1. Re-deploy: `npm run deploy:global`
2. Wait 10-60 minutes
3. Restart Discord client

---

**Your bot is ready! Invite to all your servers! 🚀🎵**

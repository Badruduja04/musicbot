import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../../.env') });

export const config = {
  token:         process.env.DISCORD_TOKEN,
  clientId:      process.env.CLIENT_ID,
  guildId:       process.env.GUILD_ID || null,
  musicDir:      process.env.MUSIC_DIR || './assets',
  defaultVolume: parseInt(process.env.DEFAULT_VOLUME ?? '100', 10),
  debug:         process.env.DEBUG === 'true',
};

// Validate required variables
const REQUIRED = ['token', 'clientId'];
for (const key of REQUIRED) {
  if (!config[key]) {
    console.error(`\x1b[31m[CONFIG] ❌ Missing required environment variable: ${key.toUpperCase()}\x1b[0m`);
    console.error(`\x1b[33m[CONFIG] 💡 Salin .env dan isi nilai yang diperlukan\x1b[0m`);
    process.exit(1);
  }
}

export default config;

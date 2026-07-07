// ─── src/index.js — Entry point ──────────────
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { readdir }    from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config         from './config/config.js';
import { logger }     from './utils/logger.js';
import { getDb }      from './music/library.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Discord client ────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

/** @type {Collection<string, object>} */
client.commands = new Collection();

// ── Dynamic command loader ────────────────────
async function loadCommands() {
  const commandsDir   = join(__dirname, 'commands');
  const commandFiles  = (await readdir(commandsDir)).filter(f => f.endsWith('.js'));

  for (const file of commandFiles) {
    try {
      const mod = await import(`./commands/${file}`);
      if (mod.data && mod.execute) {
        client.commands.set(mod.data.name, mod);
        logger.info(`Command loaded: /${mod.data.name}`);
      } else {
        logger.warn(`Skipped ${file}: missing data or execute export`);
      }
    } catch (err) {
      logger.error(`Failed to load command "${file}": ${err.message}`);
    }
  }

  logger.info(`Total commands loaded: ${client.commands.size}`);
}

// ── Dynamic event loader ──────────────────────
async function loadEvents() {
  const eventsDir  = join(__dirname, 'events');
  const eventFiles = (await readdir(eventsDir)).filter(f => f.endsWith('.js'));

  for (const file of eventFiles) {
    try {
      const mod = await import(`./events/${file}`);
      if (!mod.name || !mod.execute) {
        logger.warn(`Skipped event "${file}": missing name or execute export`);
        continue;
      }

      const handler = (...args) => mod.execute(...args, client);
      if (mod.once) {
        client.once(mod.name, handler);
      } else {
        client.on(mod.name, handler);
      }

      logger.info(`Event loaded: ${mod.name}${mod.once ? ' (once)' : ''}`);
    } catch (err) {
      logger.error(`Failed to load event "${file}": ${err.message}`);
    }
  }
}

// ── Bootstrap ─────────────────────────────────
async function main() {
  console.log('');
  console.log('  \x1b[35m\x1b[1m🎵  BadruMusicBot v1.0\x1b[0m');
  console.log('  \x1b[2mNode.js ' + process.version + ' • discord.js v14\x1b[0m');
  console.log('');

  // Ensure database directory & schema exist
  try {
    getDb();
  } catch (err) {
    logger.error(`Database init failed: ${err.message}`);
    process.exit(1);
  }

  await loadCommands();
  await loadEvents();

  logger.info('Connecting to Discord...');
  await client.login(config.token);
}

// ── Global error handling ─────────────────────
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${reason}`);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught exception: ${err.message}`);
  process.exit(1);
});

main().catch(err => {
  logger.error(`Startup error: ${err.message}`);
  process.exit(1);
});

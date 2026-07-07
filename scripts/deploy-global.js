// ─── scripts/deploy-global.js ────────────────
// Deploy commands GLOBALLY ke SEMUA server
// Usage: npm run deploy:global
// ─────────────────────────────────────────────

import { REST, Routes } from 'discord.js';
import { readdir }       from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config            from '../src/config/config.js';
import { logger }        from '../src/utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function deployGlobal() {
  const commandsDir  = join(__dirname, '../src/commands');
  const commandFiles = (await readdir(commandsDir)).filter(f => f.endsWith('.js'));

  const commandData = [];
  for (const file of commandFiles) {
    const mod = await import(`../src/commands/${file}`);
    if (mod.data) {
      commandData.push(mod.data.toJSON());
      logger.info(`Prepared: /${mod.data.name}`);
    }
  }

  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    logger.info(`Deploying ${commandData.length} commands GLOBALLY...`);
    logger.warn('⏰ Global commands can take up to 1 HOUR to update!');

    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commandData },
    );
    
    logger.info(`✅ ${commandData.length} commands deployed GLOBALLY`);
    logger.info('   Commands will be available in ALL servers');
    logger.info('   Please wait up to 1 hour for propagation');
    logger.info('');
    logger.info('🎉 Your bot is now ready for multi-server use!');
    
  } catch (err) {
    logger.error(`Global deploy failed: ${err.message}`);
    process.exit(1);
  }
}

deployGlobal();

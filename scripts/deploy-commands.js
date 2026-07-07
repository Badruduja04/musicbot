// ─── scripts/deploy-commands.js ──────────────
// Register slash commands ke Discord (guild atau global)
// Usage: npm run deploy
// ─────────────────────────────────────────────

import { REST, Routes } from 'discord.js';
import { readdir }       from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config            from '../src/config/config.js';
import { logger }        from '../src/utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function deploy() {
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
    logger.info(`Deploying ${commandData.length} commands...`);

    if (config.guildId) {
      // Guild-specific — updates instantly (best for development)
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commandData },
      );
      logger.info(`✅ ${commandData.length} commands deployed to guild ${config.guildId}`);
      logger.info('   (Guild commands update instantly)');
    } else {
      // Global — can take up to 1 hour to propagate
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commandData },
      );
      logger.info(`✅ ${commandData.length} commands deployed globally`);
      logger.info('   (Global commands can take up to 1 hour to update)');
    }
  } catch (err) {
    logger.error(`Deploy failed: ${err.message}`);
    process.exit(1);
  }
}

deploy();

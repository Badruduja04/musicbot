// ─── events/ready.js ─────────────────────────
import { ActivityType }  from 'discord.js';
import { logger }        from '../utils/logger.js';
import { getDb, scanLibrary, getSongCount } from '../music/library.js';

export const name = 'ready';
export const once = true;

export async function execute(client) {
  logger.info(`✅ Logged in as ${client.user.tag} (${client.user.id})`);
  logger.info(`📡 Serving ${client.guilds.cache.size} guild(s)`);

  // Set bot presence
  client.user.setPresence({
    activities: [{
      name: '🎵 Music | /play',
      type: ActivityType.Listening,
    }],
    status: 'online',
  });

  // Initialize DB & auto-scan library
  try {
    getDb(); // ensure schema
    const count = getSongCount();
    if (count === 0) {
      logger.info('Library kosong — memulai scan assets/...');
      const added = await scanLibrary();
      logger.info(`Library scan selesai: ${added} lagu baru`);
    } else {
      logger.info(`Library sudah berisi ${count} lagu`);
    }
  } catch (err) {
    logger.error(`Library init error: ${err.message}`);
  }

  logger.info('🎵 BadruMusicBot siap digunakan!');
}

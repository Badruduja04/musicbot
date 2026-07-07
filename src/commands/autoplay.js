// ─── /autoplay ───────────────────────────────
import { SlashCommandBuilder } from 'discord.js';
import { getQueue } from '../music/queue.js';
import { buildEmbed } from '../utils/helper.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('autoplay')
  .setDescription('Toggle autoplay - Bot akan otomatis memutar lagu related setelah queue habis 🔁');

export async function execute(interaction) {
  const queue = getQueue(interaction.guildId);

  if (!queue.isPlaying) {
    return interaction.reply({
      embeds: [buildEmbed({
        title:       '❌ Tidak Ada Lagu',
        description: 'Bot sedang tidak memutar lagu. Gunakan `/play` terlebih dahulu.',
        color:       0xED4245,
      })],
      ephemeral: true,
    });
  }

  // Toggle autoplay
  queue.autoplay = !queue.autoplay;

  await interaction.reply({
    embeds: [buildEmbed({
      title:       queue.autoplay ? '🔁 Autoplay Enabled' : '⏹️ Autoplay Disabled',
      description: queue.autoplay 
        ? 'Bot akan otomatis memutar lagu related dari YouTube setelah queue habis.\n\n💡 Seperti fitur autoplay di YouTube/Spotify!'
        : 'Autoplay dimatikan. Queue akan berhenti setelah lagu terakhir.',
      color:       queue.autoplay ? 0x57F287 : 0x5865F2,
      footer:      `Current track: ${queue.currentTrack?.title}`,
    })],
  });

  logger.music(`Autoplay ${queue.autoplay ? 'enabled' : 'disabled'} — ${interaction.guild.name}`);
}

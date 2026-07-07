// ─── /pause ──────────────────────────────────
import { SlashCommandBuilder } from 'discord.js';
import { pausePlayer }         from '../music/player.js';
import { getQueue }            from '../music/queue.js';
import { buildEmbed, truncate, formatDuration, createProgressBar } from '../utils/helper.js';

export const data = new SlashCommandBuilder()
  .setName('pause')
  .setDescription('Pause lagu yang sedang diputar ⏸️');

export async function execute(interaction) {
  const queue = getQueue(interaction.guildId);

  if (!queue.isPlaying) {
    return interaction.reply({
      embeds: [buildEmbed({ title: '❌ Tidak Ada Lagu', description: 'Tidak ada lagu yang sedang diputar!', color: 0xED4245 })],
      ephemeral: true,
    });
  }

  if (queue.isPaused) {
    return interaction.reply({
      embeds: [buildEmbed({
        title:       '⚠️ Sudah Di-pause',
        description: 'Lagu sudah di-pause. Gunakan `/resume` untuk melanjutkan.',
        color:       0xFEE75C,
      })],
      ephemeral: true,
    });
  }

  pausePlayer(interaction.guildId);

  const track = queue.currentTrack;
  await interaction.reply({
    embeds: [buildEmbed({
      title:       '⏸️ Paused',
      description: `**${truncate(track?.title, 60)}**\noleh ${track?.artist ?? 'Unknown'}`,
      color:       0xFEE75C,
      fields: track?.duration ? [
        {
          name:   '📊 Progress',
          value:  createProgressBar(queue.elapsedSeconds, track.duration),
          inline: false,
        },
      ] : [],
      thumbnail: track?.thumbnail ?? null,
      footer:    'Gunakan /resume untuk melanjutkan',
    })],
  });
}

// ─── /resume ─────────────────────────────────
import { SlashCommandBuilder } from 'discord.js';
import { resumePlayer }        from '../music/player.js';
import { getQueue }            from '../music/queue.js';
import { buildEmbed, truncate } from '../utils/helper.js';

export const data = new SlashCommandBuilder()
  .setName('resume')
  .setDescription('Resume lagu yang sedang di-pause ▶️');

export async function execute(interaction) {
  const queue = getQueue(interaction.guildId);

  if (!queue.isPlaying && !queue.isPaused) {
    return interaction.reply({
      embeds: [buildEmbed({ title: '❌ Tidak Ada Lagu', description: 'Tidak ada lagu yang sedang diputar!', color: 0xED4245 })],
      ephemeral: true,
    });
  }

  if (!queue.isPaused) {
    return interaction.reply({
      embeds: [buildEmbed({
        title:       '⚠️ Tidak Di-pause',
        description: 'Lagu tidak sedang di-pause!',
        color:       0xFEE75C,
      })],
      ephemeral: true,
    });
  }

  resumePlayer(interaction.guildId);

  const track = queue.currentTrack;
  await interaction.reply({
    embeds: [buildEmbed({
      title:       '▶️ Resumed',
      description: `**${truncate(track?.title, 60)}** dilanjutkan.\noleh ${track?.artist ?? 'Unknown'}`,
      color:       0x57F287,
      thumbnail:   track?.thumbnail ?? null,
    })],
  });
}

// ─── /skip ───────────────────────────────────
import { SlashCommandBuilder } from 'discord.js';
import { skipTrack }           from '../music/player.js';
import { getQueue }            from '../music/queue.js';
import {
  buildEmbed, truncate, formatDuration, getSourceEmoji,
} from '../utils/helper.js';

export const data = new SlashCommandBuilder()
  .setName('skip')
  .setDescription('Skip ke lagu berikutnya ⏭️');

export async function execute(interaction) {
  await interaction.deferReply();

  const queue = getQueue(interaction.guildId);

  if (!queue.isPlaying) {
    return interaction.editReply({
      embeds: [buildEmbed({
        title:       '❌ Tidak Ada Lagu',
        description: 'Tidak ada lagu yang sedang diputar!',
        color:       0xED4245,
      })],
    });
  }

  const skipped  = queue.currentTrack;
  const hasNext  = await skipTrack(interaction.guildId);
  const next     = queue.currentTrack;

  if (hasNext && next) {
    await interaction.editReply({
      embeds: [buildEmbed({
        title:       '⏭️ Skipped!',
        description: `~~${truncate(skipped?.title, 45)}~~\n\n${getSourceEmoji(next.source)} **Now Playing**\n**[${truncate(next.title, 60)}](${next.source === 'youtube' ? next.url : '#'})**`,
        color:       0x5865F2,
        fields:      [
          { name: '👤 Artist',  value: next.artist ?? 'Unknown', inline: true },
          { name: '⏱️ Durasi', value: formatDuration(next.duration), inline: true },
          { name: '📡 Sumber',  value: next.source.toUpperCase(), inline: true },
        ],
        thumbnail: next.thumbnail ?? null,
        footer:    `Queue: ${queue.size} lagu`,
      })],
    });
  } else {
    await interaction.editReply({
      embeds: [buildEmbed({
        title:       '⏭️ Skipped',
        description: `~~${truncate(skipped?.title, 60)}~~\n\nQueue telah berakhir. Tidak ada lagu berikutnya.`,
        color:       0x5865F2,
      })],
    });
  }
}

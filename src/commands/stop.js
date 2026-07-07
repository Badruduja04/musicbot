// ─── /stop ───────────────────────────────────
import { SlashCommandBuilder } from 'discord.js';
import { stopPlayer }          from '../music/player.js';
import { getQueue }            from '../music/queue.js';
import { buildEmbed }          from '../utils/helper.js';

export const data = new SlashCommandBuilder()
  .setName('stop')
  .setDescription('Stop playback dan hapus semua queue ⏹️');

export async function execute(interaction) {
  const queue = getQueue(interaction.guildId);

  if (!queue.isPlaying && queue.isEmpty) {
    return interaction.reply({
      embeds: [buildEmbed({
        title:       '❌ Tidak Ada Lagu',
        description: 'Tidak ada yang sedang diputar dan queue kosong!',
        color:       0xED4245,
      })],
      ephemeral: true,
    });
  }

  const totalTracks = queue.size;
  stopPlayer(interaction.guildId);

  await interaction.reply({
    embeds: [buildEmbed({
      title:       '⏹️ Stopped',
      description: `Playback dihentikan.\n**${totalTracks}** lagu telah dihapus dari queue.`,
      color:       0xED4245,
      footer:      'Gunakan /play untuk mulai lagi',
    })],
  });
}

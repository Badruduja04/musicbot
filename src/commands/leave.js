// ─── /leave ──────────────────────────────────
import { SlashCommandBuilder } from 'discord.js';
import { getVoiceConnection }  from '@discordjs/voice';
import { leaveChannel }        from '../music/player.js';
import { buildEmbed }          from '../utils/helper.js';
import { logger }              from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('leave')
  .setDescription('Bot leave dari voice channel dan hapus queue 👋');

export async function execute(interaction) {
  const guildId = interaction.guildId;
  
  // Check if bot is in a voice channel in this guild
  const connection = getVoiceConnection(guildId);
  const member = interaction.guild.members.me;
  const isInVoice = member?.voice?.channel;

  if (!connection && !isInVoice) {
    return interaction.reply({
      embeds: [buildEmbed({
        title:       '❌ Tidak Terhubung',
        description: 'Bot tidak sedang berada di voice channel!',
        color:       0xED4245,
      })],
      ephemeral: true,
    });
  }

  // Force cleanup and disconnect
  leaveChannel(guildId);

  await interaction.reply({
    embeds: [buildEmbed({
      title:       '👋 Sampai Jumpa!',
      description: 'Bot telah meninggalkan voice channel.\nQueue dan playback telah dihentikan.',
      color:       0x5865F2,
    })],
  });

  logger.music(`Left voice channel — ${interaction.guild.name}`);
}

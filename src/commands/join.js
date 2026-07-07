// ─── /join ───────────────────────────────────
import { SlashCommandBuilder }  from 'discord.js';
import { getVoiceConnection }   from '@discordjs/voice';
import { joinChannel }          from '../music/player.js';
import { buildEmbed }           from '../utils/helper.js';
import { logger }               from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('join')
  .setDescription('Bot join ke voice channel kamu 🎤');

export async function execute(interaction) {
  const voiceChannel = interaction.member.voice.channel;

  if (!voiceChannel) {
    return interaction.reply({
      embeds: [buildEmbed({
        title:       '❌ Tidak di Voice Channel',
        description: 'Kamu harus masuk ke voice channel terlebih dahulu!',
        color:       0xED4245,
      })],
      ephemeral: true,
    });
  }

  const existing = getVoiceConnection(interaction.guildId);
  if (existing) {
    return interaction.reply({
      embeds: [buildEmbed({
        title:       '⚠️ Sudah Terhubung',
        description: `Bot sudah berada di voice channel. Gunakan \`/leave\` untuk pindah.`,
        color:       0xFEE75C,
      })],
      ephemeral: true,
    });
  }

  try {
    await joinChannel(voiceChannel, interaction.guild.voiceAdapterCreator);

    await interaction.reply({
      embeds: [buildEmbed({
        title:       '✅ Berhasil Join!',
        description: `Bot telah masuk ke **${voiceChannel.name}** 🎵\nGunakan \`/play\` untuk mulai memutar lagu.`,
        color:       0x57F287,
        footer:      `Guild: ${interaction.guild.name}`,
      })],
    });

    logger.music(`Joined "${voiceChannel.name}" — ${interaction.guild.name}`);
  } catch (err) {
    logger.error(`/join: ${err.message}`);
    await interaction.reply({
      embeds: [buildEmbed({ title: '❌ Gagal Join', description: err.message, color: 0xED4245 })],
      ephemeral: true,
    });
  }
}

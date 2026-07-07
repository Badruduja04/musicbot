// ─── /volume ─────────────────────────────────
import { SlashCommandBuilder }  from 'discord.js';
import { getVoiceConnection }   from '@discordjs/voice';
import { setVolume }            from '../music/player.js';
import { getQueue }             from '../music/queue.js';
import { buildEmbed, createVolumeBar, volumeEmoji } from '../utils/helper.js';

export const data = new SlashCommandBuilder()
  .setName('volume')
  .setDescription('Set volume playback (0–200%) 🔊')
  .addIntegerOption(o =>
    o.setName('level')
     .setDescription('Level volume 0–200')
     .setRequired(true)
     .setMinValue(0)
     .setMaxValue(200)
  );

export async function execute(interaction) {
  const connection = getVoiceConnection(interaction.guildId);
  if (!connection) {
    return interaction.reply({
      embeds: [buildEmbed({ title: '❌ Tidak Terhubung', description: 'Bot tidak sedang di voice channel!', color: 0xED4245 })],
      ephemeral: true,
    });
  }

  const level    = interaction.options.getInteger('level');
  const queue    = getQueue(interaction.guildId);
  const oldVol   = queue.volume;

  setVolume(interaction.guildId, level);

  const emoji    = volumeEmoji(level);
  const bar      = createVolumeBar(level);
  const change   = level > oldVol ? `📈 +${level - oldVol}%` : level < oldVol ? `📉 -${oldVol - level}%` : '➡️ Tidak berubah';

  await interaction.reply({
    embeds: [buildEmbed({
      title:       `${emoji} Volume`,
      description: `${bar}\n\n${change} (dari **${oldVol}%** → **${level}%**)`,
      color:       0x5865F2,
      footer:      'Range: 0% (mute) — 100% (normal) — 200% (boost)',
    })],
  });
}

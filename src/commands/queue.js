// ─── /queue ──────────────────────────────────
import { SlashCommandBuilder } from 'discord.js';
import { getQueue }            from '../music/queue.js';
import {
  buildEmbed, formatDuration, truncate, getSourceEmoji, createProgressBar,
} from '../utils/helper.js';

const PAGE_SIZE = 10;

export const data = new SlashCommandBuilder()
  .setName('queue')
  .setDescription('Tampilkan antrian lagu 📋')
  .addIntegerOption(o =>
    o.setName('page')
     .setDescription('Nomor halaman (default: 1)')
     .setMinValue(1)
  );

export async function execute(interaction) {
  const queue = getQueue(interaction.guildId);

  if (queue.isEmpty) {
    return interaction.reply({
      embeds: [buildEmbed({
        title:       '📋 Queue Kosong',
        description: 'Tidak ada lagu di antrian.\nGunakan `/play` untuk menambahkan lagu!',
        color:       0x5865F2,
      })],
    });
  }

  const page       = interaction.options.getInteger('page') ?? 1;
  const totalPages = Math.ceil(queue.size / PAGE_SIZE);
  const clampedPage = Math.min(page, totalPages);
  const start      = (clampedPage - 1) * PAGE_SIZE;
  const pageTracks = queue.tracks.slice(start, start + PAGE_SIZE);

  const totalDuration = queue.tracks.reduce((s, t) => s + (t.duration ?? 0), 0);
  const current       = queue.currentTrack;

  // ── Now playing section ──
  let desc = '';
  if (current) {
    const emoji = queue.isPaused ? '⏸️' : '▶️';
    desc += `**${emoji} Sedang Diputar:**\n`;
    desc += `${getSourceEmoji(current.source)} **${truncate(current.title, 55)}**\n`;
    if (current.duration) {
      desc += createProgressBar(queue.elapsedSeconds, current.duration) + '\n';
    }
    desc += `👤 ${current.artist} • 📡 ${current.source.toUpperCase()}\n\n`;
  }

  // ── Track list ──
  desc += `**📋 Antrian (${queue.size} lagu):**\n`;
  for (let i = 0; i < pageTracks.length; i++) {
    const track  = pageTracks[i];
    const absIdx = start + i;
    const isCurrent = absIdx === queue.currentIndex;
    const prefix = isCurrent
      ? (queue.isPaused ? '⏸️' : '▶️')
      : `\`${absIdx + 1}.\``;

    desc += `${prefix} ${getSourceEmoji(track.source)} **${truncate(track.title, 45)}** — ${formatDuration(track.duration)}`;
    desc += ` • 👤 ${truncate(track.artist, 20)}\n`;
  }

  // ── Loop mode ──
  const loopLabel = { none: '🔁 Off', track: '🔂 Lagu', queue: '🔁 Queue' }[queue.loop];

  await interaction.reply({
    embeds: [buildEmbed({
      title:       `📋 Music Queue — ${interaction.guild.name}`,
      description: desc,
      color:       0x5865F2,
      footer:      `Halaman ${clampedPage}/${totalPages} • ${queue.size} lagu • Durasi total: ${formatDuration(totalDuration)} • Loop: ${loopLabel} • Volume: ${queue.volume}%`,
    })],
  });
}

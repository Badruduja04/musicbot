// ─── /search ─────────────────────────────────
// Search lokal (song/album/artist) atau YouTube
// Hasil ditampilkan sebagai embed list
// ─────────────────────────────────────────────

import { SlashCommandBuilder } from 'discord.js';
import playdl                   from 'play-dl';

import {
  searchSongs, searchByArtist, searchByAlbum,
  getDistinctArtists, getDistinctAlbums,
} from '../music/library.js';
import {
  buildEmbed, formatDuration, truncate,
  getSourceEmoji, formatFileSize,
} from '../utils/helper.js';
import { logger } from '../utils/logger.js';

// ── Command definition ────────────────────────
export const data = new SlashCommandBuilder()
  .setName('search')
  .setDescription('Cari lagu, album, artist, atau di YouTube 🔍')
  .addStringOption(o =>
    o.setName('query')
     .setDescription('Kata kunci pencarian')
     .setRequired(true)
     .setAutocomplete(true)
  )
  .addStringOption(o =>
    o.setName('type')
     .setDescription('Tipe pencarian (default: lagu)')
     .addChoices(
       { name: '🎵 Lagu',    value: 'song'    },
       { name: '💿 Album',   value: 'album'   },
       { name: '👤 Artist',  value: 'artist'  },
       { name: '▶️ YouTube', value: 'youtube' },
     )
  );

// ── Autocomplete ──────────────────────────────
export async function autocomplete(interaction) {
  const value = interaction.options.getFocused().trim();
  const type  = interaction.options.getString('type') ?? 'song';

  if (value.length < 1) return interaction.respond([]);

  try {
    let choices = [];

    if (type === 'artist') {
      const artists = getDistinctArtists(value, 25);
      choices = artists.map(a => ({ name: a.artist, value: a.artist }));

    } else if (type === 'album') {
      const albums = getDistinctAlbums(value, 25);
      choices = albums.map(a => ({
        name:  truncate(`${a.album} — ${a.artist}`, 100),
        value: a.album,
      }));

    } else {
      // song or youtube: autocomplete from local library
      const songs = searchSongs(value, 25);
      choices = songs.map(s => ({
        name:  truncate(`${s.title} — ${s.artist}`, 100),
        value: s.title,
      }));
    }

    await interaction.respond(choices.slice(0, 25));
  } catch (err) {
    logger.error(`/search autocomplete: ${err.message}`);
    await interaction.respond([]);
  }
}

// ── Execute ───────────────────────────────────
export async function execute(interaction) {
  await interaction.deferReply();

  const query = interaction.options.getString('query').trim();
  const type  = interaction.options.getString('type') ?? 'song';

  try {
    // ── YouTube search ──────────────────────
    if (type === 'youtube') {
      const results = await playdl.search(query, { source: { youtube: 'video' }, limit: 10 });

      if (!results.length) {
        return interaction.editReply({
          embeds: [buildEmbed({
            title:       '❌ Tidak Ada Hasil',
            description: `Tidak ada video YouTube untuk **"${query}"**.`,
            color:       0xED4245,
          })],
        });
      }

      const desc = results.map((v, i) =>
        `\`${i + 1}.\` ▶️ **[${truncate(v.title, 55)}](${v.url})**\n` +
        `👤 ${truncate(v.channel?.name ?? 'Unknown', 30)} • ⏱️ ${formatDuration(v.durationInSec)}`
      ).join('\n\n');

      return interaction.editReply({
        embeds: [buildEmbed({
          title:       `▶️ Hasil YouTube: "${truncate(query, 40)}"`,
          description: desc,
          color:       0xFF0000,
          thumbnail:   results[0].thumbnails?.[0]?.url ?? null,
          footer:      `${results.length} hasil • Gunakan /play <URL> untuk memutar`,
        })],
      });
    }

    // ── Local library search ────────────────
    let results = [];
    let title   = '';

    if (type === 'song') {
      results = searchSongs(query, 15);
      title   = `🎵 Hasil Pencarian: "${truncate(query, 35)}"`;
    } else if (type === 'artist') {
      results = searchByArtist(query, 15);
      title   = `👤 Lagu dari Artist: "${truncate(query, 35)}"`;
    } else if (type === 'album') {
      results = searchByAlbum(query, 15);
      title   = `💿 Lagu dari Album: "${truncate(query, 35)}"`;
    }

    if (!results.length) {
      return interaction.editReply({
        embeds: [buildEmbed({
          title:       '❌ Tidak Ditemukan',
          description: `Tidak ada hasil untuk **"${query}"** di library lokal.\n\nCoba gunakan \`/search type:YouTube\` untuk mencari di YouTube!`,
          color:       0xED4245,
        })],
      });
    }

    const desc = results.map((s, i) => {
      const fmt = s.file_format ? ` \`${s.file_format}\`` : '';
      const sz  = s.file_size   ? ` • ${formatFileSize(s.file_size)}` : '';
      return (
        `\`${i + 1}.\` 💾 **${truncate(s.title, 50)}**${fmt}\n` +
        `👤 ${truncate(s.artist, 25)} • 💿 ${truncate(s.album, 25)} • ⏱️ ${formatDuration(s.duration)}${sz}`
      );
    }).join('\n\n');

    await interaction.editReply({
      embeds: [buildEmbed({
        title,
        description: desc,
        color:       0x5865F2,
        footer:      `${results.length} hasil ditemukan di library lokal • Gunakan /play untuk memutar`,
      })],
    });

  } catch (err) {
    logger.error(`/search: ${err.message}`);
    await interaction.editReply({
      embeds: [buildEmbed({ title: '❌ Error', description: err.message, color: 0xED4245 })],
    });
  }
}

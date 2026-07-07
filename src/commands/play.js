// ─── /play ───────────────────────────────────
// Mendukung:
//   • Autocomplete → file lokal dari SQLite
//   • YouTube URL  → stream via play-dl
//   • Playlist URL → semua video di-queue
//   • Teks biasa   → cari lokal dulu, jika tidak ada cari YouTube
//   • Direct URL   → stream audio via FFmpeg
// ─────────────────────────────────────────────

import { SlashCommandBuilder }          from 'discord.js';
import { getVoiceConnection }           from '@discordjs/voice';
import playdl                            from 'play-dl';
import { v4 as uuid }                   from 'uuid';

import { joinChannel, playTrack }       from '../music/player.js';
import { getQueue }                     from '../music/queue.js';
import { searchSongs, getSongById }     from '../music/library.js';
import {
  buildEmbed, formatDuration, truncate,
  isYouTubeUrl, isUrl, getSourceEmoji, getSourceLabel,
} from '../utils/helper.js';
import { logger } from '../utils/logger.js';

// ── Command definition ────────────────────────
export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Putar lagu — local, YouTube URL, atau cari otomatis 🎵')
  .addStringOption(o =>
    o.setName('query')
     .setDescription('Nama lagu, URL YouTube, atau URL audio langsung')
     .setRequired(true)
     .setAutocomplete(true)
  );

// ── Autocomplete handler ──────────────────────
export async function autocomplete(interaction) {
  const value = interaction.options.getFocused().trim();
  if (value.length < 2) return interaction.respond([]);

  try {
    const localResults = searchSongs(value, 23);
    const choices = localResults.map(s => ({
      name:  truncate(`💾 ${s.title} — ${s.artist}`, 100),
      value: `local:${s.id}`,
    }));

    if (isUrl(value)) {
      choices.push({
        name:  truncate(`🔗 Putar URL: ${value}`, 100),
        value: value,
      });
    } else {
      // Offer a YouTube search option if typing looks like a search query
      choices.push({
        name:  truncate(`▶️ Cari YouTube: "${value}"`, 100),
        value: `yt:${value}`,
      });
    }

    await interaction.respond(choices.slice(0, 25));
  } catch (err) {
    logger.error(`/play autocomplete: ${err.message}`);
    await interaction.respond([]);
  }
}

// ── Execute handler ───────────────────────────
export async function execute(interaction) {
  await interaction.deferReply();

  const query   = interaction.options.getString('query');
  const member  = interaction.member;
  const guildId = interaction.guildId;

  // ── Must be in voice channel ──────────────
  const voiceChannel = member.voice.channel;
  if (!voiceChannel) {
    return interaction.editReply({
      embeds: [buildEmbed({
        title:       '❌ Masuk Voice Channel',
        description: 'Kamu harus masuk ke voice channel untuk memutar lagu!',
        color:       0xED4245,
      })],
    });
  }

  // ── Auto-join if not connected ────────────
  if (!getVoiceConnection(guildId)) {
    try {
      await joinChannel(voiceChannel, interaction.guild.voiceAdapterCreator);
    } catch (err) {
      return interaction.editReply({
        embeds: [buildEmbed({ title: '❌ Gagal Join', description: err.message, color: 0xED4245 })],
      });
    }
  }

  // ── Resolve track(s) from query ───────────
  let tracks = [];

  try {
    // 1. Autocomplete local result
    if (query.startsWith('local:')) {
      const id   = parseInt(query.slice(6), 10);
      const song = getSongById(id);
      if (!song) throw new Error('Lagu tidak ditemukan di library lokal.');
      tracks.push(_localTrack(song, member));
    }

    // 2. Autocomplete "search YouTube" option
    else if (query.startsWith('yt:')) {
      const searchTerm = query.slice(3).trim();
      tracks.push(...await _resolveYouTube(searchTerm, member));
    }

    // 3. Full YouTube URL (video or playlist)
    else if (isYouTubeUrl(query)) {
      tracks.push(...await _resolveYouTube(query, member));
    }

    // 4. Direct audio URL (non-YouTube)
    else if (isUrl(query)) {
      tracks.push(_urlTrack(query, member));
    }

    // 5. Plain text → local library first, then YouTube
    else {
      const localHit = searchSongs(query, 1);
      if (localHit.length > 0) {
        tracks.push(_localTrack(localHit[0], member));
      } else {
        tracks.push(...await _resolveYouTube(query, member));
      }
    }

    if (tracks.length === 0) throw new Error('Tidak ada hasil ditemukan.');
  } catch (err) {
    logger.error(`/play resolve: ${err.message}`);
    return interaction.editReply({
      embeds: [buildEmbed({ title: '❌ Error', description: err.message, color: 0xED4245 })],
    });
  }

  // ── Add to queue ──────────────────────────
  const queue   = getQueue(guildId);
  const wasEmpty = queue.isEmpty && !queue.isPlaying;

  queue.addMany(tracks);

  // ── Start playing if queue was empty ──────
  try {
    if (wasEmpty) {
      await playTrack(guildId, queue.currentTrack);

      const track = queue.currentTrack;
      await interaction.editReply({
        embeds: [buildEmbed({
          title:       `${getSourceEmoji(track.source)} Now Playing`,
          description: `**[${truncate(track.title, 65)}](${track.source === 'youtube' ? track.url : '#'})**`,
          color:       0x57F287,
          fields:      [
            { name: '👤 Artist',       value: track.artist ?? 'Unknown', inline: true },
            { name: '💿 Album',        value: track.album  ?? 'Unknown', inline: true },
            { name: '⏱️ Durasi',      value: formatDuration(track.duration), inline: true },
            { name: '📡 Sumber',       value: getSourceLabel(track.source), inline: true },
            { name: '🎚️ Volume',      value: `${queue.volume}%`, inline: true },
            { name: '📥 Diminta oleh', value: `<@${member.id}>`, inline: true },
          ],
          thumbnail: track.thumbnail ?? null,
          footer:    `Queue: ${queue.size} lagu`,
        })],
      });
    } else {
      // Multiple tracks → show summary
      if (tracks.length > 1) {
        await interaction.editReply({
          embeds: [buildEmbed({
            title:       `➕ ${tracks.length} Lagu Ditambahkan ke Queue`,
            description: tracks.slice(0, 5).map((t, i) =>
              `\`${i + 1}.\` ${getSourceEmoji(t.source)} **${truncate(t.title, 50)}** — ${formatDuration(t.duration)}`
            ).join('\n') + (tracks.length > 5 ? `\n…dan ${tracks.length - 5} lagu lainnya` : ''),
            color:   0x5865F2,
            footer:  `Queue: ${queue.size} total`,
            thumbnail: tracks[0].thumbnail ?? null,
          })],
        });
      } else {
        const track    = tracks[0];
        const position = queue.size;
        await interaction.editReply({
          embeds: [buildEmbed({
            title:       `➕ Ditambahkan ke Queue`,
            description: `**[${truncate(track.title, 65)}](${track.source === 'youtube' ? track.url : '#'})**`,
            color:       0x5865F2,
            fields:      [
              { name: '👤 Artist',  value: track.artist ?? 'Unknown', inline: true },
              { name: '⏱️ Durasi', value: formatDuration(track.duration), inline: true },
              { name: '📊 Posisi',  value: `#${position}`, inline: true },
            ],
            thumbnail: track.thumbnail ?? null,
          })],
        });
      }
    }
  } catch (err) {
    logger.error(`/play playback: ${err.message}`);
    
    // Check if auto-skip recovered the situation
    if (queue.isPlaying && queue.currentTrack) {
      await interaction.editReply({
        embeds: [buildEmbed({ 
          title: '⚠️ Peringatan', 
          description: `Beberapa track gagal diputar, tetapi bot berhasil memutar track lainnya.\n\n**Sedang diputar:**\n${queue.currentTrack.title}`, 
          color: 0xFEE75C 
        })],
      });
    } else {
      await interaction.editReply({
        embeds: [buildEmbed({ 
          title: '❌ Playback Error', 
          description: `${err.message}\n\nCoba dengan lagu lain atau cek koneksi internet Anda.`, 
          color: 0xED4245 
        })],
      });
    }
  }
}

// ── Track builders ────────────────────────────
function _requestedBy(member) {
  return { id: member.id, username: member.user.username };
}

function _localTrack(song, member) {
  return {
    id:          uuid(),
    title:       song.title,
    artist:      song.artist,
    album:       song.album,
    duration:    song.duration,
    thumbnail:   null,
    source:      'local',
    url:         song.file_path,
    requestedBy: _requestedBy(member),
  };
}

function _urlTrack(url, member) {
  let hostname = 'URL';
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = 'URL';
  }

  return {
    id:          uuid(),
    title:       'Audio Stream',
    artist:      hostname,
    album:       'URL',
    duration:    null,
    thumbnail:   null,
    source:      'url',
    url,
    requestedBy: _requestedBy(member),
  };
}

function _youtubeTrackUrl(video) {
  return video?.url || (video?.id ? `https://www.youtube.com/watch?v=${video.id}` : null);
}

/**
 * Resolve a YouTube URL or search query into one or more tracks.
 * Supports single video and playlists.
 */
async function _resolveYouTube(input, member) {
  // Playlist
  if (isYouTubeUrl(input) && (input.includes('list=') || input.includes('/playlist'))) {
    try {
      const playlist = await playdl.playlist_info(input, { incomplete: true });
      const videos   = await playlist.all_videos();
      
      if (!videos || videos.length === 0) {
        throw new Error('Playlist kosong atau tidak dapat diakses.');
      }
      
      return videos.map(v => {
        const url = _youtubeTrackUrl(v);
        if (!url) {
          logger.warn(`Skipping video with missing URL in playlist: ${v.title}`);
          return null;
        }
        return {
          id:          uuid(),
          title:       v.title     ?? 'Unknown',
          artist:      v.channel?.name ?? 'Unknown',
          album:       playlist.title ?? 'YouTube Playlist',
          duration:    v.durationInSec ?? null,
          thumbnail:   v.thumbnails?.[0]?.url ?? null,
          source:      'youtube',
          url,
          requestedBy: _requestedBy(member),
        };
      }).filter(t => t !== null);
    } catch (err) {
      logger.error(`Playlist resolution failed: ${err.message}`);
      throw new Error(`Gagal memuat playlist YouTube: ${err.message}`);
    }
  }

  // Single video URL
  if (isYouTubeUrl(input)) {
    try {
      const info  = await playdl.video_info(input);
      const video = info.video_details;
      const url   = _youtubeTrackUrl(video);
      if (!url) throw new Error('Video tidak memiliki URL yang valid.');
      return [{
        id:          uuid(),
        title:       video.title     ?? 'Unknown',
        artist:      video.channel?.name ?? 'Unknown',
        album:       'YouTube',
        duration:    video.durationInSec ?? null,
        thumbnail:   video.thumbnails?.[0]?.url ?? null,
        source:      'youtube',
        url,
        requestedBy: _requestedBy(member),
      }];
    } catch (err) {
      logger.error(`Video info failed for ${input}: ${err.message}`);
      throw new Error('Video YouTube tidak valid atau tidak dapat diakses.');
    }
  }

  // Search query
  try {
    const results = await playdl.search(input, { source: { youtube: 'video' }, limit: 1 });
    if (!results.length) throw new Error(`Tidak ada hasil YouTube untuk: "${input}"`);
    const v   = results[0];
    const url = _youtubeTrackUrl(v);
    if (!url) throw new Error('Hasil pencarian tidak memiliki URL yang valid.');
    return [{
      id:          uuid(),
      title:       v.title     ?? 'Unknown',
      artist:      v.channel?.name ?? 'Unknown',
      album:       'YouTube',
      duration:    v.durationInSec ?? null,
      thumbnail:   v.thumbnails?.[0]?.url ?? null,
      source:      'youtube',
      url,
      requestedBy: _requestedBy(member),
    }];
  } catch (err) {
    logger.error(`YouTube search failed for "${input}": ${err.message}`);
    throw new Error(`Pencarian YouTube gagal: ${err.message}`);
  }
}

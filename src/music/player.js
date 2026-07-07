// =============================================
//  player.js — Audio playback engine
// =============================================

import {
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  StreamType,
  getVoiceConnection,
  NoSubscriberBehavior,
} from '@discordjs/voice';
import playdl from 'play-dl';
import ytdl from '@distube/ytdl-core';
import youtubedl from 'youtube-dl-exec';
import { spawn }          from 'child_process';
import ffmpegStatic       from 'ffmpeg-static';
import { getQueue, deleteQueue } from './queue.js';
import { logger }         from '../utils/logger.js';
import { getNextAutoplayTrack } from './autoplay.js';

// ── AudioPlayer instances per guild ───────────
/** @type {Map<string, import('@discordjs/voice').AudioPlayer>} */
const players = new Map();

// ── Voice connection ──────────────────────────
/**
 * Join a voice channel and attach to the guild queue.
 * @param {import('discord.js').VoiceChannel} voiceChannel
 * @param {Function} adapterCreator
 * @returns {Promise<import('@discordjs/voice').VoiceConnection>}
 */
export async function joinChannel(voiceChannel, adapterCreator) {
  const guildId = voiceChannel.guild.id;

  const connection = joinVoiceChannel({
    channelId:       voiceChannel.id,
    guildId,
    adapterCreator,
    selfDeaf:        true,
    selfMute:        false,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
  } catch {
    connection.destroy();
    throw new Error('Gagal terhubung ke voice channel. Coba lagi.');
  }

  // Handle unexpected disconnects
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
      ]);
    } catch {
      logger.warn(`[player] Connection lost in guild ${guildId}, cleaning up`);
      cleanupGuild(guildId);
    }
  });

  const queue = getQueue(guildId);
  queue.connection = connection;
  return connection;
}

export function leaveChannel(guildId) {
  const connection = getVoiceConnection(guildId);
  if (connection) connection.destroy();
  cleanupGuild(guildId);
}

function cleanupGuild(guildId) {
  const player = players.get(guildId);
  if (player) {
    player.stop(true);
    players.delete(guildId);
  }
  deleteQueue(guildId);
  logger.music(`Cleaned up guild ${guildId}`);
}

// ── Resource factory ──────────────────────────
/**
 * Build an AudioResource from a Track object.
 * Supports: local files (MP3/FLAC/WAV…), YouTube URLs, direct audio URLs.
 */
export async function createResource(track) {
  const url = track.url?.trim();
  if (!url) {
    throw new Error('Track URL tidak valid.');
  }

  /* ── YouTube ── */
  if (track.source === 'youtube') {
    // Method 1: Try play-dl first (fastest when it works)
    try {
      logger.info(`[player] Method 1: Attempting play-dl stream...`);
      const stream = await playdl.stream(url, { 
        discordPlayerCompatibility: true,
        quality: 2
      });
      
      if (!stream || !stream.stream) {
        throw new Error('Stream object is invalid');
      }

      logger.info(`[player] ✓ play-dl successful`);
      return createAudioResource(stream.stream, {
        inputType:    stream.type,
        inlineVolume: true,
      });
    } catch (playDlError) {
      logger.warn(`[player] Method 1 failed: ${playDlError.message}`);
      
      // Method 2: Try youtube-dl-exec to get direct audio URL
      try {
        logger.info(`[player] Method 2: Attempting yt-dlp extraction...`);
        const info = await youtubedl(url, {
          dumpSingleJson: true,
          noCheckCertificates: true,
          noWarnings: true,
          preferFreeFormats: true,
          addHeader: ['referer:youtube.com', 'user-agent:googlebot'],
        });
        
        // Find best audio format (try audio-only first, then any format with audio)
        let audioFormat = info.formats.find(f => 
          f.acodec && f.acodec !== 'none' && (!f.vcodec || f.vcodec === 'none') && f.url
        );
        
        // If no audio-only, find format with best audio quality
        if (!audioFormat) {
          const formatsWithAudio = info.formats.filter(f => 
            f.acodec && f.acodec !== 'none' && f.url
          ).sort((a, b) => (b.abr || 0) - (a.abr || 0));
          
          audioFormat = formatsWithAudio[0];
        }
        
        if (!audioFormat || !audioFormat.url) {
          throw new Error('No playable format found');
        }
        
        logger.info(`[player] ✓ yt-dlp extraction successful (format: ${audioFormat.format_id})`);
        
        // Use FFmpeg to stream the extracted URL
        const ffmpeg = spawn(ffmpegStatic, [
          '-reconnect', '1',
          '-reconnect_streamed', '1',
          '-reconnect_delay_max', '5',
          '-headers', 'User-Agent: Mozilla/5.0',
          '-i', audioFormat.url,
          '-analyzeduration', '0',
          '-loglevel', 'error',
          '-f', 's16le',
          '-ar', '48000',
          '-ac', '2',
          'pipe:1',
        ], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        
        ffmpeg.on('error', (err) => {
          logger.error(`[ffmpeg] Process error: ${err.message}`);
        });
        
        ffmpeg.stderr.on('data', (data) => {
          const msg = data.toString();
          if (msg.includes('Invalid') || msg.includes('Error') || msg.includes('403')) {
            logger.warn(`[ffmpeg] ${msg.trim()}`);
          }
        });
        
        return createAudioResource(ffmpeg.stdout, {
          inputType: StreamType.Raw,
          inlineVolume: true,
        });
      } catch (ytdlpError) {
        logger.warn(`[player] Method 2 failed: ${ytdlpError.message}`);
        
        // Method 3: Try ytdl-core
        try {
          logger.info(`[player] Method 3: Attempting ytdl-core...`);
          const ytdlStream = ytdl(url, {
            filter: 'audioonly',
            quality: 'highestaudio',
            highWaterMark: 1 << 25,
          });
          
          logger.info(`[player] ✓ ytdl-core successful`);
          return createAudioResource(ytdlStream, {
            inputType: StreamType.Arbitrary,
            inlineVolume: true,
          });
        } catch (ytdlError) {
          logger.error(`[player] All 3 methods failed for ${url}`);
          throw new Error(`Tidak dapat memutar video YouTube. Video mungkin dibatasi atau tidak tersedia.`);
        }
      }
    }
  }

  /* ── Direct URL (non-YouTube web URL) ── */
  if (track.source === 'url') {
    // play-dl can handle most direct audio URLs via yt-dlp fallback
    try {
      const stream = await playdl.stream(url, { discordPlayerCompatibility: true });
      return createAudioResource(stream.stream, {
        inputType:    stream.type,
        inlineVolume: true,
      });
    } catch (err) {
      logger.warn(`[player] play-dl direct URL stream failed for ${url}: ${err.message}`);
      return _ffmpegResource(url);
    }
  }

  /* ── Local file (MP3, FLAC, WAV, etc.) ── */
  return _ffmpegResource(url);
}

/**
 * Spawn FFmpeg to decode any audio file/URL to raw PCM for @discordjs/voice.
 * @param {string} input  File path or URL
 */
function _ffmpegResource(input) {
  const isUrl = input.startsWith('http://') || input.startsWith('https://');
  
  const args = isUrl ? [
    // For URLs (including YouTube)
    '-reconnect',            '1',
    '-reconnect_streamed',   '1',
    '-reconnect_delay_max',  '5',
    '-i',                    input,
    '-analyzeduration',      '0',
    '-loglevel',             'error',
    '-f',                    's16le',
    '-ar',                   '48000',
    '-ac',                   '2',
    'pipe:1',
  ] : [
    // For local files
    '-i',                    input,
    '-analyzeduration',      '0',
    '-loglevel',             'error',
    '-f',                    's16le',
    '-ar',                   '48000',
    '-ac',                   '2',
    'pipe:1',
  ];

  const ffmpeg = spawn(ffmpegStatic, args, {
    stdio: ['ignore', 'pipe', 'pipe'], // Capture stderr for debugging
  });

  ffmpeg.on('error', (err) => {
    logger.error(`FFmpeg spawn error: ${err.message}`);
  });

  ffmpeg.stderr.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('Invalid') || msg.includes('Error') || msg.includes('Failed')) {
      logger.warn(`FFmpeg stderr: ${msg.trim()}`);
    }
  });

  return createAudioResource(ffmpeg.stdout, {
    inputType:    StreamType.Raw,
    inlineVolume: true,
  });
}

// ── Playback ──────────────────────────────────
/**
 * Play a track in a guild. Creates AudioPlayer if not exists.
 * @param {string} guildId
 * @param {object} track
 */
export async function playTrack(guildId, track) {
  const queue = getQueue(guildId);
  if (!queue.connection) throw new Error('Bot belum join voice channel.');

  // Reuse or create player
  let player = players.get(guildId);
  if (!player) {
    player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });
    players.set(guildId, player);
    queue.connection.subscribe(player);
    queue.audioPlayer = player;

    // ── Auto-advance on track end ──────────
    player.on(AudioPlayerStatus.Idle, async () => {
      const q = getQueue(guildId);
      if (!q) return;

      // Small delay to prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 200));

      const hasNext = q.next();
      if (hasNext && q.currentTrack) {
        logger.music(`Auto-advance → "${q.currentTrack.title}"`);
        try {
          await playTrack(guildId, q.currentTrack);
        } catch (err) {
          logger.error(`Auto-advance failed: ${err.message}`);
          q.isPlaying = false;
          
          // Try to skip to next track if available
          const hasMoreTracks = q.next();
          if (hasMoreTracks && q.currentTrack) {
            try {
              await playTrack(guildId, q.currentTrack);
            } catch (retryErr) {
              logger.error(`Retry also failed: ${retryErr.message}`);
            }
          }
        }
      } else if (q.autoplay && q.tracks.length > 0) {
        // ── AUTOPLAY: Get related track ──────────
        logger.info('[autoplay] Queue ended, fetching related track...');
        try {
          const lastTrack = q.tracks[q.tracks.length - 1];
          const nextTrack = await getNextAutoplayTrack(lastTrack);
          
          if (nextTrack) {
            logger.music(`[autoplay] Adding related track: "${nextTrack.title}"`);
            q.add(nextTrack);
            q.next();
            await playTrack(guildId, q.currentTrack);
          } else {
            logger.warn('[autoplay] No related track found');
            q.isPlaying = false;
            q.isPaused  = false;
            logger.music(`Queue ended — guild ${guildId}`);
          }
        } catch (err) {
          logger.error(`[autoplay] Failed: ${err.message}`);
          q.isPlaying = false;
          q.isPaused  = false;
          logger.music(`Queue ended — guild ${guildId}`);
        }
      } else {
        q.isPlaying = false;
        q.isPaused  = false;
        logger.music(`Queue ended — guild ${guildId}`);
      }
    });

    player.on('error', (err) => {
      logger.error(`AudioPlayer error [${guildId}]: ${err.message}`);
      const q = getQueue(guildId);
      if (q) {
        q.isPlaying = false;
        q.isPaused = false;
        // Try to recover by skipping to next track
        const hasNext = q.next();
        if (hasNext && q.currentTrack) {
          logger.info(`Attempting to recover by skipping to next track...`);
          playTrack(guildId, q.currentTrack).catch(e => {
            logger.error(`Recovery failed: ${e.message}`);
          });
        }
      }
    });
  }

  // Build resource with retry logic
  let resource;
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      logger.info(`[player] Creating resource for "${track.title}" (attempt ${retryCount + 1}/${maxRetries + 1})`);
      resource = await createResource(track);
      logger.info(`[player] ✓ Resource created successfully`);
      break; // Success, exit retry loop
    } catch (err) {
      retryCount++;
      logger.error(`[player] Resource creation failed (attempt ${retryCount}/${maxRetries + 1}): ${err.message}`);
      
      if (retryCount > maxRetries) {
        // All retries failed, skip to next track
        logger.error(`[player] All retries exhausted for "${track.title}", skipping...`);
        queue.isPlaying = false;
        
        const hasNext = queue.next();
        if (hasNext && queue.currentTrack) {
          logger.info(`[player] Skipping to next track: "${queue.currentTrack.title}"`);
          return playTrack(guildId, queue.currentTrack);
        } else {
          throw new Error(`Gagal memutar "${track.title}" dan tidak ada lagu berikutnya.`);
        }
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
    }
  }

  // Apply current volume
  resource.volume?.setVolumeLogarithmic(queue.volume / 100);

  queue.resource  = resource;
  queue.isPlaying = true;
  queue.isPaused  = false;
  queue.startTime = Date.now();

  player.play(resource);

  try {
    await entersState(player, AudioPlayerStatus.Playing, 20_000);
  } catch (err) {
    logger.error(`[player] Failed to enter Playing state for ${track.title}: ${err.message}`);
    
    // Try to skip to next track instead of throwing
    queue.isPlaying = false;
    const hasNext = queue.next();
    if (hasNext && queue.currentTrack) {
      logger.info(`[player] Skipping to next track after playback failure...`);
      return playTrack(guildId, queue.currentTrack);
    }
    
    throw new Error('Gagal memulai pemutaran audio. Coba lagi nanti.');
  }

  logger.music(`▶ "${track.title}" [${track.source}] — guild ${guildId}`);
  return player;
}

// ── Controls ──────────────────────────────────
export function pausePlayer(guildId) {
  const player = players.get(guildId);
  if (!player) return false;
  const ok = player.pause();
  if (ok) getQueue(guildId).isPaused = true;
  return ok;
}

export function resumePlayer(guildId) {
  const player = players.get(guildId);
  if (!player) return false;
  const ok = player.unpause();
  if (ok) getQueue(guildId).isPaused = false;
  return ok;
}

export function stopPlayer(guildId) {
  const player = players.get(guildId);
  const queue  = getQueue(guildId);
  if (player) player.stop(true);
  queue.isPlaying = false;
  queue.isPaused  = false;
  queue.clear();
}

export async function skipTrack(guildId) {
  const queue  = getQueue(guildId);
  const player = players.get(guildId);
  if (!player) return false;

  const hasNext = queue.next();
  if (hasNext && queue.currentTrack) {
    await playTrack(guildId, queue.currentTrack);
    return true;
  }

  player.stop(true);
  queue.isPlaying = false;
  return false;
}

export function setVolume(guildId, volume) {
  const queue = getQueue(guildId);
  queue.volume = volume;
  if (queue.resource?.volume) {
    queue.resource.volume.setVolumeLogarithmic(volume / 100);
    return true;
  }
  return false;
}

export function getPlayer(guildId) { return players.get(guildId); }

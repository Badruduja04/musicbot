// =============================================
//  metadata.js — Read audio file metadata
// =============================================

import { parseFile } from 'music-metadata';
import { logger } from '../utils/logger.js';

/**
 * Read metadata from a local audio file (MP3, FLAC, WAV, etc.)
 * @param {string} filePath  Absolute path to audio file
 * @returns {Promise<object|null>}
 */
export async function readMetadata(filePath) {
  try {
    const { common, format } = await parseFile(filePath, { duration: true });

    return {
      title:      common.title     ?? null,
      artist:     common.artist    ?? common.albumartist ?? null,
      album:      common.album     ?? null,
      genre:      common.genre?.[0] ?? null,
      year:       common.year      ?? null,
      duration:   format.duration  ?? null,
      format:     format.container ?? null,
      bitrate:    format.bitrate   ?? null,
      sampleRate: format.sampleRate ?? null,
      picture:    common.picture?.[0] ?? null,  // raw buffer (use for embed thumbnail)
    };
  } catch (err) {
    logger.warn(`metadata: failed to parse "${filePath}" — ${err.message}`);
    return null;
  }
}

export default readMetadata;

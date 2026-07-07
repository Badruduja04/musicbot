// =============================================
//  library.js — SQLite music library
// =============================================

import Database from 'better-sqlite3';
import { readdir, stat } from 'fs/promises';
import { join, extname, basename, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readMetadata } from './metadata.js';
import { logger } from '../utils/logger.js';
import config from '../config/config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH   = join(__dirname, '../../database/music.db');

const SUPPORTED_FORMATS = new Set(['.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.opus']);

// ── Singleton DB ──────────────────────────────
let _db = null;

export function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _initSchema(_db);
  }
  return _db;
}

function _initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT    NOT NULL,
      artist      TEXT    NOT NULL DEFAULT 'Unknown Artist',
      album       TEXT    NOT NULL DEFAULT 'Unknown Album',
      genre       TEXT,
      year        INTEGER,
      duration    REAL,
      file_path   TEXT    UNIQUE NOT NULL,
      file_format TEXT,
      file_size   INTEGER,
      bitrate     INTEGER,
      created_at  TEXT    DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_songs_title  ON songs(title  COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_songs_artist ON songs(artist COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_songs_album  ON songs(album  COLLATE NOCASE);
  `);
  logger.info('Database schema ready');
}

// ── Library scanner ───────────────────────────
/**
 * Recursively scan the music directory and index files into SQLite.
 * Uses INSERT OR IGNORE so existing entries are skipped.
 * @returns {Promise<number>} Number of new songs added
 */
export async function scanLibrary() {
  const db  = getDb();
  const dir = resolve(config.musicDir);

  let audioFiles;
  try {
    const all  = await readdir(dir, { recursive: true });
    audioFiles = all.filter(f => SUPPORTED_FORMATS.has(extname(f).toLowerCase()));
  } catch (err) {
    logger.warn(`scanLibrary: cannot read "${dir}" — ${err.message}`);
    return 0;
  }

  if (audioFiles.length === 0) {
    logger.info('scanLibrary: no audio files found in assets/');
    return 0;
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO songs
      (title, artist, album, genre, year, duration, file_path, file_format, file_size, bitrate)
    VALUES
      (@title, @artist, @album, @genre, @year, @duration, @file_path, @file_format, @file_size, @bitrate)
  `);

  let added = 0;

  // Wrap in a synchronous transaction for speed
  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      const info = insert.run(row);
      if (info.changes) added++;
    }
  });

  // Build rows (async metadata reads happen outside the transaction)
  const rows = [];
  for (const rel of audioFiles) {
    const absPath = join(dir, rel);
    try {
      const fileStat = await stat(absPath);
      const meta     = await readMetadata(absPath);
      const stem     = basename(rel, extname(rel));

      rows.push({
        title:       meta?.title   || stem,
        artist:      meta?.artist  || 'Unknown Artist',
        album:       meta?.album   || 'Unknown Album',
        genre:       meta?.genre   || null,
        year:        meta?.year    || null,
        duration:    meta?.duration || null,
        file_path:   absPath,
        file_format: extname(rel).slice(1).toUpperCase(),
        file_size:   fileStat.size,
        bitrate:     meta?.bitrate  || null,
      });
    } catch (err) {
      logger.warn(`scanLibrary: skipping "${rel}" — ${err.message}`);
    }
  }

  insertMany(rows);
  logger.info(`scanLibrary: done — ${added} new songs added (${rows.length} scanned)`);
  return added;
}

// ── Queries ───────────────────────────────────
export function searchSongs(query, limit = 25) {
  const db = getDb();
  const q  = `%${query}%`;
  return db.prepare(`
    SELECT * FROM songs
    WHERE title  LIKE ? COLLATE NOCASE
       OR artist LIKE ? COLLATE NOCASE
       OR album  LIKE ? COLLATE NOCASE
    ORDER BY title COLLATE NOCASE ASC
    LIMIT ?
  `).all(q, q, q, limit);
}

export function searchByArtist(artist, limit = 25) {
  return getDb()
    .prepare(`SELECT * FROM songs WHERE artist LIKE ? COLLATE NOCASE ORDER BY album, title LIMIT ?`)
    .all(`%${artist}%`, limit);
}

export function searchByAlbum(album, limit = 25) {
  return getDb()
    .prepare(`SELECT * FROM songs WHERE album LIKE ? COLLATE NOCASE ORDER BY title LIMIT ?`)
    .all(`%${album}%`, limit);
}

export function getAllSongs(limit = 200) {
  return getDb()
    .prepare(`SELECT * FROM songs ORDER BY artist COLLATE NOCASE, album, title LIMIT ?`)
    .all(limit);
}

export function getSongById(id) {
  return getDb().prepare(`SELECT * FROM songs WHERE id = ?`).get(id);
}

export function getSongCount() {
  return getDb().prepare(`SELECT COUNT(*) AS count FROM songs`).get().count;
}

export function getDistinctArtists(query = '', limit = 25) {
  return getDb()
    .prepare(`SELECT DISTINCT artist FROM songs WHERE artist LIKE ? COLLATE NOCASE ORDER BY artist LIMIT ?`)
    .all(`%${query}%`, limit);
}

export function getDistinctAlbums(query = '', limit = 25) {
  return getDb()
    .prepare(`SELECT DISTINCT album, artist FROM songs WHERE album LIKE ? COLLATE NOCASE ORDER BY album LIMIT ?`)
    .all(`%${query}%`, limit);
}

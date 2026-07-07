// =============================================
//  helper.js — Shared utility functions
// =============================================

import { EmbedBuilder } from 'discord.js';

// ── Time ─────────────────────────────────────
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '??:??';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function pad(n) { return String(n).padStart(2, '0'); }

// ── String ────────────────────────────────────
export function truncate(str, max = 50) {
  if (!str) return 'Unknown';
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}

// ── File size ─────────────────────────────────
export function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

// ── Visual bars ───────────────────────────────
export function createProgressBar(current, total, size = 15) {
  const pct   = Math.min(current / Math.max(total, 1), 1);
  const fill  = Math.round(size * pct);
  const empty = size - fill;
  return `\`${'▓'.repeat(fill)}${'░'.repeat(empty)}\` ${formatDuration(current)} / ${formatDuration(total)}`;
}

export function createVolumeBar(vol, max = 200, size = 10) {
  const fill = Math.round(size * (vol / max));
  return `${'█'.repeat(fill)}${'▒'.repeat(size - fill)} **${vol}%**`;
}

// ── Source helpers ────────────────────────────
export function getSourceEmoji(source) {
  return { youtube: '▶️', local: '💾', url: '🔗' }[source] ?? '🎵';
}

export function getSourceLabel(source) {
  return { youtube: 'YouTube', local: 'Lokal', url: 'URL' }[source] ?? 'Unknown';
}

// ── URL detection ─────────────────────────────
export function isYouTubeUrl(str) {
  if (typeof str !== 'string') return false;
  return /^(https?:\/\/)?(www\.|music\.|m\.)?(youtube\.com|youtu\.be)\//.test(str);
}

export function isUrl(str) {
  if (typeof str !== 'string') return false;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// ── EmbedBuilder shorthand ────────────────────
/**
 * @param {object} opts
 * @param {string} [opts.title]
 * @param {string} [opts.description]
 * @param {number} [opts.color]
 * @param {Array}  [opts.fields]
 * @param {string} [opts.footer]
 * @param {string} [opts.thumbnail]
 * @param {string} [opts.image]
 * @param {string} [opts.url]
 */
export function buildEmbed({
  title, description, color = 0x5865F2,
  fields = [], footer, thumbnail, image, url,
} = {}) {
  const embed = new EmbedBuilder().setColor(color).setTimestamp();
  if (title)        embed.setTitle(title);
  if (url)          embed.setURL(url);
  if (description)  embed.setDescription(description);
  if (fields.length) embed.addFields(fields);
  if (footer)       embed.setFooter({ text: footer });
  if (thumbnail)    embed.setThumbnail(thumbnail);
  if (image)        embed.setImage(image);
  return embed;
}

// ── Volume emoji ──────────────────────────────
export function volumeEmoji(vol) {
  if (vol === 0)  return '🔇';
  if (vol < 50)   return '🔈';
  if (vol < 150)  return '🔉';
  return '🔊';
}

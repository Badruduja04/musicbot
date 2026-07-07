// =============================================
//  queue.js — Per-guild queue management
// =============================================

/**
 * Track object shape:
 * {
 *   id:          string   (uuid)
 *   title:       string
 *   artist:      string
 *   album:       string
 *   duration:    number|null  (seconds)
 *   thumbnail:   string|null  (URL)
 *   source:      'local'|'youtube'|'url'
 *   url:         string       (file path or web URL)
 *   requestedBy: { id: string, username: string }
 * }
 */

export class GuildQueue {
  constructor(defaultVolume = 100) {
    /** @type {Array<object>} */
    this.tracks       = [];
    this.currentIndex = 0;
    this.volume       = defaultVolume;
    /** @type {'none'|'track'|'queue'} */
    this.loop         = 'none';
    this.autoplay     = false;  // NEW: Autoplay feature
    this.connection   = null;   // VoiceConnection
    this.audioPlayer  = null;   // AudioPlayer
    this.resource     = null;   // AudioResource (for volume control)
    this.isPlaying    = false;
    this.isPaused     = false;
    this.startTime    = null;   // Date.now() when track started
  }

  // ── Getters ────────────────────────────────
  get currentTrack()  { return this.tracks[this.currentIndex] ?? null; }
  get size()          { return this.tracks.length; }
  get isEmpty()       { return this.tracks.length === 0; }
  get upcoming()      { return this.tracks.slice(this.currentIndex + 1); }

  // ── Mutation ───────────────────────────────
  add(track)          { this.tracks.push(track); }

  addMany(tracks)     { this.tracks.push(...tracks); }

  remove(index) {
    if (index < 0 || index >= this.tracks.length) return null;
    // Adjust currentIndex if we remove something before it
    if (index < this.currentIndex) this.currentIndex--;
    return this.tracks.splice(index, 1)[0];
  }

  move(from, to) {
    if (from < 0 || from >= this.tracks.length) return false;
    if (to   < 0 || to   >= this.tracks.length) return false;
    const [track] = this.tracks.splice(from, 1);
    this.tracks.splice(to, 0, track);
    return true;
  }

  clear() {
    this.tracks       = [];
    this.currentIndex = 0;
  }

  // ── Navigation ─────────────────────────────
  /**
   * Advance to next track.
   * @returns {boolean} true if there is a next track
   */
  next() {
    if (this.loop === 'track') return true; // replay same track

    if (this.currentIndex < this.tracks.length - 1) {
      this.currentIndex++;
      return true;
    }

    if (this.loop === 'queue' && this.tracks.length > 0) {
      this.currentIndex = 0;
      return true;
    }

    return false; // queue ended
  }

  previous() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      return true;
    }
    return false;
  }

  // ── Shuffle remaining ─────────────────────
  shuffle() {
    const remaining = this.tracks.slice(this.currentIndex + 1);
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }
    this.tracks = [...this.tracks.slice(0, this.currentIndex + 1), ...remaining];
  }

  // ── Elapsed time ──────────────────────────
  get elapsedSeconds() {
    if (!this.startTime || !this.isPlaying) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }
}

// ── Global guild queue store ─────────────────
/** @type {Map<string, GuildQueue>} */
const queues = new Map();

export function getQueue(guildId) {
  if (!queues.has(guildId)) {
    queues.set(guildId, new GuildQueue());
  }
  return queues.get(guildId);
}

export function deleteQueue(guildId) { queues.delete(guildId); }
export function hasQueue(guildId)    { return queues.has(guildId); }

// =============================================
//  autoplay.js — YouTube autoplay related songs
// =============================================

import playdl from 'play-dl';
import { v4 as uuid } from 'uuid';
import { logger } from '../utils/logger.js';

/**
 * Get related/recommended videos from a YouTube video
 * @param {string} videoUrl - Current video URL
 * @param {number} limit - Number of related videos to get (default: 1)
 * @returns {Promise<Array>} - Array of track objects
 */
export async function getRelatedTracks(videoUrl, limit = 1) {
  try {
    logger.info(`[autoplay] Fetching related videos for: ${videoUrl}`);
    
    // Get video info first
    const info = await playdl.video_info(videoUrl);
    const videoId = info.video_details.id;
    
    // Search for related videos using the same artist/title keywords
    const searchQuery = `${info.video_details.title} ${info.video_details.channel?.name}`;
    const results = await playdl.search(searchQuery, { 
      source: { youtube: 'video' }, 
      limit: limit + 5 // Get more to filter out the current video
    });
    
    if (!results.length) {
      logger.warn('[autoplay] No related videos found');
      return [];
    }
    
    // Filter out the current video and duplicates
    const relatedVideos = results
      .filter(v => v.id !== videoId)
      .slice(0, limit);
    
    if (relatedVideos.length === 0) {
      logger.warn('[autoplay] All related videos were duplicates');
      return [];
    }
    
    // Convert to track objects
    const tracks = relatedVideos.map(v => ({
      id:          uuid(),
      title:       v.title ?? 'Unknown',
      artist:      v.channel?.name ?? 'Unknown',
      album:       'YouTube Autoplay',
      duration:    v.durationInSec ?? null,
      thumbnail:   v.thumbnails?.[0]?.url ?? null,
      source:      'youtube',
      url:         v.url,
      requestedBy: { id: 'autoplay', username: 'Autoplay' },
    }));
    
    logger.info(`[autoplay] Found ${tracks.length} related videos`);
    return tracks;
    
  } catch (err) {
    logger.error(`[autoplay] Failed to get related tracks: ${err.message}`);
    return [];
  }
}

/**
 * Get trending music videos from YouTube
 * Fallback when related videos fail
 * @param {number} limit - Number of videos to get
 * @returns {Promise<Array>} - Array of track objects
 */
export async function getTrendingTracks(limit = 1) {
  try {
    logger.info('[autoplay] Fetching trending music videos...');
    
    const results = await playdl.search('trending music 2024', { 
      source: { youtube: 'video' }, 
      limit 
    });
    
    if (!results.length) {
      logger.warn('[autoplay] No trending videos found');
      return [];
    }
    
    const tracks = results.map(v => ({
      id:          uuid(),
      title:       v.title ?? 'Unknown',
      artist:      v.channel?.name ?? 'Unknown',
      album:       'YouTube Trending',
      duration:    v.durationInSec ?? null,
      thumbnail:   v.thumbnails?.[0]?.url ?? null,
      source:      'youtube',
      url:         v.url,
      requestedBy: { id: 'autoplay', username: 'Autoplay' },
    }));
    
    logger.info(`[autoplay] Found ${tracks.length} trending videos`);
    return tracks;
    
  } catch (err) {
    logger.error(`[autoplay] Failed to get trending tracks: ${err.message}`);
    return [];
  }
}

/**
 * Get next autoplay track based on current track
 * @param {object} currentTrack - Current playing track
 * @returns {Promise<object|null>} - Next track or null
 */
export async function getNextAutoplayTrack(currentTrack) {
  if (!currentTrack || currentTrack.source !== 'youtube') {
    logger.warn('[autoplay] Current track is not from YouTube, cannot autoplay');
    return null;
  }
  
  try {
    // Try to get related tracks first
    let tracks = await getRelatedTracks(currentTrack.url, 1);
    
    // Fallback to trending if related fails
    if (!tracks.length) {
      logger.info('[autoplay] No related tracks, trying trending...');
      tracks = await getTrendingTracks(1);
    }
    
    return tracks[0] ?? null;
    
  } catch (err) {
    logger.error(`[autoplay] Failed to get next autoplay track: ${err.message}`);
    return null;
  }
}

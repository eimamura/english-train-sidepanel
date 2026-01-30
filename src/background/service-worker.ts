import type {
  SubtitleSegment,
  Message,
  VideoCache,
} from '../types/index';
import { buildWordIndex, wordIndexToRecord } from '../utils/word-indexer';
import { detectUnknownWords } from '../utils/unknown-detector';
import { enrichWords, getApiKey } from '../utils/ai-enricher';

// Segment buffer per video
const segmentBuffers = new Map<string, SubtitleSegment[]>();
const flushTimers = new Map<string, number>();

function flushBuffer(videoId: string) {
  const buffer = segmentBuffers.get(videoId);
  if (!buffer || buffer.length === 0) {
    flushTimers.delete(videoId);
    return;
  }

  const segmentsToProcess = buffer.splice(0, buffer.length);
  segmentBuffers.set(videoId, []);
  flushTimers.delete(videoId);
  processSegments(videoId, segmentsToProcess).catch(console.error);
}

function scheduleFlush(videoId: string) {
  if (flushTimers.has(videoId)) {
    return;
  }

  const timerId = setTimeout(() => flushBuffer(videoId), 1000);
  flushTimers.set(videoId, timerId);
}

/**
 * Get known words set
 */
async function getKnownWords(): Promise<Set<string>> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['knownWords'], (result) => {
      const words = result.knownWords || [];
      resolve(new Set(words));
    });
  });
}

/**
 * Get video cache
 */
async function getVideoCache(videoId: string): Promise<VideoCache | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get([`video_${videoId}`], (result) => {
      const cache = result[`video_${videoId}`];
      resolve(cache || null);
    });
  });
}

/**
 * Save video cache
 */
async function saveVideoCache(cache: VideoCache): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [`video_${cache.videoId}`]: cache }, () => {
      resolve();
    });
  });
}

/**
 * Process subtitle segments and update cache
 */
async function processSegments(videoId: string, segments: SubtitleSegment[]): Promise<void> {
  // Check existing cache
  const existingCache = await getVideoCache(videoId);
  
  // Skip if already processed (simple check)
  if (existingCache && existingCache.segments.length >= segments.length * 0.9) {
    return;
  }

  // Build word index
  const wordIndex = buildWordIndex(segments);
  
  // Get known words
  const knownWords = await getKnownWords();
  
  // Detect unknown words
  const unknownStats = detectUnknownWords(wordIndex, knownWords);
  
  // Get existing enrichment
  const existingEnrichment = existingCache?.enrichment || {};
  
  // AI enrich (only if API key exists)
  const apiKey = await getApiKey();
  let enrichment = { ...existingEnrichment };
  
  if (apiKey && unknownStats.length > 0) {
    try {
      const newEnrichment = await enrichWords(unknownStats, apiKey);
      enrichment = { ...enrichment, ...newEnrichment };
    } catch (error) {
      console.error('Failed to enrich words:', error);
    }
  }

  // Save cache
  const cache: VideoCache = {
    videoId,
    segments,
    wordIndex: wordIndexToRecord(wordIndex),
    unknownStats,
    enrichment,
    timestamp: Date.now(),
  };

  await saveVideoCache(cache);
}

/**
 * Message handler
 */
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    if (message.type === 'subtitle') {
      const segment = message.data as SubtitleSegment;
      const videoId = message.videoId;

      if (!videoId) {
        return;
      }

      // Add segment to buffer
      if (!segmentBuffers.has(videoId)) {
        segmentBuffers.set(videoId, []);
      }

      const buffer = segmentBuffers.get(videoId)!;
      buffer.push(segment);

      if (buffer.length >= 10) {
        flushBuffer(videoId);
      } else {
        scheduleFlush(videoId);
      }

      sendResponse({ success: true });
    } else if (message.type === 'getVideoData') {
      const videoId = message.videoId;

      if (!videoId) {
        sendResponse({ error: 'No videoId provided' });
        return;
      }

      getVideoCache(videoId).then((cache) => {
        sendResponse({ type: 'videoData', data: cache });
      });

      return true; // For async response
    } else if (message.type === 'getCurrentVideoId') {
      // Get video ID from current YouTube tab
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.url) {
          try {
            const url = new URL(tabs[0].url);
            const videoId = url.searchParams.get('v');
            sendResponse({ type: 'currentVideoId', data: videoId });
          } catch {
            sendResponse({ type: 'currentVideoId', data: null });
          }
        } else {
          sendResponse({ type: 'currentVideoId', data: null });
        }
      });
      return true; // For async response
    }

    return true;
  }
);

/**
 * Open Side Panel (when extension icon is clicked on YouTube page)
 */
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

/**
 * Automatically enable Side Panel on YouTube pages
 */
chrome.tabs.onUpdated.addListener((tabId, _changeInfo, tab) => {
  if (tab.url && tab.url.includes('youtube.com/watch')) {
    chrome.sidePanel.setOptions({
      tabId,
      path: 'sidepanel/index.html',
      enabled: true,
    });
  }
});

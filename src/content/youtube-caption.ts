import type { SubtitleSegment, Message } from '../types/index';

// Accumulate subtitle segments
const segments: SubtitleSegment[] = [];
let currentVideoId: string | null = null;
let observer: MutationObserver | null = null;
let lastSegmentText = '';
let lastSegmentTime = 0;

/**
 * Get current video time in milliseconds
 */
function getCurrentTimeMs(): number {
  const video = document.querySelector('video');
  if (!video) return 0;
  return Math.floor(video.currentTime * 1000);
}

/**
 * Get subtitle text
 */
function getSubtitleText(): string {
  const captionSegments = document.querySelectorAll('.ytp-caption-segment');
  if (captionSegments.length === 0) return '';
  
  return Array.from(captionSegments)
    .map(seg => seg.textContent || '')
    .join(' ')
    .trim();
}

/**
 * Get video ID
 */
function getVideoId(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

/**
 * Send subtitle segment to background worker
 */
function sendSegment(segment: SubtitleSegment) {
  chrome.runtime.sendMessage<Message>({
    type: 'subtitle',
    data: segment,
    videoId: currentVideoId || undefined,
  });
}

/**
 * Observe subtitle changes
 */
function observeSubtitles() {
  const captionContainer = document.querySelector('.ytp-caption-window-container');
  if (!captionContainer) {
    // Retry if caption container not found
    setTimeout(observeSubtitles, 1000);
    return;
  }

  observer = new MutationObserver(() => {
    const currentTime = getCurrentTimeMs();
    const subtitleText = getSubtitleText();
    
    if (!subtitleText || subtitleText === lastSegmentText) {
      return;
    }

    // Detect new segment
    const segment: SubtitleSegment = {
      startMs: lastSegmentTime || currentTime,
      endMs: currentTime,
      text: subtitleText,
    };

    // Avoid duplicates (same text shouldn't be consecutive)
    if (segments.length === 0 || segments[segments.length - 1].text !== subtitleText) {
      segments.push(segment);
      sendSegment(segment);
      lastSegmentText = subtitleText;
      lastSegmentTime = currentTime;
    }
  });

  observer.observe(captionContainer, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

/**
 * Observe video changes
 */
function observeVideoChange() {
  const videoId = getVideoId();
  
  if (videoId !== currentVideoId) {
    // New video detected
    currentVideoId = videoId;
    segments.length = 0;
    lastSegmentText = '';
    lastSegmentTime = 0;
    
    // Restart subtitle observation
    if (observer) {
      observer.disconnect();
    }
    
    // Wait a bit before starting subtitle observation (wait for page load)
    setTimeout(() => {
      observeSubtitles();
    }, 2000);
  }
}

/**
 * Seek video to specified time
 */
function seekTo(timeMs: number) {
  const video = document.querySelector('video');
  if (!video) return;
  
  const timeSeconds = timeMs / 1000;
  video.currentTime = timeSeconds;
}

/**
 * Get current subtitle (for Side Panel requests)
 */
chrome.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
  if (message.type === 'getCurrentTime') {
    const currentTime = getCurrentTimeMs();
    const subtitleText = getSubtitleText();
    
    sendResponse({
      type: 'currentSubtitle',
      data: {
        timeMs: currentTime,
        text: subtitleText,
      },
    });
  } else if (message.type === 'seekTo' && message.timeMs !== undefined) {
    seekTo(message.timeMs);
    sendResponse({ success: true });
  }
  
  return true; // For async response
});

/**
 * Initialize
 */
function init() {
  // Get video ID
  currentVideoId = getVideoId();
  
  // Observe video changes (for SPA)
  setInterval(observeVideoChange, 1000);
  
  // Start subtitle observation
  observeSubtitles();
}

// Initialize after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

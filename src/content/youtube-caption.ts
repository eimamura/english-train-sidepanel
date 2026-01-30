import type { SubtitleSegment, Message } from '../types/index';

// 字幕セグメントの蓄積
const segments: SubtitleSegment[] = [];
let currentVideoId: string | null = null;
let observer: MutationObserver | null = null;
let lastSegmentText = '';
let lastSegmentTime = 0;

/**
 * 現在の動画時間を取得（ミリ秒）
 */
function getCurrentTimeMs(): number {
  const video = document.querySelector('video');
  if (!video) return 0;
  return Math.floor(video.currentTime * 1000);
}

/**
 * 字幕テキストを取得
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
 * 動画IDを取得
 */
function getVideoId(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('v');
}

/**
 * 字幕セグメントをBackgroundに送信
 */
function sendSegment(segment: SubtitleSegment) {
  chrome.runtime.sendMessage<Message>({
    type: 'subtitle',
    data: segment,
    videoId: currentVideoId || undefined,
  });
}

/**
 * 字幕の変更を監視
 */
function observeSubtitles() {
  const captionContainer = document.querySelector('.ytp-caption-window-container');
  if (!captionContainer) {
    // 字幕コンテナが見つからない場合、少し待って再試行
    setTimeout(observeSubtitles, 1000);
    return;
  }

  observer = new MutationObserver(() => {
    const currentTime = getCurrentTimeMs();
    const subtitleText = getSubtitleText();
    
    if (!subtitleText || subtitleText === lastSegmentText) {
      return;
    }

    // 新しいセグメントを検出
    const segment: SubtitleSegment = {
      startMs: lastSegmentTime || currentTime,
      endMs: currentTime,
      text: subtitleText,
    };

    // 重複を避ける（同じテキストが連続しないように）
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
 * 動画の変更を監視
 */
function observeVideoChange() {
  const videoId = getVideoId();
  
  if (videoId !== currentVideoId) {
    // 新しい動画に切り替わった
    currentVideoId = videoId;
    segments.length = 0;
    lastSegmentText = '';
    lastSegmentTime = 0;
    
    // 字幕監視を再開
    if (observer) {
      observer.disconnect();
    }
    
    // 少し待ってから字幕監視を開始（ページ読み込み待ち）
    setTimeout(() => {
      observeSubtitles();
    }, 2000);
  }
}

/**
 * 動画を指定時間にシーク
 */
function seekTo(timeMs: number) {
  const video = document.querySelector('video');
  if (!video) return;
  
  const timeSeconds = timeMs / 1000;
  video.currentTime = timeSeconds;
}

/**
 * 現在の字幕を取得（Side Panelからのリクエスト用）
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
  
  return true; // 非同期レスポンス用
});

/**
 * 初期化
 */
function init() {
  // 動画IDを取得
  currentVideoId = getVideoId();
  
  // 動画の変更を監視（SPAなので）
  setInterval(observeVideoChange, 1000);
  
  // 字幕監視を開始
  observeSubtitles();
}

// ページ読み込み完了後に初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

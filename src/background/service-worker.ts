import type {
  SubtitleSegment,
  Message,
  VideoCache,
} from '../types/index';
import { buildWordIndex, wordIndexToRecord } from '../utils/word-indexer';
import { detectUnknownWords } from '../utils/unknown-detector';
import { enrichWords, getApiKey } from '../utils/ai-enricher';

// 動画ごとのセグメント蓄積
const segmentBuffers = new Map<string, SubtitleSegment[]>();

/**
 * 既知単語セットを取得
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
 * 動画キャッシュを取得
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
 * 動画キャッシュを保存
 */
async function saveVideoCache(cache: VideoCache): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [`video_${cache.videoId}`]: cache }, () => {
      resolve();
    });
  });
}

/**
 * 字幕セグメントを処理してキャッシュを更新
 */
async function processSegments(videoId: string, segments: SubtitleSegment[]): Promise<void> {
  // 既存のキャッシュを確認
  const existingCache = await getVideoCache(videoId);
  
  // 既に処理済みの場合はスキップ（簡易チェック）
  if (existingCache && existingCache.segments.length >= segments.length * 0.9) {
    return;
  }

  // 単語インデックスを生成
  const wordIndex = buildWordIndex(segments);
  
  // 既知単語を取得
  const knownWords = await getKnownWords();
  
  // 未知語を検出
  const unknownStats = detectUnknownWords(wordIndex, knownWords);
  
  // 既存のenrichmentを取得
  const existingEnrichment = existingCache?.enrichment || {};
  
  // AI enrich（APIキーがある場合のみ）
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

  // キャッシュを保存
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
 * メッセージハンドラー
 */
chrome.runtime.onMessage.addListener(
  (message: Message, _sender, sendResponse) => {
    if (message.type === 'subtitle') {
      const segment = message.data as SubtitleSegment;
      const videoId = message.videoId;

      if (!videoId) {
        return;
      }

      // セグメントをバッファに追加
      if (!segmentBuffers.has(videoId)) {
        segmentBuffers.set(videoId, []);
      }

      const buffer = segmentBuffers.get(videoId)!;
      buffer.push(segment);

      // 一定数溜まったら処理（または最後のセグメントの場合）
      // 簡易実装: 10秒ごとに処理
      if (buffer.length % 10 === 0 || segment.endMs > 0) {
        processSegments(videoId, [...buffer]).catch(console.error);
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

      return true; // 非同期レスポンス用
    } else if (message.type === 'getCurrentVideoId') {
      // 現在のYouTubeタブの動画IDを取得
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
      return true; // 非同期レスポンス用
    }

    return true;
  }
);

/**
 * Side Panelを開く（YouTubeページで拡張機能アイコンをクリック時）
 */
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }
});

/**
 * YouTubeページでSide Panelを自動的に有効化
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

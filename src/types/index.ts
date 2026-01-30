// 字幕セグメント
export interface SubtitleSegment {
  startMs: number;
  endMs: number;
  text: string;
}

// 単語出現位置
export interface WordOccurrence {
  startMs: number;
  endMs: number;
  segmentId: number;
  context: string; // 前後の文脈
}

// 単語インデックス
export type WordIndex = Map<string, WordOccurrence[]>;

// 未知語統計
export interface UnknownWordStats {
  word: string;
  count: number;
  firstOccurrence: number; // startMs
  sampleContext: string;
}

// AI enrich結果
export interface WordEnrichment {
  ja_translation: string;
  meaning_en: string;
  ipa: string;
  pronunciation_tips_ja: string;
  example: {
    original: string;
    paraphrase: string;
  };
}

// 動画キャッシュ（ストレージ用にシリアライズ可能な形式）
export interface VideoCache {
  videoId: string;
  segments: SubtitleSegment[];
  wordIndex: Record<string, WordOccurrence[]>; // MapをRecordに変換（シリアライズ用）
  unknownStats: UnknownWordStats[];
  enrichment: Record<string, WordEnrichment>; // MapをRecordに変換
  timestamp: number;
}

// メッセージ型
export interface Message {
  type: 'subtitle' | 'getVideoData' | 'getCurrentTime' | 'seekTo' | 'videoData' | 'currentSubtitle' | 'getCurrentVideoId' | 'currentVideoId';
  data?: any;
  videoId?: string;
  timeMs?: number;
}

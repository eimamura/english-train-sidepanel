// Subtitle segment
export interface SubtitleSegment {
  startMs: number;
  endMs: number;
  text: string;
}

// Word occurrence position
export interface WordOccurrence {
  startMs: number;
  endMs: number;
  segmentId: number;
  context: string; // Context from surrounding segments
}

// Word index
export type WordIndex = Map<string, WordOccurrence[]>;

// Unknown word statistics
export interface UnknownWordStats {
  word: string;
  count: number;
  firstOccurrence: number; // startMs
  sampleContext: string;
}

// AI enrichment result
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

// Video cache (serializable format for storage)
export interface VideoCache {
  videoId: string;
  segments: SubtitleSegment[];
  wordIndex: Record<string, WordOccurrence[]>; // Converted from Map for serialization
  unknownStats: UnknownWordStats[];
  enrichment: Record<string, WordEnrichment>; // Converted from Map
  timestamp: number;
}

// Message type
export interface Message {
  type: 'subtitle' | 'getVideoData' | 'getCurrentTime' | 'seekTo' | 'videoData' | 'currentSubtitle' | 'getCurrentVideoId' | 'currentVideoId';
  data?: any;
  videoId?: string;
  timeMs?: number;
}

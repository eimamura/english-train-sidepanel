import type { SubtitleSegment, WordOccurrence, WordIndex } from '../types/index';
import { extractWordsWithPosition } from './tokenizer';

/**
 * 字幕セグメントから単語インデックスを生成
 */
export function buildWordIndex(segments: SubtitleSegment[]): WordIndex {
  const wordIndex: WordIndex = new Map();
  
  segments.forEach((segment, segmentId) => {
    const words = extractWordsWithPosition(
      segment.text,
      segment.startMs,
      segment.endMs,
      segmentId
    );
    
    words.forEach(({ word, startMs, endMs, segmentId }) => {
      if (!wordIndex.has(word)) {
        wordIndex.set(word, []);
      }
      
      // 前後のセグメントから文脈を取得
      const prevSegment = segments[segmentId - 1];
      const nextSegment = segments[segmentId + 1];
      const context = [
        prevSegment?.text || '',
        segment.text,
        nextSegment?.text || '',
      ]
        .filter(Boolean)
        .join(' ');
      
      wordIndex.get(word)!.push({
        startMs,
        endMs,
        segmentId,
        context,
      });
    });
  });
  
  return wordIndex;
}

/**
 * WordIndexをRecord形式に変換（ストレージ用）
 */
export function wordIndexToRecord(wordIndex: WordIndex): Record<string, WordOccurrence[]> {
  const record: Record<string, WordOccurrence[]> = {};
  wordIndex.forEach((occurrences, word) => {
    record[word] = occurrences;
  });
  return record;
}

/**
 * Record形式からWordIndexに変換
 */
export function recordToWordIndex(record: Record<string, WordOccurrence[]>): WordIndex {
  const wordIndex: WordIndex = new Map();
  Object.entries(record).forEach(([word, occurrences]) => {
    wordIndex.set(word, occurrences);
  });
  return wordIndex;
}

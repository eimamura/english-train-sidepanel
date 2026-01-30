import type { SubtitleSegment, WordOccurrence, WordIndex } from '../types/index';
import { extractWordsWithPosition } from './tokenizer';

/**
 * Build word index from subtitle segments
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
      
      // Get context from previous and next segments
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
 * Convert WordIndex to Record format (for storage)
 */
export function wordIndexToRecord(wordIndex: WordIndex): Record<string, WordOccurrence[]> {
  const record: Record<string, WordOccurrence[]> = {};
  wordIndex.forEach((occurrences, word) => {
    record[word] = occurrences;
  });
  return record;
}

/**
 * Convert Record format to WordIndex
 */
export function recordToWordIndex(record: Record<string, WordOccurrence[]>): WordIndex {
  const wordIndex: WordIndex = new Map();
  Object.entries(record).forEach(([word, occurrences]) => {
    wordIndex.set(word, occurrences);
  });
  return wordIndex;
}

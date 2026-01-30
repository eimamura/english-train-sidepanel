import type { WordIndex, UnknownWordStats } from '../types/index';

/**
 * Detect unknown words from known words set and generate statistics
 */
export function detectUnknownWords(
  wordIndex: WordIndex,
  knownWords: Set<string>
): UnknownWordStats[] {
  const statsMap = new Map<string, { count: number; firstOccurrence: number; sampleContext: string }>();
  
  wordIndex.forEach((occurrences, word) => {
    // Skip known words
    if (knownWords.has(word)) {
      return;
    }
    
    const count = occurrences.length;
    const firstOccurrence = Math.min(...occurrences.map(o => o.startMs));
    const sampleContext = occurrences[0]?.context || '';
    
    statsMap.set(word, {
      count,
      firstOccurrence,
      sampleContext,
    });
  });
  
  // Convert to array and sort by frequency
  const stats: UnknownWordStats[] = Array.from(statsMap.entries()).map(([word, data]) => ({
    word,
    ...data,
  }));
  
  stats.sort((a, b) => b.count - a.count);
  
  return stats;
}

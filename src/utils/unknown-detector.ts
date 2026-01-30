import type { WordIndex, UnknownWordStats } from '../types/index';

/**
 * 既知単語セットから未知語を判定して統計を生成
 */
export function detectUnknownWords(
  wordIndex: WordIndex,
  knownWords: Set<string>
): UnknownWordStats[] {
  const statsMap = new Map<string, { count: number; firstOccurrence: number; sampleContext: string }>();
  
  wordIndex.forEach((occurrences, word) => {
    // 既知単語はスキップ
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
  
  // 統計配列に変換して頻度順でソート
  const stats: UnknownWordStats[] = Array.from(statsMap.entries()).map(([word, data]) => ({
    word,
    ...data,
  }));
  
  stats.sort((a, b) => b.count - a.count);
  
  return stats;
}

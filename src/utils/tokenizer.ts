// Stop words list (common words)
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
  'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
  'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this',
  'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its',
  'our', 'their', 'what', 'which', 'who', 'whom', 'whose', 'where',
  'when', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more',
  'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own',
  'same', 'so', 'than', 'too', 'very', 'just', 'now'
]);

/**
 * Normalize word (lowercase, remove punctuation)
 */
export function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^\w]/g, '');
}

/**
 * Tokenize text and return array of normalized words
 */
export function tokenize(text: string): string[] {
  // Split into words (by whitespace and punctuation)
  const words = text.split(/\s+/);
  
  return words
    .map(normalizeWord)
    .filter(word => {
      // Exclude empty strings and stop words
      return word.length > 0 && !STOP_WORDS.has(word);
    });
}

/**
 * セグメントテキストから単語を抽出（出現位置情報付き）
 */
export function extractWordsWithPosition(
  text: string,
  startMs: number,
  endMs: number,
  segmentId: number
): Array<{ word: string; startMs: number; endMs: number; segmentId: number }> {
  const words = text.split(/\s+/);
  const duration = endMs - startMs;
  const wordDuration = duration / words.length;
  
  return words
    .map((word, index) => ({
      word: normalizeWord(word),
      startMs: startMs + index * wordDuration,
      endMs: startMs + (index + 1) * wordDuration,
      segmentId,
    }))
    .filter(item => item.word.length > 0 && !STOP_WORDS.has(item.word));
}

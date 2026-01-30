import { useState, useEffect, useCallback } from 'react';

export function useKnownWords() {
  const [knownWords, setKnownWords] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Load known words
  useEffect(() => {
    chrome.storage.local.get(['knownWords'], (result) => {
      const words = result.knownWords || [];
      setKnownWords(new Set(words));
      setLoading(false);
    });
  }, []);

  // Save known words
  const saveKnownWords = useCallback((words: Set<string>) => {
    const wordsArray = Array.from(words);
    chrome.storage.local.set({ knownWords: wordsArray }, () => {
      setKnownWords(words);
    });
  }, []);

  // Add word
  const addWord = useCallback(
    (word: string) => {
      const newSet = new Set(knownWords);
      newSet.add(word.toLowerCase());
      saveKnownWords(newSet);
    },
    [knownWords, saveKnownWords]
  );

  // Remove word
  const removeWord = useCallback(
    (word: string) => {
      const newSet = new Set(knownWords);
      newSet.delete(word.toLowerCase());
      saveKnownWords(newSet);
    },
    [knownWords, saveKnownWords]
  );

  // Check if word is known
  const isKnown = useCallback(
    (word: string) => {
      return knownWords.has(word.toLowerCase());
    },
    [knownWords]
  );

  return {
    knownWords,
    loading,
    addWord,
    removeWord,
    isKnown,
    importWords: (words: string[]) => {
      const newSet = new Set([...knownWords, ...words.map(w => w.toLowerCase())]);
      saveKnownWords(newSet);
    },
    exportWords: () => Array.from(knownWords),
  };
}

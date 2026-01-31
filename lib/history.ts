import type { HistoryItem } from "./types";

const HISTORY_KEY = "english-train-history";
const MAX_HISTORY = 20;

/**
 * Get history from localStorage
 */
export function getHistory(): HistoryItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) {
      return [];
    }
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Add item to history
 */
export function addToHistory(feedback: HistoryItem): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const history = getHistory();
    const newHistory = [feedback, ...history].slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(newHistory));
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Clear history
 */
export function clearHistory(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch {
    // Ignore localStorage errors
  }
}

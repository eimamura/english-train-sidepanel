/**
 * Feedback response type from backend
 */
export type Feedback = {
  raw_transcript: string;
  corrected: string;
  issues: string[];
  better_options: string[];
  drill: string;
  score: number;
  timings_ms?: {
    stt?: number;
    llm?: number;
    total?: number;
  };
};

/**
 * Application state
 */
export type AppState =
  | "idle"
  | "recording"
  | "uploading"
  | "processing"
  | "done"
  | "error";

/**
 * History item
 */
export type HistoryItem = Feedback & {
  timestamp: number;
  id: string;
};

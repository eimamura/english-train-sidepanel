/**
 * Score breakdown by category
 */
export type ScoreBreakdown = {
  vocabulary: number;
  grammar: number;
  understandability: number;
  vocabulary_reason: string;
  grammar_reason: string;
  understandability_reason: string;
};

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
  score_breakdown: ScoreBreakdown;
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

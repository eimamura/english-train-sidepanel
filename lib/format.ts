import type { Feedback } from "./types";

/**
 * Format feedback as Markdown for clipboard
 */
export function formatFeedbackAsMarkdown(feedback: Feedback): string {
  const lines = [
    `RAW: ${feedback.raw_transcript}`,
    `FIX: ${feedback.corrected}`,
    "",
    "ISSUES:",
    ...feedback.issues.map((issue) => `- ${issue}`),
    "",
    "OPTIONS:",
    ...feedback.better_options.map((option) => `- ${option}`),
    "",
    `DRILL: ${feedback.drill}`,
    "",
    `OVERALL SCORE: ${feedback.score}/100`,
    "",
    "SCORE BREAKDOWN:",
    `- Vocabulary: ${feedback.score_breakdown.vocabulary}/100`,
    `  Reason: ${feedback.score_breakdown.vocabulary_reason}`,
    `- Grammar: ${feedback.score_breakdown.grammar}/100`,
    `  Reason: ${feedback.score_breakdown.grammar_reason}`,
    `- Understandability: ${feedback.score_breakdown.understandability}/100`,
    `  Reason: ${feedback.score_breakdown.understandability_reason}`,
  ];

  if (feedback.timings_ms) {
    lines.push("");
    lines.push("TIMINGS:");
    if (feedback.timings_ms.stt) {
      lines.push(`- STT: ${feedback.timings_ms.stt}ms`);
    }
    if (feedback.timings_ms.llm) {
      lines.push(`- LLM: ${feedback.timings_ms.llm}ms`);
    }
    if (feedback.timings_ms.total) {
      lines.push(`- Total: ${feedback.timings_ms.total}ms`);
    }
  }

  return lines.join("\n");
}

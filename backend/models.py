"""
Pydantic models for API responses
"""
from typing import Optional
from pydantic import BaseModel, Field


class TimingsMs(BaseModel):
    """Timing information in milliseconds"""
    stt: Optional[int] = None
    llm: Optional[int] = None
    total: Optional[int] = None


class PromptsResponse(BaseModel):
    """Practice prompts response"""
    topics: list[str] = Field(..., min_length=3, max_length=3, description="3 random topics for practice")
    grammar_points: list[str] = Field(..., min_length=3, max_length=3, description="3 random grammar points to practice")
    advice: str = Field(..., description="1 piece of advice for the practice session")


class ScoreBreakdown(BaseModel):
    """Score breakdown by category"""
    vocabulary: int = Field(..., ge=0, le=100, description="Vocabulary score (0-100)")
    grammar: int = Field(..., ge=0, le=100, description="Grammar score (0-100)")
    understandability: int = Field(..., ge=0, le=100, description="Understandability for Americans score (0-100)")
    vocabulary_reason: str = Field(..., description="Explanation for vocabulary score")
    grammar_reason: str = Field(..., description="Explanation for grammar score")
    understandability_reason: str = Field(..., description="Explanation for understandability score")


class FeedbackResponse(BaseModel):
    """Feedback response schema"""
    raw_transcript: str = Field(..., description="Raw transcript without correction")
    corrected: str = Field(..., description="Corrected natural English (1-2 sentences)")
    issues: list[str] = Field(..., max_length=3, description="Issues found (max 3, short phrases)")
    better_options: list[str] = Field(..., max_length=2, description="Better alternatives (max 2, short phrases)")
    drill: str = Field(..., description="Practice sentence with same structure")
    score: int = Field(..., ge=0, le=100, description="Overall score from 0 to 100 (average of vocabulary, grammar, understandability)")
    score_breakdown: ScoreBreakdown = Field(..., description="Detailed score breakdown with explanations")
    timings_ms: Optional[TimingsMs] = Field(None, description="Timing information")

    class Config:
        json_schema_extra = {
            "example": {
                "raw_transcript": "I go to school yesterday",
                "corrected": "I went to school yesterday.",
                "issues": ["Past tense: 'go' should be 'went'"],
                "better_options": ["I attended school yesterday.", "I was at school yesterday."],
                "drill": "I went to the store yesterday.",
                "score": 75,
                "timings_ms": {"stt": 1200, "llm": 3500, "total": 5000}
            }
        }

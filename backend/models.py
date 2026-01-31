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


class FeedbackResponse(BaseModel):
    """Feedback response schema"""
    raw_transcript: str = Field(..., description="Raw transcript without correction")
    corrected: str = Field(..., description="Corrected natural English (1-2 sentences)")
    issues: list[str] = Field(..., max_length=3, description="Issues found (max 3, short phrases)")
    better_options: list[str] = Field(..., max_length=2, description="Better alternatives (max 2, short phrases)")
    drill: str = Field(..., description="Practice sentence with same structure")
    score: int = Field(..., ge=0, le=100, description="Score from 0 to 100")
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

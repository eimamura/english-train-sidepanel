"""
LLM feedback generation using Ollama
Fixed JSON schema output for consistent feedback format
"""
import json
import time
import ollama
from typing import Optional
from pydantic import ValidationError

from models import FeedbackResponse, ScoreBreakdown


class LLMFeedbackGenerator:
    """Generate feedback using local LLM (Ollama)"""
    
    def __init__(
        self,
        base_url: str = "http://127.0.0.1:11434",
        model: str = "llama3.2:3b"
    ):
        """
        Initialize LLM feedback generator
        
        Args:
            base_url: Ollama base URL
            model: Model name to use
        """
        self.base_url = base_url
        self.model = model
        self.client = ollama.Client(host=base_url)
    
    def change_model(self, model: str):
        """
        Change LLM model
        
        Args:
            model: New model name
        """
        if model == self.model:
            return  # Already using this model
        
        print(f"Changing LLM model from {self.model} to {model}")
        self.model = model
        print(f"Model changed successfully")
    
    def _create_prompt(self, raw_transcript: str) -> str:
        """Create prompt for LLM"""
        return f"""You are a strict English learning evaluator. Analyze the following raw transcript and provide detailed feedback with strict scoring.

Raw transcript: "{raw_transcript}"

Provide feedback in the following JSON format:
{{
  "corrected": "Natural English version (1-2 sentences)",
  "issues": ["Issue 1", "Issue 2", "Issue 3"],
  "better_options": ["Better option 1", "Better option 2"],
  "drill": "Practice sentence with same structure",
  "score": 75,
  "score_breakdown": {{
    "vocabulary": 80,
    "grammar": 70,
    "understandability": 75,
    "vocabulary_reason": "Explanation of vocabulary score",
    "grammar_reason": "Explanation of grammar score",
    "understandability_reason": "Explanation of understandability score"
  }}
}}

Scoring Rules (BE STRICT):
1. Vocabulary (0-100): Evaluate word choice, precision, and appropriateness
   - 90-100: Excellent, native-like vocabulary
   - 70-89: Good, but some imprecise or awkward word choices
   - 50-69: Basic vocabulary, some incorrect word usage
   - 0-49: Poor vocabulary, many incorrect or inappropriate words

2. Grammar (0-100): Evaluate grammatical correctness
   - 90-100: Perfect grammar, no errors
   - 70-89: Minor errors, mostly correct
   - 50-69: Several errors, affects meaning
   - 0-49: Many serious errors, difficult to understand

3. Understandability for Americans (0-100): How easily Americans would understand
   - 90-100: Perfectly natural, sounds like native American English
   - 70-89: Understandable but slightly unnatural phrasing
   - 50-69: Understandable but awkward or unclear
   - 0-49: Difficult to understand, confusing phrasing

Overall score: Average of vocabulary, grammar, and understandability (rounded to nearest integer)

General Rules:
- "corrected": Fix grammar and make it natural American English (1-2 sentences max)
- "issues": List up to 3 specific issues found (short phrases)
- "better_options": Provide up to 2 alternative ways to express the same idea in natural American English (short phrases)
- "drill": Create one practice sentence using the same grammatical structure
- Be STRICT in scoring - native-like quality should score 90+, anything less should be penalized appropriately
- Provide clear explanations for each score category

Return ONLY valid JSON, no additional text."""

    def generate_feedback(self, raw_transcript: str) -> tuple[FeedbackResponse, float]:
        """
        Generate feedback for raw transcript
        
        Args:
            raw_transcript: Raw transcript text
        
        Returns:
            Tuple of (FeedbackResponse, elapsed_time_ms)
        """
        if not raw_transcript.strip():
            # Empty transcript
            return FeedbackResponse(
                raw_transcript=raw_transcript,
                corrected="(empty)",
                issues=["No speech detected"],
                better_options=[],
                drill="Please try speaking again.",
                score=0,
                score_breakdown=ScoreBreakdown(
                    vocabulary=0,
                    grammar=0,
                    understandability=0,
                    vocabulary_reason="No speech detected",
                    grammar_reason="No speech detected",
                    understandability_reason="No speech detected"
                )
            ), 0.0
        
        start_time = time.time()
        
        try:
            prompt = self._create_prompt(raw_transcript)
            
            # Call Ollama
            response = self.client.generate(
                model=self.model,
                prompt=prompt,
                options={
                    "temperature": 0.3,  # Lower temperature for more consistent output
                }
            )
            
            # Extract JSON from response
            response_text = response.get("response", "")
            
            # Try to extract JSON from response (might have markdown code blocks)
            json_text = response_text.strip()
            if json_text.startswith("```json"):
                json_text = json_text[7:]
            if json_text.startswith("```"):
                json_text = json_text[3:]
            if json_text.endswith("```"):
                json_text = json_text[:-3]
            json_text = json_text.strip()
            
            # Parse JSON
            feedback_data = json.loads(json_text)
            
            # Add raw_transcript
            feedback_data["raw_transcript"] = raw_transcript
            
            # Calculate overall score from breakdown if not provided
            if "score_breakdown" in feedback_data:
                breakdown = feedback_data["score_breakdown"]
                if "score" not in feedback_data or feedback_data["score"] == 0:
                    # Calculate average score
                    avg_score = round(
                        (breakdown["vocabulary"] + breakdown["grammar"] + breakdown["understandability"]) / 3
                    )
                    feedback_data["score"] = avg_score
            else:
                # Fallback: create default breakdown if not provided
                overall_score = feedback_data.get("score", 50)
                feedback_data["score_breakdown"] = {
                    "vocabulary": overall_score,
                    "grammar": overall_score,
                    "understandability": overall_score,
                    "vocabulary_reason": "Score breakdown not provided",
                    "grammar_reason": "Score breakdown not provided",
                    "understandability_reason": "Score breakdown not provided"
                }
            
            # Validate with Pydantic
            feedback = FeedbackResponse(**feedback_data)
            
            elapsed_ms = (time.time() - start_time) * 1000
            
            return feedback, elapsed_ms
            
        except json.JSONDecodeError as e:
            # Fallback if JSON parsing fails
            print(f"JSON decode error: {e}")
            return FeedbackResponse(
                raw_transcript=raw_transcript,
                corrected=raw_transcript,
                issues=["LLM response parsing failed"],
                better_options=[],
                drill="Please try again.",
                score=50,
                score_breakdown=ScoreBreakdown(
                    vocabulary=50,
                    grammar=50,
                    understandability=50,
                    vocabulary_reason="LLM response parsing failed",
                    grammar_reason="LLM response parsing failed",
                    understandability_reason="LLM response parsing failed"
                )
            ), (time.time() - start_time) * 1000
            
        except Exception as e:
            print(f"LLM error: {e}")
            return FeedbackResponse(
                raw_transcript=raw_transcript,
                corrected=raw_transcript,
                issues=[f"LLM error: {str(e)}"],
                better_options=[],
                drill="Please try again.",
                score=50,
                score_breakdown=ScoreBreakdown(
                    vocabulary=50,
                    grammar=50,
                    understandability=50,
                    vocabulary_reason=f"LLM error: {str(e)}",
                    grammar_reason=f"LLM error: {str(e)}",
                    understandability_reason=f"LLM error: {str(e)}"
                )
            ), (time.time() - start_time) * 1000

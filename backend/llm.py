"""
LLM feedback generation using Ollama
Fixed JSON schema output for consistent feedback format
"""
import json
import time
import ollama
from typing import Optional
from pydantic import ValidationError

from models import FeedbackResponse


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
        return f"""You are an English learning assistant. Analyze the following raw transcript and provide feedback.

Raw transcript: "{raw_transcript}"

Provide feedback in the following JSON format:
{{
  "corrected": "Natural English version (1-2 sentences)",
  "issues": ["Issue 1", "Issue 2", "Issue 3"],
  "better_options": ["Better option 1", "Better option 2"],
  "drill": "Practice sentence with same structure",
  "score": 85
}}

Rules:
- "corrected": Fix grammar and make it natural English (1-2 sentences max)
- "issues": List up to 3 specific issues found (short phrases)
- "better_options": Provide up to 2 alternative ways to express the same idea (short phrases)
- "drill": Create one practice sentence using the same grammatical structure
- "score": Score from 0-100 based on correctness and naturalness

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
                score=0
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
                score=50
            ), (time.time() - start_time) * 1000
            
        except Exception as e:
            print(f"LLM error: {e}")
            return FeedbackResponse(
                raw_transcript=raw_transcript,
                corrected=raw_transcript,
                issues=[f"LLM error: {str(e)}"],
                better_options=[],
                drill="Please try again.",
                score=50
            ), (time.time() - start_time) * 1000

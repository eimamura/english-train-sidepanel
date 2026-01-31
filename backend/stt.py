"""
Whisper STT implementation
GPU-accelerated speech-to-text with raw transcript output
"""
import time
import torch
import whisper
from pathlib import Path
from typing import Optional
import os


class STTEngine:
    """Whisper-based STT engine"""
    
    def __init__(
        self,
        model_name: str = "base.en",
        device: str = "cuda",
        compute_type: str = "float16"
    ):
        """
        Initialize STT engine
        
        Args:
            model_name: Whisper model name (base.en, small.en, etc.)
            device: Device to use (cuda, cpu)
            compute_type: Compute type (float16, float32, int8)
        """
        self.model_name = model_name
        self.device = device if torch.cuda.is_available() and device == "cuda" else "cpu"
        self.compute_type = compute_type if self.device == "cuda" else "float32"
        
        # Load model
        print(f"Loading Whisper model: {model_name} on {self.device}")
        self.model = whisper.load_model(model_name, device=self.device)
        print(f"Model loaded successfully")
    
    def transcribe(self, audio_path: Path) -> tuple[str, float]:
        """
        Transcribe audio file to raw text
        
        Args:
            audio_path: Path to audio file
        
        Returns:
            Tuple of (transcript, elapsed_time_ms)
        """
        start_time = time.time()
        
        # Transcribe with no language specified (auto-detect) or force English
        result = self.model.transcribe(
            str(audio_path),
            language="en",
            task="transcribe",
            fp16=(self.compute_type == "float16"),
            verbose=False
        )
        
        elapsed_ms = (time.time() - start_time) * 1000
        
        # Extract raw text (no post-processing)
        raw_text = result["text"].strip()
        
        return raw_text, elapsed_ms
    
    def change_model(self, model_name: str):
        """
        Change Whisper model
        
        Args:
            model_name: New model name
        """
        if model_name == self.model_name:
            return  # Already using this model
        
        print(f"Changing Whisper model from {self.model_name} to {model_name}")
        self.model_name = model_name
        self.model = whisper.load_model(model_name, device=self.device)
        print(f"Model changed successfully")
    
    def transcribe_bytes(self, audio_bytes: bytes) -> tuple[str, float]:
        """
        Transcribe audio bytes directly
        
        Args:
            audio_bytes: Audio data as bytes
        
        Returns:
            Tuple of (transcript, elapsed_time_ms)
        """
        # Save to temp file
        from convert import save_temp_audio
        
        temp_path = save_temp_audio(audio_bytes, suffix=".wav")
        try:
            return self.transcribe(temp_path)
        finally:
            # Cleanup
            if temp_path.exists():
                temp_path.unlink()

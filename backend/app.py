"""
FastAPI application for English learning feedback
"""
import os
import sys
import time
from pathlib import Path

# Ensure backend directory is in Python path
backend_dir = Path(__file__).parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic_settings import BaseSettings
from pydantic import BaseModel
from typing import Optional, List

from models import FeedbackResponse, TimingsMs
from stt import STTEngine
from llm import LLMFeedbackGenerator
from convert import convert_to_wav, save_temp_audio
import ollama


class Settings(BaseSettings):
    """Application settings"""
    stt_model: str = "base.en"
    stt_device: str = "cuda"
    stt_compute: str = "float16"
    vad_silence_ms: int = 700
    llm_provider: str = "ollama"
    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "llama3.2:3b"
    host: str = "127.0.0.1"
    port: int = 8000
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"  # Ignore extra fields from .env
    }


# Load settings
settings = Settings()

# Initialize components
stt_engine = STTEngine(
    model_name=settings.stt_model,
    device=settings.stt_device,
    compute_type=settings.stt_compute
)

llm_generator = LLMFeedbackGenerator(
    base_url=settings.ollama_base_url,
    model=settings.ollama_model
)

# Create FastAPI app
app = FastAPI(
    title="English Learning Feedback API",
    description="Fast feedback loop for English learning with STT and LLM",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ModelChangeRequest(BaseModel):
    stt_model: Optional[str] = None
    llm_model: Optional[str] = None


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "stt_device": stt_engine.device,
        "stt_model": stt_engine.model_name,
        "llm_model": llm_generator.model
    }


@app.get("/models")
async def get_available_models():
    """Get available models"""
    # Whisper models
    whisper_models = [
        "tiny.en",
        "base.en",
        "small.en",
        "medium.en",
        "large-v2",
        "large-v3"
    ]
    
    # Get Ollama models
    ollama_models = []
    try:
        client = ollama.Client(host=settings.ollama_base_url)
        models_list = client.list()
        ollama_models = [model["name"] for model in models_list.get("models", [])]
    except Exception as e:
        print(f"Error fetching Ollama models: {e}")
        ollama_models = []
    
    return {
        "stt_models": whisper_models,
        "llm_models": ollama_models,
        "current_stt_model": stt_engine.model_name,
        "current_llm_model": llm_generator.model
    }


@app.post("/models/change")
async def change_models(request: ModelChangeRequest):
    """Change models"""
    try:
        if request.stt_model:
            if request.stt_model not in [
                "tiny.en", "base.en", "small.en", "medium.en", "large-v2", "large-v3"
            ]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid STT model: {request.stt_model}"
                )
            stt_engine.change_model(request.stt_model)
        
        if request.llm_model:
            # Verify model exists in Ollama
            try:
                client = ollama.Client(host=settings.ollama_base_url)
                models_list = client.list()
                available_models = [model["name"] for model in models_list.get("models", [])]
                if request.llm_model not in available_models:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Model {request.llm_model} not found in Ollama. Available: {available_models}"
                    )
            except Exception as e:
                raise HTTPException(
                    status_code=500,
                    detail=f"Error verifying Ollama model: {str(e)}"
                )
            llm_generator.change_model(request.llm_model)
        
        return {
            "status": "ok",
            "stt_model": stt_engine.model_name,
            "llm_model": llm_generator.model
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error changing models: {str(e)}"
        )


@app.post("/feedback", response_model=FeedbackResponse)
async def feedback_endpoint(audio: UploadFile = File(...)):
    """
    Process audio and return feedback
    
    Args:
        audio: Audio file (WebM/Opus recommended)
    
    Returns:
        FeedbackResponse with transcript and feedback
    """
    total_start = time.time()
    
    try:
        # Read audio data
        audio_data = await audio.read()
        
        if len(audio_data) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")
        
        # Determine input format
        # Note: WebM with Opus codec should be treated as "webm" format
        content_type = audio.content_type or ""
        input_format = "webm"  # Default for browser recordings
        if "wav" in content_type.lower():
            input_format = "wav"
        elif "mp3" in content_type.lower():
            input_format = "mp3"
        elif "m4a" in content_type.lower() or "mp4" in content_type.lower():
            input_format = "m4a"
        
        # Convert to WAV if needed (pydub handles webm/opus automatically)
        if input_format != "wav":
            wav_data = convert_to_wav(audio_data, input_format=input_format)
        else:
            wav_data = audio_data
        
        # STT: Transcribe audio
        raw_transcript, stt_time_ms = stt_engine.transcribe_bytes(wav_data)
        
        # LLM: Generate feedback
        feedback, llm_time_ms = llm_generator.generate_feedback(raw_transcript)
        
        # Update timings
        total_time_ms = (time.time() - total_start) * 1000
        feedback.timings_ms = TimingsMs(
            stt=round(stt_time_ms),
            llm=round(llm_time_ms),
            total=round(total_time_ms)
        )
        
        return feedback
        
    except Exception as e:
        print(f"Error processing feedback: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing audio: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    import sys
    from pathlib import Path
    
    # Add parent directory to path for imports
    backend_dir = Path(__file__).parent
    sys.path.insert(0, str(backend_dir.parent))
    
    uvicorn.run(
        "backend.app:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        reload_dirs=[str(backend_dir)]
    )

"""
Audio conversion utilities
Convert WebM/Opus to 16kHz mono WAV for Whisper
"""
import io
import tempfile
from pathlib import Path
from typing import BinaryIO

from pydub import AudioSegment


def convert_to_wav(audio_data: bytes, input_format: str = "webm") -> bytes:
    """
    Convert audio data to 16kHz mono WAV format
    
    Args:
        audio_data: Raw audio bytes
        input_format: Input format (webm, mp3, m4a, etc.)
                     Note: WebM with Opus codec should use "webm" format
    
    Returns:
        WAV audio bytes (16kHz, mono)
    """
    # Load audio from bytes
    # pydub will use ffmpeg to decode, which handles webm/opus automatically
    try:
        audio = AudioSegment.from_file(io.BytesIO(audio_data), format=input_format)
    except Exception as e:
        # Fallback: try without format specification (auto-detect)
        print(f"Warning: Failed to load as {input_format}, trying auto-detect: {e}")
        audio = AudioSegment.from_file(io.BytesIO(audio_data))
    
    # Convert to 16kHz mono
    audio = audio.set_frame_rate(16000)
    audio = audio.set_channels(1)
    
    # Export to WAV bytes
    wav_buffer = io.BytesIO()
    audio.export(wav_buffer, format="wav")
    wav_buffer.seek(0)
    
    return wav_buffer.read()


def save_temp_audio(audio_data: bytes, suffix: str = ".wav") -> Path:
    """
    Save audio data to temporary file
    
    Args:
        audio_data: Audio bytes
        suffix: File suffix
    
    Returns:
        Path to temporary file
    """
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    temp_file.write(audio_data)
    temp_file.close()
    return Path(temp_file.name)

# Backend - English Learning Feedback API

Python FastAPI backend for English learning feedback with Whisper STT and Ollama LLM.

## Requirements

- Python 3.10+
- CUDA-capable GPU (recommended) or CPU
- Ollama installed and running locally
- FFmpeg (for audio conversion)

## Setup

### 1. Install dependencies using uv

```bash
# Install uv if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Python dependencies
cd backend
uv sync
```

Note: `uv sync` uses `pyproject.toml` for dependency management. If you prefer using `requirements.txt`, you can use `uv pip install -r requirements.txt` instead.

### 2. Install Whisper models

Whisper models will be downloaded automatically on first use. For `base.en`:
- Size: ~150MB
- First run will download the model

### 3. Install and start Ollama

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Start Ollama service (if not running)
ollama serve

# Pull the model (in another terminal)
ollama pull llama3.2:3b
```

### 4. Configure environment

Copy `.env.example` to `.env` and adjust settings:

```bash
cp .env.example .env
```

Edit `.env`:
- `STT_MODEL`: Whisper model (`base.en`, `small.en`, etc.)
- `STT_DEVICE`: `cuda` (GPU) or `cpu`
- `STT_COMPUTE`: `float16` (GPU) or `float32` (CPU)
- `OLLAMA_BASE_URL`: Ollama server URL (default: `http://127.0.0.1:11434`)
- `OLLAMA_MODEL`: Model name (default: `llama3.2:3b`)

## Running

```bash
# Option 1: Using uv run (recommended)
cd backend
uv run python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload

# Option 2: Activate virtual environment first
cd backend
source .venv/bin/activate
python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload

# Option 3: From project root directory
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000 --reload
```

The API will be available at `http://127.0.0.1:8000`

## API Endpoints

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "stt_device": "cuda",
  "stt_model": "base.en",
  "llm_model": "llama3.2:3b"
}
```

### `POST /feedback`

Process audio and return feedback.

**Request:**
- `multipart/form-data`
- `audio`: Audio file (WebM/Opus recommended)

**Response:**
```json
{
  "raw_transcript": "I go to school yesterday",
  "corrected": "I went to school yesterday.",
  "issues": ["Past tense: 'go' should be 'went'"],
  "better_options": ["I attended school yesterday.", "I was at school yesterday."],
  "drill": "I went to the store yesterday.",
  "score": 75,
  "timings_ms": {
    "stt": 1200,
    "llm": 3500,
    "total": 5000
  }
}
```

## Performance

- **STT**: ~1-3 seconds (GPU) or ~5-10 seconds (CPU) for 5-10 second audio
- **LLM**: ~2-5 seconds depending on model
- **Total**: Target 5-15 seconds per feedback loop

## Troubleshooting

### GPU not detected

- Check CUDA installation: `nvidia-smi`
- Install PyTorch with CUDA: `uv pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118`
- Set `STT_DEVICE=cpu` in `.env` to fallback to CPU

### Ollama connection error

- Ensure Ollama is running: `ollama serve`
- Check `OLLAMA_BASE_URL` in `.env`
- Verify model is pulled: `ollama list`

### Audio conversion errors

- Install FFmpeg: `sudo apt-get install ffmpeg` (Linux) or `brew install ffmpeg` (macOS)
- Ensure `pydub` is installed: `uv pip install pydub`

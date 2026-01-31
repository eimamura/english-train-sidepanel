# English Learning Feedback Tool

Ultra-fast feedback loop tool for English learning with speech-to-text and LLM-powered feedback.

## Features

- **Fast Feedback**: 5-15 second response time per speech
- **Raw Transcript**: Uncorrected STT output for learning
- **Structured Feedback**: Fixed format with corrections, issues, alternatives, drill, and score
- **History**: Local storage of recent feedback (up to 20 items)
- **Copy to Clipboard**: Markdown-formatted feedback export

## Architecture

```
Browser (Next.js/TS) → Next API Routes → Python Backend (FastAPI)
  ↓                        ↓                      ↓
録音・UI表示          /api/feedback         STT → LLM → JSON
```

- **Frontend**: Next.js 14+ with TypeScript
- **Backend**: FastAPI with Whisper STT and Ollama LLM
- **STT**: OpenAI Whisper (GPU-accelerated)
- **LLM**: Ollama (local LLM)

## Prerequisites

- Node.js 18+ and pnpm
- Python 3.10+
- CUDA-capable GPU (recommended) or CPU
- Ollama installed and running
- FFmpeg (for audio conversion)

## Setup

### 1. Frontend Setup

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.local.example .env.local

# Edit .env.local if needed
# FEEDBACK_API_URL=http://127.0.0.1:8000/feedback
# HEALTH_API_URL=http://127.0.0.1:8000/health
```

### 2. Backend Setup

See [backend/README.md](backend/README.md) for detailed setup instructions.

Quick setup:

```bash
cd backend

# Install dependencies using uv
uv sync

# Copy environment variables
cp .env.example .env

# Edit .env if needed (STT_MODEL, OLLAMA_MODEL, etc.)

# Start Ollama (if not running)
ollama serve

# Pull LLM model
ollama pull llama3.2:3b
```

### 3. Start Services

**Terminal 1 - Backend:**
```bash
cd backend
uv run python -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload

```

**Terminal 2 - Frontend:**
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Click **Record** button to start recording
2. Speak your English sentence
3. Click **Stop Recording** to process
4. View feedback: RAW transcript, corrected version, issues, better options, drill, and score
5. Click **Copy** to copy feedback as Markdown to clipboard
6. View history by clicking on history items

## Configuration

### Frontend (`.env.local`)

- `FEEDBACK_API_URL`: Backend API URL (default: `http://127.0.0.1:8000/feedback`)
- `HEALTH_API_URL`: Backend health check URL (default: `http://127.0.0.1:8000/health`)

### Backend (`backend/.env`)

- `STT_MODEL`: Whisper model (`base.en`, `small.en`, etc.)
- `STT_DEVICE`: `cuda` (GPU) or `cpu`
- `STT_COMPUTE`: `float16` (GPU) or `float32` (CPU)
- `OLLAMA_BASE_URL`: Ollama server URL
- `OLLAMA_MODEL`: LLM model name

## Performance Targets

- **Goal**: 5-15 seconds per feedback loop
- **STT**: ~1-3 seconds (GPU) or ~5-10 seconds (CPU)
- **LLM**: ~2-5 seconds (depending on model)

## Project Structure

```
/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── feedback/      # Feedback endpoint
│   │   └── health/        # Health check endpoint
│   ├── page.tsx           # Main UI
│   └── layout.tsx         # Root layout
├── lib/                   # Shared utilities
│   ├── types.ts          # TypeScript types
│   ├── format.ts         # Markdown formatting
│   └── history.ts        # History management
├── backend/               # Python backend
│   ├── app.py            # FastAPI application
│   ├── stt.py            # Whisper STT
│   ├── llm.py            # Ollama LLM
│   ├── convert.py        # Audio conversion
│   └── models.py         # Pydantic models
└── README.md
```

## Troubleshooting

### Microphone Permission

- Browser will prompt for microphone access
- Ensure microphone permissions are granted in browser settings

### Backend Not Responding

- Check backend is running: `curl http://127.0.0.1:8000/health`
- Verify Ollama is running: `ollama list`
- Check backend logs for errors

### GPU Not Detected

- Verify CUDA: `nvidia-smi`
- Install PyTorch with CUDA support
- Set `STT_DEVICE=cpu` in `backend/.env` to use CPU

### Audio Conversion Errors

- Install FFmpeg: `sudo apt-get install ffmpeg` (Linux) or `brew install ffmpeg` (macOS)

## Future Enhancements

- VAD (Voice Activity Detection) for automatic recording stop
- SRS (Spaced Repetition System) for drill practice
- Pronunciation scoring
- Obsidian vault integration for log export
- GitHub CI/CD for builds

## License

MIT

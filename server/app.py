import io
import json
import re
import numpy as np
import soundfile as sf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

app = FastAPI(title="Kokoro TTS Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Chunk-Map", "X-Chunk-Index", "X-Chunk-Duration"],
)

# Lazy-load pipeline on first request
_pipeline = None

SAMPLE_RATE = 24000

VOICES = [
    "af_heart", "af_alloy", "af_aoede", "af_bella", "af_jessica",
    "af_kore", "af_nicole", "af_nova", "af_river", "af_sarah", "af_sky",
    "am_adam", "am_echo", "am_eric", "am_liam", "am_michael", "am_onyx",
]


def get_pipeline():
    global _pipeline
    if _pipeline is None:
        from kokoro import KPipeline
        _pipeline = KPipeline(lang_code="a")
    return _pipeline


def chunk_text(text: str, max_chars: int = 500) -> list[str]:
    """Split text into sentence-based chunks, each under max_chars."""
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    chunks = []
    current = ""
    for sentence in sentences:
        if not sentence:
            continue
        if current and len(current) + len(sentence) + 1 > max_chars:
            chunks.append(current.strip())
            current = sentence
        else:
            current = f"{current} {sentence}" if current else sentence
    if current.strip():
        chunks.append(current.strip())
    # If no sentence boundaries were found, split by max_chars at word boundaries
    if not chunks:
        chunks = [text.strip()]
    final = []
    for chunk in chunks:
        if len(chunk) <= max_chars:
            final.append(chunk)
        else:
            words = chunk.split()
            part = ""
            for word in words:
                if part and len(part) + len(word) + 1 > max_chars:
                    final.append(part.strip())
                    part = word
                else:
                    part = f"{part} {word}" if part else word
            if part.strip():
                final.append(part.strip())
    return final


class TTSRequest(BaseModel):
    text: str
    voice: str = "af_heart"
    speed: float = 1.0


class ChunkRequest(BaseModel):
    text: str
    voice: str = "af_heart"
    speed: float = 1.0
    index: int = 0  # chunk index (for client tracking)


class PrepareRequest(BaseModel):
    text: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/voices")
def voices():
    return {"voices": VOICES}


@app.post("/tts/prepare")
def tts_prepare(req: PrepareRequest):
    """Split text into chunks and return them for client-side parallel processing."""
    if not req.text.strip():
        raise HTTPException(400, "Text is empty")
    chunks = chunk_text(req.text)
    return {"chunks": chunks, "total": len(chunks)}


@app.post("/tts/chunk")
def tts_chunk(req: ChunkRequest):
    """Generate audio for a single text chunk. Returns WAV + duration metadata."""
    if not req.text.strip():
        raise HTTPException(400, "Text is empty")
    if req.voice not in VOICES:
        raise HTTPException(400, f"Unknown voice: {req.voice}")

    pipeline = get_pipeline()
    audio_parts = []
    for _gs, _ps, audio in pipeline(req.text, voice=req.voice, speed=req.speed):
        if audio is not None:
            audio_parts.append(audio)

    if not audio_parts:
        raise HTTPException(500, "Failed to generate audio for chunk")

    chunk_audio = np.concatenate(audio_parts)
    duration = len(chunk_audio) / SAMPLE_RATE

    buf = io.BytesIO()
    sf.write(buf, chunk_audio, SAMPLE_RATE, format="WAV")
    wav_bytes = buf.getvalue()

    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={
            "X-Chunk-Index": str(req.index),
            "X-Chunk-Duration": str(round(duration, 3)),
        },
    )


@app.post("/tts")
def tts(req: TTSRequest):
    """Generate audio for full text (kept for short texts / backward compat)."""
    if not req.text.strip():
        raise HTTPException(400, "Text is empty")
    if req.voice not in VOICES:
        raise HTTPException(400, f"Unknown voice: {req.voice}")

    pipeline = get_pipeline()
    chunks = chunk_text(req.text)
    all_audio = []
    chunk_map = []
    current_time = 0.0

    for chunk in chunks:
        chunk_audio_parts = []
        for _gs, _ps, audio in pipeline(chunk, voice=req.voice, speed=req.speed):
            if audio is not None:
                chunk_audio_parts.append(audio)

        if chunk_audio_parts:
            chunk_audio = np.concatenate(chunk_audio_parts)
            duration = len(chunk_audio) / SAMPLE_RATE
            chunk_map.append({
                "start": round(current_time, 3),
                "end": round(current_time + duration, 3),
                "text": chunk,
            })
            current_time += duration
            all_audio.append(chunk_audio)

            # Add a small silence gap between chunks (200ms)
            silence = np.zeros(int(SAMPLE_RATE * 0.2))
            all_audio.append(silence)
            current_time += 0.2

    if not all_audio:
        raise HTTPException(500, "Failed to generate audio")

    combined = np.concatenate(all_audio)

    buf = io.BytesIO()
    sf.write(buf, combined, SAMPLE_RATE, format="WAV")
    wav_bytes = buf.getvalue()

    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={"X-Chunk-Map": json.dumps(chunk_map)},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8787)

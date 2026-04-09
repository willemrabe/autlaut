#!/bin/bash
cd "$(dirname "$0")"
echo "Starting Kokoro TTS Server on http://localhost:8787"
echo "First run will download the Kokoro model (~330MB)..."
python app.py

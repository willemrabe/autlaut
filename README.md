<p align="center">
  <img src="extension/icons/icon128.png" width="80" alt="Autlaut" />
</p>

<h1 align="center">Autlaut</h1>

<p align="center">
  A Chrome extension that reads any selected text aloud using natural-sounding voices — powered by <a href="https://github.com/hexgrad/kokoro">Kokoro TTS</a>.
</p>

<p align="center">
  <img src="docs/demo.gif" width="600" alt="Autlaut in action — chunked text-to-speech with live highlighting" />
  <!-- Replace docs/demo.gif with a screen recording of the chunking animation -->
</p>

---

## Features

- **Select & speak** — highlight text on any webpage and click the floating speaker button, or right-click and choose *Read with Autlaut*
- **Chunked generation** — text is split into natural sentences and processed in parallel with a live progress overlay
- **Inline highlighting** — the currently spoken passage is highlighted and auto-scrolled in real time
- **Full audio player** — play/pause, seek, skip 10 s, adjust speed (0.5x–2x) and volume, all from a bottom bar
- **17 voices** — pick from a range of voices and preview them instantly
- **Download** — save any reading as a WAV file
- **History** — every reading is logged with page title, text snippet, and one-click return to the source
- **Keyboard shortcuts** — `Space` play/pause, `←` / `→` seek, all without leaving the page
- **Dark UI** — coral-accented dark theme that stays out of the way

## Installation

### 1. Load the extension

1. Open `chrome://extensions` and enable **Developer mode**
2. Click **Load unpacked** and select the `extension/` folder
3. Note your **Extension ID** (shown on the card)

### 2. Start the server

```bash
cd server
pip install -r requirements.txt
python app.py
```

The server runs locally on `http://localhost:8787`. The Kokoro model (~330 MB) downloads automatically on the first request.

### 3. (Optional) Auto-start via native messaging

```bash
cd server
./install_host.sh <your-extension-id>
```

This registers a native messaging host so the extension can start and stop the server from the popup.

## Usage

1. Select text on any page
2. Click the orange speaker button that appears — or right-click and choose **Read with Autlaut**
3. Watch the progress overlay while chunks are generated
4. Listen, pause, seek, or download from the player bar

Open the extension popup to change the voice, adjust speed, view history, or toggle the server.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `←` | Rewind 5 s |
| `→` | Forward 5 s |
| `Esc` | Close shortcuts popover |

## Architecture

```
extension/
  popup.html / popup.js / popup.css   — settings, history, server toggle
  content.js / content.css            — FAB, player, highlighting, progress overlay
  background.js                       — message router, server lifecycle, TTS fetch
  lib/storage.js                      — Chrome storage helpers

server/
  app.py                              — FastAPI server with Kokoro TTS
  autlaut_host.py                     — native messaging host (server lifecycle)
  install_host.sh                     — registers the native messaging host
```

## Tech Stack

- [Kokoro](https://github.com/hexgrad/kokoro) 82M — lightweight, high-quality TTS model
- [FastAPI](https://fastapi.tiangolo.com/) + [Uvicorn](https://www.uvicorn.org/) — local inference server
- Chrome Extension Manifest V3 — content scripts, service worker, native messaging

## License

MIT

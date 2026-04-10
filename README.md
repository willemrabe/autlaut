<p align="center">
  <img src="extension/icons/icon128.png" width="80" alt="Autlaut" />
</p>

<h1 align="center">Autlaut</h1>

<p align="center">
  A Chrome extension that reads any selected text aloud using natural-sounding voices — powered by <a href="https://github.com/hexgrad/kokoro">Kokoro TTS</a>, running entirely in-browser.
</p>

---

## Changelog

### v2.0.0 — Self-contained browser TTS

- **Removed Python server entirely** — TTS now runs fully in-browser via kokoro-js and ONNX Runtime WebAssembly. No more `pip install`, no native messaging host, no localhost server.
- **Web Worker pool** — configurable 2-4 parallel workers for concurrent TTS inference. Each worker loads its own ONNX model instance for true parallelism.
- **Progressive chunking** — first chunk is kept small (~150 chars) for fast playback start, remaining chunks at ~300 chars.
- **New loading spinner** — round clock-face design with 8 animated pills replacing the old spinning arrow. Transitions seamlessly from the FAB button.
- **Generation stats** — progress overlay now shows words converted, audio duration, and words/sec throughput in real time.
- **Default voice** changed to `bm_daniel`.
- **Workers setting** — choose 2, 3, or 4 parallel workers from the settings panel to trade memory for speed.
- Build system added (esbuild) — run `npm install && npm run build`, load `dist/` in Chrome.

---

## Features

- **Select & speak** — highlight text on any webpage and click the floating speaker button, or right-click and choose *Read with Autlaut*
- **Self-contained** — TTS runs entirely in the browser via WebAssembly, no server or Python required
- **Chunked generation** — text is split into natural sentences and processed with a live progress overlay
- **Inline highlighting** — the currently spoken passage is highlighted and auto-scrolled in real time
- **Full audio player** — play/pause, seek, skip 10 s, adjust speed (0.5x-2x) and volume, all from a bottom bar
- **20+ voices** — pick from American and British English voices and preview them instantly
- **Download** — save any reading as a WAV file
- **History** — every reading is logged with page title, text snippet, and one-click return to the source
- **Keyboard shortcuts** — `Space` play/pause, arrow keys to seek, all without leaving the page
- **Dark UI** — coral-accented dark theme that stays out of the way

## Installation

### 1. Build the extension

```bash
npm install
npm run build
```

### 2. Load in Chrome

1. Open `chrome://extensions` and enable **Developer mode**
2. Click **Load unpacked** and select the `dist/` folder

### 3. Download the model

On first use (or from the popup settings), the Kokoro TTS model (~88 MB, quantized) will download from Hugging Face and cache in the browser. Subsequent uses load from cache.

## Usage

1. Select text on any page
2. Click the orange speaker button that appears — or right-click and choose **Read with Autlaut**
3. Watch the progress overlay while chunks are generated
4. Listen, pause, seek, or download from the player bar

Open the extension popup to change the voice, adjust speed, or view history.

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
  offscreen.html / offscreen.js       — worker pool dispatcher
  tts-worker.js                       — TTS engine (kokoro-js + ONNX Runtime WASM)
  popup.html / popup.js / popup.css   — settings, history, model status
  content.js / content.css            — FAB, player, highlighting, progress overlay
  background.js                       — message router, offscreen lifecycle
  lib/storage.js                      — Chrome storage helpers

build.js                              — esbuild bundler config
dist/                                 — built extension (load this in Chrome)
```

```
Content Script  -->  Background (SW)  -->  Offscreen (dispatcher)  -->  Worker 1 (ONNX)
                                                                   -->  Worker 2 (ONNX)
                                                                   -->  ...
```

## Tech Stack

- [Kokoro](https://github.com/hexgrad/kokoro) 82M — lightweight, high-quality TTS model
- [kokoro-js](https://www.npmjs.com/package/kokoro-js) — JavaScript/ONNX port for in-browser inference
- [ONNX Runtime Web](https://onnxruntime.ai/) — WebAssembly model execution
- Chrome Extension Manifest V3 — offscreen documents, content scripts, service worker

## License

MIT

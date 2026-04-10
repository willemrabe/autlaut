/* Autlaut — TTS Web Worker (runs kokoro-js model instance) */
import { KokoroTTS, env } from "kokoro-js";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const SAMPLE_RATE = 24000;

let tts = null;
let loading = false;

function toBase64DataUrl(wavBuffer) {
  const bytes = new Uint8Array(wavBuffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return "data:audio/wav;base64," + btoa(binary);
}

self.onmessage = async (e) => {
  const msg = e.data;

  try {
    if (msg.action === "init") {
      // Configure WASM paths (passed from offscreen document)
      env.wasmPaths = msg.wasmPaths;

      if (tts) {
        self.postMessage({ id: msg.id, result: { ok: true } });
        return;
      }
      if (loading) {
        while (loading) await new Promise((r) => setTimeout(r, 200));
        self.postMessage({ id: msg.id, result: { ok: true } });
        return;
      }

      loading = true;
      try {
        tts = await KokoroTTS.from_pretrained(MODEL_ID, {
          dtype: "q8",
          device: "wasm",
          progress_callback: (progress) => {
            self.postMessage({ type: "progress", progress });
          },
        });
        self.postMessage({ id: msg.id, result: { ok: true } });
      } finally {
        loading = false;
      }
      return;
    }

    if (msg.action === "generate") {
      if (!tts) throw new Error("Model not loaded");
      const audio = await tts.generate(msg.text, {
        voice: msg.voice || "bm_daniel",
        speed: msg.speed || 1.0,
      });
      const duration = audio.audio.length / SAMPLE_RATE;
      self.postMessage({
        id: msg.id,
        result: {
          dataUrl: toBase64DataUrl(audio.toWav()),
          duration,
          index: msg.index,
        },
      });
      return;
    }

    if (msg.action === "voices") {
      if (!tts) throw new Error("Model not loaded");
      self.postMessage({
        id: msg.id,
        result: { voices: Object.keys(tts.voices) },
      });
      return;
    }

    self.postMessage({ id: msg.id, error: `Unknown action: ${msg.action}` });
  } catch (err) {
    self.postMessage({ id: msg.id, error: err.message || String(err) });
  }
};

/* Autlaut — Offscreen TTS Engine (worker pool dispatcher) */

const DEFAULT_WORKERS = 2;
const MAX_WORKERS = 4;
const SAMPLE_RATE = 24000;
const FIRST_CHUNK_MAX = 150;
const REST_CHUNK_MAX = 300;

const wasmPaths = chrome.runtime.getURL("lib/");

// --- Worker pool ---

let workers = [];
let workerReady = [];
let targetWorkerCount = DEFAULT_WORKERS;
let msgId = 0;
const pending = new Map(); // id → { resolve, reject }

function spawnWorker(index) {
  const w = new Worker(chrome.runtime.getURL("tts-worker.js"), { type: "module" });
  w.onmessage = (e) => {
    const data = e.data;
    if (data.type === "progress") {
      chrome.runtime.sendMessage({
        target: "background",
        action: "model-progress",
        progress: data.progress,
      }).catch(() => {});
      return;
    }
    const p = pending.get(data.id);
    if (p) {
      pending.delete(data.id);
      if (data.error) p.reject(new Error(data.error));
      else p.resolve(data.result);
    }
  };
  w.onerror = (err) => {
    console.error(`[Autlaut] Worker ${index} error:`, err);
  };
  return w;
}

function ensurePoolSize(count) {
  count = Math.max(1, Math.min(MAX_WORKERS, count));
  targetWorkerCount = count;

  // Add workers if needed
  while (workers.length < count) {
    workers.push(spawnWorker(workers.length));
    workerReady.push(false);
  }
}

function sendToWorker(workerIdx, msg) {
  return new Promise((resolve, reject) => {
    const id = ++msgId;
    pending.set(id, { resolve, reject });
    workers[workerIdx].postMessage({ ...msg, id });
  });
}

async function ensureWorkersReady(count) {
  ensurePoolSize(count || targetWorkerCount);

  const initPromises = [];
  for (let i = 0; i < targetWorkerCount; i++) {
    if (!workerReady[i]) {
      initPromises.push(
        sendToWorker(i, { action: "init", wasmPaths }).then(() => {
          workerReady[i] = true;
        })
      );
    }
  }
  if (initPromises.length > 0) await Promise.all(initPromises);
}

// Round-robin dispatch
let nextWorker = 0;

function pickWorker() {
  const idx = nextWorker % targetWorkerCount;
  nextWorker = (nextWorker + 1) % targetWorkerCount;
  return idx;
}

// --- Progressive text chunking ---

function chunkText(text) {
  const sentences = text.trim().split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = "";
  let isFirst = true;

  for (const sentence of sentences) {
    if (!sentence) continue;
    const maxChars = isFirst ? FIRST_CHUNK_MAX : REST_CHUNK_MAX;

    if (current && current.length + sentence.length + 1 > maxChars) {
      chunks.push(current.trim());
      isFirst = false;
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());

  if (chunks.length === 0) chunks.push(text.trim());

  // Split oversized chunks at word boundaries
  const final = [];
  for (let ci = 0; ci < chunks.length; ci++) {
    const chunk = chunks[ci];
    const maxChars = ci === 0 ? FIRST_CHUNK_MAX : REST_CHUNK_MAX;
    if (chunk.length <= maxChars) {
      final.push(chunk);
    } else {
      const words = chunk.split(/\s+/);
      let part = "";
      for (const word of words) {
        if (part && part.length + word.length + 1 > maxChars) {
          final.push(part.trim());
          part = word;
        } else {
          part = part ? `${part} ${word}` : word;
        }
      }
      if (part.trim()) final.push(part.trim());
    }
  }
  return final;
}

// --- Message handler ---

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.target !== "offscreen") return;

  const handle = async () => {
    switch (msg.action) {
      case "tts-init": {
        await ensureWorkersReady(msg.workers || DEFAULT_WORKERS);
        return { ok: true };
      }

      case "model-status": {
        return {
          ready: workerReady.some(Boolean),
          loading: workers.length > 0 && !workerReady.some(Boolean),
        };
      }

      case "get-voices": {
        await ensureWorkersReady();
        return await sendToWorker(0, { action: "voices" });
      }

      case "tts-prepare": {
        const chunks = chunkText(msg.text);
        return { chunks, total: chunks.length };
      }

      case "tts-chunk": {
        await ensureWorkersReady(msg.workers || targetWorkerCount);
        const workerIdx = pickWorker();
        return await sendToWorker(workerIdx, {
          action: "generate",
          text: msg.text,
          voice: msg.voice || "bm_daniel",
          speed: msg.speed || 1.0,
          index: msg.index,
        });
      }

      case "tts-preview": {
        const previewText = "The quick brown fox jumps over the lazy dog. How vexingly quick daft zebras jump!";
        await ensureWorkersReady();
        const result = await sendToWorker(0, {
          action: "generate",
          text: previewText,
          voice: msg.voice || "bm_daniel",
          speed: msg.speed || 1.0,
          index: 0,
        });
        return { dataUrl: result.dataUrl };
      }

      default:
        return { error: `Unknown action: ${msg.action}` };
    }
  };

  handle().then(sendResponse).catch((err) => {
    sendResponse({ error: err.message || String(err) });
  });
  return true;
});

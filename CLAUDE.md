# Autlaut

Browser extension for text-to-speech using Kokoro TTS.

## Architecture

- `extension/popup.html` / `popup.css` / `popup.js` — Extension popup (settings, history)
- `extension/content.js` / `content.css` — Content script (FAB, player, highlighting)
- `extension/lib/storage.js` — Storage utilities

## Design Tokens

The UI uses a blue-tinted dark palette:
- Backgrounds: `#16162b` (body), `#1a1a2e` (cards/inputs), `#252547` (hover)
- Borders: `#2a2a45`
- Text: `#e0e0e0` (primary), `#ccc` (secondary), `#999` (muted), `#888` (dim)
- Accent: `#ff6b4a` / `#e55a3a` (hover)

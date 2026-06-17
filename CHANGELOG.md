# Changelog

All notable changes are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [v0.1.0] - 2026-06-17

### Added

- PP-OCRv6 (Tiny / Small / Medium) inference via `@paddleocr/paddleocr-js` + ONNX Runtime Web
- 50+ language support (English, Chinese simplified/traditional, Korean, Japanese,
  Tamil, Telugu, Kannada, Thai, Greek, Latin, Arabic, Cyrillic, Devanagari, ...)
- Drag-and-drop, file picker, and clipboard paste (`Ctrl+V`) image inputs
- Three sample images (receipt, printed text, handwriting) with progress
- Bounding-box overlay with per-line confidence and line numbering
- Image preview with zoom (25% / 100% / 400%) and fit-to-viewport
- Search + sort (reading order / confidence asc / desc) over OCR results
- Copy to clipboard (text + JSON), download `.txt` and `.json`
- History of last 8 results with thumbnails
- Light / dark theme with system preference + manual override
- Model status indicator (loading / ready / error) in header
- Engine auto-bootstrap on mount; (tier, lang) cache avoids re-downloads
- `_headers` sets COOP/COEP so WASM threads run cross-origin-isolated
- Fully responsive (mobile bottom nav for model picker)

### Notes

- First load downloads the selected model (~6 MB Tiny, ~19 MB Small, ~140 MB Medium)
  plus ONNX Runtime WASM (~26 MB). Subsequent loads use the HTTP cache.
- WebGPU is used when available; falls back to multi-threaded WASM automatically.
- 100% client-side: no upload, no telemetry.

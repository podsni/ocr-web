# Changelog

All notable changes are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [v0.1.1] - 2026-06-17

### Fixed

- **Race condition on engine boot** that crashed with
  `[ort-shim] ONNX Runtime Web is not loaded yet. await ensureOrt() first.`
  The previous build used a runtime CDN-loaded shim that evaluated its
  `Tensor` / `InferenceSession` exports synchronously at module-init time —
  before the dynamic `import()` had resolved. The shim is now gone; we
  bundle the real `onnxruntime-web/wasm` package and let Vite serve the
  WASM as a separate asset.
- **`ort-wasm-simd-threaded.jsep.mjs` 25 MB WASM upload blocked** by
  Cloudflare Pages' 25 MB per-file limit. The pre-built PaddleOCR worker
  references the JSEP proxy worker unconditionally. We disable the proxy
  worker (`ort.env.wasm.proxy = false`) and ship a 1 KB stub
  `ort-wasm-simd-threaded.jsep.mjs` whose default export is a no-op async
  function — so the dynamic `import(url).default` resolves cleanly and
  ORT falls through to its non-threaded init path. We now ship only the
  12 MB plain-threaded WASM binary.
- **`worker: false`** in `PaddleOCR.create` so inference runs on the main
  thread (avoids the pre-built worker-entry bundle, which embeds the JSEP
  ORT variant and would require the 25 MB JSEP WASM).
- **`backend: 'wasm'`** so ORT picks the plain threaded backend instead of
  attempting WebGPU + JSEP.
- **Headers**: `COEP: credentialless` (was previously `require-corp`) so
  cross-origin subresources can be loaded without explicit CORP headers.

### Changed

- `src/lib/ocr-engine.ts` rewritten — uses `onnxruntime-web/wasm`
  directly, no shim, explicit `wasmPaths: '/ort-wasm/'` passed to
  PaddleOCR.
- `vite.config.ts` adds `onnxruntime-web-use-extern-wasm` to the resolve
  conditions and excludes `onnxruntime-web` from `optimizeDeps`.
- `public/ort-wasm/` now ships:
  - `ort-wasm-simd-threaded.wasm` (12 MB, plain threaded)
  - `ort-wasm-simd-threaded.mjs` (24 KB, threaded runtime glue)
  - `ort-wasm-simd-threaded.jsep.mjs` (1 KB stub — see "Fixed" above)
- Dropped `src/lib/ort-shim.ts` (deleted).

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
  plus ONNX Runtime WASM (~12 MB threaded). Subsequent loads use the HTTP cache.
- WebGPU is intentionally disabled to keep the deploy within Cloudflare Pages'
  25 MB per-file limit.
- 100% client-side: no upload, no telemetry.

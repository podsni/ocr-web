# OCR Web

> Pengenalan teks (OCR) 100% di browser — PaddleOCR **PP-OCRv6** lewat ONNX Runtime Web. Tidak ada upload, tidak ada backend, tidak ada tracking.

🌐 **Live demo:** https://ocr-web.pages.dev

## Highlights

- 🚀 **100% client-side** — gambar tidak pernah meninggalkan perangkat Anda
- 🤖 **PP-OCRv6** (Tiny / Small / Medium) — model terbaru dari PaddlePaddle, Apache 2.0
- 🌍 **50+ bahasa** dalam satu model unified (English, Chinese, Latin, Cyrillic, Arabic, dsb.)
- 📱 **Responsive** — desktop & mobile (touch-friendly drag-drop + paste)
- ⚡ **WebGPU + WASM** backend otomatis; threading aktif saat COOP/COEP tersedia
- 📦 **Zero install** — buka URL, drop gambar, dapat teks
- 💾 **Export** TXT, JSON, salin ke clipboard
- 🖼️ **Bounding box overlay** dengan confidence per baris
- 📚 **History** — 8 gambar terakhir (blob URL di memory)

## Stack

- **Vite 8** + **React 19** + **TypeScript**
- **Tailwind CSS 3** + shadcn-style primitives
- **Zustand** untuk state
- **`@paddleocr/paddleocr-js`** (PaddleOCR official) + **`onnxruntime-web`**

## Architecture

```
src/
  components/
    Header.tsx          # brand + tier/lang picker + theme toggle
    DropZone.tsx        # drag-drop, paste, file input, sample downloads
    ResultViewer.tsx    # image preview + bounding box overlay + zoom
    ResultPanel.tsx     # text + confidence + sort/search + export
    HistoryList.tsx     # recent results with thumbnails
    ui/                 # shadcn-style primitives (Card, Button, ...)
  hooks/
    useEngineBootstrap.ts # lazy load + cache ONNX models
    useOcrRun.ts          # auto-run inference on image change
  lib/
    models.ts          # tier/lang metadata
    ocr-engine.ts      # PaddleOCR wrapper
    utils.ts           # cn(), formatBytes(), formatDuration()
  store.ts             # Zustand store
  theme.ts             # light/dark toggle
  App.tsx              # layout + composition
  main.tsx             # entry
```

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build       # outputs to dist/
npm run preview     # serve dist/ locally
```

## Deploy

The project is configured for Cloudflare Pages (`wrangler.jsonc` + `_headers`
+ `_redirects` already in place):

```bash
npx wrangler pages deploy dist --project-name ocr-web
```

The `_headers` file sets `Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` so WASM threads + `SharedArrayBuffer`
work in the browser.

## Models

| Tier | Params | Approx size | Best for |
|------|--------|-------------|----------|
| Tiny | ~1.5M | ~6 MB | fast preview, low-end devices |
| Small | ~10M | ~19 MB | balanced speed + accuracy (default) |
| Medium | ~75M | ~140 MB | high-accuracy needs |

All three tiers use the PP-OCRv6 architecture — only the model size differs.
Models are downloaded on first use and cached in the browser HTTP cache.

## Privacy

- Images never leave the browser. Inference runs entirely on-device.
- No analytics, no cookies, no telemetry.
- The page can be self-hosted; the official deployment uses no third-party scripts
  beyond ONNX Runtime Web assets (loaded from `cdn.jsdelivr.net`).

## License

Source: Apache 2.0 (this repo). Models: Apache 2.0 (PaddlePaddle).

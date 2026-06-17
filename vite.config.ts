import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// The `onnxruntime-web` package ships with two build variants selected via
// package export conditions:
//
//   1. `default` → `ort.bundle.min.mjs` — embeds the WASM binary inline (~13 MB)
//   2. `onnxruntime-web-use-extern-wasm` → `ort.bundle.min.mjs` + external WASM
//
// Cloudflare Pages has a 25 MB per-file upload limit. We use the
// `onnxruntime-web-use-extern-wasm` condition so the WASM file stays as a
// separate asset (~12.4 MB) served from `/ort-wasm/` on the same origin.
//
// `optimizeDeps.exclude` skips esbuild pre-bundling — Vite serves the package
// files as-is so Vite's import-analysis can read the package's conditional
// exports and resolve to the right entry point.
const onnxWebCondition = 'onnxruntime-web-use-extern-wasm';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    conditions: [onnxWebCondition, 'module', 'browser', 'import', 'default'],
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4096,
  },
});

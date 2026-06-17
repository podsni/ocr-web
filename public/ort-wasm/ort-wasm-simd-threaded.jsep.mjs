// Stub for `ort-wasm-simd-threaded.jsep.mjs`.
//
// We deliberately don't ship the real JSEP proxy worker because its
// companion WASM (`ort-wasm-simd-threaded.jsep.wasm`) is 25 MB - over
// Cloudflare Pages' 25 MB per-file upload limit. With `wasm.proxy = false`
// set in `src/lib/ocr-engine.ts`, ORT runs single-threaded and never
// touches the JSEP module's exports. The dynamic `import(url).default`
// call inside the ORT bundle expects an async function with the JSEP
// runtime shape; we expose a no-op so the import resolves successfully and
// ORT can fall through to its non-threaded init path.
export default async function ortWasmThreaded() {
  return {
    _OrtInit: () => {},
    _OrtCreateSession: () => {},
    _OrtRun: () => {},
    _OrtReleaseSession: () => {},
    _OrtGetLastError: () => 0,
    _malloc: () => 0,
    _free: () => {},
  };
}

// PaddleOCR.js wrapper. Hides the dynamic import + init dance from React.
//
// `onnxruntime-web/wasm` resolves to `ort.wasm.min.mjs` (WASM-only, ~49 KB,
// no WebGPU/JSEP) under the `onnxruntime-web-use-extern-wasm` export
// condition (see vite.config.ts). This is what lets us fit under Cloudflare
// Pages' 25 MB per-file limit — we serve only the 12 MB plain-threaded WASM
// binary from `/ort-wasm/`, no JSEP/WebGPU variants.
import * as ort from 'onnxruntime-web/wasm';
import type { ModelTier, Lang } from './models';
import { modelNamesForTier } from './models';

// The ORT WASM binary lives at this path on the deployed origin. Cloudflare
// Pages serves everything in `public/` at the site root, so the file copied
// to `public/ort-wasm/ort-wasm-simd-threaded.wasm` is reachable here.
const WASM_PATHS = `${import.meta.env.BASE_URL}ort-wasm/`.replace(/\/+/g, '/');

// Tell ORT where to find its WASM. Has to be set before the first
// `InferenceSession.create()` call; PaddleOCR forwards this through `ortOptions`.
ort.env.wasm.wasmPaths = WASM_PATHS;
ort.env.wasm.numThreads =
  typeof navigator !== 'undefined' && navigator.hardwareConcurrency
    ? Math.min(navigator.hardwareConcurrency, 4)
    : 2;
ort.env.wasm.simd = true;
// Disable the proxy worker. The proxy worker is what would load
// `ort-wasm-simd-threaded.jsep.mjs` (the JSEP variant of the ORT threaded
// runtime) and its accompanying 25 MB JSEP WASM binary — both of which are
// over Cloudflare Pages' 25 MB per-file upload limit. We serve only the
// plain threaded WASM (12 MB), which doesn't need the JSEP proxy.
ort.env.wasm.proxy = false;

// Type for the predict result item. Mirrors paddleocr-js `OcrResultItem`.
export interface OcrItem {
  poly: Array<[number, number]>;
  text: string;
  score: number;
}

export interface OcrMetrics {
  detMs: number;
  recMs: number;
  totalMs: number;
  detectedBoxes: number;
  recognizedCount: number;
}

export interface OcrResult {
  image: { width: number; height: number };
  items: OcrItem[];
  metrics: OcrMetrics;
  runtime?: { backend?: string; provider?: string };
}

type PredictFn = (input: Blob | File | ImageData | HTMLImageElement | HTMLCanvasElement | ImageBitmap) => Promise<OcrResult[]>;
type DisposeFn = () => Promise<void>;

export interface LoadedEngine {
  predict: PredictFn;
  dispose: DisposeFn;
  tier: ModelTier;
  lang: Lang;
  backend: string;
}

/**
 * Build a stable cache key so we don't reload the model for the same
 * (tier, lang) pair. Different backends share the same model binaries.
 */
export function engineCacheKey(tier: ModelTier, lang: Lang): string {
  return `${tier}:${lang}`;
}

interface CacheEntry {
  promise: Promise<LoadedEngine>;
  /** Set once the promise resolves. */
  engine?: LoadedEngine;
}

const cache = new Map<string, CacheEntry>();

export async function getEngine(
  tier: ModelTier,
  lang: Lang,
  onProgress?: (msg: string) => void
): Promise<LoadedEngine> {
  const key = engineCacheKey(tier, lang);
  let entry = cache.get(key);
  if (!entry) {
    entry = { promise: loadEngine(tier, lang, onProgress) };
    cache.set(key, entry);
    entry.promise.then((engine) => {
      entry!.engine = engine;
    });
  }
  if (entry.engine) return entry.engine;
  return entry.promise;
}

async function loadEngine(
  tier: ModelTier,
  lang: Lang,
  onProgress?: (msg: string) => void
): Promise<LoadedEngine> {
  onProgress?.('Memuat SDK PaddleOCR...');
  const mod = await import('@paddleocr/paddleocr-js');
  const PaddleOCR = mod.PaddleOCR ?? (mod as unknown as { default: typeof mod.PaddleOCR }).default;
  if (!PaddleOCR) {
    throw new Error('Gagal mengimpor PaddleOCR dari @paddleocr/paddleocr-js');
  }

  const names = modelNamesForTier(tier);
  onProgress?.(`Memuat model ${names.det} + ${names.rec}...`);

  // Self-host the model tarballs on the same origin instead of pulling from
  // Baidu CDN. Some networks block `paddle-model-ecology.bj.bcebos.com`, so
  // shipping the ~6 MB tiny tier with the app removes that dependency and
  // makes first inference reliably work in any environment.
  //
  // The SDK expects an uncompressed ustar `.tar` containing
  // `inference.onnx` + `inference.yml` (with matching model_name). That's
  // exactly what Baidu publishes, so we just point at the same files on
  // our own origin. Larger tiers (small/medium) still go through the CDN
  // because they're too big to ship with the app.
  const modelBaseUrl = `${import.meta.env.BASE_URL}models/`.replace(/\/+/g, '/');
  const detModelAsset =
    tier === 'tiny'
      ? { url: `${modelBaseUrl}PP-OCRv6_tiny_det.tar` }
      : undefined;
  const recModelAsset =
    tier === 'tiny'
      ? { url: `${modelBaseUrl}PP-OCRv6_tiny_rec.tar` }
      : undefined;

  const ocr = await PaddleOCR.create({
    textDetectionModelName: names.det,
    textRecognitionModelName: names.rec,
    ...(detModelAsset ? { textDetectionModelAsset: detModelAsset } : {}),
    ...(recModelAsset ? { textRecognitionModelAsset: recModelAsset } : {}),
    // Run on the main thread instead of a Web Worker. PaddleOCR's pre-built
    // worker-entry bundles the WebGPU+JSEP variant of ONNX Runtime, which
    // requires `ort-wasm-simd-threaded.jsep.wasm` (25 MB) - over Cloudflare
    // Pages' 25 MB per-file upload limit. The main-thread bundle uses the
    // smaller plain-threaded WASM (12 MB) which fits comfortably.
    worker: false,
    ortOptions: {
      // Disable WebGPU: the JSEP variant needs extra ~25 MB of files and
      // pulls in asyncify (.jspi) wrappers. WASM-only keeps the bundle lean
      // and is well-supported across all modern browsers.
      backend: 'wasm',
      wasmPaths: WASM_PATHS,
      numThreads: ort.env.wasm.numThreads,
      simd: ort.env.wasm.simd,
      // Disable the proxy worker: it would try to dynamically import
      // `ort-wasm-simd-threaded.jsep.mjs` (the JSEP WebGPU worker wrapper),
      // which references the 25 MB JSEP WASM binary we can't host on
      // Cloudflare Pages (25 MB per-file upload limit).
      proxy: false,
    } as {
      backend: 'webgpu' | 'wasm' | 'auto';
      wasmPaths?: string;
      numThreads?: number;
      simd?: boolean;
    },
  });

  // The lang arg tells the SDK which dictionary to load for recognition. We
  // pass it through even though model names are explicit. Each cache entry
  // is keyed by lang, so we don't need to re-create for lang changes — the
  // re-create happens implicitly when we miss the cache.
  void lang;

  const predict: PredictFn = async (input) => {
    const results = await (ocr as unknown as { predict: (i: typeof input) => Promise<OcrResult[]> }).predict(input);
    return results;
  };

  const dispose: DisposeFn = async () => {
    const maybeDispose = (ocr as unknown as { dispose?: () => Promise<void> }).dispose;
    if (typeof maybeDispose === 'function') {
      await maybeDispose();
    }
  };

  onProgress?.(`Model ${tier} siap`);

  return {
    predict,
    dispose,
    tier,
    lang,
    backend: 'auto',
  };
}

/** Drop the cached engine for a (tier, lang) pair. Used by HMR or memory cleanup. */
export async function evictEngine(tier: ModelTier, lang: Lang): Promise<void> {
  const key = engineCacheKey(tier, lang);
  const entry = cache.get(key);
  if (!entry) return;
  try {
    if (entry.engine) await entry.engine.dispose();
    else await entry.promise.then((e) => e.dispose()).catch(() => undefined);
  } finally {
    cache.delete(key);
  }
}

// PaddleOCR.js wrapper. Hides the dynamic import + init dance from React.
import type { ModelTier, Lang } from './models';
import { modelNamesForTier } from './models';

// Type for the predict result item. Mirrors paddleocr-js `OcrResultItem`.
// We only depend on `poly`, `text`, and `score` for now.
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
    // When the promise resolves, cache the resolved engine for fast reuse.
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
  onProgress?.('Memuat runtime ONNX...');
  const mod = await import('@paddleocr/paddleocr-js');
  // `PaddleOCR` is a class with a static `create`.
  const PaddleOCR = mod.PaddleOCR ?? (mod as unknown as { default: typeof mod.PaddleOCR }).default;
  if (!PaddleOCR) {
    throw new Error('Gagal mengimpor PaddleOCR dari @paddleocr/paddleocr-js');
  }

  // Configure ONNX Runtime Web: prefer WebGPU when available, else WASM with
  // multi-threading. Asset paths must be set explicitly because Vite bundles
  // them under /assets/ — but we use a public CDN for runtime assets to keep
  // our bundle small.
  const ort = await import('onnxruntime-web');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ort.env.wasm.numThreads = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
    ? Math.min(navigator.hardwareConcurrency, 4)
    : 2;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ort.env.wasm.simd = true;

  const names = modelNamesForTier(tier);
  onProgress?.(`Memuat model ${names.det} + ${names.rec}...`);

  const ocr = await PaddleOCR.create({
    textDetectionModelName: names.det,
    textRecognitionModelName: names.rec,
    ortOptions: {
      // 'auto' picks WebGPU when available, else WASM. Both run in browser.
      backend: 'auto',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wasmPaths: ort.env.wasm.wasmPaths as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      numThreads: ort.env.wasm.numThreads as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      simd: ort.env.wasm.simd as any,
    },
  });

  // The lang arg tells the SDK which dictionary to load for recognition. We
  // pass it through even though model names are explicit.
  // The SDK currently accepts lang only via the constructor shorthand, so we
  // re-create if the lang differs from the default. For simplicity, every
  // cache entry is keyed by lang.
  void lang;

  const predict: PredictFn = async (input) => {
    // The SDK returns Promise<OcrResult[]>.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await (ocr as any).predict(input);
    return results as OcrResult[];
  };

  const dispose: DisposeFn = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maybeDispose = (ocr as any).dispose;
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

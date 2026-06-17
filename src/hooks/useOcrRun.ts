import { useCallback, useEffect, useRef } from 'react';
import { useOcrStore } from '@/store';
import { getEngine } from '@/lib/ocr-engine';

/**
 * Watches the current image + tier + lang and triggers inference. Returns
 * a manual `run` callback for re-runs.
 */
export function useOcrRun() {
  const tier = useOcrStore((s) => s.tier);
  const lang = useOcrStore((s) => s.lang);
  const engineReady = useOcrStore((s) => s.engineReady);
  const blobUrl = useOcrStore((s) => s.imageBlobUrl);
  const fileName = useOcrStore((s) => s.fileName);
  const fileSize = useOcrStore((s) => s.fileSize);
  const setResult = useOcrStore((s) => s.setResult);
  const setInferring = useOcrStore((s) => s.setInferring);
  const setInferError = useOcrStore((s) => s.setInferError);
  const pushHistory = useOcrStore((s) => s.pushHistory);
  const inferring = useOcrStore((s) => s.inferring);

  const lastSig = useRef<string | null>(null);

  const run = useCallback(async () => {
    if (!engineReady || !blobUrl) return;
    setInferError(null);
    setInferring(true);
    try {
      const engine = await getEngine(tier, lang);
      // Decode blob -> HTMLImageElement so the SDK can read its size.
      const img = await loadImage(blobUrl);
      const results = await engine.predict(img);
      const first = results[0];
      if (!first) throw new Error('Engine mengembalikan hasil kosong.');
      setResult(first);
      pushHistory({
        id: cryptoRandomId(),
        fileName: fileName ?? 'image',
        sizeBytes: fileSize,
        width: first.image.width,
        height: first.image.height,
        blobUrl,
        createdAt: Date.now(),
        tier,
        lang,
        result: first,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[ocr]', err);
      setInferError(msg);
    } finally {
      setInferring(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineReady, blobUrl, tier, lang]);

  // Auto-run when (engine, image, tier, lang) change.
  useEffect(() => {
    if (!engineReady || !blobUrl) return;
    const sig = `${blobUrl}|${tier}|${lang}`;
    if (lastSig.current === sig) return;
    lastSig.current = sig;
    void run();
  }, [engineReady, blobUrl, tier, lang, run, inferring]);

  return { run };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Gagal decode gambar.'));
    img.src = src;
  });
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

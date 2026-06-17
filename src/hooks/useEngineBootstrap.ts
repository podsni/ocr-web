import { useEffect } from 'react';
import { useOcrStore } from '@/store';
import { getEngine } from '@/lib/ocr-engine';

/**
 * Loads the OCR engine for the current (tier, lang) on mount, and reloads
 * whenever either changes. The first run is slow (model download + WASM
 * init); subsequent (tier, lang) switches are cached by the engine layer.
 */
export function useEngineBootstrap() {
  const tier = useOcrStore((s) => s.tier);
  const lang = useOcrStore((s) => s.lang);
  const setReady = useOcrStore((s) => s.setEngineReady);
  const setMessage = useOcrStore((s) => s.setLoadingMessage);
  const setError = useOcrStore((s) => s.setEngineError);
  const engineReady = useOcrStore((s) => s.engineReady);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    setMessage('Menyiapkan runtime ONNX...');

    getEngine(tier, lang, (msg) => {
      if (!cancelled) setMessage(msg);
    })
      .then(() => {
        if (cancelled) return;
        setReady(true);
        setMessage(null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('[engine]', err);
        setError(err instanceof Error ? err.message : String(err));
        setMessage(null);
      });

    return () => {
      cancelled = true;
    };
    // We re-trigger on tier/lang changes. The engine layer caches by
    // (tier, lang), so this is cheap once a pair has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tier, lang]);

  return { engineReady };
}

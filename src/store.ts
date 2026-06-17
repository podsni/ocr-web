import { create } from 'zustand';
import type { OcrResult } from '@/lib/ocr-engine';
import type { ModelTier, Lang } from '@/lib/models';

export interface HistoryEntry {
  id: string;
  fileName: string;
  sizeBytes: number;
  width: number;
  height: number;
  blobUrl: string;
  createdAt: number;
  tier: ModelTier;
  lang: Lang;
  result: OcrResult;
}

interface OcrState {
  // engine status
  tier: ModelTier;
  lang: Lang;
  engineReady: boolean;
  loadingMessage: string | null;
  engineError: string | null;

  // image being processed
  fileName: string | null;
  fileSize: number;
  imageBlobUrl: string | null;
  imageWidth: number;
  imageHeight: number;

  // result
  result: OcrResult | null;
  inferring: boolean;
  inferError: string | null;
  showOverlay: boolean;

  // history
  history: HistoryEntry[];

  // actions
  setTier: (t: ModelTier) => void;
  setLang: (l: Lang) => void;
  setLoadingMessage: (msg: string | null) => void;
  setEngineReady: (ready: boolean) => void;
  setEngineError: (err: string | null) => void;
  setImage: (file: File) => void;
  clearImage: () => void;
  setResult: (r: OcrResult | null) => void;
  setInferring: (b: boolean) => void;
  setInferError: (s: string | null) => void;
  setShowOverlay: (b: boolean) => void;
  pushHistory: (entry: HistoryEntry) => void;
  clearHistory: () => void;
}

const MAX_HISTORY = 8;

export const useOcrStore = create<OcrState>((set) => ({
  tier: 'tiny',
  lang: 'en',
  engineReady: false,
  loadingMessage: null,
  engineError: null,

  fileName: null,
  fileSize: 0,
  imageBlobUrl: null,
  imageWidth: 0,
  imageHeight: 0,

  result: null,
  inferring: false,
  inferError: null,
  showOverlay: true,

  history: [],

  setTier: (t) => set({ tier: t }),
  setLang: (l) => set({ lang: l }),
  setLoadingMessage: (msg) => set({ loadingMessage: msg }),
  setEngineReady: (ready) => set({ engineReady: ready }),
  setEngineError: (err) => set({ engineError: err }),
  setImage: (file) =>
    set({
      fileName: file.name,
      fileSize: file.size,
      imageBlobUrl: URL.createObjectURL(file),
      imageWidth: 0,
      imageHeight: 0,
      result: null,
      inferError: null,
    }),
  clearImage: () =>
    set((s) => {
      if (s.imageBlobUrl) URL.revokeObjectURL(s.imageBlobUrl);
      return {
        fileName: null,
        fileSize: 0,
        imageBlobUrl: null,
        imageWidth: 0,
        imageHeight: 0,
        result: null,
        inferError: null,
      };
    }),
  setResult: (r) => set({ result: r }),
  setInferring: (b) => set({ inferring: b }),
  setInferError: (s) => set({ inferError: s }),
  setShowOverlay: (b) => set({ showOverlay: b }),
  pushHistory: (entry) =>
    set((s) => ({ history: [entry, ...s.history].slice(0, MAX_HISTORY) })),
  clearHistory: () =>
    set((s) => {
      // Revoke blob URLs we own.
      for (const e of s.history) URL.revokeObjectURL(e.blobUrl);
      return { history: [] };
    }),
}));

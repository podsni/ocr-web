// Model presets available in @paddleocr/paddleocr-js v0.4+.
// PP-OCRv6 maps to PP-OCRv6_small det/rec by default; explicit names for tiny.
export type OcrVersion = 'PP-OCRv5' | 'PP-OCRv6';
export type ModelTier = 'tiny' | 'small' | 'medium';
export type Lang = 'ch' | 'chinese_cht' | 'en' | 'korean' | 'japan' | 'ta' | 'te' | 'ka' | 'th' | 'el' | 'latin' | 'arabic' | 'cyrillic' | 'devanagari';

export interface ModelPreset {
  tier: ModelTier;
  /** Number of parameters (approx, in millions). Used for display only. */
  params: number;
  /** Approximate download size, in MB. */
  sizeMB: number;
  /** ONNX file size, MB. Used by the SDK for caching. */
  detectionMB: number;
  recognitionMB: number;
}

export const MODEL_PRESETS: Record<ModelTier, ModelPreset> = {
  tiny: {
    tier: 'tiny',
    params: 1.53,
    sizeMB: 5.8,
    detectionMB: 1.7,
    recognitionMB: 4.1,
  },
  small: {
    tier: 'small',
    params: 10.18,
    sizeMB: 19,
    detectionMB: 9.5,
    recognitionMB: 9.5,
  },
  medium: {
    tier: 'medium',
    params: 75.0,
    sizeMB: 140,
    detectionMB: 71,
    recognitionMB: 69,
  },
};

export const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'ch', label: 'Chinese (Simplified)' },
  { value: 'chinese_cht', label: 'Chinese (Traditional)' },
  { value: 'korean', label: 'Korean' },
  { value: 'japan', label: 'Japanese' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
  { value: 'ka', label: 'Kannada' },
  { value: 'th', label: 'Thai' },
  { value: 'el', label: 'Greek' },
  { value: 'latin', label: 'Latin' },
  { value: 'arabic', label: 'Arabic' },
  { value: 'cyrillic', label: 'Cyrillic' },
  { value: 'devanagari', label: 'Devanagari' },
];

/** Build the detection/recognition model names for a tier. */
export function modelNamesForTier(tier: ModelTier): { det: string; rec: string } {
  switch (tier) {
    case 'tiny':
      return { det: 'PP-OCRv6_tiny_det', rec: 'PP-OCRv6_tiny_rec' };
    case 'small':
      return { det: 'PP-OCRv6_server_det', rec: 'PP-OCRv6_server_rec' };
    case 'medium':
      return { det: 'PP-OCRv6_medium_det', rec: 'PP-OCRv6_medium_rec' };
  }
}

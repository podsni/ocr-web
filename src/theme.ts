import { create } from 'zustand';

interface ThemeState {
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  toggle: () => void;
}

function readInitial(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const stored = window.localStorage.getItem('ocr-web:theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(t: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', t === 'dark');
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: readInitial(),
  setTheme: (t) => {
    apply(t);
    if (typeof window !== 'undefined') window.localStorage.setItem('ocr-web:theme', t);
    set({ theme: t });
  },
  toggle: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    apply(next);
    if (typeof window !== 'undefined') window.localStorage.setItem('ocr-web:theme', next);
    set({ theme: next });
  },
}));

// Apply on first import.
apply(readInitial());

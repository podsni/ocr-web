import { Moon, ScanText, Settings2, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOcrStore } from '@/store';
import { useThemeStore } from '@/theme';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { LANG_OPTIONS, MODEL_PRESETS, type Lang, type ModelTier } from '@/lib/models';
import { formatBytes } from '@/lib/utils';

const TIER_ORDER: ModelTier[] = ['tiny', 'small', 'medium'];

export function Header() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  const tier = useOcrStore((s) => s.tier);
  const lang = useOcrStore((s) => s.lang);
  const setTier = useOcrStore((s) => s.setTier);
  const setLang = useOcrStore((s) => s.setLang);
  const engineReady = useOcrStore((s) => s.engineReady);
  const loadingMessage = useOcrStore((s) => s.loadingMessage);
  const clearHistory = useOcrStore((s) => s.clearHistory);
  const historyCount = useOcrStore((s) => s.history.length);
  const clearImage = useOcrStore((s) => s.clearImage);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ScanText className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-base font-semibold leading-none sm:text-lg">OCR Web</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              PP-OCRv6, 100% di browser
            </p>
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-center gap-2 px-4 lg:flex">
          <EngineStatus
            ready={engineReady}
            loading={loadingMessage}
            tier={tier}
            lang={lang}
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
                <Settings2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Model</span>
                <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                  {tier}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <DropdownMenuLabel>Tier model</DropdownMenuLabel>
              {TIER_ORDER.map((t) => (
                <DropdownMenuItem
                  key={t}
                  onSelect={() => setTier(t)}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="flex w-full items-center justify-between">
                    <span className="font-medium capitalize">{t}</span>
                    {tier === t && (
                      <span className="text-xs text-primary">aktif</span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ~{MODEL_PRESETS[t].params}M param · ~{MODEL_PRESETS[t].sizeMB} MB
                  </span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Bahasa</DropdownMenuLabel>
              <div className="max-h-64 overflow-auto">
                {LANG_OPTIONS.map((l) => (
                  <DropdownMenuItem
                    key={l.value}
                    onSelect={() => setLang(l.value as Lang)}
                    className="flex items-center justify-between"
                  >
                    <span>{l.label}</span>
                    {lang === l.value && <span className="text-xs text-primary">aktif</span>}
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            aria-label={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
            onClick={toggle}
            className="h-9 w-9"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Buka GitHub"
            className="h-9 w-9"
            asChild
          >
            <a
              href="https://github.com/podsni/ocr-web"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden
              >
                <path d="M12 .5C5.65.5.5 5.66.5 12.02c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56v-2.1c-3.2.7-3.88-1.36-3.88-1.36-.52-1.32-1.27-1.67-1.27-1.67-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.68 1.24 3.34.95.1-.74.4-1.24.73-1.53-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.93 10.93 0 0 1 5.74 0c2.18-1.49 3.14-1.18 3.14-1.18.63 1.59.23 2.76.11 3.05.74.81 1.18 1.84 1.18 3.1 0 4.42-2.69 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.68.8.56 4.57-1.52 7.85-5.83 7.85-10.9C23.5 5.66 18.35.5 12 .5Z" />
              </svg>
            </a>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
                <span className="hidden sm:inline">Aksi</span>
                <span aria-hidden>⋯</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => clearImage()} disabled={!useOcrStore.getState().imageBlobUrl}>
                Buang gambar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => clearHistory()} disabled={historyCount === 0}>
                Hapus riwayat ({historyCount})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl items-center gap-3 border-t px-4 py-2 sm:px-6 lg:hidden">
        <span className="text-xs text-muted-foreground">Model</span>
        <ToggleGroup
          value={tier}
          onValueChange={(v) => v && setTier(v as ModelTier)}
          size="sm"
          type="single"
        >
          {TIER_ORDER.map((t) => (
            <ToggleGroupItem key={t} value={t} aria-label={`Model ${t}`} className="capitalize">
              {t}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <EngineStatus ready={engineReady} loading={loadingMessage} tier={tier} lang={lang} compact />
        <span className="ml-auto text-xs text-muted-foreground">
          {formatBytes(MODEL_PRESETS[tier].sizeMB * 1024 * 1024)}
        </span>
      </div>
    </header>
  );
}

function EngineStatus({
  ready,
  loading,
  tier,
  lang,
  compact,
}: {
  ready: boolean;
  loading: string | null;
  tier: ModelTier;
  lang: Lang;
  compact?: boolean;
}) {
  if (ready) {
    return (
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        <span className="font-mono uppercase">{tier}</span>
        <span aria-hidden>·</span>
        <span>{LANG_OPTIONS.find((l) => l.value === lang)?.label ?? lang}</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="relative inline-flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      <span className={compact ? 'truncate' : ''}>
        {loading ?? 'Menyiapkan engine...'}
      </span>
    </span>
  );
}

import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileJson,
  FileText,
  FileType2,
  Highlighter,
  Search,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { OcrItem, OcrResult } from '@/lib/ocr-engine';
import { cn, formatDuration } from '@/lib/utils';

interface ResultPanelProps {
  result: OcrResult | null;
  fileName?: string | null;
  focusedIndex?: number | null;
  onItemHover?: (idx: number | null) => void;
  onItemClick?: (idx: number) => void;
}

type SortMode = 'reading' | 'score-desc' | 'score-asc';
type ViewMode = 'list' | 'text';
type CopyKind = 'text' | 'json' | 'md';
type DownloadKind = 'txt' | 'json' | 'md';

export function ResultPanel({
  result,
  fileName,
  focusedIndex,
  onItemHover,
  onItemClick,
}: ResultPanelProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('reading');
  const [view, setView] = useState<ViewMode>('list');
  const [copied, setCopied] = useState<CopyKind | null>(null);
  const [copiedLine, setCopiedLine] = useState<number | null>(null);

  const items: OcrItem[] = result?.items ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = items;
    if (q) {
      arr = arr.filter((it) => it.text.toLowerCase().includes(q));
    }
    arr = [...arr];
    if (sort === 'score-desc') arr.sort((a, b) => b.score - a.score);
    else if (sort === 'score-asc') arr.sort((a, b) => a.score - b.score);
    return arr;
  }, [items, query, sort]);

  const fullText = useMemo(() => items.map((i) => i.text).join('\n'), [items]);

  const markdown = useMemo(
    () => buildMarkdown(result, items, fileName),
    [result, items, fileName]
  );

  const copy = async (kind: CopyKind) => {
    const payload =
      kind === 'json'
        ? JSON.stringify(result, null, 2)
        : kind === 'md'
          ? markdown
          : fullText;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // ignore (sandbox / browser without clipboard permission)
    }
  };

  const copyLine = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLine(idx);
      window.setTimeout(() => setCopiedLine(null), 1400);
    } catch {
      // ignore
    }
  };

  const download = (kind: DownloadKind) => {
    const payload =
      kind === 'json'
        ? JSON.stringify(result, null, 2)
        : kind === 'md'
          ? markdown
          : fullText;
    const mime =
      kind === 'json'
        ? 'application/json'
        : kind === 'md'
          ? 'text/markdown'
          : 'text/plain';
    const blob = new Blob([payload], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ocr-${Date.now()}.${kind}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  if (!result) {
    return (
      <Card className="flex flex-col p-6">
        <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-sm text-muted-foreground">
          <FileText className="h-8 w-8 opacity-50" />
          <p>Hasil OCR akan muncul di sini.</p>
        </div>
      </Card>
    );
  }

  const avgScore = items.length
    ? items.reduce((s, i) => s + i.score, 0) / items.length
    : 0;

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* ===== Header: title + stats ===== */}
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">Hasil OCR</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {items.length} baris · avg {avgScore.toFixed(2)} ·{' '}
              {formatDuration(result.metrics.totalMs)}
            </span>
          </div>
        </div>
      </div>

      {/* ===== Action bar: grouped copy + download ===== */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-background/50 px-3 py-2 sm:px-4">
        {/* Copy group */}
        <div className="inline-flex h-8 items-center rounded-md border bg-muted/20 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => copy('text')}
            disabled={!fullText}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded px-2 font-medium transition-colors',
              'hover:bg-background disabled:opacity-50',
              copied === 'text' && 'bg-background text-emerald-600 dark:text-emerald-400'
            )}
            title="Salin teks polos"
          >
            {copied === 'text' ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>Teks</span>
          </button>
          <button
            type="button"
            onClick={() => copy('md')}
            disabled={!markdown}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded px-2 font-medium transition-colors',
              'hover:bg-background disabled:opacity-50',
              copied === 'md' && 'bg-background text-emerald-600 dark:text-emerald-400'
            )}
            title="Salin Markdown"
          >
            {copied === 'md' ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <FileType2 className="h-3.5 w-3.5" />
            )}
            <span>MD</span>
          </button>
          <button
            type="button"
            onClick={() => copy('json')}
            disabled={!result}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded px-2 font-medium transition-colors',
              'hover:bg-background disabled:opacity-50',
              copied === 'json' && 'bg-background text-emerald-600 dark:text-emerald-400'
            )}
            title="Salin JSON"
          >
            {copied === 'json' ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span>JSON</span>
          </button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Download group */}
        <div className="inline-flex h-8 items-center rounded-md border bg-muted/20 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => download('txt')}
            disabled={!fullText}
            className="inline-flex h-7 items-center gap-1 rounded px-2 font-medium transition-colors hover:bg-background disabled:opacity-50"
            title="Unduh .txt"
          >
            <Download className="h-3.5 w-3.5" />
            <span>.txt</span>
          </button>
          <button
            type="button"
            onClick={() => download('md')}
            disabled={!markdown}
            className="inline-flex h-7 items-center gap-1 rounded px-2 font-medium transition-colors hover:bg-background disabled:opacity-50"
            title="Unduh Markdown"
          >
            <FileType2 className="h-3.5 w-3.5" />
            <span>.md</span>
          </button>
          <button
            type="button"
            onClick={() => download('json')}
            disabled={!result}
            className="inline-flex h-7 items-center gap-1 rounded px-2 font-medium transition-colors hover:bg-background disabled:opacity-50"
            title="Unduh JSON"
          >
            <FileJson className="h-3.5 w-3.5" />
            <span>.json</span>
          </button>
        </div>
      </div>

      {/* ===== View tabs + filters ===== */}
      <div className="flex flex-wrap items-center gap-2 border-b bg-background px-3 py-2 sm:px-4">
        {/* Tabs */}
        <div
          className="inline-flex h-8 items-center rounded-md border bg-muted/30 p-0.5 text-xs"
          role="tablist"
        >
          <button
            type="button"
            role="tab"
            onClick={() => setView('list')}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded px-2.5 font-medium transition-colors',
              view === 'list'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-selected={view === 'list'}
          >
            <Search className="h-3.5 w-3.5" />
            Daftar
          </button>
          <button
            type="button"
            role="tab"
            onClick={() => setView('text')}
            className={cn(
              'inline-flex h-7 items-center gap-1 rounded px-2.5 font-medium transition-colors',
              view === 'text'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
            aria-selected={view === 'text'}
          >
            <FileText className="h-3.5 w-3.5" />
            Pratinjau
          </button>
        </div>

        {view === 'list' && (
          <>
            <div className="relative min-w-[140px] flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                placeholder="Cari di hasil..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-8 text-sm outline-none ring-primary/30 transition-shadow placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-2"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Bersihkan pencarian"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setQuery('')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Urutkan"
            >
              <option value="reading">Urutan baca</option>
              <option value="score-desc">Confidence ↓</option>
              <option value="score-asc">Confidence ↑</option>
            </select>
            <span className="hidden rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline">
              {filtered.length}/{items.length}
            </span>
          </>
        )}

        {view === 'text' && (
          <span className="hidden text-xs text-muted-foreground sm:inline">
            Pratinjau bersih · siap diunduh atau disalin
          </span>
        )}
      </div>

      {/* ===== Content ===== */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        {items.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Tidak ada teks terdeteksi.
          </div>
        ) : view === 'list' ? (
          <ul className="divide-y">
            {filtered.map((it, i) => {
              const isFocused = focusedIndex === i;
              const isLowConf = it.score < 0.7;
              return (
                <li
                  key={`${i}-${it.text}`}
                  className={cn(
                    'group flex items-start gap-2 px-3 py-2 sm:px-4',
                    'hover:bg-muted/40 transition-colors',
                    isFocused && 'bg-primary/10 ring-1 ring-inset ring-primary/40'
                  )}
                  onMouseEnter={() => onItemHover?.(i)}
                  onMouseLeave={() => onItemHover?.(null)}
                  onClick={() => onItemClick?.(i)}
                  title="Klik untuk menandai bounding box di gambar"
                >
                  <span
                    className={cn(
                      'mt-0.5 inline-flex h-5 w-9 shrink-0 items-center justify-center rounded font-mono text-[10px] font-medium',
                      scoreClass(it.score),
                      isLowConf && 'ring-1 ring-inset ring-destructive/40'
                    )}
                  >
                    {`${(it.score * 100).toFixed(0)}%`}
                  </span>
                  <span className="w-6 shrink-0 select-none pt-0.5 text-right font-mono text-[10px] text-muted-foreground">
                    {i + 1}
                  </span>
                  <p
                    className={cn(
                      'flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed',
                      isLowConf && 'text-destructive/90'
                    )}
                  >
                    {highlightLine(it.text, query.trim().toLowerCase())}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyLine(it.text, i);
                    }}
                    className={cn(
                      'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded transition-opacity',
                      'opacity-0 group-hover:opacity-100',
                      copiedLine === i && 'opacity-100'
                    )}
                    aria-label={`Salin baris ${i + 1}`}
                    title="Salin baris ini"
                  >
                    {copiedLine === i ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                    )}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                Tidak ada baris yang cocok dengan &ldquo;{query}&rdquo;.
              </li>
            )}
          </ul>
        ) : (
          <TextPreview text={fullText} searchQuery={query} />
        )}
      </div>

      <Separator />
      <details className="px-3 py-2 text-xs text-muted-foreground sm:px-4">
        <summary className="cursor-pointer select-none">
          <span className="inline-flex items-center gap-1">
            <Highlighter className="h-3 w-3" /> Detail metrik
          </span>
        </summary>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
          <Stat label="Detection" value={formatDuration(result.metrics.detMs)} />
          <Stat label="Recognition" value={formatDuration(result.metrics.recMs)} />
          <Stat label="Total" value={formatDuration(result.metrics.totalMs)} />
          <Stat label="Boxes" value={String(result.metrics.detectedBoxes)} />
        </dl>
        {result.runtime && (
          <p className="mt-2 font-mono text-[10px]">
            backend: {result.runtime.backend ?? '?'} · provider:{' '}
            {result.runtime.provider ?? '?'}
          </p>
        )}
      </details>
    </Card>
  );
}

/** Clean monospace text preview with line numbers + search highlight. */
function TextPreview({ text, searchQuery }: { text: string; searchQuery: string }) {
  const lines = text.split('\n');
  const ql = searchQuery.trim().toLowerCase();
  return (
    <pre className="m-0 whitespace-pre-wrap break-words p-3 font-mono text-[13px] leading-6 sm:p-4">
      <code>
        {lines.map((ln, i) => (
          <span key={i} className="flex gap-3 rounded-sm px-1 hover:bg-muted/30">
            <span className="inline-block w-8 shrink-0 select-none text-right text-[10px] text-muted-foreground/70">
              {i + 1}
            </span>
            <span className="flex-1">{highlightLine(ln, ql)}</span>
          </span>
        ))}
      </code>
    </pre>
  );
}

function highlightLine(text: string, q: string) {
  if (!q) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-200/70 px-0.5 text-foreground dark:bg-yellow-500/30">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

/** Build a Markdown document from the OCR result. */
function buildMarkdown(
  result: OcrResult | null,
  items: OcrItem[],
  fileName?: string | null
): string {
  if (!result) return '';
  const avg = items.length
    ? items.reduce((s, i) => s + i.score, 0) / items.length
    : 0;
  const ts = new Date().toISOString();
  const head = [
    `# OCR Result`,
    ``,
    fileName ? `- **File**: \`${fileName}\`` : null,
    `- **Date**: ${ts}`,
    `- **Lines**: ${items.length}`,
    `- **Average confidence**: ${(avg * 100).toFixed(1)}%`,
    `- **Total time**: ${formatDuration(result.metrics.totalMs)}`,
    `- **Detection**: ${formatDuration(result.metrics.detMs)}`,
    `- **Recognition**: ${formatDuration(result.metrics.recMs)}`,
    ``,
    `## Text`,
    ``,
    '```text',
  ].filter(Boolean) as string[];

  const body = items.map((i) => i.text).join('\n');
  const tail = ['```', ``, `## Detected Lines`, ``];

  const lines = items
    .map(
      (i, idx) =>
        `${idx + 1}. **${(i.score * 100).toFixed(0)}%** — ${i.text.replace(/\n/g, ' ')}`
    )
    .join('\n');

  return [...head, body, ...tail, lines, ``].join('\n');
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="font-mono text-xs">{value}</dd>
    </div>
  );
}

function scoreClass(score: number): string {
  if (score >= 0.9) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
  if (score >= 0.7) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
  return 'bg-destructive/15 text-destructive';
}

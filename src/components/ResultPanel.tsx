import { useMemo, useState } from 'react';
import { Check, Copy, Download, FileJson, FileText, Search } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { OcrItem, OcrResult } from '@/lib/ocr-engine';
import { cn, formatDuration } from '@/lib/utils';

interface ResultPanelProps {
  result: OcrResult | null;
}

type SortMode = 'reading' | 'score-desc' | 'score-asc';

export function ResultPanel({ result }: ResultPanelProps) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('reading');
  const [copied, setCopied] = useState<'text' | 'json' | null>(null);

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

  const copy = async (kind: 'text' | 'json') => {
    const payload = kind === 'json' ? JSON.stringify(result, null, 2) : fullText;
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // ignore
    }
  };

  const download = (kind: 'txt' | 'json') => {
    const payload =
      kind === 'json'
        ? JSON.stringify(result, null, 2)
        : items.map((i) => i.text).join('\n');
    const blob = new Blob([payload], { type: kind === 'json' ? 'application/json' : 'text/plain' });
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
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium">Hasil OCR</span>
          <span className="font-mono text-xs text-muted-foreground">
            {items.length} baris · avg {avgScore.toFixed(2)} ·{' '}
            {formatDuration(result.metrics.totalMs)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs"
            onClick={() => copy('text')}
            disabled={!fullText}
          >
            {copied === 'text' ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Salin teks</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs"
            onClick={() => copy('json')}
            disabled={!result}
          >
            {copied === 'json' ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">Salin JSON</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs"
            onClick={() => download('txt')}
            disabled={!fullText}
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">.txt</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-xs"
            onClick={() => download('json')}
            disabled={!result}
          >
            <FileJson className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">.json</span>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b bg-background px-3 py-2 sm:px-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Cari di hasil..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring"
          />
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
      </div>

      <div className="flex-1 overflow-auto scrollbar-thin">
        {items.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Tidak ada teks terdeteksi.
          </div>
        )}
        {items.length > 0 && (
          <ul className="divide-y">
            {filtered.map((it, i) => (
              <li
                key={`${i}-${it.text}`}
                className={cn(
                  'flex items-start gap-3 px-3 py-2 sm:px-4',
                  'hover:bg-muted/40'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 inline-flex h-5 w-7 shrink-0 items-center justify-center rounded font-mono text-[10px]',
                    scoreClass(it.score)
                  )}
                >
                  {`${(it.score * 100).toFixed(0)}%`}
                </span>
                <p className="flex-1 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {highlight(it.text, query)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Separator />
      <details className="px-3 py-2 text-xs text-muted-foreground sm:px-4">
        <summary className="cursor-pointer select-none">Detail metrik</summary>
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

function highlight(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-200/60 px-0.5 dark:bg-yellow-500/30">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

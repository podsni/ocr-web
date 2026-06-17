import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageDown, Loader2, ScanSearch, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOcrStore } from '@/store';
import { formatBytes } from '@/lib/utils';

interface DropZoneProps {
  onPickSample: (src: string, name: string) => void;
}

const SAMPLES = [
  {
    name: 'Receipt (English)',
    src: `${import.meta.env.BASE_URL}samples/receipt.png`.replace(/\/+/g, '/'),
    hint: 'struk belanja',
  },
  {
    name: 'Printed text',
    src: `${import.meta.env.BASE_URL}samples/printed-text.png`.replace(/\/+/g, '/'),
    hint: 'latin print',
  },
  {
    name: 'Handwriting',
    src: `${import.meta.env.BASE_URL}samples/handwriting.png`.replace(/\/+/g, '/'),
    hint: 'tulisan tangan',
  },
];

export function DropZone({ onPickSample }: DropZoneProps) {
  const setImage = useOcrStore((s) => s.setImage);
  const engineReady = useOcrStore((s) => s.engineReady);
  const engineError = useOcrStore((s) => s.engineError);
  const loadingMessage = useOcrStore((s) => s.loadingMessage);
  const tier = useOcrStore((s) => s.tier);

  const [dragOver, setDragOver] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadPct, setDownloadPct] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('File harus berupa gambar (PNG, JPEG, WebP, GIF, BMP).');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        alert(`Ukuran gambar ${formatBytes(file.size)} melebihi batas 20 MB.`);
        return;
      }
      setImage(file);
    },
    [setImage]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = Array.from(e.clipboardData.items);
      const image = items.find((it) => it.type.startsWith('image/'));
      if (!image) return;
      const file = image.getAsFile();
      if (file) {
        e.preventDefault();
        handleFile(file);
      }
    },
    [handleFile]
  );

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const downloadSample = useCallback(
    async (src: string, name: string) => {
      setDownloading(name);
      setDownloadPct(0);
      try {
        const res = await fetch(src);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const total = Number(res.headers.get('content-length') ?? 0);
        const reader = res.body?.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        if (reader) {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              // Copy into a fresh ArrayBuffer-backed view because BlobPart
              // requires ArrayBuffer (not SharedArrayBuffer).
              const buf = new Uint8Array(value.byteLength);
              buf.set(value);
              chunks.push(buf);
              received += value.byteLength;
              if (total > 0) setDownloadPct((received / total) * 100);
            }
          }
        }
        const blob = new Blob(chunks as BlobPart[]);
        const file = new File([blob], name.replace(/\s+/g, '-').toLowerCase() + '.png', {
          type: blob.type || 'image/png',
        });
        onPickSample(src, file.name);
        handleFile(file);
      } catch (err) {
        alert(
          `Gagal unduh contoh: ${err instanceof Error ? err.message : String(err)}. Coba upload manual.`
        );
      } finally {
        setDownloading(null);
      }
    },
    [handleFile, onPickSample]
  );

  return (
    <Card
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={[
        'group relative flex flex-col items-center justify-center gap-4 border-2 border-dashed p-6 transition-colors sm:p-10',
        dragOver
          ? 'border-primary bg-primary/5'
          : 'border-muted-foreground/25 hover:border-primary/40 hover:bg-muted/30',
      ].join(' ')}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />

      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-14 sm:w-14">
        <ImageDown className="h-6 w-6 sm:h-7 sm:w-7" />
      </div>

      <div className="text-center">
        <h2 className="text-lg font-semibold sm:text-xl">Letakkan gambar di sini</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          atau{' '}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            pilih file
          </button>
          , paste dengan{' '}
          <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-xs">Ctrl+V</kbd>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PNG, JPEG, WebP, GIF, BMP · maks 20 MB · diproses lokal di browser
        </p>
      </div>

      {!engineReady && !engineError && (
        <div className="w-full max-w-md space-y-2 rounded-md border bg-muted/30 p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>{loadingMessage ?? 'Menyiapkan engine OCR...'}</span>
          </div>
          <Progress value={null as unknown as number} className="h-1.5 [&>div]:animate-pulse" />
        </div>
      )}

      {engineError && (
        <div className="w-full max-w-md rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          Engine gagal dimuat: {engineError}
        </div>
      )}

      <div className="mt-2 w-full max-w-2xl">
        <div className="mb-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          <span>Atau coba contoh ({tier})</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SAMPLES.map((s) => {
            const isDl = downloading === s.name;
            return (
              <Button
                key={s.name}
                variant="outline"
                size="sm"
                disabled={!!downloading || !engineReady}
                onClick={() => downloadSample(s.src, s.name)}
                className="h-auto justify-start gap-2 py-2 text-left"
              >
                {isDl ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                ) : (
                  <ScanSearch className="h-3.5 w-3.5 shrink-0" />
                )}
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-medium">{s.name}</span>
                  <span className="truncate text-[10px] text-muted-foreground">
                    {isDl ? `${downloadPct.toFixed(0)}%` : s.hint}
                  </span>
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

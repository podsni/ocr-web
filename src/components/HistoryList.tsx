import { Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { HistoryEntry } from '@/store';
import { formatBytes, formatDuration } from '@/lib/utils';

interface HistoryListProps {
  history: HistoryEntry[];
  onPick: (entry: HistoryEntry) => void;
  onClear: () => void;
}

export function HistoryList({ history, onPick, onClear }: HistoryListProps) {
  if (history.length === 0) return null;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2 sm:px-4">
        <span className="text-sm font-medium">Riwayat</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
          onClick={onClear}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Bersihkan
        </Button>
      </div>
      <ul className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {history.map((h) => (
          <li key={h.id}>
            <button
              type="button"
              onClick={() => onPick(h)}
              className="group flex w-full flex-col overflow-hidden rounded-md border bg-card text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="relative aspect-video overflow-hidden bg-muted">
                <img
                  src={h.blobUrl}
                  alt={h.fileName}
                  className="absolute inset-0 h-full w-full object-contain"
                  draggable={false}
                />
                <span className="absolute right-1 top-1 rounded bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
                  {h.tier}
                </span>
              </div>
              <div className="px-2 py-1.5">
                <p className="truncate text-xs font-medium" title={h.fileName}>
                  {h.fileName}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {h.result.items.length} baris · {formatDuration(h.result.metrics.totalMs)}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t px-3 py-1.5 text-[10px] text-muted-foreground sm:px-4">
        {history.length} gambar · {formatBytes(history.reduce((s, h) => s + h.sizeBytes, 0))}
      </div>
    </Card>
  );
}

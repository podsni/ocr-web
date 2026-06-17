import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { OcrResult } from '@/lib/ocr-engine';
import { cn } from '@/lib/utils';

interface ResultViewerProps {
  blobUrl: string | null;
  fileName: string | null;
  fileSize: number;
  result: OcrResult | null;
  inferring: boolean;
  inferError: string | null;
  showOverlay: boolean;
  onToggleOverlay: () => void;
}

export function ResultViewer({
  blobUrl,
  fileName,
  fileSize,
  result,
  inferring,
  inferError,
  showOverlay,
  onToggleOverlay,
}: ResultViewerProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [renderSize, setRenderSize] = useState<{ w: number; h: number } | null>(null);

  // Fit image to viewport on load + window resize.
  useEffect(() => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const compute = () => {
      const natural = { w: img.naturalWidth, h: img.naturalHeight };
      if (!natural.w || !natural.h) return;
      setImgSize(natural);
      const wrap = wrapperRef.current;
      if (!wrap) return;
      const padding = 32;
      const maxW = Math.max(160, wrap.clientWidth - padding);
      const maxH = Math.max(160, wrap.clientHeight - padding);
      const fit = Math.min(maxW / natural.w, maxH / natural.h, 1);
      setRenderSize({ w: natural.w * fit, h: natural.h * fit });
      setZoom(fit);
    };
    if (img.complete) compute();
    img.addEventListener('load', compute);
    window.addEventListener('resize', compute);
    return () => {
      img.removeEventListener('load', compute);
      window.removeEventListener('resize', compute);
    };
  }, [blobUrl]);

  const overlayBoxes = useMemo(() => {
    if (!result || !imgSize || !renderSize) return [];
    const scaleX = renderSize.w / imgSize.w;
    const scaleY = renderSize.h / imgSize.h;
    return result.items.map((item, idx) => {
      const xs = item.poly.map((p) => p[0]);
      const ys = item.poly.map((p) => p[1]);
      const minX = Math.min(...xs) * scaleX;
      const minY = Math.min(...ys) * scaleY;
      const maxX = Math.max(...xs) * scaleX;
      const maxY = Math.max(...ys) * scaleY;
      return {
        idx,
        text: item.text,
        score: item.score,
        x: minX,
        y: minY,
        w: maxX - minX,
        h: maxY - minY,
      };
    });
  }, [result, imgSize, renderSize]);

  const setZoomRelative = (factor: number) => {
    setZoom((z) => Math.max(0.25, Math.min(4, z * factor)));
  };

  const resetZoom = () => {
    if (!imgSize || !renderSize) return;
    setZoom(renderSize.w / imgSize.w);
  };

  if (!blobUrl) return null;

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2 sm:px-4">
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{fileName ?? 'Gambar'}</span>
          {fileSize > 0 && (
            <span className="text-xs text-muted-foreground">
              {imgSize ? `${imgSize.w}×${imgSize.h} · ` : ''}
              {(fileSize / 1024).toFixed(0)} KB
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Perkecil"
            onClick={() => setZoomRelative(0.8)}
            disabled={!renderSize}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="hidden min-w-[3rem] text-center font-mono text-xs text-muted-foreground sm:inline">
            {(zoom * 100).toFixed(0)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Perbesar"
            onClick={() => setZoomRelative(1.25)}
            disabled={!renderSize}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Paskan ke viewport"
            onClick={resetZoom}
            disabled={!renderSize}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button
            variant={showOverlay ? 'default' : 'ghost'}
            size="sm"
            className="h-8 px-2 text-xs"
            onClick={onToggleOverlay}
          >
            Bounding box
          </Button>
        </div>
      </div>

      <div
        ref={wrapperRef}
        className="relative flex flex-1 items-center justify-center overflow-auto bg-muted/20 p-4"
        style={{ minHeight: 280 }}
      >
        {renderSize && (
          <div
            className="relative"
            style={{ width: renderSize.w * zoom, height: renderSize.h * zoom }}
          >
            <img
              ref={imgRef}
              src={blobUrl}
              alt={fileName ?? ''}
              draggable={false}
              className={cn('select-none', result ? 'pointer-events-none' : '')}
              style={{
                width: renderSize.w * zoom,
                height: renderSize.h * zoom,
                imageRendering: zoom > 2 ? 'pixelated' : 'auto',
              }}
            />
            {showOverlay && overlayBoxes.length > 0 && (
              <svg
                className="pointer-events-none absolute inset-0"
                width={renderSize.w * zoom}
                height={renderSize.h * zoom}
                viewBox={`0 0 ${renderSize.w} ${renderSize.h}`}
                preserveAspectRatio="none"
              >
                {overlayBoxes.map((b) => (
                  <g key={b.idx}>
                    <rect
                      x={b.x}
                      y={b.y}
                      width={b.w}
                      height={b.h}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth={Math.max(1.5, 2 / zoom)}
                      strokeDasharray="0"
                      vectorEffect="non-scaling-stroke"
                    />
                    <text
                      x={b.x}
                      y={Math.max(12, b.y - 4)}
                      fontSize={Math.max(10, 12 / zoom)}
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--background))"
                      strokeWidth={3 / zoom}
                      paintOrder="stroke"
                      style={{ fontFamily: 'ui-monospace, monospace' }}
                    >
                      {`${b.idx + 1} · ${(b.score * 100).toFixed(0)}%`}
                    </text>
                  </g>
                ))}
              </svg>
            )}
          </div>
        )}

        {inferring && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm shadow-md">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Mengenali teks...</span>
            </div>
          </div>
        )}

        {inferError && !inferring && (
          <div className="absolute inset-x-4 bottom-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {inferError}
            <Button variant="ghost" size="sm" className="ml-2" onClick={() => location.reload()}>
              <RotateCcw className="h-3.5 w-3.5" />
              Coba lagi
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

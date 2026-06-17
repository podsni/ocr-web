import { Header } from '@/components/Header';
import { DropZone } from '@/components/DropZone';
import { ResultViewer } from '@/components/ResultViewer';
import { ResultPanel } from '@/components/ResultPanel';
import { HistoryList } from '@/components/HistoryList';
import { useEngineBootstrap } from '@/hooks/useEngineBootstrap';
import { useOcrRun } from '@/hooks/useOcrRun';
import { useOcrStore, type HistoryEntry } from '@/store';

export default function App() {
  useEngineBootstrap();
  useOcrRun();

  const blobUrl = useOcrStore((s) => s.imageBlobUrl);
  const fileName = useOcrStore((s) => s.fileName);
  const fileSize = useOcrStore((s) => s.fileSize);
  const result = useOcrStore((s) => s.result);
  const inferring = useOcrStore((s) => s.inferring);
  const inferError = useOcrStore((s) => s.inferError);
  const showOverlay = useOcrStore((s) => s.showOverlay);
  const setShowOverlay = useOcrStore((s) => s.setShowOverlay);
  const setResult = useOcrStore((s) => s.setResult);
  const history = useOcrStore((s) => s.history);
  const clearHistory = useOcrStore((s) => s.clearHistory);

  const pickFromHistory = (entry: HistoryEntry) => {
    setResult(entry.result);
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-6">
        {!blobUrl && <DropZone onPickSample={() => undefined} />}

        {blobUrl && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
            <ResultViewer
              blobUrl={blobUrl}
              fileName={fileName}
              fileSize={fileSize}
              result={result}
              inferring={inferring}
              inferError={inferError}
              showOverlay={showOverlay}
              onToggleOverlay={() => setShowOverlay(!showOverlay)}
            />
            <ResultPanel result={result} />
          </div>
        )}

        <HistoryList history={history} onPick={pickFromHistory} onClear={clearHistory} />

        {!blobUrl && <Footer />}
      </main>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-4 flex flex-col gap-1 border-t pt-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div>
        Dibangun dengan{' '}
        <a
          href="https://github.com/PaddlePaddle/PaddleOCR"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline-offset-4 hover:underline"
        >
          PaddleOCR
        </a>{' '}
        (PP-OCRv6, Apache 2.0) +{' '}
        <a
          href="https://onnxruntime.ai/"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline-offset-4 hover:underline"
        >
          ONNX Runtime Web
        </a>
        .
      </div>
      <div className="font-mono text-[10px]">
        100% di browser · tidak ada upload · tidak ada tracking
      </div>
    </footer>
  );
}

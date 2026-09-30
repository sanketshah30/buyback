import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

type Props = {
  url: string;
};

/**
 * Renders each PDF page to a canvas scaled to the container's width.
 * Native iframe/`#view=FitH` is ignored on most mobile PDF viewers.
 */
export function ReceiptPdfViewer({ url }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let cancelled = false;
    let pdfDoc: PDFDocumentProxy | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const clearCanvases = () => {
      container.querySelectorAll('canvas').forEach((node) => node.remove());
    };

    const renderPages = async (pdf: PDFDocumentProxy) => {
      const width = container.clientWidth;
      if (width <= 0) return;

      clearCanvases();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        if (cancelled) return;
        const page = await pdf.getPage(pageNum);
        const base = page.getViewport({ scale: 1 });
        const scale = width / base.width;
        const viewport = page.getViewport({ scale: scale * dpr });

        const canvas = document.createElement('canvas');
        canvas.className = 'receipt-viewer__page';
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${base.height * scale}px`;
        container.appendChild(canvas);

        await page.render({ canvas, viewport }).promise;
      }
    };

    (async () => {
      setRendering(true);
      setError(null);
      try {
        const loadingTask = getDocument(url);
        pdfDoc = await loadingTask.promise;
        if (cancelled) return;
        await renderPages(pdfDoc);

        let lastWidth = container.clientWidth;
        resizeObserver = new ResizeObserver((entries) => {
          const nextWidth = entries[0]?.contentRect.width ?? 0;
          if (!pdfDoc || Math.abs(nextWidth - lastWidth) < 1) return;
          lastWidth = nextWidth;
          void renderPages(pdfDoc);
        });
        resizeObserver.observe(container);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render PDF');
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      clearCanvases();
      void pdfDoc?.destroy();
    };
  }, [url]);

  return (
    <div className="receipt-viewer">
      {rendering && <p className="receipt-viewer__status">Rendering receipt…</p>}
      {error && <p className="receipt-viewer__status receipt-viewer__status--error">{error}</p>}
      <div ref={containerRef} className="receipt-viewer__pages" />
    </div>
  );
}

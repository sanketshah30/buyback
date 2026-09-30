import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

type Props = {
  url: string;
};

function measureWidth(el: HTMLElement): number {
  // Prefer layout width; floor to avoid 1px horizontal overflow on mobile.
  const rect = el.getBoundingClientRect().width;
  const client = el.clientWidth;
  return Math.max(0, Math.floor(Math.min(rect || client, client || rect)));
}

/**
 * Renders each PDF page to a canvas scaled to the container's width.
 * Native iframe/`#view=FitH` is ignored on most mobile PDF viewers.
 */
export function ReceiptPdfViewer({ url }: Props) {
  const shellRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    const shell = shellRef.current;
    const pages = pagesRef.current;
    if (!shell || !pages) return undefined;

    let cancelled = false;
    let pdfDoc: PDFDocumentProxy | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let renderToken = 0;

    const clearCanvases = () => {
      pages.querySelectorAll('canvas').forEach((node) => node.remove());
    };

    const waitForWidth = async (): Promise<number> => {
      for (let i = 0; i < 20; i += 1) {
        const width = measureWidth(shell);
        if (width > 0) return width;
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }
      return measureWidth(shell);
    };

    const renderPages = async (pdf: PDFDocumentProxy) => {
      const token = ++renderToken;
      const width = await waitForWidth();
      if (cancelled || token !== renderToken || width <= 0) return;

      clearCanvases();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
        if (cancelled || token !== renderToken) return;
        const page = await pdf.getPage(pageNum);
        const base = page.getViewport({ scale: 1 });
        const scale = width / base.width;
        const viewport = page.getViewport({ scale: scale * dpr });

        const canvas = document.createElement('canvas');
        canvas.className = 'receipt-viewer__page';
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        pages.appendChild(canvas);

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

        let lastWidth = measureWidth(shell);
        resizeObserver = new ResizeObserver(() => {
          const nextWidth = measureWidth(shell);
          if (!pdfDoc || Math.abs(nextWidth - lastWidth) < 1) return;
          lastWidth = nextWidth;
          clearTimeout(debounce);
          debounce = setTimeout(() => {
            if (pdfDoc) void renderPages(pdfDoc);
          }, 80);
        });
        resizeObserver.observe(shell);
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
      clearTimeout(debounce);
      resizeObserver?.disconnect();
      clearCanvases();
      void pdfDoc?.destroy();
    };
  }, [url]);

  return (
    <div ref={shellRef} className="receipt-viewer receipt-page-bleed">
      {rendering && <p className="receipt-viewer__status">Rendering receipt…</p>}
      {error && <p className="receipt-viewer__status receipt-viewer__status--error">{error}</p>}
      <div ref={pagesRef} className="receipt-viewer__pages" />
    </div>
  );
}

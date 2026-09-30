import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Banner } from '../../components/ui/Banner';
import { Button } from '../../components/ui/Button';
import { PageShell } from '../../components/ui/PageShell';
import { Spinner } from '../../components/ui/Spinner';
import { useBuyback } from '../../hooks/useBuyback';
import { api, ApiError } from '../../lib/api';

/**
 * Lets the partner preview the legal purchase-receipt PDF in-app (see
 * server/src/services/receipt.service.ts) for a completed buyback. The PDF
 * is served by the same auth-gated uploads route as every other file, so a
 * plain `<iframe src>` can't carry Authorization - we fetch a blob URL and
 * render pages with PDF.js scaled to the container width (mobile browsers
 * ignore `#view=FitH` on blob iframes).
 */
export function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading: loadingRequest, error: requestError } = useBuyback(id);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [Viewer, setViewer] = useState<null | typeof import('../../components/ReceiptPdfViewer').ReceiptPdfViewer>(null);

  useEffect(() => {
    let cancelled = false;
    void import('../../components/ReceiptPdfViewer').then((mod) => {
      if (!cancelled) setViewer(() => mod.ReceiptPdfViewer);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!data?.receiptUrl) {
      setLoadingPdf(false);
      return undefined;
    }
    let objectUrl: string | null = null;
    setLoadingPdf(true);
    setPdfError(null);
    api
      .getBlob(data.receiptUrl)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setBlobUrl(objectUrl);
      })
      .catch((err) => setPdfError(err instanceof ApiError ? err.message : 'Failed to load the receipt PDF'))
      .finally(() => setLoadingPdf(false));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [data?.receiptUrl]);

  if (loadingRequest) return <PageShell title="Purchase receipt"><Spinner /></PageShell>;
  if (!data) return <PageShell title="Purchase receipt"><Banner tone="error">{requestError ?? 'Buyback request not found.'}</Banner></PageShell>;

  return (
    <PageShell
      title="Purchase receipt"
      subtitle={data.referenceId ? `Buyback ${data.referenceId}` : undefined}
      footer={
        blobUrl ? (
          <a href={blobUrl} download={`buyback-receipt-${data.referenceId ?? data.id}.pdf`}>
            <Button type="button">Download PDF</Button>
          </a>
        ) : undefined
      }
    >
      {!data.receiptUrl && (
        <Banner tone="info">
          No purchase receipt has been generated for this buyback yet - it's created automatically once the buyback is completed.
        </Banner>
      )}
      {pdfError && <Banner tone="error">{pdfError}</Banner>}
      {(loadingPdf || (blobUrl && !Viewer)) && <Spinner label="Loading receipt…" />}
      {blobUrl && Viewer && <Viewer url={blobUrl} />}
    </PageShell>
  );
}

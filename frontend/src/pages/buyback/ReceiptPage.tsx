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
 * is served by the same auth-gated `GET /api/uploads/:buybackId/:filename`
 * route as every other upload, so a plain `<iframe src="...">` won't work
 * (it can't carry the Authorization header) - instead we fetch it as a
 * blob via `api.getBlob()` and render that as an object URL.
 */
export function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading: loadingRequest, error: requestError } = useBuyback(id);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

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
      {loadingPdf && <Spinner label="Loading receipt…" />}
      {blobUrl && (
        <iframe
          src={blobUrl}
          title="Purchase receipt PDF"
          style={{ width: '100%', height: '70vh', border: '1px solid var(--color-border, #e0e0e0)', borderRadius: 8 }}
        />
      )}
    </PageShell>
  );
}

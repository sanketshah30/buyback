import { useEffect, useId, useRef, useState } from 'react';
import { Banner } from './ui/Banner';
import { Button } from './ui/Button';
import './BarcodeScanner.css';

interface BarcodeScannerProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  onScan: (value: string) => void;
}

export function BarcodeScanner({ open, title = 'Scan barcode', onClose, onScan }: BarcodeScannerProps) {
  const regionId = useId().replace(/:/g, '');
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void; isScanning: boolean } | null>(null);
  const handledRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    handledRef.current = false;
    setError(null);
    setStarting(true);

    let cancelled = false;

    const start = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        if (cancelled) return;

        const scanner = new Html5Qrcode(regionId, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.CODABAR,
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.DATA_MATRIX,
          ],
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 140 }, aspectRatio: 1.777 },
          (decodedText) => {
            if (handledRef.current || cancelled) return;
            handledRef.current = true;
            const value = decodedText.trim();
            if (!value) return;
            onScan(value);
          },
          () => undefined,
        );
        if (!cancelled) setStarting(false);
      } catch (err) {
        if (cancelled) return;
        setStarting(false);
        setError(err instanceof Error ? err.message : 'Unable to access the camera for scanning.');
      }
    };

    void start();

    return () => {
      cancelled = true;
      const active = scannerRef.current;
      scannerRef.current = null;
      if (!active) return;
      const stop = async () => {
        try {
          if (active.isScanning) await active.stop();
        } catch {
          // Camera may already be released.
        }
        try {
          active.clear();
        } catch {
          // Element may already be unmounted.
        }
      };
      void stop();
    };
  }, [open, onScan, regionId]);

  if (!open) return null;

  return (
    <div className="barcode-scanner__overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="barcode-scanner">
        <header className="barcode-scanner__header">
          <h2>{title}</h2>
          <button type="button" className="barcode-scanner__close" onClick={onClose} aria-label="Close scanner">
            ×
          </button>
        </header>

        <p className="barcode-scanner__hint">Point the camera at the barcode on the device or packaging.</p>

        <div className="barcode-scanner__viewport">
          <div id={regionId} className="barcode-scanner__region" />
          {starting && !error && <p className="barcode-scanner__status">Starting camera…</p>}
        </div>

        {error && <Banner tone="error">{error}</Banner>}

        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

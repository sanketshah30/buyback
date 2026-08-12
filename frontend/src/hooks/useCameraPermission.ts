import { useCallback, useState } from 'react';

export type PermissionState = 'unknown' | 'granted' | 'denied' | 'unsupported';

/**
 * Explicitly requests camera access before an image/video capture step, per
 * the product requirement to "ask for necessary permissions if the
 * application doesn't have them". Actual capture is done via a native
 * `<input capture>` file picker for broad device compatibility - this hook
 * only triggers/tracks the OS-level permission prompt ahead of time.
 */
export function useCameraPermission() {
  const [state, setState] = useState<PermissionState>('unknown');
  const [error, setError] = useState<string | null>(null);

  const requestAccess = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unsupported');
      return 'unsupported' as const;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((track) => track.stop());
      setState('granted');
      setError(null);
      return 'granted' as const;
    } catch (err) {
      setState('denied');
      setError(err instanceof Error ? err.message : 'Camera permission was denied');
      return 'denied' as const;
    }
  }, []);

  return { state, error, requestAccess };
}

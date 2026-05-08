import { useEffect, useState } from 'react';

type WakeLockHandle = {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
};

type WakeLockApi = {
  request(type: 'screen'): Promise<WakeLockHandle>;
};

export type WakeLockStatus = 'idle' | 'locked' | 'unsupported' | 'error';

export function useWakeLock(enabled: boolean): WakeLockStatus {
  const [status, setStatus] = useState<WakeLockStatus>(enabled ? 'idle' : 'idle');

  useEffect(() => {
    if (!enabled) {
      setStatus('idle');
      return;
    }

    const api = (navigator as Navigator & { wakeLock?: WakeLockApi }).wakeLock;
    if (!api) {
      setStatus('unsupported');
      return;
    }

    let cancelled = false;
    let handle: WakeLockHandle | null = null;

    const requestLock = async () => {
      try {
        handle = await api.request('screen');
        if (cancelled) {
          await handle.release().catch(() => undefined);
          return;
        }
        setStatus('locked');
        handle.addEventListener('release', () => {
          if (!cancelled) {
            setStatus('idle');
          }
        });
      } catch {
        if (!cancelled) {
          setStatus('error');
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        void requestLock();
      }
    };

    void requestLock();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (handle) {
        void handle.release().catch(() => undefined);
      }
    };
  }, [enabled]);

  return status;
}


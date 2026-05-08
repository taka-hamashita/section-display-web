import { useEffect, useState } from 'react';
import { QrPanel } from './components/QrPanel';
import { buildQrSvg, buildShareUrl } from './lib/qr';
import { DisplayState, displayStateToStorage, readInitialDisplayState, STORAGE_KEY } from './lib/state';

export default function App() {
  const [state, setState] = useState<DisplayState>(() => readInitialDisplayState());
  const [qrSvg, setQrSvg] = useState('');
  const [generating, setGenerating] = useState(true);
  const [copied, setCopied] = useState(false);

  const shareUrl = buildShareUrl(state);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, displayStateToStorage(state));
    } catch {}

    try {
      window.history.replaceState(null, '', shareUrl);
    } catch {}
  }, [shareUrl, state]);

  useEffect(() => {
    let cancelled = false;
    setGenerating(true);

    void buildQrSvg(shareUrl)
      .then((svg) => {
        if (!cancelled) {
          setQrSvg(svg);
          setGenerating(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrSvg('');
          setGenerating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [shareUrl]);

  useEffect(() => {
    const onPopState = () => {
      setState(readInitialDisplayState());
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const updateState = (patch: Partial<DisplayState>) => {
    setState((current) => ({
      ...current,
      ...patch
    }));
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="app-shell">
      <QrPanel
        state={state}
        qrSvg={qrSvg}
        generating={generating}
        copied={copied}
        onCopy={copyShareUrl}
        onStateChange={updateState}
      />
    </div>
  );
}

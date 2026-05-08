import { useEffect, useState } from 'react';
import { QrPanel } from './components/QrPanel';
import { buildQrDownloadName, buildQrSvg, buildShareUrl, copyQrImage, saveQrImage } from './lib/qr';
import { DisplayState, displayStateToStorage, readInitialDisplayState, STORAGE_KEY } from './lib/state';

export default function App() {
  const [state, setState] = useState<DisplayState>(() => readInitialDisplayState());
  const [qrSvg, setQrSvg] = useState('');
  const [generating, setGenerating] = useState(true);
  const [urlCopied, setUrlCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  const [qrSaved, setQrSaved] = useState(false);

  const shareUrl = buildShareUrl(state);
  const qrFileName = buildQrDownloadName(state);

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
      setUrlCopied(true);
      window.setTimeout(() => setUrlCopied(false), 1200);
    } catch {
      setUrlCopied(false);
    }
  };

  const copyQrCode = async () => {
    try {
      const copiedImage = await copyQrImage(qrSvg);
      if (copiedImage) {
        setQrCopied(true);
        window.setTimeout(() => setQrCopied(false), 1200);
      }
    } catch {
      setQrCopied(false);
    }
  };

  const saveQrCode = async () => {
    try {
      await saveQrImage(qrSvg, qrFileName);
      setQrSaved(true);
      window.setTimeout(() => setQrSaved(false), 1200);
    } catch {
      setQrSaved(false);
    }
  };

  return (
    <div className="app-shell">
      <QrPanel
        state={state}
        qrSvg={qrSvg}
        generating={generating}
        urlCopied={urlCopied}
        qrCopied={qrCopied}
        qrSaved={qrSaved}
        onCopyUrl={copyShareUrl}
        onCopyQr={copyQrCode}
        onSaveQr={saveQrCode}
        onStateChange={updateState}
      />
    </div>
  );
}

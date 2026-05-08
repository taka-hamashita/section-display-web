import { useEffect, useState } from 'react';
import { QrPanel } from './components/QrPanel';
import { QrScanner } from './components/QrScanner';
import { useWakeLock } from './hooks/useWakeLock';
import { buildQrSvg, buildShareUrl } from './lib/qr';
import {
  DEFAULT_STATE,
  DisplayState,
  displayStateFromText,
  displayStateToStorage,
  directionLabel,
  readInitialDisplayState,
  sideLabel,
  STORAGE_KEY
} from './lib/state';

type FeedbackTone = 'neutral' | 'success' | 'warning' | 'error';

function feedbackToneClass(tone: FeedbackTone): string {
  return `feedback-${tone}`;
}

export default function App() {
  const [state, setState] = useState<DisplayState>(() => readInitialDisplayState());
  const [qrSvg, setQrSvg] = useState('');
  const [generating, setGenerating] = useState(true);
  const [feedback, setFeedback] = useState('QRを生成しています');
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>('neutral');
  const [copied, setCopied] = useState(false);
  const [keepAwake, setKeepAwake] = useState(true);

  const wakeLockState = useWakeLock(keepAwake);
  const shareUrl = buildShareUrl(state);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, displayStateToStorage(state));
    } catch {
      setFeedback('状態の保存に失敗しました');
      setFeedbackTone('warning');
    }

    try {
      window.history.replaceState(null, '', shareUrl);
    } catch {
      setFeedback('URLの更新に失敗しました');
      setFeedbackTone('warning');
    }
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
          setFeedback('QRの生成に失敗しました');
          setFeedbackTone('error');
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

  const resetState = () => {
    setState(DEFAULT_STATE);
    setFeedback('既定値に戻しました');
    setFeedbackTone('success');
  };

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setFeedback('URLをコピーしました');
      setFeedbackTone('success');
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setFeedback('クリップボードにコピーできませんでした');
      setFeedbackTone('warning');
    }
  };

  const handleScannedPayload = (payload: string) => {
    const parsed = displayStateFromText(payload);
    if (!parsed) {
      setFeedback('QRから状態を読み取れませんでした');
      setFeedbackTone('warning');
      return;
    }

    setState(parsed);
    setFeedback(
      `読み取り完了: ${parsed.sectionId} / ${directionLabel(parsed.direction)} / ${sideLabel(parsed.side)} / ${parsed.shotNo}`
    );
    setFeedbackTone('success');
  };

  const handleScannerMessage = (message: string) => {
    setFeedback(message);
    setFeedbackTone('neutral');
  };

  const currentSectionId = state.sectionId.trim() || '未設定';
  const currentDirection = directionLabel(state.direction);
  const currentSide = sideLabel(state.side);
  const currentShotNo = state.shotNo;

  return (
    <div className="app-shell">
      <header className="hero card">
        <div className="hero-copy">
          <p className="card-kicker">撮影現場向け</p>
          <h1>セクション表示Webアプリ</h1>
          <p className="hero-text">
            セクションID、順逆、左右、撮影回数をスマホで大きく表示し、同じ状態をQRコードと読み取りで往復できる画面
          </p>
        </div>

        <div className="hero-meta">
          <label className="switch">
            <input type="checkbox" checked={keepAwake} onChange={(event) => setKeepAwake(event.target.checked)} />
            <span>画面を維持</span>
          </label>
          <p className="hero-support">
            Wake Lock: <strong>{wakeLockState}</strong>
          </p>
        </div>
      </header>

      <main className="dashboard">
        <section className="card card-state">
          <div className="card-header">
            <div>
              <p className="card-kicker">現在の状態</p>
              <h2>撮影ラベル</h2>
            </div>
            <button className="secondary-button" type="button" onClick={resetState}>
              初期値へ戻す
            </button>
          </div>

          <div className="section-id-box">
            <span className="section-id-label">セクションID</span>
            <div className="section-id-value">{currentSectionId}</div>
          </div>

          <div className="control-grid">
            <label className="field">
              <span>セクションID</span>
              <input
                type="text"
                value={state.sectionId}
                onChange={(event) => updateState({ sectionId: event.target.value })}
                placeholder="203"
                inputMode="text"
              />
            </label>

            <label className="field">
              <span>撮影回数</span>
              <input
                type="number"
                min={1}
                step={1}
                value={state.shotNo}
                onChange={(event) => updateState({ shotNo: Math.max(1, Number.parseInt(event.target.value || '1', 10) || 1) })}
              />
            </label>
          </div>

          <div className="toggle-rows">
            <div className="toggle-group">
              <span className="toggle-label">順逆</span>
              <div className="toggle-buttons">
                <button
                  type="button"
                  className={state.direction === 'forward' ? 'chip chip-active' : 'chip'}
                  onClick={() => updateState({ direction: 'forward' })}
                >
                  順
                </button>
                <button
                  type="button"
                  className={state.direction === 'reverse' ? 'chip chip-active' : 'chip'}
                  onClick={() => updateState({ direction: 'reverse' })}
                >
                  逆
                </button>
              </div>
            </div>

            <div className="toggle-group">
              <span className="toggle-label">左右</span>
              <div className="toggle-buttons">
                <button
                  type="button"
                  className={state.side === 'right' ? 'chip chip-active' : 'chip'}
                  onClick={() => updateState({ side: 'right' })}
                >
                  右
                </button>
                <button
                  type="button"
                  className={state.side === 'left' ? 'chip chip-active' : 'chip'}
                  onClick={() => updateState({ side: 'left' })}
                >
                  左
                </button>
              </div>
            </div>
          </div>

          <dl className="summary-list summary-list-inline">
            <div>
              <dt>順逆</dt>
              <dd>{currentDirection}</dd>
            </div>
            <div>
              <dt>左右</dt>
              <dd>{currentSide}</dd>
            </div>
            <div>
              <dt>撮影回数</dt>
              <dd>{currentShotNo}</dd>
            </div>
          </dl>

          <div className={`feedback-box ${feedbackToneClass(feedbackTone)}`}>{feedback}</div>
        </section>

        <QrPanel state={state} payload={shareUrl} qrSvg={qrSvg} generating={generating} copied={copied} onCopy={copyShareUrl} />

        <QrScanner onDetected={handleScannedPayload} onMessage={handleScannerMessage} />
      </main>
    </div>
  );
}

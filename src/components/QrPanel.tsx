import type { DisplayState } from '../lib/state';

interface QrPanelProps {
  state: DisplayState;
  qrSvg: string;
  generating: boolean;
  copied: boolean;
  onCopy: () => void;
  onStateChange: (patch: Partial<DisplayState>) => void;
}

export function QrPanel({ state, qrSvg, generating, copied, onCopy, onStateChange }: QrPanelProps) {
  return (
    <section className="card card-qr">
      <div className="card-header">
        <div>
          <h2>PGV2用 webカチンコ</h2>
        </div>
        <div className="scanner-actions">
          <button className="secondary-button" type="button" onClick={onCopy}>
            {copied ? 'コピー済み' : 'URLをコピー'}
          </button>
        </div>
      </div>

      <div className="qr-frame" aria-busy={generating}>
        {generating ? (
          <div className="qr-loading">
            <div className="spinner" />
            <p>生成中</p>
          </div>
        ) : (
          <div className="qr-svg" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        )}
      </div>

      <div className="control-grid control-grid-compact">
        <label className="compact-field">
          <span>セクションID</span>
          <input
            type="text"
            value={state.sectionId}
            onChange={(event) => onStateChange({ sectionId: event.target.value })}
            placeholder="203"
            inputMode="text"
          />
        </label>

        <label className="compact-field">
          <span>開始ノード</span>
          <input
            type="text"
            value={state.startNode}
            onChange={(event) => onStateChange({ startNode: event.target.value })}
            placeholder="A1"
            inputMode="text"
          />
        </label>

        <label className="compact-field">
          <span>終了ノード</span>
          <input
            type="text"
            value={state.endNode}
            onChange={(event) => onStateChange({ endNode: event.target.value })}
            placeholder="B1"
            inputMode="text"
          />
        </label>

        <div className="compact-field">
          <span>順逆</span>
          <div className="toggle-buttons">
            <button
              type="button"
              className={state.direction === 'forward' ? 'chip chip-active' : 'chip'}
              onClick={() => onStateChange({ direction: 'forward' })}
            >
              順
            </button>
            <button
              type="button"
              className={state.direction === 'reverse' ? 'chip chip-active' : 'chip'}
              onClick={() => onStateChange({ direction: 'reverse' })}
            >
              逆
            </button>
          </div>
        </div>

        <div className="compact-field">
          <span>左右</span>
          <div className="toggle-buttons">
            <button
              type="button"
              className={state.side === 'right' ? 'chip chip-active' : 'chip'}
              onClick={() => onStateChange({ side: 'right' })}
            >
              右
            </button>
            <button
              type="button"
              className={state.side === 'left' ? 'chip chip-active' : 'chip'}
              onClick={() => onStateChange({ side: 'left' })}
            >
              左
            </button>
          </div>
        </div>

        <label className="compact-field">
          <span>撮影回数</span>
          <input
            type="number"
            min={1}
            step={1}
            value={state.shotNo}
            onChange={(event) => onStateChange({ shotNo: Math.max(1, Number.parseInt(event.target.value || '1', 10) || 1) })}
          />
        </label>
      </div>
    </section>
  );
}

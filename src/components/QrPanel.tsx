import type { DisplayState } from '../lib/state';

interface QrPanelProps {
  state: DisplayState;
  payload: string;
  qrSvg: string;
  generating: boolean;
  copied: boolean;
  onCopy: () => void;
}

export function QrPanel({ state, payload, qrSvg, generating, copied, onCopy }: QrPanelProps) {
  return (
    <section className="card card-qr">
      <div className="card-header">
        <div>
          <p className="card-kicker">QRコード</p>
          <h2>共有用の状態</h2>
        </div>
        <button className="secondary-button" type="button" onClick={onCopy}>
          {copied ? 'コピー済み' : 'URLをコピー'}
        </button>
      </div>

      <div className="qr-frame" aria-busy={generating}>
        {generating ? (
          <div className="qr-loading">
            <div className="spinner" />
            <p>QRを生成中</p>
          </div>
        ) : (
          <div className="qr-svg" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        )}
      </div>

      <dl className="summary-list">
        <div>
          <dt>セクションID</dt>
          <dd>{state.sectionId || '未設定'}</dd>
        </div>
        <div>
          <dt>順逆</dt>
          <dd>{state.direction === 'forward' ? '順' : '逆'}</dd>
        </div>
        <div>
          <dt>左右</dt>
          <dd>{state.side === 'right' ? '右' : '左'}</dd>
        </div>
        <div>
          <dt>撮影回数</dt>
          <dd>{state.shotNo}</dd>
        </div>
      </dl>

      <label className="payload-box">
        <span>QRの内容</span>
        <textarea readOnly rows={3} value={payload} />
      </label>
    </section>
  );
}


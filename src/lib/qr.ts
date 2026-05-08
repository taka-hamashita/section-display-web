import QRCode from 'qrcode';
import type { DisplayState } from './state';

export function buildShareUrl(state: DisplayState): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('sectionId', state.sectionId || '203');
  if (state.startNode.trim()) {
    url.searchParams.set('startNode', state.startNode.trim());
  }
  if (state.endNode.trim()) {
    url.searchParams.set('endNode', state.endNode.trim());
  }
  url.searchParams.set('direction', state.direction);
  url.searchParams.set('side', state.side);
  url.searchParams.set('shotNo', String(state.shotNo > 0 ? state.shotNo : 1));
  url.searchParams.set('v', '2');
  return url.toString();
}

export async function buildQrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff'
    }
  });
}

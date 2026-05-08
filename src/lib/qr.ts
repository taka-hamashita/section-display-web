import QRCode from 'qrcode';
import type { DisplayState } from './state';

export function buildShareUrl(state: DisplayState): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('sectionId', state.sectionId || '203');
  url.searchParams.set('direction', state.direction);
  url.searchParams.set('side', state.side);
  url.searchParams.set('shotNo', String(state.shotNo > 0 ? state.shotNo : 1));
  url.searchParams.set('v', '1');
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


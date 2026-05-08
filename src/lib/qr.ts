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
  return url.toString();
}

export function buildQrDownloadName(state: DisplayState): string {
  const parts = [
    'pgv2-web-chakinco',
    state.sectionId,
    state.startNode.trim(),
    state.endNode.trim(),
    state.direction,
    state.side,
    `shot${state.shotNo > 0 ? state.shotNo : 1}`
  ]
    .map(sanitizeFileNamePart)
    .filter((part) => part.length > 0);

  return `${parts.join('_')}.png`;
}

function sanitizeFileNamePart(value: string): string {
  return value.trim().replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').replace(/\s+/g, ' ');
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

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('QR画像の読み込みに失敗しました'));
    image.src = source;
  });
}

async function renderQrPngBlob(svgMarkup: string): Promise<Blob> {
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(objectUrl);
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('QR画像の描画先を作成できませんでした');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, size, size);
    context.drawImage(image, 0, 0, size, size);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error('QR画像のPNG変換に失敗しました'));
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function copyQrImage(svgMarkup: string): Promise<boolean> {
  if (typeof navigator.clipboard?.write !== 'function' || typeof ClipboardItem !== 'function') {
    return false;
  }

  const pngBlob = await renderQrPngBlob(svgMarkup);
  const svgBlob = new Blob([svgMarkup], { type: 'image/svg+xml;charset=utf-8' });

  await navigator.clipboard.write([
    new ClipboardItem({
      'image/png': pngBlob,
      'image/svg+xml': svgBlob
    })
  ]);

  return true;
}

export async function saveQrImage(svgMarkup: string, fileName: string): Promise<void> {
  const pngBlob = await renderQrPngBlob(svgMarkup);
  const file = new File([pngBlob], fileName, { type: 'image/png' });

  if (typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: fileName
    });
    return;
  }

  const objectUrl = URL.createObjectURL(pngBlob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }
}

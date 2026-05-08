export type Direction = 'forward' | 'reverse';
export type Side = 'right' | 'left';

export interface DisplayState {
  sectionId: string;
  direction: Direction;
  side: Side;
  shotNo: number;
}

export const DEFAULT_STATE: DisplayState = {
  sectionId: '203',
  direction: 'forward',
  side: 'right',
  shotNo: 1
};

export const STORAGE_KEY = 'section-display-web.display-state.v1';

export function directionLabel(direction: Direction): string {
  return direction === 'forward' ? '順' : '逆';
}

export function sideLabel(side: Side): string {
  return side === 'right' ? '右' : '左';
}

export function normalizeDisplayState(state: Partial<DisplayState>): DisplayState {
  return {
    sectionId: (state.sectionId ?? DEFAULT_STATE.sectionId).trim() || DEFAULT_STATE.sectionId,
    direction: state.direction === 'reverse' ? 'reverse' : 'forward',
    side: state.side === 'left' ? 'left' : 'right',
    shotNo: Number.isFinite(state.shotNo) && (state.shotNo ?? 0) > 0 ? Math.trunc(state.shotNo ?? DEFAULT_STATE.shotNo) : DEFAULT_STATE.shotNo
  };
}

export function displayStateFromStorage(raw: string | null): DisplayState | null {
  if (!raw) {
    return null;
  }

  try {
    return normalizeDisplayState(JSON.parse(raw) as Partial<DisplayState>);
  } catch {
    return null;
  }
}

export function displayStateToStorage(state: DisplayState): string {
  return JSON.stringify(state);
}

function getParamsFromText(text: string): URLSearchParams | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  try {
    if (trimmed.startsWith('?')) {
      return new URLSearchParams(trimmed);
    }

    if (!trimmed.includes('://') && trimmed.includes('=')) {
      return new URLSearchParams(trimmed.startsWith('?') ? trimmed : `?${trimmed}`);
    }

    const url = new URL(trimmed, window.location.href);
    if (!url.search) {
      return null;
    }

    return url.searchParams;
  } catch {
    return null;
  }
}

export function displayStateFromText(text: string): DisplayState | null {
  const params = getParamsFromText(text);
  if (!params) {
    return null;
  }

  const hasAny = ['sectionId', 'direction', 'side', 'shotNo'].some((key) => params.has(key));
  if (!hasAny) {
    return null;
  }

  const sectionId = params.get('sectionId') ?? DEFAULT_STATE.sectionId;
  const direction = params.get('direction') === 'reverse' ? 'reverse' : 'forward';
  const side = params.get('side') === 'left' ? 'left' : 'right';
  const shotNoRaw = Number.parseInt(params.get('shotNo') ?? '', 10);

  return normalizeDisplayState({
    sectionId,
    direction,
    side,
    shotNo: Number.isFinite(shotNoRaw) && shotNoRaw > 0 ? shotNoRaw : DEFAULT_STATE.shotNo
  });
}

export function readInitialDisplayState(): DisplayState {
  const fromUrl = displayStateFromText(window.location.href);
  if (fromUrl) {
    return fromUrl;
  }

  try {
    const fromStorage = displayStateFromStorage(window.localStorage.getItem(STORAGE_KEY));
    if (fromStorage) {
      return fromStorage;
    }
  } catch {
    // 保存領域未対応端末向けの既定値処理
  }

  return DEFAULT_STATE;
}

export type SpriteSheetKey =
  | 'terrain'
  | 'buildings'
  | 'forest'
  | 'wildlife'
  | 'adults'
  | 'children'
  | 'villagersVariety'
  | 'catsBears'
  | 'dogFish';

export type RgbColor = readonly [number, number, number];

export interface SpriteCutoutOptions {
  /** 'flood' removes exterior background via perimeter BFS; 'opaque' keeps solid tile pixels intact. */
  mode?: 'flood' | 'opaque';
  /** Euclidean RGB tolerance for background removal (default 38). */
  tolerance?: number;
  /** Override base sheet background RGB(s). */
  bgColors?: RgbColor[];
  /** Additional exterior background colors to flood-fill (e.g. bright water box around dock). */
  extraBgColors?: RgbColor[];
}

export interface SpriteRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const SHEET_PATHS: Record<SpriteSheetKey, string> = {
  terrain: '/assets/sprites/terrain-crops.png',
  buildings: '/assets/sprites/buildings-plaza.png',
  forest: '/assets/sprites/forest-mountains.png',
  wildlife: '/assets/sprites/wildlife-resources.png',
  adults: '/assets/sprites/villagers-adults.png',
  children: '/assets/sprites/villagers-children.png',
  villagersVariety: '/assets/sprites/villagers-variety.jpg',
  catsBears: '/assets/sprites/wildlife-cats-bears.jpg',
  dogFish: '/assets/sprites/dog-and-fish.jpg',
};

declare global {
  interface Window {
    __ALDEA_INLINE_SPRITES__?: Partial<Record<SpriteSheetKey, string>>;
  }
}

export function getSpriteSourceUrl(key: SpriteSheetKey): string {
  if (typeof window !== 'undefined') {
    const inlined = window.__ALDEA_INLINE_SPRITES__?.[key];
    if (typeof inlined === 'string' && inlined.length > 0) {
      return inlined;
    }
  }
  return SHEET_PATHS[key];
}

const SHEET_DEFAULT_BG: Record<SpriteSheetKey, RgbColor> = {
  terrain: [111, 134, 142],
  buildings: [57, 65, 84],
  forest: [100, 121, 140],
  wildlife: [145, 145, 143],
  adults: [237, 232, 213],
  children: [214, 213, 209],
  villagersVariety: [119, 133, 144],
  catsBears: [133, 147, 156],
  dogFish: [116, 133, 141],
};

interface SheetCacheEntry {
  status: 'loading' | 'ready' | 'error';
  canvas: HTMLCanvasElement | null;
  width: number;
  height: number;
}

const sheetCache = new Map<SpriteSheetKey, SheetCacheEntry>();
const cutoutCache = new Map<string, HTMLCanvasElement | null>();
let spriteLoadRevision = 0;

export function getSpriteLoadRevision(): number {
  return spriteLoadRevision;
}

function canUseBrowserImages(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof Image !== 'undefined'
  );
}

export function getSpriteSheetCanvas(key: SpriteSheetKey): HTMLCanvasElement | null {
  if (!canUseBrowserImages()) return null;

  const existing = sheetCache.get(key);
  if (existing) {
    return existing.status === 'ready' ? existing.canvas : null;
  }

  const entry: SheetCacheEntry = {
    status: 'loading',
    canvas: null,
    width: 0,
    height: 0,
  };
  sheetCache.set(key, entry);

  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    try {
      const offscreen = document.createElement('canvas');
      offscreen.width = img.naturalWidth || img.width;
      offscreen.height = img.naturalHeight || img.height;
      const octx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!octx) {
        entry.status = 'error';
        return;
      }
      octx.imageSmoothingEnabled = false;
      octx.drawImage(img, 0, 0);
      entry.canvas = offscreen;
      entry.width = offscreen.width;
      entry.height = offscreen.height;
      entry.status = 'ready';
      spriteLoadRevision += 1;
    } catch {
      entry.status = 'error';
    }
  };
  img.onerror = () => {
    entry.status = 'error';
  };
  img.src = getSpriteSourceUrl(key);

  return null;
}

export function preloadAllSpriteSheets(): void {
  if (!canUseBrowserImages()) return;
  (Object.keys(SHEET_PATHS) as SpriteSheetKey[]).forEach((key) => {
    getSpriteSheetCanvas(key);
  });
}

// Kick off eager loading in browser environments on module initialization.
preloadAllSpriteSheets();

function colorDistance(r: number, g: number, b: number, target: RgbColor): number {
  const dr = r - target[0];
  const dg = g - target[1];
  const db = b - target[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function matchesAnyBg(r: number, g: number, b: number, targets: RgbColor[], tol: number): boolean {
  for (let i = 0; i < targets.length; i++) {
    if (colorDistance(r, g, b, targets[i]) <= tol) return true;
  }
  return false;
}

/**
 * Extracts a cached sprite cutout from a loaded sheet with automatic exterior background removal.
 * Returns null while loading, on load failure, or in headless/Node environments (triggering procedural fallback).
 */
export function getCutoutSprite(
  sheetKey: SpriteSheetKey,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  options: SpriteCutoutOptions = {}
): HTMLCanvasElement | null {
  const source = getSpriteSheetCanvas(sheetKey);
  if (!source) return null;

  const isx = Math.max(0, Math.round(sx));
  const isy = Math.max(0, Math.round(sy));
  const isw = Math.max(1, Math.min(source.width - isx, Math.round(sw)));
  const ish = Math.max(1, Math.min(source.height - isy, Math.round(sh)));
  if (isw <= 0 || ish <= 0) return null;

  const mode = options.mode ?? 'flood';
  const tol = options.tolerance ?? 38;
  const extraTag = options.extraBgColors
    ? options.extraBgColors.map((c) => c.join(',')).join(';')
    : '';
  const bgTag = options.bgColors
    ? options.bgColors.map((c) => c.join(',')).join(';')
    : '';
  const cacheKey = `${sheetKey}:${isx},${isy},${isw},${ish}:${mode}:${tol}:${bgTag}:${extraTag}`;

  if (cutoutCache.has(cacheKey)) {
    return cutoutCache.get(cacheKey) ?? null;
  }

  try {
    const out = document.createElement('canvas');
    out.width = isw;
    out.height = ish;
    const octx = out.getContext('2d', { willReadFrequently: true });
    if (!octx) {
      cutoutCache.set(cacheKey, null);
      return null;
    }

    octx.imageSmoothingEnabled = false;
    octx.drawImage(source, isx, isy, isw, ish, 0, 0, isw, ish);

    if (mode === 'opaque') {
      cutoutCache.set(cacheKey, out);
      return out;
    }

    const targets: RgbColor[] = [
      ...(options.bgColors ?? [SHEET_DEFAULT_BG[sheetKey]]),
      ...(options.extraBgColors ?? []),
    ];

    const imgData = octx.getImageData(0, 0, isw, ish);
    const data = imgData.data;
    const total = isw * ish;
    const removed = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0;
    let tail = 0;

    const trySeed = (x: number, y: number) => {
      const idx = y * isw + x;
      if (removed[idx]) return;
      const p = idx * 4;
      if (matchesAnyBg(data[p], data[p + 1], data[p + 2], targets, tol)) {
        removed[idx] = 1;
        queue[tail++] = idx;
      }
    };

    for (let x = 0; x < isw; x++) {
      trySeed(x, 0);
      if (ish > 1) trySeed(x, ish - 1);
    }
    for (let y = 1; y < ish - 1; y++) {
      trySeed(0, y);
      if (isw > 1) trySeed(isw - 1, y);
    }

    while (head < tail) {
      const idx = queue[head++];
      const cx = idx % isw;
      const cy = (idx / isw) | 0;

      if (cx > 0) trySeed(cx - 1, cy);
      if (cx + 1 < isw) trySeed(cx + 1, cy);
      if (cy > 0) trySeed(cx, cy - 1);
      if (cy + 1 < ish) trySeed(cx, cy + 1);
    }

    // 1px JPEG halo cleanup adjacent to removed exterior pixels (preserves dark outlines)
    const fringeTol = Math.round(tol * 1.45);
    const fringe = new Uint8Array(total);
    for (let y = 0; y < ish; y++) {
      for (let x = 0; x < isw; x++) {
        const idx = y * isw + x;
        if (removed[idx]) continue;
        const touchesRemoved =
          (x > 0 && removed[idx - 1]) ||
          (x + 1 < isw && removed[idx + 1]) ||
          (y > 0 && removed[idx - isw]) ||
          (y + 1 < ish && removed[idx + isw]);
        if (!touchesRemoved) continue;
        const p = idx * 4;
        const r = data[p];
        const g = data[p + 1];
        const b = data[p + 2];
        const luma = (r + g + b) / 3;
        if (luma > 68 && matchesAnyBg(r, g, b, targets, fringeTol)) {
          fringe[idx] = 1;
        }
      }
    }

    for (let i = 0; i < total; i++) {
      if (removed[i] || fringe[i]) {
        data[i * 4 + 3] = 0;
      }
    }

    octx.putImageData(imgData, 0, 0);
    cutoutCache.set(cacheKey, out);
    return out;
  } catch {
    cutoutCache.set(cacheKey, null);
    return null;
  }
}

export function drawSpriteFrame(
  ctx: CanvasRenderingContext2D,
  sprite: HTMLCanvasElement,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  flipX = false
): void {
  const rx = Math.round(dx);
  const ry = Math.round(dy);
  const rw = Math.max(1, Math.round(dw));
  const rh = Math.max(1, Math.round(dh));

  ctx.imageSmoothingEnabled = false;
  if (!flipX) {
    ctx.drawImage(sprite, rx, ry, rw, rh);
    return;
  }

  ctx.save();
  ctx.translate(Math.round(rx + rw / 2), Math.round(ry));
  ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, Math.round(-rw / 2), 0, rw, rh);
  ctx.restore();
}

export function resetSpriteLoaderCachesForTest(): void {
  sheetCache.clear();
  cutoutCache.clear();
}

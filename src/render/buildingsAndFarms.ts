import { SPECIAL_BUILDING_LABELS, clamp } from '../simulation/rules';
import type {
  Agent,
  EraId,
  FarmPlot,
  House,
  MaintenanceStatus,
  SelectedEntity,
  SimulationState,
  SpecialBuilding,
  SpecialBuildingType,
} from '../types/simulation';
import { drawSpriteFrame, getCutoutSprite, type SpriteRect } from './spriteLoader';

const HOUSE_SPRITES: Record<House['size'], Record<1 | 2 | 3 | 4, SpriteRect>> = {
  small: {
    1: { sx: 337, sy: 8, sw: 83, sh: 109 },
    2: { sx: 20, sy: 8, sw: 83, sh: 109 },
    3: { sx: 126, sy: 8, sw: 82, sh: 109 },
    4: { sx: 231, sy: 8, sw: 83, sh: 109 },
  },
  medium: {
    1: { sx: 865, sy: 7, sw: 111, sh: 124 },
    2: { sx: 472, sy: 7, sw: 111, sh: 124 },
    3: { sx: 600, sy: 7, sw: 111, sh: 124 },
    4: { sx: 732, sy: 7, sw: 111, sh: 124 },
  },
  large: {
    1: { sx: 701, sy: 136, sw: 183, sh: 194 },
    2: { sx: 20, sy: 136, sw: 183, sh: 194 },
    3: { sx: 247, sy: 137, sw: 184, sh: 193 },
    4: { sx: 474, sy: 136, sw: 183, sh: 194 },
  },
};

const PLAZA_SPRITE: SpriteRect = { sx: 18, sy: 345, sw: 198, sh: 196 };

const SPECIAL_SPRITES: Record<
  SpecialBuildingType,
  { rect: SpriteRect; dx: number; dy: number; dw: number; dh: number; isDock?: boolean }
> = {
  town_hall: { rect: { sx: 938, sy: 9, sw: 247, sh: 334 }, dx: -36, dy: -77, dw: 72, dh: 96 },
  bank: { rect: { sx: 287, sy: 339, sw: 149, sh: 188 }, dx: -31, dy: -60, dw: 62, dh: 78 },
  market: { rect: { sx: 609, sy: 356, sw: 195, sh: 150 }, dx: -35, dy: -35, dw: 70, dh: 54 },
  bakery: { rect: { sx: 35, sy: 547, sw: 180, sh: 139 }, dx: -31, dy: -30, dw: 62, dh: 48 },
  carpentry: { rect: { sx: 368, sy: 531, sw: 199, sh: 162 }, dx: -32, dy: -33, dw: 64, dh: 52 },
  forge: { rect: { sx: 696, sy: 485, sw: 212, sh: 195 }, dx: -34, dy: -43, dw: 68, dh: 62 },
  apothecary: { rect: { sx: 998, sy: 510, sw: 166, sh: 172 }, dx: -28, dy: -39, dw: 56, dh: 58 },
  dock: { rect: { sx: 34, sy: 710, sw: 226, sh: 158 }, dx: -33, dy: -29, dw: 66, dh: 46, isDock: true },
  general_depot: { rect: { sx: 328, sy: 716, sw: 283, sh: 153 }, dx: -35, dy: -24, dw: 70, dh: 42 },
  police_station: { rect: { sx: 692, sy: 710, sw: 164, sh: 163 }, dx: -29, dy: -39, dw: 58, dh: 58 },
  prison: { rect: { sx: 1018, sy: 710, sw: 153, sh: 159 }, dx: -28, dy: -39, dw: 56, dh: 58 },
  infirmary: { rect: HOUSE_SPRITES.large[2], dx: -31, dy: -46, dw: 62, dh: 66 },
  school: { rect: HOUSE_SPRITES.large[3], dx: -31, dy: -46, dw: 62, dh: 66 },
};

const CROP_SPRITES = {
  seeds: { sx: 24, sy: 726, sw: 66, sh: 74 },
  sprout: { sx: 182, sy: 632, sw: 68, sh: 78 },
  leafy: { sx: 352, sy: 632, sw: 68, sh: 78 },
  ripeTomato: { sx: 692, sy: 625, sw: 68, sh: 82 },
  ripeCarrot: { sx: 774, sy: 625, sw: 68, sh: 82 },
  ripePumpkin: { sx: 774, sy: 725, sw: 68, sh: 78 },
} as const;

export function drawSmokePuffs(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  phase: number,
  dark = false
): void {
  const bx = Math.round(x);
  const by = Math.round(y);
  for (let i = 0; i < 3; i++) {
    const p = (phase * 0.35 + i * 0.33) % 1;
    const py = Math.round(by - p * 18);
    const px = Math.round(bx + Math.sin(p * Math.PI * 2 + i) * 3);
    const sz = Math.round(3 + p * 4);
    const alpha = Math.max(0.08, (1 - p) * 0.52);
    ctx.fillStyle = dark ? `rgba(71, 85, 105, ${alpha})` : `rgba(226, 232, 240, ${alpha})`;
    ctx.fillRect(px - Math.floor(sz / 2), py - Math.floor(sz / 2), sz, sz);
  }
}

export function drawStructureWearOverlay(
  ctx: CanvasRenderingContext2D,
  leftX: number,
  topY: number,
  w: number,
  h: number,
  durability: number,
  status?: MaintenanceStatus
): void {
  if (durability >= 80 && (!status || status === 'ok')) return;
  const lx = Math.round(leftX);
  const ty = Math.round(topY);
  const rw = Math.round(w);
  const rh = Math.round(h);
  const severe = status === 'inoperative' || status === 'ruined' || durability < 35;
  ctx.fillStyle = severe ? 'rgba(15, 23, 42, 0.72)' : 'rgba(30, 41, 59, 0.55)';
  ctx.fillRect(lx + 5, ty + 6, 2, 7);
  ctx.fillRect(lx + 7, ty + 11, 2, 5);
  ctx.fillRect(lx + rw - 9, ty + 4, 2, 6);
  ctx.fillRect(lx + rw - 11, ty + 9, 2, 5);
  if (severe) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.fillRect(lx + Math.floor(rw * 0.32), ty - 4, 6, 4);
    ctx.fillRect(lx + 3, ty + rh - 5, Math.floor(rw * 0.35), 3);
  }
}

function drawShingleRoof(
  ctx: CanvasRenderingContext2D,
  leftX: number,
  topY: number,
  width: number,
  height: number,
  palette: { outline: string; eaves: string; base: string; tile: string; ridge: string },
  winterSnow: boolean
): void {
  const x = Math.round(leftX);
  const y = Math.round(topY);
  const w = Math.round(width);
  const h = Math.round(height);

  ctx.fillStyle = palette.outline;
  ctx.fillRect(x - 1, y + Math.floor(h * 0.45), w + 2, Math.ceil(h * 0.55) + 1);
  ctx.fillRect(x + 3, y - 1, w - 6, h + 1);

  ctx.fillStyle = palette.eaves;
  ctx.fillRect(x, y + h - 4, w, 4);
  ctx.fillStyle = palette.base;
  ctx.fillRect(x, y + Math.floor(h * 0.42), w, Math.ceil(h * 0.58) - 2);
  ctx.fillRect(x + 4, y, w - 8, Math.floor(h * 0.5));

  ctx.fillStyle = palette.tile;
  for (let row = 2; row < h - 3; row += 4) {
    const rowInset = row < Math.floor(h * 0.42) ? 5 : 2;
    const offset = ((row / 4) % 2) * 3;
    for (let tx = x + rowInset + offset; tx < x + w - rowInset - 3; tx += 6) {
      ctx.fillRect(tx, y + row, 4, 2);
    }
  }

  ctx.fillStyle = palette.ridge;
  ctx.fillRect(x + 5, y, w - 10, 2);

  if (winterSnow) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(x + 4, y - 1, w - 8, 3);
    ctx.fillRect(x + 1, y + Math.floor(h * 0.44), w - 2, 2);
  }
}

function drawFramedWindow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  lit: boolean
): void {
  const wx = Math.round(x);
  const wy = Math.round(y);
  ctx.fillStyle = '#1e1b18';
  ctx.fillRect(wx - 1, wy - 1, w + 2, h + 2);
  ctx.fillStyle = lit ? '#fde047' : '#38bdf8';
  ctx.fillRect(wx, wy, w, h);
  ctx.fillStyle = lit ? '#fef9c3' : '#bae6fd';
  ctx.fillRect(wx, wy, Math.max(1, Math.floor(w / 2)), Math.max(1, Math.floor(h / 2)));
  ctx.fillStyle = '#451a03';
  if (w >= 5) ctx.fillRect(wx + Math.floor(w / 2), wy, 1, h);
  if (h >= 5) ctx.fillRect(wx, wy + Math.floor(h / 2), w, 1);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(wx - 1, wy + h, w + 2, 2);
}

export function drawCentralPlaza(
  ctx: CanvasRenderingContext2D,
  plaza: NonNullable<SimulationState['plaza']>,
  minute: number,
  isNight: boolean,
  isSelected: boolean,
  era: EraId = 'primitive',
  festivalActive = false
): void {
  ctx.imageSmoothingEnabled = false;
  const cx = Math.round(plaza.x);
  const cy = Math.round(plaza.y);
  ctx.save();
  ctx.translate(cx, cy);

  const plazaSprite = getCutoutSprite(
    'buildings',
    PLAZA_SPRITE.sx,
    PLAZA_SPRITE.sy,
    PLAZA_SPRITE.sw,
    PLAZA_SPRITE.sh,
    { mode: 'flood', tolerance: 36 }
  );
  const ripple = Math.floor(minute * 0.4) % 2 === 0;

  if (plazaSprite) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.fillRect(-62, -45, 126, 94);
    drawSpriteFrame(ctx, plazaSprite, -62, -47, 124, 94);

    // Chorro de agua animado sobre la fuente central del sprite
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(ripple ? -4 : 2, -16, 2, 2);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(ripple ? -8 : -5, -8, 4, 2);
    ctx.fillRect(ripple ? 3 : -1, -2, 4, 2);
  } else {
    ctx.fillStyle = '#334155';
    ctx.fillRect(-63, -47, 126, 94);
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-61, -45, 122, 90);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-56, -40, 112, 80);

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-36, -26, 72, 52);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-30, -20, 60, 40);
    ctx.fillStyle = '#64748b';
    for (let gx = -52; gx <= 48; gx += 16) {
      ctx.fillRect(gx, -39, 1, 78);
    }
    for (let gy = -34; gy <= 32; gy += 14) {
      ctx.fillRect(-55, gy, 110, 1);
    }

    for (const bx of [-51, 43]) {
      ctx.fillStyle = '#1e1b18';
      ctx.fillRect(bx - 1, -11, 9, 22);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(bx, -10, 7, 20);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(bx + 1, -9, 3, 18);
    }

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-19, -16, 38, 32);
    ctx.fillStyle = '#475569';
    ctx.fillRect(-17, -14, 34, 28);
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(-14, -11, 28, 22);
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(-12, -9, 24, 18);

    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(ripple ? -9 : -5, -7, 7, 2);
    ctx.fillRect(ripple ? 2 : -2, 3, 8, 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(-5, -13, 10, 15);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-4, -12, 8, 12);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-2, -17, 4, 5);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(ripple ? -4 : 2, -15, 2, 2);
  }

  if (era === 'iron' || era === 'civilization') {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-2, -20, 4, 2);
    ctx.fillRect(-55, -39, 4, 2);
    ctx.fillRect(51, -39, 4, 2);
  }

  // Faroles de hierro en las 4 esquinas
  const corners = [
    [-53, -39],
    [48, -39],
    [-53, 33],
    [48, 33],
  ];
  for (const [lx, ly] of corners) {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(lx - 1, ly - 4, 6, 11);
    ctx.fillStyle = '#334155';
    ctx.fillRect(lx, ly, 4, 6);
    ctx.fillStyle = isNight ? '#fde047' : '#f59e0b';
    ctx.fillRect(lx, ly - 3, 4, 3);
  }

  if (festivalActive) {
    const pennantColors = ['#f43f5e', '#facc15', '#38bdf8', '#4ade80'];
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = pennantColors[i % pennantColors.length];
      ctx.fillRect(-45 + i * 9, -43 + (i % 2), 4, 4);
      ctx.fillRect(-45 + i * 9, 39 - (i % 2), 4, 4);
    }
  }

  drawStructureWearOverlay(ctx, -56, -40, 112, 80, plaza.durability, plaza.maintenanceStatus);

  if (isSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-65, -49, 130, 98);
  }

  ctx.fillStyle = 'rgba(15, 23, 42, 0.62)';
  ctx.fillRect(-21, -56, 42, 9);
  ctx.fillStyle = festivalActive ? '#fde047' : 'rgba(248, 250, 252, 0.9)';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(festivalActive ? 'FESTIVAL' : 'PLAZA', 0, -49);

  ctx.restore();
}

export function drawFarmPlot(ctx: CanvasRenderingContext2D, plot: FarmPlot, isSelected: boolean): void {
  ctx.imageSmoothingEnabled = false;
  const x = Math.round(plot.x);
  const y = Math.round(plot.y);
  const halfW = plot.size === 'large' ? 30 : plot.size === 'medium' ? 22 : 15;
  const halfH = plot.size === 'large' ? 20 : plot.size === 'medium' ? 14 : 10;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(-halfW - 2, -halfH, halfW * 2 + 5, halfH * 2 + 6);

  ctx.fillStyle = '#3f230e';
  ctx.fillRect(-halfW - 3, -halfH - 3, halfW * 2 + 6, halfH * 2 + 6);
  ctx.fillStyle = '#854d0e';
  ctx.fillRect(-halfW - 2, -halfH - 2, halfW * 2 + 4, halfH * 2 + 4);

  const mature = plot.growth >= 85;
  const mid = plot.growth >= 45;
  const early = plot.growth >= 20;
  const cropRect = mature
    ? plot.cropName === 'Maíz' || plot.cropName === 'Calabaza'
      ? CROP_SPRITES.ripePumpkin
      : plot.cropName === 'Zanahoria'
        ? CROP_SPRITES.ripeCarrot
        : CROP_SPRITES.ripeTomato
    : mid
      ? CROP_SPRITES.leafy
      : early
        ? CROP_SPRITES.sprout
        : CROP_SPRITES.seeds;

  const cropSprite = getCutoutSprite('terrain', cropRect.sx, cropRect.sy, cropRect.sw, cropRect.sh, {
    mode: 'opaque',
  });

  if (cropSprite) {
    drawSpriteFrame(ctx, cropSprite, -halfW, -halfH, halfW * 2, halfH * 2);
  } else {
    ctx.fillStyle = '#4a2c16';
    ctx.fillRect(-halfW, -halfH, halfW * 2, halfH * 2);
    for (let row = -halfH + 2; row <= halfH - 4; row += 6) {
      ctx.fillStyle = '#361e0e';
      ctx.fillRect(-halfW + 1, row + 3, halfW * 2 - 2, 2);
      ctx.fillStyle = '#633c1e';
      ctx.fillRect(-halfW + 1, row, halfW * 2 - 2, 2);
    }

    const leafDark = '#15803d';
    const leafBright = '#4ade80';
    const fruitColor =
      plot.cropName === 'Maíz'
        ? mature
          ? '#facc15'
          : '#84cc16'
        : mature
          ? '#eab308'
          : mid
            ? '#84cc16'
            : '#22c55e';
    const height = mature ? 7 : mid ? 5 : 3;

    for (let row = -halfH + 4; row <= halfH - 3; row += 6) {
      for (let col = -halfW + 4; col <= halfW - 5; col += 6) {
        ctx.fillStyle = leafDark;
        ctx.fillRect(col, row - height + 2, 4, height);
        ctx.fillStyle = fruitColor;
        ctx.fillRect(col + 1, row - height + 1, 2, Math.max(2, height - 1));
        ctx.fillStyle = mature ? '#fef08a' : leafBright;
        ctx.fillRect(col + 1, row - height + 1, 1, 1);
      }
    }
  }

  for (let px = -halfW - 3; px <= halfW; px += Math.max(12, Math.floor(halfW))) {
    ctx.fillStyle = '#451a03';
    ctx.fillRect(px, -halfH - 5, 3, 6);
    ctx.fillRect(px, halfH - 2, 3, 6);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(px, -halfH - 5, 2, 4);
    ctx.fillRect(px, halfH - 2, 2, 4);
  }
  ctx.fillStyle = '#b45309';
  ctx.fillRect(-halfW - 1, -halfH - 3, halfW * 2 + 2, 1);
  ctx.fillRect(-halfW - 1, halfH + 1, halfW * 2 + 2, 1);

  if (plot.size === 'large') {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(halfW - 11, -halfH + 1, 10, 8);
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(halfW - 10, -halfH + 2, 8, 6);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(halfW - 10, -halfH + 2, 8, 2);

    ctx.fillStyle = '#451a03';
    ctx.fillRect(-halfW + 3, -halfH - 7, 2, 9);
    ctx.fillRect(-halfW, -halfH - 5, 8, 2);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-halfW + 2, -halfH - 6, 4, 4);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-halfW + 1, -halfH - 9, 6, 3);
  } else if (plot.size === 'medium') {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(halfW - 9, halfH - 8, 8, 7);
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(halfW - 8, halfH - 7, 6, 5);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(halfW - 8, halfH - 7, 6, 2);
  }

  drawStructureWearOverlay(ctx, -halfW, -halfH, halfW * 2, halfH * 2, plot.durability, plot.maintenanceStatus);

  if (isSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-halfW - 5, -halfH - 5, halfW * 2 + 10, halfH * 2 + 10);
  }

  ctx.restore();
}

export function drawSpecialBuilding(
  ctx: CanvasRenderingContext2D,
  b: SpecialBuilding,
  isNight: boolean,
  isSelected: boolean,
  season: SimulationState['season'],
  shadow: { dx: number; dy: number; alpha: number },
  animPhase: number,
  era: EraId = 'primitive'
): void {
  ctx.imageSmoothingEnabled = false;
  const x = Math.round(b.x);
  const y = Math.round(b.y);
  const isWinter = season === 'Invierno';
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = `rgba(0,0,0,${shadow.alpha + 0.16})`;
  ctx.fillRect(-31 + Math.round(shadow.dx), 14 + Math.min(4, Math.round(shadow.dy)), 62, 7);

  const spec = SPECIAL_SPRITES[b.type];
  const buildingSprite = getCutoutSprite(
    'buildings',
    spec.rect.sx,
    spec.rect.sy,
    spec.rect.sw,
    spec.rect.sh,
    spec.isDock
      ? {
          mode: 'flood',
          tolerance: 46,
          extraBgColors: [
            [63, 115, 173],
            [52, 102, 165],
            [74, 130, 190],
          ],
        }
      : { mode: 'flood', tolerance: 36 }
  );

  if (buildingSprite) {
    drawSpriteFrame(ctx, buildingSprite, spec.dx, spec.dy, spec.dw, spec.dh);

    // Emblemas distintivos en Enfermería y Escuela para lectura inmediata del rol
    if (b.type === 'infirmary') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-7, -33, 14, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -32, 12, 10);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-2, -31, 4, 8);
      ctx.fillRect(-4, -29, 8, 4);
    } else if (b.type === 'school') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-7, -53, 14, 11);
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-6, -52, 12, 9);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-3, -50, 6, 5);
    }

    if (isWinter && b.type !== 'dock') {
      ctx.fillStyle = 'rgba(248, 250, 252, 0.72)';
      ctx.fillRect(Math.round(spec.dx + spec.dw * 0.22), Math.round(spec.dy + 2), Math.round(spec.dw * 0.56), 2);
    }

    if (b.isOperational && (b.type === 'bakery' || b.type === 'forge' || b.type === 'apothecary')) {
      const smokeX = b.type === 'bakery' ? -18 : b.type === 'forge' ? 14 : 11;
      const smokeY = b.type === 'bakery' ? -29 : b.type === 'forge' ? -41 : -34;
      drawSmokePuffs(ctx, smokeX, smokeY, animPhase + b.id * 0.17, b.type === 'forge');
    }

    if (b.type === 'forge' && b.isOperational && Math.floor(animPhase * 4) % 2 === 0) {
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(5, 2, 2, 2);
      ctx.fillRect(9, 0, 2, 2);
    }

    if (isNight && b.isOperational && b.type !== 'dock' && b.type !== 'market' && b.type !== 'prison') {
      ctx.fillStyle = 'rgba(253, 224, 71, 0.55)';
      ctx.fillRect(-14, -4, 4, 4);
      ctx.fillRect(10, -4, 4, 4);
    }
  } else {
    switch (b.type) {
      case 'dock': {
        ctx.fillStyle = '#3f230e';
        ctx.fillRect(-31, -25, 62, 36);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-30, -24, 60, 34);
        for (let py = -22; py <= 6; py += 6) {
          ctx.fillStyle = '#92400e';
          ctx.fillRect(-28, py, 56, 4);
          ctx.fillStyle = '#b45309';
          ctx.fillRect(-28, py, 56, 2);
        }
        ctx.fillStyle = '#451a03';
        ctx.fillRect(-28, -26, 4, 38);
        ctx.fillRect(24, -26, 4, 38);
        drawShingleRoof(
          ctx,
          -16,
          -37,
          28,
          11,
          { outline: '#1e1b18', eaves: '#78350f', base: '#b45309', tile: '#d97706', ridge: '#fde68a' },
          isWinter
        );
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(-6, -33, 8, 4);
        break;
      }
      case 'bank': {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-30, -14, 60, 32);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-29, -13, 58, 30);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-31, 13, 62, 4);
        drawShingleRoof(
          ctx,
          -32,
          -28,
          64,
          15,
          { outline: '#0f172a', eaves: '#1e293b', base: '#334155', tile: '#475569', ridge: '#facc15' },
          isWinter
        );
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(-6, -26, 12, 10);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-4, -24, 8, 6);
        ctx.fillStyle = '#f8fafc';
        for (const cx of [-24, -12, 7, 19]) {
          ctx.fillRect(cx, -11, 5, 24);
          ctx.fillStyle = '#cbd5e1';
          ctx.fillRect(cx + 3, -11, 2, 24);
          ctx.fillStyle = '#f8fafc';
        }
        ctx.fillStyle = '#334155';
        ctx.fillRect(-5, 1, 10, 14);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(2, 7, 2, 2);
        break;
      }
      case 'infirmary': {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-33, -15, 66, 34);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-32, -14, 64, 32);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-32, -14, 64, 3);
        drawShingleRoof(
          ctx,
          -35,
          -30,
          70,
          16,
          { outline: '#450a0a', eaves: '#7f1d1d', base: '#b91c1c', tile: '#dc2626', ridge: '#fca5a5' },
          isWinter
        );
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-8, -28, 16, 12);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-2, -27, 4, 10);
        ctx.fillRect(-5, -24, 10, 4);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(-5, 6, 10, 12);
        drawFramedWindow(ctx, -26, -6, 7, 7, isNight && b.isOperational);
        drawFramedWindow(ctx, 19, -6, 7, 7, isNight && b.isOperational);
        break;
      }
      case 'school': {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-31, -14, 62, 33);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-30, -13, 60, 31);
        ctx.fillStyle = '#cbd5e1';
        for (let sy = -9; sy <= 12; sy += 6) {
          ctx.fillRect(-30, sy, 60, 1);
        }
        drawShingleRoof(
          ctx,
          -33,
          -28,
          66,
          15,
          { outline: '#172554', eaves: '#1e3a8a', base: '#1d4ed8', tile: '#2563eb', ridge: '#93c5fd' },
          isWinter
        );
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(-7, -38, 14, 10);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-3, -35, 6, 6);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-5, 6, 10, 12);
        drawFramedWindow(ctx, -24, -5, 7, 7, isNight && b.isOperational);
        drawFramedWindow(ctx, 17, -5, 7, 7, isNight && b.isOperational);
        break;
      }
      case 'market': {
        ctx.fillStyle = '#3f230e';
        ctx.fillRect(-31, -7, 62, 24);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-30, -6, 60, 22);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(-30, -2, 60, 3);
        for (let i = -32; i < 32; i += 8) {
          ctx.fillStyle = (Math.abs(i) / 8) % 2 === 0 ? '#dc2626' : '#fef3c7';
          ctx.fillRect(i, -19, 8, 12);
          ctx.fillStyle = 'rgba(0,0,0,0.22)';
          ctx.fillRect(i, -9, 8, 2);
        }
        ctx.fillStyle = '#047857';
        ctx.fillRect(-29, -26, 58, 7);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(-27, -25, 54, 3);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-24, 3, 10, 8);
        ctx.fillRect(-6, 3, 10, 8);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(14, 3, 10, 8);
        break;
      }
      case 'bakery': {
        ctx.fillStyle = '#3f230e';
        ctx.fillRect(-22, -11, 44, 26);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(-21, -10, 42, 24);
        ctx.fillStyle = '#b45309';
        for (let wy = -6; wy <= 8; wy += 5) ctx.fillRect(-21, wy, 42, 1);
        drawShingleRoof(
          ctx,
          -24,
          -22,
          48,
          12,
          { outline: '#451a03', eaves: '#7c2d12', base: '#9a3412', tile: '#c2410c', ridge: '#fdba74' },
          isWinter
        );
        ctx.fillStyle = '#57534e';
        ctx.fillRect(10, -30, 7, 12);
        ctx.fillStyle = '#78716c';
        ctx.fillRect(11, -30, 3, 12);
        drawFramedWindow(ctx, -16, -3, 10, 7, b.isOperational);
        ctx.fillStyle = '#451a03';
        ctx.fillRect(1, 4, 8, 10);
        if (b.isOperational) drawSmokePuffs(ctx, 13, -32, animPhase);
        break;
      }
      case 'carpentry': {
        ctx.fillStyle = '#3f230e';
        ctx.fillRect(-25, -12, 50, 28);
        ctx.fillStyle = '#9a6b3f';
        ctx.fillRect(-24, -11, 48, 26);
        ctx.fillStyle = '#784e2a';
        for (let wy = -7; wy <= 10; wy += 5) ctx.fillRect(-24, wy, 48, 1);
        drawShingleRoof(
          ctx,
          -27,
          -23,
          54,
          12,
          { outline: '#291507', eaves: '#451a03', base: '#78350f', tile: '#92400e', ridge: '#d97706' },
          isWinter
        );
        ctx.fillStyle = '#451a03';
        ctx.fillRect(-4, 5, 8, 10);
        drawFramedWindow(ctx, 10, -3, 8, 6, isNight && b.isOperational);
        break;
      }
      case 'forge': {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-26, -12, 52, 28);
        ctx.fillStyle = '#475569';
        ctx.fillRect(-25, -11, 50, 26);
        ctx.fillStyle = '#334155';
        for (let sy = -7; sy <= 10; sy += 6) ctx.fillRect(-25, sy, 50, 1);
        drawShingleRoof(
          ctx,
          -28,
          -23,
          56,
          12,
          { outline: '#431407', eaves: '#7c2d12', base: '#c2410c', tile: '#ea580c', ridge: '#fdba74' },
          isWinter
        );
        ctx.fillStyle = '#334155';
        ctx.fillRect(11, -30, 7, 12);
        ctx.fillStyle = b.isOperational ? '#f97316' : '#334155';
        ctx.fillRect(-7, 3, 12, 12);
        ctx.fillStyle = b.isOperational ? '#fde047' : '#64748b';
        ctx.fillRect(-3, 7, 5, 6);
        if (b.isOperational) {
          drawSmokePuffs(ctx, 14, -32, animPhase, true);
          if (Math.floor(animPhase * 4) % 2 === 0) {
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(-5, 0, 2, 2);
            ctx.fillRect(2, -1, 2, 2);
          }
        }
        break;
      }
      case 'apothecary': {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-21, -11, 42, 26);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(-20, -10, 40, 24);
        drawShingleRoof(
          ctx,
          -23,
          -22,
          46,
          12,
          { outline: '#042f2e', eaves: '#115e59', base: '#0f766e', tile: '#14b8a6', ridge: '#5eead4' },
          isWinter
        );
        ctx.fillStyle = '#475569';
        ctx.fillRect(9, -27, 5, 10);
        ctx.fillStyle = '#2dd4bf';
        ctx.fillRect(-4, -20, 8, 7);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-4, 4, 8, 10);
        if (b.isOperational) drawSmokePuffs(ctx, 11, -29, animPhase + 0.5);
        break;
      }
      case 'general_depot': {
        ctx.fillStyle = '#3f230e';
        ctx.fillRect(-30, -13, 60, 30);
        ctx.fillStyle = '#854d0e';
        ctx.fillRect(-29, -12, 58, 28);
        ctx.fillStyle = '#713f12';
        for (let wy = -8; wy <= 10; wy += 5) ctx.fillRect(-29, wy, 58, 1);
        drawShingleRoof(
          ctx,
          -32,
          -24,
          64,
          13,
          { outline: '#291507', eaves: '#451a03', base: '#78350f', tile: '#a16207', ridge: '#facc15' },
          isWinter
        );
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(-24, 2, 12, 12);
        ctx.fillRect(12, 2, 12, 12);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-7, 0, 14, 16);
        break;
      }
      case 'town_hall': {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-33, -15, 66, 34);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-32, -14, 64, 32);
        ctx.fillStyle = '#94a3b8';
        for (let sy = -9; sy <= 12; sy += 6) ctx.fillRect(-32, sy, 64, 1);
        drawShingleRoof(
          ctx,
          -35,
          -27,
          70,
          13,
          { outline: '#3b0764', eaves: '#581c87', base: '#7e22ce', tile: '#9333ea', ridge: '#facc15' },
          isWinter
        );
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-9, -39, 18, 19);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-4, -34, 8, 8);
        ctx.fillStyle = '#4c1d95';
        ctx.fillRect(-6, 4, 12, 14);
        break;
      }
      case 'police_station': {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-25, -13, 50, 29);
        ctx.fillStyle = '#334155';
        ctx.fillRect(-24, -12, 48, 27);
        drawShingleRoof(
          ctx,
          -27,
          -24,
          54,
          12,
          { outline: '#172554', eaves: '#1e3a8a', base: '#1d4ed8', tile: '#2563eb', ridge: '#93c5fd' },
          isWinter
        );
        ctx.fillStyle = '#60a5fa';
        ctx.fillRect(-4, -26, 8, 6);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-5, 3, 10, 12);
        break;
      }
      case 'prison': {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-26, -13, 52, 29);
        ctx.fillStyle = '#475569';
        ctx.fillRect(-25, -12, 50, 27);
        drawShingleRoof(
          ctx,
          -27,
          -22,
          54,
          10,
          { outline: '#020617', eaves: '#0f172a', base: '#1e293b', tile: '#334155', ridge: '#64748b' },
          isWinter
        );
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-16, -5, 12, 10);
        ctx.fillRect(4, -5, 12, 10);
        ctx.fillStyle = '#cbd5e1';
        for (let bx = -14; bx <= -6; bx += 3) ctx.fillRect(bx, -5, 1, 10);
        for (let bx = 6; bx <= 14; bx += 3) ctx.fillRect(bx, -5, 1, 10);
        break;
      }
    }
  }

  drawStructureWearOverlay(ctx, -26, -15, 52, 30, b.durability, b.maintenanceStatus);

  if (b.isOperational && (b.level >= 2 || era === 'iron' || era === 'civilization')) {
    ctx.fillStyle = '#334155';
    ctx.fillRect(-31, -24, 2, 16);
    ctx.fillStyle = era === 'civilization' ? '#facc15' : '#38bdf8';
    ctx.fillRect(-29, -24, 5, 4);
  }

  if (!b.isOperational) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
    ctx.fillRect(-30, -22, 60, 38);
  }

  if (isSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-36, -40, 72, 62);
  }

  // Umbral / acceso frente a la puerta del edificio para enlazar visualmente con caminos
  ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
  ctx.fillRect(-8, 18, 16, 4);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-7, 17, 14, 4);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-6, 17, 12, 2);

  const labelY =
    b.type === 'town_hall'
      ? -78
      : b.type === 'bank'
        ? -62
        : b.type === 'forge'
          ? -48
          : b.type === 'general_depot' || b.type === 'dock' || b.type === 'bakery' || b.type === 'carpentry'
            ? -37
            : -44;
  const short = SPECIAL_BUILDING_LABELS[b.type].short;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.64)';
  ctx.fillRect(-24, labelY, 48, 9);
  ctx.fillStyle = b.isOperational ? '#4ade80' : '#fb7185';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${!b.isOperational ? '⏸ ' : ''}${short} N${b.level}`, 0, labelY + 7);

  if (b.durability < 65) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-20, 21, 40, 4);
    ctx.fillStyle = b.durability < 35 ? '#ef4444' : '#f59e0b';
    ctx.fillRect(-20, 21, Math.round((40 * b.durability) / 100), 4);
  }

  if (!b.isOperational) {
    ctx.fillStyle = 'rgba(127, 29, 29, 0.78)';
    ctx.fillRect(-22, 25, 44, 8);
    ctx.fillStyle = '#fecdd3';
    ctx.font = 'bold 6px monospace';
    ctx.fillText('OBSOLETO', 0, 31);
  }

  ctx.restore();
}

export function drawPixelHouse(
  ctx: CanvasRenderingContext2D,
  house: House,
  isNight: boolean,
  isSelected: boolean,
  hasResidents: boolean,
  season: SimulationState['season'],
  shadow: { dx: number; dy: number; alpha: number },
  animPhase: number,
  era: EraId = 'primitive'
): void {
  ctx.imageSmoothingEnabled = false;
  const x = Math.round(house.x);
  const y = Math.round(house.y);
  const isWinter = season === 'Invierno';

  ctx.save();
  ctx.translate(x, y);

  const w = house.size === 'large' ? 54 : house.size === 'medium' ? 40 : 28;
  const h = house.size === 'large' ? 26 : house.size === 'medium' ? 20 : 16;
  const halfW = Math.round(w / 2);
  const halfH = Math.round(h / 2);

  // Sombra direccional proyectada sobre el pasto
  ctx.fillStyle = `rgba(0,0,0,${shadow.alpha + 0.14})`;
  ctx.fillRect(-halfW - 2 + Math.round(shadow.dx), halfH + 2 + Math.min(4, Math.round(shadow.dy)), w + 4, 6);

  const rect = HOUSE_SPRITES[house.size][house.level];
  const houseSprite = getCutoutSprite('buildings', rect.sx, rect.sy, rect.sw, rect.sh, {
    mode: 'flood',
    tolerance: 36,
  });

  if (houseSprite) {
    const drawW = house.size === 'large' ? 62 : house.size === 'medium' ? 48 : 36;
    const drawH = house.size === 'large' ? 66 : house.size === 'medium' ? 54 : 47;
    const dx = Math.round(-drawW / 2);
    const dy = house.size === 'large' ? -46 : house.size === 'medium' ? -37 : -32;
    drawSpriteFrame(ctx, houseSprite, dx, dy, drawW, drawH);

    if (isWinter) {
      ctx.fillStyle = 'rgba(248, 250, 252, 0.72)';
      ctx.fillRect(Math.round(dx + drawW * 0.25), dy + 2, Math.round(drawW * 0.5), 2);
    }

    if (isNight && hasResidents) {
      ctx.fillStyle = '#fde047';
      if (house.size === 'large') {
        ctx.fillRect(-16, -8, 4, 4);
        ctx.fillRect(12, -8, 4, 4);
        ctx.fillRect(-16, 4, 4, 4);
        ctx.fillRect(12, 4, 4, 4);
      } else if (house.size === 'medium') {
        ctx.fillRect(-12, 2, 4, 4);
        ctx.fillRect(8, 2, 4, 4);
      } else {
        ctx.fillRect(-8, 3, 3, 3);
      }
    }

    if (hasResidents && (house.level >= 2 || house.size !== 'small')) {
      const smokeX = house.size === 'large' ? 14 : house.size === 'medium' ? 10 : 8;
      const smokeY = dy + 2;
      drawSmokePuffs(ctx, smokeX, smokeY, animPhase + house.id * 0.27);
    }
  } else {
    if (era !== 'primitive' || house.level >= 2) {
      ctx.fillStyle = '#475569';
      ctx.fillRect(-halfW - 1, halfH + 3, w + 2, 3);
    }

    ctx.fillStyle = '#1e1b18';
    ctx.fillRect(-halfW - 1, -halfH + 3, w + 2, h + 2);

    const isStoneHouse = house.level >= 3;
    const wallBase =
      house.level === 1
        ? '#9a683a'
        : house.level === 2
          ? '#b47844'
          : house.level === 3
            ? '#94a3b8'
            : '#cbd5e1';
    const wallSeam =
      house.level === 1
        ? '#6e4724'
        : house.level === 2
          ? '#855329'
          : '#64748b';

    ctx.fillStyle = wallBase;
    ctx.fillRect(-halfW, -halfH + 4, w, h);

    if (isStoneHouse) {
      ctx.fillStyle = wallSeam;
      for (let sy = -halfH + 8; sy < halfH + 2; sy += 5) {
        ctx.fillRect(-halfW, sy, w, 1);
        const offset = ((sy / 5) % 2) * 4;
        for (let sx = -halfW + 4 + offset; sx < halfW - 3; sx += 8) {
          ctx.fillRect(sx, sy - 4, 1, 4);
        }
      }
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-halfW, -halfH + 4, 2, h);
      ctx.fillRect(halfW - 2, -halfH + 4, 2, h);
    } else {
      ctx.fillStyle = wallSeam;
      for (let wy = -halfH + 8; wy < halfH + 2; wy += 4) {
        ctx.fillRect(-halfW, wy, w, 1);
      }
      ctx.fillStyle = '#5c3718';
      ctx.fillRect(-halfW, -halfH + 4, 2, h);
      ctx.fillRect(halfW - 2, -halfH + 4, 2, h);
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(-halfW, -halfH + 4, w, 2);

    const roofPalettes: Record<
      1 | 2 | 3 | 4,
      { outline: string; eaves: string; base: string; tile: string; ridge: string }
    > = {
      1: { outline: '#431407', eaves: '#9a3412', base: '#c2592c', tile: '#ea580c', ridge: '#fdba74' },
      2: { outline: '#450a0a', eaves: '#7f1d1d', base: '#b91c1c', tile: '#dc2626', ridge: '#fca5a5' },
      3: { outline: '#172554', eaves: '#1e3a8a', base: '#1d4ed8', tile: '#3b82f6', ridge: '#93c5fd' },
      4: { outline: '#042f2e', eaves: '#115e59', base: '#0f766e', tile: '#14b8a6', ridge: '#facc15' },
    };
    const roofH = house.size === 'large' ? 16 : 12;
    drawShingleRoof(
      ctx,
      -halfW - 4,
      -halfH - roofH + 5,
      w + 8,
      roofH,
      roofPalettes[house.level],
      isWinter
    );

    if (house.level >= 2 || house.size !== 'small') {
      ctx.fillStyle = '#334155';
      ctx.fillRect(halfW - 8, -halfH - 14, 5, 8);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(halfW - 7, -halfH - 14, 2, 7);
      if (house.size === 'large') {
        ctx.fillStyle = '#334155';
        ctx.fillRect(-halfW + 4, -halfH - 14, 5, 8);
      }
      if (hasResidents) {
        drawSmokePuffs(ctx, halfW - 6, -halfH - 16, animPhase + house.id * 0.27);
      }
    }

    const doorW = house.size === 'large' ? 10 : 6;
    const halfDoor = Math.round(doorW / 2);
    ctx.fillStyle = '#1e1b18';
    ctx.fillRect(-halfDoor - 1, halfH - 7, doorW + 2, 11);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-halfDoor, halfH - 6, doorW, 10);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-halfDoor + 1, halfH - 5, Math.max(2, doorW - 3), 8);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(halfDoor - 2, halfH - 1, 1, 2);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-halfDoor - 1, halfH + 4, doorW + 2, 2);

    const lit = isNight && hasResidents;
    if (house.size === 'large') {
      drawFramedWindow(ctx, -halfW + 5, -5, 5, 5, lit);
      drawFramedWindow(ctx, -halfW + 13, -5, 5, 5, lit);
      drawFramedWindow(ctx, halfW - 18, -5, 5, 5, lit);
      drawFramedWindow(ctx, halfW - 10, -5, 5, 5, lit);
    } else if (house.size === 'medium') {
      drawFramedWindow(ctx, -halfW + 5, -3, 5, 5, lit);
      drawFramedWindow(ctx, halfW - 10, -3, 5, 5, lit);
    } else {
      drawFramedWindow(ctx, -halfW + 4, -2, 4, 4, lit);
    }

    if (era === 'wood' || era === 'iron' || era === 'civilization') {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-halfW + 4, 3, 6, 2);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(-halfW + 5, 2, 4, 1);
    }
    if (era === 'iron' || era === 'civilization') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(halfDoor + 2, halfH - 5, 3, 4);
      ctx.fillStyle = isNight && hasResidents ? '#fde047' : '#94a3b8';
      ctx.fillRect(halfDoor + 3, halfH - 4, 1, 2);
    }
  }

  drawStructureWearOverlay(ctx, -halfW, -halfH + 4, w, h, house.durability, house.maintenanceStatus);

  // Escalón / umbral de piedra frente a la entrada de la vivienda
  ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
  ctx.fillRect(-6, halfH + 4, 12, 4);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-5, halfH + 3, 10, 3);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-4, halfH + 3, 8, 2);

  if (house.durability < 65) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-16, halfH + 7, 32, 3);
    ctx.fillStyle = house.durability < 35 ? '#ef4444' : '#f59e0b';
    ctx.fillRect(-16, halfH + 7, Math.round((32 * house.durability) / 100), 3);
  }

  if (isSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-halfW - 6, -halfH - 16, w + 12, h + 28);
  }

  const sizeTag = house.size === 'large' ? 'G' : house.size === 'medium' ? 'M' : 'C';
  const tagY = house.size === 'large' ? -52 : house.size === 'medium' ? -42 : -37;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
  ctx.fillRect(-11, tagY, 22, 8);
  ctx.fillStyle =
    house.maintenanceStatus && house.maintenanceStatus !== 'ok' ? '#fbbf24' : 'rgba(248, 250, 252, 0.88)';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`N${house.level}·${sizeTag}`, 0, tagY + 6);

  if (house.maintenanceStatus && house.maintenanceStatus !== 'ok') {
    ctx.fillStyle = house.maintenanceStatus === 'ruined' ? 'rgba(127, 29, 29, 0.78)' : 'rgba(146, 64, 14, 0.78)';
    ctx.fillRect(-14, halfH + 10, 28, 7);
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 6px monospace';
    ctx.fillText(house.maintenanceStatus === 'ruined' ? 'RUINA' : 'DEUDA', 0, halfH + 15);
  }

  ctx.restore();
}

export function drawActiveConstructionScaffolding(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  animPhase: number,
  glintTick: number
): void {
  if (!agent.activeConstruction) return;
  const ac = agent.activeConstruction;
  const ax = Math.round(ac.x);
  const ay = Math.round(ac.y);
  const pct = clamp(ac.elapsed / Math.max(1, ac.totalDuration), 0, 1);

  ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
  ctx.fillRect(ax - 20, ay - 14, 40, 28);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ax - 20, ay - 14, 40, 28);

  ctx.fillStyle = '#92400e';
  ctx.fillRect(ax - 19, ay - 16, 3, 28);
  ctx.fillRect(ax + 16, ay - 16, 3, 28);
  if (pct >= 0.25) ctx.fillRect(ax - 19, ay - 2, 38, 2);
  if (pct >= 0.6) ctx.fillRect(ax - 19, ay - 12, 38, 2);

  ctx.fillStyle = '#78350f';
  ctx.fillRect(ax - 24, ay + 8, 7, 4);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(ax + 17, ay + 9, 6, 4);

  if (Math.hypot(agent.x - ax, agent.y - ay) <= 46 && Math.floor(animPhase * 4) % 2 === 0) {
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(ax - 4 + ((glintTick * 5) % 9), ay - 4, 2, 2);
    ctx.fillRect(ax + 4 - ((glintTick * 3) % 8), ay + 2, 2, 2);
  }

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(ax - 18, ay - 23, 36, 6);
  ctx.fillStyle = '#10b981';
  ctx.fillRect(ax - 17, ay - 22, Math.round(34 * pct), 4);
}

export function drawBuildingsAndFarms(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  isNight: boolean,
  occupiedHouseIds: Set<number>,
  shadow: { dx: number; dy: number; alpha: number },
  animPhase: number,
  selectedEntity: SelectedEntity | null
): void {
  for (const plot of state.farms) {
    const isSel = selectedEntity?.kind === 'farm' && selectedEntity.id === plot.id;
    drawFarmPlot(ctx, plot, isSel);
  }

  if (state.plaza) {
    drawCentralPlaza(
      ctx,
      state.plaza,
      state.minute,
      isNight,
      selectedEntity?.kind === 'plaza',
      state.era,
      Boolean(state.culture?.activeFestival)
    );
  }

  const sortedHouses = [...state.houses].sort((a, b) => a.y - b.y);
  for (const house of sortedHouses) {
    const isSel = selectedEntity?.kind === 'house' && selectedEntity.id === house.id;
    drawPixelHouse(
      ctx,
      house,
      isNight,
      isSel,
      occupiedHouseIds.has(house.id),
      state.season,
      shadow,
      animPhase,
      state.era
    );
  }

  const sortedSpecials = [...state.specialBuildings].sort((a, b) => a.y - b.y);
  for (const b of sortedSpecials) {
    const isSel = selectedEntity?.kind === 'special' && selectedEntity.id === b.id;
    drawSpecialBuilding(ctx, b, isNight, isSel, state.season, shadow, animPhase, state.era);
  }
}

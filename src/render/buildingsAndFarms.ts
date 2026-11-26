import { SPECIAL_BUILDING_LABELS, clamp } from '../simulation/rules';
import type {
  Agent,
  FarmPlot,
  House,
  MaintenanceStatus,
  SelectedEntity,
  SimulationState,
  SpecialBuilding,
} from '../types/simulation';

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

  // Contorno oscuro sutil del techo escalonado
  ctx.fillStyle = palette.outline;
  ctx.fillRect(x - 1, y + Math.floor(h * 0.45), w + 2, Math.ceil(h * 0.55) + 1);
  ctx.fillRect(x + 3, y - 1, w - 6, h + 1);

  // Alero inferior sombreado y cuerpo principal de tejas
  ctx.fillStyle = palette.eaves;
  ctx.fillRect(x, y + h - 4, w, 4);
  ctx.fillStyle = palette.base;
  ctx.fillRect(x, y + Math.floor(h * 0.42), w, Math.ceil(h * 0.58) - 2);
  ctx.fillRect(x + 4, y, w - 8, Math.floor(h * 0.5));

  // Filas escalonadas de tejas pixel art
  ctx.fillStyle = palette.tile;
  for (let row = 2; row < h - 3; row += 4) {
    const rowInset = row < Math.floor(h * 0.42) ? 5 : 2;
    const offset = ((row / 4) % 2) * 3;
    for (let tx = x + rowInset + offset; tx < x + w - rowInset - 3; tx += 6) {
      ctx.fillRect(tx, y + row, 4, 2);
    }
  }

  // Cumbrera superior iluminada
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
  // Cruz de carpintería y alféizar cálido
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
  isSelected: boolean
): void {
  const cx = Math.round(plaza.x);
  const cy = Math.round(plaza.y);
  ctx.save();
  ctx.translate(cx, cy);

  // Sombra exterior y empedrado escalonado 16-bit
  ctx.fillStyle = '#334155';
  ctx.fillRect(-63, -47, 126, 94);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(-61, -45, 122, 90);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-56, -40, 112, 80);

  // Anillos de losas claras y juntas sutiles
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

  // Bancos de madera con respaldo y sombra
  for (const bx of [-51, 43]) {
    ctx.fillStyle = '#1e1b18';
    ctx.fillRect(bx - 1, -11, 9, 22);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(bx, -10, 7, 20);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(bx + 1, -9, 3, 18);
  }

  // Fuente central escalonada con agua cristalina
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-19, -16, 38, 32);
  ctx.fillStyle = '#475569';
  ctx.fillRect(-17, -14, 34, 28);
  ctx.fillStyle = '#0369a1';
  ctx.fillRect(-14, -11, 28, 22);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(-12, -9, 24, 18);

  const ripple = Math.floor(minute * 0.4) % 2 === 0;
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

  drawStructureWearOverlay(ctx, -56, -40, 112, 80, plaza.durability, plaza.maintenanceStatus);

  if (isSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-65, -49, 130, 98);
  }

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(-26, -60, 52, 11);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PLAZA', 0, -52);

  ctx.restore();
}

export function drawFarmPlot(ctx: CanvasRenderingContext2D, plot: FarmPlot, isSelected: boolean): void {
  const x = Math.round(plot.x);
  const y = Math.round(plot.y);
  const halfW = plot.size === 'large' ? 30 : plot.size === 'medium' ? 22 : 15;
  const halfH = plot.size === 'large' ? 20 : plot.size === 'medium' ? 14 : 10;

  ctx.save();
  ctx.translate(x, y);

  // Sombra proyectada de la parcela y cerca 16-bit
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(-halfW - 2, -halfH, halfW * 2 + 5, halfH * 2 + 6);

  // Contorno de valla de madera con volumen
  ctx.fillStyle = '#3f230e';
  ctx.fillRect(-halfW - 3, -halfH - 3, halfW * 2 + 6, halfH * 2 + 6);
  ctx.fillStyle = '#854d0e';
  ctx.fillRect(-halfW - 2, -halfH - 2, halfW * 2 + 4, halfH * 2 + 4);

  // Tierra arada rica con surcos oscuros y lomos iluminados
  ctx.fillStyle = '#4a2c16';
  ctx.fillRect(-halfW, -halfH, halfW * 2, halfH * 2);
  for (let row = -halfH + 2; row <= halfH - 4; row += 6) {
    ctx.fillStyle = '#361e0e';
    ctx.fillRect(-halfW + 1, row + 3, halfW * 2 - 2, 2);
    ctx.fillStyle = '#633c1e';
    ctx.fillRect(-halfW + 1, row, halfW * 2 - 2, 2);
  }

  // Postes y travesaños de cerca con remates claros
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

  // Cultivos volumétricos por etapa de crecimiento
  const mature = plot.growth >= 85;
  const mid = plot.growth >= 45;
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

  if (plot.size === 'large') {
    // Paca de heno volumétrica y espantapájaros 16-bit
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
  animPhase: number
): void {
  const x = Math.round(b.x);
  const y = Math.round(b.y);
  const isWinter = season === 'Invierno';
  ctx.save();
  ctx.translate(x, y);

  // Sombra direccional proyectada sobre el terreno
  ctx.fillStyle = `rgba(0,0,0,${shadow.alpha + 0.16})`;
  ctx.fillRect(-31 + Math.round(shadow.dx), 14 + Math.min(4, Math.round(shadow.dy)), 62, 7);

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

  drawStructureWearOverlay(ctx, -26, -15, 52, 30, b.durability, b.maintenanceStatus);

  if (!b.isOperational) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
    ctx.fillRect(-30, -22, 60, 38);
  }

  if (isSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-36, -40, 72, 62);
  }

  const short = SPECIAL_BUILDING_LABELS[b.type].short;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(-28, -48, 56, 11);
  ctx.fillStyle = b.isOperational ? '#4ade80' : '#fb7185';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${!b.isOperational ? '⏸ ' : ''}${short} N${b.level}`, 0, -39);

  if (b.durability < 65) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-20, 18, 40, 4);
    ctx.fillStyle = b.durability < 35 ? '#ef4444' : '#f59e0b';
    ctx.fillRect(-20, 18, Math.round((40 * b.durability) / 100), 4);
  }

  if (!b.isOperational) {
    ctx.fillStyle = 'rgba(127, 29, 29, 0.92)';
    ctx.fillRect(-26, 23, 52, 10);
    ctx.fillStyle = '#fecdd3';
    ctx.font = 'bold 7px monospace';
    ctx.fillText('OBSOLETO', 0, 30);
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
  animPhase: number
): void {
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

  // Contorno oscuro sutil para separar la vivienda del fondo
  ctx.fillStyle = '#1e1b18';
  ctx.fillRect(-halfW - 1, -halfH + 3, w + 2, h + 2);

  // Paredes con textura de madera cálida (N1-N2) o piedra entramada (N3-N4)
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
    // Mampostería escalonada + vigas entramadas Tudor en esquinas
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
    // Tablones horizontales de madera + postes esquineros
    ctx.fillStyle = wallSeam;
    for (let wy = -halfH + 8; wy < halfH + 2; wy += 4) {
      ctx.fillRect(-halfW, wy, w, 1);
    }
    ctx.fillStyle = '#5c3718';
    ctx.fillRect(-halfW, -halfH + 4, 2, h);
    ctx.fillRect(halfW - 2, -halfH + 4, 2, h);
  }

  // Sombra proyectada del alero del techo sobre la pared superior
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(-halfW, -halfH + 4, w, 2);

  // Techo de tejas 16-bit (terracota, rojo ladrillo, azul pizarra o turquesa señorial)
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

  // Chimenea de piedra con humo si hay habitantes
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

  // Puerta de madera con marco, picaporte dorado y escalón de piedra
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

  // Ventanas enmarcadas con luz interior cálida de noche
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

  drawStructureWearOverlay(ctx, -halfW, -halfH + 4, w, h, house.durability, house.maintenanceStatus);

  if (house.durability < 65) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-16, halfH + 6, 32, 3);
    ctx.fillStyle = house.durability < 35 ? '#ef4444' : '#f59e0b';
    ctx.fillRect(-16, halfH + 6, Math.round((32 * house.durability) / 100), 3);
  }

  if (isSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-halfW - 6, -halfH - 16, w + 12, h + 28);
  }

  const sizeTag = house.size === 'large' ? 'G' : house.size === 'medium' ? 'M' : 'C';
  ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
  ctx.fillRect(-13, -halfH - 25, 26, 9);
  ctx.fillStyle =
    house.maintenanceStatus && house.maintenanceStatus !== 'ok' ? '#fbbf24' : '#f8fafc';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`N${house.level}·${sizeTag}`, 0, -halfH - 18);

  if (house.maintenanceStatus && house.maintenanceStatus !== 'ok') {
    ctx.fillStyle = house.maintenanceStatus === 'ruined' ? 'rgba(127, 29, 29, 0.9)' : 'rgba(146, 64, 14, 0.9)';
    ctx.fillRect(-16, halfH + 9, 32, 8);
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
      selectedEntity?.kind === 'plaza'
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
      animPhase
    );
  }

  const sortedSpecials = [...state.specialBuildings].sort((a, b) => a.y - b.y);
  for (const b of sortedSpecials) {
    const isSel = selectedEntity?.kind === 'special' && selectedEntity.id === b.id;
    drawSpecialBuilding(ctx, b, isNight, isSel, state.season, shadow, animPhase);
  }
}

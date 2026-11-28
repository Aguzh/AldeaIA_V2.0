import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FOREST_MAX_X,
  MOUNTAIN_MIN_X,
  RIVER_BOTTOM_Y,
  RIVER_TOP_Y,
  clamp,
} from '../simulation/rules';
import type {
  FireHazard,
  FloatingEffect,
  ResourceNode,
  SimulationState,
} from '../types/simulation';
import { drawSpriteFrame, getCutoutSprite } from './spriteLoader';

const FOREST_GROVE_RECT = { sx: 623, sy: 24, sw: 565, sh: 417 };

const MOUNTAIN_RECTS = [
  { sx: 616, sy: 460, sw: 276, sh: 215 },
  { sx: 899, sy: 476, sw: 284, sh: 197 },
  { sx: 616, sy: 679, sw: 180, sh: 210 },
  { sx: 795, sy: 675, sw: 105, sh: 149 },
  { sx: 906, sy: 679, sw: 272, sh: 217 },
] as const;

const RESOURCE_SPRITES = {
  logPile: { sx: 36, sy: 363, sw: 149, sh: 139 },
  logSingle: { sx: 261, sy: 373, sw: 123, sh: 124 },
  stoneSmall: { sx: 496, sy: 409, sw: 93, sh: 73 },
  stoneLarge: { sx: 670, sy: 373, sw: 129, sh: 119 },
  copper: { sx: 46, sy: 537, sw: 128, sh: 124 },
  iron: { sx: 266, sy: 537, sw: 129, sh: 124 },
  silver: { sx: 491, sy: 537, sw: 129, sh: 124 },
  gold: { sx: 849, sy: 537, sw: 129, sh: 124 },
  berries: { sx: 46, sy: 696, sw: 129, sh: 129 },
  apple: { sx: 860, sy: 701, sw: 108, sh: 124 },
  campfire: { sx: 56, sy: 859, sw: 108, sh: 135 },
  sparks: { sx: 286, sy: 906, sw: 52, sh: 57 },
  flame: { sx: 450, sy: 838, sw: 125, sh: 162 },
} as const;

export function getSunShadowOffset(
  minute: number,
  isNight: boolean
): { dx: number; dy: number; alpha: number } {
  if (isNight) return { dx: 0, dy: 2, alpha: 0.24 };
  const t = clamp((minute - 360) / 780, 0, 1);
  const dx = Math.round((0.5 - t) * 14);
  const dy = 3 + Math.round(Math.abs(t - 0.5) * 4);
  const alpha = 0.2 + Math.abs(t - 0.5) * 0.22;
  return { dx, dy, alpha };
}

export function drawWarmHalo(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  innerRgba: string
): void {
  const cx = Math.round(x);
  const cy = Math.round(y);
  const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
  grad.addColorStop(0, innerRgba);
  grad.addColorStop(0.55, innerRgba.replace(/[\d.]+\)$/, '0.14)'));
  grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawRoundedTree16Bit(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  sway: number,
  season: SimulationState['season'],
  shadow: { dx: number; dy: number; alpha: number },
  seed: number
): void {
  const isWinter = season === 'Invierno';
  const isAutumn = season === 'Otoño';
  const isSpring = season === 'Primavera';

  const sx = ox + Math.round(shadow.dx * 0.75);
  const sy = oy + 10 + Math.min(4, shadow.dy);

  ctx.fillStyle = `rgba(15, 23, 42, ${(shadow.alpha * 0.65).toFixed(2)})`;
  ctx.fillRect(sx - 12, sy - 1, 24, 5);
  ctx.fillStyle = `rgba(15, 23, 42, ${shadow.alpha.toFixed(2)})`;
  ctx.fillRect(sx - 9, sy, 18, 4);

  ctx.fillStyle = '#2e1406';
  ctx.fillRect(ox - 4, oy + 2, 8, 12);
  ctx.fillRect(ox - 6, oy + 12, 12, 3);
  ctx.fillStyle = '#6b3e1b';
  ctx.fillRect(ox - 3, oy + 2, 6, 11);
  ctx.fillRect(ox - 5, oy + 12, 10, 2);
  ctx.fillStyle = '#925729';
  ctx.fillRect(ox - 3, oy + 2, 2, 10);
  ctx.fillStyle = '#45220c';
  ctx.fillRect(ox + 1, oy + 2, 2, 11);

  const cBase = ox + sway;
  const outline = isWinter ? '#1e293b' : isAutumn ? '#7c2d12' : '#0b321d';
  const deep = isWinter ? '#334155' : isAutumn ? '#9a3412' : '#14532d';
  const mid = isWinter ? '#475569' : isAutumn ? '#c2410c' : '#15803d';
  const bright = isWinter ? '#64748b' : isAutumn ? '#ea580c' : '#22c55e';
  const highlight = isWinter ? '#94a3b8' : isAutumn ? '#f59e0b' : '#4ade80';
  const tip = isWinter ? '#cbd5e1' : isAutumn ? '#fcd34d' : '#86efac';

  ctx.fillStyle = outline;
  ctx.fillRect(cBase - 13, oy - 8, 26, 13);
  ctx.fillRect(cBase - 11, oy - 15, 22, 18);
  ctx.fillRect(cBase - 7, oy - 20, 14, 7);

  ctx.fillStyle = deep;
  ctx.fillRect(cBase - 12, oy - 7, 24, 11);
  ctx.fillRect(cBase - 10, oy - 14, 20, 16);
  ctx.fillRect(cBase - 6, oy - 19, 12, 7);

  ctx.fillStyle = mid;
  ctx.fillRect(cBase - 11, oy - 8, 20, 9);
  ctx.fillRect(cBase - 9, oy - 14, 17, 12);
  ctx.fillRect(cBase - 5, oy - 18, 10, 6);

  ctx.fillStyle = bright;
  ctx.fillRect(cBase - 10, oy - 10, 11, 7);
  ctx.fillRect(cBase - 7, oy - 16, 12, 7);
  ctx.fillRect(cBase + 2, oy - 11, 7, 5);

  ctx.fillStyle = highlight;
  ctx.fillRect(cBase - 8, oy - 15, 8, 4);
  ctx.fillRect(cBase - 9, oy - 9, 6, 4);
  ctx.fillRect(cBase - 4, oy - 18, 6, 3);

  ctx.fillStyle = tip;
  ctx.fillRect(cBase - 7, oy - 15, 3, 2);
  ctx.fillRect(cBase - 3, oy - 18, 3, 2);
  ctx.fillRect(cBase - 8, oy - 9, 2, 2);

  if (isSpring) {
    ctx.fillStyle = seed % 2 === 0 ? '#f9a8d4' : '#fef08a';
    ctx.fillRect(cBase - 7, oy - 12, 2, 2);
    ctx.fillRect(cBase + 4, oy - 9, 2, 2);
    ctx.fillRect(cBase - 1, oy - 16, 2, 2);
  } else if (isWinter) {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(cBase - 10, oy - 13, 20, 3);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cBase - 6, oy - 19, 12, 4);
    ctx.fillRect(cBase - 9, oy - 14, 16, 3);
  }
}

function drawPineTree16Bit(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  sway: number,
  season: SimulationState['season'],
  shadow: { dx: number; dy: number; alpha: number }
): void {
  const isWinter = season === 'Invierno';
  const isAutumn = season === 'Otoño';

  const sx = ox + Math.round(shadow.dx * 0.75);
  const sy = oy + 11 + Math.min(4, shadow.dy);

  ctx.fillStyle = `rgba(15, 23, 42, ${shadow.alpha.toFixed(2)})`;
  ctx.fillRect(sx - 9, sy, 18, 4);

  ctx.fillStyle = '#2e1406';
  ctx.fillRect(ox - 3, oy + 4, 6, 11);
  ctx.fillStyle = '#6b3e1b';
  ctx.fillRect(ox - 2, oy + 4, 4, 10);
  ctx.fillStyle = '#925729';
  ctx.fillRect(ox - 2, oy + 4, 1, 9);

  const cBase = ox + sway;
  const outline = isWinter ? '#1e293b' : isAutumn ? '#78350f' : '#062c1b';
  const deep = isWinter ? '#334155' : isAutumn ? '#92400e' : '#064e3b';
  const mid = isWinter ? '#475569' : isAutumn ? '#b45309' : '#047857';
  const bright = isWinter ? '#64748b' : isAutumn ? '#d97706' : '#10b981';
  const tip = isWinter ? '#e2e8f0' : isAutumn ? '#fbbf24' : '#6ee7b7';

  const tiers = [
    { w: 22, y: oy - 3, h: 9 },
    { w: 16, y: oy - 11, h: 9 },
    { w: 10, y: oy - 19, h: 9 },
  ];

  for (let idx = 0; idx < tiers.length; idx++) {
    const t = tiers[idx];
    const tx = Math.round(cBase + (idx === 0 ? -Math.round(sway * 0.4) : 0));
    const half = Math.round(t.w / 2);
    ctx.fillStyle = outline;
    ctx.fillRect(tx - half - 1, t.y - 1, t.w + 2, t.h + 2);
    ctx.fillStyle = deep;
    ctx.fillRect(tx - half, t.y, t.w, t.h);
    ctx.fillStyle = mid;
    ctx.fillRect(tx - half + 1, t.y, t.w - 4, t.h - 2);
    ctx.fillStyle = bright;
    ctx.fillRect(tx - half + 2, t.y, Math.max(4, Math.round(t.w * 0.45)), t.h - 3);
    ctx.fillStyle = tip;
    ctx.fillRect(tx - Math.round(half * 0.5), t.y + 1, 2, 2);
  }

  ctx.fillStyle = outline;
  ctx.fillRect(cBase - 3, oy - 23, 6, 4);
  ctx.fillStyle = bright;
  ctx.fillRect(cBase - 2, oy - 22, 4, 3);

  if (isWinter) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(cBase - 3, oy - 22, 6, 3);
    ctx.fillRect(cBase - 6, oy - 11, 12, 2);
    ctx.fillRect(cBase - 9, oy - 3, 18, 2);
  }
}

export function drawForestAndMountains(
  ctx: CanvasRenderingContext2D,
  season: SimulationState['season'],
  animPhase: number,
  shadow: { dx: number; dy: number; alpha: number }
): void {
  ctx.imageSmoothingEnabled = false;
  const isWinter = season === 'Invierno';
  const isAutumn = season === 'Otoño';

  const groveSprite = getCutoutSprite(
    'forest',
    FOREST_GROVE_RECT.sx,
    FOREST_GROVE_RECT.sy,
    FOREST_GROVE_RECT.sw,
    FOREST_GROVE_RECT.sh,
    { mode: 'flood', tolerance: 34 }
  );

  // 1. BOSQUE DENSO Y CONTINUO (franja izquierda 0..FOREST_MAX_X, Zona Norte y Zona Sur)
  const renderForestBand = (bandTop: number, bandBottom: number, bandOffset: number) => {
    if (bandBottom <= bandTop + 20) return;

    // Sombra profunda bajo el dosel y matorrales pixel-art en bordes
    ctx.fillStyle = isWinter
      ? 'rgba(15, 38, 36, 0.24)'
      : isAutumn
        ? 'rgba(69, 39, 12, 0.20)'
        : 'rgba(6, 40, 18, 0.24)';
    ctx.fillRect(0, bandTop, FOREST_MAX_X - 24, bandBottom - bandTop);

    if (groveSprite) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, bandTop, FOREST_MAX_X + 34, bandBottom - bandTop);
      ctx.clip();

      const colXs = [-24, 74, 168];
      const rowStep = 74;
      let rowIdx = 0;
      for (let gy = bandTop - 10; gy < bandBottom - 16; gy += rowStep) {
        const stagger = (rowIdx % 2) * 14;
        for (let colIdx = 0; colIdx < colXs.length; colIdx++) {
          const seed = rowIdx * 17 + colIdx * 31 + bandOffset;
          const dw = 160 + (seed % 16);
          const dh = 112 + ((seed * 3) % 14);
          const edgeVariance = colIdx === 2 ? ((seed % 25) - 14) : ((seed % 9) - 4);
          const gx = Math.round(colXs[colIdx] + stagger + edgeVariance);
          const sway = Math.round(Math.sin(animPhase * 1.1 + seed * 0.7) * 1);
          const flip = (rowIdx + colIdx) % 2 === 1;
          drawSpriteFrame(ctx, groveSprite, gx + sway, Math.round(gy), dw, dh, flip);
          if (isWinter) {
            ctx.fillStyle = 'rgba(241, 245, 249, 0.34)';
            ctx.fillRect(Math.max(0, gx + 18), Math.max(bandTop, Math.round(gy) + 14), Math.min(dw - 36, 110), 8);
          }
        }
        rowIdx++;
      }
      ctx.restore();
    } else {
      // Fallback procedural continuo sin huecos pelados
      let rowIdx = 0;
      for (let ty = bandTop + 16; ty < bandBottom - 12; ty += 34) {
        const stagger = (rowIdx % 2) * 18;
        for (let tx = 14 + stagger; tx < FOREST_MAX_X - 6; tx += 36) {
          const seed = tx * 7 + ty * 13 + bandOffset;
          const ox = Math.round(tx + ((seed % 9) - 4));
          const oy = Math.round(ty + (((seed * 3) % 7) - 3));
          const sway = Math.round(Math.sin(animPhase * 1.4 + ox * 0.09 + oy * 0.05) * 1.2);
          if (seed % 3 === 0) {
            drawPineTree16Bit(ctx, ox, oy, sway, season, shadow);
          } else {
            drawRoundedTree16Bit(ctx, ox, oy, sway, season, shadow, seed);
          }
        }
        rowIdx++;
      }
    }

    // Arbustos, raíces musgosas y helechos de transición en el lindero irregular del bosque
    for (let by = bandTop + 10; by < bandBottom - 14; by += 18) {
      const seed = by * 11 + bandOffset;
      const bx = Math.round(FOREST_MAX_X - 8 + ((seed % 32) - 12));
      const darkBush = isWinter ? '#334155' : isAutumn ? '#9a3412' : '#14532d';
      const lightBush = isWinter ? '#94a3b8' : isAutumn ? '#ea580c' : '#22c55e';
      // Raíces o ramitas del suelo
      ctx.fillStyle = '#5c3a21';
      ctx.fillRect(bx - 9, by + 2, 5, 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
      ctx.fillRect(bx - 5, by + 4, 11, 3);
      ctx.fillStyle = darkBush;
      ctx.fillRect(bx - 5, by - 2, 11, 7);
      ctx.fillStyle = lightBush;
      ctx.fillRect(bx - 3, by - 3, 7, 5);
      if (seed % 2 === 0 && !isWinter) {
        // Hojarasca / brote cercano saltando al pasto
        ctx.fillStyle = isAutumn ? '#f59e0b' : '#4ade80';
        ctx.fillRect(bx + 8, by + 3, 3, 2);
      }
    }
  };

  renderForestBand(12, RIVER_TOP_Y - 12, 3);
  renderForestBand(RIVER_BOTTOM_Y + 12, CANVAS_HEIGHT - 12, 19);

  // Hojas cayendo suavemente en Otoño dentro del bosque
  if (isAutumn) {
    for (let i = 0; i < 18; i++) {
      const lx = Math.round(((i * 37 + Math.floor(animPhase * 12)) % (FOREST_MAX_X - 18)) + 8);
      const ly = Math.round(((i * 59 + Math.floor(animPhase * 22)) % (CANVAS_HEIGHT - 20)) + 10);
      ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : '#ea580c';
      ctx.fillRect(lx, ly, 3, 2);
    }
  }

  // 2. CORDILLERA MONTAÑOSA CONTINUA (franja derecha MOUNTAIN_MIN_X..CANVAS_WIDTH)
  const mountainSprites = MOUNTAIN_RECTS.map((r) =>
    getCutoutSprite('forest', r.sx, r.sy, r.sw, r.sh, { mode: 'flood', tolerance: 34 })
  );
  const allMountainsReady = mountainSprites.every((s): s is HTMLCanvasElement => Boolean(s));

  const renderMountainBand = (bandTop: number, bandBottom: number, bandSeed: number) => {
    if (bandBottom <= bandTop + 24) return;

    if (allMountainsReady) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(MOUNTAIN_MIN_X - 32, bandTop, CANVAS_WIDTH - MOUNTAIN_MIN_X + 36, bandBottom - bandTop);
      ctx.clip();

      // Capa base: cordillera y acantilados continuos entrelazados
      let rowIdx = 0;
      for (let my = bandTop + 42; my < bandBottom + 16; my += 56) {
        const stagger = (rowIdx % 2) * 34;
        for (let mx = MOUNTAIN_MIN_X + 38 - stagger; mx < CANVAS_WIDTH + 34; mx += 82) {
          const seed = rowIdx * 23 + Math.round(mx) + bandSeed;
          const ridgePick = seed % 3 === 0 ? 4 : 1; // 1 = muralla nevada ancha, 4 = meseta rocosa escalonada
          const rect = MOUNTAIN_RECTS[ridgePick];
          const dh = 76 + (seed % 14);
          const dw = Math.round((rect.sw / rect.sh) * dh);
          const ox = Math.round(mx + ((seed % 13) - 6));
          const oy = Math.round(my + (((seed * 3) % 9) - 4));
          ctx.fillStyle = `rgba(15, 23, 42, ${(shadow.alpha + 0.1).toFixed(2)})`;
          ctx.fillRect(Math.round(ox - dw * 0.44 + shadow.dx * 0.4), oy - 4, Math.round(dw * 0.88), 8);
          drawSpriteFrame(ctx, mountainSprites[ridgePick], Math.round(ox - dw / 2), Math.round(oy - dh), dw, dh);
        }

        // Estribaciones rocosas irregulares en la falda oeste (rompe el borde recto)
        const foothillSeed = rowIdx * 29 + bandSeed;
        const fPick = foothillSeed % 2 === 0 ? 3 : 4;
        const fRect = MOUNTAIN_RECTS[fPick];
        const fH = 50 + (foothillSeed % 14);
        const fW = Math.round((fRect.sw / fRect.sh) * fH);
        const fx = Math.round(MOUNTAIN_MIN_X + 10 + ((foothillSeed % 21) - 10));
        const fy = Math.round(my + 4 + ((foothillSeed * 3) % 11) - 5);
        ctx.fillStyle = `rgba(15, 23, 42, ${(shadow.alpha + 0.08).toFixed(2)})`;
        ctx.fillRect(Math.round(fx - fW * 0.42), fy - 3, Math.round(fW * 0.84), 6);
        drawSpriteFrame(ctx, mountainSprites[fPick], Math.round(fx - fW / 2), Math.round(fy - fH), fW, fH);

        // Capa frontal: picos escarpados y agujas nevadas sobre la cordillera
        for (let px = MOUNTAIN_MIN_X + 58 + (rowIdx % 2) * 26; px < CANVAS_WIDTH + 12; px += 78) {
          const seed = rowIdx * 41 + Math.round(px) + bandSeed;
          const peakOptions = isWinter ? [2, 1, 2, 0] : [0, 2, 0, 3];
          const pickIdx = peakOptions[seed % peakOptions.length];
          const rect = MOUNTAIN_RECTS[pickIdx];
          const dh = pickIdx === 3 ? 62 : 70 + (seed % 18);
          const dw = Math.round((rect.sw / rect.sh) * dh);
          const ox = Math.round(px + ((seed % 9) - 4));
          const oy = Math.round(my + 8 + (((seed * 5) % 9) - 4));
          drawSpriteFrame(ctx, mountainSprites[pickIdx], Math.round(ox - dw / 2), Math.round(oy - dh), dw, dh);
        }
        rowIdx++;
      }

      ctx.restore();
    } else {
      // Fallback procedural continuo: muralla rocosa + picos encadenados
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(MOUNTAIN_MIN_X + 12, bandTop, CANVAS_WIDTH - MOUNTAIN_MIN_X - 12, bandBottom - bandTop);
      let rowIdx = 0;
      for (let my = bandTop + 34; my < bandBottom - 10; my += 52) {
        const stagger = (rowIdx % 2) * 24;
        for (let mx = MOUNTAIN_MIN_X + 26 + stagger; mx < CANVAS_WIDTH - 10; mx += 54) {
          const seed = mx + my + bandSeed;
          const ox = Math.round(mx + ((seed % 9) - 4));
          const oy = Math.round(my + (((seed * 3) % 7) - 3));

          ctx.fillStyle = `rgba(15, 23, 42, ${(shadow.alpha + 0.1).toFixed(2)})`;
          ctx.fillRect(ox - 26 + Math.round(shadow.dx * 0.65), oy + 12 + Math.min(4, shadow.dy), 52, 7);

          ctx.fillStyle = '#0f172a';
          ctx.fillRect(ox - 28, oy - 4, 56, 20);
          ctx.fillRect(ox - 20, oy - 16, 40, 14);
          ctx.fillRect(ox - 13, oy - 26, 26, 12);
          ctx.fillRect(ox - 7, oy - 32, 14, 8);

          ctx.fillStyle = '#334155';
          ctx.fillRect(ox - 26, oy - 2, 52, 17);
          ctx.fillRect(ox - 18, oy - 15, 36, 14);
          ctx.fillRect(ox - 11, oy - 25, 22, 12);
          ctx.fillRect(ox - 6, oy - 30, 12, 7);

          ctx.fillStyle = '#475569';
          ctx.fillRect(ox - 25, oy - 2, 34, 15);
          ctx.fillRect(ox - 18, oy - 15, 24, 13);
          ctx.fillRect(ox - 11, oy - 25, 14, 11);

          ctx.fillStyle = '#64748b';
          ctx.fillRect(ox - 22, oy, 18, 12);
          ctx.fillRect(ox - 15, oy - 13, 13, 11);
          ctx.fillRect(ox - 9, oy - 23, 8, 9);

          ctx.fillStyle = isWinter ? '#e2e8f0' : '#cbd5e1';
          ctx.fillRect(ox - 6, oy - 30, 12, 7);
          ctx.fillRect(ox - 9, oy - 24, 18, 4);
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(ox - 6, oy - 30, 7, 5);
          ctx.fillRect(ox - 9, oy - 24, 9, 3);
        }
        rowIdx++;
      }
    }

    // Peñascos, gravilla y piedras de transición en la base oeste de la cordillera
    for (let ry = bandTop + 12; ry < bandBottom - 12; ry += 20) {
      const seed = ry * 13 + bandSeed;
      const rx = Math.round(MOUNTAIN_MIN_X - 8 + ((seed % 22) - 10));
      ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
      ctx.fillRect(rx - 7, ry + 4, 14, 3);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(rx - 7, ry - 3, 13, 8);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(rx - 6, ry - 2, 10, 5);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(rx - 5, ry - 2, 5, 3);
      if (seed % 2 === 0) {
        ctx.fillStyle = '#475569';
        ctx.fillRect(rx - 14 - (seed % 6), ry + 1, 5, 3);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(rx - 14 - (seed % 6), ry + 1, 3, 1);
      }
    }
  };

  renderMountainBand(8, RIVER_TOP_Y - 12, 7);
  renderMountainBand(RIVER_BOTTOM_Y + 12, CANVAS_HEIGHT - 8, 29);

  // Carteles discretos de bioma en esquinas superiores
  ctx.fillStyle = 'rgba(15, 23, 42, 0.62)';
  ctx.fillRect(10, 8, 98, 13);
  ctx.fillRect(CANVAS_WIDTH - 124, 8, 114, 13);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.24)';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 8, 98, 13);
  ctx.strokeRect(CANVAS_WIDTH - 124, 8, 114, 13);
  ctx.fillStyle = 'rgba(134, 239, 172, 0.9)';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('BOSQUE · Madera', 15, 17);
  ctx.fillStyle = 'rgba(252, 211, 77, 0.9)';
  ctx.textAlign = 'right';
  ctx.fillText('MONTAÑAS · Menas', CANVAS_WIDTH - 15, 17);
}

export function drawResourceNodes(
  ctx: CanvasRenderingContext2D,
  resources: ResourceNode[],
  animPhase: number
): void {
  ctx.imageSmoothingEnabled = false;
  const glintTick = Math.floor(animPhase * 2.5);
  for (const r of resources) {
    const rx = Math.round(r.x);
    const ry = Math.round(r.y);
    if (r.depleted) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.32)';
      ctx.fillRect(rx - 4, ry - 1, 8, 4);
      ctx.fillStyle = 'rgba(100, 116, 139, 0.45)';
      ctx.fillRect(rx - 3, ry, 6, 2);
      continue;
    }

    let spriteRect: { sx: number; sy: number; sw: number; sh: number } | null = null;
    let drawSize = 18;
    if (r.type === 'food') {
      spriteRect = r.id % 2 === 0 ? RESOURCE_SPRITES.apple : RESOURCE_SPRITES.berries;
      drawSize = 16;
    } else if (r.type === 'wood' || r.type === 'oak_wood') {
      spriteRect = RESOURCE_SPRITES.logPile;
      drawSize = 20;
    } else if (r.type === 'pine_wood' || r.type === 'maple_wood') {
      spriteRect = RESOURCE_SPRITES.logSingle;
      drawSize = 18;
    } else if (r.type === 'stone') {
      spriteRect = r.id % 2 === 0 ? RESOURCE_SPRITES.stoneLarge : RESOURCE_SPRITES.stoneSmall;
      drawSize = 18;
    } else if (r.type === 'copper') {
      spriteRect = RESOURCE_SPRITES.copper;
    } else if (r.type === 'iron') {
      spriteRect = RESOURCE_SPRITES.iron;
    } else if (r.type === 'silver') {
      spriteRect = RESOURCE_SPRITES.silver;
    } else if (r.type === 'gold') {
      spriteRect = RESOURCE_SPRITES.gold;
    }

    const sprite = spriteRect
      ? getCutoutSprite('wildlife', spriteRect.sx, spriteRect.sy, spriteRect.sw, spriteRect.sh, {
          mode: 'flood',
          tolerance: 36,
        })
      : null;

    if (sprite && spriteRect) {
      const dh = drawSize;
      const dw = Math.round((spriteRect.sw / spriteRect.sh) * dh);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
      ctx.fillRect(Math.round(rx - dw * 0.4), ry + 4, Math.round(dw * 0.8), 3);
      drawSpriteFrame(ctx, sprite, Math.round(rx - dw / 2), Math.round(ry + 6 - dh), dw, dh);

      if ((r.type === 'silver' || r.type === 'gold') && (glintTick + r.id) % 4 === 0) {
        ctx.fillStyle = r.type === 'gold' ? '#fef9c3' : '#ffffff';
        ctx.fillRect(rx + 2, ry - 9, 3, 1);
        ctx.fillRect(rx + 3, ry - 10, 1, 3);
      }
      continue;
    }

    // Fallback procedural 16-bit
    if (r.type === 'food') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
      ctx.fillRect(rx - 6, ry + 5, 12, 3);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(rx - 1, ry - 8, 2, 4);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(rx + 1, ry - 8, 5, 3);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(rx + 2, ry - 8, 3, 1);
      ctx.fillStyle = '#450a0a';
      ctx.fillRect(rx - 6, ry - 5, 12, 10);
      ctx.fillRect(rx - 4, ry - 6, 8, 12);
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(rx - 5, ry - 4, 10, 8);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(rx - 4, ry - 5, 8, 7);
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(rx - 3, ry - 4, 2, 3);
      ctx.fillStyle = '#fef2f2';
      ctx.fillRect(rx - 3, ry - 4, 1, 1);
    } else if (
      r.type === 'wood' ||
      r.type === 'pine_wood' ||
      r.type === 'maple_wood' ||
      r.type === 'oak_wood'
    ) {
      const bark =
        r.type === 'pine_wood'
          ? '#854d0e'
          : r.type === 'maple_wood'
            ? '#9a3412'
            : r.type === 'oak_wood'
              ? '#3f230e'
              : '#5c3a21';
      const barkLight =
        r.type === 'pine_wood'
          ? '#a16207'
          : r.type === 'maple_wood'
            ? '#c2410c'
            : r.type === 'oak_wood'
              ? '#5c3416'
              : '#784b2a';
      const core =
        r.type === 'pine_wood'
          ? '#fef08a'
          : r.type === 'maple_wood'
            ? '#fdba74'
            : r.type === 'oak_wood'
              ? '#d6b285'
              : '#fde68a';

      ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
      ctx.fillRect(rx - 8, ry + 4, 16, 3);
      ctx.fillStyle = '#1c1108';
      ctx.fillRect(rx - 8, ry - 4, 17, 9);
      ctx.fillStyle = bark;
      ctx.fillRect(rx - 7, ry - 3, 12, 7);
      ctx.fillStyle = barkLight;
      ctx.fillRect(rx - 7, ry - 3, 11, 2);
      ctx.fillRect(rx - 5, ry + 1, 8, 1);
      ctx.fillStyle = core;
      ctx.fillRect(rx + 4, ry - 3, 4, 7);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(rx + 5, ry - 1, 2, 3);
    } else if (r.type === 'stone') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
      ctx.fillRect(rx - 7, ry + 4, 14, 3);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(rx - 7, ry - 3, 14, 8);
      ctx.fillRect(rx - 5, ry - 6, 10, 4);
      ctx.fillStyle = '#475569';
      ctx.fillRect(rx - 6, ry - 2, 12, 6);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(rx - 5, ry - 5, 9, 6);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(rx - 4, ry - 5, 6, 3);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(rx - 4, ry - 5, 3, 2);
    } else if (r.type === 'copper' || r.type === 'iron' || r.type === 'silver' || r.type === 'gold') {
      const palette =
        r.type === 'copper'
          ? { base: '#7c2d12', mid: '#c2410c', bright: '#fb923c', glint: '#ffedd5' }
          : r.type === 'iron'
            ? { base: '#334155', mid: '#64748b', bright: '#cbd5e1', glint: '#f0f9ff' }
            : r.type === 'silver'
              ? { base: '#64748b', mid: '#cbd5e1', bright: '#f1f5f9', glint: '#ffffff' }
              : { base: '#854d0e', mid: '#eab308', bright: '#fde047', glint: '#fef9c3' };

      ctx.fillStyle = 'rgba(15, 23, 42, 0.36)';
      ctx.fillRect(rx - 8, ry + 4, 16, 3);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(rx - 8, ry - 2, 16, 7);
      ctx.fillRect(rx - 6, ry - 5, 12, 4);

      ctx.fillStyle = palette.base;
      ctx.fillRect(rx - 7, ry - 1, 14, 5);
      ctx.fillStyle = palette.mid;
      ctx.fillRect(rx - 5, ry - 4, 10, 5);
      ctx.fillStyle = palette.bright;
      ctx.fillRect(rx - 4, ry - 4, 6, 3);
      ctx.fillStyle = palette.glint;
      ctx.fillRect(rx - 3, ry - 4, 2, 2);

      if ((r.type === 'silver' || r.type === 'gold') && (glintTick + r.id) % 4 === 0) {
        ctx.fillStyle = palette.glint;
        ctx.fillRect(rx + 1, ry - 7, 3, 1);
        ctx.fillRect(rx + 2, ry - 8, 1, 3);
      }
    } else if (r.type === 'coins') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
      ctx.fillRect(rx - 5, ry + 5, 10, 3);
      ctx.fillStyle = '#713f12';
      ctx.fillRect(rx - 6, ry - 6, 12, 12);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(rx - 5, ry - 5, 10, 10);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(rx - 4, ry - 4, 8, 8);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(rx - 3, ry - 3, 3, 3);
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(rx - 1, ry - 2, 2, 4);
    }
  }
}

export function drawFires(
  ctx: CanvasRenderingContext2D,
  fires: FireHazard[],
  minute: number
): void {
  ctx.imageSmoothingEnabled = false;
  const flicker = Math.floor(minute * 0.8) % 2;
  const flameSprite = getCutoutSprite(
    'wildlife',
    RESOURCE_SPRITES.flame.sx,
    RESOURCE_SPRITES.flame.sy,
    RESOURCE_SPRITES.flame.sw,
    RESOURCE_SPRITES.flame.sh,
    { mode: 'flood', tolerance: 36 }
  );
  const campfireSprite = getCutoutSprite(
    'wildlife',
    RESOURCE_SPRITES.campfire.sx,
    RESOURCE_SPRITES.campfire.sy,
    RESOURCE_SPRITES.campfire.sw,
    RESOURCE_SPRITES.campfire.sh,
    { mode: 'flood', tolerance: 36 }
  );

  for (const fire of fires) {
    const fx = Math.round(fire.x);
    const fy = Math.round(fire.y);

    if (flameSprite || campfireSprite) {
      const sprite = fire.intensity >= 1.2 && flameSprite ? flameSprite : campfireSprite ?? flameSprite!;
      const dw = fire.intensity >= 1.2 ? 22 : 20;
      const dh = fire.intensity >= 1.2 ? 26 : 24;
      drawSpriteFrame(ctx, sprite, Math.round(fx - dw / 2), Math.round(fy + 6 - dh), dw, dh, flicker === 1);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(fx - 3 + flicker * 5, fy - 18 - flicker * 2, 2, 2);
      continue;
    }

    ctx.fillStyle = '#292524';
    ctx.fillRect(fx - 9, fy + 3, 18, 4);
    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(fx - 8, fy - 4, 16, 9);
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(fx - 7, fy - 7 - flicker, 14, 10);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(fx - 5, fy - 10 - flicker * 2, 10, 11);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(fx - 3, fy - 12 + flicker * 2, 6, 8);
    ctx.fillStyle = '#fef9c3';
    ctx.fillRect(fx - 1, fy - 8 + flicker, 2, 4);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(fx - 4 + flicker * 6, fy - 15 - flicker * 2, 2, 2);
  }
}

export function drawFloatingEffects(
  ctx: CanvasRenderingContext2D,
  floatingEffects?: FloatingEffect[]
): void {
  if (!Array.isArray(floatingEffects) || floatingEffects.length === 0) return;
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  for (const fx of floatingEffects) {
    const alpha = clamp(fx.ttl / Math.max(0.1, fx.maxTtl), 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    const w = Math.max(28, fx.text.length * 6 + 6);
    ctx.fillRect(Math.round(fx.x - w / 2), Math.round(fx.y - 9), w, 12);
    ctx.fillStyle = fx.color;
    ctx.fillText(fx.text, Math.round(fx.x), Math.round(fx.y));
    ctx.restore();
  }
}

export function drawWeatherEffects(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  animPhase: number
): void {
  if (state.weather === 'rain' || state.weather === 'storm' || state.weather === 'thunderstorm') {
    ctx.fillStyle = state.weather === 'thunderstorm' ? '#dbeafe' : state.weather === 'storm' ? '#bfdbfe' : '#93c5fd';
    for (const d of state.rainDrops) {
      ctx.fillRect(Math.round(d.x), Math.round(d.y), 2, 7);
      d.y += d.s * Math.max(1, state.speed);
      if (d.y > CANVAS_HEIGHT) d.y = 0;
    }
  } else if (state.season === 'Invierno') {
    ctx.fillStyle = 'rgba(248, 250, 252, 0.78)';
    for (let i = 0; i < 45; i++) {
      const sx = Math.round((i * 71 + Math.floor(animPhase * 12)) % CANVAS_WIDTH);
      const sy = Math.round((i * 53 + Math.floor(animPhase * 20)) % CANVAS_HEIGHT);
      ctx.fillRect(sx, sy, 2, 2);
    }
  }
}

export function drawAtmosphericLighting(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  isNight: boolean,
  occupiedHouseIds: Set<number>
): void {
  if (isNight) {
    ctx.fillStyle = 'rgba(8, 15, 36, 0.36)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    if (state.plaza) {
      const plazaCorners = [
        [state.plaza.x - 52, state.plaza.y - 38],
        [state.plaza.x + 48, state.plaza.y - 38],
        [state.plaza.x - 52, state.plaza.y + 34],
        [state.plaza.x + 48, state.plaza.y + 34],
      ];
      for (const [lx, ly] of plazaCorners) {
        drawWarmHalo(ctx, lx + 2, ly - 1, 34, 'rgba(253, 224, 71, 0.34)');
      }
    }
    for (const r of state.roads) {
      if (r.lit && (r.hasLamp || (r.x + r.y) % 48 === 0)) {
        drawWarmHalo(ctx, r.x + 8, r.y - 10, 30, 'rgba(253, 224, 71, 0.30)');
      }
    }
    for (const h of state.houses) {
      if (occupiedHouseIds.has(h.id)) {
        drawWarmHalo(ctx, h.x, h.y + 2, 26, 'rgba(251, 191, 36, 0.24)');
      }
    }
    for (const b of state.specialBuildings) {
      if (!b.isOperational) continue;
      if (b.type === 'forge' || b.type === 'bakery' || b.type === 'apothecary') {
        drawWarmHalo(
          ctx,
          b.x,
          b.y + 2,
          36,
          b.type === 'forge' ? 'rgba(249, 115, 22, 0.34)' : 'rgba(251, 191, 36, 0.28)'
        );
      }
    }
    for (const fire of state.fires) {
      drawWarmHalo(ctx, fire.x, fire.y - 4, 42, 'rgba(249, 115, 22, 0.42)');
    }
    for (const ag of state.agents) {
      if (ag.job === 'Minero') {
        drawWarmHalo(ctx, ag.x, ag.y - 12, 20, 'rgba(254, 240, 138, 0.24)');
      }
    }
    ctx.restore();
  } else if (state.minute >= 350 && state.minute <= 460) {
    ctx.fillStyle = 'rgba(251, 146, 60, 0.08)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else if (state.minute >= 1030 && state.minute <= 1150) {
    ctx.fillStyle = 'rgba(249, 115, 22, 0.11)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else if (state.weather === 'drought') {
    ctx.fillStyle = 'rgba(217, 119, 6, 0.12)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  } else if (state.weather === 'storm' || state.weather === 'thunderstorm') {
    ctx.fillStyle = state.weather === 'thunderstorm' ? 'rgba(15, 23, 42, 0.34)' : 'rgba(15, 23, 42, 0.24)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  if (state.lightningFlashTimer > 0) {
    ctx.fillStyle = 'rgba(254, 249, 195, 0.35)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
}

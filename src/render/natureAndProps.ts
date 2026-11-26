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

  // Sombra proyectada en el suelo (por capas pixeladas)
  ctx.fillStyle = `rgba(15, 23, 42, ${(shadow.alpha * 0.65).toFixed(2)})`;
  ctx.fillRect(sx - 12, sy - 1, 24, 5);
  ctx.fillStyle = `rgba(15, 23, 42, ${shadow.alpha.toFixed(2)})`;
  ctx.fillRect(sx - 9, sy, 18, 4);

  // Tronco con contorno y raíces
  ctx.fillStyle = '#2e1406';
  ctx.fillRect(ox - 4, oy + 2, 8, 12);
  ctx.fillRect(ox - 6, oy + 12, 12, 3);
  ctx.fillStyle = '#6b3e1b';
  ctx.fillRect(ox - 3, oy + 2, 6, 11);
  ctx.fillRect(ox - 5, oy + 12, 10, 2);
  // Luz izquierda del tronco
  ctx.fillStyle = '#925729';
  ctx.fillRect(ox - 3, oy + 2, 2, 10);
  // Sombra derecha del tronco
  ctx.fillStyle = '#45220c';
  ctx.fillRect(ox + 1, oy + 2, 2, 11);

  const cBase = ox + sway;
  const outline = isWinter ? '#1e293b' : isAutumn ? '#7c2d12' : '#0b321d';
  const deep = isWinter ? '#334155' : isAutumn ? '#9a3412' : '#14532d';
  const mid = isWinter ? '#475569' : isAutumn ? '#c2410c' : '#15803d';
  const bright = isWinter ? '#64748b' : isAutumn ? '#ea580c' : '#22c55e';
  const highlight = isWinter ? '#94a3b8' : isAutumn ? '#f59e0b' : '#4ade80';
  const tip = isWinter ? '#cbd5e1' : isAutumn ? '#fcd34d' : '#86efac';

  // Contorno oscuro del follaje
  ctx.fillStyle = outline;
  ctx.fillRect(cBase - 13, oy - 8, 26, 13);
  ctx.fillRect(cBase - 11, oy - 15, 22, 18);
  ctx.fillRect(cBase - 7, oy - 20, 14, 7);

  // Capa base oscura (sombra inferior de la copa)
  ctx.fillStyle = deep;
  ctx.fillRect(cBase - 12, oy - 7, 24, 11);
  ctx.fillRect(cBase - 10, oy - 14, 20, 16);
  ctx.fillRect(cBase - 6, oy - 19, 12, 7);

  // Masa media frondosa
  ctx.fillStyle = mid;
  ctx.fillRect(cBase - 11, oy - 8, 20, 9);
  ctx.fillRect(cBase - 9, oy - 14, 17, 12);
  ctx.fillRect(cBase - 5, oy - 18, 10, 6);

  // Clusters iluminados arriba a la izquierda
  ctx.fillStyle = bright;
  ctx.fillRect(cBase - 10, oy - 10, 11, 7);
  ctx.fillRect(cBase - 7, oy - 16, 12, 7);
  ctx.fillRect(cBase + 2, oy - 11, 7, 5);

  ctx.fillStyle = highlight;
  ctx.fillRect(cBase - 8, oy - 15, 8, 4);
  ctx.fillRect(cBase - 9, oy - 9, 6, 4);
  ctx.fillRect(cBase - 4, oy - 18, 6, 3);

  // Puntos de hojas brillantes
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

  // Sombra
  ctx.fillStyle = `rgba(15, 23, 42, ${shadow.alpha.toFixed(2)})`;
  ctx.fillRect(sx - 9, sy, 18, 4);

  // Tronco
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

  // Tres niveles de pino con contorno
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

  // Punta superior
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
  const isWinter = season === 'Invierno';
  const isAutumn = season === 'Otoño';

  for (let ty = 34; ty < CANVAS_HEIGHT - 28; ty += 56) {
    if (ty > RIVER_TOP_Y - 22 && ty < RIVER_BOTTOM_Y + 26) continue;
    for (let tx = 26; tx < FOREST_MAX_X - 24; tx += 58) {
      const ox = Math.round(tx + ((ty * 7) % 21));
      const oy = Math.round(ty + ((tx * 3) % 15));
      const sway = Math.round(Math.sin(animPhase * 1.4 + ox * 0.09 + oy * 0.05) * 1.4);
      const seed = ox + oy;
      if (seed % 3 === 0) {
        drawPineTree16Bit(ctx, ox, oy, sway, season, shadow);
      } else {
        drawRoundedTree16Bit(ctx, ox, oy, sway, season, shadow, seed);
      }
    }
  }

  // Hojas cayendo suavemente en Otoño dentro del bosque
  if (isAutumn) {
    for (let i = 0; i < 16; i++) {
      const lx = Math.round(((i * 37 + Math.floor(animPhase * 12)) % (FOREST_MAX_X - 18)) + 8);
      const ly = Math.round(((i * 59 + Math.floor(animPhase * 22)) % (CANVAS_HEIGHT - 20)) + 10);
      ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : '#ea580c';
      ctx.fillRect(lx, ly, 3, 2);
    }
  }

  // Montañas facetadas 16-bit con luces, sombras y nieves
  for (let my = 48; my < CANVAS_HEIGHT - 36; my += 84) {
    if (my > RIVER_TOP_Y - 24 && my < RIVER_BOTTOM_Y + 34) continue;
    for (let mx = MOUNTAIN_MIN_X + 34; mx < CANVAS_WIDTH - 24; mx += 78) {
      const ox = Math.round(mx + ((my * 5) % 19));
      const oy = Math.round(my + ((mx * 3) % 15));

      // Sombra proyectada en la base
      ctx.fillStyle = `rgba(15, 23, 42, ${(shadow.alpha + 0.1).toFixed(2)})`;
      ctx.fillRect(ox - 24 + Math.round(shadow.dx * 0.65), oy + 14 + Math.min(4, shadow.dy), 48, 6);

      // Contorno oscuro de la montaña
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(ox - 24, oy - 1, 48, 18);
      ctx.fillRect(ox - 18, oy - 13, 36, 14);
      ctx.fillRect(ox - 12, oy - 23, 24, 12);
      ctx.fillRect(ox - 7, oy - 29, 14, 8);

      // Lado derecho en sombra profunda
      ctx.fillStyle = '#334155';
      ctx.fillRect(ox - 22, oy, 44, 16);
      ctx.fillRect(ox - 16, oy - 12, 32, 14);
      ctx.fillRect(ox - 10, oy - 22, 20, 12);
      ctx.fillRect(ox - 6, oy - 27, 12, 7);

      // Plano medio rocoso
      ctx.fillStyle = '#475569';
      ctx.fillRect(ox - 22, oy, 30, 15);
      ctx.fillRect(ox - 16, oy - 12, 22, 13);
      ctx.fillRect(ox - 10, oy - 22, 13, 11);

      // Faceta iluminada izquierda
      ctx.fillStyle = '#64748b';
      ctx.fillRect(ox - 21, oy + 1, 16, 13);
      ctx.fillRect(ox - 15, oy - 11, 13, 12);
      ctx.fillRect(ox - 9, oy - 21, 8, 10);

      // Arista luminosa
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(ox - 19, oy + 2, 4, 8);
      ctx.fillRect(ox - 13, oy - 10, 4, 9);
      ctx.fillRect(ox - 7, oy - 20, 4, 9);

      // Grietas y detalles de estratos
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(ox + 2, oy + 4, 8, 2);
      ctx.fillRect(ox + 5, oy - 6, 6, 2);
      ctx.fillRect(ox - 6, oy + 8, 7, 2);

      // Casquete nevado en la cumbre
      ctx.fillStyle = isWinter ? '#e2e8f0' : '#cbd5e1';
      ctx.fillRect(ox - 6, oy - 27, 12, 7);
      ctx.fillRect(ox - 9, oy - 21, 18, 4);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(ox - 6, oy - 27, 7, 5);
      ctx.fillRect(ox - 9, oy - 21, 9, 3);
      if (isWinter) {
        ctx.fillRect(ox - 14, oy - 12, 8, 2);
      }
    }
  }

  // Carteles 16-bit de bioma en esquinas superiores
  ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
  ctx.fillRect(10, 8, 128, 16);
  ctx.fillRect(CANVAS_WIDTH - 152, 8, 142, 16);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(10, 8, 128, 16);
  ctx.strokeRect(CANVAS_WIDTH - 152, 8, 142, 16);
  ctx.fillStyle = '#86efac';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('BOSQUE (Maderas)', 16, 19);
  ctx.fillStyle = '#fcd34d';
  ctx.textAlign = 'right';
  ctx.fillText('MONTAÑAS (Minerales)', CANVAS_WIDTH - 16, 19);
}

export function drawResourceNodes(
  ctx: CanvasRenderingContext2D,
  resources: ResourceNode[],
  animPhase: number
): void {
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

    if (r.type === 'food') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
      ctx.fillRect(rx - 6, ry + 5, 12, 3);
      // Tallo y hoja
      ctx.fillStyle = '#451a03';
      ctx.fillRect(rx - 1, ry - 8, 2, 4);
      ctx.fillStyle = '#15803d';
      ctx.fillRect(rx + 1, ry - 8, 5, 3);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(rx + 2, ry - 8, 3, 1);
      // Manzana / fruto silvestre con contorno
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
      // Contorno oscuro del tronco apilado
      ctx.fillStyle = '#1c1108';
      ctx.fillRect(rx - 8, ry - 4, 17, 9);
      ctx.fillStyle = bark;
      ctx.fillRect(rx - 7, ry - 3, 12, 7);
      ctx.fillStyle = barkLight;
      ctx.fillRect(rx - 7, ry - 3, 11, 2);
      ctx.fillRect(rx - 5, ry + 1, 8, 1);
      // Corte con anillos
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
  const flicker = Math.floor(minute * 0.8) % 2;
  for (const fire of fires) {
    const fx = Math.round(fire.x);
    const fy = Math.round(fire.y);
    // Brasas y leños
    ctx.fillStyle = '#292524';
    ctx.fillRect(fx - 9, fy + 3, 18, 4);
    // Llamas en capas nítidas
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
    // Chispas ascendentes
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
  // Iluminación nocturna cálida con halos radiales o tinte de amanecer/atardecer
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

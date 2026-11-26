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
  const grad = ctx.createRadialGradient(x, y, 2, x, y, radius);
  grad.addColorStop(0, innerRgba);
  grad.addColorStop(0.55, innerRgba.replace(/[\d.]+\)$/, '0.14)'));
  grad.addColorStop(1, 'rgba(253, 224, 71, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export function drawForestAndMountains(
  ctx: CanvasRenderingContext2D,
  season: SimulationState['season'],
  animPhase: number,
  shadow: { dx: number; dy: number; alpha: number }
): void {
  const isWinter = season === 'Invierno';
  const isAutumn = season === 'Otoño';
  const isSpring = season === 'Primavera';

  for (let ty = 34; ty < CANVAS_HEIGHT - 28; ty += 56) {
    if (ty > RIVER_TOP_Y - 22 && ty < RIVER_BOTTOM_Y + 26) continue;
    for (let tx = 26; tx < FOREST_MAX_X - 24; tx += 58) {
      const ox = tx + ((ty * 7) % 21);
      const oy = ty + ((tx * 3) % 15);
      const sway = Math.round(Math.sin(animPhase * 1.4 + ox * 0.09 + oy * 0.05) * 1.4);

      // Sombra direccional según altura solar
      ctx.fillStyle = `rgba(0, 0, 0, ${shadow.alpha})`;
      ctx.fillRect(ox - 9 + shadow.dx, oy + 7 + Math.min(4, shadow.dy), 18, 5);

      ctx.fillStyle = '#451a03';
      ctx.fillRect(ox - 3, oy + 4, 6, 11);
      ctx.fillStyle = isWinter ? '#334155' : isAutumn ? '#b45309' : '#14532d';
      ctx.fillRect(ox - 12 + Math.round(sway * 0.5), oy - 6, 24, 12);
      ctx.fillStyle = isWinter ? '#64748b' : isAutumn ? '#d97706' : '#15803d';
      ctx.fillRect(ox - 9 + sway, oy - 13, 18, 9);
      ctx.fillStyle = isWinter ? '#cbd5e1' : isAutumn ? '#f59e0b' : '#22c55e';
      ctx.fillRect(ox - 5 + sway, oy - 18, 10, 6);

      if (isSpring) {
        // Brotes/flores primaverales
        ctx.fillStyle = (ox + oy) % 2 === 0 ? '#f9a8d4' : '#fef08a';
        ctx.fillRect(ox - 6 + sway, oy - 11, 2, 2);
        ctx.fillRect(ox + 3 + sway, oy - 7, 2, 2);
      } else if (isWinter) {
        // Nieve sobre copa
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(ox - 5 + sway, oy - 19, 10, 3);
      }
    }
  }

  // Hojas cayendo suavemente en Otoño dentro del bosque
  if (isAutumn) {
    for (let i = 0; i < 16; i++) {
      const lx = ((i * 37 + Math.floor(animPhase * 12)) % (FOREST_MAX_X - 18)) + 8;
      const ly = ((i * 59 + Math.floor(animPhase * 22)) % (CANVAS_HEIGHT - 20)) + 10;
      ctx.fillStyle = i % 2 === 0 ? '#f59e0b' : '#ea580c';
      ctx.fillRect(lx, ly, 3, 2);
    }
  }

  for (let my = 48; my < CANVAS_HEIGHT - 36; my += 84) {
    if (my > RIVER_TOP_Y - 24 && my < RIVER_BOTTOM_Y + 34) continue;
    for (let mx = MOUNTAIN_MIN_X + 34; mx < CANVAS_WIDTH - 24; mx += 78) {
      const ox = mx + ((my * 5) % 19);
      const oy = my + ((mx * 3) % 15);
      ctx.fillStyle = `rgba(0,0,0,${shadow.alpha + 0.08})`;
      ctx.fillRect(ox - 24 + Math.round(shadow.dx * 0.7), oy + 14 + Math.min(4, shadow.dy), 48, 6);
      ctx.fillStyle = '#334155';
      ctx.fillRect(ox - 22, oy, 44, 16);
      ctx.fillStyle = '#475569';
      ctx.fillRect(ox - 16, oy - 12, 32, 14);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(ox - 10, oy - 22, 20, 12);
      ctx.fillStyle = isWinter ? '#f8fafc' : '#e2e8f0';
      ctx.fillRect(ox - 6, oy - 27, 12, 7);
      ctx.fillRect(ox - 9, oy - 21, 5, 3);
      ctx.fillRect(ox + 4, oy - 21, 5, 3);
    }
  }

  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.fillRect(10, 8, 128, 15);
  ctx.fillRect(CANVAS_WIDTH - 152, 8, 142, 15);
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
      ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
      ctx.fillRect(rx - 4, ry - 2, 8, 5);
      continue;
    }
    if (r.type === 'food') {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(rx - 5, ry + 5, 10, 2);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(rx - 1, ry - 7, 2, 3);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(rx + 1, ry - 7, 4, 2);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(rx - 5, ry - 4, 10, 9);
      ctx.fillRect(rx - 4, ry - 5, 8, 10);
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(rx - 3, ry - 3, 2, 3);
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
      const core =
        r.type === 'pine_wood'
          ? '#fef08a'
          : r.type === 'maple_wood'
            ? '#fdba74'
            : r.type === 'oak_wood'
              ? '#d6b285'
              : '#fde68a';
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(rx - 7, ry + 4, 14, 2);
      ctx.fillStyle = bark;
      ctx.fillRect(rx - 7, ry - 3, 12, 7);
      ctx.fillStyle = core;
      ctx.fillRect(rx + 4, ry - 3, 4, 7);
    } else if (r.type === 'stone') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(rx - 6, ry + 4, 13, 3);
      ctx.fillStyle = '#475569';
      ctx.fillRect(rx - 6, ry - 2, 12, 6);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(rx - 5, ry - 5, 9, 6);
    } else if (r.type === 'copper') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(rx - 7, ry + 4, 14, 2);
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(rx - 7, ry - 1, 14, 5);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(rx - 5, ry - 4, 10, 5);
      ctx.fillStyle = '#fdba74';
      ctx.fillRect(rx - 4, ry - 3, 7, 2);
    } else if (r.type === 'iron') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(rx - 7, ry + 4, 14, 2);
      ctx.fillStyle = '#475569';
      ctx.fillRect(rx - 7, ry - 1, 14, 5);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(rx - 5, ry - 4, 10, 5);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(rx - 4, ry - 3, 7, 2);
    } else if (r.type === 'silver') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(rx - 7, ry + 4, 14, 2);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(rx - 7, ry - 1, 14, 5);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(rx - 5, ry - 4, 10, 5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(rx - 4, ry - 3, 8, 2);
      if ((glintTick + r.id) % 5 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(rx + 2, ry - 7, 2, 2);
      }
    } else if (r.type === 'gold') {
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.fillRect(rx - 7, ry + 4, 14, 2);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(rx - 7, ry - 1, 14, 5);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(rx - 5, ry - 4, 10, 5);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(rx - 4, ry - 3, 7, 2);
      if ((glintTick + r.id) % 4 === 0) {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(rx - 2, ry - 7, 3, 1);
        ctx.fillRect(rx - 1, ry - 8, 1, 3);
      }
    } else if (r.type === 'coins') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(rx - 4, ry + 5, 8, 2);
      ctx.fillStyle = '#a16207';
      ctx.fillRect(rx - 5, ry - 5, 10, 10);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(rx - 4, ry - 4, 8, 8);
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
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(fx - 8, fy - 4, 16, 10);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(fx - 6, fy - 10 - flicker * 2, 12, 12);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(fx - 3, fy - 12 + flicker * 2, 6, 9);
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
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
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
    ctx.fillStyle = 'rgba(248, 250, 252, 0.72)';
    for (let i = 0; i < 45; i++) {
      const sx = (i * 71 + Math.floor(animPhase * 12)) % CANVAS_WIDTH;
      const sy = (i * 53 + Math.floor(animPhase * 20)) % CANVAS_HEIGHT;
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

import {
  BRIDGE_HALF_WIDTH,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  FOREST_MAX_X,
  MOUNTAIN_MIN_X,
  RIVER_BOTTOM_Y,
  RIVER_TOP_Y,
  ROAD_GRID_SIZE,
  WORLD_CENTER_X,
  isBridgePassable,
} from '../simulation/rules';
import type {
  Animal,
  BiomeType,
  BridgeStructure,
  RoadTile,
  SelectedEntity,
  SimulationState,
} from '../types/simulation';

export const BIOMES: Record<BiomeType, { bg: string; patch: string; name: string }> = {
  grassland: { bg: '#488a35', patch: '#3b752b', name: 'Pradera' },
  forest: { bg: '#2e6432', patch: '#224c27', name: 'Bosque' },
  arid: { bg: '#b58d4c', patch: '#997438', name: 'Árido' },
  tundra: { bg: '#7c96a6', patch: '#607988', name: 'Tundra' },
};

function tileHash(gx: number, gy: number): number {
  const n = Math.imul(gx * 73856093 ^ gy * 19349663, 0x27d4eb2d);
  return (n >>> 0) % 1000;
}

export function drawBiomeTerrain(
  ctx: CanvasRenderingContext2D,
  biomeKey: BiomeType,
  season: SimulationState['season']
): void {
  const biome = BIOMES[biomeKey];
  const isWinter = season === 'Invierno';
  const isAutumn = season === 'Otoño';
  const isArid = biomeKey === 'arid';

  let bg = biome.bg;
  let patch = biome.patch;
  let lightGrass = '#5ea642';
  let bladeDark = '#29571d';

  if (isAutumn && biomeKey !== 'tundra') {
    bg = '#946b31';
    patch = '#7d5824';
    lightGrass = '#b3853f';
    bladeDark = '#5e4017';
  } else if (isWinter) {
    bg = '#86a2b3';
    patch = '#6e8a9c';
    lightGrass = '#b7cddb';
    bladeDark = '#526b7a';
  } else if (isArid) {
    lightGrass = '#c9a261';
    bladeDark = '#785a29';
  } else if (biomeKey === 'forest') {
    lightGrass = '#3f7f3e';
    bladeDark = '#17381b';
  } else if (biomeKey === 'tundra') {
    lightGrass = '#9bb5c4';
    bladeDark = '#4a6270';
  }

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Grilla 16-bit de pasto, variaciones tonales, briznas y flores silvestres
  const step = 32;
  for (let gx = 0; gx < CANVAS_WIDTH; gx += step) {
    for (let gy = 0; gy < CANVAS_HEIGHT; gy += step) {
      const h = tileHash(gx, gy);

      // Manchas tonales de suelo/hierba suave
      if (h < 340) {
        ctx.fillStyle = patch;
        ctx.fillRect(gx + (h % 10), gy + ((h >> 3) % 10), 14, 7);
        ctx.fillRect(gx + (h % 10) + 3, gy + ((h >> 3) % 10) - 2, 8, 2);
      } else if (h < 560) {
        ctx.fillStyle = lightGrass;
        ctx.fillRect(gx + 4 + (h % 8), gy + 6 + (h % 7), 10, 5);
      }

      // Briznas de pasto en V (3 píxeles) o matas de tundra/árido
      if (h % 3 === 0) {
        const bx = gx + 6 + (h % 16);
        const by = gy + 8 + ((h * 7) % 16);
        ctx.fillStyle = bladeDark;
        ctx.fillRect(bx, by + 2, 3, 1);
        ctx.fillStyle = lightGrass;
        ctx.fillRect(bx - 1, by, 1, 2);
        ctx.fillRect(bx + 1, by - 1, 1, 3);
        ctx.fillRect(bx + 3, by, 1, 2);
      }

      // Pequeñas flores silvestres estilo Stardew Valley (solo fuera de invierno y árido)
      if (!isWinter && !isArid && h >= 835) {
        const fx = gx + 5 + (h % 19);
        const fy = gy + 6 + ((h * 3) % 18);
        if (fy < RIVER_TOP_Y - 14 || fy > RIVER_BOTTOM_Y + 14) {
          ctx.fillStyle = bladeDark;
          ctx.fillRect(fx, fy + 2, 2, 1);
          const petalColors = isAutumn
            ? ['#f59e0b', '#fb923c', '#fde047', '#fef3c7']
            : ['#fef08a', '#fef9c3', '#f9a8d4', '#7dd3fc'];
          ctx.fillStyle = petalColors[h % petalColors.length];
          ctx.fillRect(fx, fy, 2, 2);
          ctx.fillRect(fx - 1, fy + 1, 1, 1);
          ctx.fillRect(fx + 2, fy + 1, 1, 1);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(fx, fy + 1, 1, 1);
        }
      }

      // Hojas caídas en otoño o destellos de escarcha en invierno
      if (isAutumn && h > 720 && h < 835) {
        const lx = gx + (h % 22);
        const ly = gy + ((h * 5) % 22);
        ctx.fillStyle = h % 2 === 0 ? '#ea580c' : '#d97706';
        ctx.fillRect(lx, ly, 3, 2);
      } else if (isWinter && h > 760) {
        const sx = gx + (h % 24);
        const sy = gy + ((h * 5) % 24);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(sx, sy, 3, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(sx, sy, 1, 1);
      }
    }
  }

  // Suelo del bosque al oeste con transición escalonada en píxeles
  ctx.fillStyle = isWinter ? 'rgba(30, 58, 52, 0.36)' : 'rgba(18, 61, 26, 0.34)';
  ctx.fillRect(0, 0, FOREST_MAX_X, CANVAS_HEIGHT);
  ctx.fillStyle = isWinter ? '#5d7c87' : isAutumn ? '#735321' : '#2a5a26';
  for (let y = 0; y < CANVAS_HEIGHT; y += 16) {
    const stepEdge = (tileHash(FOREST_MAX_X, y) % 14) - 6;
    ctx.fillRect(FOREST_MAX_X - 8, y, 8 + stepEdge, 14);
  }

  // Laderas rocosas de montaña al este con borde pixelado orgánico
  ctx.fillStyle = isWinter ? 'rgba(71, 85, 105, 0.42)' : 'rgba(51, 65, 85, 0.40)';
  ctx.fillRect(MOUNTAIN_MIN_X, 0, CANVAS_WIDTH - MOUNTAIN_MIN_X, CANVAS_HEIGHT);
  ctx.fillStyle = isWinter ? '#64748b' : '#475569';
  for (let y = 0; y < CANVAS_HEIGHT; y += 16) {
    const stepEdge = (tileHash(MOUNTAIN_MIN_X, y) % 14) - 6;
    ctx.fillRect(MOUNTAIN_MIN_X - stepEdge, y, 10 + stepEdge, 14);
  }
}

export function drawRoads(ctx: CanvasRenderingContext2D, roads: RoadTile[]): void {
  if (roads.length === 0) return;
  const half = Math.round(ROAD_GRID_SIZE / 2);

  for (const r of roads) {
    const rx = Math.round(r.x);
    const ry = Math.round(r.y);
    const rType = r.roadType ?? 'dirt';
    const h = tileHash(rx, ry);

    if (rType === 'dirt') {
      // Borde orgánico de tierra sombreada + centro cálido estilo Stardew
      ctx.fillStyle = '#6b4223';
      ctx.fillRect(rx - half + 1, ry - half, ROAD_GRID_SIZE - 2, ROAD_GRID_SIZE);
      ctx.fillRect(rx - half, ry - half + 1, ROAD_GRID_SIZE, ROAD_GRID_SIZE - 2);

      ctx.fillStyle = '#a87243';
      ctx.fillRect(rx - half + 2, ry - half + 2, ROAD_GRID_SIZE - 4, ROAD_GRID_SIZE - 4);

      ctx.fillStyle = '#c48f5a';
      ctx.fillRect(rx - half + 4, ry - half + 4, ROAD_GRID_SIZE - 8, ROAD_GRID_SIZE - 8);

      // Piedritas orgánicas y textura cálida
      ctx.fillStyle = '#d9a773';
      ctx.fillRect(rx - 5 + (h % 3), ry - 5, 4, 2);
      ctx.fillRect(rx + 1, ry + 2 - (h % 2), 4, 2);
      ctx.fillStyle = '#85532c';
      ctx.fillRect(rx - 7, ry + 3, 3, 2);
      ctx.fillRect(rx + 4, ry - 6, 3, 2);
    } else if (rType === 'reinforced') {
      // Calzada imperial reforzada con bordillo de madera/hierro y losas claras
      ctx.fillStyle = '#3f230e';
      ctx.fillRect(rx - half, ry - half, ROAD_GRID_SIZE, ROAD_GRID_SIZE);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(rx - half + 1, ry - half + 1, ROAD_GRID_SIZE - 2, ROAD_GRID_SIZE - 2);
      ctx.fillStyle = '#334155';
      ctx.fillRect(rx - half + 3, ry - half + 3, ROAD_GRID_SIZE - 6, ROAD_GRID_SIZE - 6);

      // 4 losas talladas con luz superior y sombra inferior
      const blocks = [
        [rx - 7, ry - 7],
        [rx + 1, ry - 7],
        [rx - 7, ry + 1],
        [rx + 1, ry + 1],
      ];
      for (const [bx, by] of blocks) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(bx, by, 6, 6);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(bx, by, 5, 2);
        ctx.fillStyle = '#64748b';
        ctx.fillRect(bx + 1, by + 5, 5, 1);
      }
    } else {
      // Camino empedrado orgánico con adoquines redondeados y mortero oscuro
      ctx.fillStyle = '#334155';
      ctx.fillRect(rx - half + 1, ry - half, ROAD_GRID_SIZE - 2, ROAD_GRID_SIZE);
      ctx.fillRect(rx - half, ry - half + 1, ROAD_GRID_SIZE, ROAD_GRID_SIZE - 2);
      ctx.fillStyle = '#475569';
      ctx.fillRect(rx - half + 2, ry - half + 2, ROAD_GRID_SIZE - 4, ROAD_GRID_SIZE - 4);

      // Adoquines individuales con brillo superior
      const stones = [
        [rx - 8, ry - 7, 7, 5],
        [rx + 1, ry - 6, 7, 5],
        [rx - 7, ry + 1, 8, 6],
        [rx + 2, ry + 2, 6, 5],
      ];
      for (const [sx, sy, sw, sh] of stones) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(sx, sy, sw, sh);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(sx + 1, sy, sw - 2, 2);
      }
    }

    if (r.hasLamp ?? (r.lit && (rx + ry) % 48 === 0)) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(rx + 6, ry - 12, 5, 11);
      ctx.fillStyle = '#334155';
      ctx.fillRect(rx + 7, ry - 11, 3, 9);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(rx + 5, ry - 14, 7, 4);
      ctx.fillStyle = r.lit ? '#f59e0b' : '#475569';
      ctx.fillRect(rx + 6, ry - 13, 5, 2);
      if (r.lit) {
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(rx + 7, ry - 13, 3, 2);
      }
    }
  }
}

export function drawRiverWater(
  ctx: CanvasRenderingContext2D,
  minute: number,
  season: SimulationState['season'],
  animPhase: number
): void {
  const isWinter = season === 'Invierno';

  // Borde de pasto colgante sobre las riberas
  ctx.fillStyle = isWinter ? '#64748b' : '#29571d';
  ctx.fillRect(0, RIVER_TOP_Y - 10, CANVAS_WIDTH, 3);
  ctx.fillRect(0, RIVER_BOTTOM_Y + 7, CANVAS_WIDTH, 3);

  // Riberas arenosas / terrosas escalonadas con piedritas
  ctx.fillStyle = isWinter ? '#cbd5e1' : '#cfa06b';
  ctx.fillRect(0, RIVER_TOP_Y - 8, CANVAS_WIDTH, RIVER_BOTTOM_Y - RIVER_TOP_Y + 16);
  ctx.fillStyle = isWinter ? '#94a3b8' : '#9c7144';
  ctx.fillRect(0, RIVER_TOP_Y - 4, CANVAS_WIDTH, RIVER_BOTTOM_Y - RIVER_TOP_Y + 8);
  ctx.fillStyle = isWinter ? '#64748b' : '#694628';
  ctx.fillRect(0, RIVER_TOP_Y - 2, CANVAS_WIDTH, RIVER_BOTTOM_Y - RIVER_TOP_Y + 4);

  // Piedritas de orilla en píxeles enteros
  for (let px = 8; px < CANVAS_WIDTH; px += 36) {
    const h = tileHash(px, RIVER_TOP_Y);
    ctx.fillStyle = isWinter ? '#e2e8f0' : '#b88958';
    ctx.fillRect(px + (h % 8), RIVER_TOP_Y - 6, 4, 2);
    ctx.fillRect(px + ((h * 3) % 10), RIVER_BOTTOM_Y + 4, 5, 2);
  }

  // Cauce central profundo (preserva color base exacto en RIVER_TOP_Y)
  ctx.fillStyle = isWinter ? '#7dd3fc' : '#1d4ed8';
  ctx.fillRect(0, RIVER_TOP_Y, CANVAS_WIDTH, RIVER_BOTTOM_Y - RIVER_TOP_Y);

  // Profundidad sombreada bajo las riberas
  ctx.fillStyle = isWinter ? '#38bdf8' : '#1e3a8a';
  ctx.fillRect(0, RIVER_TOP_Y, CANVAS_WIDTH, 5);
  ctx.fillRect(0, RIVER_BOTTOM_Y - 5, CANVAS_WIDTH, 5);

  // Corriente principal luminosa
  ctx.fillStyle = isWinter ? '#93c5fd' : '#2563eb';
  ctx.fillRect(0, RIVER_TOP_Y + 10, CANVAS_WIDTH, RIVER_BOTTOM_Y - RIVER_TOP_Y - 20);
  ctx.fillStyle = isWinter ? '#bae6fd' : '#3b82f6';
  ctx.fillRect(0, RIVER_TOP_Y + 20, CANVAS_WIDTH, RIVER_BOTTOM_Y - RIVER_TOP_Y - 40);

  // Espuma animada en píxeles enteros en las orillas
  ctx.fillStyle = isWinter ? '#f8fafc' : '#bae6fd';
  for (let sx = 0; sx < CANVAS_WIDTH; sx += 26) {
    const off = Math.round(Math.sin(animPhase * 2 + sx * 0.05) * 2);
    ctx.fillRect(sx + off, RIVER_TOP_Y + 2, 10, 1);
    ctx.fillRect(sx - off + 4, RIVER_BOTTOM_Y - 3, 10, 1);
  }

  // Reflejos y ondas en píxeles animados
  const shift = Math.round(minute * 1.4 + animPhase * 8) % 48;
  for (let rx = -48 + shift; rx < CANVAS_WIDTH + 48; rx += 48) {
    const irx = Math.round(rx);
    ctx.fillStyle = isWinter ? '#e0f2fe' : '#60a5fa';
    ctx.fillRect(irx, RIVER_TOP_Y + 9, 14, 2);
    ctx.fillRect(irx + 18, RIVER_TOP_Y + 28, 16, 2);
    ctx.fillRect(irx + 6, RIVER_TOP_Y + 46, 12, 2);

    // Destellos especulares nítidos 1-2px
    ctx.fillStyle = isWinter ? '#ffffff' : '#bae6fd';
    ctx.fillRect(irx + 4, RIVER_TOP_Y + 9, 4, 1);
    ctx.fillRect(irx + 22, RIVER_TOP_Y + 28, 5, 1);
    ctx.fillRect(irx + 10, RIVER_TOP_Y + 46, 3, 1);
  }

  // Placas de hielo flotantes en invierno
  if (isWinter) {
    for (let ix = 32; ix < CANVAS_WIDTH - 40; ix += 140) {
      const drift = Math.round(Math.sin(animPhase + ix) * 4);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(ix + drift, RIVER_TOP_Y + 18, 22, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ix + drift + 2, RIVER_TOP_Y + 19, 16, 3);
    }
  }

  // Neblina matinal suave sobre el río al amanecer (05:30 - 08:40)
  if (minute >= 330 && minute <= 520) {
    const mistDrift = Math.round(Math.sin(animPhase * 0.7) * 18);
    ctx.fillStyle = 'rgba(226, 232, 240, 0.14)';
    for (let mx = -40 + mistDrift; mx < CANVAS_WIDTH; mx += 160) {
      ctx.fillRect(mx, RIVER_TOP_Y - 6, 96, 18);
      ctx.fillRect(mx + 44, RIVER_BOTTOM_Y - 12, 88, 16);
    }
  }

  // Carteles discretos Zona Norte / Zona Sur con coordenadas enteras
  const northLabelX = Math.round(WORLD_CENTER_X - 42);
  const southLabelX = Math.round(WORLD_CENTER_X - 38);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
  ctx.fillRect(northLabelX, RIVER_TOP_Y - 24, 84, 13);
  ctx.fillRect(southLabelX, RIVER_BOTTOM_Y + 11, 76, 13);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ZONA NORTE', Math.round(WORLD_CENTER_X), RIVER_TOP_Y - 14);
  ctx.fillText('ZONA SUR', Math.round(WORLD_CENTER_X), RIVER_BOTTOM_Y + 21);
}

export function drawFishUnit(
  ctx: CanvasRenderingContext2D,
  animal: Animal,
  isSelected: boolean,
  animPhase: number
): void {
  const x = Math.round(animal.x);
  const y = Math.round(animal.y);
  const dir = animal.vx >= 0 ? 1 : -1;

  ctx.save();
  ctx.translate(x, y);

  // Ondas en el agua alrededor de cada pez
  const rippleRx = Math.round(6 + ((animPhase * 4 + animal.id) % 6));
  const rippleRy = Math.max(2, Math.round(rippleRx * 0.45));
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, rippleRx, rippleRy, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.scale(dir, 1);

  const v = animal.fishVariant ?? 'trout';
  if (v === 'trout') {
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(-6, -2, 10, 4);
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(-8, -3, 3, 6);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-2, -1, 2, 1);
  } else if (v === 'salmon') {
    ctx.fillStyle = '#fb7185';
    ctx.fillRect(-6, -2, 11, 4);
    ctx.fillStyle = '#be123c';
    ctx.fillRect(-9, -3, 3, 6);
  } else if (v === 'goldfish') {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-5, -3, 9, 5);
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-9, -4, 4, 7);
  } else {
    ctx.fillStyle = '#4d7c0f';
    ctx.fillRect(-6, -3, 11, 5);
    ctx.fillStyle = '#365314';
    ctx.fillRect(-9, -2, 3, 4);
  }

  if (isSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-12, -14, 24, 24);
  }

  ctx.restore();
}

export function drawRiverFish(
  ctx: CanvasRenderingContext2D,
  animals: Animal[],
  selectedEntity: SelectedEntity | null,
  animPhase: number
): void {
  const fishList = animals
    .filter((a) => a.type === 'fish')
    .sort((a, b) => a.y - b.y);
  for (const fish of fishList) {
    const isSel = selectedEntity?.kind === 'animal' && selectedEntity.id === fish.id;
    drawFishUnit(ctx, fish, isSel, animPhase);
  }
}

export function drawBridge(
  ctx: CanvasRenderingContext2D,
  bridge: BridgeStructure | null,
  isBridgeSelected: boolean
): void {
  if (!bridge) return;
  const passable = isBridgePassable({ bridge });
  const bxCenter = Math.round(bridge.x);
  const bxMin = Math.round(bxCenter - BRIDGE_HALF_WIDTH);
  const bridgeW = Math.round(BRIDGE_HALF_WIDTH * 2);

  // Sombra proyectada sobre el agua (tapa los peces que pasan por debajo)
  ctx.fillStyle = 'rgba(0,0,0,0.36)';
  ctx.fillRect(bxMin - 3, RIVER_TOP_Y - 2, bridgeW + 6, RIVER_BOTTOM_Y - RIVER_TOP_Y + 12);

  // Pilotes y estribos de piedra en riberas norte/sur
  ctx.fillStyle = '#334155';
  ctx.fillRect(bxMin - 4, RIVER_TOP_Y - 9, bridgeW + 8, 6);
  ctx.fillRect(bxMin - 4, RIVER_BOTTOM_Y + 3, bridgeW + 8, 6);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(bxMin - 3, RIVER_TOP_Y - 8, 6, RIVER_BOTTOM_Y - RIVER_TOP_Y + 16);
  ctx.fillRect(bxMin + bridgeW - 3, RIVER_TOP_Y - 8, 6, RIVER_BOTTOM_Y - RIVER_TOP_Y + 16);

  // Tablero base (mantiene color base exacto para consistencia de capas)
  ctx.fillStyle = passable ? '#78350f' : '#450a0a';
  ctx.fillRect(bxMin, RIVER_TOP_Y - 6, bridgeW, RIVER_BOTTOM_Y - RIVER_TOP_Y + 12);

  // Tablones horizontales 16-bit con vetas y clavos
  for (let by = RIVER_TOP_Y - 4; by <= RIVER_BOTTOM_Y + 2; by += 6) {
    if (!passable && by >= RIVER_TOP_Y + 16 && by <= RIVER_BOTTOM_Y - 16) {
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(bxMin + 8, by, bridgeW - 16, 4);
      continue;
    }
    ctx.fillStyle = passable ? '#92400e' : '#7f1d1d';
    ctx.fillRect(bxMin + 3, by, bridgeW - 6, 4);
    ctx.fillStyle = passable ? '#b45309' : '#991b1b';
    ctx.fillRect(bxMin + 4, by, bridgeW - 8, 2);
    ctx.fillStyle = '#451a03';
    ctx.fillRect(bxMin + 5, by + 1, 1, 2);
    ctx.fillRect(bxMin + bridgeW - 6, by + 1, 1, 2);
  }

  // Barandillas de madera con postes rematados
  ctx.fillStyle = '#451a03';
  ctx.fillRect(bxMin, RIVER_TOP_Y - 6, 4, RIVER_BOTTOM_Y - RIVER_TOP_Y + 12);
  ctx.fillRect(bxMin + bridgeW - 4, RIVER_TOP_Y - 6, 4, RIVER_BOTTOM_Y - RIVER_TOP_Y + 12);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(bxMin + 1, RIVER_TOP_Y - 6, 2, RIVER_BOTTOM_Y - RIVER_TOP_Y + 12);
  ctx.fillRect(bxMin + bridgeW - 3, RIVER_TOP_Y - 6, 2, RIVER_BOTTOM_Y - RIVER_TOP_Y + 12);

  for (let py = RIVER_TOP_Y - 6; py <= RIVER_BOTTOM_Y + 4; py += 16) {
    ctx.fillStyle = '#451a03';
    ctx.fillRect(bxMin - 1, py, 6, 5);
    ctx.fillRect(bxMin + bridgeW - 5, py, 6, 5);
    ctx.fillStyle = '#d97706';
    ctx.fillRect(bxMin, py + 1, 4, 2);
    ctx.fillRect(bxMin + bridgeW - 4, py + 1, 4, 2);
  }

  if (!passable) {
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(bxMin + 2, RIVER_TOP_Y - 6, bridgeW - 4, 3);
    ctx.fillRect(bxMin + 2, RIVER_BOTTOM_Y + 3, bridgeW - 4, 3);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(bxMin + 8, RIVER_TOP_Y - 6, 6, 3);
    ctx.fillRect(bxMin + bridgeW - 14, RIVER_TOP_Y - 6, 6, 3);
    ctx.fillRect(bxMin + 8, RIVER_BOTTOM_Y + 3, 6, 3);
    ctx.fillRect(bxMin + bridgeW - 14, RIVER_BOTTOM_Y + 3, 6, 3);
  }

  if (!passable || bridge.maintenanceStatus !== 'ok') {
    ctx.fillStyle = !passable ? 'rgba(153, 27, 27, 0.92)' : 'rgba(180, 83, 9, 0.92)';
    ctx.fillRect(bxCenter - 28, RIVER_TOP_Y + 22, 56, 11);
    ctx.fillStyle = '#fef2f2';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(!passable ? 'BLOQUEADO' : 'DEUDA MANT.', bxCenter, RIVER_TOP_Y + 30);
  }
  if (isBridgeSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(bxMin - 4, RIVER_TOP_Y - 10, bridgeW + 8, RIVER_BOTTOM_Y - RIVER_TOP_Y + 20);
  }
}

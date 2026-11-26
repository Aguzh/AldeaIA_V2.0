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
  grassland: { bg: '#2f6834', patch: '#255529', name: 'Pradera' },
  forest: { bg: '#214d2c', patch: '#173a20', name: 'Bosque' },
  arid: { bg: '#a38047', patch: '#8a6b38', name: 'Árido' },
  tundra: { bg: '#6e8796', patch: '#5a7280', name: 'Tundra' },
};

export function drawBiomeTerrain(
  ctx: CanvasRenderingContext2D,
  biomeKey: BiomeType,
  season: SimulationState['season']
): void {
  const biome = BIOMES[biomeKey];
  const isWinter = season === 'Invierno';

  let bg = biome.bg;
  let patch = biome.patch;
  if (season === 'Otoño' && biomeKey !== 'tundra') {
    bg = '#7c5d2c';
    patch = '#664a20';
  } else if (isWinter) {
    bg = '#627c8c';
    patch = '#85a1b2';
  }

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = patch;
  for (let gx = 0; gx < CANVAS_WIDTH; gx += 64) {
    for (let gy = 16; gy < CANVAS_HEIGHT; gy += 64) {
      if ((gx + gy) % 128 === 0) ctx.fillRect(gx + 10, gy + 10, 18, 8);
      else ctx.fillRect(gx + 34, gy + 38, 10, 6);
    }
  }

  // Fondos de bioma lateral (bosque al oeste, montañas al este)
  ctx.fillStyle = isWinter ? 'rgba(20, 48, 42, 0.45)' : 'rgba(13, 52, 24, 0.42)';
  ctx.fillRect(0, 0, FOREST_MAX_X, CANVAS_HEIGHT);

  ctx.fillStyle = isWinter ? 'rgba(71, 85, 105, 0.46)' : 'rgba(51, 65, 85, 0.46)';
  ctx.fillRect(MOUNTAIN_MIN_X, 0, CANVAS_WIDTH - MOUNTAIN_MIN_X, CANVAS_HEIGHT);
}

export function drawRoads(ctx: CanvasRenderingContext2D, roads: RoadTile[]): void {
  if (roads.length === 0) return;
  const half = ROAD_GRID_SIZE / 2;
  for (const r of roads) {
    const rType = r.roadType ?? 'dirt';
    if (rType === 'dirt') {
      ctx.fillStyle = '#6b4724';
      ctx.fillRect(r.x - half, r.y - half, ROAD_GRID_SIZE, ROAD_GRID_SIZE);
      ctx.fillStyle = '#8b5e34';
      ctx.fillRect(r.x - half + 2, r.y - half + 2, ROAD_GRID_SIZE - 4, ROAD_GRID_SIZE - 4);
      ctx.fillStyle = '#a47549';
      ctx.fillRect(r.x - 6, r.y - 5, 4, 3);
      ctx.fillRect(r.x + 2, r.y + 2, 5, 3);
    } else if (rType === 'reinforced') {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(r.x - half, r.y - half, ROAD_GRID_SIZE, ROAD_GRID_SIZE);
      ctx.fillStyle = '#475569';
      ctx.fillRect(r.x - half + 3, r.y - half + 3, ROAD_GRID_SIZE - 6, ROAD_GRID_SIZE - 6);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(r.x - 6, r.y - 6, 5, 5);
      ctx.fillRect(r.x + 1, r.y - 6, 5, 5);
      ctx.fillRect(r.x - 6, r.y + 1, 5, 5);
      ctx.fillRect(r.x + 1, r.y + 1, 5, 5);
    } else {
      ctx.fillStyle = '#475569';
      ctx.fillRect(r.x - half, r.y - half, ROAD_GRID_SIZE, ROAD_GRID_SIZE);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(r.x - half + 2, r.y - half + 2, ROAD_GRID_SIZE - 4, ROAD_GRID_SIZE - 4);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(r.x - 8, r.y - 7, 6, 5);
      ctx.fillRect(r.x + 2, r.y - 5, 6, 5);
      ctx.fillRect(r.x - 6, r.y + 2, 7, 5);
      ctx.fillRect(r.x + 3, r.y + 3, 5, 4);
    }
    if (r.hasLamp ?? (r.lit && (r.x + r.y) % 48 === 0)) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(r.x + 7, r.y - 10, 3, 8);
      ctx.fillStyle = r.lit ? '#facc15' : '#64748b';
      ctx.fillRect(r.x + 6, r.y - 12, 5, 3);
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
  // Riberas arenosas / empedradas superior e inferior
  ctx.fillStyle = isWinter ? '#cbd5e1' : '#b48a5a';
  ctx.fillRect(0, RIVER_TOP_Y - 7, CANVAS_WIDTH, RIVER_BOTTOM_Y - RIVER_TOP_Y + 14);
  ctx.fillStyle = isWinter ? '#94a3b8' : '#855e3c';
  ctx.fillRect(0, RIVER_TOP_Y - 3, CANVAS_WIDTH, RIVER_BOTTOM_Y - RIVER_TOP_Y + 6);

  // Cauce central profundo
  ctx.fillStyle = isWinter ? '#7dd3fc' : '#1d4ed8';
  ctx.fillRect(0, RIVER_TOP_Y, CANVAS_WIDTH, RIVER_BOTTOM_Y - RIVER_TOP_Y);

  ctx.fillStyle = isWinter ? '#93c5fd' : '#2563eb';
  ctx.fillRect(0, RIVER_TOP_Y + 12, CANVAS_WIDTH, RIVER_BOTTOM_Y - RIVER_TOP_Y - 24);

  // Espuma sutil en las orillas
  ctx.fillStyle = isWinter ? 'rgba(248, 250, 252, 0.42)' : 'rgba(186, 230, 253, 0.25)';
  for (let sx = 0; sx < CANVAS_WIDTH; sx += 28) {
    const off = Math.round(Math.sin(animPhase * 2 + sx * 0.05) * 2);
    ctx.fillRect(sx + off, RIVER_TOP_Y + 1, 14, 2);
    ctx.fillRect(sx - off, RIVER_BOTTOM_Y - 3, 14, 2);
  }

  const shift = Math.floor(minute * 1.4 + animPhase * 8) % 48;
  ctx.fillStyle = isWinter ? '#e0f2fe' : '#60a5fa';
  for (let rx = -48 + shift; rx < CANVAS_WIDTH + 48; rx += 48) {
    ctx.fillRect(rx, RIVER_TOP_Y + 8, 16, 3);
    ctx.fillRect(rx + 20, RIVER_TOP_Y + 28, 18, 3);
    ctx.fillRect(rx + 8, RIVER_TOP_Y + 48, 14, 2);
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

  // Etiquetas sutiles Zona Norte / Zona Sur para orientar al jugador
  ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
  ctx.fillRect(WORLD_CENTER_X - 42, RIVER_TOP_Y - 24, 84, 13);
  ctx.fillRect(WORLD_CENTER_X - 38, RIVER_BOTTOM_Y + 11, 76, 13);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ZONA NORTE', WORLD_CENTER_X, RIVER_TOP_Y - 14);
  ctx.fillText('ZONA SUR', WORLD_CENTER_X, RIVER_BOTTOM_Y + 21);
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
  const rippleR = 6 + ((animPhase * 4 + animal.id) % 6);
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, rippleR, rippleR * 0.45, 0, 0, Math.PI * 2);
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
  const bxMin = bridge.x - BRIDGE_HALF_WIDTH;
  const bridgeW = BRIDGE_HALF_WIDTH * 2;
  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(bxMin - 3, RIVER_TOP_Y - 2, bridgeW + 6, RIVER_BOTTOM_Y - RIVER_TOP_Y + 10);
  ctx.fillStyle = '#475569';
  ctx.fillRect(bxMin - 3, RIVER_TOP_Y - 8, 6, RIVER_BOTTOM_Y - RIVER_TOP_Y + 16);
  ctx.fillRect(bxMin + bridgeW - 3, RIVER_TOP_Y - 8, 6, RIVER_BOTTOM_Y - RIVER_TOP_Y + 16);
  ctx.fillStyle = passable ? '#78350f' : '#450a0a';
  ctx.fillRect(bxMin, RIVER_TOP_Y - 6, bridgeW, RIVER_BOTTOM_Y - RIVER_TOP_Y + 12);
  ctx.fillStyle = passable ? '#92400e' : '#7f1d1d';
  for (let by = RIVER_TOP_Y - 4; by <= RIVER_BOTTOM_Y + 2; by += 6) {
    // Si el puente está bloqueado/inoperativo, deja huecos rotos en el centro dejando ver el agua
    if (!passable && by >= RIVER_TOP_Y + 16 && by <= RIVER_BOTTOM_Y - 16) {
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(bxMin + 8, by, bridgeW - 16, 4);
      ctx.fillStyle = '#7f1d1d';
      continue;
    }
    ctx.fillRect(bxMin + 3, by, bridgeW - 6, 4);
  }
  ctx.fillStyle = '#451a03';
  ctx.fillRect(bxMin, RIVER_TOP_Y - 6, 4, RIVER_BOTTOM_Y - RIVER_TOP_Y + 12);
  ctx.fillRect(bxMin + bridgeW - 4, RIVER_TOP_Y - 6, 4, RIVER_BOTTOM_Y - RIVER_TOP_Y + 12);

  if (!passable) {
    // Barrera roja y blanca en ambos extremos indicando paso cerrado
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
    ctx.fillRect(bridge.x - 28, RIVER_TOP_Y + 22, 56, 11);
    ctx.fillStyle = '#fef2f2';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(!passable ? 'BLOQUEADO' : 'DEUDA MANT.', bridge.x, RIVER_TOP_Y + 30);
  }
  if (isBridgeSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(bxMin - 4, RIVER_TOP_Y - 10, bridgeW + 8, RIVER_BOTTOM_Y - RIVER_TOP_Y + 20);
  }
}

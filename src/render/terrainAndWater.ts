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
  DistrictZone,
  EraId,
  RoadTile,
  SelectedEntity,
  SimulationState,
} from '../types/simulation';
import { drawSpriteFrame, getCutoutSprite } from './spriteLoader';

export const BIOMES: Record<BiomeType, { bg: string; patch: string; name: string }> = {
  grassland: { bg: '#488a35', patch: '#3b752b', name: 'Pradera' },
  forest: { bg: '#2e6432', patch: '#224c27', name: 'Bosque' },
  arid: { bg: '#b58d4c', patch: '#997438', name: 'Árido' },
  tundra: { bg: '#7c96a6', patch: '#607988', name: 'Tundra' },
};

const TERRAIN_TILES = {
  grassLight: { sx: 30, sy: 36, sw: 148, sh: 150 },
  grassDeep: { sx: 220, sy: 36, sw: 152, sh: 150 },
  autumn: { sx: 420, sy: 36, sw: 150, sh: 150 },
  snow: { sx: 624, sy: 36, sw: 154, sh: 150 },
  forestFloor: { sx: 832, sy: 36, sw: 154, sh: 150 },
  sandLight: { sx: 30, sy: 238, sw: 148, sh: 154 },
  sandWarm: { sx: 220, sy: 238, sw: 148, sh: 154 },
  dirtCore: { sx: 884, sy: 290, sw: 52, sh: 52 },
  waterA: { sx: 90, sy: 444, sw: 76, sh: 62 },
  waterB: { sx: 174, sy: 444, sw: 78, sh: 62 },
  waterC: { sx: 260, sy: 444, sw: 76, sh: 62 },
  bridgeNS: { sx: 427, sy: 437, sw: 86, sh: 74 },
  fishOrange: { sx: 859, sy: 490, sw: 32, sh: 25 },
  lilypad: { sx: 952, sy: 537, sw: 48, sh: 41 },
} as const;

const DOG_FISH_SPRITES = {
  striped: [
    { sx: 39, sy: 291, sw: 157, sh: 128 },
    { sx: 267, sy: 291, sw: 156, sh: 128 },
    { sx: 497, sy: 291, sw: 157, sh: 128 },
    { sx: 725, sy: 290, sw: 157, sh: 129 },
    { sx: 956, sy: 291, sw: 158, sh: 128 },
  ],
  trout: [
    { sx: 26, sy: 578, sw: 181, sh: 104 },
    { sx: 252, sy: 578, sw: 182, sh: 104 },
    { sx: 483, sy: 578, sw: 183, sh: 104 },
    { sx: 711, sy: 578, sw: 183, sh: 104 },
    { sx: 942, sy: 578, sw: 184, sh: 104 },
  ],
} as const;

const FOREST_FLOOR_TILES = {
  leaves: { sx: 16, sy: 16, sw: 88, sh: 90 },
  moss: { sx: 112, sy: 16, sw: 88, sh: 90 },
} as const;

function tileHash(gx: number, gy: number): number {
  const n = Math.imul((gx * 73856093) ^ (gy * 19349663), 0x27d4eb2d);
  return (n >>> 0) % 1000;
}

export function drawBiomeTerrain(
  ctx: CanvasRenderingContext2D,
  biomeKey: BiomeType,
  season: SimulationState['season']
): void {
  ctx.imageSmoothingEnabled = false;
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

  const primaryRect = isWinter
    ? TERRAIN_TILES.snow
    : isAutumn && biomeKey !== 'tundra'
      ? TERRAIN_TILES.autumn
      : isArid
        ? TERRAIN_TILES.sandLight
        : biomeKey === 'tundra'
          ? TERRAIN_TILES.snow
          : biomeKey === 'forest'
            ? TERRAIN_TILES.forestFloor
            : TERRAIN_TILES.grassLight;

  const altRect = isWinter
    ? TERRAIN_TILES.snow
    : isAutumn && biomeKey !== 'tundra'
      ? TERRAIN_TILES.autumn
      : isArid
        ? TERRAIN_TILES.sandWarm
        : biomeKey === 'grassland'
          ? TERRAIN_TILES.grassDeep
          : primaryRect;

  const tileA = getCutoutSprite('terrain', primaryRect.sx, primaryRect.sy, primaryRect.sw, primaryRect.sh, {
    mode: 'opaque',
  });
  const tileB = getCutoutSprite('terrain', altRect.sx, altRect.sy, altRect.sw, altRect.sh, {
    mode: 'opaque',
  });
  const forestTile = getCutoutSprite(
    'terrain',
    TERRAIN_TILES.forestFloor.sx,
    TERRAIN_TILES.forestFloor.sy,
    TERRAIN_TILES.forestFloor.sw,
    TERRAIN_TILES.forestFloor.sh,
    { mode: 'opaque' }
  );

  const forestLeavesTile = getCutoutSprite(
    'forest',
    FOREST_FLOOR_TILES.leaves.sx,
    FOREST_FLOOR_TILES.leaves.sy,
    FOREST_FLOOR_TILES.leaves.sw,
    FOREST_FLOOR_TILES.leaves.sh,
    { mode: 'opaque' }
  );
  const forestMossTile = getCutoutSprite(
    'forest',
    FOREST_FLOOR_TILES.moss.sx,
    FOREST_FLOOR_TILES.moss.sy,
    FOREST_FLOOR_TILES.moss.sw,
    FOREST_FLOOR_TILES.moss.sh,
    { mode: 'opaque' }
  );

  if (tileA && tileB) {
    const tileSize = 48;
    for (let gx = 0; gx < CANVAS_WIDTH; gx += tileSize) {
      for (let gy = 0; gy < CANVAS_HEIGHT; gy += tileSize) {
        const h = tileHash(gx, gy);
        const chosen = isArid && h % 3 === 0 ? tileB : tileA;
        drawSpriteFrame(ctx, chosen, gx, gy, tileSize, tileSize);

        if (biomeKey === 'tundra' && !isWinter) {
          ctx.fillStyle = 'rgba(74, 98, 112, 0.28)';
          ctx.fillRect(gx, gy, tileSize, tileSize);
        }
      }
    }

    // Detalles orgánicos en la pradera central y zona norte (flores, briznas de hierba y piedritas)
    const isNorthZone = (py: number) => py < RIVER_TOP_Y - 12;
    for (let gx = FOREST_MAX_X + 8; gx < MOUNTAIN_MIN_X - 16; gx += 32) {
      for (let gy = 20; gy < CANVAS_HEIGHT - 16; gy += 32) {
        if (gy >= RIVER_TOP_Y - 14 && gy <= RIVER_BOTTOM_Y + 14) continue;
        const h = tileHash(gx + 17, gy + 31);
        const northBoost = isNorthZone(gy) ? 140 : 0;
        const fx = gx + 4 + (h % 20);
        const fy = gy + 4 + ((h * 5) % 20);

        if (h % 5 <= 1 || (isNorthZone(gy) && h % 3 === 0)) {
          // Brizna / mata de hierba 16-bit
          ctx.fillStyle = bladeDark;
          ctx.fillRect(fx, fy + 2, 4, 1);
          ctx.fillStyle = lightGrass;
          ctx.fillRect(fx, fy, 1, 2);
          ctx.fillRect(fx + 2, fy - 1, 1, 3);
          ctx.fillRect(fx + 3, fy + 1, 1, 1);
        }

        if (!isWinter && !isArid && h + northBoost >= 720) {
          // Parche de flores silvestres
          const petals = isAutumn
            ? ['#f59e0b', '#fb923c', '#fde047']
            : ['#fef08a', '#fef9c3', '#f9a8d4', '#7dd3fc'];
          ctx.fillStyle = bladeDark;
          ctx.fillRect(fx + 4, fy + 4, 2, 1);
          ctx.fillStyle = petals[h % petals.length];
          ctx.fillRect(fx + 4, fy + 2, 2, 2);
          ctx.fillRect(fx + 3, fy + 3, 1, 1);
          ctx.fillRect(fx + 6, fy + 3, 1, 1);
          if (h % 2 === 0) {
            ctx.fillStyle = petals[(h + 1) % petals.length];
            ctx.fillRect(fx + 9, fy + 1, 2, 2);
          }
        } else if (h % 13 === 0) {
          // Pequeña piedra o trébol en el pasto
          ctx.fillStyle = isWinter ? '#cbd5e1' : 'rgba(100, 116, 139, 0.72)';
          ctx.fillRect(fx + 6, fy + 3, 3, 2);
          ctx.fillStyle = 'rgba(226, 232, 240, 0.55)';
          ctx.fillRect(fx + 6, fy + 3, 2, 1);
        }
      }
    }

    // Zona oeste de bosque con suelo musgoso, hojarasca continua y lindero escalonado irregular
    if ((forestTile || forestLeavesTile) && !isWinter) {
      for (let gy = 0; gy < CANVAS_HEIGHT; gy += 24) {
        const edgeJitter = (tileHash(FOREST_MAX_X, gy) % 34) - 14;
        const maxColX = FOREST_MAX_X + edgeJitter;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, gy, maxColX, 24);
        ctx.clip();
        for (let gx = 0; gx < maxColX; gx += tileSize) {
          const h = tileHash(gx, Math.floor(gy / tileSize) * tileSize);
          const fTile =
            isAutumn
              ? forestLeavesTile ?? tileA
              : h % 3 === 0 && forestLeavesTile
                ? forestLeavesTile
                : h % 3 === 1 && forestMossTile
                  ? forestMossTile
                  : forestTile ?? tileA;
          drawSpriteFrame(ctx, fTile, gx, Math.floor(gy / tileSize) * tileSize, tileSize, tileSize);
        }
        ctx.restore();

        // Manchas orgánicas de hojarasca y musgo saltando hacia el pasto para suavizar el corte
        if (gy < RIVER_TOP_Y - 12 || gy > RIVER_BOTTOM_Y + 12) {
          const spillSeed = tileHash(FOREST_MAX_X + 7, gy);
          const spillX = maxColX + 4 + (spillSeed % 16);
          ctx.fillStyle = isAutumn ? 'rgba(180, 83, 9, 0.45)' : 'rgba(34, 84, 41, 0.36)';
          ctx.fillRect(spillX, gy + 4, 8, 5);
          ctx.fillStyle = isAutumn ? 'rgba(217, 119, 6, 0.55)' : 'rgba(74, 222, 128, 0.24)';
          ctx.fillRect(spillX + 3, gy + 11, 5, 3);
        }
      }
    }
  } else {
    // Fallback procedural pixel-art 16-bit
    const step = 32;
    for (let gx = 0; gx < CANVAS_WIDTH; gx += step) {
      for (let gy = 0; gy < CANVAS_HEIGHT; gy += step) {
        const h = tileHash(gx, gy);

        if (h < 340) {
          ctx.fillStyle = patch;
          ctx.fillRect(gx + (h % 10), gy + ((h >> 3) % 10), 14, 7);
          ctx.fillRect(gx + (h % 10) + 3, gy + ((h >> 3) % 10) - 2, 8, 2);
        } else if (h < 560) {
          ctx.fillStyle = lightGrass;
          ctx.fillRect(gx + 4 + (h % 8), gy + 6 + (h % 7), 10, 5);
        }

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
  }

  // Suelo del bosque al oeste con sombra de dosel continua y lindero escalonado orgánico
  ctx.fillStyle = isWinter ? 'rgba(30, 58, 52, 0.36)' : isAutumn ? 'rgba(72, 46, 16, 0.28)' : 'rgba(12, 46, 20, 0.32)';
  ctx.fillRect(0, 0, FOREST_MAX_X - 22, CANVAS_HEIGHT);
  ctx.fillStyle = isWinter ? 'rgba(15, 38, 34, 0.24)' : 'rgba(8, 30, 14, 0.22)';
  ctx.fillRect(0, 0, Math.round(FOREST_MAX_X * 0.64), CANVAS_HEIGHT);
  for (let y = 0; y < CANVAS_HEIGHT; y += 16) {
    const stepEdge = (tileHash(FOREST_MAX_X, y) % 26) + 8;
    ctx.fillStyle = isWinter ? 'rgba(30, 58, 52, 0.34)' : isAutumn ? 'rgba(72, 46, 16, 0.26)' : 'rgba(12, 46, 20, 0.30)';
    ctx.fillRect(FOREST_MAX_X - 22, y, stepEdge, 16);
    ctx.fillStyle = isWinter ? 'rgba(93, 124, 135, 0.42)' : isAutumn ? 'rgba(115, 83, 33, 0.42)' : 'rgba(36, 82, 34, 0.42)';
    ctx.fillRect(FOREST_MAX_X - 22 + stepEdge, y + 2, 10, 12);
  }

  // Plataforma rocosa de cordillera al este con falda escarpada escalonada (evitando el cauce del río)
  const drawRockyBand = (topY: number, height: number) => {
    if (height <= 0) return;
    ctx.fillStyle = isWinter ? '#5b6c80' : '#475569';
    ctx.fillRect(MOUNTAIN_MIN_X + 14, topY, CANVAS_WIDTH - (MOUNTAIN_MIN_X + 14), height);
    ctx.fillStyle = isWinter ? '#475569' : '#334155';
    ctx.fillRect(MOUNTAIN_MIN_X + 44, topY, CANVAS_WIDTH - (MOUNTAIN_MIN_X + 44), height);

    for (let ry = topY; ry < topY + height - 8; ry += 16) {
      const hEdge = tileHash(MOUNTAIN_MIN_X, ry);
      const stepOut = (hEdge % 30) - 12; // varia entre MOUNTAIN_MIN_X - 12 y + 18
      const startX = MOUNTAIN_MIN_X + stepOut;
      ctx.fillStyle = isWinter ? '#64748b' : '#526071';
      ctx.fillRect(startX, ry, MOUNTAIN_MIN_X + 22 - startX, 16);
      ctx.fillStyle = isWinter ? '#94a3b8' : '#64748b';
      ctx.fillRect(startX - 5, ry + 3, 7, 8);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(startX - 3, ry + 11, 5, 2);
      // Gravilla y piedritas de transición sobre el pasto al oeste
      ctx.fillStyle = isWinter ? 'rgba(148, 163, 184, 0.55)' : 'rgba(100, 116, 139, 0.58)';
      ctx.fillRect(startX - 12 - (hEdge % 8), ry + 6, 4, 3);
      ctx.fillRect(startX - 18 - (hEdge % 6), ry + 12, 3, 2);

      for (let rx = MOUNTAIN_MIN_X + 16; rx < CANVAS_WIDTH - 14; rx += 32) {
        const h = tileHash(rx, ry);
        if (h % 2 === 0) {
          ctx.fillStyle = isWinter ? '#94a3b8' : '#64748b';
          ctx.fillRect(rx + (h % 8), ry + 3, 6, 3);
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(rx + (h % 8) + 1, ry + 6, 5, 2);
        }
      }
    }
  };
  drawRockyBand(0, RIVER_TOP_Y - 10);
  drawRockyBand(RIVER_BOTTOM_Y + 10, CANVAS_HEIGHT - (RIVER_BOTTOM_Y + 10));
}

export function drawRoads(ctx: CanvasRenderingContext2D, roads: RoadTile[]): void {
  if (roads.length === 0) return;
  ctx.imageSmoothingEnabled = false;
  const half = Math.round(ROAD_GRID_SIZE / 2);

  // Mapa rápido para conectar automáticamente cada baldosa con sus vecinas N/S/E/O
  const occupiedKeys = new Set<string>();
  const tileKey = (x: number, y: number) => `${Math.round(x)},${Math.round(y)}`;
  for (const r of roads) {
    occupiedKeys.add(tileKey(r.x, r.y));
  }
  const hasNeighbor = (rx: number, ry: number, dx: number, dy: number): boolean => {
    const tx = rx + dx * ROAD_GRID_SIZE;
    const ty = ry + dy * ROAD_GRID_SIZE;
    if (occupiedKeys.has(`${tx},${ty}`)) return true;
    for (let ox = -2; ox <= 2; ox++) {
      for (let oy = -2; oy <= 2; oy++) {
        if (occupiedKeys.has(`${tx + ox},${ty + oy}`)) return true;
      }
    }
    return false;
  };

  const dirtCore = getCutoutSprite(
    'terrain',
    TERRAIN_TILES.dirtCore.sx,
    TERRAIN_TILES.dirtCore.sy,
    TERRAIN_TILES.dirtCore.sw,
    TERRAIN_TILES.dirtCore.sh,
    { mode: 'opaque' }
  );

  for (const r of roads) {
    const rx = Math.round(r.x);
    const ry = Math.round(r.y);
    const rType = r.roadType ?? 'dirt';
    const h = tileHash(rx, ry);

    const nN = hasNeighbor(rx, ry, 0, -1);
    const nS = hasNeighbor(rx, ry, 0, 1);
    const nW = hasNeighbor(rx, ry, -1, 0);
    const nE = hasNeighbor(rx, ry, 1, 0);
    const neighborCount = (nN ? 1 : 0) + (nS ? 1 : 0) + (nW ? 1 : 0) + (nE ? 1 : 0);
    const isJunction = neighborCount >= 3 || (nN !== nS && nW !== nE);

    const left = rx - half;
    const top = ry - half;
    const padN = nN ? 0 : 2;
    const padS = nS ? 0 : 2;
    const padW = nW ? 0 : 2;
    const padE = nE ? 0 : 2;
    const innerX = left + padW;
    const innerY = top + padN;
    const innerW = ROAD_GRID_SIZE - padW - padE;
    const innerH = ROAD_GRID_SIZE - padN - padS;

    // Sombra sutil y borde de profundidad en los lados expuestos para que el camino destaque sobre el pasto
    ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
    if (!nS) ctx.fillRect(left + (nW ? 0 : 1), top + ROAD_GRID_SIZE, ROAD_GRID_SIZE - (nW ? 0 : 1), 2);
    if (!nE) ctx.fillRect(left + ROAD_GRID_SIZE, top + (nN ? 0 : 1), 2, ROAD_GRID_SIZE - (nN ? 0 : 1));

    if (rType === 'dirt') {
      // Borde oscuro solo en los lados expuestos y unión continua en tramos conectados
      ctx.fillStyle = '#5c371c';
      ctx.fillRect(
        left + (nW ? 0 : 2),
        top + (nN ? 0 : 1),
        ROAD_GRID_SIZE - (nW ? 0 : 2) - (nE ? 0 : 2),
        ROAD_GRID_SIZE - (nN ? 0 : 1) - (nS ? 0 : 1)
      );
      ctx.fillRect(
        left + (nW ? 0 : 1),
        top + (nN ? 0 : 2),
        ROAD_GRID_SIZE - (nW ? 0 : 1) - (nE ? 0 : 1),
        ROAD_GRID_SIZE - (nN ? 0 : 2) - (nS ? 0 : 2)
      );

      if (dirtCore) {
        drawSpriteFrame(ctx, dirtCore, innerX, innerY, innerW, innerH);
      } else {
        ctx.fillStyle = '#a87243';
        ctx.fillRect(innerX, innerY, innerW, innerH);
        ctx.fillStyle = '#c48f5a';
        ctx.fillRect(
          innerX + (nW ? 0 : 2),
          innerY + (nN ? 0 : 2),
          Math.max(2, innerW - (nW ? 0 : 2) - (nE ? 0 : 2)),
          Math.max(2, innerH - (nN ? 0 : 2) - (nS ? 0 : 2))
        );
      }

      // Piedritas orgánicas sutiles y lajas en cruces
      ctx.fillStyle = '#d9a773';
      ctx.fillRect(rx - 5 + (h % 3), ry - 5, 3, 2);
      ctx.fillRect(rx + 1, ry + 2 - (h % 2), 3, 2);
      ctx.fillStyle = '#85532c';
      ctx.fillRect(rx - 6, ry + 3, 2, 2);
      if (isJunction) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(rx - 3, ry - 3, 6, 5);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(rx - 2, ry - 3, 4, 2);
      }
    } else if (rType === 'reinforced') {
      ctx.fillStyle = '#3f230e';
      ctx.fillRect(
        left + (nW ? 0 : 1),
        top + (nN ? 0 : 1),
        ROAD_GRID_SIZE - (nW ? 0 : 1) - (nE ? 0 : 1),
        ROAD_GRID_SIZE - (nN ? 0 : 1) - (nS ? 0 : 1)
      );
      ctx.fillStyle = '#78350f';
      ctx.fillRect(
        left + (nW ? 0 : 2),
        top + (nN ? 0 : 2),
        ROAD_GRID_SIZE - (nW ? 0 : 2) - (nE ? 0 : 2),
        ROAD_GRID_SIZE - (nN ? 0 : 2) - (nS ? 0 : 2)
      );
      ctx.fillStyle = '#334155';
      ctx.fillRect(
        left + (nW ? 0 : 3),
        top + (nN ? 0 : 3),
        ROAD_GRID_SIZE - (nW ? 0 : 3) - (nE ? 0 : 3),
        ROAD_GRID_SIZE - (nN ? 0 : 3) - (nS ? 0 : 3)
      );

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
      if (isJunction) {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(rx - 3, ry - 3, 6, 6);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(rx - 2, ry - 2, 4, 2);
      }
      if (nE) {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(rx + 8, ry - 6, 4, 5);
        ctx.fillRect(rx + 8, ry + 2, 4, 5);
      }
      if (nS) {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(rx - 6, ry + 8, 5, 4);
        ctx.fillRect(rx + 2, ry + 8, 5, 4);
      }
    } else {
      ctx.fillStyle = '#334155';
      ctx.fillRect(
        left + (nW ? 0 : 1),
        top + (nN ? 0 : 1),
        ROAD_GRID_SIZE - (nW ? 0 : 1) - (nE ? 0 : 1),
        ROAD_GRID_SIZE - (nN ? 0 : 1) - (nS ? 0 : 1)
      );
      ctx.fillStyle = '#475569';
      ctx.fillRect(innerX, innerY, innerW, innerH);

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
      if (isJunction) {
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(rx - 3, ry - 3, 6, 6);
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(rx - 2, ry - 2, 4, 2);
      }
      if (nE) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(rx + 8, ry - 5, 4, 4);
        ctx.fillRect(rx + 8, ry + 2, 4, 4);
      }
      if (nS) {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(rx - 5, ry + 8, 4, 4);
        ctx.fillRect(rx + 2, ry + 8, 4, 4);
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

const DISTRICT_ACCENTS: Record<DistrictZone['kind'], string> = {
  residencial: '#38bdf8',
  comercial: '#f59e0b',
  industrial: '#fb923c',
  agricola: '#4ade80',
  civico: '#c084fc',
};

export function drawDistrictMarkers(
  ctx: CanvasRenderingContext2D,
  districts: DistrictZone[]
): void {
  if (!districts || districts.length === 0) return;
  for (const d of districts) {
    const cx = Math.round(d.x);
    const cy = Math.round(d.y);
    const rad = Math.round(d.radius);
    const accent = DISTRICT_ACCENTS[d.kind];
    const left = cx - rad;
    const top = cy - Math.round(rad * 0.72);
    const right = cx + rad;
    const bottom = cy + Math.round(rad * 0.72);

    ctx.fillStyle = accent;
    ctx.fillRect(left, top, 10, 2);
    ctx.fillRect(left, top, 2, 10);
    ctx.fillRect(right - 10, top, 10, 2);
    ctx.fillRect(right - 2, top, 2, 10);
    ctx.fillRect(left, bottom - 2, 10, 2);
    ctx.fillRect(left, bottom - 10, 2, 10);
    ctx.fillRect(right - 10, bottom - 2, 10, 2);
    ctx.fillRect(right - 2, bottom - 10, 2, 10);

    const tagW = Math.min(106, Math.max(66, d.label.length * 5 + 10));
    const tagX = Math.round(cx - tagW / 2);
    const tagY = Math.round(top - 5);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.58)';
    ctx.fillRect(tagX, tagY, tagW, 9);
    ctx.fillStyle = accent;
    ctx.fillRect(tagX, tagY, 2, 9);
    ctx.fillStyle = 'rgba(226, 232, 240, 0.9)';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(d.label.toUpperCase(), cx + 1, tagY + 7);
  }
}

export function drawRiverWater(
  ctx: CanvasRenderingContext2D,
  minute: number,
  season: SimulationState['season'],
  animPhase: number
): void {
  ctx.imageSmoothingEnabled = false;
  const isWinter = season === 'Invierno';
  const riverH = RIVER_BOTTOM_Y - RIVER_TOP_Y;

  // Borde de pasto colgante sobre las riberas
  ctx.fillStyle = isWinter ? '#64748b' : '#29571d';
  ctx.fillRect(0, RIVER_TOP_Y - 10, CANVAS_WIDTH, 3);
  ctx.fillRect(0, RIVER_BOTTOM_Y + 7, CANVAS_WIDTH, 3);

  // Riberas arenosas / terrosas escalonadas con piedritas
  ctx.fillStyle = isWinter ? '#cbd5e1' : '#cfa06b';
  ctx.fillRect(0, RIVER_TOP_Y - 8, CANVAS_WIDTH, riverH + 16);
  ctx.fillStyle = isWinter ? '#94a3b8' : '#9c7144';
  ctx.fillRect(0, RIVER_TOP_Y - 4, CANVAS_WIDTH, riverH + 8);
  ctx.fillStyle = isWinter ? '#64748b' : '#694628';
  ctx.fillRect(0, RIVER_TOP_Y - 2, CANVAS_WIDTH, riverH + 4);

  for (let px = 8; px < CANVAS_WIDTH; px += 36) {
    const h = tileHash(px, RIVER_TOP_Y);
    ctx.fillStyle = isWinter ? '#e2e8f0' : '#b88958';
    ctx.fillRect(px + (h % 8), RIVER_TOP_Y - 6, 4, 2);
    ctx.fillRect(px + ((h * 3) % 10), RIVER_BOTTOM_Y + 4, 5, 2);
  }

  // Cauce central profundo (preserva color base exacto en RIVER_TOP_Y para tests e invariantes)
  ctx.fillStyle = isWinter ? '#7dd3fc' : '#1d4ed8';
  ctx.fillRect(0, RIVER_TOP_Y, CANVAS_WIDTH, riverH);

  const waterA = getCutoutSprite('terrain', TERRAIN_TILES.waterA.sx, TERRAIN_TILES.waterA.sy, TERRAIN_TILES.waterA.sw, TERRAIN_TILES.waterA.sh, { mode: 'opaque' });
  const waterB = getCutoutSprite('terrain', TERRAIN_TILES.waterB.sx, TERRAIN_TILES.waterB.sy, TERRAIN_TILES.waterB.sw, TERRAIN_TILES.waterB.sh, { mode: 'opaque' });
  const waterC = getCutoutSprite('terrain', TERRAIN_TILES.waterC.sx, TERRAIN_TILES.waterC.sy, TERRAIN_TILES.waterC.sw, TERRAIN_TILES.waterC.sh, { mode: 'opaque' });
  const lilypad = getCutoutSprite('terrain', TERRAIN_TILES.lilypad.sx, TERRAIN_TILES.lilypad.sy, TERRAIN_TILES.lilypad.sw, TERRAIN_TILES.lilypad.sh, {
    mode: 'flood',
    extraBgColors: [[76, 134, 190], [64, 118, 174], [92, 148, 196]],
    tolerance: 44,
  });

  if (waterA && waterB && waterC) {
    const segW = 64;
    const flowShift = Math.round(minute * 1.1 + animPhase * 7) % segW;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, RIVER_TOP_Y, CANVAS_WIDTH, riverH);
    ctx.clip();
    const tiles = [waterA, waterB, waterC];
    for (let x = -segW + flowShift, idx = 0; x < CANVAS_WIDTH + segW; x += segW, idx++) {
      drawSpriteFrame(ctx, tiles[idx % tiles.length], x, RIVER_TOP_Y, segW, riverH);
    }
    if (isWinter) {
      ctx.fillStyle = 'rgba(186, 230, 253, 0.45)';
      ctx.fillRect(0, RIVER_TOP_Y, CANVAS_WIDTH, riverH);
    }
    ctx.restore();

    // Sombra sutil bajo riberas
    ctx.fillStyle = isWinter ? 'rgba(56, 189, 248, 0.35)' : 'rgba(30, 58, 138, 0.35)';
    ctx.fillRect(0, RIVER_TOP_Y, CANVAS_WIDTH, 4);
    ctx.fillRect(0, RIVER_BOTTOM_Y - 4, CANVAS_WIDTH, 4);

    if (lilypad && !isWinter) {
      for (const lx of [140, 390, 910, 1080]) {
        const bob = Math.round(Math.sin(animPhase * 1.5 + lx) * 1);
        drawSpriteFrame(ctx, lilypad, lx, RIVER_TOP_Y + 12 + bob, 20, 17);
      }
    }
  } else {
    ctx.fillStyle = isWinter ? '#38bdf8' : '#1e3a8a';
    ctx.fillRect(0, RIVER_TOP_Y, CANVAS_WIDTH, 5);
    ctx.fillRect(0, RIVER_BOTTOM_Y - 5, CANVAS_WIDTH, 5);

    ctx.fillStyle = isWinter ? '#93c5fd' : '#2563eb';
    ctx.fillRect(0, RIVER_TOP_Y + 10, CANVAS_WIDTH, riverH - 20);
    ctx.fillStyle = isWinter ? '#bae6fd' : '#3b82f6';
    ctx.fillRect(0, RIVER_TOP_Y + 20, CANVAS_WIDTH, riverH - 40);
  }

  // Espuma animada en píxeles enteros en las orillas
  ctx.fillStyle = isWinter ? '#f8fafc' : '#bae6fd';
  for (let sx = 0; sx < CANVAS_WIDTH; sx += 26) {
    const off = Math.round(Math.sin(animPhase * 2 + sx * 0.05) * 2);
    ctx.fillRect(sx + off, RIVER_TOP_Y + 2, 10, 1);
    ctx.fillRect(sx - off + 4, RIVER_BOTTOM_Y - 3, 10, 1);
  }

  // Destellos de corriente animados
  const shift = Math.round(minute * 1.4 + animPhase * 8) % 48;
  for (let rx = -48 + shift; rx < CANVAS_WIDTH + 48; rx += 48) {
    const irx = Math.round(rx);
    ctx.fillStyle = isWinter ? '#ffffff' : 'rgba(186, 230, 253, 0.72)';
    ctx.fillRect(irx + 4, RIVER_TOP_Y + 9, 5, 1);
    ctx.fillRect(irx + 22, RIVER_TOP_Y + 28, 6, 1);
    ctx.fillRect(irx + 10, RIVER_TOP_Y + 46, 4, 1);
  }

  if (isWinter) {
    for (let ix = 32; ix < CANVAS_WIDTH - 40; ix += 140) {
      const drift = Math.round(Math.sin(animPhase + ix) * 4);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(ix + drift, RIVER_TOP_Y + 18, 22, 10);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(ix + drift + 2, RIVER_TOP_Y + 19, 16, 3);
    }
  }

  if (minute >= 330 && minute <= 520) {
    const mistDrift = Math.round(Math.sin(animPhase * 0.7) * 18);
    ctx.fillStyle = 'rgba(226, 232, 240, 0.14)';
    for (let mx = -40 + mistDrift; mx < CANVAS_WIDTH; mx += 160) {
      ctx.fillRect(mx, RIVER_TOP_Y - 6, 96, 18);
      ctx.fillRect(mx + 44, RIVER_BOTTOM_Y - 12, 88, 16);
    }
  }

  const northLabelX = Math.round(WORLD_CENTER_X - 34);
  const southLabelX = Math.round(WORLD_CENTER_X - 31);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.56)';
  ctx.fillRect(northLabelX, RIVER_TOP_Y - 21, 68, 10);
  ctx.fillRect(southLabelX, RIVER_BOTTOM_Y + 11, 62, 10);
  ctx.fillStyle = 'rgba(226, 232, 240, 0.86)';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ZONA NORTE', Math.round(WORLD_CENTER_X), RIVER_TOP_Y - 14);
  ctx.fillText('ZONA SUR', Math.round(WORLD_CENTER_X), RIVER_BOTTOM_Y + 18);
}

export function drawFishUnit(
  ctx: CanvasRenderingContext2D,
  animal: Animal,
  isSelected: boolean,
  animPhase: number
): void {
  ctx.imageSmoothingEnabled = false;
  const x = Math.round(animal.x);
  const y = Math.round(animal.y);
  const dir = animal.vx >= 0 ? 1 : -1;

  ctx.save();
  ctx.translate(x, y);

  // Ondas pixel-art en el agua alrededor de cada pez
  const splash = Math.round((animPhase * 3 + animal.id) % 3);
  ctx.fillStyle = 'rgba(186, 230, 253, 0.52)';
  ctx.fillRect(-7 - splash, -4, 4, 1);
  ctx.fillRect(3 + splash, -4, 4, 1);
  ctx.fillRect(-5 - splash, 4, 10 + splash * 2, 1);

  const v = animal.fishVariant ?? 'trout';
  const frameIdx = Math.floor(animPhase * 4 + Math.abs(animal.id)) % 5;
  let fishSprite: HTMLCanvasElement | null = null;
  let drawW = 19;
  let drawH = 13;
  let flipX = dir < 0;

  if (v === 'goldfish') {
    fishSprite = getCutoutSprite(
      'terrain',
      TERRAIN_TILES.fishOrange.sx,
      TERRAIN_TILES.fishOrange.sy,
      TERRAIN_TILES.fishOrange.sw,
      TERRAIN_TILES.fishOrange.sh,
      { mode: 'flood', bgColors: [[69, 134, 198], [111, 134, 142]], tolerance: 42 }
    );
    drawW = 17;
    drawH = 13;
    // El sprite dorado de terrain-crops mira a la izquierda
    flipX = dir > 0;
  } else if (v === 'catfish') {
    const rect = DOG_FISH_SPRITES.striped[frameIdx];
    fishSprite = getCutoutSprite('dogFish', rect.sx, rect.sy, rect.sw, rect.sh, {
      mode: 'flood',
      tolerance: 38,
      extraBgColors: [[124, 138, 147]],
    });
    drawH = 15;
    drawW = Math.round((rect.sw / rect.sh) * drawH);
    flipX = dir < 0;
  } else {
    // trout y salmon usan el banco animado de trucha/salmón (Row 3 de dog-and-fish.jpg)
    const rect = DOG_FISH_SPRITES.trout[frameIdx];
    fishSprite = getCutoutSprite('dogFish', rect.sx, rect.sy, rect.sw, rect.sh, {
      mode: 'flood',
      tolerance: 38,
      extraBgColors: [[124, 138, 147]],
    });
    drawH = v === 'salmon' ? 13 : 11;
    drawW = Math.round((rect.sw / rect.sh) * drawH);
    flipX = dir < 0;
  }

  if (fishSprite) {
    drawSpriteFrame(ctx, fishSprite, Math.round(-drawW / 2), Math.round(-drawH / 2), drawW, drawH, flipX);
  } else {
    ctx.scale(dir, 1);
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
  isBridgeSelected: boolean,
  era: EraId = 'primitive'
): void {
  if (!bridge) return;
  ctx.imageSmoothingEnabled = false;
  const passable = isBridgePassable({ bridge });
  const bxCenter = Math.round(bridge.x);
  const bxMin = Math.round(bxCenter - BRIDGE_HALF_WIDTH);
  const bridgeW = Math.round(BRIDGE_HALF_WIDTH * 2);
  const deckH = RIVER_BOTTOM_Y - RIVER_TOP_Y + 12;

  // Sombra proyectada sobre el agua (tapa los peces que pasan por debajo)
  ctx.fillStyle = 'rgba(0,0,0,0.36)';
  ctx.fillRect(bxMin - 3, RIVER_TOP_Y - 2, bridgeW + 6, deckH);

  // Pilotes y estribos de piedra en riberas norte/sur
  ctx.fillStyle = '#334155';
  ctx.fillRect(bxMin - 4, RIVER_TOP_Y - 9, bridgeW + 8, 6);
  ctx.fillRect(bxMin - 4, RIVER_BOTTOM_Y + 3, bridgeW + 8, 6);
  ctx.fillStyle = '#64748b';
  ctx.fillRect(bxMin - 3, RIVER_TOP_Y - 8, 6, RIVER_BOTTOM_Y - RIVER_TOP_Y + 16);
  ctx.fillRect(bxMin + bridgeW - 3, RIVER_TOP_Y - 8, 6, RIVER_BOTTOM_Y - RIVER_TOP_Y + 16);

  // Tablero base (mantiene color base exacto para consistencia de capas y tests)
  ctx.fillStyle = passable ? '#78350f' : '#450a0a';
  ctx.fillRect(bxMin, RIVER_TOP_Y - 6, bridgeW, deckH);

  const bridgeSprite = getCutoutSprite(
    'terrain',
    TERRAIN_TILES.bridgeNS.sx,
    TERRAIN_TILES.bridgeNS.sy,
    TERRAIN_TILES.bridgeNS.sw,
    TERRAIN_TILES.bridgeNS.sh,
    { mode: 'flood', tolerance: 34 }
  );

  if (bridgeSprite && passable) {
    const segH = Math.round(deckH / 2);
    drawSpriteFrame(ctx, bridgeSprite, bxMin - 2, RIVER_TOP_Y - 6, bridgeW + 4, segH);
    drawSpriteFrame(ctx, bridgeSprite, bxMin - 2, RIVER_TOP_Y - 6 + segH, bridgeW + 4, deckH - segH);
  } else {
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

    ctx.fillStyle = '#451a03';
    ctx.fillRect(bxMin, RIVER_TOP_Y - 6, 4, deckH);
    ctx.fillRect(bxMin + bridgeW - 4, RIVER_TOP_Y - 6, 4, deckH);
    ctx.fillStyle = '#b45309';
    ctx.fillRect(bxMin + 1, RIVER_TOP_Y - 6, 2, deckH);
    ctx.fillRect(bxMin + bridgeW - 3, RIVER_TOP_Y - 6, 2, deckH);

    for (let py = RIVER_TOP_Y - 6; py <= RIVER_BOTTOM_Y + 4; py += 16) {
      ctx.fillStyle = '#451a03';
      ctx.fillRect(bxMin - 1, py, 6, 5);
      ctx.fillRect(bxMin + bridgeW - 5, py, 6, 5);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(bxMin, py + 1, 4, 2);
      ctx.fillRect(bxMin + bridgeW - 4, py + 1, 4, 2);
    }
  }

  if (passable && (era === 'iron' || era === 'civilization')) {
    const lanternPosts = [
      [bxMin, RIVER_TOP_Y - 8],
      [bxMin + bridgeW - 4, RIVER_TOP_Y - 8],
      [bxMin, RIVER_BOTTOM_Y + 4],
      [bxMin + bridgeW - 4, RIVER_BOTTOM_Y + 4],
    ];
    for (const [lx, ly] of lanternPosts) {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(lx, ly, 4, 4);
      ctx.fillStyle = '#fde047';
      ctx.fillRect(lx + 1, ly + 1, 2, 2);
    }
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
    ctx.fillStyle = !passable ? 'rgba(153, 27, 27, 0.78)' : 'rgba(180, 83, 9, 0.78)';
    ctx.fillRect(bxCenter - 23, RIVER_TOP_Y + 22, 46, 9);
    ctx.fillStyle = '#fef2f2';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(!passable ? 'BLOQUEADO' : 'MANT.', bxCenter, RIVER_TOP_Y + 29);
  }
  if (isBridgeSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(bxMin - 4, RIVER_TOP_Y - 10, bridgeW + 8, RIVER_BOTTOM_Y - RIVER_TOP_Y + 20);
  }
}

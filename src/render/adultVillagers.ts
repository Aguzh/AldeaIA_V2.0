import {
  RIVER_BOTTOM_Y,
  getBuildingOccupantHeadBadges,
} from '../simulation/rules';
import type { Agent, BuildingOccupantBadge, SimulationState } from '../types/simulation';
import { drawSpriteFrame, getCutoutSprite, type SpriteRect } from './spriteLoader';

interface VillagerSpriteSet {
  front: SpriteRect;
  back: SpriteRect;
  side: SpriteRect;
  /** True when the side sprite naturally faces left instead of right. */
  sideFacesLeft?: boolean;
}

const ADULT_SPRITES = {
  farmer: {
    front: { sx: 37, sy: 17, sw: 61, sh: 105 },
    back: { sx: 157, sy: 17, sw: 60, sh: 105 },
    side: { sx: 161, sy: 128, sw: 53, sh: 110 },
  },
  lumberjack: {
    front: { sx: 295, sy: 17, sw: 91, sh: 105 },
    back: { sx: 298, sy: 128, sw: 61, sh: 110 },
    side: { sx: 420, sy: 128, sw: 68, sh: 110 },
  },
  blacksmith: {
    front: { sx: 524, sy: 20, sw: 92, sh: 102 },
    back: { sx: 539, sy: 128, sw: 72, sh: 105 },
    side: { sx: 650, sy: 21, sw: 88, sh: 101 },
    sideFacesLeft: true,
  },
  merchant: {
    front: { sx: 808, sy: 22, sw: 65, sh: 100 },
    back: { sx: 930, sy: 20, sw: 61, sh: 102 },
    side: { sx: 933, sy: 128, sw: 65, sh: 110 },
  },
  fisher: {
    front: { sx: 43, sy: 282, sw: 74, sh: 97 },
    back: { sx: 44, sy: 385, sw: 55, sh: 110 },
    side: { sx: 146, sy: 275, sw: 69, sh: 104 },
    sideFacesLeft: true,
  },
  apothecary: {
    front: { sx: 306, sy: 280, sw: 76, sh: 99 },
    back: { sx: 419, sy: 385, sw: 67, sh: 107 },
    side: { sx: 295, sy: 385, sw: 68, sh: 107 },
  },
  baker: {
    front: { sx: 552, sy: 276, sw: 73, sh: 103 },
    back: { sx: 543, sy: 385, sw: 67, sh: 107 },
    side: { sx: 662, sy: 276, sw: 66, sh: 103 },
    sideFacesLeft: true,
  },
  gathererF: {
    front: { sx: 812, sy: 279, sw: 70, sh: 100 },
    back: { sx: 918, sy: 278, sw: 68, sh: 101 },
    side: { sx: 932, sy: 385, sw: 65, sh: 107 },
  },
  elderM: {
    front: { sx: 42, sy: 556, sw: 60, sh: 79 },
    back: { sx: 804, sy: 548, sw: 64, sh: 87 },
    side: { sx: 164, sy: 550, sw: 51, sh: 85 },
    sideFacesLeft: true,
  },
  elderF: {
    front: { sx: 42, sy: 802, sw: 61, sh: 96 },
    back: { sx: 808, sy: 802, sw: 52, sh: 96 },
    side: { sx: 426, sy: 802, sw: 52, sh: 96 },
    sideFacesLeft: true,
  },
} satisfies Record<string, VillagerSpriteSet>;

const ADULT_VARIETY_SPRITES = {
  fisher2: { sx: 37, sy: 23, sw: 84, sh: 125 },
  lumberjack2: { sx: 164, sy: 20, sw: 96, sh: 128 },
  baker2: { sx: 294, sy: 12, sw: 86, sh: 136 },
  baker3: { sx: 401, sy: 12, sw: 89, sh: 139 },
  baker4: { sx: 280, sy: 162, sw: 87, sh: 139 },
  blacksmith2: { sx: 488, sy: 18, sw: 113, sh: 130 },
  mayor: { sx: 617, sy: 18, sw: 98, sh: 130 },
  gathererF2: { sx: 743, sy: 24, sw: 83, sh: 124 },
  weaverF: { sx: 881, sy: 24, sw: 71, sh: 124 },
  apothecary2: { sx: 1007, sy: 23, sw: 90, sh: 125 },
  curandero: { sx: 1145, sy: 24, sw: 64, sh: 124 },
  farmer2: { sx: 1260, sy: 20, sw: 95, sh: 128 },
  elderGathererF: { sx: 26, sy: 173, sw: 80, sh: 127 },
  elderWeaverF: { sx: 156, sy: 173, sw: 78, sh: 127 },
  carpenterApron: { sx: 413, sy: 181, sw: 65, sh: 120 },
  carpenter2: { sx: 502, sy: 173, sw: 90, sh: 128 },
  farmer3: { sx: 623, sy: 167, sw: 78, sh: 133 },
  apothecary3: { sx: 752, sy: 173, sw: 73, sh: 127 },
  gathererBag: { sx: 878, sy: 173, sw: 70, sh: 127 },
  miner: { sx: 994, sy: 170, sw: 114, sh: 130 },
  scholar: { sx: 1145, sy: 173, sw: 66, sh: 127 },
  guard: { sx: 1267, sy: 164, sw: 78, sh: 136 },
  elderWalkerM: { sx: 35, sy: 348, sw: 77, sh: 145 },
  elderPipeM: { sx: 443, sy: 354, sw: 92, sh: 133 },
  elderCaneF: { sx: 752, sy: 348, sw: 79, sh: 145 },
  elderBroomF: { sx: 1137, sy: 348, sw: 100, sh: 153 },
} satisfies Record<string, SpriteRect>;

type SelectedAdultVisual =
  | { kind: 'sheet'; set: VillagerSpriteSet }
  | { kind: 'variety'; rect: SpriteRect; isDedicatedJob: boolean };

function selectAdultSpriteVisual(agent: Agent): SelectedAdultVisual {
  const variant = Math.abs(agent.id) % 4;

  if (agent.isElder) {
    if (agent.sex === 'F') {
      if (variant === 1) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.elderCaneF, isDedicatedJob: true };
      if (variant === 2) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.elderGathererF, isDedicatedJob: true };
      if (variant === 3) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.elderWeaverF, isDedicatedJob: true };
      return { kind: 'sheet', set: ADULT_SPRITES.elderF };
    }
    if (variant === 1) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.elderWalkerM, isDedicatedJob: true };
    if (variant === 2) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.elderPipeM, isDedicatedJob: true };
    return { kind: 'sheet', set: ADULT_SPRITES.elderM };
  }

  switch (agent.job) {
    case 'Minero':
      return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.miner, isDedicatedJob: true };
    case 'Erudito':
      return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.scholar, isDedicatedJob: true };
    case 'Guardián':
    case 'Comisario':
      return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.guard, isDedicatedJob: true };
    case 'Alcalde':
      return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.mayor, isDedicatedJob: true };
    case 'Carpintero':
    case 'Constructor':
      return {
        kind: 'variety',
        rect: variant % 2 === 0 ? ADULT_VARIETY_SPRITES.carpenter2 : ADULT_VARIETY_SPRITES.carpenterApron,
        isDedicatedJob: true,
      };
    case 'Artesano':
      return {
        kind: 'variety',
        rect: agent.sex === 'F' ? ADULT_VARIETY_SPRITES.weaverF : ADULT_VARIETY_SPRITES.carpenterApron,
        isDedicatedJob: true,
      };
    case 'Curandero':
      return {
        kind: 'variety',
        rect: variant % 2 === 0 ? ADULT_VARIETY_SPRITES.curandero : ADULT_VARIETY_SPRITES.apothecary2,
        isDedicatedJob: true,
      };
    case 'Agricultor':
      if (variant === 1) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.farmer2, isDedicatedJob: true };
      if (variant === 2) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.farmer3, isDedicatedJob: true };
      return { kind: 'sheet', set: ADULT_SPRITES.farmer };
    case 'Leñador':
      if (variant % 2 === 1) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.lumberjack2, isDedicatedJob: true };
      return { kind: 'sheet', set: ADULT_SPRITES.lumberjack };
    case 'Herrero':
      if (variant % 2 === 1) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.blacksmith2, isDedicatedJob: true };
      return { kind: 'sheet', set: ADULT_SPRITES.blacksmith };
    case 'Pescador':
      if (variant % 2 === 1) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.fisher2, isDedicatedJob: true };
      return { kind: 'sheet', set: ADULT_SPRITES.fisher };
    case 'Boticario':
      if (variant === 1) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.apothecary2, isDedicatedJob: true };
      if (variant === 2) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.apothecary3, isDedicatedJob: true };
      return { kind: 'sheet', set: ADULT_SPRITES.apothecary };
    case 'Panadero':
      if (variant === 1) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.baker2, isDedicatedJob: true };
      if (variant === 2) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.baker3, isDedicatedJob: true };
      if (variant === 3) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.baker4, isDedicatedJob: true };
      return { kind: 'sheet', set: ADULT_SPRITES.baker };
    case 'Comerciante':
    case 'Banquero':
    case 'Almacenero':
      if (variant === 1) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.mayor, isDedicatedJob: false };
      if (agent.sex === 'F' && variant === 2) {
        return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.gathererBag, isDedicatedJob: false };
      }
      return { kind: 'sheet', set: ADULT_SPRITES.merchant };
    default:
      if (agent.sex === 'F') {
        if (variant === 1) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.gathererF2, isDedicatedJob: false };
        if (variant === 2) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.gathererBag, isDedicatedJob: false };
        return { kind: 'sheet', set: ADULT_SPRITES.gathererF };
      }
      if (variant === 1) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.farmer3, isDedicatedJob: false };
      if (variant === 2) return { kind: 'variety', rect: ADULT_VARIETY_SPRITES.carpenterApron, isDedicatedJob: false };
      return { kind: 'sheet', set: ADULT_SPRITES.merchant };
  }
}

function drawPixelOutlinedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  outline = '#181412'
): void {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  ctx.fillStyle = outline;
  ctx.fillRect(rx - 1, ry - 1, rw + 2, rh + 2);
  ctx.fillStyle = fill;
  ctx.fillRect(rx, ry, rw, rh);
}

const lastAdultPos = new Map<
  number,
  { x: number; y: number; walkFrame: number; dx: number; dy: number; moving: boolean }
>();

function getAgentFacing(agent: Agent): { moving: boolean; dx: number; dy: number } {
  const prev = lastAdultPos.get(agent.id);
  if (!prev) {
    lastAdultPos.set(agent.id, {
      x: agent.x,
      y: agent.y,
      walkFrame: agent.walkFrame,
      dx: 0,
      dy: 0,
      moving: false,
    });
    return { moving: false, dx: 0, dy: 0 };
  }
  const ddx = agent.x - prev.x;
  const ddy = agent.y - prev.y;
  const dist = Math.hypot(ddx, ddy);
  const frameChanged = Math.abs(agent.walkFrame - prev.walkFrame) > 0.01;
  if (dist > 0.15) {
    prev.dx = ddx;
    prev.dy = ddy;
    prev.moving = true;
  } else if (!frameChanged) {
    prev.moving = false;
  }
  prev.x = agent.x;
  prev.y = agent.y;
  prev.walkFrame = agent.walkFrame;
  return { moving: prev.moving, dx: prev.dx, dy: prev.dy };
}

/**
 * Renderizado pixel-art 16-bit para aldeanos adultos y ancianos usando villagers-adults.png
 * con fallback procedural automático y equipamiento/insignias nítidas.
 */
export function drawAdultVillager(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  selectedId: number | null,
  animPhase: number
): void {
  ctx.imageSmoothingEnabled = false;
  const x = Math.round(agent.x);
  const y = Math.round(agent.y);
  const outline = '#181412';
  const step = Math.round(Math.sin(agent.walkFrame) * 2);
  const skinBase = agent.isSick ? '#cfd8cf' : agent.skin;
  const skinShadow = agent.isSick ? '#94a3b8' : 'rgba(69, 26, 3, 0.22)';
  const hairTone = agent.isElder ? '#e2e8f0' : agent.hairColor;

  ctx.save();
  ctx.translate(x, y);

  // Sombra proyectada en píxeles
  ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
  ctx.fillRect(-6, 10, 12, 3);

  const visual = selectAdultSpriteVisual(agent);
  const motion = getAgentFacing(agent);
  const moving = motion.moving;
  const isBack = moving && motion.dy < -0.15 && Math.abs(motion.dy) > Math.abs(motion.dx) * 1.1;
  const isSide = moving && !isBack && Math.abs(motion.dx) > Math.abs(motion.dy) * 0.85;

  let activeRect: SpriteRect;
  let flipX = false;
  let sprite: HTMLCanvasElement | null = null;
  if (visual.kind === 'variety') {
    activeRect = visual.rect;
    flipX = moving && motion.dx < -0.15;
    sprite = getCutoutSprite('villagersVariety', activeRect.sx, activeRect.sy, activeRect.sw, activeRect.sh, {
      mode: 'flood',
      tolerance: 38,
      extraBgColors: [[141, 153, 163], [120, 134, 147]],
    });
  } else {
    activeRect = isBack ? visual.set.back : isSide ? visual.set.side : visual.set.front;
    flipX = isSide ? (visual.set.sideFacesLeft ? motion.dx > 0 : motion.dx < 0) : false;
    sprite = getCutoutSprite('adults', activeRect.sx, activeRect.sy, activeRect.sw, activeRect.sh, {
      mode: 'flood',
      tolerance: 34,
    });
  }

  if (sprite) {
    const bob = moving ? Math.abs(step) : 0;
    const targetH = agent.isElder ? 26 : 29;
    const targetW = Math.round((activeRect.sw / activeRect.sh) * targetH);
    const dx = Math.round(-targetW / 2);
    const dy = Math.round(11 - targetH - bob);
    drawSpriteFrame(ctx, sprite, dx, dy, targetW, targetH, flipX);

    if (agent.job === 'Comisario') {
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-3, dy, 6, 3);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-1, dy + 1, 2, 2);
    } else if (agent.job === 'Banquero') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-5, dy - 1, 10, 2);
      ctx.fillRect(-3, dy - 4, 6, 3);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-3, dy - 1, 6, 1);
    } else if (visual.kind === 'sheet' && agent.job === 'Alcalde') {
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-5, dy - 1, 10, 2);
      ctx.fillRect(-3, dy - 4, 6, 3);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-3, dy - 1, 6, 1);
    }

    const isDockFishing =
      agent.taskType === 'fish_river' ||
      (agent.taskType === 'manage_building' && agent.job === 'Pescador');
    if (isDockFishing) {
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(8, -19, 2, 2);
    }
  } else {
    // Fallback procedural 16-bit completo
    ctx.fillStyle = outline;
    ctx.fillRect(-5, 3 + step, 5, 8);
    ctx.fillRect(0, 3 - step, 5, 8);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-4, 4 + step, 3, 4);
    ctx.fillRect(1, 4 - step, 3, 4);
    ctx.fillStyle = '#5c3317';
    ctx.fillRect(-4, 8 + step, 3, 2);
    ctx.fillRect(1, 8 - step, 3, 2);

    if (agent.sex === 'F') {
      ctx.fillStyle = outline;
      ctx.fillRect(-5, -5, 10, 7);
      ctx.fillRect(-7, 0, 14, 7);
      ctx.fillStyle = agent.shirt;
      ctx.fillRect(-4, -4, 8, 6);
      ctx.fillRect(-6, 1, 12, 5);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
      ctx.fillRect(2, -4, 2, 10);
      ctx.fillRect(-6, 4, 12, 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-2, -4, 4, 2);
      ctx.fillStyle = '#f472b6';
      ctx.fillRect(-4, 0, 8, 1);
    } else {
      ctx.fillStyle = outline;
      ctx.fillRect(-6, -5, 12, 10);
      ctx.fillStyle = agent.shirt;
      ctx.fillRect(-5, -4, 10, 8);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
      ctx.fillRect(-5, -4, 2, 7);
      ctx.fillRect(3, -4, 2, 7);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(-2, -4, 4, 2);
      ctx.fillStyle = '#1e1b18';
      ctx.fillRect(-5, 2, 10, 2);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-1, 2, 2, 2);
    }

    if (agent.job === 'Herrero' || agent.job === 'Artesano') {
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-3, -2, 6, 7);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-2, -1, 4, 4);
    } else if (agent.job === 'Curandero' || agent.job === 'Boticario') {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-3, -3, 6, 7);
      ctx.fillStyle = agent.job === 'Curandero' ? '#ef4444' : '#14b8a6';
      ctx.fillRect(-1, -1, 2, 4);
      ctx.fillRect(-2, 0, 4, 2);
    } else if (agent.job === 'Comisario' || agent.job === 'Guardián') {
      ctx.fillStyle = agent.job === 'Comisario' ? '#1e3a8a' : '#7f1d1d';
      ctx.fillRect(-6, -4, 2, 8);
      ctx.fillRect(4, -4, 2, 8);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(1, -3, 2, 2);
    } else if (agent.job === 'Constructor') {
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-4, -4, 2, 6);
      ctx.fillRect(2, -4, 2, 6);
    } else if (agent.job === 'Banquero' || agent.job === 'Alcalde') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-4, -4, 8, 7);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-1, -2, 2, 3);
    } else if (agent.job === 'Agricultor') {
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(-3, -1, 6, 5);
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(-2, -3, 1, 3);
      ctx.fillRect(1, -3, 1, 3);
    }

    ctx.fillStyle = outline;
    ctx.fillRect(-8, -4, 3, 7);
    ctx.fillRect(5, -4, 3, 7);
    ctx.fillStyle = agent.shirt;
    ctx.fillRect(-7, -3, 2, 3);
    ctx.fillRect(5, -3, 2, 3);
    ctx.fillStyle = skinBase;
    ctx.fillRect(-7, 0, 2, 2);
    ctx.fillRect(5, 0, 2, 2);

    const isDockFishing =
      agent.taskType === 'fish_river' ||
      (agent.taskType === 'manage_building' && agent.job === 'Pescador');
    if (isDockFishing) {
      ctx.fillStyle = outline;
      ctx.fillRect(5, -15, 3, 12);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(6, -14, 2, 10);
      ctx.fillStyle = '#e0f2fe';
      ctx.fillRect(8, -16, 1, 6);
      ctx.fillRect(9, -18, 1, 3);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(8, -19, 2, 2);
    } else if (agent.job === 'Comisario' || agent.job === 'Guardián') {
      ctx.fillStyle = outline;
      ctx.fillRect(-9, -11, 2, 17);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-8, -10, 1, 15);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-9, -14, 3, 3);
    } else if (agent.job === 'Herrero' || agent.job === 'Constructor') {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(6, -4, 1, 6);
      ctx.fillStyle = outline;
      ctx.fillRect(4, -7, 6, 3);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(5, -6, 4, 2);
    } else if (agent.job === 'Carpintero' || agent.job === 'Leñador') {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(6, -5, 1, 7);
      ctx.fillStyle = outline;
      ctx.fillRect(6, -6, 5, 4);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(7, -5, 3, 2);
    } else if (agent.toolsCount > 0) {
      ctx.fillStyle = outline;
      ctx.fillRect(6, -3, 3, 6);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(7, -2, 2, 4);
    }

    ctx.fillStyle = outline;
    ctx.fillRect(-5, -13, 10, 9);
    ctx.fillStyle = skinBase;
    ctx.fillRect(-4, -12, 8, 8);
    ctx.fillStyle = skinShadow;
    ctx.fillRect(-4, -6, 8, 2);
    ctx.fillRect(3, -12, 1, 7);

    if (agent.sex === 'M' && agent.id % 3 === 0) {
      ctx.fillStyle = hairTone;
      ctx.fillRect(-3, -6, 6, 2);
    }

    ctx.fillStyle = '#181412';
    ctx.fillRect(-3, -9, 2, 2);
    ctx.fillRect(1, -9, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -9, 1, 1);
    ctx.fillRect(1, -9, 1, 1);
    if (agent.sex === 'F') {
      ctx.fillStyle = '#fda4af';
      ctx.fillRect(-4, -7, 1, 1);
      ctx.fillRect(3, -7, 1, 1);
    }

    ctx.fillStyle = outline;
    if (agent.hairStyle === 'short') {
      ctx.fillRect(-5, -15, 10, 4);
    } else if (agent.hairStyle === 'long') {
      ctx.fillRect(-6, -15, 12, 4);
      ctx.fillRect(-6, -12, 3, 8);
      ctx.fillRect(3, -12, 3, 8);
    } else if (agent.hairStyle === 'mohawk') {
      ctx.fillRect(-2, -17, 4, 5);
    } else if (agent.hairStyle === 'curly') {
      ctx.fillRect(-6, -16, 12, 5);
    } else if (agent.hairStyle === 'ponytail') {
      ctx.fillRect(-5, -15, 10, 4);
      ctx.fillRect(3, -13, 5, 6);
    }

    ctx.fillStyle = hairTone;
    if (agent.hairStyle === 'short') {
      ctx.fillRect(-4, -14, 8, 3);
    } else if (agent.hairStyle === 'long') {
      ctx.fillRect(-5, -14, 10, 3);
      ctx.fillRect(-5, -11, 2, 6);
      ctx.fillRect(3, -11, 2, 6);
    } else if (agent.hairStyle === 'mohawk') {
      ctx.fillRect(-1, -16, 2, 4);
    } else if (agent.hairStyle === 'curly') {
      ctx.fillRect(-5, -15, 10, 4);
      ctx.fillRect(-5, -12, 2, 2);
      ctx.fillRect(3, -12, 2, 2);
    } else if (agent.hairStyle === 'ponytail') {
      ctx.fillRect(-4, -14, 8, 3);
      ctx.fillRect(4, -12, 3, 4);
    }
    if (agent.hairStyle !== 'bald') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.fillRect(-3, -14, 4, 1);
    }

    if (agent.job === 'Minero') {
      ctx.fillStyle = outline;
      ctx.fillRect(-5, -16, 10, 4);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-4, -15, 8, 3);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-1, -15, 2, 2);
    } else if (agent.job === 'Panadero') {
      ctx.fillStyle = outline;
      ctx.fillRect(-5, -16, 10, 3);
      ctx.fillRect(-4, -19, 8, 4);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-4, -15, 8, 2);
      ctx.fillRect(-3, -18, 6, 3);
    } else if (agent.job === 'Pescador') {
      ctx.fillStyle = outline;
      ctx.fillRect(-7, -15, 14, 3);
      ctx.fillRect(-4, -17, 8, 3);
      ctx.fillStyle = '#eab308';
      ctx.fillRect(-6, -14, 12, 2);
      ctx.fillRect(-3, -16, 6, 2);
    } else if (agent.job === 'Alcalde' || agent.job === 'Banquero') {
      ctx.fillStyle = outline;
      ctx.fillRect(-6, -15, 12, 3);
      ctx.fillRect(-4, -19, 8, 5);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-5, -14, 10, 2);
      ctx.fillRect(-3, -18, 6, 4);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-3, -15, 6, 1);
    } else if (agent.job === 'Erudito') {
      ctx.fillStyle = outline;
      ctx.fillRect(-6, -16, 12, 3);
      ctx.fillStyle = '#312e81';
      ctx.fillRect(-5, -15, 10, 2);
    }
  }

  if (agent.isRepresentative) {
    ctx.fillStyle = outline;
    ctx.fillRect(-4, -20, 8, 3);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-3, -19, 6, 2);
    ctx.fillRect(-2, -21, 1, 2);
    ctx.fillRect(1, -21, 1, 2);
  }

  if (agent.pregnancy) {
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(-2, -2, 4, 3);
  }

  if (agent.jailedDays > 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-6, -12, 1, 20);
    ctx.fillRect(5, -12, 1, 20);
  }

  if (selectedId === agent.id) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-10, -18, 20, 31);
  }

  if (agent.isSick) {
    drawPixelOutlinedRect(ctx, -4, -24, 8, 6, '#ef4444', outline);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -23, 2, 4);
    ctx.fillRect(-2, -22, 4, 2);
  } else if (agent.talkingTimer > 0) {
    drawPixelOutlinedRect(ctx, -7, -25, 14, 7, '#ffffff', outline);
    ctx.fillStyle = '#181412';
    ctx.fillRect(-4, -22, 2, 2);
    ctx.fillRect(-1, -22, 2, 2);
    ctx.fillRect(2, -22, 2, 2);
  } else {
    const emoColors: Record<Agent['emotion'], string> = {
      excited: '#f59e0b',
      happy: '#10b981',
      content: '#22c55e',
      neutral: '#94a3b8',
      sad: '#38bdf8',
      depressed: '#475569',
      love: '#ec4899',
      scared: '#a855f7',
      sick: '#ef4444',
    };
    drawPixelOutlinedRect(ctx, -3, -23, 6, 4, emoColors[agent.emotion], outline);
  }

  if (agent.taskType === 'sleep') {
    const zFloat = Math.round(((animPhase * 1.4 + agent.id * 0.4) % 1) * 6);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Z', 8, -15 - zFloat);
    ctx.font = 'bold 6px monospace';
    ctx.fillText('z', 13, -20 - zFloat);
  }

  ctx.restore();
}

/**
 * Dibuja un icono pixel-art de la cabeza del aldeano (12x12 px) en la parte inferior de casas
 * o edificios ocupados (comercios, banco, comisaría, cárcel). Cliqueable para inspeccionar.
 */
export function drawVillagerHeadBadge(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  badgeX: number,
  badgeY: number,
  isSelected: boolean
): void {
  const bx = Math.round(badgeX);
  const by = Math.round(badgeY);
  const outline = '#181412';
  const skinBase = agent.isSick ? '#cfd8cf' : agent.skin;
  const hairTone = agent.isElder ? '#e2e8f0' : agent.hairColor;

  ctx.save();
  ctx.translate(bx, by);

  ctx.fillStyle = isSelected ? '#facc15' : outline;
  ctx.fillRect(-6, -6, 12, 12);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-5, -5, 10, 10);

  ctx.fillStyle = agent.shirt;
  ctx.fillRect(-4, 3, 8, 2);

  ctx.fillStyle = skinBase;
  ctx.fillRect(-4, -3, 8, 6);

  ctx.fillStyle = '#181412';
  ctx.fillRect(-2, -1, 1, 2);
  ctx.fillRect(1, -1, 1, 2);

  ctx.fillStyle = hairTone;
  if (agent.hairStyle === 'long' || agent.hairStyle === 'curly') {
    ctx.fillRect(-4, -5, 8, 3);
    ctx.fillRect(-4, -2, 1, 4);
    ctx.fillRect(3, -2, 1, 4);
  } else if (agent.hairStyle === 'mohawk') {
    ctx.fillRect(-1, -6, 2, 4);
  } else if (agent.hairStyle !== 'bald') {
    ctx.fillRect(-4, -5, 8, 2);
  }

  if (agent.job === 'Minero') {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-4, -5, 8, 2);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-1, -5, 2, 1);
  } else if (agent.isRepresentative) {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-3, -6, 6, 1);
  }

  if (agent.jailedDays > 0) {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-3, -5, 1, 10);
    ctx.fillRect(2, -5, 1, 10);
  }

  ctx.restore();
}

export function drawBuildingOccupantHeads(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  badges: BuildingOccupantBadge[] = getBuildingOccupantHeadBadges(state)
): void {
  if (badges.length === 0) return;
  const agentMap = new Map<number, Agent>();
  for (const a of state.agents) agentMap.set(a.id, a);
  const selectedAgentId =
    state.selectedEntity?.kind === 'agent' ? state.selectedEntity.id : state.selectedAgentId;

  for (const badge of badges) {
    const ag = agentMap.get(badge.agentId);
    if (!ag) continue;
    drawVillagerHeadBadge(ctx, ag, badge.x, badge.y, selectedAgentId === ag.id);
  }
}

export function drawFishingRipple(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  animPhase: number
): void {
  const isFishing =
    agent.taskType === 'fish_river' ||
    (agent.taskType === 'manage_building' && agent.job === 'Pescador');
  if (isFishing && Math.abs(agent.y - RIVER_BOTTOM_Y) < 34) {
    const splashStep = Math.floor((animPhase * 4 + agent.id) % 3);
    const rx = Math.round(agent.x + 8);
    const ry = Math.round(RIVER_BOTTOM_Y - 5);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(rx - 3 - splashStep, ry, 2, 1);
    ctx.fillRect(rx + 2 + splashStep, ry, 2, 1);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(rx - 2, ry - 1 - (splashStep % 2), 5, 1);
    ctx.fillRect(rx - 2, ry + 1 + (splashStep % 2), 5, 1);
  }
}

export function drawFamilyHighlightOverlay(
  ctx: CanvasRenderingContext2D,
  state: SimulationState
): void {
  if (state.highlightFamilyAgentId === null) return;
  const target = state.agents.find((a) => a.id === state.highlightFamilyAgentId);
  if (!target) return;

  const partner = target.partnerId !== null ? state.agents.find((a) => a.id === target.partnerId) : null;
  const house = target.houseId !== null ? state.houses.find((h) => h.id === target.houseId) : null;

  ctx.save();
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);

  if (partner) {
    ctx.strokeStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(Math.round(target.x), Math.round(target.y));
    ctx.lineTo(Math.round(partner.x), Math.round(partner.y));
    ctx.stroke();
  }
  if (house) {
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(Math.round(target.x), Math.round(target.y));
    ctx.lineTo(Math.round(house.x), Math.round(house.y));
    ctx.stroke();
  }
  ctx.restore();
}

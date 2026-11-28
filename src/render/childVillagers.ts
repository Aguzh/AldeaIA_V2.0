import type { Agent } from '../types/simulation';
import { drawSpriteFrame, getCutoutSprite, type SpriteRect } from './spriteLoader';

const CHILD_SPRITES = {
  boy: {
    idle: {
      front: { sx: 71, sy: 56, sw: 89, sh: 170 },
      back: { sx: 230, sy: 56, sw: 93, sh: 170 },
      left: { sx: 542, sy: 56, sw: 94, sh: 170 },
      right: { sx: 860, sy: 56, sw: 98, sh: 170 },
    },
    walk: {
      front: { sx: 394, sy: 302, sw: 88, sh: 169 },
      back: { sx: 230, sy: 302, sw: 93, sh: 170 },
      left: { sx: 542, sy: 302, sw: 94, sh: 170 },
      right: { sx: 860, sy: 302, sw: 93, sh: 169 },
    },
  },
  girl: {
    idle: {
      front: { sx: 66, sy: 552, sw: 98, sh: 176 },
      back: { sx: 225, sy: 552, sw: 103, sh: 175 },
      left: { sx: 844, sy: 552, sw: 99, sh: 176 },
      right: { sx: 547, sy: 552, sw: 104, sh: 176 },
    },
    walk: {
      front: { sx: 66, sy: 793, sw: 98, sh: 175 },
      back: { sx: 225, sy: 793, sw: 103, sh: 175 },
      left: { sx: 849, sy: 793, sw: 99, sh: 175 },
      right: { sx: 552, sy: 793, sw: 99, sh: 175 },
    },
  },
} as const;

const CHILD_VARIETY_SPRITES = {
  boys: [
    { sx: 44, sy: 576, sw: 82, sh: 125 },
    { sx: 293, sy: 576, sw: 95, sh: 126 },
    { sx: 440, sy: 585, sw: 66, sh: 117 },
  ],
  girls: [
    { sx: 739, sy: 577, sw: 76, sh: 125 },
    { sx: 876, sy: 568, sw: 72, sh: 133 },
    { sx: 1004, sy: 568, sw: 84, sh: 134 },
    { sx: 1134, sy: 577, sw: 89, sh: 125 },
  ],
} as const;

const lastChildPos = new Map<
  number,
  { x: number; y: number; walkFrame: number; dx: number; dy: number; moving: boolean }
>();

function getChildFacing(agent: Agent): { moving: boolean; dx: number; dy: number } {
  const prev = lastChildPos.get(agent.id);
  if (!prev) {
    lastChildPos.set(agent.id, {
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
 * Renderizado pixel-art 16-bit aislado exclusivamente para aldeanos niños (agent.isChild)
 * usando villagers-children.png con escala 0.68 y fallback procedural automático.
 */
export function drawChildVillager(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  selectedId: number | null,
  animPhase: number
): void {
  ctx.imageSmoothingEnabled = false;
  const x = Math.round(agent.x);
  const y = Math.round(agent.y);
  const scale = 0.68;
  const outline = '#181412';
  const step = Math.round(Math.sin(agent.walkFrame) * 2);
  const skinBase = agent.isSick ? '#cfd8cf' : agent.skin;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Sombra nítida en píxeles
  ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
  ctx.fillRect(-5, 9, 10, 3);

  const motion = getChildFacing(agent);
  const moving = motion.moving;
  const varietyPool =
    agent.sex === 'F' ? CHILD_VARIETY_SPRITES.girls : CHILD_VARIETY_SPRITES.boys;
  const childMod = Math.abs(agent.id) % (varietyPool.length + 1);

  let poseRect: SpriteRect;
  let sprite: HTMLCanvasElement | null = null;
  let flipX = false;

  if (childMod > 0) {
    poseRect = varietyPool[childMod - 1];
    flipX = moving && motion.dx < -0.15;
    sprite = getCutoutSprite('villagersVariety', poseRect.sx, poseRect.sy, poseRect.sw, poseRect.sh, {
      mode: 'flood',
      tolerance: 38,
      extraBgColors: [[141, 153, 163], [120, 134, 147]],
    });
  } else {
    const bank = agent.sex === 'F' ? CHILD_SPRITES.girl : CHILD_SPRITES.boy;
    const walkStride = moving && Math.floor(agent.walkFrame) % 2 === 1;
    const frameSet = walkStride ? bank.walk : bank.idle;

    poseRect = frameSet.front;
    if (moving) {
      if (motion.dy < -0.15 && Math.abs(motion.dy) > Math.abs(motion.dx) * 1.1) {
        poseRect = frameSet.back;
      } else if (Math.abs(motion.dx) > Math.abs(motion.dy) * 0.85) {
        poseRect = motion.dx < 0 ? frameSet.left : frameSet.right;
      }
    }

    sprite = getCutoutSprite(
      'children',
      poseRect.sx,
      poseRect.sy,
      poseRect.sw,
      poseRect.sh,
      { mode: 'flood', tolerance: 34 }
    );
  }

  if (sprite) {
    const bob = moving ? Math.abs(step) : 0;
    const targetH = 34;
    const targetW = Math.round((poseRect.sw / poseRect.sh) * targetH);
    const dx = Math.round(-targetW / 2);
    const dy = Math.round(10 - targetH - bob);
    drawSpriteFrame(ctx, sprite, dx, dy, targetW, targetH, flipX);
  } else {
    ctx.fillStyle = outline;
    ctx.fillRect(-5, 3 + step, 5, 6);
    ctx.fillRect(0, 3 - step, 5, 6);
    ctx.fillStyle = '#334155';
    ctx.fillRect(-4, 3 + step, 3, 3);
    ctx.fillRect(1, 3 - step, 3, 3);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-4, 6 + step, 3, 2);
    ctx.fillRect(1, 6 - step, 3, 2);

    ctx.fillStyle = outline;
    ctx.fillRect(-5, -4, 10, 8);
    ctx.fillStyle = agent.shirt;
    ctx.fillRect(-4, -3, 8, 6);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
    ctx.fillRect(2, -3, 2, 6);
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(-2, -3, 4, 2);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-4, 1, 8, 2);

    ctx.fillStyle = outline;
    ctx.fillRect(-7, -3, 3, 6);
    ctx.fillRect(4, -3, 3, 6);
    ctx.fillStyle = agent.shirt;
    ctx.fillRect(-6, -2, 2, 2);
    ctx.fillRect(4, -2, 2, 2);
    ctx.fillStyle = skinBase;
    ctx.fillRect(-6, 0, 2, 2);
    ctx.fillRect(4, 0, 2, 2);

    ctx.fillStyle = outline;
    ctx.fillRect(-6, -15, 12, 11);
    ctx.fillStyle = skinBase;
    ctx.fillRect(-5, -14, 10, 9);
    ctx.fillStyle = 'rgba(69, 26, 3, 0.16)';
    ctx.fillRect(-5, -7, 10, 2);

    ctx.fillStyle = '#181412';
    ctx.fillRect(-3, -11, 2, 3);
    ctx.fillRect(1, -11, 2, 3);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-3, -11, 1, 1);
    ctx.fillRect(1, -11, 1, 1);
    ctx.fillStyle = '#fda4af';
    ctx.fillRect(-4, -8, 2, 1);
    ctx.fillRect(2, -8, 2, 1);

    ctx.fillStyle = outline;
    if (agent.id % 2 === 0) {
      ctx.fillRect(-6, -17, 12, 4);
      ctx.fillRect(-3, -19, 6, 3);
      ctx.fillStyle = agent.sex === 'F' ? '#f472b6' : '#38bdf8';
      ctx.fillRect(-5, -16, 10, 3);
      ctx.fillRect(-2, -18, 4, 2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-1, -18, 2, 1);
    } else {
      if (agent.hairStyle === 'short') {
        ctx.fillRect(-6, -17, 12, 4);
        ctx.fillStyle = agent.hairColor;
        ctx.fillRect(-5, -16, 10, 3);
      } else if (agent.hairStyle === 'long') {
        ctx.fillRect(-6, -17, 12, 4);
        ctx.fillRect(-7, -14, 3, 8);
        ctx.fillRect(4, -14, 3, 8);
        ctx.fillStyle = agent.hairColor;
        ctx.fillRect(-5, -16, 10, 3);
        ctx.fillRect(-6, -13, 2, 6);
        ctx.fillRect(4, -13, 2, 6);
      } else if (agent.hairStyle === 'mohawk') {
        ctx.fillRect(-2, -19, 4, 5);
        ctx.fillStyle = agent.hairColor;
        ctx.fillRect(-1, -18, 2, 4);
      } else if (agent.hairStyle === 'curly') {
        ctx.fillRect(-6, -18, 12, 5);
        ctx.fillStyle = agent.hairColor;
        ctx.fillRect(-5, -17, 10, 4);
      } else if (agent.hairStyle === 'ponytail') {
        ctx.fillRect(-6, -17, 12, 4);
        ctx.fillRect(4, -15, 4, 6);
        ctx.fillStyle = agent.hairColor;
        ctx.fillRect(-5, -16, 10, 3);
        ctx.fillRect(5, -14, 2, 4);
      }
    }
  }

  if (agent.jailedDays > 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-6, -14, 1, 22);
    ctx.fillRect(5, -14, 1, 22);
  }

  if (selectedId === agent.id) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-10, -21, 20, 33);
  }

  if (agent.isSick) {
    ctx.fillStyle = outline;
    ctx.fillRect(-5, -27, 10, 8);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-4, -26, 8, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -25, 2, 4);
    ctx.fillRect(-2, -24, 4, 2);
  } else if (agent.talkingTimer > 0) {
    ctx.fillStyle = outline;
    ctx.fillRect(-8, -28, 16, 9);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-7, -27, 14, 7);
    ctx.fillStyle = '#181412';
    ctx.fillRect(-4, -24, 2, 2);
    ctx.fillRect(-1, -24, 2, 2);
    ctx.fillRect(2, -24, 2, 2);
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
    ctx.fillStyle = outline;
    ctx.fillRect(-4, -26, 8, 6);
    ctx.fillStyle = emoColors[agent.emotion];
    ctx.fillRect(-3, -25, 6, 4);
  }

  if (agent.taskType === 'sleep') {
    const zFloat = Math.round(((animPhase * 1.4 + agent.id * 0.4) % 1) * 6);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Z', 8, -17 - zFloat);
    ctx.font = 'bold 6px monospace';
    ctx.fillText('z', 13, -22 - zFloat);
  }

  ctx.restore();
}

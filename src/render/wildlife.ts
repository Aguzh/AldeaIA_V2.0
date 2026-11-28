import type { Animal, SelectedEntity } from '../types/simulation';
import { drawSpriteFrame, getCutoutSprite, type SpriteRect } from './spriteLoader';

const WILDLIFE_SPRITES: Partial<Record<Animal['type'], { rect: SpriteRect; dw: number; dh: number }>> = {
  cow: { rect: { sx: 4, sy: 20, sw: 206, sh: 149 }, dw: 29, dh: 21 },
  sheep: { rect: { sx: 440, sy: 30, sw: 185, sh: 139 }, dw: 23, dh: 18 },
  chicken: { rect: { sx: 660, sy: 35, sw: 129, sh: 134 }, dw: 16, dh: 17 },
  horse: { rect: { sx: 829, sy: 15, sw: 185, sh: 159 }, dw: 28, dh: 24 },
  wildcat: { rect: { sx: 235, sy: 209, sw: 180, sh: 129 }, dw: 24, dh: 17 },
};

const DOG_SPRITES = {
  front: { sx: 71, sy: 28, sw: 90, sh: 176 },
  sit: { sx: 300, sy: 25, sw: 90, sh: 180 },
  back: { sx: 534, sy: 24, sw: 84, sh: 180 },
  sideLeft: { sx: 708, sy: 39, sw: 182, sh: 149 },
  sideRightA: { sx: 945, sy: 39, sw: 180, sh: 149 },
  sideRightB: { sx: 1167, sy: 39, sw: 188, sh: 149 },
} as const;

const CAT_SPRITES = [
  {
    front: { sx: 165, sy: 44, sw: 52, sh: 136 },
    back: { sx: 165, sy: 44, sw: 52, sh: 136 },
    sideA: { sx: 260, sy: 83, sw: 95, sh: 93 },
    sideB: { sx: 377, sy: 82, sw: 94, sh: 94 },
  },
  {
    front: { sx: 717, sy: 75, sw: 64, sh: 101 },
    back: { sx: 618, sy: 35, sw: 52, sh: 145 },
    sideA: { sx: 809, sy: 75, sw: 93, sh: 100 },
    sideB: { sx: 921, sy: 78, sw: 90, sh: 97 },
  },
  {
    front: { sx: 1049, sy: 78, sw: 74, sh: 98 },
    back: { sx: 1049, sy: 78, sw: 74, sh: 98 },
    sideA: { sx: 1156, sy: 84, sw: 96, sh: 92 },
    sideB: { sx: 1269, sy: 83, sw: 95, sh: 93 },
  },
] as const;

const WILD_BEAR_SPRITES = [
  {
    front: { sx: 24, sy: 244, sw: 113, sh: 138 },
    walkFront: { sx: 187, sy: 244, sw: 105, sh: 138 },
    back: { sx: 24, sy: 244, sw: 113, sh: 138 },
    sideLeftA: { sx: 353, sy: 267, sw: 122, sh: 115 },
    sideLeftB: { sx: 508, sy: 276, sw: 139, sh: 105 },
  },
  {
    front: { sx: 729, sy: 264, sw: 79, sh: 117 },
    walkFront: { sx: 729, sy: 264, sw: 79, sh: 117 },
    back: { sx: 901, sy: 262, sw: 79, sh: 118 },
    sideLeftA: { sx: 1046, sy: 278, sw: 130, sh: 103 },
    sideLeftB: { sx: 1216, sy: 279, sw: 132, sh: 102 },
  },
] as const;

const TAMED_BEAR_SPRITES = {
  front: { sx: 27, sy: 456, sw: 107, sh: 151 },
  walkFront: { sx: 193, sy: 462, sw: 96, sh: 145 },
  backA: { sx: 723, sy: 484, sw: 90, sh: 123 },
  backB: { sx: 895, sy: 483, sw: 88, sh: 124 },
  sideLeft: { sx: 526, sy: 499, sw: 119, sh: 107 },
  sideRightA: { sx: 1047, sy: 508, sw: 132, sh: 99 },
  sideRightB: { sx: 1217, sy: 508, sw: 132, sh: 99 },
} as const;

function resolveExtraAnimalSprite(
  animal: Animal,
  dir: number
): { sprite: HTMLCanvasElement; dw: number; dh: number; flipX: boolean } | null {
  const moving = Math.hypot(animal.vx, animal.vy) > 0.25;
  const isVertical = moving && Math.abs(animal.vy) > Math.abs(animal.vx) * 1.15;
  const isUp = isVertical && animal.vy < 0;
  const stride = Math.floor(animal.walkFrame) % 2 === 1;

  if (animal.type === 'dog') {
    let rect: SpriteRect;
    let flipX = false;
    if (isUp) {
      rect = DOG_SPRITES.back;
    } else if (isVertical) {
      rect = DOG_SPRITES.front;
    } else if (moving) {
      if (dir < 0) {
        rect = DOG_SPRITES.sideLeft;
      } else {
        rect = stride ? DOG_SPRITES.sideRightB : DOG_SPRITES.sideRightA;
      }
    } else {
      rect = DOG_SPRITES.sit;
    }
    const sprite = getCutoutSprite('dogFish', rect.sx, rect.sy, rect.sw, rect.sh, {
      mode: 'flood',
      tolerance: 38,
      extraBgColors: [[124, 138, 147]],
    });
    if (!sprite) return null;
    const dh = 19;
    const dw = Math.round((rect.sw / rect.sh) * dh);
    return { sprite, dw, dh, flipX };
  }

  if (animal.type === 'cat') {
    const coat = CAT_SPRITES[Math.abs(animal.id) % CAT_SPRITES.length];
    let rect: SpriteRect = coat.front;
    let flipX = false;
    if (isUp) {
      rect = coat.back;
    } else if (moving && !isVertical) {
      rect = stride ? coat.sideB : coat.sideA;
      flipX = dir < 0;
    }
    const sprite = getCutoutSprite('catsBears', rect.sx, rect.sy, rect.sw, rect.sh, {
      mode: 'flood',
      tolerance: 36,
      extraBgColors: [[140, 152, 160], [153, 170, 177]],
    });
    if (!sprite) return null;
    const dh = 15;
    const dw = Math.round((rect.sw / rect.sh) * dh);
    return { sprite, dw, dh, flipX };
  }

  if (animal.type === 'bear') {
    let rect: SpriteRect;
    let flipX = false;
    if (animal.tamed) {
      if (isUp) {
        rect = stride ? TAMED_BEAR_SPRITES.backB : TAMED_BEAR_SPRITES.backA;
      } else if (moving && !isVertical) {
        if (dir < 0) {
          rect = TAMED_BEAR_SPRITES.sideLeft;
        } else {
          rect = stride ? TAMED_BEAR_SPRITES.sideRightB : TAMED_BEAR_SPRITES.sideRightA;
        }
      } else {
        rect = stride ? TAMED_BEAR_SPRITES.walkFront : TAMED_BEAR_SPRITES.front;
      }
    } else {
      const species = WILD_BEAR_SPRITES[Math.abs(animal.id) % WILD_BEAR_SPRITES.length];
      if (isUp) {
        rect = species.back;
      } else if (moving && !isVertical) {
        rect = stride ? species.sideLeftB : species.sideLeftA;
        flipX = dir > 0;
      } else {
        rect = stride ? species.walkFront : species.front;
      }
    }
    const sprite = getCutoutSprite('catsBears', rect.sx, rect.sy, rect.sw, rect.sh, {
      mode: 'flood',
      tolerance: 36,
      extraBgColors: [[154, 167, 175], [140, 152, 160], [116, 131, 138]],
    });
    if (!sprite) return null;
    const dh = animal.tamed ? 28 : 29;
    const dw = Math.round((rect.sw / rect.sh) * dh);
    return { sprite, dw, dh, flipX };
  }

  return null;
}

/**
 * Renderizado pixel-art 16-bit para animales terrestres, ganado, mascotas y fauna salvaje del mapa
 * usando sprites de wildlife-resources.png, wildlife-cats-bears.jpg y dog-and-fish.jpg con fallback procedural automático.
 * (Los peces del río se dibujan en terrainAndWater.ts antes del puente para nadar siempre por debajo.)
 */
export function drawWildlifeUnit(
  ctx: CanvasRenderingContext2D,
  animal: Animal,
  isSelected: boolean,
  animPhase: number
): void {
  ctx.imageSmoothingEnabled = false;
  const x = Math.round(animal.x);
  const y = Math.round(animal.y);
  const dir = animal.vx >= 0 ? 1 : -1;
  const step = Math.round(Math.sin(animal.walkFrame) * 1.5);
  const outline = '#181412';

  ctx.save();
  ctx.translate(x, y);

  const extraSprite = resolveExtraAnimalSprite(animal, dir);
  if (extraSprite) {
    const bob = Math.abs(step);
    const halfShadow = Math.max(5, Math.round(extraSprite.dw * 0.36));
    ctx.fillStyle = animal.type === 'bear' && !animal.tamed ? 'rgba(15, 23, 42, 0.38)' : 'rgba(15, 23, 42, 0.28)';
    ctx.fillRect(-halfShadow, 6, halfShadow * 2, 3);

    drawSpriteFrame(
      ctx,
      extraSprite.sprite,
      Math.round(-extraSprite.dw / 2),
      Math.round(8 - extraSprite.dh - bob),
      extraSprite.dw,
      extraSprite.dh,
      extraSprite.flipX
    );

    if (animal.type === 'bear' && animal.tamed) {
      // Distintivo discreto de oso domesticado (destello dorado de cascabel)
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-1, Math.round(8 - extraSprite.dh * 0.42 - bob), 2, 2);
      ctx.fillStyle = '#4ade80';
      ctx.fillRect(Math.round(extraSprite.dw * 0.34), Math.round(8 - extraSprite.dh + 1), 3, 3);
    } else if (animal.type === 'bear' && !animal.tamed) {
      ctx.fillStyle = '#f87171';
      ctx.fillRect(Math.round(extraSprite.dw * 0.32), Math.round(8 - extraSprite.dh + 2), 2, 2);
    }
  } else {
    const spriteSpec = WILDLIFE_SPRITES[animal.type];
    const sprite = spriteSpec
      ? getCutoutSprite(
          'wildlife',
          spriteSpec.rect.sx,
          spriteSpec.rect.sy,
          spriteSpec.rect.sw,
          spriteSpec.rect.sh,
          { mode: 'flood', tolerance: 36 }
        )
      : null;

    if (sprite && spriteSpec) {
      const bob = Math.abs(step);
      const halfShadow = Math.max(5, Math.round(spriteSpec.dw * 0.38));
      ctx.fillStyle = 'rgba(15, 23, 42, 0.30)';
      ctx.fillRect(-halfShadow, 6, halfShadow * 2, 3);

      drawSpriteFrame(
        ctx,
        sprite,
        Math.round(-spriteSpec.dw / 2),
        Math.round(8 - spriteSpec.dh - bob),
        spriteSpec.dw,
        spriteSpec.dh,
        dir < 0
      );

      if (animal.type === 'horse' && animal.riderId !== null) {
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-3, -6 - bob, 4, 2);
        const dust = Math.round((animPhase * 4) % 3);
        const dustDir = dir < 0 ? 1 : -1;
        ctx.fillStyle = 'rgba(214, 211, 209, 0.65)';
        ctx.fillRect(dustDir * (13 + dust * 2), 6, 3, 2);
        ctx.fillRect(dustDir * (17 + dust), 7, 2, 2);
      }
    } else {
    ctx.save();
    ctx.scale(dir, 1);

    switch (animal.type) {
      case 'cat': {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
        ctx.fillRect(-6, 5, 12, 2);
        ctx.fillStyle = outline;
        ctx.fillRect(-7, -6, 3, 7);
        ctx.fillRect(-5, -2, 10, 7);
        ctx.fillRect(1, -7, 7, 6);
        ctx.fillRect(1, -9, 3, 3);
        ctx.fillRect(5, -9, 3, 3);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(-6, -5, 2, 5);
        ctx.fillRect(-4, -1, 8, 5);
        ctx.fillRect(2, -6, 5, 4);
        ctx.fillRect(2, -8, 2, 2);
        ctx.fillRect(5, -8, 2, 2);
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(2, 1, 3, 3);
        ctx.fillStyle = '#c2410c';
        ctx.fillRect(-2, -1, 1, 3);
        ctx.fillRect(0, -1, 1, 3);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(5, -5, 1, 1);
        ctx.fillStyle = '#fda4af';
        ctx.fillRect(6, -4, 1, 1);
        break;
      }
      case 'dog': {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
        ctx.fillRect(-7, 6, 14, 2);
        ctx.fillStyle = outline;
        ctx.fillRect(-6, 3 + step, 4, 4);
        ctx.fillRect(2, 3 - step, 4, 4);
        ctx.fillRect(-7, -3, 13, 8);
        ctx.fillRect(2, -7, 7, 7);
        ctx.fillRect(-9, -4, 3, 3);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(-6, -2, 11, 6);
        ctx.fillRect(3, -6, 5, 5);
        ctx.fillRect(-8, -3, 2, 2);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(-5, 3 + step, 2, 3);
        ctx.fillRect(3, 3 - step, 2, 3);
        ctx.fillRect(2, -5, 2, 4);
        ctx.fillRect(-6, 2, 11, 2);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(3, -1, 2, 4);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(4, 2, 1, 1);
        ctx.fillStyle = '#181412';
        ctx.fillRect(6, -5, 1, 2);
        ctx.fillRect(7, -3, 1, 1);
        break;
      }
      case 'wildcat': {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
        ctx.fillRect(-7, 6, 14, 2);
        ctx.fillStyle = outline;
        ctx.fillRect(-7, -3, 13, 8);
        ctx.fillRect(2, -7, 8, 7);
        ctx.fillRect(2, -9, 2, 3);
        ctx.fillRect(6, -9, 2, 3);
        ctx.fillRect(-10, -2, 4, 2);
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(-6, -2, 11, 6);
        ctx.fillRect(3, -6, 6, 5);
        ctx.fillRect(3, -8, 1, 2);
        ctx.fillRect(7, -8, 1, 2);
        ctx.fillRect(-9, -1, 3, 1);
        ctx.fillStyle = '#7c2d12';
        ctx.fillRect(-4, -1, 2, 2);
        ctx.fillRect(0, 0, 2, 2);
        ctx.fillRect(-5, 3 + step, 2, 3);
        ctx.fillRect(2, 3 - step, 2, 3);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(7, -5, 2, 2);
        break;
      }
      case 'bear': {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.38)';
        ctx.fillRect(-11, 8, 22, 4);
        ctx.fillStyle = outline;
        ctx.fillRect(-10, -7, 19, 14);
        ctx.fillRect(4, -10, 9, 9);
        ctx.fillRect(4, -12, 3, 3);
        ctx.fillRect(8, -12, 3, 3);
        ctx.fillRect(-9, 5 + step, 6, 5);
        ctx.fillRect(2, 5 - step, 6, 5);
        ctx.fillStyle = '#5c2d0c';
        ctx.fillRect(-9, -6, 17, 12);
        ctx.fillRect(5, -9, 7, 7);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-7, -6, 11, 5);
        ctx.fillRect(5, -11, 2, 2);
        ctx.fillRect(9, -11, 2, 2);
        ctx.fillStyle = '#d6a472';
        ctx.fillRect(9, -6, 3, 3);
        ctx.fillStyle = '#290f02';
        ctx.fillRect(-8, 5 + step, 4, 4);
        ctx.fillRect(3, 5 - step, 4, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(8, -8, 2, 2);
        break;
      }
      case 'chicken': {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
        ctx.fillRect(-4, 4, 8, 2);
        ctx.fillStyle = outline;
        ctx.fillRect(-5, -3, 9, 7);
        ctx.fillRect(0, -6, 6, 6);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-4, -2, 7, 5);
        ctx.fillRect(1, -5, 4, 4);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-3, 0, 4, 2);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(2, -7, 3, 2);
        ctx.fillRect(4, -3, 1, 2);
        ctx.fillStyle = '#f97316';
        ctx.fillRect(5, -4, 2, 2);
        ctx.fillRect(-2, 3 + step, 1, 2);
        ctx.fillRect(1, 3 - step, 1, 2);
        ctx.fillStyle = '#181412';
        ctx.fillRect(3, -5, 1, 1);
        break;
      }
      case 'cow': {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
        ctx.fillRect(-9, 7, 18, 3);
        ctx.fillStyle = outline;
        ctx.fillRect(-9, -6, 17, 11);
        ctx.fillRect(4, -8, 8, 8);
        ctx.fillRect(-8, 4 + step, 4, 5);
        ctx.fillRect(3, 4 - step, 4, 5);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-8, -5, 15, 9);
        ctx.fillRect(5, -7, 6, 6);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-6, -4, 4, 4);
        ctx.fillRect(0, -2, 4, 4);
        ctx.fillRect(-7, 4 + step, 2, 4);
        ctx.fillRect(4, 4 - step, 2, 4);
        ctx.fillStyle = '#fde68a';
        ctx.fillRect(5, -9, 2, 2);
        ctx.fillRect(9, -9, 2, 2);
        ctx.fillStyle = '#f9a8d4';
        ctx.fillRect(8, -3, 3, 2);
        ctx.fillRect(-2, 4, 4, 1);
        ctx.fillStyle = '#181412';
        ctx.fillRect(8, -6, 1, 2);
        break;
      }
      case 'horse': {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.32)';
        ctx.fillRect(-10, 8, 20, 3);
        ctx.fillStyle = outline;
        ctx.fillRect(-10, -5, 18, 10);
        ctx.fillRect(4, -11, 7, 10);
        ctx.fillRect(7, -11, 6, 6);
        ctx.fillRect(-9, 4 + step, 4, 6);
        ctx.fillRect(5, 4 - step, 4, 6);
        ctx.fillStyle = '#92400e';
        ctx.fillRect(-9, -4, 16, 8);
        ctx.fillRect(5, -10, 5, 8);
        ctx.fillRect(8, -10, 4, 4);
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-7, -4, 12, 3);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(10, -9, 2, 2);
        ctx.fillStyle = '#1e1b18';
        ctx.fillRect(-12, -3, 3, 7);
        ctx.fillRect(4, -10, 2, 6);
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-8, 4 + step, 2, 5);
        ctx.fillRect(6, 4 - step, 2, 5);
        ctx.fillStyle = '#181412';
        ctx.fillRect(9, -9, 1, 1);
        if (animal.riderId !== null) {
          ctx.fillStyle = outline;
          ctx.fillRect(-7, -6, 11, 6);
          ctx.fillStyle = '#b45309';
          ctx.fillRect(-6, -5, 9, 4);
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-5, -3, 3, 2);
          ctx.fillRect(-1, -3, 3, 2);
          const dust = Math.round((animPhase * 4) % 3);
          ctx.fillStyle = 'rgba(214, 211, 209, 0.65)';
          ctx.fillRect(-13 - dust * 2, 6, 3, 2);
          ctx.fillRect(-17 - dust, 7, 2, 2);
        }
        break;
      }
      case 'sheep': {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
        ctx.fillRect(-7, 5, 14, 2);
        ctx.fillStyle = outline;
        ctx.fillRect(-7, -5, 13, 9);
        ctx.fillRect(3, -4, 6, 6);
        ctx.fillRect(-5, 3 + step, 3, 3);
        ctx.fillRect(2, 3 - step, 3, 3);
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(-6, -4, 11, 7);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-6, 1, 11, 2);
        ctx.fillRect(-2, -3, 3, 2);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(4, -3, 4, 4);
        ctx.fillRect(-4, 3 + step, 2, 2);
        ctx.fillRect(2, 3 - step, 2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(6, -2, 1, 1);
        break;
      }
      default:
        break;
    }

    ctx.restore();
    }
  }

  if (animal.tamed) {
    ctx.fillStyle = outline;
    ctx.fillRect(-4, -14, 8, 5);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(-3, -13, 6, 3);
    ctx.fillStyle = '#a7f3d0';
    ctx.fillRect(-2, -13, 2, 1);
  }

  if (isSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-12, -14, 24, 24);
  }

  ctx.restore();
}

export function drawWildlifeAnimals(
  ctx: CanvasRenderingContext2D,
  animals: Animal[],
  selectedEntity: SelectedEntity | null,
  animPhase: number
): void {
  const landAnimals = animals
    .filter((a) => a.type !== 'fish')
    .sort((a, b) => a.y - b.y);

  for (const animal of landAnimals) {
    const isSel = selectedEntity?.kind === 'animal' && selectedEntity.id === animal.id;
    drawWildlifeUnit(ctx, animal, isSel, animPhase);
  }
}

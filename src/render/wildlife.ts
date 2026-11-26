import type { Animal, SelectedEntity } from '../types/simulation';

/**
 * Renderizado pixel-art para animales terrestres, ganado, mascotas y fauna salvaje del mapa.
 * (Los peces del río se dibujan en terrainAndWater.ts antes del puente para nadar siempre por debajo.)
 */
export function drawWildlifeUnit(
  ctx: CanvasRenderingContext2D,
  animal: Animal,
  isSelected: boolean,
  animPhase: number
): void {
  const x = Math.round(animal.x);
  const y = Math.round(animal.y);
  const dir = animal.vx >= 0 ? 1 : -1;
  const step = Math.sin(animal.walkFrame) * 1.5;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);

  switch (animal.type) {
    case 'cat': {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(-5, 4, 10, 2);
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-4, -1, 8, 5);
      ctx.fillRect(2, -5, 5, 4);
      ctx.fillRect(2, -7, 2, 2);
      ctx.fillRect(5, -7, 2, 2);
      ctx.fillRect(-6, -5, 2, 5);
      break;
    }
    case 'dog': {
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(-6, 5, 12, 2);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-6, -2, 11, 6);
      ctx.fillRect(3, -6, 5, 5);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(2, -2, 2, 4);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-5, 3 + step, 2, 3);
      ctx.fillRect(2, 3 - step, 2, 3);
      break;
    }
    case 'wildcat': {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(-6, 5, 12, 2);
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-6, -2, 11, 6);
      ctx.fillRect(3, -6, 6, 5);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(7, -5, 2, 2);
      break;
    }
    case 'bear': {
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(-10, 7, 20, 4);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-9, -6, 17, 12);
      ctx.fillRect(5, -9, 7, 7);
      ctx.fillStyle = '#290f02';
      ctx.fillRect(-8, 5 + step, 4, 4);
      ctx.fillRect(3, 5 - step, 4, 4);
      break;
    }
    case 'chicken': {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-4, -2, 7, 5);
      ctx.fillRect(1, -5, 4, 4);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(2, -7, 3, 2);
      break;
    }
    case 'cow': {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-8, -5, 15, 9);
      ctx.fillRect(5, -7, 6, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-6, -4, 4, 4);
      ctx.fillRect(0, -2, 4, 4);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-7, 4 + step, 2, 4);
      ctx.fillRect(4, 4 - step, 2, 4);
      break;
    }
    case 'horse': {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(-9, 8, 18, 3);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-9, -4, 16, 8);
      ctx.fillRect(5, -10, 5, 8);
      ctx.fillRect(8, -10, 4, 4);
      ctx.fillStyle = '#1e1b18';
      ctx.fillRect(-12, -3, 3, 7);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-8, 4 + step, 2, 5);
      ctx.fillRect(6, 4 - step, 2, 5);
      if (animal.riderId !== null) {
        // Alforjas de caravana cargadas + silla + estela de polvo al trotar
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-6, -5, 9, 5);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-5, -3, 3, 2);
        ctx.fillRect(-1, -3, 3, 2);
        const dust = Math.floor(animPhase * 4) % 3;
        ctx.fillStyle = 'rgba(214, 211, 209, 0.55)';
        ctx.fillRect(-13 - dust * 2, 6, 3, 2);
        ctx.fillRect(-17 - dust, 7, 2, 2);
      }
      break;
    }
    case 'sheep': {
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(-6, -4, 11, 7);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(4, -3, 4, 4);
      break;
    }
    default:
      break;
  }

  if (animal.tamed) {
    ctx.fillStyle = '#10b981';
    ctx.fillRect(-4, -12, 8, 3);
  }

  if (isSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.5;
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

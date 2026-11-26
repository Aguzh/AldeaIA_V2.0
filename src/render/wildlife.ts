import type { Animal, SelectedEntity } from '../types/simulation';

/**
 * Renderizado pixel-art 16-bit (estilo Stardew Valley / Pokémon clásico) para animales terrestres,
 * ganado, mascotas y fauna salvaje del mapa con contorno oscuro marcado y bloques de color/sombra.
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
  const step = Math.round(Math.sin(animal.walkFrame) * 1.5);
  const outline = '#181412';

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);

  switch (animal.type) {
    case 'cat': {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.fillRect(-6, 5, 12, 2);
      // Cola curvada + cuerpo atigrado naranja con contorno
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
      // Pecho crema + rayas + ojitos verdes
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
      // Patas animadas
      ctx.fillStyle = outline;
      ctx.fillRect(-6, 3 + step, 4, 4);
      ctx.fillRect(2, 3 - step, 4, 4);
      ctx.fillRect(-7, -3, 13, 8);
      ctx.fillRect(2, -7, 7, 7);
      ctx.fillRect(-9, -4, 3, 3);
      // Cuerpo dorado-ámbar
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-6, -2, 11, 6);
      ctx.fillRect(3, -6, 5, 5);
      ctx.fillRect(-8, -3, 2, 2);
      // Patas + lomo sombreado + oreja caída
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-5, 3 + step, 2, 3);
      ctx.fillRect(3, 3 - step, 2, 3);
      ctx.fillRect(2, -5, 2, 4);
      ctx.fillRect(-6, 2, 11, 2);
      // Collar rojo con chapa dorada + ojo
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
      // Manchas oscuras y ojos feroces
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
      // Contorno grueso de oso pardo 16-bit
      ctx.fillStyle = outline;
      ctx.fillRect(-10, -7, 19, 14);
      ctx.fillRect(4, -10, 9, 9);
      ctx.fillRect(4, -12, 3, 3);
      ctx.fillRect(8, -12, 3, 3);
      ctx.fillRect(-9, 5 + step, 6, 5);
      ctx.fillRect(2, 5 - step, 6, 5);
      // Pelaje pardo + hombros iluminados + hocico claro
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
      // Cuerpo blanco crema + ala sombreada
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-4, -2, 7, 5);
      ctx.fillRect(1, -5, 4, 4);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-3, 0, 4, 2);
      // Cresta roja, pico naranja, ojo y patitas
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
      // Contorno oscuro + patas
      ctx.fillStyle = outline;
      ctx.fillRect(-9, -6, 17, 11);
      ctx.fillRect(4, -8, 8, 8);
      ctx.fillRect(-8, 4 + step, 4, 5);
      ctx.fillRect(3, 4 - step, 4, 5);
      // Pelaje blanco crema + manchas negras 16-bit
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-8, -5, 15, 9);
      ctx.fillRect(5, -7, 6, 6);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-6, -4, 4, 4);
      ctx.fillRect(0, -2, 4, 4);
      ctx.fillRect(-7, 4 + step, 2, 4);
      ctx.fillRect(4, 4 - step, 2, 4);
      // Cuernos, hocico rosado y ojo
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
      // Contorno oscuro
      ctx.fillStyle = outline;
      ctx.fillRect(-10, -5, 18, 10);
      ctx.fillRect(4, -11, 7, 10);
      ctx.fillRect(7, -11, 6, 6);
      ctx.fillRect(-9, 4 + step, 4, 6);
      ctx.fillRect(5, 4 - step, 4, 6);
      // Cuerpo castaño + cuello + hocico con lucero blanco
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-9, -4, 16, 8);
      ctx.fillRect(5, -10, 5, 8);
      ctx.fillRect(8, -10, 4, 4);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-7, -4, 12, 3);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(10, -9, 2, 2);
      // Crin y cola oscuras + patas sombreadas
      ctx.fillStyle = '#1e1b18';
      ctx.fillRect(-12, -3, 3, 7);
      ctx.fillRect(4, -10, 2, 6);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-8, 4 + step, 2, 5);
      ctx.fillRect(6, 4 - step, 2, 5);
      ctx.fillStyle = '#181412';
      ctx.fillRect(9, -9, 1, 1);
      if (animal.riderId !== null) {
        // Silla de montar + alforjas doradas + estela de polvo
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
      // Contorno de vellón esponjoso
      ctx.fillStyle = outline;
      ctx.fillRect(-7, -5, 13, 9);
      ctx.fillRect(3, -4, 6, 6);
      ctx.fillRect(-5, 3 + step, 3, 3);
      ctx.fillRect(2, 3 - step, 3, 3);
      // Lana esponjosa con sombreado 16-bit
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-6, -4, 11, 7);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-6, 1, 11, 2);
      ctx.fillRect(-2, -3, 3, 2);
      // Carita y patitas oscuras + ojito blanco
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

  // Distintivo de animal domesticado (corazón/placa esmeralda nítida)
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

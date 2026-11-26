import { CANVAS_HEIGHT, CANVAS_WIDTH, isNightMinute } from '../simulation/rules';
import type { SimulationState } from '../types/simulation';
import {
  drawAdultVillager,
  drawFamilyHighlightOverlay,
  drawFishingRipple,
} from './adultVillagers';
import {
  drawActiveConstructionScaffolding,
  drawBuildingsAndFarms,
} from './buildingsAndFarms';
import { drawChildVillager } from './childVillagers';
import {
  drawAtmosphericLighting,
  drawFires,
  drawFloatingEffects,
  drawForestAndMountains,
  drawResourceNodes,
  drawWeatherEffects,
  getSunShadowOffset,
} from './natureAndProps';
import {
  drawBiomeTerrain,
  drawBridge,
  drawRiverFish,
  drawRiverWater,
  drawRoads,
} from './terrainAndWater';
import { drawWildlifeAnimals } from './wildlife';

export interface CameraView {
  zoom: number;
  panX: number;
  panY: number;
}

/**
 * Coordinador principal de capas visuales del mundo en estética pixel-art 16-bit nítida:
 * terreno (biomas y caminos) -> río -> peces -> puente -> cultivos/edificios/naturaleza ->
 * animales -> aldeanos adultos/niños -> efectos (fuego, clima, iluminación y flotantes).
 */
export function renderWorldScene(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  camera: CameraView = { zoom: 1, panX: 0, panY: 0 }
): void {
  ctx.imageSmoothingEnabled = false;
  const isNight = isNightMinute(state.minute);
  const animPhase = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.002;
  const shadow = getSunShadowOffset(state.minute, isNight);
  const glintTick = Math.floor(animPhase * 2.5);

  const occupiedHouseIds = new Set<number>();
  for (const ag of state.agents) {
    if (ag.houseId !== null) occupiedHouseIds.add(ag.houseId);
  }

  ctx.fillStyle = '#050914';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2 + camera.panX, CANVAS_HEIGHT / 2 + camera.panY);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-CANVAS_WIDTH / 2, -CANVAS_HEIGHT / 2);

  ctx.beginPath();
  ctx.rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.clip();

  // 1. Terreno (biomas, zonas laterales y caminos)
  drawBiomeTerrain(ctx, state.biome, state.season);
  drawRoads(ctx, state.roads);

  // 2. Río -> 3. Peces -> 4. Puente (los peces siempre nadan por debajo del puente)
  drawRiverWater(ctx, state.minute, state.season, animPhase);
  drawRiverFish(ctx, state.animals, state.selectedEntity, animPhase);
  drawBridge(ctx, state.bridge, state.selectedEntity?.kind === 'bridge');

  // 5. Cultivos, plaza, casas, edificios especiales y naturaleza
  drawBuildingsAndFarms(
    ctx,
    state,
    isNight,
    occupiedHouseIds,
    shadow,
    animPhase,
    state.selectedEntity
  );
  drawForestAndMountains(ctx, state.season, animPhase, shadow);
  drawResourceNodes(ctx, state.resources, animPhase);

  // 6. Animales terrestres y fauna del mapa
  drawWildlifeAnimals(ctx, state.animals, state.selectedEntity, animPhase);

  // 7. Aldeanos adultos, ancianos y niños ordenados por profundidad (y)
  const sortedAgents = [...state.agents].sort((a, b) => a.y - b.y);
  const selAgentId =
    state.selectedEntity?.kind === 'agent' ? state.selectedEntity.id : state.selectedAgentId;
  for (const agent of sortedAgents) {
    drawActiveConstructionScaffolding(ctx, agent, animPhase, glintTick);
    drawFishingRipple(ctx, agent, animPhase);
    if (agent.isChild) {
      drawChildVillager(ctx, agent, selAgentId, animPhase);
    } else {
      drawAdultVillager(ctx, agent, selAgentId, animPhase);
    }
  }

  // 8. Efectos: fuego, vínculos familiares, flotantes, clima e iluminación atmosférica
  drawFires(ctx, state.fires, state.minute);
  drawFamilyHighlightOverlay(ctx, state);
  drawFloatingEffects(ctx, state.floatingEffects);
  drawWeatherEffects(ctx, state, animPhase);
  drawAtmosphericLighting(ctx, state, isNight, occupiedHouseIds);

  ctx.restore();
}

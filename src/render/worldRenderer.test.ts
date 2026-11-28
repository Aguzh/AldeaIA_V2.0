import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, renderWorld } from '../simulation/engine';
import {
  BRIDGE_HALF_WIDTH,
  RIVER_BOTTOM_Y,
  RIVER_TOP_Y,
  createAnimal,
  createBridge,
} from '../simulation/rules';
import { drawAdultVillager } from './adultVillagers';
import { drawBuildingsAndFarms } from './buildingsAndFarms';
import { drawChildVillager } from './childVillagers';
import {
  drawFires,
  drawForestAndMountains,
  drawResourceNodes,
  getSunShadowOffset,
} from './natureAndProps';
import {
  drawBiomeTerrain,
  drawBridge,
  drawRiverWater,
  drawRoads,
} from './terrainAndWater';
import { renderWorldScene } from './worldRenderer';

interface DrawOp {
  op: 'fillRect' | 'strokeRect' | 'scale' | 'translate' | 'fillText' | 'ellipse';
  fillStyle?: string | CanvasGradient | CanvasPattern;
  args: number[];
}

function createMockCanvasContext() {
  const ops: DrawOp[] = [];
  const ctx: Record<string, unknown> = {
    imageSmoothingEnabled: true,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over',
    font: '10px sans-serif',
    textAlign: 'left',
    save() {},
    restore() {},
    beginPath() {},
    closePath() {},
    rect() {},
    clip() {},
    arc() {},
    fill() {},
    stroke() {},
    moveTo() {},
    lineTo() {},
    setLineDash() {},
    createRadialGradient() {
      return { addColorStop() {} };
    },
    translate(x: number, y: number) {
      ops.push({ op: 'translate', args: [x, y] });
    },
    scale(x: number, y: number) {
      ops.push({ op: 'scale', args: [x, y] });
    },
    fillRect(x: number, y: number, w: number, h: number) {
      ops.push({
        op: 'fillRect',
        fillStyle: ctx.fillStyle as string,
        args: [x, y, w, h],
      });
    },
    strokeRect(x: number, y: number, w: number, h: number) {
      ops.push({ op: 'strokeRect', args: [x, y, w, h] });
    },
    ellipse(x: number, y: number, rx: number, ry: number) {
      ops.push({ op: 'ellipse', args: [x, y, rx, ry] });
    },
    fillText(_text: string, x: number, y: number) {
      ops.push({ op: 'fillText', args: [x, y] });
    },
  };
  return {
    ctx: ctx as unknown as CanvasRenderingContext2D,
    ops,
  };
}

test('renderWorldScene enforces crisp pixel-art imageSmoothingEnabled = false and delegates from engine.renderWorld', () => {
  const origNow = performance.now;
  performance.now = () => 1000;
  try {
    const state = createInitialState();
    const { ctx: ctxScene, ops: opsScene } = createMockCanvasContext();
    ctxScene.imageSmoothingEnabled = true;
    renderWorldScene(ctxScene, state);
    assert.equal(ctxScene.imageSmoothingEnabled, false);
    assert.ok(opsScene.length > 50);

    const { ctx: ctxEngine, ops: opsEngine } = createMockCanvasContext();
    ctxEngine.imageSmoothingEnabled = true;
    renderWorld(ctxEngine, state);
    assert.equal(ctxEngine.imageSmoothingEnabled, false);
    assert.equal(opsEngine.length, opsScene.length);
  } finally {
    performance.now = origNow;
  }
});

test('renderWorldScene draws river water -> river fish -> bridge in strict back-to-front order so fish always swim under the bridge', () => {
  const state = createInitialState();
  if (!state.bridge) {
    state.bridge = createBridge(state, 'Tester');
  }
  const bridgeX = state.bridge.x;
  const riverMidY = Math.round((RIVER_TOP_Y + RIVER_BOTTOM_Y) / 2);

  // Coloca un pez dorado exactamente debajo del puente para verificar el orden de capas
  state.animals = state.animals.filter((a) => a.type !== 'fish');
  const fishUnderBridge = createAnimal(state, 'fish', bridgeX, riverMidY, 'goldfish');
  state.animals.push(fishUnderBridge);

  const { ctx, ops } = createMockCanvasContext();
  renderWorldScene(ctx, state);

  const riverWaterIdx = ops.findIndex(
    (entry) =>
      entry.op === 'fillRect' &&
      (entry.fillStyle === '#1d4ed8' || entry.fillStyle === '#7dd3fc') &&
      entry.args[1] === RIVER_TOP_Y
  );
  const fishTranslateIdx = ops.findIndex(
    (entry) =>
      entry.op === 'translate' &&
      entry.args[0] === bridgeX &&
      entry.args[1] === riverMidY
  );
  const bridgeDeckIdx = ops.findIndex(
    (entry) =>
      entry.op === 'fillRect' &&
      (entry.fillStyle === '#78350f' || entry.fillStyle === '#450a0a') &&
      entry.args[0] === bridgeX - BRIDGE_HALF_WIDTH &&
      entry.args[1] === RIVER_TOP_Y - 6
  );

  assert.ok(riverWaterIdx >= 0, 'Expected river water fillRect to be emitted');
  assert.ok(fishTranslateIdx > riverWaterIdx, 'Fish must be drawn after river water');
  assert.ok(bridgeDeckIdx > fishTranslateIdx, 'Bridge deck must be drawn after river fish');
});

test('drawChildVillager and drawAdultVillager are cleanly isolated', () => {
  const state = createInitialState();
  const baseAgent = state.agents[0];
  assert.ok(baseAgent);

  const childAgent = { ...baseAgent, id: 901, isChild: true, x: 300, y: 200 };
  const adultAgent = { ...baseAgent, id: 902, isChild: false, job: 'Minero' as const, x: 360, y: 200 };

  const childMock = createMockCanvasContext();
  drawChildVillager(childMock.ctx, childAgent, null, 0.5);
  assert.ok(
    childMock.ops.some((entry) => entry.op === 'scale' && entry.args[0] === 0.68 && entry.args[1] === 0.68),
    'Child villager should use isolated 0.68 sprite scale'
  );

  const adultMock = createMockCanvasContext();
  drawAdultVillager(adultMock.ctx, adultAgent, null, 0.5);
  assert.ok(
    !adultMock.ops.some((entry) => entry.op === 'scale' && entry.args[0] === 0.68),
    'Adult villager should render at full adult scale'
  );
  assert.ok(
    adultMock.ops.some((entry) => entry.op === 'fillRect' && entry.fillStyle === '#fef08a'),
    'Adult miner should draw miner helmet headlamp'
  );
});

test('scenery pixel art modules round fillRect and strokeRect coordinates to integers', () => {
  const state = createInitialState();
  // Introduce fractional positions to verify Math.round pixel snapping
  state.houses.forEach((h, idx) => {
    h.x += 0.37 + idx * 0.11;
    h.y += 0.63;
  });
  state.farms.forEach((f) => {
    f.x += 0.49;
    f.y += 0.51;
  });
  state.resources.forEach((r) => {
    r.x += 0.25;
    r.y += 0.75;
  });
  state.fires.push({ id: 999, x: 312.42, y: 214.68, intensity: 1, targetKind: 'forest', cause: 'test' });

  const { ctx, ops } = createMockCanvasContext();
  const shadow = getSunShadowOffset(state.minute, false);
  const occupied = new Set(state.agents.map((a) => a.houseId).filter((id): id is number => id !== null));

  drawBiomeTerrain(ctx, state.biome, state.season);
  drawRoads(ctx, state.roads);
  drawRiverWater(ctx, state.minute, state.season, 1.37);
  drawBridge(ctx, state.bridge, false);
  drawBuildingsAndFarms(ctx, state, false, occupied, shadow, 1.37, null);
  drawForestAndMountains(ctx, state.season, 1.37, shadow);
  drawResourceNodes(ctx, state.resources, 1.37);
  drawFires(ctx, state.fires, state.minute);

  const rectOps = ops.filter((o) => o.op === 'fillRect' || o.op === 'strokeRect');
  assert.ok(rectOps.length > 100, 'Expected substantial scenery draw ops');
  const nonIntegerRects = rectOps.filter((o) => o.args.some((v) => !Number.isInteger(v)));
  assert.equal(
    nonIntegerRects.length,
    0,
    `Expected all scenery fillRect/strokeRect coords & sizes to be integers, found: ${JSON.stringify(nonIntegerRects.slice(0, 3))}`
  );
});

test('16-bit sprite modules (adultVillagers, childVillagers, wildlife, occupant heads) snap all rects to integer pixel grid without gradients', async () => {
  const { drawBuildingOccupantHeads, drawFishingRipple } = await import('./adultVillagers');
  const { drawWildlifeAnimals } = await import('./wildlife');
  const { createHouseNearCenter, createSpecialBuilding } = await import('../simulation/rules');

  const state = createInitialState();
  const house = createHouseNearCenter(state, 'Tester', 'south', 'small', 600, 380);
  const bank = createSpecialBuilding(state, 'bank', 'Banquero', 720, 380);
  const dock = createSpecialBuilding(state, 'dock', 'Pescador', 640, 194);
  assert.ok(bank && dock);

  state.agents[0].x += 0.33;
  state.agents[0].y += 0.67;
  state.agents[0].walkFrame = 1.25;
  state.agents[1].isChild = true;
  state.agents[1].x += 0.41;
  state.agents[1].y += 0.59;
  state.agents[1].walkFrame = 2.1;

  state.agents[2].houseId = house.id;
  state.agents[2].taskType = 'sleep';
  state.agents[2].x = house.x;
  state.agents[2].y = house.y + 12;

  state.agents[3].job = 'Pescador';
  state.agents[3].taskType = 'fish_river';
  state.agents[3].x = dock.x + 14;
  state.agents[3].y = dock.y - 10;

  state.animals.forEach((an, idx) => {
    an.x += 0.27;
    an.y += 0.73;
    an.walkFrame = idx * 0.7;
  });

  const { ctx, ops } = createMockCanvasContext();
  drawAdultVillager(ctx, state.agents[0], state.agents[0].id, 1.2);
  drawAdultVillager(ctx, state.agents[3], null, 1.2);
  drawFishingRipple(ctx, state.agents[3], 1.2);
  drawChildVillager(ctx, state.agents[1], state.agents[1].id, 1.2);
  drawWildlifeAnimals(ctx, state.animals, state.selectedEntity, 1.2);
  drawBuildingOccupantHeads(ctx, state);

  const rectOps = ops.filter((o) => o.op === 'fillRect' || o.op === 'strokeRect');
  assert.ok(rectOps.length > 80);
  const nonIntegerRects = rectOps.filter((o) => o.args.some((v) => !Number.isInteger(v)));
  assert.equal(
    nonIntegerRects.length,
    0,
    `Expected all character/wildlife/badge fillRect/strokeRect coords to be integers, found: ${JSON.stringify(nonIntegerRects.slice(0, 3))}`
  );
  assert.equal(
    ops.filter((o) => o.op === 'ellipse').length,
    0,
    '16-bit fishing ripple and sprites should use crisp pixel rects rather than smooth ellipses'
  );
});

test('spriteLoader gracefully falls back to null in Node without Image/DOM and connected roads snap to integer grid', async () => {
  const { getCutoutSprite, getSpriteSheetCanvas, resetSpriteLoaderCachesForTest } = await import('./spriteLoader');
  const { ROAD_GRID_SIZE } = await import('../simulation/rules');

  resetSpriteLoaderCachesForTest();
  assert.equal(getSpriteSheetCanvas('terrain'), null);
  assert.equal(getCutoutSprite('buildings', 20, 8, 83, 109), null);
  assert.equal(getCutoutSprite('adults', 37, 17, 61, 105), null);
  assert.equal(getCutoutSprite('children', 71, 56, 89, 170), null);

  const { ctx, ops } = createMockCanvasContext();
  drawRoads(ctx, [
    { id: 1, x: 400.2, y: 300.4, roadType: 'dirt', lit: true, hasLamp: true, durability: 100 },
    { id: 2, x: 400.2 + ROAD_GRID_SIZE, y: 300.4, roadType: 'dirt', lit: false, hasLamp: false, durability: 100 },
    { id: 3, x: 400.2, y: 300.4 + ROAD_GRID_SIZE, roadType: 'stone', lit: false, hasLamp: false, durability: 100 },
    { id: 4, x: 400.2 + ROAD_GRID_SIZE, y: 300.4 + ROAD_GRID_SIZE, roadType: 'reinforced', lit: true, hasLamp: true, durability: 100 },
  ]);

  const rectOps = ops.filter((o) => o.op === 'fillRect' || o.op === 'strokeRect');
  assert.ok(rectOps.length > 10);
  const nonIntegerRects = rectOps.filter((o) => o.args.some((v) => !Number.isInteger(v)));
  assert.equal(nonIntegerRects.length, 0);
});



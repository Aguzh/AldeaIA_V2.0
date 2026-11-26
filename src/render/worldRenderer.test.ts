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
import { drawChildVillager } from './childVillagers';
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

import test from 'node:test';
import assert from 'node:assert/strict';

process.env.ALDEA_NO_LISTEN = '1';

import {
  buildStandalonePackageJson,
  buildWindowsLauncher,
  collectPublicAssets,
} from '../../server';
import { getSpriteSourceUrl, resetSpriteLoaderCachesForTest } from './spriteLoader';
import { collectInlineSpritesMap, generatePortableHtml, PORTABLE_SPRITE_FILES } from '../../scripts/build-portable.mjs';

test('collectInlineSpritesMap incrusta las 6 hojas de sprites con data URI valido', () => {
  const map = collectInlineSpritesMap(process.cwd()) as Record<string, string>;
  for (const key of Object.keys(PORTABLE_SPRITE_FILES)) {
    assert.ok(typeof map[key] === 'string' && map[key].startsWith('data:image/'), `Falta sprite inline ${key}`);
    assert.ok(map[key].includes(';base64,'), `Sprite ${key} debe estar codificado en base64`);
  }
});

test('generatePortableHtml incluye __ALDEA_INLINE_SPRITES__ y funciona sin red', async () => {
  const html = await generatePortableHtml(process.cwd());
  assert.ok(html.includes('window.__ALDEA_INLINE_SPRITES__='), 'Debe inyectar mapa inline de sprites');
  assert.ok(html.includes('terrain-crops.png') === false || html.includes('"terrain":"data:image/'), 'Debe contener data URI de terrain');
  assert.ok(html.includes('"adults":"data:image/'), 'Debe contener data URI de adults');
  assert.ok(html.includes('"children":"data:image/'), 'Debe contener data URI de children');
});

test('getSpriteSourceUrl prioriza __ALDEA_INLINE_SPRITES__ sobre rutas HTTP', () => {
  resetSpriteLoaderCachesForTest();
  const prevWin = (globalThis as { window?: unknown }).window;
  try {
    (globalThis as { window: unknown }).window = {
      __ALDEA_INLINE_SPRITES__: { terrain: 'data:image/jpeg;base64,AAAA' },
    };
    assert.equal(getSpriteSourceUrl('terrain'), 'data:image/jpeg;base64,AAAA');
    assert.equal(getSpriteSourceUrl('buildings'), '/assets/sprites/buildings-plaza.png');
  } finally {
    if (prevWin === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window: unknown }).window = prevWin;
    }
  }
});

test('collectPublicAssets y buildStandalonePackageJson y INICIAR_WINDOWS.bat quedan completos y validos', () => {
  const assets = collectPublicAssets(process.cwd()).map((a) => a.relPath);
  for (const filename of Object.values(PORTABLE_SPRITE_FILES)) {
    assert.ok(assets.includes(`public/assets/sprites/${filename}`), `Falta en ZIP: public/assets/sprites/${filename}`);
  }
  assert.ok(assets.includes('public/assets/aldea-ia-logo.png'));
  assert.ok(!assets.some((p) => p.startsWith('public/assets/aistudio/')));

  const pkg = JSON.parse(buildStandalonePackageJson()) as {
    scripts: Record<string, string>;
    dependencies: Record<string, string>;
  };
  assert.equal(pkg.dependencies['@google/genai'], '^2.4.0');
  assert.equal(pkg.dependencies.motion, '^12.23.24');
  assert.ok(pkg.scripts.dev.includes('server.ts'));
  assert.ok(pkg.scripts.build.includes('build-portable.mjs'));

  const bat = buildWindowsLauncher();
  assert.ok(bat.includes('\r\n'), 'INICIAR_WINDOWS.bat debe usar CRLF');
  assert.ok(!bat.includes('start "" http://localhost:3000'), 'No debe anidar comillas vacias dentro de cmd /c');
  assert.ok(bat.includes('timeout /t 3 /nobreak >nul && start http://localhost:3000'));
  assert.ok(bat.includes('call npm run dev'));
});

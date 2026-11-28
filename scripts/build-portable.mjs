import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

export const PORTABLE_SPRITE_FILES = {
  terrain: 'terrain-crops.png',
  buildings: 'buildings-plaza.png',
  forest: 'forest-mountains.png',
  wildlife: 'wildlife-resources.png',
  adults: 'villagers-adults.png',
  children: 'villagers-children.png',
  villagersVariety: 'villagers-variety.jpg',
  catsBears: 'wildlife-cats-bears.jpg',
  dogFish: 'dog-and-fish.jpg',
};

function detectImageMime(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png';
  }
  if (buffer.length >= 4 && buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    return 'image/webp';
  }
  return 'image/png';
}

export function collectInlineSpritesMap(rootDir = process.cwd()) {
  const spritesDir = path.join(rootDir, 'public', 'assets', 'sprites');
  const map = {};
  for (const [key, filename] of Object.entries(PORTABLE_SPRITE_FILES)) {
    const filePath = path.join(spritesDir, filename);
    if (!fs.existsSync(filePath)) continue;
    const buffer = fs.readFileSync(filePath);
    const mime = detectImageMime(buffer);
    map[key] = `data:${mime};base64,${buffer.toString('base64')}`;
  }
  return map;
}

export async function generatePortableHtml(rootDir = process.cwd()) {
  const distAssetsDir = path.join(rootDir, 'dist', 'assets');
  let cssContent = '';

  if (fs.existsSync(distAssetsDir)) {
    const cssFiles = fs.readdirSync(distAssetsDir).filter((f) => f.endsWith('.css'));
    for (const file of cssFiles) {
      cssContent += fs.readFileSync(path.join(distAssetsDir, file), 'utf8') + '\n';
    }
  }

  const result = await esbuild.build({
    entryPoints: [path.join(rootDir, 'src', 'main.tsx')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    minify: true,
    write: false,
    define: {
      'process.env.NODE_ENV': '"production"',
    },
    plugins: [
      {
        name: 'ignore-css',
        setup(build) {
          build.onResolve({ filter: /\.css$/ }, () => ({
            path: 'ignored.css',
            namespace: 'ignore-css',
          }));
          build.onLoad({ filter: /.*/, namespace: 'ignore-css' }, () => ({
            contents: '',
            loader: 'js',
          }));
        },
      },
    ],
  });

  const inlineSprites = collectInlineSpritesMap(rootDir);
  const inlineSpritesScript = `window.__ALDEA_INLINE_SPRITES__=${JSON.stringify(inlineSprites).replace(/<\//g, '<\\/')};`;
  const jsContent = result.outputFiles[0].text.replace(/<\/script>/gi, '<\\/script>');

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Aldea IA — Simulador Local</title>
    <style>${cssContent}</style>
  </head>
  <body class="bg-[#0b1120] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
    <div id="root"></div>
    <script>${inlineSpritesScript}</script>
    <script>${jsContent}</script>
  </body>
</html>
`;

  const distDir = path.join(rootDir, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }
  fs.writeFileSync(path.join(distDir, 'aldea-ia-local.html'), html, 'utf8');
  return html;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  await generatePortableHtml();
  console.log('Archivo portable dist/aldea-ia-local.html generado con sprites integrados.');
}

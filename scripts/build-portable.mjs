import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

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
    <script>${jsContent}</script>
  </body>
</html>
`;

  const distDir = path.join(rootDir, 'dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'aldea-ia-local.html'), html, 'utf8');
  }
  return html;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  await generatePortableHtml();
  console.log('Archivo portable dist/aldea-ia-local.html generado.');
}

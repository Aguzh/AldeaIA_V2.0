import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import JSZip from 'jszip';
import { GoogleGenAI } from '@google/genai';

const ROOT_DIR = process.cwd();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

function collectSourceFiles(dirPath: string, baseRel = ''): Array<{ relPath: string; absPath: string }> {
  const results: Array<{ relPath: string; absPath: string }> = [];
  if (!fs.existsSync(dirPath)) return results;

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git' || entry.name.startsWith('.')) {
      continue;
    }
    const absPath = path.join(dirPath, entry.name);
    const relPath = baseRel ? `${baseRel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(absPath, relPath));
    } else if (entry.isFile() && !entry.name.endsWith('.test.ts')) {
      results.push({ relPath, absPath });
    }
  }
  return results;
}

function buildLocalReadme(): string {
  return `# Aldea IA - Edición Local para PC

Simulador de vida autónomo en pixel art con evolución de eras, construcción de viviendas y edificios especiales, estaciones del año, cultivos, economía emergente, salud/envejecimiento (1 día = 1 año) y consola de reglas con **Qwen 2.5**.

## Importante antes de empezar (Windows)
1. **Extraé (descomprimí) todo el archivo \`.zip\`** en una carpeta real (por ejemplo \`C:\\AldeaIA\`). No ejecutes \`INICIAR_WINDOWS.bat\` directamente desde adentro del ZIP sin extraerlo.
2. Si querés jugar al instante **sin instalar Node.js ni npm**, abrí directamente el archivo \`ALDEA_IA_PORTABLE.html\` incluido en esta carpeta con Chrome o Edge.

## Opción 1: Ejecución rápida con Node.js (con guardado en disco)

Requisitos: [Node.js 20+](https://nodejs.org/) instalado en tu PC.

### En Windows
Hacé doble clic en \`INICIAR_WINDOWS.bat\` (verifica e instala dependencias automáticamente la primera vez y abre http://localhost:3000).

### En Linux / Mac
\`\`\`bash
chmod +x iniciar.sh
./iniciar.sh
\`\`\`

### Manual (cualquier sistema)
\`\`\`bash
npm install --include=dev
npm run dev
\`\`\`
Luego abrí en tu navegador: **http://localhost:3000**

## Opción 2: Conectar Qwen 2.5 real con Ollama (Opcional)

1. Instalá Ollama desde [ollama.com](https://ollama.com).
2. Descargá el modelo:
   \`\`\`bash
   ollama run qwen2.5:3b
   \`\`\`
3. Si abrís la app en tu navegador y querés permitir CORS hacia Ollama local, ejecutá Ollama con:
   - Windows (PowerShell): \`$env:OLLAMA_ORIGINS="*"; ollama serve\`
   - Linux/Mac: \`OLLAMA_ORIGINS="*" ollama serve\`
4. Dentro de **Aldea IA**, hacé clic en **Ollama**, activá **Activar peticiones en vivo a Ollama** y guardá.
`;
}

function buildStandalonePackageJson(): string {
  return JSON.stringify(
    {
      name: 'aldea-ia-local',
      private: true,
      version: '1.0.0',
      type: 'module',
      scripts: {
        dev: 'node ./node_modules/tsx/dist/cli.mjs server.ts',
        'dev:vite': 'node ./node_modules/vite/bin/vite.js --port=3000 --host=127.0.0.1',
        build: 'node ./node_modules/vite/bin/vite.js build',
        preview: 'node ./node_modules/vite/bin/vite.js preview --port=3000',
        lint: 'node ./node_modules/typescript/bin/tsc --noEmit',
      },
      dependencies: {
        '@google/genai': '^2.32.0',
        '@tailwindcss/vite': '^4.3.3',
        '@vitejs/plugin-react': '^6.1.1',
        dotenv: '^17.2.3',
        esbuild: '^0.28.0',
        express: '^4.21.2',
        jszip: '^3.10.2',
        'lucide-react': '^0.546.0',
        react: '^19.0.1',
        'react-dom': '^19.0.1',
        tailwindcss: '^4.3.3',
        tsx: '^4.21.0',
        vite: '^8.3.0',
      },
      devDependencies: {
        '@types/express': '^4.17.21',
        '@types/node': '^22.14.0',
        '@types/react': '^19.3.0',
        '@types/react-dom': '^19.3.0',
        typescript: '^7.0.2',
      },
    },
    null,
    2
  );
}

function buildWindowsLauncher(): string {
  const lines = [
    '@echo off',
    'setlocal',
    'title Aldea IA - Simulador Local',
    'cd /d "%~dp0"',
    'if not exist "package.json" (',
    '  echo [ERROR] No se encontro package.json en esta carpeta.',
    '  echo Asegurate de EXTRAER todo el archivo .zip antes de ejecutar INICIAR_WINDOWS.bat.',
    '  pause',
    '  exit /b 1',
    ')',
    'where node >nul 2>nul',
    'if %errorlevel% neq 0 (',
    '  echo [ERROR] No se encontro Node.js instalado. Descargalo desde https://nodejs.org/',
    '  if exist "ALDEA_IA_PORTABLE.html" (',
    '    echo Abriendo version portable sin instalacion ALDEA_IA_PORTABLE.html ...',
    '    start "" "ALDEA_IA_PORTABLE.html"',
    '  )',
    '  pause',
    '  exit /b 1',
    ')',
    'set "NODE_ENV="',
    'if not exist "node_modules\\vite\\bin\\vite.js" goto :install_deps',
    'if not exist "node_modules\\tsx\\dist\\cli.mjs" goto :install_deps',
    'goto :start_app',
    ':install_deps',
    'echo Instalando dependencias locales (esto puede demorar 1 minuto la primera vez)...',
    'call npm install --include=dev --no-audit --no-fund',
    'if %errorlevel% neq 0 (',
    '  echo Reintentando instalacion con resolucion compatible...',
    '  call npm install --include=dev --legacy-peer-deps --no-audit --no-fund',
    ')',
    'if not exist "node_modules\\vite\\bin\\vite.js" goto :install_failed',
    'if not exist "node_modules\\tsx\\dist\\cli.mjs" goto :install_failed',
    'goto :start_app',
    ':install_failed',
    'echo.',
    'echo [ERROR] No se pudieron instalar Vite/TSX en node_modules.',
    'echo Verifica tu conexion a internet o extrae el ZIP en una ruta simple como C:\\AldeaIA.',
    'if exist "ALDEA_IA_PORTABLE.html" (',
    '  echo Abriendo la version portable ALDEA_IA_PORTABLE.html en tu navegador...',
    '  start "" "ALDEA_IA_PORTABLE.html"',
    ')',
    'pause',
    'exit /b 1',
    ':start_app',
    'echo Iniciando Aldea IA en http://localhost:3000 ...',
    'start "" cmd /c "timeout /t 2 /nobreak >nul & start "" http://localhost:3000"',
    'call npm run dev',
    'pause',
    '',
  ];
  return lines.join('\r\n');
}

function buildUnixLauncher(): string {
  return `#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ ! -f "package.json" ]; then
  echo "[ERROR] No se encontró package.json. Extraé el ZIP completo antes de ejecutar."
  exit 1
fi
unset NODE_ENV
if [ ! -f "node_modules/vite/bin/vite.js" ] || [ ! -f "node_modules/tsx/dist/cli.mjs" ]; then
  echo "Instalando dependencias locales por primera vez..."
  npm install --include=dev --no-audit --no-fund || npm install --include=dev --legacy-peer-deps --no-audit --no-fund
fi
echo "Iniciando Aldea IA en http://localhost:3000 ..."
(sleep 2 && (xdg-open http://localhost:3000 2>/dev/null || open http://localhost:3000 2>/dev/null || true)) &
npm run dev
`;
}

const SAVE_DATA_DIR = path.join(ROOT_DIR, 'data');
const SAVE_STATE_FILE = path.join(SAVE_DATA_DIR, 'aldea-state.json');

const sessionCloudKeys: Record<'openai' | 'anthropic' | 'custom_openai', string> = {
  openai: '',
  anthropic: '',
  custom_openai: '',
};

function validateSafeCloudEndpoint(rawUrl: string): URL {
  const parsed = new URL(rawUrl.trim());
  if (parsed.protocol !== 'https:') {
    throw new Error('El endpoint en la nube debe usar HTTPS.');
  }
  const host = parsed.hostname.toLowerCase();
  const isPrivateOrLocal =
    host === 'localhost' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host.startsWith('fc') ||
    host.startsWith('fd') ||
    host.startsWith('fe80');
  if (isPrivateOrLocal) {
    throw new Error('Endpoint en la nube bloqueado por seguridad (red privada o local).');
  }
  return parsed;
}

async function executeCloudAIQuery(params: {
  provider: 'gemini' | 'openai' | 'anthropic' | 'custom_openai';
  model: string;
  endpoint?: string;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  jsonMode: boolean;
}): Promise<{ text: string; providerLabel: string }> {
  const temperature = Math.max(0, Math.min(1.5, Number.isFinite(params.temperature) ? params.temperature : 0.35));

  if (params.provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error('Falta GEMINI_API_KEY en el servidor (.env).');
    }
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });
    const modelName = params.model?.trim() || 'gemini-4-hydrogen';
    const response = await ai.models.generateContent({
      model: modelName,
      contents: params.userPrompt,
      config: {
        systemInstruction: params.systemPrompt,
        temperature,
        ...(params.jsonMode ? { responseMimeType: 'application/json' } : {}),
      },
    });
    const text = response.text?.trim() ?? '';
    if (!text) throw new Error('Gemini devolvió una respuesta vacía.');
    return { text, providerLabel: `Gemini (${modelName})` };
  }

  if (params.provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY?.trim() || sessionCloudKeys.openai;
    if (!apiKey) {
      throw new Error('Falta API key de OpenAI (variable OPENAI_API_KEY o clave de sesión).');
    }
    const model = params.model?.trim() || 'gpt-4o-mini';
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        ...(params.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(data.error?.message || `OpenAI respondió HTTP ${res.status}`);
    }
    const text = data.choices?.[0]?.message?.content?.trim() ?? '';
    if (!text) throw new Error('OpenAI devolvió una respuesta vacía.');
    return { text, providerLabel: `OpenAI (${model})` };
  }

  if (params.provider === 'anthropic') {
    const apiKey = process.env.ANTHROPIC_API_KEY?.trim() || sessionCloudKeys.anthropic;
    if (!apiKey) {
      throw new Error('Falta API key de Anthropic (variable ANTHROPIC_API_KEY o clave de sesión).');
    }
    const model = params.model?.trim() || 'claude-3-5-haiku-latest';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        temperature,
        system: params.systemPrompt,
        messages: [{ role: 'user', content: params.userPrompt }],
      }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      content?: Array<{ text?: string }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new Error(data.error?.message || `Anthropic respondió HTTP ${res.status}`);
    }
    const text = data.content?.map((c) => c.text ?? '').join('').trim() ?? '';
    if (!text) throw new Error('Anthropic devolvió una respuesta vacía.');
    return { text, providerLabel: `Claude (${model})` };
  }

  // custom_openai (validated external HTTPS URL)
  const targetUrl = validateSafeCloudEndpoint(params.endpoint || '');
  const apiKey = sessionCloudKeys.custom_openai || process.env.CUSTOM_AI_API_KEY?.trim() || '';
  const model = params.model?.trim() || 'gpt-4o-mini';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(targetUrl.toString(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message || `Proveedor HTTPS respondió HTTP ${res.status}`);
  }
  const text = data.choices?.[0]?.message?.content?.trim() ?? '';
  if (!text) throw new Error('El proveedor HTTPS devolvió una respuesta vacía.');
  return { text, providerLabel: `Nube (${model})` };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '15mb' }));

  app.get('/api/ai/status', (_req, res) => {
    res.json({
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim() || sessionCloudKeys.openai),
      anthropicConfigured: Boolean(process.env.ANTHROPIC_API_KEY?.trim() || sessionCloudKeys.anthropic),
      customConfigured: Boolean(process.env.CUSTOM_AI_API_KEY?.trim() || sessionCloudKeys.custom_openai),
    });
  });

  app.post('/api/ai/credentials', (req, res) => {
    const rawProvider = req.body?.provider;
    const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
    if (rawProvider !== 'openai' && rawProvider !== 'anthropic' && rawProvider !== 'custom_openai') {
      res.status(400).json({ error: 'Proveedor no editable desde sesión (Gemini usa variable de entorno del servidor).' });
      return;
    }
    const providerKey: keyof typeof sessionCloudKeys = rawProvider;
    sessionCloudKeys[providerKey] = apiKey;
    res.json({ ok: true, configured: Boolean(apiKey) });
  });

  app.post('/api/ai/test', async (req, res) => {
    const started = Date.now();
    try {
      const provider = req.body?.provider ?? 'gemini';
      const model = typeof req.body?.model === 'string' ? req.body.model : 'gemini-4-hydrogen';
      const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : '';
      const result = await executeCloudAIQuery({
        provider,
        model,
        endpoint,
        systemPrompt: 'Sos un verificador de conectividad.',
        userPrompt: 'Respondé únicamente con: OK',
        temperature: 0,
        jsonMode: false,
      });
      res.json({ ok: true, providerLabel: result.providerLabel, latencyMs: Date.now() - started });
    } catch (err) {
      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : 'No se pudo conectar con el proveedor en la nube.',
        latencyMs: Date.now() - started,
      });
    }
  });

  app.post('/api/ai/query', async (req, res) => {
    try {
      const provider = req.body?.provider ?? 'gemini';
      const model = typeof req.body?.model === 'string' ? req.body.model : 'gemini-4-hydrogen';
      const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : '';
      const systemPrompt = typeof req.body?.systemPrompt === 'string' ? req.body.systemPrompt : '';
      const userPrompt = typeof req.body?.userPrompt === 'string' ? req.body.userPrompt : '';
      const temperature = typeof req.body?.temperature === 'number' ? req.body.temperature : 0.35;
      const jsonMode = Boolean(req.body?.jsonMode);
      if (!userPrompt.trim()) {
        res.status(400).json({ error: 'Prompt vacío.' });
        return;
      }
      const result = await executeCloudAIQuery({
        provider,
        model,
        endpoint,
        systemPrompt,
        userPrompt,
        temperature,
        jsonMode,
      });
      res.json(result);
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Error consultando al proveedor de IA en la nube.',
      });
    }
  });

  app.get('/api/state', (_req, res) => {
    try {
      if (!fs.existsSync(SAVE_STATE_FILE)) {
        res.json({ state: null });
        return;
      }
      const raw = fs.readFileSync(SAVE_STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      res.json({ state: parsed });
    } catch (err) {
      console.error('Error leyendo estado persistido:', err);
      res.status(500).json({ error: 'No se pudo leer el estado guardado.' });
    }
  });

  app.post('/api/state', (req, res) => {
    try {
      const payload = req.body && typeof req.body === 'object' && 'state' in req.body ? req.body.state : req.body;
      if (
        !payload ||
        typeof payload !== 'object' ||
        !Array.isArray(payload.agents) ||
        payload.agents.length === 0 ||
        !Array.isArray(payload.houses) ||
        !Number.isFinite(Number(payload.day)) ||
        !Number.isFinite(Number(payload.minute))
      ) {
        res.status(400).json({ error: 'Estado de simulación inválido.' });
        return;
      }
      const sanitizedPayload = { ...payload } as Record<string, unknown>;
      delete sanitizedPayload.apiKey;
      delete sanitizedPayload.cloudApiKey;
      fs.mkdirSync(SAVE_DATA_DIR, { recursive: true });
      const tmpPath = `${SAVE_STATE_FILE}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(sanitizedPayload), 'utf-8');
      fs.renameSync(tmpPath, SAVE_STATE_FILE);
      res.json({ ok: true, savedAt: new Date().toISOString() });
    } catch (err) {
      console.error('Error guardando estado en servidor:', err);
      res.status(500).json({ error: 'No se pudo guardar el estado.' });
    }
  });

  app.delete('/api/state', (_req, res) => {
    try {
      if (fs.existsSync(SAVE_STATE_FILE)) {
        fs.unlinkSync(SAVE_STATE_FILE);
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('Error eliminando estado guardado:', err);
      res.status(500).json({ error: 'No se pudo eliminar el estado.' });
    }
  });

  app.get('/api/download-portable', async (_req, res) => {
    try {
      const prebuiltPath = path.join(ROOT_DIR, 'dist', 'aldea-ia-local.html');
      if (fs.existsSync(prebuiltPath)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="aldea-ia-local.html"');
        res.sendFile(prebuiltPath);
        return;
      }

      // En desarrollo, compilar CSS si falta dist/assets y generar portable al vuelo
      const distAssetsDir = path.join(ROOT_DIR, 'dist', 'assets');
      if (!fs.existsSync(distAssetsDir)) {
        const { build } = await import('vite');
        await build({ logLevel: 'silent' });
      }
      const { generatePortableHtml } = await import('./scripts/build-portable.mjs');
      const html = await generatePortableHtml(ROOT_DIR);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="aldea-ia-local.html"');
      res.send(html);
    } catch (err) {
      console.error('Error generando HTML portable:', err);
      res.status(500).json({ error: 'No se pudo generar el archivo portable.' });
    }
  });

  app.get('/api/download-project', async (_req, res) => {
    try {
      const zip = new JSZip();
      const rootFolder = zip.folder('aldea-ia-local');
      if (!rootFolder) throw new Error('No se pudo inicializar el archivo ZIP');

      const srcFiles = collectSourceFiles(path.join(ROOT_DIR, 'src'), 'src');
      for (const file of srcFiles) {
        rootFolder.file(file.relPath, fs.readFileSync(file.absPath));
      }

      for (const rootFile of ['index.html', 'tsconfig.json', 'vite.config.ts', 'server.ts']) {
        const abs = path.join(ROOT_DIR, rootFile);
        if (fs.existsSync(abs)) {
          rootFolder.file(rootFile, fs.readFileSync(abs));
        }
      }

      const portableScript = path.join(ROOT_DIR, 'scripts', 'build-portable.mjs');
      if (fs.existsSync(portableScript)) {
        rootFolder.file('scripts/build-portable.mjs', fs.readFileSync(portableScript));
      }

      // Incluir también copia HTML portable lista para abrir sin Node/npm
      const prebuiltPortable = path.join(ROOT_DIR, 'dist', 'aldea-ia-local.html');
      if (fs.existsSync(prebuiltPortable)) {
        rootFolder.file('ALDEA_IA_PORTABLE.html', fs.readFileSync(prebuiltPortable));
      } else {
        try {
          const distAssetsDir = path.join(ROOT_DIR, 'dist', 'assets');
          if (!fs.existsSync(distAssetsDir)) {
            const { build } = await import('vite');
            await build({ logLevel: 'silent' });
          }
          const { generatePortableHtml } = await import('./scripts/build-portable.mjs');
          const portableHtml = await generatePortableHtml(ROOT_DIR);
          rootFolder.file('ALDEA_IA_PORTABLE.html', portableHtml);
        } catch (portableErr) {
          console.warn('Aviso: no se pudo adjuntar ALDEA_IA_PORTABLE.html al ZIP:', portableErr);
        }
      }

      rootFolder.file('package.json', buildStandalonePackageJson());
      rootFolder.file('README.md', buildLocalReadme());
      rootFolder.file('INICIAR_WINDOWS.bat', buildWindowsLauncher());
      rootFolder.file('iniciar.sh', buildUnixLauncher(), { unixPermissions: '755' });

      const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="aldea-ia-proyecto.zip"');
      res.send(buffer);
    } catch (err) {
      console.error('Error generando ZIP del proyecto:', err);
      res.status(500).json({ error: 'No se pudo generar el paquete del proyecto.' });
    }
  });

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aldea IA ejecutándose en http://localhost:${PORT}`);
  });
}

startServer();

import type {
  AIHealthStatus,
  AIModality,
  AIProviderConfig,
  OllamaConfig,
  SimulationState,
} from '../types/simulation';

export const DEFAULT_LOCAL_OLLAMA_URL = 'http://localhost:11434/api/generate';
export const DEFAULT_LOCAL_QWEN_MODEL = 'qwen2.5:3b';
export const DEFAULT_OPENAI_LOCAL_URL = 'http://localhost:1234/v1/chat/completions';
export const DEFAULT_CLOUD_MODELS: Record<AIProviderConfig['cloudProvider'], string> = {
  gemini: 'gemini-4-hydrogen',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-latest',
  custom_openai: 'gpt-4o-mini',
};

export function createDefaultAIConfig(legacyOllama?: Partial<OllamaConfig>): AIProviderConfig {
  const legacyEnabled = Boolean(legacyOllama?.enabled);
  const legacyModel =
    typeof legacyOllama?.model === 'string' && legacyOllama.model.trim()
      ? legacyOllama.model.trim()
      : DEFAULT_LOCAL_QWEN_MODEL;
  const legacyUrl =
    typeof legacyOllama?.url === 'string' && legacyOllama.url.trim()
      ? legacyOllama.url.trim()
      : DEFAULT_LOCAL_OLLAMA_URL;

  const isCustomLocal = legacyEnabled && !legacyModel.toLowerCase().includes('qwen');

  return {
    modality: legacyEnabled ? (isCustomLocal ? 'local_other' : 'ollama_qwen') : 'ollama_qwen',
    localProtocol: 'ollama',
    localUrl: legacyUrl,
    localModel: legacyModel,
    cloudProvider: 'gemini',
    cloudModel: DEFAULT_CLOUD_MODELS.gemini,
    cloudEndpoint: '',
    temperature: 0.35,
    timeoutMs: 9000,
    maxRetries: 1,
    autoFallback: true,
    status: legacyEnabled ? 'ready' : 'disabled',
    lastError: null,
    consecutiveFailures: 0,
  };
}

export function ensureAIConfig(state: SimulationState): AIProviderConfig {
  if (!state.aiConfig) {
    state.aiConfig = createDefaultAIConfig(state.ollama);
  }
  return state.aiConfig;
}

export function syncLegacyOllamaFromAIConfig(state: SimulationState): void {
  const cfg = ensureAIConfig(state);
  const isOllamaActive =
    (cfg.modality === 'ollama_qwen' || (cfg.modality === 'local_other' && cfg.localProtocol === 'ollama')) &&
    cfg.status !== 'disabled';
  state.ollama = {
    enabled: isOllamaActive,
    url: cfg.localUrl || DEFAULT_LOCAL_OLLAMA_URL,
    model: cfg.localModel || DEFAULT_LOCAL_QWEN_MODEL,
  };
}

export function syncAIConfigFromLegacyOllama(state: SimulationState, next: OllamaConfig): void {
  const cfg = ensureAIConfig(state);
  cfg.localUrl = next.url.trim() || DEFAULT_LOCAL_OLLAMA_URL;
  cfg.localModel = next.model.trim() || DEFAULT_LOCAL_QWEN_MODEL;
  cfg.localProtocol = 'ollama';
  if (next.enabled) {
    cfg.modality = cfg.localModel.toLowerCase().includes('qwen') ? 'ollama_qwen' : 'local_other';
    cfg.status = 'ready';
    cfg.lastError = null;
    cfg.consecutiveFailures = 0;
  } else {
    cfg.status = 'disabled';
  }
  state.ollama = {
    enabled: next.enabled,
    url: cfg.localUrl,
    model: cfg.localModel,
  };
}

export function getAIProviderBadge(
  config?: AIProviderConfig,
  ollama?: OllamaConfig
): {
  modality: AIModality;
  label: string;
  shortLabel: string;
  status: AIHealthStatus;
} {
  const cfg = config ?? createDefaultAIConfig(ollama);
  if (cfg.modality === 'none') {
    return {
      modality: 'none',
      label: 'Sin IA (Motor Convencional)',
      shortLabel: 'Motor Local',
      status: 'disabled',
    };
  }
  if (cfg.modality === 'cloud') {
    const providerName =
      cfg.cloudProvider === 'gemini'
        ? 'Gemini'
        : cfg.cloudProvider === 'openai'
          ? 'OpenAI'
          : cfg.cloudProvider === 'anthropic'
            ? 'Claude'
            : 'Nube Custom';
    return {
      modality: 'cloud',
      label: `Nube · ${providerName} (${cfg.cloudModel})`,
      shortLabel: `Nube · ${providerName}`,
      status: cfg.status,
    };
  }
  if (cfg.modality === 'local_other') {
    const enabled = cfg.status !== 'disabled';
    return {
      modality: 'local_other',
      label: enabled ? `Local · ${cfg.localModel}` : `Local (${cfg.localModel}) en pausa`,
      shortLabel: enabled ? cfg.localModel : 'IA: Motor Reglas',
      status: cfg.status,
    };
  }
  const qwenActive = cfg.status !== 'disabled' && Boolean(ollama?.enabled);
  return {
    modality: 'ollama_qwen',
    label: qwenActive ? `Ollama · ${cfg.localModel}` : `Qwen 2.5 (Reglas + Ollama opc.)`,
    shortLabel: qwenActive ? `Ollama · ${cfg.localModel}` : 'IA · Qwen',
    status: qwenActive ? cfg.status : 'disabled',
  };
}

export function parseStructuredAIJson<T = Record<string, unknown>>(rawText: string): T | null {
  const trimmed = rawText.trim();
  if (!trimmed) return null;
  const unwrapped = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(unwrapped) as T;
  } catch {
    const start = unwrapped.indexOf('{');
    const end = unwrapped.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(unwrapped.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export interface AIQueryResult {
  ok: boolean;
  text: string;
  source: 'ollama' | 'local' | 'cloud' | 'none';
  providerLabel: string;
  latencyMs: number;
  error?: string;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  fetchImpl: typeof fetch
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1500, timeoutMs));
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function queryAIProvider(
  config: AIProviderConfig,
  params: {
    systemPrompt: string;
    userPrompt: string;
    jsonMode?: boolean;
  },
  fetchImpl: typeof fetch = fetch
): Promise<AIQueryResult> {
  if (config.modality === 'none') {
    return {
      ok: false,
      text: '',
      source: 'none',
      providerLabel: 'Motor Convencional',
      latencyMs: 0,
    };
  }

  if (
    (config.modality === 'ollama_qwen' || config.modality === 'local_other') &&
    config.status === 'disabled'
  ) {
    return {
      ok: false,
      text: '',
      source: 'local',
      providerLabel: 'Motor Local',
      latencyMs: 0,
    };
  }

  const attempts = Math.max(1, Math.min(3, (config.maxRetries ?? 1) + 1));
  const startedAt = Date.now();
  let lastError = 'Sin respuesta del proveedor de IA.';

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      if (config.modality === 'cloud') {
        const res = await fetchWithTimeout(
          '/api/ai/query',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              provider: config.cloudProvider,
              model: config.cloudModel,
              endpoint: config.cloudEndpoint,
              systemPrompt: params.systemPrompt,
              userPrompt: params.userPrompt,
              temperature: config.temperature,
              jsonMode: Boolean(params.jsonMode),
            }),
          },
          config.timeoutMs,
          fetchImpl
        );
        const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string; providerLabel?: string };
        if (!res.ok || !data.text) {
          throw new Error(data.error || `Error HTTP ${res.status}`);
        }
        const latencyMs = Date.now() - startedAt;
        config.status = 'connected';
        config.lastError = null;
        config.consecutiveFailures = 0;
        config.lastLatencyMs = latencyMs;
        return {
          ok: true,
          text: data.text,
          source: 'cloud',
          providerLabel: data.providerLabel ?? config.cloudProvider,
          latencyMs,
        };
      }

      // Local modalities: Ollama or OpenAI-compatible local server
      const targetUrl =
        config.localUrl.trim() ||
        (config.localProtocol === 'openai_compatible' ? DEFAULT_OPENAI_LOCAL_URL : DEFAULT_LOCAL_OLLAMA_URL);

      if (config.localProtocol === 'openai_compatible') {
        const res = await fetchWithTimeout(
          targetUrl,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: config.localModel || DEFAULT_LOCAL_QWEN_MODEL,
              temperature: config.temperature,
              messages: [
                { role: 'system', content: params.systemPrompt },
                { role: 'user', content: params.userPrompt },
              ],
            }),
          },
          config.timeoutMs,
          fetchImpl
        );
        if (!res.ok) {
          throw new Error(`Servidor local respondió ${res.status}`);
        }
        const data = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          response?: string;
        };
        const text = data.choices?.[0]?.message?.content ?? data.response ?? '';
        if (!text.trim()) throw new Error('Respuesta vacía del servidor local.');
        const latencyMs = Date.now() - startedAt;
        config.status = 'connected';
        config.lastError = null;
        config.consecutiveFailures = 0;
        config.lastLatencyMs = latencyMs;
        return {
          ok: true,
          text,
          source: 'local',
          providerLabel: `Local (${config.localModel})`,
          latencyMs,
        };
      }

      // Ollama (/api/generate)
      const combinedPrompt = params.systemPrompt
        ? `${params.systemPrompt}\n\n${params.userPrompt}`
        : params.userPrompt;
      const res = await fetchWithTimeout(
        targetUrl,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: config.localModel || DEFAULT_LOCAL_QWEN_MODEL,
            prompt: combinedPrompt,
            stream: false,
            ...(params.jsonMode ? { format: 'json' } : {}),
            options: { temperature: config.temperature },
          }),
        },
        config.timeoutMs,
        fetchImpl
      );
      if (!res.ok) {
        throw new Error(`Ollama respondió ${res.status}`);
      }
      const data = (await res.json()) as { response?: string };
      const text = typeof data?.response === 'string' ? data.response : '';
      if (!text.trim()) throw new Error('Ollama devolvió una respuesta vacía.');
      const latencyMs = Date.now() - startedAt;
      config.status = 'connected';
      config.lastError = null;
      config.consecutiveFailures = 0;
      config.lastLatencyMs = latencyMs;
      return {
        ok: true,
        text,
        source: config.modality === 'ollama_qwen' ? 'ollama' : 'local',
        providerLabel: config.modality === 'ollama_qwen' ? `Ollama (${config.localModel})` : `Local (${config.localModel})`,
        latencyMs,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Fallo de red con el proveedor de IA.';
    }
  }

  config.consecutiveFailures = (config.consecutiveFailures ?? 0) + 1;
  config.lastError = lastError;
  config.status = config.autoFallback ? 'fallback' : 'error';
  return {
    ok: false,
    text: '',
    source: 'local',
    providerLabel: 'Fallback Local',
    latencyMs: Date.now() - startedAt,
    error: lastError,
  };
}

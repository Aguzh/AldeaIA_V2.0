import { useEffect, useState, type FormEvent } from 'react';
import type {
  AIModality,
  AIProviderConfig,
  CloudAIProvider,
  LocalAIProtocol,
  OllamaConfig,
} from '../types/simulation';
import {
  DEFAULT_CLOUD_MODELS,
  DEFAULT_LOCAL_OLLAMA_URL,
  DEFAULT_LOCAL_QWEN_MODEL,
  DEFAULT_OPENAI_LOCAL_URL,
} from '../simulation/aiProviders';

interface OllamaModalProps {
  config: OllamaConfig;
  aiConfig: AIProviderConfig;
  onSave: (nextOllama: OllamaConfig, nextAIConfig: AIProviderConfig) => void;
  onClose: () => void;
}

interface CloudStatus {
  geminiConfigured: boolean;
  openaiConfigured: boolean;
  anthropicConfigured: boolean;
  customConfigured: boolean;
}

export function OllamaModal({ config, aiConfig, onSave, onClose }: OllamaModalProps) {
  const [modality, setModality] = useState<AIModality>(aiConfig.modality);
  const [localProtocol, setLocalProtocol] = useState<LocalAIProtocol>(aiConfig.localProtocol);
  const [localUrl, setLocalUrl] = useState(aiConfig.localUrl || config.url || DEFAULT_LOCAL_OLLAMA_URL);
  const [localModel, setLocalModel] = useState(aiConfig.localModel || config.model || DEFAULT_LOCAL_QWEN_MODEL);
  const [localEnabled, setLocalEnabled] = useState(
    aiConfig.modality === 'ollama_qwen' || aiConfig.modality === 'local_other'
      ? aiConfig.status !== 'disabled' && (config.enabled || aiConfig.modality === 'local_other')
      : true
  );

  const [cloudProvider, setCloudProvider] = useState<CloudAIProvider>(aiConfig.cloudProvider);
  const [cloudModel, setCloudModel] = useState(aiConfig.cloudModel || DEFAULT_CLOUD_MODELS[aiConfig.cloudProvider]);
  const [cloudEndpoint, setCloudEndpoint] = useState(aiConfig.cloudEndpoint ?? '');
  const [sessionApiKey, setSessionApiKey] = useState('');

  const [temperature, setTemperature] = useState(aiConfig.temperature ?? 0.35);
  const [timeoutMs, setTimeoutMs] = useState(aiConfig.timeoutMs ?? 9000);
  const [maxRetries, setMaxRetries] = useState(aiConfig.maxRetries ?? 1);
  const [autoFallback, setAutoFallback] = useState(aiConfig.autoFallback ?? true);

  const [cloudStatus, setCloudStatus] = useState<CloudStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/ai/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data) setCloudStatus(data as CloudStatus);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  function handleSelectCloudProvider(nextProv: CloudAIProvider) {
    setCloudProvider(nextProv);
    setCloudModel(DEFAULT_CLOUD_MODELS[nextProv]);
    setSessionApiKey('');
    setTestResult(null);
  }

  function handleSelectLocalProtocol(nextProto: LocalAIProtocol) {
    setLocalProtocol(nextProto);
    if (nextProto === 'openai_compatible' && localUrl.includes('11434')) {
      setLocalUrl(DEFAULT_OPENAI_LOCAL_URL);
    } else if (nextProto === 'ollama' && localUrl.includes('1234')) {
      setLocalUrl(DEFAULT_LOCAL_OLLAMA_URL);
    }
  }

  async function handleSaveSessionCredential() {
    if (cloudProvider === 'gemini' || !sessionApiKey.trim()) return;
    try {
      const res = await fetch('/api/ai/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: cloudProvider, apiKey: sessionApiKey.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setTestResult({ ok: false, msg: data.error || 'No se pudo registrar la clave de sesión.' });
        return;
      }
      setSessionApiKey('');
      const st = await fetch('/api/ai/status').then((r) => r.json());
      setCloudStatus(st as CloudStatus);
      setTestResult({ ok: true, msg: 'Clave de sesión guardada solo en memoria del servidor.' });
    } catch {
      setTestResult({ ok: false, msg: 'Error conectando con el servidor.' });
    }
  }

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      if (modality === 'none') {
        setTestResult({ ok: true, msg: 'Modo 100% convencional activo (no requiere conexión externa).' });
        return;
      }

      if (modality === 'cloud') {
        if (cloudProvider !== 'gemini' && sessionApiKey.trim()) {
          await handleSaveSessionCredential();
        }
        const res = await fetch('/api/ai/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: cloudProvider,
            model: cloudModel.trim() || DEFAULT_CLOUD_MODELS[cloudProvider],
            endpoint: cloudEndpoint.trim(),
          }),
        });
        const data = (await res.json()) as { ok?: boolean; providerLabel?: string; latencyMs?: number; error?: string };
        if (!res.ok || !data.ok) {
          setTestResult({ ok: false, msg: data.error || 'Fallo al probar el proveedor en la nube.' });
        } else {
          setTestResult({
            ok: true,
            msg: `Conectado a ${data.providerLabel ?? cloudProvider} (${data.latencyMs ?? 0} ms).`,
          });
        }
        return;
      }

      const targetUrl =
        localUrl.trim() || (localProtocol === 'openai_compatible' ? DEFAULT_OPENAI_LOCAL_URL : DEFAULT_LOCAL_OLLAMA_URL);
      const modelName = localModel.trim() || DEFAULT_LOCAL_QWEN_MODEL;
      const body =
        localProtocol === 'openai_compatible'
          ? {
              model: modelName,
              temperature: 0,
              messages: [{ role: 'user', content: 'Respondé OK' }],
            }
          : {
              model: modelName,
              prompt: 'Respondé OK',
              stream: false,
            };
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.max(2000, timeoutMs));
      const started = Date.now();
      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setTestResult({ ok: true, msg: `Local conectado a ${modelName} (${Date.now() - started} ms).` });
      } finally {
        clearTimeout(timer);
      }
    } catch (err) {
      setTestResult({
        ok: false,
        msg: err instanceof Error ? err.message : 'No se pudo conectar con la IA seleccionada.',
      });
    } finally {
      setTesting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (modality === 'cloud' && cloudProvider !== 'gemini' && sessionApiKey.trim()) {
      await handleSaveSessionCredential();
    }

    const cleanUrl =
      localUrl.trim() || (localProtocol === 'openai_compatible' ? DEFAULT_OPENAI_LOCAL_URL : DEFAULT_LOCAL_OLLAMA_URL);
    const cleanModel = localModel.trim() || DEFAULT_LOCAL_QWEN_MODEL;

    const nextStatus: AIProviderConfig['status'] =
      modality === 'none'
        ? 'disabled'
        : modality === 'cloud'
          ? 'ready'
          : localEnabled
            ? 'ready'
            : 'disabled';

    const nextAIConfig: AIProviderConfig = {
      modality,
      localProtocol: modality === 'ollama_qwen' ? 'ollama' : localProtocol,
      localUrl: cleanUrl,
      localModel: cleanModel,
      cloudProvider,
      cloudModel: cloudModel.trim() || DEFAULT_CLOUD_MODELS[cloudProvider],
      cloudEndpoint: cloudEndpoint.trim(),
      temperature: Math.max(0, Math.min(1.5, temperature)),
      timeoutMs: Math.max(2000, Math.min(30000, timeoutMs)),
      maxRetries: Math.max(0, Math.min(3, maxRetries)),
      autoFallback,
      status: nextStatus,
      lastError: null,
      consecutiveFailures: 0,
      lastLatencyMs: aiConfig.lastLatencyMs,
    };

    const nextOllama: OllamaConfig = {
      enabled: (modality === 'ollama_qwen' || (modality === 'local_other' && localProtocol === 'ollama')) && localEnabled,
      url: cleanUrl,
      model: cleanModel,
    };

    onSave(nextOllama, nextAIConfig);
  }

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ollama-modal-title"
    >
      <form
        onSubmit={handleSubmit}
        className="bg-[#111827] border border-slate-700 rounded-xl p-4 w-full max-w-lg flex flex-col gap-3 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between gap-2">
          <h2 id="ollama-modal-title" className="text-base font-bold text-slate-50">
            Motor de Inteligencia Artificial
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            Estado: {aiConfig.status}
            {aiConfig.lastLatencyMs ? ` (${aiConfig.lastLatencyMs}ms)` : ''}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" role="tablist" aria-label="Modalidad de IA">
          {(
            [
              { id: 'ollama_qwen', label: 'A: Qwen 2.5' },
              { id: 'local_other', label: 'B: Otra Local' },
              { id: 'cloud', label: 'C: IA Nube' },
              { id: 'none', label: 'D: Sin IA' },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              aria-selected={modality === m.id}
              data-testid={`ai-modality-${m.id}`}
              onClick={() => {
                setModality(m.id);
                setTestResult(null);
              }}
              className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-colors ${
                modality === m.id
                  ? 'border-emerald-500 bg-emerald-950/60 text-emerald-200'
                  : 'border-slate-800 bg-[#0b1120] text-slate-400 hover:text-slate-100'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {modality === 'ollama_qwen' && (
          <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-2.5 text-xs">
            <p className="text-slate-300 leading-snug">
              Soporte prioritario para <code className="font-mono text-emerald-300">qwen2.5:3b</code> en Ollama local. Si Ollama está apagado, las reglas integradas garantizan continuidad total.
            </p>
            <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={localEnabled}
                onChange={(e) => setLocalEnabled(e.target.checked)}
                className="rounded border-slate-600 bg-[#111827] text-emerald-500"
              />
              <span>Activar peticiones en vivo a Qwen 2.5 (Ollama)</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-slate-300">
                <span>URL Ollama</span>
                <input
                  type="text"
                  value={localUrl}
                  onChange={(e) => setLocalUrl(e.target.value)}
                  className="bg-[#111827] border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 font-mono"
                />
              </label>
              <label className="flex flex-col gap-1 text-slate-300">
                <span>Modelo</span>
                <input
                  type="text"
                  value={localModel}
                  onChange={(e) => setLocalModel(e.target.value)}
                  className="bg-[#111827] border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 font-mono"
                />
              </label>
            </div>
          </div>
        )}

        {modality === 'local_other' && (
          <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-2.5 text-xs">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                <input
                  type="radio"
                  name="localProto"
                  checked={localProtocol === 'ollama'}
                  onChange={() => handleSelectLocalProtocol('ollama')}
                />
                <span>Ollama (Llama, Mistral, Gemma)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                <input
                  type="radio"
                  name="localProto"
                  checked={localProtocol === 'openai_compatible'}
                  onChange={() => handleSelectLocalProtocol('openai_compatible')}
                />
                <span>LM Studio / OpenAI Local</span>
              </label>
            </div>
            <label className="flex items-center gap-2 text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={localEnabled}
                onChange={(e) => setLocalEnabled(e.target.checked)}
                className="rounded border-slate-600 bg-[#111827] text-emerald-500"
              />
              <span>Habilitar consultas al servidor local</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-slate-300">
                <span>Endpoint local</span>
                <input
                  type="text"
                  value={localUrl}
                  onChange={(e) => setLocalUrl(e.target.value)}
                  className="bg-[#111827] border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 font-mono"
                />
              </label>
              <label className="flex flex-col gap-1 text-slate-300">
                <span>ID del modelo local</span>
                <input
                  type="text"
                  value={localModel}
                  onChange={(e) => setLocalModel(e.target.value)}
                  placeholder="llama3.2:3b"
                  className="bg-[#111827] border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 font-mono"
                />
              </label>
            </div>
          </div>
        )}

        {modality === 'cloud' && (
          <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-2.5 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              {(
                [
                  { id: 'gemini', label: 'Gemini' },
                  { id: 'openai', label: 'OpenAI' },
                  { id: 'anthropic', label: 'Claude' },
                  { id: 'custom_openai', label: 'HTTPS Custom' },
                ] as const
              ).map((cp) => (
                <button
                  key={cp.id}
                  type="button"
                  data-testid={`cloud-provider-${cp.id}`}
                  onClick={() => handleSelectCloudProvider(cp.id)}
                  className={`py-1 px-2 rounded border text-[11px] font-medium transition-colors ${
                    cloudProvider === cp.id
                      ? 'border-sky-500 bg-sky-950/60 text-sky-200'
                      : 'border-slate-800 bg-[#111827] text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {cp.label}
                </button>
              ))}
            </div>

            <label className="flex flex-col gap-1 text-slate-300">
              <span>Modelo en la nube</span>
              <input
                type="text"
                value={cloudModel}
                onChange={(e) => setCloudModel(e.target.value)}
                className="bg-[#111827] border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 font-mono"
              />
            </label>

            {cloudProvider === 'gemini' ? (
              <div className="bg-[#111827] border border-slate-800 rounded px-2.5 py-2 text-[11px] text-slate-300">
                <div>
                  Credencial administrada en servidor (<code className="font-mono">GEMINI_API_KEY</code> en entorno).
                </div>
                <div className="mt-0.5 font-mono text-[10.5px]">
                  Estado en servidor:{' '}
                  <span className={cloudStatus?.geminiConfigured ? 'text-emerald-400' : 'text-amber-300'}>
                    {cloudStatus?.geminiConfigured ? 'Configurada' : 'Pendiente en .env del servidor'}
                  </span>
                </div>
              </div>
            ) : (
              <>
                {cloudProvider === 'custom_openai' && (
                  <label className="flex flex-col gap-1 text-slate-300">
                    <span>Endpoint HTTPS externo</span>
                    <input
                      type="url"
                      value={cloudEndpoint}
                      onChange={(e) => setCloudEndpoint(e.target.value)}
                      placeholder="https://api.ejemplo.com/v1/chat/completions"
                      className="bg-[#111827] border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 font-mono"
                    />
                  </label>
                )}
                <label className="flex flex-col gap-1 text-slate-300">
                  <span>Clave API de sesión (solo memoria del servidor, nunca se guarda en disco)</span>
                  <input
                    type="password"
                    value={sessionApiKey}
                    onChange={(e) => setSessionApiKey(e.target.value)}
                    placeholder="Opcional si ya está configurada en .env del servidor"
                    className="bg-[#111827] border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-100 font-mono"
                  />
                </label>
              </>
            )}
          </div>
        )}

        {modality === 'none' && (
          <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 text-xs text-slate-300 leading-relaxed">
            La simulación opera 100% con heurísticas determinísticas, personalidades, memoria, necesidades, leyes y metas autónomas sin consultar ningún modelo LLM externo.
          </div>
        )}

        <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-2.5 grid grid-cols-3 gap-2 text-[11px]">
          <label className="flex flex-col gap-1 text-slate-400">
            <span>Timeout (ms)</span>
            <input
              type="number"
              min={2000}
              max={30000}
              step={500}
              value={timeoutMs}
              onChange={(e) => setTimeoutMs(Number(e.target.value))}
              className="bg-[#111827] border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1 text-slate-400">
            <span>Reintentos</span>
            <input
              type="number"
              min={0}
              max={3}
              value={maxRetries}
              onChange={(e) => setMaxRetries(Number(e.target.value))}
              className="bg-[#111827] border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
            />
          </label>
          <label className="flex flex-col gap-1 text-slate-400">
            <span>Temperatura</span>
            <input
              type="number"
              min={0}
              max={1.5}
              step={0.05}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="bg-[#111827] border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-mono"
            />
          </label>
          <label className="col-span-3 flex items-center gap-2 text-slate-300 cursor-pointer pt-0.5">
            <input
              type="checkbox"
              checked={autoFallback}
              onChange={(e) => setAutoFallback(e.target.checked)}
              className="rounded border-slate-600 bg-[#111827] text-emerald-500"
            />
            <span>Respaldo automático al motor de reglas si el proveedor falla o excede timeout</span>
          </label>
        </div>

        {(testResult || aiConfig.lastError) && (
          <div
            className={`rounded-lg border px-2.5 py-2 text-xs ${
              testResult?.ok
                ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-200'
                : 'bg-amber-950/50 border-amber-700/60 text-amber-200'
            }`}
          >
            {testResult?.msg ?? `Último aviso: ${aiConfig.lastError}`}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            disabled={testing}
            onClick={() => void handleTestConnection()}
            data-testid="ai-test-connection-btn"
            className="px-3 py-2 rounded-lg bg-[#0b1120] border border-sky-700/70 hover:bg-sky-950/60 disabled:opacity-50 text-sky-200 text-xs font-medium"
          >
            {testing ? 'Probando...' : 'Probar conexión'}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              data-testid="ai-save-btn"
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
            >
              Guardar configuración
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

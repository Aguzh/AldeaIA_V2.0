import { useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  AIHealthStatus,
  QwenMessage,
  QwenPolicyState,
  RepresentativeGoals,
} from '../types/simulation';

interface QwenConsoleProps {
  messages: QwenMessage[];
  policies: QwenPolicyState;
  ollamaEnabled: boolean;
  ollamaModel: string;
  aiBadgeLabel?: string;
  aiStatus?: AIHealthStatus;
  isBusy: boolean;
  representativeName?: string | null;
  representativeJob?: string | null;
  representativeGoal?: string | null;
  representativeGoals?: RepresentativeGoals;
  onSendDirective: (text: string) => void;
}

const QUICK_DIRECTIVES = [
  'Construir plaza, puente y 2 casas',
  'Construir depósito general, ayuntamiento y comisaría',
  'Genera una economía, préstamos y comercios',
  'Establecer contratos de aprendizaje y reparar estructuras',
  'Agregar 2 vacas, 2 caballos y 1 perro',
];

export function QwenConsole({
  messages,
  policies,
  ollamaEnabled,
  ollamaModel,
  aiBadgeLabel,
  aiStatus,
  isBusy,
  representativeName,
  representativeJob,
  representativeGoal,
  representativeGoals,
  onSendDirective,
}: QwenConsoleProps) {
  const [input, setInput] = useState('');
  const [minimized, setMinimized] = useState(false);
  const [showQuick, setShowQuick] = useState(false);
  const [showGoals, setShowGoals] = useState(false);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = logContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length, minimized]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isBusy) return;
    onSendDirective(trimmed);
    setInput('');
  }

  const activePolicies: string[] = [];
  if (policies.economyFocus) activePolicies.push('Economía');
  if (policies.buildPriority) activePolicies.push('Casas');
  if (policies.workFocus) activePolicies.push('Oficios');
  if (policies.evolutionFocus) activePolicies.push('Evolución');
  if (policies.farmingFocus) activePolicies.push('Cultivos');
  if (!policies.reproductionRestraint) activePolicies.push('Natalidad');
  if (policies.healthPriority) activePolicies.push('Salud');

  const headerBadge =
    aiBadgeLabel ?? (ollamaEnabled ? `Ollama · ${ollamaModel}` : 'Motor Local Qwen');

  return (
    <section
      className={`bg-[#111827] border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5 shrink-0 ${
        minimized ? '' : 'min-h-[500px]'
      }`}
      data-testid="qwen-console-panel"
    >
      {/* 1. Encabezado */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="text-[16px] leading-tight font-bold tracking-wide text-slate-100">
            Hablar con el Representante
          </h2>
          <span
            className={`self-start text-[12px] font-mono px-2 py-0.5 rounded-md border ${
              aiStatus === 'connected'
                ? 'border-emerald-700/70 bg-emerald-950/50 text-emerald-300'
                : aiStatus === 'fallback'
                  ? 'border-amber-700/70 bg-amber-950/50 text-amber-300'
                  : 'border-slate-700 bg-[#0b1120] text-slate-300'
            }`}
          >
            {headerBadge}
          </span>
        </div>
        <button
          type="button"
          aria-expanded={!minimized}
          aria-label={minimized ? 'Expandir consola del Representante' : 'Minimizar consola del Representante'}
          data-testid="toggle-qwen-panel"
          onClick={() => setMinimized((v) => !v)}
          className="w-7 h-7 rounded-md bg-[#0b1120] border border-slate-700 hover:border-slate-500 text-slate-200 text-[16px] font-mono flex items-center justify-center transition-colors shrink-0"
        >
          {minimized ? '+' : '−'}
        </button>
      </div>

      {!minimized && (
        <>
          {/* 2. Banner de Representante */}
          <div
            className="bg-[#0b1120] border border-violet-700/50 rounded-lg px-2.5 py-2 flex flex-col gap-1 text-[13px]"
            data-testid="qwen-representative-banner"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-violet-200 font-semibold leading-snug">
                {representativeName
                  ? `Rep.: ${representativeName}${representativeJob ? ` (${representativeJob})` : ''}`
                  : 'Rep.: Pendiente'}
              </span>
              <button
                type="button"
                onClick={() => setShowGoals((v) => !v)}
                aria-expanded={showGoals}
                className="text-[12px] font-mono text-violet-300 hover:text-violet-200 underline underline-offset-2 whitespace-nowrap shrink-0"
              >
                {showGoals ? 'Ocultar metas' : 'Metas 3 niveles'}
              </button>
            </div>
            {(representativeGoals?.shortTerm || representativeGoal) && (
              <div className="text-[13px] text-slate-300 leading-snug">
                Corto plazo: {representativeGoals?.shortTerm ?? representativeGoal}
              </div>
            )}
            {showGoals && representativeGoals && (
              <div className="pt-1.5 border-t border-slate-800/80 flex flex-col gap-1 text-[12px] text-slate-300 leading-snug">
                <div>
                  <strong className="text-sky-300">Mediano:</strong> {representativeGoals.mediumTerm}
                </div>
                <div>
                  <strong className="text-emerald-300">Largo:</strong> {representativeGoals.longTerm}
                </div>
              </div>
            )}
          </div>

          {/* 3. Reglas activas y Atajos (envueltos juntos para mantener chat como div:nth-of-type(4)) */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2 flex-wrap text-[13px]">
              <div className="text-emerald-400/95 leading-snug">
                {activePolicies.length > 0 ? `Reglas: ${activePolicies.join(' · ')}` : 'Reglas: Base'}
              </div>
              <button
                type="button"
                onClick={() => setShowQuick((v) => !v)}
                aria-expanded={showQuick}
                className="text-sky-300 hover:text-sky-200 font-semibold underline underline-offset-2 whitespace-nowrap shrink-0"
              >
                {showQuick ? 'Ocultar atajos' : 'Atajos (5)'}
              </button>
            </div>

            {showQuick && (
              <div className="grid grid-cols-1 gap-1.5">
                {QUICK_DIRECTIVES.map((dir) => (
                  <button
                    key={dir}
                    type="button"
                    disabled={isBusy}
                    onClick={() => onSendDirective(dir)}
                    className="px-2.5 py-1.5 text-[13px] leading-snug rounded-lg bg-[#0b1120] border border-slate-800 hover:border-emerald-500/60 text-slate-200 hover:text-emerald-200 transition-colors text-left"
                  >
                    {dir}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 4. Chat principal con la IA */}
          <div
            ref={logContainerRef}
            className="bg-[#0b1120] border border-slate-700/80 rounded-xl p-2.5 flex-1 min-h-[270px] max-h-[420px] overflow-y-auto flex flex-col gap-2"
            data-testid="qwen-chat-log"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={`text-[14px] leading-relaxed px-2.5 py-2 rounded-lg ${
                  m.role === 'user'
                    ? 'bg-slate-800/90 text-slate-50 self-end max-w-[94%]'
                    : 'bg-slate-900/95 text-slate-100 border border-slate-700/80 self-start max-w-[98%]'
                }`}
              >
                <div className="text-[12px] font-semibold text-slate-400 mb-0.5">
                  {m.role === 'user'
                    ? 'Vos'
                    : `${representativeName ? `Rep. ${representativeName} · ` : ''}${
                        m.providerLabel ??
                        (m.source === 'ollama'
                          ? 'Ollama'
                          : m.source === 'cloud'
                            ? 'IA Nube'
                            : m.source === 'none'
                              ? 'Reglas'
                              : 'Qwen / Reglas')
                      }`}
                </div>
                <div className="break-words">{m.text}</div>
                {m.appliedRules && m.appliedRules.length > 0 && (
                  <div className="mt-1 text-[12px] text-emerald-400 font-mono leading-snug">
                    Ejecutado: {m.appliedRules.join(' · ')}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 5. Formulario de entrada */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
            <label htmlFor="qwen-directive-input" className="sr-only">
              Orden o mensaje para el Representante
            </label>
            <input
              id="qwen-directive-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Orden al Representante..."
              className="flex-1 min-w-0 bg-[#0b1120] border border-slate-700 rounded-lg px-2.5 py-2 text-[14px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={isBusy || !input.trim()}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[14px] font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              {isBusy ? '...' : 'Enviar'}
            </button>
          </form>
        </>
      )}
    </section>
  );
}

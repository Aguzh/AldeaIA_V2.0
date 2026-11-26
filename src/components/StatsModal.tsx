import { useState } from 'react';
import type {
  DaySnapshot,
  EvolutionStats,
  MarketPrices,
  MilestoneStatus,
  VillagePolitics,
} from '../types/simulation';

interface StatsModalProps {
  history: DaySnapshot[];
  evolutionStats: EvolutionStats;
  milestones: MilestoneStatus[];
  politics: VillagePolitics;
  marketPrices: MarketPrices;
  ecosystemHealth: number;
  onClose: () => void;
}

type StatsTab = 'summary' | 'comparison' | 'milestones' | 'politics';

function buildLinePath(values: number[], width: number, height: number, maxVal: number): string {
  if (values.length === 0) return '';
  if (values.length === 1) {
    const y = height - (values[0] / Math.max(1, maxVal)) * (height - 16) - 8;
    return `M 10 ${y.toFixed(1)} L ${width - 10} ${y.toFixed(1)}`;
  }
  return values
    .map((val, idx) => {
      const x = 10 + (idx / (values.length - 1)) * (width - 20);
      const y = height - (val / Math.max(1, maxVal)) * (height - 16) - 8;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export function StatsModal({
  history,
  evolutionStats,
  milestones,
  politics,
  marketPrices,
  ecosystemHealth,
  onClose,
}: StatsModalProps) {
  const [tab, setTab] = useState<StatsTab>('summary');
  const latest = history[history.length - 1] ?? {
    day: 1,
    population: 0,
    avgHealth: 0,
    avgHappiness: 0,
    houses: 0,
    knowledge: 0,
    totalCoins: 0,
  };

  const w = 480;
  const h = 150;
  const maxPop = Math.max(30, ...history.map((d) => d.population));
  const maxKnow = Math.max(60, ...history.map((d) => d.knowledge));
  const maxCoins = Math.max(200, ...history.map((d) => d.totalCoins));

  const popPath = buildLinePath(history.map((d) => d.population), w, h, maxPop);
  const healthPath = buildLinePath(history.map((d) => d.avgHealth), w, h, 100);
  const knowPath = buildLinePath(history.map((d) => d.knowledge), w, h, maxKnow);
  const coinsPath = buildLinePath(history.map((d) => d.totalCoins), w, h, maxCoins);

  const naturalScore =
    evolutionStats.natural.births * 3 +
    evolutionStats.natural.constructions * 5 +
    evolutionStats.natural.resourcesGathered +
    evolutionStats.natural.knowledgeGained +
    evolutionStats.natural.tradesCompleted * 2;
  const divineScore =
    evolutionStats.divine.resourcesGranted +
    evolutionStats.divine.villagersSpawned * 3 +
    evolutionStats.divine.instantBuildings * 5 +
    evolutionStats.divine.knowledgeGranted +
    evolutionStats.divine.healsGranted;
  const totalScore = Math.max(1, naturalScore + divineScore);
  const naturalPct = Math.round((naturalScore / totalScore) * 100);
  const achievedCount = milestones.filter((m) => m.achieved).length;

  return (
    <div
      className="fixed inset-0 bg-slate-950/80 flex items-center justify-center p-4 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-modal-title"
    >
      <div className="bg-[#111827] border border-slate-700 rounded-xl p-5 w-full max-w-xl flex flex-col gap-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 id="stats-modal-title" className="text-base font-bold text-slate-50">
            Estadísticas y Evolución de la Aldea
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium"
          >
            Cerrar
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1 bg-[#0b1120] border border-slate-800 rounded-lg p-1" role="tablist">
          {(
            [
              { id: 'summary', label: 'Resumen' },
              { id: 'comparison', label: 'Natural vs Divino' },
              { id: 'milestones', label: `Hitos (${achievedCount}/${milestones.length})` },
              { id: 'politics', label: 'Política y Mercado' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`py-1.5 px-2 rounded text-[11px] font-semibold transition-colors truncate ${
                tab === t.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'summary' && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-2.5">
                <div className="text-slate-400">Población</div>
                <div className="text-base font-bold font-mono tabular-nums text-emerald-400">
                  {latest.population}
                </div>
              </div>
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-2.5">
                <div className="text-slate-400">Salud media</div>
                <div className="text-base font-bold font-mono tabular-nums text-sky-400">
                  {latest.avgHealth}%
                </div>
              </div>
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-2.5">
                <div className="text-slate-400">Saber acumulado</div>
                <div className="text-base font-bold font-mono tabular-nums text-violet-400">
                  {latest.knowledge}
                </div>
              </div>
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-2.5">
                <div className="text-slate-400">Economía total</div>
                <div className="text-base font-bold font-mono tabular-nums text-amber-400">
                  {latest.totalCoins} mon.
                </div>
              </div>
            </div>

            <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-300">
                <span className="text-emerald-400">● Población</span>
                <span className="text-sky-400">● Salud media</span>
                <span className="text-violet-400">● Saber</span>
                <span className="text-amber-400">● Monedas</span>
                <span className="ml-auto font-mono tabular-nums text-slate-400">
                  {history.length} día(s) registrados
                </span>
              </div>
              <svg
                viewBox={`0 0 ${w} ${h}`}
                className="w-full h-40 overflow-visible"
                role="img"
                aria-label="Gráfico histórico de población, salud, saber y monedas"
              >
                <line x1="10" y1={h / 2} x2={w - 10} y2={h / 2} stroke="#1e293b" strokeDasharray="4 4" />
                <line x1="10" y1={h - 8} x2={w - 10} y2={h - 8} stroke="#334155" />
                <path d={popPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                <path d={healthPath} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                <path d={knowPath} fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" />
                <path d={coinsPath} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </>
        )}

        {tab === 'comparison' && (
          <div className="flex flex-col gap-3 text-xs">
            <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-1.5">
              <div className="flex justify-between font-semibold">
                <span className="text-emerald-400">Progreso Natural: {naturalPct}%</span>
                <span className="text-violet-300">Intervención Divina: {100 - naturalPct}%</span>
              </div>
              <div className="h-2.5 w-full bg-violet-950 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${naturalPct}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#0b1120] border border-emerald-800/50 rounded-lg p-3 flex flex-col gap-1 font-mono tabular-nums text-[11px]">
                <div className="font-sans font-semibold text-emerald-300 mb-0.5">Evolución Natural</div>
                <div className="flex justify-between"><span>Nacimientos:</span><span>{evolutionStats.natural.births}</span></div>
                <div className="flex justify-between"><span>Obras completadas:</span><span>{evolutionStats.natural.constructions}</span></div>
                <div className="flex justify-between"><span>Recursos recolectados:</span><span>{evolutionStats.natural.resourcesGathered}</span></div>
                <div className="flex justify-between"><span>Saber ganado:</span><span>{Math.round(evolutionStats.natural.knowledgeGained)}</span></div>
                <div className="flex justify-between"><span>Leyes promulgadas:</span><span>{evolutionStats.natural.lawsEnacted}</span></div>
                <div className="flex justify-between"><span>Intercambios:</span><span>{evolutionStats.natural.tradesCompleted}</span></div>
              </div>

              <div className="bg-[#0b1120] border border-violet-800/50 rounded-lg p-3 flex flex-col gap-1 font-mono tabular-nums text-[11px]">
                <div className="font-sans font-semibold text-violet-300 mb-0.5">Intervención Divina</div>
                <div className="flex justify-between"><span>Recursos otorgados:</span><span>{evolutionStats.divine.resourcesGranted}</span></div>
                <div className="flex justify-between"><span>Aldeanos creados:</span><span>{evolutionStats.divine.villagersSpawned}</span></div>
                <div className="flex justify-between"><span>Obras/reparac. divinas:</span><span>{evolutionStats.divine.instantBuildings}</span></div>
                <div className="flex justify-between"><span>Saber otorgado:</span><span>{Math.round(evolutionStats.divine.knowledgeGranted)}</span></div>
                <div className="flex justify-between"><span>Curaciones divinas:</span><span>{evolutionStats.divine.healsGranted}</span></div>
                <div className="flex justify-between"><span>Desastres/eventos:</span><span>{evolutionStats.divine.disastersTriggered}</span></div>
              </div>
            </div>
          </div>
        )}

        {tab === 'milestones' && (
          <div className="max-h-72 overflow-y-auto flex flex-col gap-1.5 pr-1">
            {milestones.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg border px-3 py-2 text-xs flex items-start justify-between gap-2 ${
                  m.achieved
                    ? 'bg-emerald-950/30 border-emerald-700/60 text-slate-100'
                    : 'bg-[#0b1120] border-slate-800 text-slate-400'
                }`}
              >
                <div>
                  <div className="font-semibold">
                    {m.achieved ? '✓ ' : '○ '}
                    {m.title}
                  </div>
                  <div className="text-[11px] opacity-85">{m.description}</div>
                </div>
                <div className="text-right font-mono text-[10px] shrink-0">
                  {m.achieved ? (
                    <span className="text-emerald-300">
                      Día {m.achievedDay} · {m.origin}
                    </span>
                  ) : (
                    <span>Pendiente</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'politics' && (
          <div className="flex flex-col gap-2.5 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-2.5">
                <div className="text-slate-400">Aprobación</div>
                <div className="text-base font-bold font-mono text-emerald-400">
                  {Math.round(politics.approvalRating)}%
                </div>
              </div>
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-2.5">
                <div className="text-slate-400">Legitimidad</div>
                <div className="text-base font-bold font-mono text-sky-400">
                  {Math.round(politics.legitimacy)}%
                </div>
              </div>
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-2.5">
                <div className="text-slate-400">Ecosistema</div>
                <div className="text-base font-bold font-mono text-emerald-300">
                  {Math.round(ecosystemHealth)}%
                </div>
              </div>
            </div>
            <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-1.5 font-mono text-[11px]">
              <div className="font-sans font-semibold text-amber-300">
                Precios de Mercado (Inflación x{marketPrices.inflationIndex})
              </div>
              <div className="grid grid-cols-4 gap-2">
                <span>Comida: {marketPrices.food}m</span>
                <span>Pan: {marketPrices.bread}m</span>
                <span>Madera: {marketPrices.wood}m</span>
                <span>Piedra: {marketPrices.stone}m</span>
                <span>Cobre: {marketPrices.copper}m</span>
                <span>Hierro: {marketPrices.iron}m</span>
                <span>Herram.: {marketPrices.tools}m</span>
                <span>Medic.: {marketPrices.medicine}m</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

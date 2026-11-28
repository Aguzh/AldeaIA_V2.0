import { useState } from 'react';
import type {
  ChronicleCategory,
  DiplomaticRelation,
  SimulationState,
  TradeGoodKey,
} from '../types/simulation';
import { ERA_METADATA, isBuildingOperational } from '../simulation/rules';
import { DISCOVERY_CATALOG } from '../simulation/discoveries';
import { getOriginLabel } from '../simulation/cultureAndFamilies';
import { buildDiplomaticProposalSummary, TRADE_GOOD_LABELS } from '../simulation/diplomacy';
import { getLiveCurrentDecadePreview } from '../simulation/historyAndChronicle';

interface CivilizationModalProps {
  state: SimulationState;
  isDiplomacyAdvisorBusy?: boolean;
  diplomacyAdvice?: string | null;
  onExternalTrade: (
    communityId: string,
    kind: 'import' | 'export' | 'knowledge',
    good: TradeGoodKey,
    amount: number
  ) => void;
  onRequestDiplomacyAdvice: () => void;
  onDivineModifyDiplomacy: (communityId: string, relation: DiplomaticRelation) => void;
  onDivineSparkFestival: () => void;
  onDivineAccelerateDiscovery: () => void;
  onDivineMitigateCrises: () => void;
  onSelectAgent: (agentId: number) => void;
  onClose: () => void;
}

type CivTab = 'society' | 'culture' | 'discoveries' | 'diplomacy' | 'crises' | 'history';

const TRADE_GOODS: TradeGoodKey[] = ['food', 'bread', 'wood', 'stone', 'copper', 'iron', 'tools', 'medicine'];

const RELATION_STYLES: Record<DiplomaticRelation, { label: string; cls: string }> = {
  desconocidos: { label: 'Sin contacto', cls: 'bg-slate-800 border-slate-700 text-slate-300' },
  neutrales: { label: 'Neutrales', cls: 'bg-sky-950/60 border-sky-700/70 text-sky-200' },
  comerciales: { label: 'Comerciales', cls: 'bg-amber-950/60 border-amber-700/70 text-amber-200' },
  aliados: { label: 'Aliados', cls: 'bg-emerald-950/60 border-emerald-700/70 text-emerald-200' },
  hostiles: { label: 'Hostiles', cls: 'bg-rose-950/60 border-rose-700/70 text-rose-200' },
};

const CHRONICLE_FILTERS: Array<{ id: 'all' | ChronicleCategory; label: string }> = [
  { id: 'all', label: 'Todas' },
  { id: 'family', label: 'Familias' },
  { id: 'technology', label: 'Saber' },
  { id: 'culture', label: 'Cultura' },
  { id: 'diplomacy', label: 'Diplomacia' },
  { id: 'crisis', label: 'Crisis' },
  { id: 'architecture', label: 'Obras' },
  { id: 'social', label: 'Sociedad' },
  { id: 'divine', label: 'Divino' },
];

function buildTrendPath(values: number[], width: number, height: number): string {
  if (values.length === 0) return '';
  if (values.length === 1) {
    const y = height - (values[0] / 100) * (height - 16) - 8;
    return `M 34 ${y.toFixed(1)} L ${width - 10} ${y.toFixed(1)}`;
  }
  return values
    .map((val, idx) => {
      const x = 34 + (idx / (values.length - 1)) * (width - 44);
      const y = height - (Math.max(0, Math.min(100, val)) / 100) * (height - 16) - 8;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export function CivilizationModal({
  state,
  isDiplomacyAdvisorBusy = false,
  diplomacyAdvice = null,
  onExternalTrade,
  onRequestDiplomacyAdvice,
  onDivineModifyDiplomacy,
  onDivineSparkFestival,
  onDivineAccelerateDiscovery,
  onDivineMitigateCrises,
  onSelectAgent,
  onClose,
}: CivilizationModalProps) {
  const [activeTab, setActiveTab] = useState<CivTab>('society');
  const [selectedGoodByComm, setSelectedGoodByComm] = useState<Record<string, TradeGoodKey>>({});
  const [chronicleFilter, setChronicleFilter] = useState<'all' | ChronicleCategory>('all');
  const [bioSearch, setBioSearch] = useState('');

  const isObserver = (state.interventionMode ?? 'intervention') === 'observer';
  const indicators = state.societyIndicators ?? {
    happiness: 75,
    security: 72,
    governmentTrust: 72,
    qualityOfLife: 70,
    economicInequality: 18,
    educationAccess: 40,
    healthcareAccess: 45,
    socialStability: 76,
    migrationPull: 25,
  };
  const societyHistory = state.societyHistory ?? [];
  const districts = state.districts ?? [];
  const culture = state.culture ?? {
    traditions: [],
    activeFestival: null,
    beliefs: [],
    identityTag: 'Comunidad Fundadora',
  };
  const discoveries = state.discoveries ?? [];
  const discoveredIds = new Set(discoveries.map((d) => d.id));
  const communities = state.externalCommunities ?? [];
  const tradeHistory = state.externalTradeHistory ?? [];
  const crisisMonitor = state.crisisMonitor ?? {
    activeCrises: [],
    foodReserveDays: 4,
    droughtStreakDays: 0,
    scarcityAlert: false,
    epidemicAlert: false,
    lastEvaluationDay: state.day,
  };
  const chronicleArchive = state.chronicleArchive ?? [];
  const biographies = state.biographies ?? [];
  const decadeSummaries = state.decadeSummaries ?? [];
  const liveDecade = getLiveCurrentDecadePreview(state);
  const proposal = buildDiplomaticProposalSummary(state);

  const filteredChronicle =
    chronicleFilter === 'all'
      ? chronicleArchive
      : chronicleArchive.filter((c) => c.category === chronicleFilter);

  const query = bioSearch.trim().toLowerCase();
  const filteredBios = biographies.filter((b) => {
    if (!query) return true;
    return (
      b.name.toLowerCase().includes(query) ||
      b.primaryJob.toLowerCase().includes(query) ||
      b.notableDeeds.some((d) => d.toLowerCase().includes(query))
    );
  });

  const metricCards: Array<{ label: string; value: number; suffix?: string; inverse?: boolean }> = [
    { label: 'Calidad de Vida', value: indicators.qualityOfLife, suffix: '%' },
    { label: 'Felicidad Media', value: indicators.happiness, suffix: '%' },
    { label: 'Seguridad', value: indicators.security, suffix: '%' },
    { label: 'Confianza Institucional', value: indicators.governmentTrust, suffix: '%' },
    { label: 'Estabilidad Social', value: indicators.socialStability, suffix: '%' },
    { label: 'Acceso Educativo', value: indicators.educationAccess, suffix: '%' },
    { label: 'Acceso Sanitario', value: indicators.healthcareAccess, suffix: '%' },
    { label: 'Desigualdad (Gini)', value: indicators.economicInequality, suffix: '%', inverse: true },
    { label: 'Atracción Migratoria', value: indicators.migrationPull, suffix: '%' },
  ];

  const mitigationChecks = [
    {
      label: 'Depósito General operativo (protección de reservas)',
      active: isBuildingOperational(state, 'general_depot'),
    },
    {
      label: 'Hospital operativo (freno a brotes epidémicos)',
      active: isBuildingOperational(state, 'infirmary'),
    },
    {
      label: 'Botica operativa (remedios contra infecciones)',
      active: isBuildingOperational(state, 'apothecary'),
    },
    {
      label: 'Panadería operativa (raciones duraderas)',
      active: isBuildingOperational(state, 'bakery'),
    },
    {
      label: 'Diversificación agrícola (≥2 tipos de cultivos)',
      active: new Set(state.farms.map((f) => f.cropName)).size >= 2,
    },
    {
      label: 'Drenaje vial (≥6 caminos de piedra o reforzados)',
      active: state.roads.filter((r) => r.roadType === 'stone' || r.roadType === 'reinforced').length >= 6,
    },
    {
      label: 'Acequias de riego fluvial descubiertas',
      active: discoveredIds.has('riego_fluvial'),
    },
  ];

  const effectiveHistory =
    societyHistory.length > 0
      ? societyHistory
      : [
          {
            day: state.day,
            qualityOfLife: indicators.qualityOfLife,
            happiness: indicators.happiness,
            security: indicators.security,
            governmentTrust: indicators.governmentTrust,
            population: state.agents.length,
          },
        ];

  const w = 520;
  const h = 130;
  const qolPath = buildTrendPath(effectiveHistory.map((p) => p.qualityOfLife), w, h);
  const trustPath = buildTrendPath(effectiveHistory.map((p) => p.governmentTrust), w, h);
  const secPath = buildTrendPath(effectiveHistory.map((p) => p.security), w, h);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="civilization-modal-title"
      data-testid="civilization-modal"
    >
      <div className="bg-[#111827] border border-slate-700 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col p-5 gap-4 shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 id="civilization-modal-title" className="text-base font-bold text-slate-50">
                Civilización, Cultura y Diplomacia
              </h2>
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/60 text-[11px] font-medium text-emerald-300">
                {ERA_METADATA[state.era].label} · {culture.identityTag}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Indicadores sociales, tradiciones costeadas con recursos reales, descubrimientos por oficio, relaciones exteriores y memoria histórica.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            data-testid="close-civilization-btn"
            className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 whitespace-nowrap"
          >
            Cerrar
          </button>
        </div>

        <div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 bg-[#0b1120] border border-slate-800 rounded-lg p-1.5 shrink-0"
          role="tablist"
          aria-label="Secciones de civilización"
        >
          {(
            [
              { id: 'society', label: `Sociedad (${indicators.qualityOfLife}%)`, testId: 'civ-tab-society' },
              { id: 'culture', label: `Cultura (${culture.traditions.length})`, testId: 'civ-tab-culture' },
              {
                id: 'discoveries',
                label: `Saber (${discoveries.length}/${DISCOVERY_CATALOG.length})`,
                testId: 'civ-tab-discoveries',
              },
              { id: 'diplomacy', label: `Diplomacia (${communities.length})`, testId: 'civ-tab-diplomacy' },
              {
                id: 'crises',
                label: `Crisis (${crisisMonitor.activeCrises.length})`,
                testId: 'civ-tab-crises',
              },
              { id: 'history', label: `Crónica y Bio (${biographies.length})`, testId: 'civ-tab-history' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={activeTab === t.id}
              data-testid={t.testId}
              onClick={() => setActiveTab(t.id)}
              className={`py-2 px-2 rounded-md text-xs font-semibold transition-colors truncate ${
                activeTab === t.id
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 pr-1 flex flex-col gap-4">
          {activeTab === 'society' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {metricCards.map((m) => {
                  const good = m.inverse ? m.value <= 35 : m.value >= 65;
                  const mid = m.inverse ? m.value <= 55 : m.value >= 42;
                  const tone = good ? 'text-emerald-400' : mid ? 'text-amber-300' : 'text-rose-400';
                  const barTone = good ? 'bg-emerald-500' : mid ? 'bg-amber-400' : 'bg-rose-500';
                  return (
                    <div key={m.label} className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-300">{m.label}</span>
                        <strong className={`font-mono tabular-nums ${tone}`}>
                          {Math.round(m.value)}
                          {m.suffix ?? ''}
                        </strong>
                      </div>
                      <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div className={`h-full ${barTone}`} style={{ width: `${Math.min(100, Math.max(0, m.value))}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3.5 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-300">
                  <span className="text-emerald-400">● Calidad de Vida</span>
                  <span className="text-sky-400">● Confianza</span>
                  <span className="text-amber-300">● Seguridad</span>
                  <span className="ml-auto font-mono text-slate-400">
                    {societyHistory.length > 0
                      ? `${societyHistory.length} día(s) registrados`
                      : `Día ${state.day} (base inicial)`}
                  </span>
                </div>
                <svg
                  viewBox={`0 0 ${w} ${h}`}
                  className="w-full h-36 overflow-visible"
                  role="img"
                  aria-label="Evolución de calidad de vida, confianza y seguridad"
                >
                  <line x1="28" y1="8" x2={w - 10} y2="8" stroke="#1e293b" strokeDasharray="3 4" />
                  <line x1="28" y1={h / 2} x2={w - 10} y2={h / 2} stroke="#1e293b" strokeDasharray="4 4" />
                  <line x1="28" y1={h - 8} x2={w - 10} y2={h - 8} stroke="#334155" />
                  <text x="2" y="12" fill="#64748b" fontSize="9" fontFamily="monospace">100%</text>
                  <text x="6" y={h / 2 + 3} fill="#64748b" fontSize="9" fontFamily="monospace">50%</text>
                  <text x="10" y={h - 6} fill="#64748b" fontSize="9" fontFamily="monospace">0%</text>
                  {qolPath && <path d={qolPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />}
                  {trustPath && <path d={trustPath} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />}
                  {secPath && <path d={secPath} fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" />}
                </svg>
                {societyHistory.length < 2 && (
                  <div className="text-[11px] text-slate-400">
                    Mostrando estado actual; la tendencia histórica multi-día se registra al cierre de cada jornada.
                  </div>
                )}
              </div>

              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3.5 flex flex-col gap-2">
                <div className="text-xs font-semibold text-slate-200">
                  Distritos Espaciales Emergentes ({districts.length})
                </div>
                {districts.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Aún no hay concentraciones urbanas suficientes; al crecer viviendas, cultivos y talleres se formarán distritos en el mapa.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {districts.map((d) => (
                      <div key={d.id} className="bg-[#111827] border border-slate-800 rounded-lg px-3 py-2 text-xs flex items-center justify-between">
                        <span className="text-slate-100 font-medium">{d.label}</span>
                        <span className="font-mono text-emerald-300">{d.buildingCount} obras</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'culture' && (
            <>
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-400">Identidad Cultural de la Aldea</div>
                  <div className="text-sm font-bold text-fuchsia-300">{culture.identityTag}</div>
                </div>
                <button
                  type="button"
                  disabled={isObserver}
                  onClick={onDivineSparkFestival}
                  data-testid="civ-spark-festival-btn"
                  className="px-3 py-2 rounded-lg bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                >
                  Impulsar Festival (Divino)
                </button>
              </div>

              {culture.activeFestival && (
                <div
                  className="bg-emerald-950/40 border border-emerald-600/70 rounded-lg p-3.5 text-xs flex flex-wrap items-center justify-between gap-2"
                  data-testid="active-festival-banner"
                >
                  <div>
                    <strong className="text-emerald-200 text-sm">{culture.activeFestival.name}</strong>
                    <div className="text-emerald-300/90 mt-0.5">
                      Asistencia: {culture.activeFestival.attendanceCount} aldeanos · Gasto real: {culture.activeFestival.foodSpent} comida y {culture.activeFestival.coinsSpent} monedas
                    </div>
                  </div>
                  <span className="font-mono text-emerald-200 font-semibold">
                    Quedan {culture.activeFestival.daysRemaining} día(s)
                  </span>
                </div>
              )}

              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-slate-300">
                  Tradiciones y Costumbres ({culture.traditions.length})
                </h3>
                {culture.traditions.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-[#0b1120] border border-slate-800 rounded-lg p-3">
                    Todavía no surgieron tradiciones propias; nacerán tras cosechas, aniversarios, grandes obras o figuras históricas.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {culture.traditions.map((tr) => (
                      <div key={tr.id} className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 text-xs flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-slate-100">{tr.name}</strong>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                              tr.status === 'active'
                                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                                : 'bg-slate-800 border-slate-700 text-slate-400'
                            }`}
                          >
                            {tr.status === 'active' ? 'Vigente' : 'En desuso'}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-snug">{tr.description}</p>
                        <div className="text-[11px] text-slate-400 font-mono">
                          Origen: {getOriginLabel(tr.origin)} · Gen. {tr.generationBorn} · Cada {tr.intervalDays}d · {tr.celebrationsCount} celebración(es)
                        </div>
                        <div className="text-[11px] text-amber-300 font-mono">
                          Costo: {tr.foodCost} comida · {tr.coinCost}m · +{tr.happinessBonus} ánimo · +{tr.tradeBonus}% comercio
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-slate-300">
                  Creencias y Valores Emergentes ({culture.beliefs.length})
                </h3>
                {culture.beliefs.length === 0 ? (
                  <p className="text-xs text-slate-400 bg-[#0b1120] border border-slate-800 rounded-lg p-3">
                    Sin creencias populares formadas aún; pueden emerger ante eventos naturales o respeto por los mayores.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {culture.beliefs.map((b) => (
                      <div key={b.id} className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 text-xs flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <strong className="text-violet-200">{b.name}</strong>
                          <span className="font-mono text-sky-300">{b.adoptionPct}% adopción</span>
                        </div>
                        <p className="text-slate-300">{b.description}</p>
                        <span className="text-[11px] text-slate-400">Origen: {b.originEvent} (Día {b.foundedDay})</span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          {activeTab === 'discoveries' && (
            <>
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-300">
                  Descubrimientos logrados:{' '}
                  <strong className="text-emerald-400 font-mono">
                    {discoveries.length}/{DISCOVERY_CATALOG.length}
                  </strong>{' '}
                  · Saber colectivo actual: <strong className="text-sky-300 font-mono">{Math.round(state.knowledge)}</strong>
                </div>
                <button
                  type="button"
                  disabled={isObserver}
                  onClick={onDivineAccelerateDiscovery}
                  data-testid="civ-accelerate-discovery-btn"
                  className="px-3 py-2 rounded-lg bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white text-xs font-semibold transition-colors"
                >
                  Acelerar Descubrimiento (Divino)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {DISCOVERY_CATALOG.map((bp) => {
                  const rec = discoveries.find((d) => d.id === bp.id);
                  return (
                    <div
                      key={bp.id}
                      className={`rounded-lg border p-3 text-xs flex flex-col gap-1.5 ${
                        rec
                          ? 'bg-emerald-950/25 border-emerald-700/60'
                          : 'bg-[#0b1120] border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <strong className={rec ? 'text-emerald-200' : 'text-slate-200'}>
                          {rec ? '✓ ' : '○ '}
                          {bp.name}
                        </strong>
                        <span className="font-mono text-[11px] text-slate-400">
                          {ERA_METADATA[bp.era].label}
                        </span>
                      </div>
                      <p className="text-slate-300 leading-snug">{bp.description}</p>
                      {rec ? (
                        <>
                          <div className="text-[11px] text-emerald-300">
                            Autor: {rec.authorName} ({rec.authorJob}) · Día {rec.discoveredDay}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-mono">
                            <span className="text-sky-300">Difusión: {rec.diffusionPct}%</span>
                            <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                              <div className="h-full bg-sky-400" style={{ width: `${rec.diffusionPct}%` }} />
                            </div>
                          </div>
                          <div className="text-[11px] text-slate-300">Beneficio: {rec.benefitsSummary}</div>
                          <div className="text-[11px] text-amber-300/90">Contrapartida: {rec.costTradeoffSummary}</div>
                        </>
                      ) : (
                        <>
                          <div className="text-[11px] text-slate-400">Requisitos: {bp.requirementsSummary}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            Saber aldea ≥ {bp.requiresVillageKnowledge} · Beneficio: {bp.benefitsSummary}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'diplomacy' && (
            <>
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs flex flex-col gap-1 max-w-2xl">
                  <div className="font-semibold text-sky-300">Consejo Diplomático y Comercio Exterior (sin conflictos armados)</div>
                  <div className="text-slate-200">
                    {diplomacyAdvice
                      ? diplomacyAdvice
                      : proposal
                        ? `Sugerencia automática con ${proposal.communityName}: ${proposal.recommendedKind === 'import' ? 'Importar' : proposal.recommendedKind === 'export' ? 'Exportar' : 'Intercambiar saber'} (${TRADE_GOOD_LABELS[proposal.good]}). ${proposal.rationale}`
                        : 'Aún no hay asentamientos vecinos disponibles para intercambio.'}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isDiplomacyAdvisorBusy}
                  onClick={onRequestDiplomacyAdvice}
                  className="px-3 py-2 rounded-lg bg-sky-700 hover:bg-sky-600 disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap"
                >
                  {isDiplomacyAdvisorBusy ? 'Consultando IA...' : 'Consultar consejo diplomático'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {communities.map((comm) => {
                  const chosenGood = selectedGoodByComm[comm.id] ?? 'food';
                  const relStyle = RELATION_STYLES[comm.relation];
                  return (
                    <div
                      key={comm.id}
                      data-testid={`community-card-${comm.id}`}
                      className="bg-[#0b1120] border border-slate-800 rounded-lg p-3.5 text-xs flex flex-col gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <strong className="text-sm text-slate-100">{comm.name}</strong>
                          <div className="text-[11px] text-slate-400">
                            {ERA_METADATA[comm.era].label} · {comm.direction} ({comm.distanceKm} km) · ~{comm.populationApprox} hab.
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${relStyle.cls}`}>
                          {relStyle.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] font-mono">
                        <span className="text-slate-300">Confianza {comm.trust}%</span>
                        <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${comm.trust}%` }} />
                        </div>
                        <span className="text-amber-300">{comm.coinReserve}m</span>
                      </div>

                      <div className="text-[11px] text-slate-300 font-mono">
                        Ofrece:{' '}
                        {Object.entries(comm.resources)
                          .filter(([, v]) => (v ?? 0) > 0)
                          .map(([k, v]) => `${TRADE_GOOD_LABELS[k as TradeGoodKey] ?? k} ${v}`)
                          .join(' · ') || 'Limitado'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Demanda: {comm.needs.map((n) => TRADE_GOOD_LABELS[n]).join(', ')}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
                        <select
                          aria-label={`Bien comercial para ${comm.name}`}
                          value={chosenGood}
                          onChange={(e) =>
                            setSelectedGoodByComm((prev) => ({
                              ...prev,
                              [comm.id]: e.target.value as TradeGoodKey,
                            }))
                          }
                          className="bg-[#111827] border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-100"
                        >
                          {TRADE_GOODS.map((g) => (
                            <option key={g} value={g}>
                              {TRADE_GOOD_LABELS[g]}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => onExternalTrade(comm.id, 'import', chosenGood, 4)}
                          data-testid={`trade-import-${comm.id}`}
                          className="px-2.5 py-1.5 rounded-md bg-sky-800 hover:bg-sky-700 text-white font-semibold"
                        >
                          Importar 4
                        </button>
                        <button
                          type="button"
                          onClick={() => onExternalTrade(comm.id, 'export', chosenGood, 4)}
                          data-testid={`trade-export-${comm.id}`}
                          className="px-2.5 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-semibold"
                        >
                          Exportar 4
                        </button>
                        <button
                          type="button"
                          onClick={() => onExternalTrade(comm.id, 'knowledge', chosenGood, 10)}
                          data-testid={`trade-knowledge-${comm.id}`}
                          className="px-2.5 py-1.5 rounded-md bg-violet-800 hover:bg-violet-700 text-white font-semibold"
                        >
                          Saber
                        </button>
                      </div>

                      {!isObserver && (
                        <div className="flex items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
                          <span>Ajuste divino relación:</span>
                          <div className="flex gap-1">
                            {(['neutrales', 'comerciales', 'aliados'] as const).map((rel) => (
                              <button
                                key={rel}
                                type="button"
                                onClick={() => onDivineModifyDiplomacy(comm.id, rel)}
                                className={`px-2 py-0.5 rounded border ${
                                  comm.relation === rel
                                    ? 'border-violet-500 bg-violet-950/60 text-violet-200'
                                    : 'border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-600'
                                }`}
                              >
                                {RELATION_STYLES[rel].label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3.5 flex flex-col gap-2">
                <div className="text-xs font-semibold text-slate-200">
                  Historial de Intercambios Exteriores ({tradeHistory.length})
                </div>
                {tradeHistory.length === 0 ? (
                  <p className="text-xs text-slate-400">Sin operaciones exteriores registradas todavía.</p>
                ) : (
                  <ul className="max-h-40 overflow-y-auto flex flex-col divide-y divide-slate-800/80 text-xs">
                    {tradeHistory.slice(0, 15).map((item) => (
                      <li key={item.id} className="py-1.5 flex items-center justify-between gap-2">
                        <span className="text-slate-200">
                          <strong className="font-mono text-sky-300 mr-2">D{item.day}</strong>
                          {item.summary}
                        </span>
                        <span className={`font-mono ${item.coinsDelta >= 0 ? 'text-emerald-400' : 'text-amber-300'}`}>
                          {item.coinsDelta > 0 ? `+${item.coinsDelta}m` : item.coinsDelta < 0 ? `${item.coinsDelta}m` : 'Saber'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          {activeTab === 'crises' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3">
                  <div className="text-slate-400">Reservas Alimentarias</div>
                  <div
                    className={`text-base font-bold font-mono ${
                      crisisMonitor.foodReserveDays >= 2 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {crisisMonitor.foodReserveDays} días/hab
                  </div>
                </div>
                <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3">
                  <div className="text-slate-400">Racha de Sequía</div>
                  <div className="text-base font-bold font-mono text-amber-300">
                    {crisisMonitor.droughtStreakDays} día(s)
                  </div>
                </div>
                <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3">
                  <div className="text-slate-400">Alerta Escasez</div>
                  <div className={`text-base font-bold ${crisisMonitor.scarcityAlert ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {crisisMonitor.scarcityAlert ? 'ACTIVA' : 'Estable'}
                  </div>
                </div>
                <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3">
                  <div className="text-slate-400">Alerta Epidémica</div>
                  <div className={`text-base font-bold ${crisisMonitor.epidemicAlert ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {crisisMonitor.epidemicAlert ? 'ACTIVA' : 'Controlada'}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 bg-[#0b1120] border border-slate-800 rounded-lg p-3">
                <span className="text-xs text-slate-300">
                  Las crisis se encadenan por clima y escasez, y se mitigan con infraestructura y tecnología real.
                </span>
                <button
                  type="button"
                  disabled={isObserver}
                  onClick={onDivineMitigateCrises}
                  data-testid="civ-mitigate-crises-btn"
                  className="px-3 py-2 rounded-lg bg-violet-700 hover:bg-violet-600 disabled:opacity-40 text-white text-xs font-semibold whitespace-nowrap"
                >
                  Disipar Crisis (Divino)
                </button>
              </div>

              {crisisMonitor.activeCrises.length === 0 ? (
                <div className="bg-emerald-950/25 border border-emerald-700/50 rounded-lg p-4 text-xs text-emerald-200">
                  Sin crisis sistémicas activas en este momento.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {crisisMonitor.activeCrises.map((c) => (
                    <div key={c.id} className="bg-rose-950/30 border border-rose-700/60 rounded-lg p-3.5 text-xs flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <strong className="text-rose-200 text-sm">{c.title}</strong>
                        <span className="font-mono text-rose-300">
                          Severidad {c.severity}% · Mitigación {c.mitigationScore}% · {c.daysActive}d
                        </span>
                      </div>
                      <div className="text-slate-200">Cadena causal: {c.causeChain}</div>
                      <div className="text-emerald-300">
                        Mitigado por: {c.mitigatedBy.length > 0 ? c.mitigatedBy.join(', ') : 'Sin defensas activas aún'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3.5 flex flex-col gap-2">
                <div className="text-xs font-semibold text-slate-200">Defensas e Infraestructura de Resiliencia</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                  {mitigationChecks.map((chk) => (
                    <div
                      key={chk.label}
                      className={`px-2.5 py-1.5 rounded border ${
                        chk.active
                          ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-200'
                          : 'bg-[#111827] border-slate-800 text-slate-400'
                      }`}
                    >
                      {chk.active ? '✓ ' : '○ '}
                      {chk.label}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <>
              <section className="bg-[#0b1120] border border-slate-800 rounded-lg p-3.5 flex flex-col gap-2">
                <div className="text-xs font-semibold text-sky-300">
                  Década en Curso (Década {liveDecade.decadeNumber} · Años {liveDecade.startYear}–{liveDecade.endYear})
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">{liveDecade.summaryText}</p>
                {decadeSummaries.length > 0 && (
                  <div className="pt-2 border-t border-slate-800 flex flex-col gap-1.5">
                    <div className="text-[11px] font-semibold text-slate-400">Décadas Completadas</div>
                    {decadeSummaries.map((ds) => (
                      <div key={ds.decadeNumber} className="text-xs text-slate-300 bg-[#111827] border border-slate-800 rounded p-2">
                        {ds.summaryText}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="bg-[#0b1120] border border-slate-800 rounded-lg p-3.5 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-slate-200">
                    Biografías Históricas ({filteredBios.length}/{biographies.length})
                  </h3>
                  <input
                    type="search"
                    value={bioSearch}
                    onChange={(e) => setBioSearch(e.target.value)}
                    placeholder="Buscar por nombre u oficio..."
                    aria-label="Buscar biografías"
                    className="bg-[#111827] border border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-100 w-56"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {filteredBios.slice(0, 30).map((b) => (
                    <div key={b.agentId} className="bg-[#111827] border border-slate-800 rounded-lg p-2.5 text-xs flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <strong className="text-slate-100 truncate">{b.name}</strong>
                          {b.isHistoricalFigure && (
                            <span className="px-1.5 py-0.5 rounded bg-violet-950/70 border border-violet-600/60 text-[10px] text-violet-200">
                              Figura
                            </span>
                          )}
                        </div>
                        <span className={`text-[11px] font-mono ${b.alive ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {b.alive ? 'Vivo' : `D${b.birthDay}–D${b.deathDay ?? '?'}`}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300">
                        Gen. {b.generation} · {b.primaryJob} · {b.childrenCount} hijos
                      </div>
                      {b.notableDeeds.length > 0 && (
                        <div className="text-[11px] text-slate-400 leading-snug">
                          {b.notableDeeds.slice(0, 2).join(' · ')}
                        </div>
                      )}
                      {b.alive && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectAgent(b.agentId);
                            onClose();
                          }}
                          className="self-start text-[11px] text-sky-400 hover:text-sky-300 underline"
                        >
                          Inspeccionar en mapa
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-[#0b1120] border border-slate-800 rounded-lg p-3.5 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-slate-200">
                    Archivo Cronológico Categorizado ({filteredChronicle.length})
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {CHRONICLE_FILTERS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setChronicleFilter(f.id)}
                        className={`px-2 py-0.5 rounded text-[11px] border ${
                          chronicleFilter === f.id
                            ? 'border-sky-500 bg-sky-950/60 text-sky-200'
                            : 'border-slate-800 bg-[#111827] text-slate-300'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <ul className="max-h-48 overflow-y-auto divide-y divide-slate-800/70 text-xs pr-1">
                  {filteredChronicle.length === 0 ? (
                    <li className="py-2 text-slate-400 italic">Sin registros en esta categoría.</li>
                  ) : (
                    filteredChronicle.slice(0, 40).map((entry) => (
                      <li key={entry.id} className="py-1.5 flex gap-2">
                        <span className="font-mono text-[11px] text-sky-300 shrink-0">
                          A{entry.year}·D{entry.day}
                        </span>
                        <span className="text-slate-200">{entry.text}</span>
                      </li>
                    ))
                  )}
                </ul>
                {state.perfStats && (
                  <div className="pt-2 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex flex-wrap gap-3">
                    <span>Motor LOD: {state.perfStats.lodTier}</span>
                    <span>Tick medio: {state.perfStats.avgTickMs} ms</span>
                    <span>Ciclo diario: {state.perfStats.dailyAggregateMs} ms</span>
                    <span>Eventos bus: {state.perfStats.eventsProcessed}</span>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

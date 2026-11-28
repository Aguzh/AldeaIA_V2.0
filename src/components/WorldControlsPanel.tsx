import { useState } from 'react';
import { formatResourceCost, getRoadTileCost } from '../simulation/rules';
import type {
  AnimalType,
  BiomeType,
  ConstructionSpeedMode,
  DivineMultipliers,
  DivineTool,
  EconomyReserve,
  InterventionMode,
  MarketPrices,
  RepresentativeGoals,
  ResourceOperationRecord,
  RoadType,
  SeasonType,
  VillageLaw,
  VillageLawId,
  VillagePolitics,
  WeatherType,
} from '../types/simulation';

interface WorldControlsPanelProps {
  biome: BiomeType;
  weather: WeatherType;
  season: SeasonType;
  tool: DivineTool;
  selectedRoadType: RoadType;
  selectedRoadLamp: boolean;
  resourcesPaused: boolean;
  farmsCount: number;
  roadsCount: number;
  animalsCount: number;
  firesCount: number;
  loansCount: number;
  activeConstructionsCount: number;
  riverFishStock: number;
  riverFishMaxStock: number;
  riverFishRestTimer: number;
  economyReserve: EconomyReserve;
  operationalBuildingsCount: number;
  totalSpecialBuildingsCount: number;
  laws: VillageLaw[];
  representativeName: string | null;
  representativeGoals?: RepresentativeGoals;
  petitionTimerSec: number;
  qwenAutoRespondPetitions: boolean;
  collectiveHint: string;
  resourceLedger: ResourceOperationRecord[];
  interventionMode: InterventionMode;
  divineMultipliers: DivineMultipliers;
  marketPrices: MarketPrices;
  politics: VillagePolitics;
  ecosystemHealth: number;
  activeDisaster?: {
    kind: 'frost' | 'flood' | 'blight' | 'abundance';
    daysRemaining: number;
    description: string;
  } | null;
  onChangeBiome: (biome: BiomeType) => void;
  onChangeWeather: (weather: WeatherType) => void;
  onSelectTool: (tool: DivineTool) => void;
  onSelectRoadType: (roadType: RoadType) => void;
  onToggleRoadLamp: () => void;
  onToggleResourcesPaused: () => void;
  onBuildBaseRoads: () => void;
  onKillAllCrops: () => void;
  onSpawnAnimal: (animalType: AnimalType) => void;
  onToggleLaw: (lawId: VillageLawId) => void;
  onSummonPetition: () => void;
  onToggleQwenAutoRespond: () => void;
  onTriggerLightningStorm: () => void;
  onGrantRequest: () => void;
  onTrialAbundance: () => void;
  onTrialScarcity: () => void;
  onTrialPlague: () => void;
  onSetInterventionMode: (mode: InterventionMode) => void;
  onUpdateMultipliers: (patch: Partial<DivineMultipliers>) => void;
  onDivineSpawnVillagers: (count: number) => void;
  onDivineRepairAll: () => void;
  onDivineCompleteConstructions: () => void;
  onDivineTriggerEvent: (kind: 'frost' | 'flood' | 'blight' | 'abundance') => void;
  onDivineAdjustTax: (taxPct: number) => void;
  onDivineForceSeason: (season: SeasonType) => void;
  onDivineGrantKnowledge: (delta: number) => void;
  qualityOfLife?: number;
  activeCrisesCount?: number;
  onDivineAccelerateDiscovery?: () => void;
  onDivineSparkFestival?: () => void;
  onDivineMitigateCrises?: () => void;
  onDivineAdjustSociety?: (target: 'happiness' | 'trust' | 'security', delta: number) => void;
  onDivineAidTopFamily?: () => void;
}

type WorldTab = 'env' | 'map' | 'laws' | 'divine' | 'audit';

const TOOLS: Array<{ id: DivineTool; label: string }> = [
  { id: 'inspect', label: 'Inspeccionar' },
  { id: 'add_road', label: '+ Camino' },
  { id: 'food', label: '+ Comida' },
  { id: 'wood', label: '+ Madera' },
  { id: 'pine_wood', label: '+ Pino' },
  { id: 'maple_wood', label: '+ Arce' },
  { id: 'oak_wood', label: '+ Roble' },
  { id: 'stone', label: '+ Piedra' },
  { id: 'copper', label: '+ Cobre' },
  { id: 'iron', label: '+ Hierro' },
  { id: 'silver', label: '+ Plata 🥈' },
  { id: 'gold', label: '+ Oro 🥇' },
  { id: 'coins', label: '+ Monedas' },
  { id: 'knowledge', label: '+ Saber' },
  { id: 'kill_crop', label: 'Matar cultivo' },
  { id: 'lightning_storm', label: '⚡ Rayo' },
  { id: 'start_fire', label: '🔥 Fuego' },
  { id: 'heal', label: 'Curar clic' },
  { id: 'infect', label: 'Enfermar' },
  { id: 'sterilize', label: 'Impotente' },
  { id: 'kill', label: 'Matar clic' },
];

const ANIMAL_BUTTONS: Array<{ id: AnimalType; label: string }> = [
  { id: 'dog', label: '+ Perro' },
  { id: 'cat', label: '+ Gato' },
  { id: 'chicken', label: '+ Gallina' },
  { id: 'cow', label: '+ Vaca' },
  { id: 'horse', label: '+ Caballo' },
  { id: 'sheep', label: '+ Oveja' },
  { id: 'fish', label: '+ Peces' },
  { id: 'wildcat', label: '+ Gato salv.' },
  { id: 'bear', label: '+ Oso' },
];

function formatCountdown(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function MinToggle({
  open,
  onClick,
  label,
  testId,
}: {
  open: boolean;
  onClick: () => void;
  label: string;
  testId: string;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-label={open ? `Minimizar ${label}` : `Expandir ${label}`}
      data-testid={testId}
      onClick={onClick}
      className="w-7 h-7 rounded-lg bg-[#0b1120] border border-slate-700 hover:border-slate-500 text-slate-200 text-[16px] font-mono flex items-center justify-center transition-colors shrink-0"
    >
      {open ? '−' : '+'}
    </button>
  );
}

export function WorldControlsPanel({
  biome,
  weather,
  season,
  tool,
  selectedRoadType,
  selectedRoadLamp,
  resourcesPaused,
  farmsCount,
  roadsCount,
  animalsCount,
  firesCount,
  loansCount,
  activeConstructionsCount,
  riverFishStock,
  riverFishMaxStock,
  riverFishRestTimer,
  economyReserve,
  operationalBuildingsCount,
  totalSpecialBuildingsCount,
  laws,
  representativeName,
  petitionTimerSec,
  qwenAutoRespondPetitions,
  collectiveHint,
  resourceLedger,
  interventionMode,
  divineMultipliers,
  marketPrices,
  politics,
  ecosystemHealth,
  activeDisaster,
  onChangeBiome,
  onChangeWeather,
  onSelectTool,
  onSelectRoadType,
  onToggleRoadLamp,
  onToggleResourcesPaused,
  onBuildBaseRoads,
  onKillAllCrops,
  onSpawnAnimal,
  onToggleLaw,
  onSummonPetition,
  onToggleQwenAutoRespond,
  onTriggerLightningStorm,
  onGrantRequest,
  onTrialAbundance,
  onTrialScarcity,
  onTrialPlague,
  onSetInterventionMode,
  onUpdateMultipliers,
  onDivineSpawnVillagers,
  onDivineRepairAll,
  onDivineCompleteConstructions,
  onDivineTriggerEvent,
  onDivineAdjustTax,
  onDivineForceSeason,
  onDivineGrantKnowledge,
  qualityOfLife = 70,
  activeCrisesCount = 0,
  onDivineAccelerateDiscovery,
  onDivineSparkFestival,
  onDivineMitigateCrises,
  onDivineAdjustSociety,
  onDivineAidTopFamily,
}: WorldControlsPanelProps) {
  const [activeTab, setActiveTab] = useState<WorldTab>('env');
  const [openEnv, setOpenEnv] = useState(true);
  const [openTools, setOpenTools] = useState(true);
  const [openLaws, setOpenLaws] = useState(true);
  const [openEvents, setOpenEvents] = useState(true);
  const [openLedger, setOpenLedger] = useState(true);

  const activeLawsCount = laws.filter((l) => l.active).length;
  const currentRoadUnitCost = formatResourceCost(getRoadTileCost(selectedRoadType, selectedRoadLamp));
  const recentLedger = [...resourceLedger].slice(-18).reverse();
  const isObserver = interventionMode === 'observer';

  return (
    <div className="flex flex-col gap-3 min-h-0">
      <div
        className="bg-[#111827] border border-slate-800 rounded-xl p-1.5 grid grid-cols-2 gap-1.5 shrink-0"
        role="tablist"
        aria-label="Secciones de control del mundo"
      >
        {(
          [
            { id: 'env', label: 'Entorno', testId: 'tab-world-env' },
            { id: 'map', label: 'Mapa', testId: 'tab-world-map' },
            { id: 'laws', label: `Leyes (${activeLawsCount})`, testId: 'tab-world-laws' },
            { id: 'divine', label: 'Divino', testId: 'tab-world-divine' },
            { id: 'audit', label: 'Auditoría', testId: 'tab-world-audit' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            data-testid={tab.testId}
            onClick={() => setActiveTab(tab.id)}
            className={`py-2 px-2.5 rounded-lg text-[13px] font-semibold transition-colors ${
              tab.id === 'audit' ? 'col-span-2' : ''
            } ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 bg-[#0b1120] hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'env' && (
        <section className="bg-[#111827] border border-slate-800 rounded-xl p-3.5" data-testid="env-panel">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-[16px] leading-snug font-bold tracking-wide text-slate-100">
              Fondo Metálico y Entorno
            </h2>
            <MinToggle
              open={openEnv}
              onClick={() => setOpenEnv((v) => !v)}
              label="Fondo Metálico y Entorno"
              testId="toggle-env-panel"
            />
          </div>

          {openEnv && (
            <div className="mt-3 flex flex-col gap-3">
              <div
                className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 text-[13px] flex flex-col gap-2 font-mono tabular-nums"
                data-testid="economy-reserve-box"
              >
                <div className="flex justify-between gap-2 text-slate-200">
                  <span>Banco</span>
                  <span className="text-amber-300 font-semibold">
                    {economyReserve.mintedCoins}/{economyReserve.backedCoinsCapacity}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span>Oro / Plata</span>
                  <span>
                    🥇{economyReserve.goldReserve} · 🥈{economyReserve.silverReserve}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span>Préstamos ({loansCount})</span>
                  <span>
                    {economyReserve.bankLoanPool}m · {economyReserve.taxRatePct}%
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span>Peces en río</span>
                  <span className="text-sky-300 font-semibold" data-testid="river-fish-stock">
                    {riverFishStock}/{riverFishMaxStock}
                    {riverFishStock === 0 && riverFishRestTimer > 0 ? ` (${Math.ceil(riverFishRestTimer)}d)` : ''}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span>Edificios</span>
                  <span
                    className={
                      operationalBuildingsCount < totalSpecialBuildingsCount
                        ? 'text-amber-300 font-semibold'
                        : 'text-emerald-400 font-semibold'
                    }
                  >
                    {operationalBuildingsCount}/{totalSpecialBuildingsCount}
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span>Ecosistema</span>
                  <span
                    data-testid="ecosystem-health-value"
                    className={`font-semibold ${
                      ecosystemHealth >= 65
                        ? 'text-emerald-400'
                        : ecosystemHealth >= 40
                          ? 'text-amber-300'
                          : 'text-rose-400'
                    }`}
                  >
                    {Math.round(ecosystemHealth)}%
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-slate-300">
                  <span>Calidad de Vida / Crisis</span>
                  <span className="font-semibold" data-testid="env-qol-crises">
                    <span className={qualityOfLife >= 60 ? 'text-emerald-400' : 'text-amber-300'}>
                      {Math.round(qualityOfLife)}%
                    </span>
                    {' · '}
                    <span className={activeCrisesCount > 0 ? 'text-rose-400' : 'text-slate-400'}>
                      {activeCrisesCount} crisis
                    </span>
                  </span>
                </div>
                {(firesCount > 0 || activeDisaster) && (
                  <div className="flex items-center justify-between gap-2 text-rose-300 font-semibold pt-2 border-t border-slate-800/70">
                    <span>{activeDisaster ? activeDisaster.description : 'Incendios activos'}</span>
                    <span>{activeDisaster ? `${activeDisaster.daysRemaining}d` : firesCount}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <label className="flex flex-col gap-1.5 text-[14px] text-slate-300 font-medium">
                  <span>Bioma ({season})</span>
                  <select
                    value={biome}
                    onChange={(e) => onChangeBiome(e.target.value as BiomeType)}
                    className="bg-[#0b1120] border border-slate-700 rounded-lg px-3 py-2.5 text-[14px] text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="grassland">Pradera (Primavera)</option>
                    <option value="arid">Árida (Verano)</option>
                    <option value="forest">Bosque (Otoño)</option>
                    <option value="tundra">Tundra (Invierno)</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5 text-[14px] text-slate-300 font-medium">
                  <span>Clima</span>
                  <select
                    value={weather}
                    onChange={(e) => onChangeWeather(e.target.value as WeatherType)}
                    data-testid="weather-select"
                    className="bg-[#0b1120] border border-slate-700 rounded-lg px-3 py-2.5 text-[14px] text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="sunny">Soleado</option>
                    <option value="rain">Lluvia</option>
                    <option value="drought">Sequía</option>
                    <option value="storm">Tormenta</option>
                    <option value="thunderstorm">Tormenta eléctrica</option>
                  </select>
                </label>
              </div>

              <button
                type="button"
                onClick={onToggleResourcesPaused}
                className={`w-full py-2.5 px-3 rounded-lg border text-[14px] font-semibold transition-colors ${
                  resourcesPaused
                    ? 'border-amber-600 bg-amber-950/70 text-amber-200 hover:bg-amber-900/70'
                    : 'border-slate-700 bg-[#0b1120] text-slate-100 hover:border-amber-500/60'
                }`}
              >
                {resourcesPaused ? 'Reanudar entrega de recursos' : 'Pausar entrega de recursos'}
              </button>
            </div>
          )}
        </section>
      )}

      {activeTab === 'map' && (
        <section className="bg-[#111827] border border-slate-800 rounded-xl p-3.5" data-testid="tools-panel">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <h2 className="text-[16px] leading-snug font-bold tracking-wide text-slate-100">
                Herramientas en el Mapa
              </h2>
              <span className="text-[13px] text-slate-400 font-mono tabular-nums">{roadsCount} caminos</span>
            </div>
            <MinToggle
              open={openTools}
              onClick={() => setOpenTools((v) => !v)}
              label="Herramientas en el Mapa"
              testId="toggle-tools-panel"
            />
          </div>

          {openTools && (
            <div className="mt-3 flex flex-col gap-3">
              {isObserver && (
                <div className="bg-sky-950/40 border border-sky-700/60 rounded-lg p-2.5 text-[13px] text-sky-200 flex flex-col gap-2">
                  <span>Modo Observador: solo inspección</span>
                  <button
                    type="button"
                    onClick={() => onSetInterventionMode('intervention')}
                    className="px-3 py-1.5 rounded-md bg-sky-700 hover:bg-sky-600 text-white text-[13px] font-semibold self-start"
                  >
                    Habilitar edición
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-1.5">
                {TOOLS.map((t) => {
                  const disabled = isObserver && t.id !== 'inspect';
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={disabled}
                      data-testid={`tool-${t.id}`}
                      onClick={() => onSelectTool(t.id)}
                      className={`px-2.5 py-2 text-[13px] font-medium rounded-lg border text-left transition-colors leading-tight disabled:opacity-40 ${
                        tool === t.id
                          ? 'border-emerald-500 bg-emerald-950/60 text-emerald-200'
                          : 'border-slate-800 bg-[#0b1120] text-slate-200 hover:border-slate-700 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
                <div className="flex flex-col gap-1 text-[13px]">
                  <span className="font-semibold text-slate-200">Camino por tramo</span>
                  <span className="font-mono text-[12px] text-amber-300 leading-snug" data-testid="road-unit-cost">
                    {currentRoadUnitCost}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'dirt', label: 'Tierra' },
                      { id: 'stone', label: 'Piedra' },
                      { id: 'reinforced', label: 'Reforzado' },
                    ] as const
                  ).map((rt) => (
                    <button
                      key={rt.id}
                      type="button"
                      onClick={() => onSelectRoadType(rt.id)}
                      data-testid={`road-type-${rt.id}`}
                      className={`py-2 px-2 rounded-lg border text-[13px] font-medium transition-colors ${
                        selectedRoadType === rt.id
                          ? 'border-sky-500 bg-sky-950/60 text-sky-200'
                          : 'border-slate-800 bg-[#111827] text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      {rt.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    data-testid="toggle-road-lamp"
                    aria-pressed={selectedRoadLamp}
                    onClick={onToggleRoadLamp}
                    title="Farol (+2 Mad. +1 Cob. +1 Hie.)"
                    className={`py-2 px-2 rounded-lg border text-[13px] font-medium transition-colors ${
                      selectedRoadLamp
                        ? 'border-amber-500/80 bg-amber-950/40 text-amber-200'
                        : 'border-slate-800 bg-[#111827] text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    Farol: {selectedRoadLamp ? 'ON' : 'OFF'}
                  </button>
                </div>
                <button
                  type="button"
                  disabled={isObserver}
                  data-testid="build-base-roads-btn"
                  onClick={onBuildBaseRoads}
                  className="w-full py-2 px-3 rounded-lg bg-[#111827] border border-slate-700 hover:border-sky-500 disabled:opacity-40 text-sky-200 text-[13px] font-medium transition-colors leading-snug"
                >
                  Trazar red principal (gasta materiales)
                </button>
              </div>

              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold text-slate-200">Fauna y Ganado</span>
                  <span className="text-slate-400 font-mono tabular-nums text-[12px]">
                    {animalsCount} activos
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {ANIMAL_BUTTONS.map((ab) => (
                    <button
                      key={ab.id}
                      type="button"
                      disabled={isObserver}
                      onClick={() => onSpawnAnimal(ab.id)}
                      className={`px-2.5 py-2 text-[13px] rounded-lg border text-left transition-colors leading-tight disabled:opacity-40 ${
                        ab.id === 'bear' || ab.id === 'wildcat'
                          ? 'border-rose-900/70 bg-rose-950/40 text-rose-200 hover:border-rose-600'
                          : 'border-slate-800 bg-[#111827] text-slate-200 hover:border-emerald-600'
                      }`}
                    >
                      {ab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
                <p className="text-[13px] text-slate-200 leading-snug">{collectiveHint}</p>
                <button
                  type="button"
                  disabled={resourcesPaused || isObserver}
                  onClick={onGrantRequest}
                  className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-45 text-white text-[13px] font-semibold transition-colors"
                >
                  {isObserver
                    ? 'Bloqueado en Modo Observador'
                    : resourcesPaused
                      ? 'Ayuda bloqueada (pausado)'
                      : 'Conceder ayuda a la aldea'}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'laws' && (
        <section className="bg-[#111827] border border-slate-800 rounded-xl p-3.5" data-testid="laws-panel">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col">
              <h2 className="text-[16px] leading-snug font-bold tracking-wide text-slate-100">
                Leyes, Consejo y Representante
              </h2>
              <span className="text-[13px] text-violet-300 font-mono tabular-nums">
                {activeLawsCount}/7 activas
              </span>
            </div>
            <MinToggle
              open={openLaws}
              onClick={() => setOpenLaws((v) => !v)}
              label="Leyes, Consejo y Representante"
              testId="toggle-laws-panel"
            />
          </div>

          {openLaws && (
            <div className="mt-3 flex flex-col gap-3">
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 text-[13px] flex flex-col gap-2.5">
                <div className="text-slate-300">
                  Rep.:{' '}
                  <strong className="text-violet-300" data-testid="representative-name">
                    {representativeName ?? 'Por elegir'}
                  </strong>
                </div>
                <div className="font-mono tabular-nums text-[12px] text-slate-300">
                  <span className={politics.approvalRating >= 55 ? 'text-emerald-400' : 'text-rose-400'}>
                    Aprob. {Math.round(politics.approvalRating)}%
                  </span>
                  {' · '}Leg. {Math.round(politics.legitimacy)}%{' · '}Prot. {politics.protestsCount}
                </div>
                <div className="flex flex-col gap-2 pt-1 border-t border-slate-800/80">
                  <span className="text-[13px] text-slate-300">
                    Petición (30m):{' '}
                    <span className="font-mono text-slate-100 font-semibold" data-testid="petition-countdown">
                      {formatCountdown(petitionTimerSec)}
                    </span>
                  </span>
                  <button
                    type="button"
                    data-testid="summon-petition-btn"
                    onClick={onSummonPetition}
                    className="w-full py-2 px-3 rounded-lg bg-violet-950/70 border border-violet-700/70 hover:bg-violet-900/70 text-violet-100 text-[13px] font-semibold transition-colors"
                  >
                    Convocar petición
                  </button>
                </div>
                <label
                  className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer select-none transition-colors ${
                    qwenAutoRespondPetitions
                      ? 'bg-violet-950/45 border-violet-500/70 text-violet-100'
                      : 'bg-[#111827] border-slate-800 text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    data-testid="qwen-auto-respond-checkbox"
                    checked={qwenAutoRespondPetitions}
                    onChange={onToggleQwenAutoRespond}
                    className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500 shrink-0"
                  />
                  <span className="text-[13px] font-medium leading-snug">
                    Qwen Responde automático cada 30m
                  </span>
                </label>
              </div>

              <div className="flex flex-col gap-2">
                {laws.map((law) => (
                  <div
                    key={law.id}
                    className={`rounded-lg border p-3 flex flex-col gap-2 ${
                      law.active
                        ? 'bg-violet-950/35 border-violet-600/60 text-slate-100'
                        : 'bg-[#0b1120] border-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold text-[14px] leading-snug">{law.name}</div>
                      <button
                        type="button"
                        data-testid={`law-toggle-${law.id}`}
                        onClick={() => onToggleLaw(law.id)}
                        className={`px-3 py-1 rounded-md text-[12px] font-semibold shrink-0 transition-colors ${
                          law.active
                            ? 'bg-violet-600 hover:bg-violet-500 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                        }`}
                      >
                        {law.active ? 'Activa' : 'Activar'}
                      </button>
                    </div>
                    <div className="text-[13px] text-slate-400 leading-snug">{law.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'divine' && (
        <div className="flex flex-col gap-3">
          <section
            className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3"
            data-testid="intervention-mode-panel"
          >
            <div className="grid grid-cols-1 gap-1.5">
              {(
                [
                  { id: 'observer', label: 'Observador', desc: 'Solo mirar/inspeccionar' },
                  { id: 'intervention', label: 'Intervención', desc: 'Ayudas y eventos' },
                  { id: 'advanced', label: 'Avanzada', desc: 'Edición directa total' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  data-testid={`mode-${m.id}`}
                  onClick={() => onSetInterventionMode(m.id)}
                  title={m.desc}
                  className={`py-2 px-3 rounded-lg border text-[13px] font-semibold transition-colors flex items-center justify-between gap-2 ${
                    interventionMode === m.id
                      ? 'border-violet-500 bg-violet-950/60 text-violet-100'
                      : 'border-slate-800 bg-[#0b1120] text-slate-300 hover:text-white'
                  }`}
                >
                  <span>{m.label}</span>
                  <span className="text-[11px] font-normal opacity-80">{m.desc}</span>
                </button>
              ))}
            </div>

            <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-2.5 text-[13px]">
              {(
                [
                  { key: 'production', label: 'Producción', values: [1, 2, 5, 10] },
                  { key: 'learning', label: 'Aprendizaje', values: [1, 2, 5, 10] },
                  { key: 'fertility', label: 'Natalidad', values: [0.5, 1, 2, 4] },
                  { key: 'aging', label: 'Envejecimiento', values: [0.5, 1, 2, 5] },
                ] as const
              ).map((row) => (
                <div key={row.key} className="flex flex-col gap-1.5">
                  <span className="text-slate-300 font-medium">{row.label}</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {row.values.map((val) => (
                      <button
                        key={val}
                        type="button"
                        disabled={isObserver}
                        onClick={() => onUpdateMultipliers({ [row.key]: val })}
                        className={`py-1.5 rounded-md font-mono text-[12px] border transition-colors disabled:opacity-40 ${
                          divineMultipliers[row.key] === val
                            ? 'border-emerald-500 bg-emerald-950/60 text-emerald-200 font-semibold'
                            : 'border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        x{val}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-800/70">
                <span className="text-slate-300 font-medium">Velocidad de obras</span>
                <div className="grid grid-cols-3 gap-1.5">
                  {(
                    [
                      { id: 'normal', label: 'Normal' },
                      { id: 'accelerated', label: 'x3' },
                      { id: 'instant', label: 'Al instante' },
                    ] as Array<{ id: ConstructionSpeedMode; label: string }>
                  ).map((cm) => (
                    <button
                      key={cm.id}
                      type="button"
                      disabled={isObserver}
                      data-testid={`construction-mode-${cm.id}`}
                      onClick={() => onUpdateMultipliers({ constructionMode: cm.id })}
                      className={`py-1.5 px-1 rounded-md text-[12px] border transition-colors disabled:opacity-40 ${
                        divineMultipliers.constructionMode === cm.id
                          ? 'border-amber-500 bg-amber-950/60 text-amber-200 font-semibold'
                          : 'border-slate-800 bg-[#111827] text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {cm.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[#111827] border border-slate-800 rounded-xl p-3.5" data-testid="events-panel">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[16px] leading-snug font-bold tracking-wide text-slate-100">
                Eventos, Desastres y Edición
              </h2>
              <MinToggle
                open={openEvents}
                onClick={() => setOpenEvents((v) => !v)}
                label="Eventos de Supervivencia"
                testId="toggle-events-panel"
              />
            </div>

            {openEvents && (
              <div className="mt-3 flex flex-col gap-2">
                <div className="grid grid-cols-1 gap-1.5">
                  <button
                    type="button"
                    disabled={resourcesPaused || isObserver}
                    onClick={onTrialAbundance}
                    className="py-2 px-3 rounded-lg bg-[#0b1120] border border-slate-800 hover:border-emerald-600 disabled:opacity-40 text-slate-100 text-[13px] font-medium text-left"
                  >
                    + Lluvia de Oro y Plata
                  </button>
                  <button
                    type="button"
                    disabled={isObserver}
                    onClick={onTrialScarcity}
                    className="py-2 px-3 rounded-lg bg-[#0b1120] border border-slate-800 hover:border-amber-600 disabled:opacity-40 text-slate-100 text-[13px] font-medium text-left"
                  >
                    Sequía y escasez
                  </button>
                  <button
                    type="button"
                    disabled={isObserver}
                    onClick={onTriggerLightningStorm}
                    data-testid="trigger-lightning-btn"
                    className="py-2 px-3 rounded-lg bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/60 disabled:opacity-40 text-amber-200 text-[13px] font-medium text-left"
                  >
                    ⚡ Rayos y Tormenta
                  </button>
                  <button
                    type="button"
                    disabled={isObserver}
                    onClick={onTrialPlague}
                    className="py-2 px-3 rounded-lg bg-[#0b1120] border border-slate-800 hover:border-rose-600 disabled:opacity-40 text-slate-100 text-[13px] font-medium text-left"
                  >
                    Brote de enfermedad
                  </button>
                  <button
                    type="button"
                    disabled={isObserver}
                    onClick={() => onDivineTriggerEvent('frost')}
                    className="py-2 px-3 rounded-lg bg-sky-950/40 border border-sky-800/60 hover:border-sky-500 disabled:opacity-40 text-sky-200 text-[13px] font-medium text-left"
                  >
                    ❄️ Helada extrema
                  </button>
                  <button
                    type="button"
                    disabled={isObserver}
                    onClick={() => onDivineTriggerEvent('flood')}
                    className="py-2 px-3 rounded-lg bg-sky-950/40 border border-sky-800/60 hover:border-sky-500 disabled:opacity-40 text-sky-200 text-[13px] font-medium text-left"
                  >
                    🌊 Inundación
                  </button>
                  <button
                    type="button"
                    disabled={isObserver}
                    onClick={() => onDivineTriggerEvent('blight')}
                    className="py-2 px-3 rounded-lg bg-amber-950/40 border border-amber-800/60 hover:border-amber-500 disabled:opacity-40 text-amber-200 text-[13px] font-medium text-left"
                  >
                    🦠 Plaga agrícola
                  </button>
                  <button
                    type="button"
                    disabled={isObserver}
                    onClick={() => onDivineTriggerEvent('abundance')}
                    className="py-2 px-3 rounded-lg bg-emerald-950/40 border border-emerald-700/60 hover:border-emerald-500 disabled:opacity-40 text-emerald-200 text-[13px] font-medium text-left"
                  >
                    🌾 Gran cosecha
                  </button>
                </div>

                <button
                  type="button"
                  disabled={farmsCount === 0 || isObserver}
                  onClick={onKillAllCrops}
                  className="w-full py-2 px-3 rounded-lg bg-rose-950/60 border border-rose-800/70 hover:bg-rose-900/70 disabled:opacity-40 text-rose-200 text-[13px] font-semibold text-left"
                >
                  Matar todos los cultivos ({farmsCount})
                </button>

                <div className="bg-[#0b1120] border border-violet-800/50 rounded-lg p-3 flex flex-col gap-2">
                  <div className="flex flex-col gap-1 text-[13px]">
                    <span className="font-semibold text-violet-300">Poderes Divinos Avanzados</span>
                    {interventionMode !== 'advanced' && (
                      <button
                        type="button"
                        onClick={() => onSetInterventionMode('advanced')}
                        className="text-[12px] text-violet-300 underline self-start"
                      >
                        Activar Modo Avanzado
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      disabled={interventionMode !== 'advanced'}
                      onClick={() => onDivineSpawnVillagers(1)}
                      data-testid="divine-spawn-1"
                      className="py-2 px-2.5 rounded-lg bg-[#111827] border border-slate-800 hover:border-violet-500 disabled:opacity-40 text-[13px] text-slate-200 text-left"
                    >
                      +1 Aldeano
                    </button>
                    <button
                      type="button"
                      disabled={interventionMode !== 'advanced'}
                      onClick={() => onDivineSpawnVillagers(5)}
                      className="py-2 px-2.5 rounded-lg bg-[#111827] border border-slate-800 hover:border-violet-500 disabled:opacity-40 text-[13px] text-slate-200 text-left"
                    >
                      +5 Aldeanos
                    </button>
                    <button
                      type="button"
                      disabled={interventionMode !== 'advanced'}
                      onClick={onDivineRepairAll}
                      className="py-2 px-2.5 rounded-lg bg-[#111827] border border-slate-800 hover:border-emerald-500 disabled:opacity-40 text-[13px] text-emerald-200 text-left"
                    >
                      Reparar 100%
                    </button>
                    <button
                      type="button"
                      disabled={interventionMode !== 'advanced' || activeConstructionsCount === 0}
                      onClick={onDivineCompleteConstructions}
                      className="py-2 px-2.5 rounded-lg bg-[#111827] border border-slate-800 hover:border-amber-500 disabled:opacity-40 text-[13px] text-amber-200 text-left"
                    >
                      Obras ({activeConstructionsCount})
                    </button>
                    <button
                      type="button"
                      disabled={interventionMode !== 'advanced'}
                      onClick={() => onDivineGrantKnowledge(25)}
                      className="py-2 px-2.5 rounded-lg bg-[#111827] border border-slate-800 hover:border-sky-500 disabled:opacity-40 text-[13px] text-sky-200 text-left"
                    >
                      +25 Saber
                    </button>
                    <button
                      type="button"
                      disabled={interventionMode !== 'advanced'}
                      onClick={() => onDivineAdjustTax(economyReserve.taxRatePct >= 15 ? 5 : economyReserve.taxRatePct + 5)}
                      className="py-2 px-2.5 rounded-lg bg-[#111827] border border-slate-800 hover:border-amber-500 disabled:opacity-40 text-[13px] text-amber-200 text-left"
                    >
                      Impuesto {economyReserve.taxRatePct}%
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['Primavera', 'Verano', 'Otoño', 'Invierno'] as const).map((sName) => (
                      <button
                        key={sName}
                        type="button"
                        disabled={interventionMode !== 'advanced'}
                        onClick={() => onDivineForceSeason(sName)}
                        className={`py-1.5 rounded-md border text-[13px] disabled:opacity-40 ${
                          season === sName
                            ? 'border-sky-500 bg-sky-950/60 text-sky-200 font-semibold'
                            : 'border-slate-800 bg-[#111827] text-slate-300'
                        }`}
                      >
                        {sName}
                      </button>
                    ))}
                  </div>
                </div>

                {(onDivineAccelerateDiscovery ||
                  onDivineSparkFestival ||
                  onDivineMitigateCrises ||
                  onDivineAdjustSociety ||
                  onDivineAidTopFamily) && (
                  <div className="bg-[#0b1120] border border-emerald-800/40 rounded-lg p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2 text-[13px]">
                      <span className="font-semibold text-emerald-300">Impulsos de Civilización</span>
                      <span className="text-[11px] text-slate-400">
                        {isObserver ? 'Solo lectura' : 'Intervención activa'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {onDivineAccelerateDiscovery && (
                        <button
                          type="button"
                          disabled={isObserver}
                          onClick={onDivineAccelerateDiscovery}
                          data-testid="divine-discovery-btn"
                          className="py-1.5 px-2 rounded-md bg-[#111827] border border-slate-800 hover:border-emerald-500 disabled:opacity-40 text-[12px] text-emerald-200 text-left"
                        >
                          Acelerar Descubr.
                        </button>
                      )}
                      {onDivineSparkFestival && (
                        <button
                          type="button"
                          disabled={isObserver}
                          onClick={onDivineSparkFestival}
                          data-testid="divine-festival-btn"
                          className="py-1.5 px-2 rounded-md bg-[#111827] border border-slate-800 hover:border-fuchsia-500 disabled:opacity-40 text-[12px] text-fuchsia-200 text-left"
                        >
                          Impulsar Festival
                        </button>
                      )}
                      {onDivineMitigateCrises && (
                        <button
                          type="button"
                          disabled={isObserver}
                          onClick={onDivineMitigateCrises}
                          data-testid="divine-mitigate-btn"
                          className="py-1.5 px-2 rounded-md bg-[#111827] border border-slate-800 hover:border-sky-500 disabled:opacity-40 text-[12px] text-sky-200 text-left"
                        >
                          Mitigar Crisis
                        </button>
                      )}
                      {onDivineAidTopFamily && (
                        <button
                          type="button"
                          disabled={isObserver}
                          onClick={onDivineAidTopFamily}
                          data-testid="divine-aid-family-btn"
                          className="py-1.5 px-2 rounded-md bg-[#111827] border border-slate-800 hover:border-amber-500 disabled:opacity-40 text-[12px] text-amber-200 text-left"
                        >
                          Bendecir Linaje
                        </button>
                      )}
                      {onDivineAdjustSociety && (
                        <>
                          <button
                            type="button"
                            disabled={isObserver}
                            onClick={() => onDivineAdjustSociety('happiness', 12)}
                            data-testid="divine-happiness-btn"
                            className="py-1.5 px-2 rounded-md bg-[#111827] border border-slate-800 hover:border-emerald-500 disabled:opacity-40 text-[12px] text-slate-200 text-left"
                          >
                            +Bienestar
                          </button>
                          <button
                            type="button"
                            disabled={isObserver}
                            onClick={() => onDivineAdjustSociety('trust', 12)}
                            data-testid="divine-trust-btn"
                            className="py-1.5 px-2 rounded-md bg-[#111827] border border-slate-800 hover:border-sky-500 disabled:opacity-40 text-[12px] text-slate-200 text-left"
                          >
                            +Confianza
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="flex flex-col gap-3">
          <section className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2.5">
            <div className="flex flex-col gap-1">
              <h2 className="text-[16px] leading-snug font-bold tracking-wide text-slate-100">
                Mercado Dinámico
              </h2>
              <span className="font-mono text-[13px] text-amber-300 font-semibold" data-testid="market-inflation">
                Inflación x{marketPrices.inflationIndex}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono tabular-nums text-[13px]">
              {[
                { label: 'Comida', val: marketPrices.food },
                { label: 'Pan', val: marketPrices.bread },
                { label: 'Madera', val: marketPrices.wood },
                { label: 'Piedra', val: marketPrices.stone },
                { label: 'Cobre', val: marketPrices.copper },
                { label: 'Hierro', val: marketPrices.iron },
                { label: 'Herram.', val: marketPrices.tools },
                { label: 'Medic.', val: marketPrices.medicine },
              ].map((item) => (
                <div
                  key={item.label}
                  className="bg-[#0b1120] border border-slate-800 rounded-lg px-2.5 py-2 flex items-center justify-between gap-1"
                >
                  <span className="text-slate-300">{item.label}</span>
                  <span className="text-amber-300 font-semibold">{item.val}m</span>
                </div>
              ))}
            </div>
          </section>

          <section
            className="bg-[#111827] border border-slate-800 rounded-xl p-3.5"
            data-testid="resource-ledger-panel"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col">
                <h2 className="text-[16px] leading-snug font-bold tracking-wide text-slate-100">
                  Control de Recursos
                </h2>
                <span className="text-[13px] text-slate-400 font-mono tabular-nums" data-testid="ledger-count">
                  {resourceLedger.length} registros
                </span>
              </div>
              <MinToggle
                open={openLedger}
                onClick={() => setOpenLedger((v) => !v)}
                label="Control de Recursos (Auditoría)"
                testId="toggle-ledger-panel"
              />
            </div>

            {openLedger && (
              <div className="mt-3 flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
                {recentLedger.length === 0 ? (
                  <p className="text-[13px] text-slate-400 italic">
                    Aún no se registraron consumos, reservas, mantenimientos ni producciones.
                  </p>
                ) : (
                  recentLedger.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-[#0b1120] border border-slate-800 rounded-lg p-2.5 text-[13px] flex flex-col gap-1"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold text-slate-100 leading-snug">
                          {entry.targetName}
                        </span>
                        <span className="font-mono text-[12px] text-sky-300 shrink-0">
                          D{entry.day}·{entry.operationType}
                        </span>
                      </div>
                      <div className="text-amber-300 font-mono text-[12px]">
                        {formatResourceCost(entry.materials)}
                      </div>
                      <div className="text-[12px] text-slate-400 flex flex-col gap-0.5">
                        <span>
                          {entry.actorName} ({entry.source})
                        </span>
                        <span className="text-emerald-300">{entry.result}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import {
  askQwenAssistant,
  createInitialState,
  queryOllamaThoughtForAgent,
  renderWorld,
  spawnResource,
  tickSimulation,
  type CameraView,
} from './simulation/engine';
import {
  addLog,
  addRoadTile,
  ALL_JOBS,
  ANIMAL_LABELS,
  buildBaseRoads,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  clamp,
  completeActiveConstruction,
  computeSeason,
  computeUnlockedSkills,
  craftToolsForAgent,
  createAnimal,
  createDefaultLaws,
  createEmptyHouseStorage,
  createVillagePetition,
  cureAgent,
  deleteAnimal,
  deleteBridge,
  deleteFarmPlotById,
  deleteHouse,
  deletePlaza,
  deleteSpecialBuilding,
  depositResourcesToHouse,
  electRepresentative,
  FOREST_MAX_X,
  formatResourceCost,
  getBuildingOccupancySnapshot,
  getRoadTileCost,
  getTotalCirculatingCoins,
  HOUSE_SIZE_CAPACITIES,
  infectAgent,
  isNightMinute,
  killAgent,
  killAllCrops,
  killCropPlotAt,
  migrateAndRecoverVillageState,
  modifyAgentKnowledge,
  modifyAgentResource,
  modifyHouseStorage,
  modifySpecialBuildingStorage,
  MOUNTAIN_MIN_X,
  PETITION_INTERVAL_SECONDS,
  recalculateEconomyReserve,
  resolvePetition,
  resolvePetitionWithQwen,
  RIVER_BOTTOM_Y,
  RIVER_TOP_Y,
  SAFE_LAND_MIN_Y,
  spawnFire,
  SPECIAL_BUILDING_ALLOWED_STORAGE,
  SPECIAL_BUILDING_LABELS,
  switchPartnerForAgent,
  syncSpecialBuildingStaff,
  toggleSterileAgent,
  toggleVillageLaw,
  triggerLightningStorm,
} from './simulation/rules';
import {
  createDefaultEvolutionStats,
  createDefaultMarketPrices,
  createDefaultMilestones,
  createDefaultMultipliers,
  createDefaultPolitics,
  createDefaultRepresentativeGoals,
  divineAdjustTaxRate,
  divineForceSeason,
  divineGrantGlobalKnowledge,
  divineRepairAllStructures,
  divineSpawnVillager,
  divineTriggerEvent,
  ensureCivilizationDefaults,
  trackDivineIntervention,
} from './simulation/civilizationSystems';
import {
  createDefaultAIConfig,
  ensureAIConfig,
  getAIProviderBadge,
  queryAIProvider,
  syncLegacyOllamaFromAIConfig,
} from './simulation/aiProviders';
import { ensureAllExpansionDefaults } from './simulation/civilizationPipeline';
import { divineAidFamily, divineSparkTraditionOrFestival } from './simulation/cultureAndFamilies';
import { DISCOVERY_CATALOG, divineAccelerateDiscovery } from './simulation/discoveries';
import {
  buildDiplomaticProposalSummary,
  divineModifyDiplomacy,
  executeExternalTrade,
  TRADE_GOOD_LABELS,
} from './simulation/diplomacy';
import { divineAdjustSocietyIndicator, divineResolveAllCrises } from './simulation/crisesAndSociety';
import { soundEngine } from './audio/soundEngine';
import type {
  AIProviderConfig,
  Agent,
  AnimalType,
  BiomeType,
  DiplomaticRelation,
  DivineMultipliers,
  DivineTool,
  HouseStorage,
  InterventionMode,
  JobType,
  LayoutMode,
  OllamaConfig,
  ResourceInventory,
  RoadType,
  SeasonType,
  SelectedEntity,
  SimulationState,
  TradeGoodKey,
  VillageLawId,
  WeatherType,
} from './types/simulation';
import { TopBar } from './components/TopBar';
import { WorldControlsPanel } from './components/WorldControlsPanel';
import { QwenConsole } from './components/QwenConsole';
import { VillagerInspector } from './components/VillagerInspector';
import { EventLogPanel } from './components/EventLogPanel';
import { OllamaModal } from './components/OllamaModal';
import { StatsModal } from './components/StatsModal';
import { SaveLoadModal } from './components/SaveLoadModal';
import { DownloadLocalModal } from './components/DownloadLocalModal';
import { FamiliasModal } from './components/FamiliasModal';
import { CivilizationModal } from './components/CivilizationModal';
import { getSpriteLoadRevision } from './render/spriteLoader';

const SAVE_STORAGE_KEY = 'aldea_ia_save_v1';

const TOOL_LABELS: Record<DivineTool, string> = {
  inspect: 'Inspeccionar',
  add_road: '+ Camino',
  food: '+ Comida',
  wood: '+ Madera',
  pine_wood: '+ Pino',
  maple_wood: '+ Arce',
  oak_wood: '+ Roble',
  stone: '+ Piedra',
  copper: '+ Cobre',
  iron: '+ Hierro',
  gold: '+ Oro 🥇',
  silver: '+ Plata 🥈',
  coins: '+ Monedas',
  knowledge: '+ Saber',
  kill_crop: 'Matar cultivo',
  lightning_storm: '⚡ Rayo/Tormenta',
  start_fire: '🔥 Incendio',
  heal: 'Curar clic',
  infect: 'Enfermar clic',
  sterilize: 'Impotente clic',
  kill: 'Matar clic',
};

function computeCollectiveHint(state: SimulationState): string {
  if (state.fires.length > 0) {
    return `¡Alerta! Hay ${state.fires.length} incendio(s) activo(s). Guardianes y aldeanos pueden extinguirlos.`;
  }
  if (state.resourcesPaused) {
    return 'Entrega de recursos pausada. La aldea depende de pesca finita, ganadería, cultivos y reservas.';
  }
  const totalFood = state.agents.reduce((acc, a) => acc + a.inv.food + a.breadCount, 0);
  const sickCount = state.agents.filter((a) => a.isSick).length;
  const homeless = state.agents.filter((a) => a.houseId === null).length;
  const obsolete = state.specialBuildings.find((b) => !b.isOperational);

  if (obsolete) {
    return `${obsolete.name} está obsoleto por falta de administrador. Reasigna oficios con Qwen 2.5 para activarlo.`;
  }
  if (sickCount >= 3) {
    return `Hay ${sickCount} aldeanos enfermos. Conviene curarlos o construir un Hospital / Botica.`;
  }
  if (state.houses.length === 0) {
    return 'Los 10 fundadores están reuniendo madera y piedra; sin casa no pueden descansar de noche.';
  }
  if (!state.plaza) {
    return 'La aldea aún no tiene Plaza Central; Qwen 2.5 decidirá su ubicación al reunir materiales.';
  }
  if (!state.bridge) {
    return 'El río superior no tiene puente todavía; construirlo conectará la Zona Norte con la aldea.';
  }
  if (totalFood < state.agents.length) {
    return 'Las reservas de comida por habitante están bajas; conviene pescar, sembrar cultivos o abrir Panadería.';
  }
  if (homeless > 0) {
    return `Hay ${homeless} habitante(s) sin vivienda que no pueden descansar bien de noche.`;
  }
  return 'El Bosque (izq.) aporta maderas y las Montañas (der.) Cobre, Hierro, Plata 🥈 y Oro 🥇 para la economía.';
}

function readSavedSummary(): { exists: boolean; info: string | null } {
  try {
    const raw = localStorage.getItem(SAVE_STORAGE_KEY);
    if (!raw) return { exists: false, info: null };
    const parsed = JSON.parse(raw) as Partial<SimulationState>;
    if (!parsed || !Array.isArray(parsed.agents)) return { exists: false, info: null };
    return {
      exists: true,
      info: `Día ${parsed.day ?? 1} · ${parsed.agents.length} aldeanos · ${parsed.houses?.length ?? 0} casas`,
    };
  } catch {
    return { exists: false, info: null };
  }
}

function finiteOr(val: unknown, fallback: number): number {
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? n : fallback;
}

export function hydrateSimulationState(parsed: Partial<SimulationState>): SimulationState {
  const base = createInitialState();
  const parsedDay = Math.max(1, Math.round(finiteOr(parsed.day, 1)));
  const validSpeed = parsed.speed === 0 || parsed.speed === 1 || parsed.speed === 2 || parsed.speed === 4 ? parsed.speed : 1;
  const rawPolicies = (parsed.policies && typeof parsed.policies === 'object' ? parsed.policies : {}) as Partial<SimulationState['policies']>;
  const safePolicies: SimulationState['policies'] = {
    buildPriority: typeof rawPolicies.buildPriority === 'boolean' ? rawPolicies.buildPriority : base.policies.buildPriority,
    workFocus: typeof rawPolicies.workFocus === 'boolean' ? rawPolicies.workFocus : base.policies.workFocus,
    evolutionFocus: typeof rawPolicies.evolutionFocus === 'boolean' ? rawPolicies.evolutionFocus : base.policies.evolutionFocus,
    economyFocus: typeof rawPolicies.economyFocus === 'boolean' ? rawPolicies.economyFocus : base.policies.economyFocus,
    farmingFocus: typeof rawPolicies.farmingFocus === 'boolean' ? rawPolicies.farmingFocus : base.policies.farmingFocus,
    reproductionRestraint:
      typeof rawPolicies.reproductionRestraint === 'boolean'
        ? rawPolicies.reproductionRestraint
        : base.policies.reproductionRestraint,
    healthPriority: typeof rawPolicies.healthPriority === 'boolean' ? rawPolicies.healthPriority : base.policies.healthPriority,
    allowPartnerSwitch:
      typeof rawPolicies.allowPartnerSwitch === 'boolean'
        ? rawPolicies.allowPartnerSwitch
        : base.policies.allowPartnerSwitch,
    moodDirective:
      rawPolicies.moodDirective === 'optimistic' || rawPolicies.moodDirective === 'disciplined'
        ? rawPolicies.moodDirective
        : 'neutral',
  };

  const nextState: SimulationState = {
    ...base,
    schemaVersion: 3,
    pendingSounds: [],
    day: parsedDay,
    minute: clamp(finiteOr(parsed.minute, base.minute), 0, 1440),
    speed: validSpeed,
    resourcesPaused: Boolean(parsed.resourcesPaused),
    layoutMode:
      parsed.layoutMode === 'vertical' || parsed.layoutMode === 'horizontal' ? parsed.layoutMode : 'auto',
    biome:
      parsed.biome === 'grassland' || parsed.biome === 'arid' || parsed.biome === 'forest' || parsed.biome === 'tundra'
        ? parsed.biome
        : base.biome,
    weather:
      parsed.weather === 'sunny' ||
      parsed.weather === 'rain' ||
      parsed.weather === 'drought' ||
      parsed.weather === 'storm' ||
      parsed.weather === 'thunderstorm'
        ? parsed.weather
        : base.weather,
    era: parsed.era ?? base.era,
    tool: parsed.tool ?? 'inspect',
    knowledge: Math.max(0, finiteOr(parsed.knowledge, base.knowledge)),
    nextId: Math.max(100, Math.round(finiteOr(parsed.nextId, base.nextId))),
    policies: safePolicies,
    ollama:
      parsed.ollama && typeof parsed.ollama === 'object'
        ? {
            enabled: Boolean(parsed.ollama.enabled),
            url: typeof parsed.ollama.url === 'string' ? parsed.ollama.url : base.ollama.url,
            model: typeof parsed.ollama.model === 'string' ? parsed.ollama.model : base.ollama.model,
          }
        : base.ollama,
    aiConfig:
      parsed.aiConfig && typeof parsed.aiConfig === 'object'
        ? {
            ...createDefaultAIConfig(parsed.ollama),
            ...parsed.aiConfig,
            status: parsed.aiConfig.status ?? 'ready',
            lastError: parsed.aiConfig.lastError ?? null,
            consecutiveFailures: Number(parsed.aiConfig.consecutiveFailures ?? 0),
          }
        : createDefaultAIConfig(parsed.ollama),
    interventionMode:
      parsed.interventionMode === 'observer' || parsed.interventionMode === 'advanced'
        ? parsed.interventionMode
        : 'intervention',
    divineMultipliers: parsed.divineMultipliers
      ? { ...createDefaultMultipliers(), ...parsed.divineMultipliers }
      : createDefaultMultipliers(),
    marketPrices: parsed.marketPrices
      ? { ...createDefaultMarketPrices(), ...parsed.marketPrices }
      : createDefaultMarketPrices(),
    politics: parsed.politics
      ? { ...createDefaultPolitics(parsedDay), ...parsed.politics }
      : createDefaultPolitics(parsedDay),
    ecosystemHealth: typeof parsed.ecosystemHealth === 'number' ? clamp(parsed.ecosystemHealth, 0, 100) : 86,
    evolutionStats: parsed.evolutionStats
      ? {
          natural: { ...createDefaultEvolutionStats().natural, ...parsed.evolutionStats.natural },
          divine: { ...createDefaultEvolutionStats().divine, ...parsed.evolutionStats.divine },
        }
      : createDefaultEvolutionStats(),
    representativeGoals: parsed.representativeGoals
      ? { ...createDefaultRepresentativeGoals(parsedDay), ...parsed.representativeGoals }
      : createDefaultRepresentativeGoals(parsedDay),
    chronicleArchive: Array.isArray(parsed.chronicleArchive) ? parsed.chronicleArchive.slice(0, 400) : [],
    familyLineages: Array.isArray(parsed.familyLineages) ? parsed.familyLineages : undefined,
    historicalFigures: Array.isArray(parsed.historicalFigures) ? parsed.historicalFigures : undefined,
    culture: parsed.culture && typeof parsed.culture === 'object' ? parsed.culture : undefined,
    discoveries: Array.isArray(parsed.discoveries) ? parsed.discoveries : undefined,
    externalCommunities: Array.isArray(parsed.externalCommunities) ? parsed.externalCommunities : undefined,
    externalTradeHistory: Array.isArray(parsed.externalTradeHistory) ? parsed.externalTradeHistory : undefined,
    crisisMonitor: parsed.crisisMonitor && typeof parsed.crisisMonitor === 'object' ? parsed.crisisMonitor : undefined,
    districts: Array.isArray(parsed.districts) ? parsed.districts : undefined,
    societyIndicators:
      parsed.societyIndicators && typeof parsed.societyIndicators === 'object' ? parsed.societyIndicators : undefined,
    societyHistory: Array.isArray(parsed.societyHistory) ? parsed.societyHistory.slice(-60) : undefined,
    biographies: Array.isArray(parsed.biographies) ? parsed.biographies : undefined,
    decadeSummaries: Array.isArray(parsed.decadeSummaries) ? parsed.decadeSummaries : undefined,
    perfStats: parsed.perfStats && typeof parsed.perfStats === 'object' ? parsed.perfStats : undefined,
    milestones:
      Array.isArray(parsed.milestones) && parsed.milestones.length > 0
        ? parsed.milestones
        : createDefaultMilestones(),
    activeDisaster: parsed.activeDisaster ?? null,
    history: Array.isArray(parsed.history) ? parsed.history.slice(-120) : [],
    logs: Array.isArray(parsed.logs)
      ? parsed.logs
          .filter((l) => l && typeof l.text === 'string')
          .slice(0, 80)
          .map((l, idx) => ({
            id: Math.round(finiteOr(l.id, idx + 1)),
            day: Math.max(1, Math.round(finiteOr(l.day, parsedDay))),
            text: String(l.text),
            tone: l.tone ?? 'slate',
          }))
      : base.logs,
    qwenMessages: Array.isArray(parsed.qwenMessages)
      ? parsed.qwenMessages
          .filter((m) => m && typeof m === 'object')
          .slice(-35)
          .map((m, idx) => ({
            id: Math.round(finiteOr(m.id, idx + 1)),
            role: m.role === 'user' ? 'user' : 'qwen',
            text: typeof m.text === 'string' ? m.text : 'Mensaje recuperado',
            appliedRules: Array.isArray(m.appliedRules)
              ? m.appliedRules.filter((r): r is string => typeof r === 'string')
              : undefined,
            source:
              m.source === 'ollama' || m.source === 'cloud' || m.source === 'none'
                ? m.source
                : 'local',
            providerLabel: typeof m.providerLabel === 'string' ? m.providerLabel : undefined,
          }))
      : base.qwenMessages,
    selectedEntity: null,
    selectedAgentId: typeof parsed.selectedAgentId === 'number' ? parsed.selectedAgentId : null,
    selectedRoadType: parsed.selectedRoadType ?? 'dirt',
    selectedRoadLamp: parsed.selectedRoadLamp ?? false,
    roadMaintenanceLastDay: parsed.roadMaintenanceLastDay ?? parsedDay,
    roadUnpaidMaintenanceDays: parsed.roadUnpaidMaintenanceDays ?? 0,
    season: parsed.season ?? computeSeason(parsedDay),
    plaza: parsed.plaza
      ? {
          ...parsed.plaza,
          durability: parsed.plaza.durability ?? 100,
          unpaidMaintenanceDays: parsed.plaza.unpaidMaintenanceDays ?? 0,
          maintenanceDebtCount: parsed.plaza.maintenanceDebtCount ?? 0,
          maintenanceStatus: parsed.plaza.maintenanceStatus ?? 'ok',
          lastMaintenanceDay: parsed.plaza.lastMaintenanceDay ?? parsed.plaza.builtDay ?? parsedDay,
        }
      : null,
    bridge: parsed.bridge
      ? {
          ...parsed.bridge,
          durability: parsed.bridge.durability ?? 100,
          unpaidMaintenanceDays: parsed.bridge.unpaidMaintenanceDays ?? 0,
          maintenanceDebtCount: parsed.bridge.maintenanceDebtCount ?? 0,
          maintenanceStatus: parsed.bridge.maintenanceStatus ?? 'ok',
          lastMaintenanceDay: parsed.bridge.lastMaintenanceDay ?? parsed.bridge.builtDay ?? parsedDay,
        }
      : null,
    roads: Array.isArray(parsed.roads)
      ? parsed.roads.map((r) => ({
          ...r,
          roadType: r.roadType ?? 'dirt',
          hasLamp: r.hasLamp ?? Boolean(r.lit),
          lit: r.lit ?? Boolean(r.hasLamp),
          durability: r.durability ?? 100,
        }))
      : [],
    resourceLedger: Array.isArray(parsed.resourceLedger) ? parsed.resourceLedger : [],
    riverFishStock: parsed.riverFishStock ?? 18,
    riverFishMaxStock: parsed.riverFishMaxStock ?? 18,
    riverFishRestTimer: parsed.riverFishRestTimer ?? 0,
    laws: Array.isArray(parsed.laws) && parsed.laws.length > 0 ? parsed.laws : createDefaultLaws(),
    fires: Array.isArray(parsed.fires) ? parsed.fires : [],
    loans: Array.isArray(parsed.loans) ? parsed.loans : [],
    representativeAgentId: parsed.representativeAgentId ?? null,
    representativeLastActedMinute: parsed.representativeLastActedMinute ?? 0,
    representativeGoal:
      parsed.representativeGoal ?? 'Garantizar viviendas, alimento y progreso continuo',
    petitionTimerSec: parsed.petitionTimerSec ?? PETITION_INTERVAL_SECONDS,
    pendingPetition: parsed.pendingPetition ?? null,
    autoPausedByPetition: parsed.autoPausedByPetition ?? false,
    previousSpeedBeforePetition: parsed.previousSpeedBeforePetition ?? 1,
    qwenAutoRespondPetitions: parsed.qwenAutoRespondPetitions ?? false,
    lightningFlashTimer: parsed.lightningFlashTimer ?? 0,
    lastCouncilDay: parsed.lastCouncilDay ?? 0,
    economyReserve: {
      goldReserve: parsed.economyReserve?.goldReserve ?? 4,
      silverReserve: parsed.economyReserve?.silverReserve ?? 2,
      backedCoinsCapacity: parsed.economyReserve?.backedCoinsCapacity ?? 120,
      mintedCoins: parsed.economyReserve?.mintedCoins ?? 0,
      bankLoanPool: parsed.economyReserve?.bankLoanPool ?? 40,
      taxRatePct: parsed.economyReserve?.taxRatePct ?? 5,
      lastTaxCollectedDay: parsed.economyReserve?.lastTaxCollectedDay ?? parsedDay,
    },
    specialBuildings: Array.isArray(parsed.specialBuildings)
      ? parsed.specialBuildings.map((b) => ({
          ...b,
          ownerId: b.ownerId ?? null,
          forSale: b.forSale ?? b.ownerId === null,
          price: b.price ?? SPECIAL_BUILDING_LABELS[b.type]?.basePrice ?? 60,
          durability: b.durability ?? 100,
          unpaidMaintenanceDays: b.unpaidMaintenanceDays ?? 0,
          maintenanceDebtCount: b.maintenanceDebtCount ?? 0,
          maintenanceStatus: b.maintenanceStatus ?? 'ok',
          lastMaintenanceDay: b.lastMaintenanceDay ?? parsedDay,
          efficiencyMultiplier: b.efficiencyMultiplier ?? 1,
          allowedStorage:
            Array.isArray(b.allowedStorage) && b.allowedStorage.length > 0
              ? b.allowedStorage
              : [...(SPECIAL_BUILDING_ALLOWED_STORAGE[b.type] ?? ['coins'])],
          staffIds: Array.isArray(b.staffIds) ? b.staffIds : [],
          isOperational: b.isOperational ?? false,
          storage: { ...createEmptyHouseStorage(0), ...b.storage },
        }))
      : [],
    animals: Array.isArray(parsed.animals)
      ? parsed.animals.map((an) => ({
          ...an,
          tamed: an.tamed ?? false,
          ownerId: an.ownerId ?? null,
          maxHp: an.maxHp ?? 60,
        }))
      : [],
    farms: Array.isArray(parsed.farms)
      ? parsed.farms.map((f) => ({
          ...f,
          size: f.size ?? 'medium',
          durability: f.durability ?? 100,
          unpaidMaintenanceDays: f.unpaidMaintenanceDays ?? 0,
          maintenanceDebtCount: f.maintenanceDebtCount ?? 0,
          maintenanceStatus: f.maintenanceStatus ?? 'ok',
          lastMaintenanceDay: f.lastMaintenanceDay ?? parsedDay,
        }))
      : [],
    resources: Array.isArray(parsed.resources)
      ? parsed.resources.map((r) => ({
          ...r,
          maxAmount: r.maxAmount ?? Math.max(6, r.amount),
          depleted: r.depleted ?? r.amount <= 0,
          restTimer: r.restTimer ?? 0,
        }))
      : [],
    agents: Array.isArray(parsed.agents) && parsed.agents.length > 0
      ? parsed.agents
          .filter((a) => a && typeof a === 'object')
          .map((a, idx) => {
            const edu = clamp(finiteOr(a.education, 12), 0, 100);
            const validJob = ALL_JOBS.includes(a.job) ? a.job : 'Recolector';
            return {
              ...a,
              id: Math.round(finiteOr(a.id, idx + 1)),
              name: typeof a.name === 'string' && a.name.trim() ? a.name : `Aldeano ${idx + 1}`,
              sex: a.sex === 'F' ? 'F' : 'M',
              x: clamp(finiteOr(a.x, CANVAS_WIDTH * 0.5), 20, CANVAS_WIDTH - 20),
              y: clamp(finiteOr(a.y, CANVAS_HEIGHT * 0.65), 20, CANVAS_HEIGHT - 20),
              ageYears: Math.max(0, Math.round(finiteOr(a.ageYears, 20))),
              health: clamp(finiteOr(a.health, 95), 1, 100),
              energy: clamp(finiteOr(a.energy, 85), 0, 100),
              hunger: clamp(finiteOr(a.hunger, 15), 0, 100),
              happiness: clamp(finiteOr(a.happiness, 75), 0, 100),
              coins: Math.max(0, Math.round(finiteOr(a.coins, 0))),
              job: validJob,
              activity: typeof a.activity === 'string' ? a.activity : 'Trabajando',
              thought: typeof a.thought === 'string' ? a.thought : 'Buscando el progreso de la aldea.',
              qwenPlan: typeof a.qwenPlan === 'string' ? a.qwenPlan : 'Progreso de la aldea',
              reproductionCooldown: Math.max(0, finiteOr(a.reproductionCooldown, 0)),
              education: edu,
              carpentryKnowledge: clamp(finiteOr(a.carpentryKnowledge, 8), 0, 100),
              constructionKnowledge: clamp(finiteOr(a.constructionKnowledge, 12), 0, 100),
              jobMastery: a.jobMastery && typeof a.jobMastery === 'object' ? a.jobMastery : {},
              skills: Array.isArray(a.skills) ? a.skills : computeUnlockedSkills(edu).map((sk) => sk.id),
              mentorId: a.mentorId ?? null,
              loanDebt: Math.max(0, finiteOr(a.loanDebt, 0)),
              jailedDays: Math.max(0, Math.round(finiteOr(a.jailedDays, 0))),
              isRepresentative: Boolean(a.isRepresentative),
              wantsChildren: typeof a.wantsChildren === 'boolean' ? a.wantsChildren : true,
              pregnancy:
                a.pregnancy && typeof a.pregnancy === 'object' && Number.isFinite(a.pregnancy.daysRemaining)
                  ? a.pregnancy
                  : null,
              illness: a.illness ?? null,
              assignedBuildingId: typeof a.assignedBuildingId === 'number' ? a.assignedBuildingId : null,
              activeConstruction: a.activeConstruction ?? null,
              birthDay: typeof a.birthDay === 'number' ? a.birthDay : Math.max(1, parsedDay - Math.round(finiteOr(a.ageYears, 20))),
              familyId: typeof a.familyId === 'string' ? a.familyId : undefined,
              motherId: typeof a.motherId === 'number' ? a.motherId : undefined,
              fatherId: typeof a.fatherId === 'number' ? a.fatherId : undefined,
              jobsHeld: Array.isArray(a.jobsHeld) ? a.jobsHeld : [validJob],
              discoveriesAuthored: Array.isArray(a.discoveriesAuthored) ? a.discoveriesAuthored : [],
              knownDiscoveries: Array.isArray(a.knownDiscoveries) ? a.knownDiscoveries : [],
              inv: {
                food: Math.max(0, finiteOr(a.inv?.food, 0)),
                wood: Math.max(0, finiteOr(a.inv?.wood, 0)),
                pineWood: Math.max(0, finiteOr(a.inv?.pineWood, 0)),
                mapleWood: Math.max(0, finiteOr(a.inv?.mapleWood, 0)),
                oakWood: Math.max(0, finiteOr(a.inv?.oakWood, 0)),
                stone: Math.max(0, finiteOr(a.inv?.stone, 0)),
                copper: Math.max(0, finiteOr(a.inv?.copper, 0)),
                iron: Math.max(0, finiteOr(a.inv?.iron, 0)),
                gold: Math.max(0, finiteOr(a.inv?.gold, 0)),
                silver: Math.max(0, finiteOr(a.inv?.silver, 0)),
              },
            };
          })
      : base.agents,
    highlightFamilyAgentId: parsed.highlightFamilyAgentId ?? null,
    houses: Array.isArray(parsed.houses)
      ? parsed.houses.map((h) => {
          const size = h.size ?? 'medium';
          return {
            ...h,
            zone: h.zone ?? 'south',
            size,
            capacity: h.capacity ?? HOUSE_SIZE_CAPACITIES[size],
            durability: h.durability ?? 100,
            unpaidMaintenanceDays: h.unpaidMaintenanceDays ?? 0,
            maintenanceDebtCount: h.maintenanceDebtCount ?? 0,
            maintenanceStatus: h.maintenanceStatus ?? 'ok',
            lastMaintenanceDay: h.lastMaintenanceDay ?? parsedDay,
            storage: {
              ...createEmptyHouseStorage(0),
              food: h.storage?.food ?? 0,
              coins: h.storage?.coins ?? 0,
            },
          };
        })
      : [],
    rainDrops: Array.isArray(parsed.rainDrops) && parsed.rainDrops.length > 0 ? parsed.rainDrops : base.rainDrops,
    floatingEffects: [],
  };

  syncLegacyOllamaFromAIConfig(nextState);
  ensureCivilizationDefaults(nextState);
  ensureAllExpansionDefaults(nextState);
  syncSpecialBuildingStaff(nextState);
  recalculateEconomyReserve(nextState);
  electRepresentative(nextState);
  migrateAndRecoverVillageState(nextState);
  nextState.pendingSounds = [];
  return nextState;
}

export default function App() {
  const stateRef = useRef<SimulationState>(createInitialState());
  const cameraRef = useRef<CameraView>({ zoom: 1, panX: 0, panY: 0 });
  const isPointerOverMapRef = useRef(false);
  const roadPaintingRef = useRef(false);
  const panDragRef = useRef<{
    active: boolean;
    button: number;
    startClientX: number;
    startClientY: number;
    startPanX: number;
    startPanY: number;
    moved: boolean;
  }>({
    active: false,
    button: 0,
    startClientX: 0,
    startClientY: 0,
    startPanX: 0,
    startPanY: 0,
    moved: false,
  });
  const savingToServerRef = useRef(false);
  const hydratedRef = useRef(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tickVersion, setTickVersion] = useState(0);
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [isOllamaOpen, setIsOllamaOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isFamiliesOpen, setIsFamiliesOpen] = useState(false);
  const [isCivilizationOpen, setIsCivilizationOpen] = useState(false);
  const [diplomacyAdvice, setDiplomacyAdvice] = useState<string | null>(null);
  const [isDiplomacyAdvisorBusy, setIsDiplomacyAdvisorBusy] = useState(false);
  const [isSaveLoadOpen, setIsSaveLoadOpen] = useState(false);
  const [isDownloadOpen, setIsDownloadOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isQwenBusy, setIsQwenBusy] = useState(false);
  const [isVerticalAuto, setIsVerticalAuto] = useState(false);
  const [panelWidthPreset, setPanelWidthPreset] = useState<'normal' | 'wide' | 'max'>('normal');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundEngine.isEnabled());
  const [soundVolume, setSoundVolume] = useState<number>(() => soundEngine.getVolume());
  const [serverSyncStatus, setServerSyncStatus] = useState<string>('Sincronizado');

  const canvasDirtyRef = useRef<boolean>(true);
  const syncUI = () => {
    canvasDirtyRef.current = true;
    setTickVersion((v) => v + 1);
  };

  useEffect(() => {
    const unlockOnGesture = () => {
      soundEngine.unlock();
      const s = stateRef.current;
      soundEngine.syncAmbience({
        weather: s.weather,
        isNight: isNightMinute(s.minute),
        paused: s.speed === 0,
        hasLivingVillagers: s.agents.length > 0,
      });
    };
    window.addEventListener('pointerdown', unlockOnGesture, { passive: true });
    window.addEventListener('keydown', unlockOnGesture, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', unlockOnGesture);
      window.removeEventListener('keydown', unlockOnGesture);
    };
  }, []);

  function handleToggleSound() {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEngine.setEnabled(next);
    if (next) {
      soundEngine.unlock();
    }
    const s = stateRef.current;
    soundEngine.syncAmbience({
      weather: s.weather,
      isNight: isNightMinute(s.minute),
      paused: s.speed === 0,
      hasLivingVillagers: s.agents.length > 0,
    });
  }

  function handleChangeSoundVolume(nextVolume: number) {
    const clamped = clamp(nextVolume, 0, 1);
    setSoundVolume(clamped);
    soundEngine.setVolume(clamped);
    if (clamped > 0 && !soundEnabled) {
      setSoundEnabled(true);
      soundEngine.setEnabled(true);
      soundEngine.unlock();
    } else if (clamped === 0 && soundEnabled) {
      setSoundEnabled(false);
      soundEngine.setEnabled(false);
    }
    const s = stateRef.current;
    soundEngine.syncAmbience({
      weather: s.weather,
      isNight: isNightMinute(s.minute),
      paused: s.speed === 0,
      hasLivingVillagers: s.agents.length > 0,
    });
  }

  async function saveStateToServer(showStatus = true) {
    if (savingToServerRef.current) return;
    savingToServerRef.current = true;
    try {
      const res = await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: stateRef.current }),
      });
      if (res.ok && showStatus) {
        const hhmm = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setServerSyncStatus(`Guardado en servidor (${hhmm})`);
      }
    } catch {
      if (showStatus) setServerSyncStatus('Sin conexión con servidor');
    } finally {
      savingToServerRef.current = false;
    }
  }

  // Hidratación inicial desde /api/state (persistencia en servidor entre reinicios) o fallback localStorage
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = (await res.json()) as { state?: Partial<SimulationState> | null };
          if (active && data?.state && Array.isArray(data.state.agents) && data.state.agents.length > 0) {
            try {
              stateRef.current = hydrateSimulationState(data.state);
              setServerSyncStatus(`Restaurado del servidor (Día ${stateRef.current.day})`);
              hydratedRef.current = true;
              syncUI();
              return;
            } catch {
              // Ignorar estado corrupto en servidor y continuar con respaldo local o inicio limpio
            }
          }
        }
      } catch {
        // Fallback local
      }
      if (!active) return;
      try {
        const raw = localStorage.getItem(SAVE_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<SimulationState>;
          if (parsed && Array.isArray(parsed.agents) && parsed.agents.length > 0) {
            stateRef.current = hydrateSimulationState(parsed);
            setServerSyncStatus(`Restaurado local (Día ${stateRef.current.day})`);
            syncUI();
          }
        }
      } catch {
        stateRef.current = createInitialState();
        syncUI();
      }
      hydratedRef.current = true;
    })();
    return () => {
      active = false;
    };
  }, []);

  // Auto-guardado periódico al servidor cada 4 segundos y al cerrar la pestaña
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!hydratedRef.current) return;
      void saveStateToServer(true);
    }, 4000);

    const handleUnload = () => {
      if (!hydratedRef.current) return;
      try {
        void fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: stateRef.current }),
          keepalive: true,
        });
      } catch {
        // Ignore on unload
      }
    };
    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  function clampPan(panX: number, panY: number, zoom: number): { panX: number; panY: number } {
    const maxPanX = Math.max(220, CANVAS_WIDTH * zoom * 0.65);
    const maxPanY = Math.max(160, CANVAS_HEIGHT * zoom * 0.65);
    return {
      panX: clamp(panX, -maxPanX, maxPanX),
      panY: clamp(panY, -maxPanY, maxPanY),
    };
  }

  useEffect(() => {
    const checkOrientation = () => {
      setIsVerticalAuto(window.innerHeight > window.innerWidth || window.innerWidth <= 1100);
    };
    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    return () => window.removeEventListener('resize', checkOrientation);
  }, []);

  // Desplazamiento en el mapa SOLO con las teclas de flecha Y SOLO cuando el puntero está sobre el mapa
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPointerOverMapRef.current) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const step = 48;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = step;
      else if (e.key === 'ArrowRight') dx = -step;
      else if (e.key === 'ArrowUp') dy = step;
      else if (e.key === 'ArrowDown') dy = -step;
      else return;

      e.preventDefault();
      const clamped = clampPan(
        cameraRef.current.panX + dx,
        cameraRef.current.panY + dy,
        cameraRef.current.zoom
      );
      cameraRef.current.panX = clamped.panX;
      cameraRef.current.panY = clamped.panY;
      syncUI();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Zoom con la rueda del mouse centrado en la posición del cursor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.2 : -0.2;
      const z0 = cameraRef.current.zoom;
      const z1 = clamp(Math.round((z0 + delta) * 100) / 100, 0.6, 3.2);
      if (z1 === z0) return;

      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const canvasX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
        const canvasY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
        const wx = (canvasX - CANVAS_WIDTH / 2 - cameraRef.current.panX) / z0 + CANVAS_WIDTH / 2;
        const wy = (canvasY - CANVAS_HEIGHT / 2 - cameraRef.current.panY) / z0 + CANVAS_HEIGHT / 2;
        const nextPanX = canvasX - CANVAS_WIDTH / 2 - (wx - CANVAS_WIDTH / 2) * z1;
        const nextPanY = canvasY - CANVAS_HEIGHT / 2 - (wy - CANVAS_HEIGHT / 2) * z1;
        const clamped = clampPan(nextPanX, nextPanY, z1);
        cameraRef.current = { zoom: z1, panX: clamped.panX, panY: clamped.panY };
      } else {
        const clamped = clampPan(cameraRef.current.panX, cameraRef.current.panY, z1);
        cameraRef.current = { zoom: z1, panX: clamped.panX, panY: clamped.panY };
      }
      syncUI();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();
    let lastRenderTs = 0;
    let lastRenderCostMs = 0;
    let lastUiSyncTs = 0;
    let lastCamKey = '';
    let lastSpriteRev = -1;

    const loop = (now: number) => {
      const elapsedSec = clamp((now - lastTs) / 1000, 0.001, 0.1);
      lastTs = now;
      const state = stateRef.current;
      if (state.speed > 0) {
        tickSimulation(state, elapsedSec);
      }
      if (Array.isArray(state.pendingSounds) && state.pendingSounds.length > 0) {
        const cues = state.pendingSounds.splice(0, state.pendingSounds.length);
        for (const cue of cues) {
          soundEngine.playEvent(cue);
        }
      }
      soundEngine.syncAmbience({
        weather: state.weather,
        isNight: isNightMinute(state.minute),
        paused: state.speed === 0,
        hasLivingVillagers: state.agents.length > 0,
      });

      const cam = cameraRef.current;
      const camKey = `${cam.zoom}:${cam.panX}:${cam.panY}`;
      const spriteRev = getSpriteLoadRevision();
      const minRenderGap = state.speed === 0 ? Infinity : Math.max(33, lastRenderCostMs * 1.4);
      const shouldRender =
        canvasDirtyRef.current ||
        camKey !== lastCamKey ||
        spriteRev !== lastSpriteRev ||
        (state.speed > 0 && now - lastRenderTs >= minRenderGap);

      if (shouldRender) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const rt0 = performance.now();
            renderWorld(ctx, state, cam);
            lastRenderCostMs = Math.min(250, performance.now() - rt0);
            lastRenderTs = now;
            lastCamKey = camKey;
            lastSpriteRev = spriteRev;
            canvasDirtyRef.current = false;
          }
        }
      }

      if (state.speed > 0 && now - lastUiSyncTs >= 120) {
        lastUiSyncTs = now;
        setTickVersion((v) => v + 1);
      }
      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const state = stateRef.current;
  const camera = cameraRef.current;
  void tickVersion;

  const activeSelectedAgentId =
    state.selectedEntity?.kind === 'agent'
      ? state.selectedEntity.id
      : state.selectedEntity === null
        ? state.selectedAgentId
        : null;

  const selectedAgent: Agent | null =
    activeSelectedAgentId !== null
      ? state.agents.find((a) => a.id === activeSelectedAgentId) ?? null
      : null;

  const selectedPartnerName =
    selectedAgent && selectedAgent.partnerId !== null
      ? state.agents.find((a) => a.id === selectedAgent.partnerId)?.name ?? null
      : null;

  const selectedMentorName =
    selectedAgent && selectedAgent.mentorId !== null
      ? state.agents.find((a) => a.id === selectedAgent.mentorId)?.name ?? null
      : null;

  const selectedAgentHouse =
    selectedAgent && selectedAgent.houseId !== null
      ? state.houses.find((h) => h.id === selectedAgent.houseId) ?? null
      : null;

  const selectedEntity = state.selectedEntity;

  const inspectedHouse =
    selectedEntity?.kind === 'house'
      ? state.houses.find((h) => h.id === selectedEntity.id) ?? null
      : null;

  const inspectedHouseResidents = inspectedHouse
    ? state.agents.filter((a) => a.houseId === inspectedHouse.id)
    : [];

  const inspectedSpecial =
    selectedEntity?.kind === 'special'
      ? state.specialBuildings.find((b) => b.id === selectedEntity.id) ?? null
      : null;

  const inspectedSpecialOwnerName =
    inspectedSpecial && inspectedSpecial.ownerId !== null
      ? state.agents.find((a) => a.id === inspectedSpecial.ownerId)?.name ?? null
      : null;

  const inspectedSpecialStaff = inspectedSpecial
    ? state.agents.filter((a) => inspectedSpecial.staffIds.includes(a.id))
    : [];

  const inspectedFarm =
    selectedEntity?.kind === 'farm'
      ? state.farms.find((f) => f.id === selectedEntity.id) ?? null
      : null;

  const inspectedAnimal =
    selectedEntity?.kind === 'animal'
      ? state.animals.find((an) => an.id === selectedEntity.id) ?? null
      : null;

  const inspectedPlaza = selectedEntity?.kind === 'plaza' ? state.plaza : null;
  const inspectedBridge = selectedEntity?.kind === 'bridge' ? state.bridge : null;

  const inspectedAnimalOwnerName =
    inspectedAnimal && inspectedAnimal.ownerId !== null
      ? state.agents.find((a) => a.id === inspectedAnimal.ownerId)?.name ?? null
      : null;

  const inspectedAnimalRiderName =
    inspectedAnimal && inspectedAnimal.riderId !== null
      ? state.agents.find((a) => a.id === inspectedAnimal.riderId)?.name ?? null
      : null;

  const representativeAgent =
    state.representativeAgentId !== null
      ? state.agents.find((a) => a.id === state.representativeAgentId) ?? null
      : null;
  const representativeName = representativeAgent?.name ?? null;
  const representativeJob = representativeAgent?.job ?? null;

  const sickCount = state.agents.filter((a) => a.isSick).length;
  const totalCoins = getTotalCirculatingCoins(state);
  const operationalBuildingsCount = state.specialBuildings.filter((b) => b.isOperational).length;

  const useVerticalLayout =
    state.layoutMode === 'vertical' || (state.layoutMode === 'auto' && isVerticalAuto);

  function handleResetCamera() {
    cameraRef.current = { zoom: 1, panX: 0, panY: 0 };
    syncUI();
  }

  function screenToWorld(clientX: number, clientY: number): { x: number; y: number } | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const canvasX = (clientX - rect.left) * (CANVAS_WIDTH / rect.width);
    const canvasY = (clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
    const cam = cameraRef.current;
    return {
      x: (canvasX - CANVAS_WIDTH / 2 - cam.panX) / cam.zoom + CANVAS_WIDTH / 2,
      y: (canvasY - CANVAS_HEIGHT / 2 - cam.panY) / cam.zoom + CANVAS_HEIGHT / 2,
    };
  }

  function findAgentNear(x: number, y: number): Agent | null {
    let closest: Agent | null = null;
    let minDist = 22;
    for (const a of stateRef.current.agents) {
      const d = Math.hypot(a.x - x, a.y - y);
      if (d < minDist) {
        minDist = d;
        closest = a;
      }
    }
    return closest;
  }

  function findEntityAtWorld(s: SimulationState, x: number, y: number): SelectedEntity | null {
    const occupancy = getBuildingOccupancySnapshot(s);

    let bestBadge: { agentId: number; d: number } | null = null;
    for (const badge of occupancy.badges) {
      if (Math.abs(x - badge.x) <= 7 && Math.abs(y - badge.y) <= 7) {
        const d = Math.hypot(badge.x - x, badge.y - y);
        if (!bestBadge || d < bestBadge.d) bestBadge = { agentId: badge.agentId, d };
      }
    }
    if (bestBadge) return { kind: 'agent', id: bestBadge.agentId };

    let bestAgent: { id: number; d: number } | null = null;
    for (const a of s.agents) {
      if (occupancy.insideAgentIds.has(a.id)) continue;
      const d = Math.hypot(a.x - x, a.y - y);
      if (d < 20 && (!bestAgent || d < bestAgent.d)) bestAgent = { id: a.id, d };
    }
    if (bestAgent) return { kind: 'agent', id: bestAgent.id };

    let bestAnimal: { id: number; d: number } | null = null;
    for (const an of s.animals) {
      const d = Math.hypot(an.x - x, an.y - y);
      if (d < 20 && (!bestAnimal || d < bestAnimal.d)) bestAnimal = { id: an.id, d };
    }
    if (bestAnimal) return { kind: 'animal', id: bestAnimal.id };

    let bestSpecial: { id: number; d: number } | null = null;
    for (const b of s.specialBuildings) {
      const d = Math.hypot(b.x - x, b.y - y);
      if (d < 36 && (!bestSpecial || d < bestSpecial.d)) bestSpecial = { id: b.id, d };
    }
    if (bestSpecial) return { kind: 'special', id: bestSpecial.id };

    let bestHouse: { id: number; d: number } | null = null;
    for (const h of s.houses) {
      const radius = h.size === 'large' ? 34 : h.size === 'medium' ? 28 : 22;
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < radius && (!bestHouse || d < bestHouse.d)) bestHouse = { id: h.id, d };
    }
    if (bestHouse) return { kind: 'house', id: bestHouse.id };

    let bestFarm: { id: number; d: number } | null = null;
    for (const f of s.farms) {
      const radius = f.size === 'large' ? 36 : f.size === 'medium' ? 28 : 22;
      const d = Math.hypot(f.x - x, f.y - y);
      if (d < radius && (!bestFarm || d < bestFarm.d)) bestFarm = { id: f.id, d };
    }
    if (bestFarm) return { kind: 'farm', id: bestFarm.id };

    if (s.plaza && Math.hypot(s.plaza.x - x, s.plaza.y - y) < 58) {
      return { kind: 'plaza' };
    }

    if (
      s.bridge &&
      Math.abs(x - s.bridge.x) <= 38 &&
      y >= RIVER_TOP_Y - 8 &&
      y <= RIVER_BOTTOM_Y + 8
    ) {
      return { kind: 'bridge' };
    }

    return null;
  }

  function applyToolAtWorld(x: number, y: number) {
    const s = stateRef.current;

    if (s.tool === 'inspect') {
      const entity = findEntityAtWorld(s, x, y);
      s.selectedEntity = entity;
      s.selectedAgentId = entity?.kind === 'agent' ? entity.id : null;
      syncUI();
      return;
    }

    if ((s.interventionMode ?? 'intervention') === 'observer') {
      addLog(s, 'Modo Observador activo: solo se permite inspeccionar en el mapa.', 'sky');
      syncUI();
      return;
    }

    if (s.tool === 'add_road') {
      const tile = addRoadTile(s, x, y, s.selectedRoadType, s.selectedRoadLamp);
      if (tile) {
        syncUI();
      } else {
        const costText = formatResourceCost(getRoadTileCost(s.selectedRoadType, s.selectedRoadLamp));
        addLog(
          s,
          `No se pudo colocar camino aquí: verifica terreno y stock en Constructor/Depósito (${costText}).`,
          'amber'
        );
        syncUI();
      }
      return;
    }

    if (s.tool === 'kill_crop') {
      const removed = killCropPlotAt(s, x, y);
      if (!removed) {
        addLog(s, 'Hacé clic directamente sobre una parcela de cultivo para eliminarla.', 'slate');
      }
      syncUI();
      return;
    }

    if (s.tool === 'lightning_storm') {
      triggerLightningStorm(s);
      syncUI();
      return;
    }

    if (s.tool === 'start_fire') {
      spawnFire(s, x, y, 'Intervención divina');
      syncUI();
      return;
    }

    if (s.tool === 'knowledge') {
      s.knowledge += 20;
      addLog(s, 'Concediste +20 puntos de saber para la evolución de la aldea.', 'violet');
      syncUI();
      return;
    }

    if (s.tool === 'heal' || s.tool === 'infect' || s.tool === 'sterilize' || s.tool === 'kill') {
      const target = findAgentNear(x, y);
      if (!target) return;
      s.selectedAgentId = target.id;
      s.selectedEntity = { kind: 'agent', id: target.id };
      if (s.tool === 'heal') handleCure(target.id);
      if (s.tool === 'infect') handleInfect(target.id);
      if (s.tool === 'sterilize') handleToggleSterile(target.id);
      if (s.tool === 'kill') handleKill(target.id);
      return;
    }

    const spawned = spawnResource(s, s.tool, x, y);
    if (!spawned && s.resourcesPaused) {
      addLog(s, 'Entrega de recursos pausada: reanudá los recursos para agregar nodos.', 'amber');
    }
    syncUI();
  }

  function handleCanvasPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    isPointerOverMapRef.current = true;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignorar si no soporta pointer capture
    }

    if (stateRef.current.tool === 'add_road' && e.button === 0) {
      roadPaintingRef.current = true;
      const pt = screenToWorld(e.clientX, e.clientY);
      if (pt) {
        const s = stateRef.current;
        const tile = addRoadTile(s, pt.x, pt.y, s.selectedRoadType, s.selectedRoadLamp);
        if (!tile) {
          const costText = formatResourceCost(getRoadTileCost(s.selectedRoadType, s.selectedRoadLamp));
          addLog(
            s,
            `Tramo no colocado: requiere terreno válido y ${costText} en Constructor/Depósito.`,
            'amber'
          );
        }
        syncUI();
      }
      return;
    }

    if (e.button === 0 || e.button === 1 || e.button === 2) {
      panDragRef.current = {
        active: true,
        button: e.button,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: cameraRef.current.panX,
        startPanY: cameraRef.current.panY,
        moved: false,
      };
    }
  }

  function handleCanvasPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    isPointerOverMapRef.current = true;
    if (roadPaintingRef.current && stateRef.current.tool === 'add_road') {
      const pt = screenToWorld(e.clientX, e.clientY);
      if (pt) {
        const s = stateRef.current;
        const tile = addRoadTile(s, pt.x, pt.y, s.selectedRoadType, s.selectedRoadLamp);
        if (tile) syncUI();
      }
      return;
    }

    if (panDragRef.current.active) {
      if (e.buttons === 0) {
        panDragRef.current.active = false;
        setIsDraggingMap(false);
        return;
      }
      const dx = e.clientX - panDragRef.current.startClientX;
      const dy = e.clientY - panDragRef.current.startClientY;
      if (!panDragRef.current.moved && Math.hypot(dx, dy) > 4) {
        panDragRef.current.moved = true;
        setIsDraggingMap(true);
      }
      if (panDragRef.current.moved) {
        const canvas = canvasRef.current;
        if (canvas) {
          const rect = canvas.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const scaleX = CANVAS_WIDTH / rect.width;
            const scaleY = CANVAS_HEIGHT / rect.height;
            const clamped = clampPan(
              panDragRef.current.startPanX + dx * scaleX,
              panDragRef.current.startPanY + dy * scaleY,
              cameraRef.current.zoom
            );
            cameraRef.current.panX = clamped.panX;
            cameraRef.current.panY = clamped.panY;
            syncUI();
          }
        }
      }
    }
  }

  function handleCanvasPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignorar
    }

    if (roadPaintingRef.current) {
      roadPaintingRef.current = false;
      return;
    }

    if (panDragRef.current.active) {
      const { moved, button } = panDragRef.current;
      panDragRef.current.active = false;
      setIsDraggingMap(false);
      if (!moved && button === 0) {
        const pt = screenToWorld(e.clientX, e.clientY);
        if (pt) applyToolAtWorld(pt.x, pt.y);
      }
    }
  }

  function handleCanvasPointerCancel(e: React.PointerEvent<HTMLCanvasElement>) {
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignorar
    }
    roadPaintingRef.current = false;
    panDragRef.current.active = false;
    setIsDraggingMap(false);
  }

  function handleSetSpeed(speed: 0 | 1 | 2 | 4) {
    stateRef.current.speed = speed;
    syncUI();
  }

  function handleToggleResourcesPaused() {
    const s = stateRef.current;
    s.resourcesPaused = !s.resourcesPaused;
    addLog(
      s,
      s.resourcesPaused
        ? 'Se pausó por completo la entrega de recursos a la aldea.'
        : 'Se reanudó la entrega de recursos a la aldea.',
      s.resourcesPaused ? 'amber' : 'emerald'
    );
    syncUI();
  }

  function handleBuildBaseRoads() {
    const s = stateRef.current;
    const added = buildBaseRoads(s, s.selectedRoadType, s.selectedRoadLamp);
    if (added === 0) {
      const costText = formatResourceCost(getRoadTileCost(s.selectedRoadType, s.selectedRoadLamp));
      addLog(
        s,
        `Sin tramos nuevos: la red ya está cubierta o faltan materiales reales (${costText} por tramo).`,
        'amber'
      );
    }
    syncUI();
  }

  function handleSelectRoadType(roadType: RoadType) {
    stateRef.current.selectedRoadType = roadType;
    syncUI();
  }

  function handleToggleRoadLamp() {
    stateRef.current.selectedRoadLamp = !stateRef.current.selectedRoadLamp;
    syncUI();
  }

  function handleKillAllCrops() {
    killAllCrops(stateRef.current);
    syncUI();
  }

  function handleSpawnAnimal(animalType: AnimalType) {
    const s = stateRef.current;
    const animal = createAnimal(s, animalType);
    addLog(
      s,
      `Apareció ${ANIMAL_LABELS[animalType]} (${animal.name}) en el mapa.`,
      animal.hostile ? 'rose' : 'sky'
    );
    syncUI();
  }

  function handleToggleLaw(lawId: VillageLawId) {
    toggleVillageLaw(stateRef.current, lawId, undefined, 'Jugador');
    void saveStateToServer(true);
    syncUI();
  }

  function handleSummonPetition() {
    createVillagePetition(stateRef.current);
    syncUI();
  }

  function handleResolvePetition(wasHeard: boolean) {
    resolvePetition(stateRef.current, wasHeard);
    void saveStateToServer(true);
    syncUI();
  }

  function handleResolvePetitionWithQwen() {
    resolvePetitionWithQwen(stateRef.current);
    void saveStateToServer(true);
    syncUI();
  }

  function handleToggleQwenAutoRespond() {
    const s = stateRef.current;
    s.qwenAutoRespondPetitions = !s.qwenAutoRespondPetitions;
    addLog(
      s,
      s.qwenAutoRespondPetitions
        ? 'Qwen Responde activado: Qwen 2.5 responderá automáticamente las peticiones de cada 30 min.'
        : 'Qwen Responde desactivado: volverás a decidir manualmente las peticiones del Representante.',
      'violet'
    );
    if (s.qwenAutoRespondPetitions && s.pendingPetition) {
      resolvePetitionWithQwen(s);
    }
    void saveStateToServer(true);
    syncUI();
  }

  function handleTriggerLightningStorm() {
    triggerLightningStorm(stateRef.current);
    syncUI();
  }

  function handleSetLayout(mode: LayoutMode) {
    stateRef.current.layoutMode = mode;
    syncUI();
  }

  function handleChangeBiome(biome: BiomeType) {
    stateRef.current.biome = biome;
    syncUI();
  }

  function handleChangeWeather(weather: WeatherType) {
    stateRef.current.weather = weather;
    syncUI();
  }

  function handleSelectTool(tool: DivineTool) {
    stateRef.current.tool = tool;
    syncUI();
  }

  function handleGrantRequest() {
    const s = stateRef.current;
    if (s.resourcesPaused) return;
    for (let i = 0; i < 4; i++) {
      spawnResource(s, 'food', FOREST_MAX_X + 60 + Math.random() * 680, SAFE_LAND_MIN_Y + 40 + Math.random() * 480);
      spawnResource(s, 'wood', 40 + Math.random() * (FOREST_MAX_X - 60), SAFE_LAND_MIN_Y + 40 + Math.random() * 480);
    }
    s.knowledge += 12;
    addLog(s, 'Atendiste la necesidad colectiva con comida, madera del Bosque y +12 de saber.', 'emerald');
    syncUI();
  }

  function handleTrialAbundance() {
    const s = stateRef.current;
    if (s.resourcesPaused) return;
    for (let i = 0; i < 3; i++) {
      spawnResource(s, 'food', FOREST_MAX_X + 40 + Math.random() * 700, SAFE_LAND_MIN_Y + 24 + Math.random() * 620);
      spawnResource(s, 'wood', 40 + Math.random() * (FOREST_MAX_X - 60), SAFE_LAND_MIN_Y + 24 + Math.random() * 620);
      spawnResource(s, 'pine_wood', 40 + Math.random() * (FOREST_MAX_X - 60), SAFE_LAND_MIN_Y + 24 + Math.random() * 620);
      spawnResource(s, 'stone', MOUNTAIN_MIN_X + 20 + Math.random() * (CANVAS_WIDTH - MOUNTAIN_MIN_X - 50), SAFE_LAND_MIN_Y + 24 + Math.random() * 620);
      spawnResource(s, 'copper', MOUNTAIN_MIN_X + 20 + Math.random() * (CANVAS_WIDTH - MOUNTAIN_MIN_X - 50), SAFE_LAND_MIN_Y + 24 + Math.random() * 620);
      spawnResource(s, 'iron', MOUNTAIN_MIN_X + 20 + Math.random() * (CANVAS_WIDTH - MOUNTAIN_MIN_X - 50), SAFE_LAND_MIN_Y + 24 + Math.random() * 620);
      spawnResource(s, 'silver', MOUNTAIN_MIN_X + 20 + Math.random() * (CANVAS_WIDTH - MOUNTAIN_MIN_X - 50), SAFE_LAND_MIN_Y + 24 + Math.random() * 620);
      spawnResource(s, 'gold', MOUNTAIN_MIN_X + 20 + Math.random() * (CANVAS_WIDTH - MOUNTAIN_MIN_X - 50), SAFE_LAND_MIN_Y + 24 + Math.random() * 620);
    }
    addLog(s, 'Evento: Lluvia de recursos en Bosque y Montañas (Cobre, Hierro, Plata 🥈 y Oro 🥇).', 'emerald');
    syncUI();
  }

  function handleTrialScarcity() {
    const s = stateRef.current;
    s.weather = 'drought';
    for (const a of s.agents) {
      a.hunger = clamp(a.hunger + 22, 0, 100);
    }
    addLog(s, 'Evento: Ola de calor y sequía iniciada.', 'amber');
    syncUI();
  }

  function handleTrialPlague() {
    const s = stateRef.current;
    const healthy = s.agents.filter((a) => !a.isSick);
    const victims = healthy.slice(0, Math.max(2, Math.ceil(healthy.length * 0.25)));
    for (const v of victims) {
      infectAgent(s, v.id);
    }
    addLog(s, `Evento: Brote estacional afectó a ${victims.length} aldeano(s).`, 'rose');
    syncUI();
  }

  function handleCure(id: number) {
    const s = stateRef.current;
    const msg = cureAgent(s, id);
    const agent = s.agents.find((a) => a.id === id);
    if (msg && agent) {
      void queryOllamaThoughtForAgent(s, agent, msg);
    }
    syncUI();
  }

  function handleInfect(id: number) {
    const s = stateRef.current;
    const msg = infectAgent(s, id);
    const agent = s.agents.find((a) => a.id === id);
    if (msg && agent) {
      void queryOllamaThoughtForAgent(s, agent, `Acabo de enfermar de ${agent.illnessName}.`);
    }
    syncUI();
  }

  function handleToggleSterile(id: number) {
    const s = stateRef.current;
    const msg = toggleSterileAgent(s, id);
    const agent = s.agents.find((a) => a.id === id);
    if (msg && agent) {
      void queryOllamaThoughtForAgent(
        s,
        agent,
        agent.isSterile ? 'Me volvieron estéril / impotente.' : 'Recuperé mi fertilidad.'
      );
    }
    syncUI();
  }

  function handleKill(id: number) {
    killAgent(stateRef.current, id);
    syncUI();
  }

  function handleDeleteHouse(id: number) {
    deleteHouse(stateRef.current, id);
    syncUI();
  }

  function handleDeleteSpecial(id: number) {
    deleteSpecialBuilding(stateRef.current, id);
    syncUI();
  }

  function handleDeleteFarm(id: number) {
    deleteFarmPlotById(stateRef.current, id);
    syncUI();
  }

  function handleDeleteAnimal(id: number) {
    deleteAnimal(stateRef.current, id);
    syncUI();
  }

  function handleDeletePlaza() {
    deletePlaza(stateRef.current);
    syncUI();
  }

  function handleDeleteBridge() {
    deleteBridge(stateRef.current);
    syncUI();
  }

  function handleSelectAgentById(id: number) {
    stateRef.current.selectedAgentId = id;
    stateRef.current.selectedEntity = { kind: 'agent', id };
    syncUI();
  }

  function handleSwitchPartner(id: number) {
    const s = stateRef.current;
    const res = switchPartnerForAgent(s, id, 'decisión del aldeano');
    const agent = s.agents.find((a) => a.id === id);
    if (agent) {
      void queryOllamaThoughtForAgent(s, agent, res.message);
    }
    syncUI();
  }

  function handleStoreInHouse(id: number) {
    const s = stateRef.current;
    const agent = s.agents.find((a) => a.id === id);
    if (!agent || agent.houseId === null) return;
    const house = s.houses.find((h) => h.id === agent.houseId);
    if (!house) return;
    const depot = s.specialBuildings.find((b) => b.type === 'general_depot' && b.isOperational) ?? null;
    const moved = depositResourcesToHouse(agent, house, 'all', depot);
    if (moved > 0) {
      agent.lastQwenDecision = `Qwen 2.5 guardó ${moved} bienes en ${house.name}${depot ? ` y ${depot.name}` : ''}.`;
      agent.thought = `Guardé alimento y monedas en ${house.name}.`;
      addLog(s, `${agent.name} guardó ${moved} recurso(s) entre ${house.name} y el Depósito.`, 'emerald');
    } else {
      addLog(s, `${agent.name} no tenía excedentes permitidos para guardar.`, 'slate');
    }
    syncUI();
  }

  function handleHighlightFamily(id: number | null) {
    stateRef.current.highlightFamilyAgentId = id;
    syncUI();
  }

  function handleModifyResource(id: number, resource: keyof ResourceInventory | 'coins', delta: number) {
    const s = stateRef.current;
    const msg = modifyAgentResource(s, id, resource, delta);
    const agent = s.agents.find((a) => a.id === id);
    if (msg && agent) {
      void queryOllamaThoughtForAgent(s, agent, msg).then(() => syncUI());
    }
    syncUI();
  }

  function handleModifyKnowledge(id: number, delta: number) {
    const s = stateRef.current;
    const msg = modifyAgentKnowledge(s, id, delta, 'general');
    const agent = s.agents.find((a) => a.id === id);
    if (msg && agent) {
      void queryOllamaThoughtForAgent(s, agent, msg).then(() => syncUI());
    }
    syncUI();
  }

  function handleCraftTools(id: number) {
    const s = stateRef.current;
    const agent = s.agents.find((a) => a.id === id);
    if (!agent) return;
    const ok = craftToolsForAgent(s, agent);
    if (!ok) {
      addLog(
        s,
        `${agent.name} necesita 36%+ Saber, 1 Cobre y 1 Hierro (propios o en Depósito General) para forjar herramienta.`,
        'amber'
      );
    }
    syncUI();
  }

  function handleModifyHouseStorage(houseId: number, key: keyof HouseStorage, delta: number) {
    modifyHouseStorage(stateRef.current, houseId, key, delta, true);
    syncUI();
  }

  function handleModifySpecialStorage(buildingId: number, key: keyof HouseStorage, delta: number) {
    modifySpecialBuildingStorage(stateRef.current, buildingId, key, delta);
    syncUI();
  }

  async function handleSendQwenDirective(text: string) {
    soundEngine.unlock();
    soundEngine.playEvent('chatter');
    const s = stateRef.current;
    const badge = getAIProviderBadge(s.aiConfig, s.ollama);
    s.qwenMessages.push({
      id: s.nextId++,
      role: 'user',
      text: String(text),
      source: badge.modality === 'cloud' ? 'cloud' : badge.modality === 'none' ? 'none' : s.ollama.enabled ? 'ollama' : 'local',
    });
    setIsQwenBusy(true);
    syncUI();

    try {
      const response = await askQwenAssistant(s, text);
      s.qwenMessages.push({
        id: s.nextId++,
        role: 'qwen',
        text: typeof response.reply === 'string' ? response.reply : 'Orden procesada en la aldea.',
        appliedRules: Array.isArray(response.appliedRules) ? response.appliedRules : [],
        source: response.source,
        providerLabel: response.providerLabel,
      });
      if (s.qwenMessages.length > 35) {
        s.qwenMessages = s.qwenMessages.slice(-35);
      }
      void saveStateToServer(true);
    } catch {
      s.qwenMessages.push({
        id: s.nextId++,
        role: 'qwen',
        text: 'Se protegió el sistema ante una respuesta inesperada; la aldea continúa funcionando.',
        appliedRules: [],
        source: 'local',
      });
    } finally {
      setIsQwenBusy(false);
      syncUI();
    }
  }

  function handleSaveOllama(nextOllama: OllamaConfig, nextAIConfig: AIProviderConfig) {
    const s = stateRef.current;
    s.aiConfig = nextAIConfig;
    s.ollama = nextOllama;
    syncLegacyOllamaFromAIConfig(s);
    const badge = getAIProviderBadge(s.aiConfig, s.ollama);
    addLog(s, `Motor de IA actualizado: ${badge.label}.`, 'sky');
    setIsOllamaOpen(false);
    void saveStateToServer(true);
    syncUI();
  }

  function handleSetInterventionMode(mode: InterventionMode) {
    const s = stateRef.current;
    s.interventionMode = mode;
    if (mode === 'observer') {
      s.tool = 'inspect';
    }
    addLog(
      s,
      mode === 'observer'
        ? 'Modo Observador activado: evolución autónoma pura sin intervenciones manuales.'
        : mode === 'advanced'
          ? 'Modo Intervención Avanzada activado: control directo total habilitado.'
          : 'Modo Intervención estándar activado.',
      'violet'
    );
    syncUI();
  }

  function handleUpdateMultipliers(patch: Partial<DivineMultipliers>) {
    const s = stateRef.current;
    ensureCivilizationDefaults(s);
    s.divineMultipliers = { ...s.divineMultipliers!, ...patch };
    syncUI();
  }

  function handleDivineSpawnVillagers(count: number) {
    divineSpawnVillager(stateRef.current, count);
    syncUI();
  }

  function handleDivineRepairAll() {
    divineRepairAllStructures(stateRef.current);
    syncUI();
  }

  function handleDivineCompleteConstructions() {
    const s = stateRef.current;
    let completed = 0;
    for (const a of s.agents) {
      if (a.activeConstruction) {
        a.activeConstruction.elapsed = a.activeConstruction.totalDuration;
        if (completeActiveConstruction(s, a)) {
          completed++;
        }
      }
    }
    if (completed > 0) {
      trackDivineIntervention(s, 'instantBuildings', completed, `Intervención Divina completó ${completed} obra(s) al instante.`);
      addLog(s, `Intervención Divina: ${completed} obra(s) completada(s) al instante.`, 'violet');
    }
    syncUI();
  }

  function handleDivineTriggerEvent(kind: 'frost' | 'flood' | 'blight' | 'abundance') {
    divineTriggerEvent(stateRef.current, kind);
    syncUI();
  }

  function handleDivineAdjustTax(taxPct: number) {
    divineAdjustTaxRate(stateRef.current, taxPct);
    syncUI();
  }

  function handleDivineForceSeason(season: SeasonType) {
    divineForceSeason(stateRef.current, season);
    syncUI();
  }

  function handleDivineGrantKnowledge(delta: number) {
    divineGrantGlobalKnowledge(stateRef.current, delta);
    syncUI();
  }

  function handleDivineChangeAge(id: number, deltaYears: number) {
    const s = stateRef.current;
    const agent = s.agents.find((a) => a.id === id);
    if (!agent) return;
    agent.ageYears = clamp(agent.ageYears + deltaYears, 1, 99);
    agent.isChild = agent.ageYears <= 5;
    agent.isElder = agent.ageYears >= 60;
    agent.isRetired = agent.ageYears >= 65;
    addLog(s, `Intervención Divina ajustó la edad de ${agent.name} a ${agent.ageYears} años.`, 'violet');
    syncUI();
  }

  function handleDivineChangeJob(id: number, job: JobType) {
    const s = stateRef.current;
    const agent = s.agents.find((a) => a.id === id);
    if (!agent) return;
    agent.job = job;
    syncSpecialBuildingStaff(s);
    addLog(s, `Intervención Divina asignó a ${agent.name} el oficio de ${job}.`, 'violet');
    syncUI();
  }

  function handleExternalTrade(
    communityId: string,
    kind: 'import' | 'export' | 'knowledge',
    good: TradeGoodKey,
    amount: number
  ) {
    executeExternalTrade(stateRef.current, communityId, kind, good, amount);
    void saveStateToServer(true);
    syncUI();
  }

  async function handleRequestDiplomacyAdvice() {
    const s = stateRef.current;
    const fallback = buildDiplomaticProposalSummary(s);
    const cfg = ensureAIConfig(s);
    if (cfg.modality === 'none' || cfg.status === 'disabled') {
      setDiplomacyAdvice(
        fallback
          ? `Consejo automático (${fallback.communityName}): ${fallback.recommendedKind === 'import' ? 'Importar' : fallback.recommendedKind === 'export' ? 'Exportar' : 'Intercambiar saber'} (${TRADE_GOOD_LABELS[fallback.good]}). ${fallback.rationale}`
          : 'No hay comunidades contactadas aún; seguí explorando o construí Muelle/Mercado.'
      );
      return;
    }

    setIsDiplomacyAdvisorBusy(true);
    try {
      const commsSummary = (s.externalCommunities ?? [])
        .map((c) => `${c.name} (${c.relation}, confianza ${c.trust}%, necesita ${c.needs.join('/')})`)
        .join('; ');
      const res = await queryAIProvider(cfg, {
        systemPrompt:
          'Sos el consejero diplomático de Aldea IA. Responde en español en máximo 2 oraciones concretas recomendando comercio o intercambio cultural pacífico.',
        userPrompt: `Día ${s.day}, Era ${s.era}, Población ${s.agents.length}. Comunidades: ${commsSummary}.`,
      });
      if (res.ok && res.text.trim()) {
        setDiplomacyAdvice(res.text.trim());
      } else {
        setDiplomacyAdvice(
          fallback
            ? `Consejo local (${fallback.communityName}): ${fallback.rationale}`
            : 'Mantené relaciones comerciales pacíficas según existencias reales.'
        );
      }
    } catch {
      setDiplomacyAdvice(
        fallback
          ? `Consejo local (${fallback.communityName}): ${fallback.rationale}`
          : 'Mantené intercambios graduales con comunidades vecinas.'
      );
    } finally {
      setIsDiplomacyAdvisorBusy(false);
    }
  }

  function handleDivineModifyDiplomacy(communityId: string, relation: DiplomaticRelation) {
    divineModifyDiplomacy(stateRef.current, communityId, relation);
    syncUI();
  }

  function handleDivineSparkFestival() {
    divineSparkTraditionOrFestival(stateRef.current);
    syncUI();
  }

  function handleDivineAccelerateDiscovery() {
    divineAccelerateDiscovery(stateRef.current);
    syncUI();
  }

  function handleDivineMitigateCrises() {
    divineResolveAllCrises(stateRef.current);
    syncUI();
  }

  function handleDivineAdjustSociety(target: 'happiness' | 'trust' | 'security', delta: number) {
    divineAdjustSocietyIndicator(stateRef.current, target, delta);
    syncUI();
  }

  function handleDivineAidFamily(familyId?: string) {
    divineAidFamily(stateRef.current, familyId);
    syncUI();
  }

  function handleSaveLocal() {
    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(stateRef.current));
      addLog(stateRef.current, 'Partida guardada en el navegador.', 'sky');
      syncUI();
    } catch {
      // Ignore storage quota errors
    }
  }

  async function handleResetVillage() {
    setIsResetConfirmOpen(false);
    stateRef.current = createInitialState();
    cameraRef.current = { zoom: 1, panX: 0, panY: 0 };
    try {
      localStorage.removeItem(SAVE_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
    setServerSyncStatus('Reiniciada desde cero');
    syncUI();
    try {
      await fetch('/api/state', { method: 'DELETE' });
    } catch {
      // Ignore network errors
    }
  }

  function handleLoadFromJson(jsonText: string) {
    try {
      const parsed = JSON.parse(jsonText) as Partial<SimulationState>;
      if (parsed && Array.isArray(parsed.agents) && Array.isArray(parsed.houses)) {
        stateRef.current = hydrateSimulationState(parsed);
        addLog(stateRef.current, 'Partida cargada correctamente.', 'emerald');
        void saveStateToServer(true);
        syncUI();
      }
    } catch {
      addLog(stateRef.current, 'Archivo de partida inválido.', 'rose');
      syncUI();
    }
  }

  function handleLoadLocal() {
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (raw) handleLoadFromJson(raw);
    } catch {
      // Ignore storage errors
    }
  }

  function handleExportJson() {
    const data = JSON.stringify(stateRef.current, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aldea-ia-dia-${stateRef.current.day}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  ensureCivilizationDefaults(state);
  ensureAllExpansionDefaults(state);
  const aiConfig = ensureAIConfig(state);
  const aiBadge = getAIProviderBadge(aiConfig, state.ollama);
  const activeConstructionsCount = state.agents.filter((a) => Boolean(a.activeConstruction)).length;
  const activeCrisesCount = state.crisisMonitor?.activeCrises.length ?? 0;
  const selectedLineageSurname = selectedAgent?.familyId
    ? state.familyLineages?.find((l) => l.id === selectedAgent.familyId)?.surname ?? null
    : null;
  const selectedKnownDiscoveryNames = selectedAgent
    ? Array.from(
        new Set([...(selectedAgent.discoveriesAuthored ?? []), ...(selectedAgent.knownDiscoveries ?? [])])
      )
        .map((id) => DISCOVERY_CATALOG.find((bp) => bp.id === id)?.name ?? id)
        .filter(Boolean)
    : [];

  const savedSummary = readSavedSummary();
  const petition = state.pendingPetition;

  return (
    <div
      className={`flex flex-col bg-[#0b1120] text-slate-100 ${
        useVerticalLayout ? 'min-h-screen' : 'h-screen overflow-hidden'
      }`}
    >
      <TopBar
        snapshot={{
          day: state.day,
          minute: state.minute,
          season: state.season,
          population: state.agents.length,
          sickCount,
          firesCount: state.fires.length,
          housesCount: state.houses.length,
          totalCoins,
          economyReserve: state.economyReserve,
          knowledge: state.knowledge,
          era: state.era,
          speed: state.speed,
          resourcesPaused: state.resourcesPaused,
          layoutMode: state.layoutMode,
          ollamaEnabled: state.ollama.enabled,
          ollamaModel: state.ollama.model,
          aiBadgeLabel: aiBadge.shortLabel,
          aiStatus: aiBadge.status,
          interventionMode: state.interventionMode ?? 'intervention',
          soundEnabled,
          soundVolume,
        }}
        onSetSpeed={handleSetSpeed}
        onToggleResourcesPaused={handleToggleResourcesPaused}
        onToggleSound={handleToggleSound}
        onChangeSoundVolume={handleChangeSoundVolume}
        onSetLayout={handleSetLayout}
        onOpenStats={() => setIsStatsOpen(true)}
        onOpenFamilies={() => setIsFamiliesOpen(true)}
        onOpenCivilization={() => setIsCivilizationOpen(true)}
        activeCrisesCount={activeCrisesCount}
        onOpenSaveLoad={() => setIsSaveLoadOpen(true)}
        onOpenDownload={() => setIsDownloadOpen(true)}
        onRequestReset={() => setIsResetConfirmOpen(true)}
        onOpenOllama={() => setIsOllamaOpen(true)}
      />

      <main
        className={`flex-1 p-3 gap-3 grid min-h-0 ${
          useVerticalLayout
            ? 'grid-cols-1 md:grid-cols-2 grid-rows-[minmax(380px,54vh)_auto]'
            : panelWidthPreset === 'max'
              ? 'grid-cols-[clamp(370px,32vw,520px)_minmax(240px,1fr)_clamp(400px,34vw,560px)] overflow-hidden'
              : panelWidthPreset === 'wide'
                ? 'grid-cols-[clamp(335px,28vw,450px)_minmax(280px,1fr)_clamp(370px,30vw,490px)] overflow-hidden'
                : 'grid-cols-[clamp(300px,23vw,375px)_minmax(320px,1fr)_clamp(340px,25vw,415px)] overflow-hidden'
        }`}
      >
        <section
          className={`bg-[#050914] border border-slate-800 rounded-xl overflow-hidden flex flex-col min-w-0 min-h-0 ${
            useVerticalLayout ? 'md:col-span-2 order-1' : 'order-2 h-full'
          }`}
        >
          <div className="flex-1 flex items-center justify-center relative min-w-0 min-h-0 p-2 overflow-hidden">
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onPointerEnter={() => {
                isPointerOverMapRef.current = true;
              }}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerCancel}
              onContextMenu={(e) => e.preventDefault()}
              onPointerLeave={() => {
                isPointerOverMapRef.current = false;
                roadPaintingRef.current = false;
              }}
              data-testid="world-canvas"
              className={`pixel-canvas max-w-full max-h-full aspect-[3/2] rounded-lg touch-none ${
                isDraggingMap
                  ? 'cursor-grabbing'
                  : state.tool === 'inspect'
                    ? 'cursor-grab'
                    : 'cursor-crosshair'
              }`}
            />

            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-[#111827]/95 border border-slate-700 rounded-lg px-2 py-1 text-xs">
              <span
                className="text-[11px] font-mono tabular-nums text-slate-200"
                data-testid="zoom-level"
                title="Rueda del mouse: Zoom · Arrastrar con el mouse o Flechas: Mover el mapa"
              >
                {Math.round(camera.zoom * 100)}%
              </span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">
                Rueda: Zoom · Arrastrar/Flechas: Mover
              </span>
              {(camera.zoom !== 1 || camera.panX !== 0 || camera.panY !== 0) && (
                <button
                  type="button"
                  onClick={handleResetCamera}
                  className="px-1.5 h-5 rounded bg-[#0b1120] hover:bg-slate-800 text-[10px] text-slate-300 transition-colors whitespace-nowrap"
                >
                  Centrar
                </button>
              )}
            </div>
          </div>
          <div className="bg-[#111827] border-t border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 shrink-0">
            <span>
              Herramienta: <strong className="text-slate-200">{TOOL_LABELS[state.tool]}</strong>
              {' · '}
              <span className={state.resourcesPaused ? 'text-amber-300 font-semibold' : 'text-emerald-400'}>
                {state.resourcesPaused ? 'Recursos pausados' : 'Recursos activos'}
              </span>
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {!useVerticalLayout && (
                <div
                  className="flex items-center gap-1 bg-[#0b1120] border border-slate-800 rounded-md p-0.5"
                  role="group"
                  aria-label="Ancho de paneles laterales"
                  data-testid="panel-width-controls"
                >
                  <span className="text-[10px] text-slate-400 px-1.5">Paneles:</span>
                  {(
                    [
                      { id: 'normal', label: 'Normal' },
                      { id: 'wide', label: 'Amplio' },
                      { id: 'max', label: 'Máx' },
                    ] as const
                  ).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      data-testid={`panel-width-${preset.id}`}
                      aria-pressed={panelWidthPreset === preset.id}
                      onClick={() => setPanelWidthPreset(preset.id)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                        panelWidthPreset === preset.id
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              )}
              <span>
                Obras: <strong className="text-slate-200">{operationalBuildingsCount}/{state.specialBuildings.length}</strong> · Cultivos:{' '}
                <strong className="text-slate-200">{state.farms.length}</strong> · Caminos:{' '}
                <strong className="text-slate-200">{state.roads.length}</strong> · Fauna:{' '}
                <strong className="text-slate-200">{state.animals.length}</strong>
              </span>
            </div>
          </div>
        </section>

        <aside
          className={`flex flex-col gap-2.5 min-h-0 overflow-y-auto pr-0.5 ${
            useVerticalLayout ? 'order-2' : 'order-1 h-full'
          }`}
        >
          <QwenConsole
            messages={state.qwenMessages}
            policies={state.policies}
            ollamaEnabled={state.ollama.enabled}
            ollamaModel={state.ollama.model}
            aiBadgeLabel={aiBadge.shortLabel}
            aiStatus={aiBadge.status}
            isBusy={isQwenBusy}
            representativeName={representativeName}
            representativeJob={representativeJob}
            representativeGoal={state.representativeGoal ?? null}
            representativeGoals={state.representativeGoals}
            onSendDirective={handleSendQwenDirective}
          />
          <WorldControlsPanel
            biome={state.biome}
            weather={state.weather}
            season={state.season}
            tool={state.tool}
            selectedRoadType={state.selectedRoadType}
            selectedRoadLamp={state.selectedRoadLamp}
            resourcesPaused={state.resourcesPaused}
            farmsCount={state.farms.length}
            roadsCount={state.roads.length}
            animalsCount={state.animals.length}
            firesCount={state.fires.length}
            loansCount={state.loans.length}
            activeConstructionsCount={activeConstructionsCount}
            riverFishStock={state.riverFishStock}
            riverFishMaxStock={state.riverFishMaxStock}
            riverFishRestTimer={state.riverFishRestTimer}
            economyReserve={state.economyReserve}
            operationalBuildingsCount={operationalBuildingsCount}
            totalSpecialBuildingsCount={state.specialBuildings.length}
            laws={state.laws}
            representativeName={representativeName}
            representativeGoals={state.representativeGoals}
            petitionTimerSec={state.petitionTimerSec}
            qwenAutoRespondPetitions={state.qwenAutoRespondPetitions}
            collectiveHint={computeCollectiveHint(state)}
            resourceLedger={state.resourceLedger}
            interventionMode={state.interventionMode ?? 'intervention'}
            divineMultipliers={state.divineMultipliers!}
            marketPrices={state.marketPrices!}
            politics={state.politics!}
            ecosystemHealth={state.ecosystemHealth ?? 85}
            activeDisaster={state.activeDisaster}
            onChangeBiome={handleChangeBiome}
            onChangeWeather={handleChangeWeather}
            onSelectTool={handleSelectTool}
            onSelectRoadType={handleSelectRoadType}
            onToggleRoadLamp={handleToggleRoadLamp}
            onToggleResourcesPaused={handleToggleResourcesPaused}
            onBuildBaseRoads={handleBuildBaseRoads}
            onKillAllCrops={handleKillAllCrops}
            onSpawnAnimal={handleSpawnAnimal}
            onToggleLaw={handleToggleLaw}
            onSummonPetition={handleSummonPetition}
            onToggleQwenAutoRespond={handleToggleQwenAutoRespond}
            onTriggerLightningStorm={handleTriggerLightningStorm}
            onGrantRequest={handleGrantRequest}
            onTrialAbundance={handleTrialAbundance}
            onTrialScarcity={handleTrialScarcity}
            onTrialPlague={handleTrialPlague}
            onSetInterventionMode={handleSetInterventionMode}
            onUpdateMultipliers={handleUpdateMultipliers}
            onDivineSpawnVillagers={handleDivineSpawnVillagers}
            onDivineRepairAll={handleDivineRepairAll}
            onDivineCompleteConstructions={handleDivineCompleteConstructions}
            onDivineTriggerEvent={handleDivineTriggerEvent}
            onDivineAdjustTax={handleDivineAdjustTax}
            onDivineForceSeason={handleDivineForceSeason}
            onDivineGrantKnowledge={handleDivineGrantKnowledge}
            qualityOfLife={state.societyIndicators?.qualityOfLife ?? 70}
            activeCrisesCount={activeCrisesCount}
            onDivineAccelerateDiscovery={handleDivineAccelerateDiscovery}
            onDivineSparkFestival={handleDivineSparkFestival}
            onDivineMitigateCrises={handleDivineMitigateCrises}
            onDivineAdjustSociety={handleDivineAdjustSociety}
            onDivineAidTopFamily={() => handleDivineAidFamily()}
          />
        </aside>

        <aside
          className={`flex flex-col gap-2.5 min-h-0 overflow-y-auto pr-0.5 ${
            useVerticalLayout ? 'order-3' : 'order-3 h-full'
          }`}
        >
          <VillagerInspector
            selectedEntity={state.selectedEntity}
            agent={selectedAgent}
            partnerName={selectedPartnerName}
            mentorName={selectedMentorName}
            agentHouse={selectedAgentHouse}
            inspectedHouse={inspectedHouse}
            inspectedHouseResidents={inspectedHouseResidents}
            inspectedSpecial={inspectedSpecial}
            inspectedSpecialOwnerName={inspectedSpecialOwnerName}
            inspectedSpecialStaff={inspectedSpecialStaff}
            inspectedFarm={inspectedFarm}
            inspectedAnimal={inspectedAnimal}
            inspectedPlaza={inspectedPlaza}
            inspectedBridge={inspectedBridge}
            inspectedAnimalOwnerName={inspectedAnimalOwnerName}
            inspectedAnimalRiderName={inspectedAnimalRiderName}
            populationCount={state.agents.length}
            sickCount={sickCount}
            highlightedFamilyId={state.highlightFamilyAgentId}
            interventionMode={state.interventionMode ?? 'intervention'}
            onSelectFirstAgent={() => {
              const first = stateRef.current.agents[0];
              if (first) {
                stateRef.current.selectedAgentId = first.id;
                stateRef.current.selectedEntity = { kind: 'agent', id: first.id };
                syncUI();
              }
            }}
            onSelectAgent={handleSelectAgentById}
            onCure={handleCure}
            onInfect={handleInfect}
            onToggleSterile={handleToggleSterile}
            onKill={handleKill}
            onSwitchPartner={handleSwitchPartner}
            onStoreInHouse={handleStoreInHouse}
            onHighlightFamily={handleHighlightFamily}
            onModifyResource={handleModifyResource}
            onModifyKnowledge={handleModifyKnowledge}
            onCraftTools={handleCraftTools}
            onModifyHouseStorage={handleModifyHouseStorage}
            onModifySpecialStorage={handleModifySpecialStorage}
            onDeleteHouse={handleDeleteHouse}
            onDeleteSpecial={handleDeleteSpecial}
            onDeleteFarm={handleDeleteFarm}
            onDeleteAnimal={handleDeleteAnimal}
            onDeletePlaza={handleDeletePlaza}
            onDeleteBridge={handleDeleteBridge}
            onDivineChangeAge={handleDivineChangeAge}
            onDivineChangeJob={handleDivineChangeJob}
            lineageSurname={selectedLineageSurname}
            knownDiscoveryNames={selectedKnownDiscoveryNames}
          />
          <EventLogPanel logs={state.logs} chronicleArchive={state.chronicleArchive ?? []} />
        </aside>
      </main>

      {/* Modal de Petición del Representante ("Intervención Divina") cada 30m */}
      {petition && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="petition-modal-title"
          data-testid="petition-modal"
        >
          <div className="bg-[#111827] border border-violet-600/80 rounded-xl p-5 w-full max-w-md flex flex-col gap-3.5 shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-violet-300">
                  Intervención Divina ·{' '}
                  {petition.kind === 'queja' ? 'Queja' : petition.kind === 'consulta' ? 'Consulta' : 'Petición'}
                </span>
                <h2 id="petition-modal-title" className="text-base font-bold text-slate-50 mt-0.5">
                  {petition.title}
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-400">Día {petition.createdDay}</span>
            </div>

            <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 text-xs text-slate-200 leading-relaxed flex flex-col gap-2">
              <div className="text-[11px] text-violet-300 font-semibold">
                Representante electo: {petition.representativeName}
              </div>
              <p>{petition.message}</p>
              {petition.effectSummary && (
                <div
                  data-testid="petition-effect-summary"
                  className="text-[11px] text-emerald-300/90 border-t border-slate-800 pt-1.5"
                >
                  {petition.effectSummary}
                </div>
              )}
              {petition.isNegative && (
                <div className="text-[11px] text-amber-300 border-t border-slate-800 pt-1.5">
                  Advertencia de Qwen 2.5: Esta propuesta es riesgosa; escucharla tendría un efecto negativo en el bienestar de la aldea.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                data-testid="petition-heard-btn"
                onClick={() => handleResolvePetition(true)}
                className="py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
              >
                Fue Escuchado
              </button>
              <button
                type="button"
                data-testid="petition-ignored-btn"
                onClick={() => handleResolvePetition(false)}
                className="py-2.5 px-3 rounded-lg bg-rose-900/80 hover:bg-rose-800 border border-rose-700 text-rose-100 text-xs font-semibold transition-colors"
              >
                No fue Escuchado
              </button>
            </div>

            <button
              type="button"
              data-testid="petition-qwen-respond-btn"
              onClick={handleResolvePetitionWithQwen}
              className="w-full py-2 px-3 rounded-lg bg-violet-700 hover:bg-violet-600 border border-violet-500 text-white text-xs font-semibold transition-colors"
            >
              Qwen Responde (decidir con criterio de Qwen 2.5)
            </button>

            <label className="flex items-center gap-2 text-[11px] text-slate-300 bg-[#0b1120] border border-slate-800 rounded-lg px-2.5 py-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={state.qwenAutoRespondPetitions}
                onChange={handleToggleQwenAutoRespond}
                className="rounded border-slate-600 bg-slate-900 text-violet-500 focus:ring-violet-500"
              />
              <span>Activar &quot;Qwen Responde&quot; automático para los próximos mensajes (30m)</span>
            </label>
          </div>
        </div>
      )}

      {isStatsOpen && (
        <StatsModal
          history={state.history}
          evolutionStats={state.evolutionStats!}
          milestones={state.milestones!}
          politics={state.politics!}
          marketPrices={state.marketPrices!}
          ecosystemHealth={state.ecosystemHealth ?? 85}
          onClose={() => setIsStatsOpen(false)}
        />
      )}

      {isFamiliesOpen && (
        <FamiliasModal
          agents={state.agents}
          houses={state.houses}
          animals={state.animals}
          familyLineages={state.familyLineages ?? []}
          historicalFigures={state.historicalFigures ?? []}
          interventionMode={state.interventionMode ?? 'intervention'}
          highlightedAgentId={state.highlightFamilyAgentId}
          onHighlightFamily={handleHighlightFamily}
          onSelectAgent={(id) => {
            stateRef.current.selectedAgentId = id;
            stateRef.current.selectedEntity = { kind: 'agent', id };
            setIsFamiliesOpen(false);
            syncUI();
          }}
          onDivineAidFamily={handleDivineAidFamily}
          onClose={() => setIsFamiliesOpen(false)}
        />
      )}

      {isCivilizationOpen && (
        <CivilizationModal
          state={state}
          isDiplomacyAdvisorBusy={isDiplomacyAdvisorBusy}
          diplomacyAdvice={diplomacyAdvice}
          onExternalTrade={handleExternalTrade}
          onRequestDiplomacyAdvice={() => void handleRequestDiplomacyAdvice()}
          onDivineModifyDiplomacy={handleDivineModifyDiplomacy}
          onDivineSparkFestival={handleDivineSparkFestival}
          onDivineAccelerateDiscovery={handleDivineAccelerateDiscovery}
          onDivineMitigateCrises={handleDivineMitigateCrises}
          onSelectAgent={(id) => {
            stateRef.current.selectedAgentId = id;
            stateRef.current.selectedEntity = { kind: 'agent', id };
            syncUI();
          }}
          onClose={() => setIsCivilizationOpen(false)}
        />
      )}

      {isSaveLoadOpen && (
        <SaveLoadModal
          hasSavedLocal={savedSummary.exists}
          savedInfo={savedSummary.info}
          serverSyncStatus={serverSyncStatus}
          onSaveLocal={handleSaveLocal}
          onLoadLocal={handleLoadLocal}
          onSaveServer={() => saveStateToServer(true)}
          onResetVillage={handleResetVillage}
          onExportJson={handleExportJson}
          onImportJson={handleLoadFromJson}
          onClose={() => setIsSaveLoadOpen(false)}
        />
      )}

      {isDownloadOpen && (
        <DownloadLocalModal onClose={() => setIsDownloadOpen(false)} />
      )}

      {isOllamaOpen && (
        <OllamaModal
          config={state.ollama}
          aiConfig={aiConfig}
          onSave={handleSaveOllama}
          onClose={() => setIsOllamaOpen(false)}
        />
      )}

      {isResetConfirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-confirm-title"
          data-testid="reset-confirm-modal"
        >
          <div className="bg-[#111827] border border-rose-700/80 rounded-xl p-5 w-full max-w-md flex flex-col gap-3.5 shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div>
                <span className="text-[11px] uppercase tracking-wider font-semibold text-rose-400">
                  Advertencia
                </span>
                <h2 id="reset-confirm-title" className="text-base font-bold text-slate-50 mt-0.5">
                  ¿Reiniciar toda la aldea?
                </h2>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Si continuás, <strong className="text-rose-300">todo se va a borrar</strong> (casas, edificios, cultivos,
              caminos, crónicas, reservas y progreso) y la aldea volverá al inicio de los tiempos como si empezara de cero.
              ¿Querés seguir?
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                data-testid="reset-cancel-btn"
                onClick={() => setIsResetConfirmOpen(false)}
                className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                data-testid="reset-accept-btn"
                onClick={() => void handleResetVillage()}
                className="py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import type {
  ActiveConstruction,
  Agent,
  Animal,
  AnimalType,
  BankLoan,
  BiomeType,
  BridgeStructure,
  BuildingOccupantBadge,
  ConstructionOperationType,
  DaySnapshot,
  DiseaseId,
  DiseaseInfo,
  EmotionType,
  EraId,
  FarmPlot,
  FireHazard,
  FishVariant,
  House,
  HouseStorage,
  JobMasteryTier,
  JobType,
  LogEntry,
  MaintenanceStatus,
  PetitionEffectType,
  QwenAction,
  QwenPolicyState,
  ResourceCostMap,
  ResourceInventory,
  ResourceNode,
  ResourceOperationRecord,
  RoadTile,
  RoadType,
  SeasonType,
  SimulationState,
  SkillDefinition,
  SoundCue,
  SpecialBuilding,
  SpecialBuildingType,
  TaskType,
  TradeGoodKey,
  VillageLaw,
  VillageLawId,
  VillagePetition,
  WeatherType,
  WoodGrade,
} from '../types/simulation';
import { dispatchQwenActionExtension, emitSimEvent } from './eventBus';
import {
  applyGenerationAptitude,
  applyRetirementAndAgingModifiers,
  archiveChronicleEvent,
  ensureCivilizationDefaults,
  evaluateMilestones,
  inheritTraitsFromParents,
  recordAgentMemory,
  trackNaturalProgress,
  updateDynamicMarketPrices,
  updateEcosystemHealth,
  updateRepresentativeThreeTierGoals,
  updateVillagePolitics,
} from './civilizationSystems';
import {
  BRIDGE_COSTS,
  FARM_COSTS,
  HOUSE_CONSTRUCTION_COSTS,
  HOUSE_MAINTENANCE_COSTS,
  HOUSE_REPAIR_COSTS,
  HOUSE_UPGRADE_COSTS,
  MAINTENANCE_CYCLE_DAYS,
  PLAZA_COSTS,
  PRODUCTION_INPUT_COSTS,
  PROGRESSIVE_WEAR_THRESHOLDS,
  RESOURCE_DISPLAY_NAMES,
  ROAD_COSTS,
  SPECIAL_BUILDING_COSTS,
  SPECIAL_BUILDING_REPAIR_COSTS,
  formatResourceCost,
  getFarmCost,
  getHouseBuildCost,
  getHouseMaintenanceCost,
  getHouseRepairCost,
  getHouseUpgradeCost,
  getMaintenanceStatusFromUnpaidDays,
  getMaintenanceStatusLabel,
  getRoadMaintenanceCost,
  getRoadRepairCost,
  getRoadTileCost,
  getSpecialBuildingCost,
  getSpecialBuildingMaintenanceCost,
  getSpecialBuildingRepairCost,
} from './economyConfig';

export {
  BRIDGE_COSTS,
  FARM_COSTS,
  HOUSE_CONSTRUCTION_COSTS,
  HOUSE_MAINTENANCE_COSTS,
  HOUSE_REPAIR_COSTS,
  HOUSE_UPGRADE_COSTS,
  MAINTENANCE_CYCLE_DAYS,
  PLAZA_COSTS,
  PRODUCTION_INPUT_COSTS,
  PROGRESSIVE_WEAR_THRESHOLDS,
  RESOURCE_DISPLAY_NAMES,
  ROAD_COSTS,
  SPECIAL_BUILDING_COSTS,
  SPECIAL_BUILDING_REPAIR_COSTS,
  formatResourceCost,
  getFarmCost,
  getHouseBuildCost,
  getHouseMaintenanceCost,
  getHouseRepairCost,
  getHouseUpgradeCost,
  getMaintenanceStatusFromUnpaidDays,
  getMaintenanceStatusLabel,
  getRoadMaintenanceCost,
  getRoadRepairCost,
  getRoadTileCost,
  getSpecialBuildingCost,
  getSpecialBuildingMaintenanceCost,
  getSpecialBuildingRepairCost,
};

export const CANVAS_WIDTH = 1440;
export const CANVAS_HEIGHT = 960;
export const WORLD_CENTER_X = 720;
export const WORLD_CENTER_Y = 480;

// Geografía del mapa: Bosque a la Izquierda, Montañas a la Derecha, Valle central + Río a la mitad
export const FOREST_MAX_X = 330;
export const MOUNTAIN_MIN_X = 1110;

// Río horizontal en la mitad del mapa que divide Zona Norte (y=26..424) y Zona Sur (y=532..928)
export const RIVER_TOP_Y = 446;
export const RIVER_BOTTOM_Y = 514;
export const NORTH_LAND_MIN_Y = 26;
export const NORTH_LAND_MAX_Y = 424;
export const SAFE_LAND_MIN_Y = 532;
export const NORTH_CENTER_Y = 220;
export const SOUTH_CENTER_Y = 710;
export const BRIDGE_X_MIN = 684;
export const BRIDGE_X_MAX = 756;
export const BRIDGE_CENTER_X = 720;
export const BRIDGE_HALF_WIDTH = 36;
export const ROAD_GRID_SIZE = 24;

// Duraciones por velocidad
export const SPEED_TIMINGS: Record<
  1 | 2 | 4,
  { daySeconds: number; nightSeconds: number; dayLabel: string; nightLabel: string }
> = {
  1: { daySeconds: 420, nightSeconds: 180, dayLabel: '7m', nightLabel: '3m' },
  2: { daySeconds: 300, nightSeconds: 90, dayLabel: '5m', nightLabel: '1.5m' },
  4: { daySeconds: 150, nightSeconds: 60, dayLabel: '2.5m', nightLabel: '1m' },
};

export const DAY_DURATION_SECONDS = SPEED_TIMINGS[1].daySeconds;
export const NIGHT_DURATION_SECONDS = SPEED_TIMINGS[1].nightSeconds;
export const DAY_START_MINUTE = 360;
export const NIGHT_START_MINUTE = 1200;
export const DAY_GAME_MINUTES = NIGHT_START_MINUTE - DAY_START_MINUTE; // 840
export const NIGHT_GAME_MINUTES = 1440 - DAY_GAME_MINUTES; // 600

export const CURRENT_SCHEMA_VERSION = 3;

// Calendario: 30 días por estación, 120 días por año completo
export const DAYS_PER_SEASON = 30;
export const DAYS_PER_YEAR = 120;
export const PREGNANCY_DAYS = 3;
export const PETITION_INTERVAL_SECONDS = 1800; // 30 minutos reales
export const RIVER_FISH_RESTOCK_DAYS = 3; // El río tarda 3 días en renovar los peces

// Edades exactas
export const AGE_CHILD_MAX_YEARS = 5;
export const AGE_PARTNER_MIN_YEARS = 15;
export const AGE_ADULT_YEARS = 18;
export const AGE_REPRODUCE_MIN_YEARS = 20;
export const AGE_ELDER_YEARS = 60;

// Capacidades exactas de casas según tamaño
export const HOUSE_SIZE_CAPACITIES: Record<House['size'], number> = {
  small: 4,
  medium: 6,
  large: 8,
};

export const GOLD_COIN_BACKING = 25;
export const SILVER_COIN_BACKING = 10;

export const MAX_MAESTRO_JOBS_PER_AGENT = 3;

export const WOOD_GRADE_CONFIG: Record<
  WoodGrade,
  {
    label: string;
    invKey: 'pineWood' | 'mapleWood' | 'oakWood';
    nodeType: 'pine_wood' | 'maple_wood' | 'oak_wood';
    skillId: string;
    price: number;
    minCarpentryPct: number;
  }
> = {
  pine: {
    label: 'Pino',
    invKey: 'pineWood',
    nodeType: 'pine_wood',
    skillId: 'carpinteria_pino',
    price: 2,
    minCarpentryPct: 10,
  },
  maple: {
    label: 'Arce',
    invKey: 'mapleWood',
    nodeType: 'maple_wood',
    skillId: 'carpinteria_arce',
    price: 5,
    minCarpentryPct: 50,
  },
  oak: {
    label: 'Roble',
    invKey: 'oakWood',
    nodeType: 'oak_wood',
    skillId: 'ebanisteria_roble',
    price: 10,
    minCarpentryPct: 80,
  },
};

export const VILLAGE_SKILLS: SkillDefinition[] = [
  { id: 'recoleccion', minKnowledgePct: 4, name: 'Recolección Eficaz', description: 'Aumenta el rendimiento al juntar alimentos y leña.' },
  { id: 'mineria_cobre', minKnowledgePct: 8, name: 'Minería y Venta de Cobre', description: 'Permite extraer y comerciar vetas de Cobre.' },
  { id: 'carpinteria_pino', minKnowledgePct: 12, name: 'Corte y Venta en Pino', description: 'Carpinteros con 10%+ cortan, comercian y construyen con Pino.' },
  { id: 'primeros_auxilios', minKnowledgePct: 16, name: 'Primeros Auxilios', description: 'Reduce el impacto de heridas y fatiga.' },
  { id: 'pesca_fluvial', minKnowledgePct: 20, name: 'Pesca Fluvial', description: 'Mejora la captura sostenible de peces del río.' },
  { id: 'mineria_hierro', minKnowledgePct: 24, name: 'Minería y Venta de Hierro', description: 'Permite extraer y vender mineral de Hierro.' },
  { id: 'albanileria', minKnowledgePct: 28, name: 'Albañilería Básica', description: 'Optimiza el uso de piedra en cimientos y reparaciones.' },
  { id: 'comercio_justo', minKnowledgePct: 32, name: 'Comercio Justo', description: 'Mejora márgenes en Mercado, Panadería y Muelle.' },
  { id: 'forja_herramientas', minKnowledgePct: 36, name: 'Fabricación de Herramientas', description: 'Permite crear herramientas con hierro, cobre o madera.' },
  { id: 'doma_salvaje', minKnowledgePct: 40, name: 'Doma de Bestias Salvajes', description: 'Permite domesticar osos y gatos salvajes.' },
  { id: 'siembra_avanzada', minKnowledgePct: 44, name: 'Siembra Avanzada', description: 'Acelera la maduración y cosecha de cultivos.' },
  { id: 'carpinteria_arce', minKnowledgePct: 48, name: 'Carpintería y Venta en Arce', description: 'Carpinteros con 50%+ cortan, comercian y construyen con Arce.' },
  { id: 'alquimia_botica', minKnowledgePct: 52, name: 'Botánica y Remedios', description: 'Elabora medicinas eficaces contra enfermedades.' },
  { id: 'banca_metalica', minKnowledgePct: 56, name: 'Banca y Respaldo Metálico', description: 'Administra el Banco, préstamos y respaldo en Oro y Plata.' },
  { id: 'logistica_caravanas', minKnowledgePct: 60, name: 'Logística de Caravanas', description: 'Coordina caravanas a caballo entre Sur, Bosque y Norte.' },
  { id: 'mineria_plata', minKnowledgePct: 64, name: 'Prospección y Venta de Plata 🥈', description: 'Extrae y comercia Plata de las montañas derechas.' },
  { id: 'ingenieria_puentes', minKnowledgePct: 68, name: 'Ingeniería Vial y Puentes', description: 'Construye puentes, caminos iluminados y muelles sólidos.' },
  { id: 'medicina_clinica', minKnowledgePct: 72, name: 'Medicina Clínica', description: 'Acelera curaciones de cuadros graves en el Hospital.' },
  { id: 'bomberos_civiles', minKnowledgePct: 76, name: 'Prevención y Combate de Incendios', description: 'Extingue incendios causados por tormentas o accidentes.' },
  { id: 'ebanisteria_roble', minKnowledgePct: 80, name: 'Ebanistería y Venta en Roble', description: 'Carpinteros con 80%+ cortan, comercian y construyen con Roble.' },
  { id: 'prospeccion_oro', minKnowledgePct: 84, name: 'Prospección y Venta de Oro 🥇', description: 'Extrae y comercia vetas de Oro de alta pureza.' },
  { id: 'arquitectura_monumental', minKnowledgePct: 88, name: 'Arquitectura Monumental', description: 'Levanta viviendas Grandes y edificios de alto nivel.' },
  { id: 'legislacion_civica', minKnowledgePct: 92, name: 'Legislación y Orden Público', description: 'Optimiza el Ayuntamiento, Comisaría y leyes emergentes.' },
  { id: 'estrategia_qwen', minKnowledgePct: 96, name: 'Estrategia Evolutiva Qwen 2.5', description: 'Coordina decisiones colectivas de la especie.' },
  { id: 'maestria_civilizacion', minKnowledgePct: 100, name: 'Maestría de Civilización', description: 'Cumbre científica y productiva del simulador.' },
];

export interface DiseaseCatalogEntry {
  id: DiseaseId;
  name: string;
  dangerPct: number;
  baseChancePct: number;
  incurable: boolean;
  minFatalDays: number | null;
  maxFatalDays: number | null;
  cureDifficulty: number;
}

export const DISEASE_CATALOG: Record<DiseaseId, DiseaseCatalogEntry> = {
  gripe: {
    id: 'gripe',
    name: 'Gripe',
    dangerPct: 25,
    baseChancePct: 70,
    incurable: false,
    minFatalDays: null,
    maxFatalDays: null,
    cureDifficulty: 1,
  },
  dolor_estomacal: {
    id: 'dolor_estomacal',
    name: 'Dolor Estomacal',
    dangerPct: 40,
    baseChancePct: 55,
    incurable: false,
    minFatalDays: null,
    maxFatalDays: null,
    cureDifficulty: 2,
  },
  pulmonia: {
    id: 'pulmonia',
    name: 'Pulmonía',
    dangerPct: 55,
    baseChancePct: 45,
    incurable: false,
    minFatalDays: 6,
    maxFatalDays: 9,
    cureDifficulty: 2.5,
  },
  sepsis: {
    id: 'sepsis',
    name: 'Sepsis',
    dangerPct: 80,
    baseChancePct: 20,
    incurable: false,
    minFatalDays: 3,
    maxFatalDays: 5,
    cureDifficulty: 3.5,
  },
  cancer: {
    id: 'cancer',
    name: 'Cáncer',
    dangerPct: 100,
    baseChancePct: 1,
    incurable: true,
    minFatalDays: 10,
    maxFatalDays: 15,
    cureDifficulty: 99,
  },
};

export const VILLAGE_LAWS_CATALOG: Array<Omit<VillageLaw, 'active' | 'enactedDay'>> = [
  {
    id: 'ban_trade_wood',
    name: 'Veda Forestal (Prohibir comercio de madera)',
    description: 'Prohíbe vender madera al mercado; infractores pueden ser detenidos si hay Comisaría y Cárcel.',
    proposedBy: 'Consejo de Ancianos',
  },
  {
    id: 'ban_fishing',
    name: 'Veda Fluvial (Prohibir pesca)',
    description: 'Prohíbe pescar en el río para recuperar el cardumen.',
    proposedBy: 'Consejo de Ancianos',
  },
  {
    id: 'ban_trade_bread',
    name: 'Reserva Alimentaria (Prohibir venta de pan)',
    description: 'Prohíbe vender pan por lucro durante crisis alimentarias.',
    proposedBy: 'Ayuntamiento / Qwen 2.5',
  },
  {
    id: 'ban_mine_gold',
    name: 'Moratoria Aurífera (Prohibir minería de Oro)',
    description: 'Suspende la extracción privada de Oro en la montaña.',
    proposedBy: 'Banco Central',
  },
  {
    id: 'winter_rationing',
    name: 'Racionamiento Invernal',
    description: 'Prioriza reservas de comida en casas y reduce derroche.',
    proposedBy: 'Consejo de Ancianos',
  },
  {
    id: 'night_watch',
    name: 'Guardia Nocturna',
    description: 'Refuerza patrullaje de Comisario y Guardián contra bestias e incendios.',
    proposedBy: 'Comisaría',
  },
  {
    id: 'mining_priority',
    name: 'Prioridad Minera',
    description: 'Incentiva extracción de Cobre, Hierro y Plata para la economía.',
    proposedBy: 'Consejo de Ancianos',
  },
];

export const SEASONS: SeasonType[] = ['Primavera', 'Verano', 'Otoño', 'Invierno'];
export const FISH_VARIANTS: FishVariant[] = ['trout', 'salmon', 'goldfish', 'catfish'];

export const ERA_METADATA: Record<
  EraId,
  { label: string; minKnowledge: number; minHouses: number; maxHouseLevel: 1 | 2 | 3 | 4 }
> = {
  primitive: { label: 'Era Primitiva', minKnowledge: 0, minHouses: 0, maxHouseLevel: 1 },
  stone: { label: 'Edad de Piedra', minKnowledge: 30, minHouses: 2, maxHouseLevel: 2 },
  wood: { label: 'Edad de Carpintería', minKnowledge: 85, minHouses: 4, maxHouseLevel: 3 },
  iron: { label: 'Edad de Hierro', minKnowledge: 170, minHouses: 6, maxHouseLevel: 4 },
  civilization: { label: 'Edad de Civilización', minKnowledge: 300, minHouses: 8, maxHouseLevel: 4 },
};

export const HOUSE_LEVEL_LABELS: Record<1 | 2 | 3 | 4, string> = {
  1: 'Choza Básica',
  2: 'Casa de Madera',
  3: 'Casa de Piedra',
  4: 'Taller de Hierro',
};

export const SPECIAL_BUILDING_LABELS: Record<
  SpecialBuildingType,
  { label: string; short: string; category: SpecialBuilding['category']; basePrice: number }
> = {
  infirmary: { label: 'Hospital', short: 'HOS', category: 'hospital', basePrice: 80 },
  school: { label: 'Escuela', short: 'ESC', category: 'school', basePrice: 70 },
  bank: { label: 'Banco Central', short: 'BCO', category: 'commerce', basePrice: 120 },
  market: { label: 'Mercado Central', short: 'MER', category: 'commerce', basePrice: 65 },
  bakery: { label: 'Panadería', short: 'PAN', category: 'commerce', basePrice: 45 },
  carpentry: { label: 'Carpintería', short: 'CAR', category: 'commerce', basePrice: 55 },
  forge: { label: 'Herrería / Forja', short: 'FOR', category: 'commerce', basePrice: 65 },
  apothecary: { label: 'Botica', short: 'BOT', category: 'commerce', basePrice: 50 },
  dock: { label: 'Muelle Fluvial', short: 'MUE', category: 'commerce', basePrice: 45 },
  general_depot: { label: 'Depósito General', short: 'DEP', category: 'depot', basePrice: 60 },
  town_hall: { label: 'Ayuntamiento', short: 'AYU', category: 'civic', basePrice: 110 },
  police_station: { label: 'Comisaría', short: 'COM', category: 'civic', basePrice: 75 },
  prison: { label: 'Cárcel', short: 'CARC', category: 'civic', basePrice: 75 },
};

export const SPECIAL_BUILDING_STAFF_JOBS: Record<SpecialBuildingType, JobType[]> = {
  infirmary: ['Curandero'],
  school: ['Maestro', 'Erudito'],
  bank: ['Banquero'],
  market: ['Comerciante'],
  bakery: ['Panadero'],
  carpentry: ['Carpintero'],
  forge: ['Herrero', 'Artesano'],
  apothecary: ['Boticario'],
  dock: ['Pescador'],
  general_depot: ['Almacenero'],
  town_hall: ['Alcalde'],
  police_station: ['Comisario', 'Guardián'],
  prison: ['Comisario', 'Guardián'],
};

export const SPECIAL_BUILDING_ALLOWED_STORAGE: Record<SpecialBuildingType, Array<keyof HouseStorage>> = {
  dock: ['food', 'coins'],
  bakery: ['food', 'bread', 'coins'],
  market: [
    'food',
    'wood',
    'pineWood',
    'mapleWood',
    'oakWood',
    'stone',
    'copper',
    'iron',
    'gold',
    'silver',
    'milk',
    'bread',
    'tools',
    'medicine',
    'coins',
  ],
  bank: ['gold', 'silver', 'coins'],
  carpentry: ['wood', 'pineWood', 'mapleWood', 'oakWood', 'tools', 'coins'],
  forge: ['copper', 'iron', 'tools', 'coins'],
  apothecary: ['food', 'medicine', 'coins'],
  infirmary: ['medicine', 'food', 'coins'],
  school: ['coins'],
  town_hall: ['coins'],
  police_station: ['tools', 'coins'],
  prison: ['food', 'coins'],
  general_depot: [
    'food',
    'wood',
    'pineWood',
    'mapleWood',
    'oakWood',
    'stone',
    'copper',
    'iron',
    'gold',
    'silver',
    'milk',
    'bread',
    'tools',
    'medicine',
    'coins',
  ],
};

export const HOUSE_ALLOWED_STORAGE: Array<keyof HouseStorage> = ['food', 'coins'];

export const ANIMAL_LABELS: Record<AnimalType, string> = {
  cat: 'Gato doméstico',
  dog: 'Perro guardián',
  wildcat: 'Gato salvaje (Peligro)',
  bear: 'Oso pardo (Peligro)',
  fish: 'Pez de río',
  chicken: 'Gallina',
  cow: 'Vaca lechera',
  horse: 'Caballo (Transporte)',
  sheep: 'Oveja (Lana/Abrigo)',
};

export const ILLNESS_NAMES = ['Gripe', 'Dolor Estomacal', 'Pulmonía', 'Sepsis', 'Cáncer'];

const MALE_BABY_NAMES = [
  'Mateo',
  'Lucas',
  'Thiago',
  'Bruno',
  'Gael',
  'Dante',
  'Leo',
  'Simón',
  'Ian',
  'Hugo',
  'Joaquín',
  'Bautista',
  'Valentín',
  'Lorenzo',
  'Emiliano',
  'Nicolás',
];

const FEMALE_BABY_NAMES = [
  'Luna',
  'Sofía',
  'Alma',
  'Mía',
  'Vera',
  'Nina',
  'Clara',
  'Zoe',
  'Elena',
  'Sara',
  'Catalina',
  'Renata',
  'Camila',
  'Isabella',
  'Julieta',
  'Amparo',
];

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function pushSoundCue(state: SimulationState, cue: SoundCue): void {
  if (!Array.isArray(state.pendingSounds)) state.pendingSounds = [];
  if (state.pendingSounds.length >= 12) return;
  if (!state.pendingSounds.includes(cue)) {
    state.pendingSounds.push(cue);
  }
}

export function isNightMinute(minute: number): boolean {
  const m = ((minute % 1440) + 1440) % 1440;
  return m < DAY_START_MINUTE || m >= NIGHT_START_MINUTE;
}

export function getTerrainZoneAt(x: number): 'forest' | 'valley' | 'mountain' {
  if (x <= FOREST_MAX_X) return 'forest';
  if (x >= MOUNTAIN_MIN_X) return 'mountain';
  return 'valley';
}

export function isPointInRiverWater(
  x: number,
  y: number,
  bridgeX: number | null = BRIDGE_CENTER_X
): boolean {
  if (y < RIVER_TOP_Y - 6 || y > RIVER_BOTTOM_Y + 6) return false;
  if (bridgeX !== null && Math.abs(x - bridgeX) <= BRIDGE_HALF_WIDTH) return false;
  return true;
}

export function isBridgePassable(state: Pick<SimulationState, 'bridge'>): boolean {
  const bridge = state.bridge;
  if (!bridge) return false;
  return bridge.durability > 10 && (bridge.unpaidMaintenanceDays ?? 0) < PROGRESSIVE_WEAR_THRESHOLDS.inoperativeDays;
}

export function computeSeason(day: number): SeasonType {
  const idx = Math.floor((Math.max(1, day) - 1) / DAYS_PER_SEASON) % SEASONS.length;
  return SEASONS[idx];
}

export function getSeasonBiomeAndWeather(season: SeasonType): { biome: BiomeType; weather: WeatherType } {
  switch (season) {
    case 'Primavera':
      return { biome: 'grassland', weather: 'sunny' };
    case 'Verano':
      return { biome: 'arid', weather: 'sunny' };
    case 'Otoño':
      return { biome: 'forest', weather: 'rain' };
    case 'Invierno':
      return { biome: 'tundra', weather: 'storm' };
  }
}

export function computeUnlockedSkills(educationPct: number): SkillDefinition[] {
  return VILLAGE_SKILLS.filter((s) => educationPct >= s.minKnowledgePct);
}

export function syncAgentSkills(agent: Agent): string[] {
  const unlocked = computeUnlockedSkills(agent.education).map((s) => s.id);
  agent.skills = unlocked;
  return unlocked;
}

export function getJobMasteryTier(pct: number): JobMasteryTier {
  if (pct > 70) return 'maestro';
  if (pct >= 31) return 'comerciante';
  return 'operario';
}

export function getJobMasteryTierLabel(pct: number): string {
  const tier = getJobMasteryTier(pct);
  if (tier === 'maestro') return 'Maestro';
  if (tier === 'comerciante') return 'Comerciante';
  return 'Operario';
}

export function countMaestroJobs(agent: Pick<Agent, 'jobMastery'>): number {
  return Object.values(agent.jobMastery ?? {}).filter((v) => typeof v === 'number' && v > 70).length;
}

export function advanceJobMastery(agent: Agent, job: JobType, delta: number): number {
  if (!agent.jobMastery) agent.jobMastery = {};
  const current = agent.jobMastery[job] ?? 0;
  let next = clamp(current + delta, 0, 100);
  if (current <= 70 && next > 70) {
    const otherMaestros = Object.entries(agent.jobMastery).filter(
      ([k, v]) => k !== job && typeof v === 'number' && v > 70
    ).length;
    if (otherMaestros >= MAX_MAESTRO_JOBS_PER_AGENT) {
      next = 70;
    }
  }
  agent.jobMastery[job] = Math.round(next * 10) / 10;
  return agent.jobMastery[job]!;
}

export function canCarpenterUseWood(agent: Pick<Agent, 'job' | 'carpentryKnowledge' | 'skills'>, grade: WoodGrade): boolean {
  if (agent.job !== 'Carpintero') return false;
  return (
    agent.carpentryKnowledge >= WOOD_GRADE_CONFIG[grade].minCarpentryPct ||
    agent.skills.includes(WOOD_GRADE_CONFIG[grade].skillId)
  );
}

export function canGatherOrTradeWood(
  agent: Pick<Agent, 'job' | 'carpentryKnowledge' | 'skills' | 'jobMastery'>,
  grade: WoodGrade
): boolean {
  const cfg = WOOD_GRADE_CONFIG[grade];
  const hasSkill = agent.skills.includes(cfg.skillId);
  const hasCarpentry = agent.carpentryKnowledge >= cfg.minCarpentryPct;
  return hasSkill || (agent.job === 'Carpintero' && hasCarpentry);
}

export function canGatherOrTradeMineral(
  agent: Pick<Agent, 'skills' | 'job' | 'education'>,
  mineral: 'copper' | 'iron' | 'silver' | 'gold'
): boolean {
  switch (mineral) {
    case 'copper':
      return agent.skills.includes('mineria_cobre');
    case 'iron':
      return agent.skills.includes('mineria_hierro');
    case 'silver':
      return agent.skills.includes('mineria_plata');
    case 'gold':
      return agent.skills.includes('prospeccion_oro');
  }
}

export function canAgentRest(agent: Pick<Agent, 'houseId'>): boolean {
  return agent.houseId !== null;
}

export function createDefaultLaws(): VillageLaw[] {
  return VILLAGE_LAWS_CATALOG.map((law) => ({
    ...law,
    active: false,
    enactedDay: null,
  }));
}

export function isLawActive(state: Pick<SimulationState, 'laws'>, lawId: VillageLawId): boolean {
  return state.laws.some((l) => l.id === lawId && l.active);
}

export function toggleVillageLaw(
  state: SimulationState,
  lawId: VillageLawId,
  active?: boolean,
  proposer = 'Jugador / Qwen 2.5'
): VillageLaw | null {
  const law = state.laws.find((l) => l.id === lawId);
  if (!law) return null;
  const nextActive = active !== undefined ? active : !law.active;
  if (law.active === nextActive) return law;
  law.active = nextActive;
  law.proposedBy = proposer;
  law.enactedDay = nextActive ? state.day : null;
  addLog(
    state,
    `${nextActive ? 'Ley promulgada' : 'Ley derogada'}: ${law.name} (${proposer}).`,
    nextActive ? 'violet' : 'slate'
  );
  if (nextActive && proposer !== 'Jugador') {
    trackNaturalProgress(state, 'lawsEnacted', 1);
  }
  archiveChronicleEvent(
    state,
    'politics',
    `${nextActive ? 'Ley promulgada' : 'Ley derogada'}: ${law.name} (${proposer}).`
  );
  emitSimEvent(state, 'law_changed', `${law.name}: ${nextActive ? 'activa' : 'derogada'}`, undefined, {
    lawId: law.id,
    active: nextActive,
  });
  return law;
}

export function computeEra(knowledge: number, houses: House[]): EraId {
  const houseCount = houses.length;
  if (knowledge >= ERA_METADATA.civilization.minKnowledge && houseCount >= ERA_METADATA.civilization.minHouses) {
    return 'civilization';
  }
  if (knowledge >= ERA_METADATA.iron.minKnowledge && houseCount >= ERA_METADATA.iron.minHouses) {
    return 'iron';
  }
  if (knowledge >= ERA_METADATA.wood.minKnowledge && houseCount >= ERA_METADATA.wood.minHouses) {
    return 'wood';
  }
  if (knowledge >= ERA_METADATA.stone.minKnowledge && houseCount >= ERA_METADATA.stone.minHouses) {
    return 'stone';
  }
  return 'primitive';
}

export function getHealthStatusLabel(agent: Pick<Agent, 'health' | 'isSick'>): {
  status: 'Sano' | 'Enfermo';
  levelLabel: 'Óptima' | 'Estable' | 'Delicada' | 'Crítica';
} {
  const status = agent.isSick ? 'Enfermo' : 'Sano';
  if (agent.health >= 80) return { status, levelLabel: 'Óptima' };
  if (agent.health >= 50) return { status, levelLabel: 'Estable' };
  if (agent.health >= 25) return { status, levelLabel: 'Delicada' };
  return { status, levelLabel: 'Crítica' };
}

export function getHappinessLabel(happiness: number, emotion?: EmotionType): string {
  if (emotion === 'depressed' || happiness < 22) return 'Depresión';
  if (emotion === 'excited' || happiness >= 88) return 'Excitación';
  if (happiness >= 75) return 'Feliz';
  if (happiness >= 58) return 'Contento';
  if (happiness >= 40) return 'Neutral';
  return 'Infeliz';
}

export function getEmotionWorkMultiplier(emotion: EmotionType): number {
  switch (emotion) {
    case 'excited':
      return 1.38;
    case 'happy':
    case 'love':
      return 1.12;
    case 'depressed':
      return 0.65;
    case 'sad':
      return 0.85;
    case 'sick':
      return 0.5;
    default:
      return 1;
  }
}

export function computeAgentHappiness(
  agent: Agent,
  weather: SimulationState['weather'],
  policy: QwenPolicyState,
  season: SeasonType = 'Primavera',
  hasNearbyPet = false,
  isLitNight = false
): number {
  let score = 62;
  score -= Math.max(0, agent.hunger - 30) * 0.45;
  score -= Math.max(0, 35 - agent.energy) * 0.4;
  score -= Math.max(0, 80 - agent.health) * 0.55;
  if (agent.isSick) score -= 18;
  if (agent.houseId !== null) score += 10;
  else score -= 12;
  if (agent.partnerId !== null) score += 8;
  if (agent.jailedDays > 0) score -= 22;
  if (agent.inv.food >= 2 || agent.breadCount > 0) score += 5;
  if (agent.coins >= 15) score += 4;
  if (agent.isSterile) score -= 6;
  if (hasNearbyPet) score += 5;
  if (isLitNight) score += 4;
  if (weather === 'storm' || weather === 'thunderstorm' || weather === 'drought') score -= 8;
  if (season === 'Invierno' && agent.houseId === null) score -= 9;
  if (policy.moodDirective === 'optimistic') score += 12;
  if (policy.moodDirective === 'disciplined') score += 3;
  score += agent.moodModifier;
  return Math.round(clamp(score, 0, 100));
}

export function deriveAgentEmotion(agent: Agent, weather: SimulationState['weather']): EmotionType {
  if (agent.isSick || agent.health < 35) return 'sick';
  if ((weather === 'storm' || weather === 'thunderstorm') && agent.houseId === null) return 'scared';
  if (agent.happiness < 22) return 'depressed';
  if (agent.happiness >= 86 || (agent.happiness >= 74 && agent.moodModifier >= 12)) return 'excited';
  if (agent.happiness >= 75) return agent.partnerId && agent.talkingTimer > 0 ? 'love' : 'happy';
  if (agent.happiness >= 55) return 'content';
  if (agent.happiness >= 38) return 'neutral';
  return 'sad';
}

export function computeAgentImportance(agent: Agent): number {
  const socialBonus = (agent.partnerId ? 10 : 0) + agent.childrenCount * 6;
  const resourceBonus =
    (agent.inv.wood +
      agent.inv.pineWood +
      agent.inv.mapleWood * 2 +
      agent.inv.oakWood * 3 +
      agent.inv.stone +
      agent.inv.copper +
      agent.inv.iron * 2 +
      agent.inv.silver * 3 +
      agent.inv.gold * 5 +
      agent.toolsCount * 2) *
    2;
  const roleBonus =
    agent.job === 'Alcalde'
      ? 24
      : agent.job === 'Comisario' ||
          agent.job === 'Banquero' ||
          agent.job === 'Maestro' ||
          agent.job === 'Erudito' ||
          agent.job === 'Curandero'
        ? 16
        : agent.job !== 'Recolector' && agent.job !== 'Aprendiz'
          ? 12
          : 6;
  const saberBonus = Math.round(agent.education * 0.25);
  const elderBonus = agent.isElder ? 10 : 0;
  return Math.round(clamp(10 + socialBonus + resourceBonus + roleBonus + saberBonus + elderBonus, 0, 100));
}

export function getRankTitle(score: number): string {
  if (score >= 80) return 'Referente Mayor';
  if (score >= 55) return 'Líder de Oficio';
  if (score >= 30) return 'Vecino Activo';
  return 'Habitante';
}

export function getConciseTaskLabel(taskType: TaskType): string {
  switch (taskType) {
    case 'eat':
      return 'Comiendo ración';
    case 'sleep':
      return 'Descansando en casa';
    case 'gather_food':
      return 'Recolectando comida';
    case 'farm_crops':
      return 'Trabajando cultivos';
    case 'fish_river':
      return 'Pescando en el río';
    case 'tend_livestock':
      return 'Cuidando animales';
    case 'gather_wood':
      return 'Talando madera';
    case 'gather_stone':
      return 'Picando piedra';
    case 'gather_copper':
      return 'Minando Cobre';
    case 'gather_iron':
      return 'Minando Hierro';
    case 'gather_gold':
      return 'Minando Oro 🥇';
    case 'gather_silver':
      return 'Minando Plata 🥈';
    case 'craft_tools':
      return 'Forjando herramientas';
    case 'manage_building':
      return 'Administrando edificio';
    case 'caravan':
      return 'Caravana comercial';
    case 'repair_building':
      return 'Reparando estructura';
    case 'extinguish_fire':
      return 'Apagando incendio';
    case 'store_home':
      return 'Guardando en baúl/depósito';
    case 'deliver_materials':
      return 'Entregando materiales';
    case 'build_house':
      return 'Construyendo casa';
    case 'upgrade_house':
      return 'Mejorando casa';
    case 'build_plaza':
      return 'Construyendo plaza';
    case 'build_bridge':
      return 'Construyendo puente';
    case 'plant_farm':
      return 'Sembrando cultivo';
    case 'build_special':
      return 'Construyendo obra';
    case 'heal_other':
      return 'Curando enfermos';
    case 'research':
      return 'Investigando era';
    case 'trade':
      return 'Comerciando';
    case 'socialize':
      return 'Socializando';
    case 'idle':
    default:
      return 'Vigilando aldea';
  }
}

export function buildDiseaseInfo(
  id: DiseaseId,
  forcedFatalDays?: number | null
): DiseaseInfo {
  const entry = DISEASE_CATALOG[id];
  const fatalAfterDays =
    forcedFatalDays !== undefined
      ? forcedFatalDays
      : entry.minFatalDays !== null && entry.maxFatalDays !== null
        ? entry.minFatalDays +
          Math.floor(Math.random() * (entry.maxFatalDays - entry.minFatalDays + 1))
        : null;
  return {
    id: entry.id,
    name: entry.name,
    dangerPct: entry.dangerPct,
    baseChancePct: entry.baseChancePct,
    incurable: entry.incurable,
    daysInfected: 0,
    fatalAfterDays,
  };
}

export function pickRandomDiseaseBySeason(
  season: SeasonType,
  weather: WeatherType,
  isHomeless: boolean
): DiseaseId {
  const coldOrWet = season === 'Invierno' || season === 'Otoño' || weather === 'rain' || weather === 'storm' || weather === 'thunderstorm';
  const weights: Array<{ id: DiseaseId; w: number }> = [
    { id: 'gripe', w: 70 },
    { id: 'dolor_estomacal', w: 55 },
    { id: 'pulmonia', w: coldOrWet ? 62 : 12 },
    { id: 'sepsis', w: isHomeless ? 24 : 15 },
    { id: 'cancer', w: 1 },
  ];
  const total = weights.reduce((acc, item) => acc + item.w, 0);
  let r = Math.random() * total;
  for (const item of weights) {
    r -= item.w;
    if (r <= 0) return item.id;
  }
  return 'gripe';
}

export function contractDiseaseForAgent(
  state: SimulationState,
  agent: Agent,
  forcedId?: DiseaseId
): DiseaseInfo {
  const diseaseId =
    forcedId ?? pickRandomDiseaseBySeason(state.season, state.weather, agent.houseId === null);
  const info = buildDiseaseInfo(diseaseId);
  agent.isSick = true;
  agent.illness = info;
  agent.illnessName = info.name;
  agent.emotion = 'sick';
  return info;
}

export const ALL_JOBS: readonly JobType[] = [
  'Aprendiz',
  'Recolector',
  'Agricultor',
  'Pescador',
  'Leñador',
  'Carpintero',
  'Minero',
  'Constructor',
  'Curandero',
  'Maestro',
  'Erudito',
  'Comerciante',
  'Banquero',
  'Panadero',
  'Herrero',
  'Artesano',
  'Boticario',
  'Guardián',
  'Alcalde',
  'Comisario',
  'Almacenero',
] as const;

export function getAllJobsMap(): Record<JobType, number> {
  return {
    Aprendiz: 0,
    Recolector: 0,
    Agricultor: 0,
    Pescador: 0,
    Leñador: 0,
    Carpintero: 0,
    Minero: 0,
    Constructor: 0,
    Curandero: 0,
    Maestro: 0,
    Erudito: 0,
    Comerciante: 0,
    Banquero: 0,
    Panadero: 0,
    Herrero: 0,
    Artesano: 0,
    Boticario: 0,
    Guardián: 0,
    Alcalde: 0,
    Comisario: 0,
    Almacenero: 0,
  };
}

export function assignBalancedJob(
  agent: Agent,
  agents: Agent[],
  houses: House[],
  policies: QwenPolicyState,
  specialBuildings: SpecialBuilding[] = []
): JobType {
  if (agent.ageYears < 10) return 'Aprendiz';

  const counts = getAllJobsMap();
  for (const other of agents) {
    if (other.id !== agent.id) counts[other.job]++;
  }

  const sickCount = agents.filter((a) => a.isSick).length;
  const homelessCount = agents.filter((a) => a.houseId === null).length;

  const needJobsForType = (type: SpecialBuildingType, job: JobType): boolean => {
    const numB = specialBuildings.filter((b) => b.type === type).length;
    return numB > 0 && counts[job] < numB;
  };

  if (needJobsForType('town_hall', 'Alcalde')) return 'Alcalde';
  if (needJobsForType('police_station', 'Comisario') || needJobsForType('prison', 'Comisario')) {
    return 'Comisario';
  }
  if (needJobsForType('general_depot', 'Almacenero')) return 'Almacenero';
  if (needJobsForType('bank', 'Banquero')) return 'Banquero';
  if (needJobsForType('school', 'Maestro')) return 'Maestro';
  if (
    (specialBuildings.some((b) => b.type === 'infirmary') || sickCount > 0 || policies.healthPriority) &&
    counts.Curandero < Math.max(1, Math.ceil(agents.length / 8))
  ) {
    return 'Curandero';
  }
  if (needJobsForType('apothecary', 'Boticario')) return 'Boticario';
  if (needJobsForType('bakery', 'Panadero')) return 'Panadero';
  if (needJobsForType('forge', 'Herrero')) return 'Herrero';
  if (needJobsForType('carpentry', 'Carpintero')) return 'Carpintero';
  if (needJobsForType('market', 'Comerciante')) return 'Comerciante';
  if (
    (specialBuildings.some((b) => b.type === 'dock') || counts.Pescador === 0) &&
    counts.Pescador < Math.max(1, specialBuildings.filter((b) => b.type === 'dock').length)
  ) {
    return 'Pescador';
  }

  if (counts.Carpintero < 1 && houses.length >= 2 && agents.length >= 11) return 'Carpintero';
  if (counts.Guardián < 1 && houses.length >= 2 && agents.length >= 12) return 'Guardián';
  if (counts.Artesano < 1 && houses.length >= 2 && agents.length >= 13) return 'Artesano';

  if (policies.economyFocus && counts.Comerciante < Math.max(2, Math.ceil(agents.length / 6))) {
    return 'Comerciante';
  }
  if (
    (homelessCount > 1 || policies.buildPriority || houses.length < Math.ceil(agents.length / 4)) &&
    counts.Constructor < Math.max(2, Math.ceil(agents.length / 5))
  ) {
    return 'Constructor';
  }
  if ((policies.evolutionFocus || counts.Erudito < 1) && counts.Erudito < Math.max(1, Math.floor(agents.length / 7))) {
    return 'Erudito';
  }
  if (policies.farmingFocus && counts.Agricultor < Math.max(2, Math.ceil(agents.length / 6))) {
    return 'Agricultor';
  }
  if (counts.Recolector < Math.max(2, Math.ceil(agents.length / 5))) return 'Recolector';
  if (counts.Leñador < Math.max(2, Math.ceil(agents.length / 5))) return 'Leñador';
  if (counts.Minero < Math.max(2, Math.ceil(agents.length / 5))) return 'Minero';
  if (counts.Agricultor < Math.max(1, Math.ceil(agents.length / 7))) return 'Agricultor';
  if (counts.Comerciante < Math.max(1, Math.floor(agents.length / 7))) return 'Comerciante';
  return 'Recolector';
}

export function findOperatorCandidateForBuilding(
  state: SimulationState,
  type: SpecialBuildingType
): Agent | null {
  const validJobs = SPECIAL_BUILDING_STAFF_JOBS[type];
  const freeMatched = state.agents.find(
    (a) =>
      !a.isChild &&
      a.ageYears >= 15 &&
      a.jailedDays <= 0 &&
      validJobs.includes(a.job) &&
      a.assignedBuildingId === null
  );
  if (freeMatched) return freeMatched;

  // Buscar un adulto disponible que pueda asumir el oficio (no imprescindible en otro edificio)
  const flexible = state.agents.find(
    (a) =>
      !a.isChild &&
      a.ageYears >= 15 &&
      a.jailedDays <= 0 &&
      a.assignedBuildingId === null &&
      (a.job === 'Recolector' ||
        a.job === 'Aprendiz' ||
        a.job === 'Leñador' ||
        a.job === 'Agricultor')
  );
  if (flexible) return flexible;

  // Segundo nivel: cualquier otro adulto sin edificio asignado ni rol médico o de construcción activo
  const secondary = state.agents.find(
    (a) =>
      !a.isChild &&
      a.ageYears >= 15 &&
      a.jailedDays <= 0 &&
      a.assignedBuildingId === null &&
      !a.activeConstruction &&
      a.job !== 'Curandero' &&
      a.job !== 'Constructor'
  );
  if (secondary) return secondary;

  // Último recurso (ej. aldea con 1 solo adulto): cualquiera sin edificio asignado ni obra activa
  const fallback = state.agents.find(
    (a) =>
      !a.isChild &&
      a.ageYears >= 15 &&
      a.jailedDays <= 0 &&
      a.assignedBuildingId === null &&
      !a.activeConstruction &&
      a.job !== 'Curandero'
  );
  return fallback ?? null;
}

export function hasAvailableOperatorForBuilding(
  state: SimulationState,
  type: SpecialBuildingType
): boolean {
  return findOperatorCandidateForBuilding(state, type) !== null;
}

export function syncSpecialBuildingStaff(state: SimulationState): void {
  const livingIds = new Set(state.agents.map((a) => a.id));
  for (const a of state.agents) {
    if (a.assignedBuildingId !== null && !state.specialBuildings.some((b) => b.id === a.assignedBuildingId)) {
      a.assignedBuildingId = null;
    }
  }

  for (const b of state.specialBuildings) {
    if (!b.allowedStorage || b.allowedStorage.length === 0) {
      b.allowedStorage = [...SPECIAL_BUILDING_ALLOWED_STORAGE[b.type]];
    }
    if (typeof b.durability !== 'number') b.durability = 100;
    if (typeof b.price !== 'number') b.price = SPECIAL_BUILDING_LABELS[b.type].basePrice;
    if (b.ownerId !== null && !livingIds.has(b.ownerId)) {
      b.ownerId = null;
      b.forSale = true;
    }

    const validJobs = SPECIAL_BUILDING_STAFF_JOBS[b.type];
    const staff: number[] = [];

    // Si tiene dueño válido con oficio compatible, priorizarlo
    if (b.ownerId !== null) {
      const owner = state.agents.find((a) => a.id === b.ownerId && !a.isChild && a.jailedDays <= 0);
      if (owner && validJobs.includes(owner.job)) {
        owner.assignedBuildingId = b.id;
        staff.push(owner.id);
      }
    }

    for (const agent of state.agents) {
      if (agent.isChild || agent.jailedDays > 0 || !livingIds.has(agent.id)) continue;
      if (staff.includes(agent.id)) continue;
      if (validJobs.includes(agent.job)) {
        if (agent.assignedBuildingId === null || agent.assignedBuildingId === b.id) {
          // Si ya tiene dueño exclusivo de comercio/muelle/banco/taller, no usurpa propiedad ajena salvo ser empleado o sin dueño
          if (b.ownerId === null) {
            b.ownerId = agent.id;
            b.forSale = false;
          }
          agent.assignedBuildingId = b.id;
          staff.push(agent.id);
        }
      }
    }
    b.staffIds = staff;
    const unpaidDays = b.unpaidMaintenanceDays ?? 0;
    if (typeof b.unpaidMaintenanceDays !== 'number') b.unpaidMaintenanceDays = 0;
    if (typeof b.maintenanceDebtCount !== 'number') b.maintenanceDebtCount = 0;
    if (!b.maintenanceStatus) {
      b.maintenanceStatus = getMaintenanceStatusFromUnpaidDays(b.unpaidMaintenanceDays);
    }
    if (typeof b.lastMaintenanceDay !== 'number') b.lastMaintenanceDay = state.day;

    if (unpaidDays >= PROGRESSIVE_WEAR_THRESHOLDS.inoperativeDays || b.durability <= 10) {
      b.efficiencyMultiplier = 0;
      b.isOperational = false;
    } else if (unpaidDays >= PROGRESSIVE_WEAR_THRESHOLDS.halfEfficiencyDays) {
      b.efficiencyMultiplier = 0.5;
      b.isOperational = staff.length > 0;
    } else {
      b.efficiencyMultiplier = 1;
      b.isOperational = staff.length > 0 && b.durability > 10;
    }
  }
}

export function isBuildingOperational(state: SimulationState, type: SpecialBuildingType): boolean {
  return state.specialBuildings.some((b) => b.type === type && b.isOperational);
}

export function getCompetingBuildingCount(
  state: SimulationState,
  type: SpecialBuildingType
): number {
  return Math.max(
    1,
    state.specialBuildings.filter((b) => b.type === type && b.isOperational).length
  );
}

export function transferBuildingOwnership(
  state: SimulationState,
  buildingId: number,
  newOwnerId: number | null,
  reason = 'transferencia comercial'
): boolean {
  const b = state.specialBuildings.find((item) => item.id === buildingId);
  if (!b) return false;
  const prevOwner = b.ownerId !== null ? state.agents.find((a) => a.id === b.ownerId) : null;
  if (prevOwner && prevOwner.assignedBuildingId === b.id) {
    prevOwner.assignedBuildingId = null;
  }
  b.ownerId = newOwnerId;
  b.forSale = newOwnerId === null;
  if (newOwnerId !== null) {
    const nextOwner = state.agents.find((a) => a.id === newOwnerId);
    if (nextOwner) {
      const validJob = SPECIAL_BUILDING_STAFF_JOBS[b.type][0];
      if (!SPECIAL_BUILDING_STAFF_JOBS[b.type].includes(nextOwner.job) && !nextOwner.isChild) {
        nextOwner.job = validJob;
      }
      nextOwner.assignedBuildingId = b.id;
      nextOwner.lastQwenDecision = `Asumió propiedad de ${b.name} (${reason}).`;
      addLog(state, `${nextOwner.name} es el nuevo propietario de ${b.name} (${reason}).`, 'amber');
    }
  } else {
    addLog(state, `${b.name} quedó en venta (${reason}).`, 'slate');
  }
  syncSpecialBuildingStaff(state);
  return true;
}

export function rebalanceBuildingOwnership(state: SimulationState): number {
  let changes = 0;
  for (const b of state.specialBuildings) {
    if (b.category !== 'commerce' && b.type !== 'dock') continue;
    const owner = b.ownerId !== null ? state.agents.find((a) => a.id === b.ownerId) : null;

    if (owner && !b.forSale && (owner.happiness < 28 || owner.energy < 20)) {
      b.forSale = true;
      owner.lastQwenDecision = `Qwen 2.5 permitió a ${owner.name} poner en venta ${b.name} por agotamiento.`;
      addLog(state, `${owner.name} puso en venta ${b.name} (${b.price} mon.).`, 'slate');
    }

    if (b.forSale || b.ownerId === null) {
      const buyer = state.agents.find(
        (a) =>
          !a.isChild &&
          a.id !== b.ownerId &&
          a.jailedDays <= 0 &&
          a.assignedBuildingId === null &&
          a.education >= 30 &&
          a.coins >= b.price
      );
      if (buyer) {
        buyer.coins -= b.price;
        if (owner) owner.coins += b.price;
        if (transferBuildingOwnership(state, b.id, buyer.id, `compra autónoma por ${b.price} mon.`)) {
          changes++;
        }
      }
    }
  }
  return changes;
}

export function getTotalCirculatingCoins(state: SimulationState): number {
  const agentCoins = state.agents.reduce((acc, a) => acc + a.coins, 0);
  const houseCoins = state.houses.reduce((acc, h) => acc + h.storage.coins, 0);
  const specialCoins = state.specialBuildings.reduce((acc, b) => acc + b.storage.coins, 0);
  return agentCoins + houseCoins + specialCoins;
}

export function recalculateEconomyReserve(state: SimulationState): void {
  const totalMetalGold =
    state.economyReserve.goldReserve +
    state.agents.reduce((acc, a) => acc + a.inv.gold, 0) +
    state.houses.reduce((acc, h) => acc + h.storage.gold, 0) +
    state.specialBuildings.reduce((acc, b) => acc + b.storage.gold, 0);
  const totalMetalSilver =
    state.economyReserve.silverReserve +
    state.agents.reduce((acc, a) => acc + a.inv.silver, 0) +
    state.houses.reduce((acc, h) => acc + h.storage.silver, 0) +
    state.specialBuildings.reduce((acc, b) => acc + b.storage.silver, 0);
  state.economyReserve.backedCoinsCapacity =
    totalMetalGold * GOLD_COIN_BACKING + totalMetalSilver * SILVER_COIN_BACKING;
  state.economyReserve.mintedCoins = getTotalCirculatingCoins(state);
}

/**
 * Emite monedas únicamente si el Fondo de Oro y Plata tiene respaldo suficiente.
 */
export function mintBackedCoins(state: SimulationState, requestedCoins: number): number {
  if (requestedCoins <= 0) return 0;
  recalculateEconomyReserve(state);
  const availableBacking = Math.max(
    0,
    state.economyReserve.backedCoinsCapacity - state.economyReserve.mintedCoins
  );
  const minted = Math.min(requestedCoins, availableBacking);
  state.economyReserve.mintedCoins += minted;
  return minted;
}

export function addPreciousMetalToReserve(
  state: SimulationState,
  metal: 'gold' | 'silver',
  amount: number
): void {
  if (amount <= 0) return;
  if (metal === 'gold') state.economyReserve.goldReserve += amount;
  else state.economyReserve.silverReserve += amount;
  recalculateEconomyReserve(state);
}

export function createEmptyHouseStorage(initialFood = 1): HouseStorage {
  return {
    food: initialFood,
    wood: 0,
    pineWood: 0,
    mapleWood: 0,
    oakWood: 0,
    stone: 0,
    copper: 0,
    iron: 0,
    gold: 0,
    silver: 0,
    coins: 0,
    milk: 0,
    bread: 0,
    tools: 0,
    medicine: 0,
  };
}

/**
 * Las viviendas SOLO pueden guardar Alimento (food) y Monedas (coins).
 * Los demás recursos materiales se depositan en el Depósito General o en el edificio permitido.
 */
export function depositResourcesToHouse(
  agent: Agent,
  house: House,
  mode: 'surplus' | 'all' = 'surplus',
  generalDepot?: SpecialBuilding | null
): number {
  let moved = 0;
  const keepBasic = mode === 'all' ? 0 : 1;

  // En la vivienda: únicamente Alimento y Monedas
  if (agent.inv.food > keepBasic) {
    const qty = agent.inv.food - keepBasic;
    agent.inv.food -= qty;
    house.storage.food += qty;
    moved += qty;
  }
  const keepCoins = mode === 'all' ? 0 : 10;
  if (agent.coins > keepCoins) {
    const qty = mode === 'all' ? agent.coins : Math.floor((agent.coins - keepCoins) / 2);
    if (qty > 0) {
      agent.coins -= qty;
      house.storage.coins += qty;
      moved += qty;
    }
  }

  // El resto de bienes va al Depósito General (si existe)
  if (generalDepot) {
    moved += depositMaterialsToBuilding(agent, generalDepot, mode);
  }

  return moved;
}

export function depositMaterialsToBuilding(
  agent: Agent,
  building: SpecialBuilding,
  mode: 'surplus' | 'all' = 'surplus'
): number {
  const allowed = new Set(building.allowedStorage ?? SPECIAL_BUILDING_ALLOWED_STORAGE[building.type]);
  const keepBasic = mode === 'all' ? 0 : 1;
  let moved = 0;

  const invKeys: Array<keyof ResourceInventory> = [
    'wood',
    'pineWood',
    'mapleWood',
    'oakWood',
    'stone',
    'copper',
    'iron',
    'gold',
    'silver',
  ];

  for (const k of invKeys) {
    if (!allowed.has(k)) continue;
    const minKeep = k === 'gold' || k === 'silver' || k === 'copper' ? 0 : keepBasic;
    if (agent.inv[k] > minKeep) {
      const qty = agent.inv[k] - minKeep;
      agent.inv[k] -= qty;
      building.storage[k] += qty;
      moved += qty;
    }
  }

  if (allowed.has('milk') && agent.milkCount > 0) {
    building.storage.milk += agent.milkCount;
    moved += agent.milkCount;
    agent.milkCount = 0;
  }
  if (allowed.has('bread') && agent.breadCount > 1) {
    const qty = agent.breadCount - 1;
    agent.breadCount -= qty;
    building.storage.bread += qty;
    moved += qty;
  }
  if (allowed.has('medicine') && agent.medicineCount > 1) {
    const qty = agent.medicineCount - 1;
    agent.medicineCount -= qty;
    building.storage.medicine += qty;
    moved += qty;
  }
  if (allowed.has('tools') && agent.toolsCount > 1) {
    const qty = agent.toolsCount - 1;
    agent.toolsCount -= qty;
    building.storage.tools += qty;
    moved += qty;
  }
  return moved;
}

export function withdrawResourceFromHouse(
  agent: Agent,
  house: House,
  resource: keyof HouseStorage,
  amount = 1
): number {
  const available = house.storage[resource];
  const take = Math.min(available, Math.max(0, amount));
  if (take <= 0) return 0;
  house.storage[resource] -= take;
  if (resource === 'coins') agent.coins += take;
  else if (resource === 'bread') agent.breadCount += take;
  else if (resource === 'milk') agent.milkCount += take;
  else if (resource === 'medicine') agent.medicineCount += take;
  else if (resource === 'tools') agent.toolsCount += take;
  else agent.inv[resource] += take;
  return take;
}

/**
 * En viviendas el usuario SOLO puede eliminar existencias (delta < 0), y solo existen food/coins.
 */
export function modifyHouseStorage(
  state: SimulationState,
  houseId: number,
  key: keyof HouseStorage,
  delta: number,
  byUser = true
): boolean {
  const house = state.houses.find((h) => h.id === houseId);
  if (!house) return false;
  if (delta === 0) return false;
  if (!HOUSE_ALLOWED_STORAGE.includes(key)) return false;
  if (byUser && delta > 0) {
    addLog(
      state,
      `Las viviendas solo permiten retirar o vaciar reservas (Alimento y Monedas); no se pueden agregar ítems manualmente.`,
      'amber'
    );
    return false;
  }

  const prev = house.storage[key];
  const next = Math.max(0, prev + delta);
  if (next === prev) return false;
  house.storage[key] = next;
  recalculateEconomyReserve(state);
  addLog(
    state,
    `Retiraste ${Math.abs(next - prev)} de ${key === 'food' ? 'Alimento' : 'Monedas'} del baúl de ${house.name}.`,
    'amber'
  );
  return true;
}

export function modifySpecialBuildingStorage(
  state: SimulationState,
  buildingId: number,
  key: keyof HouseStorage,
  delta: number
): boolean {
  const building = state.specialBuildings.find((b) => b.id === buildingId);
  if (!building) return false;
  if (delta === 0) return false;
  const allowed = building.allowedStorage ?? SPECIAL_BUILDING_ALLOWED_STORAGE[building.type];
  if (!allowed.includes(key)) return false;

  if (key === 'coins' && delta > 0) {
    const minted = mintBackedCoins(state, delta);
    if (minted <= 0) return false;
    building.storage.coins += minted;
    recalculateEconomyReserve(state);
    return true;
  }

  const prev = building.storage[key];
  const next = Math.max(0, prev + delta);
  if (next === prev) return false;
  building.storage[key] = next;
  recalculateEconomyReserve(state);
  return true;
}

export function recordResourceOperation(
  state: SimulationState,
  entry: Omit<ResourceOperationRecord, 'id' | 'day'>
): ResourceOperationRecord {
  if (!Array.isArray(state.resourceLedger)) state.resourceLedger = [];
  const rec: ResourceOperationRecord = {
    id: state.nextId++,
    day: state.day,
    ...entry,
  };
  state.resourceLedger.unshift(rec);
  if (state.resourceLedger.length > 120) state.resourceLedger.length = 120;
  return rec;
}

export function getOperationalDepots(state: SimulationState): SpecialBuilding[] {
  return state.specialBuildings.filter((b) => b.type === 'general_depot' && b.isOperational);
}

export function canApplyCarpentryHousingDiscount(state: SimulationState, cost: ResourceCostMap): boolean {
  const hasWoodDiscountTarget =
    (cost.wood ?? 0) > 1 || (cost.pineWood ?? 0) > 2 || (cost.oakWood ?? 0) > 2;
  if (!hasWoodDiscountTarget) return false;
  const carpentry = state.specialBuildings.find((b) => b.type === 'carpentry' && b.isOperational);
  if (!carpentry) return false;
  return carpentry.storage.wood >= 1 || carpentry.storage.pineWood >= 1;
}

export function consumeCarpentryHousingDiscount(
  state: SimulationState,
  actorName: string,
  targetName: string
): boolean {
  const carpentry = state.specialBuildings.find((b) => b.type === 'carpentry' && b.isOperational);
  if (!carpentry) return false;
  let consumedKey: 'wood' | 'pineWood' | null = null;
  if (carpentry.storage.wood >= 1) {
    carpentry.storage.wood -= 1;
    consumedKey = 'wood';
  } else if (carpentry.storage.pineWood >= 1) {
    carpentry.storage.pineWood -= 1;
    consumedKey = 'pineWood';
  }
  if (!consumedKey) return false;
  recordResourceOperation(state, {
    actorName,
    targetName,
    operationType: 'produccion',
    materials: { [consumedKey]: 1 },
    source: `${carpentry.name}`,
    result: 'Descuento -1 madera en vivienda',
  });
  return true;
}

export interface MaterialReservationResult {
  ok: boolean;
  fromPersonal: ResourceCostMap;
  fromDepot: ResourceCostMap;
  missing: ResourceCostMap;
}

/**
 * Reserva y descuenta materiales EXACTOS (sin sustituir maderas) ÚNICAMENTE desde:
 * (1) Inventario personal del aldeano/constructor, y
 * (2) Depósito General operativo (extracción registrada en resourceLedger).
 * Está estrictamente prohibido descontar de otros aldeanos, casas o edificios ajenos.
 */
export function reserveConstructionMaterials(
  state: SimulationState,
  builder: Agent | null,
  reqs: ResourceCostMap,
  allowDepotExtraction = true,
  targetName = 'Obra',
  operationType: ConstructionOperationType = 'construccion'
): MaterialReservationResult {
  const depots = allowDepotExtraction ? getOperationalDepots(state) : [];
  const missing: ResourceCostMap = {};

  for (const [rawKey, rawNeed] of Object.entries(reqs)) {
    const key = rawKey as keyof ResourceInventory;
    const need = rawNeed ?? 0;
    if (need <= 0) continue;
    const personalAvail = builder ? builder.inv[key] : 0;
    const depotAvail = depots.reduce((acc, d) => acc + d.storage[key], 0);
    const total = personalAvail + depotAvail;
    if (total < need) {
      missing[key] = need - total;
    }
  }

  if (Object.keys(missing).length > 0) {
    return { ok: false, fromPersonal: {}, fromDepot: {}, missing };
  }

  const fromPersonal: ResourceCostMap = {};
  const fromDepot: ResourceCostMap = {};

  for (const [rawKey, rawNeed] of Object.entries(reqs)) {
    const key = rawKey as keyof ResourceInventory;
    let remaining = rawNeed ?? 0;
    if (remaining <= 0) continue;

    if (builder && builder.inv[key] > 0) {
      const take = Math.min(builder.inv[key], remaining);
      builder.inv[key] -= take;
      fromPersonal[key] = (fromPersonal[key] ?? 0) + take;
      remaining -= take;
    }

    if (remaining > 0) {
      for (const depot of depots) {
        if (remaining <= 0) break;
        const avail = depot.storage[key];
        if (avail > 0) {
          const take = Math.min(avail, remaining);
          depot.storage[key] -= take;
          fromDepot[key] = (fromDepot[key] ?? 0) + take;
          remaining -= take;
        }
      }
    }
  }

  const actorName = builder?.name ?? 'Alcaldía / Depósito';
  if (Object.keys(fromDepot).length > 0) {
    recordResourceOperation(state, {
      actorName,
      targetName,
      operationType: 'extraccion_deposito',
      materials: fromDepot,
      source: 'Depósito General',
      result: 'Extracción autorizada',
    });
  }

  const usedTotal = Object.values(reqs).some((v) => (v ?? 0) > 0);
  if (usedTotal) {
    const sourceLabel =
      Object.keys(fromPersonal).length > 0 && Object.keys(fromDepot).length > 0
        ? 'Personal + Depósito General'
        : Object.keys(fromDepot).length > 0
          ? 'Depósito General'
          : `Inventario (${actorName})`;
    recordResourceOperation(state, {
      actorName,
      targetName,
      operationType,
      materials: reqs,
      source: sourceLabel,
      result: 'Confirmado',
    });
  }

  return { ok: true, fromPersonal, fromDepot, missing: {} };
}

export function consumeConstructionResources(
  state: SimulationState,
  builder: Agent | null,
  reqs: ResourceCostMap,
  allowDepotExtraction = true,
  targetName = 'Obra',
  operationType: ConstructionOperationType = 'construccion'
): boolean {
  return reserveConstructionMaterials(
    state,
    builder,
    reqs,
    allowDepotExtraction,
    targetName,
    operationType
  ).ok;
}

const CONSTRUCTION_DELIVERY_KEYS: Array<keyof ResourceInventory> = [
  'wood',
  'pineWood',
  'mapleWood',
  'oakWood',
  'stone',
  'copper',
  'iron',
];

export function getAgentSurplusConstructionMaterials(agent: Agent): number {
  const keepWood = agent.job === 'Boticario' ? 1 : 0;
  const keepCopper = agent.job === 'Herrero' || agent.job === 'Artesano' ? 1 : 0;
  const keepIron = agent.job === 'Herrero' || agent.job === 'Artesano' ? 1 : 0;
  return (
    Math.max(0, agent.inv.wood - keepWood) +
    agent.inv.pineWood +
    agent.inv.mapleWood +
    agent.inv.oakWood +
    agent.inv.stone +
    Math.max(0, agent.inv.copper - keepCopper) +
    Math.max(0, agent.inv.iron - keepIron)
  );
}

/**
 * Entrega cooperativa física de materiales recolectados desde un aldeano no-constructor hacia un Constructor.
 * Mantiene intacto el origen estricto en startConstructionProject (solo Constructor + Depósito General).
 */
export function transferMaterialsToConstructor(
  state: SimulationState,
  carrier: Agent,
  builder: Agent
): number {
  if (carrier.id === builder.id || carrier.isChild || builder.isChild || builder.jailedDays > 0) {
    return 0;
  }
  const movedMaterials: ResourceCostMap = {};
  let totalMoved = 0;

  for (const key of CONSTRUCTION_DELIVERY_KEYS) {
    const reserveKeep =
      key === 'wood' && carrier.job === 'Boticario'
        ? 1
        : (key === 'copper' || key === 'iron') &&
            (carrier.job === 'Herrero' || carrier.job === 'Artesano')
          ? 1
          : 0;
    const avail = Math.max(0, carrier.inv[key] - reserveKeep);
    if (avail > 0) {
      carrier.inv[key] -= avail;
      builder.inv[key] += avail;
      movedMaterials[key] = avail;
      totalMoved += avail;
    }
  }

  if (totalMoved > 0) {
    carrier.thought = `Entregué ${totalMoved} materiales a ${builder.name} para construir.`;
    builder.thought = `Recibí ${totalMoved} materiales de ${carrier.name} para levantar obras.`;
    recordResourceOperation(state, {
      actorName: carrier.name,
      targetName: `Constructor ${builder.name}`,
      operationType: 'deposito',
      materials: movedMaterials,
      source: `Inventario (${carrier.name})`,
      result: `+${totalMoved} materiales al Constructor`,
    });
  }
  return totalMoved;
}

export function craftToolsForAgent(state: SimulationState, agent: Agent): boolean {
  if (agent.education < 36) return false;
  const need = PRODUCTION_INPUT_COSTS.forgeTool; // 1 copper + 1 iron
  const depots = getOperationalDepots(state);
  const forges = state.specialBuildings.filter((b) => b.type === 'forge' && b.isOperational);

  const availCopper =
    agent.inv.copper +
    forges.reduce((acc, f) => acc + f.storage.copper, 0) +
    depots.reduce((acc, d) => acc + d.storage.copper, 0);
  const availIron =
    agent.inv.iron +
    forges.reduce((acc, f) => acc + f.storage.iron, 0) +
    depots.reduce((acc, d) => acc + d.storage.iron, 0);

  if (availCopper < (need.copper ?? 1) || availIron < (need.iron ?? 1)) {
    return false;
  }

  const takeUnit = (key: 'copper' | 'iron'): string => {
    if (agent.inv[key] > 0) {
      agent.inv[key] -= 1;
      return `Inventario (${agent.name})`;
    }
    for (const f of forges) {
      if (f.storage[key] > 0) {
        f.storage[key] -= 1;
        return f.name;
      }
    }
    for (const d of depots) {
      if (d.storage[key] > 0) {
        d.storage[key] -= 1;
        return d.name;
      }
    }
    return '';
  };

  const srcCopper = takeUnit('copper');
  const srcIron = takeUnit('iron');
  agent.toolsCount += 1;
  state.knowledge += 3;
  agent.constructionKnowledge = clamp(agent.constructionKnowledge + 4, 0, 100);
  advanceJobMastery(agent, 'Herrero', 4);
  recordResourceOperation(state, {
    actorName: agent.name,
    targetName: 'Herramientas',
    operationType: 'produccion',
    materials: need,
    source: srcCopper === srcIron ? srcCopper : `${srcCopper} + ${srcIron}`,
    result: '+1 Herramienta forjada',
  });
  addLog(state, `${agent.name} forjó herramientas (1 Cobre + 1 Hierro).`, 'amber');
  return true;
}

export function pickBestPartnerForAgent(
  state: SimulationState,
  agent: Agent,
  excludeId: number | null = null
): Agent | null {
  if (agent.isChild || agent.ageYears < AGE_PARTNER_MIN_YEARS || agent.jailedDays > 0) {
    return null;
  }
  const pool = state.agents.filter(
    (other) =>
      other.id !== agent.id &&
      other.id !== excludeId &&
      !other.isChild &&
      other.ageYears >= AGE_PARTNER_MIN_YEARS &&
      other.partnerId === null &&
      other.jailedDays <= 0 &&
      !agent.exPartnerIds.includes(other.id)
  );
  if (pool.length === 0) return null;

  const oppositeSex = pool.filter((o) => o.sex !== agent.sex);
  const sameSex = pool.filter((o) => o.sex === agent.sex);

  if (agent.wantsChildren) {
    if (oppositeSex.length > 0) {
      const familyMinded = oppositeSex.filter((o) => o.wantsChildren);
      const preferred = familyMinded.length > 0 ? familyMinded : oppositeSex;
      return [...preferred].sort(
        (a, b) => Math.hypot(a.x - agent.x, a.y - agent.y) - Math.hypot(b.x - agent.x, b.y - agent.y)
      )[0];
    }
    return null;
  }

  // Para quienes no desean hijos: predomina distinto sexo (~70%), pero pueden surgir parejas del mismo sexo (~30%)
  if (oppositeSex.length > 0 && (sameSex.length === 0 || Math.random() < 0.7)) {
    return oppositeSex[Math.floor(Math.random() * oppositeSex.length)];
  }
  if (sameSex.length > 0) {
    return sameSex[Math.floor(Math.random() * sameSex.length)];
  }
  return null;
}

export function switchPartnerForAgent(
  state: SimulationState,
  agentId: number,
  reason = 'buscando mayor afinidad'
): { switched: boolean; newPartnerName: string | null; message: string } {
  const agent = state.agents.find((a) => a.id === agentId);
  if (!agent) return { switched: false, newPartnerName: null, message: 'Aldeano no encontrado.' };
  if (agent.isChild || agent.ageYears < AGE_PARTNER_MIN_YEARS) {
    return { switched: false, newPartnerName: null, message: `${agent.name} es menor de ${AGE_PARTNER_MIN_YEARS} años.` };
  }

  const prevPartnerId = agent.partnerId;
  if (prevPartnerId !== null) {
    const prev = state.agents.find((a) => a.id === prevPartnerId);
    if (!agent.exPartnerIds.includes(prevPartnerId)) {
      agent.exPartnerIds.push(prevPartnerId);
    }
    agent.partnerId = null;
    if (prev) {
      if (!prev.exPartnerIds.includes(agent.id)) {
        prev.exPartnerIds.push(agent.id);
      }
      prev.partnerId = null;
      prev.moodModifier = clamp(prev.moodModifier - 8, -45, 45);
      prev.thought = `${agent.name} y yo decidimos tomar caminos distintos.`;
      prev.lastQwenDecision = `Qwen 2.5 registró separación mutua con ${agent.name}.`;
    }
  }

  const candidate = pickBestPartnerForAgent(state, agent, prevPartnerId);

  if (candidate) {
    agent.partnerId = candidate.id;
    candidate.partnerId = agent.id;
    const msg =
      prevPartnerId !== null
        ? `${agent.name} cambió de pareja (${reason}) y ahora está con ${candidate.name}.`
        : `${agent.name} formó nueva pareja con ${candidate.name}.`;
    agent.lastQwenDecision = `Qwen 2.5 gestionó pareja: ${candidate.name}.`;
    candidate.lastQwenDecision = `Qwen 2.5 aprobó pareja con ${agent.name}.`;
    agent.thought = `Elegí compartir mi vida con ${candidate.name}.`;
    candidate.thought = `Acepté formar pareja con ${agent.name}.`;
    rebalanceFamilyHousing(state);
    addLog(state, msg, 'violet');
    return { switched: true, newPartnerName: candidate.name, message: msg };
  }

  const soloMsg = `${agent.name} dejó su relación anterior (${reason}) y quedó soltero/a.`;
  agent.lastQwenDecision = `Qwen 2.5 validó separación (${reason}).`;
  agent.thought = 'Prefiero estar solo/a hasta encontrar a alguien compatible.';
  addLog(state, soloMsg, 'slate');
  return { switched: true, newPartnerName: null, message: soloMsg };
}

export type QwenDecisionType =
  | 'adult_job'
  | 'partnership'
  | 'reproduction'
  | 'construction'
  | 'crisis'
  | 'daily_agent_tick';

/**
 * Qwen 2.5 toma decisiones de mayor calidad a medida que sube el Saber y la maestría del aldeano.
 */
export function decideVillagerMajorAction(
  state: SimulationState,
  agent: Agent,
  decisionType: QwenDecisionType,
  detail?: {
    partner?: Agent;
    chosenBuilding?: SpecialBuildingType | 'house' | 'upgrade' | 'plaza' | 'bridge' | 'farm';
    threatName?: string;
  }
): { approved: boolean; summary: string } {
  const totalFood =
    state.agents.reduce((acc, a) => acc + a.inv.food + a.breadCount, 0) +
    state.houses.reduce((acc, h) => acc + h.storage.food, 0);
  const sickCount = state.agents.filter((a) => a.isSick).length;
  const homelessCount = state.agents.filter((a) => a.houseId === null).length;
  const wisdomBonus = agent.education >= 60 ? 'estrategia avanzada' : agent.education >= 30 ? 'criterio táctico' : 'impulso básico';

  switch (decisionType) {
    case 'adult_job': {
      const nextJob = assignBalancedJob(
        agent,
        state.agents,
        state.houses,
        state.policies,
        state.specialBuildings
      );
      agent.job = nextJob;
      const reason =
        sickCount > 0 && nextJob === 'Curandero'
          ? 'hay enfermos que atender'
          : state.farms.length === 0 || totalFood < state.agents.length
            ? 'falta alimento para sostener la especie'
            : homelessCount > 0
              ? 'se necesitan viviendas nuevas'
              : state.policies.economyFocus
                ? 'conviene impulsar economía respaldada'
                : 'impulsar la evolución de la especie y la aldea';
      const summary = `Qwen 2.5 (${wisdomBonus}) asignó oficio ${nextJob} a ${agent.name} (${reason}).`;
      agent.lastQwenDecision = summary;
      agent.qwenPlan = `Evolución · ${nextJob} (${reason})`;
      agent.thought = `Qwen 2.5 me orientó como ${nextJob} para evolucionar la aldea.`;
      return { approved: true, summary };
    }
    case 'partnership': {
      const partner = detail?.partner;
      if (!partner) return { approved: false, summary: 'Sin candidato.' };
      if (
        agent.isChild ||
        partner.isChild ||
        agent.ageYears < AGE_PARTNER_MIN_YEARS ||
        partner.ageYears < AGE_PARTNER_MIN_YEARS ||
        agent.partnerId !== null ||
        partner.partnerId !== null
      ) {
        return { approved: false, summary: 'Condiciones de edad o estado civil no válidas.' };
      }
      if (agent.exPartnerIds.includes(partner.id) && Math.random() < 0.85) {
        return { approved: false, summary: 'Expareja reciente.' };
      }
      // Quienes quieren tener hijos priorizan firmemente pareja de distinto sexo para asegurar descendencia;
      // las parejas del mismo sexo siguen existiendo como minoría entre quienes no buscan hijos o por libre albedrío.
      if (agent.sex === partner.sex) {
        const hasOppositeSingle = state.agents.some(
          (o) =>
            o.id !== agent.id &&
            o.id !== partner.id &&
            !o.isChild &&
            o.ageYears >= AGE_PARTNER_MIN_YEARS &&
            o.partnerId === null &&
            o.jailedDays <= 0 &&
            o.sex !== agent.sex
        );
        if ((agent.wantsChildren || partner.wantsChildren) && hasOppositeSingle) {
          return {
            approved: false,
            summary: `${agent.name} busca formar familia y prioriza pareja de distinto sexo.`,
          };
        }
        if ((agent.wantsChildren || partner.wantsChildren) && Math.random() < 0.85) {
          return {
            approved: false,
            summary: `${agent.name} prefiere esperar pareja de distinto sexo para tener hijos.`,
          };
        }
        if (Math.random() >= 0.35) {
          return {
            approved: false,
            summary: 'Afinidad insuficiente para vínculo del mismo sexo.',
          };
        }
      }
      const canHaveKids =
        agent.sex !== partner.sex &&
        agent.wantsChildren &&
        partner.wantsChildren;
      const summary = canHaveKids
        ? `Qwen 2.5 aprobó pareja entre ${agent.name} y ${partner.name} (proyecto familiar).`
        : `Qwen 2.5 aprobó pareja entre ${agent.name} y ${partner.name} (vínculo libre sin hijos).`;
      agent.lastQwenDecision = summary;
      partner.lastQwenDecision = summary;
      agent.qwenPlan = `Cooperar con ${partner.name} y sostener el hogar`;
      partner.qwenPlan = `Cooperar con ${agent.name} y sostener el hogar`;
      agent.thought = canHaveKids
        ? `Formé pareja con ${partner.name} para construir hogar y futuro.`
        : `Formé pareja con ${partner.name} por libre albedrío; nos enfocaremos en la aldea.`;
      partner.thought = agent.thought;
      return { approved: true, summary };
    }
    case 'reproduction': {
      const partner = detail?.partner;
      if (!partner) return { approved: false, summary: 'Sin pareja.' };
      if (agent.sex === partner.sex) {
        const summary = `Qwen 2.5 bloqueó natalidad entre ${agent.name} y ${partner.name} (solo distinto sexo).`;
        agent.lastQwenDecision = summary;
        return { approved: false, summary };
      }
      if (agent.ageYears < AGE_REPRODUCE_MIN_YEARS || partner.ageYears < AGE_REPRODUCE_MIN_YEARS) {
        return { approved: false, summary: 'Edad mínima de 20 años requerida.' };
      }
      if (!agent.wantsChildren || !partner.wantsChildren) {
        const summary = `Qwen 2.5 respetó la decisión de ${agent.name} y ${partner.name} de no tener hijos.`;
        agent.lastQwenDecision = summary;
        return { approved: false, summary };
      }
      if (totalFood < Math.max(4, Math.floor(state.agents.length * 0.45)) && state.farms.length === 0) {
        const summary = `Qwen 2.5 postergó embarazo para ${agent.name} hasta asegurar comida.`;
        agent.lastQwenDecision = summary;
        agent.thought = 'Antes de formar familia debemos asegurar comida y vivienda.';
        return { approved: false, summary };
      }
      const summary = `Qwen 2.5 autorizó embarazo de 3 días para ${agent.name} y ${partner.name}.`;
      agent.lastQwenDecision = summary;
      partner.lastQwenDecision = summary;
      return { approved: true, summary };
    }
    case 'construction': {
      const target = detail?.chosenBuilding ?? 'house';
      const label =
        target === 'house'
          ? 'vivienda nueva'
          : target === 'upgrade'
            ? 'mejora de vivienda'
            : target === 'plaza'
              ? 'Plaza Central'
              : target === 'bridge'
                ? 'Puente sobre el río'
                : target === 'farm'
                  ? 'parcela de cultivo'
                  : SPECIAL_BUILDING_LABELS[target].label;
      const summary = `Qwen 2.5 (${wisdomBonus}) decidió dónde ubicará ${agent.name} su ${label}.`;
      agent.lastQwenDecision = summary;
      agent.qwenPlan = `Construir ${label}`;
      agent.thought = `Junté recursos y Qwen 2.5 eligió dónde construir ${label}.`;
      return { approved: true, summary };
    }
    case 'crisis': {
      if (detail?.threatName) {
        const summary = `Qwen 2.5 alertó a ${agent.name} ante ${detail.threatName}.`;
        agent.lastQwenDecision = summary;
        agent.qwenPlan = `Resguardarse de ${detail.threatName}`;
        agent.thought = `Hay ${detail.threatName} cerca; busco un perro guardián o refugio.`;
        return { approved: true, summary };
      }
      if (agent.isSick) {
        if (canAgentRest(agent)) {
          agent.taskType = 'sleep';
          agent.activity = getConciseTaskLabel('sleep');
          const summary = `Qwen 2.5 ordenó reposo médico en casa a ${agent.name}.`;
          agent.lastQwenDecision = summary;
          agent.qwenPlan = 'Recuperar salud en vivienda / Hospital';
          agent.thought = 'Debo descansar en mi casa y recibir atención médica.';
          return { approved: true, summary };
        }
        const summary = `${agent.name} está enfermo y sin casa: no puede descansar; necesita vivienda urgente.`;
        agent.lastQwenDecision = summary;
        agent.qwenPlan = 'Construir o conseguir casa para poder descansar';
        agent.thought = 'Sin casa no puedo descansar y mi salud empeora.';
        return { approved: true, summary };
      }
      if (state.farms.length === 0 || agent.hunger > 70) {
        agent.taskType = agent.job === 'Pescador' && !isLawActive(state, 'ban_fishing') ? 'fish_river' : 'gather_food';
        agent.activity = getConciseTaskLabel(agent.taskType);
        const summary = `Qwen 2.5 redirigió a ${agent.name} a buscar alimento urgente.`;
        agent.lastQwenDecision = summary;
        agent.qwenPlan = 'Asegurar alimento inmediato';
        agent.thought = 'Debo conseguir comida cuanto antes.';
        return { approved: true, summary };
      }
      return { approved: false, summary: 'Sin crisis activa.' };
    }
    case 'daily_agent_tick': {
      const house = agent.houseId !== null ? state.houses.find((h) => h.id === agent.houseId) : null;
      // Aldeano sabio puede comprar edificio en venta
      if (agent.education >= 45 && agent.coins >= 50) {
        const forSale = state.specialBuildings.find((b) => b.forSale && agent.coins >= b.price);
        if (forSale) {
          agent.coins -= forSale.price;
          transferBuildingOwnership(state, forSale.id, agent.id, `compra por ${forSale.price} mon.`);
          return { approved: true, summary: `${agent.name} compró ${forSale.name} gracias a su Saber (${Math.round(agent.education)}%).` };
        }
      }
      // Aldeano sabio decide si desea tener hijos por libre albedrío
      if (agent.ageYears >= AGE_REPRODUCE_MIN_YEARS && Math.random() < 0.08) {
        const enoughFood = totalFood >= state.agents.length;
        agent.wantsChildren = enoughFood && agent.happiness >= 45 && !state.policies.reproductionRestraint
          ? Math.random() < 0.78
          : Math.random() < 0.35;
      }
      const hasSurplus =
        agent.inv.food >= 3 ||
        agent.inv.wood >= 3 ||
        agent.inv.stone >= 2 ||
        agent.inv.copper >= 2 ||
        agent.inv.iron >= 2 ||
        agent.inv.gold > 0 ||
        agent.inv.silver > 0 ||
        agent.coins >= 22;

      if (house && hasSurplus) {
        agent.qwenPlan = `Guardar excedentes (${wisdomBonus})`;
        agent.lastQwenDecision = `Qwen 2.5 indicó a ${agent.name} resguardar alimentos/monedas en casa y materiales en Depósito.`;
        return { approved: true, summary: agent.lastQwenDecision };
      }
      if (state.policies.allowPartnerSwitch && agent.partnerId !== null && agent.happiness < 35) {
        const res = switchPartnerForAgent(state, agent.id, 'baja afinidad emocional');
        agent.qwenPlan = 'Rehacer su vida social en la aldea';
        return { approved: res.switched, summary: res.message };
      }
      agent.qwenPlan = `Evolucionar como ${agent.job} (${agent.skills.length}/25 skills · ${getJobMasteryTierLabel(agent.jobMastery?.[agent.job] ?? 0)})`;
      return { approved: true, summary: agent.qwenPlan };
    }
  }
}

export function transferInheritance(state: SimulationState, deceased: Agent): void {
  const heir =
    (deceased.partnerId !== null ? state.agents.find((a) => a.id === deceased.partnerId && a.id !== deceased.id) : null) ??
    state.agents.find((a) => a.id !== deceased.id && a.houseId !== null && a.houseId === deceased.houseId);

  // Transferir propiedad de edificios especiales si era dueño
  for (const b of state.specialBuildings) {
    if (b.ownerId === deceased.id) {
      if (heir && !heir.isChild) {
        transferBuildingOwnership(state, b.id, heir.id, `herencia de ${deceased.name}`);
      } else {
        b.ownerId = null;
        b.forSale = true;
        addLog(state, `${b.name} quedó en venta tras el fallecimiento de ${deceased.name}.`, 'slate');
      }
    }
  }

  const totalAssets =
    deceased.coins +
    deceased.inv.food +
    deceased.inv.wood +
    deceased.inv.pineWood +
    deceased.inv.mapleWood +
    deceased.inv.oakWood +
    deceased.inv.stone +
    deceased.inv.copper +
    deceased.inv.iron +
    deceased.inv.gold +
    deceased.inv.silver +
    deceased.breadCount +
    deceased.milkCount +
    deceased.toolsCount +
    deceased.medicineCount;
  if (totalAssets <= 0) return;

  if (heir) {
    heir.coins += deceased.coins;
    heir.inv.food += deceased.inv.food;
    heir.inv.wood += deceased.inv.wood;
    heir.inv.pineWood += deceased.inv.pineWood;
    heir.inv.mapleWood += deceased.inv.mapleWood;
    heir.inv.oakWood += deceased.inv.oakWood;
    heir.inv.stone += deceased.inv.stone;
    heir.inv.copper += deceased.inv.copper;
    heir.inv.iron += deceased.inv.iron;
    heir.inv.gold += deceased.inv.gold;
    heir.inv.silver += deceased.inv.silver;
    heir.breadCount += deceased.breadCount;
    heir.milkCount += deceased.milkCount;
    heir.toolsCount += deceased.toolsCount;
    heir.medicineCount += deceased.medicineCount;
    heir.thought = `Recibí la herencia de ${deceased.name}; honraré su esfuerzo en la aldea.`;
    addLog(state, `${heir.name} heredó ${deceased.coins} monedas y pertenencias de ${deceased.name}.`, 'violet');
    return;
  }

  const house = deceased.houseId !== null ? state.houses.find((h) => h.id === deceased.houseId) : null;
  const depot = state.specialBuildings.find((b) => b.type === 'general_depot') ?? null;
  if (house) {
    depositResourcesToHouse(deceased, house, 'all', depot);
    addLog(state, `El alimento y monedas de ${deceased.name} quedaron en ${house.name}.`, 'slate');
  } else if (depot) {
    depositMaterialsToBuilding(deceased, depot, 'all');
  }
}

export function pickQwenBabyName(sex: 'M' | 'F', state: Pick<SimulationState, 'agents' | 'nextId'>): string {
  const pool = sex === 'M' ? MALE_BABY_NAMES : FEMALE_BABY_NAMES;
  const existingFirsts = new Set(state.agents.map((a) => a.name.split(' ')[0]));
  const fresh = pool.filter((n) => !existingFirsts.has(n));
  const chosenPool = fresh.length > 0 ? fresh : pool;
  const idx = Math.floor(Math.random() * chosenPool.length);
  const surnameInitial = String.fromCharCode(65 + (state.nextId % 26));
  return `${chosenPool[idx]} ${surnameInitial}.`;
}

export function progressDiseasesDaily(state: SimulationState, agent: Agent): { diedFromDisease: boolean; recovered: boolean } {
  if (!agent.isSick) return { diedFromDisease: false, recovered: false };
  if (!agent.illness) {
    agent.illness = buildDiseaseInfo('gripe');
    agent.illnessName = agent.illness.name;
  }
  const ill = agent.illness;
  ill.daysInfected += 1;

  const hasInfirmary = isBuildingOperational(state, 'infirmary');
  const hasHouse = agent.houseId !== null;
  const dailyDrain = (ill.dangerPct / 8) * (hasHouse ? 0.65 : 1.35) * (hasInfirmary && !ill.incurable ? 0.55 : 1);
  agent.health = clamp(agent.health - dailyDrain, 0, 100);

  if (ill.fatalAfterDays !== null && ill.daysInfected >= ill.fatalAfterDays) {
    // Cáncer es incurable y mata al cumplirse 10-15 días; Pulmonía/Sepsis matan si no se curan a tiempo
    agent.health = 0;
    return { diedFromDisease: true, recovered: false };
  }

  // Enfermedades curables leves pueden remitir con descanso en casa y comida
  if (!ill.incurable && hasHouse && agent.hunger < 45 && ill.id === 'gripe' && Math.random() < 0.45) {
    agent.isSick = false;
    agent.illness = null;
    agent.illnessName = null;
    agent.health = clamp(agent.health + 22, 0, 100);
    return { diedFromDisease: false, recovered: true };
  }

  return { diedFromDisease: agent.health <= 0, recovered: false };
}

function applyProgressiveWearToStructure(
  structure: {
    durability: number;
    unpaidMaintenanceDays: number;
    maintenanceDebtCount: number;
    maintenanceStatus: MaintenanceStatus;
    lastMaintenanceDay: number;
    efficiencyMultiplier?: number;
    isOperational?: boolean;
  },
  day: number,
  paid: boolean
): void {
  structure.lastMaintenanceDay = day;
  if (paid) {
    structure.unpaidMaintenanceDays = 0;
    structure.maintenanceDebtCount = 0;
    structure.maintenanceStatus = 'ok';
    structure.durability = clamp(structure.durability + 10, 0, 100);
    if (typeof structure.efficiencyMultiplier === 'number') structure.efficiencyMultiplier = 1;
    return;
  }

  structure.unpaidMaintenanceDays = (structure.unpaidMaintenanceDays ?? 0) + MAINTENANCE_CYCLE_DAYS;
  structure.maintenanceDebtCount = (structure.maintenanceDebtCount ?? 0) + 1;
  structure.maintenanceStatus = getMaintenanceStatusFromUnpaidDays(structure.unpaidMaintenanceDays);

  if (structure.unpaidMaintenanceDays >= PROGRESSIVE_WEAR_THRESHOLDS.ruinedDays) {
    structure.durability = Math.min(structure.durability, 8);
    if (typeof structure.efficiencyMultiplier === 'number') structure.efficiencyMultiplier = 0;
    if (typeof structure.isOperational === 'boolean') structure.isOperational = false;
  } else if (structure.unpaidMaintenanceDays >= PROGRESSIVE_WEAR_THRESHOLDS.inoperativeDays) {
    structure.durability = clamp(structure.durability - 18, 0, 100);
    if (typeof structure.efficiencyMultiplier === 'number') structure.efficiencyMultiplier = 0;
    if (typeof structure.isOperational === 'boolean') structure.isOperational = false;
  } else if (structure.unpaidMaintenanceDays >= PROGRESSIVE_WEAR_THRESHOLDS.halfEfficiencyDays) {
    structure.durability = clamp(structure.durability - 15, 0, 100);
    if (typeof structure.efficiencyMultiplier === 'number') structure.efficiencyMultiplier = 0.5;
  } else if (structure.unpaidMaintenanceDays >= PROGRESSIVE_WEAR_THRESHOLDS.deterioratingDays) {
    structure.durability = clamp(structure.durability - 15, 0, 100);
  }
}

export function runThirtyDayMaintenance(state: SimulationState): {
  paidCount: number;
  unpaidCount: number;
} {
  let paidCount = 0;
  let unpaidCount = 0;
  const constructorAgent =
    state.agents.find((a) => !a.isChild && a.jailedDays <= 0 && a.job === 'Constructor') ?? null;

  for (const h of state.houses) {
    const lastDay = h.lastMaintenanceDay ?? 1;
    if (state.day - lastDay < MAINTENANCE_CYCLE_DAYS) continue;
    const cost = getHouseMaintenanceCost(h.size, h.level);
    const resident =
      state.agents.find((a) => a.houseId === h.id && !a.isChild && a.jailedDays <= 0) ?? null;
    const paid = consumeConstructionResources(state, resident, cost, true, h.name, 'mantenimiento');
    applyProgressiveWearToStructure(h, state.day, paid);
    if (paid) {
      paidCount++;
    } else {
      unpaidCount++;
      recordResourceOperation(state, {
        actorName: resident?.name ?? 'Sin pagador',
        targetName: h.name,
        operationType: 'mantenimiento',
        materials: cost,
        source: 'Personal / Depósito General',
        result: `${getMaintenanceStatusLabel(h.maintenanceStatus)}`,
      });
    }
  }

  for (const b of state.specialBuildings) {
    const lastDay = b.lastMaintenanceDay ?? 1;
    if (state.day - lastDay < MAINTENANCE_CYCLE_DAYS) continue;
    const clampedLv = clamp(b.level, 1, 3) as 1 | 2 | 3;
    const cost = getSpecialBuildingMaintenanceCost(b.type, clampedLv);
    const staffAgent =
      state.agents.find((a) => b.staffIds.includes(a.id) && a.jailedDays <= 0) ?? null;
    const paid = consumeConstructionResources(state, staffAgent, cost, true, b.name, 'mantenimiento');
    applyProgressiveWearToStructure(b, state.day, paid);
    if (paid) {
      paidCount++;
    } else {
      unpaidCount++;
      recordResourceOperation(state, {
        actorName: staffAgent?.name ?? 'Sin operario',
        targetName: b.name,
        operationType: 'mantenimiento',
        materials: cost,
        source: 'Personal / Depósito General',
        result: `${getMaintenanceStatusLabel(b.maintenanceStatus)}`,
      });
    }
  }

  if (state.plaza && state.day - (state.plaza.lastMaintenanceDay ?? 1) >= MAINTENANCE_CYCLE_DAYS) {
    const paid = consumeConstructionResources(
      state,
      constructorAgent,
      PLAZA_COSTS.maintenance,
      true,
      'Plaza Central',
      'mantenimiento'
    );
    applyProgressiveWearToStructure(state.plaza, state.day, paid);
    if (paid) paidCount++;
    else unpaidCount++;
  }

  if (state.bridge && state.day - (state.bridge.lastMaintenanceDay ?? 1) >= MAINTENANCE_CYCLE_DAYS) {
    const paid = consumeConstructionResources(
      state,
      constructorAgent,
      BRIDGE_COSTS.maintenance,
      true,
      'Puente Fluvial',
      'mantenimiento'
    );
    applyProgressiveWearToStructure(state.bridge, state.day, paid);
    if (paid) paidCount++;
    else {
      unpaidCount++;
      if ((state.bridge.unpaidMaintenanceDays ?? 0) >= PROGRESSIVE_WEAR_THRESHOLDS.inoperativeDays) {
        addLog(
          state,
          'El Puente Fluvial quedó inoperativo por falta de mantenimiento (120+ días): el cruce Norte-Sur está bloqueado.',
          'rose'
        );
      }
    }
  }

  for (const f of state.farms) {
    if (state.day - (f.lastMaintenanceDay ?? 1) < MAINTENANCE_CYCLE_DAYS) continue;
    const cost = getFarmCost(f.size).maintenance;
    const farmer =
      state.agents.find((a) => !a.isChild && a.jailedDays <= 0 && a.job === 'Agricultor') ?? null;
    const paid = consumeConstructionResources(
      state,
      farmer,
      cost,
      true,
      `Cultivo ${f.cropName}`,
      'mantenimiento'
    );
    applyProgressiveWearToStructure(f, state.day, paid);
    if (paid) paidCount++;
    else unpaidCount++;
  }

  if (
    state.roads.length > 0 &&
    state.day - (state.roadMaintenanceLastDay ?? 1) >= MAINTENANCE_CYCLE_DAYS
  ) {
    const roadCost = getRoadMaintenanceCost(state.roads);
    const paid = consumeConstructionResources(
      state,
      constructorAgent,
      roadCost,
      true,
      `Red de Caminos (${state.roads.length})`,
      'mantenimiento'
    );
    state.roadMaintenanceLastDay = state.day;
    if (paid) {
      state.roadUnpaidMaintenanceDays = 0;
      for (const r of state.roads) {
        r.durability = clamp((r.durability ?? 100) + 12, 0, 100);
        if (r.hasLamp) r.lit = true;
      }
      paidCount++;
    } else {
      state.roadUnpaidMaintenanceDays = (state.roadUnpaidMaintenanceDays ?? 0) + MAINTENANCE_CYCLE_DAYS;
      for (const r of state.roads) {
        r.durability = clamp((r.durability ?? 100) - 18, 0, 100);
        if (state.roadUnpaidMaintenanceDays >= PROGRESSIVE_WEAR_THRESHOLDS.inoperativeDays) {
          r.lit = false;
        }
      }
      unpaidCount++;
    }
  }

  if (unpaidCount > 0) {
    addLog(
      state,
      `Mantenimiento 30d: ${paidCount} estructuras al día, ${unpaidCount} con deuda acumulada.`,
      'amber'
    );
  } else if (paidCount > 0) {
    addLog(state, `Mantenimiento 30d completado en ${paidCount} estructura(s) de la aldea.`, 'sky');
  }

  syncSpecialBuildingStaff(state);
  return { paidCount, unpaidCount };
}

export function applyBuildingWear(state: SimulationState): void {
  const weatherDamage =
    state.weather === 'thunderstorm' ? 3.5 : state.weather === 'storm' ? 2 : state.season === 'Invierno' ? 1 : 0.4;

  for (const h of state.houses) {
    h.durability = clamp(h.durability - weatherDamage, 0, 100);
  }
  for (const b of state.specialBuildings) {
    b.durability = clamp(b.durability - weatherDamage * 0.9, 0, 100);
  }
  if (state.plaza) {
    state.plaza.durability = clamp((state.plaza.durability ?? 100) - weatherDamage * 0.6, 0, 100);
  }
  if (state.bridge) {
    state.bridge.durability = clamp(state.bridge.durability - weatherDamage * 0.8, 0, 100);
  }
  for (const f of state.farms) {
    f.durability = clamp((f.durability ?? 100) - weatherDamage * 0.5, 0, 100);
  }

  runThirtyDayMaintenance(state);
}

export function repairDamagedStructures(state: SimulationState, agent?: Agent | null): number {
  let repaired = 0;
  for (const h of state.houses) {
    if (h.durability < 80 || (h.unpaidMaintenanceDays ?? 0) > 0 || h.maintenanceStatus !== 'ok') {
      const repairCost = getHouseRepairCost(h.level);
      if (consumeConstructionResources(state, agent ?? null, repairCost, true, h.name, 'reparacion')) {
        h.durability = 100;
        h.unpaidMaintenanceDays = 0;
        h.maintenanceDebtCount = 0;
        h.maintenanceStatus = 'ok';
        h.lastMaintenanceDay = state.day;
        repaired++;
      }
    }
  }
  for (const b of state.specialBuildings) {
    if (b.durability < 80 || (b.unpaidMaintenanceDays ?? 0) > 0 || b.maintenanceStatus !== 'ok') {
      const repairCost = getSpecialBuildingRepairCost(clamp(b.level, 1, 3) as 1 | 2 | 3);
      if (consumeConstructionResources(state, agent ?? null, repairCost, true, b.name, 'reparacion')) {
        b.durability = 100;
        b.unpaidMaintenanceDays = 0;
        b.maintenanceDebtCount = 0;
        b.maintenanceStatus = 'ok';
        b.lastMaintenanceDay = state.day;
        b.efficiencyMultiplier = 1;
        repaired++;
      }
    }
  }
  if (
    state.plaza &&
    ((state.plaza.durability ?? 100) < 80 ||
      (state.plaza.unpaidMaintenanceDays ?? 0) > 0 ||
      state.plaza.maintenanceStatus !== 'ok')
  ) {
    if (
      consumeConstructionResources(
        state,
        agent ?? null,
        PLAZA_COSTS.repair,
        true,
        'Plaza Central',
        'reparacion'
      )
    ) {
      state.plaza.durability = 100;
      state.plaza.unpaidMaintenanceDays = 0;
      state.plaza.maintenanceDebtCount = 0;
      state.plaza.maintenanceStatus = 'ok';
      state.plaza.lastMaintenanceDay = state.day;
      repaired++;
    }
  }
  if (
    state.bridge &&
    (state.bridge.durability < 80 ||
      (state.bridge.unpaidMaintenanceDays ?? 0) > 0 ||
      state.bridge.maintenanceStatus !== 'ok')
  ) {
    if (
      consumeConstructionResources(
        state,
        agent ?? null,
        BRIDGE_COSTS.repair,
        true,
        'Puente Fluvial',
        'reparacion'
      )
    ) {
      state.bridge.durability = 100;
      state.bridge.unpaidMaintenanceDays = 0;
      state.bridge.maintenanceDebtCount = 0;
      state.bridge.maintenanceStatus = 'ok';
      state.bridge.lastMaintenanceDay = state.day;
      repaired++;
    }
  }
  for (const r of state.roads) {
    if ((r.durability ?? 100) < 60) {
      const rCost = getRoadRepairCost(r.roadType ?? 'dirt');
      if (
        consumeConstructionResources(
          state,
          agent ?? null,
          rCost,
          true,
          `Camino (${r.x},${r.y})`,
          'reparacion'
        )
      ) {
        r.durability = 100;
        if (r.hasLamp) r.lit = true;
        repaired++;
      }
    }
  }
  if (repaired > 0 && agent) {
    advanceJobMastery(agent, agent.job, 4);
    agent.constructionKnowledge = clamp(agent.constructionKnowledge + 3, 0, 100);
    addLog(state, `${agent.name} reparó ${repaired} estructura(s) dañada(s) de la aldea.`, 'sky');
  }
  syncSpecialBuildingStaff(state);
  return repaired;
}

export function grantBankLoan(
  state: SimulationState,
  borrower: Agent,
  amount = 15,
  purpose = 'financiar obra o taller'
): BankLoan | null {
  const bank = state.specialBuildings.find((b) => b.type === 'bank' && b.isOperational);
  if (!bank) return null;
  const minted = mintBackedCoins(state, amount);
  const poolAvail = Math.min(amount, state.economyReserve.bankLoanPool);
  const granted = Math.max(minted, poolAvail);
  if (granted <= 0) return null;

  if (minted === 0 && poolAvail > 0) {
    state.economyReserve.bankLoanPool -= granted;
  }
  const loan: BankLoan = {
    id: state.nextId++,
    borrowerId: borrower.id,
    borrowerName: borrower.name,
    amount: granted,
    remaining: Math.round(granted * 1.1),
    interestPct: 10,
    purpose,
    issuedDay: state.day,
  };
  state.loans.push(loan);
  borrower.coins += granted;
  borrower.loanDebt += loan.remaining;
  borrower.lastQwenDecision = `Banco Central le otorgó préstamo de ${granted} mon. (${purpose}).`;
  addLog(state, `Banco Central prestó ${granted} monedas respaldadas a ${borrower.name} (${purpose}).`, 'amber');
  return loan;
}

export function collectTaxesAndRepayLoans(state: SimulationState): void {
  const bank = state.specialBuildings.find((b) => b.type === 'bank' && b.isOperational);
  const townHall = state.specialBuildings.find((b) => b.type === 'town_hall' && b.isOperational);
  if (!bank && !townHall) return;

  const rate = clamp(state.economyReserve.taxRatePct, 0, 25) / 100;
  let collected = 0;
  if (rate > 0) {
    for (const agent of state.agents) {
      if (agent.isChild || agent.coins < 10) continue;
      const tax = Math.max(1, Math.floor(agent.coins * rate));
      agent.coins -= tax;
      collected += tax;
    }
    state.economyReserve.bankLoanPool += collected;
    state.economyReserve.lastTaxCollectedDay = state.day;
  }

  // Amortizar préstamos activos
  for (const loan of state.loans) {
    if (loan.remaining <= 0) continue;
    const borrower = state.agents.find((a) => a.id === loan.borrowerId);
    if (!borrower) {
      loan.remaining = 0;
      continue;
    }
    if (borrower.coins >= 4) {
      const pay = Math.min(loan.remaining, Math.max(2, Math.floor(borrower.coins * 0.25)));
      borrower.coins -= pay;
      loan.remaining -= pay;
      borrower.loanDebt = Math.max(0, borrower.loanDebt - pay);
      state.economyReserve.bankLoanPool += pay;
    }
  }
  state.loans = state.loans.filter((l) => l.remaining > 0);
}

export function assignMentorships(state: SimulationState): number {
  const primaryMentors = state.agents.filter(
    (a) =>
      !a.isChild &&
      (a.job === 'Maestro' ||
        a.job === 'Carpintero' ||
        a.job === 'Constructor' ||
        a.job === 'Erudito' ||
        a.education >= 45 ||
        (a.jobMastery?.[a.job] ?? 0) > 70)
  );
  const fallbackMentors = [...state.agents]
    .filter((a) => !a.isChild && a.jailedDays <= 0)
    .sort((a, b) => b.education - a.education);
  if (primaryMentors.length === 0 && fallbackMentors.length === 0) return 0;

  let paired = 0;
  for (const agent of state.agents) {
    if (agent.mentorId !== null && state.agents.some((m) => m.id === agent.mentorId)) continue;
    agent.mentorId = null;
    if (agent.ageYears >= 10 && (agent.job === 'Aprendiz' || agent.education < 45)) {
      const mentor =
        primaryMentors.find((m) => m.id !== agent.id && m.education > agent.education) ??
        primaryMentors.find((m) => m.id !== agent.id && (m.job === 'Erudito' || m.job === 'Maestro')) ??
        fallbackMentors.find((m) => m.id !== agent.id && m.education >= agent.education + 4);
      if (mentor) {
        agent.mentorId = mentor.id;
        agent.lastQwenDecision = `Contrato de aprendizaje con Maestro ${mentor.name}.`;
        paired++;
      }
    }
  }
  if (paired > 0) {
    addLog(state, `Qwen 2.5 estableció ${paired} contrato(s) de aprendizaje entre Maestros y Aprendices.`, 'sky');
  }
  return paired;
}

export function runCouncilOfElders(state: SimulationState): void {
  if (state.day - state.lastCouncilDay < 8 || state.agents.length < 12) return;
  state.lastCouncilDay = state.day;

  const totalFood =
    state.agents.reduce((acc, a) => acc + a.inv.food + a.breadCount, 0) +
    state.houses.reduce((acc, h) => acc + h.storage.food, 0);

  if (state.season === 'Invierno' && totalFood < state.agents.length * 2) {
    toggleVillageLaw(state, 'winter_rationing', true, 'Consejo de Ancianos');
  } else if (state.animals.some((a) => a.hostile && !a.tamed) || state.fires.length > 0) {
    toggleVillageLaw(state, 'night_watch', true, 'Consejo de Ancianos');
  } else if (state.economyReserve.goldReserve + state.economyReserve.silverReserve < 6) {
    toggleVillageLaw(state, 'mining_priority', true, 'Consejo de Ancianos');
  }
}

export function electRepresentative(state: SimulationState): Agent | null {
  const candidates = state.agents.filter((a) => !a.isChild && a.ageYears >= 18 && a.jailedDays <= 0);
  if (candidates.length === 0) {
    state.representativeAgentId = null;
    return null;
  }
  const sorted = [...candidates].sort((a, b) => {
    const aMayor = a.job === 'Alcalde' ? 35 : 0;
    const bMayor = b.job === 'Alcalde' ? 35 : 0;
    return b.importance + b.education * 0.5 + bMayor - (a.importance + a.education * 0.5 + aMayor);
  });
  const chosen = sorted[0];
  for (const a of state.agents) {
    a.isRepresentative = a.id === chosen.id;
  }
  state.representativeAgentId = chosen.id;
  if (!state.representativeGoal) {
    state.representativeGoal = 'Garantizar viviendas, alimento y progreso continuo';
  }
  chosen.lastQwenDecision = `Representante permanente dirigido por Qwen 2.5:3b (${state.representativeGoal}).`;
  return chosen;
}

export function ensureQwenControlledRepresentative(state: SimulationState): Agent | null {
  const current =
    state.representativeAgentId !== null
      ? state.agents.find(
          (a) =>
            a.id === state.representativeAgentId &&
            !a.isChild &&
            a.ageYears >= 18 &&
            a.jailedDays <= 0
        )
      : null;
  if (current) {
    for (const a of state.agents) {
      a.isRepresentative = a.id === current.id;
    }
    return current;
  }
  const elected = electRepresentative(state);
  if (elected) {
    addLog(
      state,
      `${elected.name} asumió como Representante controlado por Qwen 2.5:3b.`,
      'violet'
    );
  }
  return elected;
}

/**
 * Agente "Representante" controlado permanentemente por Qwen 2.5:3b (sandbox estricto de aldea).
 * Evalúa escasez, viviendas, salud, saber y progreso para evitar el estancamiento y la extinción.
 */
export function runQwenRepresentativeAutonomousTurn(state: SimulationState): string[] {
  const rep = ensureQwenControlledRepresentative(state);
  if (!rep) return [];

  const executed: string[] = [];
  const totalFood =
    state.agents.reduce((acc, a) => acc + a.inv.food + a.breadCount, 0) +
    state.houses.reduce((acc, h) => acc + h.storage.food, 0);
  const adults = state.agents.filter((a) => !a.isChild && a.ageYears >= 15 && a.jailedDays <= 0);
  const homelessCount = state.agents.filter((a) => a.houseId === null).length;
  const sickCount = state.agents.filter((a) => a.isSick).length;
  const constructors = adults.filter((a) => a.job === 'Constructor');
  const foodWorkers = adults.filter(
    (a) => a.job === 'Recolector' || a.job === 'Agricultor' || a.job === 'Pescador'
  );
  const woodWorkers = adults.filter((a) => a.job === 'Leñador' || a.job === 'Carpintero');
  const miners = adults.filter((a) => a.job === 'Minero');
  const healers = adults.filter((a) => a.job === 'Curandero' || a.job === 'Boticario');
  const scholars = adults.filter((a) => a.job === 'Erudito' || a.job === 'Maestro');

  // El Representante siempre impulsa políticas de progreso y supervivencia de la especie
  state.policies.buildPriority = true;
  state.policies.workFocus = true;
  state.policies.evolutionFocus = true;
  if (state.agents.length < 28 && totalFood >= Math.floor(state.agents.length * 0.7)) {
    state.policies.reproductionRestraint = false;
  }
  if (state.farms.length >= 1) {
    state.policies.farmingFocus = true;
  }

  const pickReassignable = (
    excludeJobs: JobType[],
    fallbackExcludeJobs?: JobType[]
  ): Agent | undefined => {
    const findWith = (ex: JobType[]) =>
      adults.find(
        (a) =>
          a.id !== rep.id &&
          a.assignedBuildingId === null &&
          !a.activeConstruction &&
          !ex.includes(a.job)
      ) ??
      adults.find(
        (a) =>
          a.assignedBuildingId === null &&
          !a.activeConstruction &&
          !ex.includes(a.job)
      );
    return findWith(excludeJobs) ?? (fallbackExcludeJobs ? findWith(fallbackExcludeJobs) : undefined);
  };

  // 1) Crisis alimentaria: asegurar al menos 2-3 productores de comida
  const minFoodWorkers = Math.min(adults.length, Math.max(2, Math.ceil(adults.length * 0.3)));
  if (totalFood < state.agents.length * 1.4 && foodWorkers.length < minFoodWorkers) {
    const cand = pickReassignable(['Recolector', 'Agricultor', 'Pescador', 'Constructor', 'Curandero']);
    if (cand) {
      const targetJob: JobType = state.farms.length > 0 ? 'Agricultor' : 'Recolector';
      setAgentJob(state, cand, targetJob, 'decisión del Representante (Qwen 2.5)');
      cand.taskTimer = 0;
      executed.push(`${cand.name}→${targetJob} (alimento)`);
    }
  }

  // 2) Viviendas urgentes: asegurar suficientes Constructores
  const desiredConstructors = shouldBuildHouse(state)
    ? Math.min(3, Math.max(2, Math.ceil(adults.length / 4)))
    : Math.max(1, Math.floor(adults.length / 6));
  if (constructors.length < desiredConstructors && adults.length >= 4) {
    const cand = pickReassignable(['Constructor', 'Curandero', 'Pescador']);
    if (cand) {
      setAgentJob(state, cand, 'Constructor', 'decisión del Representante (Qwen 2.5)');
      cand.taskTimer = 0;
      executed.push(`${cand.name}→Constructor`);
    }
  }

  // 3) Madera y minería base para poder levantar obras y subir de era
  const currentFoodCount = () =>
    adults.filter((a) => a.job === 'Recolector' || a.job === 'Agricultor' || a.job === 'Pescador').length;
  if (woodWorkers.length === 0 && adults.length >= 5) {
    const cand = pickReassignable(
      ['Leñador', 'Constructor', 'Recolector', 'Curandero'],
      currentFoodCount() > 2 ? ['Leñador', 'Constructor', 'Curandero'] : undefined
    );
    if (cand) {
      setAgentJob(state, cand, 'Leñador', 'decisión del Representante (Qwen 2.5)');
      cand.taskTimer = 0;
      executed.push(`${cand.name}→Leñador`);
    }
  }
  if (miners.length === 0 && adults.length >= 6) {
    const cand = pickReassignable(
      ['Minero', 'Constructor', 'Recolector', 'Leñador', 'Curandero'],
      currentFoodCount() > 2 ? ['Minero', 'Constructor', 'Leñador', 'Curandero'] : undefined
    );
    if (cand) {
      setAgentJob(state, cand, 'Minero', 'decisión del Representante (Qwen 2.5)');
      cand.taskTimer = 0;
      executed.push(`${cand.name}→Minero`);
    }
  }
  if (scholars.length === 0 && adults.length >= 7) {
    const cand = pickReassignable(
      ['Erudito', 'Constructor', 'Recolector', 'Leñador', 'Minero', 'Curandero'],
      currentFoodCount() > 2 ? ['Erudito', 'Constructor', 'Leñador', 'Minero', 'Curandero'] : undefined
    );
    if (cand) {
      setAgentJob(state, cand, 'Erudito', 'decisión del Representante (Qwen 2.5)');
      cand.taskTimer = 0;
      executed.push(`${cand.name}→Erudito`);
    }
  }
  const carpenters = adults.filter((a) => a.job === 'Carpintero');
  if (carpenters.length === 0 && state.houses.length >= 2 && adults.length >= 8) {
    const cand = pickReassignable(
      ['Carpintero', 'Constructor', 'Minero', 'Erudito', 'Curandero', 'Leñador'],
      currentFoodCount() > 2 ? ['Carpintero', 'Constructor', 'Minero', 'Erudito', 'Curandero'] : undefined
    );
    if (cand) {
      setAgentJob(state, cand, 'Carpintero', 'decisión del Representante (Qwen 2.5)');
      cand.taskTimer = 0;
      executed.push(`${cand.name}→Carpintero`);
    }
  }
  const farmers = adults.filter((a) => a.job === 'Agricultor');
  if (farmers.length === 0 && state.farms.length >= 1 && adults.length >= 6) {
    const cand = pickReassignable(
      ['Agricultor', 'Constructor', 'Minero', 'Erudito', 'Carpintero', 'Curandero']
    );
    if (cand) {
      setAgentJob(state, cand, 'Agricultor', 'decisión del Representante (Qwen 2.5)');
      cand.taskTimer = 0;
      executed.push(`${cand.name}→Agricultor`);
    }
  }

  // 4) Salud: asignar Curandero si hay enfermos
  if (sickCount > 0 && healers.length === 0 && adults.length >= 4) {
    const cand = pickReassignable(['Curandero', 'Constructor']);
    if (cand) {
      setAgentJob(state, cand, 'Curandero', 'emergencia sanitaria del Representante');
      cand.taskTimer = 0;
      executed.push(`${cand.name}→Curandero`);
    }
  }

  // 5) Contratos de aprendizaje y préstamos bancarios para obras
  const pairedMentors = assignMentorships(state);
  if (pairedMentors > 0) executed.push(`${pairedMentors} mentorías`);

  if (isBuildingOperational(state, 'bank') && state.loans.length < 3) {
    const needyBuilder = constructors.find((c) => c.coins < 12);
    if (needyBuilder && grantBankLoan(state, needyBuilder, 15, 'impulso de obras del Representante')) {
      executed.push(`Préstamo a ${needyBuilder.name}`);
    }
  }

  // 6) Objetivo estratégico dinámico del Representante (Qwen 2.5:3b)
  const scoredNeeds = scoreConstructionNeeds(state);
  let goal =
    scoredNeeds[0]?.reason ?? 'Consolidar crecimiento familiar, comercio y evolución de era';
  if (sickCount > 0 && !isBuildingOperational(state, 'infirmary')) {
    goal = `Atender ${sickCount} enfermo(s) e impulsar Hospital/alimento`;
  } else if (homelessCount > 0) {
    goal = `Construir viviendas urgentes (${homelessCount} sin casa) y reunir madera/piedra`;
  } else if (totalFood < state.agents.length * 1.5 || state.farms.length === 0) {
    goal = 'Asegurar alimento y levantar parcelas agrícolas para crecer';
  }

  state.representativeGoal = goal;
  rep.qwenPlan = `Representante Qwen 2.5: ${goal}`;
  rep.lastQwenDecision = `Qwen 2.5:3b dirigiendo como Representante (${goal}).`;
  rep.thought = `Como Representante coordinado por Qwen 2.5:3b, priorizo: ${goal}.`;
  const styleNotes = applyQwenAutonomousStylingTurn(state, 1);
  if (styleNotes.length > 0) executed.push(...styleNotes);
  syncSpecialBuildingStaff(state);
  return executed;
}

export function createVillagePetition(
  state: SimulationState,
  forcedNegative?: boolean,
  forcedEffectType?: PetitionEffectType
): VillagePetition | null {
  const rep =
    (state.representativeAgentId !== null
      ? state.agents.find((a) => a.id === state.representativeAgentId)
      : null) ?? electRepresentative(state);
  if (!rep) return null;

  const avgHappy =
    state.agents.reduce((acc, a) => acc + a.happiness, 0) / Math.max(1, state.agents.length);
  const avgCoins =
    state.agents.reduce((acc, a) => acc + a.coins, 0) / Math.max(1, state.agents.length);
  const avgFood =
    (state.agents.reduce((acc, a) => acc + a.inv.food + a.breadCount, 0) +
      state.houses.reduce((acc, h) => acc + h.storage.food, 0)) /
    Math.max(1, state.agents.length);
  const sickCount = state.agents.filter((a) => a.isSick).length;
  const homelessCount = state.agents.filter((a) => a.houseId === null).length;

  const isNegative =
    forcedEffectType === 'negative_overwork' || forcedEffectType === 'negative_ration_cut'
      ? true
      : forcedEffectType !== undefined
        ? false
        : forcedNegative !== undefined
          ? forcedNegative
          : Math.random() < (avgHappy < 40 ? 0.3 : 0.18);

  let effectType: PetitionEffectType;
  if (forcedEffectType) {
    effectType = forcedEffectType;
  } else if (isNegative) {
    effectType = state.day % 2 === 0 ? 'negative_overwork' : 'negative_ration_cut';
  } else if (sickCount > 0) {
    effectType = 'health_aid';
  } else if (avgFood < 2) {
    effectType = 'food_supply';
  } else if (homelessCount > 0) {
    effectType = 'housing_materials';
  } else if (avgCoins < 25 || state.economyReserve.goldReserve < 6 || state.day % 2 === 1) {
    effectType = 'wealth';
  } else if (avgHappy < 60) {
    effectType = 'morale_blessing';
  } else {
    effectType = 'knowledge_boost';
  }

  let kind: VillagePetition['kind'] = isNegative ? 'queja' : 'peticion';
  let title = '';
  let message = '';
  let effectSummary = '';

  switch (effectType) {
    case 'negative_overwork':
      title = 'Suprimir descansos nocturnos para producir más';
      message = `${rep.name} (Qwen 2.5) sugiere exigir trabajo continuo sin descanso nocturno. Esta medida aumentaría el estrés y el agotamiento de los aldeanos.`;
      effectSummary = 'Si es escuchado: sobrecarga laboral (-20 energía, -14 ánimo, -5 salud). Si no es escuchado: pedido ignorado.';
      break;
    case 'negative_ration_cut':
      title = 'Recortar raciones médicas y de alimento';
      message = `${rep.name} (Qwen 2.5) propone recortar alimentos y medicinas para acumular monedas más rápido, arriesgando la salud del pueblo.`;
      effectSummary = 'Si es escuchado: quita comida (-1 ración/aldeano, +15 hambre, -14 ánimo, -5 salud). Si no es escuchado: pedido ignorado.';
      break;
    case 'wealth':
      title = 'Más riqueza, oro y monedas para el pueblo';
      message = `${rep.name} eleva un pedido de prosperidad para toda AldeaIA: solicita otorgar Oro 🥇, Plata 🥈 y monedas circulantes para impulsar el comercio y bienestar del pueblo.`;
      effectSummary = 'Si es escuchado: +2 Oro 🥇, +1 Plata 🥈 al respaldo, +6 monedas por aldeano y +15 al fondo de préstamos. Si no es escuchado: pedido ignorado.';
      break;
    case 'health_aid':
      title = 'Auxilio sanitario y medicinas para enfermos';
      message = `${rep.name} eleva una súplica a la Intervención Divina: hay ${sickCount} enfermo(s) que necesitan alivio, salud y medicinas en la aldea.`;
      effectSummary = 'Si es escuchado: cura enfermedades curables, +18 salud colectiva y +3 medicinas. Si no es escuchado: pedido ignorado.';
      break;
    case 'housing_materials':
      title = 'Apoyo de materiales para refugio y viviendas';
      message = `${rep.name} solicita materiales para el pueblo: ${homelessCount} habitante(s) necesitan refugio y las viviendas requieren madera y piedra.`;
      effectSummary = 'Si es escuchado: entrega +5 Madera y +4 Piedra para obras y refuerza viviendas (+15 durabilidad). Si no es escuchado: pedido ignorado.';
      break;
    case 'food_supply':
      title = 'Abasto urgente de alimentos para el pueblo';
      message = `${rep.name} pide asistencia alimentaria para toda la aldea ante las bajas reservas de comida.`;
      effectSummary = 'Si es escuchado: reparte +3 Alimento por aldeano y +4 por vivienda, reduciendo el hambre. Si no es escuchado: pedido ignorado.';
      break;
    case 'knowledge_boost':
      title = 'Impulso de saber y evolución del pueblo';
      message = `${rep.name} pide sabiduría e inspiración para avanzar de era, desbloquear skills y fortalecer los oficios.`;
      effectSummary = 'Si es escuchado: +30 Saber global y +6% Saber general para cada adulto. Si no es escuchado: pedido ignorado.';
      break;
    case 'morale_blessing':
    default:
      kind = 'consulta';
      title = 'Renovar el ánimo, energía y esperanza de la aldea';
      message = `${rep.name} consulta a la Intervención Divina para bendecir el ánimo, la salud y la energía colectiva de todos los habitantes.`;
      effectSummary = 'Si es escuchado: +20 ánimo, +15 energía y +6 salud en toda la aldea. Si no es escuchado: pedido ignorado.';
      break;
  }

  const petition: VillagePetition = {
    id: state.nextId++,
    representativeId: rep.id,
    representativeName: rep.name,
    kind,
    isNegative,
    effectType,
    effectSummary,
    title,
    message,
    createdDay: state.day,
  };
  state.pendingPetition = petition;
  if (state.speed !== 0) {
    state.previousSpeedBeforePetition = state.speed;
    state.speed = 0;
    state.autoPausedByPetition = true;
  }
  addLog(
    state,
    `Intervención Divina: ${rep.name} presentó "${petition.title}" (${isNegative ? 'petición riesgosa' : 'petición constructiva'}).`,
    'violet'
  );
  return petition;
}

export function decidePetitionByQwen(
  state: SimulationState,
  petition: VillagePetition
): { wasHeard: boolean; reason: string } {
  const avgHappy =
    state.agents.reduce((acc, a) => acc + a.happiness, 0) / Math.max(1, state.agents.length);
  const sickCount = state.agents.filter((a) => a.isSick).length;
  const homelessCount = state.agents.filter((a) => a.houseId === null).length;

  if (petition.isNegative) {
    return {
      wasHeard: false,
      reason: `Qwen 2.5 ignoró "${petition.title}" porque dañaría la salud y estabilidad (ánimo prom. ${Math.round(avgHappy)}%).`,
    };
  }

  return {
    wasHeard: true,
    reason:
      petition.effectType === 'wealth'
        ? `Qwen 2.5 aprobó "${petition.title}" y otorgó Oro, Plata y monedas a toda la aldea.`
        : sickCount > 0
          ? `Qwen 2.5 aprobó "${petition.title}" cumpliendo auxilio sanitario para ${sickCount} enfermo(s).`
          : homelessCount > 0
            ? `Qwen 2.5 aprobó "${petition.title}" entregando materiales para respaldar a ${homelessCount} aldeano(s) sin vivienda.`
            : `Qwen 2.5 aprobó "${petition.title}" y cumplió el pedido en beneficio de toda la aldea.`,
  };
}

export function resolvePetition(
  state: SimulationState,
  wasHeard: boolean,
  responder: 'Jugador' | 'Qwen 2.5' = 'Jugador'
): string {
  const petition = state.pendingPetition;
  if (!petition) return 'No había ninguna petición pendiente.';

  const effectType: PetitionEffectType =
    petition.effectType ??
    (petition.isNegative
      ? 'negative_overwork'
      : petition.title.toLowerCase().includes('riquez') || petition.title.toLowerCase().includes('oro')
        ? 'wealth'
        : petition.title.toLowerCase().includes('sanitar')
          ? 'health_aid'
          : petition.title.toLowerCase().includes('refugio') || petition.title.toLowerCase().includes('viviend')
            ? 'housing_materials'
            : petition.title.toLowerCase().includes('alimento')
              ? 'food_supply'
              : petition.title.toLowerCase().includes('evoluc') || petition.title.toLowerCase().includes('saber')
                ? 'knowledge_boost'
                : 'morale_blessing');

  const positiveImpact = petition.isNegative ? !wasHeard : wasHeard;
  let fulfillmentDetail = 'Pedido completamente ignorado (sin cambios materiales).';

  if (!wasHeard) {
    // "No fue Escuchado": el pedido es completamente ignorado, solo afecta ánimo y salud colectiva.
    const moodDelta = petition.isNegative ? 10 : -8;
    const healthDelta = petition.isNegative ? 4 : -2;
    for (const agent of state.agents) {
      agent.moodModifier = clamp(agent.moodModifier + moodDelta, -45, 45);
      agent.happiness = clamp(agent.happiness + moodDelta, 0, 100);
      agent.health = clamp(agent.health + healthDelta, 1, 100);
      agent.emotion = deriveAgentEmotion(agent, state.weather);
      agent.thought = petition.isNegative
        ? 'La propuesta riesgosa fue ignorada y la aldea quedó protegida.'
        : 'Nuestro pedido no fue escuchado y fue ignorado.';
    }
  } else {
    // "Fue Escuchado": Qwen 2.5 cumple el pedido sobre toda la AldeaIA además de impactar ánimo y salud.
    const moodDelta = petition.isNegative ? -14 : effectType === 'morale_blessing' ? 20 : 14;
    const healthDelta = petition.isNegative ? -5 : effectType === 'health_aid' ? 18 : 5;

    switch (effectType) {
      case 'wealth': {
        addPreciousMetalToReserve(state, 'gold', 2);
        addPreciousMetalToReserve(state, 'silver', 1);
        const bank = state.specialBuildings.find((b) => b.type === 'bank');
        if (bank) {
          bank.storage.gold += 2;
          bank.storage.silver += 1;
        }
        const perVillager = 6;
        let totalMinted = 15;
        state.economyReserve.bankLoanPool += 15;
        for (const agent of state.agents) {
          agent.coins += perVillager;
          totalMinted += perVillager;
          agent.lastQwenDecision = 'Pedido cumplido: recibió +6 monedas y respaldo en Oro para el pueblo.';
        }
        state.economyReserve.mintedCoins += totalMinted;
        state.economyReserve.backedCoinsCapacity = Math.max(
          state.economyReserve.backedCoinsCapacity,
          state.economyReserve.mintedCoins
        );
        if (!state.resourcesPaused) {
          for (let i = 0; i < 2; i++) {
            state.resources.push({
              id: state.nextId++,
              type: 'gold',
              x: MOUNTAIN_MIN_X + 36 + Math.random() * (CANVAS_WIDTH - MOUNTAIN_MIN_X - 72),
              y: SAFE_LAND_MIN_Y + 24 + Math.random() * (CANVAS_HEIGHT - SAFE_LAND_MIN_Y - 60),
              amount: 6,
              maxAmount: 6,
              depleted: false,
              restTimer: 0,
            });
          }
        }
        recalculateEconomyReserve(state);
        fulfillmentDetail = `Cumplido: +2 Oro 🥇, +1 Plata 🥈 al respaldo, +15 fondo de préstamos y +${perVillager} monedas por aldeano.`;
        break;
      }
      case 'health_aid': {
        let cured = 0;
        for (const agent of state.agents) {
          if (agent.isSick && !agent.illness?.incurable) {
            agent.isSick = false;
            agent.illness = null;
            agent.illnessName = null;
            cured++;
          }
        }
        const medBuilding = state.specialBuildings.find(
          (b) => b.type === 'infirmary' || b.type === 'apothecary'
        );
        if (medBuilding) medBuilding.storage.medicine += 3;
        fulfillmentDetail = `Cumplido: ${cured} enfermo(s) curados, +18 salud en toda la aldea y +3 medicinas.`;
        break;
      }
      case 'housing_materials': {
        const builder =
          state.agents.find((a) => !a.isChild && a.job === 'Constructor') ??
          state.agents.find((a) => a.id === petition.representativeId) ??
          state.agents[0];
        const depot = state.specialBuildings.find((b) => b.type === 'general_depot' && b.isOperational);
        if (depot) {
          depot.storage.wood += 5;
          depot.storage.stone += 4;
        } else if (builder) {
          builder.inv.wood += 5;
          builder.inv.stone += 4;
        }
        for (const h of state.houses) {
          h.durability = clamp(h.durability + 15, 0, 100);
          if (h.maintenanceStatus === 'debt_warning') h.maintenanceStatus = 'ok';
        }
        fulfillmentDetail = 'Cumplido: +5 Madera, +4 Piedra para obras y refuerzo de viviendas (+15 durabilidad).';
        break;
      }
      case 'food_supply': {
        for (const agent of state.agents) {
          agent.inv.food += 3;
          agent.hunger = clamp(agent.hunger - 25, 0, 100);
          agent.energy = clamp(agent.energy + 10, 0, 100);
        }
        for (const h of state.houses) {
          h.storage.food += 4;
        }
        fulfillmentDetail = 'Cumplido: +3 Alimento/aldeano, +4 Alimento/vivienda y alivio del hambre.';
        break;
      }
      case 'knowledge_boost': {
        state.knowledge += 30;
        for (const agent of state.agents) {
          if (!agent.isChild) {
            agent.education = clamp(agent.education + 6, 0, 100);
            syncAgentSkills(agent);
          }
        }
        state.era = computeEra(state.knowledge, state.houses);
        fulfillmentDetail = 'Cumplido: +30 Saber global y +6% Saber general por adulto.';
        break;
      }
      case 'morale_blessing': {
        for (const agent of state.agents) {
          agent.energy = clamp(agent.energy + 15, 0, 100);
        }
        fulfillmentDetail = 'Cumplido: +20 ánimo, +15 energía y +6 salud colectiva.';
        break;
      }
      case 'negative_overwork': {
        for (const agent of state.agents) {
          agent.energy = clamp(agent.energy - 20, 0, 100);
        }
        fulfillmentDetail = 'Aplicado: sobrecarga laboral sin descanso (-20 energía, -14 ánimo, -5 salud).';
        break;
      }
      case 'negative_ration_cut': {
        for (const agent of state.agents) {
          if (agent.inv.food > 0) {
            agent.inv.food -= 1;
            agent.coins += 2;
          }
          agent.hunger = clamp(agent.hunger + 15, 0, 100);
        }
        fulfillmentDetail = 'Aplicado: recorte de raciones (+15 hambre, -14 ánimo, -5 salud).';
        break;
      }
    }

    for (const agent of state.agents) {
      agent.moodModifier = clamp(agent.moodModifier + moodDelta, -45, 45);
      agent.happiness = clamp(agent.happiness + moodDelta, 0, 100);
      agent.health = clamp(agent.health + healthDelta, 1, 100);
      agent.emotion = deriveAgentEmotion(agent, state.weather);
      agent.thought = positiveImpact
        ? responder === 'Qwen 2.5'
          ? `Qwen 2.5 cumplió "${petition.title}" en toda la aldea.`
          : `El pedido "${petition.title}" fue escuchado y cumplido en la aldea.`
        : 'La medida aplicada perjudicó el bienestar de la aldea.';
    }
  }

  state.pendingPetition = null;
  state.petitionTimerSec = PETITION_INTERVAL_SECONDS;
  if (state.autoPausedByPetition) {
    state.speed = state.previousSpeedBeforePetition || 1;
    state.autoPausedByPetition = false;
  }

  const label = wasHeard ? 'Fue Escuchado' : 'No fue Escuchado';
  const prefix = responder === 'Qwen 2.5' ? 'Qwen 2.5 (Qwen Responde)' : 'Intervención Divina';
  const msg = `${prefix} (${label} · "${petition.title}"): ${fulfillmentDetail}`;
  addLog(state, msg, positiveImpact ? 'emerald' : wasHeard ? 'rose' : 'amber');
  pushSoundCue(state, positiveImpact ? 'celebration' : 'sadness');
  return msg;
}

export function resolvePetitionWithQwen(state: SimulationState): string {
  const petition = state.pendingPetition;
  if (!petition) return 'No había ninguna petición pendiente.';

  const decision = decidePetitionByQwen(state, petition);
  const result = resolvePetition(state, decision.wasHeard, 'Qwen 2.5');

  state.qwenMessages.push({
    id: state.nextId++,
    role: 'qwen',
    text: decision.reason,
    appliedRules: [
      `Representante: ${petition.representativeName}`,
      `Respuesta automática: ${decision.wasHeard ? 'Fue Escuchado' : 'No fue Escuchado'}`,
    ],
    source: state.ollama.enabled ? 'ollama' : 'local',
  });
  if (state.qwenMessages.length > 35) {
    state.qwenMessages = state.qwenMessages.slice(-35);
  }
  return result;
}

export function spawnFire(
  state: SimulationState,
  x: number,
  y: number,
  cause = 'Tormenta eléctrica',
  targetKind: FireHazard['targetKind'] = 'forest',
  targetId?: number
): FireHazard {
  const fire: FireHazard = {
    id: state.nextId++,
    x: clamp(x, 28, CANVAS_WIDTH - 28),
    y: clamp(y, NORTH_LAND_MIN_Y + 8, CANVAS_HEIGHT - 28),
    intensity: 100,
    targetKind,
    targetId,
    cause,
  };
  state.fires.push(fire);
  addLog(state, `¡Fuego iniciado en (${Math.round(fire.x)}, ${Math.round(fire.y)}) por ${cause}!`, 'rose');
  pushSoundCue(state, 'sadness');
  return fire;
}

export function extinguishFire(
  state: SimulationState,
  fireId: number,
  agent?: Agent | null
): boolean {
  const fire = state.fires.find((f) => f.id === fireId);
  if (!fire) return false;
  state.fires = state.fires.filter((f) => f.id !== fireId);
  if (agent) {
    agent.coins += mintBackedCoins(state, 3);
    state.knowledge += 2;
    advanceJobMastery(agent, agent.job, 3);
    agent.thought = 'Logré extinguir el incendio y proteger la aldea.';
    addLog(state, `${agent.name} extinguió el incendio provocado por ${fire.cause}.`, 'emerald');
    pushSoundCue(state, 'celebration');
  } else {
    addLog(state, `El incendio (${fire.cause}) se extinguió.`, 'sky');
  }
  return true;
}

export function triggerLightningStorm(state: SimulationState): FireHazard | null {
  state.weather = 'thunderstorm';
  state.lightningFlashTimer = 18;
  pushSoundCue(state, 'thunder');
  const targets: Array<{ x: number; y: number; kind: FireHazard['targetKind']; id?: number }> = [];
  for (const h of state.houses) targets.push({ x: h.x, y: h.y, kind: 'house', id: h.id });
  for (const b of state.specialBuildings) targets.push({ x: b.x, y: b.y, kind: 'special', id: b.id });
  for (const f of state.farms) targets.push({ x: f.x, y: f.y, kind: 'farm', id: f.id });
  const picked =
    targets.length > 0
      ? targets[Math.floor(Math.random() * targets.length)]
      : { x: 160 + Math.random() * 140, y: SAFE_LAND_MIN_Y + 120, kind: 'forest' as const };
  return spawnFire(state, picked.x, picked.y, 'Rayo de tormenta eléctrica', picked.kind, picked.id);
}

export function cancelActiveConstruction(
  state: SimulationState,
  agent: Agent,
  reason = 'cancelada',
  agentDied = false
): ResourceCostMap {
  const ac = agent.activeConstruction;
  if (!ac) return {};

  const progress = clamp((ac.elapsed ?? 0) / Math.max(1, ac.totalDuration ?? 1), 0, 1);
  const refunded: ResourceCostMap = {};
  const depots = getOperationalDepots(state);
  const targetDepot = depots[0] ?? state.specialBuildings.find((b) => b.type === 'general_depot') ?? null;

  for (const [rawKey, totalQty] of Object.entries(ac.reservedMaterials ?? {})) {
    const key = rawKey as keyof ResourceInventory;
    const qty = totalQty ?? 0;
    if (qty <= 0) continue;
    const consumedByProgress = Math.floor(qty * progress);
    let toRefund = Math.max(0, qty - consumedByProgress);
    if (toRefund <= 0) continue;

    refunded[key] = toRefund;
    const depotShare = Math.min(toRefund, ac.fromDepot?.[key] ?? 0);
    if (depotShare > 0) {
      if (targetDepot) {
        targetDepot.storage[key] += depotShare;
      } else if (!agentDied) {
        agent.inv[key] += depotShare;
      }
      toRefund -= depotShare;
    }

    if (toRefund > 0) {
      if (!agentDied) {
        agent.inv[key] += toRefund;
      } else if (targetDepot) {
        targetDepot.storage[key] += toRefund;
      }
    }
  }

  recordResourceOperation(state, {
    actorName: agent.name,
    targetName: ac.specialType ? SPECIAL_BUILDING_LABELS[ac.specialType].label : ac.kind,
    operationType: 'cancelacion',
    materials: refunded,
    source: `Avance ${Math.round(progress * 100)}%`,
    result:
      Object.keys(refunded).length > 0
        ? `Reembolso proporcional (${reason})`
        : `Sin reembolso (${reason})`,
  });

  if (Object.keys(refunded).length > 0) {
    addLog(
      state,
      `${agent.name} canceló obra (${reason}, ${Math.round(progress * 100)}%): devuelto ${formatResourceCost(refunded)}.`,
      'amber'
    );
  }

  agent.activeConstruction = null;
  if (
    agent.taskType === 'build_house' ||
    agent.taskType === 'upgrade_house' ||
    agent.taskType === 'build_plaza' ||
    agent.taskType === 'build_bridge' ||
    agent.taskType === 'plant_farm' ||
    agent.taskType === 'build_special'
  ) {
    agent.taskType = 'idle';
    agent.taskTimer = 0;
    agent.activity = getConciseTaskLabel('idle');
  }

  return refunded;
}

export function setAgentJob(
  state: SimulationState,
  agent: Agent,
  newJob: JobType,
  reason = 'reasignación'
): void {
  if (agent.job === newJob) return;
  if (agent.job === 'Constructor' && newJob !== 'Constructor' && agent.activeConstruction) {
    cancelActiveConstruction(state, agent, `cambio de oficio a ${newJob} (${reason})`);
  }
  agent.job = newJob;
  syncSpecialBuildingStaff(state);
}

export function enforceLawViolation(
  state: SimulationState,
  agent: Agent,
  lawId: VillageLawId
): boolean {
  if (!isLawActive(state, lawId)) return false;
  const hasPolice = isBuildingOperational(state, 'police_station');
  const prison = state.specialBuildings.find((b) => b.type === 'prison' && b.isOperational);
  if (!hasPolice || !prison) return false;

  if (agent.activeConstruction) {
    cancelActiveConstruction(state, agent, 'detención policial');
  }

  agent.jailedDays = 2;
  agent.x = prison.x + (Math.random() - 0.5) * 16;
  agent.y = prison.y + 14;
  agent.moodModifier = clamp(agent.moodModifier - 15, -45, 45);
  agent.thought = 'Fui detenido en la Cárcel por incumplir una ley vigente.';
  addLog(state, `Comisaría detuvo a ${agent.name} por violar "${state.laws.find((l) => l.id === lawId)?.name}".`, 'rose');
  return true;
}

/**
 * Reorganiza viviendas familiares: parejas + hijos comparten casa;
 * si superan la capacidad buscan una más grande; si exceden 8 en una Grande, hijos adultos mayores se independizan.
 */
export function rebalanceFamilyHousing(state: SimulationState): void {
  if (state.houses.length === 0) return;

  const occupantsOf = (houseId: number) => state.agents.filter((a) => a.houseId === houseId);

  // 1. Mantener parejas en la misma vivienda cuando hay espacio o buscando una mayor
  for (const a of state.agents) {
    if (a.partnerId === null) continue;
    const partner = state.agents.find((p) => p.id === a.partnerId);
    if (!partner || a.id > partner.id) continue;

    if (a.houseId !== null && partner.houseId === a.houseId) continue;
    const houseA = a.houseId !== null ? state.houses.find((h) => h.id === a.houseId) : null;
    if (houseA && occupantsOf(houseA.id).length < houseA.capacity) {
      partner.houseId = houseA.id;
      continue;
    }
    const houseB = partner.houseId !== null ? state.houses.find((h) => h.id === partner.houseId) : null;
    if (houseB && occupantsOf(houseB.id).length < houseB.capacity) {
      a.houseId = houseB.id;
      continue;
    }
    const openLarge = state.houses
      .slice()
      .sort((x, y) => y.capacity - x.capacity)
      .find((h) => h.capacity - occupantsOf(h.id).length >= 2);
    if (openLarge) {
      a.houseId = openLarge.id;
      partner.houseId = openLarge.id;
    }
  }

  // 2. Si una casa supera su capacidad, mover familia entera a casa más grande o independizar hijos adultos mayores
  for (const house of state.houses) {
    const occ = occupantsOf(house.id);
    if (occ.length <= house.capacity) continue;

    // Buscar una casa más grande con cupo suficiente para toda la familia
    const biggerEmpty = state.houses.find(
      (other) =>
        other.id !== house.id &&
        other.capacity >= occ.length &&
        occupantsOf(other.id).length + occ.length <= other.capacity
    );
    if (biggerEmpty) {
      for (const member of occ) member.houseId = biggerEmpty.id;
      continue;
    }

    // Si excede incluso una casa Grande (8) o no hay casa vacía más grande, hijos adultos mayores se mudan primero
    const adultKids = occ
      .filter((m) => m.ageYears >= AGE_ADULT_YEARS && m.parents && m.parents.includes('&'))
      .sort((x, y) => y.ageYears - x.ageYears);
    const excessCandidates = [
      ...adultKids,
      ...occ.filter((m) => !adultKids.includes(m)).sort((x, y) => y.ageYears - x.ageYears),
    ];

    let currentCount = occ.length;
    for (const mover of excessCandidates) {
      if (currentCount <= house.capacity) break;
      const otherOpen = state.houses.find(
        (h) => h.id !== house.id && occupantsOf(h.id).length < h.capacity
      );
      mover.houseId = otherOpen ? otherOpen.id : null;
      currentCount--;
    }
  }
}

export function shouldBuildHouse(state: SimulationState): boolean {
  const homeless = state.agents.filter((a) => a.houseId === null).length;
  if (homeless > 0) return true;
  // Si alguna casa existente excede su capacidad (familia numerosa sin espacio mayor), sí hace falta casa
  return state.houses.some((h) => state.agents.filter((a) => a.houseId === h.id).length > h.capacity);
}

export function recordDailySnapshot(state: SimulationState): DaySnapshot {
  const count = state.agents.length;
  const avgHealth =
    count > 0 ? Math.round(state.agents.reduce((acc, a) => acc + a.health, 0) / count) : 0;
  const avgHappiness =
    count > 0 ? Math.round(state.agents.reduce((acc, a) => acc + a.happiness, 0) / count) : 0;
  const totalCoins = getTotalCirculatingCoins(state);

  const snap: DaySnapshot = {
    day: state.day,
    population: count,
    avgHealth,
    avgHappiness,
    houses: state.houses.length,
    knowledge: Math.round(state.knowledge),
    totalCoins,
  };
  state.history.push(snap);
  if (state.history.length > 60) state.history.shift();
  return snap;
}

export function generateDailyQwenSummary(state: SimulationState): string {
  const sickCount = state.agents.filter((a) => a.isSick).length;
  const totalFood =
    state.agents.reduce((acc, a) => acc + a.inv.food + a.breadCount, 0) +
    state.houses.reduce((acc, h) => acc + h.storage.food, 0);
  const totalCoins = getTotalCirculatingCoins(state);
  const obsoleteCount = state.specialBuildings.filter((b) => !b.isOperational).length;
  const yearNum = Math.floor((state.day - 1) / DAYS_PER_YEAR) + 1;
  const parts: string[] = [
    `Día ${state.day} (Año ${yearNum} · ${state.season})`,
    `${state.agents.length} hab.`,
    `${state.houses.length} casas`,
    `${totalFood} rac.`,
    `${totalCoins}/${state.economyReserve.backedCoinsCapacity} mon.`,
    `${state.animals.length} anim.`,
  ];
  if (obsoleteCount > 0) parts.push(`${obsoleteCount} obra(s) obsoleta(s)`);
  if (sickCount > 0) parts.push(`${sickCount} enfermo(s)`);
  if (state.fires.length > 0) parts.push(`${state.fires.length} incendio(s)`);
  if (state.resourcesPaused) parts.push('recursos pausados');
  return parts.join(' · ');
}

export function advanceDayAging(
  state: SimulationState,
  createBabyFn?: (
    state: SimulationState,
    mother: Agent,
    father: Agent | null
  ) => Agent
): { diedOfOldAge: number; becameAdult: number; births: number } {
  ensureCivilizationDefaults(state);
  let diedOfOldAge = 0;
  let becameAdult = 0;
  let births = 0;
  const survivors: Agent[] = [];
  const newbornList: Agent[] = [];
  const agingYears = Math.max(1, Math.round(state.divineMultipliers?.aging ?? 1));

  for (const agent of state.agents) {
    agent.ageYears += agingYears;

    if (agent.jailedDays > 0) {
      agent.jailedDays = Math.max(0, agent.jailedDays - 1);
      if (agent.jailedDays === 0) {
        addLog(state, `${agent.name} cumplió su sanción y recuperó la libertad.`, 'sky');
      }
    }

    if (agent.isChild && agent.ageYears > AGE_CHILD_MAX_YEARS) {
      agent.isChild = false;
    }

    if (agent.ageYears === AGE_PARTNER_MIN_YEARS) {
      addLog(state, `${agent.name} alcanzó los ${AGE_PARTNER_MIN_YEARS} años y ya puede formar pareja.`, 'sky');
    }

    if (agent.ageYears === AGE_ADULT_YEARS) {
      becameAdult += 1;
      if (agent.job === 'Aprendiz') {
        decideVillagerMajorAction(state, agent, 'adult_job');
      }
      assignQwenAppearanceSetup(state, agent, { reason: 'mayoría de edad', preserveSkin: true });
      addLog(state, `${agent.name} cumplió ${AGE_ADULT_YEARS} años y asumió el oficio de ${agent.job}.`, 'sky');
    }

    if (agent.ageYears === AGE_REPRODUCE_MIN_YEARS) {
      addLog(state, `${agent.name} cumplió ${AGE_REPRODUCE_MIN_YEARS} años (edad adulta para decidir familia).`, 'sky');
    }

    if (!agent.isElder && agent.ageYears >= AGE_ELDER_YEARS) {
      agent.isElder = true;
      state.knowledge += 5;
      addLog(state, `${agent.name} alcanzó la ancianidad (${agent.ageYears} años) aportando sabiduría.`, 'violet');
    }

    // Penalización diaria si no tiene casa (no puede descansar)
    if (agent.houseId === null) {
      agent.energy = clamp(agent.energy - 14, 0, 100);
      agent.health = clamp(agent.health - 7, 0, 100);
      if (!agent.isSick && Math.random() < 0.18) {
        const disease = contractDiseaseForAgent(state, agent);
        addLog(state, `${agent.name} enfermó de ${disease.name} por dormir a la intemperie sin casa.`, 'rose');
      }
    }

    // Progreso diario de enfermedades (incluye Cáncer incurable 10-15 días, Pulmonía, Sepsis)
    if (agent.isSick) {
      const dRes = progressDiseasesDaily(state, agent);
      if (dRes.recovered) {
        addLog(state, `${agent.name} se recuperó de su enfermedad leve descansando en casa.`, 'emerald');
      }
    }

    // Progreso de embarazos de 3 días
    if (agent.pregnancy) {
      agent.pregnancy.daysRemaining -= 1;
      if (agent.pregnancy.daysRemaining <= 0) {
        const father =
          state.agents.find((p) => p.id === agent.pregnancy?.partnerId) ?? null;
        agent.pregnancy = null;
        let bornBaby: Agent;
        if (createBabyFn) {
          bornBaby = createBabyFn(state, agent, father);
        } else {
          const childSex: 'M' | 'F' = Math.random() < 0.5 ? 'M' : 'F';
          const childName = pickQwenBabyName(childSex, state);
          const childId = state.nextId++;
          bornBaby = {
            ...agent,
            id: childId,
            name: childName,
            sex: childSex,
            ageYears: 0,
            isChild: true,
            isElder: false,
            hunger: 15,
            energy: 95,
            health: 96,
            isSick: false,
            illnessName: null,
            illness: null,
            happiness: 80,
            education: 4,
            carpentryKnowledge: 0,
            constructionKnowledge: 0,
            jobMastery: {},
            skills: computeUnlockedSkills(4).map((s) => s.id),
            mentorId: null,
            loanDebt: 0,
            jailedDays: 0,
            isRepresentative: false,
            isSterile: false,
            wantsChildren: true,
            pregnancy: null,
            coins: 0,
            inv: {
              food: 0,
              wood: 0,
              pineWood: 0,
              mapleWood: 0,
              oakWood: 0,
              stone: 0,
              copper: 0,
              iron: 0,
              gold: 0,
              silver: 0,
            },
            milkCount: 0,
            breadCount: 0,
            toolsCount: 0,
            medicineCount: 0,
            job: 'Aprendiz',
            assignedBuildingId: null,
            mountedHorseId: null,
            partnerId: null,
            exPartnerIds: [],
            parents: father ? `${agent.name} & ${father.name}` : agent.name,
            childrenCount: 0,
            lastQwenDecision: `Qwen 2.5 eligió el nombre ${childName} tras 3 días de embarazo.`,
            qwenPlan: 'Crecer protegido en familia',
            thought: 'Recién nacido en la aldea.',
            importance: 10,
            reproductionCooldown: 0,
            moodModifier: 0,
          };
        }
        bornBaby.traits = inheritTraitsFromParents(agent, father, bornBaby.id);
        bornBaby.memories = [];
        applyGenerationAptitude(bornBaby, agent, father);
        assignQwenAppearanceSetup(state, bornBaby, {
          reason: 'nacimiento',
          parents: [agent, father],
        });
        recordAgentMemory(state, bornBaby, 'family', `Nací en la generación ${bornBaby.generation ?? 2}.`, 'positive');
        recordAgentMemory(state, agent, 'family', `Nació mi hijo/a ${bornBaby.name}.`, 'positive', bornBaby.name);
        if (father) {
          recordAgentMemory(state, father, 'family', `Nació mi hijo/a ${bornBaby.name}.`, 'positive', bornBaby.name);
        }
        trackNaturalProgress(state, 'births', 1);
        archiveChronicleEvent(state, 'natural', `Nació ${bornBaby.name} (Generación ${bornBaby.generation ?? 2}).`);
        emitSimEvent(state, 'birth', `Nació ${bornBaby.name}`, bornBaby.id, {
          generation: bornBaby.generation ?? 2,
        });
        newbornList.push(bornBaby);
        agent.childrenCount += 1;
        if (father) father.childrenCount += 1;
        births += 1;
      }
    }

    if (agent.ageYears >= 82) {
      agent.health = clamp(agent.health - 8, 0, 100);
    }

    if (agent.health <= 0) {
      diedOfOldAge += 1;
      if (agent.activeConstruction) {
        cancelActiveConstruction(state, agent, 'fallecimiento', true);
      }
      transferInheritance(state, agent);
      const cause = agent.illness ? `por ${agent.illness.name}` : `a los ${agent.ageYears} años`;
      addLog(state, `${agent.name} falleció ${cause}.`, 'rose');
      emitSimEvent(state, 'death', `${agent.name} falleció ${cause}`, agent.id);
      pushSoundCue(state, 'sadness');
      continue;
    }

    syncAgentSkills(agent);
    decideVillagerMajorAction(state, agent, 'daily_agent_tick');
    survivors.push(agent);
  }

  for (const baby of newbornList) {
    survivors.push(baby);
    addLog(state, `¡Nació ${baby.name} (${baby.parents}) tras 3 días de gestación! Nombre elegido por Qwen 2.5.`, 'emerald');
    pushSoundCue(state, 'celebration');
  }

  const aliveIds = new Set(survivors.map((a) => a.id));
  for (const agent of survivors) {
    if (agent.partnerId !== null && !aliveIds.has(agent.partnerId)) {
      agent.partnerId = null;
    }
    if (agent.mentorId !== null && !aliveIds.has(agent.mentorId)) {
      agent.mentorId = null;
    }
  }

  state.agents = survivors;
  rebalanceFamilyHousing(state);
  syncSpecialBuildingStaff(state);
  rebalanceBuildingOwnership(state);
  recalculateEconomyReserve(state);
  ensureQwenControlledRepresentative(state);
  runQwenRepresentativeAutonomousTurn(state);

  // Cambio automático de Estación (cada 30 días) + Bioma + Clima
  const nextSeason = computeSeason(state.day);
  if (nextSeason !== state.season) {
    state.season = nextSeason;
    const climate = getSeasonBiomeAndWeather(nextSeason);
    state.biome = climate.biome;
    state.weather = climate.weather;
    addLog(
      state,
      `Cambio estacional a ${nextSeason}: bioma y clima adaptados automáticamente.`,
      'sky'
    );
  }

  applyBuildingWear(state);
  collectTaxesAndRepayLoans(state);
  assignMentorships(state);
  runCouncilOfElders(state);
  applyRetirementAndAgingModifiers(state);
  updateDynamicMarketPrices(state);
  updateEcosystemHealth(state);
  updateVillagePolitics(state);
  updateRepresentativeThreeTierGoals(state);
  evaluateMilestones(state);
  if (state.activeDisaster) {
    state.activeDisaster.daysRemaining -= 1;
    if (state.activeDisaster.daysRemaining <= 0) {
      state.activeDisaster = null;
    }
  }
  recordDailySnapshot(state);

  const summary = generateDailyQwenSummary(state);
  state.qwenMessages.push({
    id: state.nextId++,
    role: 'qwen',
    source: 'local',
    text: summary,
  });
  if (state.qwenMessages.length > 35) state.qwenMessages.shift();

  return { diedOfOldAge, becameAdult, births };
}

export function canAgentsReproduce(
  a: Agent,
  b: Agent,
  houses: House[],
  agents: Agent[],
  policies: QwenPolicyState
): boolean {
  if (a.sex === b.sex) return false;
  if (a.isChild || b.isChild) return false;
  if (a.ageYears < AGE_REPRODUCE_MIN_YEARS || b.ageYears < AGE_REPRODUCE_MIN_YEARS) return false;
  if (a.ageYears > 55 || b.ageYears > 55) return false;
  if (a.isSterile || b.isSterile) return false;
  if (!a.wantsChildren || !b.wantsChildren) return false;
  const female = a.sex === 'F' ? a : b;
  if (female.pregnancy !== null) return false;
  if (a.isSick || b.isSick) return false;
  if (a.health < 55 || b.health < 55) return false;
  if (a.hunger > 55 || b.hunger > 55) return false;
  if (a.reproductionCooldown > 0 || b.reproductionCooldown > 0) return false;

  const totalCapacity = houses.reduce((acc, h) => acc + h.capacity, 0);
  const extraMargin = policies.reproductionRestraint ? 2 : 10;
  if (houses.length === 0 || agents.length >= totalCapacity + extraMargin) return false;
  if (a.houseId === null && b.houseId === null) return false;

  const maxChildren = policies.reproductionRestraint ? 2 : 5;
  if (a.childrenCount >= maxChildren || b.childrenCount >= maxChildren) return false;

  return true;
}

export function generateEmergentDialogue(
  a: Agent,
  b: Agent,
  state: Pick<SimulationState, 'season' | 'weather' | 'resourcesPaused' | 'policies' | 'specialBuildings'>
): string {
  if (a.isSick || b.isSick) {
    return `${a.name}: "Cuidemos la salud, necesitamos apoyo en el Hospital o la Botica."`;
  }
  if (state.resourcesPaused) {
    return `${a.name}: "No llegan recursos externos; debemos cultivar, pescar y cuidar los yacimientos."`;
  }
  if (state.season === 'Invierno') {
    return `${a.name}: "El invierno es duro; resguardemos comida en casa y reparemos techos."`;
  }
  if (state.policies.economyFocus || state.specialBuildings.some((s) => s.category === 'commerce')) {
    return `${a.name}: "El Banco y los comercios necesitan oro, plata, cobre y maderas finas."`;
  }
  return `${a.name}: "Con ${b.job} y mi oficio de ${a.job} haremos evolucionar nuestra especie."`;
}

export function addLog(
  state: Pick<SimulationState, 'day' | 'logs' | 'nextId'>,
  text: string,
  tone: LogEntry['tone'] = 'slate'
): void {
  state.logs.unshift({
    id: state.nextId++,
    day: state.day,
    text,
    tone,
  });
  if (state.logs.length > 80) state.logs.length = 80;
}

export function evaluateResourceSentiment(
  agent: Agent,
  resource: keyof ResourceInventory | 'coins',
  delta: number
): string {
  const labels: Record<keyof ResourceInventory | 'coins', string> = {
    food: 'comida',
    wood: 'madera común',
    pineWood: 'madera de Pino',
    mapleWood: 'madera de Arce',
    oakWood: 'madera de Roble',
    stone: 'piedra',
    copper: 'cobre',
    iron: 'hierro',
    gold: 'Oro 🥇',
    silver: 'Plata 🥈',
    coins: 'monedas',
  };
  const label = labels[resource];
  if (delta > 0) {
    agent.moodModifier = clamp(agent.moodModifier + 14, -45, 45);
    agent.happiness = clamp(agent.happiness + 14, 0, 100);
    agent.thought = `¡Qué entusiasmo! Recibí ${label}; me siento motivado para trabajar más.`;
    return `${agent.name} recibió +${delta} de ${label} y su entusiasmo subió.`;
  }
  agent.moodModifier = clamp(agent.moodModifier - 16, -45, 45);
  agent.happiness = clamp(agent.happiness - 16, 0, 100);
  agent.thought = `Perdí ${label} de mis pertenencias; siento tristeza y depresión.`;
  return `${agent.name} perdió ${Math.abs(delta)} de ${label} y su ánimo cayó.`;
}

export function cureAgent(state: SimulationState, agentId: number): string | null {
  const agent = state.agents.find((a) => a.id === agentId);
  if (!agent) return null;

  if (agent.illness?.incurable) {
    agent.moodModifier = clamp(agent.moodModifier + 8, -45, 45);
    agent.happiness = clamp(agent.happiness + 10, 0, 100);
    agent.health = clamp(agent.health + 6, 1, 100);
    const left = Math.max(1, (agent.illness.fatalAfterDays ?? 12) - agent.illness.daysInfected);
    agent.thought = `Los cuidados alivian mi dolor, pero el ${agent.illness.name} es incurable.`;
    const msg = `${agent.name} padece ${agent.illness.name} (incurable, ~${left} días); solo recibió alivio paliativo.`;
    addLog(state, msg, 'amber');
    return msg;
  }

  agent.isSick = false;
  agent.illness = null;
  agent.illnessName = null;
  agent.health = clamp(Math.max(agent.health + 45, 92), 0, 100);
  agent.moodModifier = clamp(agent.moodModifier + 15, -45, 45);
  agent.happiness = clamp(agent.happiness + 18, 0, 100);
  agent.emotion = deriveAgentEmotion(agent, state.weather);
  agent.thought = 'Me siento completamente recuperado y con entusiasmo para trabajar.';
  const msg = `Curaste a ${agent.name} (Salud: ${Math.round(agent.health)}/100).`;
  addLog(state, msg, 'emerald');
  return msg;
}

export function infectAgent(
  state: SimulationState,
  agentId: number,
  forcedDiseaseId?: DiseaseId
): string | null {
  const agent = state.agents.find((a) => a.id === agentId);
  if (!agent) return null;
  const info = contractDiseaseForAgent(state, agent, forcedDiseaseId);
  agent.health = clamp(agent.health - Math.round(info.dangerPct * 0.25), 10, 100);
  agent.moodModifier = clamp(agent.moodModifier - 18, -45, 45);
  agent.happiness = clamp(agent.happiness - 22, 0, 100);
  agent.emotion = 'sick';
  agent.thought = `Contraje ${info.name} (peligrosidad ${info.dangerPct}%).`;
  const msg = `${agent.name} enfermó de ${info.name} (peligro ${info.dangerPct}%${info.incurable ? ' · incurable' : ''}).`;
  addLog(state, msg, 'amber');
  if (info.dangerPct >= 35 || info.incurable) {
    pushSoundCue(state, 'sadness');
  }
  return msg;
}

export function toggleSterileAgent(state: SimulationState, agentId: number): string | null {
  const agent = state.agents.find((a) => a.id === agentId);
  if (!agent) return null;
  agent.isSterile = !agent.isSterile;
  if (agent.isSterile) {
    agent.moodModifier = clamp(agent.moodModifier - 12, -45, 45);
    agent.happiness = clamp(agent.happiness - 10, 0, 100);
    agent.thought = 'Ya no podré tener hijos; me enfocaré en mi oficio y en la aldea.';
    const msg = `${agent.name} quedó impotente / estéril.`;
    addLog(state, msg, 'violet');
    return msg;
  }
  agent.moodModifier = clamp(agent.moodModifier + 10, -45, 45);
  agent.happiness = clamp(agent.happiness + 8, 0, 100);
  agent.thought = 'Recuperé mi vitalidad y fertilidad.';
  const msg = `${agent.name} volvió a ser fértil.`;
  addLog(state, msg, 'emerald');
  return msg;
}

export function killAgent(state: SimulationState, agentId: number): string | null {
  const target = state.agents.find((a) => a.id === agentId);
  if (!target) return null;

  if (target.activeConstruction) {
    cancelActiveConstruction(state, target, 'muerte por intervención', true);
  }
  transferInheritance(state, target);

  if (target.partnerId !== null) {
    const partner = state.agents.find((a) => a.id === target.partnerId);
    if (partner) {
      partner.partnerId = null;
      partner.moodModifier = clamp(partner.moodModifier - 26, -45, 45);
      partner.happiness = clamp(Math.min(partner.happiness - 36, 34), 0, 100);
      partner.emotion = deriveAgentEmotion(partner, state.weather);
      partner.thought = `Lamento profundamente la pérdida de ${target.name}.`;
    }
  }

  for (const animal of state.animals) {
    if (animal.riderId === target.id) animal.riderId = null;
  }

  state.agents = state.agents.filter((a) => a.id !== agentId);
  syncSpecialBuildingStaff(state);
  recalculateEconomyReserve(state);
  electRepresentative(state);

  if (state.selectedAgentId === agentId) state.selectedAgentId = null;
  if (state.selectedEntity?.kind === 'agent' && state.selectedEntity.id === agentId) {
    state.selectedEntity = null;
  }
  if (state.highlightFamilyAgentId === agentId) state.highlightFamilyAgentId = null;

  const msg = `${target.name} (${target.ageYears} años) murió por intervención divina.`;
  addLog(state, msg, 'rose');
  pushSoundCue(state, 'sadness');
  return msg;
}

export function modifyAgentResource(
  state: SimulationState,
  agentId: number,
  resource: keyof ResourceInventory | 'coins',
  delta: number
): string | null {
  const agent = state.agents.find((a) => a.id === agentId);
  if (!agent) return null;

  if (resource === 'coins') {
    if (delta > 0) {
      const minted = mintBackedCoins(state, delta);
      if (minted <= 0) {
        addLog(state, 'No hay respaldo suficiente en Oro/Plata para emitir más monedas.', 'amber');
        return null;
      }
      agent.coins += minted;
    } else {
      const nextVal = Math.max(0, agent.coins + delta);
      if (nextVal === agent.coins) return null;
      agent.coins = nextVal;
    }
  } else {
    const nextVal = Math.max(0, agent.inv[resource] + delta);
    if (nextVal === agent.inv[resource]) return null;
    agent.inv[resource] = nextVal;
  }

  recalculateEconomyReserve(state);
  const msg = evaluateResourceSentiment(agent, resource, delta);
  agent.emotion = deriveAgentEmotion(agent, state.weather);
  agent.importance = computeAgentImportance(agent);
  addLog(state, msg, delta > 0 ? 'emerald' : 'amber');
  return msg;
}

/**
 * El usuario ÚNICAMENTE puede modificar el Saber General (`general`).
 * Carpintería y Construcción progresan de manera autónoma por oficio, escuela y aprendices.
 */
export function modifyAgentKnowledge(
  state: SimulationState,
  agentId: number,
  delta: number,
  branch: 'general' | 'carpentry' | 'construction' = 'general'
): string | null {
  const agent = state.agents.find((a) => a.id === agentId);
  if (!agent) return null;

  if (branch !== 'general') {
    addLog(
      state,
      `El conocimiento de ${branch === 'carpentry' ? 'Carpintería' : 'Construcción'} evoluciona de forma autónoma trabajando o estudiando.`,
      'amber'
    );
    return null;
  }

  const prev = agent.education;
  const next = clamp(Math.round(prev + delta), 0, 100);
  if (next === prev) return null;
  agent.education = next;
  const skills = syncAgentSkills(agent);

  if (delta > 0) {
    const villageGain = Math.max(1, Math.round(delta * 0.4));
    state.knowledge += villageGain;
    state.era = computeEra(state.knowledge, state.houses);
    agent.moodModifier = clamp(agent.moodModifier + 10, -45, 45);
    agent.happiness = clamp(agent.happiness + 10, 0, 100);
    agent.emotion = deriveAgentEmotion(agent, state.weather);
    agent.lastQwenDecision = `Qwen 2.5 registró +${next - prev}% de Saber General para ${agent.name} (${skills.length}/25 skills).`;
    agent.thought =
      next >= 40
        ? `Desbloqueé ${skills.length}/25 skills; tomo decisiones más estratégicas para la aldea.`
        : `Aprendí nuevas habilidades (${skills.length}/25 skills) para evolucionar la aldea.`;
    const msg = `Agregaste +${next - prev}% de Saber General a ${agent.name} (${next}% · ${skills.length}/25 skills).`;
    addLog(state, msg, 'sky');
    return msg;
  }

  agent.moodModifier = clamp(agent.moodModifier - 4, -45, 45);
  agent.emotion = deriveAgentEmotion(agent, state.weather);
  agent.lastQwenDecision = `Se redujo el Saber General de ${agent.name} a ${next}%.`;
  agent.thought = 'Necesito estudiar o investigar más para recuperar mis conocimientos.';
  const msg = `Se redujo el Saber General de ${agent.name} a ${next}%.`;
  addLog(state, msg, 'amber');
  return msg;
}

export const HOUSE_SIZE_LABELS: Record<House['size'], string> = {
  small: 'Chica',
  medium: 'Mediana',
  large: 'Grande',
};

function getSettlementAnchor(
  state: SimulationState,
  zone: 'south' | 'north' = 'south',
  anchorX?: number,
  anchorY?: number
): { x: number; y: number } {
  if (anchorX !== undefined && anchorY !== undefined) {
    return {
      x: clamp(anchorX, FOREST_MAX_X + 40, MOUNTAIN_MIN_X - 40),
      y:
        zone === 'north'
          ? clamp(anchorY, NORTH_LAND_MIN_Y + 28, NORTH_LAND_MAX_Y - 18)
          : clamp(anchorY, SAFE_LAND_MIN_Y + 46, CANVAS_HEIGHT - 84),
    };
  }
  if (zone === 'south' && state.plaza) {
    return { x: state.plaza.x, y: state.plaza.y };
  }
  const bankHouses = state.houses.filter((h) => h.zone === zone);
  if (bankHouses.length > 0) {
    const sx = bankHouses.reduce((acc, h) => acc + h.x, 0) / bankHouses.length;
    const sy = bankHouses.reduce((acc, h) => acc + h.y, 0) / bankHouses.length;
    return { x: sx, y: sy };
  }
  const bankAgents = state.agents.filter((a) =>
    zone === 'north' ? a.y < RIVER_TOP_Y : a.y > RIVER_BOTTOM_Y
  );
  if (bankAgents.length > 0) {
    const sx = bankAgents.reduce((acc, a) => acc + a.x, 0) / bankAgents.length;
    const sy = bankAgents.reduce((acc, a) => acc + a.y, 0) / bankAgents.length;
    return { x: clamp(sx, FOREST_MAX_X + 60, MOUNTAIN_MIN_X - 60), y: sy };
  }
  return {
    x: WORLD_CENTER_X + (Math.random() - 0.5) * 220,
    y: zone === 'north' ? NORTH_CENTER_Y + (Math.random() - 0.5) * 80 : SOUTH_CENTER_Y + (Math.random() - 0.5) * 120,
  };
}

function isSpotClear(
  state: SimulationState,
  cx: number,
  cy: number,
  minDistHouse: number,
  minDistSpecial: number,
  minDistPlaza: number,
  minDistFarm: number
): boolean {
  if (cy >= RIVER_TOP_Y - 22 && cy <= RIVER_BOTTOM_Y + 22) return false;
  if (state.plaza && Math.hypot(cx - state.plaza.x, cy - state.plaza.y) < minDistPlaza) return false;
  if (state.houses.some((h) => Math.hypot(cx - h.x, cy - h.y) < minDistHouse)) return false;
  if (state.specialBuildings.some((b) => Math.hypot(cx - b.x, cy - b.y) < minDistSpecial)) return false;
  if (state.farms.some((f) => Math.hypot(cx - f.x, cy - f.y) < minDistFarm)) return false;
  return true;
}

export interface StructureObstacleBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function getHouseObstacleBounds(h: House, pad = 6): StructureObstacleBounds {
  const halfW = h.size === 'large' ? 30 : h.size === 'medium' ? 23 : 17;
  const topH = h.size === 'large' ? 23 : h.size === 'medium' ? 18 : 15;
  const bottomH = h.size === 'large' ? 16 : h.size === 'medium' ? 13 : 11;
  return {
    minX: h.x - halfW - pad,
    maxX: h.x + halfW + pad,
    minY: h.y - topH - pad,
    maxY: h.y + bottomH + pad,
  };
}

export function getFarmObstacleBounds(f: FarmPlot, pad = 6): StructureObstacleBounds {
  const halfW = (f.size === 'large' ? 30 : f.size === 'medium' ? 22 : 15) + 3;
  const halfH = (f.size === 'large' ? 20 : f.size === 'medium' ? 14 : 10) + 3;
  return {
    minX: f.x - halfW - pad,
    maxX: f.x + halfW + pad,
    minY: f.y - halfH - pad,
    maxY: f.y + halfH + pad,
  };
}

export function getSpecialBuildingObstacleBounds(
  b: SpecialBuilding,
  pad = 6
): StructureObstacleBounds {
  const halfW =
    b.type === 'market' || b.type === 'bank' || b.type === 'infirmary' || b.type === 'town_hall'
      ? 34
      : 29;
  const topH = b.type === 'dock' ? 26 : 24;
  const bottomH = 19;
  return {
    minX: b.x - halfW - pad,
    maxX: b.x + halfW + pad,
    minY: b.y - topH - pad,
    maxY: b.y + bottomH + pad,
  };
}

export function getBridgeObstacleBounds(
  bridge: BridgeStructure,
  pad = 6
): StructureObstacleBounds {
  return {
    minX: bridge.x - BRIDGE_HALF_WIDTH - pad,
    maxX: bridge.x + BRIDGE_HALF_WIDTH + pad,
    minY: RIVER_TOP_Y - 10 - pad,
    maxY: RIVER_BOTTOM_Y + 10 + pad,
  };
}

export function isPointInRiverOrBridge(y: number): boolean {
  return y >= RIVER_TOP_Y - 10 && y <= RIVER_BOTTOM_Y + 10;
}

export function isPointOnRoad(
  state: Pick<SimulationState, 'roads'>,
  x: number,
  y: number,
  pad = 4
): boolean {
  const half = ROAD_GRID_SIZE / 2 + pad;
  return state.roads.some((r) => Math.abs(x - r.x) <= half && Math.abs(y - r.y) <= half);
}

function isInsideBounds(x: number, y: number, b: StructureObstacleBounds): boolean {
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
}

export function isPointBlockedByStructures(
  state: SimulationState,
  x: number,
  y: number,
  pad = 8,
  includeSpecialBuildings = true
): boolean {
  for (const h of state.houses) {
    if (isInsideBounds(x, y, getHouseObstacleBounds(h, pad))) return true;
  }
  for (const f of state.farms) {
    if (isInsideBounds(x, y, getFarmObstacleBounds(f, pad))) return true;
  }
  if (includeSpecialBuildings) {
    for (const b of state.specialBuildings) {
      if (isInsideBounds(x, y, getSpecialBuildingObstacleBounds(b, pad))) return true;
    }
    if (state.plaza) {
      const plazaBounds: StructureObstacleBounds = {
        minX: state.plaza.x - 62 - pad,
        maxX: state.plaza.x + 62 + pad,
        minY: state.plaza.y - 46 - pad,
        maxY: state.plaza.y + 46 + pad,
      };
      if (isInsideBounds(x, y, plazaBounds)) return true;
    }
  }
  return false;
}

export function isPointBlockedForResource(
  state: SimulationState,
  x: number,
  y: number,
  pad = 10
): boolean {
  if (isPointInRiverOrBridge(y)) return true;
  if (state.bridge && isInsideBounds(x, y, getBridgeObstacleBounds(state.bridge, pad))) return true;
  if (isPointBlockedByStructures(state, x, y, pad, true)) return true;
  if (isPointOnRoad(state, x, y, Math.max(4, pad - 4))) return true;
  return false;
}

export function isPointBlockedForAnimal(
  state: SimulationState,
  x: number,
  y: number,
  pad = 8
): boolean {
  if (isPointInRiverOrBridge(y)) return true;
  if (state.bridge && isInsideBounds(x, y, getBridgeObstacleBounds(state.bridge, pad))) return true;
  if (isPointBlockedByStructures(state, x, y, pad, true)) return true;
  return false;
}

export function getResourceZoneXBounds(type: ResourceNode['type']): { minX: number; maxX: number } {
  if (
    type === 'stone' ||
    type === 'copper' ||
    type === 'iron' ||
    type === 'silver' ||
    type === 'gold'
  ) {
    return { minX: MOUNTAIN_MIN_X + 18, maxX: CANVAS_WIDTH - 28 };
  }
  if (
    type === 'wood' ||
    type === 'pine_wood' ||
    type === 'maple_wood' ||
    type === 'oak_wood' ||
    type === 'food'
  ) {
    return { minX: 28, maxX: FOREST_MAX_X - 16 };
  }
  return { minX: FOREST_MAX_X + 24, maxX: MOUNTAIN_MIN_X - 24 };
}

export function findNearestClearResourceSpot(
  state: SimulationState,
  type: ResourceNode['type'],
  x: number,
  y: number,
  pad = 10,
  enforceZone = true
): { x: number; y: number } {
  const zone = enforceZone
    ? getResourceZoneXBounds(type)
    : { minX: 28, maxX: CANVAS_WIDTH - 28 };
  const preferNorth = y < RIVER_TOP_Y;

  const clampInZone = (cx: number, cy: number): { x: number; y: number } => {
    const lx = clamp(cx, zone.minX, zone.maxX);
    let ly = clamp(cy, NORTH_LAND_MIN_Y + 10, CANVAS_HEIGHT - 28);
    if (isPointInRiverOrBridge(ly)) {
      ly = preferNorth ? NORTH_LAND_MAX_Y - 12 : SAFE_LAND_MIN_Y + 14;
    }
    return { x: Math.round(lx), y: Math.round(ly) };
  };

  const isFree = (px: number, py: number, checkOverlap: boolean): boolean => {
    if (isPointBlockedForResource(state, px, py, pad)) return false;
    if (
      checkOverlap &&
      state.resources.some((r) => !r.depleted && Math.hypot(r.x - px, r.y - py) < 16)
    ) {
      return false;
    }
    return true;
  };

  const initial = clampInZone(x, y);
  if (isFree(initial.x, initial.y, true)) return initial;

  for (const checkOverlap of [true, false]) {
    for (let radius = 16; radius <= 320; radius += 16) {
      const steps = 16;
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const cand = clampInZone(
          initial.x + Math.cos(angle) * radius,
          initial.y + Math.sin(angle) * radius
        );
        if (isFree(cand.x, cand.y, checkOverlap)) return cand;
      }
    }
  }

  // Búsqueda determinista por rejilla dentro de la zona permitida si hubo congestión local
  for (let gy = preferNorth ? NORTH_LAND_MIN_Y + 16 : SAFE_LAND_MIN_Y + 16; gy < CANVAS_HEIGHT - 32; gy += 28) {
    if (isPointInRiverOrBridge(gy)) continue;
    for (let gx = zone.minX + 6; gx <= zone.maxX - 6; gx += 28) {
      const cand = clampInZone(gx, gy);
      if (!isPointBlockedForResource(state, cand.x, cand.y, pad)) return cand;
    }
  }

  return initial;
}

export function findNearestClearGroundSpot(
  state: SimulationState,
  x: number,
  y: number,
  pad = 10,
  includeSpecialBuildings = true
): { x: number; y: number } {
  const preferNorth = y < RIVER_TOP_Y;
  const clampLand = (cx: number, cy: number): { x: number; y: number } => {
    const lx = clamp(cx, 28, CANVAS_WIDTH - 28);
    let ly = clamp(cy, NORTH_LAND_MIN_Y + 8, CANVAS_HEIGHT - 28);
    if (isPointInRiverOrBridge(ly)) {
      ly = preferNorth ? NORTH_LAND_MAX_Y - 12 : SAFE_LAND_MIN_Y + 14;
    }
    return { x: Math.round(lx), y: Math.round(ly) };
  };

  const isValid = (px: number, py: number): boolean =>
    !isPointInRiverOrBridge(py) &&
    !(state.bridge && isInsideBounds(px, py, getBridgeObstacleBounds(state.bridge, pad))) &&
    !isPointBlockedByStructures(state, px, py, pad, includeSpecialBuildings);

  const initial = clampLand(x, y);
  if (isValid(initial.x, initial.y)) {
    return initial;
  }

  for (let radius = 16; radius <= 320; radius += 14) {
    const steps = 16;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const cand = clampLand(initial.x + Math.cos(angle) * radius, initial.y + Math.sin(angle) * radius);
      if (isValid(cand.x, cand.y)) {
        return cand;
      }
    }
  }

  return initial;
}

export function resolveAnimalObstacleStep(
  state: SimulationState,
  curX: number,
  curY: number,
  nextX: number,
  nextY: number,
  pad = 8
): { x: number; y: number; blocked: boolean } {
  const valid = (px: number, py: number) => !isPointBlockedForAnimal(state, px, py, pad);

  if (valid(nextX, nextY)) {
    return { x: nextX, y: nextY, blocked: false };
  }
  if (valid(nextX, curY)) {
    return { x: nextX, y: curY, blocked: true };
  }
  if (valid(curX, nextY)) {
    return { x: curX, y: nextY, blocked: true };
  }
  if (valid(curX, curY)) {
    return { x: curX, y: curY, blocked: true };
  }
  const escaped = findNearestClearGroundSpot(state, curX, curY, pad + 2, true);
  return { x: escaped.x, y: escaped.y, blocked: true };
}

export function relocateBlockedResourcesAndAnimals(state: SimulationState): void {
  for (const r of state.resources) {
    const zone = getResourceZoneXBounds(r.type);
    const outOfZone =
      r.type !== 'coins' && (r.x < zone.minX - 2 || r.x > zone.maxX + 2);
    if (outOfZone || isPointBlockedForResource(state, r.x, r.y, 8)) {
      const clear = findNearestClearResourceSpot(state, r.type, r.x, r.y, 10, true);
      r.x = clear.x;
      r.y = clear.y;
    }
  }
  for (const a of state.animals) {
    if (a.type === 'fish' || (a.type === 'horse' && a.riderId !== null)) continue;
    if (isPointBlockedForAnimal(state, a.x, a.y, 8)) {
      const clear = findNearestClearGroundSpot(state, a.x, a.y, 10, true);
      a.x = clear.x;
      a.y = clear.y;
    }
  }
}

export function chooseQwenBuildSpot(
  state: SimulationState,
  kind: 'house' | 'plaza' | 'special' | 'dock' | 'farm',
  zone: 'south' | 'north' = 'south',
  anchorX?: number,
  anchorY?: number
): { x: number; y: number } {
  if (kind === 'dock') {
    const bridgeX = state.bridge?.x ?? null;
    const anchor = getSettlementAnchor(state, 'south', anchorX, anchorY);
    for (let attempt = 0; attempt < 40; attempt++) {
      const offset = (attempt % 2 === 0 ? 1 : -1) * Math.floor((attempt + 1) / 2) * 62;
      const cx = clamp(anchor.x + offset + (Math.random() - 0.5) * 36, FOREST_MAX_X + 30, MOUNTAIN_MIN_X - 30);
      const cy = RIVER_BOTTOM_Y + 34;
      const nearBridge = bridgeX !== null && Math.abs(cx - bridgeX) < 88;
      const nearOther = state.specialBuildings.some((b) => Math.hypot(cx - b.x, cy - b.y) < 76);
      if (!nearBridge && !nearOther) {
        return { x: Math.round(cx), y: cy };
      }
    }
    return { x: Math.round(clamp(anchor.x + 120, FOREST_MAX_X + 30, MOUNTAIN_MIN_X - 30)), y: RIVER_BOTTOM_Y + 34 };
  }

  const anchor = getSettlementAnchor(state, zone, anchorX, anchorY);
  const seedAngle = (state.nextId * 1.618 + state.houses.length * 0.73 + state.specialBuildings.length * 1.15) % (Math.PI * 2);

  if (zone === 'north') {
    for (let attempt = 0; attempt < 64; attempt++) {
      const angle = seedAngle + attempt * 0.75;
      const radius = 55 + Math.floor(attempt / 6) * 44;
      const cx = clamp(anchor.x + Math.cos(angle) * radius, FOREST_MAX_X + 26, MOUNTAIN_MIN_X - 26);
      const cy = clamp(
        NORTH_CENTER_Y + Math.sin(angle) * (radius * 0.72),
        NORTH_LAND_MIN_Y + 46,
        NORTH_LAND_MAX_Y - 46
      );
      if (isSpotClear(state, cx, cy, 62, 74, 96, 58)) {
        return { x: Math.round(cx), y: Math.round(cy) };
      }
    }
    return {
      x: Math.round(clamp(420 + Math.random() * 580, FOREST_MAX_X + 30, MOUNTAIN_MIN_X - 30)),
      y: NORTH_CENTER_Y,
    };
  }

  const minRadii: Record<'plaza' | 'house' | 'special' | 'farm', number> = {
    plaza: 25,
    house: 80,
    special: 95,
    farm: 135,
  };
  const clearances: Record<'plaza' | 'house' | 'special' | 'farm', [number, number, number, number]> = {
    plaza: [96, 105, 120, 92],
    house: [64, 76, 112, 62],
    special: [76, 86, 118, 72],
    farm: [66, 74, 110, 62],
  };
  const [mh, ms, mp, mf] = clearances[kind];

  for (let attempt = 0; attempt < 96; attempt++) {
    const angle = seedAngle + attempt * 0.78 + (Math.random() - 0.5) * 0.28;
    const radius = minRadii[kind] + Math.floor(attempt / 6) * 44;
    const cx = clamp(anchor.x + Math.cos(angle) * radius, FOREST_MAX_X + 35, MOUNTAIN_MIN_X - 35);
    const cy = clamp(
      anchor.y + Math.sin(angle) * (radius * 0.72),
      SAFE_LAND_MIN_Y + 46,
      CANVAS_HEIGHT - 74
    );
    if (isSpotClear(state, cx, cy, mh, ms, mp, mf)) {
      return { x: Math.round(cx), y: Math.round(cy) };
    }
  }

  return {
    x: Math.round(clamp(FOREST_MAX_X + 60 + Math.random() * (MOUNTAIN_MIN_X - FOREST_MAX_X - 120), FOREST_MAX_X + 40, MOUNTAIN_MIN_X - 40)),
    y: Math.round(SAFE_LAND_MIN_Y + 70 + Math.random() * (CANVAS_HEIGHT - SAFE_LAND_MIN_Y - 150)),
  };
}

export function createPlaza(
  state: SimulationState,
  builderName: string,
  anchorX?: number,
  anchorY?: number
): NonNullable<SimulationState['plaza']> {
  if (state.plaza) return state.plaza;
  const spot = chooseQwenBuildSpot(state, 'plaza', 'south', anchorX, anchorY);
  const plaza = {
    x: spot.x,
    y: spot.y,
    builderName,
    builtDay: state.day,
    durability: 100,
    unpaidMaintenanceDays: 0,
    maintenanceDebtCount: 0,
    maintenanceStatus: 'ok' as MaintenanceStatus,
    lastMaintenanceDay: state.day,
  };
  state.plaza = plaza;
  return plaza;
}

export function createBridge(
  state: SimulationState,
  builderName: string,
  preferredX?: number
): NonNullable<SimulationState['bridge']> {
  if (state.bridge) return state.bridge;
  const anchor = getSettlementAnchor(state, 'south', preferredX);
  const chosenX = Math.round(
    clamp(preferredX ?? anchor.x + (Math.random() - 0.5) * 140, FOREST_MAX_X + 60, MOUNTAIN_MIN_X - 60)
  );
  const bridge = {
    x: chosenX,
    builderName,
    builtDay: state.day,
    durability: 100,
    unpaidMaintenanceDays: 0,
    maintenanceDebtCount: 0,
    maintenanceStatus: 'ok' as MaintenanceStatus,
    lastMaintenanceDay: state.day,
  };
  state.bridge = bridge;
  return bridge;
}

export function deletePlaza(state: SimulationState): boolean {
  if (!state.plaza) return false;
  state.plaza = null;
  if (state.selectedEntity?.kind === 'plaza') state.selectedEntity = null;
  addLog(state, 'Demoliste la Plaza Central de la aldea.', 'rose');
  return true;
}

export function deleteBridge(state: SimulationState): boolean {
  if (!state.bridge) return false;
  const bx = state.bridge.x;
  state.bridge = null;
  state.roads = state.roads.filter(
    (r) => !(r.y >= RIVER_TOP_Y - 8 && r.y <= RIVER_BOTTOM_Y + 8 && Math.abs(r.x - bx) <= BRIDGE_HALF_WIDTH + 6)
  );
  if (state.selectedEntity?.kind === 'bridge') state.selectedEntity = null;
  addLog(state, 'Demoliste el Puente fluvial. La Zona Norte quedó aislada por el río.', 'rose');
  return true;
}

export function createHouseNearCenter(
  state: SimulationState,
  builderName: string,
  zone: 'south' | 'north' = 'south',
  forcedSize?: House['size'],
  anchorX?: number,
  anchorY?: number,
  constructionSkillPct = 20
): House {
  const id = state.nextId++;
  const maxLv = ERA_METADATA[state.era].maxHouseLevel;
  const levelBySkill: 1 | 2 | 3 | 4 =
    constructionSkillPct >= 75
      ? (Math.min(4, maxLv + 1) as 1 | 2 | 3 | 4)
      : constructionSkillPct >= 45
        ? (Math.min(3, Math.max(2, maxLv)) as 1 | 2 | 3 | 4)
        : maxLv;
  const spot = chooseQwenBuildSpot(state, 'house', zone, anchorX, anchorY);

  const sizePool: House['size'][] = ['small', 'medium', 'large'];
  const size: House['size'] =
    forcedSize ??
    (constructionSkillPct >= 65
      ? 'large'
      : constructionSkillPct >= 35
        ? 'medium'
        : sizePool[(id + state.houses.length) % sizePool.length]);

  const capacity = HOUSE_SIZE_CAPACITIES[size];

  const house: House = {
    id,
    name: `Vivienda #${state.houses.length + 1}`,
    x: spot.x,
    y: spot.y,
    zone,
    size,
    level: levelBySkill,
    capacity,
    comfortBonus: 8 * levelBySkill + (size === 'large' ? 8 : size === 'medium' ? 4 : 0),
    durability: 100,
    unpaidMaintenanceDays: 0,
    maintenanceDebtCount: 0,
    maintenanceStatus: 'ok',
    lastMaintenanceDay: state.day,
    builderName,
    storage: createEmptyHouseStorage(1),
  };
  state.houses.push(house);

  const homeless = state.agents.filter((a) => a.houseId === null);
  let assigned = 0;
  for (const agent of homeless) {
    if (assigned >= house.capacity) break;
    agent.houseId = house.id;
    assigned++;
  }
  rebalanceFamilyHousing(state);

  return house;
}

export function upgradeLowestHouse(
  state: SimulationState,
  constructionSkillPct = 20,
  targetHouseId?: number
): House | null {
  const maxAllowed: 1 | 2 | 3 | 4 =
    constructionSkillPct >= 75
      ? 4
      : (Math.max(ERA_METADATA[state.era].maxHouseLevel, constructionSkillPct >= 45 ? 3 : 2) as 1 | 2 | 3 | 4);
  const candidates = (
    targetHouseId !== undefined
      ? state.houses.filter((h) => h.id === targetHouseId && h.level < maxAllowed)
      : state.houses.filter((h) => h.level < maxAllowed)
  ).sort((a, b) => a.level - b.level);
  const target = candidates[0];
  if (!target) return null;
  target.level = (target.level + 1) as 1 | 2 | 3 | 4;
  target.comfortBonus += 10;
  target.durability = 100;
  target.unpaidMaintenanceDays = 0;
  target.maintenanceDebtCount = 0;
  target.maintenanceStatus = 'ok';
  target.lastMaintenanceDay = state.day;
  return target;
}

export function getSpecialBuildingMaxLevelByTech(state: SimulationState, constructionSkillPct = 20): 1 | 2 | 3 {
  if (state.era === 'wood' || state.era === 'iron' || state.era === 'civilization' || state.knowledge >= 85 || constructionSkillPct >= 65) {
    return 3;
  }
  if (state.era !== 'primitive' || state.knowledge >= 30 || constructionSkillPct >= 35) {
    return 2;
  }
  return 1;
}

export function upgradeSpecialBuilding(
  state: SimulationState,
  typeOrId: SpecialBuildingType | number,
  constructionSkillPct = 20
): SpecialBuilding | null {
  const maxAllowed = getSpecialBuildingMaxLevelByTech(state, constructionSkillPct);
  const target =
    typeof typeOrId === 'number'
      ? state.specialBuildings.find((b) => b.id === typeOrId)
      : state.specialBuildings
          .filter((b) => b.type === typeOrId && b.level < 3)
          .sort((a, b) => a.level - b.level)[0];
  if (!target || target.level >= 3 || target.level >= maxAllowed) return null;
  target.level = Math.min(3, target.level + 1);
  target.durability = 100;
  target.unpaidMaintenanceDays = 0;
  target.maintenanceDebtCount = 0;
  target.maintenanceStatus = 'ok';
  target.lastMaintenanceDay = state.day;
  target.efficiencyMultiplier = 1;
  syncSpecialBuildingStaff(state);
  return target;
}

export function createSpecialBuilding(
  state: SimulationState,
  type: SpecialBuildingType,
  builderName: string,
  anchorX?: number,
  anchorY?: number,
  _constructionSkillPct = 20,
  allowMultiple = true
): SpecialBuilding | null {
  const spec = SPECIAL_BUILDING_COSTS[type];
  const sameType = state.specialBuildings.filter((b) => b.type === type);
  const maxCount = allowMultiple ? spec.maxCount : 1;
  if (sameType.length >= maxCount) {
    return null;
  }

  const candidate = findOperatorCandidateForBuilding(state, type);
  if (!candidate) {
    return null;
  }

  const meta = SPECIAL_BUILDING_LABELS[type];
  const spot = chooseQwenBuildSpot(state, type === 'dock' ? 'dock' : 'special', 'south', anchorX, anchorY);

  // Asignar oficio al operario encontrado
  const requiredJob = SPECIAL_BUILDING_STAFF_JOBS[type][0];
  if (!SPECIAL_BUILDING_STAFF_JOBS[type].includes(candidate.job)) {
    setAgentJob(state, candidate, requiredJob, `asignado a ${meta.label}`);
  }

  const sameCount = sameType.length + 1;
  const building: SpecialBuilding = {
    id: state.nextId++,
    type,
    name: sameCount > 1 ? `${meta.label} #${sameCount}` : meta.label,
    category: meta.category,
    x: spot.x,
    y: spot.y,
    level: 1,
    builderName,
    ownerId: candidate.id,
    forSale: false,
    price: meta.basePrice,
    durability: 100,
    unpaidMaintenanceDays: 0,
    maintenanceDebtCount: 0,
    maintenanceStatus: 'ok',
    lastMaintenanceDay: state.day,
    efficiencyMultiplier: 1,
    staffIds: [candidate.id],
    isOperational: true,
    allowedStorage: [...SPECIAL_BUILDING_ALLOWED_STORAGE[type]],
    storage: createEmptyHouseStorage(0),
  };
  candidate.assignedBuildingId = building.id;
  state.specialBuildings.push(building);
  syncSpecialBuildingStaff(state);
  return building;
}

export function createFarmPlot(
  state: SimulationState,
  zone: 'south' | 'north' = 'south',
  anchorX?: number,
  anchorY?: number,
  forcedSize?: FarmPlot['size']
): FarmPlot {
  const id = state.nextId++;
  const crops = ['Trigo', 'Maíz', 'Hortalizas'];
  const sizes: FarmPlot['size'][] = ['small', 'medium', 'large'];
  const spot = chooseQwenBuildSpot(state, 'farm', zone, anchorX, anchorY);
  const plot: FarmPlot = {
    id,
    x: spot.x,
    y: spot.y,
    size: forcedSize ?? sizes[(id + state.farms.length) % sizes.length],
    growth: 25,
    cropName: crops[id % crops.length],
    durability: 100,
    unpaidMaintenanceDays: 0,
    maintenanceDebtCount: 0,
    maintenanceStatus: 'ok',
    lastMaintenanceDay: state.day,
  };
  state.farms.push(plot);
  return plot;
}

export interface ConstructionStartResult {
  ok: boolean;
  reason?: string;
  construction?: ActiveConstruction;
}

export function validateAndComputeConstructionPlan(
  state: SimulationState,
  builder: Agent | null,
  kind: ActiveConstruction['kind'],
  options?: {
    houseSize?: House['size'];
    farmSize?: FarmPlot['size'];
    specialType?: SpecialBuildingType;
    targetId?: number;
    zone?: 'south' | 'north';
    anchorX?: number;
    anchorY?: number;
  }
): {
  ok: boolean;
  reason?: string;
  cost: ResourceCostMap;
  applyCarpentryDiscount: boolean;
  resolvedSize?: House['size'] | FarmPlot['size'];
  spot?: { x: number; y: number };
} {
  if (!builder || builder.isChild || builder.jailedDays > 0 || builder.job !== 'Constructor') {
    return {
      ok: false,
      reason: 'Se requiere un aldeano adulto con oficio Constructor disponible.',
      cost: {},
      applyCarpentryDiscount: false,
    };
  }
  if (builder.activeConstruction) {
    return {
      ok: false,
      reason: `${builder.name} ya tiene una obra en curso.`,
      cost: {},
      applyCarpentryDiscount: false,
    };
  }

  let cost: ResourceCostMap = {};
  let applyCarpentryDiscount = false;
  let resolvedSize: House['size'] | FarmPlot['size'] | undefined;
  let spot: { x: number; y: number } = { x: builder.x, y: builder.y };

  if (kind === 'house') {
    const size: House['size'] =
      options?.houseSize ??
      (builder.constructionKnowledge >= 65
        ? 'large'
        : builder.constructionKnowledge >= 35
          ? 'medium'
          : 'small');
    resolvedSize = size;
    const baseCost = getHouseBuildCost(size, false);
    applyCarpentryDiscount = canApplyCarpentryHousingDiscount(state, baseCost);
    cost = getHouseBuildCost(size, applyCarpentryDiscount);
    const zone = options?.zone === 'north' && isBridgePassable(state) ? 'north' : 'south';
    spot = chooseQwenBuildSpot(state, 'house', zone, options?.anchorX, options?.anchorY);
  } else if (kind === 'upgrade_house') {
    const maxAllowed: 1 | 2 | 3 | 4 =
      builder.constructionKnowledge >= 75
        ? 4
        : (Math.max(
            ERA_METADATA[state.era].maxHouseLevel,
            builder.constructionKnowledge >= 45 ? 3 : 2
          ) as 1 | 2 | 3 | 4);
    const target =
      options?.targetId !== undefined
        ? state.houses.find((h) => h.id === options.targetId && h.level < maxAllowed)
        : state.houses.filter((h) => h.level < maxAllowed).sort((a, b) => a.level - b.level)[0];
    if (!target) {
      return {
        ok: false,
        reason: 'No hay vivienda elegible para mejorar en la era/saber actual.',
        cost: {},
        applyCarpentryDiscount: false,
      };
    }
    const nextLv = (target.level + 1) as 2 | 3 | 4;
    const baseCost = getHouseUpgradeCost(target.size, nextLv, false);
    applyCarpentryDiscount = canApplyCarpentryHousingDiscount(state, baseCost);
    cost = getHouseUpgradeCost(target.size, nextLv, applyCarpentryDiscount);
    spot = { x: target.x, y: target.y };
  } else if (kind === 'plaza') {
    if (state.plaza) {
      return { ok: false, reason: 'La Plaza Central ya existe (única).', cost: {}, applyCarpentryDiscount: false };
    }
    cost = { ...PLAZA_COSTS.build };
    spot = chooseQwenBuildSpot(state, 'plaza', 'south', options?.anchorX, options?.anchorY);
  } else if (kind === 'bridge') {
    if (state.bridge) {
      return { ok: false, reason: 'El Puente Fluvial ya existe (único).', cost: {}, applyCarpentryDiscount: false };
    }
    cost = { ...BRIDGE_COSTS.build };
    spot = { x: options?.anchorX ?? BRIDGE_CENTER_X, y: RIVER_BOTTOM_Y + 26 };
  } else if (kind === 'farm') {
    const farmSize: FarmPlot['size'] = options?.farmSize ?? 'small';
    resolvedSize = farmSize;
    cost = getFarmCost(farmSize).build;
    const zone = options?.zone === 'north' && isBridgePassable(state) ? 'north' : 'south';
    spot = chooseQwenBuildSpot(state, 'farm', zone, options?.anchorX, options?.anchorY);
  } else if (kind === 'special') {
    const st = options?.specialType;
    if (!st) {
      return { ok: false, reason: 'Tipo de edificio especial no especificado.', cost: {}, applyCarpentryDiscount: false };
    }
    const spec = SPECIAL_BUILDING_COSTS[st];
    const existingCount = state.specialBuildings.filter((b) => b.type === st).length;
    if (existingCount >= spec.maxCount) {
      return {
        ok: false,
        reason: spec.unique
          ? `${SPECIAL_BUILDING_LABELS[st].label} es único y ya fue construido.`
          : `Límite máximo (${spec.maxCount}) alcanzado para ${SPECIAL_BUILDING_LABELS[st].label}.`,
        cost: {},
        applyCarpentryDiscount: false,
      };
    }
    if (!hasAvailableOperatorForBuilding(state, st)) {
      return {
        ok: false,
        reason: `No hay operario disponible para ${SPECIAL_BUILDING_LABELS[st].label}.`,
        cost: {},
        applyCarpentryDiscount: false,
      };
    }
    cost = getSpecialBuildingCost(st, 1);
    spot = chooseQwenBuildSpot(state, st === 'dock' ? 'dock' : 'special', 'south', options?.anchorX, options?.anchorY);
  } else if (kind === 'upgrade_special') {
    const st = options?.specialType;
    const maxTechLv = getSpecialBuildingMaxLevelByTech(state, builder.constructionKnowledge);
    const target =
      options?.targetId !== undefined
        ? state.specialBuildings.find((b) => b.id === options.targetId)
        : st
          ? state.specialBuildings
              .filter((b) => b.type === st && b.level < 3)
              .sort((a, b) => a.level - b.level)[0]
          : undefined;
    if (!target) {
      return { ok: false, reason: 'No hay edificio especial construible/mejorable.', cost: {}, applyCarpentryDiscount: false };
    }
    if (target.level >= 3 || target.level >= maxTechLv) {
      return {
        ok: false,
        reason: `${target.name} alcanzó el nivel máximo permitido por la tecnología actual (N${target.level}).`,
        cost: {},
        applyCarpentryDiscount: false,
      };
    }
    const nextLv = (target.level + 1) as 2 | 3;
    cost = getSpecialBuildingCost(target.type, nextLv);
    spot = { x: target.x, y: target.y };
  }

  return { ok: true, cost, applyCarpentryDiscount, resolvedSize, spot };
}

export function startConstructionProject(
  state: SimulationState,
  builder: Agent | null,
  kind: ActiveConstruction['kind'],
  options?: {
    houseSize?: House['size'];
    farmSize?: FarmPlot['size'];
    specialType?: SpecialBuildingType;
    targetId?: number;
    zone?: 'south' | 'north';
    anchorX?: number;
    anchorY?: number;
    duration?: number;
  }
): ConstructionStartResult {
  const plan = validateAndComputeConstructionPlan(state, builder, kind, options);
  if (!plan.ok || !builder) {
    return { ok: false, reason: plan.reason };
  }

  const depots = getOperationalDepots(state);
  for (const [rawKey, rawNeed] of Object.entries(plan.cost)) {
    const key = rawKey as keyof ResourceInventory;
    const need = rawNeed ?? 0;
    if (need <= 0) continue;
    const avail = builder.inv[key] + depots.reduce((acc, d) => acc + d.storage[key], 0);
    if (avail < need) {
      return {
        ok: false,
        reason: `Faltan materiales para iniciar (${formatResourceCost(plan.cost)}).`,
      };
    }
  }

  const targetName =
    kind === 'plaza'
      ? 'Plaza Central'
      : kind === 'bridge'
        ? 'Puente Fluvial'
        : kind === 'special' && options?.specialType
          ? SPECIAL_BUILDING_LABELS[options.specialType].label
          : kind === 'upgrade_special' && options?.specialType
            ? `Mejora ${SPECIAL_BUILDING_LABELS[options.specialType].label}`
            : kind === 'farm'
              ? 'Parcela de Cultivo'
              : kind === 'upgrade_house'
                ? 'Mejora de Vivienda'
                : 'Vivienda';

  const opType: ConstructionOperationType =
    kind === 'upgrade_house' || kind === 'upgrade_special' ? 'mejora' : 'construccion';
  const reservation = reserveConstructionMaterials(
    state,
    builder,
    plan.cost,
    true,
    targetName,
    opType
  );
  if (!reservation.ok) {
    return {
      ok: false,
      reason: `Faltan materiales para iniciar (${formatResourceCost(plan.cost)}).`,
    };
  }

  let carpentryWoodConsumed = 0;
  if (plan.applyCarpentryDiscount && consumeCarpentryHousingDiscount(state, builder.name, targetName)) {
    carpentryWoodConsumed = 1;
  }

  const rawDuration = options?.duration ?? 36;
  const speedMode = state.divineMultipliers?.constructionMode ?? 'normal';
  const totalDuration =
    speedMode === 'instant'
      ? 1
      : speedMode === 'accelerated'
        ? Math.max(4, Math.round(rawDuration * 0.35))
        : rawDuration;

  const ac: ActiveConstruction = {
    id: state.nextId++,
    kind,
    targetId: options?.targetId,
    specialType: options?.specialType,
    houseSize: (kind === 'house' ? (plan.resolvedSize as House['size']) : options?.houseSize),
    farmSize: (kind === 'farm' ? (plan.resolvedSize as FarmPlot['size']) : options?.farmSize),
    zone: options?.zone,
    x: plan.spot?.x ?? builder.x,
    y: plan.spot?.y ?? builder.y,
    totalDuration,
    elapsed: speedMode === 'instant' ? totalDuration : 0,
    reservedMaterials: { ...plan.cost },
    fromPersonal: reservation.fromPersonal,
    fromDepot: reservation.fromDepot,
    carpentryWoodConsumed,
  };
  builder.activeConstruction = ac;
  return { ok: true, construction: ac };
}

export function completeActiveConstruction(state: SimulationState, builder: Agent): boolean {
  const ac = builder.activeConstruction;
  if (!ac) return false;
  builder.activeConstruction = null;

  let completed = false;
  if (ac.kind === 'house') {
    const zone = ac.zone === 'north' && isBridgePassable(state) ? 'north' : 'south';
    const h = createHouseNearCenter(
      state,
      builder.name,
      zone,
      ac.houseSize ?? 'small',
      ac.x,
      ac.y,
      builder.constructionKnowledge
    );
    builder.constructionKnowledge = clamp(builder.constructionKnowledge + 5, 0, 100);
    advanceJobMastery(builder, 'Constructor', 4);
    state.knowledge += 6;
    addLog(
      state,
      `${builder.name} completó ${h.name} (${HOUSE_SIZE_LABELS[h.size]} · ${HOUSE_LEVEL_LABELS[h.level]}).`,
      'emerald'
    );
    completed = true;
  } else if (ac.kind === 'upgrade_house') {
    const h = upgradeLowestHouse(state, builder.constructionKnowledge, ac.targetId);
    if (h) {
      builder.constructionKnowledge = clamp(builder.constructionKnowledge + 4, 0, 100);
      advanceJobMastery(builder, 'Constructor', 4);
      state.knowledge += 5;
      addLog(state, `${builder.name} completó mejora de ${h.name} a ${HOUSE_LEVEL_LABELS[h.level]}.`, 'sky');
      completed = true;
    }
  } else if (ac.kind === 'plaza' && !state.plaza) {
    const p = createPlaza(state, builder.name, ac.x, ac.y);
    builder.constructionKnowledge = clamp(builder.constructionKnowledge + 8, 0, 100);
    advanceJobMastery(builder, 'Constructor', 6);
    state.knowledge += 14;
    addLog(state, `${builder.name} completó la Plaza Central en (${p.x}, ${p.y}).`, 'sky');
    completed = true;
  } else if (ac.kind === 'bridge' && !state.bridge) {
    const b = createBridge(state, builder.name, ac.x);
    builder.constructionKnowledge = clamp(builder.constructionKnowledge + 8, 0, 100);
    advanceJobMastery(builder, 'Constructor', 6);
    state.knowledge += 14;
    addLog(state, `${builder.name} completó el Puente Fluvial en X=${b.x}.`, 'sky');
    completed = true;
  } else if (ac.kind === 'farm') {
    const zone = ac.zone === 'north' && isBridgePassable(state) ? 'north' : 'south';
    const farm = createFarmPlot(state, zone, ac.x, ac.y, ac.farmSize ?? 'small');
    builder.constructionKnowledge = clamp(builder.constructionKnowledge + 3, 0, 100);
    advanceJobMastery(builder, 'Constructor', 3);
    state.knowledge += 3;
    addLog(state, `${builder.name} completó parcela de cultivo ${farm.cropName}.`, 'emerald');
    completed = true;
  } else if (ac.kind === 'special' && ac.specialType) {
    const sp = createSpecialBuilding(
      state,
      ac.specialType,
      builder.name,
      ac.x,
      ac.y,
      builder.constructionKnowledge
    );
    if (sp) {
      builder.constructionKnowledge = clamp(builder.constructionKnowledge + 7, 0, 100);
      advanceJobMastery(builder, 'Constructor', 5);
      state.knowledge += 14;
      addLog(state, `${builder.name} completó ${sp.name} (N${sp.level}).`, 'emerald');
      completed = true;
    }
  } else if (ac.kind === 'upgrade_special' && (ac.targetId !== undefined || ac.specialType)) {
    const sp = upgradeSpecialBuilding(
      state,
      ac.targetId ?? ac.specialType!,
      builder.constructionKnowledge
    );
    if (sp) {
      builder.constructionKnowledge = clamp(builder.constructionKnowledge + 6, 0, 100);
      advanceJobMastery(builder, 'Constructor', 5);
      state.knowledge += 10;
      addLog(state, `${builder.name} mejoró ${sp.name} a Nivel ${sp.level}.`, 'sky');
      completed = true;
    }
  }

  const prevEra = state.era;
  state.era = computeEra(state.knowledge, state.houses);
  if (completed) {
    relocateBlockedResourcesAndAnimals(state);
    trackNaturalProgress(state, 'constructions', 1);
    recordAgentMemory(state, builder, 'work', `Completé obra (${ac.kind})`, 'positive');
    archiveChronicleEvent(state, 'natural', `${builder.name} completó obra (${ac.kind}).`);
    emitSimEvent(state, 'construction', `${builder.name} completó ${ac.kind}`, builder.id, {
      kind: ac.kind,
    });
    if (state.era !== prevEra) {
      emitSimEvent(state, 'era_change', `Evolución a ${ERA_METADATA[state.era].label}`);
    }
    if (state.era !== prevEra || ac.kind === 'plaza' || ac.kind === 'bridge') {
      pushSoundCue(state, 'celebration');
    } else {
      pushSoundCue(state, 'build');
    }
  }
  return completed;
}

export function killCropPlotAt(state: SimulationState, x: number, y: number): FarmPlot | null {
  const idx = state.farms.findIndex((f) => Math.hypot(f.x - x, f.y - y) <= 38);
  if (idx === -1) return null;
  const [removed] = state.farms.splice(idx, 1);
  if (state.selectedEntity?.kind === 'farm' && state.selectedEntity.id === removed.id) {
    state.selectedEntity = null;
  }
  addLog(state, `Eliminaste el cultivo de ${removed.cropName}.`, 'rose');
  return removed;
}

export function killAllCrops(state: SimulationState): number {
  const count = state.farms.length;
  if (count === 0) return 0;
  state.farms = [];
  if (state.selectedEntity?.kind === 'farm') state.selectedEntity = null;
  addLog(state, `Se destruyeron todos los cultivos de la aldea (${count} parcelas).`, 'rose');
  return count;
}

export function deleteHouse(state: SimulationState, houseId: number): boolean {
  const house = state.houses.find((h) => h.id === houseId);
  if (!house) return false;
  state.houses = state.houses.filter((h) => h.id !== houseId);
  for (const agent of state.agents) {
    if (agent.houseId === houseId) agent.houseId = null;
  }
  recalculateEconomyReserve(state);
  if (state.selectedEntity?.kind === 'house' && state.selectedEntity.id === houseId) {
    state.selectedEntity = null;
  }
  addLog(state, `Demoliste ${house.name}. Sus ocupantes quedaron sin vivienda.`, 'rose');
  return true;
}

export function deleteSpecialBuilding(state: SimulationState, buildingId: number): boolean {
  const b = state.specialBuildings.find((item) => item.id === buildingId);
  if (!b) return false;
  state.specialBuildings = state.specialBuildings.filter((item) => item.id !== buildingId);
  for (const a of state.agents) {
    if (a.assignedBuildingId === buildingId) a.assignedBuildingId = null;
  }
  recalculateEconomyReserve(state);
  if (state.selectedEntity?.kind === 'special' && state.selectedEntity.id === buildingId) {
    state.selectedEntity = null;
  }
  addLog(state, `Eliminaste el edificio ${b.name}.`, 'rose');
  return true;
}

export function deleteFarmPlotById(state: SimulationState, farmId: number): boolean {
  const farm = state.farms.find((f) => f.id === farmId);
  if (!farm) return false;
  state.farms = state.farms.filter((f) => f.id !== farmId);
  if (state.selectedEntity?.kind === 'farm' && state.selectedEntity.id === farmId) {
    state.selectedEntity = null;
  }
  addLog(state, `Mataste el cultivo de ${farm.cropName}.`, 'rose');
  return true;
}

export function deleteAnimal(state: SimulationState, animalId: number): boolean {
  const animal = state.animals.find((a) => a.id === animalId);
  if (!animal) return false;
  state.animals = state.animals.filter((a) => a.id !== animalId);
  for (const agent of state.agents) {
    if (agent.mountedHorseId === animalId) agent.mountedHorseId = null;
  }
  if (state.selectedEntity?.kind === 'animal' && state.selectedEntity.id === animalId) {
    state.selectedEntity = null;
  }
  addLog(state, `Eliminaste a ${animal.name} (${ANIMAL_LABELS[animal.type]}).`, 'rose');
  return true;
}

export function defendAgainstWildAnimal(
  state: SimulationState,
  defender: Agent,
  animal: Animal
): { killed: boolean; damageDealt: number } {
  const weaponBonus = defender.toolsCount > 0 ? 18 : 0;
  const skillBonus = defender.education >= 30 ? 8 : 0;
  const guardianBonus = defender.job === 'Guardián' || defender.job === 'Comisario' ? 16 : 0;
  const dmg = 16 + weaponBonus + skillBonus + guardianBonus;
  animal.hp = Math.max(0, animal.hp - dmg);
  animal.cooldown = 55;

  if (animal.hp <= 0) {
    state.animals = state.animals.filter((a) => a.id !== animal.id);
    defender.inv.food += animal.foodYield;
    state.knowledge += 4;
    if (state.selectedEntity?.kind === 'animal' && state.selectedEntity.id === animal.id) {
      state.selectedEntity = null;
    }
    addLog(
      state,
      `${defender.name} se defendió y abatió a ${animal.name} (+${animal.foodYield} comida).`,
      'emerald'
    );
    return { killed: true, damageDealt: dmg };
  }

  animal.vx = Math.sign(animal.x - defender.x || 1) * 1.5;
  animal.vy = Math.sign(animal.y - defender.y || -1) * 1.2;
  addLog(state, `${defender.name} repelió el ataque de ${animal.name} (-${dmg} PV).`, 'amber');
  return { killed: false, damageDealt: dmg };
}

export function tameWildAnimal(state: SimulationState, animal: Animal, tamer: Agent): boolean {
  if (!animal.hostile || animal.tamed) return false;
  const hasSchool = isBuildingOperational(state, 'school');
  const minEdu = hasSchool ? 40 : 50;
  if (tamer.education < minEdu) return false;

  animal.tamed = true;
  animal.hostile = false;
  animal.ownerId = tamer.id;
  animal.hp = animal.maxHp;
  tamer.moodModifier = clamp(tamer.moodModifier + 12, -45, 45);
  tamer.thought = `Gracias a mi educación (${Math.round(tamer.education)}%) logré domesticar a ${animal.name}.`;
  tamer.lastQwenDecision = `Qwen 2.5 registró domesticación de ${animal.name} por ${tamer.name}.`;
  state.knowledge += 6;
  addLog(state, `¡${tamer.name} domesticó a ${animal.name} con su saber! Ahora protege la aldea.`, 'emerald');
  return true;
}

function snapToRoadGrid(x: number, y: number): { x: number; y: number } {
  return {
    x: clamp(Math.round(x / ROAD_GRID_SIZE) * ROAD_GRID_SIZE, 24, CANVAS_WIDTH - 24),
    y: clamp(Math.round(y / ROAD_GRID_SIZE) * ROAD_GRID_SIZE, 24, CANVAS_HEIGHT - 24),
  };
}

function findClearDoorGridPoint(
  state: SimulationState,
  rawX: number,
  rawY: number
): { x: number; y: number } {
  const bridgeX = isBridgePassable(state) ? state.bridge!.x : null;
  const base = snapToRoadGrid(rawX, rawY);
  const isClear = (px: number, py: number) =>
    !isPointInRiverWater(px, py, bridgeX) &&
    !isPointBlockedByStructures(state, px, py, 0, true);
  if (isClear(base.x, base.y)) return base;

  const offsets = [
    [0, ROAD_GRID_SIZE],
    [0, -ROAD_GRID_SIZE],
    [ROAD_GRID_SIZE, 0],
    [-ROAD_GRID_SIZE, 0],
    [ROAD_GRID_SIZE, ROAD_GRID_SIZE],
    [-ROAD_GRID_SIZE, ROAD_GRID_SIZE],
    [0, ROAD_GRID_SIZE * 2],
  ];
  for (const [ox, oy] of offsets) {
    const cand = snapToRoadGrid(base.x + ox, base.y + oy);
    if (isClear(cand.x, cand.y)) return cand;
  }
  return base;
}

export function getPlazaAccessPoint(
  state: SimulationState,
  targetX: number,
  targetY: number
): { x: number; y: number } {
  if (!state.plaza) return snapToRoadGrid(WORLD_CENTER_X, SOUTH_CENTER_Y);
  const px = state.plaza.x;
  const py = state.plaza.y;
  const candidates = [
    findClearDoorGridPoint(state, px, py - 56),
    findClearDoorGridPoint(state, px, py + 56),
    findClearDoorGridPoint(state, px - 74, py),
    findClearDoorGridPoint(state, px + 74, py),
  ];
  let best = candidates[0];
  let bestD = Infinity;
  for (const c of candidates) {
    const d = Math.hypot(c.x - targetX, c.y - targetY);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}

export function getStructureDoorPoint(
  state: SimulationState,
  kind: 'house' | 'special' | 'farm',
  entity: House | SpecialBuilding | FarmPlot
): { x: number; y: number } {
  if (kind === 'house') {
    const h = entity as House;
    const dy = h.size === 'large' ? 24 : h.size === 'medium' ? 20 : 18;
    return findClearDoorGridPoint(state, h.x, h.y + dy);
  }
  if (kind === 'farm') {
    const f = entity as FarmPlot;
    const dy = f.size === 'large' ? 28 : f.size === 'medium' ? 24 : 20;
    return findClearDoorGridPoint(state, f.x, f.y + dy);
  }
  const b = entity as SpecialBuilding;
  if (b.type === 'dock') {
    const dockDy = b.y < RIVER_TOP_Y ? -28 : 28;
    return findClearDoorGridPoint(state, b.x, b.y + dockDy);
  }
  return findClearDoorGridPoint(state, b.x, b.y + 26);
}

export function hasAdjacentRoadTile(roads: RoadTile[], x: number, y: number): boolean {
  const g = snapToRoadGrid(x, y);
  return roads.some(
    (r) => Math.abs(r.x - g.x) <= ROAD_GRID_SIZE && Math.abs(r.y - g.y) <= ROAD_GRID_SIZE
  );
}

export function routeOrthogonalRoadPath(
  state: SimulationState,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  allowCrossBridge = false
): Array<{ x: number; y: number }> {
  const start = snapToRoadGrid(startX, startY);
  const goal = snapToRoadGrid(endX, endY);
  if (start.x === goal.x && start.y === goal.y) return [start];

  const bridgeX = allowCrossBridge && isBridgePassable(state) ? state.bridge!.x : null;
  const roadSet = new Set<string>();
  for (const r of state.roads) {
    roadSet.add(`${r.x},${r.y}`);
  }

  const startKey = `${start.x},${start.y}`;
  const goalKey = `${goal.x},${goal.y}`;
  const cols = Math.floor((CANVAS_WIDTH - 24) / ROAD_GRID_SIZE);
  const rows = Math.floor((CANVAS_HEIGHT - 24) / ROAD_GRID_SIZE);

  const open: Array<{ x: number; y: number; g: number; f: number; dir: number }> = [
    {
      x: start.x,
      y: start.y,
      g: 0,
      f: (Math.abs(goal.x - start.x) + Math.abs(goal.y - start.y)) / ROAD_GRID_SIZE,
      dir: -1,
    },
  ];
  const bestG = new Map<string, number>([[startKey, 0]]);
  const parent = new Map<string, string>();
  const dirs = [
    [ROAD_GRID_SIZE, 0],
    [-ROAD_GRID_SIZE, 0],
    [0, ROAD_GRID_SIZE],
    [0, -ROAD_GRID_SIZE],
  ];

  let expanded = 0;
  const maxExpand = cols * rows + 200;
  let found = false;

  while (open.length > 0 && expanded < maxExpand) {
    expanded++;
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const cur = open.splice(bestIdx, 1)[0];
    const curKey = `${cur.x},${cur.y}`;
    if (curKey === goalKey) {
      found = true;
      break;
    }
    if (cur.g > (bestG.get(curKey) ?? Infinity) + 1e-6) continue;

    for (let d = 0; d < 4; d++) {
      const nx = cur.x + dirs[d][0];
      const ny = cur.y + dirs[d][1];
      if (nx < 24 || nx > CANVAS_WIDTH - 24 || ny < 24 || ny > CANVAS_HEIGHT - 24) continue;

      const nKey = `${nx},${ny}`;
      const isEndpoint = nKey === startKey || nKey === goalKey;
      if (!isEndpoint) {
        if (isPointInRiverWater(nx, ny, bridgeX)) continue;
        if (isPointBlockedByStructures(state, nx, ny, 0, true)) continue;
      } else if (isPointInRiverWater(nx, ny, bridgeX)) {
        continue;
      }

      const baseCost = roadSet.has(nKey) ? 0.22 : 1.0;
      const turnCost = cur.dir !== -1 && cur.dir !== d ? 0.08 : 0;
      const ng = cur.g + baseCost + turnCost;
      if (ng < (bestG.get(nKey) ?? Infinity) - 1e-6) {
        bestG.set(nKey, ng);
        parent.set(nKey, curKey);
        const h = ((Math.abs(goal.x - nx) + Math.abs(goal.y - ny)) / ROAD_GRID_SIZE) * 0.22;
        open.push({ x: nx, y: ny, g: ng, f: ng + h, dir: d });
      }
    }
  }

  if (found) {
    const path: Array<{ x: number; y: number }> = [];
    let k: string | undefined = goalKey;
    while (k) {
      const [px, py] = k.split(',').map(Number);
      path.push({ x: px, y: py });
      k = parent.get(k);
    }
    path.reverse();
    return path;
  }

  // Fallback ortogonal en L si un obstáculo encierra por completo el destino
  const fallback: Array<{ x: number; y: number }> = [];
  let cx = start.x;
  let cy = start.y;
  fallback.push({ x: cx, y: cy });
  while (cx !== goal.x) {
    cx += cx < goal.x ? ROAD_GRID_SIZE : -ROAD_GRID_SIZE;
    fallback.push({ x: cx, y: cy });
  }
  while (cy !== goal.y) {
    cy += cy < goal.y ? ROAD_GRID_SIZE : -ROAD_GRID_SIZE;
    fallback.push({ x: cx, y: cy });
  }
  return fallback;
}

export function addRoadTile(
  state: SimulationState,
  x: number,
  y: number,
  roadType: RoadType = state.selectedRoadType ?? 'dirt',
  withLamp: boolean = state.selectedRoadLamp ?? false,
  payer?: Agent | null
): RoadTile | null {
  const { x: gx, y: gy } = snapToRoadGrid(x, y);
  const bridgeX = isBridgePassable(state) ? state.bridge!.x : null;
  if (isPointInRiverWater(gx, gy, bridgeX)) return null;
  if (isPointBlockedByStructures(state, gx, gy, 0, true)) return null;
  const exists = state.roads.some((r) => r.x === gx && r.y === gy);
  if (exists) return null;

  const cost = getRoadTileCost(roadType, withLamp);
  const effectivePayer =
    payer !== undefined
      ? payer
      : state.agents.find((a) => !a.isChild && a.jailedDays <= 0 && a.job === 'Constructor') ?? null;

  const paid = consumeConstructionResources(
    state,
    effectivePayer,
    cost,
    true,
    `Camino ${roadType}${withLamp ? ' + Farol' : ''}`,
    'camino'
  );
  if (!paid) {
    return null;
  }

  const tile: RoadTile = {
    id: state.nextId++,
    x: gx,
    y: gy,
    roadType,
    hasLamp: withLamp,
    lit: withLamp,
    durability: 100,
  };
  state.roads.push(tile);

  // Desplazar recursos que quedaran sobre la nueva baldosa de camino
  for (const r of state.resources) {
    if (isPointOnRoad(state, r.x, r.y, 4)) {
      const clear = findNearestClearResourceSpot(state, r.type, r.x, r.y, 10, true);
      r.x = clear.x;
      r.y = clear.y;
    }
  }
  return tile;
}

function addRoadLine(
  state: SimulationState,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  roadType: RoadType,
  withLamp: boolean,
  payer: Agent | null
): number {
  let added = 0;
  const path = routeOrthogonalRoadPath(state, x1, y1, x2, y2, false);
  for (const pt of path) {
    const tile = addRoadTile(state, pt.x, pt.y, roadType, withLamp, payer);
    if (tile) added++;
  }
  return added;
}

function findNearestAnchorPoint(
  state: SimulationState,
  targetX: number,
  targetY: number,
  fallbackX: number,
  fallbackY: number,
  sameSideNorth: boolean
): { x: number; y: number } {
  let best = snapToRoadGrid(fallbackX, fallbackY);
  let bestDist = Math.hypot(best.x - targetX, best.y - targetY);
  for (const r of state.roads) {
    const isNorth = r.y < RIVER_TOP_Y;
    if (isNorth !== sameSideNorth) continue;
    const d = Math.hypot(r.x - targetX, r.y - targetY);
    if (d < bestDist) {
      bestDist = d;
      best = { x: r.x, y: r.y };
    }
  }
  return best;
}

export function findNextUsefulRoadSegment(
  state: SimulationState
): Array<{ x: number; y: number }> | null {
  const bridgePassable = isBridgePassable(state);
  const endpoints: Array<{ x: number; y: number; north: boolean; priority: number }> = [];

  if (state.bridge && bridgePassable) {
    const southBridge = snapToRoadGrid(state.bridge.x, RIVER_BOTTOM_Y + 18);
    const northBridge = snapToRoadGrid(state.bridge.x, RIVER_TOP_Y - 18);
    endpoints.push({ x: southBridge.x, y: southBridge.y, north: false, priority: 1 });
    endpoints.push({ x: northBridge.x, y: northBridge.y, north: true, priority: 1 });
  }

  for (const b of state.specialBuildings) {
    const door = getStructureDoorPoint(state, 'special', b);
    endpoints.push({ x: door.x, y: door.y, north: door.y < RIVER_TOP_Y, priority: 2 });
  }
  for (const h of state.houses) {
    const door = getStructureDoorPoint(state, 'house', h);
    endpoints.push({ x: door.x, y: door.y, north: h.zone === 'north', priority: 3 });
  }
  for (const f of state.farms) {
    const gate = getStructureDoorPoint(state, 'farm', f);
    endpoints.push({ x: gate.x, y: gate.y, north: f.y < RIVER_TOP_Y, priority: 4 });
  }

  if (endpoints.length === 0 && !state.plaza) return null;

  // Buscar un destino útil sin conexión vial adyacente en su puerta/acceso
  const sorted = [...endpoints].sort((a, b) => a.priority - b.priority);
  for (const ep of sorted) {
    if (ep.north && !bridgePassable) continue;
    const alreadyConnected = hasAdjacentRoadTile(state.roads, ep.x, ep.y);
    if (alreadyConnected) continue;

    const hub = ep.north
      ? state.bridge && bridgePassable
        ? snapToRoadGrid(state.bridge.x, RIVER_TOP_Y - 18)
        : snapToRoadGrid(WORLD_CENTER_X, NORTH_CENTER_Y)
      : state.plaza
        ? getPlazaAccessPoint(state, ep.x, ep.y)
        : snapToRoadGrid(WORLD_CENTER_X, SOUTH_CENTER_Y);

    const anchor = findNearestAnchorPoint(state, ep.x, ep.y, hub.x, hub.y, ep.north);
    if (Math.hypot(anchor.x - ep.x, anchor.y - ep.y) <= ROAD_GRID_SIZE) continue;
    const path = routeOrthogonalRoadPath(state, anchor.x, anchor.y, ep.x, ep.y, false);
    if (path.length >= 2) return path;
  }

  // Si existen estructuras y al menos 1 camino, conectar sendero hacia Bosque/Montaña útiles
  if (state.roads.length > 0 && state.houses.length + state.specialBuildings.length >= 3) {
    const forestTrail = snapToRoadGrid(FOREST_MAX_X + 12, SOUTH_CENTER_Y);
    if (!hasAdjacentRoadTile(state.roads, forestTrail.x, forestTrail.y)) {
      const anchor = findNearestAnchorPoint(
        state,
        forestTrail.x,
        forestTrail.y,
        state.plaza?.x ?? WORLD_CENTER_X,
        state.plaza?.y ?? SOUTH_CENTER_Y,
        false
      );
      if (Math.hypot(anchor.x - forestTrail.x, anchor.y - forestTrail.y) <= 280) {
        return routeOrthogonalRoadPath(state, anchor.x, anchor.y, forestTrail.x, forestTrail.y, false);
      }
    }
    const mountainTrail = snapToRoadGrid(MOUNTAIN_MIN_X - 12, SOUTH_CENTER_Y);
    if (!hasAdjacentRoadTile(state.roads, mountainTrail.x, mountainTrail.y)) {
      const anchor = findNearestAnchorPoint(
        state,
        mountainTrail.x,
        mountainTrail.y,
        state.plaza?.x ?? WORLD_CENTER_X,
        state.plaza?.y ?? SOUTH_CENTER_Y,
        false
      );
      if (Math.hypot(anchor.x - mountainTrail.x, anchor.y - mountainTrail.y) <= 280) {
        return routeOrthogonalRoadPath(state, anchor.x, anchor.y, mountainTrail.x, mountainTrail.y, false);
      }
    }
  }

  return null;
}

export function buildBaseRoads(
  state: SimulationState,
  roadType: RoadType = state.selectedRoadType ?? 'dirt',
  withLamp: boolean = state.selectedRoadLamp ?? false,
  payer?: Agent | null
): number {
  const effectivePayer =
    payer !== undefined
      ? payer
      : state.agents.find((a) => !a.isChild && a.jailedDays <= 0 && a.job === 'Constructor') ?? null;

  const structureCount =
    (state.plaza ? 1 : 0) +
    (state.bridge ? 1 : 0) +
    state.houses.length +
    state.specialBuildings.length +
    state.farms.length;
  if (structureCount < 2) {
    addLog(
      state,
      'No hay suficientes estructuras para trazar caminos útiles (se necesitan al menos dos destinos).',
      'amber'
    );
    return 0;
  }

  let added = 0;
  const bridgePassable = isBridgePassable(state);

  // 1. Conectar Plaza <-> Entrada sur del Puente y tramo norte del Puente
  if (state.bridge && bridgePassable) {
    const bridgeSouth = snapToRoadGrid(state.bridge.x, RIVER_BOTTOM_Y + 18);
    const plazaToBridge = state.plaza
      ? getPlazaAccessPoint(state, bridgeSouth.x, bridgeSouth.y)
      : snapToRoadGrid(WORLD_CENTER_X, SOUTH_CENTER_Y);
    added += addRoadLine(
      state,
      plazaToBridge.x,
      plazaToBridge.y,
      bridgeSouth.x,
      bridgeSouth.y,
      roadType,
      withLamp,
      effectivePayer
    );

    const bridgeNorth = snapToRoadGrid(state.bridge.x, RIVER_TOP_Y - 18);
    const northTargetsExist =
      state.houses.some((h) => h.zone === 'north') ||
      state.farms.some((f) => f.y < RIVER_TOP_Y) ||
      state.specialBuildings.some((b) => b.y < RIVER_TOP_Y);
    if (northTargetsExist) {
      addRoadTile(state, bridgeNorth.x, bridgeNorth.y, roadType, withLamp, effectivePayer);
    }
  }

  // 2. Conectar edificios especiales, viviendas y cultivos desde su puerta/acceso hacia la red o Plaza más cercana
  const southTargets: Array<{ x: number; y: number }> = [];
  const northTargets: Array<{ x: number; y: number }> = [];

  for (const b of state.specialBuildings) {
    const door = getStructureDoorPoint(state, 'special', b);
    if (door.y < RIVER_TOP_Y) northTargets.push(door);
    else southTargets.push(door);
  }
  for (const h of state.houses) {
    const door = getStructureDoorPoint(state, 'house', h);
    if (h.zone === 'north') northTargets.push(door);
    else southTargets.push(door);
  }
  for (const f of state.farms) {
    const gate = getStructureDoorPoint(state, 'farm', f);
    if (f.y < RIVER_TOP_Y) northTargets.push(gate);
    else southTargets.push(gate);
  }

  const southHubFallback = state.plaza
    ? { x: state.plaza.x, y: state.plaza.y }
    : { x: WORLD_CENTER_X, y: SOUTH_CENTER_Y };
  southTargets.sort(
    (a, b) =>
      Math.hypot(a.x - southHubFallback.x, a.y - southHubFallback.y) -
      Math.hypot(b.x - southHubFallback.x, b.y - southHubFallback.y)
  );

  for (const door of southTargets) {
    const hubPt = state.plaza
      ? getPlazaAccessPoint(state, door.x, door.y)
      : snapToRoadGrid(WORLD_CENTER_X, SOUTH_CENTER_Y);
    const anchor = findNearestAnchorPoint(state, door.x, door.y, hubPt.x, hubPt.y, false);
    added += addRoadLine(state, anchor.x, anchor.y, door.x, door.y, roadType, withLamp, effectivePayer);
  }

  if (state.bridge && bridgePassable && northTargets.length > 0) {
    const northBridge = snapToRoadGrid(state.bridge.x, RIVER_TOP_Y - 18);
    northTargets.sort(
      (a, b) =>
        Math.hypot(a.x - northBridge.x, a.y - northBridge.y) -
        Math.hypot(b.x - northBridge.x, b.y - northBridge.y)
    );
    for (const door of northTargets) {
      const anchor = findNearestAnchorPoint(
        state,
        door.x,
        door.y,
        northBridge.x,
        northBridge.y,
        true
      );
      added += addRoadLine(state, anchor.x, anchor.y, door.x, door.y, roadType, withLamp, effectivePayer);
    }
  }

  if (added > 0) {
    addLog(
      state,
      `Se trazaron ${added} tramos de camino conectados puerta a puerta (${roadType}${withLamp ? ' con farol' : ''}) pagando recursos reales.`,
      'sky'
    );
  } else {
    addLog(
      state,
      `No se pudieron trazar nuevos caminos: faltan materiales (${formatResourceCost(getRoadTileCost(roadType, withLamp))} por tramo) o las puertas ya están conectadas.`,
      'amber'
    );
  }
  return added;
}

export function isNearRoad(roads: RoadTile[], x: number, y: number): boolean {
  return roads.some((r) => Math.abs(r.x - x) <= 26 && Math.abs(r.y - y) <= 26);
}

export function createAnimal(
  state: SimulationState,
  type: AnimalType,
  x?: number,
  y?: number,
  variant?: FishVariant
): Animal {
  const id = state.nextId++;
  const isFish = type === 'fish';
  const isHostile = type === 'wildcat' || type === 'bear';

  const ax = x ?? (isHostile ? (Math.random() < 0.5 ? 120 : CANVAS_WIDTH - 120) : 140 + Math.random() * (CANVAS_WIDTH - 280));
  let ay = y;

  if (ay === undefined) {
    if (isFish) {
      ay = RIVER_TOP_Y + 12 + Math.random() * (RIVER_BOTTOM_Y - RIVER_TOP_Y - 24);
    } else if (isHostile) {
      ay =
        Math.random() < 0.45
          ? NORTH_LAND_MIN_Y + 40 + Math.random() * (NORTH_LAND_MAX_Y - NORTH_LAND_MIN_Y - 80)
          : SAFE_LAND_MIN_Y + 40 + Math.random() * (CANVAS_HEIGHT - SAFE_LAND_MIN_Y - 90);
    } else {
      ay =
        Math.random() < 0.25
          ? NORTH_LAND_MIN_Y + 40 + Math.random() * (NORTH_LAND_MAX_Y - NORTH_LAND_MIN_Y - 80)
          : SAFE_LAND_MIN_Y + 40 + Math.random() * (CANVAS_HEIGHT - SAFE_LAND_MIN_Y - 90);
    }
  }

  let finalX = ax;
  let finalY = ay;
  if (!isFish) {
    const clear = findNearestClearGroundSpot(state, ax, ay, 10, true);
    finalX = clear.x;
    finalY = clear.y;
  }

  const fishVariant = isFish ? variant ?? FISH_VARIANTS[id % FISH_VARIANTS.length] : undefined;
  const maxHp = type === 'bear' ? 120 : type === 'wildcat' ? 65 : type === 'horse' ? 80 : 50;

  const animal: Animal = {
    id,
    type,
    name: `${ANIMAL_LABELS[type].split(' ')[0]} #${id}`,
    x: Math.round(finalX),
    y: Math.round(finalY),
    vx: (Math.random() - 0.5) * 0.7 || 0.35,
    vy: isFish ? 0 : (Math.random() - 0.5) * 0.4,
    hostile: isHostile,
    tamed: false,
    ownerId: null,
    hp: maxHp,
    maxHp,
    foodYield: type === 'bear' ? 4 : type === 'cow' ? 4 : type === 'horse' ? 3 : type === 'sheep' ? 2 : type === 'chicken' ? 2 : 1,
    milkReady: type === 'cow' ? 80 : 0,
    woolReady: type === 'sheep' ? 80 : 0,
    fishVariant,
    riderId: null,
    cooldown: 0,
    walkFrame: Math.random() * 6,
  };
  state.animals.push(animal);
  return animal;
}

function normalizeDirectiveText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const JOB_MATCH_PATTERNS: Array<{ keywords: string[]; job: JobType }> = [
  { keywords: ['alcalde', 'ayuntamiento'], job: 'Alcalde' },
  { keywords: ['comisario', 'policia', 'carcel'], job: 'Comisario' },
  { keywords: ['almacenero', 'deposito'], job: 'Almacenero' },
  { keywords: ['panader'], job: 'Panadero' },
  { keywords: ['herrer', 'forj'], job: 'Herrero' },
  { keywords: ['carpinter'], job: 'Carpintero' },
  { keywords: ['banquer', 'banco'], job: 'Banquero' },
  { keywords: ['maestr'], job: 'Maestro' },
  { keywords: ['artesan'], job: 'Artesano' },
  { keywords: ['guardi'], job: 'Guardián' },
  { keywords: ['botic', 'farmac'], job: 'Boticario' },
  { keywords: ['pescador', 'pesca', 'muelle'], job: 'Pescador' },
  { keywords: ['comerc', 'mercad'], job: 'Comerciante' },
  { keywords: ['curander', 'medic', 'hospital', 'enfermer'], job: 'Curandero' },
  { keywords: ['constructor', 'construir'], job: 'Constructor' },
  { keywords: ['erudit', 'investig'], job: 'Erudito' },
  { keywords: ['agricultor', 'granj'], job: 'Agricultor' },
  { keywords: ['miner'], job: 'Minero' },
  { keywords: ['lenador'], job: 'Leñador' },
  { keywords: ['recolector'], job: 'Recolector' },
  { keywords: ['aprendiz'], job: 'Aprendiz' },
];

interface WorkerRoleQueryTarget {
  keywords: string[];
  label: string;
  jobs: JobType[];
  buildingType?: SpecialBuildingType;
  skillId?: string;
  skillLabel?: string;
}

const WORKER_ROLE_QUERY_TARGETS: WorkerRoleQueryTarget[] = [
  {
    keywords: ['panader'],
    label: 'Panadería',
    jobs: ['Panadero'],
    buildingType: 'bakery',
    skillId: 'comercio_justo',
    skillLabel: 'Comercio Justo (32%+ Saber)',
  },
  {
    keywords: ['herrer', 'forja'],
    label: 'Herrería / Forja',
    jobs: ['Herrero', 'Artesano'],
    buildingType: 'forge',
    skillId: 'forja_herramientas',
    skillLabel: 'Fabricación de Herramientas (36%+ Saber)',
  },
  {
    keywords: ['carpinter'],
    label: 'Carpintería',
    jobs: ['Carpintero'],
    buildingType: 'carpentry',
    skillId: 'carpinteria_pino',
    skillLabel: 'Corte y Venta en Pino (12%+ Saber)',
  },
  {
    keywords: ['botic', 'farmac'],
    label: 'Botica',
    jobs: ['Boticario'],
    buildingType: 'apothecary',
    skillId: 'alquimia_botica',
    skillLabel: 'Botánica y Remedios (52%+ Saber)',
  },
  {
    keywords: ['hospital', 'enfermer', 'curander', 'clinic'],
    label: 'Hospital',
    jobs: ['Curandero'],
    buildingType: 'infirmary',
    skillId: 'primeros_auxilios',
    skillLabel: 'Primeros Auxilios (16%+ Saber)',
  },
  {
    keywords: ['escuel', 'maestr', 'academia'],
    label: 'Escuela',
    jobs: ['Maestro', 'Erudito'],
    buildingType: 'school',
  },
  {
    keywords: ['banco', 'banquer'],
    label: 'Banco Central',
    jobs: ['Banquero'],
    buildingType: 'bank',
    skillId: 'banca_metalica',
    skillLabel: 'Banca y Respaldo Metálico (56%+ Saber)',
  },
  {
    keywords: ['mercad', 'comerc'],
    label: 'Mercado Central',
    jobs: ['Comerciante'],
    buildingType: 'market',
    skillId: 'comercio_justo',
    skillLabel: 'Comercio Justo (32%+ Saber)',
  },
  {
    keywords: ['muelle', 'pescador', 'pesca'],
    label: 'Muelle Fluvial',
    jobs: ['Pescador'],
    buildingType: 'dock',
    skillId: 'pesca_fluvial',
    skillLabel: 'Pesca Fluvial (20%+ Saber)',
  },
  {
    keywords: ['deposito', 'almacen'],
    label: 'Depósito General',
    jobs: ['Almacenero'],
    buildingType: 'general_depot',
  },
  {
    keywords: ['ayuntamiento', 'alcalde'],
    label: 'Ayuntamiento',
    jobs: ['Alcalde'],
    buildingType: 'town_hall',
    skillId: 'legislacion_civica',
    skillLabel: 'Legislación y Orden Público (92%+ Saber)',
  },
  {
    keywords: ['comisaria', 'policia', 'comisario', 'guardia'],
    label: 'Comisaría',
    jobs: ['Comisario', 'Guardián'],
    buildingType: 'police_station',
    skillId: 'legislacion_civica',
    skillLabel: 'Legislación y Orden Público (92%+ Saber)',
  },
  {
    keywords: ['carcel', 'prision'],
    label: 'Cárcel',
    jobs: ['Comisario', 'Guardián'],
    buildingType: 'prison',
  },
  { keywords: ['constructor'], label: 'Constructor', jobs: ['Constructor'], skillId: 'albanileria', skillLabel: 'Albañilería Básica (28%+ Saber)' },
  { keywords: ['miner'], label: 'Minero', jobs: ['Minero'], skillId: 'mineria_cobre', skillLabel: 'Minería de Cobre (8%+ Saber)' },
  { keywords: ['lenador'], label: 'Leñador', jobs: ['Leñador'], skillId: 'recoleccion', skillLabel: 'Recolección Eficaz (4%+ Saber)' },
  { keywords: ['agricultor', 'granj', 'cultiv'], label: 'Agricultor', jobs: ['Agricultor'], skillId: 'siembra_avanzada', skillLabel: 'Siembra Avanzada (44%+ Saber)' },
  { keywords: ['erudit'], label: 'Erudito', jobs: ['Erudito'] },
  { keywords: ['artesan'], label: 'Artesano', jobs: ['Artesano'], skillId: 'forja_herramientas', skillLabel: 'Fabricación de Herramientas (36%+ Saber)' },
  { keywords: ['recolector'], label: 'Recolector', jobs: ['Recolector'] },
];

export function computePossibleWorkersReport(
  state: SimulationState,
  target: WorkerRoleQueryTarget
): {
  totalEligible: number;
  freeOperators: number;
  alreadyInJob: number;
  withSkill: number;
  builtCount: number;
  maxCount: number | null;
  eligibleNames: string[];
  freeNames: string[];
  currentNames: string[];
  summaryText: string;
} {
  const eligible = state.agents.filter((a) => !a.isChild && a.ageYears >= 15 && a.jailedDays <= 0);
  const free = eligible.filter((a) => a.assignedBuildingId === null);
  const current = eligible.filter((a) => target.jobs.includes(a.job));
  const skilled = target.skillId
    ? eligible.filter((a) => a.skills.includes(target.skillId!))
    : eligible;
  const builtCount = target.buildingType
    ? state.specialBuildings.filter((b) => b.type === target.buildingType).length
    : 0;
  const maxCount = target.buildingType ? SPECIAL_BUILDING_COSTS[target.buildingType].maxCount : null;

  const namesList = (arr: Agent[]) => (arr.length > 0 ? arr.map((a) => a.name).join(', ') : 'ninguno');
  const parts: string[] = [
    `Posibles trabajadores para ${target.label} (${target.jobs.join('/')}):`,
    `Total de posibles trabajadores adultos (≥15 años, libres): ${eligible.length} [${namesList(eligible)}].`,
    `Disponibles inmediatos sin otro edificio asignado: ${free.length} [${namesList(free)}].`,
    `Ya ejercen ese oficio: ${current.length} [${namesList(current)}].`,
  ];
  if (target.skillId && target.skillLabel) {
    parts.push(`Con skill ${target.skillLabel}: ${skilled.length}.`);
  }
  if (target.buildingType && maxCount !== null) {
    parts.push(`Edificios construidos: ${builtCount}/${maxCount}.`);
  }

  return {
    totalEligible: eligible.length,
    freeOperators: free.length,
    alreadyInJob: current.length,
    withSkill: skilled.length,
    builtCount,
    maxCount,
    eligibleNames: eligible.map((a) => a.name),
    freeNames: free.map((a) => a.name),
    currentNames: current.map((a) => a.name),
    summaryText: parts.join(' '),
  };
}

export function buildQwenVillageTelemetry(state: SimulationState): Record<string, unknown> {
  const jobCounts = getAllJobsMap();
  for (const a of state.agents) jobCounts[a.job]++;
  const activeJobs = Object.fromEntries(Object.entries(jobCounts).filter(([, v]) => v > 0));
  const eligibleAdults = state.agents.filter((a) => !a.isChild && a.ageYears >= 15 && a.jailedDays <= 0);
  const freeOperators = eligibleAdults.filter((a) => a.assignedBuildingId === null);

  const possibleWorkersByBuilding: Record<string, { totalAptos: number; libresSinEdificio: number; actuales: number; construidos: string }> = {};
  for (const t of WORKER_ROLE_QUERY_TARGETS) {
    if (!t.buildingType) continue;
    const rep = computePossibleWorkersReport(state, t);
    possibleWorkersByBuilding[t.label] = {
      totalAptos: rep.totalEligible,
      libresSinEdificio: rep.freeOperators,
      actuales: rep.alreadyInJob,
      construidos: `${rep.builtCount}/${rep.maxCount}`,
    };
  }

  const depot = state.specialBuildings.find((b) => b.type === 'general_depot');
  const sumAgents = (key: keyof ResourceInventory) =>
    state.agents.reduce((acc, a) => acc + (a.inv[key] ?? 0), 0);
  const totalResources = {
    comida: sumAgents('food') + state.houses.reduce((acc, h) => acc + h.storage.food, 0) + (depot?.storage.food ?? 0),
    madera: sumAgents('wood') + (depot?.storage.wood ?? 0),
    pino: sumAgents('pineWood') + (depot?.storage.pineWood ?? 0),
    arce: sumAgents('mapleWood') + (depot?.storage.mapleWood ?? 0),
    roble: sumAgents('oakWood') + (depot?.storage.oakWood ?? 0),
    piedra: sumAgents('stone') + (depot?.storage.stone ?? 0),
    cobre: sumAgents('copper') + (depot?.storage.copper ?? 0),
    hierro: sumAgents('iron') + (depot?.storage.iron ?? 0),
    plata: sumAgents('silver') + (depot?.storage.silver ?? 0) + state.economyReserve.silverReserve,
    oro: sumAgents('gold') + (depot?.storage.gold ?? 0) + state.economyReserve.goldReserve,
    monedasTotales: getTotalCirculatingCoins(state),
    pecesRio: `${state.riverFishStock}/${state.riverFishMaxStock}`,
  };

  const rep =
    state.representativeAgentId !== null
      ? state.agents.find((a) => a.id === state.representativeAgentId) ?? null
      : null;

  return {
    dia: state.day,
    estacion: state.season,
    clima: state.weather,
    bioma: state.biome,
    era: ERA_METADATA[state.era].label,
    representanteActual: rep
      ? {
          nombre: rep.name,
          oficio: rep.job,
          saber: Math.round(rep.education),
          objetivoQwen: state.representativeGoal ?? rep.qwenPlan,
          controladoPor: 'Qwen 2.5:3b',
        }
      : null,
    poblacionTotal: state.agents.length,
    adultosAptosTrabajo: eligibleAdults.length,
    adultosLibresSinEdificio: freeOperators.length,
    ninos: state.agents.filter((a) => a.isChild).length,
    enfermos: state.agents.filter((a) => a.isSick).length,
    sinCasa: state.agents.filter((a) => a.houseId === null).length,
    encarcelados: state.agents.filter((a) => a.jailedDays > 0).length,
    oficiosActuales: activeJobs,
    posiblesTrabajadoresPorEdificio: possibleWorkersByBuilding,
    recursosTotales: totalResources,
    casas: state.houses.length,
    plazaConstruida: Boolean(state.plaza),
    puenteConstruido: Boolean(state.bridge),
    edificiosEspeciales: state.specialBuildings.map((b) => `${b.name}(N${b.level},${b.isOperational ? 'op' : 'inop'})`),
    cultivos: state.farms.length,
    animales: state.animals.length,
    leyesActivas: state.laws.filter((l) => l.active).map((l) => l.name),
    reservaEconomica: state.economyReserve,
    conocimiento: Math.round(state.knowledge),
    sociedad: state.societyIndicators ?? null,
    descubrimientos: (state.discoveries ?? []).map((d) => `${d.name}(${d.diffusionPct}%)`),
    tradiciones: (state.culture?.traditions ?? []).filter((t) => t.status === 'active').map((t) => t.name),
    crisisActivas: (state.crisisMonitor?.activeCrises ?? []).map((c) => `${c.title}(sev:${c.severity})`),
    diplomacia: (state.externalCommunities ?? []).map((c) => `${c.name}:${c.relation}(conf:${c.trust})`),
    aldeanos: state.agents.map((a) => `${a.name}(${a.job},${a.ageYears}a,saber:${Math.round(a.education)}%)`),
  };
}

export function queryVillageData(
  state: SimulationState,
  promptText: string
): { matched: boolean; reply: string; details: string[] } {
  const q = normalizeDirectiveText(promptText);
  const isMutationVerb =
    /\b(cambia|cambiar|cambie|cambien|reasign|construy|construi|construir|crea|crear|mejora|mejorar|sube|subir|baja|bajar|agrega|agregar|agregale|dales|otorga|regala|elimina|borra|mata|matar|cura|curar|enferma|deroga|quita|activa|desactiva|prohibe|prohibir|impone|imponer|libera|liberar|repara|reparar|despacha|siembra|planta|enciende|apaga|pausa|reanuda)\b/.test(
      q
    );
  const isQuestionOrDataRequest =
    /\b(cuanto|cuanta|cuantos|cuantas|cual|cuales|quien|quienes|posibles?|cantidad|total|dime|decime|cuentame|muestrame|lista|resumen|informe|reporte|estadisticas|estado de|datos|disponibles?|candidatos?|aptos?|capacidad|tienen|hay)\b/.test(
      q
    ) || q.includes('?');

  // Evitar confundir "dame la cantidad/datos/resumen" con una orden de regalar ítems
  const pureDataRequest = isQuestionOrDataRequest && (!isMutationVerb || /\bdame\s+(?:la|el|los|las|un|una)\s+(?:cantidad|total|datos?|lista|resumen|informe|reporte|estado|info)/.test(q));
  if (!pureDataRequest) {
    return { matched: false, reply: '', details: [] };
  }

  // 1. Consulta específica de posibles trabajadores / operarios para edificio u oficio
  if (
    q.includes('trabajador') ||
    q.includes('operario') ||
    q.includes('empleado') ||
    q.includes('pueden trabajar') ||
    q.includes('pueden ser') ||
    q.includes('posibles') ||
    q.includes('candidato') ||
    q.includes('apto')
  ) {
    const target = WORKER_ROLE_QUERY_TARGETS.find((t) => t.keywords.some((kw) => q.includes(kw)));
    if (target) {
      const rep = computePossibleWorkersReport(state, target);
      return {
        matched: true,
        reply: rep.summaryText,
        details: [
          `Consulta: ${target.label}`,
          `Total aptos: ${rep.totalEligible} · Libres: ${rep.freeOperators} · Actuales: ${rep.alreadyInJob}`,
        ],
      };
    }
    const eligible = state.agents.filter((a) => !a.isChild && a.ageYears >= 15 && a.jailedDays <= 0);
    const free = eligible.filter((a) => a.assignedBuildingId === null);
    return {
      matched: true,
      reply: `Datos de Aldea IA: hay ${eligible.length} trabajadores adultos aptos (≥15 años, no encarcelados) de ${state.agents.length} habitantes totales; ${free.length} están libres sin edificio especial asignado.`,
      details: [`Aptos: ${eligible.length}/${state.agents.length} · Libres: ${free.length}`],
    };
  }

  // 2. Consulta sobre un aldeano específico por nombre
  const namedAgent = state.agents.find((a) => {
    const first = normalizeDirectiveText(a.name.split(' ')[0]);
    return first.length >= 3 && q.includes(first);
  });
  if (namedAgent) {
    const reply = `${namedAgent.name}: ${namedAgent.ageYears} años, oficio ${namedAgent.job}, salud ${Math.round(
      namedAgent.health
    )}%, ánimo ${Math.round(namedAgent.happiness)}%, saber general ${Math.round(
      namedAgent.education
    )}% (${namedAgent.skills.length}/25 skills), monedas ${namedAgent.coins}, inventario [comida:${namedAgent.inv.food}, madera:${
      namedAgent.inv.wood + namedAgent.inv.pineWood + namedAgent.inv.mapleWood + namedAgent.inv.oakWood
    }, piedra:${namedAgent.inv.stone}, minerales:${
      namedAgent.inv.copper + namedAgent.inv.iron + namedAgent.inv.silver + namedAgent.inv.gold
    }], actividad: ${namedAgent.activity}.`;
    return { matched: true, reply, details: [`Datos de ${namedAgent.name}`] };
  }

  // 3. Consulta de oficios / población
  if (q.includes('oficio') || q.includes('trabajo') || q.includes('poblador') || q.includes('aldeano') || q.includes('habitant') || q.includes('poblacion')) {
    const counts = getAllJobsMap();
    for (const a of state.agents) counts[a.job]++;
    const breakdown = Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(([j, n]) => `${j}: ${n}`)
      .join(', ');
    const adults = state.agents.filter((a) => !a.isChild && a.ageYears >= 15).length;
    const kids = state.agents.filter((a) => a.isChild).length;
    const sick = state.agents.filter((a) => a.isSick).length;
    const homeless = state.agents.filter((a) => a.houseId === null).length;
    return {
      matched: true,
      reply: `Datos de población (${state.agents.length} habitantes · ${adults} adultos ≥15a · ${kids} niños · ${sick} enfermos · ${homeless} sin casa). Distribución de oficios: ${breakdown}.`,
      details: [`Población: ${state.agents.length}`, `Oficios activos: ${breakdown}`],
    };
  }

  // 4. Consulta de recursos / riqueza / economía
  if (
    q.includes('recurso') ||
    q.includes('oro') ||
    q.includes('plata') ||
    q.includes('moneda') ||
    q.includes('madera') ||
    q.includes('piedra') ||
    q.includes('comida') ||
    q.includes('alimento') ||
    q.includes('riquez') ||
    q.includes('riques') ||
    q.includes('peces') ||
    q.includes('economia')
  ) {
    const tel = buildQwenVillageTelemetry(state);
    const res = tel.recursosTotales as Record<string, string | number>;
    return {
      matched: true,
      reply: `Recursos y economía de Aldea IA: Comida ${res.comida}, Madera común ${res.madera} (Pino ${res.pino}, Arce ${res.arce}, Roble ${res.roble}), Piedra ${res.piedra}, Cobre ${res.cobre}, Hierro ${res.hierro}, Plata ${res.plata}, Oro ${res.oro}, Monedas totales ${res.monedasTotales} (tope respaldo ${state.economyReserve.backedCoinsCapacity}), Peces en río ${res.pecesRio}.`,
      details: ['Consulta de recursos y reservas'],
    };
  }

  // 5. Consulta general / edificios / resumen
  const buildingsText =
    state.specialBuildings.length > 0
      ? state.specialBuildings.map((b) => `${b.name} N${b.level} (${b.isOperational ? 'operativo' : 'inoperativo'})`).join(', ')
      : 'ninguno todavía';
  return {
    matched: true,
    reply: `Estado de Aldea IA (Día ${state.day}, ${state.season}, ${ERA_METADATA[state.era].label}): ${state.agents.length} habitantes, ${state.houses.length} viviendas, Plaza: ${
      state.plaza ? 'Sí' : 'No'
    }, Puente: ${state.bridge ? (isBridgePassable(state) ? 'Operativo' : 'Bloqueado') : 'No'}, Edificios: ${buildingsText}, Saber global: ${Math.round(
      state.knowledge
    )}, Monedas: ${getTotalCirculatingCoins(state)}/${state.economyReserve.backedCoinsCapacity}.`,
    details: ['Resumen completo de Aldea IA'],
  };
}

export function interpretQwenDirective(
  promptText: string,
  agentNames: string[] = [],
  state?: SimulationState
): {
  reply: string;
  actions: QwenAction[];
} {
  if (state) {
    const queryResult = queryVillageData(state, promptText);
    if (queryResult.matched) {
      return {
        reply: queryResult.reply,
        actions: [{ type: 'REPORT_DATA', answer: queryResult.reply }],
      };
    }
  }

  const qRaw = promptText.toLowerCase();
  const q = normalizeDirectiveText(promptText);
  const actions: QwenAction[] = [];
  const summaryParts: string[] = [];

  const numMatch = q.match(/\b([1-9]\d?)\b/);
  const requestedCount = numMatch ? Number(numMatch[1]) : 1;

  const matchedName = agentNames.find((fullName) => {
    const first = fullName.split(' ')[0].toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedFull = fullName.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const fullRe = new RegExp(`(?:^|[^a-záéíóúüñ])${escapedFull}(?:$|[^a-záéíóúüñ])`, 'i');
    const firstRe = new RegExp(`(?:^|[^a-záéíóúüñ])${first}(?:$|[^a-záéíóúüñ])`, 'i');
    return first.length >= 3 && (fullRe.test(qRaw) || firstRe.test(qRaw));
  });

  const detectJobInText = (textNorm: string): JobType | undefined => {
    for (const entry of JOB_MATCH_PATTERNS) {
      if (entry.keywords.some((kw) => textNorm.includes(kw))) {
        return entry.job;
      }
    }
    return undefined;
  };

  // Detección explícita de cambio de trabajo masivo / fraccional / numérico (ej. "cambia el trabajo de la mitad de los pobladores")
  const isMassJobChange =
    !matchedName &&
    (/\b(cambia[a-z]*|reasign[a-z]*|pon(?:ga|gan|er)?|asign[a-z]*|conviert[a-z]*|convert[a-z]*|pas[ae][a-z]*|dej[ae][a-z]*|rot[ae][a-z]*|haz|hagan)\b/.test(
      q
    ) &&
      /\b(trabajos?|oficios?|ocupacion(?:es)?|puestos?|profesion(?:es)?|rol(?:es)?|poblador(?:es)?|aldean[oa]?s?|habitantes?|trabajador(?:es)?|personas?|todos|todas|mitad|tercio|cuarto)\b/.test(
        q
      ));

  if (matchedName && !isMassJobChange) {
    const job = detectJobInText(q);
    let action: NonNullable<Extract<QwenAction, { type: 'DIRECT_VILLAGER' }>['action']> | undefined;
    if (q.includes('pareja') || q.includes('divor') || q.includes('separar')) action = 'switch_partner';
    else if (q.includes('guardar') || q.includes('baul') || q.includes('casa')) action = 'store_home';
    else if (q.includes('pesc')) action = 'fish';
    else if (q.includes('curar') || q.includes('sanar')) action = 'heal';
    else if (q.includes('constru')) action = 'build';
    else if (q.includes('comerc') || q.includes('vend')) action = 'trade';
    else if (q.includes('investig') || q.includes('estudi')) action = 'research';

    actions.push({ type: 'DIRECT_VILLAGER', agentName: matchedName, job, action });
    summaryParts.push(`directiva individual de Qwen 2.5 para ${matchedName}`);
  }

  if (isMassJobChange) {
    let fraction: number | undefined;
    let count: number | undefined;
    const pctMatch = q.match(/(\d{1,3})\s*%/);
    if (pctMatch) {
      fraction = clamp(Number(pctMatch[1]) / 100, 0.05, 1);
    } else if (q.includes('mitad') || q.includes('medio') || q.includes('media')) {
      fraction = 0.5;
    } else if (q.includes('tercio')) {
      fraction = 0.34;
    } else if (q.includes('cuarto')) {
      fraction = 0.25;
    } else if (/\b(todos|todas|toda la aldea|todos los|entera)\b/.test(q)) {
      fraction = 1;
    } else {
      const explicitCountMatch = q.match(
        /\b(\d{1,3})\s*(?:de\s+(?:los|las)\s+)?(?:aldean|poblador|habitant|persona|trabajador)/
      );
      if (explicitCountMatch) {
        count = Math.max(1, Number(explicitCountMatch[1]));
      }
    }

    let fromJob: JobType | undefined;
    let preferredJob: JobType | undefined;
    const fromToMatch = q.match(/\b(?:de|los)\s+([a-z\s]+?)\s+(?:a|como|en)\s+([a-z\s]+)$/);
    if (fromToMatch) {
      const leftJob = detectJobInText(fromToMatch[1]);
      const rightJob = detectJobInText(fromToMatch[2]);
      if (leftJob && rightJob && leftJob !== rightJob) {
        fromJob = leftJob;
        preferredJob = rightJob;
      }
    }
    if (!preferredJob) {
      const targetMatch = q.match(/\b(?:a|como|en|para)\s+([a-z\s]{3,})$/);
      if (targetMatch) preferredJob = detectJobInText(targetMatch[1]);
    }
    if (!preferredJob && !q.includes('trabajo') && !q.includes('oficio')) {
      preferredJob = detectJobInText(q);
    }

    actions.push({
      type: 'ASSIGN_ACTIVE_JOBS',
      preferredJob,
      count,
      fraction,
      fromJob,
      forceChange: true,
    });
    actions.push({ type: 'SET_POLICIES', patch: { workFocus: true } });
    summaryParts.push(
      preferredJob
        ? `cambio de oficio a ${preferredJob}`
        : fraction === 0.5
          ? 'cambio de oficio para la mitad de los pobladores'
          : 'reasignación real de oficios'
    );
  }

  // Control climático / estación / bioma
  if (/\b(clima|lluvia|llover|tormenta electrica|sequia|soleado|estacion|invierno|verano|otono|primavera|bioma)\b/.test(q)) {
    let weather: WeatherType | undefined;
    let biome: BiomeType | undefined;
    let season: SeasonType | undefined;
    if (q.includes('tormenta electrica') || q.includes('rayo')) weather = 'thunderstorm';
    else if (q.includes('tormenta')) weather = 'storm';
    else if (q.includes('lluvia') || q.includes('llover')) weather = 'rain';
    else if (q.includes('sequia')) weather = 'drought';
    else if (q.includes('soleado') || q.includes('sol')) weather = 'sunny';

    if (q.includes('invierno') || q.includes('tundra') || q.includes('nieve')) {
      season = 'Invierno';
      biome = 'tundra';
    } else if (q.includes('verano') || q.includes('arido') || q.includes('desierto')) {
      season = 'Verano';
      biome = 'arid';
    } else if (q.includes('otono')) {
      season = 'Otoño';
      biome = 'forest';
    } else if (q.includes('primavera') || q.includes('pradera')) {
      season = 'Primavera';
      biome = 'grassland';
    }
    if (weather || biome || season) {
      actions.push({ type: 'SET_WEATHER_BIOME', weather, biome, season });
      summaryParts.push('control de clima/estación');
    }
  }

  // Otorgar oro, riqueza, monedas o materiales directamente cuando el jugador lo ordena
  if (
    !isMassJobChange &&
    /\b(agrega|agregar|agregale|dales|da|otorga|regala|anade|anadir|suma|sumar|mas)\b/.test(q) &&
    /\b(riquez|riques|oro|plata|monedas?|madera|piedra|comida|alimento|hierro|cobre|herramientas?|medicinas?)\b/.test(q) &&
    !q.includes('prohibir')
  ) {
    const qtyMatch = q.match(/\b(\d{1,3})\b/);
    const amt = qtyMatch ? clamp(Number(qtyMatch[1]), 1, 200) : 10;
    if (q.includes('riquez') || q.includes('riques') || q.includes('oro')) {
      actions.push({ type: 'GRANT_VILLAGER_ITEMS', resource: 'gold', amount: qtyMatch ? amt : 2, targetName: matchedName });
      actions.push({ type: 'GRANT_VILLAGER_ITEMS', resource: 'coins', amount: qtyMatch ? amt : 10, targetName: matchedName });
      summaryParts.push('entrega de riqueza, oro y monedas');
    } else if (q.includes('plata')) {
      actions.push({ type: 'GRANT_VILLAGER_ITEMS', resource: 'silver', amount: qtyMatch ? amt : 2, targetName: matchedName });
      summaryParts.push('entrega de Plata');
    } else if (q.includes('moneda')) {
      actions.push({ type: 'GRANT_VILLAGER_ITEMS', resource: 'coins', amount: amt, targetName: matchedName });
      summaryParts.push(`+${amt} monedas`);
    } else if (q.includes('comida') || q.includes('alimento')) {
      actions.push({ type: 'GRANT_VILLAGER_ITEMS', resource: 'food', amount: qtyMatch ? amt : 5, targetName: matchedName });
      summaryParts.push('entrega de alimentos');
    } else if (q.includes('madera')) {
      actions.push({ type: 'GRANT_VILLAGER_ITEMS', resource: 'wood', amount: qtyMatch ? amt : 8, targetName: matchedName });
      summaryParts.push('entrega de madera');
    } else if (q.includes('piedra')) {
      actions.push({ type: 'GRANT_VILLAGER_ITEMS', resource: 'stone', amount: qtyMatch ? amt : 8, targetName: matchedName });
      summaryParts.push('entrega de piedra');
    } else if (q.includes('hierro')) {
      actions.push({ type: 'GRANT_VILLAGER_ITEMS', resource: 'iron', amount: qtyMatch ? amt : 4, targetName: matchedName });
      summaryParts.push('entrega de hierro');
    } else if (q.includes('cobre')) {
      actions.push({ type: 'GRANT_VILLAGER_ITEMS', resource: 'copper', amount: qtyMatch ? amt : 4, targetName: matchedName });
      summaryParts.push('entrega de cobre');
    } else if (q.includes('medicin')) {
      actions.push({ type: 'GRANT_VILLAGER_ITEMS', resource: 'medicine', amount: qtyMatch ? amt : 2, targetName: matchedName });
      summaryParts.push('entrega de medicinas');
    } else if (q.includes('herramienta')) {
      actions.push({ type: 'GRANT_VILLAGER_ITEMS', resource: 'tools', amount: qtyMatch ? amt : 1, targetName: matchedName });
      summaryParts.push('entrega de herramientas');
    }
  }

  // Liberar presos
  if (q.includes('libera') && (q.includes('preso') || q.includes('carcel') || q.includes('detenid') || matchedName)) {
    actions.push({ type: 'RELEASE_PRISONERS', targetName: matchedName });
    summaryParts.push('liberación de detenidos');
  }

  // Ajuste directo de energía / salud / saber
  if (/\b(sube|subir|aumenta|baja|bajar|reduce|quita)\b/.test(q) && /\b(energia|salud|vida|saber|conocimiento)\b/.test(q)) {
    const isDown = /\b(baja|bajar|reduce|quita)\b/.test(q);
    const val = isDown ? -20 : 25;
    if (q.includes('energia')) {
      actions.push({ type: 'ADJUST_STAT', stat: 'energy', delta: val, targetName: matchedName });
      summaryParts.push(`${isDown ? 'reducción' : 'aumento'} de energía`);
    }
    if (q.includes('salud') || q.includes('vida')) {
      actions.push({ type: 'ADJUST_STAT', stat: 'health', delta: val, targetName: matchedName });
      summaryParts.push(`${isDown ? 'reducción' : 'aumento'} de salud`);
    }
  }

  if (qRaw.includes('préstamo') || q.includes('prestamo') || qRaw.includes('crédito') || q.includes('credito')) {
    actions.push({ type: 'ISSUE_BANK_LOANS' });
    summaryParts.push('préstamos bancarios para obras');
  }
  if (q.includes('aprendiz') || q.includes('mentor')) {
    actions.push({ type: 'FORM_MENTORSHIPS' });
    summaryParts.push('contratos de aprendizaje Maestro-Aprendiz');
  }
  if (q.includes('caravana')) {
    actions.push({ type: 'RUN_CARAVANS' });
    summaryParts.push('despacho de caravanas a caballo');
  }
  if (q.includes('reparar') || q.includes('mantenimiento')) {
    actions.push({ type: 'REPAIR_BUILDINGS' });
    summaryParts.push('mantenimiento y reparación de estructuras');
  }
  if (q.includes('tormenta') || q.includes('rayo')) {
    actions.push({ type: 'TRIGGER_LIGHTNING_STORM' });
    summaryParts.push('tormenta eléctrica');
  }
  if (q.includes('incendio') || q.includes('fuego')) {
    actions.push({ type: 'TRIGGER_FIRE' });
    summaryParts.push('incendio');
  }
  const isRepeal = /\b(deroga|quita|levanta|anula|desactiva|permitir)\b/.test(q);
  if (q.includes('prohibir pesca') || q.includes('veda fluvial')) {
    actions.push({ type: 'TOGGLE_LAW', lawId: 'ban_fishing', active: !isRepeal });
    summaryParts.push(isRepeal ? 'derogación veda de pesca' : 'ley de veda de pesca');
  }
  if (q.includes('prohibir madera') || q.includes('prohibir comercio de madera') || q.includes('veda forestal')) {
    actions.push({ type: 'TOGGLE_LAW', lawId: 'ban_trade_wood', active: !isRepeal });
    summaryParts.push(isRepeal ? 'derogación veda forestal' : 'ley de veda forestal');
  }
  if (q.includes('prohibir oro') || q.includes('moratoria aurifera')) {
    actions.push({ type: 'TOGGLE_LAW', lawId: 'ban_mine_gold', active: !isRepeal });
    summaryParts.push(isRepeal ? 'derogación moratoria de Oro' : 'moratoria de minería de Oro');
  }
  if (q.includes('prohibir pan') || q.includes('reserva alimentaria')) {
    actions.push({ type: 'TOGGLE_LAW', lawId: 'ban_trade_bread', active: !isRepeal });
    summaryParts.push(isRepeal ? 'derogación reserva alimentaria' : 'prohibición de venta de pan');
  }
  if (q.includes('racionamiento invernal')) {
    actions.push({ type: 'TOGGLE_LAW', lawId: 'winter_rationing', active: !isRepeal });
    summaryParts.push(isRepeal ? 'derogación racionamiento invernal' : 'ley de racionamiento invernal');
  }
  if (q.includes('guardia nocturna')) {
    actions.push({ type: 'TOGGLE_LAW', lawId: 'night_watch', active: !isRepeal });
    summaryParts.push(isRepeal ? 'derogación guardia nocturna' : 'ley de guardia nocturna');
  }
  if (q.includes('prioridad minera')) {
    actions.push({ type: 'TOGGLE_LAW', lawId: 'mining_priority', active: !isRepeal });
    summaryParts.push(isRepeal ? 'derogación prioridad minera' : 'ley de prioridad minera');
  }
  if (q.includes('representante') || q.includes('eleccion')) {
    actions.push({ type: 'ELECT_REPRESENTATIVE' });
    summaryParts.push('elección de representante');
  }

  if (q.includes('ayuntamiento')) {
    actions.push({ type: 'BUILD_SPECIAL', buildingType: 'town_hall' });
    summaryParts.push('construcción de Ayuntamiento');
  }
  if (q.includes('comisaria')) {
    actions.push({ type: 'BUILD_SPECIAL', buildingType: 'police_station' });
    summaryParts.push('construcción de Comisaría');
  }
  if (q.includes('carcel')) {
    actions.push({ type: 'BUILD_SPECIAL', buildingType: 'prison' });
    summaryParts.push('construcción de Cárcel');
  }
  if (q.includes('deposito')) {
    actions.push({ type: 'BUILD_SPECIAL', buildingType: 'general_depot' });
    summaryParts.push('construcción de Depósito General');
  }

  if (!matchedName && (q.includes('cambiar de pareja') || q.includes('cambio de pareja') || q.includes('nuevas parejas'))) {
    actions.push({ type: 'SET_POLICIES', patch: { allowPartnerSwitch: true } });
    summaryParts.push('libertad para cambiar de pareja');
  }

  if (q.includes('pausar recurso') || q.includes('sin recurso') || q.includes('cortar recurso') || q.includes('detener recurso')) {
    actions.push({ type: 'PAUSE_RESOURCES', paused: true });
    summaryParts.push('pausa total de recursos automáticos');
  } else if (q.includes('reanudar recurso') || q.includes('activar recurso') || q.includes('dar recurso')) {
    actions.push({ type: 'PAUSE_RESOURCES', paused: false });
    summaryParts.push('reactivación de recursos');
  }

  if (q.includes('camino') || q.includes('sendero') || q.includes('calle') || q.includes('ruta') || q.includes('alumbrad') || q.includes('farol')) {
    const roadType: RoadType | undefined = q.includes('reforzad')
      ? 'reinforced'
      : q.includes('piedra')
        ? 'stone'
        : q.includes('tierra')
          ? 'dirt'
          : undefined;
    const withLamp = q.includes('farol') || q.includes('ilumin') || q.includes('alumbrad') ? true : undefined;
    actions.push({ type: 'ADD_ROADS', roadType, withLamp });
    summaryParts.push('trazado de caminos con recursos reales');
  }

  if (q.includes('muelle') || (q.includes('pesc') && !q.includes('prohibir') && !isMassJobChange)) {
    actions.push({ type: 'BUILD_SPECIAL', buildingType: 'dock' });
    summaryParts.push('construcción de Muelle Fluvial');
  }

  if (!matchedName && !isMassJobChange && (q.includes('banco') || q.includes('respaldo')) && !q.includes('prestamo')) {
    actions.push({ type: 'BUILD_SPECIAL', buildingType: 'bank' });
    summaryParts.push('construcción de Banco Central');
  }

  const isNorth = q.includes('zona norte') || q.includes('al norte') || q.includes('cruzando el puente') || q.includes('otro lado');

  if (
    (q.includes('matar') || q.includes('destruir') || q.includes('secar') || q.includes('arruinar')) &&
    (q.includes('cultiv') || q.includes('cosech') || q.includes('siembr') || q.includes('granja'))
  ) {
    actions.push({ type: 'KILL_CROPS' });
    summaryParts.push('destrucción de cultivos');
  } else if (q.includes('cultiv') || q.includes('sembr') || q.includes('granja') || q.includes('trigo') || q.includes('cosech')) {
    actions.push({ type: 'PLANT_CROPS', count: clamp(requestedCount, 2, 4), zone: isNorth ? 'north' : 'south' });
    summaryParts.push(isNorth ? 'parcelas agrícolas en Zona Norte' : 'creación de parcelas agrícolas');
  }

  if (q.includes('econom') || q.includes('comerc') || q.includes('mercad') || q.includes('negocio')) {
    actions.push({ type: 'GENERATE_ECONOMY' });
    summaryParts.push('activación de economía respaldada y comercios');
  }

  const wantsMoreChildren =
    (/\b(tener|tengan|tenga|hacer|hagan|quiero|permitir|permite|habilita|aumenta|subir|mas|fomentar)\b/.test(q) &&
      /\b(hj?ij[oa]s?|bebes?|crias?|nacimientos?|natalidad|descendencia|embarazos?)\b/.test(q) &&
      !q.includes('no reproduc') &&
      !q.includes('menos hijo') &&
      !q.includes('prohibir')) ||
    /\b(reproduzcan|reproducirse|mas hj?ij[oa]s?)\b/.test(q);

  if (
    wantsMoreChildren ||
    q.includes('permitir mas aldeano') ||
    q.includes('mas aldeano') ||
    q.includes('mas habitante') ||
    q.includes('crecer poblacion') ||
    q.includes('nuevos aldeano') ||
    q.includes('sumar aldeano')
  ) {
    const spawnMatch = q.match(/(?:sumar|agregar|traer|nuevos?|invitar)\s*(\d+)/);
    const mentionsSettlers =
      q.includes('aldeano') ||
      q.includes('habitante') ||
      q.includes('colono') ||
      q.includes('crecer poblacion') ||
      Boolean(spawnMatch);
    const spawnCount = spawnMatch
      ? clamp(Number(spawnMatch[1]), 1, 6)
      : wantsMoreChildren && !mentionsSettlers
        ? 0
        : wantsMoreChildren && q.includes('tengan')
          ? 0
          : 2;
    actions.push({
      type: 'ALLOW_MORE_VILLAGERS',
      spawnCount,
      encouragePregnancies: wantsMoreChildren,
    });
    summaryParts.push(
      wantsMoreChildren
        ? spawnCount > 0
          ? `impulso a la natalidad (+${spawnCount} colonos)`
          : 'impulso natural a la natalidad (embarazos y familias en la aldea)'
        : `expansión poblacional (+${spawnCount} colonos)`
    );
  }

  if (q.includes('enfermer') || q.includes('hospital') || q.includes('clinica')) {
    actions.push({ type: 'BUILD_SPECIAL', buildingType: 'infirmary' });
    summaryParts.push('construcción de Hospital');
  }
  if (q.includes('escuela') || q.includes('bibliot') || q.includes('academia')) {
    actions.push({ type: 'BUILD_SPECIAL', buildingType: 'school' });
    summaryParts.push('construcción de Escuela');
  }
  if (!isMassJobChange && q.includes('panader')) {
    actions.push({ type: 'BUILD_SPECIAL', buildingType: 'bakery' });
    summaryParts.push('construcción de Panadería');
  }
  if (!matchedName && !isMassJobChange && q.includes('carpinter')) {
    actions.push({ type: 'BUILD_SPECIAL', buildingType: 'carpentry' });
    summaryParts.push('construcción de Carpintería');
  }
  if (!isMassJobChange && (q.includes('botic') || q.includes('farmac'))) {
    actions.push({ type: 'BUILD_SPECIAL', buildingType: 'apothecary' });
    summaryParts.push('construcción de Botica');
  }
  if (!isMassJobChange && (q.includes('forja') || q.includes('herrer'))) {
    actions.push({ type: 'BUILD_SPECIAL', buildingType: 'forge' });
    summaryParts.push('construcción de Herrería / Forja');
  }
  if (q.includes('comercios') || q.includes('tiendas') || q.includes('locales')) {
    actions.push({ type: 'BUILD_SPECIAL', buildingType: 'market' });
    actions.push({ type: 'BUILD_SPECIAL', buildingType: 'bakery' });
    actions.push({ type: 'BUILD_SPECIAL', buildingType: 'carpentry' });
    actions.push({ type: 'BUILD_SPECIAL', buildingType: 'general_depot' });
    actions.push({ type: 'BUILD_SPECIAL', buildingType: 'bank' });
    summaryParts.push('apertura de distintos comercios, Depósito y Banco');
  }

  if (q.includes('gato salvaje')) {
    actions.push({ type: 'SPAWN_ANIMAL', animalType: 'wildcat', count: requestedCount });
    summaryParts.push('aparición de gato salvaje');
  } else if (q.includes('gato')) {
    actions.push({ type: 'SPAWN_ANIMAL', animalType: 'cat', count: requestedCount });
    summaryParts.push('adopción de gato(s)');
  }
  if (q.includes('perro')) {
    actions.push({ type: 'SPAWN_ANIMAL', animalType: 'dog', count: requestedCount });
    summaryParts.push('incorporación de perro(s) guardián');
  }
  if (q.includes('oso')) {
    actions.push({ type: 'SPAWN_ANIMAL', animalType: 'bear', count: requestedCount });
    summaryParts.push('aparición de oso(s)');
  }
  if (q.includes('gallina')) {
    actions.push({ type: 'SPAWN_ANIMAL', animalType: 'chicken', count: Math.max(2, requestedCount) });
    summaryParts.push('cría de gallinas');
  }
  if (q.includes('vaca')) {
    actions.push({ type: 'SPAWN_ANIMAL', animalType: 'cow', count: requestedCount });
    summaryParts.push('cría de vacas lecheras');
  }
  if (q.includes('caballo')) {
    actions.push({ type: 'SPAWN_ANIMAL', animalType: 'horse', count: requestedCount });
    summaryParts.push('caballos de transporte');
  }
  if (q.includes('oveja')) {
    actions.push({ type: 'SPAWN_ANIMAL', animalType: 'sheep', count: Math.max(2, requestedCount) });
    summaryParts.push('cría de ovejas');
  }
  if (q.includes('peces') || q.includes('pez')) {
    actions.push({ type: 'SPAWN_ANIMAL', animalType: 'fish', count: Math.max(4, requestedCount) });
    summaryParts.push('repoblación de peces en el río');
  }

  if (q.includes('plaza') || q.includes('fuente')) {
    actions.push({ type: 'BUILD_PLAZA' });
    summaryParts.push('construcción de Plaza decidida por Qwen');
  }
  if (q.includes('puente') || q.includes('cruzar el rio')) {
    actions.push({ type: 'BUILD_BRIDGE' });
    summaryParts.push('construcción de Puente sobre el río');
  }

  const houseMatch = q.match(/(?:(\d+)\s*)?(?:casas?|viviendas?|refugios?|chozas?)/);
  const expandNorthMatch = q.match(/(?:crear|crea|hacer|hace|construir|construye|construyan|agregar|sumar|expandir)\s*(?:(\d+)\s*)?zona norte/);
  if (
    (houseMatch && !q.includes('sin casa') && !matchedName) ||
    expandNorthMatch ||
    (isNorth && !q.includes('cultiv')) ||
    (q.includes('constru') &&
      !isMassJobChange &&
      !q.includes('plaza') &&
      !q.includes('puente') &&
      !q.includes('banco') &&
      !q.includes('escuela') &&
      !q.includes('mercado') &&
      !q.includes('enfermer') &&
      !q.includes('hospital') &&
      !q.includes('panader') &&
      !q.includes('carpinter') &&
      !q.includes('botic') &&
      !q.includes('comerc') &&
      !q.includes('forja') &&
      !q.includes('muelle') &&
      !q.includes('ayuntamiento') &&
      !q.includes('comisaria') &&
      !q.includes('carcel') &&
      !q.includes('deposito') &&
      !q.includes('camino'))
  ) {
    const rawCount = houseMatch?.[1] ?? expandNorthMatch?.[1];
    const count = clamp(rawCount ? Number(rawCount) : requestedCount, 1, 6);
    actions.push({ type: 'BUILD_HOUSES', count, zone: isNorth ? 'north' : 'south' });
    actions.push({ type: 'SET_POLICIES', patch: { buildPriority: true } });
    summaryParts.push(isNorth ? `expansión en Zona Norte (${count} casa/s)` : `construcción de ${count} casa(s)`);
  }

  const upgradeMatch = q.match(/(?:mejorar|mejora|mejoren|subir|ampliar)\s*(?:(\d+)\s*)?(?:casas?|viviendas?|refugios?)/);
  if (upgradeMatch || q.includes('mejorar') || q.includes('mejoren') || q.includes('subir nivel') || q.includes('ampliar')) {
    const specialUpgradeMap: Array<[string, SpecialBuildingType]> = [
      ['mercado', 'market'],
      ['panader', 'bakery'],
      ['carpinter', 'carpentry'],
      ['forja', 'forge'],
      ['herrer', 'forge'],
      ['botic', 'apothecary'],
      ['muelle', 'dock'],
      ['banco', 'bank'],
      ['hospital', 'infirmary'],
      ['enfermer', 'infirmary'],
      ['escuela', 'school'],
      ['deposito', 'general_depot'],
      ['ayuntamiento', 'town_hall'],
      ['comisaria', 'police_station'],
      ['carcel', 'prison'],
    ];
    const specialUpgrade = specialUpgradeMap.find(([kw]) => q.includes(kw));
    if (specialUpgrade) {
      actions.push({ type: 'UPGRADE_SPECIAL', buildingType: specialUpgrade[1] });
      summaryParts.push(`mejora de ${SPECIAL_BUILDING_LABELS[specialUpgrade[1]].label}`);
    } else {
      const count = clamp(upgradeMatch && upgradeMatch[1] ? Number(upgradeMatch[1]) : 1, 1, 6);
      actions.push({ type: 'UPGRADE_HOUSES', count });
      actions.push({ type: 'SET_POLICIES', patch: { buildPriority: true } });
      summaryParts.push(`mejora de ${count} casa(s)`);
    }
  }

  if (!matchedName && !isMassJobChange && (q.includes('trabajo') || q.includes('activo') || q.includes('oficio') || q.includes('productiv'))) {
    const preferredJob = detectJobInText(q);
    actions.push({ type: 'ASSIGN_ACTIVE_JOBS', preferredJob, forceChange: Boolean(preferredJob) });
    actions.push({ type: 'SET_POLICIES', patch: { workFocus: true } });
    summaryParts.push(preferredJob ? `asignación al oficio ${preferredJob}` : 'asignación activa de oficios');
  }

  if (q.includes('evoluc') || q.includes('era') || q.includes('avanz') || q.includes('tecnolog') || q.includes('saber')) {
    actions.push({ type: 'BOOST_EVOLUTION', knowledgeGain: 45 });
    actions.push({ type: 'SET_POLICIES', patch: { evolutionFocus: true } });
    summaryParts.push('impulso a la evolución de la especie y la aldea');
  }

  if (!matchedName && (q.includes('curar') || q.includes('sanar'))) {
    actions.push({ type: 'HEAL_VILLAGERS' });
    actions.push({ type: 'SET_POLICIES', patch: { healthPriority: true } });
    summaryParts.push('curación y prioridad sanitaria');
  }

  if (
    q.includes('felic') ||
    q.includes('animo') ||
    q.includes('excit') ||
    q.includes('depre') ||
    q.includes('sentimiento') ||
    q.includes('moral')
  ) {
    const isNegative = q.includes('triste') || q.includes('depre') || q.includes('bajar') || q.includes('miedo') || q.includes('estricto');
    actions.push({
      type: 'ADJUST_VILLAGE_MOOD',
      delta: isNegative ? -25 : 22,
      thought: isNegative
        ? 'Siento el peso de las exigencias y el desánimo en la aldea.'
        : '¡Me siento con excitación laboral y entusiasmo para producir más!',
    });
    actions.push({
      type: 'SET_POLICIES',
      patch: { moodDirective: isNegative ? 'disciplined' : 'optimistic' },
    });
    summaryParts.push(isNegative ? 'ajuste de disciplina/desánimo' : 'excitación laboral y entusiasmo');
  }

  if (q.includes('no reproduc') || q.includes('menos hijos') || q.includes('natalidad')) {
    actions.push({ type: 'SET_POLICIES', patch: { reproductionRestraint: true } });
    summaryParts.push('control moderado de natalidad');
  }

  if (q.includes('festival') || q.includes('festividad') || q.includes('festejo') || q.includes('celebrar')) {
    actions.push({ type: 'DECLARE_FESTIVAL' });
    summaryParts.push('convocatoria a festividad cultural con recursos reales');
  }

  if (
    q.includes('diplomacia') ||
    q.includes('comercio exterior') ||
    q.includes('importar') ||
    q.includes('exportar') ||
    q.includes('comarca') ||
    q.includes('puerto bruma')
  ) {
    const kind: 'import' | 'export' | 'knowledge' = q.includes('importar')
      ? 'import'
      : q.includes('conocimiento') || q.includes('intercambio cultural')
        ? 'knowledge'
        : 'export';
    const good: TradeGoodKey = q.includes('comida') || q.includes('alimento')
      ? 'food'
      : q.includes('piedra')
        ? 'stone'
        : q.includes('hierro')
          ? 'iron'
          : q.includes('medicin')
            ? 'medicine'
            : q.includes('herramienta')
              ? 'tools'
              : 'wood';
    actions.push({ type: 'DIPLOMATIC_TRADE', kind, good, amount: clamp(requestedCount, 2, 10) });
    summaryParts.push('gestión diplomática y comercio exterior');
  }

  if (q.includes('mitigar') || q.includes('emergencia') || q.includes('contener crisis') || q.includes('aliviar crisis')) {
    actions.push({ type: 'MITIGATE_CRISIS' });
    summaryParts.push('protocolo de mitigación de crisis sistémicas');
  }

  if (actions.length === 0) {
    actions.push({ type: 'ASSIGN_ACTIVE_JOBS' });
    actions.push({ type: 'BOOST_EVOLUTION', knowledgeGain: 25 });
    actions.push({ type: 'SET_POLICIES', patch: { workFocus: true, evolutionFocus: true } });
    return {
      reply:
        'Regla ejecutada por Qwen 2.5: Organicé a los aldeanos en oficios productivos e impulsé la evolución de la especie.',
      actions,
    };
  }

  return {
    reply: `Reglas ejecutadas por Qwen 2.5 en los aldeanos: ${summaryParts.join('; ')}.`,
    actions,
  };
}

const VALID_DIRECT_ACTIONS = new Set([
  'heal',
  'build',
  'trade',
  'research',
  'switch_partner',
  'fish',
  'store_home',
]);
const VALID_ADD_RESOURCES = new Set(['food', 'wood', 'stone', 'copper', 'iron', 'gold', 'silver']);
const VALID_GRANT_ITEMS = new Set([
  'food',
  'wood',
  'pineWood',
  'mapleWood',
  'oakWood',
  'stone',
  'copper',
  'iron',
  'gold',
  'silver',
  'coins',
  'bread',
  'tools',
  'medicine',
]);
const VALID_STATS = new Set(['knowledge', 'health', 'energy', 'happiness']);
const VALID_WEATHERS = new Set<WeatherType>(['sunny', 'rain', 'drought', 'storm', 'thunderstorm']);
const VALID_BIOMES = new Set<BiomeType>(['grassland', 'arid', 'forest', 'tundra']);
const VALID_SEASONS = new Set<SeasonType>(['Primavera', 'Verano', 'Otoño', 'Invierno']);
const VALID_LAW_IDS = new Set<VillageLawId>([
  'ban_trade_wood',
  'ban_fishing',
  'ban_trade_bread',
  'ban_mine_gold',
  'winter_rationing',
  'night_watch',
  'mining_priority',
]);
const VALID_TRADE_GOODS = new Set<TradeGoodKey>([
  'food',
  'wood',
  'stone',
  'copper',
  'iron',
  'tools',
  'medicine',
  'bread',
]);

function safeFiniteInt(val: unknown, fallback: number, min: number, max: number): number {
  const n = typeof val === 'number' ? val : Number(val);
  if (!Number.isFinite(n)) return fallback;
  return clamp(Math.round(n), min, max);
}

function safeValidJob(val: unknown): JobType | undefined {
  if (typeof val !== 'string') return undefined;
  return ALL_JOBS.includes(val as JobType) ? (val as JobType) : undefined;
}

export function sanitizeQwenReply(rawReply: unknown, fallback: string): string {
  if (typeof rawReply !== 'string') return fallback;
  const trimmed = rawReply.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, 600);
}

/**
 * Sandbox estricto para acciones de Qwen 2.5:3b:
 * Solo permite acciones válidas y acotadas dentro del mapa de la aldea.
 * Bloquea parámetros inválidos, enumeraciones inventadas o alteraciones del sistema.
 */
export function sanitizeQwenActions(rawActions: unknown): QwenAction[] {
  if (!Array.isArray(rawActions)) return [];
  const safe: QwenAction[] = [];

  for (const item of rawActions.slice(0, 16)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const raw = item as Record<string, unknown>;
    const type = raw.type;
    if (typeof type !== 'string') continue;

    switch (type) {
      case 'BUILD_HOUSES':
        safe.push({
          type: 'BUILD_HOUSES',
          count: safeFiniteInt(raw.count, 1, 1, 6),
          zone: raw.zone === 'north' ? 'north' : 'south',
        });
        break;
      case 'UPGRADE_HOUSES':
        safe.push({
          type: 'UPGRADE_HOUSES',
          count: safeFiniteInt(raw.count, 1, 1, 6),
        });
        break;
      case 'BUILD_PLAZA':
        safe.push({ type: 'BUILD_PLAZA' });
        break;
      case 'BUILD_BRIDGE':
        safe.push({ type: 'BUILD_BRIDGE' });
        break;
      case 'BUILD_SPECIAL':
      case 'UPGRADE_SPECIAL': {
        if (typeof raw.buildingType === 'string' && raw.buildingType in SPECIAL_BUILDING_COSTS) {
          safe.push({ type, buildingType: raw.buildingType as SpecialBuildingType });
        }
        break;
      }
      case 'PLANT_CROPS':
        safe.push({
          type: 'PLANT_CROPS',
          count: safeFiniteInt(raw.count, 1, 1, 6),
          zone: raw.zone === 'north' ? 'north' : 'south',
          farmSize:
            raw.farmSize === 'small' || raw.farmSize === 'medium' || raw.farmSize === 'large'
              ? raw.farmSize
              : undefined,
        });
        break;
      case 'KILL_CROPS':
        safe.push({ type: 'KILL_CROPS' });
        break;
      case 'ADD_ROADS':
        safe.push({
          type: 'ADD_ROADS',
          roadType:
            raw.roadType === 'dirt' || raw.roadType === 'stone' || raw.roadType === 'reinforced'
              ? raw.roadType
              : undefined,
          withLamp: typeof raw.withLamp === 'boolean' ? raw.withLamp : undefined,
        });
        break;
      case 'GENERATE_ECONOMY':
        safe.push({ type: 'GENERATE_ECONOMY' });
        break;
      case 'ALLOW_MORE_VILLAGERS': {
        const hasSpawn = raw.spawnCount !== undefined;
        safe.push({
          type: 'ALLOW_MORE_VILLAGERS',
          spawnCount: hasSpawn ? safeFiniteInt(raw.spawnCount, 0, 0, 6) : 0,
          encouragePregnancies: typeof raw.encouragePregnancies === 'boolean' ? raw.encouragePregnancies : true,
        });
        break;
      }
      case 'ASSIGN_ACTIVE_JOBS': {
        const preferredJob = safeValidJob(raw.preferredJob);
        const fromJob = safeValidJob(raw.fromJob);
        const rawFrac = typeof raw.fraction === 'number' && Number.isFinite(raw.fraction)
          ? clamp(raw.fraction, 0.05, 1)
          : undefined;
        const rawCount = raw.count !== undefined ? safeFiniteInt(raw.count, 1, 1, 200) : undefined;
        safe.push({
          type: 'ASSIGN_ACTIVE_JOBS',
          preferredJob,
          fromJob,
          fraction: rawFrac,
          count: rawCount,
          forceChange: typeof raw.forceChange === 'boolean' ? raw.forceChange : undefined,
        });
        break;
      }
      case 'DIRECT_VILLAGER': {
        if (typeof raw.agentName !== 'string' || !raw.agentName.trim()) break;
        const actionName =
          typeof raw.action === 'string' && VALID_DIRECT_ACTIONS.has(raw.action)
            ? (raw.action as NonNullable<Extract<QwenAction, { type: 'DIRECT_VILLAGER' }>['action']>)
            : undefined;
        safe.push({
          type: 'DIRECT_VILLAGER',
          agentName: raw.agentName.trim().slice(0, 60),
          job: safeValidJob(raw.job),
          action: actionName,
        });
        break;
      }
      case 'SPAWN_ANIMAL': {
        if (typeof raw.animalType === 'string' && raw.animalType in ANIMAL_LABELS) {
          safe.push({
            type: 'SPAWN_ANIMAL',
            animalType: raw.animalType as AnimalType,
            count: safeFiniteInt(raw.count, 1, 1, 8),
          });
        }
        break;
      }
      case 'BOOST_EVOLUTION':
        safe.push({
          type: 'BOOST_EVOLUTION',
          knowledgeGain: safeFiniteInt(raw.knowledgeGain, 25, 1, 150),
        });
        break;
      case 'SET_POLICIES': {
        if (!raw.patch || typeof raw.patch !== 'object' || Array.isArray(raw.patch)) break;
        const rawPatch = raw.patch as Record<string, unknown>;
        const cleanPatch: Partial<QwenPolicyState> = {};
        if (typeof rawPatch.buildPriority === 'boolean') cleanPatch.buildPriority = rawPatch.buildPriority;
        if (typeof rawPatch.workFocus === 'boolean') cleanPatch.workFocus = rawPatch.workFocus;
        if (typeof rawPatch.evolutionFocus === 'boolean') cleanPatch.evolutionFocus = rawPatch.evolutionFocus;
        if (typeof rawPatch.economyFocus === 'boolean') cleanPatch.economyFocus = rawPatch.economyFocus;
        if (typeof rawPatch.farmingFocus === 'boolean') cleanPatch.farmingFocus = rawPatch.farmingFocus;
        if (typeof rawPatch.reproductionRestraint === 'boolean') {
          cleanPatch.reproductionRestraint = rawPatch.reproductionRestraint;
        }
        if (typeof rawPatch.healthPriority === 'boolean') cleanPatch.healthPriority = rawPatch.healthPriority;
        if (typeof rawPatch.allowPartnerSwitch === 'boolean') cleanPatch.allowPartnerSwitch = rawPatch.allowPartnerSwitch;
        if (
          rawPatch.moodDirective === 'neutral' ||
          rawPatch.moodDirective === 'optimistic' ||
          rawPatch.moodDirective === 'disciplined'
        ) {
          cleanPatch.moodDirective = rawPatch.moodDirective;
        }
        if (Object.keys(cleanPatch).length > 0) {
          safe.push({ type: 'SET_POLICIES', patch: cleanPatch });
        }
        break;
      }
      case 'HEAL_VILLAGERS':
        safe.push({ type: 'HEAL_VILLAGERS' });
        break;
      case 'ADD_VILLAGE_RESOURCES': {
        if (typeof raw.resource === 'string' && VALID_ADD_RESOURCES.has(raw.resource)) {
          safe.push({
            type: 'ADD_VILLAGE_RESOURCES',
            resource: raw.resource as Extract<QwenAction, { type: 'ADD_VILLAGE_RESOURCES' }>['resource'],
            count: safeFiniteInt(raw.count, 3, 1, 12),
          });
        }
        break;
      }
      case 'GRANT_VILLAGER_ITEMS': {
        if (typeof raw.resource === 'string' && VALID_GRANT_ITEMS.has(raw.resource)) {
          safe.push({
            type: 'GRANT_VILLAGER_ITEMS',
            resource: raw.resource as Extract<QwenAction, { type: 'GRANT_VILLAGER_ITEMS' }>['resource'],
            amount: safeFiniteInt(raw.amount, 5, 1, 100),
            targetName: typeof raw.targetName === 'string' ? raw.targetName.trim().slice(0, 60) : undefined,
          });
        }
        break;
      }
      case 'ADJUST_STAT': {
        if (typeof raw.stat === 'string' && VALID_STATS.has(raw.stat)) {
          safe.push({
            type: 'ADJUST_STAT',
            stat: raw.stat as Extract<QwenAction, { type: 'ADJUST_STAT' }>['stat'],
            delta: safeFiniteInt(raw.delta, 10, -50, 50),
            targetName: typeof raw.targetName === 'string' ? raw.targetName.trim().slice(0, 60) : undefined,
          });
        }
        break;
      }
      case 'SET_WEATHER_BIOME':
        safe.push({
          type: 'SET_WEATHER_BIOME',
          weather:
            typeof raw.weather === 'string' && VALID_WEATHERS.has(raw.weather as WeatherType)
              ? (raw.weather as WeatherType)
              : undefined,
          biome:
            typeof raw.biome === 'string' && VALID_BIOMES.has(raw.biome as BiomeType)
              ? (raw.biome as BiomeType)
              : undefined,
          season:
            typeof raw.season === 'string' && VALID_SEASONS.has(raw.season as SeasonType)
              ? (raw.season as SeasonType)
              : undefined,
        });
        break;
      case 'RELEASE_PRISONERS':
        safe.push({
          type: 'RELEASE_PRISONERS',
          targetName: typeof raw.targetName === 'string' ? raw.targetName.trim().slice(0, 60) : undefined,
        });
        break;
      case 'REPORT_DATA':
        safe.push({
          type: 'REPORT_DATA',
          answer: typeof raw.answer === 'string' ? raw.answer.slice(0, 500) : '',
        });
        break;
      case 'PAUSE_RESOURCES':
        safe.push({ type: 'PAUSE_RESOURCES', paused: Boolean(raw.paused) });
        break;
      case 'ADJUST_VILLAGE_MOOD':
        safe.push({
          type: 'ADJUST_VILLAGE_MOOD',
          delta: safeFiniteInt(raw.delta, 10, -50, 50),
          thought: typeof raw.thought === 'string' ? raw.thought.trim().slice(0, 140) : undefined,
        });
        break;
      case 'TOGGLE_LAW': {
        if (typeof raw.lawId === 'string' && VALID_LAW_IDS.has(raw.lawId as VillageLawId)) {
          safe.push({
            type: 'TOGGLE_LAW',
            lawId: raw.lawId as VillageLawId,
            active: typeof raw.active === 'boolean' ? raw.active : true,
          });
        }
        break;
      }
      case 'TRIGGER_LIGHTNING_STORM':
      case 'TRIGGER_FIRE':
      case 'ELECT_REPRESENTATIVE':
      case 'ISSUE_BANK_LOANS':
      case 'FORM_MENTORSHIPS':
      case 'REPAIR_BUILDINGS':
      case 'RUN_CARAVANS':
        safe.push({ type });
        break;
      case 'STYLE_VILLAGERS': {
        const validStyles: Agent['hairStyle'][] = ['short', 'long', 'mohawk', 'curly', 'ponytail', 'bald'];
        const isHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
        safe.push({
          type: 'STYLE_VILLAGERS',
          targetName: typeof raw.targetName === 'string' ? raw.targetName.trim().slice(0, 60) : undefined,
          shirt: isHex(raw.shirt) ? raw.shirt : undefined,
          hairStyle:
            typeof raw.hairStyle === 'string' && validStyles.includes(raw.hairStyle as Agent['hairStyle'])
              ? (raw.hairStyle as Agent['hairStyle'])
              : undefined,
          hairColor: isHex(raw.hairColor) ? raw.hairColor : undefined,
          skin: isHex(raw.skin) ? raw.skin : undefined,
        });
        break;
      }
      case 'DECLARE_FESTIVAL':
        safe.push({
          type: 'DECLARE_FESTIVAL',
          traditionName:
            typeof raw.traditionName === 'string' && raw.traditionName.trim()
              ? raw.traditionName.trim().slice(0, 80)
              : undefined,
        });
        break;
      case 'DIPLOMATIC_TRADE':
        safe.push({
          type: 'DIPLOMATIC_TRADE',
          communityId:
            typeof raw.communityId === 'string' && raw.communityId.trim()
              ? raw.communityId.trim().slice(0, 50)
              : undefined,
          kind:
            raw.kind === 'import' || raw.kind === 'export' || raw.kind === 'knowledge'
              ? raw.kind
              : undefined,
          good:
            typeof raw.good === 'string' && VALID_TRADE_GOODS.has(raw.good as TradeGoodKey)
              ? (raw.good as TradeGoodKey)
              : undefined,
          amount: raw.amount !== undefined ? safeFiniteInt(raw.amount, 4, 1, 20) : undefined,
        });
        break;
      case 'MITIGATE_CRISIS':
        safe.push({ type: 'MITIGATE_CRISIS' });
        break;
    }
  }

  return safe;
}

export function applyQwenActions(
  state: SimulationState,
  actions: QwenAction[],
  spawnSettlerFn?: (state: SimulationState, count: number) => number
): string[] {
  const executed: string[] = [];
  const builtInBatch = new Set<SpecialBuildingType>();
  const sanitized = sanitizeQwenActions(actions);
  const orderedActions = [...sanitized].sort((a, b) => {
    const rank = (act: QwenAction) => (act.type === 'ALLOW_MORE_VILLAGERS' ? 0 : 1);
    return rank(a) - rank(b);
  });

  const findConstructor = (): Agent | null =>
    state.agents.find((a) => !a.isChild && a.jailedDays <= 0 && a.job === 'Constructor') ?? null;

  for (const action of orderedActions) {
    switch (action.type) {
      case 'PAUSE_RESOURCES': {
        state.resourcesPaused = action.paused;
        executed.push(action.paused ? 'Recursos externos pausados' : 'Recursos externos activos');
        addLog(
          state,
          action.paused
            ? 'Se pausó por completo la entrega automática de recursos.'
            : 'Se reanudó la generación de recursos en la aldea.',
          action.paused ? 'amber' : 'emerald'
        );
        break;
      }
      case 'TOGGLE_LAW': {
        const law = toggleVillageLaw(state, action.lawId, action.active, 'Qwen 2.5');
        if (law) executed.push(`${law.name}: ${law.active ? 'Activa' : 'Derogada'}`);
        break;
      }
      case 'TRIGGER_LIGHTNING_STORM': {
        const f = triggerLightningStorm(state);
        executed.push(f ? 'Tormenta eléctrica e incendio iniciado' : 'Tormenta eléctrica desatada');
        break;
      }
      case 'TRIGGER_FIRE': {
        const f = spawnFire(
          state,
          WORLD_CENTER_X + (Math.random() - 0.5) * 200,
          SOUTH_CENTER_Y + (Math.random() - 0.5) * 180,
          'Directiva Qwen 2.5'
        );
        executed.push(`Incendio en (${Math.round(f.x)}, ${Math.round(f.y)})`);
        break;
      }
      case 'ELECT_REPRESENTATIVE': {
        const rep = electRepresentative(state);
        executed.push(rep ? `Representante: ${rep.name}` : 'Sin representante disponible');
        break;
      }
      case 'ISSUE_BANK_LOANS': {
        const candidates = state.agents.filter(
          (a) => !a.isChild && (a.job === 'Constructor' || a.job === 'Carpintero') && a.coins < 25
        );
        let issued = 0;
        for (const c of candidates.slice(0, 3)) {
          if (grantBankLoan(state, c, 15, 'capital de obra')) issued++;
        }
        executed.push(issued > 0 ? `${issued} préstamo(s) bancarios emitidos` : 'Banco no operativo o sin solicitantes');
        break;
      }
      case 'FORM_MENTORSHIPS': {
        const count = assignMentorships(state);
        executed.push(count > 0 ? `${count} contratos de aprendizaje` : 'Sin nuevos aprendices');
        break;
      }
      case 'REPAIR_BUILDINGS': {
        const builder = state.agents.find((a) => a.job === 'Constructor' || a.job === 'Carpintero') ?? state.agents[0] ?? null;
        const count = repairDamagedStructures(state, builder);
        executed.push(count > 0 ? `${count} estructura(s) reparadas` : 'Estructuras sanas o falta material');
        break;
      }
      case 'RUN_CARAVANS': {
        let dispatched = 0;
        for (const agent of state.agents) {
          if (!agent.isChild && dispatched < 3) {
            agent.taskType = 'caravan';
            agent.taskTimer = 38;
            agent.activity = getConciseTaskLabel('caravan');
            dispatched++;
          }
        }
        executed.push(`${dispatched} caravana(s) despachada(s)`);
        addLog(state, `Qwen 2.5 despachó ${dispatched} caravana(s) comerciales.`, 'sky');
        break;
      }
      case 'STYLE_VILLAGERS': {
        const targets = action.targetName
          ? state.agents.filter(
              (a) =>
                a.name.toLowerCase() === action.targetName!.toLowerCase() ||
                a.name.toLowerCase().startsWith(action.targetName!.split(' ')[0].toLowerCase())
            )
          : state.agents;
        let styled = 0;
        for (const ag of targets) {
          if (action.shirt || action.hairStyle || action.hairColor || action.skin) {
            if (action.shirt) ag.shirt = action.shirt;
            if (action.hairStyle) ag.hairStyle = action.hairStyle;
            if (action.hairColor) ag.hairColor = action.hairColor;
            if (action.skin) ag.skin = action.skin;
            ag.lastQwenDecision = 'Qwen 2.5:3b renovó tu vestimenta y apariencia.';
          } else {
            assignQwenAppearanceSetup(state, ag, { reason: 'estilismo Qwen 2.5', preserveSkin: false });
          }
          styled++;
        }
        executed.push(styled > 0 ? `${styled} aldeano(s) estilizado(s)` : 'Sin aldeanos coincidentes');
        if (styled > 0) {
          addLog(state, `Qwen 2.5:3b definió nuevos estilos de vestimenta/pelo para ${styled} aldeano(s).`, 'violet');
        }
        break;
      }
      case 'KILL_CROPS': {
        const removed = killAllCrops(state);
        executed.push(removed > 0 ? `${removed} cultivo(s) destruidos` : 'Sin cultivos activos');
        break;
      }
      case 'ADD_ROADS': {
        const builder = findConstructor();
        if (!builder) {
          executed.push('Caminos pendientes: se requiere Constructor');
          addLog(state, 'Se requiere al menos un aldeano Constructor con materiales para trazar caminos.', 'amber');
          break;
        }
        const rType = action.roadType ?? state.selectedRoadType ?? 'dirt';
        const rLamp = action.withLamp ?? state.selectedRoadLamp ?? false;
        const added = buildBaseRoads(state, rType, rLamp, builder);
        executed.push(
          added > 0
            ? `+${added} tramos de camino (${rType}${rLamp ? ' + farol' : ''})`
            : `Faltan recursos (${formatResourceCost(getRoadTileCost(rType, rLamp))}/tramo) o red al día`
        );
        break;
      }
      case 'SPAWN_ANIMAL': {
        for (let i = 0; i < action.count; i++) {
          createAnimal(state, action.animalType);
        }
        executed.push(`+${action.count} ${ANIMAL_LABELS[action.animalType]}`);
        addLog(state, `Qwen 2.5 incorporó ${action.count} ${ANIMAL_LABELS[action.animalType]} al ecosistema.`, 'sky');
        break;
      }
      case 'DIRECT_VILLAGER': {
        const target = state.agents.find(
          (a) =>
            a.name.toLowerCase() === action.agentName.toLowerCase() ||
            a.name.toLowerCase().startsWith(action.agentName.split(' ')[0].toLowerCase())
        );
        if (!target) {
          executed.push(`No se encontró a ${action.agentName}`);
          break;
        }
        const changes: string[] = [];
        if (action.job && !target.isChild) {
          setAgentJob(state, target, action.job, 'directiva Qwen 2.5');
          changes.push(`oficio ${action.job}`);
        }
        if (action.action === 'switch_partner') {
          const sw = switchPartnerForAgent(state, target.id, 'decisión solicitada');
          changes.push(sw.newPartnerName ? `nueva pareja (${sw.newPartnerName})` : 'separación');
        } else if (action.action === 'store_home') {
          const house = target.houseId !== null ? state.houses.find((h) => h.id === target.houseId) : null;
          const depot = state.specialBuildings.find((b) => b.type === 'general_depot' && b.isOperational) ?? null;
          if (house) {
            const moved = depositResourcesToHouse(target, house, 'surplus', depot);
            changes.push(`guardó ${moved} bienes`);
          }
        } else if (action.action === 'fish') {
          target.taskType = 'fish_river';
          target.taskTimer = 36;
          target.activity = getConciseTaskLabel('fish_river');
          changes.push('pesca en el río');
        } else if (action.action === 'heal') {
          cureAgent(state, target.id);
          changes.push('atención médica');
        } else if (action.action === 'build') {
          target.taskType = 'build_house';
          target.taskTimer = 36;
          target.activity = getConciseTaskLabel('build_house');
          changes.push('priorizar construcción');
        } else if (action.action === 'trade') {
          target.taskType = 'trade';
          target.taskTimer = 36;
          target.activity = getConciseTaskLabel('trade');
          changes.push('actividad comercial');
        } else if (action.action === 'research') {
          target.taskType = 'research';
          target.taskTimer = 36;
          target.activity = getConciseTaskLabel('research');
          changes.push('investigación');
        } else {
          target.taskTimer = 0;
        }
        syncSpecialBuildingStaff(state);
        const desc = changes.length > 0 ? changes.join(' + ') : `reorganización de ${target.job}`;
        target.lastQwenDecision = `Orden directa de Qwen 2.5: ${desc}.`;
        target.qwenPlan = desc;
        target.thought = `Qwen 2.5 me encomendó: ${desc}.`;
        executed.push(`${target.name}: ${desc}`);
        addLog(state, `Qwen 2.5 dirigió a ${target.name} (${desc}).`, 'violet');
        break;
      }
      case 'GENERATE_ECONOMY': {
        state.policies.economyFocus = true;
        const builder = findConstructor();
        const builtNames: string[] = [];
        for (const ecoType of ['general_depot', 'market', 'bakery', 'bank'] as SpecialBuildingType[]) {
          const spec = SPECIAL_BUILDING_COSTS[ecoType];
          const existingCount = state.specialBuildings.filter((b) => b.type === ecoType).length;
          if (
            existingCount < spec.maxCount &&
            builder &&
            hasAvailableOperatorForBuilding(state, ecoType)
          ) {
            const cost = getSpecialBuildingCost(ecoType, 1);
            const label = SPECIAL_BUILDING_LABELS[ecoType].label;
            if (consumeConstructionResources(state, builder, cost, true, label, 'construccion')) {
              const created = createSpecialBuilding(
                state,
                ecoType,
                builder.name,
                undefined,
                undefined,
                builder.constructionKnowledge
              );
              if (created) {
                builtInBatch.add(ecoType);
                builtNames.push(created.name);
              }
            }
          }
        }
        let traders = 0;
        for (const agent of state.agents) {
          if (
            !agent.isChild &&
            (agent.job === 'Recolector' || agent.job === 'Aprendiz') &&
            traders < Math.max(3, Math.ceil(state.agents.length / 4))
          ) {
            const nextJob: JobType = traders === 0 ? 'Banquero' : traders === 1 ? 'Panadero' : 'Comerciante';
            setAgentJob(state, agent, nextJob, 'economía');
            traders++;
          }
          agent.taskTimer = 0;
          agent.lastQwenDecision = 'Qwen 2.5 activó prioridad comercial y oficios económicos.';
          agent.thought = 'Impulsaremos la producción y el comercio con recursos reales.';
        }
        syncSpecialBuildingStaff(state);
        state.knowledge += 8;
        executed.push(
          `${builtNames.length > 0 ? builtNames.join(' y ') : 'Política económica activa'} · ${traders} oficios comerciales (sin emisión gratuita)`
        );
        addLog(
          state,
          builtNames.length > 0
            ? `Qwen 2.5 activó la economía aldeana y levantó con recursos reales: ${builtNames.join(', ')}.`
            : 'Qwen 2.5 activó política económica; se requieren recursos reales y metales minados para levantar locales y emitir monedas.',
          'amber'
        );
        break;
      }
      case 'ALLOW_MORE_VILLAGERS': {
        state.policies.reproductionRestraint = false;
        let spawned = 0;
        const safeSpawnCount =
          typeof action.spawnCount === 'number' && Number.isFinite(action.spawnCount)
            ? clamp(Math.round(action.spawnCount), 0, 6)
            : 0;
        if (spawnSettlerFn && safeSpawnCount > 0) {
          spawned = spawnSettlerFn(state, safeSpawnCount);
        }
        if (shouldBuildHouse(state)) {
          const builder = findConstructor();
          if (builder) {
            const baseCost = getHouseBuildCost('small', false);
            const disc = canApplyCarpentryHousingDiscount(state, baseCost);
            const cost = getHouseBuildCost('small', disc);
            if (
              consumeConstructionResources(state, builder, cost, true, 'Vivienda expansión', 'construccion')
            ) {
              if (disc) consumeCarpentryHousingDiscount(state, builder.name, 'Vivienda expansión');
              createHouseNearCenter(
                state,
                builder.name,
                'south',
                'small',
                undefined,
                undefined,
                builder.constructionKnowledge
              );
            }
          }
        }
        for (const agent of state.agents) {
          agent.reproductionCooldown = 0;
          if (action.encouragePregnancies && !agent.isChild && !agent.isSterile && agent.ageYears >= AGE_REPRODUCE_MIN_YEARS) {
            agent.wantsChildren = true;
          }
          agent.lastQwenDecision = 'Qwen 2.5 habilitó expansión de la especie.';
          agent.thought = 'La aldea evoluciona y hay espacio para nuevas familias y progreso.';
        }

        let newPregnancies = 0;
        if (action.encouragePregnancies) {
          // Emparejar adultos elegibles solteros (>= 15 años) si faltan parejas
          const singles = state.agents.filter(
            (a) => !a.isChild && a.ageYears >= AGE_PARTNER_MIN_YEARS && a.partnerId === null && a.jailedDays <= 0
          );
          for (const sAgent of singles) {
            if (sAgent.partnerId !== null) continue;
            const match = singles.find(
              (other) =>
                other.id !== sAgent.id &&
                other.partnerId === null &&
                other.sex !== sAgent.sex
            );
            if (match) {
              sAgent.partnerId = match.id;
              match.partnerId = sAgent.id;
            }
          }

          // Iniciar embarazos naturales de 3 días en parejas aptas (>= 20 años, casa disponible y no estériles)
          for (const a of state.agents) {
            if (newPregnancies >= 3) break;
            if (a.partnerId === null) continue;
            const b = state.agents.find((p) => p.id === a.partnerId);
            if (!b || a.id > b.id) continue;
            if (canAgentsReproduce(a, b, state.houses, state.agents, state.policies)) {
              const mother = a.sex === 'F' ? a : b;
              const father = a.sex === 'M' ? a : b;
              mother.pregnancy = {
                partnerId: father.id,
                daysRemaining: PREGNANCY_DAYS,
                conceptionDay: state.day,
              };
              mother.reproductionCooldown = 180;
              father.reproductionCooldown = 180;
              newPregnancies++;
              addLog(
                state,
                `${mother.name} y ${father.name} esperan un bebé (${PREGNANCY_DAYS} días de gestación) tras impulso familiar.`,
                'violet'
              );
            }
          }
        }

        if (spawned > 0) {
          executed.push(`Natalidad abierta · +${spawned} nuevo(s) aldeano(s)`);
        } else if (newPregnancies > 0) {
          executed.push(`Natalidad abierta · ${newPregnancies} embarazo(s) de ${PREGNANCY_DAYS} días iniciados`);
        } else {
          executed.push('Natalidad abierta (requiere vivienda y pareja adulta ≥20 años para concebir)');
        }
        addLog(state, 'Qwen 2.5 habilitó expansión poblacional y familiar sin restricciones.', 'emerald');
        break;
      }
      case 'BUILD_PLAZA': {
        if (state.plaza) {
          executed.push('Plaza ya construida');
          break;
        }
        const builder = findConstructor();
        if (!builder) {
          executed.push('Plaza pendiente: se requiere un Constructor');
          addLog(state, 'Qwen 2.5 pospuso la Plaza: falta un aldeano Constructor.', 'amber');
          break;
        }
        if (!consumeConstructionResources(state, builder, PLAZA_COSTS.build, true, 'Plaza Central', 'construccion')) {
          const reqStr = formatResourceCost(PLAZA_COSTS.build);
          executed.push(`Plaza pendiente: faltan recursos (${reqStr})`);
          addLog(state, `Qwen 2.5 pospuso la Plaza Central: faltan ${reqStr} (solo personal/Depósito).`, 'amber');
          break;
        }
        const plaza = createPlaza(state, builder.name);
        state.knowledge += 14;
        executed.push(`Plaza en (${plaza.x}, ${plaza.y})`);
        addLog(state, `${builder.name} erigió la Plaza Central en (${plaza.x}, ${plaza.y}).`, 'sky');
        break;
      }
      case 'BUILD_BRIDGE': {
        if (state.bridge) {
          executed.push('Puente ya construido');
          break;
        }
        const builder = findConstructor();
        if (!builder) {
          executed.push('Puente pendiente: se requiere un Constructor');
          addLog(state, 'Qwen 2.5 pospuso el Puente: falta un aldeano Constructor.', 'amber');
          break;
        }
        if (!consumeConstructionResources(state, builder, BRIDGE_COSTS.build, true, 'Puente Fluvial', 'construccion')) {
          const reqStr = formatResourceCost(BRIDGE_COSTS.build);
          executed.push(`Puente pendiente: faltan recursos (${reqStr})`);
          addLog(state, `Qwen 2.5 pospuso el Puente Fluvial: faltan ${reqStr}.`, 'amber');
          break;
        }
        const bridge = createBridge(state, builder.name);
        state.knowledge += 14;
        executed.push(`Puente en X=${bridge.x}`);
        addLog(state, `${builder.name} construyó el Puente Fluvial en X=${bridge.x}.`, 'sky');
        break;
      }
      case 'BUILD_SPECIAL': {
        if (builtInBatch.has(action.buildingType)) {
          break;
        }
        const label = SPECIAL_BUILDING_LABELS[action.buildingType].label;
        const spec = SPECIAL_BUILDING_COSTS[action.buildingType];
        const existingCount = state.specialBuildings.filter((b) => b.type === action.buildingType).length;
        if (existingCount >= spec.maxCount) {
          executed.push(
            spec.unique ? `${label} ya existe (único)` : `${label} al máximo (${spec.maxCount})`
          );
          break;
        }
        if (!hasAvailableOperatorForBuilding(state, action.buildingType)) {
          executed.push(`${label} cancelado: falta operario disponible`);
          addLog(state, `No se construye ${label} porque no hay ningún operario disponible para administrarlo.`, 'amber');
          break;
        }
        const builder = findConstructor();
        if (!builder) {
          executed.push(`${label} pendiente: se requiere un Constructor`);
          addLog(state, `No se construye ${label}: falta un aldeano con oficio Constructor.`, 'amber');
          break;
        }
        const cost = getSpecialBuildingCost(action.buildingType, 1);
        if (!consumeConstructionResources(state, builder, cost, true, label, 'construccion')) {
          const reqStr = formatResourceCost(cost);
          executed.push(`${label} pendiente: faltan recursos (${reqStr})`);
          addLog(state, `No hay recursos suficientes (${reqStr}) en Constructor/Depósito para construir ${label}.`, 'amber');
          break;
        }
        const b = createSpecialBuilding(
          state,
          action.buildingType,
          builder.name,
          undefined,
          undefined,
          builder.constructionKnowledge
        );
        if (!b) {
          executed.push(`${label} requiere operario libre`);
          break;
        }
        builtInBatch.add(action.buildingType);
        state.knowledge += 18;
        executed.push(`${b.name} (N${b.level})`);
        addLog(state, `${builder.name} construyó ${b.name} en (${b.x}, ${b.y}) (Nivel ${b.level}).`, 'sky');
        break;
      }
      case 'UPGRADE_SPECIAL': {
        const label = SPECIAL_BUILDING_LABELS[action.buildingType].label;
        const builder = findConstructor();
        if (!builder) {
          executed.push(`Mejora de ${label} pendiente: falta Constructor`);
          break;
        }
        const maxTechLv = getSpecialBuildingMaxLevelByTech(state, builder.constructionKnowledge);
        const target = state.specialBuildings
          .filter((b) => b.type === action.buildingType && b.level < 3)
          .sort((a, b) => a.level - b.level)[0];
        if (!target) {
          executed.push(`No hay ${label} construible/mejorable`);
          break;
        }
        if (target.level >= maxTechLv) {
          executed.push(`${target.name} requiere mayor tecnología/era para subir a N${target.level + 1}`);
          break;
        }
        const nextLv = (target.level + 1) as 2 | 3;
        const cost = getSpecialBuildingCost(target.type, nextLv);
        if (!consumeConstructionResources(state, builder, cost, true, `Mejora ${target.name}`, 'mejora')) {
          executed.push(`Mejora de ${target.name} pendiente: faltan ${formatResourceCost(cost)}`);
          break;
        }
        const upgraded = upgradeSpecialBuilding(state, target.id, builder.constructionKnowledge);
        if (upgraded) {
          executed.push(`${upgraded.name} mejorado a N${upgraded.level}`);
          addLog(state, `${builder.name} mejoró ${upgraded.name} a Nivel ${upgraded.level}.`, 'sky');
        }
        break;
      }
      case 'PLANT_CROPS': {
        state.policies.farmingFocus = true;
        const farmSize: FarmPlot['size'] = action.farmSize ?? 'small';
        const cost = getFarmCost(farmSize).build;
        const builder = findConstructor();
        if (!builder) {
          executed.push('Cultivo pendiente: se requiere Constructor');
          addLog(state, 'Se requiere un Constructor con materiales para cercar nuevas granjas.', 'amber');
          break;
        }
        let planted = 0;
        for (let i = 0; i < action.count; i++) {
          if (!consumeConstructionResources(state, builder, cost, true, `Granja ${farmSize}`, 'construccion')) {
            break;
          }
          const zone = action.zone === 'north' && isBridgePassable(state) ? 'north' : 'south';
          createFarmPlot(state, zone, undefined, undefined, farmSize);
          planted++;
        }
        let farmers = 0;
        for (const agent of state.agents) {
          if (!agent.isChild && farmers < 2 && agent.job === 'Recolector') {
            setAgentJob(state, agent, 'Agricultor', 'parcelas nuevas');
            agent.taskTimer = 0;
            agent.lastQwenDecision = 'Qwen 2.5 lo asignó a cultivar nuevas parcelas.';
            farmers++;
          }
        }
        executed.push(
          planted > 0
            ? `+${planted} parcela(s) de cultivo (${farmSize})`
            : `Faltan recursos (${formatResourceCost(cost)})`
        );
        if (planted > 0) addLog(state, `${builder.name} habilitó ${planted} parcela(s) agrícolas (${farmSize}).`, 'emerald');
        break;
      }
      case 'BUILD_HOUSES': {
        const builder = findConstructor();
        if (!builder) {
          executed.push('Viviendas pendientes: se requiere Constructor');
          addLog(state, 'Falta un aldeano Constructor para construir viviendas.', 'amber');
          break;
        }
        let built = 0;
        for (let i = 0; i < action.count; i++) {
          if (!shouldBuildHouse(state)) {
            if (built === 0) {
              executed.push('Sin casas innecesarias: todos tienen hogar');
            }
            break;
          }
          const houseSize: House['size'] =
            builder.constructionKnowledge >= 65
              ? 'large'
              : builder.constructionKnowledge >= 35
                ? 'medium'
                : 'small';
          const baseCost = getHouseBuildCost(houseSize, false);
          const disc = canApplyCarpentryHousingDiscount(state, baseCost);
          const cost = getHouseBuildCost(houseSize, disc);
          if (!consumeConstructionResources(state, builder, cost, true, `Vivienda (${houseSize})`, 'construccion')) {
            if (built === 0) {
              executed.push(`Casas pendientes: faltan recursos (${formatResourceCost(cost)})`);
              addLog(state, `Faltan recursos (${formatResourceCost(cost)}) en Constructor/Depósito para construir viviendas.`, 'amber');
            }
            break;
          }
          if (disc) consumeCarpentryHousingDiscount(state, builder.name, `Vivienda (${houseSize})`);
          const zone = action.zone === 'north' && isBridgePassable(state) ? 'north' : 'south';
          const h = createHouseNearCenter(
            state,
            builder.name,
            zone,
            houseSize,
            undefined,
            undefined,
            builder.constructionKnowledge
          );
          built++;
          executed.push(`Construida ${h.name} (${h.x},${h.y})`);
        }
        if (built > 0) {
          addLog(
            state,
            `${builder.name} construyó ${built} vivienda(s) en ${action.zone === 'north' && isBridgePassable(state) ? 'Zona Norte' : 'la aldea'}.`,
            'emerald'
          );
        }
        break;
      }
      case 'UPGRADE_HOUSES': {
        const builder = findConstructor();
        if (!builder) {
          executed.push('Mejora pendiente: se requiere Constructor');
          break;
        }
        const maxAllowed: 1 | 2 | 3 | 4 =
          builder.constructionKnowledge >= 75
            ? 4
            : (Math.max(ERA_METADATA[state.era].maxHouseLevel, builder.constructionKnowledge >= 45 ? 3 : 2) as 1 | 2 | 3 | 4);
        let upgraded = 0;
        for (let i = 0; i < action.count; i++) {
          const candidateHouse = state.houses
            .filter((h) => h.level < maxAllowed)
            .sort((a, b) => a.level - b.level)[0];
          if (!candidateHouse) break;
          const nextLv = (candidateHouse.level + 1) as 2 | 3 | 4;
          const baseCost = getHouseUpgradeCost(candidateHouse.size, nextLv, false);
          const disc = canApplyCarpentryHousingDiscount(state, baseCost);
          const cost = getHouseUpgradeCost(candidateHouse.size, nextLv, disc);
          if (!consumeConstructionResources(state, builder, cost, true, `Mejora ${candidateHouse.name}`, 'mejora')) {
            break;
          }
          if (disc) consumeCarpentryHousingDiscount(state, builder.name, `Mejora ${candidateHouse.name}`);
          const h = upgradeLowestHouse(state, builder.constructionKnowledge, candidateHouse.id);
          if (h) upgraded++;
        }
        if (upgraded > 0) {
          executed.push(`Mejoradas ${upgraded} casa(s)`);
          addLog(state, `${builder.name} mejoró ${upgraded} vivienda(s) de la aldea.`, 'sky');
        } else {
          executed.push('Mejora pendiente: faltan materiales exactos o tope de era alcanzado');
        }
        break;
      }
      case 'ASSIGN_ACTIVE_JOBS': {
        const allEligible = state.agents.filter(
          (a) => !a.isChild && a.ageYears >= 15 && a.jailedDays <= 0
        );
        const poolBase =
          allEligible.length > 0 ? allEligible : state.agents.filter((a) => !a.isChild);
        const filteredPool = action.fromJob
          ? poolBase.filter((a) => a.job === action.fromJob)
          : poolBase;

        const targetCount =
          typeof action.fraction === 'number'
            ? clamp(Math.round(filteredPool.length * action.fraction), 1, filteredPool.length)
            : typeof action.count === 'number'
              ? clamp(Math.round(action.count), 1, filteredPool.length)
              : filteredPool.length;

        const orderedPool = action.preferredJob
          ? [...filteredPool].sort(
              (a, b) =>
                Number(a.job === action.preferredJob) - Number(b.job === action.preferredJob)
            )
          : filteredPool;
        const selected = orderedPool.slice(0, targetCount);

        const jobCounts = getAllJobsMap();
        for (const ag of state.agents) jobCounts[ag.job]++;
        const rotationJobs: JobType[] = [
          'Constructor',
          'Minero',
          'Leñador',
          'Agricultor',
          'Carpintero',
          'Pescador',
          'Comerciante',
          'Erudito',
          'Panadero',
          'Herrero',
          'Curandero',
          'Boticario',
          'Artesano',
          'Guardián',
          'Banquero',
          'Almacenero',
        ];

        const changedDetails: string[] = [];
        for (const agent of selected) {
          const oldJob = agent.job;
          let nextJob: JobType;
          if (action.preferredJob) {
            nextJob = action.preferredJob;
          } else if (action.forceChange) {
            const balanced = assignBalancedJob(
              agent,
              state.agents,
              state.houses,
              state.policies,
              state.specialBuildings
            );
            if (balanced !== oldJob) {
              nextJob = balanced;
            } else {
              const sortedDistinct = rotationJobs
                .filter((j) => j !== oldJob)
                .sort((a, b) => jobCounts[a] - jobCounts[b]);
              nextJob = sortedDistinct[0] ?? (oldJob === 'Constructor' ? 'Minero' : 'Constructor');
            }
          } else {
            nextJob = assignBalancedJob(
              agent,
              state.agents,
              state.houses,
              state.policies,
              state.specialBuildings
            );
          }

          if (nextJob !== oldJob) {
            jobCounts[oldJob] = Math.max(0, jobCounts[oldJob] - 1);
            jobCounts[nextJob] = (jobCounts[nextJob] ?? 0) + 1;
            setAgentJob(state, agent, nextJob, 'organización Qwen 2.5');
            changedDetails.push(`${agent.name} (${oldJob}→${nextJob})`);
          }
          agent.taskTimer = 0;
          agent.lastQwenDecision = `Qwen 2.5 asignó oficio ${agent.job}.`;
          agent.qwenPlan = `Ejercer ${agent.job}`;
          agent.thought = `Asumí el oficio de ${agent.job} por orden de Qwen 2.5.`;
        }
        syncSpecialBuildingStaff(state);
        const summary =
          changedDetails.length > 0
            ? `Cambiados ${changedDetails.length}/${state.agents.length}: ${changedDetails.slice(0, 6).join(', ')}${changedDetails.length > 6 ? '...' : ''}`
            : action.preferredJob
              ? `Oficio ${action.preferredJob} verificado`
              : 'Oficios activos verificados';
        executed.push(summary);
        addLog(state, `Qwen 2.5 ejecutó cambio de oficios — ${summary}.`, 'violet');
        break;
      }
      case 'SET_WEATHER_BIOME': {
        if (action.season) {
          state.season = action.season;
          const autoEnv = getSeasonBiomeAndWeather(action.season);
          state.biome = action.biome ?? autoEnv.biome;
          state.weather = action.weather ?? autoEnv.weather;
        } else {
          if (action.biome) state.biome = action.biome;
          if (action.weather) state.weather = action.weather;
        }
        const envDesc = `${state.season} · clima ${state.weather}`;
        executed.push(`Entorno cambiado a ${envDesc}`);
        addLog(state, `Qwen 2.5 cambió el entorno a ${envDesc}.`, 'sky');
        break;
      }
      case 'GRANT_VILLAGER_ITEMS': {
        const amount = Math.max(1, Math.round(action.amount));
        if (action.resource === 'gold' || action.resource === 'silver') {
          addPreciousMetalToReserve(state, action.resource, amount);
          const bank = state.specialBuildings.find((b) => b.type === 'bank');
          if (bank) bank.storage[action.resource] += amount;
          if (!state.resourcesPaused) {
            const clearMetal = findNearestClearResourceSpot(
              state,
              action.resource,
              MOUNTAIN_MIN_X + 36 + Math.random() * (CANVAS_WIDTH - MOUNTAIN_MIN_X - 72),
              SAFE_LAND_MIN_Y + 24 + Math.random() * (CANVAS_HEIGHT - SAFE_LAND_MIN_Y - 60),
              10,
              true
            );
            state.resources.push({
              id: state.nextId++,
              type: action.resource,
              x: clearMetal.x,
              y: clearMetal.y,
              amount: 6,
              maxAmount: 6,
              depleted: false,
              restTimer: 0,
            });
          }
          executed.push(`+${amount} ${action.resource === 'gold' ? 'Oro 🥇' : 'Plata 🥈'} al respaldo`);
          addLog(state, `Qwen 2.5 otorgó +${amount} ${action.resource === 'gold' ? 'Oro 🥇' : 'Plata 🥈'} a la aldea.`, 'amber');
          break;
        }
        const targets = action.targetName
          ? state.agents.filter((a) =>
              a.name.toLowerCase().startsWith(action.targetName!.split(' ')[0].toLowerCase())
            )
          : state.agents;
        for (const ag of targets) {
          if (action.resource === 'coins') {
            ag.coins += amount;
            state.economyReserve.mintedCoins += amount;
          } else if (action.resource === 'bread') {
            ag.breadCount += amount;
          } else if (action.resource === 'tools') {
            ag.toolsCount += amount;
          } else if (action.resource === 'medicine') {
            ag.medicineCount += amount;
          } else {
            ag.inv[action.resource] += amount;
          }
        }
        if (action.resource === 'coins') {
          state.economyReserve.backedCoinsCapacity = Math.max(
            state.economyReserve.backedCoinsCapacity,
            state.economyReserve.mintedCoins
          );
          recalculateEconomyReserve(state);
        }
        executed.push(`+${amount} ${action.resource} a ${targets.length} aldeano(s)`);
        addLog(state, `Qwen 2.5 entregó +${amount} ${action.resource} a ${targets.length} aldeano(s).`, 'emerald');
        break;
      }
      case 'ADJUST_STAT': {
        const targets = action.targetName
          ? state.agents.filter((a) =>
              a.name.toLowerCase().startsWith(action.targetName!.split(' ')[0].toLowerCase())
            )
          : state.agents;
        if (action.stat === 'knowledge') {
          state.knowledge = Math.max(0, state.knowledge + action.delta);
        } else {
          for (const ag of targets) {
            if (action.stat === 'health') ag.health = clamp(ag.health + action.delta, 1, 100);
            if (action.stat === 'energy') ag.energy = clamp(ag.energy + action.delta, 0, 100);
            if (action.stat === 'happiness') {
              ag.moodModifier = clamp(ag.moodModifier + action.delta, -45, 45);
              ag.happiness = clamp(ag.happiness + action.delta, 0, 100);
              ag.emotion = deriveAgentEmotion(ag, state.weather);
            }
          }
        }
        executed.push(`${action.stat} ${action.delta >= 0 ? '+' : ''}${action.delta}`);
        addLog(state, `Qwen 2.5 ajustó ${action.stat} (${action.delta >= 0 ? '+' : ''}${action.delta}).`, 'sky');
        break;
      }
      case 'RELEASE_PRISONERS': {
        let released = 0;
        for (const ag of state.agents) {
          if (
            ag.jailedDays > 0 &&
            (!action.targetName ||
              ag.name.toLowerCase().startsWith(action.targetName.split(' ')[0].toLowerCase()))
          ) {
            ag.jailedDays = 0;
            ag.thought = 'Fui liberado por orden de Qwen 2.5.';
            released++;
          }
        }
        executed.push(released > 0 ? `${released} detenido(s) liberado(s)` : 'Sin detenidos en cárcel');
        if (released > 0) addLog(state, `Qwen 2.5 liberó a ${released} detenido(s) de la cárcel.`, 'emerald');
        break;
      }
      case 'REPORT_DATA': {
        executed.push('Datos consultados en tiempo real');
        break;
      }
      case 'BOOST_EVOLUTION': {
        state.knowledge += action.knowledgeGain;
        for (const agent of state.agents) {
          if (!agent.isChild) {
            agent.education = clamp(agent.education + Math.round(action.knowledgeGain * 0.25), 0, 100);
            agent.carpentryKnowledge = clamp(agent.carpentryKnowledge + Math.round(action.knowledgeGain * 0.2), 0, 100);
            agent.constructionKnowledge = clamp(agent.constructionKnowledge + Math.round(action.knowledgeGain * 0.2), 0, 100);
            syncAgentSkills(agent);
          }
        }
        const newEra = computeEra(state.knowledge, state.houses);
        if (newEra !== state.era) {
          state.era = newEra;
          addLog(state, `¡La aldea evolucionó a ${ERA_METADATA[newEra].label}!`, 'emerald');
        } else {
          addLog(state, `Impulso científico de Qwen 2.5: +${action.knowledgeGain} de conocimiento.`, 'violet');
        }
        executed.push(`+${action.knowledgeGain} conocimiento evolutivo`);
        break;
      }
      case 'SET_POLICIES': {
        state.policies = { ...state.policies, ...action.patch };
        executed.push('Políticas activas actualizadas');
        break;
      }
      case 'HEAL_VILLAGERS': {
        let healed = 0;
        for (const agent of state.agents) {
          if (agent.isSick || agent.health < 85) {
            if (agent.illness?.incurable) {
              agent.happiness = clamp(agent.happiness + 8, 0, 100);
              agent.moodModifier = clamp(agent.moodModifier + 8, -45, 45);
              continue;
            }
            agent.isSick = false;
            agent.illness = null;
            agent.illnessName = null;
            agent.health = clamp(Math.max(agent.health + 35, 90), 0, 100);
            agent.moodModifier = clamp(agent.moodModifier + 10, -45, 45);
            agent.happiness = clamp(agent.happiness + 12, 0, 100);
            agent.emotion = deriveAgentEmotion(agent, state.weather);
            agent.lastQwenDecision = 'Qwen 2.5 ejecutó campaña médica de recuperación.';
            healed++;
          }
        }
        executed.push(`Atendidos ${healed} aldeano(s)`);
        addLog(state, `Campaña médica de Qwen 2.5: ${healed} aldeano(s) recuperados.`, 'emerald');
        break;
      }
      case 'ADD_VILLAGE_RESOURCES': {
        if (state.resourcesPaused) {
          executed.push('Bloqueado (recursos pausados)');
          break;
        }
        for (let i = 0; i < action.count; i++) {
          const isMetal =
            action.resource === 'stone' ||
            action.resource === 'copper' ||
            action.resource === 'iron' ||
            action.resource === 'gold' ||
            action.resource === 'silver';
          const isForest =
            action.resource === 'wood' || action.resource === 'food';
          const rx = isMetal
            ? MOUNTAIN_MIN_X + 24 + Math.random() * (CANVAS_WIDTH - MOUNTAIN_MIN_X - 60)
            : isForest
              ? 34 + Math.random() * (FOREST_MAX_X - 56)
              : FOREST_MAX_X + 30 + Math.random() * (MOUNTAIN_MIN_X - FOREST_MAX_X - 60);
          const rawY = SAFE_LAND_MIN_Y + 18 + Math.random() * (CANVAS_HEIGHT - SAFE_LAND_MIN_Y - 56);
          const clearSpot = findNearestClearResourceSpot(state, action.resource, rx, rawY, 10, true);
          state.resources.push({
            id: state.nextId++,
            type: action.resource,
            x: clearSpot.x,
            y: clearSpot.y,
            amount: 6,
            maxAmount: 6,
            depleted: false,
            restTimer: 0,
          });
        }
        executed.push(`+${action.count} nodos de ${action.resource}`);
        addLog(state, `Qwen 2.5 generó ${action.count} nodos de ${action.resource}.`, 'amber');
        break;
      }
      case 'ADJUST_VILLAGE_MOOD': {
        for (const agent of state.agents) {
          agent.moodModifier = clamp(agent.moodModifier + action.delta, -45, 45);
          agent.happiness = clamp(agent.happiness + action.delta, 0, 100);
          if (action.thought) agent.thought = action.thought;
          agent.emotion = deriveAgentEmotion(agent, state.weather);
        }
        executed.push(`Ánimo ajustado (${action.delta >= 0 ? '+' : ''}${action.delta})`);
        addLog(state, 'Qwen 2.5 moduló el estado emocional de la aldea.', 'sky');
        break;
      }
      case 'DECLARE_FESTIVAL':
      case 'DIPLOMATIC_TRADE':
      case 'MITIGATE_CRISIS': {
        const msg = dispatchQwenActionExtension(state, action);
        if (msg) executed.push(msg);
        break;
      }
    }
  }

  state.era = computeEra(state.knowledge, state.houses);
  recalculateEconomyReserve(state);
  return executed;
}

export interface ScoredConstructionCandidate {
  kind: ActiveConstruction['kind'];
  specialType?: SpecialBuildingType;
  farmSize?: FarmPlot['size'];
  zone?: 'south' | 'north';
  duration: number;
  score: number;
  reason: string;
}

/**
 * Evaluador dinámico de prioridades de construcción basado en necesidades reales
 * de la aldea (sin orden lineal rígido): salud, alimento, refugio, logística, saber y era.
 */
export function scoreConstructionNeeds(state: SimulationState): ScoredConstructionCandidate[] {
  const candidates: ScoredConstructionCandidate[] = [];
  const pop = Math.max(1, state.agents.length);
  const homelessCount = state.agents.filter((a) => a.houseId === null).length;
  const overcrowded = state.houses.some(
    (h) => state.agents.filter((a) => a.houseId === h.id).length > h.capacity
  );
  const sickCount = state.agents.filter((a) => a.isSick).length;
  const totalFood =
    state.agents.reduce((acc, a) => acc + a.inv.food + a.breadCount, 0) +
    state.houses.reduce((acc, h) => acc + h.storage.food, 0);
  const avgEdu =
    state.agents.reduce((acc, a) => acc + a.education, 0) / Math.max(1, state.agents.length);
  const activeKinds = state.agents
    .map((a) => a.activeConstruction)
    .filter((ac): ac is ActiveConstruction => Boolean(ac));

  const isBeingBuilt = (kind: ActiveConstruction['kind'], specialType?: SpecialBuildingType) =>
    activeKinds.some((ac) => ac.kind === kind && (!specialType || ac.specialType === specialType));

  const nextEraOrder: EraId[] = ['primitive', 'stone', 'wood', 'iron', 'civilization'];
  const nextEraIdx = Math.min(nextEraOrder.length - 1, nextEraOrder.indexOf(state.era) + 1);
  const nextEraMeta = ERA_METADATA[nextEraOrder[nextEraIdx]];
  const needsMoreHousesForEra =
    state.era !== 'civilization' && state.houses.length < nextEraMeta.minHouses;
  const needsKnowledgeForEra =
    state.era !== 'civilization' && state.knowledge < nextEraMeta.minKnowledge;

  // 1. Vivienda
  if (shouldBuildHouse(state) || (needsMoreHousesForEra && state.houses.length < 8)) {
    const zone: 'south' | 'north' =
      isBridgePassable(state) &&
      state.houses.length >= 4 &&
      state.houses.filter((h) => h.zone === 'north').length < 4
        ? 'north'
        : 'south';
    const houseScore = homelessCount > 0 ? 145 : overcrowded ? 132 : 90;
    candidates.push({
      kind: 'house',
      zone,
      duration: 36,
      score: houseScore,
      reason:
        homelessCount > 0
          ? `Construir viviendas urgentes (${homelessCount} sin casa)`
          : 'Ampliar viviendas para avanzar de Era y familias',
    });
  }

  // 2. Parcelas de cultivo (prioridad crítica si escasea el alimento o el río está en veda/reposo)
  const pendingFarms = activeKinds.filter((ac) => ac.kind === 'farm').length;
  const foodCritical = totalFood < pop * 1.6 || state.riverFishStock === 0 || state.weather === 'drought';
  const desiredFarms = foodCritical ? 3 : 2;
  if (state.farms.length + pendingFarms < desiredFarms) {
    candidates.push({
      kind: 'farm',
      farmSize: 'small',
      zone: isBridgePassable(state) && state.farms.length >= 2 ? 'north' : 'south',
      duration: 30,
      score: state.farms.length === 0 ? 134 : foodCritical ? 124 : 96,
      reason: 'Asegurar alimento y levantar parcelas agrícolas para crecer',
    });
  }

  // 3. Edificios especiales evaluados por urgencia contextual
  if (state.houses.length >= 1) {
    const hasBuilding = (t: SpecialBuildingType) =>
      state.specialBuildings.some((b) => b.type === t) || isBeingBuilt('special', t);

    const specialScores: Array<{ type: SpecialBuildingType; score: number; reason: string }> = [];

    if (!hasBuilding('infirmary')) {
      specialScores.push({
        type: 'infirmary',
        score: sickCount > 0 ? 138 : 80,
        reason: sickCount > 0 ? `Construir Hospital (${sickCount} enfermo/s)` : 'Prevenir enfermedades con Hospital',
      });
    }
    if (!hasBuilding('apothecary')) {
      specialScores.push({
        type: 'apothecary',
        score: sickCount > 0 ? 122 : 70,
        reason: 'Producir medicinas en la Botica',
      });
    }
    if (!hasBuilding('bakery')) {
      specialScores.push({
        type: 'bakery',
        score: foodCritical ? 118 : 86,
        reason: 'Multiplicar raciones con Panadería',
      });
    }
    if (!hasBuilding('dock') && state.riverFishStock > 0) {
      specialScores.push({
        type: 'dock',
        score: foodCritical ? 102 : 68,
        reason: 'Aprovechar el río con Muelle Pesquero',
      });
    }
    if (!hasBuilding('general_depot')) {
      specialScores.push({
        type: 'general_depot',
        score: 108,
        reason: 'Centralizar madera, piedra y minerales en Depósito General',
      });
    }
    if (!hasBuilding('carpentry')) {
      specialScores.push({
        type: 'carpentry',
        score: 98,
        reason: 'Reducir costos de vivienda y trabajar maderas finas en Carpintería',
      });
    }
    if (!hasBuilding('school')) {
      specialScores.push({
        type: 'school',
        score: avgEdu < 55 || needsKnowledgeForEra ? 94 : 76,
        reason: 'Acelerar Saber General y skills en la Escuela',
      });
    }
    if (!hasBuilding('forge')) {
      specialScores.push({
        type: 'forge',
        score: state.era === 'wood' || state.era === 'iron' ? 91 : 78,
        reason: 'Forjar herramientas y lingotes en la Forja',
      });
    }
    if (!hasBuilding('market')) {
      specialScores.push({
        type: 'market',
        score: 83,
        reason: 'Impulsar intercambio y comercio en el Mercado',
      });
    }
    if (!hasBuilding('bank')) {
      const precious = state.economyReserve.goldReserve + state.economyReserve.silverReserve;
      specialScores.push({
        type: 'bank',
        score: precious >= 4 ? 75 : 64,
        reason: 'Habilitar créditos e impuestos en Banco Central',
      });
    }
    if (!hasBuilding('police_station')) {
      const lawActive = state.laws.some((l) => l.active);
      const wildBeasts = state.animals.some((a) => a.type === 'bear' || a.type === 'wildcat');
      specialScores.push({
        type: 'police_station',
        score: lawActive || wildBeasts ? 92 : 66,
        reason: 'Proteger la aldea y hacer cumplir leyes con Comisaría',
      });
    }
    if (!hasBuilding('town_hall')) {
      specialScores.push({
        type: 'town_hall',
        score: pop >= 12 ? 77 : 62,
        reason: 'Consolidar gobernanza cívica en Ayuntamiento',
      });
    }
    if (!hasBuilding('prison')) {
      specialScores.push({
        type: 'prison',
        score: hasBuilding('police_station') ? 63 : 52,
        reason: 'Completar sistema de justicia con Cárcel',
      });
    }

    for (const entry of specialScores) {
      if (hasAvailableOperatorForBuilding(state, entry.type)) {
        candidates.push({
          kind: 'special',
          specialType: entry.type,
          duration: 38,
          score: entry.score,
          reason: entry.reason,
        });
      }
    }
  }

  // 4. Puente Fluvial y Plaza Central
  if (state.bridge === null && (state.houses.length >= 2 || state.knowledge >= 18) && !isBeingBuilt('bridge')) {
    const southNodesLeft = state.resources.filter(
      (r) => !r.depleted && r.amount > 0 && r.y >= SAFE_LAND_MIN_Y
    ).length;
    candidates.push({
      kind: 'bridge',
      duration: 44,
      score: southNodesLeft < 18 ? 104 : 88,
      reason: 'Unir Zona Sur y Zona Norte con Puente Fluvial',
    });
  }
  if (state.plaza === null && state.houses.length >= 2 && !isBeingBuilt('plaza')) {
    candidates.push({
      kind: 'plaza',
      duration: 42,
      score: 84,
      reason: 'Construir Plaza Central para cohesión y cultura',
    });
  }

  // 5. Mejoras de viviendas y edificios existentes
  if (state.houses.some((h) => h.level < ERA_METADATA[state.era].maxHouseLevel)) {
    candidates.push({
      kind: 'upgrade_house',
      duration: 36,
      score: overcrowded ? 88 : 68,
      reason: 'Mejorar viviendas existentes a nivel superior',
    });
  }
  for (const sb of state.specialBuildings) {
    if (sb.level < 3 && !isBeingBuilt('upgrade_special', sb.type)) {
      candidates.push({
        kind: 'upgrade_special',
        specialType: sb.type,
        duration: 40,
        score: 60,
        reason: `Mejorar ${sb.name} a Nivel ${sb.level + 1}`,
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

export type ConstructionPlanResult = ReturnType<typeof validateAndComputeConstructionPlan>;

export function planBestConstructionProject(
  state: SimulationState,
  builder: Agent
): {
  topGoal: { candidate: ScoredConstructionCandidate; plan: ConstructionPlanResult } | null;
  bestBuildable: { candidate: ScoredConstructionCandidate; plan: ConstructionPlanResult } | null;
} {
  const scored = scoreConstructionNeeds(state);
  const depots = getOperationalDepots(state);
  const canAffordCost = (cost: ResourceCostMap): boolean => {
    for (const [rawKey, rawNeed] of Object.entries(cost)) {
      const key = rawKey as keyof ResourceInventory;
      const need = rawNeed ?? 0;
      if (need <= 0) continue;
      const avail = builder.inv[key] + depots.reduce((acc, d) => acc + d.storage[key], 0);
      if (avail < need) return false;
    }
    return true;
  };

  let topGoal: { candidate: ScoredConstructionCandidate; plan: ConstructionPlanResult } | null = null;
  let bestBuildable: { candidate: ScoredConstructionCandidate; plan: ConstructionPlanResult } | null = null;

  for (const candidate of scored) {
    const plan = validateAndComputeConstructionPlan(state, builder, candidate.kind, {
      zone: candidate.zone,
      farmSize: candidate.farmSize,
      specialType: candidate.specialType,
    });
    if (!plan.ok) continue;
    if (!topGoal) topGoal = { candidate, plan };
    if (canAffordCost(plan.cost)) {
      bestBuildable = { candidate, plan };
      break;
    }
  }

  return { topGoal, bestBuildable };
}

/**
 * Actualiza partidas guardadas de versiones anteriores o aldeas estancadas/al borde
 * de la extinción sin obligar al usuario a pulsar "Reiniciar".
 */
export function migrateAndRecoverVillageState(state: SimulationState): {
  migrated: boolean;
  rescued: boolean;
  notes: string[];
} {
  const notes: string[] = [];
  const prevVersion = state.schemaVersion ?? 1;
  let migrated = false;
  let rescued = false;

  if (prevVersion < CURRENT_SCHEMA_VERSION) {
    state.schemaVersion = CURRENT_SCHEMA_VERSION;
    state.policies = {
      ...state.policies,
      buildPriority: true,
      workFocus: true,
      evolutionFocus: true,
    };
    migrated = true;
    notes.push('Políticas de progreso continuo activadas en partida heredada.');
  } else {
    state.schemaVersion = CURRENT_SCHEMA_VERSION;
  }

  // Limpiar obras trabadas de versiones viejas o constructores que cambiaron de oficio
  for (const agent of state.agents) {
    if (!Number.isFinite(agent.taskTimer) || agent.taskTimer > 80) {
      agent.taskTimer = 0;
    }
    if (agent.activeConstruction && agent.job !== 'Constructor') {
      cancelActiveConstruction(state, agent, 'recuperación de partida guardada');
      notes.push(`Obra pendiente de ${agent.name} reintegrada al depósito.`);
    }
  }

  // Reparar nodos marcados como depleted por error cuando aún tienen cantidad > 0
  for (const node of state.resources) {
    if (node.amount > 0 && node.depleted) {
      node.depleted = false;
      node.restTimer = 0;
    }
  }

  // Asegurar Representante permanente bajo Qwen 2.5:3b
  relocateBlockedResourcesAndAnimals(state);
  const rep = ensureQwenControlledRepresentative(state);
  if (rep) {
    runQwenRepresentativeAutonomousTurn(state);
  }

  // Rescate anti-extinción para partidas heredadas críticamente bajas
  const livingAdults = state.agents.filter((a) => !a.isChild && a.ageYears >= 15);
  const totalFood =
    state.agents.reduce((acc, a) => acc + a.inv.food + a.breadCount, 0) +
    state.houses.reduce((acc, h) => acc + h.storage.food, 0);
  const activeFoodNodes = state.resources.filter(
    (r) => r.type === 'food' && !r.depleted && r.amount > 0
  ).length;

  if (livingAdults.length > 0 && (livingAdults.length <= 3 || (totalFood === 0 && activeFoodNodes === 0 && state.farms.length === 0))) {
    state.policies.reproductionRestraint = false;
    state.resourcesPaused = false;
    if (activeFoodNodes === 0) {
      for (const r of state.resources) {
        if (r.type === 'food') {
          r.amount = Math.max(4, Math.round(r.maxAmount * 0.5));
          r.depleted = false;
          r.restTimer = 0;
        }
      }
    }
    for (const a of livingAdults) {
      if (a.hunger > 85) a.hunger = 65;
    }
    rescued = true;
    notes.push('Protocolo anti-extinción activado por el Representante Qwen 2.5.');
  }

  if (migrated || rescued) {
    addLog(
      state,
      migrated
        ? 'Partida actualizada al motor dinámico v2 conservando todo tu progreso.'
        : 'Protocolo anti-extinción aplicado automáticamente para recuperar la aldea.',
      'sky'
    );
  }

  return { migrated, rescued, notes };
}

export const QWEN_SKIN_TONES = ['#fde2c4', '#f5cba7', '#e0ac69', '#c68642', '#9f6334', '#784421'] as const;
export const QWEN_HAIR_STYLES: Agent['hairStyle'][] = ['short', 'long', 'mohawk', 'curly', 'ponytail', 'bald'];
export const QWEN_HAIR_COLORS = ['#181412', '#4a2c18', '#8c5229', '#d4a359', '#b84228', '#cbd5e1', '#2563eb', '#7c3aed'] as const;
export const QWEN_SHIRT_PALETTE = [
  '#3b82f6',
  '#2563eb',
  '#ef4444',
  '#dc2626',
  '#10b981',
  '#059669',
  '#f59e0b',
  '#d97706',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#14b8a6',
  '#f97316',
  '#6366f1',
] as const;

const QWEN_JOB_OUTFIT_PALETTES: Partial<Record<JobType, readonly string[]>> = {
  Agricultor: ['#10b981', '#059669', '#84cc16', '#d97706'],
  Recolector: ['#10b981', '#14b8a6', '#f59e0b', '#84cc16'],
  Leñador: ['#dc2626', '#b45309', '#059669', '#f97316'],
  Minero: ['#2563eb', '#d97706', '#f97316', '#475569'],
  Constructor: ['#f59e0b', '#ea580c', '#2563eb', '#d97706'],
  Carpintero: ['#d97706', '#92400e', '#10b981', '#3b82f6'],
  Pescador: ['#06b6d4', '#2563eb', '#14b8a6', '#f59e0b'],
  Panadero: ['#f59e0b', '#ef4444', '#ec4899', '#d97706'],
  Herrero: ['#dc2626', '#ea580c', '#7c3aed', '#334155'],
  Artesano: ['#ec4899', '#8b5cf6', '#14b8a6', '#f97316'],
  Comerciante: ['#6366f1', '#8b5cf6', '#059669', '#ec4899'],
  Banquero: ['#2563eb', '#6366f1', '#1e293b', '#8b5cf6'],
  Curandero: ['#14b8a6', '#10b981', '#06b6d4', '#3b82f6'],
  Boticario: ['#14b8a6', '#8b5cf6', '#059669', '#06b6d4'],
  Erudito: ['#6366f1', '#7c3aed', '#2563eb', '#0f766e'],
  Maestro: ['#7c3aed', '#2563eb', '#dc2626', '#059669'],
  Comisario: ['#2563eb', '#1d4ed8', '#3b82f6', '#475569'],
  Guardián: ['#dc2626', '#b91c1c', '#2563eb', '#ea580c'],
  Alcalde: ['#7c3aed', '#2563eb', '#d97706', '#dc2626'],
  Aprendiz: ['#3b82f6', '#ec4899', '#10b981', '#f59e0b'],
};

function pickLeastUsedOption<T extends string>(
  pool: readonly T[],
  existingValues: string[],
  seed: number
): T {
  const counts = new Map<string, number>();
  for (const val of existingValues) {
    counts.set(val, (counts.get(val) ?? 0) + 1);
  }
  let best = pool[Math.abs(seed) % pool.length];
  let bestScore = Infinity;
  for (let i = 0; i < pool.length; i++) {
    const candidate = pool[(Math.abs(seed) + i) % pool.length];
    const score = (counts.get(candidate) ?? 0) * 10 + i * 0.01;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

/**
 * Qwen 2.5:3b elige combinaciones variadas y coherentes de vestimenta, pelo y tono de piel
 * considerando oficio, rasgos, genética familiar (si nace) y diversidad global de la aldea.
 */
export function assignQwenAppearanceSetup(
  state: SimulationState,
  agent: Agent,
  options?: {
    reason?: string;
    preserveSkin?: boolean;
    parents?: [Agent | null, Agent | null];
  }
): string {
  const others = state.agents.filter((a) => a.id !== agent.id);
  const seed = agent.id * 7 + state.day * 3 + agent.ageYears;

  if (!options?.preserveSkin) {
    const p1 = options?.parents?.[0];
    const p2 = options?.parents?.[1];
    if (p1 || p2) {
      const parentSkins = [p1?.skin, p2?.skin].filter((s): s is string => Boolean(s));
      const baseIdx = QWEN_SKIN_TONES.indexOf(
        (parentSkins[agent.id % parentSkins.length] ?? QWEN_SKIN_TONES[0]) as (typeof QWEN_SKIN_TONES)[number]
      );
      const delta = agent.id % 3 === 0 ? 1 : agent.id % 3 === 1 ? -1 : 0;
      const idx = clamp((baseIdx >= 0 ? baseIdx : 2) + delta, 0, QWEN_SKIN_TONES.length - 1);
      agent.skin = QWEN_SKIN_TONES[idx];
    } else {
      agent.skin = pickLeastUsedOption(
        QWEN_SKIN_TONES,
        others.map((a) => a.skin),
        seed
      );
    }
  }

  const jobPool = QWEN_JOB_OUTFIT_PALETTES[agent.job] ?? QWEN_SHIRT_PALETTE;
  const seasonalPool =
    state.season === 'Invierno'
      ? [...jobPool, '#2563eb', '#dc2626', '#6366f1']
      : state.season === 'Primavera'
        ? [...jobPool, '#10b981', '#ec4899', '#06b6d4']
        : jobPool;
  agent.shirt = pickLeastUsedOption(
    seasonalPool,
    others.map((a) => a.shirt),
    seed + 5
  );

  const hairPool: Agent['hairStyle'][] = agent.isChild
    ? ['short', 'long', 'curly', 'ponytail']
    : agent.sex === 'F'
      ? ['long', 'ponytail', 'curly', 'short']
      : ['short', 'curly', 'mohawk', 'ponytail', 'bald', 'long'];
  agent.hairStyle = pickLeastUsedOption(
    hairPool,
    others.map((a) => a.hairStyle),
    seed + 11
  );

  const p1 = options?.parents?.[0];
  const p2 = options?.parents?.[1];
  const naturalHairPalette = QWEN_HAIR_COLORS.slice(0, 6);
  const fullHairPalette =
    agent.traits?.includes('curioso') || agent.id % 9 === 0
      ? QWEN_HAIR_COLORS
      : naturalHairPalette;
  if ((p1 || p2) && agent.id % 2 === 0) {
    agent.hairColor = p1?.hairColor ?? p2?.hairColor ?? fullHairPalette[seed % fullHairPalette.length];
  } else {
    agent.hairColor = pickLeastUsedOption(
      fullHairPalette,
      others.map((a) => a.hairColor),
      seed + 17
    );
  }

  const reason = options?.reason ?? 'criterio visual de aldea';
  const summary = `Qwen 2.5:3b estilizó a ${agent.name} (${agent.hairStyle}, vestimenta ${agent.shirt}, ${reason})`;
  agent.lastQwenDecision = summary;
  return summary;
}

export function applyQwenAutonomousStylingTurn(
  state: SimulationState,
  maxUpdates = 2
): string[] {
  if (state.agents.length === 0) return [];
  const notes: string[] = [];
  let updated = 0;

  // Asegurar diversidad de vestimenta/pelo sin cambiar la piel existente en adultos establecidos
  const shirtCounts = new Map<string, number>();
  for (const a of state.agents) {
    shirtCounts.set(a.shirt, (shirtCounts.get(a.shirt) ?? 0) + 1);
  }

  for (const ag of state.agents) {
    if (updated >= maxUpdates) break;
    const duplicates = shirtCounts.get(ag.shirt) ?? 0;
    const needsSeasonalRefresh =
      duplicates >= 3 || (state.day % 12 === 0 && (ag.id + state.day) % Math.max(3, state.agents.length) === 0);
    if (needsSeasonalRefresh) {
      shirtCounts.set(ag.shirt, Math.max(0, duplicates - 1));
      assignQwenAppearanceSetup(state, ag, {
        reason: `temporada ${state.season} / ${ag.job}`,
        preserveSkin: true,
      });
      shirtCounts.set(ag.shirt, (shirtCounts.get(ag.shirt) ?? 0) + 1);
      notes.push(`Estilo ${ag.name}`);
      updated++;
    }
  }
  return notes;
}

export function getBuildingOccupancySnapshot(state: SimulationState): {
  badges: BuildingOccupantBadge[];
  insideAgentIds: Set<number>;
} {
  const badges: BuildingOccupantBadge[] = [];
  const insideAgentIds = new Set<number>();

  // 1. Casas ocupadas por aldeanos que descansan o guardan bienes dentro
  for (const house of state.houses) {
    const occupants = state.agents.filter(
      (a) =>
        !insideAgentIds.has(a.id) &&
        a.houseId === house.id &&
        a.jailedDays <= 0 &&
        ((a.taskType === 'sleep' && Math.hypot(a.x - house.x, a.y - (house.y + 12)) <= 26) ||
          (a.taskType === 'store_home' && Math.hypot(a.x - house.x, a.y - (house.y + 10)) <= 20))
    );
    if (occupants.length === 0) continue;

    const bottomY = Math.round(
      house.y + (house.size === 'large' ? 16 : house.size === 'medium' ? 13 : 11)
    );
    const step = occupants.length > 4 ? 10 : 12;
    const startX = house.x - ((occupants.length - 1) * step) / 2;
    occupants.forEach((ag, idx) => {
      insideAgentIds.add(ag.id);
      badges.push({
        agentId: ag.id,
        buildingKind: 'house',
        buildingId: house.id,
        x: Math.round(startX + idx * step),
        y: bottomY,
      });
    });
  }

  // 2. Edificios especiales (comercios, banco, comisaría, cárcel, escuela, etc.), EXCLUYENDO el Muelle ('dock')
  const prisons = state.specialBuildings.filter((b) => b.type === 'prison');
  for (const b of state.specialBuildings) {
    if (b.type === 'dock') continue;

    let occupants: Agent[] = [];
    if (b.type === 'prison') {
      occupants = state.agents.filter((a) => {
        if (insideAgentIds.has(a.id) || a.jailedDays <= 0) return false;
        if (prisons.length <= 1) return true;
        let closest = prisons[0];
        let bestD = Math.hypot(a.x - closest.x, a.y - closest.y);
        for (const p of prisons) {
          const d = Math.hypot(a.x - p.x, a.y - p.y);
          if (d < bestD) {
            bestD = d;
            closest = p;
          }
        }
        return closest.id === b.id;
      });
    } else {
      occupants = state.agents.filter((a) => {
        if (insideAgentIds.has(a.id) || a.jailedDays > 0) return false;
        if (a.taskType === 'manage_building' && a.assignedBuildingId === b.id) {
          return Math.hypot(a.x - b.x, a.y - (b.y + 12)) <= 30;
        }
        if (a.taskType === 'trade') {
          const nearBuilding = Math.hypot(a.x - b.x, a.y - b.y) <= 28;
          if (!nearBuilding) return false;
          if (a.assignedBuildingId !== null) return a.assignedBuildingId === b.id;
          return (
            b.type === 'market' ||
            b.type === 'bank' ||
            b.type === 'bakery' ||
            b.type === 'carpentry' ||
            b.type === 'forge' ||
            b.type === 'apothecary'
          );
        }
        if (a.taskType === 'craft_tools' && (b.type === 'forge' || b.type === 'carpentry')) {
          return Math.hypot(a.x - b.x, a.y - (b.y + 10)) <= 28;
        }
        if (a.taskType === 'research' && b.type === 'school') {
          return Math.hypot(a.x - b.x, a.y - b.y) <= 32;
        }
        return false;
      });
    }

    if (occupants.length === 0) continue;
    const bottomY = Math.round(b.y + (b.isOperational ? 16 : 11));
    const step = occupants.length > 4 ? 10 : 12;
    const startX = b.x - ((occupants.length - 1) * step) / 2;
    occupants.forEach((ag, idx) => {
      insideAgentIds.add(ag.id);
      badges.push({
        agentId: ag.id,
        buildingKind: 'special',
        buildingId: b.id,
        buildingType: b.type,
        x: Math.round(startX + idx * step),
        y: bottomY,
      });
    });
  }

  return { badges, insideAgentIds };
}

export function getBuildingOccupantHeadBadges(state: SimulationState): BuildingOccupantBadge[] {
  return getBuildingOccupancySnapshot(state).badges;
}

export function getInsideBuildingAgentIds(state: SimulationState): Set<number> {
  return getBuildingOccupancySnapshot(state).insideAgentIds;
}



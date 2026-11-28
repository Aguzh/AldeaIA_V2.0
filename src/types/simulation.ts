export type BiomeType = 'grassland' | 'forest' | 'arid' | 'tundra';
export type WeatherType = 'sunny' | 'rain' | 'drought' | 'storm' | 'thunderstorm';
export type SeasonType = 'Primavera' | 'Verano' | 'Otoño' | 'Invierno';
export type LayoutMode = 'auto' | 'vertical' | 'horizontal';

export type DivineTool =
  | 'inspect'
  | 'add_road'
  | 'food'
  | 'wood'
  | 'pine_wood'
  | 'maple_wood'
  | 'oak_wood'
  | 'stone'
  | 'copper'
  | 'iron'
  | 'gold'
  | 'silver'
  | 'coins'
  | 'knowledge'
  | 'kill_crop'
  | 'lightning_storm'
  | 'start_fire'
  | 'heal'
  | 'infect'
  | 'sterilize'
  | 'kill';

export type JobType =
  | 'Aprendiz'
  | 'Recolector'
  | 'Agricultor'
  | 'Pescador'
  | 'Leñador'
  | 'Carpintero'
  | 'Minero'
  | 'Constructor'
  | 'Curandero'
  | 'Maestro'
  | 'Erudito'
  | 'Comerciante'
  | 'Banquero'
  | 'Panadero'
  | 'Herrero'
  | 'Artesano'
  | 'Boticario'
  | 'Guardián'
  | 'Alcalde'
  | 'Comisario'
  | 'Almacenero';

export type TaskType =
  | 'idle'
  | 'eat'
  | 'sleep'
  | 'gather_food'
  | 'farm_crops'
  | 'fish_river'
  | 'tend_livestock'
  | 'gather_wood'
  | 'gather_stone'
  | 'gather_copper'
  | 'gather_iron'
  | 'gather_gold'
  | 'gather_silver'
  | 'craft_tools'
  | 'manage_building'
  | 'caravan'
  | 'repair_building'
  | 'extinguish_fire'
  | 'store_home'
  | 'deliver_materials'
  | 'build_house'
  | 'upgrade_house'
  | 'build_plaza'
  | 'build_bridge'
  | 'plant_farm'
  | 'build_special'
  | 'heal_other'
  | 'research'
  | 'trade'
  | 'socialize';

export type EmotionType =
  | 'happy'
  | 'excited'
  | 'content'
  | 'neutral'
  | 'sad'
  | 'depressed'
  | 'love'
  | 'scared'
  | 'sick';

export type EraId = 'primitive' | 'stone' | 'wood' | 'iron' | 'civilization';

export type SpecialBuildingType =
  | 'infirmary'
  | 'school'
  | 'market'
  | 'bank'
  | 'forge'
  | 'bakery'
  | 'carpentry'
  | 'apothecary'
  | 'dock'
  | 'general_depot'
  | 'town_hall'
  | 'police_station'
  | 'prison';

export type WoodGrade = 'pine' | 'maple' | 'oak';

export type AnimalType =
  | 'cat'
  | 'dog'
  | 'wildcat'
  | 'bear'
  | 'fish'
  | 'chicken'
  | 'cow'
  | 'horse'
  | 'sheep';

export type FishVariant = 'trout' | 'salmon' | 'goldfish' | 'catfish';

export type DiseaseId = 'gripe' | 'dolor_estomacal' | 'pulmonia' | 'sepsis' | 'cancer';

export interface DiseaseInfo {
  id: DiseaseId;
  name: string;
  dangerPct: number;
  baseChancePct: number;
  incurable: boolean;
  daysInfected: number;
  fatalAfterDays: number | null;
}

export interface PregnancyState {
  partnerId: number;
  daysRemaining: number;
  conceptionDay: number;
}

export type JobMasteryTier = 'operario' | 'comerciante' | 'maestro';

export type VillageLawId =
  | 'ban_trade_wood'
  | 'ban_fishing'
  | 'ban_trade_bread'
  | 'ban_mine_gold'
  | 'winter_rationing'
  | 'night_watch'
  | 'mining_priority';

export interface VillageLaw {
  id: VillageLawId;
  name: string;
  description: string;
  active: boolean;
  proposedBy: string;
  enactedDay: number | null;
}

export type PetitionEffectType =
  | 'wealth'
  | 'health_aid'
  | 'housing_materials'
  | 'food_supply'
  | 'knowledge_boost'
  | 'morale_blessing'
  | 'negative_overwork'
  | 'negative_ration_cut';

export interface VillagePetition {
  id: number;
  representativeId: number;
  representativeName: string;
  kind: 'peticion' | 'consulta' | 'queja';
  isNegative: boolean;
  effectType?: PetitionEffectType;
  effectSummary?: string;
  title: string;
  message: string;
  createdDay: number;
}

export interface FireHazard {
  id: number;
  x: number;
  y: number;
  intensity: number;
  targetKind: 'house' | 'special' | 'forest' | 'farm';
  targetId?: number;
  cause: string;
}

export interface BankLoan {
  id: number;
  borrowerId: number;
  borrowerName: string;
  amount: number;
  remaining: number;
  interestPct: number;
  purpose: string;
  issuedDay: number;
}

export interface Animal {
  id: number;
  type: AnimalType;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hostile: boolean;
  tamed: boolean;
  ownerId: number | null;
  hp: number;
  maxHp: number;
  foodYield: number;
  milkReady: number; // 0..100 para vacas
  woolReady: number; // 0..100 para ovejas
  fishVariant?: FishVariant;
  riderId: number | null;
  cooldown: number;
  walkFrame: number;
}

export interface ResourceInventory {
  food: number;
  wood: number;
  pineWood: number;
  mapleWood: number;
  oakWood: number;
  stone: number;
  copper: number;
  iron: number;
  gold: number;
  silver: number;
}

export interface HouseStorage extends ResourceInventory {
  coins: number;
  milk: number;
  bread: number;
  tools: number;
  medicine: number;
}

export interface SkillDefinition {
  id: string;
  minKnowledgePct: number;
  name: string;
  description: string;
}

export type RoadType = 'dirt' | 'stone' | 'reinforced';

export type MaintenanceStatus =
  | 'ok'
  | 'debt_warning'
  | 'deteriorating'
  | 'half_efficiency'
  | 'inoperative'
  | 'ruined';

export type ConstructionOperationType =
  | 'construccion'
  | 'mejora'
  | 'reparacion'
  | 'mantenimiento'
  | 'cancelacion'
  | 'produccion'
  | 'extraccion_deposito'
  | 'deposito'
  | 'camino';

export type ResourceCostMap = Partial<Record<keyof ResourceInventory, number>>;

export interface ResourceOperationRecord {
  id: number;
  day: number;
  actorName: string;
  targetName: string;
  operationType: ConstructionOperationType;
  materials: ResourceCostMap;
  source: string;
  result: string;
}

export interface ActiveConstruction {
  id: number;
  kind:
    | 'house'
    | 'upgrade_house'
    | 'plaza'
    | 'bridge'
    | 'farm'
    | 'special'
    | 'upgrade_special'
    | 'road';
  targetId?: number;
  specialType?: SpecialBuildingType;
  houseSize?: 'small' | 'medium' | 'large';
  farmSize?: 'small' | 'medium' | 'large';
  zone?: 'south' | 'north';
  roadType?: RoadType;
  withLamp?: boolean;
  x: number;
  y: number;
  totalDuration: number;
  elapsed: number;
  reservedMaterials: ResourceCostMap;
  fromPersonal: ResourceCostMap;
  fromDepot: ResourceCostMap;
  carpentryWoodConsumed: number;
}

export interface EconomyReserve {
  goldReserve: number;
  silverReserve: number;
  backedCoinsCapacity: number;
  mintedCoins: number;
  bankLoanPool: number;
  taxRatePct: number;
  lastTaxCollectedDay: number;
}

export type PersonalityTrait =
  | 'ambicioso'
  | 'solidario'
  | 'perezoso'
  | 'inteligente'
  | 'conservador'
  | 'curioso'
  | 'agresivo'
  | 'sociable'
  | 'independiente'
  | 'trabajador'
  | 'comerciante'
  | 'generoso';

export interface AgentMemory {
  id: number;
  day: number;
  kind: 'helped' | 'harmed' | 'mentor' | 'family' | 'conflict' | 'work' | 'trauma' | 'milestone';
  summary: string;
  actorName?: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface Agent {
  id: number;
  name: string;
  sex: 'M' | 'F';
  x: number;
  y: number;
  ageYears: number;
  generation?: number;
  traits?: PersonalityTrait[];
  memories?: AgentMemory[];
  isRetired?: boolean;
  aptitudeBonus?: Partial<Record<JobType, number>>;
  isChild: boolean;
  isElder: boolean;
  hunger: number;
  energy: number;
  health: number;
  isSick: boolean;
  illnessName: string | null;
  illness: DiseaseInfo | null;
  happiness: number;
  education: number; // 0..100 Saber general (único editable por el jugador; desbloquea 25 skills)
  carpentryKnowledge: number; // 0..100 progresivo en Carpintería (10% Pino, 50% Arce, 80% Roble)
  constructionKnowledge: number; // 0..100 progresivo en Construcción
  jobMastery: Partial<Record<JobType, number>>; // 0..100 por oficio (<=30 Operario, 31-70 Comerciante, >70 Maestro máx 3)
  skills: string[];
  mentorId: number | null;
  loanDebt: number;
  jailedDays: number;
  isRepresentative: boolean;
  isSterile: boolean;
  wantsChildren: boolean;
  pregnancy: PregnancyState | null;
  coins: number;
  inv: ResourceInventory;
  milkCount: number;
  breadCount: number;
  toolsCount: number;
  medicineCount: number;
  job: JobType;
  houseId: number | null;
  assignedBuildingId: number | null;
  mountedHorseId: number | null;
  skin: string;
  shirt: string;
  hairStyle: 'short' | 'long' | 'mohawk' | 'curly' | 'ponytail' | 'bald';
  hairColor: string;
  partnerId: number | null;
  exPartnerIds: number[];
  parents: string | null;
  childrenCount: number;
  emotion: EmotionType;
  talkingTimer: number;
  lastDialogue: string | null;
  lastQwenDecision: string | null;
  qwenPlan: string;
  taskType: TaskType;
  taskTimer: number;
  taskTargetId: number | null;
  activity: string;
  thought: string;
  importance: number;
  walkFrame: number;
  reproductionCooldown: number;
  moodModifier: number;
  activeConstruction?: ActiveConstruction | null;
  familyId?: string;
  motherId?: number | null;
  fatherId?: number | null;
  birthDay?: number;
  jobsHeld?: JobType[];
  discoveriesAuthored?: string[];
  knownDiscoveries?: string[];
}

export interface House {
  id: number;
  name: string;
  x: number;
  y: number;
  zone: 'south' | 'north';
  size: 'small' | 'medium' | 'large';
  level: 1 | 2 | 3 | 4;
  capacity: number; // Chica: 4, Mediana: 6, Grande: 8
  comfortBonus: number;
  durability: number; // 0..100
  unpaidMaintenanceDays: number;
  maintenanceDebtCount: number;
  maintenanceStatus: MaintenanceStatus;
  lastMaintenanceDay: number;
  builderName: string;
  storage: HouseStorage; // Las viviendas solo almacenan Alimento (food) y Monedas (coins)
}

export interface SpecialBuilding {
  id: number;
  type: SpecialBuildingType;
  name: string;
  category: 'hospital' | 'school' | 'commerce' | 'civic' | 'depot';
  x: number;
  y: number;
  level: number;
  builderName: string;
  ownerId: number | null;
  forSale: boolean;
  price: number;
  durability: number; // 0..100
  unpaidMaintenanceDays: number;
  maintenanceDebtCount: number;
  maintenanceStatus: MaintenanceStatus;
  lastMaintenanceDay: number;
  efficiencyMultiplier: number; // 1 normal, 0.5 a 90d sin mant., 0 si inoperativo
  staffIds: number[];
  isOperational: boolean;
  allowedStorage: Array<keyof HouseStorage>;
  storage: HouseStorage;
}

export interface PlazaStructure {
  x: number;
  y: number;
  builderName: string;
  builtDay: number;
  durability: number;
  unpaidMaintenanceDays: number;
  maintenanceDebtCount: number;
  maintenanceStatus: MaintenanceStatus;
  lastMaintenanceDay: number;
}

export interface BridgeStructure {
  x: number;
  builderName: string;
  builtDay: number;
  durability: number;
  unpaidMaintenanceDays: number;
  maintenanceDebtCount: number;
  maintenanceStatus: MaintenanceStatus;
  lastMaintenanceDay: number;
}

export interface FarmPlot {
  id: number;
  x: number;
  y: number;
  size: 'small' | 'medium' | 'large';
  growth: number;
  cropName: string;
  durability: number;
  unpaidMaintenanceDays: number;
  maintenanceDebtCount: number;
  maintenanceStatus: MaintenanceStatus;
  lastMaintenanceDay: number;
}

export interface RoadTile {
  id: number;
  x: number;
  y: number;
  roadType: RoadType;
  hasLamp: boolean;
  lit: boolean;
  durability: number;
}

export interface ResourceNode {
  id: number;
  type:
    | 'food'
    | 'wood'
    | 'pine_wood'
    | 'maple_wood'
    | 'oak_wood'
    | 'stone'
    | 'copper'
    | 'iron'
    | 'gold'
    | 'silver'
    | 'coins';
  x: number;
  y: number;
  amount: number;
  maxAmount: number;
  depleted: boolean;
  restTimer: number;
}

export interface LogEntry {
  id: number;
  day: number;
  text: string;
  tone: 'emerald' | 'amber' | 'rose' | 'sky' | 'violet' | 'slate';
}

export interface DaySnapshot {
  day: number;
  population: number;
  avgHealth: number;
  avgHappiness: number;
  houses: number;
  knowledge: number;
  totalCoins: number;
}

export interface QwenPolicyState {
  buildPriority: boolean;
  workFocus: boolean;
  evolutionFocus: boolean;
  economyFocus: boolean;
  farmingFocus: boolean;
  reproductionRestraint: boolean;
  healthPriority: boolean;
  allowPartnerSwitch: boolean;
  moodDirective: 'neutral' | 'optimistic' | 'disciplined';
}

export interface QwenMessage {
  id: number;
  role: 'user' | 'qwen';
  text: string;
  appliedRules?: string[];
  source: 'ollama' | 'local' | 'cloud' | 'none';
  providerLabel?: string;
}

export interface OllamaConfig {
  enabled: boolean;
  url: string;
  model: string;
}

export type AIModality = 'ollama_qwen' | 'local_other' | 'cloud' | 'none';
export type CloudAIProvider = 'gemini' | 'openai' | 'anthropic' | 'custom_openai';
export type LocalAIProtocol = 'ollama' | 'openai_compatible';
export type AIHealthStatus = 'connected' | 'ready' | 'fallback' | 'disabled' | 'error';

export interface AIProviderConfig {
  modality: AIModality;
  localProtocol: LocalAIProtocol;
  localUrl: string;
  localModel: string;
  cloudProvider: CloudAIProvider;
  cloudModel: string;
  cloudEndpoint?: string;
  temperature: number;
  timeoutMs: number;
  maxRetries: number;
  autoFallback: boolean;
  status: AIHealthStatus;
  lastError: string | null;
  consecutiveFailures: number;
  lastLatencyMs?: number;
}

export type InterventionMode = 'observer' | 'intervention' | 'advanced';
export type ConstructionSpeedMode = 'normal' | 'accelerated' | 'instant';

export interface DivineMultipliers {
  production: number;
  learning: number;
  constructionMode: ConstructionSpeedMode;
  fertility: number;
  aging: number;
}

export interface MarketPrices {
  food: number;
  bread: number;
  wood: number;
  stone: number;
  copper: number;
  iron: number;
  tools: number;
  medicine: number;
  inflationIndex: number;
}

export interface VillagePolitics {
  approvalRating: number;
  legitimacy: number;
  protestsCount: number;
  corruptionRisk: number;
  termStartDay: number;
  lastElectionDay: number;
}

export interface EvolutionStats {
  natural: {
    births: number;
    constructions: number;
    knowledgeGained: number;
    resourcesGathered: number;
    lawsEnacted: number;
    tradesCompleted: number;
  };
  divine: {
    resourcesGranted: number;
    villagersSpawned: number;
    knowledgeGranted: number;
    instantBuildings: number;
    disastersTriggered: number;
    healsGranted: number;
    economicInterventions: number;
  };
}

export interface RepresentativeGoals {
  shortTerm: string;
  mediumTerm: string;
  longTerm: string;
  lastUpdatedDay: number;
}

export type ChronicleCategory =
  | 'natural'
  | 'divine'
  | 'politics'
  | 'economy'
  | 'crisis'
  | 'social'
  | 'family'
  | 'technology'
  | 'culture'
  | 'environment'
  | 'health'
  | 'architecture'
  | 'diplomacy';

export interface ChronicleArchiveEntry {
  id: number;
  day: number;
  year: number;
  category: ChronicleCategory;
  text: string;
}

export interface MilestoneStatus {
  id: string;
  title: string;
  description: string;
  achieved: boolean;
  achievedDay: number | null;
  origin: 'natural' | 'mixed' | 'divine';
}

export type FamilyInfluenceTier = 'emergente' | 'consolidada' | 'influyente' | 'histórica';

export interface FamilyLineage {
  id: string;
  surname: string;
  founderIds: number[];
  founderNames: string[];
  foundedDay: number;
  currentGeneration: number;
  livingMemberIds: number[];
  historicalMemberIds: number[];
  totalDescendants: number;
  predominantJobs: JobType[];
  totalCoins: number;
  influenceScore: number;
  influenceTier: FamilyInfluenceTier;
  notableEvents: string[];
}

export interface HistoricalFigure {
  id: number;
  agentId: number;
  name: string;
  familyId?: string;
  generation: number;
  birthDay: number;
  deathDay: number | null;
  roleTitle: string;
  reason: string;
  era: EraId;
  job: JobType;
  achievements: string[];
}

export type TraditionOrigin =
  | 'harvest'
  | 'founding'
  | 'figure'
  | 'epidemic'
  | 'construction'
  | 'nature'
  | 'divine';

export interface CulturalTradition {
  id: string;
  name: string;
  description: string;
  origin: TraditionOrigin;
  foundedDay: number;
  generationBorn: number;
  intervalDays: number;
  lastCelebratedDay: number | null;
  foodCost: number;
  coinCost: number;
  happinessBonus: number;
  tradeBonus: number;
  socialBonus: number;
  status: 'active' | 'abandoned';
  celebrationsCount: number;
}

export interface CulturalFestival {
  id: number;
  traditionId: string;
  name: string;
  dayStarted: number;
  daysRemaining: number;
  foodSpent: number;
  coinsSpent: number;
  attendanceCount: number;
}

export interface CulturalBelief {
  id: string;
  name: string;
  description: string;
  originEvent: string;
  foundedDay: number;
  adoptionPct: number;
}

export interface CultureState {
  traditions: CulturalTradition[];
  activeFestival: CulturalFestival | null;
  beliefs: CulturalBelief[];
  identityTag: string;
}

export type DiscoveryCategory =
  | 'agricultura'
  | 'oficio'
  | 'medicina'
  | 'economia'
  | 'ingenieria'
  | 'sociedad';

export interface DiscoveryRecord {
  id: string;
  name: string;
  era: EraId;
  category: DiscoveryCategory;
  description: string;
  requirementsSummary: string;
  benefitsSummary: string;
  costTradeoffSummary: string;
  authorId: number | null;
  authorName: string;
  authorJob: JobType | 'Aldea';
  discoveredDay: number;
  knownByAgentIds: number[];
  diffusionPct: number;
  status: 'emergent' | 'diffused';
}

export type DiplomaticRelation = 'desconocidos' | 'neutrales' | 'comerciales' | 'aliados' | 'hostiles';

export type TradeGoodKey = 'food' | 'wood' | 'stone' | 'copper' | 'iron' | 'tools' | 'medicine' | 'bread';

export interface ExternalCommunity {
  id: string;
  name: string;
  populationApprox: number;
  era: EraId;
  biome: BiomeType;
  distanceKm: number;
  direction: 'Norte' | 'Sur' | 'Este' | 'Oeste';
  resources: Partial<Record<TradeGoodKey, number>>;
  needs: TradeGoodKey[];
  coinReserve: number;
  relation: DiplomaticRelation;
  trust: number;
  lastContactDay: number | null;
  tradeAgreements: number;
  knowledgeShared: number;
}

export interface ExternalTradeRecord {
  id: number;
  day: number;
  communityId: string;
  communityName: string;
  kind: 'import' | 'export' | 'knowledge' | 'diplomacy';
  good?: TradeGoodKey;
  amount: number;
  coinsDelta: number;
  summary: string;
}

export type SystemicCrisisKind =
  | 'drought'
  | 'frost'
  | 'flood'
  | 'blight'
  | 'famine_risk'
  | 'epidemic'
  | 'mine_collapse'
  | 'material_scarcity';

export interface ActiveSystemicCrisis {
  id: string;
  kind: SystemicCrisisKind;
  title: string;
  severity: number; // 0..100
  daysActive: number;
  mitigationScore: number; // 0..100
  causeChain: string;
  mitigatedBy: string[];
}

export interface CrisisMonitorState {
  activeCrises: ActiveSystemicCrisis[];
  foodReserveDays: number;
  droughtStreakDays: number;
  scarcityAlert: boolean;
  epidemicAlert: boolean;
  lastEvaluationDay: number;
}

export type DistrictKind = 'residencial' | 'comercial' | 'industrial' | 'agricola' | 'civico';

export interface DistrictZone {
  id: string;
  kind: DistrictKind;
  label: string;
  x: number;
  y: number;
  radius: number;
  buildingCount: number;
}

export interface SocietyIndicators {
  happiness: number;
  security: number;
  governmentTrust: number;
  qualityOfLife: number;
  economicInequality: number;
  educationAccess: number;
  healthcareAccess: number;
  socialStability: number;
  migrationPull: number;
}

export interface SocietyHistoryPoint {
  day: number;
  qualityOfLife: number;
  happiness: number;
  security: number;
  governmentTrust: number;
  economicInequality: number;
}

export interface AgentBiography {
  agentId: number;
  name: string;
  familyId?: string;
  generation: number;
  birthDay: number;
  deathDay: number | null;
  alive: boolean;
  primaryJob: JobType;
  jobsHeld: JobType[];
  keySkills: string[];
  discoveries: string[];
  spouseNames: string[];
  childrenCount: number;
  notableDeeds: string[];
  isHistoricalFigure: boolean;
}

export interface DecadeSummary {
  decadeNumber: number;
  startYear: number;
  endYear: number;
  startDay: number;
  endDay: number;
  populationStart: number;
  populationEnd: number;
  births: number;
  deaths: number;
  constructions: number;
  discoveriesCount: number;
  festivalsCount: number;
  crisesCount: number;
  summaryText: string;
  aiNarrated?: boolean;
}

export interface EnginePerformanceStats {
  lastTickMs: number;
  avgTickMs: number;
  activeAgents: number;
  offscreenAgents: number;
  lodTier: 'full' | 'balanced' | 'high_pop';
  eventsProcessed: number;
  dailyAggregateMs: number;
}

export type SelectedEntity =
  | { kind: 'agent'; id: number }
  | { kind: 'house'; id: number }
  | { kind: 'special'; id: number }
  | { kind: 'farm'; id: number }
  | { kind: 'animal'; id: number }
  | { kind: 'plaza' }
  | { kind: 'bridge' };

export interface FloatingEffect {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  ttl: number;
  maxTtl: number;
}

export type SoundCue = 'chatter' | 'celebration' | 'sadness' | 'thunder' | 'build';

export interface SimulationState {
  schemaVersion?: number;
  day: number;
  minute: number;
  speed: 0 | 1 | 2 | 4;
  resourcesPaused: boolean;
  season: SeasonType;
  layoutMode: LayoutMode;
  biome: BiomeType;
  weather: WeatherType;
  tool: DivineTool;
  selectedRoadType: RoadType;
  selectedRoadLamp: boolean;
  roadMaintenanceLastDay: number;
  roadUnpaidMaintenanceDays: number;
  selectedAgentId: number | null;
  selectedEntity: SelectedEntity | null;
  highlightFamilyAgentId: number | null;
  knowledge: number;
  era: EraId;
  economyReserve: EconomyReserve;
  riverFishStock: number;
  riverFishMaxStock: number;
  riverFishRestTimer: number;
  laws: VillageLaw[];
  fires: FireHazard[];
  loans: BankLoan[];
  representativeAgentId: number | null;
  representativeLastActedMinute?: number;
  representativeGoal?: string;
  representativeGoals?: RepresentativeGoals;
  petitionTimerSec: number;
  pendingPetition: VillagePetition | null;
  qwenAutoRespondPetitions: boolean;
  autoPausedByPetition: boolean;
  previousSpeedBeforePetition: 0 | 1 | 2 | 4;
  lightningFlashTimer: number;
  lastCouncilDay: number;
  nextId: number;
  agents: Agent[];
  houses: House[];
  specialBuildings: SpecialBuilding[];
  plaza: PlazaStructure | null;
  bridge: BridgeStructure | null;
  farms: FarmPlot[];
  roads: RoadTile[];
  resources: ResourceNode[];
  animals: Animal[];
  rainDrops: Array<{ x: number; y: number; s: number }>;
  history: DaySnapshot[];
  policies: QwenPolicyState;
  ollama: OllamaConfig;
  aiConfig?: AIProviderConfig;
  interventionMode?: InterventionMode;
  divineMultipliers?: DivineMultipliers;
  marketPrices?: MarketPrices;
  politics?: VillagePolitics;
  ecosystemHealth?: number;
  evolutionStats?: EvolutionStats;
  chronicleArchive?: ChronicleArchiveEntry[];
  milestones?: MilestoneStatus[];
  activeDisaster?: {
    kind: 'frost' | 'flood' | 'blight' | 'abundance';
    daysRemaining: number;
    description: string;
  } | null;
  logs: LogEntry[];
  resourceLedger: ResourceOperationRecord[];
  qwenMessages: QwenMessage[];
  floatingEffects: FloatingEffect[];
  pendingSounds?: SoundCue[];
  familyLineages?: FamilyLineage[];
  historicalFigures?: HistoricalFigure[];
  culture?: CultureState;
  discoveries?: DiscoveryRecord[];
  externalCommunities?: ExternalCommunity[];
  externalTradeHistory?: ExternalTradeRecord[];
  crisisMonitor?: CrisisMonitorState;
  districts?: DistrictZone[];
  societyIndicators?: SocietyIndicators;
  societyHistory?: SocietyHistoryPoint[];
  biographies?: AgentBiography[];
  decadeSummaries?: DecadeSummary[];
  perfStats?: EnginePerformanceStats;
}

export type QwenAction =
  | { type: 'BUILD_HOUSES'; count: number; zone?: 'south' | 'north' }
  | { type: 'UPGRADE_HOUSES'; count: number }
  | { type: 'BUILD_PLAZA' }
  | { type: 'BUILD_BRIDGE' }
  | { type: 'BUILD_SPECIAL'; buildingType: SpecialBuildingType }
  | { type: 'UPGRADE_SPECIAL'; buildingType: SpecialBuildingType }
  | { type: 'PLANT_CROPS'; count: number; zone?: 'south' | 'north'; farmSize?: 'small' | 'medium' | 'large' }
  | { type: 'KILL_CROPS' }
  | { type: 'ADD_ROADS'; roadType?: RoadType; withLamp?: boolean }
  | { type: 'GENERATE_ECONOMY' }
  | { type: 'ALLOW_MORE_VILLAGERS'; spawnCount?: number; encouragePregnancies?: boolean }
  | {
      type: 'ASSIGN_ACTIVE_JOBS';
      preferredJob?: JobType;
      count?: number;
      fraction?: number;
      fromJob?: JobType;
      forceChange?: boolean;
    }
  | {
      type: 'DIRECT_VILLAGER';
      agentName: string;
      job?: JobType;
      action?: 'heal' | 'build' | 'trade' | 'research' | 'switch_partner' | 'fish' | 'store_home';
    }
  | { type: 'SPAWN_ANIMAL'; animalType: AnimalType; count: number }
  | { type: 'BOOST_EVOLUTION'; knowledgeGain: number }
  | { type: 'SET_POLICIES'; patch: Partial<QwenPolicyState> }
  | { type: 'HEAL_VILLAGERS' }
  | {
      type: 'ADD_VILLAGE_RESOURCES';
      resource: 'food' | 'wood' | 'stone' | 'copper' | 'iron' | 'gold' | 'silver';
      count: number;
    }
  | {
      type: 'GRANT_VILLAGER_ITEMS';
      resource: keyof ResourceInventory | 'coins' | 'bread' | 'tools' | 'medicine';
      amount: number;
      targetName?: string;
    }
  | {
      type: 'ADJUST_STAT';
      stat: 'knowledge' | 'health' | 'energy' | 'happiness';
      delta: number;
      targetName?: string;
    }
  | { type: 'SET_WEATHER_BIOME'; weather?: WeatherType; biome?: BiomeType; season?: SeasonType }
  | { type: 'RELEASE_PRISONERS'; targetName?: string }
  | { type: 'REPORT_DATA'; answer: string }
  | { type: 'PAUSE_RESOURCES'; paused: boolean }
  | { type: 'ADJUST_VILLAGE_MOOD'; delta: number; thought?: string }
  | { type: 'TOGGLE_LAW'; lawId: VillageLawId; active: boolean }
  | { type: 'TRIGGER_LIGHTNING_STORM' }
  | { type: 'TRIGGER_FIRE' }
  | { type: 'ELECT_REPRESENTATIVE' }
  | { type: 'ISSUE_BANK_LOANS' }
  | { type: 'FORM_MENTORSHIPS' }
  | { type: 'REPAIR_BUILDINGS' }
  | { type: 'RUN_CARAVANS' }
  | {
      type: 'STYLE_VILLAGERS';
      targetName?: string;
      shirt?: string;
      hairStyle?: Agent['hairStyle'];
      hairColor?: string;
      skin?: string;
    }
  | { type: 'DECLARE_FESTIVAL'; traditionName?: string }
  | {
      type: 'DIPLOMATIC_TRADE';
      communityId?: string;
      kind?: 'import' | 'export' | 'knowledge';
      good?: TradeGoodKey;
      amount?: number;
    }
  | { type: 'MITIGATE_CRISIS' };

export interface BuildingOccupantBadge {
  agentId: number;
  buildingKind: 'house' | 'special';
  buildingId: number;
  buildingType?: SpecialBuildingType;
  x: number;
  y: number;
}


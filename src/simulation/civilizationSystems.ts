import type {
  Agent,
  AgentMemory,
  ChronicleArchiveEntry,
  DivineMultipliers,
  EvolutionStats,
  JobType,
  MarketPrices,
  MilestoneStatus,
  PersonalityTrait,
  RepresentativeGoals,
  SimulationState,
  VillagePolitics,
} from '../types/simulation';
import { addLog, clamp, computeSeason, DAYS_PER_YEAR, electRepresentative, repairDamagedStructures } from './rules';

export const ALL_PERSONALITY_TRAITS: PersonalityTrait[] = [
  'ambicioso',
  'solidario',
  'perezoso',
  'inteligente',
  'conservador',
  'curioso',
  'agresivo',
  'sociable',
  'independiente',
  'trabajador',
  'comerciante',
  'generoso',
];

export const PERSONALITY_LABELS: Record<PersonalityTrait, string> = {
  ambicioso: 'Ambicioso',
  solidario: 'Solidario',
  perezoso: 'Perezoso',
  inteligente: 'Inteligente',
  conservador: 'Conservador',
  curioso: 'Curioso',
  agresivo: 'Agresivo',
  sociable: 'Sociable',
  independiente: 'Independiente',
  trabajador: 'Trabajador',
  comerciante: 'Comerciante',
  generoso: 'Generoso',
};

const CONFLICTING_TRAITS: Partial<Record<PersonalityTrait, PersonalityTrait[]>> = {
  trabajador: ['perezoso'],
  perezoso: ['trabajador', 'ambicioso'],
  solidario: ['agresivo'],
  generoso: ['ambicioso'],
  agresivo: ['solidario', 'generoso'],
  curioso: ['conservador'],
  conservador: ['curioso'],
};

export function createDefaultMultipliers(): DivineMultipliers {
  return {
    production: 1,
    learning: 1,
    constructionMode: 'normal',
    fertility: 1,
    aging: 1,
  };
}

export function createDefaultMarketPrices(): MarketPrices {
  return {
    food: 2,
    bread: 4,
    wood: 2,
    stone: 3,
    copper: 5,
    iron: 7,
    tools: 14,
    medicine: 12,
    inflationIndex: 1,
  };
}

export function createDefaultPolitics(day = 1): VillagePolitics {
  return {
    approvalRating: 72,
    legitimacy: 78,
    protestsCount: 0,
    corruptionRisk: 6,
    termStartDay: day,
    lastElectionDay: day,
  };
}

export function createDefaultEvolutionStats(): EvolutionStats {
  return {
    natural: {
      births: 0,
      constructions: 0,
      knowledgeGained: 0,
      resourcesGathered: 0,
      lawsEnacted: 0,
      tradesCompleted: 0,
    },
    divine: {
      resourcesGranted: 0,
      villagersSpawned: 0,
      knowledgeGranted: 0,
      instantBuildings: 0,
      disastersTriggered: 0,
      healsGranted: 0,
      economicInterventions: 0,
    },
  };
}

export function createDefaultRepresentativeGoals(day = 1): RepresentativeGoals {
  return {
    shortTerm: 'Reunir alimento, madera y construir las primeras viviendas.',
    mediumTerm: 'Establecer cultivos, depósito general y talleres de oficios.',
    longTerm: 'Crecer en población, educación e instituciones sostenibles.',
    lastUpdatedDay: day,
  };
}

export function createDefaultMilestones(): MilestoneStatus[] {
  return [
    {
      id: 'first_settlement',
      title: 'Primeros Hogares',
      description: 'Construir al menos 3 viviendas operativas para los fundadores.',
      achieved: false,
      achievedDay: null,
      origin: 'natural',
    },
    {
      id: 'three_winters',
      title: 'Superar 3 Inviernos',
      description: 'Mantener la civilización viva más allá del Año 3 (Día 360).',
      achieved: false,
      achievedDay: null,
      origin: 'natural',
    },
    {
      id: 'self_sufficient_economy',
      title: 'Economía Autosuficiente',
      description: 'Contar con Banco, Mercado y Depósito General operativos.',
      achieved: false,
      achievedDay: null,
      origin: 'natural',
    },
    {
      id: 'high_education',
      title: 'Sociedad Ilustrada',
      description: 'Alcanzar 65+ de Saber colectivo con Escuela operativa.',
      achieved: false,
      achievedDay: null,
      origin: 'natural',
    },
    {
      id: 'all_institutions',
      title: 'Todas las Instituciones',
      description: 'Tener Ayuntamiento, Hospital, Escuela, Banco, Mercado y Comisaría.',
      achieved: false,
      achievedDay: null,
      origin: 'natural',
    },
    {
      id: 'pop_100',
      title: 'Metrópoli de 100 Almas',
      description: 'Alcanzar 100 habitantes vivos en la aldea.',
      achieved: false,
      achievedDay: null,
      origin: 'natural',
    },
    {
      id: 'century_survival',
      title: 'Siglo de Historia',
      description: 'Sobrevivir 100 años de calendario (12.000 días).',
      achieved: false,
      achievedDay: null,
      origin: 'natural',
    },
    {
      id: 'sustainable_ecosystem',
      title: 'Ecosistema Sostenible',
      description: 'Mantener la salud del ecosistema ≥ 75% tras 60 días.',
      achieved: false,
      achievedDay: null,
      origin: 'natural',
    },
  ];
}

export function assignInitialTraits(seed: number): PersonalityTrait[] {
  const first = ALL_PERSONALITY_TRAITS[Math.abs(seed) % ALL_PERSONALITY_TRAITS.length];
  const blocked = new Set(CONFLICTING_TRAITS[first] ?? []);
  blocked.add(first);
  const candidates = ALL_PERSONALITY_TRAITS.filter((t) => !blocked.has(t));
  const second = candidates[Math.abs(seed * 7 + 3) % candidates.length];
  return [first, second];
}

export function inheritTraitsFromParents(
  parentA: Agent | null | undefined,
  parentB: Agent | null | undefined,
  seed: number
): PersonalityTrait[] {
  const pool: PersonalityTrait[] = [];
  if (parentA?.traits?.length) pool.push(parentA.traits[0]);
  if (parentB?.traits?.length) pool.push(parentB.traits[parentB.traits.length - 1]);
  const inherited = pool.length > 0 ? pool[Math.abs(seed) % pool.length] : ALL_PERSONALITY_TRAITS[Math.abs(seed) % ALL_PERSONALITY_TRAITS.length];
  const blocked = new Set(CONFLICTING_TRAITS[inherited] ?? []);
  blocked.add(inherited);
  const candidates = ALL_PERSONALITY_TRAITS.filter((t) => !blocked.has(t));
  const second = candidates[Math.abs(seed * 11 + 5) % candidates.length];
  return [inherited, second];
}

export function getAgentTraits(agent: Agent): PersonalityTrait[] {
  if (Array.isArray(agent.traits) && agent.traits.length > 0) return agent.traits;
  return assignInitialTraits(agent.id);
}

export function getTraitWorkMultiplier(agent: Agent): number {
  const traits = getAgentTraits(agent);
  let mult = 1;
  if (traits.includes('trabajador')) mult += 0.18;
  if (traits.includes('ambicioso')) mult += 0.08;
  if (traits.includes('perezoso')) mult -= 0.18;
  if (traits.includes('independiente')) mult += 0.05;
  if (agent.isRetired) mult -= 0.2;
  return clamp(mult, 0.55, 1.45);
}

export function getTraitLearningMultiplier(agent: Agent): number {
  const traits = getAgentTraits(agent);
  let mult = 1;
  if (traits.includes('inteligente')) mult += 0.28;
  if (traits.includes('curioso')) mult += 0.24;
  if (traits.includes('conservador')) mult -= 0.08;
  if (traits.includes('perezoso')) mult -= 0.1;
  const jobAptitude = agent.aptitudeBonus?.[agent.job] ?? 0;
  mult += jobAptitude;
  return clamp(mult, 0.7, 1.8);
}

export function getTraitTradeMultiplier(agent: Agent): number {
  const traits = getAgentTraits(agent);
  let mult = 1;
  if (traits.includes('comerciante')) mult += 0.22;
  if (traits.includes('ambicioso')) mult += 0.1;
  if (traits.includes('generoso')) mult -= 0.05;
  return clamp(mult, 0.8, 1.4);
}

export function getTraitDefenseBonus(agent: Agent): number {
  const traits = getAgentTraits(agent);
  return traits.includes('agresivo') ? 6 : traits.includes('independiente') ? 3 : 0;
}

export function recordAgentMemory(
  state: SimulationState,
  agent: Agent,
  kind: AgentMemory['kind'],
  summary: string,
  impact: AgentMemory['impact'] = 'neutral',
  actorName?: string
): void {
  if (!Array.isArray(agent.memories)) agent.memories = [];
  const last = agent.memories[0];
  if (last && last.summary === summary && state.day - last.day < 2) return;
  agent.memories.unshift({
    id: state.nextId++,
    day: state.day,
    kind,
    summary,
    actorName,
    impact,
  });
  if (agent.memories.length > 20) {
    agent.memories = agent.memories.slice(0, 20);
  }
}

export function archiveChronicleEvent(
  state: SimulationState,
  category: ChronicleArchiveEntry['category'],
  text: string
): void {
  if (!Array.isArray(state.chronicleArchive)) state.chronicleArchive = [];
  const year = Math.floor((Math.max(1, state.day) - 1) / DAYS_PER_YEAR) + 1;
  state.chronicleArchive.unshift({
    id: state.nextId++,
    day: state.day,
    year,
    category,
    text,
  });
  if (state.chronicleArchive.length > 300) {
    state.chronicleArchive = state.chronicleArchive.slice(0, 300);
  }
}

export function trackNaturalProgress(
  state: SimulationState,
  field: keyof EvolutionStats['natural'],
  amount = 1
): void {
  if (!state.evolutionStats) state.evolutionStats = createDefaultEvolutionStats();
  state.evolutionStats.natural[field] += amount;
}

export function trackDivineIntervention(
  state: SimulationState,
  field: keyof EvolutionStats['divine'],
  amount = 1,
  chronicleText?: string
): void {
  if (!state.evolutionStats) state.evolutionStats = createDefaultEvolutionStats();
  state.evolutionStats.divine[field] += amount;
  if (chronicleText) {
    archiveChronicleEvent(state, 'divine', chronicleText);
  }
}

export function ensureCivilizationDefaults(state: SimulationState): void {
  if (!state.interventionMode) state.interventionMode = 'intervention';
  if (!state.divineMultipliers) state.divineMultipliers = createDefaultMultipliers();
  if (!state.marketPrices) state.marketPrices = createDefaultMarketPrices();
  if (!state.politics) state.politics = createDefaultPolitics(state.day);
  if (typeof state.ecosystemHealth !== 'number') state.ecosystemHealth = 86;
  if (!state.evolutionStats) state.evolutionStats = createDefaultEvolutionStats();
  if (!state.representativeGoals) state.representativeGoals = createDefaultRepresentativeGoals(state.day);
  if (!Array.isArray(state.chronicleArchive)) state.chronicleArchive = [];
  if (!Array.isArray(state.milestones) || state.milestones.length === 0) {
    state.milestones = createDefaultMilestones();
  }
  if (state.activeDisaster === undefined) state.activeDisaster = null;

  for (const agent of state.agents) {
    if (!Array.isArray(agent.traits) || agent.traits.length === 0) {
      agent.traits = assignInitialTraits(agent.id);
    }
    if (!Array.isArray(agent.memories)) {
      agent.memories = [];
    }
    if (typeof agent.generation !== 'number' || agent.generation < 1) {
      agent.generation = agent.parents ? 2 : 1;
    }
    if (typeof agent.isRetired !== 'boolean') {
      agent.isRetired = agent.ageYears >= 65;
    }
    if (!agent.aptitudeBonus) {
      agent.aptitudeBonus = {};
    }
  }
}

export function applyGenerationAptitude(
  child: Agent,
  parentA: Agent | null | undefined,
  parentB: Agent | null | undefined
): void {
  const aptitude: Partial<Record<JobType, number>> = {};
  if (parentA && !parentA.isChild) {
    aptitude[parentA.job] = (aptitude[parentA.job] ?? 0) + 0.2;
  }
  if (parentB && !parentB.isChild) {
    aptitude[parentB.job] = Math.min(0.35, (aptitude[parentB.job] ?? 0) + 0.15);
  }
  child.aptitudeBonus = aptitude;
  const maxGen = Math.max(parentA?.generation ?? 1, parentB?.generation ?? 1);
  child.generation = maxGen + 1;
}

export function applyRetirementAndAgingModifiers(state: SimulationState): void {
  for (const agent of state.agents) {
    if (agent.ageYears >= 65 && !agent.isRetired) {
      agent.isRetired = true;
      if (agent.job === 'Minero' || agent.job === 'Leñador' || agent.job === 'Constructor') {
        agent.job = agent.education >= 40 ? 'Maestro' : 'Erudito';
        agent.thought = 'Me jubilé de trabajos pesados y ahora transmito mi saber.';
        recordAgentMemory(state, agent, 'milestone', `Jubilación a los ${agent.ageYears} años`, 'positive');
      }
    }
    // Personalidades solidarias ayudan a vecinos enfermos cercanos diariamente
    const traits = getAgentTraits(agent);
    if (traits.includes('solidario') && !agent.isSick && !agent.isChild && agent.inv.food > 1) {
      const hungryNeighbor = state.agents.find(
        (other) => other.id !== agent.id && other.hunger >= 65 && Math.hypot(other.x - agent.x, other.y - agent.y) < 120
      );
      if (hungryNeighbor) {
        agent.inv.food -= 1;
        hungryNeighbor.inv.food += 1;
        recordAgentMemory(state, hungryNeighbor, 'helped', `${agent.name} compartió comida conmigo`, 'positive', agent.name);
        recordAgentMemory(state, agent, 'helped', `Ayudé con comida a ${hungryNeighbor.name}`, 'positive', hungryNeighbor.name);
      }
    }
  }
}

export function updateDynamicMarketPrices(state: SimulationState): void {
  ensureCivilizationDefaults(state);
  const prices = state.marketPrices!;
  const pop = Math.max(1, state.agents.length);

  const totalFood =
    state.agents.reduce((s, a) => s + a.inv.food + a.breadCount, 0) +
    state.houses.reduce((s, h) => s + h.storage.food, 0);
  const depots = state.specialBuildings.filter((b) => b.type === 'general_depot' || b.type === 'market');
  const totalWood =
    state.agents.reduce((s, a) => s + a.inv.wood + a.inv.pineWood, 0) +
    depots.reduce((s, d) => s + d.storage.wood, 0);
  const totalStone =
    state.agents.reduce((s, a) => s + a.inv.stone, 0) +
    depots.reduce((s, d) => s + d.storage.stone, 0);
  const totalCopper =
    state.agents.reduce((s, a) => s + a.inv.copper, 0) +
    depots.reduce((s, d) => s + d.storage.copper, 0);
  const totalIron =
    state.agents.reduce((s, a) => s + a.inv.iron, 0) +
    depots.reduce((s, d) => s + d.storage.iron, 0);

  const circulatingCoins =
    state.agents.reduce((s, a) => s + a.coins, 0) +
    state.houses.reduce((s, h) => s + h.storage.coins, 0);
  const backingCap = Math.max(40, state.economyReserve.backedCoinsCapacity);
  const inflation = clamp(circulatingCoins / backingCap, 0.85, 2.2);
  prices.inflationIndex = Number(inflation.toFixed(2));

  const scarcityPrice = (stock: number, targetPerCapita: number, base: number) => {
    const ratio = stock / Math.max(1, pop * targetPerCapita);
    const mult = clamp(1.35 - ratio * 0.45, 0.55, 2.3) * (0.7 + inflation * 0.3);
    return Math.max(1, Math.round(base * mult));
  };

  prices.food = scarcityPrice(totalFood, 2.2, 2);
  prices.bread = scarcityPrice(totalFood, 1.8, 4);
  prices.wood = scarcityPrice(totalWood, 2.0, 2);
  prices.stone = scarcityPrice(totalStone, 1.5, 3);
  prices.copper = scarcityPrice(totalCopper, 0.8, 5);
  prices.iron = scarcityPrice(totalIron, 0.8, 7);
  prices.tools = Math.max(8, Math.round((prices.copper + prices.iron) * 1.15));
  prices.medicine = Math.max(8, Math.round(12 * (state.agents.some((a) => a.isSick) ? 1.25 : 0.95) * inflation));
}

export function updateEcosystemHealth(state: SimulationState): void {
  ensureCivilizationDefaults(state);
  const activeNodes = state.resources.filter((r) => !r.depleted && r.amount > 0).length;
  const totalNodes = Math.max(1, state.resources.length);
  const nodeRatio = activeNodes / totalNodes;
  const fishRatio = state.riverFishStock / Math.max(1, state.riverFishMaxStock);
  const livestockCount = state.animals.filter(
    (a) => a.type === 'cow' || a.type === 'sheep' || a.type === 'chicken' || a.type === 'horse'
  ).length;
  const overgrazingPenalty = Math.max(0, livestockCount - Math.max(12, state.farms.length * 4 + 8)) * 1.4;
  const weatherBonus = state.weather === 'rain' ? 4 : state.weather === 'drought' ? -6 : 0;
  const firePenalty = state.fires.length * 4;

  const targetHealth = clamp(
    Math.round(nodeRatio * 55 + fishRatio * 30 + 15 + weatherBonus - overgrazingPenalty - firePenalty),
    5,
    100
  );
  state.ecosystemHealth = Math.round((state.ecosystemHealth ?? 85) * 0.75 + targetHealth * 0.25);
}

export function updateVillagePolitics(state: SimulationState): void {
  ensureCivilizationDefaults(state);
  const pol = state.politics!;
  const pop = Math.max(1, state.agents.length);
  const avgHappiness = state.agents.reduce((s, a) => s + a.happiness, 0) / pop;
  const homeless = state.agents.filter((a) => a.houseId === null).length;
  const sick = state.agents.filter((a) => a.isSick).length;
  const taxPenalty = Math.max(0, state.economyReserve.taxRatePct - 8) * 1.8;

  const targetApproval = clamp(
    Math.round(avgHappiness * 0.72 + (1 - homeless / pop) * 18 + (1 - sick / pop) * 10 - taxPenalty),
    5,
    100
  );
  pol.approvalRating = Math.round(pol.approvalRating * 0.7 + targetApproval * 0.3);
  pol.legitimacy = clamp(Math.round(pol.approvalRating * 0.8 + (state.specialBuildings.some((b) => b.type === 'town_hall' && b.isOperational) ? 18 : 6)), 10, 100);

  if (pol.approvalRating < 32 && state.day - pol.lastElectionDay >= 15 && state.agents.length >= 4) {
    pol.protestsCount += 1;
    pol.lastElectionDay = state.day;
    const prevId = state.representativeAgentId;
    const nextRep = electRepresentative(state);
    if (nextRep && nextRep.id !== prevId) {
      pol.termStartDay = state.day;
      pol.approvalRating = Math.max(52, pol.approvalRating + 18);
      const msg = `Protesta ciudadana por baja aprobación: ${nextRep.name} asumió tras elecciones de emergencia.`;
      addLog(state, msg, 'amber');
      archiveChronicleEvent(state, 'politics', msg);
    }
  }
}

export function updateRepresentativeThreeTierGoals(state: SimulationState): void {
  ensureCivilizationDefaults(state);
  const totalFood =
    state.agents.reduce((acc, a) => acc + a.inv.food + a.breadCount, 0) +
    state.houses.reduce((acc, h) => acc + h.storage.food, 0);
  const homeless = state.agents.filter((a) => a.houseId === null).length;
  const sick = state.agents.filter((a) => a.isSick).length;

  let shortTerm = 'Mantener reservas alimentarias y tareas diarias estables.';
  if (state.fires.length > 0) {
    shortTerm = `Extinguir ${state.fires.length} incendio(s) activo(s) de inmediato.`;
  } else if (sick >= 2) {
    shortTerm = `Atender ${sick} aldeano(s) enfermo(s) y producir medicinas.`;
  } else if (totalFood < state.agents.length * 1.4) {
    shortTerm = 'Aumentar recolección, pesca y cosechas de alimento.';
  } else if (homeless > 0) {
    shortTerm = `Construir viviendas para ${homeless} aldeano(s) sin techo.`;
  }

  let mediumTerm = 'Consolidar talleres de carpintería, forja y caminos.';
  if (state.farms.length < 2) {
    mediumTerm = 'Ampliar parcelas de cultivo antes del próximo invierno.';
  } else if (!state.specialBuildings.some((b) => b.type === 'general_depot')) {
    mediumTerm = 'Levantar Depósito General y formar aprendices.';
  } else if (!state.specialBuildings.some((b) => b.type === 'market')) {
    mediumTerm = 'Expandir Mercado, Banco y rutas de caravanas.';
  }

  let longTerm = 'Alcanzar autosuficiencia institucional y nuevas generaciones.';
  if (state.era === 'primitive' || state.era === 'stone') {
    longTerm = 'Elevar Saber colectivo y avanzar hacia la Era de Hierro y Civilización.';
  } else if (state.agents.length < 25) {
    longTerm = 'Impulsar natalidad sostenible, educación escolar y longevidad.';
  }

  state.representativeGoals = {
    shortTerm,
    mediumTerm,
    longTerm,
    lastUpdatedDay: state.day,
  };
  state.representativeGoal = shortTerm;
}

export function evaluateMilestones(state: SimulationState): void {
  ensureCivilizationDefaults(state);
  const milestones = state.milestones!;
  const stats = state.evolutionStats!;
  const divineScore =
    stats.divine.resourcesGranted +
    stats.divine.villagersSpawned * 3 +
    stats.divine.instantBuildings * 5 +
    stats.divine.knowledgeGranted;
  const naturalScore =
    stats.natural.births * 3 +
    stats.natural.constructions * 5 +
    stats.natural.resourcesGathered +
    stats.natural.knowledgeGained;
  const origin: MilestoneStatus['origin'] =
    divineScore === 0 ? 'natural' : divineScore > naturalScore ? 'divine' : 'mixed';

  const mark = (id: string, condition: boolean) => {
    const m = milestones.find((item) => item.id === id);
    if (m && !m.achieved && condition) {
      m.achieved = true;
      m.achievedDay = state.day;
      m.origin = origin;
      const msg = `Logro desbloqueado: ${m.title} (Día ${state.day}).`;
      addLog(state, msg, 'emerald');
      archiveChronicleEvent(state, 'natural', msg);
    }
  };

  const hasOp = (t: string) => state.specialBuildings.some((b) => b.type === t && b.isOperational);
  mark('first_settlement', state.houses.length >= 3);
  mark('three_winters', state.day >= DAYS_PER_YEAR * 3 && state.agents.length > 0);
  mark('self_sufficient_economy', hasOp('bank') && hasOp('market') && hasOp('general_depot'));
  mark('high_education', state.knowledge >= 65 && hasOp('school'));
  mark(
    'all_institutions',
    hasOp('town_hall') && hasOp('infirmary') && hasOp('school') && hasOp('bank') && hasOp('market') && hasOp('police_station')
  );
  mark('pop_100', state.agents.length >= 100);
  mark('century_survival', state.day >= DAYS_PER_YEAR * 100);
  mark('sustainable_ecosystem', state.day >= 60 && (state.ecosystemHealth ?? 0) >= 75);
}

// --- Intervenciones Divinas Avanzadas ---

export function divineSpawnVillager(state: SimulationState, count = 1): number {
  ensureCivilizationDefaults(state);
  const namesM = ['Mateo', 'Lucas', 'Gael', 'Dante', 'Simón', 'Hugo', 'Nicolás', 'Tomás'];
  const namesF = ['Luna', 'Sofía', 'Alma', 'Vera', 'Nina', 'Elena', 'Clara', 'Valeria'];
  let added = 0;
  for (let i = 0; i < clamp(Math.round(count), 1, 20); i++) {
    const id = state.nextId++;
    const sex: 'M' | 'F' = id % 2 === 0 ? 'M' : 'F';
    const pool = sex === 'M' ? namesM : namesF;
    const name = `${pool[id % pool.length]} ${String.fromCharCode(65 + (id % 26))}.`;
    const openHouse = state.houses.find((h) => state.agents.filter((a) => a.houseId === h.id).length < h.capacity);
    const agent: Agent = {
      id,
      name,
      sex,
      x: 560 + Math.random() * 320,
      y: 620 + Math.random() * 140,
      ageYears: 19 + (id % 7),
      generation: 1,
      traits: assignInitialTraits(id),
      memories: [],
      isRetired: false,
      aptitudeBonus: {},
      isChild: false,
      isElder: false,
      hunger: 15,
      energy: 95,
      health: 98,
      isSick: false,
      illnessName: null,
      illness: null,
      happiness: 78,
      education: 16,
      carpentryKnowledge: 10,
      constructionKnowledge: 12,
      jobMastery: {},
      skills: [],
      mentorId: null,
      loanDebt: 0,
      jailedDays: 0,
      isRepresentative: false,
      isSterile: false,
      wantsChildren: true,
      pregnancy: null,
      coins: 12,
      inv: { food: 3, wood: 2, pineWood: 0, mapleWood: 0, oakWood: 0, stone: 1, copper: 0, iron: 0, gold: 0, silver: 0 },
      milkCount: 0,
      breadCount: 0,
      toolsCount: 0,
      medicineCount: 0,
      job: i % 3 === 0 ? 'Constructor' : i % 3 === 1 ? 'Agricultor' : 'Recolector',
      houseId: openHouse?.id ?? null,
      assignedBuildingId: null,
      mountedHorseId: null,
      skin: '#e0ac69',
      shirt: '#10b981',
      hairStyle: sex === 'F' ? 'long' : 'short',
      hairColor: '#5c3a21',
      partnerId: null,
      exPartnerIds: [],
      parents: 'Creación Divina',
      childrenCount: 0,
      emotion: 'happy',
      talkingTimer: 0,
      lastDialogue: null,
      lastQwenDecision: 'Llegó por intervención divina.',
      qwenPlan: 'Integrarse a la aldea',
      taskType: 'idle',
      taskTimer: 0,
      taskTargetId: null,
      activity: 'Recién llegado',
      thought: 'Listo para ayudar a la aldea.',
      importance: 15,
      walkFrame: 0,
      reproductionCooldown: 0,
      moodModifier: 0,
      activeConstruction: null,
    };
    recordAgentMemory(state, agent, 'milestone', 'Llegué al mundo por intervención divina.', 'positive');
    state.agents.push(agent);
    added++;
  }
  trackDivineIntervention(state, 'villagersSpawned', added, `Intervención Divina creó ${added} nuevo(s) aldeano(s).`);
  addLog(state, `Intervención Divina: aparecieron ${added} nuevo(s) aldeano(s).`, 'violet');
  return added;
}

export function divineRepairAllStructures(state: SimulationState): number {
  ensureCivilizationDefaults(state);
  let repaired = 0;
  for (const h of state.houses) {
    if (h.durability < 100 || h.maintenanceStatus !== 'ok') {
      h.durability = 100;
      h.unpaidMaintenanceDays = 0;
      h.maintenanceDebtCount = 0;
      h.maintenanceStatus = 'ok';
      repaired++;
    }
  }
  for (const b of state.specialBuildings) {
    if (b.durability < 100 || b.maintenanceStatus !== 'ok') {
      b.durability = 100;
      b.unpaidMaintenanceDays = 0;
      b.maintenanceDebtCount = 0;
      b.maintenanceStatus = 'ok';
      b.efficiencyMultiplier = 1;
      repaired++;
    }
  }
  if (state.plaza) {
    state.plaza.durability = 100;
    state.plaza.unpaidMaintenanceDays = 0;
    state.plaza.maintenanceStatus = 'ok';
    repaired++;
  }
  if (state.bridge) {
    state.bridge.durability = 100;
    state.bridge.unpaidMaintenanceDays = 0;
    state.bridge.maintenanceStatus = 'ok';
    repaired++;
  }
  if (repaired === 0 && state.agents[0]) {
    repairDamagedStructures(state, state.agents[0]);
  }
  trackDivineIntervention(state, 'instantBuildings', 1, `Intervención Divina reparó ${repaired} estructura(s).`);
  addLog(state, `Intervención Divina: todas las estructuras (${repaired}) fueron reparadas al 100%.`, 'violet');
  return repaired;
}

export function divineTriggerEvent(
  state: SimulationState,
  kind: 'frost' | 'flood' | 'blight' | 'abundance'
): void {
  ensureCivilizationDefaults(state);
  if (kind === 'frost') {
    state.weather = 'storm';
    state.biome = 'tundra';
    state.season = 'Invierno';
    state.activeDisaster = {
      kind: 'frost',
      daysRemaining: 4,
      description: 'Helada extrema: daña cultivos y exige refugio.',
    };
    for (const f of state.farms) f.growth = Math.max(0, f.growth - 35);
    for (const a of state.agents) {
      if (a.houseId === null) a.health = clamp(a.health - 12, 5, 100);
    }
    trackDivineIntervention(state, 'disastersTriggered', 1, 'Intervención Divina desató una Helada Extrema.');
    addLog(state, 'Desastre: Helada extrema azota cultivos y aldeanos sin techo.', 'rose');
  } else if (kind === 'flood') {
    state.weather = 'storm';
    state.activeDisaster = {
      kind: 'flood',
      daysRemaining: 3,
      description: 'Inundación fluvial: daña caminos y edificios cercanos al río.',
    };
    for (const r of state.roads) {
      if (Math.abs(r.y - 480) < 130) r.durability = Math.max(20, r.durability - 35);
    }
    if (state.bridge) state.bridge.durability = Math.max(25, state.bridge.durability - 25);
    trackDivineIntervention(state, 'disastersTriggered', 1, 'Intervención Divina provocó una Inundación.');
    addLog(state, 'Desastre: El río se desbordó inundando las zonas ribereñas.', 'rose');
  } else if (kind === 'blight') {
    state.activeDisaster = {
      kind: 'blight',
      daysRemaining: 4,
      description: 'Plaga agrícola: reduce el crecimiento de las parcelas.',
    };
    for (const f of state.farms) f.growth = Math.max(0, f.growth - 50);
    trackDivineIntervention(state, 'disastersTriggered', 1, 'Intervención Divina desató una Plaga Agrícola.');
    addLog(state, 'Desastre: Una plaga agrícola redujo la cosecha de las granjas.', 'amber');
  } else if (kind === 'abundance') {
    state.weather = 'sunny';
    state.activeDisaster = {
      kind: 'abundance',
      daysRemaining: 5,
      description: 'Cosecha excepcional: los cultivos maduran y florecen.',
    };
    for (const f of state.farms) f.growth = Math.min(100, f.growth + 55);
    for (const a of state.agents) {
      a.happiness = clamp(a.happiness + 10, 0, 100);
      a.inv.food += 1;
    }
    trackDivineIntervention(state, 'resourcesGranted', 10, 'Intervención Divina bendijo la tierra con Cosecha Excepcional.');
    addLog(state, 'Acontecimiento positivo: ¡Cosecha excepcional en toda la aldea!', 'emerald');
  }
}

export function divineAdjustTaxRate(state: SimulationState, nextTaxPct: number): void {
  ensureCivilizationDefaults(state);
  const clamped = clamp(Math.round(nextTaxPct), 0, 35);
  state.economyReserve.taxRatePct = clamped;
  trackDivineIntervention(state, 'economicInterventions', 1, `Impuesto ajustado por Intervención Divina al ${clamped}%.`);
  addLog(state, `Intervención Divina ajustó la tasa impositiva a ${clamped}%.`, 'violet');
}

export function divineForceSeason(state: SimulationState, season: SimulationState['season']): void {
  ensureCivilizationDefaults(state);
  state.season = season;
  state.biome =
    season === 'Primavera'
      ? 'grassland'
      : season === 'Verano'
        ? 'arid'
        : season === 'Otoño'
          ? 'forest'
          : 'tundra';
  addLog(state, `Intervención Divina cambió la estación a ${season}.`, 'sky');
}

export function divineGrantGlobalKnowledge(state: SimulationState, delta: number): void {
  ensureCivilizationDefaults(state);
  state.knowledge = Math.max(0, state.knowledge + delta);
  for (const a of state.agents) {
    a.education = clamp(a.education + delta * 0.6, 0, 100);
  }
  trackDivineIntervention(state, 'knowledgeGranted', Math.abs(delta), `Intervención Divina modificó el Saber colectivo (${delta >= 0 ? '+' : ''}${delta}).`);
  addLog(state, `Intervención Divina: Saber colectivo ${delta >= 0 ? '+' : ''}${delta}.`, 'violet');
}

export function describeSeasonFromDay(day: number): string {
  return computeSeason(day);
}

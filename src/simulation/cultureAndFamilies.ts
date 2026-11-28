import type {
  Agent,
  CulturalBelief,
  CulturalTradition,
  CultureState,
  FamilyInfluenceTier,
  FamilyLineage,
  HistoricalFigure,
  JobType,
  SimulationState,
  TraditionOrigin,
} from '../types/simulation';
import {
  addLog,
  clamp,
  DAYS_PER_YEAR,
  getTotalCirculatingCoins,
  pushSoundCue,
} from './rules';
import {
  recordAgentMemory,
  trackDivineIntervention,
  trackNaturalProgress,
} from './civilizationSystems';
import { emitSimEvent } from './eventBus';
import { recordCategorizedChronicle } from './historyAndChronicle';

const LINEAGE_SURNAMES = [
  'del Valle',
  'Piedra',
  'del Bosque',
  'Ribera',
  'Solís',
  'Ferrer',
  'Montes',
  'Vega',
  'Brisa',
  'Robles',
  'Alba',
  'Sierra',
  'Castaño',
  'Lago',
];

export function createDefaultCultureState(): CultureState {
  return {
    traditions: [],
    activeFestival: null,
    beliefs: [],
    identityTag: 'Comunidad Fundadora',
  };
}

export function ensureCultureAndFamilyDefaults(state: SimulationState): void {
  if (!Array.isArray(state.familyLineages)) state.familyLineages = [];
  if (!Array.isArray(state.historicalFigures)) state.historicalFigures = [];
  if (!state.culture || typeof state.culture !== 'object') {
    state.culture = createDefaultCultureState();
  }
  if (!Array.isArray(state.culture.traditions)) state.culture.traditions = [];
  if (!Array.isArray(state.culture.beliefs)) state.culture.beliefs = [];
  if (state.culture.activeFestival === undefined) state.culture.activeFestival = null;
  if (!state.culture.identityTag) state.culture.identityTag = 'Comunidad Fundadora';
}

function deriveFamilySurname(founder: Agent, index: number): string {
  const parts = founder.name.trim().split(/\s+/);
  const first = parts[0] ?? `Casa${founder.id}`;
  return `${first} ${LINEAGE_SURNAMES[index % LINEAGE_SURNAMES.length]}`;
}

export function syncFamilyLineages(state: SimulationState): void {
  ensureCultureAndFamilyDefaults(state);
  const lineages = state.familyLineages!;
  const byId = new Map<string, FamilyLineage>();
  for (const lin of lineages) {
    byId.set(lin.id, lin);
  }

  const agentById = new Map<number, Agent>();
  for (const a of state.agents) {
    agentById.set(a.id, a);
  }

  // Asegurar que cada aldeano tenga un familyId (heredado de padres/pareja o nuevo linaje fundador)
  for (const agent of state.agents) {
    if (agent.familyId && byId.has(agent.familyId)) continue;

    const mother = agent.motherId ? agentById.get(agent.motherId) : undefined;
    const father = agent.fatherId ? agentById.get(agent.fatherId) : undefined;
    const parentFamilyId = mother?.familyId ?? father?.familyId;
    if (parentFamilyId && byId.has(parentFamilyId)) {
      agent.familyId = parentFamilyId;
      continue;
    }

    const partner = agent.partnerId ? agentById.get(agent.partnerId) : undefined;
    if (partner?.familyId && byId.has(partner.familyId)) {
      agent.familyId = partner.familyId;
      continue;
    }

    const linId = `fam_${agent.id}`;
    if (!byId.has(linId)) {
      const surname = deriveFamilySurname(agent, lineages.length + byId.size);
      const created: FamilyLineage = {
        id: linId,
        surname,
        founderIds: [agent.id],
        founderNames: [agent.name],
        foundedDay: agent.birthDay ?? 1,
        currentGeneration: agent.generation ?? 1,
        livingMemberIds: [agent.id],
        historicalMemberIds: [agent.id],
        totalDescendants: 0,
        predominantJobs: [agent.job],
        totalCoins: agent.coins,
        influenceScore: 15,
        influenceTier: 'emergente',
        notableEvents: [`Fundación del linaje por ${agent.name}`],
      };
      byId.set(linId, created);
      lineages.push(created);
    }
    agent.familyId = linId;
  }

  // Recalcular métricas reales por linaje sin inflar artificialmente
  for (const lin of lineages) {
    const members = state.agents.filter((a) => a.familyId === lin.id);
    lin.livingMemberIds = members.map((m) => m.id);
    const histSet = new Set(lin.historicalMemberIds);
    for (const m of members) histSet.add(m.id);
    lin.historicalMemberIds = Array.from(histSet);

    lin.currentGeneration = Math.max(
      lin.currentGeneration,
      ...members.map((m) => m.generation ?? 1),
      1
    );
    lin.totalDescendants = Math.max(
      lin.totalDescendants,
      Math.max(0, lin.historicalMemberIds.length - lin.founderIds.length)
    );

    const jobCounts = new Map<JobType, number>();
    for (const m of members) {
      if (m.job !== 'Aprendiz') {
        jobCounts.set(m.job, (jobCounts.get(m.job) ?? 0) + 1);
      }
    }
    lin.predominantJobs = Array.from(jobCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([job]) => job);
    if (lin.predominantJobs.length === 0 && members[0]) {
      lin.predominantJobs = [members[0].job];
    }

    const memberHouseIds = new Set(members.map((m) => m.houseId).filter((id): id is number => id !== null));
    const houseCoins = state.houses
      .filter((h) => memberHouseIds.has(h.id))
      .reduce((s, h) => s + h.storage.coins, 0);
    lin.totalCoins = members.reduce((s, m) => s + m.coins, 0) + houseCoins;

    const repBonus = members.some((m) => m.isRepresentative) ? 18 : 0;
    const ownerBonus = state.specialBuildings.filter(
      (b) => b.ownerId !== null && members.some((m) => m.id === b.ownerId)
    ).length * 14;
    const figureBonus = (state.historicalFigures ?? []).filter(
      (f) => f.familyId === lin.id
    ).length * 16;
    const avgKnowledge =
      members.length > 0
        ? members.reduce((s, m) => s + m.education, 0) / members.length
        : 0;

    const rawScore = Math.round(
      clamp(
        members.length * 8 +
          lin.totalDescendants * 6 +
          Math.min(25, lin.totalCoins * 0.25) +
          avgKnowledge * 0.35 +
          repBonus +
          ownerBonus +
          figureBonus,
        5,
        100
      )
    );
    lin.influenceScore = rawScore;
    let tier: FamilyInfluenceTier = 'emergente';
    if (rawScore >= 75 || (figureBonus > 0 && rawScore >= 60)) tier = 'histórica';
    else if (rawScore >= 52) tier = 'influyente';
    else if (rawScore >= 28) tier = 'consolidada';
    lin.influenceTier = tier;
  }

  state.familyLineages = lineages.filter(
    (l) => l.livingMemberIds.length > 0 || l.historicalMemberIds.length > 1 || l.influenceTier === 'histórica'
  );
}

export function recordHistoricalFigure(
  state: SimulationState,
  agent: Agent,
  roleTitle: string,
  reason: string
): HistoricalFigure | null {
  ensureCultureAndFamilyDefaults(state);
  const existing = state.historicalFigures!.find((f) => f.agentId === agent.id);
  if (existing) {
    if (!existing.achievements.includes(reason)) {
      existing.achievements.push(reason);
    }
    return existing;
  }

  const figure: HistoricalFigure = {
    id: state.nextId++,
    agentId: agent.id,
    name: agent.name,
    familyId: agent.familyId,
    generation: agent.generation ?? 1,
    birthDay: agent.birthDay ?? Math.max(1, state.day - agent.ageYears),
    deathDay: null,
    roleTitle,
    reason,
    era: state.era,
    job: agent.job,
    achievements: [reason],
  };
  state.historicalFigures!.push(figure);
  if (agent.familyId) {
    const lin = state.familyLineages?.find((l) => l.id === agent.familyId);
    if (lin && !lin.notableEvents.some((e) => e.includes(agent.name))) {
      lin.notableEvents.unshift(`${agent.name} fue reconocido como ${roleTitle} (Día ${state.day})`);
      lin.notableEvents = lin.notableEvents.slice(0, 8);
    }
  }
  recordAgentMemory(state, agent, 'milestone', `Reconocido como figura histórica: ${roleTitle}`, 'positive');
  recordCategorizedChronicle(
    state,
    'family',
    `Figura histórica: ${agent.name} obtuvo el reconocimiento de "${roleTitle}" (${reason}).`
  );
  addLog(state, `Figura histórica: ${agent.name} — ${roleTitle}.`, 'violet');
  return figure;
}

export function evaluateHistoricalFiguresDaily(state: SimulationState): void {
  ensureCultureAndFamilyDefaults(state);
  for (const agent of state.agents) {
    if ((agent.discoveriesAuthored?.length ?? 0) > 0) {
      recordHistoricalFigure(
        state,
        agent,
        'Pionero del Saber',
        `Autor de descubrimiento técnico en ${agent.job}`
      );
      continue;
    }
    const maxMastery = Math.max(0, ...Object.values(agent.jobMastery ?? {}).map((v) => v ?? 0));
    if (maxMastery > 70) {
      recordHistoricalFigure(
        state,
        agent,
        `Primer Maestro de ${agent.job}`,
        `Alcanzó maestría superior (>70%) como ${agent.job}`
      );
      continue;
    }
    if (agent.isRepresentative && agent.importance >= 75) {
      recordHistoricalFigure(
        state,
        agent,
        'Líder Cívico',
        `Condujo la aldea con alta legitimidad e influencia`
      );
    }
  }
}

export function inheritPartialKnowledgeOnBirth(
  baby: Agent,
  mother: Agent,
  father: Agent | null
): void {
  baby.motherId = mother.id;
  baby.fatherId = father?.id ?? null;
  baby.familyId = mother.familyId ?? father?.familyId;
  // Herencia parcial de saber sin saltarse aprendizaje individual
  const avgParentEdu = father ? (mother.education + father.education) / 2 : mother.education;
  const inheritedBonus = clamp(Math.round(avgParentEdu * 0.14), 2, 14);
  baby.education = clamp(Math.max(baby.education, 4 + inheritedBonus), 4, 24);
  const sharedDiscoveries = new Set<string>([
    ...(mother.knownDiscoveries ?? []).slice(0, 2),
    ...(father?.knownDiscoveries ?? []).slice(0, 1),
  ]);
  baby.knownDiscoveries = Array.from(sharedDiscoveries);
}

function addTraditionIfMissing(
  state: SimulationState,
  tradition: Omit<CulturalTradition, 'lastCelebratedDay' | 'status' | 'celebrationsCount'>
): CulturalTradition | null {
  ensureCultureAndFamilyDefaults(state);
  const culture = state.culture!;
  if (culture.traditions.some((t) => t.id === tradition.id)) return null;

  const created: CulturalTradition = {
    ...tradition,
    lastCelebratedDay: null,
    status: 'active',
    celebrationsCount: 0,
  };
  culture.traditions.push(created);
  recordCategorizedChronicle(
    state,
    'culture',
    `Nueva tradición cultural: "${created.name}" (${created.description}).`
  );
  emitSimEvent(state, 'tradition_born', created.name);
  addLog(state, `Cultura emergente: nació la tradición "${created.name}".`, 'violet');
  return created;
}

function tryConsumeVillageFestivalResources(
  state: SimulationState,
  foodCost: number,
  coinCost: number
): { ok: boolean; foodSpent: number; coinsSpent: number } {
  const totalFood =
    state.agents.reduce((s, a) => s + a.inv.food + a.breadCount, 0) +
    state.houses.reduce((s, h) => s + h.storage.food, 0);
  const totalCoins = getTotalCirculatingCoins(state);
  if (totalFood < foodCost + state.agents.length || totalCoins < coinCost) {
    return { ok: false, foodSpent: 0, coinsSpent: 0 };
  }

  let remFood = foodCost;
  for (const h of state.houses) {
    if (remFood <= 0) break;
    const take = Math.min(h.storage.food, remFood);
    h.storage.food -= take;
    remFood -= take;
  }
  for (const a of state.agents) {
    if (remFood <= 0) break;
    const take = Math.min(a.inv.food, remFood);
    a.inv.food -= take;
    remFood -= take;
  }

  let remCoins = coinCost;
  for (const h of state.houses) {
    if (remCoins <= 0) break;
    const take = Math.min(h.storage.coins, remCoins);
    h.storage.coins -= take;
    remCoins -= take;
  }
  for (const a of state.agents) {
    if (remCoins <= 0) break;
    const take = Math.min(a.coins, remCoins);
    a.coins -= take;
    remCoins -= take;
  }

  return {
    ok: true,
    foodSpent: foodCost - remFood,
    coinsSpent: coinCost - remCoins,
  };
}

export function startFestivalForTradition(
  state: SimulationState,
  tradition: CulturalTradition,
  forcedByDivine = false
): boolean {
  ensureCultureAndFamilyDefaults(state);
  const culture = state.culture!;
  if (culture.activeFestival) return false;

  const foodCost = forcedByDivine ? 0 : tradition.foodCost;
  const coinCost = forcedByDivine ? 0 : tradition.coinCost;
  let foodSpent = 0;
  let coinsSpent = 0;

  if (!forcedByDivine) {
    const payment = tryConsumeVillageFestivalResources(state, foodCost, coinCost);
    if (!payment.ok) return false;
    foodSpent = payment.foodSpent;
    coinsSpent = payment.coinsSpent;
  }

  culture.activeFestival = {
    id: state.nextId++,
    traditionId: tradition.id,
    name: `Festividad: ${tradition.name}`,
    dayStarted: state.day,
    daysRemaining: 2,
    foodSpent,
    coinsSpent,
    attendanceCount: state.agents.length,
  };
  tradition.lastCelebratedDay = state.day;
  tradition.celebrationsCount += 1;

  for (const a of state.agents) {
    a.happiness = clamp(a.happiness + tradition.happinessBonus, 0, 100);
    a.moodModifier = clamp(a.moodModifier + Math.round(tradition.happinessBonus * 0.5), -20, 20);
    recordAgentMemory(state, a, 'milestone', `Celebré ${tradition.name}`, 'positive');
  }
  if (state.politics) {
    state.politics.approvalRating = clamp(state.politics.approvalRating + tradition.socialBonus, 0, 100);
  }
  if (!forcedByDivine) {
    trackNaturalProgress(state, 'tradesCompleted', 1);
  }
  pushSoundCue(state, 'celebration');
  recordCategorizedChronicle(
    state,
    'culture',
    `${culture.activeFestival.name} celebrada (costo real: ${foodSpent} comida, ${coinsSpent} mon., asistencia ${state.agents.length}).`
  );
  emitSimEvent(state, 'festival', culture.activeFestival.name);
  addLog(state, `¡Festejo en la aldea! ${culture.activeFestival.name}.`, 'emerald');
  return true;
}

export function updateCultureAndTraditionsDaily(state: SimulationState): void {
  ensureCultureAndFamilyDefaults(state);
  const culture = state.culture!;
  const maxGen = Math.max(1, ...state.agents.map((a) => a.generation ?? 1));

  // Avanzar festividad activa
  if (culture.activeFestival) {
    culture.activeFestival.daysRemaining -= 1;
    if (culture.activeFestival.daysRemaining <= 0) {
      culture.activeFestival = null;
    }
  }

  // Origenes reales de tradiciones
  if (state.day >= 20 && state.farms.length >= 2) {
    addTraditionIfMissing(state, {
      id: 'fiesta_cosecha',
      name: 'Fiesta de la Primera Cosecha',
      description: 'Agradecimiento comunitario por las parcelas sembradas y el pan compartido.',
      origin: 'harvest',
      foundedDay: state.day,
      generationBorn: maxGen,
      intervalDays: 60,
      foodCost: 4,
      coinCost: 8,
      happinessBonus: 10,
      tradeBonus: 6,
      socialBonus: 5,
    });
  }

  if (state.day >= DAYS_PER_YEAR) {
    addTraditionIfMissing(state, {
      id: 'aniversario_fundacion',
      name: 'Día de los Fundadores',
      description: 'Conmemoración anual del primer asentamiento de los 10 pioneros.',
      origin: 'founding',
      foundedDay: state.day,
      generationBorn: maxGen,
      intervalDays: DAYS_PER_YEAR,
      foodCost: 5,
      coinCost: 12,
      happinessBonus: 12,
      tradeBonus: 5,
      socialBonus: 8,
    });
  }

  if (state.plaza && state.bridge) {
    addTraditionIfMissing(state, {
      id: 'feria_del_puente',
      name: 'Feria de la Plaza y el Puente',
      description: 'Encuentro comercial y artesanal entre Zona Norte y Zona Sur.',
      origin: 'construction',
      foundedDay: state.day,
      generationBorn: maxGen,
      intervalDays: 45,
      foodCost: 3,
      coinCost: 10,
      happinessBonus: 8,
      tradeBonus: 12,
      socialBonus: 4,
    });
  }

  if ((state.historicalFigures?.length ?? 0) > 0) {
    const hero = state.historicalFigures![0];
    addTraditionIfMissing(state, {
      id: `tributo_${hero.agentId}`,
      name: `Memorial de ${hero.name}`,
      description: `Homenaje a ${hero.roleTitle} por su legado en la aldea.`,
      origin: 'figure',
      foundedDay: state.day,
      generationBorn: maxGen,
      intervalDays: 90,
      foodCost: 3,
      coinCost: 8,
      happinessBonus: 9,
      tradeBonus: 4,
      socialBonus: 7,
    });
  }

  // Creencias emergentes ligadas a eventos naturales o supervivencia (nunca obligatorias)
  if ((state.weather === 'thunderstorm' || state.fires.length > 0) && !culture.beliefs.some((b) => b.id === 'respeto_tormenta')) {
    const belief: CulturalBelief = {
      id: 'respeto_tormenta',
      name: 'Veneración del Fuego y la Tormenta',
      description: 'Creencia popular surgida tras enfrentar rayos e incendios; fomenta la vigilia comunitaria.',
      originEvent: 'Tormentas eléctricas e incendios',
      foundedDay: state.day,
      adoptionPct: 38,
    };
    culture.beliefs.push(belief);
    recordCategorizedChronicle(state, 'culture', `Creencia emergente: "${belief.name}".`);
  }

  if (state.agents.some((a) => a.isElder) && !culture.beliefs.some((b) => b.id === 'memoria_ancestros')) {
    const belief: CulturalBelief = {
      id: 'memoria_ancestros',
      name: 'Memoria de los Ancestros',
      description: 'Respeto por los mayores y linajes fundadores como guía de prudencia.',
      originEvent: 'Primeros ancianos de la aldea',
      foundedDay: state.day,
      adoptionPct: 52,
    };
    culture.beliefs.push(belief);
  }

  // Celebración periódica con costo real cuando corresponde
  for (const t of culture.traditions) {
    if (t.status !== 'active') continue;
    const daysSince = t.lastCelebratedDay === null ? state.day - t.foundedDay : state.day - t.lastCelebratedDay;
    if (daysSince >= t.intervalDays && !culture.activeFestival) {
      const started = startFestivalForTradition(state, t, false);
      if (!started && daysSince >= t.intervalDays * 2.5 && maxGen > t.generationBorn + 1) {
        t.status = 'abandoned';
        recordCategorizedChronicle(
          state,
          'culture',
          `La tradición "${t.name}" cayó en desuso tras generaciones sin recursos para celebrarla.`
        );
      }
      break;
    }
  }

  // Etiqueta identitaria emergente
  const activeCount = culture.traditions.filter((t) => t.status === 'active').length;
  culture.identityTag =
    activeCount >= 3 && maxGen >= 3
      ? 'Civilización Tradicional Dinámica'
      : activeCount >= 1
        ? 'Aldea con Costumbres Propias'
        : 'Comunidad Fundadora';
}

export function getActiveCultureTradeBonusPct(state: SimulationState): number {
  const fest = state.culture?.activeFestival;
  if (!fest) return 0;
  const tr = state.culture?.traditions.find((t) => t.id === fest.traditionId);
  return tr ? tr.tradeBonus : 5;
}

export function divineSparkTraditionOrFestival(
  state: SimulationState,
  customName?: string
): CulturalTradition {
  ensureCultureAndFamilyDefaults(state);
  const maxGen = Math.max(1, ...state.agents.map((a) => a.generation ?? 1));
  const cleanName = customName?.trim();
  const id = cleanName ? `divine_${cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}` : `divine_fest_${state.day}`;
  const existing = state.culture!.traditions.find((t) => t.id === id || (cleanName && t.name === cleanName));
  const tradition =
    existing ??
    addTraditionIfMissing(state, {
      id,
      name: cleanName || `Festival de la Armonía (Día ${state.day})`,
      description: 'Celebración impulsada por intervención divina para unir a las familias.',
      origin: 'divine',
      foundedDay: state.day,
      generationBorn: maxGen,
      intervalDays: 60,
      foodCost: 3,
      coinCost: 8,
      happinessBonus: 14,
      tradeBonus: 8,
      socialBonus: 8,
    }) ??
    state.culture!.traditions[0];

  startFestivalForTradition(state, tradition, true);
  trackDivineIntervention(state, 'economicInterventions', 1, `Intervención Divina impulsó festividad "${tradition.name}".`);
  return tradition;
}

export function divineAidFamily(state: SimulationState, familyId?: string): boolean {
  ensureCultureAndFamilyDefaults(state);
  syncFamilyLineages(state);
  const targetLineage =
    (familyId ? state.familyLineages?.find((l) => l.id === familyId) : undefined) ??
    state.familyLineages?.find((l) => l.livingMemberIds.length > 0);
  if (!targetLineage) return false;

  const members = state.agents.filter((a) => targetLineage.livingMemberIds.includes(a.id));
  if (members.length === 0) return false;
  for (const m of members) {
    m.inv.food += 3;
    m.coins += 12;
    m.happiness = clamp(m.happiness + 14, 0, 100);
    m.health = clamp(m.health + 15, 0, 100);
    recordAgentMemory(state, m, 'helped', `Bendición divina sobre el linaje ${targetLineage.surname}`, 'positive');
  }
  targetLineage.notableEvents.unshift(`Auxilio divino recibido en el día ${state.day}`);
  targetLineage.notableEvents = targetLineage.notableEvents.slice(0, 8);
  trackDivineIntervention(state, 'resourcesGranted', members.length * 15, `Intervención Divina fortaleció al linaje ${targetLineage.surname}.`);
  addLog(state, `Intervención Divina: linaje ${targetLineage.surname} recibió víveres, monedas y salud.`, 'violet');
  return true;
}

export function getOriginLabel(origin: TraditionOrigin): string {
  switch (origin) {
    case 'harvest':
      return 'Cosecha';
    case 'founding':
      return 'Fundación';
    case 'figure':
      return 'Figura histórica';
    case 'epidemic':
      return 'Superación de crisis';
    case 'construction':
      return 'Gran obra';
    case 'nature':
      return 'Naturaleza';
    case 'divine':
      return 'Impulso divino';
  }
}

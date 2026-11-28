import type {
  Agent,
  AgentBiography,
  ChronicleCategory,
  DecadeSummary,
  HistoricalFigure,
  JobType,
  SimulationState,
} from '../types/simulation';
import { addLog, clamp, DAYS_PER_YEAR } from './rules';
import { trackDivineIntervention } from './civilizationSystems';
import { emitSimEvent } from './eventBus';

export function ensureHistoryDefaults(state: SimulationState): void {
  if (!Array.isArray(state.chronicleArchive)) state.chronicleArchive = [];
  if (!Array.isArray(state.biographies)) state.biographies = [];
  if (!Array.isArray(state.decadeSummaries)) state.decadeSummaries = [];
  if (!Array.isArray(state.historicalFigures)) state.historicalFigures = [];
}

export function recordCategorizedChronicle(
  state: SimulationState,
  category: ChronicleCategory,
  text: string
): void {
  ensureHistoryDefaults(state);
  const cleanText = text.trim();
  if (!cleanText) return;

  // Deduplicación dentro del mismo día y eventos consecutivos iguales
  const duplicate = state.chronicleArchive!.some(
    (e) => e.day === state.day && e.category === category && e.text === cleanText
  );
  if (duplicate) return;

  const year = Math.floor((Math.max(1, state.day) - 1) / DAYS_PER_YEAR) + 1;
  state.chronicleArchive!.unshift({
    id: state.nextId++,
    day: state.day,
    year,
    category,
    text: cleanText,
  });
  if (state.chronicleArchive!.length > 400) {
    state.chronicleArchive = state.chronicleArchive!.slice(0, 400);
  }
}

export function appendAgentJobHistory(agent: Agent, job: JobType): void {
  if (!Array.isArray(agent.jobsHeld)) agent.jobsHeld = [agent.job];
  if (!agent.jobsHeld.includes(job)) {
    agent.jobsHeld.push(job);
    if (agent.jobsHeld.length > 10) agent.jobsHeld = agent.jobsHeld.slice(-10);
  }
}

export function syncAgentBiographies(
  state: SimulationState,
  newlyDeceased: Array<{ agent: Agent; cause: string }> = []
): void {
  ensureHistoryDefaults(state);
  const bios = state.biographies!;
  const byId = new Map<number, AgentBiography>();
  for (const b of bios) {
    byId.set(b.agentId, b);
  }

  const historicalSet = new Set((state.historicalFigures ?? []).map((f) => f.agentId));
  const agentNameById = new Map<number, string>();
  for (const a of state.agents) {
    agentNameById.set(a.id, a.name);
  }
  for (const d of newlyDeceased) {
    agentNameById.set(d.agent.id, d.agent.name);
  }

  const upsert = (agent: Agent, alive: boolean, deathCause?: string) => {
    appendAgentJobHistory(agent, agent.job);
    const existing = byId.get(agent.id);
    const spouseNames = new Set<string>(existing?.spouseNames ?? []);
    if (agent.partnerId !== null) {
      const pName = agentNameById.get(agent.partnerId);
      if (pName) spouseNames.add(pName);
    }
    const deeds = new Set<string>(existing?.notableDeeds ?? []);
    if (agent.isRepresentative) deeds.add('Representante electo de la aldea');
    if ((agent.discoveriesAuthored?.length ?? 0) > 0) {
      deeds.add(`Autor de ${agent.discoveriesAuthored!.length} descubrimiento(s)`);
    }
    if (agent.childrenCount >= 2) {
      deeds.add(`Padre/madre de ${agent.childrenCount} descendientes`);
    }
    if (!alive && deathCause) {
      deeds.add(`Falleció en el día ${state.day} (${deathCause})`);
    }
    for (const mem of agent.memories ?? []) {
      if (mem.kind === 'milestone' && deeds.size < 8) {
        deeds.add(`Día ${mem.day}: ${mem.summary}`);
      }
    }

    const birthDay =
      typeof agent.birthDay === 'number'
        ? agent.birthDay
        : Math.max(1, state.day - agent.ageYears);

    const record: AgentBiography = {
      agentId: agent.id,
      name: agent.name,
      familyId: agent.familyId ?? existing?.familyId,
      generation: agent.generation ?? 1,
      birthDay,
      deathDay: alive ? null : existing?.deathDay ?? state.day,
      alive,
      primaryJob: agent.job,
      jobsHeld: Array.from(new Set([...(existing?.jobsHeld ?? []), ...(agent.jobsHeld ?? [agent.job])])),
      keySkills: [...agent.skills].slice(-8),
      discoveries: Array.from(
        new Set([...(existing?.discoveries ?? []), ...(agent.discoveriesAuthored ?? []), ...(agent.knownDiscoveries ?? []).slice(0, 4)])
      ),
      spouseNames: Array.from(spouseNames),
      childrenCount: Math.max(existing?.childrenCount ?? 0, agent.childrenCount),
      notableDeeds: Array.from(deeds).slice(0, 10),
      isHistoricalFigure: historicalSet.has(agent.id) || (existing?.isHistoricalFigure ?? false),
    };
    byId.set(agent.id, record);
  };

  for (const agent of state.agents) {
    upsert(agent, true);
  }
  for (const { agent, cause } of newlyDeceased) {
    upsert(agent, false, cause);
  }

  // Conservar todos los vivos + figuras históricas + hasta 90 fallecidos recientes
  const all = Array.from(byId.values());
  const living = all.filter((b) => b.alive);
  const deceased = all
    .filter((b) => !b.alive)
    .sort((a, b) => {
      if (a.isHistoricalFigure !== b.isHistoricalFigure) return a.isHistoricalFigure ? -1 : 1;
      return (b.deathDay ?? 0) - (a.deathDay ?? 0);
    })
    .slice(0, 90);

  state.biographies = [...living, ...deceased];
}

export function buildDecadeSummaryData(state: SimulationState, decadeNumber: number): DecadeSummary {
  const startYear = (decadeNumber - 1) * 10 + 1;
  const endYear = decadeNumber * 10;
  const startDay = (startYear - 1) * DAYS_PER_YEAR + 1;
  const endDay = endYear * DAYS_PER_YEAR;

  const entries = (state.chronicleArchive ?? []).filter(
    (e) => e.day >= startDay && e.day <= endDay
  );
  const births = entries.filter((e) => e.category === 'family' && e.text.includes('Nació')).length;
  const deaths = entries.filter((e) => e.text.includes('Falleció') || e.text.includes('falleció')).length;
  const constructions = entries.filter(
    (e) => e.category === 'architecture' || e.text.includes('completó')
  ).length;
  const discoveriesCount = (state.discoveries ?? []).filter(
    (d) => d.discoveredDay >= startDay && d.discoveredDay <= endDay
  ).length;
  const festivalsCount = entries.filter((e) => e.category === 'culture').length;
  const crisesCount = entries.filter((e) => e.category === 'crisis').length;

  const prevDecade = (state.decadeSummaries ?? []).find((d) => d.decadeNumber === decadeNumber - 1);
  const populationStart = prevDecade ? prevDecade.populationEnd : 10;
  const populationEnd = state.agents.length;

  const summaryText = `Década ${decadeNumber} (Años ${startYear}–${endYear}): población ${populationStart}→${populationEnd} hab., ${births} nacimientos, ${constructions} obras, ${discoveriesCount} descubrimientos, ${festivalsCount} hitos culturales y ${crisesCount} episodios de crisis.`;

  return {
    decadeNumber,
    startYear,
    endYear,
    startDay,
    endDay,
    populationStart,
    populationEnd,
    births,
    deaths,
    constructions,
    discoveriesCount,
    festivalsCount,
    crisesCount,
    summaryText,
    aiNarrated: false,
  };
}

export function evaluateDecadeSummaries(state: SimulationState): void {
  ensureHistoryDefaults(state);
  const currentYear = Math.floor((Math.max(1, state.day) - 1) / DAYS_PER_YEAR) + 1;
  const completedDecades = Math.floor((currentYear - 1) / 10);
  if (completedDecades <= 0) return;

  for (let d = 1; d <= completedDecades; d++) {
    if (!state.decadeSummaries!.some((item) => item.decadeNumber === d)) {
      const summary = buildDecadeSummaryData(state, d);
      state.decadeSummaries!.push(summary);
      recordCategorizedChronicle(
        state,
        'social',
        `Cierre de la Década ${d} (Años ${summary.startYear}–${summary.endYear}): ${summary.populationEnd} habitantes, ${summary.discoveriesCount} descubrimientos.`
      );
      addLog(state, summary.summaryText, 'sky');
    }
  }
}

export function divineAmendChronicle(state: SimulationState, entryText: string): void {
  ensureHistoryDefaults(state);
  const clean = entryText.trim().slice(0, 140);
  if (!clean) return;
  recordCategorizedChronicle(state, 'divine', `Crónica Divina: ${clean}`);
  trackDivineIntervention(state, 'economicInterventions', 1);
  emitSimEvent(state, 'tradition_born', clean);
  addLog(state, `Intervención Divina registró en la crónica: "${clean}".`, 'violet');
}

export function getLiveCurrentDecadePreview(state: SimulationState): DecadeSummary {
  const currentYear = Math.floor((Math.max(1, state.day) - 1) / DAYS_PER_YEAR) + 1;
  const currentDecade = Math.floor((currentYear - 1) / 10) + 1;
  return buildDecadeSummaryData(state, currentDecade);
}

export function recordHistoricalFigureBirthOrDeath(
  figures: HistoricalFigure[],
  agentId: number,
  deathDay: number
): void {
  for (const fig of figures) {
    if (fig.agentId === agentId && fig.deathDay === null) {
      fig.deathDay = deathDay;
    }
  }
}

export function clampHistoryIndex(val: number, min: number, max: number): number {
  return clamp(val, min, max);
}

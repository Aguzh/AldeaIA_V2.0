import type { Agent, CulturalTradition, SimulationState } from '../types/simulation';
import { ensureCivilizationDefaults } from './civilizationSystems';
import {
  ensureCultureAndFamilyDefaults,
  evaluateHistoricalFiguresDaily,
  inheritPartialKnowledgeOnBirth,
  startFestivalForTradition,
  syncFamilyLineages,
  updateCultureAndTraditionsDaily,
} from './cultureAndFamilies';
import {
  diffuseDiscoveriesDaily,
  ensureDiscoveryDefaults,
  evaluateAutonomousDiscoveries,
} from './discoveries';
import {
  buildDiplomaticProposalSummary,
  ensureDiplomacyDefaults,
  executeExternalTrade,
  updateDiplomacyDaily,
} from './diplomacy';
import {
  computeEmergentDistricts,
  computeSocietyIndicatorsDaily,
  ensureCrisesAndSocietyDefaults,
  updateSystemicCrisesDaily,
} from './crisesAndSociety';
import {
  ensureHistoryDefaults,
  evaluateDecadeSummaries,
  recordCategorizedChronicle,
  recordHistoricalFigureBirthOrDeath,
  syncAgentBiographies,
} from './historyAndChronicle';
import { getTotalDispatchedEventsCount, registerQwenActionExtension } from './eventBus';
import { addLog, repairDamagedStructures } from './rules';

let extensionsRegistered = false;

export function registerExpansionQwenHandlers(): void {
  if (extensionsRegistered) return;
  extensionsRegistered = true;

  registerQwenActionExtension('DECLARE_FESTIVAL', (state, action) => {
    if (action.type !== 'DECLARE_FESTIVAL') return null;
    ensureCultureAndFamilyDefaults(state);
    const culture = state.culture!;
    if (culture.activeFestival) {
      return `Festividad ya activa: ${culture.activeFestival.name}`;
    }
    const maxGen = Math.max(1, ...state.agents.map((a) => a.generation ?? 1));
    let targetTradition: CulturalTradition | undefined = culture.traditions.find(
      (t) =>
        t.status === 'active' &&
        (!action.traditionName || t.name.toLowerCase().includes(action.traditionName.toLowerCase()))
    );
    if (!targetTradition) {
      targetTradition = {
        id: `convivial_${state.day}`,
        name: action.traditionName || `Encuentro Vecinal (Día ${state.day})`,
        description: 'Celebración comunitaria organizada con recursos reales de la aldea.',
        origin: 'founding',
        foundedDay: state.day,
        generationBorn: maxGen,
        intervalDays: 60,
        lastCelebratedDay: null,
        foodCost: 3,
        coinCost: 6,
        happinessBonus: 10,
        tradeBonus: 6,
        socialBonus: 6,
        status: 'active',
        celebrationsCount: 0,
      };
      culture.traditions.push(targetTradition);
    }
    const ok = startFestivalForTradition(state, targetTradition, false);
    if (!ok) {
      addLog(state, 'No hay suficientes víveres o monedas para celebrar la festividad.', 'amber');
      return 'Festividad pospuesta por falta de recursos reales';
    }
    return `Festividad celebrada: ${targetTradition.name}`;
  });

  registerQwenActionExtension('DIPLOMATIC_TRADE', (state, action) => {
    if (action.type !== 'DIPLOMATIC_TRADE') return null;
    ensureDiplomacyDefaults(state);
    const fallback = buildDiplomaticProposalSummary(state);
    const communityId =
      action.communityId ??
      fallback?.communityId ??
      state.externalCommunities?.find((c) => c.relation !== 'hostiles')?.id;
    if (!communityId) return 'Sin comunidad vecina disponible para comercio';
    const kind = action.kind ?? fallback?.recommendedKind ?? 'export';
    const good = action.good ?? fallback?.good ?? 'wood';
    const amount = action.amount ?? fallback?.amount ?? 4;
    const res = executeExternalTrade(state, communityId, kind, good, amount);
    return res.summary;
  });

  registerQwenActionExtension('MITIGATE_CRISIS', (state, action) => {
    if (action.type !== 'MITIGATE_CRISIS') return null;
    ensureCrisesAndSocietyDefaults(state);
    state.policies.healthPriority = true;
    state.policies.farmingFocus = true;
    const builder =
      state.agents.find((a) => a.job === 'Constructor' || a.job === 'Carpintero') ?? state.agents[0] ?? null;
    const repaired = repairDamagedStructures(state, builder);
    updateSystemicCrisesDaily(state);
    addLog(
      state,
      `Protocolo de mitigación ejecutado (${repaired} estructura(s) reparadas, prioridad sanitaria y agrícola activada).`,
      'sky'
    );
    return `Mitigación de crisis ejecutada (${repaired} reparaciones)`;
  });
}

registerExpansionQwenHandlers();

export function ensureAllExpansionDefaults(state: SimulationState): void {
  registerExpansionQwenHandlers();
  ensureCivilizationDefaults(state);
  ensureHistoryDefaults(state);
  ensureCultureAndFamilyDefaults(state);
  ensureDiscoveryDefaults(state);
  ensureDiplomacyDefaults(state);
  ensureCrisesAndSocietyDefaults(state);

  if (state.agents.length > 0 && (!state.familyLineages || state.familyLineages.length === 0)) {
    syncFamilyLineages(state);
  }
  if (state.agents.length > 0 && (!state.biographies || state.biographies.length === 0)) {
    syncAgentBiographies(state);
  }
  if (
    (!state.districts || state.districts.length === 0) &&
    (state.houses.length > 0 || state.farms.length > 0 || state.specialBuildings.length > 0)
  ) {
    computeEmergentDistricts(state);
  }
  if ((!state.chronicleArchive || state.chronicleArchive.length === 0) && Array.isArray(state.logs) && state.logs.length > 0) {
    const seen = new Set<string>();
    const seeded: NonNullable<SimulationState['chronicleArchive']> = [];
    for (const log of state.logs.slice(0, 40)) {
      const txt = typeof log?.text === 'string' ? log.text.trim() : '';
      if (!txt) continue;
      const day = Math.max(1, Math.round(log.day || state.day || 1));
      const key = `${day}:${txt}`;
      if (seen.has(key)) continue;
      seen.add(key);
      seeded.push({
        id: state.nextId++,
        day,
        year: Math.floor((day - 1) / 120) + 1,
        category: log.tone === 'amber' ? 'economy' : log.tone === 'sky' ? 'architecture' : log.tone === 'rose' ? 'crisis' : 'social',
        text: txt,
      });
    }
    state.chronicleArchive = seeded;
  }

  if (!state.perfStats) {
    state.perfStats = {
      lastTickMs: 0,
      avgTickMs: 0,
      activeAgents: state.agents.length,
      offscreenAgents: 0,
      lodTier: state.agents.length >= 90 ? 'high_pop' : state.agents.length >= 45 ? 'balanced' : 'full',
      eventsProcessed: getTotalDispatchedEventsCount(),
      dailyAggregateMs: 0,
    };
  }
}

export function onNewbornExpansionHook(
  state: SimulationState,
  baby: Agent,
  mother: Agent,
  father: Agent | null
): void {
  ensureAllExpansionDefaults(state);
  baby.birthDay = state.day;
  baby.jobsHeld = [baby.job];
  inheritPartialKnowledgeOnBirth(baby, mother, father);
  syncFamilyLineages(state);
  recordCategorizedChronicle(
    state,
    'family',
    `Nació ${baby.name} (Gen. ${baby.generation ?? 2}) de ${mother.name}${father ? ` y ${father.name}` : ''}.`
  );
}

export function onAgentDeathExpansionHook(
  state: SimulationState,
  deceased: Agent,
  cause: string
): void {
  ensureAllExpansionDefaults(state);
  if (state.historicalFigures) {
    recordHistoricalFigureBirthOrDeath(state.historicalFigures, deceased.id, state.day);
  }
  syncAgentBiographies(state, [{ agent: deceased, cause }]);
  recordCategorizedChronicle(state, 'family', `${deceased.name} falleció ${cause}.`);
}

export function runDailyCivilizationPipeline(state: SimulationState): void {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  ensureAllExpansionDefaults(state);

  // 1. Linajes y figuras históricas
  syncFamilyLineages(state);
  evaluateHistoricalFiguresDaily(state);

  // 2. Descubrimientos e innovación (requisitos reales + difusión progresiva)
  evaluateAutonomousDiscoveries(state);
  diffuseDiscoveriesDaily(state);

  // 3. Cultura, tradiciones y festividades con costo real
  updateCultureAndTraditionsDaily(state);

  // 4. Diplomacia y comercio exterior
  updateDiplomacyDaily(state);

  // 5. Crisis encadenadas y mitigación por infraestructura
  updateSystemicCrisesDaily(state);

  // 6. Distritos emergentes e indicadores sociales / calidad de vida
  computeEmergentDistricts(state);
  computeSocietyIndicatorsDaily(state);

  // 7. Biografías y resúmenes de década
  syncAgentBiographies(state);
  evaluateDecadeSummaries(state);

  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (state.perfStats) {
    state.perfStats.dailyAggregateMs = Number((t1 - t0).toFixed(2));
    state.perfStats.eventsProcessed = getTotalDispatchedEventsCount();
  }
}

export function updateEnginePerfMetrics(
  state: SimulationState,
  tickMs: number
): void {
  const count = state.agents.length;
  const lodTier = count >= 90 ? 'high_pop' : count >= 45 ? 'balanced' : 'full';
  if (!state.perfStats) {
    state.perfStats = {
      lastTickMs: Number(tickMs.toFixed(2)),
      avgTickMs: Number(tickMs.toFixed(2)),
      activeAgents: count,
      offscreenAgents: 0,
      lodTier,
      eventsProcessed: getTotalDispatchedEventsCount(),
      dailyAggregateMs: 0,
    };
    return;
  }
  state.perfStats.lastTickMs = Number(tickMs.toFixed(2));
  state.perfStats.avgTickMs = Number((state.perfStats.avgTickMs * 0.85 + tickMs * 0.15).toFixed(2));
  state.perfStats.activeAgents = count;
  state.perfStats.lodTier = lodTier;
  state.perfStats.eventsProcessed = getTotalDispatchedEventsCount();
}

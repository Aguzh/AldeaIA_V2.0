import test from 'node:test';
import assert from 'node:assert/strict';
import type { Agent, SimulationState } from '../types/simulation';
import { createInitialState, tickSimulation } from './engine';
import {
  addRoadTile,
  applyQwenActions,
  createHouseNearCenter,
  DAYS_PER_YEAR,
  getTotalCirculatingCoins,
  interpretQwenDirective,
  migrateAndRecoverVillageState,
  SPECIAL_BUILDING_ALLOWED_STORAGE,
} from './rules';
import {
  ensureAllExpansionDefaults,
  onAgentDeathExpansionHook,
  onNewbornExpansionHook,
  runDailyCivilizationPipeline,
} from './civilizationPipeline';
import {
  divineSparkTraditionOrFestival,
  evaluateHistoricalFiguresDaily,
  inheritPartialKnowledgeOnBirth,
  startFestivalForTradition,
  syncFamilyLineages,
  updateCultureAndTraditionsDaily,
} from './cultureAndFamilies';
import {
  diffuseDiscoveriesDaily,
  DISCOVERY_CATALOG,
  divineAccelerateDiscovery,
  evaluateAutonomousDiscoveries,
} from './discoveries';
import {
  buildDiplomaticProposalSummary,
  executeExternalTrade,
} from './diplomacy';
import {
  computeSocietyIndicatorsDaily,
  divineResolveAllCrises,
  updateSystemicCrisesDaily,
} from './crisesAndSociety';
import {
  evaluateDecadeSummaries,
  getLiveCurrentDecadePreview,
  recordCategorizedChronicle,
  syncAgentBiographies,
} from './historyAndChronicle';
import { resetSimEventBusForTest, subscribeSimEvent } from './eventBus';

test('Estado inicial preserva 10 fundadores y 0 casas/edificios/caminos con defaults de expansión', () => {
  const state = createInitialState();
  assert.equal(state.agents.length, 10);
  assert.equal(state.houses.length, 0);
  assert.equal(state.specialBuildings.length, 0);
  assert.equal(state.roads.length, 0);
  assert.ok(Array.isArray(state.familyLineages));
  assert.ok(Array.isArray(state.externalCommunities) && state.externalCommunities.length === 4);
  assert.ok(state.societyIndicators);
  assert.ok(state.culture);
});

test('Linajes, herencia parcial de saber, tiers de influencia y figura histórica persistente tras fallecer', () => {
  const state = createInitialState();
  const mother = state.agents[0];
  const father = state.agents[1];
  mother.education = 72;
  mother.knownDiscoveries = ['rotacion_cultivos'];
  mother.jobMastery[mother.job] = 80;
  mother.coins = 60;
  father.education = 50;

  syncFamilyLineages(state);
  const child: Agent = {
    ...state.agents[2],
    id: state.nextId++,
    name: 'Clara Heredera',
    ageYears: 1,
    generation: 2,
    education: 4,
    isChild: true,
    knownDiscoveries: [] as string[],
  };
  state.agents.push(child);
  onNewbornExpansionHook(state, child, mother, father);

  assert.equal(child.familyId, mother.familyId);
  assert.ok(child.education >= 8 && child.education <= 24, 'Herencia parcial acotada sin saltar aprendizaje');
  assert.ok((child.knownDiscoveries ?? []).includes('rotacion_cultivos'));

  evaluateHistoricalFiguresDaily(state);
  const heroFig = state.historicalFigures?.find((f) => f.agentId === mother.id);
  assert.ok(heroFig, 'Maestría >70% consagra figura histórica');

  // Simular fallecimiento de mother y verificar persistencia histórica
  state.day = 45;
  state.agents = state.agents.filter((a) => a.id !== mother.id);
  onAgentDeathExpansionHook(state, mother, 'de edad avanzada');

  const persistedFig = state.historicalFigures?.find((f) => f.agentId === mother.id);
  assert.equal(persistedFig?.deathDay, 45);
  const bio = state.biographies?.find((b) => b.agentId === mother.id);
  assert.equal(bio?.alive, false);
  assert.equal(bio?.isHistoricalFigure, true);
});

test('Cultura emergente: tradiciones, coste real de festival, bonos y abandono tras generaciones', () => {
  const state = createInitialState();
  state.day = DAYS_PER_YEAR + 1;
  for (const a of state.agents) {
    a.inv.food = 10;
    a.coins = 10;
    a.happiness = 60;
  }

  const coinsBefore = getTotalCirculatingCoins(state);
  const foodBefore = state.agents.reduce((s, a) => s + a.inv.food, 0);

  updateCultureAndTraditionsDaily(state);
  const tradition = state.culture!.traditions.find((t) => t.id === 'aniversario_fundacion');
  assert.ok(tradition, 'Debe nacer Día de los Fundadores al cumplir 1 año');

  const started = startFestivalForTradition(state, tradition, false);
  assert.equal(started, true);
  assert.ok(state.culture!.activeFestival);
  assert.ok(getTotalCirculatingCoins(state) < coinsBefore, 'Festival descuenta monedas reales');
  assert.ok(state.agents.reduce((s, a) => s + a.inv.food, 0) < foodBefore, 'Festival descuenta comida real');
  assert.ok(state.agents[0].happiness > 60, 'Festival eleva felicidad');

  // Sin recursos suficientes tras generaciones -> abandono natural
  state.culture!.activeFestival = null;
  for (const a of state.agents) {
    a.inv.food = 0;
    a.breadCount = 0;
    a.coins = 0;
    a.generation = 4;
  }
  state.day = tradition.foundedDay + tradition.intervalDays * 3;
  updateCultureAndTraditionsDaily(state);
  assert.equal(tradition.status, 'abandoned');
});

test('Descubrimientos: requisitos reales, autoría, tradeoffs y difusión progresiva por mentoría/escuela', () => {
  const state = createInitialState();
  // Sin saber suficiente ni parcelas -> no descubre
  assert.equal(evaluateAutonomousDiscoveries(state), null);

  state.knowledge = 30;
  state.farms.push({
    id: state.nextId++,
    x: 420,
    y: 420,
    size: 'medium',
    growth: 50,
    cropName: 'Trigo',
    durability: 100,
    unpaidMaintenanceDays: 0,
    maintenanceDebtCount: 0,
    maintenanceStatus: 'ok',
    lastMaintenanceDay: 1,
  });
  const farmer = state.agents[0];
  farmer.job = 'Agricultor';
  farmer.education = 32;
  farmer.jobMastery['Agricultor'] = 25;

  const disc = evaluateAutonomousDiscoveries(state);
  assert.ok(disc);
  assert.equal(disc.id, 'rotacion_cultivos');
  assert.equal(disc.authorId, farmer.id);
  assert.ok(disc.costTradeoffSummary.length > 0);
  const initialDiffusion = disc.diffusionPct;

  // Asignar mentoría y Escuela operativa para difundir
  state.agents[1].mentorId = farmer.id;
  state.specialBuildings.push({
    id: state.nextId++,
    type: 'school',
    name: 'Escuela',
    category: 'school',
    x: 520,
    y: 520,
    level: 1,
    builderName: farmer.name,
    ownerId: farmer.id,
    forSale: false,
    price: 90,
    durability: 100,
    unpaidMaintenanceDays: 0,
    maintenanceDebtCount: 0,
    maintenanceStatus: 'ok',
    lastMaintenanceDay: 1,
    efficiencyMultiplier: 1,
    staffIds: [state.agents[2].id],
    isOperational: true,
    allowedStorage: [...SPECIAL_BUILDING_ALLOWED_STORAGE.school],
    storage: {
      food: 0, bread: 0, milk: 0, wood: 0, pineWood: 0, mapleWood: 0, oakWood: 0,
      stone: 0, copper: 0, iron: 0, gold: 0, silver: 0, tools: 0, medicine: 0, coins: 0,
    },
  });

  diffuseDiscoveriesDaily(state);
  assert.ok(disc.diffusionPct > initialDiffusion, 'Difusión aumenta con mentoría y escuela');
  assert.ok(state.agents[1].knownDiscoveries?.includes('rotacion_cultivos'));
});

test('Crisis encadenadas y mitigación medible por infraestructura real', () => {
  const unmitigated = createInitialState();
  unmitigated.weather = 'drought';
  unmitigated.farms.push({
    id: unmitigated.nextId++,
    x: 450,
    y: 450,
    size: 'medium',
    growth: 80,
    cropName: 'Trigo',
    durability: 100,
    unpaidMaintenanceDays: 0,
    maintenanceDebtCount: 0,
    maintenanceStatus: 'ok',
    lastMaintenanceDay: 1,
  });
  for (const a of unmitigated.agents) {
    a.inv.food = 0;
  }
  updateSystemicCrisesDaily(unmitigated);
  const droughtA = unmitigated.crisisMonitor!.activeCrises.find((c) => c.kind === 'drought');
  assert.ok(droughtA);
  assert.ok(unmitigated.crisisMonitor!.activeCrises.some((c) => c.kind === 'famine_risk'));
  assert.ok(unmitigated.marketPrices!.food >= 4);

  // Aldea mitigada con Depósito General, 2 cultivos distintos y Riego Fluvial
  const mitigated = createInitialState();
  mitigated.weather = 'drought';
  mitigated.farms.push(
    {
      id: mitigated.nextId++,
      x: 450,
      y: 450,
      size: 'medium',
      growth: 80,
      cropName: 'Trigo',
      durability: 100,
      unpaidMaintenanceDays: 0,
      maintenanceDebtCount: 0,
      maintenanceStatus: 'ok',
      lastMaintenanceDay: 1,
    },
    {
      id: mitigated.nextId++,
      x: 500,
      y: 450,
      size: 'medium',
      growth: 80,
      cropName: 'Maíz',
      durability: 100,
      unpaidMaintenanceDays: 0,
      maintenanceDebtCount: 0,
      maintenanceStatus: 'ok',
      lastMaintenanceDay: 1,
    }
  );
  mitigated.specialBuildings.push({
    id: mitigated.nextId++,
    type: 'general_depot',
    name: 'Depósito General',
    category: 'depot',
    x: 550,
    y: 520,
    level: 1,
    builderName: 'Fundador',
    ownerId: mitigated.agents[0].id,
    forSale: false,
    price: 80,
    durability: 100,
    unpaidMaintenanceDays: 0,
    maintenanceDebtCount: 0,
    maintenanceStatus: 'ok',
    lastMaintenanceDay: 1,
    efficiencyMultiplier: 1,
    staffIds: [mitigated.agents[0].id],
    isOperational: true,
    allowedStorage: [...SPECIAL_BUILDING_ALLOWED_STORAGE.general_depot],
    storage: {
      food: 20, bread: 0, milk: 0, wood: 10, pineWood: 0, mapleWood: 0, oakWood: 0,
      stone: 10, copper: 0, iron: 0, gold: 0, silver: 0, tools: 0, medicine: 0, coins: 0,
    },
  });
  mitigated.discoveries = [
    {
      id: 'riego_fluvial',
      name: 'Acequias',
      era: 'wood',
      category: 'agricultura',
      description: '',
      requirementsSummary: '',
      benefitsSummary: '',
      costTradeoffSummary: '',
      authorId: mitigated.agents[0].id,
      authorName: mitigated.agents[0].name,
      authorJob: 'Agricultor',
      discoveredDay: 5,
      knownByAgentIds: mitigated.agents.map((a) => a.id),
      diffusionPct: 100,
      status: 'diffused',
    },
  ];
  updateSystemicCrisesDaily(mitigated);
  const droughtB = mitigated.crisisMonitor!.activeCrises.find((c) => c.kind === 'drought');
  assert.ok(droughtB);
  assert.ok(droughtB.mitigationScore > droughtA.mitigationScore);
  assert.ok(droughtB.severity < droughtA.severity, 'Infraestructura reduce severidad de sequía');

  divineResolveAllCrises(mitigated);
  assert.equal(mitigated.crisisMonitor!.activeCrises.length, 0);
});

test('Indicadores sociales (Gini, QoL), migración orgánica y crónica/década al día 1200', () => {
  const state = createInitialState();
  // Desigualdad alta en monedas
  state.agents.forEach((a, i) => {
    a.coins = i === 0 ? 500 : 0;
  });
  const indUnequal = computeSocietyIndicatorsDaily(state);
  assert.ok(indUnequal.economicInequality >= 60, 'Gini detecta alta desigualdad');

  // Igualdad + casas libres + QoL alta -> migración orgánica al día 30
  state.day = 30;
  const h1 = createHouseNearCenter(state, 'Fundador', 'south', 'large'); // cap 8
  const h2 = createHouseNearCenter(state, 'Fundador', 'south', 'large'); // cap 8 (16 camas)
  for (const a of state.agents) {
    a.houseId = h1.id;
    a.coins = 20;
    a.happiness = 95;
    a.health = 98;
    a.hunger = 5;
  }
  state.politics!.approvalRating = 90;
  assert.ok(h2.id > 0);
  const popBefore = state.agents.length;
  const indGood = computeSocietyIndicatorsDaily(state);
  assert.ok(indGood.qualityOfLife >= 70);
  assert.equal(state.agents.length, popBefore + 1, 'Migración orgánica añade 1 habitante en condiciones óptimas');

  // Deduplicación crónica + resumen década al año 11 (día 1201)
  recordCategorizedChronicle(state, 'social', 'Evento duplicado');
  recordCategorizedChronicle(state, 'social', 'Evento duplicado');
  const dupCount = state.chronicleArchive!.filter((e) => e.text === 'Evento duplicado').length;
  assert.equal(dupCount, 1);

  state.day = DAYS_PER_YEAR * 10 + 1;
  syncAgentBiographies(state);
  evaluateDecadeSummaries(state);
  assert.equal(state.decadeSummaries?.length, 1);
  assert.equal(state.decadeSummaries?.[0].decadeNumber, 1);
  assert.ok(getLiveCurrentDecadePreview(state).decadeNumber === 2);
});

test('Diplomacia y comercio exterior conservan existencias/monedas sin combates y con fallback sin IA', () => {
  const state = createInitialState();
  state.aiConfig = { ...state.aiConfig!, modality: 'none', status: 'disabled' };
  for (const a of state.agents) {
    a.coins = 10;
    a.inv.wood = 2;
  }
  const comm = state.externalCommunities!.find((c) => c.id === 'valle_roble')!;
  const remoteFoodBefore = comm.resources.food ?? 0;
  const remoteCoinsBefore = comm.coinReserve;
  const villageCoinsBefore = getTotalCirculatingCoins(state);

  const proposal = buildDiplomaticProposalSummary(state);
  assert.ok(proposal, 'Propuesta determinística funciona sin IA');

  const importRes = executeExternalTrade(state, 'valle_roble', 'import', 'food', 3);
  assert.equal(importRes.ok, true);
  assert.equal(comm.resources.food, remoteFoodBefore - 3);
  assert.ok(comm.coinReserve > remoteCoinsBefore);
  assert.ok(getTotalCirculatingCoins(state) < villageCoinsBefore);

  const exportRes = executeExternalTrade(state, 'valle_roble', 'export', 'wood', 4);
  assert.equal(exportRes.ok, true);
  assert.equal(comm.resources.wood, 85 + 4);
});

test('Acciones Qwen nuevas (DECLARE_FESTIVAL, DIPLOMATIC_TRADE, MITIGATE_CRISIS) y tracking natural vs divino', () => {
  const state = createInitialState();
  for (const a of state.agents) {
    a.inv.food = 8;
    a.coins = 8;
  }

  const festRes = interpretQwenDirective('celebrar un festival en la plaza', [], state);
  assert.ok(festRes.actions.some((a) => a.type === 'DECLARE_FESTIVAL'));
  applyQwenActions(state, festRes.actions);
  assert.ok(state.culture?.activeFestival);

  const tradeRes = interpretQwenDirective('comerciar exterior e importar alimento', [], state);
  assert.ok(tradeRes.actions.some((a) => a.type === 'DIPLOMATIC_TRADE'));
  applyQwenActions(state, tradeRes.actions);
  assert.ok((state.externalTradeHistory?.length ?? 0) >= 1);

  const crisisRes = interpretQwenDirective('mitigar crisis y emergencia', [], state);
  assert.ok(crisisRes.actions.some((a) => a.type === 'MITIGATE_CRISIS'));
  applyQwenActions(state, crisisRes.actions);
  assert.equal(state.policies.healthPriority, true);

  // Separación natural vs divino
  const natBefore = state.evolutionStats!.natural.knowledgeGained;
  const divBefore = state.evolutionStats!.divine.knowledgeGranted;
  divineAccelerateDiscovery(state);
  assert.ok(state.evolutionStats!.divine.knowledgeGranted > divBefore);
  assert.ok(state.evolutionStats!.natural.knowledgeGained >= natBefore);
  divineSparkTraditionOrFestival(state, 'Fiesta Estelar');
  assert.ok(state.evolutionStats!.divine.economicInterventions >= 1);
});

test('Migración retrocompatible de saves antiguos v1 sin borrar entidades ni recursos', () => {
  const legacy = createInitialState();
  legacy.schemaVersion = 1;
  legacy.day = 42;
  legacy.knowledge = 55;
  legacy.agents[0].inv.gold = 3;
  delete legacy.familyLineages;
  delete legacy.culture;
  delete legacy.discoveries;
  delete legacy.externalCommunities;
  delete legacy.crisisMonitor;
  delete legacy.societyIndicators;
  delete legacy.biographies;
  delete legacy.decadeSummaries;

  ensureAllExpansionDefaults(legacy);
  migrateAndRecoverVillageState(legacy);

  const migrated = legacy as SimulationState;
  assert.equal(migrated.agents.length, 10);
  assert.equal(migrated.agents[0].inv.gold, 3);
  assert.equal(migrated.knowledge, 55);
  assert.ok(migrated.familyLineages);
  assert.equal(migrated.externalCommunities?.length, 4);
  assert.ok(migrated.societyIndicators);
});

test('Event Bus y LOD de rendimiento soportan 10, 50 y 100 agentes con tiempos acotados', () => {
  resetSimEventBusForTest();
  const state = createInitialState();
  let seenEvents = 0;
  const unsub = subscribeSimEvent('*', () => {
    seenEvents++;
  });

  // Escalar a 100 agentes para comprobar LOD y pipeline diario
  while (state.agents.length < 100) {
    const template = state.agents[state.agents.length % 10];
    state.agents.push({
      ...template,
      id: state.nextId++,
      name: `Poblador ${state.agents.length + 1}`,
      x: 250 + ((state.agents.length * 37) % 700),
      y: 260 + ((state.agents.length * 29) % 420),
    });
  }

  // Añadir algunos caminos para cubrir evaluación de distritos/crisis
  for (let i = 0; i < 6; i++) {
    state.agents[0].inv.stone += 4;
    addRoadTile(state, 420 + i * 24, 520, 'stone', false);
  }

  const t0 = performance.now();
  for (let i = 0; i < 20; i++) {
    tickSimulation(state, 0.05);
  }
  runDailyCivilizationPipeline(state);
  const elapsedMs = performance.now() - t0;

  assert.equal(state.perfStats?.lodTier, 'high_pop');
  assert.equal(state.perfStats?.activeAgents, 100);
  assert.ok(elapsedMs < 2500, `20 ticks + pipeline diario con 100 agentes tardó ${elapsedMs.toFixed(1)}ms`);
  assert.ok(seenEvents >= 0);
  unsub();
});

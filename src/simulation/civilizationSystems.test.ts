import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState,
  tickSimulation,
} from './engine';
import {
  advanceDayAging,
  createHouseNearCenter,
  DAYS_PER_YEAR,
  migrateAndRecoverVillageState,
} from './rules';
import {
  applyGenerationAptitude,
  applyRetirementAndAgingModifiers,
  assignInitialTraits,
  divineAdjustTaxRate,
  divineForceSeason,
  divineGrantGlobalKnowledge,
  divineRepairAllStructures,
  divineSpawnVillager,
  divineTriggerEvent,
  ensureCivilizationDefaults,
  evaluateMilestones,
  getTraitLearningMultiplier,
  getTraitTradeMultiplier,
  getTraitWorkMultiplier,
  inheritTraitsFromParents,
  recordAgentMemory,
  updateDynamicMarketPrices,
  updateEcosystemHealth,
  updateRepresentativeThreeTierGoals,
  updateVillagePolitics,
} from './civilizationSystems';
import {
  createDefaultAIConfig,
  getAIProviderBadge,
  parseStructuredAIJson,
  queryAIProvider,
} from './aiProviders';

test('parseStructuredAIJson extracts plain JSON, fenced JSON, and embedded JSON', () => {
  const plain = parseStructuredAIJson<{ action: string }>('{"action":"build_house"}');
  assert.deepEqual(plain, { action: 'build_house' });

  const fenced = parseStructuredAIJson<{ ok: boolean }>('```json\n{"ok": true}\n```');
  assert.deepEqual(fenced, { ok: true });

  const embedded = parseStructuredAIJson<{ goal: number }>('Respuesta:\n{"goal": 42}\nFin.');
  assert.deepEqual(embedded, { goal: 42 });

  assert.equal(parseStructuredAIJson('sin json aqui'), null);
});

test('queryAIProvider handles all 4 AI modalities and fallback behavior', async () => {
  // 1. Modality: none
  const noneCfg = { ...createDefaultAIConfig(), modality: 'none' as const };
  const noneRes = await queryAIProvider(noneCfg, { systemPrompt: 's', userPrompt: 'u' });
  assert.equal(noneRes.ok, false);
  assert.equal(noneRes.source, 'none');

  // 2. Modality: ollama_qwen
  const qwenCfg = {
    ...createDefaultAIConfig(),
    modality: 'ollama_qwen' as const,
    status: 'ready' as const,
    localModel: 'qwen2.5:3b',
  };
  const mockOllamaFetch = (async () =>
    new Response(JSON.stringify({ response: '{"reply":"Hola aldea"}' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as unknown as typeof fetch;

  const qwenRes = await queryAIProvider(
    qwenCfg,
    { systemPrompt: 'sys', userPrompt: 'usr', jsonMode: true },
    mockOllamaFetch
  );
  assert.equal(qwenRes.ok, true);
  assert.equal(qwenRes.source, 'ollama');
  assert.equal(qwenCfg.status, 'connected');

  // 3. Modality: local_other (openai_compatible)
  const localOtherCfg = {
    ...createDefaultAIConfig(),
    modality: 'local_other' as const,
    localProtocol: 'openai_compatible' as const,
    localUrl: 'http://localhost:1234/v1/chat/completions',
    localModel: 'llama-3.2-3b',
    status: 'ready' as const,
  };
  const mockOpenAILocalFetch = (async () =>
    new Response(JSON.stringify({ choices: [{ message: { content: 'Decision local OK' } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })) as unknown as typeof fetch;

  const localRes = await queryAIProvider(
    localOtherCfg,
    { systemPrompt: 'sys', userPrompt: 'usr' },
    mockOpenAILocalFetch
  );
  assert.equal(localRes.ok, true);
  assert.equal(localRes.source, 'local');
  assert.equal(localRes.text, 'Decision local OK');

  // 4. Modality: cloud (/api/ai/query)
  const cloudCfg = {
    ...createDefaultAIConfig(),
    modality: 'cloud' as const,
    cloudProvider: 'gemini' as const,
    cloudModel: 'gemini-4-hydrogen',
    status: 'ready' as const,
  };
  const mockCloudFetch = (async (url: string | URL | Request) => {
    assert.equal(String(url), '/api/ai/query');
    return new Response(JSON.stringify({ text: 'Respuesta nube', providerLabel: 'Gemini' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }) as unknown as typeof fetch;

  const cloudRes = await queryAIProvider(
    cloudCfg,
    { systemPrompt: 'sys', userPrompt: 'usr' },
    mockCloudFetch
  );
  assert.equal(cloudRes.ok, true);
  assert.equal(cloudRes.source, 'cloud');
  assert.equal(cloudRes.text, 'Respuesta nube');

  // 5. Fallback on error
  const failCfg = {
    ...createDefaultAIConfig(),
    modality: 'cloud' as const,
    maxRetries: 0,
    autoFallback: true,
    status: 'ready' as const,
  };
  const mockFailFetch = (async () =>
    new Response(JSON.stringify({ error: 'Timeout remoto' }), { status: 503 })) as unknown as typeof fetch;

  const failRes = await queryAIProvider(failCfg, { systemPrompt: 'sys', userPrompt: 'usr' }, mockFailFetch);
  assert.equal(failRes.ok, false);
  assert.equal(failCfg.status, 'fallback');
  assert.equal(failCfg.consecutiveFailures, 1);

  const badge = getAIProviderBadge({ ...createDefaultAIConfig(), modality: 'none' });
  assert.equal(badge.modality, 'none');
});

test('personality traits never pair conflicting traits and modify agent rates', () => {
  for (let seed = 0; seed < 50; seed++) {
    const traits = assignInitialTraits(seed);
    assert.equal(traits.length, 2);
    assert.notEqual(traits[0], traits[1]);
    assert.equal(traits.includes('trabajador') && traits.includes('perezoso'), false);
    assert.equal(traits.includes('solidario') && traits.includes('agresivo'), false);
    assert.equal(traits.includes('curioso') && traits.includes('conservador'), false);
  }

  const state = createInitialState();
  const parentA = state.agents[0];
  const parentB = state.agents[1];
  parentA.job = 'Herrero';
  parentB.job = 'Carpintero';
  parentA.traits = ['trabajador', 'solidario'];
  parentB.traits = ['inteligente', 'curioso'];

  const child = state.agents[2];
  child.traits = inheritTraitsFromParents(parentA, parentB, 13);
  applyGenerationAptitude(child, parentA, parentB);
  assert.equal(child.generation, 2);
  assert.ok((child.aptitudeBonus?.Herrero ?? 0) > 0);

  parentA.traits = ['trabajador', 'comerciante'];
  parentB.traits = ['perezoso', 'generoso'];
  assert.ok(getTraitWorkMultiplier(parentA) > getTraitWorkMultiplier(parentB));
  assert.ok(getTraitTradeMultiplier(parentA) > getTraitTradeMultiplier(parentB));

  parentA.traits = ['inteligente', 'curioso'];
  assert.ok(getTraitLearningMultiplier(parentA) > 1.3);
});

test('agent memories deduplicate recent duplicates and enforce 20-item FIFO cap', () => {
  const state = createInitialState();
  const agent = state.agents[0];
  agent.memories = [];

  recordAgentMemory(state, agent, 'helped', 'Me curaron rápido', 'positive', 'Ana');
  recordAgentMemory(state, agent, 'helped', 'Me curaron rápido', 'positive', 'Ana');
  assert.equal(agent.memories.length, 1);

  for (let i = 0; i < 25; i++) {
    state.day += 3;
    recordAgentMemory(state, agent, 'work', `Intercambio #${i}`, 'neutral');
  }
  assert.equal(agent.memories.length, 20);
  assert.equal(agent.memories[0].summary, 'Intercambio #24');
});

test('retirement at 65+ shifts heavy jobs to scholarly roles', () => {
  const state = createInitialState();
  const miner = state.agents[0];
  miner.ageYears = 65;
  miner.isRetired = false;
  miner.job = 'Minero';
  miner.education = 50;

  applyRetirementAndAgingModifiers(state);
  assert.equal(miner.isRetired, true);
  assert.equal(miner.job, 'Maestro');
});

test('dynamic market prices, ecosystem health, politics, and 3-tier goals update coherently', () => {
  const state = createInitialState();
  for (const a of state.agents) {
    a.inv.food = 0;
    a.breadCount = 0;
    a.coins = 50;
  }
  state.economyReserve.backedCoinsCapacity = 40;
  updateDynamicMarketPrices(state);
  assert.ok((state.marketPrices?.inflationIndex ?? 1) > 1);
  assert.ok((state.marketPrices?.food ?? 0) >= 3);

  state.weather = 'drought';
  for (const r of state.resources) r.depleted = true;
  updateEcosystemHealth(state);
  assert.ok((state.ecosystemHealth ?? 100) < 86);

  // Low approval triggers emergency election & protests
  state.day = 30;
  for (const a of state.agents) {
    a.happiness = 5;
    a.houseId = null;
  }
  state.economyReserve.taxRatePct = 28;
  state.politics!.lastElectionDay = 1;
  state.politics!.approvalRating = 15;
  updateVillagePolitics(state);
  assert.ok((state.politics?.protestsCount ?? 0) >= 1);

  updateRepresentativeThreeTierGoals(state);
  assert.ok(state.representativeGoals?.shortTerm.length);
  assert.ok(state.representativeGoals?.mediumTerm.length);
  assert.ok(state.representativeGoals?.longTerm.length);
});

test('divine interventions, instant construction mode, aging multiplier, and natural/divine stats work', () => {
  const state = createInitialState();
  ensureCivilizationDefaults(state);

  const spawned = divineSpawnVillager(state, 2);
  assert.equal(spawned, 2);
  assert.equal(state.evolutionStats?.divine.villagersSpawned, 2);

  divineTriggerEvent(state, 'frost');
  assert.equal(state.activeDisaster?.kind, 'frost');
  assert.equal(state.season, 'Invierno');

  divineForceSeason(state, 'Primavera');
  assert.equal(state.season, 'Primavera');

  divineAdjustTaxRate(state, 12);
  assert.equal(state.economyReserve.taxRatePct, 12);

  divineGrantGlobalKnowledge(state, 15);
  assert.ok(state.knowledge >= 15);
  assert.equal(state.evolutionStats?.divine.knowledgeGranted, 15);

  const h = createHouseNearCenter(state, 'Constructor');
  h.durability = 40;
  const repaired = divineRepairAllStructures(state);
  assert.ok(repaired >= 1);
  assert.equal(h.durability, 100);

  // Instant construction completes immediately on tick
  state.divineMultipliers!.constructionMode = 'instant';
  const builder = state.agents[0];
  builder.job = 'Constructor';
  builder.taskType = 'build_house';
  builder.taskTimer = 10;
  builder.x = 640;
  builder.y = 660;
  builder.activeConstruction = {
    id: state.nextId++,
    kind: 'house',
    houseSize: 'small',
    zone: 'south',
    x: 640,
    y: 660,
    totalDuration: 1,
    elapsed: 0,
    reservedMaterials: { wood: 4 },
    fromPersonal: { wood: 4 },
    fromDepot: {},
    carpentryWoodConsumed: 0,
  };
  const housesBefore = state.houses.length;
  tickSimulation(state, 0.2);
  assert.equal(builder.activeConstruction, null);
  assert.equal(state.houses.length, housesBefore + 1);

  // Aging multiplier speeds up age increment
  state.divineMultipliers!.aging = 2;
  const target = state.agents[1];
  const initialAge = target.ageYears;
  state.day = DAYS_PER_YEAR * 2;
  advanceDayAging(state);
  assert.equal(target.ageYears, initialAge + 2);

  // Milestones check
  state.houses.push(
    createHouseNearCenter(state, 'Constructor'),
    createHouseNearCenter(state, 'Constructor')
  );
  evaluateMilestones(state);
  const firstSettlement = state.milestones?.find((m) => m.id === 'first_settlement');
  assert.equal(firstSettlement?.achieved, true);
});

test('legacy v1 simulation saves migrate safely without losing civilization defaults', () => {
  const legacy = createInitialState();
  delete legacy.aiConfig;
  delete legacy.interventionMode;
  delete legacy.divineMultipliers;
  delete legacy.marketPrices;
  delete legacy.politics;
  delete legacy.ecosystemHealth;
  delete legacy.evolutionStats;
  delete legacy.representativeGoals;
  delete legacy.chronicleArchive;
  delete legacy.milestones;
  for (const agent of legacy.agents) {
    delete agent.traits;
    delete agent.memories;
    delete agent.generation;
    delete agent.isRetired;
  }

  migrateAndRecoverVillageState(legacy);
  ensureCivilizationDefaults(legacy);

  const migrated: ReturnType<typeof createInitialState> = legacy;
  assert.ok(migrated.divineMultipliers);
  assert.ok(migrated.marketPrices);
  assert.ok(migrated.politics);
  assert.ok(migrated.representativeGoals);
  assert.ok(migrated.milestones && migrated.milestones.length >= 8);
  assert.ok(migrated.agents.every((a) => Array.isArray(a.traits) && a.traits.length === 2));
  assert.ok(migrated.agents.every((a) => typeof a.generation === 'number' && a.generation >= 1));
});

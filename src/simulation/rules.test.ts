import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addLog,
  addPreciousMetalToReserve,
  addRoadTile,
  advanceDayAging,
  advanceJobMastery,
  applyBuildingWear,
  applyQwenActions,
  assignMentorships,
  assignQwenAppearanceSetup,
  BRIDGE_COSTS,
  buildBaseRoads,
  canAgentRest,
  canAgentsReproduce,
  cancelActiveConstruction,
  canCarpenterUseWood,
  canGatherOrTradeMineral,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  collectTaxesAndRepayLoans,
  completeActiveConstruction,
  computeEra,
  computeSeason,
  computeUnlockedSkills,
  consumeConstructionResources,
  craftToolsForAgent,
  createAnimal,
  createBridge,
  createEmptyHouseStorage,
  createFarmPlot,
  createHouseNearCenter,
  createPlaza,
  createSpecialBuilding,
  createVillagePetition,
  cureAgent,
  CURRENT_SCHEMA_VERSION,
  DAY_DURATION_SECONDS,
  DAY_START_MINUTE,
  DAYS_PER_SEASON,
  DAYS_PER_YEAR,
  decideVillagerMajorAction,
  defendAgainstWildAnimal,
  deleteAnimal,
  deleteBridge,
  deleteFarmPlotById,
  deleteHouse,
  deletePlaza,
  deleteSpecialBuilding,
  depositResourcesToHouse,
  DISEASE_CATALOG,
  electRepresentative,
  enforceLawViolation,
  ensureQwenControlledRepresentative,
  extinguishFire,
  FISH_VARIANTS,
  FOREST_MAX_X,
  getBuildingOccupancySnapshot,
  getCompetingBuildingCount,
  getConciseTaskLabel,
  getEmotionWorkMultiplier,
  getHappinessLabel,
  getHealthStatusLabel,
  getHouseBuildCost,
  getHouseUpgradeCost,
  getJobMasteryTierLabel,
  getRoadTileCost,
  getSpecialBuildingCost,
  getTerrainZoneAt,
  GOLD_COIN_BACKING,
  grantBankLoan,
  hasAvailableOperatorForBuilding,
  HOUSE_SIZE_CAPACITIES,
  infectAgent,
  interpretQwenDirective,
  isBridgePassable,
  isBuildingOperational,
  isNearRoad,
  isNightMinute,
  isPointBlockedByStructures,
  isPointInRiverWater,
  killAgent,
  killAllCrops,
  killCropPlotAt,
  MAX_MAESTRO_JOBS_PER_AGENT,
  migrateAndRecoverVillageState,
  mintBackedCoins,
  modifyAgentKnowledge,
  modifyAgentResource,
  modifyHouseStorage,
  modifySpecialBuildingStorage,
  MOUNTAIN_MIN_X,
  NIGHT_DURATION_SECONDS,
  NIGHT_START_MINUTE,
  NORTH_CENTER_Y,
  PETITION_INTERVAL_SECONDS,
  pickBestPartnerForAgent,
  pickQwenBabyName,
  planBestConstructionProject,
  PLAZA_COSTS,
  PREGNANCY_DAYS,
  progressDiseasesDaily,
  queryVillageData,
  rebalanceBuildingOwnership,
  rebalanceFamilyHousing,
  repairDamagedStructures,
  resolveAnimalObstacleStep,
  resolvePetition,
  resolvePetitionWithQwen,
  RIVER_BOTTOM_Y,
  RIVER_FISH_RESTOCK_DAYS,
  RIVER_TOP_Y,
  runCouncilOfElders,
  runQwenRepresentativeAutonomousTurn,
  runThirtyDayMaintenance,
  sanitizeQwenActions,
  sanitizeQwenReply,
  scoreConstructionNeeds,
  setAgentJob,
  shouldBuildHouse,
  SILVER_COIN_BACKING,
  SOUTH_CENTER_Y,
  spawnFire,
  SPECIAL_BUILDING_COSTS,
  SPEED_TIMINGS,
  startConstructionProject,
  switchPartnerForAgent,
  syncSpecialBuildingStaff,
  tameWildAnimal,
  toggleSterileAgent,
  toggleVillageLaw,
  transferBuildingOwnership,
  transferMaterialsToConstructor,
  triggerLightningStorm,
  validateAndComputeConstructionPlan,
  VILLAGE_SKILLS,
  WORLD_CENTER_Y,
} from './rules';
import { computeAmbienceProfile } from '../audio/soundEngine';
import type { DiseaseInfo } from '../types/simulation';
import {
  askQwenAssistant,
  createAgent,
  createInitialState,
  pushFloatingEffect,
  spawnResource,
  spawnSettlers,
  tickSimulation,
} from './engine';

test('El juego inicia con 5 mujeres, 5 hombres, recursos finitos y sin ninguna construcción previa', () => {
  const state = createInitialState();
  const men = state.agents.filter((a) => a.sex === 'M');
  const women = state.agents.filter((a) => a.sex === 'F');

  assert.equal(state.agents.length, 10);
  assert.equal(men.length, 5);
  assert.equal(women.length, 5);
  assert.equal(state.houses.length, 0);
  assert.equal(state.specialBuildings.length, 0);
  assert.equal(state.farms.length, 0);
  assert.equal(state.roads.length, 0);
  assert.equal(state.plaza, null);
  assert.equal(state.bridge, null);
  assert.ok(state.agents.every((a) => a.houseId === null));
  assert.ok(state.resources.some((r) => r.type === 'copper'));
  assert.ok(state.resources.every((r) => r.maxAmount > 0 && r.depleted === false));
  assert.equal(state.riverFishStock, state.riverFishMaxStock);
  assert.equal(state.laws.length, 7);

  // Río horizontal en la mitad exacta del mapa (y≈446..514), sin fundadores ni animales terrestres en el agua
  assert.ok(RIVER_TOP_Y >= 400 && RIVER_BOTTOM_Y <= 560);
  assert.ok(WORLD_CENTER_Y >= RIVER_TOP_Y && WORLD_CENTER_Y <= RIVER_BOTTOM_Y);
  assert.ok(NORTH_CENTER_Y < RIVER_TOP_Y && SOUTH_CENTER_Y > RIVER_BOTTOM_Y);
  assert.ok(state.agents.every((a) => !isPointInRiverWater(a.x, a.y, null)));
  assert.ok(state.animals.filter((an) => an.type !== 'fish').every((an) => !isPointInRiverWater(an.x, an.y, null)));
  assert.ok(state.resources.some((r) => r.y < RIVER_TOP_Y));
  assert.ok(state.resources.some((r) => r.y > RIVER_BOTTOM_Y));
});

test('El día dura 7 minutos reales (420s) y la noche dura 3 minutos reales (180s)', () => {
  assert.equal(DAY_DURATION_SECONDS, 420);
  assert.equal(NIGHT_DURATION_SECONDS, 180);

  const state = createInitialState();
  state.speed = 1;
  state.minute = DAY_START_MINUTE;

  for (let s = 0; s < 420; s++) {
    tickSimulation(state, 1);
  }
  assert.ok(Math.abs(state.minute - NIGHT_START_MINUTE) < 0.05, `Esperado ~1200, fue ${state.minute}`);
  assert.equal(isNightMinute(state.minute), true);

  for (let s = 0; s < 180; s++) {
    tickSimulation(state, 1);
  }
  assert.equal(state.day, 2);
  assert.ok(Math.abs(state.minute - DAY_START_MINUTE) < 0.05, `Esperado ~360, fue ${state.minute}`);
  assert.equal(isNightMinute(state.minute), false);
});

test('Año de 120 días, estaciones de 30 días y cambio automático de bioma y clima al cambiar de estación', () => {
  assert.equal(DAYS_PER_SEASON, 30);
  assert.equal(DAYS_PER_YEAR, 120);
  assert.equal(computeSeason(1), 'Primavera');
  assert.equal(computeSeason(30), 'Primavera');
  assert.equal(computeSeason(31), 'Verano');
  assert.equal(computeSeason(61), 'Otoño');
  assert.equal(computeSeason(91), 'Invierno');
  assert.equal(computeSeason(121), 'Primavera');

  const state = createInitialState();
  const initialAge = state.agents[0].ageYears;
  state.day = 31;
  advanceDayAging(state);
  assert.equal(state.agents[0].ageYears, initialAge + 1);
  assert.equal(state.season, 'Verano');
  assert.equal(state.biome, 'arid');
  assert.equal(state.weather, 'sunny');

  state.day = 61;
  advanceDayAging(state);
  assert.equal(state.season, 'Otoño');
  assert.equal(state.biome, 'forest');
  assert.equal(state.weather, 'rain');

  state.day = 91;
  advanceDayAging(state);
  assert.equal(state.season, 'Invierno');
  assert.equal(state.biome, 'tundra');
  assert.equal(state.weather, 'storm');
});

test('Las 5 enfermedades exactas y Cáncer incurable fatal entre 10 y 15 días', () => {
  assert.equal(Object.keys(DISEASE_CATALOG).length, 5);
  assert.equal(DISEASE_CATALOG.gripe.dangerPct, 25);
  assert.equal(DISEASE_CATALOG.dolor_estomacal.dangerPct, 40);
  assert.equal(DISEASE_CATALOG.pulmonia.dangerPct, 55);
  assert.equal(DISEASE_CATALOG.sepsis.dangerPct, 80);
  assert.equal(DISEASE_CATALOG.cancer.dangerPct, 100);
  assert.equal(DISEASE_CATALOG.cancer.baseChancePct, 1);
  assert.equal(DISEASE_CATALOG.cancer.incurable, true);

  const state = createInitialState();
  const agent = state.agents[0];
  assert.equal(getHealthStatusLabel(agent).status, 'Sano');
  assert.equal(getHealthStatusLabel(agent).levelLabel, 'Óptima');

  infectAgent(state, agent.id, 'gripe');
  assert.equal(agent.isSick, true);
  assert.equal(agent.illness?.name, 'Gripe');
  assert.equal(getHealthStatusLabel(agent).status, 'Enfermo');

  cureAgent(state, agent.id);
  assert.equal(agent.isSick, false);
  assert.equal(agent.illness, null);

  // Cáncer es incurable
  infectAgent(state, agent.id, 'cancer');
  const cancerIllness = (agent as { illness: DiseaseInfo | null }).illness;
  assert.ok(cancerIllness);
  assert.equal(cancerIllness.incurable, true);
  assert.ok(cancerIllness.fatalAfterDays! >= 10 && cancerIllness.fatalAfterDays! <= 15);
  cureAgent(state, agent.id);
  assert.equal(agent.isSick, true); // Sigue enfermo por ser incurable

  const fatalDays = cancerIllness.fatalAfterDays!;
  for (let d = 0; d < fatalDays; d++) {
    const res = progressDiseasesDaily(state, agent);
    if (d === fatalDays - 1) {
      assert.equal(res.diedFromDisease, true);
    }
  }
});

test('Pareja desde 15 años, reproducción desde 20 solo con wantsChildren, embarazo de 3 días y nombres por Qwen 2.5', () => {
  assert.equal(PREGNANCY_DAYS, 3);
  const state = createInitialState();
  const men = state.agents.filter((a) => a.sex === 'M');
  const women = state.agents.filter((a) => a.sex === 'F');
  const m1 = men[0];
  const f1 = women[0];

  const h = createHouseNearCenter(state, 'Mateo', 'south', 'large');
  assert.equal(h.capacity, 8);
  m1.houseId = h.id;
  f1.houseId = h.id;

  // Menor de 15 años no puede formar pareja
  m1.ageYears = 14;
  f1.ageYears = 16;
  assert.equal(decideVillagerMajorAction(state, m1, 'partnership', { partner: f1 }).approved, false);

  // Con 15+ puede formar pareja
  m1.ageYears = 16;
  assert.equal(decideVillagerMajorAction(state, m1, 'partnership', { partner: f1 }).approved, true);
  m1.partnerId = f1.id;
  f1.partnerId = m1.id;

  // Menor de 20 no puede reproducirse
  assert.equal(canAgentsReproduce(m1, f1, state.houses, state.agents, state.policies), false);

  // Con 20+ pero libre albedrío sin hijos -> bloqueado
  m1.ageYears = 21;
  f1.ageYears = 21;
  m1.wantsChildren = false;
  f1.wantsChildren = true;
  assert.equal(canAgentsReproduce(m1, f1, state.houses, state.agents, state.policies), false);

  // Ambos desean hijos -> permitido
  m1.wantsChildren = true;
  assert.equal(canAgentsReproduce(m1, f1, state.houses, state.agents, state.policies), true);

  // Embarazo de 3 días culmina en nacimiento con nombre elegido por Qwen 2.5
  const popBefore = state.agents.length;
  f1.pregnancy = { partnerId: m1.id, daysRemaining: 3, conceptionDay: state.day };
  const babyNameCandidate = pickQwenBabyName('F', state);
  assert.ok(babyNameCandidate.length >= 3);

  state.day++;
  advanceDayAging(state);
  assert.equal(f1.pregnancy?.daysRemaining, 2);
  assert.equal(state.agents.length, popBefore);

  state.day++;
  advanceDayAging(state);
  assert.equal(f1.pregnancy?.daysRemaining, 1);
  assert.equal(state.agents.length, popBefore);

  state.day++;
  const day3Res = advanceDayAging(state);
  assert.equal(day3Res.births, 1);
  assert.equal(f1.pregnancy, null);
  assert.equal(state.agents.length, popBefore + day3Res.births - day3Res.diedOfOldAge);
  const newborn = state.agents.find((a) => a.ageYears === 0)!;
  assert.ok(newborn);
  assert.equal(newborn.ageYears, 0);
  assert.ok(newborn.lastQwenDecision?.includes('Qwen 2.5'));

  // Esterilizar bloquea reproducción
  toggleSterileAgent(state, m1.id);
  assert.equal(canAgentsReproduce(m1, f1, state.houses, state.agents, state.policies), false);
});

test('Matar a un aldeano lo elimina, transfiere herencia y afecta a su pareja', () => {
  const state = createInitialState();
  const a = state.agents.find((x) => x.sex === 'M')!;
  const b = state.agents.find((x) => x.sex === 'F')!;
  a.coins = 25;
  b.coins = 10;
  a.partnerId = b.id;
  b.partnerId = a.id;
  const countBefore = state.agents.length;

  killAgent(state, a.id);
  assert.equal(state.agents.length, countBefore - 1);
  assert.equal(b.partnerId, null);
  assert.equal(b.emotion, 'sad');
  assert.equal(b.coins, 35);
  assert.equal(getHappinessLabel(15), 'Depresión');
  assert.equal(getHappinessLabel(92, 'excited'), 'Excitación');
});

test('Sin límite artificial de 48 aldeanos: soporta > 50 agentes', () => {
  const state = createInitialState();
  for (let i = 0; i < 45; i++) {
    state.agents.push(createAgent(500 + i, `Extra${i}`, i % 2 === 0 ? 'M' : 'F', 300, 300, null, 22));
  }
  assert.ok(state.agents.length > 50);
  tickSimulation(state);
  assert.ok(state.agents.length > 50);
});

test('La actividad actual es concisa y estable entre ticks consecutivos', () => {
  const state = createInitialState();
  tickSimulation(state);
  const firstActivity = state.agents[0].activity;
  assert.ok(firstActivity.length > 0 && firstActivity.length <= 28);

  tickSimulation(state);
  tickSimulation(state);
  assert.equal(state.agents[0].activity, firstActivity);
  assert.equal(getConciseTaskLabel('build_house'), 'Construyendo casa');
  assert.equal(getConciseTaskLabel('extinguish_fire'), 'Apagando incendio');
  assert.equal(getConciseTaskLabel('caravan'), 'Caravana comercial');
});

test('Qwen 2.5 decide obras, exige operarios disponibles y construye casas solo si hacen falta', () => {
  const state = createInitialState();
  state.agents[0].job = 'Constructor';
  state.agents[0].inv.wood += 140;
  state.agents[0].inv.pineWood += 30;
  state.agents[0].inv.oakWood += 25;
  state.agents[0].inv.stone += 90;
  state.agents[0].inv.iron += 25;
  state.agents[0].inv.copper += 15;

  assert.equal(shouldBuildHouse(state), true); // Hay 10 sin casa

  const founding = interpretQwenDirective(
    'Construir plaza, puente y 2 casas',
    state.agents.map((a) => a.name)
  );
  applyQwenActions(state, founding.actions, spawnSettlers);
  assert.ok(state.plaza !== null);
  assert.ok(state.bridge !== null);
  assert.equal(state.houses.length, 2);

  // Cuando todos tienen casa y ninguna excede su capacidad, shouldBuildHouse es false
  for (const h of state.houses) {
    h.size = 'large';
    h.capacity = 8;
  }
  state.agents.forEach((ag, idx) => {
    ag.houseId = state.houses[idx % 2].id;
  });
  assert.equal(shouldBuildHouse(state), false);

  const econ = interpretQwenDirective(
    'Genera una economía, construir comercios, caminos y permite más aldeanos',
    state.agents.map((a) => a.name)
  );
  const mintedBeforeEcon = state.economyReserve.mintedCoins;
  applyQwenActions(state, econ.actions, spawnSettlers);
  assert.equal(state.policies.economyFocus, true);
  assert.equal(state.economyReserve.mintedCoins, mintedBeforeEcon); // Nunca emite monedas gratis al generar economía
  assert.ok(state.specialBuildings.some((b) => b.type === 'bank'));
  assert.ok(state.specialBuildings.some((b) => b.type === 'market'));
  assert.ok(state.specialBuildings.some((b) => b.type === 'general_depot'));
  assert.ok(state.roads.length > 8);

  // Verificar compuerta estricta de operario: bloquear todos los adultos como Banquero ocupado y pedir otro edificio
  const tinyState = createInitialState();
  tinyState.agents = [tinyState.agents[0]];
  tinyState.agents[0].inv.wood = 20;
  tinyState.agents[0].inv.stone = 20;
  const firstB = createSpecialBuilding(tinyState, 'bank', 'Mateo');
  assert.ok(firstB);
  assert.equal(hasAvailableOperatorForBuilding(tinyState, 'school'), false);
  const noOpSchool = createSpecialBuilding(tinyState, 'school', 'Mateo');
  assert.equal(noOpSchool, null);

  const direct = interpretQwenDirective('Mateo que sea herrero', state.agents.map((a) => a.name));
  applyQwenActions(state, direct.actions, spawnSettlers);
  const mateo = state.agents.find((a) => a.name === 'Mateo');
  assert.ok(mateo);
  assert.equal(mateo.job, 'Herrero');
  assert.notEqual(computeEra(200, [createHouseNearCenter(state, 'X', 'south'), ...state.houses]), 'primitive');
});

test('Matar cultivos, puente sobre río, caminos con costo real y pausa total de recursos', () => {
  const state = createInitialState();
  state.agents[0].job = 'Constructor';
  state.agents[0].inv.wood = 80;

  createFarmPlot(state, 'south');
  createFarmPlot(state, 'south');
  assert.equal(state.farms.length, 2);

  const firstPlot = state.farms[0];
  assert.ok(killCropPlotAt(state, firstPlot.x + 2, firstPlot.y - 2));
  assert.equal(state.farms.length, 1);
  assert.equal(killAllCrops(state), 1);
  assert.equal(state.farms.length, 0);

  for (const r of state.resources) {
    assert.equal(isPointInRiverWater(r.x, r.y, null), false);
  }
  assert.equal(addRoadTile(state, 720, RIVER_TOP_Y + 24), null);
  const bridge = createBridge(state, 'Mateo');
  assert.ok(addRoadTile(state, bridge.x, RIVER_TOP_Y + 24));
  createPlaza(state, 'Elena');
  createHouseNearCenter(state, 'Elena', 'north');
  assert.ok(buildBaseRoads(state) > 5);
  assert.equal(isNearRoad(state.roads, bridge.x, RIVER_TOP_Y + 24), true);

  state.resources = [];
  state.resourcesPaused = true;
  assert.equal(spawnResource(state, 'food', 200, 300), false);
  state.minute = 1439.9;
  tickSimulation(state, 1);
  assert.equal(state.resources.length, 0);
});

test('Viviendas: capacidades 4/6/8, baúl SOLO Alimento y Monedas con eliminación exclusiva y Depósito General', () => {
  const state = createInitialState();
  const hSmall = createHouseNearCenter(state, 'A', 'south', 'small');
  const hMed = createHouseNearCenter(state, 'B', 'south', 'medium');
  const hLarge = createHouseNearCenter(state, 'C', 'south', 'large');
  assert.equal(hSmall.capacity, HOUSE_SIZE_CAPACITIES.small);
  assert.equal(hMed.capacity, HOUSE_SIZE_CAPACITIES.medium);
  assert.equal(hLarge.capacity, HOUSE_SIZE_CAPACITIES.large);
  assert.equal(hSmall.capacity, 4);
  assert.equal(hMed.capacity, 6);
  assert.equal(hLarge.capacity, 8);

  // El usuario NO puede agregar ítems al baúl de la casa ni guardar madera/piedra/oro
  assert.equal(modifyHouseStorage(state, hSmall.id, 'food', 5, true), false);
  assert.equal(modifyHouseStorage(state, hSmall.id, 'wood', -1, true), false);
  hSmall.storage.food = 4;
  assert.equal(modifyHouseStorage(state, hSmall.id, 'food', -1, true), true);
  assert.equal(hSmall.storage.food, 3);

  // Depositar lleva food & coins a casa, y materiales al Depósito General
  state.agents[0].inv.wood = 10;
  state.agents[0].inv.stone = 10;
  const depot = createSpecialBuilding(state, 'general_depot', 'Mateo')!;
  assert.ok(depot);
  const agent = state.agents[1];
  agent.houseId = hMed.id;
  agent.inv.food = 5;
  agent.inv.wood = 4;
  agent.inv.copper = 3;
  agent.coins = 30;

  depositResourcesToHouse(agent, hMed, 'all', depot);
  assert.equal(agent.inv.food, 0);
  assert.equal(agent.coins, 0);
  assert.equal(hMed.storage.food, 6); // 1 inicial + 5
  assert.equal(hMed.storage.coins, 30);
  assert.equal(hMed.storage.wood, 0); // Nunca guarda materiales en casa
  assert.equal(depot.storage.wood, 4);
  assert.equal(depot.storage.copper, 3);

  // Co-habitación familiar: si se excede capacidad (4 en chica), se mudan o independiza hijo adulto mayor
  const soloState = createInitialState();
  const sHouse = createHouseNearCenter(soloState, 'Padre', 'south', 'small');
  const overflowHouse = createHouseNearCenter(soloState, 'Extra', 'south', 'small');
  for (let i = 0; i < 6; i++) {
    soloState.agents[i].houseId = sHouse.id;
    soloState.agents[i].parents = 'Padre & Madre';
    soloState.agents[i].ageYears = 18 + i;
  }
  rebalanceFamilyHousing(soloState);
  assert.ok(soloState.agents.filter((a) => a.houseId === sHouse.id).length <= sHouse.capacity);
  assert.ok(soloState.agents.some((a) => a.houseId === overflowHouse.id));
});

test('Sin casa no puede descansar y pierde energía/salud cada día', () => {
  const state = createInitialState();
  const homeless = state.agents[0];
  homeless.houseId = null;
  assert.equal(canAgentRest(homeless), false);

  const energyBefore = homeless.energy;
  const healthBefore = homeless.health;
  state.minute = 1280;
  homeless.taskType = 'sleep';
  homeless.taskTimer = 30;
  for (let i = 0; i < 20; i++) tickSimulation(state, 0.1);
  assert.notEqual(homeless.taskType, 'sleep'); // No puede dormir sin casa

  advanceDayAging(state);
  assert.ok(homeless.energy < energyBefore);
  assert.ok(homeless.health < healthBefore);
});

test('25 Skills, solo Saber General editable por jugador, 3 Maestrías máx y minería por skills', () => {
  assert.equal(VILLAGE_SKILLS.length, 25);
  assert.equal(computeUnlockedSkills(100).length, 25);

  const state = createInitialState();
  const a1 = state.agents[0];
  const eduBefore = a1.education;

  // Jugador solo modifica Saber General
  assert.equal(modifyAgentKnowledge(state, a1.id, 20, 'carpentry'), null);
  assert.equal(modifyAgentKnowledge(state, a1.id, 20, 'construction'), null);
  const msg = modifyAgentKnowledge(state, a1.id, 20, 'general');
  assert.ok(msg);
  assert.equal(a1.education, eduBefore + 20);

  // Máximo 3 oficios Maestro (>70%)
  advanceJobMastery(a1, 'Herrero', 85);
  advanceJobMastery(a1, 'Carpintero', 85);
  advanceJobMastery(a1, 'Minero', 85);
  advanceJobMastery(a1, 'Comerciante', 95); // 4to debe quedar en tope Comerciante (70%)
  assert.equal(Object.values(a1.jobMastery).filter((v) => (v ?? 0) > 70).length, MAX_MAESTRO_JOBS_PER_AGENT);
  assert.equal(a1.jobMastery.Comerciante, 70);
  assert.equal(getJobMasteryTierLabel(25), 'Operario');
  assert.equal(getJobMasteryTierLabel(55), 'Comerciante');
  assert.equal(getJobMasteryTierLabel(85), 'Maestro');

  // Minerales desbloqueados por skills
  a1.education = 4;
  modifyAgentKnowledge(state, a1.id, 4, 'general'); // 8% -> mineria_cobre
  assert.equal(canGatherOrTradeMineral(a1, 'copper'), true);
  assert.equal(canGatherOrTradeMineral(a1, 'gold'), false);

  a1.carpentryKnowledge = 50;
  a1.job = 'Carpintero';
  assert.equal(canCarpenterUseWood(a1, 'maple'), true);
  assert.equal(canCarpenterUseWood(a1, 'oak'), false);
  assert.ok(getEmotionWorkMultiplier('excited') > 1.2);
  assert.ok(getEmotionWorkMultiplier('depressed') < 0.8);
});

test('Edificios especiales: depósito estricto, propietario exclusivo, competencia hasta 3 y transferencia', () => {
  const state = createInitialState();
  state.agents[0].inv.wood = 20;
  state.agents[0].inv.stone = 20;

  const dock = createSpecialBuilding(state, 'dock', 'Mateo')!;
  assert.ok(dock);
  assert.deepEqual(dock.allowedStorage, ['food', 'coins']);
  assert.equal(modifySpecialBuildingStorage(state, dock.id, 'gold', 5), false); // Bloqueado en Muelle
  assert.equal(modifySpecialBuildingStorage(state, dock.id, 'food', 3), true);
  assert.ok(dock.ownerId !== null);

  // Competencia comercial: hasta 3 panaderías
  const b1 = createSpecialBuilding(state, 'bakery', 'Mateo')!;
  const b2 = createSpecialBuilding(state, 'bakery', 'Lucas')!;
  assert.ok(b1 && b2);
  assert.equal(getCompetingBuildingCount(state, 'bakery'), 2);
  assert.notEqual(b1.ownerId, b2.ownerId);

  // Transferencia de propiedad manual y autónoma (Qwen 2.5)
  const newOwner = state.agents[5];
  assert.equal(transferBuildingOwnership(state, b1.id, newOwner.id, 'venta directa'), true);
  assert.equal(b1.ownerId, newOwner.id);

  // Compraventa autónoma cuando el propietario está exhausto/triste y otro aldeano sabio tiene monedas
  newOwner.happiness = 20;
  const buyer = state.agents[6];
  buyer.assignedBuildingId = null;
  buyer.education = 40;
  buyer.coins = b1.price + 20;
  assert.equal(rebalanceBuildingOwnership(state), 1);
  assert.equal(b1.ownerId, buyer.id);
});

test('Recursos finitos y cardumen del río tarda 3 días en renovar peces', () => {
  assert.equal(RIVER_FISH_RESTOCK_DAYS, 3);
  const state = createInitialState();
  state.petitionTimerSec = 99999; // Aíslar ciclo de 3 días de la pausa de petición
  state.resources = [
    {
      id: 999,
      type: 'food',
      x: 500,
      y: 500,
      amount: 1,
      maxAmount: 5,
      depleted: true,
      restTimer: 1,
    },
  ];
  state.riverFishStock = 0;
  state.riverFishRestTimer = RIVER_FISH_RESTOCK_DAYS;

  // Avanzar 2 días completos de juego (a x1: 420s día + 180s noche = 600s/día -> 1200s = 2 días)
  for (let i = 0; i < 120; i++) tickSimulation(state, 10);
  assert.equal(state.resources[0].depleted, false);
  assert.equal(state.resources[0].amount, state.resources[0].maxAmount);
  assert.equal(state.riverFishStock, 0);
  assert.ok(state.riverFishRestTimer > 0.9 && state.riverFishRestTimer <= 1.05);

  // Avanzar 1 día completo adicional (3 días en total) -> renueva cardumen completo
  for (let i = 0; i < 65; i++) tickSimulation(state, 10);
  assert.equal(state.riverFishStock, state.riverFishMaxStock);
  assert.equal(state.riverFishRestTimer, 0);
});

test('Leyes, Comisaría + Cárcel y Peticiones del Representante cada 30 min ("Fue Escuchado" / "No fue Escuchado")', () => {
  assert.equal(PETITION_INTERVAL_SECONDS, 1800);
  const state = createInitialState();
  state.agents[0].inv.wood = 30;
  state.agents[0].inv.stone = 30;

  createSpecialBuilding(state, 'police_station', 'Mateo');
  createSpecialBuilding(state, 'prison', 'Lucas');
  toggleVillageLaw(state, 'ban_fishing', true, 'Jugador');
  assert.equal(enforceLawViolation(state, state.agents[4], 'ban_fishing'), true);
  assert.equal(state.agents[4].jailedDays, 2);

  const rep = electRepresentative(state);
  assert.ok(rep);

  // Petición constructiva: "Fue Escuchado" mejora ánimo y reanuda simulación
  state.speed = 2;
  const pPos = createVillagePetition(state, false)!;
  assert.ok(pPos);
  assert.equal(state.speed, 0);
  assert.equal(state.autoPausedByPetition, true);
  const happyBefore = state.agents[0].happiness;
  resolvePetition(state, true);
  assert.equal(state.pendingPetition, null);
  assert.equal(state.speed, 2);
  assert.ok(state.agents[0].happiness >= happyBefore);

  // Petición negativa: escucharla daña ánimo/salud, rechazarla ("No fue Escuchado") protege
  const pNeg = createVillagePetition(state, true)!;
  assert.equal(pNeg.isNegative, true);
  const happyBeforeNeg = state.agents[0].happiness;
  resolvePetition(state, true);
  assert.ok(state.agents[0].happiness < happyBeforeNeg);
});

test('Tormentas eléctricas, incendios, préstamos bancarios, contratos de aprendizaje, desgaste y Consejo de Ancianos', () => {
  const state = createInitialState();
  state.agents[0].inv.wood = 40;
  state.agents[0].inv.stone = 40;
  createHouseNearCenter(state, 'Mateo', 'south');
  createSpecialBuilding(state, 'bank', 'Mateo');

  // Préstamos e impuestos
  const borrower = state.agents[3];
  borrower.job = 'Constructor';
  const loan = grantBankLoan(state, borrower, 15, 'obra');
  assert.ok(loan);
  assert.ok(borrower.loanDebt > 0);
  borrower.coins = 30;
  collectTaxesAndRepayLoans(state);
  assert.ok(borrower.loanDebt < loan.remaining + 1);

  // Aprendizaje Maestro-Aprendiz
  state.agents[0].education = 75;
  state.agents[5].job = 'Aprendiz';
  state.agents[5].education = 8;
  assert.ok(assignMentorships(state) >= 1);
  assert.equal(state.agents[5].mentorId, state.agents[0].id);

  // Tormenta eléctrica, fuego y extinción
  const fire = triggerLightningStorm(state)!;
  assert.ok(fire);
  assert.equal(state.weather, 'thunderstorm');
  assert.equal(state.fires.length, 1);
  assert.equal(extinguishFire(state, fire.id, state.agents[1]), true);
  assert.equal(state.fires.length, 0);

  // Desgaste y reparación
  applyBuildingWear(state);
  assert.ok(state.houses[0].durability < 100);
  state.houses[0].durability = 50;
  state.agents[0].inv.wood = 4;
  state.agents[0].inv.stone = 4;
  assert.ok(repairDamagedStructures(state, state.agents[0]) >= 1);
  assert.ok(state.houses[0].durability > 50);

  // Consejo de Ancianos
  for (let i = 0; i < 4; i++) {
    state.agents.push(createAgent(900 + i, `Consejo${i}`, 'M', 400, 400));
  }
  state.day = 12;
  state.season = 'Invierno';
  for (const ag of state.agents) ag.inv.food = 0;
  for (const h of state.houses) h.storage.food = 0;
  runCouncilOfElders(state);
  assert.equal(state.laws.some((l) => l.id === 'winter_rationing' && l.active), true);
});

test('Economía respaldada en Oro y Plata, Crónica ilimitada en estado, Defensa, Taming, Eliminación y Velocidades x2/x4', () => {
  assert.equal(CANVAS_WIDTH, 1440);
  assert.equal(CANVAS_HEIGHT, 960);
  assert.equal(getTerrainZoneAt(FOREST_MAX_X - 40), 'forest');
  assert.equal(getTerrainZoneAt(MOUNTAIN_MIN_X + 40), 'mountain');

  const state = createInitialState();
  assert.equal(mintBackedCoins(state, 5), 0);
  addPreciousMetalToReserve(state, 'gold', 1);
  addPreciousMetalToReserve(state, 'silver', 1);
  assert.equal(state.economyReserve.backedCoinsCapacity, 120 + GOLD_COIN_BACKING + SILVER_COIN_BACKING);
  assert.equal(mintBackedCoins(state, 50), 35);

  const sBank = createSpecialBuilding(state, 'bank', 'Test')!;
  assert.equal(isBuildingOperational(state, 'bank'), true);
  deleteSpecialBuilding(state, sBank.id);

  // Crónicas hasta 80 en estado (el panel UI EventLogPanel muestra máx 20)
  for (let i = 0; i < 30; i++) addLog(state, `Evento ${i}`, 'slate');
  assert.ok(state.logs.length >= 25);

  // Defensa y doma
  const defender = state.agents[0];
  defender.toolsCount = 1;
  const bear = createAnimal(state, 'bear', defender.x + 8, defender.y);
  assert.ok(defendAgainstWildAnimal(state, defender, bear).damageDealt >= 20);
  defender.education = 55;
  assert.equal(tameWildAnimal(state, bear, defender), true);

  // Fauna completa incluyendo 4 peces
  const variants = FISH_VARIANTS.map((v) => createAnimal(state, 'fish', undefined, undefined, v).fishVariant);
  assert.deepEqual(variants, FISH_VARIANTS);

  // Herramientas desde 36% saber: exige 1 cobre + 1 hierro (nunca madera sola)
  defender.education = 36;
  defender.inv.wood = 5;
  defender.inv.copper = 0;
  defender.inv.iron = 0;
  assert.equal(craftToolsForAgent(state, defender), false);
  defender.inv.copper = 1;
  defender.inv.iron = 1;
  assert.equal(craftToolsForAgent(state, defender), true);
  assert.equal(defender.inv.copper, 0);
  assert.equal(defender.inv.iron, 0);

  // Eliminación desde inspector
  const house = createHouseNearCenter(state, 'Mateo', 'south');
  assert.equal(deleteHouse(state, house.id), true);
  createPlaza(state, 'Mateo');
  assert.equal(deletePlaza(state), true);
  createBridge(state, 'Lucas');
  assert.equal(deleteBridge(state), true);
  const farm = createFarmPlot(state, 'south');
  assert.equal(deleteFarmPlotById(state, farm.id), true);
  assert.equal(deleteAnimal(state, bear.id), true);

  // Velocidades x2 y x4
  assert.equal(SPEED_TIMINGS[2].daySeconds, 300);
  assert.equal(SPEED_TIMINGS[2].nightSeconds, 90);
  assert.equal(SPEED_TIMINGS[4].daySeconds, 150);
  assert.equal(SPEED_TIMINGS[4].nightSeconds, 60);
  const s2 = createInitialState();
  s2.speed = 2;
  s2.minute = DAY_START_MINUTE;
  for (let i = 0; i < 300; i++) tickSimulation(s2, 1);
  assert.ok(Math.abs(s2.minute - NIGHT_START_MINUTE) < 0.05);

  // Cambiar de pareja y recursos negativos
  state.agents[0].partnerId = state.agents[1].id;
  state.agents[1].partnerId = state.agents[0].id;
  assert.equal(switchPartnerForAgent(state, state.agents[0].id, 'prueba').switched, true);
  assert.equal(consumeConstructionResources(state, state.agents[0], { stone: 999 }), false);
  const f1 = createFarmPlot(state, 'south');
  assert.ok(f1.id > 0);
  const mRes = modifyAgentResource(state, state.agents[0].id, 'copper', 2);
  assert.ok(mRes && mRes.includes('cobre'));
});

test('Costos exactos de viviendas N1-N4, Plaza, Puente (sin sustituir maderas), Caminos y 13 Edificios', () => {
  assert.deepEqual(getHouseBuildCost('small'), { wood: 3 });
  assert.deepEqual(getHouseBuildCost('medium'), { wood: 4 });
  assert.deepEqual(getHouseBuildCost('large'), { wood: 6 });
  assert.deepEqual(getHouseUpgradeCost('small', 2), { pineWood: 5, stone: 2 });
  assert.deepEqual(getHouseUpgradeCost('medium', 3), { stone: 8, oakWood: 4 });
  assert.deepEqual(getHouseUpgradeCost('large', 4), { stone: 14, iron: 9, oakWood: 7 });
  assert.deepEqual(PLAZA_COSTS.build, { wood: 15, stone: 15, oakWood: 5, iron: 4 });
  assert.deepEqual(BRIDGE_COSTS.build, { oakWood: 12, stone: 10, iron: 6, copper: 3 });
  assert.deepEqual(getRoadTileCost('dirt', false), { wood: 1 });
  assert.deepEqual(getRoadTileCost('stone', false), { stone: 3 });
  assert.deepEqual(getRoadTileCost('reinforced', true), { stone: 2, wood: 3, copper: 1, iron: 1 });
  assert.equal(Object.keys(SPECIAL_BUILDING_COSTS).length, 13);
  assert.deepEqual(getSpecialBuildingCost('bank', 1), {
    wood: 12,
    stone: 12,
    oakWood: 6,
    iron: 6,
    copper: 3,
  });
  assert.deepEqual(getSpecialBuildingCost('town_hall', 3), {
    oakWood: 10,
    stone: 10,
    iron: 8,
    copper: 5,
    silver: 2,
  });

  // El Puente exige Roble explícitamente y NO acepta Madera común ni Pino como sustituto
  const state = createInitialState();
  const builder = state.agents[0];
  builder.job = 'Constructor';
  builder.inv.wood = 99;
  builder.inv.pineWood = 99;
  builder.inv.stone = 20;
  builder.inv.iron = 10;
  builder.inv.copper = 10;
  builder.inv.oakWood = 0;

  assert.equal(startConstructionProject(state, builder, 'bridge').ok, false);
  assert.equal(state.bridge, null);

  builder.inv.oakWood = 12;
  const started = startConstructionProject(state, builder, 'bridge', { duration: 10 });
  assert.equal(started.ok, true);
  assert.equal(builder.inv.oakWood, 0);
  assert.equal(completeActiveConstruction(state, builder), true);
  assert.ok(state.bridge !== null);

  // Caminos: nunca gratuitos (ni con farol)
  const noWoodState = createInitialState();
  noWoodState.agents[0].job = 'Constructor';
  noWoodState.agents[0].inv.wood = 0;
  assert.equal(addRoadTile(noWoodState, 500, 620, 'dirt', false), null);
  noWoodState.agents[0].inv.wood = 3;
  assert.equal(addRoadTile(noWoodState, 500, 620, 'dirt', true), null); // Falta 1 cobre + 1 hierro del farol
  noWoodState.agents[0].inv.copper = 1;
  noWoodState.agents[0].inv.iron = 1;
  const litRoad = addRoadTile(noWoodState, 500, 620, 'dirt', true);
  assert.ok(litRoad);
  assert.equal(litRoad.hasLamp, true);
  assert.equal(noWoodState.agents[0].inv.wood, 0);
  assert.equal(noWoodState.agents[0].inv.copper, 0);
  assert.equal(noWoodState.agents[0].inv.iron, 0);
});

test('Origen estricto (solo Constructor + Depósito General), descuento Carpintería con consumo real y cancelación proporcional', () => {
  const state = createInitialState();
  const builder = state.agents[0];
  builder.job = 'Constructor';
  const bystander = state.agents[1];
  bystander.inv.wood = 50;
  bystander.inv.stone = 50;
  const someHouse = createHouseNearCenter(state, 'X', 'south', 'small');
  someHouse.storage.wood = 50; // Bloqueado: no es Depósito General

  builder.inv.wood = 2; // Insuficiente para casa chica sin descuento (3 wood)
  assert.equal(startConstructionProject(state, builder, 'house', { houseSize: 'small' }).ok, false);
  assert.equal(bystander.inv.wood, 50); // Nunca toma de otro aldeano

  // Con Depósito General operativo, extrae lo faltante del depósito y registra 'extraccion_deposito'
  const depot = createSpecialBuilding(state, 'general_depot', 'Mateo')!;
  assert.ok(depot);
  depot.storage.wood = 5;
  const startFromDepot = startConstructionProject(state, builder, 'house', { houseSize: 'small', duration: 20 });
  assert.equal(startFromDepot.ok, true);
  assert.equal(builder.inv.wood, 0);
  assert.equal(depot.storage.wood, 4);
  assert.ok(state.resourceLedger.some((r) => r.operationType === 'extraccion_deposito'));

  // Cancelación al cambiar de oficio a mitad de obra (50% progreso) reembolsa proporcionalmente y registra 'cancelacion'
  assert.ok(builder.activeConstruction);
  builder.activeConstruction!.elapsed = 10; // 50% de 20
  setAgentJob(state, builder, 'Minero', 'prueba');
  assert.equal(builder.activeConstruction, null);
  assert.equal(builder.inv.wood, 1); // 2 - floor(2 * 0.5) = 1
  assert.equal(depot.storage.wood, 5); // 4 + (1 - floor(1 * 0.5)) = 5
  assert.ok(state.resourceLedger.some((r) => r.operationType === 'cancelacion'));

  // Descuento de Carpintería (-1 madera en viviendas) SOLO aplica si está operativa Y consume 1 madera de su depósito
  const sCarp = createInitialState();
  const b2 = sCarp.agents[0];
  b2.job = 'Constructor';
  b2.inv.wood = 2;
  const carp = createSpecialBuilding(sCarp, 'carpentry', 'Mateo')!;
  assert.ok(carp);
  carp.storage.wood = 0;
  assert.equal(startConstructionProject(sCarp, b2, 'house', { houseSize: 'small' }).ok, false); // Sin madera en carpintería, no hay descuento
  carp.storage.wood = 1;
  const withDiscount = startConstructionProject(sCarp, b2, 'house', { houseSize: 'small' });
  assert.equal(withDiscount.ok, true);
  assert.equal(b2.inv.wood, 0);
  assert.equal(carp.storage.wood, 0); // Consumió 1 madera del taller de Carpintería

  // Cancelación en muerte / encarcelamiento
  const sJail = createInitialState();
  const jb = sJail.agents[0];
  jb.job = 'Constructor';
  jb.inv.wood = 3;
  assert.equal(startConstructionProject(sJail, jb, 'house', { houseSize: 'small', duration: 10 }).ok, true);
  createSpecialBuilding(sJail, 'police_station', 'A');
  createSpecialBuilding(sJail, 'prison', 'B');
  toggleVillageLaw(sJail, 'ban_fishing', true, 'Jugador');
  jb.activeConstruction!.elapsed = 0;
  assert.equal(enforceLawViolation(sJail, jb, 'ban_fishing'), true);
  assert.equal(jb.jailedDays, 2);
  assert.equal(jb.activeConstruction, null);
  assert.equal(jb.inv.wood, 3);
  cancelActiveConstruction(sJail, jb, 'no-op'); // seguro cuando null
});

test('Mantenimiento cada 30 días, deterioro progresivo (60/90/120/150d), puente bloqueado y reparación exacta', () => {
  const state = createInitialState();
  const builder = state.agents[0];
  builder.job = 'Constructor';
  const bridge = createBridge(state, builder.name);
  const bank = createSpecialBuilding(state, 'bank', builder.name)!;
  assert.equal(isBridgePassable(state), true);

  // Ciclo 30 días sin materiales -> deuda + aviso (30d)
  state.day = 31;
  runThirtyDayMaintenance(state);
  assert.equal(bridge.unpaidMaintenanceDays, 30);
  assert.equal(bridge.maintenanceStatus, 'debt_warning');

  // 60 días -> deteriorándose
  state.day = 61;
  runThirtyDayMaintenance(state);
  assert.equal(bridge.unpaidMaintenanceDays, 60);
  assert.equal(bridge.maintenanceStatus, 'deteriorating');

  // 90 días -> mitad de eficiencia en edificio especial
  state.day = 91;
  runThirtyDayMaintenance(state);
  assert.equal(bank.unpaidMaintenanceDays, 90);
  assert.equal(bank.maintenanceStatus, 'half_efficiency');
  assert.equal(bank.efficiencyMultiplier, 0.5);

  // 120 días -> inoperativo y Puente inhabilitado para cruzar río
  state.day = 121;
  runThirtyDayMaintenance(state);
  assert.equal(bridge.unpaidMaintenanceDays, 120);
  assert.equal(bridge.maintenanceStatus, 'inoperative');
  assert.equal(isBridgePassable(state), false);
  assert.equal(bank.efficiencyMultiplier, 0);
  assert.equal(bank.isOperational, false);

  // 150 días -> en ruinas
  state.day = 151;
  runThirtyDayMaintenance(state);
  assert.equal(bridge.maintenanceStatus, 'ruined');
  assert.ok(bridge.durability <= 10);

  // Reparación exacta restaura puente y banco y limpia deuda
  builder.inv.oakWood = 10;
  builder.inv.stone = 12;
  builder.inv.iron = 10;
  builder.inv.wood = 10;
  const repaired = repairDamagedStructures(state, builder);
  assert.ok(repaired >= 2);
  assert.equal(bridge.durability, 100);
  assert.equal(bridge.unpaidMaintenanceDays, 0);
  assert.equal(bridge.maintenanceStatus, 'ok');
  assert.equal(isBridgePassable(state), true);
  assert.equal(bank.efficiencyMultiplier, 1);
  assert.ok(state.resourceLedger.some((r) => r.operationType === 'reparacion'));
});

test('Edificios especiales: únicos max 1, otros max 3, mejora N2-N3 por era/saber y sin emisión gratuita', () => {
  const state = createInitialState();
  const builder = state.agents[0];
  builder.job = 'Constructor';
  builder.constructionKnowledge = 85;
  builder.inv.wood = 120;
  builder.inv.oakWood = 60;
  builder.inv.stone = 120;
  builder.inv.iron = 60;
  builder.inv.copper = 40;
  state.knowledge = 100;
  state.era = 'iron';

  // Banco es único (max 1) y NO regala monedas al construirse
  const mintedBeforeBank = state.economyReserve.mintedCoins;
  assert.equal(startConstructionProject(state, builder, 'special', { specialType: 'bank', duration: 1 }).ok, true);
  assert.equal(completeActiveConstruction(state, builder), true);
  assert.equal(state.specialBuildings.filter((b) => b.type === 'bank').length, 1);
  assert.equal(state.economyReserve.mintedCoins, mintedBeforeBank);

  const secondBank = startConstructionProject(state, builder, 'special', { specialType: 'bank' });
  assert.equal(secondBank.ok, false);

  // Mejora N1 -> N2 del Banco cuesta exactamente { stone: 8, oakWood: 6, iron: 5, copper: 3 }
  const planN2 = validateAndComputeConstructionPlan(state, builder, 'upgrade_special', { specialType: 'bank' });
  assert.equal(planN2.ok, true);
  assert.deepEqual(planN2.cost, { stone: 8, oakWood: 6, iron: 5, copper: 3 });
  assert.equal(startConstructionProject(state, builder, 'upgrade_special', { specialType: 'bank', duration: 1 }).ok, true);
  assert.equal(completeActiveConstruction(state, builder), true);
  assert.equal(state.specialBuildings.find((b) => b.type === 'bank')?.level, 2);

  // Panadería admite hasta 3
  builder.inv.pineWood = 20;
  for (let i = 0; i < 3; i++) {
    const sBak = startConstructionProject(state, builder, 'special', { specialType: 'bakery', duration: 1 });
    assert.equal(sBak.ok, true);
    assert.equal(completeActiveConstruction(state, builder), true);
  }
  assert.equal(state.specialBuildings.filter((b) => b.type === 'bakery').length, 3);
  assert.equal(startConstructionProject(state, builder, 'special', { specialType: 'bakery' }).ok, false);
});

test('Qwen Responde: automático cada 30 min cuando está activo, manual cuando no, y rechazo de peticiones negativas', () => {
  // 1) Con qwenAutoRespondPetitions = false, al vencer los 30m queda pendiente y pausa
  const manualState = createInitialState();
  manualState.speed = 2;
  manualState.qwenAutoRespondPetitions = false;
  manualState.petitionTimerSec = 1;
  tickSimulation(manualState, 1.5);
  assert.ok(manualState.pendingPetition !== null);
  assert.equal(manualState.speed, 0);

  // 2) Con qwenAutoRespondPetitions = true, al vencer los 30m Qwen 2.5 responde solo y no pausa
  const autoState = createInitialState();
  autoState.speed = 2;
  autoState.qwenAutoRespondPetitions = true;
  autoState.petitionTimerSec = 1;
  const qwenMsgsBefore = autoState.qwenMessages.length;
  tickSimulation(autoState, 1.5);
  assert.equal(autoState.pendingPetition, null);
  assert.equal(autoState.speed, 2);
  assert.equal(autoState.petitionTimerSec, PETITION_INTERVAL_SECONDS);
  assert.ok(autoState.qwenMessages.length > qwenMsgsBefore);

  // 3) Criterio directo de resolvePetitionWithQwen: rechaza peticiones negativas (protegiendo salud/ánimo) y aprueba constructivas
  const directState = createInitialState();
  createVillagePetition(directState, true);
  const happyNegBefore = directState.agents[0].happiness;
  const resNeg = resolvePetitionWithQwen(directState);
  assert.ok(resNeg.includes('No fue Escuchado'));
  assert.ok(directState.agents[0].happiness >= happyNegBefore);

  createVillagePetition(directState, false);
  const happyPosBefore = directState.agents[0].happiness;
  const resPos = resolvePetitionWithQwen(directState);
  assert.ok(resPos.includes('Fue Escuchado'));
  assert.ok(directState.agents[0].happiness >= happyPosBefore);
});

test('Efectos visuales flotantes: creación, tope de 24 elementos y expiración por ttl en tickSimulation', () => {
  const state = createInitialState();
  state.agents = [];
  assert.equal(state.floatingEffects.length, 0);

  for (let i = 0; i < 30; i++) {
    pushFloatingEffect(state, 100 + i, 200, `+${i} 🪵`, '#34d399', 1.2);
  }
  assert.equal(state.floatingEffects.length, 24);
  assert.equal(state.floatingEffects[0].text, '+6 🪵');
  assert.equal(state.floatingEffects[23].text, '+29 🪵');

  tickSimulation(state, 0.5);
  assert.equal(state.floatingEffects.length, 24);
  assert.ok(state.floatingEffects[0].ttl < 1.2);

  tickSimulation(state, 1.0);
  assert.equal(state.floatingEffects.length, 0);
});

test('Qwen 2.5 control total: cambio real de trabajo de la mitad/cantidad, clima, riqueza y consulta de posibles trabajadores de panadería', () => {
  const state = createInitialState();
  const names = state.agents.map((a) => a.name);
  const initialJobs = state.agents.map((a) => a.job);

  // 1) Consulta de datos en tiempo real: NO debe mutar ningún oficio
  const queryText = 'dame la cantidad total de posibles trabajadores de panaderia';
  const queryRes = queryVillageData(state, queryText);
  assert.equal(queryRes.matched, true);
  assert.ok(queryRes.reply.includes('10'));
  assert.ok(queryRes.reply.toLowerCase().includes('panader'));

  const interpretedQuery = interpretQwenDirective(queryText, names, state);
  assert.equal(interpretedQuery.actions.length, 1);
  assert.equal(interpretedQuery.actions[0].type, 'REPORT_DATA');
  applyQwenActions(state, interpretedQuery.actions);
  assert.deepEqual(
    state.agents.map((a) => a.job),
    initialJobs
  );

  // 2) Orden real: "cambia el trabajo de la mitad de los pobladores"
  const halfJobCmd = interpretQwenDirective(
    'cambia el trabajo de la mitad de los pobladores',
    names,
    state
  );
  const appliedHalf = applyQwenActions(state, halfJobCmd.actions);
  const changedCount = state.agents.filter((a, idx) => a.job !== initialJobs[idx]).length;
  assert.equal(changedCount, 5);
  assert.ok(appliedHalf.some((line) => line.includes('Cambiados 5/10')));

  // 3) Orden específica: "cambia 3 aldeanos a panadero"
  const bakerCmd = interpretQwenDirective('cambia 3 aldeanos a panadero', names, state);
  applyQwenActions(state, bakerCmd.actions);
  assert.ok(state.agents.filter((a) => a.job === 'Panadero').length >= 3);

  // Consulta nuevamente debe reflejar los Panaderos activos actualizados sin alterar oficios
  const queryAfter = queryVillageData(state, 'cantidad total de posibles trabajadores de panaderia');
  assert.equal(queryAfter.matched, true);
  assert.ok(queryAfter.reply.includes('Ya ejercen ese oficio:'));
  assert.ok(!queryAfter.reply.includes('Ya ejercen ese oficio: 0'));

  // 4) Imposición directa de clima y riqueza
  const weatherCmd = interpretQwenDirective('cambia el clima a lluvia', names, state);
  applyQwenActions(state, weatherCmd.actions);
  assert.equal(state.weather, 'rain');

  const goldBefore = state.economyReserve.goldReserve;
  const wealthCmd = interpretQwenDirective('agrega 3 oro al pueblo', names, state);
  applyQwenActions(state, wealthCmd.actions);
  assert.equal(state.economyReserve.goldReserve, goldBefore + 3);
});

test('Petición del Representante: "No fue Escuchado" la ignora por completo y "Fue Escuchado" cumple la riqueza/efectos en toda AldeaIA', () => {
  // 1) "No fue Escuchado" ignora totalmente la entrega de riqueza/oro/monedas
  const ignoredState = createInitialState();
  const petIgnored = createVillagePetition(ignoredState, false, 'wealth')!;
  assert.ok(petIgnored);
  assert.equal(petIgnored.effectType, 'wealth');

  const goldBeforeIgn = ignoredState.economyReserve.goldReserve;
  const silverBeforeIgn = ignoredState.economyReserve.silverReserve;
  const coinsBeforeIgn = ignoredState.agents.reduce((s, a) => s + a.coins, 0);
  const poolBeforeIgn = ignoredState.economyReserve.bankLoanPool;
  const happyBeforeIgn = ignoredState.agents[0].happiness;

  resolvePetition(ignoredState, false, 'Jugador');
  assert.equal(ignoredState.economyReserve.goldReserve, goldBeforeIgn);
  assert.equal(ignoredState.economyReserve.silverReserve, silverBeforeIgn);
  assert.equal(
    ignoredState.agents.reduce((s, a) => s + a.coins, 0),
    coinsBeforeIgn
  );
  assert.equal(ignoredState.economyReserve.bankLoanPool, poolBeforeIgn);
  assert.ok(ignoredState.agents[0].happiness < happyBeforeIgn);

  // 2) "Fue Escuchado" cumple concretamente el pedido de riqueza en toda la aldea + mejora emocional y de salud
  const heardState = createInitialState();
  const petHeard = createVillagePetition(heardState, false, 'wealth')!;
  assert.equal(petHeard.effectType, 'wealth');

  const goldBefore = heardState.economyReserve.goldReserve;
  const silverBefore = heardState.economyReserve.silverReserve;
  const coinsBefore = heardState.agents.reduce((s, a) => s + a.coins, 0);
  const poolBefore = heardState.economyReserve.bankLoanPool;
  heardState.agents[0].happiness = 60;
  heardState.agents[0].health = 80;

  resolvePetition(heardState, true, 'Jugador');
  assert.equal(heardState.economyReserve.goldReserve, goldBefore + 2);
  assert.equal(heardState.economyReserve.silverReserve, silverBefore + 1);
  assert.equal(
    heardState.agents.reduce((s, a) => s + a.coins, 0),
    coinsBefore + heardState.agents.length * 6
  );
  assert.equal(heardState.economyReserve.bankLoanPool, poolBefore + 15);
  assert.ok(heardState.agents[0].happiness > 60);
  assert.ok(heardState.agents[0].health > 80);
});

test('Qwen 2.5 sandbox estricto: soporta "tengan mas hjijos" sin romper nada, rechaza acciones de sistema/corruptas y prioriza progreso', () => {
  const state = createInitialState();
  // Los aldeanos priorizan progreso desde el inicio
  assert.equal(state.policies.buildPriority, true);
  assert.equal(state.policies.workFocus, true);
  assert.equal(state.policies.evolutionFocus, true);

  // Dar una casa grande y comida suficiente para que puedan concebir 3 días
  const house = createHouseNearCenter(state, 'Mateo', 'south', 'large');
  for (const ag of state.agents.slice(0, 6)) {
    ag.houseId = house.id;
    ag.ageYears = 22;
    ag.inv.food = 3;
  }

  // 1) Pedido de más hijos (incluso con error de tipeo "hjijos") funciona sin errores y genera embarazos naturales de 3 días
  const kidsCmd = interpretQwenDirective(
    'que los aldeanos tengan mas hjijos',
    state.agents.map((a) => a.name),
    state
  );
  assert.ok(kidsCmd.actions.some((a) => a.type === 'ALLOW_MORE_VILLAGERS'));
  const execKids = applyQwenActions(state, kidsCmd.actions, spawnSettlers);
  assert.ok(execKids.some((line) => line.includes('Natalidad abierta')));
  assert.ok(state.agents.some((a) => a.pregnancy !== null && a.pregnancy.daysRemaining === PREGNANCY_DAYS));

  // 2) Sandbox estricto contra respuestas malformadas o intentos de tocar sistema/código desde Qwen 2.5:3b
  const maliciousPayload = [
    { type: 'WRITE_SYSTEM_FILE', path: '/src/App.tsx' },
    { type: 'EXEC_SHELL', cmd: 'rm -rf' },
    { type: 'DIRECT_VILLAGER' }, // falta agentName
    { type: 'BUILD_SPECIAL', buildingType: 'edificio_inexistente' },
    { type: 'SPAWN_ANIMAL', animalType: 'dragon', count: 999999 },
    { type: 'ALLOW_MORE_VILLAGERS', spawnCount: 999999, encouragePregnancies: true },
    { type: 'BOOST_EVOLUTION', knowledgeGain: Number.NaN },
    { type: 'SET_POLICIES', patch: { invalidSystemFlag: true, buildPriority: true } },
  ];
  const sanitized = sanitizeQwenActions(maliciousPayload);
  assert.equal(sanitized.some((a) => a.type === ('WRITE_SYSTEM_FILE' as never)), false);
  assert.equal(sanitized.some((a) => a.type === 'DIRECT_VILLAGER'), false);
  assert.equal(sanitized.some((a) => a.type === 'BUILD_SPECIAL'), false);
  assert.equal(sanitized.some((a) => a.type === 'SPAWN_ANIMAL'), false);

  const allowAction = sanitized.find((a) => a.type === 'ALLOW_MORE_VILLAGERS');
  assert.ok(allowAction && allowAction.type === 'ALLOW_MORE_VILLAGERS');
  assert.equal(allowAction.spawnCount, 6); // Acotado de forma segura, nunca 999999

  const boostAction = sanitized.find((a) => a.type === 'BOOST_EVOLUTION');
  assert.ok(boostAction && boostAction.type === 'BOOST_EVOLUTION');
  assert.equal(boostAction.knowledgeGain, 25); // NaN reemplazado por valor finito seguro

  assert.equal(sanitizeQwenReply({ nested: 'object' }, 'Respaldo seguro'), 'Respaldo seguro');

  // Aplicar el payload malicioso directamente no debe lanzar excepciones ni corromper knowledge/agents
  const appliedSafe = applyQwenActions(state, maliciousPayload as never, spawnSettlers);
  assert.ok(appliedSafe.length >= 1);
  assert.equal(Number.isFinite(state.knowledge), true);
  assert.ok(state.agents.length <= 20);
});

test('Progreso autónomo anti-extinción: roles equilibrados, entrega cooperativa de materiales, avance de Saber y supervivencia multi-día', () => {
  const state = createInitialState();
  const builders = state.agents.filter((a) => a.job === 'Constructor');
  const miners = state.agents.filter((a) => a.job === 'Minero');
  const woodcutters = state.agents.filter((a) => a.job === 'Leñador');
  const gatherers = state.agents.filter((a) => a.job === 'Recolector' || a.job === 'Pescador');
  assert.ok(builders.length >= 2);
  assert.ok(miners.length >= 1);
  assert.ok(woodcutters.length >= 2);
  assert.ok(gatherers.length >= 2);

  // Entrega cooperativa: un no-constructor transfiere excedente de madera/piedra al Constructor sin violar el costo estricto de construcción
  const carrier = woodcutters[0];
  const builder = builders[0];
  carrier.inv.wood = 4;
  carrier.inv.stone = 2;
  const builderWoodBefore = builder.inv.wood;
  const transferred = transferMaterialsToConstructor(state, carrier, builder);
  assert.ok(transferred >= 4);
  assert.ok(builder.inv.wood > builderWoodBefore);

  const initialKnowledge = state.knowledge;
  const initialEduSum = state.agents.reduce((s, a) => s + a.education, 0);

  // Simular varios días con tickSimulation (dt <= 0.05 como hace el loop real)
  state.speed = 4;
  for (let i = 0; i < 4000; i++) {
    tickSimulation(state, 0.05);
  }

  assert.ok(state.agents.length >= 8, 'La aldea no debe extinguirse en los primeros días');
  assert.ok(state.houses.length >= 1, 'Los constructores deben levantar al menos una casa con materiales reales');
  assert.ok(state.knowledge > initialKnowledge, 'El saber de la aldea debe progresar');
  assert.ok(
    state.agents.reduce((s, a) => s + a.education, 0) > initialEduSum,
    'El Saber de los aldeanos debe aumentar al trabajar'
  );
});

test('Parejas con predominio heterosexual entre quienes desean hijos y minoría diversa permitida', () => {
  const state = createInitialState();
  state.agents = [];
  const maleA = createAgent(state.nextId++, 'Mateo', 'M', 600, 320, null, 24);
  const maleB = createAgent(state.nextId++, 'Tomás', 'M', 610, 320, null, 25);
  const femaleA = createAgent(state.nextId++, 'Sofía', 'F', 620, 320, null, 23);
  maleA.wantsChildren = true;
  maleB.wantsChildren = true;
  femaleA.wantsChildren = true;
  maleA.happiness = 72;
  maleB.happiness = 75;
  femaleA.happiness = 72;
  state.agents.push(maleA, maleB, femaleA);

  // Quien desea hijos debe priorizar fuertemente pareja de distinto sexo sobre mismo sexo disponible
  const pickedForMale = pickBestPartnerForAgent(state, maleA);
  assert.ok(pickedForMale);
  assert.equal(pickedForMale.id, femaleA.id);
  assert.notEqual(pickedForMale.sex, maleA.sex);

  // Incluso frente a compatibilidad alta, decideVillagerMajorAction rechaza mismo sexo cuando ambos quieren hijos y hay otro sexo libre
  assert.equal(decideVillagerMajorAction(state, maleA, 'partnership', { partner: maleB }).approved, false);
  assert.equal(decideVillagerMajorAction(state, maleA, 'partnership', { partner: femaleA }).approved, true);

  // Cuando ambos no desean tener hijos, la pareja del mismo sexo sigue siendo válida como minoría permitida
  maleA.wantsChildren = false;
  maleB.wantsChildren = false;
  state.agents = [maleA, maleB];
  let approvedSameSex = false;
  for (let i = 0; i < 40; i++) {
    if (decideVillagerMajorAction(state, maleA, 'partnership', { partner: maleB }).approved) {
      approvedSameSex = true;
      break;
    }
  }
  assert.equal(approvedSameSex, true);
});

test('Representante permanente controlado por Qwen 2.5:3b: reemplazo inmediato ante muerte, turno autónomo y chat directo', async () => {
  const state = createInitialState();
  const initialRep = ensureQwenControlledRepresentative(state);
  assert.ok(initialRep);
  assert.equal(initialRep.isRepresentative, true);
  assert.equal(state.representativeAgentId, initialRep.id);
  assert.ok(initialRep.qwenPlan && initialRep.qwenPlan.includes('Representante'));

  // Turno autónomo: corrige si faltan roles críticos y fija meta de progreso
  for (const ag of state.agents) {
    setAgentJob(state, ag, 'Recolector', 'prueba');
  }
  runQwenRepresentativeAutonomousTurn(state);
  assert.ok(state.agents.some((a) => a.job === 'Constructor'));
  assert.ok(state.agents.some((a) => a.job === 'Minero'));
  assert.ok(typeof state.representativeGoal === 'string' && state.representativeGoal.length > 0);

  // Si muere el representante, se designa inmediatamente otro vivo
  const deadRepId = initialRep.id;
  killAgent(state, deadRepId);
  const nextRep = ensureQwenControlledRepresentative(state);
  assert.ok(nextRep);
  assert.notEqual(nextRep.id, deadRepId);
  assert.equal(nextRep.isRepresentative, true);
  assert.equal(state.representativeAgentId, nextRep.id);

  // Chat directo con el Representante (consulta de datos + orden real)
  const queryReply = await askQwenAssistant(state, 'dame la cantidad total de posibles trabajadores de panaderia');
  assert.equal(queryReply.source, 'local');
  assert.ok(queryReply.reply.toLowerCase().includes('panader'));

  const cmdReply = await askQwenAssistant(state, 'cambia 2 aldeanos a constructor');
  assert.ok(cmdReply.reply.includes(`Representante ${nextRep.name}`));
  assert.ok(state.agents.filter((a) => a.job === 'Constructor').length >= 2);
});

test('Audio ambiental por clima/fase y cola de sonidos para festejo, tristeza y rayos', () => {
  const sunnyDay = computeAmbienceProfile('sunny', false, false, true);
  assert.equal(sunnyDay.active, true);
  assert.equal(sunnyDay.chirpMode, 'birds');

  const sunnyNight = computeAmbienceProfile('sunny', true, false, true);
  assert.equal(sunnyNight.active, true);
  assert.equal(sunnyNight.chirpMode, 'crickets');

  const rainDay = computeAmbienceProfile('rain', false, false, true);
  assert.equal(rainDay.active, true);
  assert.ok(rainDay.noiseGain > sunnyDay.noiseGain);

  const storm = computeAmbienceProfile('thunderstorm', false, false, true);
  assert.equal(storm.chirpMode, 'wind');
  assert.ok(storm.noiseGain > rainDay.noiseGain);

  const drought = computeAmbienceProfile('drought', false, false, true);
  assert.equal(drought.chirpMode, 'wind');

  const paused = computeAmbienceProfile('rain', false, true, true);
  assert.equal(paused.active, false);
  assert.equal(paused.noiseGain, 0);

  // Eventos de la simulación emiten señales de audio coherentes
  const state = createInitialState();
  state.pendingSounds = [];

  createVillagePetition(state, false, 'wealth');
  resolvePetition(state, true, 'Jugador');
  assert.ok(state.pendingSounds.includes('celebration'));

  state.pendingSounds = [];
  createVillagePetition(state, false, 'wealth');
  resolvePetition(state, false, 'Jugador');
  assert.ok(state.pendingSounds.includes('sadness'));

  state.pendingSounds = [];
  triggerLightningStorm(state);
  assert.ok(state.pendingSounds.includes('thunder'));

  state.pendingSounds = [];
  killAgent(state, state.agents[0].id);
  assert.ok(state.pendingSounds.includes('sadness'));
});

test('Planificación dinámica de obras según urgencia y respaldo construible sin trabas', () => {
  const state = createInitialState();
  const house = createHouseNearCenter(state, 'Base', 'south', 'large');
  house.capacity = 12;
  for (const ag of state.agents) {
    ag.houseId = house.id;
    ag.inv.food = 4;
  }

  // Caso 1: Emergencia sanitaria -> Hospital debe superar a Mercado/Banco/Carpintería
  const builder = state.agents.find((a) => a.job === 'Constructor') ?? state.agents[0];
  builder.job = 'Constructor';
  const medicCandidate = state.agents.find((a) => a.id !== builder.id)!;
  setAgentJob(state, medicCandidate, 'Curandero', 'emergencia');
  const patient = state.agents.find((a) => a.id !== builder.id && a.id !== medicCandidate.id)!;
  patient.isSick = true;

  const healthScores = scoreConstructionNeeds(state);
  const infirmaryRank = healthScores.findIndex((c) => c.kind === 'special' && c.specialType === 'infirmary');
  const marketRank = healthScores.findIndex((c) => c.kind === 'special' && c.specialType === 'market');
  assert.ok(infirmaryRank >= 0);
  if (marketRank >= 0) {
    assert.ok(infirmaryRank < marketRank, 'El Hospital debe priorizarse sobre el Mercado cuando hay enfermos');
  }

  // Caso 2: Si el objetivo principal no tiene aún minerales avanzados, bestBuildable elige una obra útil sí construible (ej. Granja)
  patient.isSick = false;
  builder.inv.wood = 4;
  builder.inv.stone = 2;
  builder.inv.iron = 0;
  builder.inv.copper = 0;
  builder.inv.pineWood = 0;
  const planCheck = planBestConstructionProject(state, builder);
  assert.ok(planCheck.topGoal);
  assert.ok(planCheck.bestBuildable);
  assert.equal(planCheck.bestBuildable.candidate.kind, 'farm');
});

test('Migración automática de partidas v1/estancadas y rescate anti-extinción sin reiniciar', () => {
  const legacyState = createInitialState();
  legacyState.schemaVersion = 1;
  legacyState.policies.buildPriority = false;
  legacyState.policies.workFocus = false;
  legacyState.policies.evolutionFocus = false;
  legacyState.policies.reproductionRestraint = true;

  // Simular aldea al borde del colapso: 2 adultos restantes, comida agotada, un no-constructor con obra trabada
  legacyState.agents = legacyState.agents.slice(0, 2);
  legacyState.agents[0].job = 'Recolector';
  legacyState.agents[0].activeConstruction = {
    id: 999,
    kind: 'house',
    x: 500,
    y: 400,
    zone: 'south',
    totalDuration: 36,
    elapsed: 0,
    reservedMaterials: { wood: 3 },
    fromPersonal: { wood: 3 },
    fromDepot: {},
    carpentryWoodConsumed: 0,
  };
  legacyState.agents[0].inv.food = 0;
  legacyState.agents[1].inv.food = 0;
  legacyState.farms = [];
  for (const r of legacyState.resources) {
    if (r.type === 'food') {
      r.amount = 0;
      r.depleted = true;
    }
  }

  const res = migrateAndRecoverVillageState(legacyState);
  assert.equal(res.migrated, true);
  assert.equal(res.rescued, true);
  assert.equal(legacyState.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(legacyState.policies.buildPriority, true);
  assert.equal(legacyState.policies.workFocus, true);
  assert.equal(legacyState.policies.evolutionFocus, true);
  assert.equal(legacyState.policies.reproductionRestraint, false);
  assert.equal(legacyState.agents[0].activeConstruction, null);
  assert.ok(
    legacyState.resources.some((r) => r.type === 'food' && !r.depleted && r.amount > 0),
    'Debe restaurar comida de emergencia para evitar extinción'
  );
  assert.ok(legacyState.representativeAgentId !== null);
});

test('Recursos y animales nunca se generan ni atraviesan casas o plantaciones', () => {
  const state = createInitialState();
  const house = createHouseNearCenter(state, 'Base', 'south', 'large', 620, 420);
  const farm = createFarmPlot(state, 'south', 760, 420, 'large');

  // Intentar generar recurso directamente encima de casa y plantación
  spawnResource(state, 'food', house.x, house.y, true);
  spawnResource(state, 'wood', farm.x, farm.y, true);
  const lastTwo = state.resources.slice(-2);
  for (const r of lastTwo) {
    assert.equal(
      isPointBlockedByStructures(state, r.x, r.y, 6, true),
      false,
      'Los recursos no deben aparecer sobre casas ni cultivos'
    );
  }

  // Intentar generar animal encima de la casa y simular paso hacia la plantación
  const cow = createAnimal(state, 'cow', house.x, house.y);
  assert.equal(
    isPointBlockedByStructures(state, cow.x, cow.y, 6, true),
    false,
    'Los animales no deben aparecer dentro de casas'
  );

  const stepIntoFarm = resolveAnimalObstacleStep(state, farm.x - 60, farm.y, farm.x, farm.y, 8);
  assert.equal(stepIntoFarm.blocked, true);
  assert.equal(
    isPointBlockedByStructures(state, stepIntoFarm.x, stepIntoFarm.y, 6, true),
    false,
    'Los animales no deben cruzar por encima de las plantaciones'
  );
});

test('Qwen 2.5:3b utiliza múltiples setups de vestimenta, pelo y tono de piel en aldeanos', () => {
  const state = createInitialState();
  const uniqueShirts = new Set(state.agents.map((a) => a.shirt));
  const uniqueSkins = new Set(state.agents.map((a) => a.skin));
  const uniqueHairStyles = new Set(state.agents.map((a) => a.hairStyle));

  assert.ok(uniqueShirts.size >= 4, 'Debe haber al menos 4 colores de vestimenta definidos por Qwen');
  assert.ok(uniqueSkins.size >= 4, 'Debe haber diversidad de tonos de piel');
  assert.ok(uniqueHairStyles.size >= 3, 'Debe haber variedad de estilos de pelo');

  const target = state.agents[0];
  const note = assignQwenAppearanceSetup(state, target, { reason: 'prueba' });
  assert.ok(note.includes('Qwen 2.5:3b'));

  const applied = applyQwenActions(state, [
    {
      type: 'STYLE_VILLAGERS',
      targetName: target.name,
      shirt: '#7c3aed',
      hairStyle: 'mohawk',
      hairColor: '#d4a359',
      skin: '#c68642',
    },
  ]);
  assert.ok(applied[0].includes('estilizado'));
  assert.equal(target.shirt, '#7c3aed');
  assert.equal(target.hairStyle, 'mohawk');
});

test('Ocupantes de casas, comercios, banco, comisaría y cárcel generan iconos de cabeza inferiores, y el Muelle mantiene al pescador visible', () => {
  const state = createInitialState();
  const house = createHouseNearCenter(state, 'Casa', 'south', 'medium', 600, 380);
  const bank = createSpecialBuilding(state, 'bank', 'Banquero', 720, 380);
  const prison = createSpecialBuilding(state, 'prison', 'Comisario', 840, 380);
  const dock = createSpecialBuilding(state, 'dock', 'Pescador', 640, 194);
  assert.ok(bank && prison && dock);

  // 1) Aldeano descansando dentro de su casa
  const sleeper = state.agents[0];
  sleeper.houseId = house.id;
  sleeper.taskType = 'sleep';
  sleeper.x = house.x;
  sleeper.y = house.y + 12;

  // 2) Banquero atendiendo dentro del Banco
  const banker = state.agents[1];
  banker.job = 'Banquero';
  banker.assignedBuildingId = bank.id;
  banker.taskType = 'manage_building';
  banker.x = bank.x;
  banker.y = bank.y + 10;

  // 3) Detenido dentro de la Cárcel
  const prisoner = state.agents[2];
  prisoner.jailedDays = 2;
  prisoner.x = prison.x;
  prisoner.y = prison.y + 8;

  // 4) Pescador trabajando en el Muelle (debe seguir visible en el mapa, NO oculto como icono de cabeza)
  const fisher = state.agents[3];
  fisher.job = 'Pescador';
  fisher.assignedBuildingId = dock.id;
  fisher.taskType = 'fish_river';
  fisher.x = dock.x + 14;
  fisher.y = dock.y - 10;

  const snap = getBuildingOccupancySnapshot(state);
  const sleeperBadge = snap.badges.find((b) => b.agentId === sleeper.id);
  const bankerBadge = snap.badges.find((b) => b.agentId === banker.id);
  const prisonerBadge = snap.badges.find((b) => b.agentId === prisoner.id);
  const fisherBadge = snap.badges.find((b) => b.agentId === fisher.id);

  assert.ok(sleeperBadge && sleeperBadge.buildingKind === 'house' && sleeperBadge.y > house.y);
  assert.ok(bankerBadge && bankerBadge.buildingType === 'bank' && bankerBadge.y > bank.y);
  assert.ok(prisonerBadge && prisonerBadge.buildingType === 'prison' && prisonerBadge.y > prison.y);
  assert.equal(fisherBadge, undefined, 'El pescador del Muelle debe permanecer visible pescando');
  assert.equal(snap.insideAgentIds.has(fisher.id), false);
});



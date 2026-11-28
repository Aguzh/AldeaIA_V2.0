import type {
  ActiveSystemicCrisis,
  CrisisMonitorState,
  DistrictZone,
  SimulationState,
  SocietyHistoryPoint,
  SocietyIndicators,
  SystemicCrisisKind,
} from '../types/simulation';
import {
  addLog,
  clamp,
  contractDiseaseForAgent,
  DAYS_PER_YEAR,
  isBuildingOperational,
  pushSoundCue,
} from './rules';
import {
  assignInitialTraits,
  recordAgentMemory,
  trackDivineIntervention,
  trackNaturalProgress,
} from './civilizationSystems';
import { emitSimEvent } from './eventBus';
import { recordCategorizedChronicle } from './historyAndChronicle';
import { getDiscoveryAdoptionBonus } from './discoveries';

export function createDefaultCrisisMonitor(day = 1): CrisisMonitorState {
  return {
    activeCrises: [],
    foodReserveDays: 4,
    droughtStreakDays: 0,
    scarcityAlert: false,
    epidemicAlert: false,
    lastEvaluationDay: day,
  };
}

export function createDefaultSocietyIndicators(): SocietyIndicators {
  return {
    happiness: 75,
    security: 72,
    governmentTrust: 72,
    qualityOfLife: 70,
    economicInequality: 18,
    educationAccess: 40,
    healthcareAccess: 45,
    socialStability: 76,
    migrationPull: 25,
  };
}

export function ensureCrisesAndSocietyDefaults(state: SimulationState): void {
  if (!state.crisisMonitor || typeof state.crisisMonitor !== 'object') {
    state.crisisMonitor = createDefaultCrisisMonitor(state.day);
  }
  if (!Array.isArray(state.crisisMonitor.activeCrises)) {
    state.crisisMonitor.activeCrises = [];
  }
  if (!state.societyIndicators || typeof state.societyIndicators !== 'object') {
    state.societyIndicators = createDefaultSocietyIndicators();
  }
  if (!Array.isArray(state.societyHistory)) {
    state.societyHistory = [];
  }
  if (!Array.isArray(state.districts)) {
    state.districts = [];
  }
}

function computeMitigationDetails(state: SimulationState): {
  foodMitigation: number;
  floodMitigation: number;
  epidemicMitigation: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let foodMitigation = 0;
  let floodMitigation = 0;
  let epidemicMitigation = 0;

  if (isBuildingOperational(state, 'general_depot')) {
    foodMitigation += 24;
    reasons.push('Depósito General');
  }
  if (isBuildingOperational(state, 'bakery')) {
    foodMitigation += 12;
    reasons.push('Panadería');
  }
  const uniqueCrops = new Set(state.farms.map((f) => f.cropName)).size;
  if (uniqueCrops >= 2) {
    foodMitigation += 14;
    reasons.push('Diversificación de cultivos');
  }
  if ((state.discoveries ?? []).some((d) => d.id === 'riego_fluvial')) {
    foodMitigation += Math.round(25 * getDiscoveryAdoptionBonus(state, 'riego_fluvial'));
    reasons.push('Acequias de riego');
  }
  if ((state.externalTradeHistory ?? []).some((t) => t.kind === 'import' && state.day - t.day <= 10)) {
    foodMitigation += 15;
    reasons.push('Comercio exterior');
  }

  const stoneOrReinforcedRoads = state.roads.filter(
    (r) => r.roadType === 'stone' || r.roadType === 'reinforced'
  ).length;
  if (stoneOrReinforcedRoads >= 6) {
    floodMitigation += 28;
    reasons.push('Drenaje vial');
  }
  if ((state.discoveries ?? []).some((d) => d.id === 'ingenieria_hidraulica')) {
    floodMitigation += 35;
    reasons.push('Obras hidráulicas');
  }

  if (isBuildingOperational(state, 'infirmary')) {
    epidemicMitigation += 32;
    reasons.push('Hospital');
  }
  if (isBuildingOperational(state, 'apothecary')) {
    epidemicMitigation += 20;
    reasons.push('Botica');
  }
  if ((state.discoveries ?? []).some((d) => d.id === 'saneamiento_urbano')) {
    epidemicMitigation += 22;
    reasons.push('Higiene urbana');
  }

  return {
    foodMitigation: clamp(foodMitigation, 0, 85),
    floodMitigation: clamp(floodMitigation, 0, 85),
    epidemicMitigation: clamp(epidemicMitigation, 0, 85),
    reasons,
  };
}

function upsertCrisis(
  crises: ActiveSystemicCrisis[],
  kind: SystemicCrisisKind,
  title: string,
  severity: number,
  mitigationScore: number,
  causeChain: string,
  mitigatedBy: string[],
  state: SimulationState
): void {
  const existing = crises.find((c) => c.kind === kind);
  if (existing) {
    existing.severity = clamp(Math.round(severity), 10, 100);
    existing.daysActive += 1;
    existing.mitigationScore = mitigationScore;
    existing.causeChain = causeChain;
    existing.mitigatedBy = mitigatedBy;
    return;
  }
  const created: ActiveSystemicCrisis = {
    id: `crisis_${kind}_${state.day}`,
    kind,
    title,
    severity: clamp(Math.round(severity), 15, 100),
    daysActive: 1,
    mitigationScore,
    causeChain,
    mitigatedBy,
  };
  crises.push(created);
  recordCategorizedChronicle(state, 'crisis', `Crisis iniciada: ${title} (${causeChain}).`);
  emitSimEvent(state, 'crisis_start', title);
}

export function updateSystemicCrisesDaily(state: SimulationState): void {
  ensureCrisesAndSocietyDefaults(state);
  const monitor = state.crisisMonitor!;
  const mitigation = computeMitigationDetails(state);
  const pop = Math.max(1, state.agents.length);

  if (state.weather === 'drought') {
    monitor.droughtStreakDays += 1;
  } else {
    monitor.droughtStreakDays = Math.max(0, monitor.droughtStreakDays - 1);
  }

  const totalFood =
    state.agents.reduce((s, a) => s + a.inv.food + a.breadCount, 0) +
    state.houses.reduce((s, h) => s + h.storage.food, 0) +
    state.specialBuildings
      .filter((b) => b.type === 'general_depot' || b.type === 'bakery')
      .reduce((s, b) => s + b.storage.food + b.storage.bread, 0);

  monitor.foodReserveDays = Number((totalFood / pop).toFixed(1));
  monitor.lastEvaluationDay = state.day;

  const nextCrises: ActiveSystemicCrisis[] = [...monitor.activeCrises];
  const resolvedKinds: SystemicCrisisKind[] = [];

  // 1. Sequía o Plaga / Helada prolongada -> cae producción agrícola -> sube precio -> hambre
  const hasDroughtOrBlight =
    state.weather === 'drought' ||
    state.activeDisaster?.kind === 'blight' ||
    state.activeDisaster?.kind === 'frost';

  if (hasDroughtOrBlight) {
    const rawDamage = state.activeDisaster?.kind === 'frost' ? 52 : 42;
    const netSeverity = Math.max(14, rawDamage * (1 - mitigation.foodMitigation / 100));
    const farmPenalty = Math.round(netSeverity * 0.25);
    for (const f of state.farms) {
      f.growth = Math.max(0, f.growth - farmPenalty);
    }
    if (state.marketPrices) {
      state.marketPrices.food = Math.max(state.marketPrices.food, Math.round(2 + netSeverity / 15));
    }
    const kind: SystemicCrisisKind =
      state.activeDisaster?.kind === 'frost'
        ? 'frost'
        : state.activeDisaster?.kind === 'blight'
          ? 'blight'
          : 'drought';
    upsertCrisis(
      nextCrises,
      kind,
      kind === 'frost'
        ? 'Helada Prolongada'
        : kind === 'blight'
          ? 'Plaga Agrícola Sistémica'
          : 'Sequía Prolongada',
      netSeverity,
      mitigation.foodMitigation,
      'Clima adverso → merma de cultivos → alza de precios → presión sobre reservas',
      mitigation.reasons,
      state
    );
  } else {
    resolvedKinds.push('drought', 'frost', 'blight');
  }

  // 2. Inundación -> deterioro vial / puente / granjas ribereñas
  if (state.activeDisaster?.kind === 'flood') {
    const netSeverity = Math.max(15, 55 * (1 - mitigation.floodMitigation / 100));
    for (const r of state.roads) {
      if (Math.abs(r.y - 480) < 120) {
        r.durability = Math.max(15, r.durability - Math.round(netSeverity * 0.14));
      }
    }
    upsertCrisis(
      nextCrises,
      'flood',
      'Inundación Fluvial',
      netSeverity,
      mitigation.floodMitigation,
      'Desborde del río → desgaste de caminos y puente → interrupción logística',
      mitigation.reasons,
      state
    );
  } else {
    resolvedKinds.push('flood');
  }

  // 3. Crisis alimentaria encadenada (desnutrición -> enfermedad si persiste sin reservas)
  monitor.scarcityAlert = monitor.foodReserveDays < 1.1;
  if (monitor.scarcityAlert) {
    const netSeverity = clamp(Math.round((1.2 - monitor.foodReserveDays) * 65 * (1 - mitigation.foodMitigation / 130)), 18, 95);
    if (state.marketPrices) {
      state.marketPrices.food = Math.max(state.marketPrices.food, 5);
    }
    // Malnutrición debilita a quienes tienen más hambre
    for (const a of state.agents) {
      if (a.hunger >= 78) {
        a.health = clamp(a.health - 4, 5, 100);
        if (!a.isSick && Math.random() < 0.08 * (1 - mitigation.epidemicMitigation / 120)) {
          contractDiseaseForAgent(state, a, 'dolor_estomacal');
        }
      }
    }
    upsertCrisis(
      nextCrises,
      'famine_risk',
      'Escasez Alimentaria Crítica',
      netSeverity,
      mitigation.foodMitigation,
      'Reservas < 1.1 días/hab → encarecimiento del alimento → riesgo de desnutrición',
      mitigation.reasons,
      state
    );
  } else {
    resolvedKinds.push('famine_risk');
  }

  // 4. Brote epidémico encadenado
  const sickCount = state.agents.filter((a) => a.isSick).length;
  const sickRatio = sickCount / pop;
  monitor.epidemicAlert = sickCount >= 3 && sickRatio >= 0.22;
  if (monitor.epidemicAlert) {
    const netSeverity = clamp(Math.round(sickRatio * 100 * (1 - mitigation.epidemicMitigation / 120)), 20, 95);
    upsertCrisis(
      nextCrises,
      'epidemic',
      'Brote Epidémico',
      netSeverity,
      mitigation.epidemicMitigation,
      'Alta proporción de enfermos → menor fuerza laboral → demanda médica crítica',
      mitigation.reasons,
      state
    );
  } else {
    resolvedKinds.push('epidemic');
  }

  // Limpiar crisis resueltas y notificar
  monitor.activeCrises = nextCrises.filter((c) => {
    if (resolvedKinds.includes(c.kind)) {
      recordCategorizedChronicle(state, 'crisis', `Crisis superada: ${c.title} tras ${c.daysActive} día(s).`);
      emitSimEvent(state, 'crisis_resolved', c.title);
      return false;
    }
    return true;
  });
}

export function computeEmergentDistricts(state: SimulationState): DistrictZone[] {
  const districts: DistrictZone[] = [];

  if (state.houses.length >= 2) {
    const avgX = Math.round(state.houses.reduce((s, h) => s + h.x, 0) / state.houses.length);
    const avgY = Math.round(state.houses.reduce((s, h) => s + h.y, 0) / state.houses.length);
    districts.push({
      id: 'dist_residencial',
      kind: 'residencial',
      label: 'Barrio Residencial',
      x: avgX,
      y: avgY,
      radius: 95,
      buildingCount: state.houses.length,
    });
  }

  const commerce = state.specialBuildings.filter((b) =>
    ['market', 'bank', 'bakery', 'dock', 'general_depot'].includes(b.type)
  );
  if (commerce.length >= 2) {
    const avgX = Math.round(commerce.reduce((s, b) => s + b.x, 0) / commerce.length);
    const avgY = Math.round(commerce.reduce((s, b) => s + b.y, 0) / commerce.length);
    districts.push({
      id: 'dist_comercial',
      kind: 'comercial',
      label: 'Distrito Comercial',
      x: avgX,
      y: avgY,
      radius: 85,
      buildingCount: commerce.length,
    });
  }

  const industrial = state.specialBuildings.filter((b) =>
    ['carpentry', 'forge', 'apothecary'].includes(b.type)
  );
  if (industrial.length >= 2) {
    const avgX = Math.round(industrial.reduce((s, b) => s + b.x, 0) / industrial.length);
    const avgY = Math.round(industrial.reduce((s, b) => s + b.y, 0) / industrial.length);
    districts.push({
      id: 'dist_industrial',
      kind: 'industrial',
      label: 'Zona Artesanal',
      x: avgX,
      y: avgY,
      radius: 80,
      buildingCount: industrial.length,
    });
  }

  if (state.farms.length >= 2) {
    const avgX = Math.round(state.farms.reduce((s, f) => s + f.x, 0) / state.farms.length);
    const avgY = Math.round(state.farms.reduce((s, f) => s + f.y, 0) / state.farms.length);
    districts.push({
      id: 'dist_agricola',
      kind: 'agricola',
      label: 'Cinturón Agrícola',
      x: avgX,
      y: avgY,
      radius: 90,
      buildingCount: state.farms.length,
    });
  }

  const civic = state.specialBuildings.filter((b) =>
    ['town_hall', 'school', 'infirmary', 'police_station', 'prison'].includes(b.type)
  );
  if (civic.length >= 2 || (state.plaza && civic.length >= 1)) {
    const pts = [
      ...civic.map((b) => ({ x: b.x, y: b.y })),
      ...(state.plaza ? [{ x: state.plaza.x, y: state.plaza.y }] : []),
    ];
    const avgX = Math.round(pts.reduce((s, p) => s + p.x, 0) / pts.length);
    const avgY = Math.round(pts.reduce((s, p) => s + p.y, 0) / pts.length);
    districts.push({
      id: 'dist_civico',
      kind: 'civico',
      label: 'Centro Cívico',
      x: avgX,
      y: avgY,
      radius: 90,
      buildingCount: pts.length,
    });
  }

  state.districts = districts;
  return districts;
}

function computeGiniCoins(values: number[]): number {
  if (values.length <= 1) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  if (sum <= 0) return 0;
  const n = sorted.length;
  let weighted = 0;
  for (let i = 0; i < n; i++) {
    weighted += (i + 1) * sorted[i];
  }
  const gini = (2 * weighted) / (n * sum) - (n + 1) / n;
  return clamp(Math.round(gini * 100), 0, 100);
}

export function computeSocietyIndicatorsDaily(state: SimulationState): SocietyIndicators {
  ensureCrisesAndSocietyDefaults(state);
  const pop = Math.max(1, state.agents.length);

  const avgHappiness = state.agents.reduce((s, a) => s + a.happiness, 0) / pop;
  const avgHealth = state.agents.reduce((s, a) => s + a.health, 0) / pop;
  const housedRatio = state.agents.filter((a) => a.houseId !== null).length / pop;
  const wellFedRatio = state.agents.filter((a) => a.hunger < 65).length / pop;

  const hasPolice = isBuildingOperational(state, 'police_station');
  const hasSchool = isBuildingOperational(state, 'school');
  const hasHospital = isBuildingOperational(state, 'infirmary');
  const hasApothecary = isBuildingOperational(state, 'apothecary');
  const guards = state.agents.filter((a) => a.job === 'Guardián' || a.job === 'Comisario').length;
  const hostileAnimals = state.animals.filter((a) => a.hostile && !a.tamed).length;

  const security = clamp(
    Math.round(
      52 +
        (hasPolice ? 16 : 0) +
        Math.min(18, guards * 6) +
        (state.roads.some((r) => r.lit) ? 6 : 0) -
        state.fires.length * 10 -
        hostileAnimals * 5
    ),
    5,
    100
  );

  const educationAccess = clamp(
    Math.round(
      (hasSchool ? 35 : 8) +
        Math.min(35, state.agents.filter((a) => a.job === 'Maestro' || a.job === 'Erudito').length * 15) +
        (state.agents.reduce((s, a) => s + a.education, 0) / pop) * 0.35
    ),
    5,
    100
  );

  const healthcareAccess = clamp(
    Math.round(
      (hasHospital ? 38 : 10) +
        (hasApothecary ? 18 : 0) +
        Math.min(24, state.agents.filter((a) => a.job === 'Curandero' || a.job === 'Boticario').length * 12) +
        avgHealth * 0.22
    ),
    5,
    100
  );

  const economicInequality = computeGiniCoins(state.agents.map((a) => a.coins));
  const governmentTrust = Math.round(clamp(state.politics?.approvalRating ?? 70, 5, 100));

  const crisisPenalty = (state.crisisMonitor?.activeCrises ?? []).reduce(
    (sum, c) => sum + Math.round(c.severity * 0.14),
    0
  );

  const qualityOfLife = clamp(
    Math.round(
      avgHappiness * 0.25 +
        avgHealth * 0.2 +
        housedRatio * 18 +
        wellFedRatio * 16 +
        security * 0.1 +
        educationAccess * 0.06 +
        healthcareAccess * 0.06 -
        crisisPenalty * 0.5 -
        Math.max(0, economicInequality - 45) * 0.2
    ),
    5,
    100
  );

  const socialStability = clamp(
    Math.round(
      qualityOfLife * 0.42 +
        governmentTrust * 0.3 +
        security * 0.2 +
        (100 - economicInequality) * 0.08 -
        (state.politics?.protestsCount ?? 0) * 2
    ),
    5,
    100
  );

  const freeBeds = Math.max(
    0,
    state.houses.reduce((s, h) => s + h.capacity, 0) - state.agents.length
  );
  const migrationPull = clamp(
    Math.round((qualityOfLife - 35) * 1.15 + (freeBeds > 0 ? 22 : -15) - crisisPenalty),
    0,
    100
  );

  const indicators: SocietyIndicators = {
    happiness: Math.round(avgHappiness),
    security,
    governmentTrust,
    qualityOfLife,
    economicInequality,
    educationAccess,
    healthcareAccess,
    socialStability,
    migrationPull,
  };
  state.societyIndicators = indicators;

  const point: SocietyHistoryPoint = {
    day: state.day,
    qualityOfLife,
    happiness: indicators.happiness,
    security,
    governmentTrust,
    economicInequality,
  };
  state.societyHistory!.push(point);
  if (state.societyHistory!.length > 60) {
    state.societyHistory = state.societyHistory!.slice(-60);
  }

  // Migración orgánica opcional: solo si calidad de vida es alta, hay casas libres, sin crisis activas y cada 15 días
  if (
    state.day >= 25 &&
    state.day % 15 === 0 &&
    migrationPull >= 72 &&
    freeBeds >= 2 &&
    (state.crisisMonitor?.activeCrises.length ?? 0) === 0 &&
    state.agents.length < 110
  ) {
    const openHouse = state.houses.find(
      (h) => state.agents.filter((a) => a.houseId === h.id).length < h.capacity
    );
    if (openHouse) {
      const id = state.nextId++;
      const sex: 'M' | 'F' = id % 2 === 0 ? 'M' : 'F';
      const namesM = ['Julián', 'Tomás', 'Esteban', 'Darío'];
      const namesF = ['Paloma', 'Lucía', 'Rocío', 'Inés'];
      const name = `${(sex === 'M' ? namesM : namesF)[id % 4]} ${String.fromCharCode(65 + (id % 26))}.`;
      state.agents.push({
        id,
        name,
        sex,
        x: openHouse.x,
        y: openHouse.y + 18,
        ageYears: 21 + (id % 6),
        generation: 1,
        traits: assignInitialTraits(id),
        memories: [],
        isRetired: false,
        aptitudeBonus: {},
        isChild: false,
        isElder: false,
        hunger: 18,
        energy: 92,
        health: 95,
        isSick: false,
        illnessName: null,
        illness: null,
        happiness: 78,
        education: 18,
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
        coins: 10,
        inv: { food: 3, wood: 1, pineWood: 0, mapleWood: 0, oakWood: 0, stone: 1, copper: 0, iron: 0, gold: 0, silver: 0 },
        milkCount: 0,
        breadCount: 0,
        toolsCount: 0,
        medicineCount: 0,
        job: 'Agricultor',
        houseId: openHouse.id,
        assignedBuildingId: null,
        mountedHorseId: null,
        skin: '#e0ac69',
        shirt: '#0ea5e9',
        hairStyle: sex === 'F' ? 'long' : 'short',
        hairColor: '#4a2c18',
        partnerId: null,
        exPartnerIds: [],
        parents: 'Migración voluntaria',
        childrenCount: 0,
        emotion: 'happy',
        talkingTimer: 0,
        lastDialogue: null,
        lastQwenDecision: 'Atracción por la calidad de vida de la aldea.',
        qwenPlan: 'Contribuir a la comunidad',
        taskType: 'idle',
        taskTimer: 0,
        taskTargetId: null,
        activity: 'Recién llegado',
        thought: 'Esta aldea ofrece bienestar y oportunidades.',
        importance: 15,
        walkFrame: 0,
        reproductionCooldown: 0,
        moodModifier: 0,
        activeConstruction: null,
        birthDay: Math.max(1, state.day - 21),
      });
      trackNaturalProgress(state, 'births', 1);
      recordCategorizedChronicle(
        state,
        'social',
        `Migración atraída por el bienestar (${qualityOfLife}% QoL): ${name} se sumó a ${openHouse.name}.`
      );
      addLog(state, `Nuevo migrante: ${name} llegó atraído por la calidad de vida.`, 'emerald');
    }
  }

  return indicators;
}

export function divineResolveAllCrises(state: SimulationState): number {
  ensureCrisesAndSocietyDefaults(state);
  const count = state.crisisMonitor!.activeCrises.length + (state.activeDisaster ? 1 : 0);
  state.crisisMonitor!.activeCrises = [];
  state.crisisMonitor!.droughtStreakDays = 0;
  state.crisisMonitor!.scarcityAlert = false;
  state.crisisMonitor!.epidemicAlert = false;
  state.activeDisaster = null;
  if (state.weather === 'drought' || state.weather === 'thunderstorm' || state.weather === 'storm') {
    state.weather = 'sunny';
  }
  state.fires = [];
  pushSoundCue(state, 'celebration');
  trackDivineIntervention(state, 'disastersTriggered', 1, 'Intervención Divina disipó todas las crisis activas.');
  addLog(state, `Intervención Divina: todas las crisis (${count}) fueron mitigadas y el clima se estabilizó.`, 'violet');
  return count;
}

export function divineAdjustSocietyIndicator(
  state: SimulationState,
  target: 'happiness' | 'trust' | 'security',
  delta: number
): void {
  ensureCrisesAndSocietyDefaults(state);
  if (target === 'happiness') {
    for (const a of state.agents) {
      a.happiness = clamp(a.happiness + delta, 0, 100);
      a.moodModifier = clamp(a.moodModifier + Math.round(delta * 0.4), -20, 20);
      recordAgentMemory(state, a, 'helped', 'Bendición de bienestar en la aldea', delta >= 0 ? 'positive' : 'negative');
    }
  } else if (target === 'trust' && state.politics) {
    state.politics.approvalRating = clamp(state.politics.approvalRating + delta, 5, 100);
    state.politics.legitimacy = clamp(state.politics.legitimacy + Math.round(delta * 0.6), 5, 100);
  } else if (target === 'security') {
    state.fires = [];
    for (const a of state.agents) {
      a.energy = clamp(a.energy + 10, 0, 100);
    }
  }
  computeSocietyIndicatorsDaily(state);
  trackDivineIntervention(
    state,
    'economicInterventions',
    1,
    `Intervención Divina ajustó indicador social (${target} ${delta >= 0 ? '+' : ''}${delta}).`
  );
  addLog(state, `Intervención Divina ajustó ${target} (${delta >= 0 ? '+' : ''}${delta}).`, 'violet');
}

export function getTotalLivingDaysEstimate(state: SimulationState): number {
  return Math.max(1, Math.floor(state.day / DAYS_PER_YEAR));
}

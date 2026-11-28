import type {
  DiplomaticRelation,
  ExternalCommunity,
  ExternalTradeRecord,
  HouseStorage,
  SimulationState,
  TradeGoodKey,
} from '../types/simulation';
import {
  addLog,
  clamp,
  getTotalCirculatingCoins,
  isBuildingOperational,
  pushSoundCue,
} from './rules';
import { trackDivineIntervention, trackNaturalProgress } from './civilizationSystems';
import { emitSimEvent } from './eventBus';
import { recordCategorizedChronicle } from './historyAndChronicle';
import { DISCOVERY_CATALOG, grantDiscoveryToVillage } from './discoveries';
import { getActiveCultureTradeBonusPct } from './cultureAndFamilies';

const INITIAL_COMMUNITIES: Omit<ExternalCommunity, 'lastContactDay'>[] = [
  {
    id: 'valle_roble',
    name: 'Comarca del Roble',
    populationApprox: 38,
    era: 'wood',
    biome: 'forest',
    distanceKm: 18,
    direction: 'Oeste',
    resources: { food: 45, wood: 85, medicine: 12, tools: 8 },
    needs: ['stone', 'copper', 'iron'],
    coinReserve: 180,
    relation: 'neutrales',
    trust: 52,
    tradeAgreements: 0,
    knowledgeShared: 0,
  },
  {
    id: 'puerto_bruma',
    name: 'Puerto Bruma',
    populationApprox: 54,
    era: 'iron',
    biome: 'grassland',
    distanceKm: 26,
    direction: 'Norte',
    resources: { food: 70, bread: 30, medicine: 18, stone: 40 },
    needs: ['wood', 'tools', 'iron'],
    coinReserve: 260,
    relation: 'desconocidos',
    trust: 45,
    tradeAgreements: 0,
    knowledgeShared: 0,
  },
  {
    id: 'risco_hierro',
    name: 'Risco de Hierro',
    populationApprox: 46,
    era: 'iron',
    biome: 'tundra',
    distanceKm: 32,
    direction: 'Este',
    resources: { stone: 75, copper: 45, iron: 42, tools: 20 },
    needs: ['food', 'bread', 'wood'],
    coinReserve: 240,
    relation: 'desconocidos',
    trust: 40,
    tradeAgreements: 0,
    knowledgeShared: 0,
  },
  {
    id: 'vega_clara',
    name: 'Vega Clara',
    populationApprox: 62,
    era: 'civilization',
    biome: 'arid',
    distanceKm: 40,
    direction: 'Sur',
    resources: { food: 90, bread: 48, medicine: 26, copper: 20 },
    needs: ['iron', 'tools', 'stone'],
    coinReserve: 340,
    relation: 'desconocidos',
    trust: 48,
    tradeAgreements: 0,
    knowledgeShared: 0,
  },
];

export const TRADE_GOOD_LABELS: Record<TradeGoodKey, string> = {
  food: 'Comida',
  bread: 'Pan',
  wood: 'Madera',
  stone: 'Piedra',
  copper: 'Cobre',
  iron: 'Hierro',
  tools: 'Herramientas',
  medicine: 'Medicinas',
};

export function ensureDiplomacyDefaults(state: SimulationState): void {
  if (!Array.isArray(state.externalCommunities) || state.externalCommunities.length === 0) {
    state.externalCommunities = INITIAL_COMMUNITIES.map((c) => ({
      ...c,
      resources: { ...c.resources },
      needs: [...c.needs],
      lastContactDay: c.relation === 'neutrales' ? 1 : null,
    }));
  }
  if (!Array.isArray(state.externalTradeHistory)) {
    state.externalTradeHistory = [];
  }
}

function getGoodUnitPrice(state: SimulationState, good: TradeGoodKey): number {
  const p = state.marketPrices;
  if (!p) {
    return good === 'tools' ? 12 : good === 'medicine' ? 10 : good === 'iron' ? 7 : 3;
  }
  switch (good) {
    case 'food':
      return Math.max(2, p.food);
    case 'bread':
      return Math.max(3, p.bread);
    case 'wood':
      return Math.max(2, p.wood);
    case 'stone':
      return Math.max(3, p.stone);
    case 'copper':
      return Math.max(4, p.copper);
    case 'iron':
      return Math.max(6, p.iron);
    case 'tools':
      return Math.max(8, p.tools);
    case 'medicine':
      return Math.max(8, p.medicine);
  }
}

function getVillageTradableStock(state: SimulationState, good: TradeGoodKey): number {
  const depots = state.specialBuildings.filter(
    (b) => b.type === 'general_depot' || b.type === 'market' || b.type === 'dock'
  );
  const storageKey = good as keyof HouseStorage;
  let total = depots.reduce((s, d) => s + (d.storage[storageKey] ?? 0), 0);
  for (const a of state.agents) {
    if (good === 'bread') total += a.breadCount;
    else if (good === 'tools') total += a.toolsCount;
    else if (good === 'medicine') total += a.medicineCount;
    else total += a.inv[good] ?? 0;
  }
  return total;
}

function addVillageGood(state: SimulationState, good: TradeGoodKey, amount: number): void {
  if (amount <= 0) return;
  const depot =
    state.specialBuildings.find((b) => b.type === 'general_depot') ??
    state.specialBuildings.find((b) => b.type === 'market') ??
    null;
  const storageKey = good as keyof HouseStorage;
  if (depot && depot.allowedStorage.includes(storageKey)) {
    depot.storage[storageKey] = (depot.storage[storageKey] ?? 0) + amount;
    return;
  }
  if (good === 'food' && state.houses[0]) {
    state.houses[0].storage.food += amount;
    return;
  }
  const receiver =
    state.agents.find((a) => a.job === 'Comerciante' || a.job === 'Almacenero') ?? state.agents[0];
  if (!receiver) return;
  if (good === 'bread') receiver.breadCount += amount;
  else if (good === 'tools') receiver.toolsCount += amount;
  else if (good === 'medicine') receiver.medicineCount += amount;
  else receiver.inv[good] = (receiver.inv[good] ?? 0) + amount;
}

function consumeVillageGood(state: SimulationState, good: TradeGoodKey, amount: number): number {
  let remaining = amount;
  const depots = state.specialBuildings.filter(
    (b) => b.type === 'general_depot' || b.type === 'market' || b.type === 'dock'
  );
  const storageKey = good as keyof HouseStorage;
  for (const d of depots) {
    if (remaining <= 0) break;
    const avail = d.storage[storageKey] ?? 0;
    const take = Math.min(avail, remaining);
    d.storage[storageKey] = avail - take;
    remaining -= take;
  }
  for (const a of state.agents) {
    if (remaining <= 0) break;
    if (good === 'bread') {
      const take = Math.min(a.breadCount, remaining);
      a.breadCount -= take;
      remaining -= take;
    } else if (good === 'tools') {
      const take = Math.min(a.toolsCount, remaining);
      a.toolsCount -= take;
      remaining -= take;
    } else if (good === 'medicine') {
      const take = Math.min(a.medicineCount, remaining);
      a.medicineCount -= take;
      remaining -= take;
    } else {
      const avail = a.inv[good] ?? 0;
      const take = Math.min(avail, remaining);
      a.inv[good] = avail - take;
      remaining -= take;
    }
  }
  return amount - remaining;
}

function spendVillageCoins(state: SimulationState, amount: number): number {
  let remaining = Math.round(amount);
  const bankOrMarket = state.specialBuildings.filter(
    (b) => b.type === 'market' || b.type === 'general_depot' || b.type === 'bank'
  );
  for (const b of bankOrMarket) {
    if (remaining <= 0) break;
    const take = Math.min(b.storage.coins, remaining);
    b.storage.coins -= take;
    remaining -= take;
  }
  for (const h of state.houses) {
    if (remaining <= 0) break;
    const take = Math.min(h.storage.coins, remaining);
    h.storage.coins -= take;
    remaining -= take;
  }
  for (const a of state.agents) {
    if (remaining <= 0) break;
    const take = Math.min(a.coins, remaining);
    a.coins -= take;
    remaining -= take;
  }
  return Math.round(amount) - remaining;
}

function receiveVillageCoins(state: SimulationState, amount: number): void {
  if (amount <= 0) return;
  const targetBuilding =
    state.specialBuildings.find((b) => b.type === 'market') ??
    state.specialBuildings.find((b) => b.type === 'bank') ??
    state.specialBuildings.find((b) => b.type === 'general_depot') ??
    null;
  if (targetBuilding) {
    targetBuilding.storage.coins += Math.round(amount);
    return;
  }
  const trader = state.agents.find((a) => a.job === 'Comerciante') ?? state.agents[0];
  if (trader) {
    trader.coins += Math.round(amount);
  }
}

export function executeExternalTrade(
  state: SimulationState,
  communityId: string,
  kind: 'import' | 'export' | 'knowledge',
  good: TradeGoodKey = 'food',
  requestedAmount = 4
): { ok: boolean; summary: string } {
  ensureDiplomacyDefaults(state);
  const comm = state.externalCommunities!.find((c) => c.id === communityId);
  if (!comm) return { ok: false, summary: 'Comunidad externa no encontrada.' };
  if (comm.relation === 'hostiles') {
    return { ok: false, summary: `${comm.name} mantiene relaciones hostiles; primero mejorá la diplomacia.` };
  }
  if (comm.relation === 'desconocidos') {
    comm.relation = 'neutrales';
    comm.lastContactDay = state.day;
  }

  const amount = clamp(Math.round(requestedAmount), 1, 20);
  const relationDiscount = comm.relation === 'aliados' ? 0.85 : comm.relation === 'comerciales' ? 0.92 : 1.05;
  const festivalBonus = 1 - Math.min(0.15, getActiveCultureTradeBonusPct(state) / 100);
  const unitPrice = Math.max(1, Math.round(getGoodUnitPrice(state, good) * relationDiscount * festivalBonus));

  if (kind === 'import') {
    const remoteStock = comm.resources[good] ?? 0;
    const qty = Math.min(amount, remoteStock);
    if (qty <= 0) {
      return { ok: false, summary: `${comm.name} no tiene existencias disponibles de ${TRADE_GOOD_LABELS[good]}.` };
    }
    const villageCoins = getTotalCirculatingCoins(state);
    const maxAffordable = Math.floor(villageCoins / unitPrice);
    const finalQty = Math.min(qty, maxAffordable);
    if (finalQty <= 0) {
      return { ok: false, summary: `Fondos insuficientes para importar ${TRADE_GOOD_LABELS[good]} (${unitPrice} mon/u).` };
    }
    const totalCost = finalQty * unitPrice;
    const paid = spendVillageCoins(state, totalCost);
    if (paid < totalCost) {
      receiveVillageCoins(state, paid);
      return { ok: false, summary: 'No se pudo completar el pago comercial en monedas reales.' };
    }
    comm.resources[good] = remoteStock - finalQty;
    comm.coinReserve += paid;
    comm.trust = clamp(comm.trust + 5, 0, 100);
    comm.tradeAgreements += 1;
    comm.lastContactDay = state.day;
    if (comm.relation === 'neutrales' && comm.trust >= 58) comm.relation = 'comerciales';
    if (comm.relation === 'comerciales' && comm.trust >= 80) comm.relation = 'aliados';

    addVillageGood(state, good, finalQty);

    const rec: ExternalTradeRecord = {
      id: state.nextId++,
      day: state.day,
      communityId: comm.id,
      communityName: comm.name,
      kind: 'import',
      good,
      amount: finalQty,
      coinsDelta: -paid,
      summary: `Importación desde ${comm.name}: +${finalQty} ${TRADE_GOOD_LABELS[good]} por ${paid} mon.`,
    };
    state.externalTradeHistory!.unshift(rec);
    state.externalTradeHistory = state.externalTradeHistory!.slice(0, 60);
    trackNaturalProgress(state, 'tradesCompleted', 1);
    recordCategorizedChronicle(state, 'diplomacy', rec.summary);
    emitSimEvent(state, 'diplomacy_trade', rec.summary);
    addLog(state, rec.summary, 'sky');
    return { ok: true, summary: rec.summary };
  }

  if (kind === 'export') {
    const localStock = getVillageTradableStock(state, good);
    const maxByCoins = Math.floor(comm.coinReserve / Math.max(1, unitPrice));
    const qty = Math.min(amount, localStock, maxByCoins);
    if (qty <= 0) {
      return {
        ok: false,
        summary: `Stock propio insuficiente o ${comm.name} sin monedas para comprar ${TRADE_GOOD_LABELS[good]}.`,
      };
    }
    const consumed = consumeVillageGood(state, good, qty);
    if (consumed <= 0) {
      return { ok: false, summary: 'No hubo existencias suficientes para exportar.' };
    }
    const earned = consumed * unitPrice;
    comm.coinReserve = Math.max(0, comm.coinReserve - earned);
    comm.resources[good] = (comm.resources[good] ?? 0) + consumed;
    comm.trust = clamp(comm.trust + 6, 0, 100);
    comm.tradeAgreements += 1;
    comm.lastContactDay = state.day;
    if (comm.relation === 'neutrales' && comm.trust >= 58) comm.relation = 'comerciales';
    if (comm.relation === 'comerciales' && comm.trust >= 80) comm.relation = 'aliados';

    receiveVillageCoins(state, earned);

    const rec: ExternalTradeRecord = {
      id: state.nextId++,
      day: state.day,
      communityId: comm.id,
      communityName: comm.name,
      kind: 'export',
      good,
      amount: consumed,
      coinsDelta: earned,
      summary: `Exportación a ${comm.name}: -${consumed} ${TRADE_GOOD_LABELS[good]} (+${earned} mon.).`,
    };
    state.externalTradeHistory!.unshift(rec);
    state.externalTradeHistory = state.externalTradeHistory!.slice(0, 60);
    trackNaturalProgress(state, 'tradesCompleted', 1);
    recordCategorizedChronicle(state, 'diplomacy', rec.summary);
    emitSimEvent(state, 'diplomacy_trade', rec.summary);
    addLog(state, rec.summary, 'emerald');
    return { ok: true, summary: rec.summary };
  }

  // Intercambio de conocimiento (aliados o comerciales con alta confianza)
  if (comm.relation !== 'aliados' && comm.trust < 65) {
    return { ok: false, summary: `${comm.name} requiere relación Comercial/Aliada (confianza ≥65) para intercambio científico.` };
  }
  const knownIds = new Set((state.discoveries ?? []).map((d) => d.id));
  const candidateBp = DISCOVERY_CATALOG.find((bp) => !knownIds.has(bp.id));
  state.knowledge += 10;
  comm.knowledgeShared += 1;
  comm.trust = clamp(comm.trust + 4, 0, 100);
  comm.lastContactDay = state.day;
  if (candidateBp && comm.era !== 'primitive' && state.knowledge >= candidateBp.requiresVillageKnowledge * 0.75) {
    const scholar = state.agents.find((a) => a.job === 'Erudito' || a.job === 'Maestro') ?? state.agents[0] ?? null;
    grantDiscoveryToVillage(state, candidateBp, scholar, `intercambio diplomático con ${comm.name}`);
  }
  const rec: ExternalTradeRecord = {
    id: state.nextId++,
    day: state.day,
    communityId: comm.id,
    communityName: comm.name,
    kind: 'knowledge',
    amount: 10,
    coinsDelta: 0,
    summary: `Intercambio cultural y técnico con ${comm.name} (+10 Saber colectivo).`,
  };
  state.externalTradeHistory!.unshift(rec);
  state.externalTradeHistory = state.externalTradeHistory!.slice(0, 60);
  recordCategorizedChronicle(state, 'diplomacy', rec.summary);
  addLog(state, rec.summary, 'violet');
  return { ok: true, summary: rec.summary };
}

export function updateDiplomacyDaily(state: SimulationState): void {
  ensureDiplomacyDefaults(state);
  const hasMarket = isBuildingOperational(state, 'market');
  const hasDock = isBuildingOperational(state, 'dock');
  const hasTownHall = isBuildingOperational(state, 'town_hall');
  const communities = state.externalCommunities!;

  for (const comm of communities) {
    // Regeneración gradual de recursos externos propios
    comm.resources.food = clamp((comm.resources.food ?? 20) + 2, 0, 140);
    comm.resources.wood = clamp((comm.resources.wood ?? 20) + 1, 0, 140);
    comm.coinReserve = clamp(comm.coinReserve + 4, 40, 600);

    // Descubrimiento paulatino de comunidades vecinas
    if (comm.relation === 'desconocidos') {
      const contactThreshold =
        comm.id === 'puerto_bruma'
          ? hasDock || state.day >= 18
          : comm.id === 'risco_hierro'
            ? state.day >= 30 || state.era === 'wood' || state.era === 'iron'
            : state.day >= 48 || hasMarket || hasTownHall;
      if (contactThreshold) {
        comm.relation = 'neutrales';
        comm.lastContactDay = state.day;
        recordCategorizedChronicle(
          state,
          'diplomacy',
          `Contacto diplomático establecido con ${comm.name} (${comm.direction}, ${comm.distanceKm} km).`
        );
        addLog(state, `Diplomacia: se estableció contacto con ${comm.name}.`, 'sky');
      }
    }
  }

  // Comercio exterior autónomo basado en necesidades reales de la aldea (cada 4 días si hay Mercado/Muelle/Ayuntamiento)
  if ((hasMarket || hasDock || hasTownHall) && state.day % 4 === 0) {
    const totalFood =
      state.agents.reduce((s, a) => s + a.inv.food + a.breadCount, 0) +
      state.houses.reduce((s, h) => s + h.storage.food, 0);
    const activePartner = communities.find(
      (c) => c.relation === 'aliados' || c.relation === 'comerciales' || c.relation === 'neutrales'
    );
    if (activePartner) {
      if (totalFood < state.agents.length * 1.4 && (activePartner.resources.food ?? 0) >= 4) {
        executeExternalTrade(state, activePartner.id, 'import', 'food', 4);
      } else {
        const surplusGood: TradeGoodKey | undefined = (['wood', 'stone', 'tools', 'bread'] as TradeGoodKey[]).find(
          (g) => getVillageTradableStock(state, g) >= 14
        );
        if (surplusGood) {
          executeExternalTrade(state, activePartner.id, 'export', surplusGood, 3);
        }
      }
    }
  }
}

export function buildDiplomaticProposalSummary(state: SimulationState): {
  communityId: string;
  communityName: string;
  recommendedKind: 'import' | 'export' | 'knowledge';
  good: TradeGoodKey;
  amount: number;
  rationale: string;
} | null {
  ensureDiplomacyDefaults(state);
  const reachable = state.externalCommunities!.filter(
    (c) => c.relation !== 'desconocidos' && c.relation !== 'hostiles'
  );
  const target = reachable[0];
  if (!target) return null;

  const totalFood =
    state.agents.reduce((s, a) => s + a.inv.food + a.breadCount, 0) +
    state.houses.reduce((s, h) => s + h.storage.food, 0);
  if (totalFood < state.agents.length * 1.6 && (target.resources.food ?? 0) >= 4) {
    return {
      communityId: target.id,
      communityName: target.name,
      recommendedKind: 'import',
      good: 'food',
      amount: 5,
      rationale: 'Reservas alimentarias bajas: conviene importar alimento con monedas reales.',
    };
  }
  if (target.relation === 'aliados' || target.trust >= 65) {
    return {
      communityId: target.id,
      communityName: target.name,
      recommendedKind: 'knowledge',
      good: 'food',
      amount: 10,
      rationale: 'Alta confianza diplomática permite intercambio técnico y cultural.',
    };
  }
  return {
    communityId: target.id,
    communityName: target.name,
    recommendedKind: 'export',
    good: 'wood',
    amount: 4,
    rationale: 'Exportar excedentes fortalece el comercio y la confianza bilateral.',
  };
}

export function divineModifyDiplomacy(
  state: SimulationState,
  communityId: string,
  nextRelation: DiplomaticRelation
): boolean {
  ensureDiplomacyDefaults(state);
  const comm = state.externalCommunities!.find((c) => c.id === communityId);
  if (!comm) return false;
  comm.relation = nextRelation;
  comm.lastContactDay = state.day;
  comm.trust =
    nextRelation === 'aliados'
      ? 88
      : nextRelation === 'comerciales'
        ? 68
        : nextRelation === 'neutrales'
          ? 50
          : nextRelation === 'hostiles'
            ? 15
            : 40;
  pushSoundCue(state, nextRelation === 'aliados' ? 'celebration' : 'chatter');
  trackDivineIntervention(
    state,
    'economicInterventions',
    1,
    `Intervención Divina modificó la relación con ${comm.name} a "${nextRelation}".`
  );
  addLog(state, `Intervención Divina: relación con ${comm.name} pasó a "${nextRelation}".`, 'violet');
  return true;
}

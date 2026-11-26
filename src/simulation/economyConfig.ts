import type {
  FarmPlot,
  House,
  MaintenanceStatus,
  ResourceCostMap,
  ResourceInventory,
  RoadTile,
  RoadType,
  SpecialBuildingType,
} from '../types/simulation';

export const MAINTENANCE_CYCLE_DAYS = 30;

export const RESOURCE_DISPLAY_NAMES: Record<keyof ResourceInventory, string> = {
  food: 'Alimento',
  wood: 'Madera',
  pineWood: 'Pino',
  mapleWood: 'Arce',
  oakWood: 'Roble',
  stone: 'Piedra',
  copper: 'Cobre',
  iron: 'Hierro',
  gold: 'Oro',
  silver: 'Plata',
};

export const HOUSE_CONSTRUCTION_COSTS: Record<House['size'], ResourceCostMap> = {
  small: { wood: 3 },
  medium: { wood: 4 },
  large: { wood: 6 },
};

export const HOUSE_UPGRADE_COSTS: Record<House['size'], Record<2 | 3 | 4, ResourceCostMap>> = {
  small: {
    2: { pineWood: 5, stone: 2 },
    3: { stone: 5, oakWood: 3 },
    4: { stone: 6, iron: 4, oakWood: 3 },
  },
  medium: {
    2: { pineWood: 7, stone: 3 },
    3: { stone: 8, oakWood: 4 },
    4: { stone: 9, iron: 6, oakWood: 5 },
  },
  large: {
    2: { pineWood: 10, stone: 4 },
    3: { stone: 12, oakWood: 6 },
    4: { stone: 14, iron: 9, oakWood: 7 },
  },
};

export const HOUSE_MAINTENANCE_COSTS: Record<House['size'], Record<1 | 2 | 3 | 4, ResourceCostMap>> = {
  small: {
    1: { wood: 1 },
    2: { pineWood: 2 },
    3: { stone: 2, oakWood: 1 },
    4: { stone: 2, iron: 1 },
  },
  medium: {
    1: { wood: 1 },
    2: { pineWood: 3 },
    3: { stone: 3, oakWood: 1 },
    4: { stone: 3, iron: 2 },
  },
  large: {
    1: { wood: 2 },
    2: { pineWood: 4 },
    3: { stone: 4, oakWood: 2 },
    4: { stone: 5, iron: 3 },
  },
};

export const HOUSE_REPAIR_COSTS: Record<1 | 2 | 3 | 4, ResourceCostMap> = {
  1: { wood: 1 },
  2: { pineWood: 2 },
  3: { stone: 3, oakWood: 1 },
  4: { stone: 3, iron: 2 },
};

export const PLAZA_COSTS = {
  build: { wood: 15, stone: 15, oakWood: 5, iron: 4 } as ResourceCostMap,
  maintenance: { stone: 4, oakWood: 2, iron: 2 } as ResourceCostMap,
  repair: { wood: 4, stone: 4, iron: 1 } as ResourceCostMap,
};

export const BRIDGE_COSTS = {
  build: { oakWood: 12, stone: 10, iron: 6, copper: 3 } as ResourceCostMap,
  maintenance: { oakWood: 3, stone: 3, iron: 2 } as ResourceCostMap,
  repair: { oakWood: 4, stone: 3, iron: 2 } as ResourceCostMap,
};

export const ROAD_COSTS = {
  buildByType: {
    dirt: { wood: 1 },
    stone: { stone: 3 },
    reinforced: { stone: 2, wood: 1 },
  } as Record<RoadType, ResourceCostMap>,
  lamp: { wood: 2, copper: 1, iron: 1 } as ResourceCostMap,
  maintenancePer5: {
    dirt: { wood: 1 },
    stone: { stone: 2 },
    reinforced: { stone: 1, wood: 1 },
  } as Record<RoadType, ResourceCostMap>,
  lampMaintenancePer5: { copper: 1 } as ResourceCostMap,
  repairByType: {
    dirt: { wood: 1 },
    stone: { stone: 1 },
    reinforced: { stone: 1 },
  } as Record<RoadType, ResourceCostMap>,
};

export const FARM_COSTS: Record<FarmPlot['size'], { build: ResourceCostMap; maintenance: ResourceCostMap }> = {
  small: {
    build: { wood: 3, stone: 2 },
    maintenance: { wood: 1 },
  },
  medium: {
    build: { wood: 5, stone: 3, pineWood: 2 },
    maintenance: { wood: 2, stone: 1 },
  },
  large: {
    build: { wood: 8, stone: 5, pineWood: 3 },
    maintenance: { wood: 3, stone: 2 },
  },
};

export interface SpecialBuildingEconomySpec {
  unique: boolean;
  maxCount: number;
  level1Build: ResourceCostMap;
  level2Upgrade: ResourceCostMap;
  level3Upgrade: ResourceCostMap;
  maintenance: Record<1 | 2 | 3, ResourceCostMap>;
}

export const SPECIAL_BUILDING_COSTS: Record<SpecialBuildingType, SpecialBuildingEconomySpec> = {
  market: {
    unique: false,
    maxCount: 3,
    level1Build: { wood: 8, stone: 5, pineWood: 3, copper: 2 },
    level2Upgrade: { wood: 5, stone: 4, iron: 3 },
    level3Upgrade: { oakWood: 5, stone: 6, iron: 5, copper: 2 },
    maintenance: {
      1: { wood: 2, stone: 1 },
      2: { wood: 2, stone: 2, iron: 1 },
      3: { wood: 3, stone: 2, iron: 2 },
    },
  },
  bakery: {
    unique: false,
    maxCount: 3,
    level1Build: { wood: 6, stone: 3, pineWood: 2 },
    level2Upgrade: { wood: 4, stone: 4, copper: 2 },
    level3Upgrade: { oakWood: 5, stone: 5, iron: 3 },
    maintenance: {
      1: { wood: 2, stone: 1 },
      2: { wood: 2, stone: 2 },
      3: { wood: 2, stone: 2, iron: 1 },
    },
  },
  carpentry: {
    unique: false,
    maxCount: 3,
    level1Build: { wood: 8, stone: 4, pineWood: 4 },
    level2Upgrade: { mapleWood: 5, stone: 4, iron: 2 },
    level3Upgrade: { oakWood: 6, stone: 5, iron: 4 },
    maintenance: {
      1: { pineWood: 2, wood: 1 },
      2: { mapleWood: 2, iron: 1 },
      3: { oakWood: 2, iron: 2 },
    },
  },
  forge: {
    unique: false,
    maxCount: 3,
    level1Build: { wood: 6, stone: 8, copper: 4, iron: 3 },
    level2Upgrade: { stone: 4, iron: 5, copper: 3 },
    level3Upgrade: { stone: 6, iron: 8, copper: 4 },
    maintenance: {
      1: { stone: 2, iron: 2 },
      2: { stone: 3, iron: 3 },
      3: { stone: 4, iron: 4 },
    },
  },
  apothecary: {
    unique: false,
    maxCount: 3,
    level1Build: { wood: 7, stone: 4, mapleWood: 2, copper: 1 },
    level2Upgrade: { wood: 4, stone: 4, mapleWood: 3, copper: 2 },
    level3Upgrade: { oakWood: 5, stone: 5, copper: 3, iron: 2 },
    maintenance: {
      1: { wood: 2, mapleWood: 1 },
      2: { mapleWood: 2, copper: 1 },
      3: { mapleWood: 2, copper: 2, iron: 1 },
    },
  },
  dock: {
    unique: false,
    maxCount: 3,
    level1Build: { oakWood: 10, stone: 6, iron: 4 },
    level2Upgrade: { oakWood: 6, stone: 5, iron: 3 },
    level3Upgrade: { oakWood: 8, stone: 7, iron: 5 },
    maintenance: {
      1: { oakWood: 3, stone: 2 },
      2: { oakWood: 4, stone: 2, iron: 1 },
      3: { oakWood: 5, stone: 3, iron: 2 },
    },
  },
  bank: {
    unique: true,
    maxCount: 1,
    level1Build: { wood: 12, stone: 12, oakWood: 6, iron: 6, copper: 3 },
    level2Upgrade: { stone: 8, oakWood: 6, iron: 5, copper: 3 },
    level3Upgrade: { stone: 10, oakWood: 8, iron: 8, copper: 5, silver: 2 },
    maintenance: {
      1: { stone: 3, oakWood: 2, iron: 2 },
      2: { stone: 4, oakWood: 3, iron: 3 },
      3: { stone: 5, oakWood: 4, iron: 4, silver: 1 },
    },
  },
  infirmary: {
    unique: false,
    maxCount: 3,
    level1Build: { wood: 10, stone: 8, mapleWood: 4, copper: 3, iron: 2 },
    level2Upgrade: { stone: 6, mapleWood: 4, copper: 3, iron: 3 },
    level3Upgrade: { stone: 8, mapleWood: 6, copper: 4, iron: 5 },
    maintenance: {
      1: { wood: 2, mapleWood: 2, copper: 1 },
      2: { stone: 3, mapleWood: 2, copper: 2 },
      3: { stone: 3, mapleWood: 3, copper: 3, iron: 1 },
    },
  },
  school: {
    unique: false,
    maxCount: 3,
    level1Build: { wood: 8, stone: 5, mapleWood: 5, copper: 2 },
    level2Upgrade: { wood: 5, stone: 4, mapleWood: 4, copper: 2 },
    level3Upgrade: { oakWood: 6, stone: 5, mapleWood: 5, iron: 3 },
    maintenance: {
      1: { wood: 2, mapleWood: 2 },
      2: { wood: 2, mapleWood: 2, copper: 1 },
      3: { wood: 3, mapleWood: 3, copper: 2 },
    },
  },
  general_depot: {
    unique: false,
    maxCount: 3,
    level1Build: { wood: 10, stone: 8, pineWood: 4, iron: 2 },
    level2Upgrade: { wood: 6, stone: 6, oakWood: 4, iron: 3 },
    level3Upgrade: { oakWood: 8, stone: 8, iron: 5, copper: 3 },
    maintenance: {
      1: { wood: 2, stone: 2 },
      2: { wood: 3, stone: 3, iron: 1 },
      3: { oakWood: 3, stone: 4, iron: 2 },
    },
  },
  town_hall: {
    unique: true,
    maxCount: 1,
    level1Build: { wood: 15, stone: 12, oakWood: 8, iron: 5, copper: 3 },
    level2Upgrade: { oakWood: 8, stone: 8, iron: 5, copper: 3 },
    level3Upgrade: { oakWood: 10, stone: 10, iron: 8, copper: 5, silver: 2 },
    maintenance: {
      1: { wood: 3, stone: 3, oakWood: 2 },
      2: { stone: 4, oakWood: 3, iron: 2 },
      3: { stone: 5, oakWood: 4, iron: 3, silver: 1 },
    },
  },
  police_station: {
    unique: false,
    maxCount: 3,
    level1Build: { wood: 8, stone: 7, oakWood: 4, iron: 3 },
    level2Upgrade: { stone: 5, oakWood: 4, iron: 3 },
    level3Upgrade: { stone: 7, oakWood: 6, iron: 5, copper: 2 },
    maintenance: {
      1: { wood: 2, stone: 2, iron: 1 },
      2: { stone: 3, oakWood: 2, iron: 2 },
      3: { stone: 3, oakWood: 3, iron: 3 },
    },
  },
  prison: {
    unique: true,
    maxCount: 1,
    level1Build: { stone: 14, wood: 10, iron: 6, oakWood: 5 },
    level2Upgrade: { stone: 8, iron: 6, oakWood: 4 },
    level3Upgrade: { stone: 12, iron: 8, oakWood: 6, copper: 3 },
    maintenance: {
      1: { stone: 4, iron: 2, oakWood: 1 },
      2: { stone: 5, iron: 3, oakWood: 2 },
      3: { stone: 6, iron: 4, oakWood: 3 },
    },
  },
};

export const SPECIAL_BUILDING_REPAIR_COSTS: Record<1 | 2 | 3, ResourceCostMap> = {
  1: { wood: 2, stone: 2 },
  2: { wood: 3, stone: 3, iron: 1 },
  3: { oakWood: 3, stone: 4, iron: 2 },
};

export const PRODUCTION_INPUT_COSTS = {
  bakeryBread: { food: 1 } as ResourceCostMap,
  forgeTool: { copper: 1, iron: 1 } as ResourceCostMap,
  apothecaryMedicine: { food: 1, wood: 1 } as ResourceCostMap,
  carpentryHousingDiscount: { wood: 1 } as ResourceCostMap,
};

export const PROGRESSIVE_WEAR_THRESHOLDS = {
  debtWarningDays: 30,
  deterioratingDays: 60,
  halfEfficiencyDays: 90,
  inoperativeDays: 120,
  ruinedDays: 150,
} as const;

export function getMaintenanceStatusFromUnpaidDays(unpaidDays: number): MaintenanceStatus {
  if (unpaidDays >= PROGRESSIVE_WEAR_THRESHOLDS.ruinedDays) return 'ruined';
  if (unpaidDays >= PROGRESSIVE_WEAR_THRESHOLDS.inoperativeDays) return 'inoperative';
  if (unpaidDays >= PROGRESSIVE_WEAR_THRESHOLDS.halfEfficiencyDays) return 'half_efficiency';
  if (unpaidDays >= PROGRESSIVE_WEAR_THRESHOLDS.deterioratingDays) return 'deteriorating';
  if (unpaidDays >= PROGRESSIVE_WEAR_THRESHOLDS.debtWarningDays) return 'debt_warning';
  return 'ok';
}

export function getMaintenanceStatusLabel(status: MaintenanceStatus): string {
  switch (status) {
    case 'debt_warning':
      return 'Aviso de deuda (30d)';
    case 'deteriorating':
      return 'Deterioro activo (60d)';
    case 'half_efficiency':
      return 'Eficiencia 50% (90d)';
    case 'inoperative':
      return 'Inoperativo (120d)';
    case 'ruined':
      return 'Riesgo de ruina (150d)';
    case 'ok':
    default:
      return 'Al día';
  }
}

export function getHouseBuildCost(size: House['size'], applyCarpentryDiscount = false): ResourceCostMap {
  const base = { ...HOUSE_CONSTRUCTION_COSTS[size] };
  if (applyCarpentryDiscount && (base.wood ?? 0) > 1) {
    base.wood = (base.wood ?? 0) - 1;
  }
  return base;
}

export function getHouseUpgradeCost(
  size: House['size'],
  targetLevel: 2 | 3 | 4,
  applyCarpentryDiscount = false
): ResourceCostMap {
  const base = { ...HOUSE_UPGRADE_COSTS[size][targetLevel] };
  if (applyCarpentryDiscount) {
    if ((base.pineWood ?? 0) > 2) base.pineWood = (base.pineWood ?? 0) - 1;
    else if ((base.oakWood ?? 0) > 2) base.oakWood = (base.oakWood ?? 0) - 1;
  }
  return base;
}

export function getHouseMaintenanceCost(size: House['size'], level: 1 | 2 | 3 | 4): ResourceCostMap {
  return { ...HOUSE_MAINTENANCE_COSTS[size][level] };
}

export function getHouseRepairCost(level: 1 | 2 | 3 | 4): ResourceCostMap {
  return { ...HOUSE_REPAIR_COSTS[level] };
}

export function getFarmCost(size: FarmPlot['size']): { build: ResourceCostMap; maintenance: ResourceCostMap } {
  return {
    build: { ...FARM_COSTS[size].build },
    maintenance: { ...FARM_COSTS[size].maintenance },
  };
}

export function getSpecialBuildingCost(type: SpecialBuildingType, targetLevel: 1 | 2 | 3): ResourceCostMap {
  const spec = SPECIAL_BUILDING_COSTS[type];
  if (targetLevel === 1) return { ...spec.level1Build };
  if (targetLevel === 2) return { ...spec.level2Upgrade };
  return { ...spec.level3Upgrade };
}

export function getSpecialBuildingMaintenanceCost(
  type: SpecialBuildingType,
  level: 1 | 2 | 3
): ResourceCostMap {
  return { ...SPECIAL_BUILDING_COSTS[type].maintenance[level] };
}

export function getSpecialBuildingRepairCost(level: 1 | 2 | 3): ResourceCostMap {
  return { ...SPECIAL_BUILDING_REPAIR_COSTS[level] };
}

export function getRoadTileCost(roadType: RoadType, withLamp = false): ResourceCostMap {
  const cost: ResourceCostMap = { ...ROAD_COSTS.buildByType[roadType] };
  if (withLamp) {
    for (const [k, v] of Object.entries(ROAD_COSTS.lamp) as Array<[keyof ResourceInventory, number]>) {
      cost[k] = (cost[k] ?? 0) + v;
    }
  }
  return cost;
}

export function getRoadRepairCost(roadType: RoadType): ResourceCostMap {
  return { ...ROAD_COSTS.repairByType[roadType] };
}

export function getRoadMaintenanceCost(roads: RoadTile[]): ResourceCostMap {
  const total: ResourceCostMap = {};
  const counts: Record<RoadType, number> = { dirt: 0, stone: 0, reinforced: 0 };
  let lamps = 0;

  for (const r of roads) {
    const t: RoadType = r.roadType ?? 'dirt';
    counts[t]++;
    if (r.hasLamp ?? r.lit) lamps++;
  }

  (['dirt', 'stone', 'reinforced'] as RoadType[]).forEach((t) => {
    const c = counts[t];
    if (c <= 0) return;
    const batches = Math.ceil(c / 5);
    const per5 = ROAD_COSTS.maintenancePer5[t];
    for (const [k, v] of Object.entries(per5) as Array<[keyof ResourceInventory, number]>) {
      total[k] = (total[k] ?? 0) + v * batches;
    }
  });

  if (lamps > 0) {
    const lampBatches = Math.ceil(lamps / 5);
    total.copper = (total.copper ?? 0) + (ROAD_COSTS.lampMaintenancePer5.copper ?? 1) * lampBatches;
  }

  return total;
}

export function formatResourceCost(cost: ResourceCostMap): string {
  const parts: string[] = [];
  for (const [k, v] of Object.entries(cost) as Array<[keyof ResourceInventory, number]>) {
    if (!v || v <= 0) continue;
    parts.push(`${v} ${RESOURCE_DISPLAY_NAMES[k] ?? k}`);
  }
  return parts.length > 0 ? parts.join(' + ') : 'Sin costo';
}

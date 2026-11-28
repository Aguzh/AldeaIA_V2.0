import { useState } from 'react';
import type {
  Agent,
  Animal,
  BridgeStructure,
  FarmPlot,
  House,
  HouseStorage,
  InterventionMode,
  JobType,
  PlazaStructure,
  ResourceInventory,
  SelectedEntity,
  SpecialBuilding,
} from '../types/simulation';
import {
  ALL_JOBS,
  ANIMAL_LABELS,
  BRIDGE_COSTS,
  canGatherOrTradeMineral,
  canGatherOrTradeWood,
  countMaestroJobs,
  formatResourceCost,
  getFarmCost,
  getHappinessLabel,
  getHealthStatusLabel,
  getHouseMaintenanceCost,
  getHouseRepairCost,
  getHouseUpgradeCost,
  getJobMasteryTierLabel,
  getMaintenanceStatusLabel,
  getRankTitle,
  getSpecialBuildingCost,
  getSpecialBuildingMaintenanceCost,
  getSpecialBuildingRepairCost,
  HOUSE_ALLOWED_STORAGE,
  HOUSE_LEVEL_LABELS,
  HOUSE_SIZE_LABELS,
  isBridgePassable,
  MAX_MAESTRO_JOBS_PER_AGENT,
  PLAZA_COSTS,
  SPECIAL_BUILDING_ALLOWED_STORAGE,
  SPECIAL_BUILDING_STAFF_JOBS,
  VILLAGE_SKILLS,
} from '../simulation/rules';
import { getAgentTraits, PERSONALITY_LABELS } from '../simulation/civilizationSystems';

interface VillagerInspectorProps {
  selectedEntity: SelectedEntity | null;
  agent: Agent | null;
  partnerName: string | null;
  mentorName: string | null;
  agentHouse: House | null;
  inspectedHouse: House | null;
  inspectedHouseResidents: Agent[];
  inspectedSpecial: SpecialBuilding | null;
  inspectedSpecialOwnerName: string | null;
  inspectedSpecialStaff: Agent[];
  inspectedFarm: FarmPlot | null;
  inspectedAnimal: Animal | null;
  inspectedPlaza: PlazaStructure | null;
  inspectedBridge: BridgeStructure | null;
  inspectedAnimalOwnerName: string | null;
  inspectedAnimalRiderName: string | null;
  populationCount: number;
  sickCount: number;
  highlightedFamilyId: number | null;
  interventionMode: InterventionMode;
  onSelectFirstAgent: () => void;
  onSelectAgent: (id: number) => void;
  onCure: (id: number) => void;
  onInfect: (id: number) => void;
  onToggleSterile: (id: number) => void;
  onKill: (id: number) => void;
  onSwitchPartner: (id: number) => void;
  onStoreInHouse: (id: number) => void;
  onHighlightFamily: (id: number | null) => void;
  onModifyResource: (id: number, resource: keyof ResourceInventory | 'coins', delta: number) => void;
  onModifyKnowledge: (id: number, delta: number) => void;
  onCraftTools: (id: number) => void;
  onModifyHouseStorage: (houseId: number, key: keyof HouseStorage, delta: number) => void;
  onModifySpecialStorage: (buildingId: number, key: keyof HouseStorage, delta: number) => void;
  onDeleteHouse: (id: number) => void;
  onDeleteSpecial: (id: number) => void;
  onDeleteFarm: (id: number) => void;
  onDeleteAnimal: (id: number) => void;
  onDeletePlaza: () => void;
  onDeleteBridge: () => void;
  onDivineChangeAge?: (id: number, deltaYears: number) => void;
  onDivineChangeJob?: (id: number, job: JobType) => void;
  lineageSurname?: string | null;
  knownDiscoveryNames?: string[];
}

type AgentInspectorTab = 'general' | 'mind' | 'inventory' | 'options';

const SPECIAL_ROLE_INFO: Record<SpecialBuilding['type'], string> = {
  infirmary: 'Atiende aldeanos enfermos y frena cuadros graves. Requiere Curandero activo.',
  school: 'Eleva el Saber general, Carpintería y Construcción. Requiere Maestro o Erudito.',
  bank: 'Administra Oro 🥇, Plata 🥈, préstamos e impuestos. Requiere Banquero.',
  market: 'Centraliza el comercio de bienes y monedas respaldadas. Requiere Comerciante.',
  bakery: 'Hornea pan nutritivo a partir de los cultivos y raciones. Requiere Panadero.',
  carpentry: 'Procesa Pino, Arce y Roble y coordina reparaciones. Requiere Carpintero.',
  forge: 'Forja herramientas con Cobre o Hierro y mejora defensas. Requiere Herrero o Artesano.',
  apothecary: 'Elabora remedios contra enfermedades curables. Requiere Boticario.',
  dock: 'Regula la pesca fluvial respetando el cardumen finito. Requiere Pescador.',
  general_depot: 'Resguarda maderas, piedra, minerales y suministros. Requiere Almacenero.',
  town_hall: 'Sede del Consejo y del Representante electo de la aldea. Requiere Alcalde.',
  police_station: 'Vigila el cumplimiento de las leyes y patrulla de noche. Requiere Comisario o Guardián.',
  prison: 'Mantiene detenidos por 2 días a quienes infringen las leyes. Requiere Comisario o Guardián.',
};

const STORAGE_LABELS: Record<keyof HouseStorage, string> = {
  food: 'Alimento',
  bread: 'Pan',
  milk: 'Leche',
  wood: 'Madera',
  pineWood: 'Pino',
  mapleWood: 'Arce',
  oakWood: 'Roble',
  stone: 'Piedra',
  copper: 'Cobre',
  iron: 'Hierro',
  gold: 'Oro 🥇',
  silver: 'Plata 🥈',
  tools: 'Herram.',
  medicine: 'Medic.',
  coins: 'Monedas',
};

export function VillagerInspector({
  selectedEntity,
  agent,
  partnerName,
  mentorName,
  agentHouse,
  inspectedHouse,
  inspectedHouseResidents,
  inspectedSpecial,
  inspectedSpecialOwnerName,
  inspectedSpecialStaff,
  inspectedFarm,
  inspectedAnimal,
  inspectedPlaza,
  inspectedBridge,
  inspectedAnimalOwnerName,
  inspectedAnimalRiderName,
  populationCount,
  sickCount,
  highlightedFamilyId,
  interventionMode,
  onSelectFirstAgent,
  onSelectAgent,
  onCure,
  onInfect,
  onToggleSterile,
  onKill,
  onSwitchPartner,
  onStoreInHouse,
  onHighlightFamily,
  onModifyResource,
  onModifyKnowledge,
  onCraftTools,
  onModifyHouseStorage,
  onModifySpecialStorage,
  onDeleteHouse,
  onDeleteSpecial,
  onDeleteFarm,
  onDeleteAnimal,
  onDeletePlaza,
  onDeleteBridge,
  onDivineChangeAge,
  onDivineChangeJob,
  lineageSurname = null,
  knownDiscoveryNames = [],
}: VillagerInspectorProps) {
  const [minimized, setMinimized] = useState(false);
  const [agentTab, setAgentTab] = useState<AgentInspectorTab>('general');
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [selectedMineralKey, setSelectedMineralKey] = useState<'copper' | 'iron' | 'silver' | 'gold'>('iron');

  const isObserver = interventionMode === 'observer';
  const isAdvanced = interventionMode === 'advanced';

  const collapseBtn = (
    <button
      type="button"
      aria-expanded={!minimized}
      aria-label={minimized ? 'Expandir Inspector' : 'Minimizar Inspector'}
      data-testid="toggle-inspector-panel"
      onClick={() => setMinimized((v) => !v)}
      className="w-7 h-7 rounded-lg bg-[#0b1120] border border-slate-700 hover:border-slate-500 text-slate-200 text-[16px] font-mono flex items-center justify-center transition-colors shrink-0"
    >
      {minimized ? '+' : '−'}
    </button>
  );

  if (selectedEntity?.kind === 'house' && inspectedHouse) {
    const sizeLabel = HOUSE_SIZE_LABELS[inspectedHouse.size ?? 'medium'];
    const durability = Math.round(inspectedHouse.durability ?? 100);
    return (
      <section
        className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3 shrink-0"
        data-testid="inspector-panel"
      >
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800">
          <div className="min-w-0">
            <h2 className="text-[16px] leading-tight font-bold text-slate-50" data-testid="inspector-entity-name">
              {inspectedHouse.name}
            </h2>
            <div className="text-[13px] text-slate-300 mt-0.5">
              Vivienda {sizeLabel} · {inspectedHouse.zone === 'north' ? 'Zona Norte' : 'Zona Sur'}
            </div>
            <div className="text-[13px] mt-1">
              <span className="font-semibold text-emerald-400">{HOUSE_LEVEL_LABELS[inspectedHouse.level]}</span>
              {' · '}
              <span className="text-slate-300 font-mono tabular-nums">
                {inspectedHouseResidents.length}/{inspectedHouse.capacity} · {durability}%
              </span>
            </div>
          </div>
          {collapseBtn}
        </div>

        {!minimized && (
          <>
            <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 text-[13px] flex flex-col gap-2">
              <div className="flex justify-between gap-2 flex-wrap">
                <span className="text-slate-400">Obra:</span>
                <span className="text-slate-100 font-medium">{inspectedHouse.builderName}</span>
              </div>
              <div className="flex justify-between gap-2 flex-wrap">
                <span className="text-slate-400">Mantenimiento:</span>
                <span
                  className={
                    (inspectedHouse.maintenanceStatus ?? 'ok') === 'ok'
                      ? 'text-emerald-400 font-semibold'
                      : inspectedHouse.maintenanceStatus === 'ruined' ||
                          inspectedHouse.maintenanceStatus === 'inoperative'
                        ? 'text-rose-400 font-semibold'
                        : 'text-amber-300 font-semibold'
                  }
                >
                  {getMaintenanceStatusLabel(inspectedHouse.maintenanceStatus ?? 'ok')}
                </span>
              </div>
              <div className="text-[12px] text-slate-300 pt-2 border-t border-slate-800/70 leading-snug flex flex-col gap-1">
                <div>
                  Cuota 30d:{' '}
                  <span className="font-mono text-slate-100">
                    {formatResourceCost(
                      getHouseMaintenanceCost(inspectedHouse.size ?? 'medium', inspectedHouse.level)
                    )}
                  </span>
                </div>
                <div>
                  Reparación:{' '}
                  <span className="font-mono text-slate-100">
                    {formatResourceCost(getHouseRepairCost(inspectedHouse.level))}
                  </span>
                </div>
                {inspectedHouse.level < 4 && (
                  <div>
                    Mejora N{inspectedHouse.level + 1}:{' '}
                    <span className="font-mono text-sky-300">
                      {formatResourceCost(
                        getHouseUpgradeCost(
                          inspectedHouse.size ?? 'medium',
                          (inspectedHouse.level + 1) as 2 | 3 | 4
                        )
                      )}
                    </span>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-slate-800/70">
                {inspectedHouseResidents.length === 0 ? (
                  <span className="text-slate-400 italic text-[13px]">Sin habitantes asignados.</span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {inspectedHouseResidents.map((res) => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => onSelectAgent(res.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-900/60 border border-slate-700 text-[13px] text-slate-100 transition-colors"
                      >
                        {res.name} ({res.job})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 text-[13px] flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-200 font-semibold">Baúl Familiar</span>
                <span className="text-[12px] text-amber-300">Solo eliminar</span>
              </div>
              <div className="grid grid-cols-1 gap-2 font-mono tabular-nums">
                {HOUSE_ALLOWED_STORAGE.map((key) => {
                  const val = inspectedHouse.storage[key] ?? 0;
                  const label = key === 'food' ? 'Alimento' : 'Monedas';
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2 bg-[#111827] border border-slate-800/80 rounded-lg px-3 py-2"
                    >
                      <span className={key === 'coins' ? 'text-amber-300 font-semibold' : 'text-slate-100'}>
                        {label}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="min-w-8 text-center font-bold" data-testid={`house-storage-val-${key}`}>
                          {val}
                        </span>
                        <button
                          type="button"
                          disabled={val <= 0 || isObserver}
                          aria-label={`Quitar ${label} de casa`}
                          data-testid={`house-storage-sub-${key}`}
                          onClick={() => onModifyHouseStorage(inspectedHouse.id, key, -1)}
                          className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-rose-900/70 disabled:opacity-40 text-slate-100 text-[13px]"
                        >
                          -1
                        </button>
                        <button
                          type="button"
                          disabled={val <= 0 || isObserver}
                          aria-label={`Vaciar ${label} de casa`}
                          data-testid={`house-storage-clear-${key}`}
                          onClick={() => onModifyHouseStorage(inspectedHouse.id, key, -val)}
                          className="px-2.5 py-1 rounded-md bg-rose-950/70 hover:bg-rose-900/80 disabled:opacity-40 text-rose-200 text-[13px]"
                        >
                          Vaciar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              disabled={isObserver}
              onClick={() => onDeleteHouse(inspectedHouse.id)}
              data-testid="inspector-delete-btn"
              className="w-full py-2.5 px-3 rounded-lg bg-rose-950/70 border border-rose-700/70 hover:bg-rose-900/70 disabled:opacity-40 text-rose-200 text-[14px] font-semibold transition-colors"
            >
              Demoler / Eliminar vivienda
            </button>
          </>
        )}
      </section>
    );
  }

  if (selectedEntity?.kind === 'special' && inspectedSpecial) {
    const requiredJobs = SPECIAL_BUILDING_STAFF_JOBS[inspectedSpecial.type].join(' o ');
    const allowedKeys =
      inspectedSpecial.allowedStorage?.length > 0
        ? inspectedSpecial.allowedStorage
        : SPECIAL_BUILDING_ALLOWED_STORAGE[inspectedSpecial.type];
    const durability = Math.round(inspectedSpecial.durability ?? 100);

    return (
      <section
        className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3 shrink-0"
        data-testid="inspector-panel"
      >
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800">
          <div className="min-w-0">
            <h2 className="text-[16px] leading-tight font-bold text-slate-50" data-testid="inspector-entity-name">
              {inspectedSpecial.name}
            </h2>
            <div className="text-[13px] text-slate-300 mt-0.5">
              N{inspectedSpecial.level}/3 · {durability}% estado · {inspectedSpecial.builderName}
            </div>
          </div>
          {collapseBtn}
        </div>

        {!minimized && (
          <>
            <div
              className={`rounded-lg border px-3 py-2 text-[13px] flex flex-col gap-1 ${
                inspectedSpecial.isOperational
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-700/60 text-rose-200'
              }`}
              data-testid="special-operational-status"
            >
              <span className="font-semibold">
                {inspectedSpecial.isOperational
                  ? `Operativo (${Math.round((inspectedSpecial.efficiencyMultiplier ?? 1) * 100)}%)`
                  : inspectedSpecial.maintenanceStatus === 'inoperative' ||
                      inspectedSpecial.maintenanceStatus === 'ruined'
                    ? 'INOPERATIVO (Deuda)'
                    : 'OBSOLETO (Sin admin.)'}
              </span>
              <span className="font-mono text-[12px]">
                {inspectedSpecial.staffIds.length} · {requiredJobs}
              </span>
            </div>

            <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 text-[13px] flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-slate-400">Propietario</span>
                {inspectedSpecial.ownerId !== null && inspectedSpecialOwnerName ? (
                  <button
                    type="button"
                    onClick={() => onSelectAgent(inspectedSpecial.ownerId!)}
                    className="text-amber-300 hover:text-amber-200 font-semibold"
                    data-testid="special-owner-name"
                  >
                    {inspectedSpecialOwnerName}
                  </button>
                ) : (
                  <span className="text-slate-200 font-mono" data-testid="special-owner-name">
                    En venta ({inspectedSpecial.price}m)
                  </span>
                )}
              </div>
              <div className="text-slate-200 leading-snug">{SPECIAL_ROLE_INFO[inspectedSpecial.type]}</div>
              <div className="text-slate-300 text-[12px] pt-2 border-t border-slate-800/70 flex flex-col gap-1 leading-snug">
                <div>
                  Mant.:{' '}
                  <span className="font-mono text-slate-100">
                    {formatResourceCost(
                      getSpecialBuildingMaintenanceCost(
                        inspectedSpecial.type,
                        Math.min(3, Math.max(1, inspectedSpecial.level)) as 1 | 2 | 3
                      )
                    )}
                  </span>
                </div>
                <div>
                  Rep.:{' '}
                  <span className="font-mono text-slate-100">
                    {formatResourceCost(
                      getSpecialBuildingRepairCost(
                        Math.min(3, Math.max(1, inspectedSpecial.level)) as 1 | 2 | 3
                      )
                    )}
                  </span>
                </div>
                {inspectedSpecial.level < 3 && (
                  <div>
                    N{inspectedSpecial.level + 1}:{' '}
                    <span className="font-mono text-sky-300">
                      {formatResourceCost(
                        getSpecialBuildingCost(
                          inspectedSpecial.type,
                          (inspectedSpecial.level + 1) as 1 | 2 | 3
                        )
                      )}
                    </span>
                  </div>
                )}
              </div>
              {inspectedSpecialStaff.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-800/70">
                  {inspectedSpecialStaff.map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => onSelectAgent(st.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-emerald-900/60 border border-slate-700 text-[13px] text-slate-100"
                    >
                      {st.name} ({st.job})
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 text-[13px] flex flex-col gap-2">
              <div className="flex items-center justify-between text-slate-200 font-semibold">
                <span>Depósito Específico</span>
                <span className="text-[12px] text-slate-400">{allowedKeys.length} ítems</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 font-mono tabular-nums max-h-64 overflow-y-auto pr-1">
                {allowedKeys.map((k) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-2 bg-[#111827] border border-slate-800/80 rounded-lg px-2.5 py-1.5"
                  >
                    <span className="text-slate-200">{STORAGE_LABELS[k] ?? k}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={isObserver}
                        onClick={() => onModifySpecialStorage(inspectedSpecial.id, k, -1)}
                        className="w-7 h-7 rounded-md bg-slate-800 hover:bg-rose-900/70 disabled:opacity-40 text-slate-100 flex items-center justify-center text-[14px]"
                      >
                        -
                      </button>
                      <span className="min-w-7 text-center font-semibold" data-testid={`special-storage-val-${k}`}>
                        {inspectedSpecial.storage[k]}
                      </span>
                      <button
                        type="button"
                        disabled={isObserver}
                        onClick={() => onModifySpecialStorage(inspectedSpecial.id, k, 1)}
                        className="w-7 h-7 rounded-md bg-slate-800 hover:bg-emerald-800/70 disabled:opacity-40 text-slate-100 flex items-center justify-center text-[14px]"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={isObserver}
              onClick={() => onDeleteSpecial(inspectedSpecial.id)}
              data-testid="inspector-delete-btn"
              className="w-full py-2.5 px-3 rounded-lg bg-rose-950/70 border border-rose-700/70 hover:bg-rose-900/70 disabled:opacity-40 text-rose-200 text-[14px] font-semibold transition-colors"
            >
              Demoler / Eliminar edificio
            </button>
          </>
        )}
      </section>
    );
  }

  if (selectedEntity?.kind === 'farm' && inspectedFarm) {
    const sizeLabel = HOUSE_SIZE_LABELS[inspectedFarm.size ?? 'medium'];
    return (
      <section
        className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3 shrink-0"
        data-testid="inspector-panel"
      >
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800">
          <div>
            <h2 className="text-[16px] leading-tight font-bold text-slate-50" data-testid="inspector-entity-name">
              Cultivo de {inspectedFarm.cropName}
            </h2>
            <div className="text-[13px] text-slate-300 mt-0.5">
              Parcela {sizeLabel} · {Math.round(inspectedFarm.growth)}%
            </div>
          </div>
          {collapseBtn}
        </div>
        {!minimized && (
          <>
            <div className="h-3 w-full bg-[#0b1120] rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${Math.round(inspectedFarm.growth)}%` }} />
            </div>
            <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 text-[13px] text-slate-200 flex flex-col gap-1">
              <span>Mant.: {getMaintenanceStatusLabel(inspectedFarm.maintenanceStatus ?? 'ok')}</span>
              <span className="font-mono text-[13px] text-slate-300">
                {formatResourceCost(getFarmCost(inspectedFarm.size ?? 'medium').maintenance)}
              </span>
            </div>
            <button
              type="button"
              disabled={isObserver}
              onClick={() => onDeleteFarm(inspectedFarm.id)}
              data-testid="inspector-delete-btn"
              className="w-full py-2.5 px-3 rounded-lg bg-rose-950/70 border border-rose-700/70 hover:bg-rose-900/70 disabled:opacity-40 text-rose-200 text-[14px] font-semibold"
            >
              Eliminar / Matar cultivo
            </button>
          </>
        )}
      </section>
    );
  }

  if (selectedEntity?.kind === 'animal' && inspectedAnimal) {
    const statusText = inspectedAnimal.tamed
      ? 'Domesticado'
      : inspectedAnimal.hostile
        ? 'Salvaje Peligroso'
        : inspectedAnimal.type === 'fish'
          ? `Pez (${inspectedAnimal.fishVariant ?? 'trucha'})`
          : 'Ganado / Pacífico';
    const hpPct = clampPct((inspectedAnimal.hp / Math.max(1, inspectedAnimal.maxHp)) * 100);

    return (
      <section
        className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3 shrink-0"
        data-testid="inspector-panel"
      >
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800">
          <div>
            <h2 className="text-[16px] leading-tight font-bold text-slate-50" data-testid="inspector-entity-name">
              {inspectedAnimal.name}
            </h2>
            <div className="text-[13px] text-slate-300 mt-0.5">
              {ANIMAL_LABELS[inspectedAnimal.type]} · {statusText}
            </div>
          </div>
          {collapseBtn}
        </div>
        {!minimized && (
          <>
            <div className="h-3 w-full bg-[#0b1120] rounded-full overflow-hidden">
              <div
                className={`h-full ${inspectedAnimal.hostile && !inspectedAnimal.tamed ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${hpPct}%` }}
              />
            </div>
            <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 text-[14px] grid grid-cols-2 gap-2">
              <span>
                PV: {Math.round(inspectedAnimal.hp)}/{inspectedAnimal.maxHp}
              </span>
              <span className="text-right">Comida: +{inspectedAnimal.foodYield}</span>
              {inspectedAnimal.tamed && (
                <span className="col-span-2 text-emerald-300">
                  Dueño: {inspectedAnimalOwnerName ?? 'Aldea'}
                </span>
              )}
              {inspectedAnimal.type === 'horse' && (
                <span className="col-span-2">Jinete: {inspectedAnimalRiderName ?? 'Libre'}</span>
              )}
            </div>
            <button
              type="button"
              disabled={isObserver}
              onClick={() => onDeleteAnimal(inspectedAnimal.id)}
              data-testid="inspector-delete-btn"
              className="w-full py-2.5 px-3 rounded-lg bg-rose-950/70 border border-rose-700/70 hover:bg-rose-900/70 disabled:opacity-40 text-rose-200 text-[14px] font-semibold"
            >
              Matar / Eliminar animal
            </button>
          </>
        )}
      </section>
    );
  }

  if (selectedEntity?.kind === 'plaza' && inspectedPlaza) {
    return (
      <section
        className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3 shrink-0"
        data-testid="inspector-panel"
      >
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800">
          <div>
            <h2 className="text-[16px] leading-tight font-bold text-slate-50" data-testid="inspector-entity-name">
              Plaza Central de la Aldea
            </h2>
            <div className="text-[13px] text-slate-300 mt-0.5">
              Obra de {inspectedPlaza.builderName} · {Math.round(inspectedPlaza.durability ?? 100)}%
            </div>
          </div>
          {collapseBtn}
        </div>
        {!minimized && (
          <>
            <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 text-[13px] text-slate-200 leading-snug">
              Mant.: {getMaintenanceStatusLabel(inspectedPlaza.maintenanceStatus ?? 'ok')} · Cuota:{' '}
              {formatResourceCost(PLAZA_COSTS.maintenance)} · Rep.: {formatResourceCost(PLAZA_COSTS.repair)}
            </div>
            <button
              type="button"
              disabled={isObserver}
              onClick={onDeletePlaza}
              data-testid="inspector-delete-btn"
              className="w-full py-2.5 px-3 rounded-lg bg-rose-950/70 border border-rose-700/70 hover:bg-rose-900/70 disabled:opacity-40 text-rose-200 text-[14px] font-semibold"
            >
              Demoler / Eliminar plaza
            </button>
          </>
        )}
      </section>
    );
  }

  if (selectedEntity?.kind === 'bridge' && inspectedBridge) {
    const passable = isBridgePassable({ bridge: inspectedBridge });
    return (
      <section
        className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3 shrink-0"
        data-testid="inspector-panel"
      >
        <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800">
          <div>
            <h2 className="text-[16px] leading-tight font-bold text-slate-50" data-testid="inspector-entity-name">
              Puente Fluvial
            </h2>
            <div className="text-[13px] text-slate-300 mt-0.5">
              X: {Math.round(inspectedBridge.x)} · {Math.round(inspectedBridge.durability ?? 100)}%
            </div>
          </div>
          {collapseBtn}
        </div>
        {!minimized && (
          <>
            <div
              className={`rounded-lg border px-3 py-2 text-[13px] font-semibold ${
                passable
                  ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-200'
                  : 'bg-rose-950/50 border-rose-700/60 text-rose-200'
              }`}
              data-testid="bridge-passability-status"
            >
              {passable ? 'Tránsito habilitado (Sur ↔ Norte)' : 'INHABILITADO'}
            </div>
            <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 text-[13px] text-slate-200 leading-snug">
              Cuota: {formatResourceCost(BRIDGE_COSTS.maintenance)} · Rep.: {formatResourceCost(BRIDGE_COSTS.repair)}
            </div>
            <button
              type="button"
              disabled={isObserver}
              onClick={onDeleteBridge}
              data-testid="inspector-delete-btn"
              className="w-full py-2.5 px-3 rounded-lg bg-rose-950/70 border border-rose-700/70 hover:bg-rose-900/70 disabled:opacity-40 text-rose-200 text-[14px] font-semibold"
            >
              Demoler / Eliminar puente
            </button>
          </>
        )}
      </section>
    );
  }

  if (!agent) {
    return (
      <section className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 shrink-0" data-testid="inspector-panel">
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex flex-col">
            <h2 className="text-[16px] leading-tight font-bold tracking-wide text-slate-100">
              Inspector de Aldea
            </h2>
            <span className="text-[13px] text-slate-300 font-mono tabular-nums mt-0.5">
              {populationCount - sickCount} sanos · {sickCount} enfermos
            </span>
          </div>
          {collapseBtn}
        </div>
        {!minimized && (
          <>
            <p className="text-[14px] text-slate-300 leading-relaxed mb-3">
              Hacé clic en un aldeano, vivienda, edificio, cultivo o animal en el mapa para inspeccionarlo.
            </p>
            {populationCount > 0 && (
              <button
                type="button"
                onClick={onSelectFirstAgent}
                data-testid="inspect-first-agent-btn"
                className="w-full py-2.5 px-3 rounded-lg bg-[#0b1120] border border-slate-700 hover:border-emerald-500 text-[14px] font-semibold text-slate-100 transition-colors"
              >
                Inspeccionar primer aldeano
              </button>
            )}
          </>
        )}
      </section>
    );
  }

  const healthInfo = getHealthStatusLabel(agent);
  const happinessLabel = getHappinessLabel(agent.happiness, agent.emotion);
  const stageLabel = agent.isChild ? 'Niño/a' : agent.isElder ? 'Anciano/a' : 'Adulto/a';
  const isFamilyHighlighted = highlightedFamilyId === agent.id;
  const educationPct = clampPct(agent.education ?? 10);
  const unlockedIds = new Set(agent.skills ?? []);
  const traits = getAgentTraits(agent);
  const memories = agent.memories ?? [];

  const maestroCount = countMaestroJobs(agent);
  const currentJobMastery = Math.round(agent.jobMastery?.[agent.job] ?? 0);
  const currentJobTier = getJobMasteryTierLabel(currentJobMastery);
  const trainedJobs = (Object.entries(agent.jobMastery ?? {}) as Array<[JobType, number]>)
    .filter(([, v]) => typeof v === 'number' && v > 0)
    .sort((a, b) => b[1] - a[1]);

  const totalRations = agent.inv.food + agent.breadCount + agent.milkCount;
  const canPine = canGatherOrTradeWood(agent, 'pine');
  const canMaple = canGatherOrTradeWood(agent, 'maple');
  const canOak = canGatherOrTradeWood(agent, 'oak');
  const totalWoods =
    agent.inv.wood +
    (canPine || agent.inv.pineWood > 0 ? agent.inv.pineWood : 0) +
    (canMaple || agent.inv.mapleWood > 0 ? agent.inv.mapleWood : 0) +
    (canOak || agent.inv.oakWood > 0 ? agent.inv.oakWood : 0);
  const totalMinerals = agent.inv.copper + agent.inv.iron + agent.inv.silver + agent.inv.gold;

  const mineralBreakdownParts: string[] = [];
  if (canGatherOrTradeMineral(agent, 'copper') || agent.inv.copper > 0) mineralBreakdownParts.push(`Cob ${agent.inv.copper}`);
  if (canGatherOrTradeMineral(agent, 'iron') || agent.inv.iron > 0) mineralBreakdownParts.push(`Hie ${agent.inv.iron}`);
  if (canGatherOrTradeMineral(agent, 'silver') || agent.inv.silver > 0) mineralBreakdownParts.push(`🥈${agent.inv.silver}`);
  if (canGatherOrTradeMineral(agent, 'gold') || agent.inv.gold > 0) mineralBreakdownParts.push(`🥇${agent.inv.gold}`);

  const woodBreakdownParts: string[] = [`Com ${agent.inv.wood}`];
  if (canPine || agent.inv.pineWood > 0) woodBreakdownParts.push(`Pino ${agent.inv.pineWood}`);
  if (canMaple || agent.inv.mapleWood > 0) woodBreakdownParts.push(`Arce ${agent.inv.mapleWood}`);
  if (canOak || agent.inv.oakWood > 0) woodBreakdownParts.push(`Roble ${agent.inv.oakWood}`);

  return (
    <section
      className="bg-[#111827] border border-slate-800 rounded-xl p-3.5 flex flex-col gap-3 shrink-0"
      data-testid="inspector-panel"
    >
      <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-800">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h2 className="text-[18px] leading-tight font-bold text-slate-50" data-testid="inspector-agent-name">
              {agent.name}
            </h2>
            {agent.isRepresentative && (
              <span className="px-2 py-0.5 rounded bg-violet-950/80 border border-violet-600/70 text-[12px] font-semibold text-violet-200">
                Rep.
              </span>
            )}
            {agent.isRetired && (
              <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-700/60 text-[12px] font-semibold text-amber-200">
                Jubilado
              </span>
            )}
            {agent.jailedDays > 0 && (
              <span className="px-2 py-0.5 rounded bg-rose-950/80 border border-rose-600/70 text-[12px] font-semibold text-rose-200">
                Preso ({agent.jailedDays}d)
              </span>
            )}
          </div>
          <div className="text-[13px] text-slate-300 mt-1">
            {agent.sex === 'M' ? 'H' : 'M'} · {stageLabel} ·{' '}
            <span className="font-mono text-slate-100 font-semibold" data-testid="inspector-agent-age">
              {agent.ageYears} años
            </span>{' '}
            · Gen {agent.generation ?? 1}
          </div>
          <div className="text-[13px] mt-1">
            <span className="font-semibold text-emerald-400">
              {agent.job} ({currentJobTier})
            </span>
            <span className="text-slate-300 font-mono tabular-nums text-[12px] ml-2">
              · Imp. {agent.importance} ({getRankTitle(agent.importance)})
            </span>
          </div>
        </div>
        {collapseBtn}
      </div>

      {!minimized && (
        <>
          <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-2.5 text-[13px]">
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-400 text-[12px]">Actividad actual</span>
              <strong className="text-slate-100 font-semibold leading-snug" data-testid="inspector-activity">
                {agent.activity}
                {agent.mountedHorseId !== null ? ' (A caballo)' : ''}
              </strong>
            </div>
            <div className="grid grid-cols-1 gap-2 pt-1 font-mono tabular-nums text-[13px]">
              <div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Salud</span>
                  <span className={agent.isSick ? 'text-rose-400 font-semibold' : 'text-emerald-400 font-semibold'} data-testid="inspector-health">
                    {healthInfo.status} ({Math.round(agent.health)})
                  </span>
                </div>
                <div className="h-2 bg-slate-900 rounded-full overflow-hidden mt-1">
                  <div className={`h-full ${agent.isSick ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.round(agent.health)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ánimo</span>
                  <span className="text-amber-300 font-semibold" data-testid="inspector-happiness">
                    {happinessLabel} ({Math.round(agent.happiness)})
                  </span>
                </div>
                <div className="h-2 bg-slate-900 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-amber-400" style={{ width: `${Math.round(agent.happiness)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Energía</span>
                  <span className="text-sky-300 font-semibold">{Math.round(agent.energy)}%</span>
                </div>
                <div className="h-2 bg-slate-900 rounded-full overflow-hidden mt-1">
                  <div className="h-full bg-sky-400" style={{ width: `${Math.round(agent.energy)}%` }} />
                </div>
              </div>
            </div>
            {agent.isSick && agent.illness && (
              <div className="text-[13px] text-rose-300 font-medium" data-testid="inspector-disease">
                {agent.illness.name} · Peligro {agent.illness.dangerPct}%
                {agent.illness.incurable ? ' · INCURABLE' : ''}
              </div>
            )}
          </div>

          <div
            className="grid grid-cols-2 gap-1.5 bg-[#0b1120] border border-slate-800 rounded-lg p-1.5"
            role="tablist"
            aria-label="Pestañas del aldeano"
          >
            {(
              [
                { id: 'general', label: 'General', testId: 'inspector-tab-general' },
                { id: 'mind', label: 'Saber / Mente', testId: 'inspector-tab-mind' },
                { id: 'inventory', label: 'Inventario', testId: 'inspector-tab-inventory' },
                { id: 'options', label: 'Opciones', testId: 'inspector-tab-options' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={agentTab === t.id}
                data-testid={t.testId}
                onClick={() => setAgentTab(t.id)}
                className={`py-2 px-2 rounded-md text-[13px] font-semibold transition-colors ${
                  agentTab === t.id ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {agentTab === 'general' && (
            <div className="flex flex-col gap-2.5 text-[13px]">
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="text-slate-400">Vivienda</span>
                  <span className={agentHouse ? 'text-slate-100 font-medium' : 'text-rose-300 font-medium'}>
                    {agentHouse
                      ? `${agentHouse.name} (${HOUSE_LEVEL_LABELS[agentHouse.level]})`
                      : 'Sin casa'}
                  </span>
                </div>
                {agentHouse && (
                  <div className="flex flex-col gap-1.5 text-[13px] pt-2 border-t border-slate-800/70">
                    <span className="font-mono text-slate-200" data-testid="house-storage-summary">
                      Baúl: {agentHouse.storage.food} Alim. · {agentHouse.storage.coins} Mon.
                    </span>
                    <button
                      type="button"
                      onClick={() => onStoreInHouse(agent.id)}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold self-start underline underline-offset-2"
                    >
                      Guardar excedentes
                    </button>
                  </div>
                )}
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="text-slate-400">Pareja / Hijos</span>
                  <span>
                    {partnerName ?? 'Soltero/a'} · {agent.childrenCount} hijo(s)
                  </span>
                </div>
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="text-slate-400">Gestación / Fertilidad</span>
                  <span data-testid="inspector-fertility">
                    {agent.pregnancy
                      ? `Embarazo (${3 - agent.pregnancy.daysRemaining}/3d)`
                      : agent.isSterile
                        ? 'Impotente'
                        : agent.wantsChildren
                          ? 'Fértil (desea hijos)'
                          : 'Fértil (no desea)'}
                  </span>
                </div>
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="text-slate-400">Linaje{mentorName ? ' / Mentor' : ''}</span>
                  <span>
                    {lineageSurname ? `${lineageSurname} · ` : ''}
                    {agent.parents ?? 'Fundador'}
                    {mentorName ? ` · Mentor: ${mentorName}` : ''}
                  </span>
                </div>
              </div>

              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
                <div className="text-[13px] text-slate-200 leading-snug">
                  Plan: <strong className="text-emerald-300">{agent.qwenPlan}</strong>
                </div>
                <p className="text-[14px] text-slate-100 italic leading-relaxed" data-testid="inspector-thought">
                  &quot;{agent.thought}&quot;
                </p>
                {agent.lastQwenDecision && (
                  <div
                    className="pt-2 border-t border-slate-800 text-[13px] text-emerald-300 leading-snug"
                    data-testid="inspector-qwen-decision"
                  >
                    IA: {agent.lastQwenDecision}
                  </div>
                )}
                {agent.lastDialogue && (
                  <div className="pt-2 border-t border-slate-800 text-[13px] text-sky-300 leading-snug">
                    Diálogo: {agent.lastDialogue}
                  </div>
                )}
              </div>
            </div>
          )}

          {agentTab === 'mind' && (
            <div className="flex flex-col gap-2.5 text-[13px]">
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-slate-200 font-semibold">
                    Saber General ({unlockedIds.size}/25)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isObserver}
                      aria-label="Quitar saber general"
                      data-testid="sub-agent-knowledge-btn"
                      onClick={() => onModifyKnowledge(agent.id, -10)}
                      className="w-7 h-7 rounded-md bg-slate-800 hover:bg-rose-900/70 disabled:opacity-40 text-slate-100 font-mono text-[14px] flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="font-mono text-sky-300 font-bold" data-testid="inspector-education">
                      {educationPct}%
                    </span>
                    <button
                      type="button"
                      disabled={isObserver}
                      aria-label="Agregar saber general"
                      data-testid="add-agent-knowledge-btn"
                      onClick={() => onModifyKnowledge(agent.id, 10)}
                      className="w-7 h-7 rounded-md bg-slate-800 hover:bg-sky-700/80 disabled:opacity-40 text-slate-100 font-mono text-[14px] flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="h-2.5 w-full bg-[#111827] rounded-full overflow-hidden">
                  <div className="h-full bg-sky-400" style={{ width: `${educationPct}%` }} />
                </div>
                <div className="flex flex-col gap-1.5 pt-1 text-[13px]">
                  <span className="text-slate-300" data-testid="skills-summary">
                    Carpintería {Math.round(agent.carpentryKnowledge)}% · Construcción {Math.round(agent.constructionKnowledge)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAllSkills((v) => !v)}
                    data-testid="toggle-skills-list"
                    className="text-sky-400 hover:text-sky-300 font-semibold self-start underline underline-offset-2"
                  >
                    {showAllSkills ? 'Ocultar 25 skills' : 'Ver 25 skills'}
                  </button>
                </div>
                {showAllSkills && (
                  <div className="max-h-56 overflow-y-auto flex flex-col gap-1.5 pt-1.5" data-testid="skills-list">
                    {VILLAGE_SKILLS.map((sk) => {
                      const active = unlockedIds.has(sk.id);
                      return (
                        <div
                          key={sk.id}
                          className={`px-2.5 py-1.5 rounded-md border text-[13px] flex justify-between gap-2 ${
                            active
                              ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-200'
                              : 'bg-[#111827] border-slate-800 text-slate-400'
                          }`}
                        >
                          <span>{sk.name}</span>
                          <span className="font-mono shrink-0">{sk.minKnowledgePct}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div
                className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-2"
                data-testid="job-mastery-box"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap text-[13px]">
                  <span className="text-slate-200 font-semibold">
                    Maestrías ({maestroCount}/{MAX_MAESTRO_JOBS_PER_AGENT})
                  </span>
                  <div className="flex flex-wrap gap-1.5" data-testid="agent-traits-box">
                    {traits.map((t) => (
                      <span
                        key={t}
                        className="px-2 py-0.5 rounded bg-violet-950/50 border border-violet-700/50 text-[12px] text-violet-200"
                      >
                        {PERSONALITY_LABELS[t]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {trainedJobs.length === 0 ? (
                    <span className="text-[13px] text-slate-300">
                      {agent.job}: {currentJobMastery}% ({currentJobTier})
                    </span>
                  ) : (
                    trainedJobs.slice(0, 4).map(([jName, pct]) => (
                      <span
                        key={jName}
                        className={`px-2.5 py-1 rounded border text-[12px] font-mono ${
                          pct > 70
                            ? 'bg-amber-950/50 border-amber-700/70 text-amber-200'
                            : 'bg-slate-900 border-slate-800 text-slate-200'
                        }`}
                      >
                        {jName} {Math.round(pct)}%
                      </span>
                    ))
                  )}
                </div>
                {knownDiscoveryNames.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-1.5">
                    {knownDiscoveryNames.slice(0, 5).map((dName) => (
                      <span
                        key={dName}
                        className="px-2 py-0.5 rounded bg-emerald-950/50 border border-emerald-700/50 text-[11px] text-emerald-200"
                      >
                        {dName}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-2"
                data-testid="agent-memories-box"
              >
                <div className="text-[13px] font-semibold text-slate-200">
                  Memoria Individual ({memories.length}/20)
                </div>
                {memories.length === 0 ? (
                  <div className="text-[13px] text-slate-400 italic">Sin recuerdos significativos aún.</div>
                ) : (
                  <div className="max-h-48 overflow-y-auto flex flex-col gap-2 pr-1">
                    {memories.slice(0, 6).map((m) => (
                      <div key={m.id} className="text-[13px] flex gap-2 leading-snug">
                        <span
                          className={`font-mono font-semibold shrink-0 ${
                            m.impact === 'positive'
                              ? 'text-emerald-400'
                              : m.impact === 'negative'
                                ? 'text-rose-400'
                                : 'text-slate-400'
                          }`}
                        >
                          D{m.day}
                        </span>
                        <span className="text-slate-200">{m.summary}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {agentTab === 'inventory' && (
            <div className="flex flex-col gap-2.5 text-[13px]" data-testid="agent-inventory-5cats">
              {/* 1. Raciones */}
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-slate-100 font-semibold">Raciones (Comida)</div>
                  <div className="text-[12px] text-slate-400 leading-snug">
                    Nat {agent.inv.food} · Pan {agent.breadCount} · Leche {agent.milkCount}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={isObserver}
                    aria-label="Quitar Raciones"
                    onClick={() => onModifyResource(agent.id, 'food', -1)}
                    className="w-7 h-7 rounded-md bg-slate-800 hover:bg-rose-900/70 disabled:opacity-40 text-slate-100 font-mono text-[14px]"
                  >
                    -
                  </button>
                  <span className="min-w-8 text-center font-mono font-bold text-slate-50" data-testid="inv-food">
                    {totalRations}
                  </span>
                  <button
                    type="button"
                    disabled={isObserver}
                    aria-label="Agregar Raciones"
                    onClick={() => onModifyResource(agent.id, 'food', 1)}
                    className="w-7 h-7 rounded-md bg-slate-800 hover:bg-emerald-800/70 disabled:opacity-40 text-slate-100 font-mono text-[14px]"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 2. Maderas */}
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-slate-100 font-semibold">Maderas</div>
                  <div className="text-[12px] text-slate-400 leading-snug">{woodBreakdownParts.join(' · ')}</div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={isObserver}
                    aria-label="Quitar Maderas"
                    onClick={() => onModifyResource(agent.id, 'wood', -1)}
                    className="w-7 h-7 rounded-md bg-slate-800 hover:bg-rose-900/70 disabled:opacity-40 text-slate-100 font-mono text-[14px]"
                  >
                    -
                  </button>
                  <span className="min-w-8 text-center font-mono font-bold text-slate-50" data-testid="inv-wood">
                    {totalWoods}
                  </span>
                  <button
                    type="button"
                    disabled={isObserver}
                    aria-label="Agregar Maderas"
                    onClick={() => onModifyResource(agent.id, 'wood', 1)}
                    className="w-7 h-7 rounded-md bg-slate-800 hover:bg-emerald-800/70 disabled:opacity-40 text-slate-100 font-mono text-[14px]"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 3. Piedra */}
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-2">
                <div className="text-slate-100 font-semibold">Piedra</div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={isObserver}
                    aria-label="Quitar Piedra"
                    onClick={() => onModifyResource(agent.id, 'stone', -1)}
                    className="w-7 h-7 rounded-md bg-slate-800 hover:bg-rose-900/70 disabled:opacity-40 text-slate-100 font-mono text-[14px]"
                  >
                    -
                  </button>
                  <span className="min-w-8 text-center font-mono font-bold text-slate-50" data-testid="inv-stone">
                    {agent.inv.stone}
                  </span>
                  <button
                    type="button"
                    disabled={isObserver}
                    aria-label="Agregar Piedra"
                    onClick={() => onModifyResource(agent.id, 'stone', 1)}
                    className="w-7 h-7 rounded-md bg-slate-800 hover:bg-emerald-800/70 disabled:opacity-40 text-slate-100 font-mono text-[14px]"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 4. Minerales */}
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-slate-100 font-semibold">Minerales</div>
                    <div className="text-[12px] text-slate-400 leading-snug">
                      {mineralBreakdownParts.length > 0 ? mineralBreakdownParts.join(' · ') : 'Requiere saber minero'}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-50 text-[14px]" data-testid="inv-minerals">
                    {totalMinerals}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <select
                    aria-label="Tipo de mineral"
                    value={selectedMineralKey}
                    onChange={(e) => setSelectedMineralKey(e.target.value as 'copper' | 'iron' | 'silver' | 'gold')}
                    className="flex-1 bg-[#111827] border border-slate-700 rounded-md px-2.5 py-1.5 text-[13px] text-slate-100"
                  >
                    <option value="copper">Cobre</option>
                    <option value="iron">Hierro</option>
                    <option value="silver">Plata 🥈</option>
                    <option value="gold">Oro 🥇</option>
                  </select>
                  <button
                    type="button"
                    disabled={isObserver}
                    aria-label="Quitar Mineral"
                    onClick={() => onModifyResource(agent.id, selectedMineralKey, -1)}
                    className="w-7 h-7 rounded-md bg-slate-800 hover:bg-rose-900/70 disabled:opacity-40 text-slate-100 font-mono text-[14px]"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    disabled={isObserver}
                    aria-label="Agregar Mineral"
                    onClick={() => onModifyResource(agent.id, selectedMineralKey, 1)}
                    className="w-7 h-7 rounded-md bg-slate-800 hover:bg-emerald-800/70 disabled:opacity-40 text-slate-100 font-mono text-[14px]"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 5. Monedas */}
              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-amber-300 font-semibold">Monedas</div>
                  <div className="text-[12px] text-slate-400">
                    {agent.loanDebt > 0 ? `Deuda: ${agent.loanDebt}m` : 'Respaldadas Oro/Plata'}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={isObserver}
                    aria-label="Quitar Monedas"
                    onClick={() => onModifyResource(agent.id, 'coins', -1)}
                    className="w-7 h-7 rounded-md bg-slate-800 hover:bg-rose-900/70 disabled:opacity-40 text-slate-100 font-mono text-[14px]"
                  >
                    -
                  </button>
                  <span className="min-w-8 text-center font-mono font-bold text-amber-300" data-testid="inv-coins">
                    {agent.coins}
                  </span>
                  <button
                    type="button"
                    disabled={isObserver}
                    aria-label="Agregar Monedas"
                    onClick={() => onModifyResource(agent.id, 'coins', 1)}
                    className="w-7 h-7 rounded-md bg-slate-800 hover:bg-emerald-800/70 disabled:opacity-40 text-slate-100 font-mono text-[14px]"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 text-[13px] text-slate-200 font-mono flex flex-col gap-2">
                <span>
                  Herramientas: {agent.toolsCount} · Medicinas: {agent.medicineCount}
                </span>
                <button
                  type="button"
                  disabled={educationPct < 36 || isObserver}
                  onClick={() => onCraftTools(agent.id)}
                  className="w-full px-3 py-2 rounded-lg bg-amber-900/50 hover:bg-amber-800/70 disabled:opacity-40 border border-amber-700/60 text-amber-200 text-[13px] font-sans font-semibold"
                >
                  Forjar herramienta (36%+ Saber · 1C + 1H)
                </button>
              </div>

              {agent.activeConstruction && (
                <div
                  className="bg-amber-950/30 border border-amber-700/50 rounded-lg p-3 text-[13px] flex items-center justify-between text-amber-200"
                  data-testid="agent-active-construction"
                >
                  <span>Obra: {agent.activeConstruction.kind}</span>
                  <span className="font-mono font-bold">
                    {Math.min(
                      100,
                      Math.round(
                        (agent.activeConstruction.elapsed /
                          Math.max(1, agent.activeConstruction.totalDuration)) *
                          100
                      )
                    )}
                    %
                  </span>
                </div>
              )}
            </div>
          )}

          {agentTab === 'options' && (
            <div className="flex flex-col gap-2.5 text-[13px]">
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  disabled={isObserver}
                  onClick={() => onCure(agent.id)}
                  className="py-2 px-3 rounded-lg bg-emerald-950/70 border border-emerald-700/60 hover:bg-emerald-900/70 disabled:opacity-40 text-emerald-200 font-semibold text-left"
                >
                  Curar aldeano
                </button>
                <button
                  type="button"
                  disabled={isObserver}
                  onClick={() => onInfect(agent.id)}
                  className="py-2 px-3 rounded-lg bg-amber-950/60 border border-amber-700/60 hover:bg-amber-900/70 disabled:opacity-40 text-amber-200 font-semibold text-left"
                >
                  Enfermar aldeano
                </button>
                <button
                  type="button"
                  disabled={isObserver}
                  onClick={() => onToggleSterile(agent.id)}
                  className="py-2 px-3 rounded-lg bg-[#0b1120] border border-slate-700 hover:border-violet-500 disabled:opacity-40 text-slate-100 font-semibold text-left"
                >
                  {agent.isSterile ? 'Restaurar fertilidad' : 'Hacer impotente'}
                </button>
                <button
                  type="button"
                  disabled={isObserver}
                  onClick={() => onKill(agent.id)}
                  data-testid="inspector-delete-btn"
                  className="py-2 px-3 rounded-lg bg-rose-950/70 border border-rose-700/60 hover:bg-rose-900/70 disabled:opacity-40 text-rose-200 font-semibold text-left"
                >
                  Matar aldeano
                </button>
                <button
                  type="button"
                  disabled={isObserver}
                  onClick={() => onSwitchPartner(agent.id)}
                  className="py-2 px-3 rounded-lg bg-[#0b1120] border border-slate-700 hover:border-pink-500 disabled:opacity-40 text-pink-200 font-semibold text-left"
                >
                  {agent.partnerId ? 'Cambiar pareja' : 'Buscar pareja'}
                </button>
                <button
                  type="button"
                  disabled={isObserver}
                  onClick={() => onModifyKnowledge(agent.id, 15)}
                  data-testid="btn-add-individual-knowledge"
                  className="py-2 px-3 rounded-lg bg-sky-950/70 border border-sky-700/60 hover:bg-sky-900/70 disabled:opacity-40 text-sky-200 font-semibold text-left"
                >
                  +15 Saber General
                </button>
                <button
                  type="button"
                  onClick={() => onHighlightFamily(isFamilyHighlighted ? null : agent.id)}
                  className={`py-2 px-3 rounded-lg border font-semibold text-left ${
                    isFamilyHighlighted
                      ? 'bg-sky-950/70 border-sky-500 text-sky-200'
                      : 'bg-[#0b1120] border-slate-700 hover:border-sky-500 text-slate-100'
                  }`}
                >
                  {isFamilyHighlighted ? 'Ocultar familia en mapa' : 'Resaltar familia en mapa'}
                </button>
              </div>

              {isAdvanced && onDivineChangeAge && onDivineChangeJob && (
                <div className="bg-[#0b1120] border border-violet-800/50 rounded-lg p-3 flex flex-col gap-2.5 text-[13px]">
                  <div className="text-violet-300 font-semibold">Edición Divina Avanzada</div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-300">Edad ({agent.ageYears}a)</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => onDivineChangeAge(agent.id, -5)}
                        className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-mono text-[13px]"
                      >
                        -5a
                      </button>
                      <button
                        type="button"
                        onClick={() => onDivineChangeAge(agent.id, 5)}
                        className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 font-mono text-[13px]"
                      >
                        +5a
                      </button>
                    </div>
                  </div>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-slate-300">Oficio directo</span>
                    <select
                      value={agent.job}
                      onChange={(e) => onDivineChangeJob(agent.id, e.target.value as JobType)}
                      className="bg-[#111827] border border-slate-700 rounded-md px-2.5 py-2 text-[13px] text-slate-100"
                    >
                      {ALL_JOBS.map((j) => (
                        <option key={j} value={j}>
                          {j}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

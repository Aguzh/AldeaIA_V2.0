import { useState } from 'react';
import type {
  Agent,
  Animal,
  FamilyLineage,
  HistoricalFigure,
  House,
  InterventionMode,
} from '../types/simulation';
import { ANIMAL_LABELS, HOUSE_LEVEL_LABELS, HOUSE_SIZE_LABELS } from '../simulation/rules';

interface FamiliasModalProps {
  agents: Agent[];
  houses: House[];
  animals: Animal[];
  familyLineages?: FamilyLineage[];
  historicalFigures?: HistoricalFigure[];
  interventionMode?: InterventionMode;
  highlightedAgentId: number | null;
  onHighlightFamily: (agentId: number | null) => void;
  onSelectAgent: (agentId: number) => void;
  onDivineAidFamily?: (familyId: string) => void;
  onClose: () => void;
}

type FamiliesTab = 'families' | 'lineages' | 'figures' | 'fauna';

const TIER_STYLES: Record<FamilyLineage['influenceTier'], string> = {
  emergente: 'border-slate-700 bg-slate-800 text-slate-300',
  consolidada: 'border-sky-700/70 bg-sky-950/60 text-sky-200',
  influyente: 'border-amber-700/70 bg-amber-950/60 text-amber-200',
  histórica: 'border-violet-600/80 bg-violet-950/70 text-violet-200',
};

export function FamiliasModal({
  agents,
  houses,
  animals,
  familyLineages = [],
  historicalFigures = [],
  interventionMode = 'intervention',
  highlightedAgentId,
  onHighlightFamily,
  onSelectAgent,
  onDivineAidFamily,
  onClose,
}: FamiliasModalProps) {
  const [tab, setTab] = useState<FamiliesTab>('families');
  const isObserver = interventionMode === 'observer';

  const couples: Array<{ a: Agent; b: Agent }> = [];
  const seen = new Set<number>();
  for (const a of agents) {
    if (a.partnerId !== null && !seen.has(a.id)) {
      const b = agents.find((other) => other.id === a.partnerId);
      if (b) {
        seen.add(a.id);
        seen.add(b.id);
        couples.push({ a, b });
      }
    }
  }

  const animalCounts = animals.reduce<Record<string, number>>((acc, an) => {
    acc[an.type] = (acc[an.type] ?? 0) + 1;
    return acc;
  }, {});

  const sortedLineages = [...familyLineages].sort((a, b) => b.influenceScore - a.influenceScore);

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="families-modal-title"
      data-testid="families-modal"
    >
      <div className="bg-[#111827] border border-slate-700 rounded-xl w-full max-w-4xl max-h-[88vh] flex flex-col p-5 gap-4 shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 id="families-modal-title" className="text-base font-bold text-slate-50">
              Familias, Linajes y Ecosistema
            </h2>
            <p className="text-xs text-slate-400">
              Parejas desde los 15 años, herencia parcial de saber por generación, linajes e historial de figuras destacadas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {highlightedAgentId !== null && (
              <button
                type="button"
                onClick={() => onHighlightFamily(null)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-sky-700 bg-sky-950/60 text-sky-200 hover:bg-sky-900/70 whitespace-nowrap"
              >
                Quitar resaltado
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 whitespace-nowrap"
            >
              Cerrar
            </button>
          </div>
        </div>

        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#0b1120] border border-slate-800 rounded-lg p-1.5 shrink-0"
          role="tablist"
          aria-label="Pestañas de familias y linajes"
        >
          {(
            [
              { id: 'families', label: `Familias Vivas (${couples.length})`, testId: 'families-tab-living' },
              { id: 'lineages', label: `Linajes (${sortedLineages.length})`, testId: 'families-tab-lineages' },
              { id: 'figures', label: `Figuras (${historicalFigures.length})`, testId: 'families-tab-figures' },
              { id: 'fauna', label: `Fauna (${animals.length})`, testId: 'families-tab-fauna' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              data-testid={t.testId}
              onClick={() => setTab(t.id)}
              className={`py-2 px-2 rounded-md text-xs font-semibold transition-colors ${
                tab === t.id ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex flex-col gap-4 pr-1">
          {tab === 'families' && (
            <>
              <section>
                <h3 className="text-xs font-semibold tracking-wide text-slate-400 mb-2">
                  Viviendas Familiares ({houses.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {houses.map((h) => {
                    const occupants = agents.filter((a) => a.houseId === h.id);
                    return (
                      <div key={h.id} className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 text-xs flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <strong className="text-slate-100">
                            {h.name} · {HOUSE_SIZE_LABELS[h.size ?? 'medium']} · {HOUSE_LEVEL_LABELS[h.level]}
                          </strong>
                          <span className="text-slate-400 font-mono tabular-nums">
                            {h.zone === 'north' ? 'Zona Norte' : 'Zona Sur'} · {occupants.length}/{h.capacity}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-mono tabular-nums">
                          Alimento {h.storage.food} · Monedas {h.storage.coins} · Durabilidad {Math.round(h.durability ?? 100)}%
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Residentes: {occupants.length > 0 ? occupants.map((o) => `${o.name} (${o.ageYears}a)`).join(', ') : 'Disponible'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-semibold tracking-wide text-slate-400 mb-2">
                  Parejas Activas ({couples.length})
                </h3>
                {couples.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Todavía no hay parejas conformadas; se formarán desde los 15 años al interactuar en la plaza o viviendas.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {couples.map(({ a, b }) => {
                      const canHaveKids = a.sex !== b.sex && a.wantsChildren && b.wantsChildren;
                      const pregnantPartner = a.pregnancy ? a : b.pregnancy ? b : null;
                      const isHighlighted = highlightedAgentId === a.id || highlightedAgentId === b.id;
                      return (
                        <div
                          key={`${a.id}-${b.id}`}
                          className={`bg-[#0b1120] border rounded-lg p-2.5 text-xs flex items-center justify-between gap-2 ${
                            isHighlighted ? 'border-pink-500' : 'border-slate-800'
                          }`}
                        >
                          <div>
                            <div className="font-semibold text-slate-100">
                              {a.name} ({a.sex}, {a.ageYears}a) + {b.name} ({b.sex}, {b.ageYears}a)
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {pregnantPartner?.pregnancy
                                ? `Embarazo en curso (faltan ${pregnantPartner.pregnancy.daysRemaining} día(s))`
                                : a.sex !== b.sex
                                  ? canHaveKids
                                    ? 'Pareja abierta a formar familia (20+ años)'
                                    : 'Pareja sin hijos por libre albedrío'
                                  : 'Pareja compañera (sin hijos biológicos)'}{' '}
                              · {a.childrenCount + b.childrenCount} hijos
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              onHighlightFamily(a.id);
                              onSelectAgent(a.id);
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-pink-900/60 text-slate-200 text-[11px] whitespace-nowrap shrink-0"
                          >
                            Ver en mapa
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}

          {tab === 'lineages' && (
            <section className="flex flex-col gap-2.5">
              {sortedLineages.length === 0 ? (
                <p className="text-xs text-slate-400">Los linajes se están consolidando.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {sortedLineages.map((lin) => {
                    const firstLivingId = lin.livingMemberIds[0] ?? null;
                    return (
                      <div key={lin.id} className="bg-[#0b1120] border border-slate-800 rounded-lg p-3 text-xs flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="text-slate-100">Linaje {lin.surname}</strong>
                          <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold capitalize ${TIER_STYLES[lin.influenceTier]}`}>
                            {lin.influenceTier} · {lin.influenceScore}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-mono">
                          Gen. {lin.currentGeneration} · Vivos: {lin.livingMemberIds.length} · Descendientes: {lin.totalDescendants} · {lin.totalCoins}m
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Oficios: {lin.predominantJobs.join(', ') || 'Fundadores'}
                        </div>
                        {lin.notableEvents.length > 0 && (
                          <div className="text-[11px] text-slate-400 leading-snug">
                            {lin.notableEvents[0]}
                          </div>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          {firstLivingId !== null && (
                            <button
                              type="button"
                              onClick={() => {
                                onHighlightFamily(firstLivingId);
                                onSelectAgent(firstLivingId);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-sky-900/60 text-slate-200 text-[11px]"
                            >
                              Ver miembro
                            </button>
                          )}
                          {onDivineAidFamily && !isObserver && (
                            <button
                              type="button"
                              onClick={() => onDivineAidFamily(lin.id)}
                              className="px-2.5 py-1 rounded bg-violet-900/70 hover:bg-violet-800 border border-violet-700/60 text-violet-200 text-[11px]"
                            >
                              Bendecir linaje
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {tab === 'figures' && (
            <section className="flex flex-col gap-2">
              {historicalFigures.length === 0 ? (
                <p className="text-xs text-slate-400 bg-[#0b1120] border border-slate-800 rounded-lg p-3">
                  Aún no hay figuras históricas consagradas; surgirán al lograr maestría superior (&gt;70%), autoría de descubrimientos o liderazgo cívico.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {historicalFigures.map((fig) => (
                    <div key={fig.id} className="bg-[#0b1120] border border-violet-800/50 rounded-lg p-3 text-xs flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-violet-200">{fig.name}</strong>
                        <span className="font-mono text-[11px] text-slate-400">
                          Gen. {fig.generation} · {fig.deathDay ? `D${fig.birthDay}–D${fig.deathDay}` : `Desde D${fig.birthDay}`}
                        </span>
                      </div>
                      <div className="text-emerald-300 font-semibold">{fig.roleTitle} ({fig.job})</div>
                      <div className="text-slate-300">{fig.reason}</div>
                      {fig.achievements.length > 1 && (
                        <div className="text-[11px] text-slate-400">Hitos: {fig.achievements.join(' · ')}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {tab === 'fauna' && (
            <section>
              <h3 className="text-xs font-semibold tracking-wide text-slate-400 mb-2">
                Fauna en el Mapa ({animals.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {(Object.keys(ANIMAL_LABELS) as Array<keyof typeof ANIMAL_LABELS>).map((type) => (
                  <div
                    key={type}
                    className="bg-[#0b1120] border border-slate-800 rounded-lg px-2.5 py-2 flex items-center justify-between"
                  >
                    <span className="text-slate-300 truncate">{ANIMAL_LABELS[type]}</span>
                    <strong className="font-mono tabular-nums text-slate-100 ml-2">
                      {animalCounts[type] ?? 0}
                    </strong>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}


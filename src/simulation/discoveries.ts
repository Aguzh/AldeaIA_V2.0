import type {
  Agent,
  DiscoveryCategory,
  DiscoveryRecord,
  EraId,
  JobType,
  SimulationState,
  SpecialBuildingType,
} from '../types/simulation';
import { addLog, clamp, isBuildingOperational, pushSoundCue } from './rules';
import {
  recordAgentMemory,
  trackDivineIntervention,
  trackNaturalProgress,
} from './civilizationSystems';
import { emitSimEvent } from './eventBus';
import { recordCategorizedChronicle } from './historyAndChronicle';
import { recordHistoricalFigure } from './cultureAndFamilies';

export interface DiscoveryBlueprint {
  id: string;
  name: string;
  era: EraId;
  category: DiscoveryCategory;
  description: string;
  requirementsSummary: string;
  benefitsSummary: string;
  costTradeoffSummary: string;
  requiredJobs: JobType[];
  minEducation: number;
  minJobMastery: number;
  requiredBuilding?: SpecialBuildingType;
  minFarms?: number;
  minHouses?: number;
  minRoadCount?: number;
  requiresVillageKnowledge: number;
}

export const DISCOVERY_CATALOG: DiscoveryBlueprint[] = [
  {
    id: 'rotacion_cultivos',
    name: 'Rotación de Cultivos',
    era: 'primitive',
    category: 'agricultura',
    description: 'Alternancia estacional de trigo, maíz y legumbres para preservar la fertilidad.',
    requirementsSummary: 'Agricultor con ≥15% saber y al menos 1 parcela activa.',
    benefitsSummary: '+18% rendimiento agrícola y mayor resistencia a plagas.',
    costTradeoffSummary: 'Exige más horas de trabajo agrícola por ciclo.',
    requiredJobs: ['Agricultor', 'Recolector'],
    minEducation: 12,
    minJobMastery: 8,
    minFarms: 1,
    requiresVillageKnowledge: 14,
  },
  {
    id: 'conservacion_sal',
    name: 'Conservación de Alimentos',
    era: 'stone',
    category: 'agricultura',
    description: 'Secado y almacenamiento en depósitos frescos para superar el invierno.',
    requirementsSummary: 'Saber ≥20%, al menos 2 casas y Depósito o Panadería.',
    benefitsSummary: 'Reduce pérdidas alimentarias y mejora reservas de crisis.',
    costTradeoffSummary: 'Requiere madera para ahumado y mantenimiento del depósito.',
    requiredJobs: ['Almacenero', 'Panadero', 'Recolector'],
    minEducation: 18,
    minJobMastery: 12,
    minHouses: 2,
    requiresVillageKnowledge: 24,
  },
  {
    id: 'mamposteria_reforzada',
    name: 'Mampostería Reforzada',
    era: 'stone',
    category: 'ingenieria',
    description: 'Encaje de piedra tallada con mortero para cimientos más durables.',
    requirementsSummary: 'Constructor con ≥22% saber y ≥2 viviendas construidas.',
    benefitsSummary: '-20% deterioro estructural ante lluvias e inundaciones.',
    costTradeoffSummary: 'Consume mayor proporción de piedra en obras superiores.',
    requiredJobs: ['Constructor'],
    minEducation: 22,
    minJobMastery: 15,
    minHouses: 2,
    requiresVillageKnowledge: 30,
  },
  {
    id: 'medicina_herbal',
    name: 'Farmacopea Herbal',
    era: 'stone',
    category: 'medicina',
    description: 'Sistematización de infusiones y ungüentos locales contra infecciones.',
    requirementsSummary: 'Curandero o Boticario con ≥28% saber.',
    benefitsSummary: '+22% eficacia curativa y menor mortalidad epidémica.',
    costTradeoffSummary: 'Exige recolección constante de hierbas/comida para insumos.',
    requiredJobs: ['Curandero', 'Boticario'],
    minEducation: 28,
    minJobMastery: 15,
    requiresVillageKnowledge: 38,
  },
  {
    id: 'riego_fluvial',
    name: 'Acequias de Riego Fluvial',
    era: 'wood',
    category: 'agricultura',
    description: 'Canales simples que llevan humedad del río hacia las parcelas.',
    requirementsSummary: 'Agricultor o Constructor con ≥36% saber y ≥2 cultivos.',
    benefitsSummary: 'Mitiga hasta 45% el impacto de sequías sobre cultivos.',
    costTradeoffSummary: 'Requiere mantenimiento regular de canales y caminos.',
    requiredJobs: ['Agricultor', 'Constructor'],
    minEducation: 36,
    minJobMastery: 22,
    minFarms: 2,
    requiresVillageKnowledge: 65,
  },
  {
    id: 'gremios_artesanales',
    name: 'Gremios de Oficio',
    era: 'wood',
    category: 'oficio',
    description: 'Estándares de aprendizaje entre maestros, comerciantes y operarios.',
    requirementsSummary: 'Carpintería o Herrería operativa y saber ≥42%.',
    benefitsSummary: '+20% transmisión de maestría a aprendices.',
    costTradeoffSummary: 'Mayores exigencias de calidad y herramientas.',
    requiredJobs: ['Carpintero', 'Artesano', 'Herrero'],
    minEducation: 42,
    minJobMastery: 25,
    requiredBuilding: 'carpentry',
    requiresVillageKnowledge: 85,
  },
  {
    id: 'banca_contable',
    name: 'Contabilidad y Crédito Metálico',
    era: 'wood',
    category: 'economia',
    description: 'Libros de respaldo oro/plata y control de inflación de mercado.',
    requirementsSummary: 'Banco operativo o Comerciante/Banquero con ≥50% saber.',
    benefitsSummary: 'Estabiliza precios en crisis y habilita acuerdos comerciales.',
    costTradeoffSummary: 'Demanda respaldo metálico real para ampliar crédito.',
    requiredJobs: ['Banquero', 'Comerciante'],
    minEducation: 50,
    minJobMastery: 28,
    requiredBuilding: 'bank',
    requiresVillageKnowledge: 105,
  },
  {
    id: 'acero_forjado',
    name: 'Temple y Forja Avanzada',
    era: 'iron',
    category: 'oficio',
    description: 'Aleación y templado de herramientas resistentes de larga vida útil.',
    requirementsSummary: 'Herrería operativa y Herrero con ≥58% saber.',
    benefitsSummary: '+25% durabilidad de herramientas y +15% minería/tala.',
    costTradeoffSummary: 'Mayor consumo de hierro y carbón/madera.',
    requiredJobs: ['Herrero'],
    minEducation: 58,
    minJobMastery: 35,
    requiredBuilding: 'forge',
    requiresVillageKnowledge: 145,
  },
  {
    id: 'prevencion_incendios',
    name: 'Brigadas y Cortafuegos',
    era: 'iron',
    category: 'ingenieria',
    description: 'Depósitos de agua y protocolos rápidos ante tormentas eléctricas.',
    requirementsSummary: 'Guardián o Comisario con ≥62% saber.',
    benefitsSummary: '+40% rapidez para extinguir incendios y menor daño.',
    costTradeoffSummary: 'Requiere patrullaje activo y equipo de herramientas.',
    requiredJobs: ['Guardián', 'Comisario', 'Constructor'],
    minEducation: 62,
    minJobMastery: 30,
    requiresVillageKnowledge: 170,
  },
  {
    id: 'saneamiento_urbano',
    name: 'Higiene y Drenaje Vial',
    era: 'iron',
    category: 'medicina',
    description: 'Caminos drenados y manejo de aguas que frenan contagios.',
    requirementsSummary: 'Hospital operativo, ≥8 tramos de camino y saber ≥68%.',
    benefitsSummary: '-35% riesgo de brotes epidémicos y mayor salud pública.',
    costTradeoffSummary: 'Costo adicional de piedra y limpieza urbana.',
    requiredJobs: ['Curandero', 'Boticario', 'Alcalde'],
    minEducation: 68,
    minJobMastery: 35,
    requiredBuilding: 'infirmary',
    minRoadCount: 6,
    requiresVillageKnowledge: 195,
  },
  {
    id: 'educacion_publica',
    name: 'Pedagogía Comunitaria',
    era: 'iron',
    category: 'sociedad',
    description: 'Plan de estudio compartido que acelera la difusión de descubrimientos.',
    requirementsSummary: 'Escuela operativa y Maestro/Erudito con ≥72% saber.',
    benefitsSummary: 'Duplica la difusión de descubrimientos entre jóvenes.',
    costTradeoffSummary: 'Requiere asignación estable de docentes.',
    requiredJobs: ['Maestro', 'Erudito'],
    minEducation: 72,
    minJobMastery: 40,
    requiredBuilding: 'school',
    requiresVillageKnowledge: 220,
  },
  {
    id: 'caravanas_organizadas',
    name: 'Logística de Rutas Externas',
    era: 'civilization',
    category: 'economia',
    description: 'Convoyes planificados para comercio seguro con comunidades vecinas.',
    requirementsSummary: 'Mercado operativo y Comerciante con ≥78% saber.',
    benefitsSummary: '+20% volumen y confianza en comercio exterior.',
    costTradeoffSummary: 'Exige provisiones de viaje y caballos/escolta.',
    requiredJobs: ['Comerciante'],
    minEducation: 78,
    minJobMastery: 45,
    requiredBuilding: 'market',
    requiresVillageKnowledge: 260,
  },
  {
    id: 'ingenieria_hidraulica',
    name: 'Obras Hidráulicas y Diques',
    era: 'civilization',
    category: 'ingenieria',
    description: 'Compuertas ribereñas que protegen puentes, caminos y cultivos.',
    requirementsSummary: 'Puente construido y Constructor/Erudito con ≥84% saber.',
    benefitsSummary: 'Reduce hasta 60% daños por inundaciones.',
    costTradeoffSummary: 'Requiere mantenimiento periódico de piedra e hierro.',
    requiredJobs: ['Constructor', 'Erudito'],
    minEducation: 84,
    minJobMastery: 50,
    requiresVillageKnowledge: 295,
  },
  {
    id: 'carta_civica',
    name: 'Carta Cívica y Derechos Vecinales',
    era: 'civilization',
    category: 'sociedad',
    description: 'Normas institucionales transparentes que consolidan la legitimidad.',
    requirementsSummary: 'Ayuntamiento operativo y Alcalde/Erudito con ≥88% saber.',
    benefitsSummary: '+15% confianza institucional y estabilidad social.',
    costTradeoffSummary: 'Limita impuestos abusivos y exige audiencias.',
    requiredJobs: ['Alcalde', 'Erudito', 'Comisario'],
    minEducation: 88,
    minJobMastery: 50,
    requiredBuilding: 'town_hall',
    requiresVillageKnowledge: 320,
  },
];

export function ensureDiscoveryDefaults(state: SimulationState): void {
  if (!Array.isArray(state.discoveries)) state.discoveries = [];
  for (const agent of state.agents) {
    if (!Array.isArray(agent.discoveriesAuthored)) agent.discoveriesAuthored = [];
    if (!Array.isArray(agent.knownDiscoveries)) agent.knownDiscoveries = [];
  }
}

export function grantDiscoveryToVillage(
  state: SimulationState,
  blueprint: DiscoveryBlueprint,
  author: Agent | null,
  originLabel = 'trabajo y experiencia'
): DiscoveryRecord {
  ensureDiscoveryDefaults(state);
  const existing = state.discoveries!.find((d) => d.id === blueprint.id);
  if (existing) {
    if (author && !existing.knownByAgentIds.includes(author.id)) {
      existing.knownByAgentIds.push(author.id);
    }
    return existing;
  }

  const initialKnowers = new Set<number>();
  if (author) {
    initialKnowers.add(author.id);
    if (!author.discoveriesAuthored!.includes(blueprint.id)) {
      author.discoveriesAuthored!.push(blueprint.id);
    }
    if (!author.knownDiscoveries!.includes(blueprint.id)) {
      author.knownDiscoveries!.push(blueprint.id);
    }
  } else if (state.agents[0]) {
    initialKnowers.add(state.agents[0].id);
  }

  // El aprendiz o pareja cercana puede presenciar el hallazgo inicial
  if (author?.partnerId) initialKnowers.add(author.partnerId);

  const pop = Math.max(1, state.agents.length);
  const record: DiscoveryRecord = {
    id: blueprint.id,
    name: blueprint.name,
    era: blueprint.era,
    category: blueprint.category,
    description: blueprint.description,
    requirementsSummary: blueprint.requirementsSummary,
    benefitsSummary: blueprint.benefitsSummary,
    costTradeoffSummary: blueprint.costTradeoffSummary,
    authorId: author?.id ?? null,
    authorName: author?.name ?? 'Consejo de la Aldea',
    authorJob: author?.job ?? 'Aldea',
    discoveredDay: state.day,
    knownByAgentIds: Array.from(initialKnowers),
    diffusionPct: Math.round((initialKnowers.size / pop) * 100),
    status: initialKnowers.size / pop >= 0.45 ? 'diffused' : 'emergent',
  };

  state.discoveries!.push(record);
  state.knowledge += 8;

  if (author) {
    recordAgentMemory(state, author, 'milestone', `Descubrí "${blueprint.name}"`, 'positive');
    recordHistoricalFigure(state, author, `Descubridor de ${blueprint.name}`, `${blueprint.name} (${originLabel})`);
  }

  trackNaturalProgress(state, 'knowledgeGained', 8);
  pushSoundCue(state, 'celebration');
  recordCategorizedChronicle(
    state,
    'technology',
    `Descubrimiento: ${record.authorName} (${record.authorJob}) desarrolló "${record.name}" mediante ${originLabel}.`
  );
  emitSimEvent(state, 'discovery', record.name, author?.id, { era: record.era });
  addLog(state, `¡Descubrimiento! ${record.authorName} logró "${record.name}" (${blueprint.benefitsSummary}).`, 'emerald');
  return record;
}

function meetsDiscoveryRequirements(
  state: SimulationState,
  bp: DiscoveryBlueprint
): Agent | null {
  if (state.knowledge < bp.requiresVillageKnowledge) return null;
  if (bp.minFarms && state.farms.length < bp.minFarms) return null;
  if (bp.minHouses && state.houses.length < bp.minHouses) return null;
  if (bp.minRoadCount && state.roads.length < bp.minRoadCount) return null;
  if (bp.requiredBuilding && !isBuildingOperational(state, bp.requiredBuilding)) return null;

  const candidates = state.agents.filter((a) => {
    if (a.isChild || a.jailedDays > 0) return false;
    if (!bp.requiredJobs.includes(a.job) && a.job !== 'Erudito') return false;
    const mastery = a.jobMastery?.[a.job] ?? 0;
    return a.education >= bp.minEducation && (mastery >= bp.minJobMastery || a.education >= bp.minEducation + 12);
  });
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.education - a.education)[0];
}

export function evaluateAutonomousDiscoveries(state: SimulationState): DiscoveryRecord | null {
  ensureDiscoveryDefaults(state);
  const discoveredIds = new Set(state.discoveries!.map((d) => d.id));
  for (const bp of DISCOVERY_CATALOG) {
    if (discoveredIds.has(bp.id)) continue;
    const author = meetsDiscoveryRequirements(state, bp);
    if (author) {
      return grantDiscoveryToVillage(state, bp, author, 'práctica e investigación real');
    }
  }
  return null;
}

export function diffuseDiscoveriesDaily(state: SimulationState): void {
  ensureDiscoveryDefaults(state);
  if (state.discoveries!.length === 0 || state.agents.length === 0) return;

  const livingSet = new Set(state.agents.map((a) => a.id));
  const hasSchool = isBuildingOperational(state, 'school');
  const hasMarket = isBuildingOperational(state, 'market');
  const pedagogyBonus = state.discoveries!.some((d) => d.id === 'educacion_publica' && d.diffusionPct >= 20) ? 2 : 1;

  for (const disc of state.discoveries!) {
    // Limpiar IDs de fallecidos manteniendo trazabilidad en difusión viva
    const livingKnowers = disc.knownByAgentIds.filter((id) => livingSet.has(id));
    if (livingKnowers.length === 0 && state.agents.length > 0) {
      // Si todos los portadores murieron pero hay escuela o registro, un erudito/maestro conserva el legado
      const scholar = state.agents.find((a) => a.job === 'Erudito' || a.job === 'Maestro') ?? state.agents[0];
      livingKnowers.push(scholar.id);
    }

    const knowerSet = new Set(livingKnowers);
    const newlyLearned: Agent[] = [];

    // 1. Difusión por mentoría y familia cercana
    for (const agent of state.agents) {
      if (knowerSet.has(agent.id)) continue;
      const mentorKnows = agent.mentorId !== null && knowerSet.has(agent.mentorId);
      const partnerKnows = agent.partnerId !== null && knowerSet.has(agent.partnerId);
      const sameJobKnower = state.agents.some(
        (other) => knowerSet.has(other.id) && other.job === agent.job
      );
      if (mentorKnows || partnerKnows || (sameJobKnower && Math.random() < 0.35)) {
        newlyLearned.push(agent);
      }
    }

    // 2. Difusión escolar y de mercado (gradual, según tamaño y presencia de docentes)
    const schoolSlots = (hasSchool ? 2 : 0) * pedagogyBonus + (hasMarket ? 1 : 0);
    if (schoolSlots > 0) {
      let added = 0;
      for (const agent of state.agents) {
        if (knowerSet.has(agent.id) || newlyLearned.includes(agent)) continue;
        if (agent.education >= 8 || !agent.isChild) {
          newlyLearned.push(agent);
          added++;
          if (added >= schoolSlots) break;
        }
      }
    }

    for (const learner of newlyLearned) {
      knowerSet.add(learner.id);
      if (!learner.knownDiscoveries) learner.knownDiscoveries = [];
      if (!learner.knownDiscoveries.includes(disc.id)) {
        learner.knownDiscoveries.push(disc.id);
      }
    }

    disc.knownByAgentIds = Array.from(knowerSet);
    disc.diffusionPct = Math.round((disc.knownByAgentIds.length / Math.max(1, state.agents.length)) * 100);
    if (disc.status === 'emergent' && disc.diffusionPct >= 45) {
      disc.status = 'diffused';
      recordCategorizedChronicle(
        state,
        'technology',
        `Difusión completada: "${disc.name}" alcanzó al ${disc.diffusionPct}% de la población.`
      );
    }
  }
}

export function getDiscoveryAdoptionBonus(state: SimulationState, discoveryId: string): number {
  const disc = state.discoveries?.find((d) => d.id === discoveryId);
  if (!disc) return 0;
  return clamp(disc.diffusionPct / 100, 0.15, 1);
}

export function divineAccelerateDiscovery(state: SimulationState): DiscoveryRecord | null {
  ensureDiscoveryDefaults(state);
  const discoveredIds = new Set(state.discoveries!.map((d) => d.id));
  const nextBp = DISCOVERY_CATALOG.find((bp) => !discoveredIds.has(bp.id));
  if (!nextBp) {
    // Si ya están todos descubiertos, acelera difusión al 100%
    for (const disc of state.discoveries!) {
      disc.knownByAgentIds = state.agents.map((a) => a.id);
      disc.diffusionPct = 100;
      disc.status = 'diffused';
    }
    trackDivineIntervention(state, 'knowledgeGranted', 15, 'Intervención Divina consolidó la difusión científica total.');
    return state.discoveries![state.discoveries!.length - 1] ?? null;
  }

  state.knowledge = Math.max(state.knowledge, nextBp.requiresVillageKnowledge);
  const candidate =
    state.agents.find((a) => !a.isChild && nextBp.requiredJobs.includes(a.job)) ??
    state.agents.find((a) => !a.isChild) ??
    state.agents[0] ??
    null;
  if (candidate) {
    candidate.education = Math.max(candidate.education, nextBp.minEducation);
  }
  const rec = grantDiscoveryToVillage(state, nextBp, candidate, 'inspiración divina');
  trackDivineIntervention(state, 'knowledgeGranted', 12, `Intervención Divina aceleró el descubrimiento "${rec.name}".`);
  return rec;
}

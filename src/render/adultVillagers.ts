import {
  RIVER_BOTTOM_Y,
  getBuildingOccupantHeadBadges,
} from '../simulation/rules';
import type { Agent, BuildingOccupantBadge, SimulationState } from '../types/simulation';

function drawPixelOutlinedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  outline = '#181412'
): void {
  const rx = Math.round(x);
  const ry = Math.round(y);
  const rw = Math.round(w);
  const rh = Math.round(h);
  ctx.fillStyle = outline;
  ctx.fillRect(rx - 1, ry - 1, rw + 2, rh + 2);
  ctx.fillStyle = fill;
  ctx.fillRect(rx, ry, rw, rh);
}

/**
 * Renderizado pixel-art 16-bit (estilo Stardew Valley / Pokémon clásico) para aldeanos adultos y ancianos.
 * Contornos oscuros marcados, bloques de luz/sombra en píxeles enteros y equipamiento por oficio.
 */
export function drawAdultVillager(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  selectedId: number | null,
  animPhase: number
): void {
  const x = Math.round(agent.x);
  const y = Math.round(agent.y);
  const outline = '#181412';
  const step = Math.round(Math.sin(agent.walkFrame) * 2);
  const skinBase = agent.isSick ? '#cfd8cf' : agent.skin;
  const skinShadow = agent.isSick ? '#94a3b8' : 'rgba(69, 26, 3, 0.22)';
  const hairTone = agent.isElder ? '#e2e8f0' : agent.hairColor;

  ctx.save();
  ctx.translate(x, y);

  // Sombra proyectada en píxeles
  ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
  ctx.fillRect(-6, 10, 12, 3);

  // Piernas y botas con contorno marcado
  ctx.fillStyle = outline;
  ctx.fillRect(-5, 3 + step, 5, 8);
  ctx.fillRect(0, 3 - step, 5, 8);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-4, 4 + step, 3, 4);
  ctx.fillRect(1, 4 - step, 3, 4);
  ctx.fillStyle = '#5c3317';
  ctx.fillRect(-4, 8 + step, 3, 2);
  ctx.fillRect(1, 8 - step, 3, 2);

  // Torso y túnica/vestimenta 16-bit con contorno oscuro y sombreado lateral
  if (agent.sex === 'F') {
    ctx.fillStyle = outline;
    ctx.fillRect(-5, -5, 10, 7);
    ctx.fillRect(-7, 0, 14, 7);
    ctx.fillStyle = agent.shirt;
    ctx.fillRect(-4, -4, 8, 6);
    ctx.fillRect(-6, 1, 12, 5);
    // Sombra lateral del vestido y cuello claro
    ctx.fillStyle = 'rgba(15, 23, 42, 0.22)';
    ctx.fillRect(2, -4, 2, 10);
    ctx.fillRect(-6, 4, 12, 2);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-2, -4, 4, 2);
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(-4, 0, 8, 1);
  } else {
    ctx.fillStyle = outline;
    ctx.fillRect(-6, -5, 12, 10);
    ctx.fillStyle = agent.shirt;
    ctx.fillRect(-5, -4, 10, 8);
    // Sombra en flancos + cuello + cinturón con hebilla
    ctx.fillStyle = 'rgba(15, 23, 42, 0.24)';
    ctx.fillRect(-5, -4, 2, 7);
    ctx.fillRect(3, -4, 2, 7);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.fillRect(-2, -4, 4, 2);
    ctx.fillStyle = '#1e1b18';
    ctx.fillRect(-5, 2, 10, 2);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-1, 2, 2, 2);
  }

  // Rasgos distintivos de vestimenta por oficio
  if (agent.job === 'Herrero' || agent.job === 'Artesano') {
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-3, -2, 6, 7);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-2, -1, 4, 4);
  } else if (agent.job === 'Curandero' || agent.job === 'Boticario') {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-3, -3, 6, 7);
    ctx.fillStyle = agent.job === 'Curandero' ? '#ef4444' : '#14b8a6';
    ctx.fillRect(-1, -1, 2, 4);
    ctx.fillRect(-2, 0, 4, 2);
  } else if (agent.job === 'Comisario' || agent.job === 'Guardián') {
    ctx.fillStyle = agent.job === 'Comisario' ? '#1e3a8a' : '#7f1d1d';
    ctx.fillRect(-6, -4, 2, 8);
    ctx.fillRect(4, -4, 2, 8);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(1, -3, 2, 2);
  } else if (agent.job === 'Constructor') {
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-4, -4, 2, 6);
    ctx.fillRect(2, -4, 2, 6);
  } else if (agent.job === 'Banquero' || agent.job === 'Alcalde') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-4, -4, 8, 7);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-1, -2, 2, 3);
  } else if (agent.job === 'Agricultor') {
    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(-3, -1, 6, 5);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(-2, -3, 1, 3);
    ctx.fillRect(1, -3, 1, 3);
  }

  // Brazos con contorno oscuro
  ctx.fillStyle = outline;
  ctx.fillRect(-8, -4, 3, 7);
  ctx.fillRect(5, -4, 3, 7);
  ctx.fillStyle = agent.shirt;
  ctx.fillRect(-7, -3, 2, 3);
  ctx.fillRect(5, -3, 2, 3);
  ctx.fillStyle = skinBase;
  ctx.fillRect(-7, 0, 2, 2);
  ctx.fillRect(5, 0, 2, 2);

  // Herramientas y atributos en mano (el Pescador activo lanza la caña hacia el río)
  const isDockFishing =
    agent.taskType === 'fish_river' ||
    (agent.taskType === 'manage_building' && agent.job === 'Pescador');
  if (isDockFishing) {
    // Caña pixel-art apuntando hacia arriba/río con sedal y boya roja
    ctx.fillStyle = outline;
    ctx.fillRect(5, -15, 3, 12);
    ctx.fillStyle = '#92400e';
    ctx.fillRect(6, -14, 2, 10);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(8, -16, 1, 6);
    ctx.fillRect(9, -18, 1, 3);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(8, -19, 2, 2);
  } else if (agent.job === 'Comisario' || agent.job === 'Guardián') {
    ctx.fillStyle = outline;
    ctx.fillRect(-9, -11, 2, 17);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-8, -10, 1, 15);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-9, -14, 3, 3);
  } else if (agent.job === 'Herrero' || agent.job === 'Constructor') {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(6, -4, 1, 6);
    ctx.fillStyle = outline;
    ctx.fillRect(4, -7, 6, 3);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(5, -6, 4, 2);
  } else if (agent.job === 'Carpintero' || agent.job === 'Leñador') {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(6, -5, 1, 7);
    ctx.fillStyle = outline;
    ctx.fillRect(6, -6, 5, 4);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(7, -5, 3, 2);
  } else if (agent.toolsCount > 0) {
    ctx.fillStyle = outline;
    ctx.fillRect(6, -3, 3, 6);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(7, -2, 2, 4);
  }

  // Cabeza 16-bit con contorno marcado y sombreado de mejilla/mentón
  ctx.fillStyle = outline;
  ctx.fillRect(-5, -13, 10, 9);
  ctx.fillStyle = skinBase;
  ctx.fillRect(-4, -12, 8, 8);
  ctx.fillStyle = skinShadow;
  ctx.fillRect(-4, -6, 8, 2);
  ctx.fillRect(3, -12, 1, 7);

  // Barba en algunos varones adultos
  if (agent.sex === 'M' && agent.id % 3 === 0) {
    ctx.fillStyle = hairTone;
    ctx.fillRect(-3, -6, 6, 2);
  }

  // Ojos expresivos estilo RPG 16-bit (2px + punto de brillo)
  ctx.fillStyle = '#181412';
  ctx.fillRect(-3, -9, 2, 2);
  ctx.fillRect(1, -9, 2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-3, -9, 1, 1);
  ctx.fillRect(1, -9, 1, 1);
  if (agent.sex === 'F') {
    ctx.fillStyle = '#fda4af';
    ctx.fillRect(-4, -7, 1, 1);
    ctx.fillRect(3, -7, 1, 1);
  }

  // Cabello pixelado con contorno y brillo
  ctx.fillStyle = outline;
  if (agent.hairStyle === 'short') {
    ctx.fillRect(-5, -15, 10, 4);
  } else if (agent.hairStyle === 'long') {
    ctx.fillRect(-6, -15, 12, 4);
    ctx.fillRect(-6, -12, 3, 8);
    ctx.fillRect(3, -12, 3, 8);
  } else if (agent.hairStyle === 'mohawk') {
    ctx.fillRect(-2, -17, 4, 5);
  } else if (agent.hairStyle === 'curly') {
    ctx.fillRect(-6, -16, 12, 5);
  } else if (agent.hairStyle === 'ponytail') {
    ctx.fillRect(-5, -15, 10, 4);
    ctx.fillRect(3, -13, 5, 6);
  }

  ctx.fillStyle = hairTone;
  if (agent.hairStyle === 'short') {
    ctx.fillRect(-4, -14, 8, 3);
  } else if (agent.hairStyle === 'long') {
    ctx.fillRect(-5, -14, 10, 3);
    ctx.fillRect(-5, -11, 2, 6);
    ctx.fillRect(3, -11, 2, 6);
  } else if (agent.hairStyle === 'mohawk') {
    ctx.fillRect(-1, -16, 2, 4);
  } else if (agent.hairStyle === 'curly') {
    ctx.fillRect(-5, -15, 10, 4);
    ctx.fillRect(-5, -12, 2, 2);
    ctx.fillRect(3, -12, 2, 2);
  } else if (agent.hairStyle === 'ponytail') {
    ctx.fillRect(-4, -14, 8, 3);
    ctx.fillRect(4, -12, 3, 4);
  }
  if (agent.hairStyle !== 'bald') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(-3, -14, 4, 1);
  }

  // Sombreros / cascos distintivos por oficio con contorno oscuro
  if (agent.job === 'Minero') {
    ctx.fillStyle = outline;
    ctx.fillRect(-5, -16, 10, 4);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-4, -15, 8, 3);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-1, -15, 2, 2);
  } else if (agent.job === 'Panadero') {
    ctx.fillStyle = outline;
    ctx.fillRect(-5, -16, 10, 3);
    ctx.fillRect(-4, -19, 8, 4);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-4, -15, 8, 2);
    ctx.fillRect(-3, -18, 6, 3);
  } else if (agent.job === 'Pescador') {
    ctx.fillStyle = outline;
    ctx.fillRect(-7, -15, 14, 3);
    ctx.fillRect(-4, -17, 8, 3);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-6, -14, 12, 2);
    ctx.fillRect(-3, -16, 6, 2);
  } else if (agent.job === 'Alcalde' || agent.job === 'Banquero') {
    ctx.fillStyle = outline;
    ctx.fillRect(-6, -15, 12, 3);
    ctx.fillRect(-4, -19, 8, 5);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-5, -14, 10, 2);
    ctx.fillRect(-3, -18, 6, 4);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-3, -15, 6, 1);
  } else if (agent.job === 'Erudito') {
    ctx.fillStyle = outline;
    ctx.fillRect(-6, -16, 12, 3);
    ctx.fillStyle = '#312e81';
    ctx.fillRect(-5, -15, 10, 2);
  }

  if (agent.isRepresentative) {
    ctx.fillStyle = outline;
    ctx.fillRect(-4, -20, 8, 3);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-3, -19, 6, 2);
    ctx.fillRect(-2, -21, 1, 2);
    ctx.fillRect(1, -21, 1, 2);
  }

  if (agent.pregnancy) {
    ctx.fillStyle = '#ec4899';
    ctx.fillRect(-2, -2, 4, 3);
  }

  if (agent.jailedDays > 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-6, -12, 1, 20);
    ctx.fillRect(5, -12, 1, 20);
  }

  if (selectedId === agent.id) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-10, -18, 20, 31);
  }

  // Indicador superior (enfermedad, diálogo o estado de ánimo)
  if (agent.isSick) {
    drawPixelOutlinedRect(ctx, -4, -24, 8, 6, '#ef4444', outline);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -23, 2, 4);
    ctx.fillRect(-2, -22, 4, 2);
  } else if (agent.talkingTimer > 0) {
    drawPixelOutlinedRect(ctx, -7, -25, 14, 7, '#ffffff', outline);
    ctx.fillStyle = '#181412';
    ctx.fillRect(-4, -22, 2, 2);
    ctx.fillRect(-1, -22, 2, 2);
    ctx.fillRect(2, -22, 2, 2);
  } else {
    const emoColors: Record<Agent['emotion'], string> = {
      excited: '#f59e0b',
      happy: '#10b981',
      content: '#22c55e',
      neutral: '#94a3b8',
      sad: '#38bdf8',
      depressed: '#475569',
      love: '#ec4899',
      scared: '#a855f7',
      sick: '#ef4444',
    };
    drawPixelOutlinedRect(ctx, -3, -23, 6, 4, emoColors[agent.emotion], outline);
  }

  if (agent.taskType === 'sleep') {
    const zFloat = Math.round(((animPhase * 1.4 + agent.id * 0.4) % 1) * 6);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Z', 8, -15 - zFloat);
    ctx.font = 'bold 6px monospace';
    ctx.fillText('z', 13, -20 - zFloat);
  }

  ctx.restore();
}

/**
 * Dibuja un icono pixel-art de la cabeza del aldeano (11x11 px) en la parte inferior de casas
 * o edificios ocupados (comercios, banco, comisaría, cárcel). Cliqueable para inspeccionar.
 */
export function drawVillagerHeadBadge(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  badgeX: number,
  badgeY: number,
  isSelected: boolean
): void {
  const bx = Math.round(badgeX);
  const by = Math.round(badgeY);
  const outline = '#181412';
  const skinBase = agent.isSick ? '#cfd8cf' : agent.skin;
  const hairTone = agent.isElder ? '#e2e8f0' : agent.hairColor;

  ctx.save();
  ctx.translate(bx, by);

  // Marco oscuro del retrato + fondo
  ctx.fillStyle = isSelected ? '#facc15' : outline;
  ctx.fillRect(-6, -6, 12, 12);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-5, -5, 10, 10);

  // Cuello/hombros del color de vestimenta
  ctx.fillStyle = agent.shirt;
  ctx.fillRect(-4, 3, 8, 2);

  // Rostro en píxeles
  ctx.fillStyle = skinBase;
  ctx.fillRect(-4, -3, 8, 6);

  // Ojos pixel-art
  ctx.fillStyle = '#181412';
  ctx.fillRect(-2, -1, 1, 2);
  ctx.fillRect(1, -1, 1, 2);

  // Pelo o gorro del oficio
  ctx.fillStyle = hairTone;
  if (agent.hairStyle === 'long' || agent.hairStyle === 'curly') {
    ctx.fillRect(-4, -5, 8, 3);
    ctx.fillRect(-4, -2, 1, 4);
    ctx.fillRect(3, -2, 1, 4);
  } else if (agent.hairStyle === 'mohawk') {
    ctx.fillRect(-1, -6, 2, 4);
  } else if (agent.hairStyle !== 'bald') {
    ctx.fillRect(-4, -5, 8, 2);
  }

  if (agent.job === 'Minero') {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-4, -5, 8, 2);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-1, -5, 2, 1);
  } else if (agent.isRepresentative) {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-3, -6, 6, 1);
  }

  // Barrotes sutiles si está detenido en la Cárcel
  if (agent.jailedDays > 0) {
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-3, -5, 1, 10);
    ctx.fillRect(2, -5, 1, 10);
  }

  ctx.restore();
}

export function drawBuildingOccupantHeads(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  badges: BuildingOccupantBadge[] = getBuildingOccupantHeadBadges(state)
): void {
  if (badges.length === 0) return;
  const agentMap = new Map<number, Agent>();
  for (const a of state.agents) agentMap.set(a.id, a);
  const selectedAgentId =
    state.selectedEntity?.kind === 'agent' ? state.selectedEntity.id : state.selectedAgentId;

  for (const badge of badges) {
    const ag = agentMap.get(badge.agentId);
    if (!ag) continue;
    drawVillagerHeadBadge(ctx, ag, badge.x, badge.y, selectedAgentId === ag.id);
  }
}

export function drawFishingRipple(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  animPhase: number
): void {
  const isFishing =
    agent.taskType === 'fish_river' ||
    (agent.taskType === 'manage_building' && agent.job === 'Pescador');
  if (isFishing && Math.abs(agent.y - RIVER_BOTTOM_Y) < 34) {
    const splashStep = Math.floor((animPhase * 4 + agent.id) % 3);
    const rx = Math.round(agent.x + 8);
    const ry = Math.round(RIVER_BOTTOM_Y - 5);
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(rx - 3 - splashStep, ry, 2, 1);
    ctx.fillRect(rx + 2 + splashStep, ry, 2, 1);
    ctx.fillStyle = '#7dd3fc';
    ctx.fillRect(rx - 2, ry - 1 - (splashStep % 2), 5, 1);
    ctx.fillRect(rx - 2, ry + 1 + (splashStep % 2), 5, 1);
  }
}

export function drawFamilyHighlightOverlay(
  ctx: CanvasRenderingContext2D,
  state: SimulationState
): void {
  if (state.highlightFamilyAgentId === null) return;
  const target = state.agents.find((a) => a.id === state.highlightFamilyAgentId);
  if (!target) return;

  const partner = target.partnerId !== null ? state.agents.find((a) => a.id === target.partnerId) : null;
  const house = target.houseId !== null ? state.houses.find((h) => h.id === target.houseId) : null;

  ctx.save();
  ctx.lineWidth = 2;
  ctx.setLineDash([4, 3]);

  if (partner) {
    ctx.strokeStyle = '#ec4899';
    ctx.beginPath();
    ctx.moveTo(Math.round(target.x), Math.round(target.y));
    ctx.lineTo(Math.round(partner.x), Math.round(partner.y));
    ctx.stroke();
  }
  if (house) {
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(Math.round(target.x), Math.round(target.y));
    ctx.lineTo(Math.round(house.x), Math.round(house.y));
    ctx.stroke();
  }
  ctx.restore();
}

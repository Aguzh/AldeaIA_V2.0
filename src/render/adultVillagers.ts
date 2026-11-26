import { RIVER_BOTTOM_Y } from '../simulation/rules';
import type { Agent, SimulationState } from '../types/simulation';

/**
 * Renderizado pixel-art aislado para aldeanos adultos y ancianos (!agent.isChild),
 * diferenciando sexo, oficio, herramientas equipadas, vestimenta y estados.
 */
export function drawAdultVillager(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  selectedId: number | null,
  animPhase: number
): void {
  const x = Math.round(agent.x);
  const y = Math.round(agent.y);

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(-6, 10, 12, 3);

  const step = Math.sin(agent.walkFrame) * 2;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-4, 4 + step, 3, 6);
  ctx.fillRect(1, 4 - step, 3, 6);
  ctx.fillStyle = '#451a03';
  ctx.fillRect(-4, 8 + step, 3, 2);
  ctx.fillRect(1, 8 - step, 3, 2);

  if (agent.sex === 'F') {
    ctx.fillStyle = agent.shirt;
    ctx.fillRect(-4, -4, 8, 6);
    ctx.fillRect(-6, 1, 12, 5);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-2, -4, 4, 2);
    ctx.fillStyle = '#f472b6';
    ctx.fillRect(-4, 0, 8, 1);
  } else {
    ctx.fillStyle = agent.shirt;
    ctx.fillRect(-5, -4, 10, 8);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
    ctx.fillRect(-5, -4, 2, 7);
    ctx.fillRect(3, -4, 2, 7);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-5, 3, 10, 2);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-1, 3, 2, 2);
  }

  // Rasgos de vestimenta por oficio
  if (agent.job === 'Herrero' || agent.job === 'Artesano') {
    // Delantal de cuero oscuro
    ctx.fillStyle = '#451a03';
    ctx.fillRect(-3, -2, 6, 7);
  } else if (agent.job === 'Curandero' || agent.job === 'Boticario') {
    // Túnica clara + cruz médica o frasco
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-3, -3, 6, 7);
    ctx.fillStyle = agent.job === 'Curandero' ? '#ef4444' : '#14b8a6';
    ctx.fillRect(-1, -1, 2, 4);
    ctx.fillRect(-2, 0, 4, 2);
  } else if (agent.job === 'Comisario' || agent.job === 'Guardián') {
    // Capa oscura y placa dorada
    ctx.fillStyle = agent.job === 'Comisario' ? '#1e3a8a' : '#7f1d1d';
    ctx.fillRect(-6, -4, 2, 8);
    ctx.fillRect(4, -4, 2, 8);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(1, -3, 2, 2);
  } else if (agent.job === 'Constructor') {
    // Chaleco de obra ámbar
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-4, -4, 2, 6);
    ctx.fillRect(2, -4, 2, 6);
  } else if (agent.job === 'Banquero' || agent.job === 'Alcalde') {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-4, -4, 8, 7);
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-1, -2, 2, 3);
  }

  ctx.fillStyle = agent.isSick ? '#cbd5e1' : agent.skin;
  ctx.fillRect(-7, -3, 2, 6);
  ctx.fillRect(5, -3, 2, 6);

  // Herramientas y atributos en mano según oficio o herramientas equipadas
  if (agent.job === 'Pescador' && agent.taskType === 'fish_river') {
    // Caña de pescar extendida
    ctx.fillStyle = '#78350f';
    ctx.fillRect(6, -12, 2, 10);
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(8, -11, 1, 10);
  } else if (agent.job === 'Comisario' || agent.job === 'Guardián') {
    // Lanza / bastón de guardia
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-8, -10, 1, 16);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-8, -13, 2, 3);
  } else if (agent.job === 'Herrero' || agent.job === 'Constructor') {
    // Martillo / mazo
    ctx.fillStyle = '#78350f';
    ctx.fillRect(6, -4, 1, 6);
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(5, -6, 4, 2);
  } else if (agent.job === 'Carpintero' || agent.job === 'Leñador') {
    // Hacha
    ctx.fillStyle = '#78350f';
    ctx.fillRect(6, -5, 1, 7);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(7, -5, 3, 3);
  } else if (agent.toolsCount > 0) {
    // Brillo metálico de herramienta equipada
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(6, -2, 2, 5);
  }

  ctx.fillStyle = agent.isSick ? '#d9e3d8' : agent.skin;
  ctx.fillRect(-4, -12, 8, 8);

  if (agent.sex === 'M' && agent.id % 3 === 0) {
    ctx.fillStyle = agent.isElder ? '#cbd5e1' : agent.hairColor;
    ctx.fillRect(-3, -6, 6, 2);
  }

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-2, -9, 1, 2);
  ctx.fillRect(2, -9, 1, 2);

  ctx.fillStyle = agent.isElder ? '#e2e8f0' : agent.hairColor;
  if (agent.hairStyle === 'short') {
    ctx.fillRect(-4, -14, 8, 3);
  } else if (agent.hairStyle === 'long') {
    ctx.fillRect(-5, -14, 10, 3);
    ctx.fillRect(-5, -11, 2, 7);
    ctx.fillRect(3, -11, 2, 7);
  } else if (agent.hairStyle === 'mohawk') {
    ctx.fillRect(-1, -16, 2, 4);
  } else if (agent.hairStyle === 'curly') {
    ctx.fillRect(-5, -15, 10, 4);
    ctx.fillRect(-5, -12, 2, 2);
    ctx.fillRect(3, -12, 2, 2);
  } else if (agent.hairStyle === 'ponytail') {
    ctx.fillRect(-4, -14, 8, 3);
    ctx.fillRect(4, -12, 3, 5);
  }

  // Sombreros / cascos distintivos por oficio
  if (agent.job === 'Minero') {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-4, -15, 8, 3);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-1, -15, 2, 2);
  } else if (agent.job === 'Panadero') {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-4, -15, 8, 2);
    ctx.fillRect(-3, -18, 6, 3);
  } else if (agent.job === 'Pescador') {
    ctx.fillStyle = '#eab308';
    ctx.fillRect(-6, -14, 12, 2);
    ctx.fillRect(-3, -16, 6, 2);
  } else if (agent.job === 'Alcalde' || agent.job === 'Banquero') {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-5, -14, 10, 2);
    ctx.fillRect(-3, -18, 6, 4);
  } else if (agent.job === 'Erudito') {
    ctx.fillStyle = '#312e81';
    ctx.fillRect(-5, -15, 10, 2);
  }

  if (agent.isRepresentative) {
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
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-10, -18, 20, 31);
  }

  if (agent.isSick) {
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-4, -24, 8, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -23, 2, 4);
    ctx.fillRect(-2, -22, 4, 2);
  } else if (agent.talkingTimer > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-7, -25, 14, 7);
    ctx.fillStyle = '#0f172a';
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
    ctx.fillStyle = emoColors[agent.emotion];
    ctx.fillRect(-3, -23, 6, 5);
  }

  if (agent.taskType === 'sleep') {
    const zFloat = (animPhase * 1.4 + agent.id * 0.4) % 1;
    ctx.fillStyle = `rgba(56, 189, 248, ${1 - zFloat * 0.5})`;
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Z', 8, Math.round(-15 - zFloat * 7));
    ctx.font = 'bold 6px monospace';
    ctx.fillText('z', 13, Math.round(-20 - zFloat * 5));
  }

  ctx.restore();
}

export function drawFishingRipple(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  animPhase: number
): void {
  if (agent.taskType === 'fish_river' && Math.abs(agent.y - RIVER_BOTTOM_Y) < 28) {
    const splashR = 4 + ((animPhase * 5 + agent.id) % 5);
    ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(agent.x + 6, RIVER_BOTTOM_Y - 3, splashR, splashR * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
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
    ctx.moveTo(target.x, target.y);
    ctx.lineTo(partner.x, partner.y);
    ctx.stroke();
  }
  if (house) {
    ctx.strokeStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(target.x, target.y);
    ctx.lineTo(house.x, house.y);
    ctx.stroke();
  }
  ctx.restore();
}

import type { Agent } from '../types/simulation';

/**
 * Renderizado pixel-art 16-bit aislado exclusivamente para aldeanos niños (agent.isChild).
 * Proporciones infantiles (cabeza más grande, cuerpo compacto, mejillas sonrosadas y túnica/jardinera)
 * con contorno oscuro marcado y escala 0.68 para diferenciarse claramente de los adultos.
 */
export function drawChildVillager(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  selectedId: number | null,
  animPhase: number
): void {
  const x = Math.round(agent.x);
  const y = Math.round(agent.y);
  const scale = 0.68;
  const outline = '#181412';
  const step = Math.round(Math.sin(agent.walkFrame) * 2);
  const skinBase = agent.isSick ? '#cfd8cf' : agent.skin;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Sombra nítida en píxeles
  ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
  ctx.fillRect(-5, 9, 10, 3);

  // Piernas cortitas y botines infantiles con contorno oscuro
  ctx.fillStyle = outline;
  ctx.fillRect(-5, 3 + step, 5, 6);
  ctx.fillRect(0, 3 - step, 5, 6);
  ctx.fillStyle = '#334155';
  ctx.fillRect(-4, 3 + step, 3, 3);
  ctx.fillRect(1, 3 - step, 3, 3);
  ctx.fillStyle = '#78350f';
  ctx.fillRect(-4, 6 + step, 3, 2);
  ctx.fillRect(1, 6 - step, 3, 2);

  // Cuerpo infantil compacto con jardinera/túnica alegre
  ctx.fillStyle = outline;
  ctx.fillRect(-5, -4, 10, 8);
  ctx.fillStyle = agent.shirt;
  ctx.fillRect(-4, -3, 8, 6);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
  ctx.fillRect(2, -3, 2, 6);
  // Pechera / cuello claro infantil
  ctx.fillStyle = '#fef3c7';
  ctx.fillRect(-2, -3, 4, 2);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-4, 1, 8, 2);

  // Brazos cortitos con contorno
  ctx.fillStyle = outline;
  ctx.fillRect(-7, -3, 3, 6);
  ctx.fillRect(4, -3, 3, 6);
  ctx.fillStyle = agent.shirt;
  ctx.fillRect(-6, -2, 2, 2);
  ctx.fillRect(4, -2, 2, 2);
  ctx.fillStyle = skinBase;
  ctx.fillRect(-6, 0, 2, 2);
  ctx.fillRect(4, 0, 2, 2);

  // Cabeza chibi más redondeada y grande respecto al cuerpo
  ctx.fillStyle = outline;
  ctx.fillRect(-6, -15, 12, 11);
  ctx.fillStyle = skinBase;
  ctx.fillRect(-5, -14, 10, 9);
  ctx.fillStyle = 'rgba(69, 26, 3, 0.16)';
  ctx.fillRect(-5, -7, 10, 2);

  // Ojos grandes expresivos + mejillas sonrosadas 16-bit
  ctx.fillStyle = '#181412';
  ctx.fillRect(-3, -11, 2, 3);
  ctx.fillRect(1, -11, 2, 3);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-3, -11, 1, 1);
  ctx.fillRect(1, -11, 1, 1);
  ctx.fillStyle = '#fda4af';
  ctx.fillRect(-4, -8, 2, 1);
  ctx.fillRect(2, -8, 2, 1);

  // Gorro infantil o cabello colorido
  ctx.fillStyle = outline;
  if (agent.id % 2 === 0) {
    ctx.fillRect(-6, -17, 12, 4);
    ctx.fillRect(-3, -19, 6, 3);
    ctx.fillStyle = agent.sex === 'F' ? '#f472b6' : '#38bdf8';
    ctx.fillRect(-5, -16, 10, 3);
    ctx.fillRect(-2, -18, 4, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -18, 2, 1);
  } else {
    if (agent.hairStyle === 'short') {
      ctx.fillRect(-6, -17, 12, 4);
      ctx.fillStyle = agent.hairColor;
      ctx.fillRect(-5, -16, 10, 3);
    } else if (agent.hairStyle === 'long') {
      ctx.fillRect(-6, -17, 12, 4);
      ctx.fillRect(-7, -14, 3, 8);
      ctx.fillRect(4, -14, 3, 8);
      ctx.fillStyle = agent.hairColor;
      ctx.fillRect(-5, -16, 10, 3);
      ctx.fillRect(-6, -13, 2, 6);
      ctx.fillRect(4, -13, 2, 6);
    } else if (agent.hairStyle === 'mohawk') {
      ctx.fillRect(-2, -19, 4, 5);
      ctx.fillStyle = agent.hairColor;
      ctx.fillRect(-1, -18, 2, 4);
    } else if (agent.hairStyle === 'curly') {
      ctx.fillRect(-6, -18, 12, 5);
      ctx.fillStyle = agent.hairColor;
      ctx.fillRect(-5, -17, 10, 4);
    } else if (agent.hairStyle === 'ponytail') {
      ctx.fillRect(-6, -17, 12, 4);
      ctx.fillRect(4, -15, 4, 6);
      ctx.fillStyle = agent.hairColor;
      ctx.fillRect(-5, -16, 10, 3);
      ctx.fillRect(5, -14, 2, 4);
    }
  }

  if (agent.jailedDays > 0) {
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-6, -14, 1, 22);
    ctx.fillRect(5, -14, 1, 22);
  }

  if (selectedId === agent.id) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-10, -21, 20, 33);
  }

  if (agent.isSick) {
    ctx.fillStyle = outline;
    ctx.fillRect(-5, -27, 10, 8);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-4, -26, 8, 6);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1, -25, 2, 4);
    ctx.fillRect(-2, -24, 4, 2);
  } else if (agent.talkingTimer > 0) {
    ctx.fillStyle = outline;
    ctx.fillRect(-8, -28, 16, 9);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-7, -27, 14, 7);
    ctx.fillStyle = '#181412';
    ctx.fillRect(-4, -24, 2, 2);
    ctx.fillRect(-1, -24, 2, 2);
    ctx.fillRect(2, -24, 2, 2);
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
    ctx.fillStyle = outline;
    ctx.fillRect(-4, -26, 8, 6);
    ctx.fillStyle = emoColors[agent.emotion];
    ctx.fillRect(-3, -25, 6, 4);
  }

  if (agent.taskType === 'sleep') {
    const zFloat = Math.round(((animPhase * 1.4 + agent.id * 0.4) % 1) * 6);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Z', 8, -17 - zFloat);
    ctx.font = 'bold 6px monospace';
    ctx.fillText('z', 13, -22 - zFloat);
  }

  ctx.restore();
}

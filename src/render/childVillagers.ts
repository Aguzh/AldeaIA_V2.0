import type { Agent } from '../types/simulation';

/**
 * Renderizado pixel-art aislado exclusivamente para aldeanos niños (agent.isChild).
 * Permite modificar proporciones, túnicas, gorros o animaciones infantiles sin tocar adultos ni otros sets.
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

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = 'rgba(0,0,0,0.32)';
  ctx.fillRect(-6, 10, 12, 3);

  const step = Math.sin(agent.walkFrame) * 2;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-4, 4 + step, 3, 6);
  ctx.fillRect(1, 4 - step, 3, 6);
  ctx.fillStyle = '#451a03';
  ctx.fillRect(-4, 8 + step, 3, 2);
  ctx.fillRect(1, 8 - step, 3, 2);

  // Túnica infantil
  ctx.fillStyle = agent.shirt;
  ctx.fillRect(-4, -3, 8, 7);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-2, -3, 4, 2);

  ctx.fillStyle = agent.isSick ? '#cbd5e1' : agent.skin;
  ctx.fillRect(-7, -3, 2, 6);
  ctx.fillRect(5, -3, 2, 6);

  ctx.fillStyle = agent.isSick ? '#d9e3d8' : agent.skin;
  ctx.fillRect(-4, -12, 8, 8);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-2, -9, 1, 2);
  ctx.fillRect(2, -9, 1, 2);

  ctx.fillStyle = agent.hairColor;
  if (agent.id % 2 === 0) {
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-4, -14, 8, 3);
    ctx.fillRect(-2, -15, 4, 2);
  } else if (agent.hairStyle === 'short') {
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

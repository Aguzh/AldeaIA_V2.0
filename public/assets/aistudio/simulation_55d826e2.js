const MAX_AGENTS = 48; // Límite oculto para los agentes; optimizado para Ryzen 5 3600 + RTX 3060m 6GB
const canvas = document.getElementById('world-canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

const BIOMES = {
  grassland: { bg: '#3b7a3e', patch: '#2f6632', name: 'Pradera' },
  forest:    { bg: '#275933', patch: '#1d4527', name: 'Bosque' },
  arid:      { bg: '#b89456', patch: '#9e7c43', name: 'Árido' },
  tundra:    { bg: '#8fa6b2', patch: '#768e9b', name: 'Tundra' }
};

const HAIR_STYLES = ['short', 'long', 'mohawk', 'curly', 'ponytail', 'bald'];
const HAIR_COLORS = ['#1e1b18', '#5c3a21', '#d4a359', '#9e3b24', '#cbd5e1', '#3b82f6', '#ec4899'];
const SKIN_TONES  = ['#f5cba7', '#e0ac69', '#c68642', '#8d5524'];
const SHIRT_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const MALE_NAMES = ['Mateo', 'Lucas', 'Thiago', 'Bruno', 'Gael', 'Dante', 'Leo', 'Simón', 'Ian', 'Hugo'];
const FEMALE_NAMES = ['Luna', 'Sofía', 'Alma', 'Mía', 'Vera', 'Nina', 'Clara', 'Zoe', 'Elena', 'Sara'];

const state = {
  day: 1,
  minute: 480,
  speed: 1,
  layoutMode: 'auto', // 'auto' | 'vertical' | 'horizontal'
  biome: 'grassland',
  weather: 'sunny',
  tool: 'inspect',
  selectedAgentId: null,
  knowledge: 0,
  agents: [],
  resources: [],
  rainDrops: [],
  ollama: { enabled: false, url: 'http://localhost:11434/api/generate', model: 'qwen2.5:3b' }
};

function syncLayoutMode() {
  document.body.classList.remove('layout-auto', 'force-vertical', 'force-horizontal', 'is-vertical');
  if (state.layoutMode === 'vertical') {
    document.body.classList.add('force-vertical');
  } else if (state.layoutMode === 'horizontal') {
    document.body.classList.add('force-horizontal');
  } else {
    document.body.classList.add('layout-auto');
    if (window.innerHeight > window.innerWidth || window.innerWidth <= 1100) {
      document.body.classList.add('is-vertical');
    }
  }
}

window.addEventListener('resize', syncLayoutMode);

function logEvent(text, color = '#3b82f6') {
  const ul = document.getElementById('event-log');
  const li = document.createElement('li');
  li.style.borderLeftColor = color;
  li.textContent = `[Día ${state.day}] ${text}`;
  ul.prepend(li);
  if (ul.children.length > 45) ul.removeChild(ul.lastChild);
}

function createAgent(id, name, sex, x, y, parents = null, ageDays = 18) {
  return {
    id,
    name,
    sex,
    x,
    y,
    vx: 0,
    vy: 0,
    ageDays,
    isChild: ageDays < 6,
    hunger: 15,
    energy: 95,
    coins: 10,
    inv: { food: 1, wood: 0, stone: 0, iron: 0 },
    skin: SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)],
    shirt: SHIRT_COLORS[Math.floor(Math.random() * SHIRT_COLORS.length)],
    hairStyle: HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)],
    hairColor: HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)],
    partnerId: null,
    parents,
    childrenCount: 0,
    emotion: 'happy', // happy, sad, love, scared, surprised
    talkingTimer: 0,
    activity: 'Explorando la aldea',
    thought: 'Listo para construir nuestro futuro.',
    importance: 10, // Autocalculado entre aldeanos (0 - 100)
    walkFrame: 0
  };
}

function initWorld() {
  state.agents = [];
  state.resources = [];
  for (let i = 0; i < 10; i++) {
    state.agents.push(createAgent(i + 1, MALE_NAMES[i], 'M', 260 + Math.random() * 440, 180 + Math.random() * 280));
  }
  for (let i = 0; i < 10; i++) {
    state.agents.push(createAgent(i + 11, FEMALE_NAMES[i], 'F', 260 + Math.random() * 440, 180 + Math.random() * 280));
  }
  const types = ['food', 'wood', 'stone', 'iron'];
  for (let i = 0; i < 28; i++) {
    spawnResource(types[i % types.length], 60 + Math.random() * 840, 60 + Math.random() * 520);
  }
  for (let i = 0; i < 90; i++) {
    state.rainDrops.push({ x: Math.random() * 960, y: Math.random() * 640, s: 4 + Math.random() * 4 });
  }
  logEvent('La aldea comienza con 10 hombres y 10 mujeres.', '#10b981');
}

function spawnResource(type, x, y) {
  state.resources.push({ id: Math.random(), type, x, y, amount: 5 });
}

async function queryOllamaThought(agent, context) {
  if (!state.ollama.enabled) return;
  try {
    const prompt = `Sos ${agent.name}, un aldeano en una simulación de supervivencia. Situación: ${context}. Respondé en 1 sola frase corta en primera persona (máximo 12 palabras) con tu pensamiento.`;
    const res = await fetch(state.ollama.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: state.ollama.model, prompt, stream: false })
    });
    const data = await res.json();
    if (data && data.response) agent.thought = data.response.trim();
  } catch (e) {
    // Fallback silencioso si Ollama no está activo
  }
}

function getRankTitle(score) {
  if (score >= 80) return 'Patriarca / Matriarca';
  if (score >= 55) return 'Líder Emergente';
  if (score >= 30) return 'Referente Social';
  return 'Aldeano';
}

function updateAIRequestHint() {
  const reqEl = document.getElementById('ai-request-text');
  if (!reqEl) return;
  const totalStone = state.agents.reduce((acc, a) => acc + a.inv.stone, 0) + state.resources.filter(r => r.type === 'stone').length * 3;
  const totalFood = state.agents.reduce((acc, a) => acc + a.inv.food, 0);
  if (totalFood < 18) {
    reqEl.textContent = 'Necesitamos más comida para evitar hambruna en los próximos días.';
  } else if (totalStone < 25) {
    reqEl.textContent = 'Solicitamos piedra y saber para consolidar estructuras de la aldea.';
  } else {
    reqEl.textContent = 'La aldea prospera; pedimos recursos variados para seguir creciendo.';
  }
}

function updateSimulation() {
  if (state.speed === 0) return;

  // x1 es pausado y legible
  const dt = 0.28 * state.speed;
  state.minute += 0.25 * state.speed;
  if (state.minute >= 1440) {
    state.minute = 0;
    state.day++;
    state.agents.forEach(a => {
      a.ageDays++;
      if (a.isChild && a.ageDays >= 6) {
        a.isChild = false;
        logEvent(`${a.name} creció y ahora es adulto.`, '#38bdf8');
      }
    });
  }

  // Clima efectos
  if (state.weather === 'rain' && Math.random() < 0.015 * state.speed) {
    spawnResource('food', 60 + Math.random() * 840, 60 + Math.random() * 520);
  }

  // Recalcular importancia emergente entre ellos
  state.agents.forEach(a => {
    const socialBonus = (a.partnerId ? 15 : 0) + a.childrenCount * 12;
    const resourceBonus = (a.inv.wood + a.inv.stone + a.inv.iron * 2) * 2;
    a.importance = Math.min(100, Math.round(10 + socialBonus + resourceBonus + (a.talkingTimer > 0 ? 5 : 0)));
  });

  state.agents.forEach(a => {
    const hungerRate = state.weather === 'drought' ? 0.032 : 0.018;
    const energyRate = state.weather === 'storm' ? 0.03 : 0.015;
    a.hunger = Math.min(100, a.hunger + hungerRate * dt);
    a.energy = Math.max(0, a.energy - energyRate * dt);
    if (a.talkingTimer > 0) a.talkingTimer -= dt;

    // Elegirse su propio pelo ocasionalmente
    if (Math.random() < 0.0005 * state.speed) {
      a.hairStyle = HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)];
    }

    // Comer si tiene hambre
    if (a.hunger > 55 && a.inv.food > 0) {
      a.inv.food--;
      a.hunger = Math.max(0, a.hunger - 40);
      a.activity = 'Comiendo provisiones';
      a.emotion = 'happy';
    }

    // Estado emocional base
    if (state.weather === 'storm') a.emotion = 'scared';
    else if (a.hunger > 75 || a.energy < 20) a.emotion = 'sad';
    else if (a.partnerId && Math.random() < 0.02) a.emotion = 'love';
    else if (a.emotion !== 'surprised') a.emotion = 'happy';

    // Descansar
    if (a.energy < 22) {
      a.activity = 'Durmiendo / Recuperando energía';
      a.energy = Math.min(100, a.energy + 0.12 * dt);
      return;
    }

    // Buscar recurso más cercano
    let targetRes = null;
    let minDist = 9999;
    const desiredType = a.hunger > 45 ? 'food' : null;
    for (const r of state.resources) {
      if (desiredType && r.type !== desiredType) continue;
      const d = Math.hypot(r.x - a.x, r.y - a.y);
      if (d < minDist) { minDist = d; targetRes = r; }
    }

    if (targetRes) {
      const dx = targetRes.x - a.x;
      const dy = targetRes.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 10) {
        a.x += (dx / dist) * 0.85 * dt;
        a.y += (dy / dist) * 0.85 * dt;
        a.walkFrame += 0.15 * dt;
        a.activity = `Caminando hacia ${targetRes.type}`;
      } else {
        targetRes.amount--;
        a.inv[targetRes.type]++;
        state.knowledge += targetRes.type === 'iron' ? 3 : 1;
        a.activity = `Recolectando ${targetRes.type}`;
        if (targetRes.amount <= 0) {
          state.resources = state.resources.filter(r => r.id !== targetRes.id);
        }
      }
    } else {
      a.x += (Math.random() - 0.5) * 1.2 * dt;
      a.y += (Math.random() - 0.5) * 1.2 * dt;
      a.activity = 'Patrullando y observando';
    }

    a.x = Math.max(24, Math.min(936, a.x));
    a.y = Math.max(24, Math.min(616, a.y));

    // Interacción social cercana (conversación, comercio, unión libre y reproducción)
    for (const other of state.agents) {
      if (other.id <= a.id) continue;
      const d = Math.hypot(other.x - a.x, other.y - a.y);
      if (d < 26 && Math.random() < 0.015 * state.speed) {
        a.talkingTimer = 18;
        other.talkingTimer = 18;
        a.activity = `Conversando con ${other.name}`;
        other.activity = `Conversando con ${a.name}`;

        // Comercio simple
        if (a.hunger > 50 && other.inv.food > 1 && a.coins >= 3) {
          other.inv.food--;
          a.inv.food++;
          a.coins -= 3;
          other.coins += 3;
          logEvent(`${a.name} compró comida a ${other.name} por 3 monedas.`, '#f59e0b');
        }

        // Unión libre (sin importar sexo)
        if (!a.isChild && !other.isChild && !a.partnerId && !other.partnerId && Math.random() < 0.18) {
          a.partnerId = other.id;
          other.partnerId = a.id;
          a.emotion = 'love';
          other.emotion = 'love';
          logEvent(`❤️ ${a.name} y ${other.name} decidieron unirse en pareja.`, '#ec4899');
          queryOllamaThought(a, `Acabo de unirme en pareja con ${other.name}`);
        }

        // Descendencia (respetando el techo oculto de MAX_AGENTS)
        if (a.partnerId === other.id && a.hunger < 45 && other.hunger < 45 && Math.random() < 0.06) {
          if (state.agents.length < MAX_AGENTS) {
            const newId = Date.now() + Math.floor(Math.random() * 1000);
            const childSex = Math.random() < 0.5 ? 'M' : 'F';
            const childName = `${a.name.slice(0,3)}${other.name.slice(-2)} Jr.`;
            const child = createAgent(newId, childName, childSex, a.x + 8, a.y + 8, `${a.name} & ${other.name}`, 0);
            child.emotion = 'surprised';
            state.agents.push(child);
            a.childrenCount++;
            other.childrenCount++;
            logEvent(`👶 Nació ${childName}, hijo de ${a.name} y ${other.name}.`, '#10b981');
          }
        }
      }
    }
  });

  updateAIRequestHint();
  updateHUD();
}

function drawPixelAgent(a) {
  const x = Math.round(a.x);
  const y = Math.round(a.y);
  const scale = a.isChild ? 0.75 : 1;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Sombra
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-6, 10, 12, 3);

  // Piernas animadas
  const step = Math.sin(a.walkFrame) * 2;
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(-4, 4 + step, 3, 6);
  ctx.fillRect(1, 4 - step, 3, 6);

  // Torso
  ctx.fillStyle = a.shirt;
  ctx.fillRect(-5, -4, 10, 8);

  // Brazos
  ctx.fillStyle = a.skin;
  ctx.fillRect(-7, -3, 2, 6);
  ctx.fillRect(5, -3, 2, 6);

  // Cabeza
  ctx.fillStyle = a.skin;
  ctx.fillRect(-4, -12, 8, 8);

  // Ojos
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-2, -9, 1, 2);
  ctx.fillRect(2, -9, 1, 2);

  // Pelo pixel art según elección del agente
  ctx.fillStyle = a.hairColor;
  if (a.hairStyle === 'short') {
    ctx.fillRect(-4, -14, 8, 3);
  } else if (a.hairStyle === 'long') {
    ctx.fillRect(-5, -14, 10, 3);
    ctx.fillRect(-5, -11, 2, 7);
    ctx.fillRect(3, -11, 2, 7);
  } else if (a.hairStyle === 'mohawk') {
    ctx.fillRect(-1, -16, 2, 4);
  } else if (a.hairStyle === 'curly') {
    ctx.fillRect(-5, -15, 10, 4);
    ctx.fillRect(-5, -12, 2, 2);
    ctx.fillRect(3, -12, 2, 2);
  } else if (a.hairStyle === 'ponytail') {
    ctx.fillRect(-4, -14, 8, 3);
    ctx.fillRect(4, -12, 3, 5);
  }

  // Selección
  if (state.selectedAgentId === a.id) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1;
    ctx.strokeRect(-9, -17, 18, 29);
  }

  // Burbuja de conversación o emoción encima
  if (a.talkingTimer > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-7, -25, 14, 7);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-4, -22, 2, 2);
    ctx.fillRect(-1, -22, 2, 2);
    ctx.fillRect(2, -22, 2, 2);
  } else {
    const emoColors = { happy: '#22c55e', sad: '#38bdf8', love: '#ec4899', scared: '#a855f7', surprised: '#eab308' };
    ctx.fillStyle = emoColors[a.emotion] || '#22c55e';
    ctx.fillRect(-4, -23, 8, 6);
    ctx.fillStyle = '#ffffff';
    if (a.emotion === 'love') ctx.fillRect(-1, -21, 2, 2);
    if (a.emotion === 'scared' || a.emotion === 'surprised') ctx.fillRect(-1, -22, 2, 4);
  }

  ctx.restore();
}

function renderWorld() {
  const b = BIOMES[state.biome];
  ctx.fillStyle = b.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Detalles pixel del terreno
  ctx.fillStyle = b.patch;
  for (let gx = 0; gx < canvas.width; gx += 64) {
    for (let gy = 0; gy < canvas.height; gy += 64) {
      if ((gx + gy) % 128 === 0) ctx.fillRect(gx + 8, gy + 8, 16, 8);
    }
  }

  // Fogata central de la aldea
  ctx.fillStyle = '#78350f';
  ctx.fillRect(472, 316, 16, 8);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(475, 308, 10, 10);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(478, 311, 4, 5);

  // Recursos
  for (const r of state.resources) {
    const rx = Math.round(r.x), ry = Math.round(r.y);
    if (r.type === 'food') { ctx.fillStyle = '#ef4444'; ctx.fillRect(rx - 4, ry - 4, 8, 8); }
    if (r.type === 'wood') { ctx.fillStyle = '#78350f'; ctx.fillRect(rx - 6, ry - 3, 12, 6); }
    if (r.type === 'stone') { ctx.fillStyle = '#94a3b8'; ctx.fillRect(rx - 5, ry - 4, 10, 8); }
    if (r.type === 'iron') { ctx.fillStyle = '#38bdf8'; ctx.fillRect(rx - 5, ry - 4, 10, 8); }
  }

  // Agentes ordenados por Y
  [...state.agents].sort((a, b) => a.y - b.y).forEach(drawPixelAgent);

  // Efectos de lluvia / tormenta
  if (state.weather === 'rain' || state.weather === 'storm') {
    ctx.fillStyle = '#93c5fd';
    state.rainDrops.forEach(d => {
      ctx.fillRect(d.x, d.y, 2, 7);
      d.y += d.s;
      if (d.y > 640) d.y = 0;
    });
  }
}

function updateHUD() {
  document.getElementById('stat-day').textContent = state.day;
  const hh = String(Math.floor(state.minute / 60)).padStart(2, '0');
  const mm = String(Math.floor(state.minute % 60)).padStart(2, '0');
  document.getElementById('stat-time').textContent = `${hh}:${mm}`;
  document.getElementById('stat-pop').textContent = `${state.agents.length} / ${MAX_AGENTS}`;
  const couples = Math.floor(state.agents.filter(a => a.partnerId).length / 2);
  document.getElementById('stat-couples').textContent = couples;
  document.getElementById('stat-tech').textContent = state.knowledge;

  const era = state.knowledge >= 150 ? 'Edad de Hierro' : state.knowledge >= 75 ? 'Edad de Madera' : state.knowledge >= 25 ? 'Edad de Piedra' : 'Era Primitiva';
  document.getElementById('era-label').textContent = era;

  const limitBanner = document.getElementById('limit-banner');
  if (state.agents.length >= MAX_AGENTS) limitBanner.classList.remove('hidden');
  else limitBanner.classList.add('hidden');

  if (state.selectedAgentId) {
    const a = state.agents.find(x => x.id === state.selectedAgentId);
    if (a) {
      const partner = state.agents.find(x => x.id === a.partnerId);
      document.getElementById('agent-details').innerHTML = `
        <div class="detail-row"><strong>${a.name} (${a.sex})</strong><span>${a.isChild ? 'Niño/a' : `${a.ageDays} días`}</span></div>
        <div class="detail-row"><span>Actividad actual</span><strong>${a.activity}</strong></div>
        <div class="detail-row"><span>Importancia social</span><strong>${a.importance}/100 (${getRankTitle(a.importance)})</strong></div>
        <div class="detail-row"><span>Pareja</span><span>${partner ? partner.name : 'Soltero/a'}</span></div>
        <div class="detail-row"><span>Padres / Hijos</span><span>${a.parents || 'Fundador'} / ${a.childrenCount}</span></div>
        <div class="detail-row"><span>Economía</span><span>🪙 ${a.coins} | 🍎${a.inv.food} 🪵${a.inv.wood} 🪨${a.inv.stone}</span></div>
        <div style="margin-top:8px;font-size:0.78rem;color:#94a3b8;">Pensamiento IA:</div>
        <p style="font-size:0.8rem;background:#0f172a;padding:6px;border-radius:6px;margin-top:4px;">"${a.thought}"</p>
      `;
    }
  }
}

// Eventos UI
document.querySelectorAll('.btn-speed').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-speed').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.speed = Number(btn.dataset.speed);
  });
});

document.querySelectorAll('.btn-layout').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.btn-layout').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.layoutMode = btn.dataset.layout;
    syncLayoutMode();
  });
});

document.querySelectorAll('.tool-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.tool = btn.dataset.tool;
  });
});

document.getElementById('select-biome').addEventListener('change', e => state.biome = e.target.value);
document.getElementById('select-weather').addEventListener('change', e => state.weather = e.target.value);

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  if (state.tool === 'inspect') {
    let found = null;
    for (const a of state.agents) {
      if (Math.hypot(a.x - x, a.y - y) < 18) { found = a; break; }
    }
    state.selectedAgentId = found ? found.id : null;
  } else if (state.tool === 'knowledge') {
    state.knowledge += 15;
    logEvent('Concediste +15 puntos de conocimiento a la aldea.', '#8b5cf6');
  } else {
    spawnResource(state.tool, x, y);
  }
});

document.getElementById('btn-grant-request').addEventListener('click', () => {
  for (let i = 0; i < 6; i++) spawnResource('stone', 300 + Math.random() * 360, 200 + Math.random() * 240);
  state.knowledge += 10;
  logEvent('Concediste los recursos solicitados por la inteligencia colectiva.', '#10b981');
});

document.getElementById('trial-abundance').addEventListener('click', () => {
  ['food', 'wood', 'stone', 'iron'].forEach(t => {
    for (let i = 0; i < 4; i++) spawnResource(t, 80 + Math.random() * 800, 80 + Math.random() * 480);
  });
  logEvent('Prueba divina: Lluvia de recursos en toda la aldea.', '#10b981');
});

document.getElementById('trial-scarcity').addEventListener('click', () => {
  state.weather = 'drought';
  document.getElementById('select-weather').value = 'drought';
  state.agents.forEach(a => a.hunger = Math.min(90, a.hunger + 25));
  logEvent('Prueba divina: Ola de calor y escasez iniciada.', '#f59e0b');
});

document.getElementById('trial-plague').addEventListener('click', () => {
  state.agents.forEach(a => { a.energy = Math.max(10, a.energy - 40); a.emotion = 'scared'; });
  logEvent('Prueba divina: Prueba de resistencia aplicada a los aldeanos.', '#ef4444');
});

document.getElementById('btn-ollama').addEventListener('click', () => document.getElementById('modal-ollama').classList.remove('hidden'));
document.getElementById('btn-close-ollama').addEventListener('click', () => document.getElementById('modal-ollama').classList.add('hidden'));
document.getElementById('btn-save-ollama').addEventListener('click', () => {
  state.ollama.url = document.getElementById('ollama-url').value;
  state.ollama.model = document.getElementById('ollama-model').value;
  state.ollama.enabled = true;
  document.getElementById('btn-ollama').textContent = `Ollama (${state.ollama.model})`;
  document.getElementById('modal-ollama').classList.add('hidden');
  logEvent(`IA Local conectada a ${state.ollama.model}.`, '#10b981');
});

function loop() {
  updateSimulation();
  renderWorld();
  requestAnimationFrame(loop);
}

syncLayoutMode();
initWorld();
loop();
import { SPECIAL_BUILDING_LABELS, clamp } from '../simulation/rules';
import type {
  Agent,
  FarmPlot,
  House,
  MaintenanceStatus,
  SelectedEntity,
  SimulationState,
  SpecialBuilding,
} from '../types/simulation';

export function drawSmokePuffs(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  phase: number,
  dark = false
): void {
  for (let i = 0; i < 3; i++) {
    const p = (phase * 0.35 + i * 0.33) % 1;
    const py = Math.round(y - p * 18);
    const px = Math.round(x + Math.sin(p * Math.PI * 2 + i) * 3);
    const sz = Math.round(3 + p * 4);
    const alpha = Math.max(0.08, (1 - p) * 0.5);
    ctx.fillStyle = dark ? `rgba(71, 85, 105, ${alpha})` : `rgba(226, 232, 240, ${alpha})`;
    ctx.fillRect(px - Math.floor(sz / 2), py - Math.floor(sz / 2), sz, sz);
  }
}

export function drawStructureWearOverlay(
  ctx: CanvasRenderingContext2D,
  leftX: number,
  topY: number,
  w: number,
  h: number,
  durability: number,
  status?: MaintenanceStatus
): void {
  if (durability >= 80 && (!status || status === 'ok')) return;
  const severe = status === 'inoperative' || status === 'ruined' || durability < 35;
  ctx.fillStyle = severe ? 'rgba(15, 23, 42, 0.72)' : 'rgba(30, 41, 59, 0.55)';
  // Grietas pixel-art en muros
  ctx.fillRect(leftX + 5, topY + 6, 2, 7);
  ctx.fillRect(leftX + 7, topY + 11, 2, 5);
  ctx.fillRect(leftX + w - 9, topY + 4, 2, 6);
  ctx.fillRect(leftX + w - 11, topY + 9, 2, 5);
  if (severe) {
    // Techo dañado / tablones faltantes y manchas oscuras
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.fillRect(leftX + Math.floor(w * 0.32), topY - 4, 6, 4);
    ctx.fillRect(leftX + 3, topY + h - 5, Math.floor(w * 0.35), 3);
  }
}

export function drawCentralPlaza(
  ctx: CanvasRenderingContext2D,
  plaza: NonNullable<SimulationState['plaza']>,
  minute: number,
  isNight: boolean,
  isSelected: boolean
): void {
  const cx = plaza.x;
  const cy = plaza.y;
  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = '#64748b';
  ctx.fillRect(-62, -46, 124, 92);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-56, -40, 112, 80);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(-34, -24, 68, 48);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(-28, -18, 56, 36);

  ctx.fillStyle = '#78350f';
  ctx.fillRect(-50, -10, 7, 20);
  ctx.fillRect(43, -10, 7, 20);

  ctx.fillStyle = '#334155';
  ctx.fillRect(-17, -14, 34, 28);
  ctx.fillStyle = '#0284c7';
  ctx.fillRect(-14, -11, 28, 22);
  ctx.fillStyle = '#7dd3fc';
  const ripple = Math.floor(minute * 0.4) % 2 === 0;
  ctx.fillRect(ripple ? -9 : -5, -7, 7, 3);
  ctx.fillRect(ripple ? 2 : -2, 3, 8, 3);
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(-4, -13, 8, 15);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(-2, -16, 4, 4);

  const corners = [
    [-52, -38],
    [48, -38],
    [-52, 34],
    [48, 34],
  ];
  for (const [lx, ly] of corners) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(lx, ly, 4, 6);
    ctx.fillStyle = isNight ? '#fde047' : '#f59e0b';
    ctx.fillRect(lx, ly - 3, 4, 4);
  }

  drawStructureWearOverlay(ctx, -56, -40, 112, 80, plaza.durability, plaza.maintenanceStatus);

  if (isSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-65, -49, 130, 98);
  }

  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(-26, -60, 52, 11);
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PLAZA', 0, -52);

  ctx.restore();
}

export function drawFarmPlot(ctx: CanvasRenderingContext2D, plot: FarmPlot, isSelected: boolean): void {
  const x = Math.round(plot.x);
  const y = Math.round(plot.y);
  const halfW = plot.size === 'large' ? 30 : plot.size === 'medium' ? 22 : 15;
  const halfH = plot.size === 'large' ? 20 : plot.size === 'medium' ? 14 : 10;

  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = '#78350f';
  ctx.fillRect(-halfW - 2, -halfH - 2, halfW * 2 + 4, halfH * 2 + 4);
  ctx.fillStyle = '#4a3219';
  ctx.fillRect(-halfW, -halfH, halfW * 2, halfH * 2);

  ctx.fillStyle = '#92400e';
  ctx.fillRect(-halfW - 3, -halfH - 3, 3, 5);
  ctx.fillRect(halfW, -halfH - 3, 3, 5);
  ctx.fillRect(-halfW - 3, halfH - 2, 3, 5);
  ctx.fillRect(halfW, halfH - 2, 3, 5);

  const color =
    plot.cropName === 'Maíz'
      ? plot.growth >= 85
        ? '#facc15'
        : '#65a30d'
      : plot.growth >= 85
        ? '#eab308'
        : plot.growth >= 45
          ? '#84cc16'
          : '#22c55e';
  const height = plot.growth >= 85 ? 7 : plot.growth >= 45 ? 5 : 3;
  ctx.fillStyle = color;
  for (let row = -halfH + 4; row <= halfH - 3; row += 6) {
    for (let col = -halfW + 4; col <= halfW - 5; col += 6) {
      ctx.fillRect(col, row - height + 2, 3, height);
    }
  }

  if (plot.size === 'large') {
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(halfW - 10, -halfH + 2, 8, 6);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-halfW + 3, -halfH - 6, 2, 8);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(-halfW + 2, -halfH - 8, 4, 3);
  } else if (plot.size === 'medium') {
    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(halfW - 8, halfH - 7, 6, 5);
  }

  drawStructureWearOverlay(ctx, -halfW, -halfH, halfW * 2, halfH * 2, plot.durability, plot.maintenanceStatus);

  if (isSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-halfW - 5, -halfH - 5, halfW * 2 + 10, halfH * 2 + 10);
  }

  ctx.restore();
}

export function drawSpecialBuilding(
  ctx: CanvasRenderingContext2D,
  b: SpecialBuilding,
  isNight: boolean,
  isSelected: boolean,
  season: SimulationState['season'],
  shadow: { dx: number; dy: number; alpha: number },
  animPhase: number
): void {
  const x = Math.round(b.x);
  const y = Math.round(b.y);
  ctx.save();
  ctx.translate(x, y);

  // Sombra direccional según ángulo solar
  ctx.fillStyle = `rgba(0,0,0,${shadow.alpha + 0.14})`;
  ctx.fillRect(-30 + shadow.dx, 14 + Math.min(4, shadow.dy), 60, 7);

  switch (b.type) {
    case 'dock': {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-30, -24, 60, 34);
      ctx.fillStyle = '#92400e';
      for (let py = -22; py <= 6; py += 6) {
        ctx.fillRect(-28, py, 56, 3);
      }
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-28, -26, 4, 38);
      ctx.fillRect(24, -26, 4, 38);
      ctx.fillStyle = '#b45309';
      ctx.fillRect(-14, -34, 24, 9);
      ctx.fillStyle = '#fde68a';
      ctx.fillRect(-6, -32, 8, 4);
      break;
    }
    case 'bank': {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-29, -13, 58, 30);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-31, 13, 62, 4);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-32, -21, 64, 8);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-22, -27, 44, 6);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-5, -25, 10, 8);
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-24, -11, 5, 24);
      ctx.fillRect(-12, -11, 5, 24);
      ctx.fillRect(7, -11, 5, 24);
      ctx.fillRect(19, -11, 5, 24);
      ctx.fillStyle = '#334155';
      ctx.fillRect(-5, 1, 10, 14);
      break;
    }
    case 'infirmary': {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(-32, -14, 64, 32);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(-35, -22, 70, 9);
      ctx.fillRect(-22, -29, 44, 7);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-8, -28, 16, 12);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-2, -27, 4, 10);
      ctx.fillRect(-5, -24, 10, 4);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-5, 6, 10, 12);
      ctx.fillStyle = isNight && b.isOperational ? '#fef08a' : '#bae6fd';
      ctx.fillRect(-26, -6, 7, 7);
      ctx.fillRect(19, -6, 7, 7);
      break;
    }
    case 'school': {
      ctx.fillStyle = '#e2e8f0';
      ctx.fillRect(-30, -13, 60, 31);
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(-33, -21, 66, 9);
      ctx.fillRect(-22, -27, 44, 6);
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(-7, -37, 14, 10);
      ctx.fillStyle = '#facc15';
      ctx.fillRect(-3, -34, 6, 6);
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-5, 6, 10, 12);
      ctx.fillStyle = isNight && b.isOperational ? '#fde047' : '#60a5fa';
      ctx.fillRect(-24, -4, 7, 7);
      ctx.fillRect(17, -4, 7, 7);
      break;
    }
    case 'market': {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(-30, -6, 60, 22);
      for (let i = -32; i < 32; i += 8) {
        ctx.fillStyle = (Math.abs(i) / 8) % 2 === 0 ? '#dc2626' : '#fef3c7';
        ctx.fillRect(i, -19, 8, 12);
      }
      ctx.fillStyle = '#059669';
      ctx.fillRect(-28, -25, 56, 6);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(-24, 3, 10, 8);
      ctx.fillRect(-6, 3, 10, 8);
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(14, 3, 10, 8);
      break;
    }
    case 'bakery': {
      ctx.fillStyle = '#d97706';
      ctx.fillRect(-21, -10, 42, 24);
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-24, -17, 48, 8);
      ctx.fillStyle = '#7c2d12';
      ctx.fillRect(10, -29, 7, 12);
      ctx.fillStyle = b.isOperational ? '#fde68a' : '#94a3b8';
      ctx.fillRect(-16, -2, 11, 7);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(1, 4, 8, 10);
      if (b.isOperational) drawSmokePuffs(ctx, 13, -31, animPhase);
      break;
    }
    case 'carpentry': {
      ctx.fillStyle = '#9a6b3f';
      ctx.fillRect(-24, -11, 48, 26);
      ctx.fillStyle = '#654321';
      ctx.fillRect(-27, -18, 54, 8);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-4, 5, 8, 10);
      ctx.fillStyle = isNight && b.isOperational ? '#fde047' : '#93c5fd';
      ctx.fillRect(10, -3, 8, 6);
      break;
    }
    case 'forge': {
      ctx.fillStyle = '#475569';
      ctx.fillRect(-25, -11, 50, 26);
      ctx.fillStyle = '#ea580c';
      ctx.fillRect(-28, -18, 56, 8);
      ctx.fillStyle = '#334155';
      ctx.fillRect(11, -28, 7, 10);
      ctx.fillStyle = b.isOperational ? '#f97316' : '#334155';
      ctx.fillRect(-7, 3, 12, 12);
      ctx.fillStyle = b.isOperational ? '#fde047' : '#64748b';
      ctx.fillRect(-3, 7, 5, 6);
      if (b.isOperational) {
        drawSmokePuffs(ctx, 14, -30, animPhase, true);
        // Chispas de forja
        if (Math.floor(animPhase * 4) % 2 === 0) {
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(-5, 0, 2, 2);
          ctx.fillRect(2, -1, 2, 2);
        }
      }
      break;
    }
    case 'apothecary': {
      ctx.fillStyle = '#6b7280';
      ctx.fillRect(-20, -10, 40, 24);
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(-23, -17, 46, 8);
      ctx.fillStyle = '#475569';
      ctx.fillRect(9, -26, 5, 9);
      ctx.fillStyle = '#2dd4bf';
      ctx.fillRect(-4, -20, 8, 7);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-4, 4, 8, 10);
      if (b.isOperational) drawSmokePuffs(ctx, 11, -28, animPhase + 0.5);
      break;
    }
    case 'general_depot': {
      ctx.fillStyle = '#854d0e';
      ctx.fillRect(-29, -12, 58, 28);
      ctx.fillStyle = '#451a03';
      ctx.fillRect(-32, -20, 64, 9);
      ctx.fillStyle = '#ca8a04';
      ctx.fillRect(-24, 2, 12, 12);
      ctx.fillRect(12, 2, 12, 12);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-7, 0, 14, 16);
      break;
    }
    case 'town_hall': {
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-32, -14, 64, 32);
      ctx.fillStyle = '#7e22ce';
      ctx.fillRect(-35, -22, 70, 8);
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(-9, -38, 18, 18);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-4, -33, 8, 8);
      ctx.fillStyle = '#4c1d95';
      ctx.fillRect(-6, 4, 12, 14);
      break;
    }
    case 'police_station': {
      ctx.fillStyle = '#334155';
      ctx.fillRect(-24, -12, 48, 27);
      ctx.fillStyle = '#1d4ed8';
      ctx.fillRect(-27, -19, 54, 8);
      ctx.fillStyle = '#60a5fa';
      ctx.fillRect(-4, -24, 8, 6);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-5, 3, 10, 12);
      break;
    }
    case 'prison': {
      ctx.fillStyle = '#475569';
      ctx.fillRect(-25, -12, 50, 27);
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-27, -18, 54, 7);
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-16, -5, 12, 10);
      ctx.fillRect(4, -5, 12, 10);
      ctx.fillStyle = '#cbd5e1';
      for (let bx = -14; bx <= -6; bx += 3) ctx.fillRect(bx, -5, 1, 10);
      for (let bx = 6; bx <= 14; bx += 3) ctx.fillRect(bx, -5, 1, 10);
      break;
    }
  }

  if (season === 'Invierno' && b.type !== 'dock') {
    ctx.fillStyle = 'rgba(248, 250, 252, 0.82)';
    ctx.fillRect(-26, -21, 52, 3);
  }

  drawStructureWearOverlay(ctx, -26, -15, 52, 30, b.durability, b.maintenanceStatus);

  // Edificio obsoleto sin administrador: atenuado discreto + icono de pausa
  if (!b.isOperational) {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.34)';
    ctx.fillRect(-30, -22, 60, 38);
  }

  if (isSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-36, -40, 72, 62);
  }

  const short = SPECIAL_BUILDING_LABELS[b.type].short;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(-28, -48, 56, 11);
  ctx.fillStyle = b.isOperational ? '#4ade80' : '#fb7185';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`${!b.isOperational ? '⏸ ' : ''}${short} N${b.level}`, 0, -39);

  if (b.durability < 65) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-20, 18, 40, 4);
    ctx.fillStyle = b.durability < 35 ? '#ef4444' : '#f59e0b';
    ctx.fillRect(-20, 18, Math.round((40 * b.durability) / 100), 4);
  }

  if (!b.isOperational) {
    ctx.fillStyle = 'rgba(127, 29, 29, 0.92)';
    ctx.fillRect(-26, 23, 52, 10);
    ctx.fillStyle = '#fecdd3';
    ctx.font = 'bold 7px monospace';
    ctx.fillText('OBSOLETO', 0, 30);
  }

  ctx.restore();
}

export function drawPixelHouse(
  ctx: CanvasRenderingContext2D,
  house: House,
  isNight: boolean,
  isSelected: boolean,
  hasResidents: boolean,
  season: SimulationState['season'],
  shadow: { dx: number; dy: number; alpha: number },
  animPhase: number
): void {
  const x = Math.round(house.x);
  const y = Math.round(house.y);

  ctx.save();
  ctx.translate(x, y);

  const wallColors: Record<1 | 2 | 3 | 4, string> = {
    1: '#855e3c',
    2: '#a16a3e',
    3: '#94a3b8',
    4: '#cbd5e1',
  };
  const roofColors: Record<1 | 2 | 3 | 4, string> = {
    1: '#ca8a04',
    2: '#7c2d12',
    3: '#334155',
    4: '#0f766e',
  };

  const w = house.size === 'large' ? 54 : house.size === 'medium' ? 40 : 28;
  const h = house.size === 'large' ? 26 : house.size === 'medium' ? 20 : 16;

  // Sombra direccional solar
  ctx.fillStyle = `rgba(0,0,0,${shadow.alpha + 0.1})`;
  ctx.fillRect(-w / 2 - 2 + shadow.dx, h / 2 + 2 + Math.min(4, shadow.dy), w + 4, 6);

  ctx.fillStyle = wallColors[house.level];
  ctx.fillRect(-w / 2, -h / 2 + 4, w, h);

  ctx.fillStyle = roofColors[house.level];
  ctx.fillRect(-w / 2 - 4, -h / 2 - 2, w + 8, 7);
  ctx.fillRect(-w / 2 + 2, -h / 2 - 8, w - 4, 6);
  if (house.size === 'large') {
    ctx.fillRect(-w / 2 + 9, -h / 2 - 13, w - 18, 5);
  }

  if (season === 'Invierno') {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-w / 2 - 2, -h / 2 - 3, w + 4, 2);
    ctx.fillRect(-w / 2 + 4, -h / 2 - 9, w - 8, 2);
  }

  if (house.level >= 2 || house.size !== 'small') {
    ctx.fillStyle = '#475569';
    ctx.fillRect(w / 2 - 8, -h / 2 - 14, 5, 8);
    if (house.size === 'large') {
      ctx.fillRect(-w / 2 + 4, -h / 2 - 14, 5, 8);
    }
    if (hasResidents) {
      drawSmokePuffs(ctx, w / 2 - 6, -h / 2 - 16, animPhase + house.id * 0.27);
    }
  }

  ctx.fillStyle = '#451a03';
  const doorW = house.size === 'large' ? 10 : 6;
  ctx.fillRect(-doorW / 2, h / 2 - 6, doorW, 10);

  ctx.fillStyle = isNight ? (hasResidents ? '#fde047' : '#475569') : '#38bdf8';
  if (house.size === 'large') {
    ctx.fillRect(-w / 2 + 5, -5, 5, 5);
    ctx.fillRect(-w / 2 + 13, -5, 5, 5);
    ctx.fillRect(w / 2 - 18, -5, 5, 5);
    ctx.fillRect(w / 2 - 10, -5, 5, 5);
  } else if (house.size === 'medium') {
    ctx.fillRect(-w / 2 + 5, -3, 5, 5);
    ctx.fillRect(w / 2 - 10, -3, 5, 5);
  } else {
    ctx.fillRect(-w / 2 + 4, -2, 4, 4);
  }

  drawStructureWearOverlay(ctx, -w / 2, -h / 2 + 4, w, h, house.durability, house.maintenanceStatus);

  if (house.durability < 65) {
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-16, h / 2 + 5, 32, 3);
    ctx.fillStyle = house.durability < 35 ? '#ef4444' : '#f59e0b';
    ctx.fillRect(-16, h / 2 + 5, Math.round((32 * house.durability) / 100), 3);
  }

  if (isSelected) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2 - 6, -h / 2 - 16, w + 12, h + 28);
  }

  const sizeTag = house.size === 'large' ? 'G' : house.size === 'medium' ? 'M' : 'C';
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.fillRect(-13, -h / 2 - 25, 26, 9);
  ctx.fillStyle =
    house.maintenanceStatus && house.maintenanceStatus !== 'ok' ? '#fbbf24' : '#f8fafc';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`N${house.level}·${sizeTag}`, 0, -h / 2 - 18);

  if (house.maintenanceStatus && house.maintenanceStatus !== 'ok') {
    ctx.fillStyle = house.maintenanceStatus === 'ruined' ? 'rgba(127, 29, 29, 0.9)' : 'rgba(146, 64, 14, 0.9)';
    ctx.fillRect(-16, h / 2 + 9, 32, 8);
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 6px monospace';
    ctx.fillText(house.maintenanceStatus === 'ruined' ? 'RUINA' : 'DEUDA', 0, h / 2 + 15);
  }

  ctx.restore();
}

export function drawActiveConstructionScaffolding(
  ctx: CanvasRenderingContext2D,
  agent: Agent,
  animPhase: number,
  glintTick: number
): void {
  if (!agent.activeConstruction) return;
  const ac = agent.activeConstruction;
  const pct = clamp(ac.elapsed / Math.max(1, ac.totalDuration), 0, 1);

  // Cimientos, pila de materiales y andamios paso a paso
  ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
  ctx.fillRect(ac.x - 20, ac.y - 14, 40, 28);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ac.x - 20, ac.y - 14, 40, 28);

  // Postes y travesaños de andamio creciendo con el progreso
  ctx.fillStyle = '#92400e';
  ctx.fillRect(ac.x - 19, ac.y - 16, 3, 28);
  ctx.fillRect(ac.x + 16, ac.y - 16, 3, 28);
  if (pct >= 0.25) ctx.fillRect(ac.x - 19, ac.y - 2, 38, 2);
  if (pct >= 0.6) ctx.fillRect(ac.x - 19, ac.y - 12, 38, 2);

  // Pilas de madera y piedra en la esquina
  ctx.fillStyle = '#78350f';
  ctx.fillRect(ac.x - 24, ac.y + 8, 7, 4);
  ctx.fillStyle = '#94a3b8';
  ctx.fillRect(ac.x + 17, ac.y + 9, 6, 4);

  // Polvo/viruta animada cuando el constructor está trabajando encima
  if (Math.hypot(agent.x - ac.x, agent.y - ac.y) <= 46 && Math.floor(animPhase * 4) % 2 === 0) {
    ctx.fillStyle = '#fde68a';
    ctx.fillRect(ac.x - 4 + ((glintTick * 5) % 9), ac.y - 4, 2, 2);
    ctx.fillRect(ac.x + 4 - ((glintTick * 3) % 8), ac.y + 2, 2, 2);
  }

  // Barra de avance en el mapa
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(ac.x - 18, ac.y - 23, 36, 6);
  ctx.fillStyle = '#10b981';
  ctx.fillRect(ac.x - 17, ac.y - 22, Math.round(34 * pct), 4);
}

export function drawBuildingsAndFarms(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  isNight: boolean,
  occupiedHouseIds: Set<number>,
  shadow: { dx: number; dy: number; alpha: number },
  animPhase: number,
  selectedEntity: SelectedEntity | null
): void {
  for (const plot of state.farms) {
    const isSel = selectedEntity?.kind === 'farm' && selectedEntity.id === plot.id;
    drawFarmPlot(ctx, plot, isSel);
  }

  if (state.plaza) {
    drawCentralPlaza(
      ctx,
      state.plaza,
      state.minute,
      isNight,
      selectedEntity?.kind === 'plaza'
    );
  }

  const sortedHouses = [...state.houses].sort((a, b) => a.y - b.y);
  for (const house of sortedHouses) {
    const isSel = selectedEntity?.kind === 'house' && selectedEntity.id === house.id;
    drawPixelHouse(
      ctx,
      house,
      isNight,
      isSel,
      occupiedHouseIds.has(house.id),
      state.season,
      shadow,
      animPhase
    );
  }

  const sortedSpecials = [...state.specialBuildings].sort((a, b) => a.y - b.y);
  for (const b of sortedSpecials) {
    const isSel = selectedEntity?.kind === 'special' && selectedEntity.id === b.id;
    drawSpecialBuilding(ctx, b, isNight, isSel, state.season, shadow, animPhase);
  }
}

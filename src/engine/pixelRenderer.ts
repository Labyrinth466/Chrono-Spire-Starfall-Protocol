import { BossPartUnit, CombatHeroUnit, FloatingText } from './combatEngine.ts';
import { ELEMENT_META, ResonatorData } from '../data/resonators.ts';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export function drawPixelHeroSprite(
  ctx: CanvasRenderingContext2D,
  hero: ResonatorData,
  x: number,
  y: number,
  scale: number,
  time: number,
  isAttacking: boolean,
  hitFlash: number
) {
  ctx.save();
  const bob = Math.sin(time * 5 + x * 0.1) * 2.5;
  const lunge = isAttacking ? 14 : 0;
  ctx.translate(Math.round(x + lunge), Math.round(y + bob));

  // Ground shadow
  ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
  ctx.beginPath();
  ctx.ellipse(0, 26 * scale, 18 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Elemental underfoot aura ring
  ctx.strokeStyle = hero.colors.glow;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, 26 * scale, 21 * scale, 7 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();

  const p = 3 * scale; // Pixel block unit

  // Cloak / Back accessory (Wing or Fox tails or Cape)
  ctx.fillStyle = hitFlash > 0 ? '#ffffff' : hero.colors.primary;
  if (hero.id === 'H10') {
    // Nine-tailed wind fox tails (Kahori)
    ctx.fillStyle = hitFlash > 0 ? '#ffffff' : '#fde047';
    ctx.fillRect(-7 * p, -2 * p, 3 * p, 6 * p);
    ctx.fillRect(-9 * p, 0, 3 * p, 5 * p);
  } else if (hero.id === 'H13') {
    // Valkyrie Light Wings (Aurelia)
    ctx.fillStyle = hitFlash > 0 ? '#ffffff' : '#fef08a';
    ctx.fillRect(-8 * p, -6 * p, 4 * p, 7 * p);
    ctx.fillRect(-10 * p, -4 * p, 2 * p, 4 * p);
  } else {
    // Tactical cape
    ctx.fillRect(-6 * p, -2 * p, 4 * p, 8 * p);
  }

  // Boots / Legs
  ctx.fillStyle = hitFlash > 0 ? '#ffffff' : '#1e293b';
  ctx.fillRect(-3 * p, 4 * p, 2 * p, 4 * p);
  ctx.fillRect(1 * p, 4 * p, 2 * p, 4 * p);

  // Armor / Torso
  ctx.fillStyle = hitFlash > 0 ? '#ffffff' : hero.colors.primary;
  ctx.fillRect(-4 * p, -3 * p, 8 * p, 7 * p);

  // Trim / Chest emblem
  ctx.fillStyle = hitFlash > 0 ? '#ffffff' : hero.colors.secondary;
  ctx.fillRect(-2 * p, -2 * p, 4 * p, 3 * p);

  // Head / Face
  ctx.fillStyle = hitFlash > 0 ? '#ffffff' : '#fde68a';
  ctx.fillRect(-3 * p, -8 * p, 6 * p, 5 * p);

  // Eyes (looking right towards boss)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(1 * p, -6 * p, 1 * p, 1.5 * p);

  // Hair / Helmet
  ctx.fillStyle = hitFlash > 0 ? '#ffffff' : hero.colors.hair;
  ctx.fillRect(-4 * p, -10 * p, 8 * p, 3 * p);
  ctx.fillRect(-4 * p, -8 * p, 2 * p, 4 * p);

  // Fox ears for Kahori (H10) or Halo for Aurelia (H13)
  if (hero.id === 'H10') {
    ctx.fillRect(-3 * p, -12 * p, 2 * p, 2 * p);
    ctx.fillRect(1 * p, -12 * p, 2 * p, 2 * p);
  } else if (hero.id === 'H13') {
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-3 * p, -13 * p, 6 * p, 1 * p);
  }

  // Weapon (Right hand forward)
  ctx.fillStyle = hitFlash > 0 ? '#ffffff' : hero.colors.weapon;
  if (hero.id === 'H04') {
    // Heavy Tower Shield + Railgun Lance (Caelum)
    ctx.fillStyle = hitFlash > 0 ? '#ffffff' : '#38bdf8';
    ctx.fillRect(3 * p, -4 * p, 3 * p, 9 * p);
    ctx.fillStyle = hero.colors.weapon;
    ctx.fillRect(5 * p, -2 * p, 8 * p, 2 * p);
  } else if (hero.id === 'H01') {
    // Flame Greatsword (Kallen)
    ctx.fillRect(4 * p, -7 * p, 2 * p, 10 * p);
    ctx.fillStyle = '#fde047';
    ctx.fillRect(3 * p, 1 * p, 4 * p, 1.5 * p);
  } else if (hero.id === 'H16') {
    // Abyssal Chain Scythe (Noctis)
    ctx.fillRect(4 * p, -8 * p, 1.5 * p, 12 * p);
    ctx.fillRect(4 * p, -8 * p, 6 * p, 2 * p);
  } else {
    // Staff / Twin Blades / Bow
    ctx.fillRect(4 * p, -6 * p, 2 * p, 9 * p);
  }

  ctx.restore();
}

export function drawEldritchBossPart(
  ctx: CanvasRenderingContext2D,
  part: BossPartUnit,
  time: number,
  isFocused: boolean,
  isStaggered: boolean,
  isBerserk: boolean
) {
  if (!part.alive) return;
  ctx.save();
  const floatY = Math.sin(time * 3 + part.x * 0.05) * 4;
  ctx.translate(Math.round(part.x), Math.round(part.y + floatY));

  const p = part.id === 'BOSS_MAIN' ? 4.5 : 3.2;

  // Shadow
  ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
  ctx.beginPath();
  ctx.ellipse(0, 26 * p * 0.45, 16 * p * 0.5, 5 * p * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Berserk or Stagger Aura
  if (isBerserk) {
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 14 * p, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (part.id === 'TENTACLE_FRONT') {
    // Frontline Void Tentacle Pillar
    ctx.fillStyle = part.hitFlash > 0 ? '#ffffff' : '#3b0764';
    ctx.fillRect(-5 * p, -10 * p, 10 * p, 20 * p);
    ctx.fillStyle = part.hitFlash > 0 ? '#ffffff' : '#7e22ce';
    ctx.fillRect(-3 * p, -8 * p, 6 * p, 16 * p);
    // Glowing Void Runes
    ctx.fillStyle = part.tauntTimer > 0 ? '#f59e0b' : '#c084fc';
    ctx.fillRect(-2 * p, -5 * p, 4 * p, 2 * p);
    ctx.fillRect(-2 * p, 0, 4 * p, 2 * p);
    ctx.fillRect(-2 * p, 5 * p, 4 * p, 2 * p);
  } else if (part.id === 'BOSS_MAIN') {
    // Old God Core: Azathoth's Remnant
    const coreColor = part.hitFlash > 0 ? '#ffffff' : isStaggered ? '#f59e0b' : '#4c0519';
    const outerColor = part.hitFlash > 0 ? '#ffffff' : isStaggered ? '#78350f' : '#1e1b4b';
    // Outer cosmic carapace
    ctx.fillStyle = outerColor;
    ctx.fillRect(-10 * p, -12 * p, 20 * p, 22 * p);
    ctx.fillRect(-13 * p, -7 * p, 26 * p, 12 * p);
    // Crown horns
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(-9 * p, -16 * p, 3 * p, 4 * p);
    ctx.fillRect(6 * p, -16 * p, 3 * p, 4 * p);
    ctx.fillRect(-2 * p, -18 * p, 4 * p, 6 * p);
    // Inner Core
    ctx.fillStyle = coreColor;
    ctx.fillRect(-6 * p, -6 * p, 12 * p, 12 * p);
    // Central Cosmic Eye
    ctx.fillStyle = isBerserk ? '#ef4444' : '#38bdf8';
    ctx.fillRect(-3 * p, -3 * p, 6 * p, 6 * p);
    ctx.fillStyle = '#020617';
    ctx.fillRect(-1 * p, -2 * p, 2 * p, 4 * p);
  } else if (part.id === 'EYE_BACK') {
    // Eye of Madness (Backline Support)
    ctx.fillStyle = part.hitFlash > 0 ? '#ffffff' : '#311042';
    ctx.fillRect(-7 * p, -7 * p, 14 * p, 14 * p);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(-4 * p, -4 * p, 8 * p, 8 * p);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-2 * p, -2 * p, 4 * p, 4 * p);
  }

  // Aegis Shield bubble if active
  if (part.shield > 0) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 15 * p, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Manual Tap-to-Focus Reticle
  if (isFocused) {
    const pulse = 1 + Math.sin(time * 8) * 0.08;
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2.5;
    const r = 13 * p;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FOCUS TARGET', 0, -r - 6);
  }

  ctx.restore();
}

export function renderBattlefieldCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  heroes: CombatHeroUnit[],
  bossParts: BossPartUnit[],
  floatingTexts: FloatingText[],
  particles: Particle[],
  manualFocusId: string | null,
  isStaggered: boolean,
  isBerserk: boolean,
  shakeMag: number
) {
  ctx.save();
  if (shakeMag > 0.2) {
    const dx = (Math.random() - 0.5) * shakeMag * 2;
    const dy = (Math.random() - 0.5) * shakeMag * 2;
    ctx.translate(dx, dy);
  }

  // 1. HD-2D Starfall Spire Background Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
  if (isBerserk) {
    skyGrad.addColorStop(0, '#1f091d');
    skyGrad.addColorStop(0.55, '#2e0916');
    skyGrad.addColorStop(1, '#090514');
  } else {
    skyGrad.addColorStop(0, '#04091a');
    skyGrad.addColorStop(0.55, '#0f172a');
    skyGrad.addColorStop(1, '#020617');
  }
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height);

  // Starfield & Astral Rift
  ctx.fillStyle = isBerserk ? 'rgba(251, 113, 133, 0.35)' : 'rgba(148, 163, 184, 0.35)';
  for (let i = 0; i < 36; i++) {
    const sx = ((i * 97 + Math.floor(time * 6)) % width);
    const sy = ((i * 53) % Math.floor(height * 0.52));
    const sz = (i % 3) + 1;
    ctx.fillRect(sx, sy, sz, sz);
  }

  // Ancient Spire Pillars in background
  const horizonY = Math.round(height * 0.52);
  ctx.fillStyle = '#090d1f';
  for (let i = 0; i < 6; i++) {
    const px = Math.round((width / 6) * i + 40);
    ctx.fillRect(px, 30, 34, horizonY - 30);
    ctx.fillStyle = isBerserk ? 'rgba(244, 63, 94, 0.14)' : 'rgba(56, 189, 248, 0.12)';
    ctx.fillRect(px + 14, 50, 6, horizonY - 70);
    ctx.fillStyle = '#090d1f';
  }

  // Perspective Stone Arena Floor
  const floorGrad = ctx.createLinearGradient(0, horizonY, 0, height);
  floorGrad.addColorStop(0, isBerserk ? '#1e0b16' : '#0f172a');
  floorGrad.addColorStop(1, '#020617');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, horizonY, width, height - horizonY);

  // Tactical Grid Perspective Lines
  ctx.strokeStyle = isBerserk ? 'rgba(244, 63, 94, 0.16)' : 'rgba(148, 163, 184, 0.12)';
  ctx.lineWidth = 1;
  for (let row = 0; row <= 5; row++) {
    const ry = horizonY + Math.pow(row / 5, 1.35) * (height - horizonY - 20);
    ctx.beginPath();
    ctx.moveTo(0, ry);
    ctx.lineTo(width, ry);
    ctx.stroke();
  }

  // Divider between Hero Squad (Left) and Old Gods (Right)
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.18)';
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(width * 0.5, horizonY + 10);
  ctx.lineTo(width * 0.46, height - 15);
  ctx.stroke();
  ctx.setLineDash([]);

  // 2. Draw Heroes (sorted by Y for depth)
  const sortedHeroes = [...heroes].sort((a, b) => a.y - b.y);
  sortedHeroes.forEach((u) => {
    if (u.hp <= 0) return;
    drawPixelHeroSprite(
      ctx,
      u.data,
      u.x,
      u.y,
      1.1,
      time,
      u.animOffset > 0.05,
      u.hitFlash
    );

    // Compact World-Space HP + Shield + Energy Bar above Hero
    const bw = 54;
    const bx = Math.round(u.x - bw / 2);
    const by = Math.round(u.y - 48);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 11);

    const hpPct = Math.max(0, Math.min(1, u.hp / u.maxHp));
    ctx.fillStyle = hpPct > 0.35 ? '#10b981' : '#f43f5e';
    ctx.fillRect(bx, by, Math.round(bw * hpPct), 5);

    if (u.shield > 0) {
      const shPct = Math.min(1, u.shield / u.maxHp);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(bx, by, Math.round(bw * shPct), 2);
    }

    const enPct = Math.max(0, Math.min(1, u.energy / 100));
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(bx, by + 6, Math.round(bw * enPct), 3);

    if (u.lastActionTimer > 0 && u.lastActionLabel) {
      ctx.fillStyle = '#fde68a';
      ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(u.lastActionLabel, u.x, by - 6);
    }
  });

  // 3. Draw Boss Parts
  const sortedBoss = [...bossParts].sort((a, b) => a.y - b.y);
  sortedBoss.forEach((b) => {
    if (!b.alive) return;
    drawEldritchBossPart(
      ctx,
      b,
      time,
      manualFocusId === b.id,
      isStaggered && b.id === 'BOSS_MAIN',
      isBerserk
    );

    // Part HP bar & Debuff icons
    const bw = b.id === 'BOSS_MAIN' ? 110 : 78;
    const bx = Math.round(b.x - bw / 2);
    const by = Math.round(b.y - (b.id === 'BOSS_MAIN' ? 88 : 54));

    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 9);

    const hpPct = Math.max(0, Math.min(1, b.hp / b.maxHp));
    ctx.fillStyle = isStaggered && b.id === 'BOSS_MAIN' ? '#f59e0b' : '#e11d48';
    ctx.fillRect(bx, by, Math.round(bw * hpPct), 7);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.name, b.x, by - 5);

    // Active Debuff Text Indicators
    if (b.debuffs.length > 0) {
      const debuffStr = b.debuffs
        .map((d) => (d.stacks > 1 ? `${d.type} x${d.stacks}` : d.type))
        .join(' · ');
      ctx.fillStyle = '#38bdf8';
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillText(debuffStr, b.x, by + 20);
    }
    if (b.tauntTimer > 0) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.fillText(`TAUNT ${b.tauntTimer.toFixed(1)}s`, b.x, by - 17);
    }
  });

  // 4. Particles
  particles.forEach((pt) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.alpha);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
    ctx.restore();
  });

  // 5. Floating Combat Numbers
  floatingTexts.forEach((ft) => {
    ctx.save();
    const alpha = Math.min(1, (ft.life / ft.maxLife) * 1.6);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.font = `bold ${Math.round(13 * ft.scale)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#020617';
    ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    if (ft.subtext) {
      ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#fde68a';
      ctx.fillText(ft.subtext, ft.x, ft.y - 14);
    }
    ctx.restore();
  });

  ctx.restore();
}

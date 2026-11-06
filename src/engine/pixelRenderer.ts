import {
  BossPartUnit,
  CombatHeroUnit,
  FloatingText,
  HeroAnimState,
  ImpactShockwave,
} from './combatEngine.ts';
import { ELEMENT_META, RESONATORS, ResonatorData } from '../data/resonators.ts';

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

/**
 * Adjusts a hex color brightness by percentage (-100 to +100) for 3D Voxel Top & Side faces.
 */
function shadeVoxelHex(hex: string, percent: number): string {
  if (!hex || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) return hex;
  let fullHex = hex;
  if (hex.length === 4) {
    fullHex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  const num = parseInt(fullHex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `rgb(${r},${g},${b})`;
}

/**
 * Draws a 3D Extruded Isometric Voxel Block with Front Face, Lit Top Face, and Shaded Side Depth Face.
 */
function drawVoxelBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  depth: number,
  frontColor: string
) {
  const dx = depth * 0.65;
  const dy = -depth * 0.48;

  // 1. Shaded Right/Back Depth Face
  ctx.fillStyle = shadeVoxelHex(frontColor, -26);
  ctx.beginPath();
  ctx.moveTo(x + w, y);
  ctx.lineTo(x + w + dx, y + dy);
  ctx.lineTo(x + w + dx, y + h + dy);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();

  // 2. Lit Top Bevel Face
  ctx.fillStyle = shadeVoxelHex(frontColor, 26);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx, y + dy);
  ctx.lineTo(x + w + dx, y + dy);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();

  // 3. Primary Front Face
  ctx.fillStyle = frontColor;
  ctx.fillRect(x, y, w, h);
}

/**
 * Renders a 3D Extruded HD-2D Isometric Voxel Resonator Sprite (H01–H18)
 * on a 16x24 voxel grid with top-lit bevels, 3D side extrusion, perspective magic circles,
 * and Volumetric Glow slash/elemental burst effects.
 */
export function drawPixelHeroSprite(
  ctx: CanvasRenderingContext2D,
  hero: ResonatorData,
  x: number,
  y: number,
  scale: number,
  time: number,
  isAttacking: boolean,
  hitFlash: number,
  animState: HeroAnimState = isAttacking ? 'ATTACK_COMBO' : 'IDLE',
  animTimer: number = isAttacking ? 0.25 : 0,
  showElementalAura: boolean = false,
  auraIntensity: number = 0
) {
  ctx.save();

  const elMeta = ELEMENT_META[hero.element];
  const p = Math.max(2, 2.8 * scale); // Crisp HD-2D pixel block unit

  // Compute 6-pose animation offsets
  const breathBob = Math.sin(time * 4.8 + x * 0.05) * (1.8 * scale);
  const capeWave = Math.sin(time * 6.5 + x * 0.1) * p;
  let poseOffsetX = 0;
  let poseOffsetY = breathBob;
  let weaponAngle = 0;
  let showSlashArc = false;
  let showCastCircle = false;
  let showUltPillar = false;
  let showDashTrail = false;

  if (animState === 'RUN_DASH') {
    poseOffsetX = 24 * scale;
    poseOffsetY = -3 * scale;
    weaponAngle = 0.25;
    showDashTrail = true;
  } else if (animState === 'ATTACK_COMBO') {
    const swing = Math.sin(Math.min(1, animTimer * 4) * Math.PI);
    poseOffsetX = (18 + swing * 12) * scale;
    poseOffsetY = -4 * scale * swing;
    weaponAngle = -0.65 + swing * 1.35;
    showSlashArc = true;
  } else if (animState === 'SKILL_CAST') {
    poseOffsetX = 8 * scale;
    poseOffsetY = -7 * scale + Math.sin(time * 14) * 2;
    weaponAngle = -0.85;
    showCastCircle = true;
  } else if (animState === 'ULTIMATE_CAST') {
    poseOffsetX = 12 * scale;
    poseOffsetY = -16 * scale + Math.sin(time * 18) * 3;
    weaponAngle = -1.1;
    showCastCircle = true;
    showUltPillar = true;
  } else if (animState === 'STAGGER_HIT' || hitFlash > 0) {
    poseOffsetX = -10 * scale;
    poseOffsetY = 2 * scale;
    weaponAngle = 0.45;
  }

  const drawX = Math.round(x + poseOffsetX);
  const drawY = Math.round(y + poseOffsetY);
  const groundY = Math.round(y + 27 * scale);

  // 1. SOFT AMBIENT OCCLUSION ELLIPSE & FLOOR ELEMENTAL REFLECTION
  ctx.save();
  // Planar floor light reflection bloom
  const reflGrad = ctx.createRadialGradient(drawX, groundY, 2, drawX, groundY, 34 * scale);
  reflGrad.addColorStop(0, `${elMeta.color}44`);
  reflGrad.addColorStop(0.55, 'rgba(15, 23, 42, 0.25)');
  reflGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = reflGrad;
  ctx.beginPath();
  ctx.ellipse(drawX, groundY + 2 * scale, 32 * scale, 10 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Soft Ambient Occlusion shadow under feet
  const aoGrad = ctx.createRadialGradient(drawX, groundY, 1, drawX, groundY, 20 * scale);
  aoGrad.addColorStop(0, 'rgba(2, 6, 23, 0.88)');
  aoGrad.addColorStop(0.65, 'rgba(2, 6, 23, 0.52)');
  aoGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = aoGrad;
  ctx.beginPath();
  ctx.ellipse(drawX, groundY, 20 * scale, 6.5 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Planar inverted reflection silhouette on polished ruin stone
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = elMeta.color;
  ctx.fillRect(drawX - 4 * p, groundY + 2, 8 * p, 5 * p);
  ctx.fillRect(drawX - 2.5 * p, groundY + 7 * p, 5 * p, 3 * p);
  ctx.restore();

  // 2. 3D PERSPECTIVE ISOMETRIC MAGIC RING & SKILL/ULTIMATE RUNE CIRCLE
  ctx.save();
  ctx.translate(drawX, groundY);
  const ringR = (showCastCircle ? 27 : 20) * scale;
  const ringH = (showCastCircle ? 9.5 : 6.8) * scale;

  // Outer Volumetric Magic Ring Bloom
  ctx.strokeStyle = showCastCircle ? '#fde047' : elMeta.color;
  ctx.globalAlpha = showCastCircle ? 0.92 : 0.62;
  ctx.lineWidth = (showCastCircle ? 2.6 : 1.8) * scale;
  ctx.beginPath();
  ctx.ellipse(0, 0, ringR, ringH, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Inner Isometric Rune Ring + Perspective Rotating Glyphs
  ctx.strokeStyle = hero.colors.secondary;
  ctx.globalAlpha = showCastCircle ? 0.85 : 0.42;
  ctx.lineWidth = 1.2 * scale;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.ellipse(0, 0, ringR * 0.76, ringH * 0.76, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  for (let g = 0; g < 4; g++) {
    const gAng = time * 2.4 + (g * Math.PI) / 2;
    const gx = Math.cos(gAng) * ringR * 0.88;
    const gy = Math.sin(gAng) * ringH * 0.88;
    drawVoxelBox(ctx, gx - 1.2 * scale, gy - 1.2 * scale, 2.4 * scale, 2.4 * scale, 2 * scale, showCastCircle ? '#fde047' : elMeta.color);
  }
  ctx.restore();

  // Ultimate Pillar of Light
  if (showUltPillar) {
    ctx.save();
    const pilGrad = ctx.createLinearGradient(drawX - 24 * scale, drawY - 60 * scale, drawX + 24 * scale, groundY);
    pilGrad.addColorStop(0, 'rgba(253, 224, 71, 0)');
    pilGrad.addColorStop(0.5, `${elMeta.color}55`);
    pilGrad.addColorStop(1, 'rgba(253, 224, 71, 0.45)');
    ctx.fillStyle = pilGrad;
    ctx.fillRect(drawX - 22 * scale, drawY - 65 * scale, 44 * scale, 95 * scale);
    ctx.restore();
  }

  // Dash Afterimage Ghost
  if (showDashTrail) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.translate(Math.round(drawX - 18 * scale), drawY);
    ctx.fillStyle = elMeta.color;
    ctx.fillRect(-4 * p, -8 * p, 8 * p, 14 * p);
    ctx.restore();
  }

  // Translate to Character Center
  ctx.translate(drawX, drawY);

  // 2.5 DISTINCT 6-ELEMENT RADIAL AURA PULSE (Triggered when Buffed or Energy >= 50%)
  if (showElementalAura) {
    ctx.save();
    const pulseWave = 0.5 + 0.5 * Math.sin(time * 5.5 + x * 0.03);
    const baseRadius = (24 + pulseWave * 7) * scale * (0.85 + auraIntensity * 0.25);
    const auraAlpha = Math.min(0.85, (0.28 + auraIntensity * 0.28) * (0.8 + pulseWave * 0.2));

    // Radial Aura Bloom Gradient
    const auraGrad = ctx.createRadialGradient(0, -2 * p, 2 * scale, 0, -2 * p, baseRadius);
    if (hero.element === 'Fire') {
      auraGrad.addColorStop(0, 'rgba(251, 146, 60, 0.55)');
      auraGrad.addColorStop(0.55, 'rgba(239, 68, 68, 0.28)');
      auraGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
    } else if (hero.element === 'Cryo') {
      auraGrad.addColorStop(0, 'rgba(186, 230, 253, 0.55)');
      auraGrad.addColorStop(0.55, 'rgba(56, 189, 248, 0.28)');
      auraGrad.addColorStop(1, 'rgba(14, 165, 233, 0)');
    } else if (hero.element === 'Electro') {
      auraGrad.addColorStop(0, 'rgba(233, 213, 255, 0.58)');
      auraGrad.addColorStop(0.55, 'rgba(192, 132, 252, 0.30)');
      auraGrad.addColorStop(1, 'rgba(147, 51, 234, 0)');
    } else if (hero.element === 'Wind') {
      auraGrad.addColorStop(0, 'rgba(167, 243, 208, 0.52)');
      auraGrad.addColorStop(0.55, 'rgba(52, 211, 153, 0.26)');
      auraGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');
    } else if (hero.element === 'Light') {
      auraGrad.addColorStop(0, 'rgba(254, 240, 138, 0.62)');
      auraGrad.addColorStop(0.55, 'rgba(251, 191, 36, 0.30)');
      auraGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    } else {
      // Dark
      auraGrad.addColorStop(0, 'rgba(192, 132, 252, 0.52)');
      auraGrad.addColorStop(0.55, 'rgba(88, 28, 135, 0.38)');
      auraGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
    }

    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, -2 * p, baseRadius, 0, Math.PI * 2);
    ctx.fill();

    // Element-Specific Radial Pulse Geometry
    ctx.globalAlpha = auraAlpha;
    ctx.strokeStyle = auraIntensity >= 0.99 ? '#fde047' : elMeta.color;
    ctx.fillStyle = elMeta.color;
    ctx.lineWidth = (1.4 + auraIntensity * 0.6) * scale;

    if (hero.element === 'Fire') {
      // Rising solar-crimson flame tongues around torso
      for (let f = 0; f < 5; f++) {
        const flameAng = (f * Math.PI * 2) / 5 + time * 2.2;
        const fx = Math.cos(flameAng) * (15 * scale);
        const fy = Math.sin(flameAng) * (10 * scale) - ((time * 22 + f * 9) % (14 * scale));
        ctx.beginPath();
        ctx.moveTo(fx, fy - 5 * scale);
        ctx.quadraticCurveTo(fx + 3.5 * scale, fy, fx, fy + 4 * scale);
        ctx.quadraticCurveTo(fx - 3.5 * scale, fy, fx, fy - 5 * scale);
        ctx.fill();
      }
    } else if (hero.element === 'Cryo') {
      // Rotating hexagonal frost ring & 4 crystalline diamond shards
      for (let c = 0; c < 4; c++) {
        const cAng = time * 1.6 + (c * Math.PI) / 2;
        const cx = Math.cos(cAng) * 18 * scale;
        const cy = Math.sin(cAng) * 12 * scale - 2 * p;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 4 * scale);
        ctx.lineTo(cx + 2.6 * scale, cy);
        ctx.lineTo(cx, cy + 4 * scale);
        ctx.lineTo(cx - 2.6 * scale, cy);
        ctx.closePath();
        ctx.stroke();
      }
    } else if (hero.element === 'Electro') {
      // Crackling radial electric arcs
      for (let l = 0; l < 4; l++) {
        const lAng = time * 6 + (l * Math.PI) / 2;
        const r1 = 11 * scale;
        const r2 = 20 * scale;
        ctx.beginPath();
        ctx.moveTo(Math.cos(lAng) * r1, Math.sin(lAng) * r1 - 2 * p);
        ctx.lineTo(Math.cos(lAng + 0.22) * ((r1 + r2) * 0.5), Math.sin(lAng + 0.22) * ((r1 + r2) * 0.5) - 2 * p);
        ctx.lineTo(Math.cos(lAng - 0.12) * r2, Math.sin(lAng - 0.12) * r2 - 2 * p);
        ctx.stroke();
      }
    } else if (hero.element === 'Wind') {
      // Sweeping emerald spiral vortex crescents
      for (let w = 0; w < 3; w++) {
        const wStart = time * 3.8 + (w * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(0, -2 * p, (15 + w * 2.5) * scale, wStart, wStart + Math.PI * 0.65);
        ctx.stroke();
      }
    } else if (hero.element === 'Light') {
      // Radiant solar halo + 4-point celestial cross rays
      ctx.beginPath();
      ctx.arc(0, -2 * p, 17 * scale + pulseWave * 3 * scale, 0, Math.PI * 2);
      ctx.stroke();
      for (let r = 0; r < 4; r++) {
        const rAng = time * 1.1 + (r * Math.PI) / 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(rAng) * 10 * scale, Math.sin(rAng) * 10 * scale - 2 * p);
        ctx.lineTo(Math.cos(rAng) * 23 * scale, Math.sin(rAng) * 23 * scale - 2 * p);
        ctx.stroke();
      }
    } else {
      // Dark: Counter-rotating abyssal eclipse rings
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(0, -2 * p, 17 * scale, -time * 2.4, -time * 2.4 + Math.PI * 1.6);
      ctx.stroke();
      ctx.strokeStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(0, -2 * p, 21 * scale, time * 1.8, time * 1.8 + Math.PI * 1.4);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  // 3. 3D VOXEL ELEMENTAL ORBITAL CUBES (6 Elements)
  ctx.save();
  for (let m = 0; m < 3; m++) {
    const ang = time * 3.2 + (m * Math.PI * 2) / 3;
    const ox = Math.cos(ang) * 6.8 * p;
    const oy = Math.sin(ang) * 2.6 * p - 2 * p;
    const moteColor = m % 2 === 0 ? elMeta.color : hero.colors.secondary;
    drawVoxelBox(ctx, ox, oy, 1.5 * p, 1.5 * p, 1.4 * p, moteColor);
  }
  ctx.restore();

  const flashWhite = hitFlash > 0.02;
  const cPrimary = flashWhite ? '#ffffff' : hero.colors.primary;
  const cSecondary = flashWhite ? '#ffffff' : hero.colors.secondary;
  const cHair = flashWhite ? '#ffffff' : hero.colors.hair;
  const cWeapon = flashWhite ? '#ffffff' : hero.colors.weapon;
  const vDepth = 2.2 * p; // 3D Voxel extrusion thickness

  // 4. 3D VOXEL BACK ACCESSORY / WINGS / NINE-TAILS / FLOWING CLOAK
  if (hero.id === 'H10') {
    // Kahori: 3D Extruded Nine-Tailed Fox Spirit Tails
    for (let t = 0; t < 4; t++) {
      const tailY = (-4 + t * 2.2) * p + capeWave * 0.4;
      drawVoxelBox(
        ctx,
        (-8 - (t % 2) * 2) * p,
        tailY,
        4 * p,
        2.2 * p,
        vDepth * 0.85,
        flashWhite ? '#ffffff' : '#fde047'
      );
      drawVoxelBox(
        ctx,
        (-9.2 - (t % 2) * 2) * p,
        tailY,
        1.5 * p,
        1.5 * p,
        vDepth * 0.7,
        flashWhite ? '#ffffff' : '#34d399'
      );
    }
  } else if (hero.id === 'H13' || hero.id === 'H14') {
    // Aurelia / Solarius: 3D Extruded Seraphic Solar Wings
    const wingCol = flashWhite ? '#ffffff' : '#fef08a';
    drawVoxelBox(ctx, -9.5 * p, -7 * p + capeWave * 0.3, 5.2 * p, 2 * p, vDepth * 0.8, wingCol);
    drawVoxelBox(ctx, -11.5 * p, -4.8 * p + capeWave * 0.5, 6.2 * p, 2 * p, vDepth * 0.8, wingCol);
    drawVoxelBox(ctx, -8.5 * p, -2.6 * p + capeWave * 0.4, 4.2 * p, 2 * p, vDepth * 0.8, wingCol);
  } else if (hero.id === 'H17' || hero.id === 'H18') {
    // Malakor / Vespera: 3D Abyssal Shadow Mantle
    drawVoxelBox(ctx, -8 * p, -4 * p, 5 * p, 10 * p + capeWave * 0.5, vDepth, flashWhite ? '#ffffff' : '#311042');
    drawVoxelBox(ctx, -9.2 * p, -2 * p, 2.2 * p, 7 * p, vDepth * 0.8, cPrimary);
  } else {
    // Flowing 3D Voxel Tactical Cloak
    drawVoxelBox(ctx, -6.5 * p, -2 * p, 4 * p, 8 * p, vDepth * 0.85, cPrimary);
    drawVoxelBox(ctx, -8.2 * p, 1 * p + capeWave * 0.35, 3 * p, 5.5 * p, vDepth * 0.75, cSecondary);
  }

  // 5. 3D VOXEL LEGS & ARMORED GREAVES
  const legStride = animState === 'RUN_DASH' || animState === 'ATTACK_COMBO' ? 1.5 * p : 0;
  const legCol = flashWhite ? '#ffffff' : '#1e293b';
  drawVoxelBox(ctx, -3 * p - legStride * 0.5, 4 * p, 2.3 * p, 4.5 * p, vDepth * 0.85, legCol);
  drawVoxelBox(ctx, 1 * p + legStride * 0.5, 4 * p, 2.3 * p, 4.5 * p, vDepth * 0.85, legCol);
  drawVoxelBox(ctx, -3.1 * p - legStride * 0.5, 7 * p, 2.5 * p, 1.6 * p, vDepth * 0.9, cSecondary);
  drawVoxelBox(ctx, 0.9 * p + legStride * 0.5, 7 * p, 2.5 * p, 1.6 * p, vDepth * 0.9, cSecondary);

  // 6. 3D VOXEL TORSO ARMOR, PAULDRONS & CHEST CORE (16x24 Grid)
  drawVoxelBox(ctx, -4 * p, -3.5 * p, 8 * p, 7.5 * p, vDepth, flashWhite ? '#ffffff' : '#1e293b');
  drawVoxelBox(ctx, -3.2 * p, -3 * p, 6.4 * p, 6 * p, vDepth * 1.05, cPrimary);
  // 3D Pauldrons & Chest Core
  drawVoxelBox(ctx, -5 * p, -3.6 * p, 2.2 * p, 2.6 * p, vDepth * 1.1, cSecondary);
  drawVoxelBox(ctx, 2.8 * p, -3.6 * p, 2.2 * p, 2.6 * p, vDepth * 1.1, cSecondary);
  drawVoxelBox(ctx, -1.5 * p, -1.6 * p, 3 * p, 2.6 * p, vDepth * 0.6, elMeta.color);

  // 7. 3D VOXEL HEAD, EXPRESSIVE EYES & 3D LAYERED HAIRSTYLE
  drawVoxelBox(ctx, -3 * p, -8.5 * p, 6 * p, 5 * p, vDepth * 1.05, flashWhite ? '#ffffff' : '#fde68a');

  // Eyes (glowing in Ultimate state)
  ctx.fillStyle = animState === 'ULTIMATE_CAST' ? elMeta.color : '#0f172a';
  ctx.fillRect(0.6 * p, -6.5 * p, 1.2 * p, 1.6 * p);
  ctx.fillRect(2.1 * p, -6.5 * p, 1 * p, 1.6 * p);

  // 3D Extruded Crown, Side Locks & Front Bangs
  drawVoxelBox(ctx, -4.1 * p, -10.6 * p, 8.2 * p, 2.8 * p, vDepth * 1.15, cHair);
  drawVoxelBox(ctx, -4.6 * p, -8.5 * p, 2.3 * p, 5.6 * p, vDepth * 1.1, cHair);
  drawVoxelBox(ctx, 2.1 * p, -9.2 * p, 2.1 * p, 2.3 * p, vDepth * 0.7, cHair);

  // Character-Specific 3D Headgear / Ears / Horns / Halo
  if (hero.id === 'H10') {
    drawVoxelBox(ctx, -3.2 * p, -13 * p, 2 * p, 2.5 * p, vDepth * 0.8, cHair);
    drawVoxelBox(ctx, 1.2 * p, -13 * p, 2 * p, 2.5 * p, vDepth * 0.8, cHair);
  } else if (hero.id === 'H13' || hero.id === 'H15') {
    drawVoxelBox(ctx, -3.6 * p, -13.4 * p, 7.2 * p, 1.3 * p, vDepth * 0.9, '#fbbf24');
  } else if (hero.id === 'H04' || hero.id === 'H09' || hero.id === 'H14') {
    drawVoxelBox(ctx, -1.2 * p, -12.2 * p, 2.6 * p, 2.2 * p, vDepth * 0.9, cSecondary);
  } else if (hero.id === 'H07' || hero.id === 'H03' || hero.id === 'H06') {
    drawVoxelBox(ctx, -6.8 * p, -8 * p + capeWave * 0.25, 2.6 * p, 5.2 * p, vDepth * 0.9, cHair);
  } else if (hero.id === 'H17') {
    drawVoxelBox(ctx, -4 * p, -13.2 * p, 1.9 * p, 2.9 * p, vDepth * 0.85, '#f43f5e');
    drawVoxelBox(ctx, 2.2 * p, -13.2 * p, 1.9 * p, 2.9 * p, vDepth * 0.85, '#f43f5e');
  }

  // 8. 3D VOXEL SIGNATURE WEAPON & VOLUMETRIC SLASH BLOOM
  ctx.save();
  ctx.translate(3 * p, -1 * p);
  ctx.rotate(weaponAngle);

  const wDepth = 1.6 * p;
  if (hero.id === 'H01' || hero.id === 'H17') {
    // 3D Colossal Greatsword / Cleaver
    drawVoxelBox(ctx, 1 * p, -9.5 * p, 2.8 * p, 13.5 * p, wDepth, cWeapon);
    drawVoxelBox(ctx, 1.6 * p, -8.2 * p, 1.3 * p, 10.2 * p, wDepth * 0.6, elMeta.color);
    drawVoxelBox(ctx, -0.6 * p, 2 * p, 5.8 * p, 1.6 * p, wDepth * 1.1, '#fde047');
  } else if (hero.id === 'H04' || hero.id === 'H09') {
    // 3D Heavy Aegis Tower Shield + Railgun Lance
    drawVoxelBox(ctx, 3.5 * p, -2.2 * p, 9.2 * p, 2.2 * p, wDepth, cSecondary);
    drawVoxelBox(ctx, 0, -5.2 * p, 4 * p, 10.4 * p, wDepth * 1.25, flashWhite ? '#ffffff' : '#1e293b');
    drawVoxelBox(ctx, 0.8 * p, -4 * p, 2.3 * p, 8 * p, wDepth * 0.8, elMeta.color);
  } else if (hero.id === 'H16') {
    // 3D Abyssal Chain Scythe
    drawVoxelBox(ctx, 1.5 * p, -10.5 * p, 1.6 * p, 14.5 * p, wDepth, cWeapon);
    drawVoxelBox(ctx, 1.5 * p, -10.5 * p, 7.2 * p, 2.5 * p, wDepth, elMeta.color);
    drawVoxelBox(ctx, 6.6 * p, -8 * p, 2.1 * p, 2.6 * p, wDepth * 0.8, elMeta.color);
  } else if (hero.role === 'Ranged DPS' || hero.id === 'H12' || hero.id === 'H13') {
    // 3D Astral Bow / Plasma Rifle
    drawVoxelBox(ctx, 1 * p, -5.5 * p, 1.8 * p, 11 * p, wDepth * 0.9, cWeapon);
    drawVoxelBox(ctx, 1.2 * p, -0.8 * p, 7.4 * p, 1.6 * p, wDepth * 0.8, elMeta.color);
  } else {
    // 3D Twin Elemental Blades / Chrono Staff
    drawVoxelBox(ctx, 1.5 * p, -7.8 * p, 2.2 * p, 11.4 * p, wDepth, cWeapon);
    drawVoxelBox(ctx, 0.7 * p, -9.4 * p, 3.6 * p, 3.2 * p, wDepth * 1.1, elMeta.color);
  }

  // Dynamic Volumetric Weapon Slash Crescent + Voxel Sparks on ATTACK_COMBO or ULTIMATE_CAST
  if (showSlashArc || animState === 'ULTIMATE_CAST') {
    ctx.save();
    ctx.shadowColor = elMeta.color;
    ctx.shadowBlur = 12 * scale;
    ctx.strokeStyle = elMeta.color;
    ctx.lineWidth = 4.2 * scale;
    ctx.beginPath();
    ctx.arc(2.2 * p, 0, 10 * p, -Math.PI * 0.58, Math.PI * 0.48);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8 * scale;
    ctx.beginPath();
    ctx.arc(2.6 * p, 0, 8.8 * p, -Math.PI * 0.42, Math.PI * 0.36);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
  ctx.restore();
}

/**
 * Renders the Articulated Multi-Part Old God Boss:
 * - BOSS_MAIN: Old God Core (Azathoth's Remnant) with 5-Bar Crystalline Stagger Ring & Crack FX
 * - TENTACLE_FRONT: Articulated Left Void Arm (Front Guard)
 * - RIGHT_ARM: Articulated Right Abyssal Crusher Claw
 * - EYE_BACK: Orbiting Cosmic Eye of Madness
 */
export function drawEldritchBossPart(
  ctx: CanvasRenderingContext2D,
  part: BossPartUnit,
  time: number,
  isFocused: boolean,
  isStaggered: boolean,
  isBerserk: boolean,
  staggerSegments: number = 5,
  currentSegmentBp: number = 100,
  maxSegmentBp: number = 100,
  staggerWarningTimer: number = 0
) {
  if (!part.alive) return;
  ctx.save();

  const floatY = Math.sin(time * 2.8 + part.x * 0.04) * (part.id === 'BOSS_MAIN' ? 6 : 4);
  const recoilX = part.hitFlash > 0 ? 7 : 0;
  const drawX = Math.round(part.x + recoilX);
  const drawY = Math.round(part.y + floatY);
  const p = part.id === 'BOSS_MAIN' ? 4.6 : 3.3;

  // 1. Soft Ambient Occlusion Ground Shadow & Eldritch Floor Glow
  const groundY = Math.round(part.y + 28 * p * 0.45);
  const shadowGrad = ctx.createRadialGradient(drawX, groundY, 2, drawX, groundY, 18 * p * 0.55);
  shadowGrad.addColorStop(0, isBerserk ? 'rgba(225, 29, 72, 0.55)' : 'rgba(88, 28, 135, 0.55)');
  shadowGrad.addColorStop(0.6, 'rgba(2, 6, 23, 0.75)');
  shadowGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.ellipse(drawX, groundY, 18 * p * 0.55, 6 * p * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(drawX, drawY);

  // Berserk Pulsing Aura
  if (isBerserk) {
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 14.5 * p, time * 2, time * 2 + Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const flash = part.hitFlash > 0.02;

  if (part.id === 'TENTACLE_FRONT') {
    // LEFT ARM: Articulated Multi-Jointed Void Tentacle Bastion
    for (let seg = 0; seg < 5; seg++) {
      const jointWave = Math.sin(time * 4.2 + seg * 0.7) * (seg * 2.4);
      const sy = (8 - seg * 4.2) * p;
      const sw = (10 - seg * 1.1) * p;
      ctx.fillStyle = flash ? '#ffffff' : seg % 2 === 0 ? '#3b0764' : '#581c87';
      ctx.fillRect(-sw / 2 + jointWave, sy, sw, 4.4 * p);
      // Glowing Runic Node on each joint
      ctx.fillStyle = part.tauntTimer > 0 ? '#fbbf24' : '#c084fc';
      ctx.fillRect(-1.8 * p + jointWave, sy + 1 * p, 3.6 * p, 1.8 * p);
    }
  } else if (part.id === 'RIGHT_ARM') {
    // RIGHT ARM: Articulated Abyssal Crusher Claw
    const armSwing = Math.sin(time * 3.6) * 5;
    // Shoulder & Forearm joints
    ctx.fillStyle = flash ? '#ffffff' : '#1e1b4b';
    ctx.fillRect(-4 * p, -8 * p, 8 * p, 7 * p);
    ctx.fillStyle = flash ? '#ffffff' : '#4c0519';
    ctx.fillRect(-6 * p + armSwing * 0.5, -2 * p, 10 * p, 8 * p);
    // Articulated Plasma Pincers
    ctx.fillStyle = flash ? '#ffffff' : '#f43f5e';
    ctx.fillRect(-9 * p + armSwing, 2 * p, 4 * p, 7 * p);
    ctx.fillRect(-1 * p + armSwing, 3 * p, 3.5 * p, 6 * p);
  } else if (part.id === 'BOSS_MAIN') {
    // CORE: Old God Azathoth's Remnant with Articulated Crown & Crystalline Armor
    const wingBeat = Math.sin(time * 3.2) * 4;
    const coreColor = flash ? '#ffffff' : isStaggered ? '#f59e0b' : '#4c0519';
    const outerColor = flash ? '#ffffff' : isStaggered ? '#78350f' : '#1e1b4b';

    // Articulated Floating Cosmic Wings
    ctx.fillStyle = flash ? '#ffffff' : '#311042';
    ctx.fillRect(-16 * p, -10 * p + wingBeat, 5 * p, 16 * p);
    ctx.fillRect(11 * p, -10 * p - wingBeat, 5 * p, 16 * p);

    // Outer Carapace Monolith
    ctx.fillStyle = outerColor;
    ctx.fillRect(-10 * p, -12 * p, 20 * p, 22 * p);
    ctx.fillRect(-13 * p, -7 * p, 26 * p, 12 * p);

    // Crown Horns
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(-9 * p, -17 * p, 3 * p, 5 * p);
    ctx.fillRect(6 * p, -17 * p, 3 * p, 5 * p);
    ctx.fillRect(-2.5 * p, -19 * p, 5 * p, 7 * p);

    // Inner Eldritch Heart Core
    ctx.fillStyle = coreColor;
    ctx.fillRect(-6.5 * p, -6.5 * p, 13 * p, 13 * p);

    // Central All-Seeing Cosmic Eye
    ctx.fillStyle = isBerserk ? '#ef4444' : isStaggered ? '#fde047' : '#38bdf8';
    ctx.fillRect(-3.5 * p, -3.5 * p, 7 * p, 7 * p);
    ctx.fillStyle = '#020617';
    ctx.fillRect(-1 * p, -2.5 * p, 2 * p, 5 * p);

    // CRACK / FRACTURE EFFECT ON CORE BASED ON BROKEN STAGGER BARS (ONLY DURING SKILL CHARGE OR STAGGERED)
    const brokenBars = 5 - staggerSegments;
    if ((staggerWarningTimer > 0 && brokenBars > 0) || isStaggered) {
      ctx.strokeStyle = isStaggered ? '#fde047' : '#38bdf8';
      ctx.lineWidth = isStaggered ? 2.5 : 1.8;
      for (let c = 0; c < Math.max(brokenBars, isStaggered ? 5 : 0); c++) {
        const ang = (c * Math.PI * 2) / 5 + 0.3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * 6 * p, Math.sin(ang) * 6 * p);
        ctx.lineTo(Math.cos(ang + 0.25) * 11 * p, Math.sin(ang + 0.25) * 11 * p);
        ctx.stroke();
      }
    }
  } else if (part.id === 'EYE_BACK') {
    // COSMIC EYE: Orbiting Ocular Sentinel
    ctx.rotate(Math.sin(time * 2.5) * 0.15);
    ctx.fillStyle = flash ? '#ffffff' : '#311042';
    ctx.fillRect(-7 * p, -7 * p, 14 * p, 14 * p);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(-4.5 * p, -4.5 * p, 9 * p, 9 * p);
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-2 * p, -2 * p, 4 * p, 4 * p);
  } else if (part.rivalHeroId) {
    // 1v1 ASYNC ARENA RIVAL RESONATOR (Flipped Horizontally)
    const rHero = RESONATORS.find((r) => r.id === part.rivalHeroId) || RESONATORS[0];
    ctx.restore();
    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.scale(-1, 1);
    drawPixelHeroSprite(
      ctx,
      rHero,
      0,
      0,
      1.08,
      time + 1.2,
      part.attackTimer < 0.35,
      part.hitFlash,
      part.attackTimer < 0.35 ? 'ATTACK_COMBO' : 'IDLE',
      0.2
    );
  } else {
    // VOID MINIONS (MINION_1 Vanguard Husk, MINION_2 Starfall Stalker, MINION_3 Chrono Wraith)
    const bob = Math.sin(time * 5 + (part.id === 'MINION_2' ? 1.5 : 0)) * 2.5;
    ctx.fillStyle = flash ? '#ffffff' : part.id === 'MINION_1' ? '#311042' : part.id === 'MINION_2' ? '#1e1b4b' : '#3b0764';
    ctx.fillRect(-6 * p, -8 * p + bob, 12 * p, 14 * p);
    // Horned Void Crest
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(-7 * p, -11 * p + bob, 3 * p, 4 * p);
    ctx.fillRect(4 * p, -11 * p + bob, 3 * p, 4 * p);
    // Glowing Abyssal Visor Eye
    ctx.fillStyle = isStaggered ? '#fde047' : '#38bdf8';
    ctx.fillRect(-3.5 * p, -4 * p + bob, 7 * p, 2.5 * p);
    // Claws / Weapon Appendages
    ctx.fillStyle = flash ? '#ffffff' : '#f43f5e';
    ctx.fillRect(-9 * p, -2 * p - bob, 2.5 * p, 6 * p);
    ctx.fillRect(6.5 * p, -2 * p - bob, 2.5 * p, 6 * p);
  }

  // Aegis Shield bubble if active
  if (part.shield > 0) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 15 * p, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Manual Tap-to-Focus Reticle (subtle corner brackets, no text over sprite)
  if (isFocused) {
    const pulse = 1 + Math.sin(time * 8) * 0.05;
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    const r = 12 * p;
    ctx.strokeRect(-r, -r, r * 2, r * 2);
  }

  ctx.restore();
}

export interface ZoneParallaxLayerAssets {
  name: string;
  subtitle: string;
  skyImg: HTMLImageElement | null;
  farBgImg: HTMLImageElement | null;
  midArchImg: HTMLImageElement | null;
  floorImg: HTMLImageElement | null;
}

/**
 * 5-Zone Swappable Parallax Asset Slots (F1-20, F21-40, F41-60, F61-80, F81-100+).
 * Each layer checks for a loaded HTMLImageElement first; if null, falls back to procedural 16-bit pixel art.
 */
export const ZONE_PARALLAX_ASSETS: Record<number, ZoneParallaxLayerAssets> = {
  0: {
    name: 'Starfall Forest Base',
    subtitle: 'Floors 1–20 · Luminescent Pines & Runic Stone Altar',
    skyImg: null,
    farBgImg: null,
    midArchImg: null,
    floorImg: null,
  },
  1: {
    name: 'Stormcrag Frost Peaks',
    subtitle: 'Floors 21–40 · Blizzard Terrace & Electro Storm Braziers',
    skyImg: null,
    farBgImg: null,
    midArchImg: null,
    floorImg: null,
  },
  2: {
    name: 'Aether Cloudsea Sanctum',
    subtitle: 'Floors 41–60 · Golden Sea of Clouds & Floating Marble Arches',
    skyImg: null,
    farBgImg: null,
    midArchImg: null,
    floorImg: null,
  },
  3: {
    name: 'Astral Stratosphere Orbit',
    subtitle: 'Floors 61–80 · Planetary Horizon, Celestial Rings & Meteor Belt',
    skyImg: null,
    farBgImg: null,
    midArchImg: null,
    floorImg: null,
  },
  4: {
    name: 'Abyssal Singularity Summit',
    subtitle: 'Floors 81–100+ · Violet-Gold Event Horizon & Void Monoliths',
    skyImg: null,
    farBgImg: null,
    midArchImg: null,
    floorImg: null,
  },
};

export function setZoneParallaxAsset(
  zoneIdx: number,
  layer: 'skyImg' | 'farBgImg' | 'midArchImg' | 'floorImg',
  imgUrl: string | null
): void {
  const slot = ZONE_PARALLAX_ASSETS[zoneIdx];
  if (!slot) return;
  if (!imgUrl) {
    slot[layer] = null;
    return;
  }
  const img = new Image();
  img.src = imgUrl;
  slot[layer] = img;
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
  shakeMag: number,
  staggerSegments: number = 5,
  currentSegmentBp: number = 100,
  maxSegmentBp: number = 100,
  shockwaves: ImpactShockwave[] = [],
  staggerWarningTimer: number = 0,
  floor: number = 1
) {
  ctx.save();
  if (shakeMag > 0.2) {
    const dx = (Math.random() - 0.5) * shakeMag * 2;
    const dy = (Math.random() - 0.5) * shakeMag * 2;
    ctx.translate(dx, dy);
  }

  const horizonY = Math.round(height * 0.5);
  const zoneIdx = Math.min(4, Math.max(0, Math.floor((Math.max(1, floor) - 1) / 20)));
  const zoneAsset = ZONE_PARALLAX_ASSETS[zoneIdx] || ZONE_PARALLAX_ASSETS[0];

  // ============================================================================
  // 1. SKY LAYER (0.1x PARALLAX SPEED) — SWAPPABLE OR PROCEDURAL BY ZONE (0..4)
  // ============================================================================
  if (zoneAsset.skyImg && zoneAsset.skyImg.complete && zoneAsset.skyImg.naturalWidth > 0) {
    const scrollX = (time * 12 * 0.1) % width;
    ctx.drawImage(zoneAsset.skyImg, -scrollX, 0, width, horizonY);
    ctx.drawImage(zoneAsset.skyImg, width - scrollX, 0, width, horizonY);
  } else {
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY + 20);
    if (isBerserk) {
      skyGrad.addColorStop(0, '#190418');
      skyGrad.addColorStop(0.5, '#2e0819');
      skyGrad.addColorStop(1, '#080312');
    } else if (zoneIdx === 0) {
      // Zone 0: Starfall Forest Base — Emerald-Indigo Night Canopy
      skyGrad.addColorStop(0, '#021019');
      skyGrad.addColorStop(0.55, '#06283d');
      skyGrad.addColorStop(1, '#071c29');
    } else if (zoneIdx === 1) {
      // Zone 1: Stormcrag Frost Peaks — Glacial Violet-Slate Storm Sky
      skyGrad.addColorStop(0, '#090d24');
      skyGrad.addColorStop(0.55, '#1e1b4b');
      skyGrad.addColorStop(1, '#0f172a');
    } else if (zoneIdx === 2) {
      // Zone 2: Aether Cloudsea Sanctum — Dawn Gold & Celestial Azure
      skyGrad.addColorStop(0, '#0c1938');
      skyGrad.addColorStop(0.55, '#1e3a5f');
      skyGrad.addColorStop(1, '#422006');
    } else if (zoneIdx === 3) {
      // Zone 3: Astral Stratosphere Orbit — Deep Space Cosmic Indigo
      skyGrad.addColorStop(0, '#02040d');
      skyGrad.addColorStop(0.55, '#0f172a');
      skyGrad.addColorStop(1, '#1e1b4b');
    } else {
      // Zone 4: Abyssal Singularity Summit — Crimson-Violet Event Horizon
      skyGrad.addColorStop(0, '#090214');
      skyGrad.addColorStop(0.55, '#2e1065');
      skyGrad.addColorStop(1, '#3b0764');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    // Drifting Nebula / Atmospheric Glow (0.1x speed)
    for (let n = 0; n < 3; n++) {
      const nx = ((n * 380 + time * 12 * 0.1 * (n + 1)) % (width + 300)) - 150;
      const ny = 58 + n * 38;
      const nebGrad = ctx.createRadialGradient(nx, ny, 10, nx, ny, 180);
      const nebCols = [
        ['rgba(16, 185, 129, 0.14)', 'rgba(56, 189, 248, 0.12)'],
        ['rgba(56, 189, 248, 0.15)', 'rgba(168, 85, 247, 0.16)'],
        ['rgba(251, 191, 36, 0.18)', 'rgba(56, 189, 248, 0.13)'],
        ['rgba(56, 189, 248, 0.16)', 'rgba(129, 140, 248, 0.16)'],
        ['rgba(192, 132, 252, 0.20)', 'rgba(251, 191, 36, 0.16)'],
      ][zoneIdx];
      nebGrad.addColorStop(0, isBerserk ? 'rgba(244, 63, 94, 0.18)' : nebCols[n % 2]);
      nebGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      ctx.fillStyle = nebGrad;
      ctx.fillRect(nx - 180, ny - 180, 360, 360);
    }

    // Twinkling Starfield (0.1x speed)
    ctx.fillStyle = isBerserk ? 'rgba(251, 113, 133, 0.5)' : 'rgba(226, 232, 240, 0.55)';
    for (let i = 0; i < 42; i++) {
      const sx = (i * 97 + Math.floor(time * 12 * 0.1)) % width;
      const sy = (i * 53) % (horizonY - 14);
      const sz = (i % 3) + 1;
      ctx.fillRect(sx, sy, sz, sz);
    }

    // Zone 3 & 4 Special Sky Centerpiece (Planetary Ring / Violet-Gold Black Hole)
    if (zoneIdx === 3) {
      // Curved Planetary Horizon & Saturn-like Rings
      ctx.save();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.32)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(width * 0.5, horizonY + 180, 260, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.22)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(width * 0.72, horizonY * 0.42, 78, 18, -0.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(width * 0.72, horizonY * 0.42, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (zoneIdx === 4) {
      // Rotating Violet-Gold Singularity Black Hole
      ctx.save();
      ctx.translate(Math.round(width * 0.52), Math.round(horizonY * 0.45));
      ctx.rotate(time * 0.35);
      for (let r = 0; r < 3; r++) {
        ctx.strokeStyle = r % 2 === 0 ? 'rgba(251, 191, 36, 0.42)' : 'rgba(192, 132, 252, 0.45)';
        ctx.lineWidth = 2.5 - r * 0.5;
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.arc(0, 0, 42 + r * 22, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.fillStyle = '#02010a';
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  // ============================================================================
  // 2. FAR BG LAYER (0.35x PARALLAX SPEED) — DISTANT LANDSCAPE BY ZONE
  // ============================================================================
  if (zoneAsset.farBgImg && zoneAsset.farBgImg.complete && zoneAsset.farBgImg.naturalWidth > 0) {
    const scrollX = (time * 18 * 0.35) % width;
    ctx.drawImage(zoneAsset.farBgImg, -scrollX, horizonY - 120, width, 125);
    ctx.drawImage(zoneAsset.farBgImg, width - scrollX, horizonY - 120, width, 125);
  } else {
    for (let i = 0; i < 9; i++) {
      const rawX = ((i * 135 - time * 18 * 0.35) % (width + 160));
      const bx = rawX < -80 ? rawX + width + 160 : rawX;
      if (zoneIdx === 0) {
        // Giant Bioluminescent Pine Silhouettes & Cyan Glowing Mushrooms
        const treeH = 75 + (i % 3) * 24;
        ctx.fillStyle = '#041f1e';
        ctx.beginPath();
        ctx.moveTo(bx + 24, horizonY - treeH);
        ctx.lineTo(bx + 54, horizonY);
        ctx.lineTo(bx - 6, horizonY);
        ctx.closePath();
        ctx.fill();
        // Glowing cyan mushroom cap at base
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(bx + 16, horizonY - 10, 12, 5);
        ctx.fillStyle = '#0e7490';
        ctx.fillRect(bx + 20, horizonY - 5, 4, 5);
      } else if (zoneIdx === 1) {
        // Jagged Snow-Capped Stormcrag Mountain Peaks
        const peakH = 85 + (i % 3) * 28;
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.moveTo(bx + 35, horizonY - peakH);
        ctx.lineTo(bx + 85, horizonY);
        ctx.lineTo(bx - 15, horizonY);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.moveTo(bx + 35, horizonY - peakH);
        ctx.lineTo(bx + 52, horizonY - peakH * 0.65);
        ctx.lineTo(bx + 18, horizonY - peakH * 0.65);
        ctx.closePath();
        ctx.fill();
      } else if (zoneIdx === 2) {
        // Golden Sea of Clouds & Distant Floating Sanctum Islands
        ctx.fillStyle = i % 2 === 0 ? 'rgba(251, 191, 36, 0.25)' : 'rgba(254, 240, 138, 0.18)';
        ctx.fillRect(bx, horizonY - 28 - (i % 3) * 8, 96, 22);
        if (i % 2 === 0) {
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(bx + 20, horizonY - 68, 44, 24);
          ctx.fillStyle = '#fde047';
          ctx.fillRect(bx + 38, horizonY - 60, 8, 12);
        }
      } else if (zoneIdx === 3) {
        // Distant Orbital Ring Segments & Star Cruisers / Astrolabe Spires
        const spireH = 60 + (i % 4) * 18;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(bx + 12, horizonY - spireH, 24, spireH);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(bx + 21, horizonY - spireH + 8, 6, spireH - 16);
      } else {
        // Zone 4: Floating Shattered Runic Obelisks in Deep Space
        const floatY = Math.sin(time * 1.8 + i) * 8;
        const obH = 72 + (i % 3) * 22;
        ctx.fillStyle = '#1e1035';
        ctx.fillRect(bx + 10, horizonY - obH + floatY - 12, 28, obH - 12);
        ctx.fillStyle = '#c084fc';
        ctx.fillRect(bx + 21, horizonY - obH + floatY, 6, obH - 28);
      }
    }
  }

  // ============================================================================
  // 3. MID ARCH & WEATHER PARTICLES (0.65x PARALLAX SPEED)
  // ============================================================================
  if (zoneAsset.midArchImg && zoneAsset.midArchImg.complete && zoneAsset.midArchImg.naturalWidth > 0) {
    const scrollX = (time * 18 * 0.65) % width;
    ctx.drawImage(zoneAsset.midArchImg, -scrollX, horizonY - 115, width, 120);
    ctx.drawImage(zoneAsset.midArchImg, width - scrollX, horizonY - 115, width, 120);
  } else {
    for (let i = 0; i < 7; i++) {
      const parallaxX = ((i * 165 - time * 18 * 0.65) % (width + 160));
      const px = parallaxX < -80 ? parallaxX + width + 160 : parallaxX;
      const pillarH = 92 + (i % 3) * 26;
      const py = horizonY - pillarH;

      // Zone-themed Midground Architecture
      ctx.fillStyle =
        zoneIdx === 0 ? '#062229' :
        zoneIdx === 1 ? '#111c35' :
        zoneIdx === 2 ? '#1e293b' :
        zoneIdx === 3 ? '#091326' : '#17092b';
      ctx.fillRect(px, py, 36, pillarH);
      ctx.fillRect(px + 6, py - 10, 22, 10);

      // Glowing Conduit / Brazier per Zone
      const conduitColor = isBerserk
        ? 'rgba(244, 63, 94, 0.35)'
        : zoneIdx === 0
        ? 'rgba(52, 211, 153, 0.32)'
        : zoneIdx === 1
        ? 'rgba(168, 85, 247, 0.34)'
        : zoneIdx === 2
        ? 'rgba(251, 191, 36, 0.38)'
        : zoneIdx === 3
        ? 'rgba(56, 189, 248, 0.35)'
        : 'rgba(232, 121, 249, 0.38)';
      ctx.fillStyle = conduitColor;
      ctx.fillRect(px + 15, py + 14, 6, pillarH - 24);

      // Zone 1 Stormcrag Brazier Flame on top of pillars
      if (zoneIdx === 1 && i % 2 === 0) {
        ctx.fillStyle = '#f97316';
        ctx.fillRect(px + 11, py - 18, 14, 8);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(px + 14, py - 22, 8, 5);
      }
    }

    // Zone-Specific Weather & Ambient Particles (0.65x Layer)
    for (let w = 0; w < 18; w++) {
      if (zoneIdx === 0) {
        // Zone 0: Floating Emerald/Gold Fireflies
        const fx = (w * 73 + Math.sin(time * 1.5 + w) * 28) % width;
        const fy = (horizonY - 15) - ((w * 29 + time * 14) % (horizonY - 25));
        ctx.fillStyle = w % 2 === 0 ? '#34d399' : '#fde047';
        ctx.fillRect(fx, fy, 3, 3);
      } else if (zoneIdx === 1) {
        // Zone 1: Slanted Blizzard Snowflakes & Occasional Purple Lightning
        const sx = (w * 67 - time * 85) % width;
        const sy = (w * 41 + time * 65) % horizonY;
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(sx < 0 ? sx + width : sx, sy, 3, 3);
        if (w === 0 && Math.floor(time * 4) % 9 === 0) {
          ctx.strokeStyle = 'rgba(192, 132, 252, 0.65)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(width * 0.65, 0);
          ctx.lineTo(width * 0.62, horizonY * 0.45);
          ctx.lineTo(width * 0.66, horizonY * 0.55);
          ctx.lineTo(width * 0.61, horizonY);
          ctx.stroke();
        }
      } else if (zoneIdx === 2) {
        // Zone 2: Ascending Golden Aether Motes
        const ax = (w * 83 + time * 18) % width;
        const ay = horizonY - ((w * 37 + time * 22) % (horizonY - 20));
        ctx.fillStyle = 'rgba(253, 224, 71, 0.65)';
        ctx.fillRect(ax, ay, 3, 3);
      } else if (zoneIdx === 3) {
        // Zone 3: Diagonal Shooting Starfall Meteors
        if (w < 6) {
          const cycle = (time * 180 + w * 210) % (width + 400);
          const mx = width + 100 - cycle;
          const my = (cycle * 0.35 + w * 45) % (horizonY - 20);
          ctx.strokeStyle = 'rgba(125, 211, 252, 0.7)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(mx + 32, my - 12);
          ctx.stroke();
        }
      } else {
        // Zone 4: Rising Abyssal Singularity Shards
        const vx = (w * 79 + Math.cos(time * 2 + w) * 20) % width;
        const vy = horizonY - ((w * 31 + time * 36) % (horizonY - 10));
        ctx.fillStyle = w % 2 === 0 ? '#c084fc' : '#fbbf24';
        ctx.fillRect(vx, vy, 4, 4);
      }
    }
  }

  // ============================================================================
  // 4. FOREGROUND BATTLE FLOOR (1.0x PARALLAX SPEED) — SWAPPABLE OR PROCEDURAL
  // ============================================================================
  if (zoneAsset.floorImg && zoneAsset.floorImg.complete && zoneAsset.floorImg.naturalWidth > 0) {
    ctx.drawImage(zoneAsset.floorImg, 0, horizonY, width, height - horizonY);
  } else {
    const floorGrad = ctx.createLinearGradient(0, horizonY, 0, height);
    if (isBerserk) {
      floorGrad.addColorStop(0, '#1c0915');
      floorGrad.addColorStop(0.5, '#070c1a');
      floorGrad.addColorStop(1, '#020617');
    } else if (zoneIdx === 0) {
      floorGrad.addColorStop(0, '#071f24');
      floorGrad.addColorStop(0.5, '#051319');
      floorGrad.addColorStop(1, '#020617');
    } else if (zoneIdx === 1) {
      floorGrad.addColorStop(0, '#16243d');
      floorGrad.addColorStop(0.5, '#0c1526');
      floorGrad.addColorStop(1, '#040814');
    } else if (zoneIdx === 2) {
      floorGrad.addColorStop(0, '#27201c');
      floorGrad.addColorStop(0.5, '#131629');
      floorGrad.addColorStop(1, '#060914');
    } else if (zoneIdx === 3) {
      floorGrad.addColorStop(0, '#0d1833');
      floorGrad.addColorStop(0.5, '#070d1f');
      floorGrad.addColorStop(1, '#02050d');
    } else {
      floorGrad.addColorStop(0, '#230b38');
      floorGrad.addColorStop(0.5, '#110622');
      floorGrad.addColorStop(1, '#04010a');
    }
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, horizonY, width, height - horizonY);

    // Perspective Stone Tile Grid
    ctx.strokeStyle = isBerserk ? 'rgba(244, 63, 94, 0.16)' : 'rgba(148, 163, 184, 0.12)';
    ctx.lineWidth = 1;
    for (let row = 0; row <= 5; row++) {
      const ry = horizonY + Math.pow(row / 5, 1.35) * (height - horizonY - 16);
      ctx.beginPath();
      ctx.moveTo(0, ry);
      ctx.lineTo(width, ry);
      ctx.stroke();
    }
  }

  // Grand Runic Arena Circle & 5 Party Elemental Rune Seals on the Platform
  ctx.save();
  const arenaCenterX = Math.round(width * 0.48);
  const arenaCenterY = Math.round(horizonY + (height - horizonY) * 0.52);

  // Outer Sacred Runic Ring
  ctx.strokeStyle = isBerserk ? 'rgba(244, 63, 94, 0.28)' : 'rgba(56, 189, 248, 0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(arenaCenterX, arenaCenterY, width * 0.42, (height - horizonY) * 0.4, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 5 Glowing Elemental Runes synchronized with the active Resonators' Elements
  heroes.forEach((h, idx) => {
    const elColor = ELEMENT_META[h.data.element].color;
    const runeAngle = (idx / Math.max(1, heroes.length)) * Math.PI - Math.PI * 0.5 + Math.sin(time * 0.8) * 0.05;
    const rx = h.x;
    const ry = h.y + 28;

    ctx.strokeStyle = elColor;
    ctx.globalAlpha = h.hp > 0 ? 0.35 + Math.sin(time * 4 + idx) * 0.12 : 0.08;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(rx, ry, 28, 9, runeAngle * 0.05, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();

  // Tactical Front/Back Divider Line
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.18)';
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(width * 0.48, horizonY + 10);
  ctx.lineTo(width * 0.44, height - 15);
  ctx.stroke();
  ctx.setLineDash([]);


  // ============================================================================
  // 2. DRAW 5 RESONATORS (SORTED BY Y DEPTH)
  // ============================================================================
  const sortedHeroes = [...heroes].sort((a, b) => a.y - b.y);
  sortedHeroes.forEach((u) => {
    if (u.hp <= 0) return;
    const hasActiveBuff =
      u.buffs.atkTimer > 0 ||
      u.buffs.defTimer > 0 ||
      u.buffs.critTimer > 0 ||
      u.buffs.breakTimer > 0 ||
      u.shield > 0;
    const showElementalAura = hasActiveBuff || u.energy >= 50;
    const auraIntensity =
      u.energy >= 99 ? 1.0 : u.energy >= 50 ? 0.55 + ((u.energy - 50) / 50) * 0.4 : 0.65;

    drawPixelHeroSprite(
      ctx,
      u.data,
      u.x,
      u.y,
      1.12,
      time,
      u.animOffset > 0.05,
      u.hitFlash,
      u.animState || (u.animOffset > 0.05 ? 'ATTACK_COMBO' : 'IDLE'),
      u.animTimer || u.animOffset,
      showElementalAura,
      auraIntensity
    );

    // Compact World-Space HP + Shield + Energy Bar above Hero
    const bw = 56;
    const bx = Math.round(u.x - bw / 2);
    const by = Math.round(u.y - 52);
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    ctx.fillRect(bx - 1, by - 1, bw + 2, 11);

    const hpPct = Math.max(0, Math.min(1, u.hp / u.maxHp));
    ctx.fillStyle = hpPct > 0.35 ? '#10b981' : '#f43f5e';
    ctx.fillRect(bx, by, Math.round(bw * hpPct), 5);

    if (u.shield > 0) {
      const shPct = Math.min(1, u.shield / u.maxHp);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(bx, by, Math.round(bw * shPct), 2);
    }

    const enPct = Math.max(0, Math.min(1, u.energy / 100));
    ctx.fillStyle = enPct >= 1 ? '#fde047' : '#fbbf24';
    ctx.fillRect(bx, by + 6, Math.round(bw * enPct), 3);

    if (u.lastActionTimer > 0 && u.lastActionLabel) {
      ctx.fillStyle = '#fde68a';
      ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(u.lastActionLabel, u.x, by - 6);
    }
  });

  // ============================================================================
  // 3. DRAW MULTI-PART OLD GOD BOSS (100% CLEAN SPRITE LAYER — 3-LAYER HUD IS DOM OVERLAY)
  // ============================================================================
  const sortedBoss = bossParts.filter((b) => b.alive && b.hp > 0).sort((a, b) => a.y - b.y);
  sortedBoss.forEach((b) => {
    const isMainBoss = b.id === 'BOSS_MAIN';
    drawEldritchBossPart(
      ctx,
      b,
      time,
      manualFocusId === b.id,
      isStaggered && isMainBoss,
      isBerserk,
      staggerSegments,
      currentSegmentBp,
      maxSegmentBp,
      staggerWarningTimer
    );
  });

  // ============================================================================
  // 4. VOLUMETRIC ELEMENTAL REACTION SHOCKWAVES & 3D VOXEL PARTICLES
  // ============================================================================
  shockwaves.forEach((sw) => {
    const progress = 1 - sw.life / sw.maxLife;
    const radius = 12 + progress * sw.maxRadius;
    ctx.save();
    ctx.globalAlpha = Math.max(0, sw.life / sw.maxLife);

    // Volumetric Radial Bloom Fill
    const bloomGrad = ctx.createRadialGradient(sw.x, sw.y, radius * 0.15, sw.x, sw.y, radius);
    bloomGrad.addColorStop(0, `${sw.secondaryColor}44`);
    bloomGrad.addColorStop(0.65, `${sw.color}33`);
    bloomGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
    ctx.fillStyle = bloomGrad;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = sw.color;
    ctx.lineWidth = 4 * (1 - progress * 0.5);
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = sw.secondaryColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, radius * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  particles.forEach((pt) => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, pt.alpha);
    drawVoxelBox(ctx, pt.x, pt.y, pt.size, pt.size, Math.max(1.5, pt.size * 0.65), pt.color);
    ctx.restore();
  });

  // ============================================================================
  // 5. POP-UP ELEMENTAL DAMAGE NUMBERS & 9-REACTION CALLOUT BANNERS
  // ============================================================================
  floatingTexts.forEach((ft) => {
    ctx.save();
    const lifeRatio = ft.life / ft.maxLife;
    const popScale = lifeRatio > 0.8 ? 1 + (1 - lifeRatio) * 1.4 : 1;
    const alpha = Math.min(1, lifeRatio * 1.65);
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.translate(ft.x, ft.y);
    ctx.scale(popScale, popScale);

    ctx.font = `bold ${Math.round(13 * ft.scale)}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#020617';
    ctx.fillText(ft.text, 1.5, 1.5);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, 0, 0);

    if (ft.subtext) {
      ctx.font = 'bold 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#020617';
      ctx.fillText(`✦ ${ft.subtext} ✦`, 1, -15);
      ctx.fillStyle = '#fde047';
      ctx.fillText(`✦ ${ft.subtext} ✦`, 0, -16);
    }
    ctx.restore();
  });

  ctx.restore();
}

/**
 * 16-BIT PIXEL ART TAROT CARD RENDERER (32x40 Grid, image-rendering: pixelated)
 * Renders all 22 Major Arcana cards (0. The Fool -> XXI. The World) with a pixel gold frame,
 * animated twinkling stars, and distinct 16-bit pixel art iconography per card.
 */
interface TarotPalette {
  bgTop: string;
  bgBot: string;
  primary: string;
  secondary: string;
  accent: string;
}

const TAROT_PALETTES: Record<string, TarotPalette> = {
  ARCANA_00: { bgTop: '#0c1938', bgBot: '#1e3a8a', primary: '#38bdf8', secondary: '#fde047', accent: '#f8fafc' }, // 0. The Fool
  ARCANA_01: { bgTop: '#2e1065', bgBot: '#4c1d95', primary: '#c084fc', secondary: '#fbbf24', accent: '#f43f5e' }, // I. The Magician
  ARCANA_02: { bgTop: '#082f49', bgBot: '#0f172a', primary: '#7dd3fc', secondary: '#e0f2fe', accent: '#c084fc' }, // II. The High Priestess
  ARCANA_03: { bgTop: '#064e3b', bgBot: '#022c22', primary: '#34d399', secondary: '#fde047', accent: '#f472b6' }, // III. The Empress
  ARCANA_04: { bgTop: '#450a0a', bgBot: '#1f0909', primary: '#ef4444', secondary: '#fbbf24', accent: '#fdba74' }, // IV. The Emperor
  ARCANA_05: { bgTop: '#422006', bgBot: '#1c1917', primary: '#fbbf24', secondary: '#fef08a', accent: '#38bdf8' }, // V. The Hierophant
  ARCANA_06: { bgTop: '#500724', bgBot: '#1e1b4b', primary: '#f472b6', secondary: '#fde047', accent: '#38bdf8' }, // VI. The Lovers
  ARCANA_07: { bgTop: '#0f172a', bgBot: '#1e293b', primary: '#38bdf8', secondary: '#fbbf24', accent: '#f8fafc' }, // VII. The Chariot
  ARCANA_08: { bgTop: '#431407', bgBot: '#1c1917', primary: '#fb923c', secondary: '#fde047', accent: '#ef4444' }, // VIII. Strength
  ARCANA_09: { bgTop: '#090d16', bgBot: '#1e1b4b', primary: '#fef08a', secondary: '#94a3b8', accent: '#38bdf8' }, // IX. The Hermit
  ARCANA_10: { bgTop: '#3b0764', bgBot: '#0f172a', primary: '#fbbf24', secondary: '#c084fc', accent: '#38bdf8' }, // X. Wheel of Fortune
  ARCANA_11: { bgTop: '#172554', bgBot: '#090d16', primary: '#fde047', secondary: '#e2e8f0', accent: '#f43f5e' }, // XI. Justice
  ARCANA_12: { bgTop: '#164e63', bgBot: '#0f172a', primary: '#22d3ee', secondary: '#fde047', accent: '#a855f7' }, // XII. The Hanged Man
  ARCANA_13: { bgTop: '#090d16', bgBot: '#18181b', primary: '#e2e8f0', secondary: '#a855f7', accent: '#f43f5e' }, // XIII. Death
  ARCANA_14: { bgTop: '#1e1b4b', bgBot: '#064e3b', primary: '#38bdf8', secondary: '#f97316', accent: '#fde047' }, // XIV. Temperance
  ARCANA_15: { bgTop: '#310b2b', bgBot: '#090d16', primary: '#f43f5e', secondary: '#a855f7', accent: '#fbbf24' }, // XV. The Devil
  ARCANA_16: { bgTop: '#3f0d12', bgBot: '#090d16', primary: '#fb923c', secondary: '#fde047', accent: '#94a3b8' }, // XVI. The Tower
  ARCANA_17: { bgTop: '#082f49', bgBot: '#020617', primary: '#fde047', secondary: '#38bdf8', accent: '#f8fafc' }, // XVII. The Star
  ARCANA_18: { bgTop: '#1e1b4b', bgBot: '#020617', primary: '#bae6fd', secondary: '#818cf8', accent: '#fde047' }, // XVIII. The Moon
  ARCANA_19: { bgTop: '#7c2d12', bgBot: '#451a03', primary: '#fde047', secondary: '#fb923c', accent: '#fef9c3' }, // XIX. The Sun
  ARCANA_20: { bgTop: '#311042', bgBot: '#0f172a', primary: '#fbbf24', secondary: '#f43f5e', accent: '#f8fafc' }, // XX. Judgement
  ARCANA_21: { bgTop: '#064e3b', bgBot: '#1e1b4b', primary: '#34d399', secondary: '#fde047', accent: '#c084fc' }, // XXI. The World
};

export function drawPixelTarotCard(
  canvas: HTMLCanvasElement,
  arcanaId: string,
  tick: number = 0
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = 32;
  const H = 40;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);

  const pal = TAROT_PALETTES[arcanaId] || TAROT_PALETTES.ARCANA_00;
  const numIdx = Math.max(0, Math.min(21, parseInt(arcanaId.replace('ARCANA_', ''), 10) || 0));
  const pulse = Math.floor(tick * 3) % 2 === 0;

  const px = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // 1. Background Bands (16-Bit Dithered Sky)
  px(2, 2, 28, 18, pal.bgTop);
  px(2, 20, 28, 18, pal.bgBot);
  for (let dx = 3; dx < 29; dx += 2) {
    px(dx, 19 + (dx % 2), 1, 1, pal.bgBot);
    px(dx, 20 - (dx % 2), 1, 1, pal.bgTop);
  }

  // 2. Ornate 16-Bit Gold Pixel Frame & Corner Gems
  px(0, 0, 32, 1, '#ca8a04');
  px(0, 39, 32, 1, '#ca8a04');
  px(0, 0, 1, 40, '#ca8a04');
  px(31, 0, 1, 40, '#ca8a04');

  px(1, 1, 30, 1, '#fbbf24');
  px(1, 38, 30, 1, '#fbbf24');
  px(1, 1, 1, 38, '#fbbf24');
  px(30, 1, 1, 38, '#fbbf24');

  // Corner studs
  const cornerCol = pulse ? '#fef08a' : '#f59e0b';
  px(2, 2, 2, 2, cornerCol);
  px(28, 2, 2, 2, cornerCol);
  px(2, 36, 2, 2, cornerCol);
  px(28, 36, 2, 2, cornerCol);

  // Top Roman Header Plate & Bottom Altar Plate
  px(6, 2, 20, 4, '#090d16');
  px(6, 5, 20, 1, '#fbbf24');
  // Pixel pips indicating Arcana Number
  const pipCount = (numIdx % 5) + 1;
  for (let i = 0; i < pipCount; i++) {
    px(16 - pipCount + i * 2, 3, 1, 1, '#fde047');
  }

  // 3. Twinkling Celestial Star Pixels
  const starCoords: [number, number][] = [
    [5, 8],
    [26, 9],
    [6, 28],
    [25, 27],
    [15, 7],
  ];
  starCoords.forEach(([sx, sy], idx) => {
    const twinkle = (Math.floor(tick * 4) + idx + numIdx) % 3 === 0;
    px(sx, sy, 1, 1, twinkle ? '#ffffff' : pal.secondary);
    if (twinkle) {
      px(sx - 1, sy, 1, 1, pal.primary);
      px(sx + 1, sy, 1, 1, pal.primary);
    }
  });

  // 4. Unique 16-Bit Emblem per Major Arcana (0..21)
  const bob = Math.floor(tick * 2.5) % 2;
  switch (numIdx) {
    case 0: {
      // 0. The Fool: Cliff edge, wanderer with bindle & white star dog
      px(3, 28, 12, 9, '#334155');
      px(5, 27, 10, 2, '#64748b');
      px(11, 18 + bob, 4, 5, pal.primary);
      px(12, 15 + bob, 3, 3, '#fde68a');
      px(8, 14 + bob, 9, 1, pal.secondary);
      px(7, 13 + bob, 2, 2, pal.accent);
      px(22, 10 - bob, 4, 4, '#fde047');
      break;
    }
    case 1: {
      // I. The Magician: Lemniscate infinity halo, raised wand & altar tools
      px(12, 9, 3, 2, '#fde047');
      px(17, 9, 3, 2, '#fde047');
      px(15, 10, 2, 1, '#ffffff');
      px(13, 13 + bob, 6, 4, '#fde68a');
      px(11, 17 + bob, 10, 10, pal.primary);
      px(22, 11 + bob, 2, 9, '#fef08a');
      px(6, 30, 20, 3, '#fbbf24');
      break;
    }
    case 2: {
      // II. The High Priestess: Twin pillars B & J + Lunar Crescent Crown
      px(5, 10, 4, 24, '#475569');
      px(23, 10, 4, 24, '#e2e8f0');
      px(11, 12 + bob, 10, 3, pal.secondary);
      px(12, 16 + bob, 8, 14, pal.primary);
      px(13, 23 + bob, 6, 4, '#fde047');
      break;
    }
    case 3: {
      // III. The Empress: 12-star emerald crown, golden scepter & nature field
      px(4, 29, 24, 7, '#059669');
      px(11, 11 + bob, 10, 3, '#fde047');
      px(13, 14 + bob, 6, 5, '#fde68a');
      px(10, 19 + bob, 12, 11, pal.accent);
      px(23, 14 + bob, 2, 12, '#fde047');
      break;
    }
    case 4: {
      // IV. The Emperor: Stone Ram Throne, Ruby Armor & Ankh Orb
      px(7, 12, 18, 22, '#334155');
      px(11, 11 + bob, 10, 3, '#fbbf24');
      px(10, 17 + bob, 12, 13, pal.primary);
      px(6, 18, 3, 3, '#fde047');
      px(23, 18, 3, 3, '#fde047');
      break;
    }
    case 5: {
      // V. The Hierophant: Papal Triple Crown & Crossed Astral Keys
      px(12, 9 + bob, 8, 5, '#fbbf24');
      px(14, 7 + bob, 4, 2, '#fef08a');
      px(11, 16 + bob, 10, 12, pal.primary);
      px(9, 29, 6, 4, '#cbd5e1');
      px(17, 29, 6, 4, '#fde047');
      break;
    }
    case 6: {
      // VI. The Lovers: Radiant Solar Winged Heart & Twin Chalice Flames
      px(10, 13 + bob, 5, 5, pal.primary);
      px(17, 13 + bob, 5, 5, pal.primary);
      px(9, 15 + bob, 14, 5, pal.primary);
      px(11, 20 + bob, 10, 4, pal.primary);
      px(13, 24 + bob, 6, 3, pal.primary);
      px(15, 27 + bob, 2, 2, pal.secondary);
      px(14, 9, 4, 3, '#fde047');
      break;
    }
    case 7: {
      // VII. The Chariot: Winged War Chariot & Twin Sphinxes
      px(8, 16 + bob, 16, 11, '#334155');
      px(10, 14 + bob, 12, 3, '#fbbf24');
      px(13, 10 + bob, 6, 5, pal.primary);
      px(6, 23, 2, 7, '#fde047');
      px(24, 23, 2, 7, '#fde047');
      px(9, 29, 5, 5, '#e2e8f0');
      px(18, 29, 5, 5, '#1e293b');
      break;
    }
    case 8: {
      // VIII. Strength: Golden Lion Mane & Infinity Crown
      px(12, 9, 8, 2, '#fde047');
      px(9, 13 + bob, 14, 14, '#d97706');
      px(11, 15 + bob, 10, 10, '#fbbf24');
      px(12, 17 + bob, 2, 2, '#090d16');
      px(18, 17 + bob, 2, 2, '#090d16');
      px(14, 21 + bob, 4, 3, '#ef4444');
      break;
    }
    case 9: {
      // IX. The Hermit: Hooded Sage & Glowing 6-Ray Star Lantern
      px(10, 12 + bob, 9, 19, '#475569');
      px(12, 14 + bob, 4, 4, '#0f172a');
      px(21, 16 - bob, 5, 7, '#fbbf24');
      px(22, 17 - bob, 3, 5, pulse ? '#ffffff' : '#fef08a');
      px(7, 13, 2, 20, '#a16207');
      break;
    }
    case 10: {
      // X. Wheel of Fortune: 8-Spoke Cosmic Destiny Wheel
      px(9, 13, 14, 14, '#ca8a04');
      px(11, 15, 10, 10, '#1e1b4b');
      px(15, 11, 2, 18, '#fde047');
      px(7, 19, 18, 2, '#fde047');
      px(14, 18, 4, 4, pal.accent);
      break;
    }
    case 11: {
      // XI. Justice: Upright Silver Sword & Twin Golden Scales
      px(15, 8, 2, 22, '#e2e8f0');
      px(11, 14, 10, 2, '#fbbf24');
      px(6, 16 + bob, 5, 2, '#fde047');
      px(21, 16 - bob, 5, 2, '#fde047');
      px(5, 21 + bob, 7, 3, '#fbbf24');
      px(20, 21 - bob, 7, 3, '#fbbf24');
      break;
    }
    case 12: {
      // XII. The Hanged Man: T-Cross Timber & Radiant Inverted Nimbus Halo
      px(6, 9, 20, 3, '#78350f');
      px(15, 12, 2, 6, '#fbbf24');
      px(12, 18, 8, 9, pal.primary);
      px(11, 26 + bob, 10, 6, '#fde047');
      px(13, 27 + bob, 6, 4, '#fef08a');
      break;
    }
    case 13: {
      // XIII. Death: Pale Skull & Curved Astral Reaper Scythe
      px(8, 10, 16, 3, '#cbd5e1');
      px(21, 12, 4, 6, '#e2e8f0');
      px(9, 10, 2, 23, '#78350f');
      px(13, 15 + bob, 8, 8, '#f8fafc');
      px(14, 17 + bob, 2, 2, '#f43f5e');
      px(18, 17 + bob, 2, 2, '#f43f5e');
      px(15, 23 + bob, 4, 3, '#cbd5e1');
      break;
    }
    case 14: {
      // XIV. Temperance: Twin Gold Chalices & Flowing Rainbow Alchemy Stream
      px(6, 11 + bob, 6, 6, '#fbbf24');
      px(20, 25 - bob, 6, 6, '#fbbf24');
      for (let s = 0; s < 8; s++) {
        px(11 + s, 15 + s, 2, 2, (s + Math.floor(tick * 6)) % 2 === 0 ? '#38bdf8' : '#f97316');
      }
      break;
    }
    case 15: {
      // XV. The Devil: Abyssal Crimson Horns & Inverted Pentagram Torch
      px(6, 10 + bob, 5, 7, '#f43f5e');
      px(21, 10 + bob, 5, 7, '#f43f5e');
      px(11, 14 + bob, 10, 12, '#881337');
      px(12, 17 + bob, 3, 2, '#fde047');
      px(17, 17 + bob, 3, 2, '#fde047');
      px(14, 27, 4, 6, '#fb923c');
      break;
    }
    case 16: {
      // XVI. The Tower: Crumbling Obsidian Spire Struck by Golden Lightning
      px(11, 14, 10, 21, '#334155');
      px(10, 11 + bob, 12, 3, '#fbbf24');
      px(22, 8, 3, 4, '#fde047');
      px(19, 12, 4, 3, '#fde047');
      px(15, 15, 5, 3, '#fb923c');
      px(8, 20, 4, 4, '#ef4444');
      break;
    }
    case 17: {
      // XVII. The Star: Giant 8-Pointed Polaris Star & 7 Minor Stars
      px(15, 9, 2, 16, '#fde047');
      px(8, 16, 16, 2, '#fde047');
      px(12, 13, 8, 8, '#fef08a');
      px(14, 15, 4, 4, '#ffffff');
      px(6, 29, 20, 5, '#0284c7');
      break;
    }
    case 18: {
      // XVIII. The Moon: Twin Watchtowers & Glowing Crescent Eclipse
      px(5, 20, 5, 15, '#334155');
      px(22, 20, 5, 15, '#334155');
      px(11, 9 + bob, 10, 10, '#fde047');
      px(14, 11 + bob, 7, 6, pal.bgTop);
      px(11, 29, 10, 5, '#38bdf8');
      break;
    }
    case 19: {
      // XIX. The Sun: Blazing Golden Solar Disk & Crimson Sunbeams
      px(10, 12, 12, 12, '#fbbf24');
      px(12, 14, 8, 8, '#fef08a');
      px(15, 7 - bob, 2, 4, '#fb923c');
      px(15, 25 + bob, 2, 4, '#fb923c');
      px(5 - bob, 17, 4, 2, '#fb923c');
      px(23 + bob, 17, 4, 2, '#fb923c');
      break;
    }
    case 20: {
      // XX. Judgement: Archangel Golden Trumpet & Rising Souls
      px(10, 9 + bob, 12, 5, '#f8fafc');
      px(14, 14 + bob, 4, 8, '#fbbf24');
      px(12, 22 + bob, 8, 3, '#fde047');
      px(7, 29, 5, 6, '#38bdf8');
      px(14, 28, 4, 7, '#c084fc');
      px(20, 29, 5, 6, '#38bdf8');
      break;
    }
    default: {
      // XXI. The World: Emerald Cosmic Laurel Wreath & Astral Core
      px(8, 10, 16, 20, '#10b981');
      px(11, 13, 10, 14, pal.bgTop);
      px(14, 16 + bob, 4, 8, '#fde047');
      px(13, 18 + bob, 6, 4, '#c084fc');
      px(13, 9, 6, 2, '#f43f5e');
      px(13, 29, 6, 2, '#f43f5e');
      break;
    }
  }
}

/**
 * 16-BIT PIXEL ART ASTRAL TAROT CARD BACK (32x40 Grid)
 * Renders the ornate celestial card back for face-down Tarot Blessing draws.
 */
export function drawPixelTarotCardBack(canvas: HTMLCanvasElement, tick: number = 0): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = 32;
  const H = 40;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, W, H);

  const pulse = Math.floor(tick * 3) % 2 === 0;
  const px = (x: number, y: number, w: number, h: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  };

  // Deep Astral Indigo-Violet Backing
  px(0, 0, W, H, '#090d16');
  px(2, 2, 28, 36, '#1e1b4b');
  px(4, 4, 24, 32, '#2e1065');

  // Double Gold Pixel Frame
  px(0, 0, 32, 1, '#ca8a04');
  px(0, 39, 32, 1, '#ca8a04');
  px(0, 0, 1, 40, '#ca8a04');
  px(31, 0, 1, 40, '#ca8a04');

  px(1, 1, 30, 1, '#fbbf24');
  px(1, 38, 30, 1, '#fbbf24');
  px(1, 1, 1, 38, '#fbbf24');
  px(30, 1, 1, 38, '#fbbf24');

  // Inner Sacred Geometry Border
  px(4, 4, 24, 1, '#a855f7');
  px(4, 35, 24, 1, '#a855f7');
  px(4, 4, 1, 32, '#a855f7');
  px(27, 4, 1, 32, '#a855f7');

  // Corner Celestial Gems
  const gemCol = pulse ? '#fde047' : '#38bdf8';
  px(2, 2, 2, 2, gemCol);
  px(28, 2, 2, 2, gemCol);
  px(2, 36, 2, 2, gemCol);
  px(28, 36, 2, 2, gemCol);

  // Central 8-Pointed Starfall Compass Rose
  px(11, 15, 10, 10, '#4c1d95');
  px(15, 9, 2, 22, '#fbbf24');
  px(7, 19, 18, 2, '#fbbf24');
  px(12, 16, 8, 8, '#fde047');
  px(13, 17, 6, 6, '#090d16');
  px(14, 18, 4, 4, pulse ? '#38bdf8' : '#fde047');

  // Top & Bottom Crescent Moons
  px(13, 6, 6, 2, '#c084fc');
  px(13, 32, 6, 2, '#c084fc');

  // Twinkling Star Dust
  const stars: [number, number][] = [
    [7, 9],
    [24, 9],
    [7, 30],
    [24, 30],
  ];
  stars.forEach(([sx, sy], i) => {
    const tw = (Math.floor(tick * 4) + i) % 2 === 0;
    px(sx, sy, 1, 1, tw ? '#ffffff' : '#fde047');
  });
}



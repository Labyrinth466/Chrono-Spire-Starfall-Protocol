/**
 * CHRONO SPIRE: STARFALL PROTOCOL — Master SSOT v2.1 (Unified TypeScript)
 * File 5: src/engine/combatEngine.ts
 * Unifies the 60fps Canvas simulation structures, Web Audio synthesizer, 8+3 Stat Calculator,
 * Pre-Battle Deployment + Permanent Combat Lock, Complete 9-Reaction Elemental Matrix,
 * 60s Boss Berserk Phase, and 90s Guild Raid Infinite-HP Boss Countdown.
 */

import {
  ELEMENTS,
  FormationCode,
  FormationRatioId,
  FORMATIONS,
  getFormationBonuses,
  getFormationRowBonuses,
  ReactionType,
  SYSTEM_CONSTANTS,
} from '../config/constants';
import {
  DebuffType,
  ElementType,
  GambitConditionSlot1,
  GambitConditionSlot2,
  getResonatorById,
  RESONATORS,
  ResonatorData,
} from '../data/resonators';
import {
  BLESSING_CARDS,
  calculateCurrentSuccessRate,
  EQUIPMENT_SETS,
  GearItem,
  getGearMainStatValue,
  SetId,
} from '../data/equipment';
import { aggregateConstellationBonuses } from '../data/constellations';

// --- PROCEDURAL WEB AUDIO SYNTH ---
class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private init(): void {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public play(
    type:
      | 'hit'
      | 'crit'
      | 'skill'
      | 'chain'
      | 'ult'
      | 'stagger'
      | 'heal'
      | 'forge_ok'
      | 'forge_fail'
      | 'gacha'
  ): void {
    if (this.muted) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (type === 'hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(190, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.06);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'crit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.09);
        gain.gain.setValueAtTime(0.11, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.start(now);
        osc.stop(now + 0.09);
      } else if (type === 'skill' || type === 'chain') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(type === 'chain' ? 520 : 340, now);
        osc.frequency.exponentialRampToValueAtTime(type === 'chain' ? 880 : 540, now + 0.14);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        osc.start(now);
        osc.stop(now + 0.14);
      } else if (type === 'ult') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.28);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'stagger') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.setValueAtTime(300, now + 0.07);
        osc.frequency.setValueAtTime(600, now + 0.14);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'heal') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.16);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
        osc.start(now);
        osc.stop(now + 0.16);
      } else if (type === 'forge_ok' || type === 'gacha') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc.start(now);
        osc.stop(now + 0.32);
      } else if (type === 'forge_fail') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.22);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      }
    } catch {
      // Ignore audio errors when autoplay is blocked
    }
  }
}

export const sfx = new SoundEngine();

// --- COMPLETE 9-REACTION ELEMENTAL MATRIX (MODULE 4) ---
export interface ElementalReactionMatrixItem {
  id: ReactionType;
  setupElement: ElementType | 'ANY_CORE_4';
  setupDebuff: DebuffType | 'ANY_CORE_4_DEBUFF';
  triggerElement: ElementType;
  dmgMultiplier: number;
  bonusStaggerBp: number;
  interruptsCast?: boolean;
  enemySpdSlowPct?: number;
  perBleedStackBonusPct?: number;
  ignoreDefPct?: number;
  executeTrueDmgThresholdHpPct?: number;
  teamHealHpPct?: number;
  extendDurationSec?: number;
  desc: string;
}

export const ELEMENTAL_REACTION_MATRIX: Readonly<Record<string, ElementalReactionMatrixItem>> = Object.freeze({
  MELTDOWN: {
    id: 'MELTDOWN',
    setupElement: ELEMENTS.CRYO,
    setupDebuff: 'Freeze',
    triggerElement: ELEMENTS.FIRE,
    dmgMultiplier: 1.8,
    bonusStaggerBp: 0,
    desc: 'Explodes for 1.8x DMG (can Crit) and inflicts Defenseless (-25% Boss DEF for 4.0s).',
  },
  SUPERCONDUCT: {
    id: 'SUPERCONDUCT',
    setupElement: ELEMENTS.ELECTRO,
    setupDebuff: 'Shock',
    triggerElement: ELEMENTS.CRYO,
    dmgMultiplier: 1.35,
    bonusStaggerBp: 80,
    desc: 'Inflicts +80 bonus Stagger BP immediately and grants Conductive (+35% Team Break Power for 4.0s).',
  },
  FIRESTORM: {
    id: 'FIRESTORM',
    setupElement: ELEMENTS.FIRE,
    setupDebuff: 'Burn',
    triggerElement: ELEMENTS.WIND,
    dmgMultiplier: 1.45,
    bonusStaggerBp: 30,
    desc: '3-hit blazing tempest spreads Burn + Bleed to all enemies and restores +10 Ultimate Energy to all allies.',
  },
  OVERLOAD_PLASMA: {
    id: 'OVERLOAD PLASMA',
    setupElement: ELEMENTS.FIRE,
    setupDebuff: 'Burn',
    triggerElement: ELEMENTS.ELECTRO,
    dmgMultiplier: 2.2,
    bonusStaggerBp: 50,
    interruptsCast: true,
    desc: 'Plasma detonation immediately interrupts enemy skill channeling and deals 220% ATK AoE Electro DMG.',
  },
  BLIZZARD: {
    id: 'BLIZZARD',
    setupElement: ELEMENTS.CRYO,
    setupDebuff: 'Freeze',
    triggerElement: ELEMENTS.WIND,
    dmgMultiplier: 1.5,
    bonusStaggerBp: 40,
    enemySpdSlowPct: 30,
    desc: 'Accelerates Freeze buildup by 1.5x and reduces enemy Attack SPD by 30% for 4.0s.',
  },
  THUNDER_GALE: {
    id: 'THUNDER GALE',
    setupElement: ELEMENTS.ELECTRO,
    setupDebuff: 'Shock',
    triggerElement: ELEMENTS.WIND,
    dmgMultiplier: 1.5,
    bonusStaggerBp: 45,
    perBleedStackBonusPct: 15,
    desc: 'Unleashes chain lightning across all enemies; DMG increases by +15% per active Bleed stack.',
  },
  TWILIGHT_EXECUTION: {
    id: 'TWILIGHT EXECUTION',
    setupElement: ELEMENTS.LIGHT,
    setupDebuff: 'Luminous Mark',
    triggerElement: ELEMENTS.DARK,
    dmgMultiplier: 1.6,
    bonusStaggerBp: 40,
    ignoreDefPct: 40,
    executeTrueDmgThresholdHpPct: 25,
    desc: 'Ignores 40% DEF normally, and converts into 100% True DMG when Boss HP is below 25%.',
  },
  RADIANT_INFUSION: {
    id: 'RADIANT INFUSION',
    setupElement: 'ANY_CORE_4',
    setupDebuff: 'ANY_CORE_4_DEBUFF',
    triggerElement: ELEMENTS.LIGHT,
    dmgMultiplier: 1.25,
    bonusStaggerBp: 30,
    teamHealHpPct: 8,
    desc: 'Cleanses 1 ally debuff and converts the elemental status on the boss into an 8% Max HP party-wide heal.',
  },
  ABYSSAL_DECAY: {
    id: 'ABYSSAL DECAY',
    setupElement: 'ANY_CORE_4',
    setupDebuff: 'ANY_CORE_4_DEBUFF',
    triggerElement: ELEMENTS.DARK,
    dmgMultiplier: 1.35,
    bonusStaggerBp: 30,
    extendDurationSec: 2.0,
    desc: 'Corrupts existing elemental debuffs on the boss, extending their active duration by +2.0 seconds.',
  },
});

const CORE_4_DEBUFFS = new Set<string>(['Burn', 'Freeze', 'Shock', 'Bleed']);

// --- PERSISTENT ACCOUNT & STAT STRUCTURES ---
export interface HeroProgress {
  id: string;
  unlocked: boolean;
  level: number;
  stars: number;
  skillLevels: {
    basic: number;
    active: number;
    chain: number;
    ultimate: number;
  };
  gambit1: GambitConditionSlot1;
  gambit2: GambitConditionSlot2;
}

export interface ComputedStats {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  critRate: number;
  critDmg: number;
  breakPower: number;
  energyCharge: number;
  effectHitRate: number;
  effectRes: number;
  healingBonus: number;
  activeSets: { set: SetId; count: number }[];
  fourPieceSet?: SetId;
  rowPosition: 'Front' | 'Back';
}

export interface ResonanceSummary {
  title: string;
  desc: string;
  atkPct: number;
  defPct: number;
  hpPct: number;
  spdPct: number;
  breakPct: number;
  ehrPct: number;
  chainDmgPct: number;
}

export function computePartyResonance(partyHeroIds: string[]): ResonanceSummary {
  const counts: Partial<Record<ElementType, number>> = {};
  partyHeroIds.forEach((id) => {
    const r = RESONATORS.find((h) => h.id === id);
    if (r) counts[r.element] = (counts[r.element] || 0) + 1;
  });

  const uniqueElements = Object.keys(counts).length;
  const summary: ResonanceSummary = {
    title: 'Standard Squad',
    desc: 'Deploy matching elements or 5 distinct elements for Resonance Synergy.',
    atkPct: 0,
    defPct: 0,
    hpPct: 0,
    spdPct: 0,
    breakPct: 0,
    ehrPct: 0,
    chainDmgPct: 0,
  };

  if (uniqueElements >= 5 && partyHeroIds.length === 5) {
    summary.title = '5-Element Astral Convergence';
    summary.desc = 'Break Power +25% · Effect Hit Rate +15% · Chain Combo DMG +35%';
    summary.breakPct += 25;
    summary.ehrPct += 15;
    summary.chainDmgPct += 35;
    return summary;
  }

  let has3 = false;
  let has2 = false;
  let primaryEl: ElementType | null = null;

  (Object.entries(counts) as [ElementType, number][]).forEach(([el, c]) => {
    if (c >= 3) {
      has3 = true;
      primaryEl = el;
    } else if (c === 2) {
      has2 = true;
    }
  });

  const isFullHouse = has3 && has2;
  const mult = isFullHouse ? 1.5 : 1.0;

  (Object.entries(counts) as [ElementType, number][]).forEach(([el, c]) => {
    if (c >= 2) {
      const m = el === primaryEl ? mult : 1.0;
      if (el === 'Fire') summary.atkPct += 15 * m;
      if (el === 'Cryo') summary.defPct += 20 * m;
      if (el === 'Electro') summary.breakPct += 20 * m;
      if (el === 'Wind') summary.spdPct += 12 * m;
      if (el === 'Light') summary.hpPct += 15 * m;
      if (el === 'Dark') summary.chainDmgPct += 20 * m;
    }
  });

  if (isFullHouse) {
    summary.hpPct += 15;
    summary.title = '3+2 Full House Resonance';
    summary.desc = `Primary ${primaryEl} bonus 1.5x & Team Max HP +15%`;
  } else if (Object.values(counts).some((c) => (c || 0) >= 2)) {
    summary.title = '2-Same Elemental Resonance';
    summary.desc = 'Active elemental pair bonus applied to all squad members.';
  }

  return summary;
}

export function computeHeroStats(
  data: ResonatorData,
  prog: HeroProgress,
  gearList: GearItem[],
  formationId: FormationCode,
  formationLevel: number,
  slotIndexInParty: number,
  partyResonance: ResonanceSummary,
  blessings: Record<string, number>,
  constellations: Record<string, number>
): ComputedStats {
  const lvRatio = (Math.max(1, Math.min(100, prog.level)) - 1) / 99;
  const starMult = 1 + (prog.stars - 2) * 0.06;

  const baseHp = Math.round((data.hpLv1 + (data.hpLv100 - data.hpLv1) * lvRatio) * starMult);
  const baseAtk = Math.round((data.atkLv1 + (data.atkLv100 - data.atkLv1) * lvRatio) * starMult);
  const baseDef = Math.round((data.defLv1 + (data.defLv100 - data.defLv1) * lvRatio) * starMult);

  let hpPct = partyResonance.hpPct + (constellations['TITAN_BASTION'] || constellations['C_HP'] || 0) * 6;
  let atkPct = partyResonance.atkPct + (constellations['STAR_DRAGON'] || constellations['C_ATK'] || 0) * 5;
  let defPct = partyResonance.defPct + (constellations['TITAN_BASTION'] || constellations['C_HP'] || 0) * 6;
  let spdPct = partyResonance.spdPct;
  let flatSpd = 0;
  let flatHp = 0;
  let flatAtk = 0;

  let critRate = data.baseCritRate + (constellations['STAR_DRAGON'] || constellations['C_CRIT'] || 0) * 2.5;
  let critDmg = data.baseCritDmg;
  let breakPower = data.baseBreakPower + partyResonance.breakPct + (constellations['ASTRAL_NEXUS'] || constellations['C_BREAK'] || 0) * 6;
  let energyCharge = data.baseStats.energyCharge + (constellations['CHRONOS_HOURGLASS'] || 0) * 4;
  let effectHitRate = data.baseStats.effectHitRate + partyResonance.ehrPct + (constellations['ASTRAL_NEXUS'] || constellations['C_EHR'] || 0) * 4;
  let effectRes = data.baseStats.effectRes;
  let healingBonus = data.baseStats.healingBonus;

  // Star passives (3*, 5*)
  if (prog.stars >= 3) {
    if (data.element === 'Fire') atkPct += 12;
    if (data.element === 'Electro') breakPower += 15;
    if (data.element === 'Cryo') effectHitRate += 15;
    if (data.element === 'Wind') spdPct += 12;
    if (data.element === 'Light') healingBonus += 15;
    if (data.element === 'Dark') critDmg += 20;
  }
  if (prog.stars >= 5) {
    if (data.role === 'Melee DPS' || data.role === 'Ranged DPS') {
      critRate += 12;
      flatSpd += 10;
    } else if (data.role === 'Tank / Breaker') {
      defPct += 25;
      effectRes += 20;
    } else if (data.role === 'Debuffer') {
      effectHitRate += 20;
      breakPower += 20;
    } else {
      healingBonus += 15;
      energyCharge += 15;
    }
  }

  // Formation Row Bonus
  const form = FORMATIONS.find((f) => f.id === formationId) || FORMATIONS[2];
  const rowBonuses = getFormationRowBonuses(form, formationLevel);
  const isFront = slotIndexInParty >= 0 ? slotIndexInParty < form.frontCount : data.recommendedRow === 'Front';
  if (slotIndexInParty >= 0) {
    if (isFront) defPct += rowBonuses.frontDefPct;
    else atkPct += rowBonuses.backAtkPct;
  }

  // Tarot Blessings (Supports both ARCANA_00..21 and legacy B01..12 keys)
  const getBlessVal = (id: string): number => {
    const tier = blessings[id] || 0;
    if (tier <= 0) return 0;
    const card = BLESSING_CARDS.find((b) => b.id === id);
    return card ? card.tiers[Math.min(2, tier - 1)] : 0;
  };
  atkPct += getBlessVal('ARCANA_19') + getBlessVal('ARCANA_15');
  breakPower += getBlessVal('ARCANA_08');
  spdPct += getBlessVal('ARCANA_07');
  if ((blessings['ARCANA_03'] || 0) > 0) hpPct += 20;
  effectHitRate += getBlessVal('ARCANA_01');
  if ((blessings['ARCANA_10'] || 0) > 0) {
    const t = Math.min(2, (blessings['ARCANA_10'] || 1) - 1);
    const card = BLESSING_CARDS.find((b) => b.id === 'ARCANA_10');
    if (card) {
      critRate += card.tiers[t];
      critDmg += (card.secondaryTiers || [25, 40, 75])[t];
    }
  }

  // 5-Slot Equipment & Set Bonuses (Core Sigil is Exotic and independent of Set bonus per Module 3.1)
  const equipped = gearList.filter((g) => g.equippedBy === data.id);
  const setCounter: Partial<Record<SetId, number>> = {};

  const addStat = (key: string, val: number): void => {
    if (key === 'HP%' || key === 'Max HP%') hpPct += val;
    else if (key === 'ATK%' || key === 'ALL-ELEMENT DMG%') atkPct += val;
    else if (key === 'DEF%') defPct += val;
    else if (key === 'SPD') flatSpd += val;
    else if (key === 'CRIT RATE%') critRate += val;
    else if (key === 'CRIT DMG%') critDmg += val;
    else if (key === 'BREAK POWER%') breakPower += val;
    else if (key === 'ENERGY CHARGE%') energyCharge += val;
    else if (key === 'EFFECT HIT RATE%') effectHitRate += val;
    else if (key === 'EFFECT RES%') effectRes += val;
    else if (key === 'HEALING BONUS%') healingBonus += val;
  };

  equipped.forEach((g) => {
    if (g.slot !== 'Core Sigil' && !g.isExoticSigil) {
      setCounter[g.set] = (setCounter[g.set] || 0) + 1;
    }
    const mainVals = getGearMainStatValue(g);
    addStat(g.mainStatKey, mainVals.pct);
    if (g.slot === 'Weapon') flatAtk += mainVals.flat;
    if (g.slot === 'Armor') flatHp += mainVals.flat;
    g.substats.forEach((sub) => addStat(sub.stat, sub.value));
  });

  const activeSets: { set: SetId; count: number }[] = [];
  let fourPieceSet: SetId | undefined;

  (Object.entries(setCounter) as [SetId, number][]).forEach(([setId, count]) => {
    if (count >= 2) {
      activeSets.push({ set: setId, count });
      const spec = EQUIPMENT_SETS.find((s) => s.id === setId);
      if (spec) {
        Object.entries(spec.twoPieceStat).forEach(([k, v]) => addStat(k, v || 0));
      }
    }
    if (count >= 4) {
      fourPieceSet = setId;
      if (setId === 'Starfall Executioner') critDmg += 35;
    }
  });

  return {
    hp: Math.round(baseHp * (1 + hpPct / 100) + flatHp),
    atk: Math.round(baseAtk * (1 + atkPct / 100) + flatAtk),
    def: Math.round(baseDef * (1 + defPct / 100)),
    spd: Math.round(data.spd * (1 + spdPct / 100) + flatSpd),
    critRate: Math.min(100, Number(critRate.toFixed(1))),
    critDmg: Number(critDmg.toFixed(1)),
    breakPower: Number(breakPower.toFixed(1)),
    energyCharge: Number(energyCharge.toFixed(1)),
    effectHitRate: Number(effectHitRate.toFixed(1)),
    effectRes: Number(effectRes.toFixed(1)),
    healingBonus: Number(healingBonus.toFixed(1)),
    activeSets,
    fourPieceSet,
    rowPosition: isFront ? 'Front' : 'Back',
  };
}

// --- 60FPS CANVAS COMBAT STRUCTURES ---
export interface ActiveDebuff {
  type: DebuffType;
  remaining: number;
  stacks: number;
  sourceAtk: number;
}

export interface CombatHeroUnit {
  id: string;
  data: ResonatorData;
  prog: HeroProgress;
  stats: ComputedStats;
  hp: number;
  maxHp: number;
  shield: number;
  energy: number;
  basicTimer: number;
  activeCd: number;
  chainCd: number;
  titanShieldCd: number;
  reviveUsed: boolean;
  buffs: {
    atkPct: number;
    atkTimer: number;
    defPct: number;
    defTimer: number;
    critRatePct: number;
    critTimer: number;
    breakPct: number;
    breakTimer: number;
  };
  x: number;
  y: number;
  animOffset: number;
  hitFlash: number;
  lastActionLabel: string;
  lastActionTimer: number;
}

export interface BossPartUnit {
  id: 'BOSS_MAIN' | 'TENTACLE_FRONT' | 'EYE_BACK';
  name: string;
  roleLabel: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  shield: number;
  effectRes: number;
  alive: boolean;
  tauntTimer: number;
  attackTimer: number;
  specialTimer: number;
  debuffs: ActiveDebuff[];
  voidStacks: number;
  voidTimer: number;
  freezeResistTimer: number;
  x: number;
  y: number;
  hitFlash: number;
}

export interface FloatingText {
  id: number;
  text: string;
  subtext?: string;
  x: number;
  y: number;
  vy: number;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
}

export interface CutInBannerState {
  heroId: string;
  heroName: string;
  skillName: string;
  element: ElementType;
  primaryColor: string;
  remaining: number;
}

export function getFloorSegmentBp(floor: number, isBerserk: boolean): number {
  let base = 120;
  if (floor > 80) base = 360;
  else if (floor > 50) base = 260;
  else if (floor > 20) base = 180;
  return isBerserk ? Math.round(base * 1.5) : base;
}

// --- SSOT V2.1 CLASS: CHRONO COMBAT ENGINE (PRE-BATTLE LOCK & 9 REACTIONS) ---
export interface ChronoCombatHeroState {
  id: string;
  name: string;
  element: ElementType;
  role: string;
  slotIndex: number;
  row: 'Front' | 'Back';
  hp: number;
  maxHp: number;
  shield: number;
  atk: number;
  def: number;
  spd: number;
  critRate: number;
  critDmg: number;
  breakPower: number;
  energyCharge: number;
  energy: number;
  buffs: { atkPct: number; atkTimer: number; breakPct: number; breakTimer: number };
}

export interface ChronoCombatBossState {
  name: string;
  isInfiniteHp: boolean;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spdSlowPct: number;
  spdSlowTimer: number;
  isCastingSkill: boolean;
  debuffs: { type: string; element: string; remaining: number; stacks: number }[];
}

export interface ReactionResolutionResult {
  reactionId: ReactionType;
  dmgMultiplier: number;
  aoePlasmaDamage?: number;
  dynamicMultiplier?: number;
  isTrueDamage?: boolean;
  ignoreDefPct?: number;
}

export class ChronoCombatEngine {
  public mode: 'SPIRE' | 'GUILD_RAID' | 'ARENA_PVP';
  public floor: number;
  public formationId: FormationRatioId | FormationCode;
  public formationLevel: number;
  public partyHeroIds: string[];
  public unlockedConstellations: string[];

  public isCombatLocked: boolean = false;
  public battlePhase: 'PRE_BATTLE_DEPLOYMENT' | 'IN_COMBAT' | 'COMPLETED' = 'PRE_BATTLE_DEPLOYMENT';

  public elapsedSec: number = 0;
  public berserkTimeLimitSec: number = SYSTEM_CONSTANTS.BERSERK_PHASE_TIME_SEC;
  public guildRaidTimeLimitSec: number = SYSTEM_CONSTANTS.GUILD_RAID_DURATION_SEC;
  public isBerserk: boolean = false;
  public guildRaidTotalDamage: number = 0;

  public staggerSegmentsRemaining: number = SYSTEM_CONSTANTS.BOSS_STAGGER_SEGMENTS;
  public maxSegmentBp: number = SYSTEM_CONSTANTS.BOSS_STAGGER_BP_PER_SEGMENT;
  public currentSegmentBp: number = SYSTEM_CONSTANTS.BOSS_STAGGER_BP_PER_SEGMENT;
  public isStaggered: boolean = false;
  public staggerTimer: number = 0;
  public antiStaggerLockTimer: number = 0;

  public heroes: ChronoCombatHeroState[] = [];
  public boss!: ChronoCombatBossState;
  public combatLog: string[] = [];

  constructor(options: {
    mode?: 'SPIRE' | 'GUILD_RAID' | 'ARENA_PVP';
    floor?: number;
    formationId?: FormationRatioId | FormationCode;
    formationLevel?: number;
    partyHeroIds?: string[];
    unlockedConstellations?: string[];
  } = {}) {
    this.mode = options.mode || 'SPIRE';
    this.floor = options.floor || 1;
    this.formationId = options.formationId || '2-3';
    this.formationLevel = options.formationLevel || 1;
    this.partyHeroIds = options.partyHeroIds || ['H04', 'H01', 'H10', 'H07', 'H13'];
    this.unlockedConstellations = options.unlockedConstellations || [];
    this._initPreBattlePreview();
  }

  private _initPreBattlePreview(): void {
    const formBonus = getFormationBonuses(this.formationId, this.formationLevel);
    const constBonuses = aggregateConstellationBonuses(this.unlockedConstellations);

    this.heroes = this.partyHeroIds.slice(0, SYSTEM_CONSTANTS.PARTY_SIZE).map((id, slotIndex) => {
      const data = getResonatorById(id) || RESONATORS[0];
      const isFront = slotIndex < formBonus.frontCount;
      const rowDefPct = isFront ? formBonus.frontDefPctPerHero : 0;
      const rowAtkPct = !isFront ? formBonus.backAtkPctPerHero : 0;

      const hp = Math.round(
        data.baseStats.hpLv100 * (1 + (constBonuses.stats['Max HP%'] || 0) / 100) +
          (constBonuses.stats['Flat HP'] || 0)
      );
      const atk = Math.round(
        data.baseStats.atkLv100 * (1 + (rowAtkPct + (constBonuses.stats['ATK%'] || 0)) / 100) +
          (constBonuses.stats['Flat ATK'] || 0)
      );
      const def = Math.round(
        data.baseStats.defLv100 * (1 + (rowDefPct + (constBonuses.stats['DEF%'] || 0)) / 100) +
          (constBonuses.stats['Flat DEF'] || 0)
      );

      return {
        id: data.id,
        name: data.name,
        element: data.element,
        role: data.role,
        slotIndex,
        row: isFront ? 'Front' : 'Back',
        hp,
        maxHp: hp,
        shield: 0,
        atk,
        def,
        spd: data.baseStats.spd + (constBonuses.stats['SPD'] || 0),
        critRate: data.baseStats.critRate + (constBonuses.stats['Crit Rate%'] || 0),
        critDmg: data.baseStats.critDmg + (constBonuses.stats['Crit DMG%'] || 0),
        breakPower: data.baseStats.breakPower + (constBonuses.stats['Break Power%'] || 0),
        energyCharge: data.baseStats.energyCharge + (constBonuses.stats['Energy Charge%'] || 0),
        energy: constBonuses.stats['Starting Ultimate Energy%'] || 0,
        buffs: { atkPct: 0, atkTimer: 0, breakPct: 0, breakTimer: 0 },
      };
    });

    const scale = Math.pow(1.10, this.floor - 1);
    const isRaid = this.mode === 'GUILD_RAID';
    this.maxSegmentBp = Math.round(
      SYSTEM_CONSTANTS.BOSS_STAGGER_BP_PER_SEGMENT * (1 + (this.floor - 1) * 0.05)
    );
    this.currentSegmentBp = this.maxSegmentBp;

    this.boss = {
      name: isRaid
        ? 'Guild Raid Old God: Yog-Sothoth (Infinite HP)'
        : `Azathoth's Remnant (Floor ${this.floor})`,
      isInfiniteHp: isRaid,
      hp: isRaid ? Number.MAX_SAFE_INTEGER : Math.round(35000 * scale),
      maxHp: isRaid ? Number.MAX_SAFE_INTEGER : Math.round(35000 * scale),
      atk: Math.round(320 * scale),
      def: Math.round(150 + this.floor * 10),
      spdSlowPct: 0,
      spdSlowTimer: 0,
      isCastingSkill: false,
      debuffs: [],
    };
  }

  public setPreBattleDeployment(params: {
    partyHeroIds?: string[];
    formationId?: FormationRatioId | FormationCode;
    formationLevel?: number;
  }) {
    if (this.isCombatLocked) {
      throw new Error(
        'COMBAT_LOCK_ACTIVE: Cannot change formation or unit positions after combat has started!'
      );
    }
    if (Array.isArray(params.partyHeroIds) && params.partyHeroIds.length === SYSTEM_CONSTANTS.PARTY_SIZE) {
      this.partyHeroIds = [...params.partyHeroIds];
    }
    if (params.formationId) this.formationId = params.formationId;
    if (typeof params.formationLevel === 'number') this.formationLevel = params.formationLevel;
    this._initPreBattlePreview();
    return this.getDeploymentSummary();
  }

  public startCombatAndLockFormation() {
    this.isCombatLocked = true;
    this.battlePhase = 'IN_COMBAT';
    const constBonuses = aggregateConstellationBonuses(this.unlockedConstellations);

    if (constBonuses.keystones.includes('TITANS_BULWARK')) {
      this.heroes.forEach((h) => {
        if (h.row === 'Front') {
          h.shield += Math.round(h.maxHp * 0.15);
        }
      });
    }

    this.combatLog.unshift(
      `[COMBAT LOCKED] Formation ${this.formationId} (Lv.${this.formationLevel}) locked. Mode: ${this.mode}.`
    );
    return {
      locked: this.isCombatLocked,
      formationId: this.formationId,
      partyHeroIds: [...this.partyHeroIds],
    };
  }

  public resolveElementalReaction(
    triggerElement: ElementType | string,
    attackerAtk: number
  ): ReactionResolutionResult | null {
    const debuffs = this.boss.debuffs;
    if (!debuffs || debuffs.length === 0) return null;

    const findIdx = (type: string) => debuffs.findIndex((d) => d.type === type);
    const findCore4Idx = () => debuffs.findIndex((d) => CORE_4_DEBUFFS.has(d.type));

    let matchedSpec: ElementalReactionMatrixItem | null = null;
    let consumedDebuffIndex = -1;
    const extraResult: Partial<ReactionResolutionResult> = {};

    if (triggerElement === ELEMENTS.FIRE && findIdx('Freeze') !== -1) {
      matchedSpec = ELEMENTAL_REACTION_MATRIX.MELTDOWN;
      consumedDebuffIndex = findIdx('Freeze');
      debuffs.push({ type: 'Defenseless', element: ELEMENTS.FIRE, remaining: 4.0, stacks: 1 });
    } else if (triggerElement === ELEMENTS.CRYO && findIdx('Shock') !== -1) {
      matchedSpec = ELEMENTAL_REACTION_MATRIX.SUPERCONDUCT;
      consumedDebuffIndex = findIdx('Shock');
      this.heroes.forEach((h) => {
        h.buffs.breakPct = 35;
        h.buffs.breakTimer = 4.0;
      });
    } else if (triggerElement === ELEMENTS.WIND && findIdx('Burn') !== -1) {
      matchedSpec = ELEMENTAL_REACTION_MATRIX.FIRESTORM;
      consumedDebuffIndex = findIdx('Burn');
      this.heroes.forEach((h) => {
        h.energy = Math.min(100, h.energy + 10);
      });
    } else if (triggerElement === ELEMENTS.ELECTRO && findIdx('Burn') !== -1) {
      matchedSpec = ELEMENTAL_REACTION_MATRIX.OVERLOAD_PLASMA;
      consumedDebuffIndex = findIdx('Burn');
      this.boss.isCastingSkill = false;
      extraResult.aoePlasmaDamage = Math.round(attackerAtk * 2.2);
    } else if (triggerElement === ELEMENTS.WIND && findIdx('Freeze') !== -1) {
      matchedSpec = ELEMENTAL_REACTION_MATRIX.BLIZZARD;
      consumedDebuffIndex = findIdx('Freeze');
      this.boss.spdSlowPct = 30;
      this.boss.spdSlowTimer = 4.0;
    } else if (triggerElement === ELEMENTS.WIND && findIdx('Shock') !== -1) {
      matchedSpec = ELEMENTAL_REACTION_MATRIX.THUNDER_GALE;
      consumedDebuffIndex = findIdx('Shock');
      const bleed = debuffs.find((d) => d.type === 'Bleed');
      const stacks = bleed ? bleed.stacks : 1;
      extraResult.dynamicMultiplier = Number((1.5 * (1 + stacks * 0.15)).toFixed(2));
    } else if (triggerElement === ELEMENTS.DARK && findIdx('Luminous Mark') !== -1) {
      matchedSpec = ELEMENTAL_REACTION_MATRIX.TWILIGHT_EXECUTION;
      consumedDebuffIndex = findIdx('Luminous Mark');
      const bossHpPct = (this.boss.hp / this.boss.maxHp) * 100;
      extraResult.isTrueDamage = bossHpPct < 25;
      extraResult.ignoreDefPct = extraResult.isTrueDamage ? 100 : 40;
    } else if (triggerElement === ELEMENTS.LIGHT && findCore4Idx() !== -1) {
      matchedSpec = ELEMENTAL_REACTION_MATRIX.RADIANT_INFUSION;
      consumedDebuffIndex = findCore4Idx();
      this.heroes.forEach((h) => {
        if (h.hp > 0) {
          h.hp = Math.min(h.maxHp, h.hp + Math.round(h.maxHp * 0.08));
        }
      });
    } else if (triggerElement === ELEMENTS.DARK && findCore4Idx() !== -1) {
      matchedSpec = ELEMENTAL_REACTION_MATRIX.ABYSSAL_DECAY;
      const targetDebuff = debuffs[findCore4Idx()];
      targetDebuff.remaining = Number((targetDebuff.remaining + 2.0).toFixed(2));
      consumedDebuffIndex = -1;
    }

    if (!matchedSpec) return null;

    if (consumedDebuffIndex >= 0) {
      debuffs.splice(consumedDebuffIndex, 1);
    }

    const constBonuses = aggregateConstellationBonuses(this.unlockedConstellations);
    let totalReactionBp = matchedSpec.bonusStaggerBp || 0;
    if (constBonuses.keystones.includes('ASTRAL_RESONANCE')) {
      totalReactionBp += 30;
      this.heroes.forEach((h) => {
        h.energy = Math.min(100, h.energy + 5);
      });
    }
    if (totalReactionBp > 0) {
      this.applyStaggerDamage(totalReactionBp);
    }

    this.combatLog.unshift(`[REACTION] ${matchedSpec.id} triggered! ${matchedSpec.desc}`);
    return {
      reactionId: matchedSpec.id,
      dmgMultiplier: extraResult.dynamicMultiplier || matchedSpec.dmgMultiplier,
      ...extraResult,
    };
  }

  public applyStaggerDamage(bpAmount: number): void {
    if (this.isStaggered || this.antiStaggerLockTimer > 0 || bpAmount <= 0) return;
    const constBonuses = aggregateConstellationBonuses(this.unlockedConstellations);
    let rem = bpAmount;

    while (rem > 0 && this.staggerSegmentsRemaining > 0) {
      if (rem >= this.currentSegmentBp) {
        rem -= this.currentSegmentBp;
        this.staggerSegmentsRemaining -= 1;
        if (this.staggerSegmentsRemaining > 0) {
          this.currentSegmentBp = this.maxSegmentBp;
        } else {
          this.isStaggered = true;
          const bonusStaggerSec = constBonuses.stats['Stagger Duration Bonus Sec'] || 0;
          this.staggerTimer = SYSTEM_CONSTANTS.BOSS_STAGGER_DURATION_SEC + bonusStaggerSec;
          this.combatLog.unshift(
            `[BOSS STAGGERED] All 5 bars shattered! Stunned for ${this.staggerTimer.toFixed(1)}s (+50% DMG taken).`
          );
        }
      } else {
        this.currentSegmentBp -= rem;
        rem = 0;
      }
    }
  }

  public getDeploymentSummary() {
    return {
      isCombatLocked: this.isCombatLocked,
      battlePhase: this.battlePhase,
      formation: getFormationBonuses(this.formationId, this.formationLevel),
      party: this.heroes.map((h) => ({
        id: h.id,
        name: h.name,
        element: h.element,
        role: h.role,
        row: h.row,
        atk: h.atk,
        def: h.def,
        hp: h.maxHp,
      })),
    };
  }
}

export function runBalanceSelfChecks(): boolean {
  const r4 = calculateCurrentSuccessRate(4, 2);
  const r7 = calculateCurrentSuccessRate(7, 4);
  const r10 = calculateCurrentSuccessRate(10, 7);
  const r13 = calculateCurrentSuccessRate(13, 10);
  const formBonusLv10 = getFormationRowBonuses(FORMATIONS[0], 10);
  return (
    RESONATORS.length === 18 &&
    Object.keys(ELEMENTAL_REACTION_MATRIX).length === 9 &&
    r4 === 100 &&
    r7 === 100 &&
    r10 === 100 &&
    r13 === 100 &&
    formBonusLv10.frontDefPct === 7.5 &&
    formBonusLv10.backAtkPct === 30
  );
}

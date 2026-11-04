import {
  DebuffType,
  ElementType,
  FORMATIONS,
  GambitConditionSlot1,
  GambitConditionSlot2,
  getFormationRowBonuses,
  interpolateSkillMult,
  interpolateSkillProc,
  ReactionType,
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

// --- PROCEDURAL WEB AUDIO SYNTH ---
class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  play(type: 'hit' | 'crit' | 'skill' | 'chain' | 'ult' | 'stagger' | 'heal' | 'forge_ok' | 'forge_fail' | 'gacha') {
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

// --- PERSISTENT ACCOUNT STATE ---
export interface HeroProgress {
  id: string;
  unlocked: boolean;
  level: number; // 1 to 100
  stars: number; // 2 to 5
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
  formationId: 'HYPER_CARRY' | 'SOLO_BASTION' | 'BALANCED' | 'VANGUARD',
  formationLevel: number,
  slotIndexInParty: number, // 0..4 (-1 if not in party)
  partyResonance: ResonanceSummary,
  blessings: Record<string, number>,
  constellations: Record<string, number>
): ComputedStats {
  const lvRatio = (Math.max(1, Math.min(100, prog.level)) - 1) / 99;
  const starMult = 1 + (prog.stars - 2) * 0.06; // +6% base stats per star above 2*

  const baseHp = Math.round((data.hpLv1 + (data.hpLv100 - data.hpLv1) * lvRatio) * starMult);
  const baseAtk = Math.round((data.atkLv1 + (data.atkLv100 - data.atkLv1) * lvRatio) * starMult);
  const baseDef = Math.round((data.defLv1 + (data.defLv100 - data.defLv1) * lvRatio) * starMult);

  let hpPct = partyResonance.hpPct + (constellations['C_HP'] || 0) * 6;
  let atkPct = partyResonance.atkPct + (constellations['C_ATK'] || 0) * 5;
  let defPct = partyResonance.defPct + (constellations['C_HP'] || 0) * 6;
  let spdPct = partyResonance.spdPct;
  let flatSpd = 0;
  let flatHp = 0;
  let flatAtk = 0;

  let critRate = data.baseCritRate + (constellations['C_CRIT'] || 0) * 2.5;
  let critDmg = data.baseCritDmg;
  let breakPower = data.baseBreakPower + partyResonance.breakPct + (constellations['C_BREAK'] || 0) * 6;
  let energyCharge = 100;
  let effectHitRate = partyResonance.ehrPct + (constellations['C_EHR'] || 0) * 4;
  let effectRes = 0;
  let healingBonus = 0;

  // Star passives (3*, 4*, 5*)
  if (prog.stars >= 3) {
    if (data.id === 'H01') atkPct += 12;
    if (data.id === 'H02') breakPower += 20;
    if (data.id === 'H03') effectHitRate += 15;
    if (data.id === 'H04') spdPct += 15;
    if (data.id === 'H05') healingBonus += 15;
    if (data.id === 'H06') critDmg += 25;
  }
  if (prog.stars >= 5) {
    if (data.id === 'H01') { critRate += 12; flatSpd += 10; }
    if (data.id === 'H02') { defPct += 25; effectRes += 20; }
    if (data.id === 'H03') { effectHitRate += 20; breakPower += 20; }
    if (data.id === 'H04') { critRate += 12; flatSpd += 10; }
    if (data.id === 'H05') { healingBonus += 15; energyCharge += 15; }
    if (data.id === 'H06') { critRate += 15; critDmg += 25; }
  }

  // Formation Row Bonus
  const form = FORMATIONS.find((f) => f.id === formationId) || FORMATIONS[2];
  const rowBonuses = getFormationRowBonuses(form, formationLevel);
  const isFront = slotIndexInParty >= 0 ? slotIndexInParty < form.frontCount : data.recommendedRow === 'Front';
  if (slotIndexInParty >= 0) {
    if (isFront) defPct += rowBonuses.frontDefPct;
    else atkPct += rowBonuses.backAtkPct;
  }

  // Blessings
  const getBlessVal = (id: string) => {
    const tier = blessings[id] || 0;
    if (tier <= 0) return 0;
    const card = BLESSING_CARDS.find((b) => b.id === id);
    return card ? card.tiers[Math.min(2, tier - 1)] : 0;
  };
  atkPct += getBlessVal('B01');
  breakPower += getBlessVal('B02');
  spdPct += getBlessVal('B03');
  if ((blessings['B04'] || 0) > 0) hpPct += 15;
  effectHitRate += getBlessVal('B05');
  if ((blessings['B06'] || 0) > 0) {
    const t = Math.min(2, (blessings['B06'] || 1) - 1);
    const card = BLESSING_CARDS.find((b) => b.id === 'B06')!;
    critRate += card.tiers[t];
    critDmg += card.secondaryTiers![t];
  }

  // Gear & Sets
  const equipped = gearList.filter((g) => g.equippedBy === data.id);
  const setCounter: Partial<Record<SetId, number>> = {};

  const addStat = (key: string, val: number) => {
    if (key === 'HP%') hpPct += val;
    else if (key === 'ATK%') atkPct += val;
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
    setCounter[g.set] = (setCounter[g.set] || 0) + 1;
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

// --- COMBAT SIMULATION STRUCTURES ---
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
  energy: number; // 0..100
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
  voidStacks: number; // from Voidweaver 4pc
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
  remaining: number; // seconds
}

export interface CombatSnapshot {
  floor: number;
  waveElapsed: number;
  isBerserk: boolean;
  staggerSegmentsRemaining: number; // 0..5
  currentSegmentBp: number;
  maxSegmentBp: number;
  isStaggered: boolean;
  staggerTimer: number;
  staggerCheckWarningTimer: number; // 4.0s countdown before Cataclysmic Supernova
  antiStaggerLockTimer: number;
  manualFocusId: 'BOSS_MAIN' | 'TENTACLE_FRONT' | 'EYE_BACK' | null;
  firestormEnergyCd: number;
  heroes: CombatHeroUnit[];
  bossParts: BossPartUnit[];
  cutIn: CutInBannerState | null;
  combatLog: string[];
}

export function getFloorSegmentBp(floor: number, isBerserk: boolean): number {
  let base = 120;
  if (floor > 80) base = 360;
  else if (floor > 50) base = 260;
  else if (floor > 20) base = 180;
  return isBerserk ? Math.round(base * 1.5) : base;
}

// Self-check validation for core SSOT mathematical equations
export function runBalanceSelfChecks(): boolean {
  const r4 = calculateCurrentSuccessRate(4, 2); // 75 + 2*12.5 = 100%
  const r7 = calculateCurrentSuccessRate(7, 4); // 50 + 4*12.5 = 100%
  const r10 = calculateCurrentSuccessRate(10, 7); // 30 + 7*10 = 100%
  const r13 = calculateCurrentSuccessRate(13, 10); // 15 + 10*8.5 = 100%
  const formBonusLv10 = getFormationRowBonuses(FORMATIONS[0], 10); // 4-1 at Lv10: front 7.5%, back 30%
  return (
    r4 === 100 &&
    r7 === 100 &&
    r10 === 100 &&
    r13 === 100 &&
    formBonusLv10.frontDefPct === 7.5 &&
    formBonusLv10.backAtkPct === 30
  );
}

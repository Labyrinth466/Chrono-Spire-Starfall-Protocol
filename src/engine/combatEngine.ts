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
import {
  aggregateConstellationBonuses,
  canUndoConstellationNode,
  canUnlockConstellationNode,
  TOTAL_CHRONO_STARS,
} from '../data/constellations';

// --- PROCEDURAL WEB AUDIO SYNTH + LYRIA 3 AI BGM ENGINE ---
export type BgmThemeMode = 'CORRIDOR' | 'BOSS';
export type BgmEngineStatus = 'SYNTH_FALLBACK' | 'LYRIA_LOADING' | 'LYRIA_ACTIVE';

class SoundEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;
  public bgmTheme: BgmThemeMode = 'CORRIDOR';
  public bgmStatus: BgmEngineStatus = 'SYNTH_FALLBACK';
  public lastBgmError: string | null = null;

  private synthIntervalId: number | null = null;
  private synthStep: number = 0;
  private lyriaAudioMap: Partial<Record<BgmThemeMode, HTMLAudioElement>> = {};
  private lyriaFetching: Partial<Record<BgmThemeMode, boolean>> = {};
  private statusListeners: Set<() => void> = new Set();

  private notify(): void {
    this.statusListeners.forEach((cb) => cb());
  }

  public subscribe(cb: () => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

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

  public setMuted(nextMuted: boolean): void {
    this.muted = nextMuted;
    Object.values(this.lyriaAudioMap).forEach((aud) => {
      if (aud) aud.muted = nextMuted;
    });
    if (nextMuted) {
      this.stopProceduralBgm();
    } else {
      this.syncActiveBgmPlayback();
    }
    this.notify();
  }

  public setBgmTheme(theme: BgmThemeMode): void {
    if (this.bgmTheme === theme && (this.synthIntervalId !== null || this.bgmStatus === 'LYRIA_ACTIVE')) {
      return;
    }
    this.bgmTheme = theme;
    this.syncActiveBgmPlayback();
    this.notify();
  }

  private stopProceduralBgm(): void {
    if (this.synthIntervalId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.synthIntervalId);
      this.synthIntervalId = null;
    }
  }

  private startProceduralBgm(): void {
    if (this.muted || typeof window === 'undefined') return;
    if (this.synthIntervalId !== null) return;

    const corridorNotes = [220.0, 261.63, 329.63, 392.0, 329.63, 293.66, 246.94, 196.0];
    const bossNotes = [146.83, 155.56, 196.0, 220.0, 233.08, 220.0, 174.61, 164.81];

    this.synthIntervalId = window.setInterval(() => {
      if (this.muted || this.bgmStatus === 'LYRIA_ACTIVE') return;
      try {
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const isBoss = this.bgmTheme === 'BOSS';
        const seq = isBoss ? bossNotes : corridorNotes;
        const freq = seq[this.synthStep % seq.length];
        this.synthStep += 1;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isBoss ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(isBoss ? 0.025 : 0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + (isBoss ? 0.24 : 0.36));
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + (isBoss ? 0.25 : 0.38));
      } catch {
        // Ignore audio context autoplay restriction until first user interaction
      }
    }, 280);
  }

  private syncActiveBgmPlayback(): void {
    if (this.muted) {
      this.stopProceduralBgm();
      Object.values(this.lyriaAudioMap).forEach((a) => a?.pause());
      return;
    }

    const otherTheme: BgmThemeMode = this.bgmTheme === 'BOSS' ? 'CORRIDOR' : 'BOSS';
    this.lyriaAudioMap[otherTheme]?.pause();

    const activeLyria = this.lyriaAudioMap[this.bgmTheme];
    if (activeLyria) {
      this.stopProceduralBgm();
      this.bgmStatus = 'LYRIA_ACTIVE';
      activeLyria.muted = this.muted;
      activeLyria.play().catch(() => {
        this.bgmStatus = 'SYNTH_FALLBACK';
        this.startProceduralBgm();
      });
    } else {
      this.bgmStatus = this.lyriaFetching[this.bgmTheme] ? 'LYRIA_LOADING' : 'SYNTH_FALLBACK';
      this.startProceduralBgm();
    }
  }

  public async generateLyriaBgm(theme: BgmThemeMode = this.bgmTheme): Promise<boolean> {
    if (this.lyriaAudioMap[theme]) {
      this.setBgmTheme(theme);
      return true;
    }
    if (this.lyriaFetching[theme]) return false;

    this.lyriaFetching[theme] = true;
    this.lastBgmError = null;
    if (this.bgmTheme === theme) {
      this.bgmStatus = 'LYRIA_LOADING';
    }
    // Keep Web Audio synth fallback playing non-blocking while Lyria 3 generates
    this.startProceduralBgm();
    this.notify();

    try {
      const resp = await fetch('/api/bgm/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackType: theme }),
      });
      const data = await resp.json();
      if (!resp.ok || !data?.ok || !data?.audioDataUrl) {
        this.lastBgmError = data?.error || 'Lyria 3 unavailable; Web Audio synth fallback active.';
        this.lyriaFetching[theme] = false;
        this.bgmStatus = 'SYNTH_FALLBACK';
        this.notify();
        return false;
      }

      const audio = new Audio(data.audioDataUrl);
      audio.loop = true;
      audio.volume = 0.38;
      audio.muted = this.muted;
      this.lyriaAudioMap[theme] = audio;
      this.lyriaFetching[theme] = false;
      this.syncActiveBgmPlayback();
      this.notify();
      return true;
    } catch (err: unknown) {
      this.lastBgmError =
        err instanceof Error ? err.message : 'Lyria 3 request failed; Web Audio synth fallback active.';
      this.lyriaFetching[theme] = false;
      this.bgmStatus = 'SYNTH_FALLBACK';
      this.notify();
      return false;
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
      if (this.synthIntervalId === null && this.bgmStatus !== 'LYRIA_ACTIVE') {
        this.startProceduralBgm();
      }
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

// --- ELEMENTAL ADVANTAGE / COUNTER SYSTEM (v2.2) ---
// Primary 4-Element Cycle: Fire > Wind > Electro > Cryo > Fire
// Astral Dual Counter: Light <-> Dark (mutual advantage, never resist)
export interface ElementalCounterResult {
  state: 'ADVANTAGE' | 'DISADVANTAGE' | 'NEUTRAL';
  dmgMult: number;
  bpMult: number;
  bonusCritRate: number;
  tag?: 'WEAK!' | 'RESIST';
}

const PRIMARY_ADVANTAGE_MAP: Partial<Record<ElementType, ElementType>> = {
  Fire: 'Wind',
  Wind: 'Electro',
  Electro: 'Cryo',
  Cryo: 'Fire',
};

export function getRecommendedCounterElement(enemyElement: ElementType): ElementType {
  if (enemyElement === 'Wind') return 'Fire';
  if (enemyElement === 'Electro') return 'Wind';
  if (enemyElement === 'Cryo') return 'Electro';
  if (enemyElement === 'Fire') return 'Cryo';
  if (enemyElement === 'Light') return 'Dark';
  return 'Light';
}

export function getRecommendedFloorCP(floor: number): number {
  return Math.round(8500 * Math.pow(1.075, Math.max(0, floor - 1)));
}

export function evaluateElementalCounter(
  attackerElement: ElementType,
  defenderElement: ElementType
): ElementalCounterResult {
  if (
    (attackerElement === 'Light' && defenderElement === 'Dark') ||
    (attackerElement === 'Dark' && defenderElement === 'Light')
  ) {
    return {
      state: 'ADVANTAGE',
      dmgMult: 1.3,
      bpMult: 1.25,
      bonusCritRate: 15,
      tag: 'WEAK!',
    };
  }

  if (PRIMARY_ADVANTAGE_MAP[attackerElement] === defenderElement) {
    return {
      state: 'ADVANTAGE',
      dmgMult: 1.3,
      bpMult: 1.25,
      bonusCritRate: 15,
      tag: 'WEAK!',
    };
  }

  if (PRIMARY_ADVANTAGE_MAP[defenderElement] === attackerElement) {
    return {
      state: 'DISADVANTAGE',
      dmgMult: 0.8,
      bpMult: 0.85,
      bonusCritRate: 0,
      tag: 'RESIST',
    };
  }

  return {
    state: 'NEUTRAL',
    dmgMult: 1.0,
    bpMult: 1.0,
    bonusCritRate: 0,
  };
}

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
  constellations: Record<string, number>,
  unlockedNodeIds: string[] = []
): ComputedStats {
  const lvRatio = (Math.max(1, Math.min(100, prog.level)) - 1) / 99;
  const starMult = 1 + (prog.stars - 2) * 0.06;

  const baseHp = Math.round((data.hpLv1 + (data.hpLv100 - data.hpLv1) * lvRatio) * starMult);
  const baseAtk = Math.round((data.atkLv1 + (data.atkLv100 - data.atkLv1) * lvRatio) * starMult);
  const baseDef = Math.round((data.defLv1 + (data.defLv100 - data.defLv1) * lvRatio) * starMult);

  const nodeBonuses = aggregateConstellationBonuses(unlockedNodeIds).stats;

  const seasonalStars = constellations['SEASONAL_CROWN'] || 0;
  const offenseZodiacStars =
    (constellations['ARIES'] || 0) +
    (constellations['LEO'] || 0) +
    (constellations['SAGITTARIUS'] || 0) +
    (constellations['STAR_DRAGON'] || 0);
  const bastionZodiacStars =
    (constellations['TAURUS'] || 0) +
    (constellations['CANCER'] || 0) +
    (constellations['CAPRICORN'] || 0) +
    (constellations['TITAN_BASTION'] || 0);
  const nexusZodiacStars =
    (constellations['VIRGO'] || 0) +
    (constellations['LIBRA'] || 0) +
    (constellations['SCORPIO'] || 0) +
    (constellations['ASTRAL_NEXUS'] || 0);
  const chronoZodiacStars =
    (constellations['GEMINI'] || 0) +
    (constellations['AQUARIUS'] || 0) +
    (constellations['PISCES'] || 0) +
    (constellations['CHRONOS_HOURGLASS'] || 0);

  let hpPct =
    partyResonance.hpPct +
    bastionZodiacStars * 1.5 +
    seasonalStars * 1.5 +
    (nodeBonuses['Max HP%'] || 0);
  let atkPct =
    partyResonance.atkPct +
    offenseZodiacStars * 1.5 +
    seasonalStars * 1.5 +
    (nodeBonuses['ATK%'] || 0);
  let defPct =
    partyResonance.defPct +
    bastionZodiacStars * 1.5 +
    seasonalStars * 1.5 +
    (nodeBonuses['DEF%'] || 0);
  let spdPct = partyResonance.spdPct;
  let flatSpd = nodeBonuses['SPD'] || 0;
  let flatHp = nodeBonuses['Flat HP'] || 0;
  let flatAtk = nodeBonuses['Flat ATK'] || 0;

  let critRate =
    data.baseCritRate +
    offenseZodiacStars * 0.8 +
    (nodeBonuses['Crit Rate%'] || 0);
  let critDmg = data.baseCritDmg + (nodeBonuses['Crit DMG%'] || 0);
  let breakPower =
    data.baseBreakPower +
    partyResonance.breakPct +
    nexusZodiacStars * 1.5 +
    seasonalStars * 1.5 +
    (nodeBonuses['Break Power%'] || 0);
  let energyCharge =
    data.baseStats.energyCharge +
    chronoZodiacStars * 1.2 +
    (nodeBonuses['Energy Charge%'] || 0);
  let effectHitRate =
    data.baseStats.effectHitRate +
    partyResonance.ehrPct +
    nexusZodiacStars * 1.2 +
    (nodeBonuses['Effect Hit Rate%'] || 0);
  let effectRes = data.baseStats.effectRes + (nodeBonuses['Effect RES%'] || 0);
  let healingBonus = data.baseStats.healingBonus + (nodeBonuses['Healing Bonus%'] || 0);

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

export function computeHeroCP(
  stats: ComputedStats,
  prog: HeroProgress,
  gearList: GearItem[],
  heroId: string
): number {
  const baseGearScore = stats.hp * 0.2 + stats.atk * 2.5 + stats.def * 2.0 + stats.spd * 8;
  const critRateDec = stats.critRate / 100;
  const critDmgDec = stats.critDmg / 100;
  const breakDec = stats.breakPower / 100;
  const energyDec = stats.energyCharge / 100;
  const statusDec = stats.effectHitRate / 100;

  const substatMult = Math.max(
    1,
    1 +
      critRateDec * 0.8 +
      (critDmgDec - 1.5) * 0.4 +
      (breakDec - 1.0) * 0.5 +
      (energyDec - 1.0) * 0.5 +
      statusDec * 0.5
  );

  const totalSkillLv =
    prog.skillLevels.basic +
    prog.skillLevels.active +
    prog.skillLevels.chain +
    prog.skillLevels.ultimate;
  const hasTwoPiece = stats.activeSets.length > 0;
  const hasFourPiece = Boolean(stats.fourPieceSet);
  const hasCoreSigil = gearList.some((g) => g.equippedBy === heroId && g.slot === 'Core Sigil');

  const flatBonus =
    totalSkillLv * 180 +
    (hasTwoPiece ? 600 : 0) +
    (hasFourPiece ? 1500 : 0) +
    (hasCoreSigil ? 1200 : 0);

  return Math.round(baseGearScore * substatMult + flatBonus);
}

export function computeSquadCP(
  partyIds: string[],
  heroCpMap: Record<string, number>,
  formationLevel: number
): number {
  const sumHeroes = partyIds.reduce((sum, id) => sum + (heroCpMap[id] || 0), 0);
  return sumHeroes + formationLevel * 750;
}

export interface CPBreakdownItem {
  category: 'Base Stats' | 'Gear' | 'Skill Levels' | 'Constellation Stars';
  cp: number;
  pct: number;
  color: string;
  detail: string;
}

export function computeHeroCPBreakdown(
  data: ResonatorData,
  prog: HeroProgress,
  gearList: GearItem[],
  formationId: FormationCode,
  formationLevel: number,
  slotIndexInParty: number,
  partyResonance: ResonanceSummary,
  blessings: Record<string, number>,
  constellations: Record<string, number>,
  unlockedNodeIds: string[] = []
): { totalCp: number; items: CPBreakdownItem[] } {
  const zeroSkillProg: HeroProgress = {
    ...prog,
    skillLevels: { basic: 0, active: 0, chain: 0, ultimate: 0 },
  };
  const baseOnlyStats = computeHeroStats(
    data,
    zeroSkillProg,
    [],
    formationId,
    formationLevel,
    slotIndexInParty,
    partyResonance,
    blessings,
    {},
    []
  );
  const baseCp = computeHeroCP(baseOnlyStats, zeroSkillProg, [], data.id);

  const constOnlyStats = computeHeroStats(
    data,
    zeroSkillProg,
    [],
    formationId,
    formationLevel,
    slotIndexInParty,
    partyResonance,
    blessings,
    constellations,
    unlockedNodeIds
  );
  const constCp = Math.max(0, computeHeroCP(constOnlyStats, zeroSkillProg, [], data.id) - baseCp);

  const totalSkillLv =
    prog.skillLevels.basic +
    prog.skillLevels.active +
    prog.skillLevels.chain +
    prog.skillLevels.ultimate;
  const skillCp = totalSkillLv * 180;

  const fullStats = computeHeroStats(
    data,
    prog,
    gearList,
    formationId,
    formationLevel,
    slotIndexInParty,
    partyResonance,
    blessings,
    constellations,
    unlockedNodeIds
  );
  const totalCp = computeHeroCP(fullStats, prog, gearList, data.id);
  const gearCp = Math.max(0, totalCp - baseCp - constCp - skillCp);
  const sumCp = Math.max(1, baseCp + gearCp + skillCp + constCp);

  const equippedCount = gearList.filter((g) => g.equippedBy === data.id).length;
  const totalConstStars = Object.values(constellations).reduce((a, b) => a + b, 0);

  return {
    totalCp,
    items: [
      {
        category: 'Base Stats',
        cp: baseCp,
        pct: Number(((baseCp / sumCp) * 100).toFixed(1)),
        color: '#f59e0b',
        detail: `Lv.${prog.level} · ${prog.stars}★ Ascension · ${fullStats.rowPosition} Row`,
      },
      {
        category: 'Gear',
        cp: gearCp,
        pct: Number(((gearCp / sumCp) * 100).toFixed(1)),
        color: '#38bdf8',
        detail: `${equippedCount}/5 Relics · ${
          fullStats.fourPieceSet
            ? `4-PC ${fullStats.fourPieceSet}`
            : fullStats.activeSets.length > 0
            ? '2-PC Set Active'
            : 'No Set Bonus'
        }`,
      },
      {
        category: 'Skill Levels',
        cp: skillCp,
        pct: Number(((skillCp / sumCp) * 100).toFixed(1)),
        color: '#34d399',
        detail: `Total Skill Lv.${totalSkillLv}/40 (+180 CP/Lv)`,
      },
      {
        category: 'Constellation Stars',
        cp: constCp,
        pct: Number(((constCp / sumCp) * 100).toFixed(1)),
        color: '#c084fc',
        detail: `${totalConstStars}/${TOTAL_CHRONO_STARS}★ Chrono Rewind Nodes`,
      },
    ],
  };
}

// --- 60FPS CANVAS COMBAT STRUCTURES ---
export type HeroAnimState =
  | 'IDLE'
  | 'RUN_DASH'
  | 'ATTACK_COMBO'
  | 'SKILL_CAST'
  | 'ULTIMATE_CAST'
  | 'STAGGER_HIT';

export type BossPartId =
  | 'BOSS_MAIN'
  | 'TENTACLE_FRONT'
  | 'RIGHT_ARM'
  | 'EYE_BACK'
  | 'MINION_1'
  | 'MINION_2'
  | 'MINION_3'
  | 'ARENA_1'
  | 'ARENA_2'
  | 'ARENA_3'
  | 'ARENA_4'
  | 'ARENA_5';

export type BattleSubMode = 'SPIRE' | 'DOMAINS' | 'GUILD_RAID' | 'ARENA';

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
  animState: HeroAnimState;
  animTimer: number;
  targetX: number;
  targetY: number;
  hitFlash: number;
  lastActionLabel: string;
  lastActionTimer: number;
}

export interface BossPartUnit {
  id: BossPartId;
  name: string;
  roleLabel: string;
  element: ElementType;
  rivalHeroId?: string;
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
  element?: ElementType;
  x: number;
  y: number;
  vy: number;
  color: string;
  scale: number;
  life: number;
  maxLife: number;
}

export interface ImpactShockwave {
  id: number;
  x: number;
  y: number;
  color: string;
  secondaryColor: string;
  maxRadius: number;
  life: number;
  maxLife: number;
  label?: string;
}

export interface CutInBannerState {
  heroId: string;
  heroName: string;
  skillName: string;
  element: ElementType;
  primaryColor: string;
  remaining: number;
}

/**
 * SSOT v2.1 Module 4.2: Status Proc Formula
 * Total Proc Chance = Base Skill Chance + Gear Status Chance Bonus (Effect Hit Rate%)
 * Example Max Build: Active Skill Lv.10 (55%) + Ring/Sigil (+25%) + 2-PC Omen/Voidweaver (+20%) = 100%
 */
export function calculateTotalStatusProcChance(
  baseSkillProcPct: number,
  gearStatusChanceBonusPct: number,
  bonusSituationalPct: number = 0,
  targetEffectResPct: number = 0
): number {
  const rawTotal = baseSkillProcPct + gearStatusChanceBonusPct + bonusSituationalPct;
  return Math.max(0, Math.min(100, rawTotal - targetEffectResPct));
}

export function getFloorSegmentBp(floor: number, isBerserk: boolean): number {
  let base = 120;
  if (floor > 80) base = 360;
  else if (floor > 50) base = 260;
  else if (floor > 20) base = 180;
  if (floor % 5 !== 0) base = Math.round(base * 0.3);
  return isBerserk ? Math.round(base * 1.5) : base;
}

const FLOOR_ELEMENT_CYCLE: ElementType[] = ['Fire', 'Cryo', 'Wind', 'Electro', 'Dark', 'Light'];

export function getFloorPrimaryElement(targetFloor: number, domainId?: string): ElementType {
  if (domainId === 'GOLD_VAULT') return 'Light';
  if (domainId === 'DOMAIN_I') return 'Fire';
  if (domainId === 'DOMAIN_II') return 'Cryo';
  if (domainId === 'DOMAIN_III') return 'Electro';
  return FLOOR_ELEMENT_CYCLE[(Math.max(1, targetFloor) - 1) % FLOOR_ELEMENT_CYCLE.length];
}

export function createFloorEncounter(
  targetFloor: number,
  mode: BattleSubMode = 'SPIRE',
  domainId?: string
): {
  isBossFloor: boolean;
  bossParts: BossPartUnit[];
  staggerSegments: number;
  maxSegmentBp: number;
} {
  const floorScale = Math.pow(1.11, Math.max(0, targetFloor - 1));
  const baseBossHp = Math.round(26000 * floorScale);
  const baseBossAtk = Math.round(280 * floorScale);
  const baseBossDef = Math.round(140 + targetFloor * 12);
  const segBp = getFloorSegmentBp(targetFloor, false);
  const primaryEl = getFloorPrimaryElement(targetFloor, domainId);

  // MODE: 1v1 ASYNC ARENA (5v5 Gambit AI Defense Squad on Canvas)
  if (mode === 'ARENA') {
    const rivalIds = ['H04', 'H01', 'H08', 'H07', 'H13'];
    const positions: [number, number][] = [
      [590, 205],
      [590, 290],
      [755, 165],
      [755, 240],
      [755, 315],
    ];
    const arenaParts: BossPartUnit[] = rivalIds.map((hid, idx) => {
      const rData = RESONATORS.find((r) => r.id === hid) || RESONATORS[0];
      const uHp = Math.round(16500 * (1 + targetFloor * 0.04));
      return {
        id: (`ARENA_${idx + 1}`) as BossPartId,
        name: `Rival ${rData.name.split(' ')[0]}`,
        roleLabel: `${rData.element} ${rData.role}`,
        element: rData.element,
        rivalHeroId: rData.id,
        hp: uHp,
        maxHp: uHp,
        atk: Math.round(baseBossAtk * 0.72),
        def: Math.round(baseBossDef * 0.75),
        shield: idx < 2 ? Math.round(uHp * 0.15) : 0,
        effectRes: 15,
        alive: true,
        tauntTimer: idx === 0 ? 3.0 : 0,
        attackTimer: 1.9 + idx * 0.35,
        specialTimer: 7.5 + idx * 0.8,
        debuffs: [],
        voidStacks: 0,
        voidTimer: 0,
        freezeResistTimer: 0,
        x: positions[idx][0],
        y: positions[idx][1],
        hitFlash: 0,
      };
    });
    return {
      isBossFloor: false,
      bossParts: arenaParts,
      staggerSegments: 3,
      maxSegmentBp: 100,
    };
  }

  // MODE: GUILD RAID BOSS (90s Infinite HP Old God)
  if (mode === 'GUILD_RAID') {
    const raidHp = 999999999;
    const raidParts: BossPartUnit[] = [
      {
        id: 'TENTACLE_FRONT',
        name: 'Left Arm: Void Bastion',
        roleLabel: 'Raid Guard (Taunt)',
        element: 'Cryo',
        hp: raidHp,
        maxHp: raidHp,
        atk: Math.round(baseBossAtk * 0.9),
        def: Math.round(baseBossDef * 1.1),
        shield: 0,
        effectRes: 20,
        alive: true,
        tauntTimer: 3.0,
        attackTimer: 2.3,
        specialTimer: 8.5,
        debuffs: [],
        voidStacks: 0,
        voidTimer: 0,
        freezeResistTimer: 0,
        x: 545,
        y: 265,
        hitFlash: 0,
      },
      {
        id: 'RIGHT_ARM',
        name: 'Right Arm: Abyssal Crusher',
        roleLabel: 'Raid Cleaver',
        element: 'Fire',
        hp: raidHp,
        maxHp: raidHp,
        atk: Math.round(baseBossAtk * 1.05),
        def: Math.round(baseBossDef * 0.95),
        shield: 0,
        effectRes: 20,
        alive: true,
        tauntTimer: 0,
        attackTimer: 2.8,
        specialTimer: 9.5,
        debuffs: [],
        voidStacks: 0,
        voidTimer: 0,
        freezeResistTimer: 0,
        x: 615,
        y: 165,
        hitFlash: 0,
      },
      {
        id: 'BOSS_MAIN',
        name: 'Guild Raid God: Yog-Sothoth (Infinite HP)',
        roleLabel: '90s Raid Core',
        element: 'Dark',
        hp: raidHp,
        maxHp: raidHp,
        atk: baseBossAtk,
        def: baseBossDef,
        shield: 0,
        effectRes: 25,
        alive: true,
        tauntTimer: 0,
        attackTimer: 2.5,
        specialTimer: 8.0,
        debuffs: [],
        voidStacks: 0,
        voidTimer: 0,
        freezeResistTimer: 0,
        x: 735,
        y: 220,
        hitFlash: 0,
      },
      {
        id: 'EYE_BACK',
        name: 'Cosmic Eye of Madness',
        roleLabel: 'Raid Support',
        element: 'Electro',
        hp: raidHp,
        maxHp: raidHp,
        atk: Math.round(baseBossAtk * 1.0),
        def: Math.round(baseBossDef * 0.7),
        shield: 0,
        effectRes: 20,
        alive: true,
        tauntTimer: 0,
        attackTimer: 3.0,
        specialTimer: 10.0,
        debuffs: [],
        voidStacks: 0,
        voidTimer: 0,
        freezeResistTimer: 0,
        x: 870,
        y: 175,
        hitFlash: 0,
      },
    ];
    return {
      isBossFloor: true,
      bossParts: raidParts,
      staggerSegments: 5,
      maxSegmentBp: 180,
    };
  }

  const isBossFloor = targetFloor % 5 === 0 || Boolean(domainId);

  if (!isBossFloor) {
    // Normal Corridor (F1-F4, F6-F9): 2-3 Void Minions with 3-4x lower HP & Stagger
    const minionCount = targetFloor % 2 === 1 ? 2 : 3;
    const minionSpecs: { id: BossPartId; name: string; role: string; x: number; y: number; hpMult: number }[] = [
      { id: 'MINION_1', name: 'Void Vanguard Husk', role: 'Frontline Minion', x: 610, y: 245, hpMult: 0.24 },
      { id: 'MINION_2', name: 'Starfall Stalker', role: 'Striker Minion', x: 745, y: 185, hpMult: 0.22 },
      { id: 'MINION_3', name: 'Chrono Wraith', role: 'Caster Minion', x: 855, y: 260, hpMult: 0.20 },
    ];
    const bossParts: BossPartUnit[] = minionSpecs.slice(0, minionCount).map((m, idx) => {
      const mHp = Math.max(1200, Math.round(baseBossHp * m.hpMult));
      const minionEl = FLOOR_ELEMENT_CYCLE[(targetFloor + idx - 1) % FLOOR_ELEMENT_CYCLE.length];
      return {
        id: m.id,
        name: m.name,
        roleLabel: m.role,
        element: minionEl,
        hp: mHp,
        maxHp: mHp,
        atk: Math.round(baseBossAtk * 0.65),
        def: Math.round(baseBossDef * 0.65),
        shield: 0,
        effectRes: Math.min(20, targetFloor),
        alive: true,
        tauntTimer: 0,
        attackTimer: 2.2 + idx * 0.4,
        specialTimer: 9.0 + idx * 1.2,
        debuffs: [],
        voidStacks: 0,
        voidTimer: 0,
        freezeResistTimer: 0,
        x: m.x,
        y: m.y,
        hitFlash: 0,
      };
    });
    return {
      isBossFloor: false,
      bossParts,
      staggerSegments: 2,
      maxSegmentBp: segBp,
    };
  }

  const armLeftEl = FLOOR_ELEMENT_CYCLE[(targetFloor + 1) % FLOOR_ELEMENT_CYCLE.length];
  const armRightEl = FLOOR_ELEMENT_CYCLE[(targetFloor + 2) % FLOOR_ELEMENT_CYCLE.length];
  const eyeEl = FLOOR_ELEMENT_CYCLE[(targetFloor + 3) % FLOOR_ELEMENT_CYCLE.length];

  const bossParts: BossPartUnit[] = [
    {
      id: 'TENTACLE_FRONT',
      name: 'Left Arm: Void Bastion',
      roleLabel: 'Front Guard (Taunt)',
      element: domainId ? primaryEl : armLeftEl,
      hp: Math.round(baseBossHp * 0.32),
      maxHp: Math.round(baseBossHp * 0.32),
      atk: Math.round(baseBossAtk * 0.85),
      def: Math.round(baseBossDef * 1.2),
      shield: 0,
      effectRes: Math.min(40, targetFloor),
      alive: true,
      tauntTimer: 3.5,
      attackTimer: 2.2,
      specialTimer: 8.5,
      debuffs: [],
      voidStacks: 0,
      voidTimer: 0,
      freezeResistTimer: 0,
      x: 545,
      y: 265,
      hitFlash: 0,
    },
    {
      id: 'RIGHT_ARM',
      name: 'Right Arm: Abyssal Crusher',
      roleLabel: 'Cleave Striker',
      element: domainId ? primaryEl : armRightEl,
      hp: Math.round(baseBossHp * 0.3),
      maxHp: Math.round(baseBossHp * 0.3),
      atk: Math.round(baseBossAtk * 1.05),
      def: Math.round(baseBossDef * 0.95),
      shield: 0,
      effectRes: Math.min(38, targetFloor),
      alive: true,
      tauntTimer: 0,
      attackTimer: 2.8,
      specialTimer: 9.5,
      debuffs: [],
      voidStacks: 0,
      voidTimer: 0,
      freezeResistTimer: 0,
      x: 615,
      y: 165,
      hitFlash: 0,
    },
    {
      id: 'BOSS_MAIN',
      name: domainId
        ? `${domainId.replace('_', ' ')} Sovereign Core`
        : "Old God Core: Azathoth's Remnant",
      roleLabel: 'Cosmic Core Boss',
      element: primaryEl,
      hp: baseBossHp,
      maxHp: baseBossHp,
      atk: baseBossAtk,
      def: baseBossDef,
      shield: 0,
      effectRes: Math.min(45, 5 + targetFloor),
      alive: true,
      tauntTimer: 0,
      attackTimer: 2.5,
      specialTimer: 8.0,
      debuffs: [],
      voidStacks: 0,
      voidTimer: 0,
      freezeResistTimer: 0,
      x: 735,
      y: 220,
      hitFlash: 0,
    },
    {
      id: 'EYE_BACK',
      name: 'Cosmic Eye of Madness',
      roleLabel: 'Backline Support (Aegis)',
      element: domainId ? primaryEl : eyeEl,
      hp: Math.round(baseBossHp * 0.25),
      maxHp: Math.round(baseBossHp * 0.25),
      atk: Math.round(baseBossAtk * 1.1),
      def: Math.round(baseBossDef * 0.7),
      shield: 0,
      effectRes: Math.min(35, targetFloor),
      alive: true,
      tauntTimer: 0,
      attackTimer: 3.0,
      specialTimer: 10.0,
      debuffs: [],
      voidStacks: 0,
      voidTimer: 0,
      freezeResistTimer: 0,
      x: 870,
      y: 175,
      hitFlash: 0,
    },
  ];

  return {
    isBossFloor: true,
    bossParts,
    staggerSegments: 5,
    maxSegmentBp: segBp,
  };
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
  const sampleProg: HeroProgress = {
    id: 'H01',
    unlocked: true,
    level: 25,
    stars: 3,
    skillLevels: { basic: 3, active: 4, chain: 4, ultimate: 3 },
    gambit1: 'BOSS_STAGGER_OPEN',
    gambit2: 'TARGET_HAS_BURN',
  };
  const sampleStats = computeHeroStats(
    RESONATORS[0],
    sampleProg,
    [],
    'BALANCED',
    3,
    0,
    computePartyResonance(['H01']),
    {},
    {}
  );
  const sampleCp = computeHeroCP(sampleStats, sampleProg, [], 'H01');
  const sampleSquadCp = computeSquadCP(['H01'], { H01: sampleCp }, 3);
  // Unique 12-Zodiac Chrono Rewind checks: strict parent-child edges + Major Keystone gate + single Keystone lock
  const strictConnectedLine =
    canUnlockConstellationNode(5, [1, 2], 'ARIES') &&
    !canUnlockConstellationNode(6, [1, 2], 'ARIES');
  const ariesAllExceptKeystones = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
  const canKeystone19 = canUnlockConstellationNode(19, ariesAllExceptKeystones, 'ARIES');
  const lockedOtherKeystone = !canUnlockConstellationNode(
    20,
    [...ariesAllExceptKeystones, 19],
    'ARIES'
  );
  const canUndoLeaf =
    canUndoConstellationNode(19, [...ariesAllExceptKeystones, 19], 'ARIES') &&
    !canUndoConstellationNode(14, [...ariesAllExceptKeystones, 19], 'ARIES');
  const fireVsWind = evaluateElementalCounter('Fire', 'Wind');
  const windVsFire = evaluateElementalCounter('Wind', 'Fire');
  const lightVsDark = evaluateElementalCounter('Light', 'Dark');
  const darkVsLight = evaluateElementalCounter('Dark', 'Light');
  const counterChecks =
    fireVsWind.state === 'ADVANTAGE' &&
    fireVsWind.dmgMult === 1.3 &&
    fireVsWind.bpMult === 1.25 &&
    fireVsWind.bonusCritRate === 15 &&
    windVsFire.state === 'DISADVANTAGE' &&
    windVsFire.dmgMult === 0.8 &&
    windVsFire.bpMult === 0.85 &&
    lightVsDark.state === 'ADVANTAGE' &&
    darkVsLight.state === 'ADVANTAGE' &&
    getRecommendedFloorCP(1) === 8500;

  return (
    RESONATORS.length === 18 &&
    Object.keys(ELEMENTAL_REACTION_MATRIX).length === 9 &&
    r4 === 100 &&
    r7 === 100 &&
    r10 === 100 &&
    r13 === 100 &&
    formBonusLv10.frontDefPct === 7.5 &&
    formBonusLv10.backAtkPct === 30 &&
    sampleCp > 2500 &&
    sampleSquadCp === sampleCp + 2250 &&
    strictConnectedLine &&
    canKeystone19 &&
    lockedOtherKeystone &&
    canUndoLeaf &&
    counterChecks
  );
}


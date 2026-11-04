/**
 * CHRONO SPIRE: STARFALL PROTOCOL — Master SSOT v2.1 (Unified TypeScript)
 * File 3: src/data/equipment.ts
 * Unifies the 5-Slot Equipment System (Weapon, Armor, Ring I, Ring II with Shared Universal Pool,
 * Exotic Core Sigil with Sigil Core Trait), +0 to +15 Fail Stack Pity, 8 Canonical Sets,
 * 3 Weekly Key Gear Domains, and 22 Major Arcana Tarot Blessings.
 */

import { MAJOR_ARCANA_TAROT, MajorArcanaTarotSpec } from '../config/constants';
import { GRAND_CONSTELLATIONS } from './constellations';
import { RESONATORS } from './resonators';

export type GearSlot = 'Weapon' | 'Armor' | 'Ring I' | 'Ring II' | 'Core Sigil';

export const EQUIPMENT_SLOTS = Object.freeze({
  WEAPON: 'Weapon' as GearSlot,
  ARMOR: 'Armor' as GearSlot,
  RING_1: 'Ring I' as GearSlot,
  RING_2: 'Ring II' as GearSlot,
  CORE_SIGIL: 'Core Sigil' as GearSlot,
});

export const ALL_GEAR_SLOTS: readonly GearSlot[] = Object.freeze([
  'Weapon',
  'Armor',
  'Ring I',
  'Ring II',
  'Core Sigil',
]);

export type SetId =
  | 'Starfall Executioner'
  | 'Astral Nexus'
  | 'Eclipse'
  | 'Overload'
  | 'Titan'
  | 'Volatus'
  | 'Radiant Dawn'
  | 'Voidweaver';

export type StatKey =
  | 'HP%'
  | 'ATK%'
  | 'DEF%'
  | 'SPD'
  | 'CRIT RATE%'
  | 'CRIT DMG%'
  | 'BREAK POWER%'
  | 'ENERGY CHARGE%'
  | 'EFFECT HIT RATE%'
  | 'EFFECT RES%'
  | 'HEALING BONUS%'
  | 'ALL-ELEMENT DMG%';

export interface UniversalRingPoolItem {
  stat: string;
  statKey: StatKey;
  baseValue: number;
}

/**
 * Shared Universal Ring Pool for Ring I & Ring II (Module 3.1)
 * Allows freely stacking identical main stats across both rings (e.g., Double ATK% or Double Crit).
 */
export const UNIVERSAL_RING_MAIN_STAT_POOL: readonly UniversalRingPoolItem[] = Object.freeze([
  { stat: 'ATK%', statKey: 'ATK%', baseValue: 10.0 },
  { stat: 'Crit Rate%', statKey: 'CRIT RATE%', baseValue: 8.0 },
  { stat: 'Crit DMG%', statKey: 'CRIT DMG%', baseValue: 16.0 },
  { stat: 'Max HP%', statKey: 'HP%', baseValue: 10.0 },
  { stat: 'DEF%', statKey: 'DEF%', baseValue: 10.0 },
  { stat: 'Break Power%', statKey: 'BREAK POWER%', baseValue: 12.0 },
  { stat: 'Effect Hit Rate%', statKey: 'EFFECT HIT RATE%', baseValue: 12.0 },
  { stat: 'Healing Bonus%', statKey: 'HEALING BONUS%', baseValue: 10.0 },
]);

export interface ExoticSigilStatItem {
  stat: string;
  statKey: StatKey;
  baseValue: number;
}

export const EXOTIC_SIGIL_MAIN_STATS: readonly ExoticSigilStatItem[] = Object.freeze([
  { stat: 'Energy Charge%', statKey: 'ENERGY CHARGE%', baseValue: 12.0 },
  { stat: 'SPD', statKey: 'SPD', baseValue: 7.0 },
  { stat: 'Break Power%', statKey: 'BREAK POWER%', baseValue: 15.0 },
  { stat: 'All-Element DMG%', statKey: 'ALL-ELEMENT DMG%', baseValue: 10.0 },
]);

export interface SigilCoreTraitSpec {
  id: string;
  name: string;
  desc: string;
}

export const SIGIL_CORE_TRAITS: readonly SigilCoreTraitSpec[] = Object.freeze([
  { id: 'TRAIT_CHRONO_SPRINT', name: 'Chrono Sprint', desc: 'At battle start, gain +15 SPD for 6.0 seconds.' },
  { id: 'TRAIT_AEGIS_PULSE', name: 'Aegis Pulse', desc: 'Breaking 1 Boss Stagger bar heals the entire squad for 10% Max HP.' },
  { id: 'TRAIT_STARFALL_OVERCHARGE', name: 'Starfall Overcharge', desc: 'Triggering an Elemental Reaction grants +8% Ultimate Energy.' },
  { id: 'TRAIT_VOID_EXECUTIONER', name: 'Void Executioner', desc: 'Deal +18% bonus DMG against enemies below 35% HP.' },
]);

export interface SubstatRngRangeSpec {
  statKey: StatKey;
  min: number;
  max: number;
  isPct: boolean;
}

export const SUBSTAT_RNG_RANGES: Readonly<Record<string, SubstatRngRangeSpec>> = Object.freeze({
  'CRIT RATE%': { statKey: 'CRIT RATE%', min: 2.5, max: 3.8, isPct: true },
  'CRIT DMG%': { statKey: 'CRIT DMG%', min: 5.0, max: 7.6, isPct: true },
  'SPD': { statKey: 'SPD', min: 2, max: 4, isPct: false },
  'ATK%': { statKey: 'ATK%', min: 3.5, max: 5.5, isPct: true },
  'HP%': { statKey: 'HP%', min: 3.5, max: 5.5, isPct: true },
  'DEF%': { statKey: 'DEF%', min: 3.5, max: 5.5, isPct: true },
  'BREAK POWER%': { statKey: 'BREAK POWER%', min: 4.0, max: 6.0, isPct: true },
  'EFFECT HIT RATE%': { statKey: 'EFFECT HIT RATE%', min: 4.0, max: 6.0, isPct: true },
  'ENERGY CHARGE%': { statKey: 'ENERGY CHARGE%', min: 3.5, max: 5.5, isPct: true },
});

export interface SubstatLine {
  stat: StatKey;
  value: number;
  minRoll?: number;
  maxRoll?: number;
  isMasterwork?: boolean;
}

export interface GearItem {
  id: string;
  name: string;
  slot: GearSlot;
  set: SetId;
  isExoticSigil?: boolean;
  sigilTrait?: SigilCoreTraitSpec;
  level: number; // 0 to 15
  failStackCount: number;
  mainStatKey: StatKey;
  baseMainValue: number;
  baseFlatStat?: number;
  substats: SubstatLine[];
  equippedBy?: string;
}

export function rollRandomSubstat(excludeKeys: StatKey[] = []): SubstatLine {
  const allKeys = Object.keys(SUBSTAT_RNG_RANGES) as StatKey[];
  const candidates = allKeys.filter((k) => !excludeKeys.includes(k));
  const pickedKey = candidates[Math.floor(Math.random() * candidates.length)] || 'ATK%';
  const range = SUBSTAT_RNG_RANGES[pickedKey];
  const raw = range.min + Math.random() * (range.max - range.min);
  const value = range.isPct ? Number(raw.toFixed(1)) : Math.round(raw);
  return {
    stat: pickedKey,
    value,
    minRoll: range.min,
    maxRoll: range.max,
    isMasterwork: false,
  };
}

export interface EquipmentSetSpec {
  id: SetId;
  domain: string;
  recommendedRole: string;
  twoPieceDesc: string;
  fourPieceDesc: string;
  twoPieceStat: Partial<Record<StatKey, number>>;
}

export const EQUIPMENT_SETS: readonly EquipmentSetSpec[] = Object.freeze([
  {
    id: 'Starfall Executioner',
    domain: 'Domain I (Striker)',
    recommendedRole: 'Melee / Ranged Crit DPS',
    twoPieceDesc: 'Crit Rate +15%',
    fourPieceDesc: 'Crit DMG +35% & Critical Hits ignore 15% enemy DEF',
    twoPieceStat: { 'CRIT RATE%': 15 },
  },
  {
    id: 'Astral Nexus',
    domain: 'Domain III (Tactician)',
    recommendedRole: 'Gambit Chain Combo',
    twoPieceDesc: 'Tactical Chain Skill DMG +25%',
    fourPieceDesc: 'Using a Tactical Chain grants all allies ATK +15% for 4.0s',
    twoPieceStat: { 'ATK%': 12 },
  },
  {
    id: 'Eclipse',
    domain: 'Domain III (Tactician)',
    recommendedRole: 'Stagger Breaker & Burst',
    twoPieceDesc: 'Break Power +25%',
    fourPieceDesc: 'While Boss is Staggered, Ultimate Crit DMG +60%',
    twoPieceStat: { 'BREAK POWER%': 25 },
  },
  {
    id: 'Overload',
    domain: 'Domain I (Striker)',
    recommendedRole: 'Energy Battery & Ultimate',
    twoPieceDesc: 'Energy Charge +10%',
    fourPieceDesc: 'Ultimate Skill DMG +40%',
    twoPieceStat: { 'ENERGY CHARGE%': 10 },
  },
  {
    id: 'Titan',
    domain: 'Domain II (Defender)',
    recommendedRole: 'Frontline Tank',
    twoPieceDesc: 'Max HP +15%',
    fourPieceDesc: 'When HP drops below 50%, gain a 20% Max HP Shield for 5s (15s CD)',
    twoPieceStat: { 'HP%': 15 },
  },
  {
    id: 'Volatus',
    domain: 'Domain I (Striker)',
    recommendedRole: 'High-SPD & Basic Attackers',
    twoPieceDesc: 'SPD +20%',
    fourPieceDesc: 'Basic Attack DMG +40%',
    twoPieceStat: { 'SPD': 20 },
  },
  {
    id: 'Radiant Dawn',
    domain: 'Domain II (Defender)',
    recommendedRole: 'Healer & Shielder',
    twoPieceDesc: 'Healing Bonus +15%',
    fourPieceDesc: 'Converts Overheal into a protective Shield for 6s (up to 30% Max HP)',
    twoPieceStat: { 'HEALING BONUS%': 15 },
  },
  {
    id: 'Voidweaver',
    domain: 'Domain III (Tactician)',
    recommendedRole: 'Debuffer & Status Applier',
    twoPieceDesc: 'Effect Hit Rate +20%',
    fourPieceDesc: 'Inflicting a debuff applies 1 Void stack (+5% DMG taken per stack, max 5 stacks / +25%)',
    twoPieceStat: { 'EFFECT HIT RATE%': 20 },
  },
]);

export interface GearDomainSpec {
  id: string;
  name: string;
  weeklyKeyCost: number;
  dropsSets: readonly SetId[];
  desc: string;
}

export const GEAR_DOMAINS: readonly GearDomainSpec[] = Object.freeze([
  {
    id: 'DOMAIN_STRIKER',
    name: 'Domain I: Striker Sanctum',
    weeklyKeyCost: 1,
    dropsSets: ['Starfall Executioner', 'Volatus', 'Overload'],
    desc: 'Drops offensive Crit, High-SPD, and Ultimate burst equipment sets.',
  },
  {
    id: 'DOMAIN_DEFENDER',
    name: 'Domain II: Bastion Foundry',
    weeklyKeyCost: 1,
    dropsSets: ['Titan', 'Radiant Dawn'],
    desc: 'Drops frontline Tank armor and Overheal-Shield support sets.',
  },
  {
    id: 'DOMAIN_TACTICIAN',
    name: 'Domain III: Astral Observatory',
    weeklyKeyCost: 1,
    dropsSets: ['Eclipse', 'Astral Nexus', 'Voidweaver'],
    desc: 'Drops Stagger Breaker, Gambit Chain, and Debuffer Effect Hit sets.',
  },
]);

export interface EnhanceTierRule {
  targetLevel: number;
  baseRate: number;
  failStackBonus: number;
  maxAttemptsGuarantee: number;
  mainStatMultiplier: number;
  milestoneDesc?: string;
}

export function getEnhanceRule(nextLevel: number): EnhanceTierRule {
  const clamped = Math.max(1, Math.min(15, nextLevel));
  const multTable: Record<number, number> = {
    1: 1.10, 2: 1.20, 3: 1.30,
    4: 1.45, 5: 1.60, 6: 1.75,
    7: 1.95, 8: 2.15, 9: 2.35,
    10: 2.60, 11: 2.85, 12: 3.10,
    13: 3.45, 14: 3.72, 15: 4.00,
  };

  if (clamped <= 3) {
    return {
      targetLevel: clamped,
      baseRate: 100,
      failStackBonus: 0,
      maxAttemptsGuarantee: 1,
      mainStatMultiplier: multTable[clamped],
      milestoneDesc: clamped === 3 ? 'Unlocks Substat Line 1' : undefined,
    };
  }
  if (clamped <= 6) {
    return {
      targetLevel: clamped,
      baseRate: 75,
      failStackBonus: 12.5,
      maxAttemptsGuarantee: 3,
      mainStatMultiplier: multTable[clamped],
      milestoneDesc: clamped === 6 ? 'Unlocks Substat Line 2' : undefined,
    };
  }
  if (clamped <= 9) {
    return {
      targetLevel: clamped,
      baseRate: 50,
      failStackBonus: 12.5,
      maxAttemptsGuarantee: 5,
      mainStatMultiplier: multTable[clamped],
      milestoneDesc: clamped === 9 ? 'Unlocks Substat Line 3' : undefined,
    };
  }
  if (clamped <= 12) {
    return {
      targetLevel: clamped,
      baseRate: 30,
      failStackBonus: 10.0,
      maxAttemptsGuarantee: 8,
      mainStatMultiplier: multTable[clamped],
      milestoneDesc: clamped === 12 ? 'Unlocks Substat Line 4' : undefined,
    };
  }
  return {
    targetLevel: clamped,
    baseRate: 15,
    failStackBonus: 8.5,
    maxAttemptsGuarantee: 11,
    mainStatMultiplier: multTable[clamped],
    milestoneDesc: clamped === 15 ? 'Upgrades 1 random Substat to Masterwork (2x)' : undefined,
  };
}

export function calculateCurrentSuccessRate(
  nextLevel: number,
  failStackCount: number,
  catalystBonusPct: number = 0
): number {
  const rule = getEnhanceRule(nextLevel);
  return Math.min(100, Number((rule.baseRate + failStackCount * rule.failStackBonus + catalystBonusPct).toFixed(1)));
}

export const getEffectiveEnhanceSuccessRate = calculateCurrentSuccessRate;

export function getGearMainStatValue(gear: GearItem): { pct: number; flat: number } {
  if (gear.level === 0) {
    return { pct: gear.baseMainValue, flat: gear.baseFlatStat || 0 };
  }
  const rule = getEnhanceRule(gear.level);
  return {
    pct: Number((gear.baseMainValue * rule.mainStatMultiplier).toFixed(1)),
    flat: Math.round((gear.baseFlatStat || 0) * rule.mainStatMultiplier),
  };
}

export function rollMilestoneSubstat<T extends { substats: SubstatLine[] }>(gear: T, newLevel: number): T {
  const updated = { ...gear, substats: [...gear.substats] };
  if ((newLevel === 3 || newLevel === 6 || newLevel === 9 || newLevel === 12) && updated.substats.length < 4) {
    const existingKeys = updated.substats.map((s) => s.stat);
    updated.substats.push(rollRandomSubstat(existingKeys));
  } else if (newLevel === 15 && updated.substats.length > 0) {
    const idx = Math.floor(Math.random() * updated.substats.length);
    updated.substats[idx] = {
      ...updated.substats[idx],
      value: Number((updated.substats[idx].value * 2).toFixed(1)),
      isMasterwork: true,
    };
  }
  return updated;
}

export function attemptGearEnhancement<
  T extends { level: number; failStackCount: number; substats: SubstatLine[] }
>(
  gearItem: T,
  useCatalyst: boolean = false
): {
  success: boolean;
  chanceUsed: number;
  message: string;
  item: T;
} {
  if (gearItem.level >= 15) {
    return {
      success: false,
      chanceUsed: 100,
      message: 'Equipment is already at MAX +15 Masterwork.',
      item: gearItem,
    };
  }
  const nextLv = gearItem.level + 1;
  const catalystPct = useCatalyst ? 10 : 0;
  const chance = calculateCurrentSuccessRate(nextLv, gearItem.failStackCount, catalystPct);
  const roll = Math.random() * 100;

  if (roll < chance) {
    const baseUpdated = { ...gearItem, level: nextLv, failStackCount: 0 };
    const finalItem = rollMilestoneSubstat(baseUpdated, nextLv);
    return {
      success: true,
      chanceUsed: chance,
      message: `Enhanced to +${nextLv}! Fail Stack reset to 0%.`,
      item: finalItem,
    };
  }

  const newFailStack = (gearItem.failStackCount || 0) + 1;
  const nextChance = calculateCurrentSuccessRate(nextLv, newFailStack, 0);
  return {
    success: false,
    chanceUsed: chance,
    message: `Enhancement to +${nextLv} failed. Item intact! Fail Stack increased to ${newFailStack} (Next chance: ${nextChance}%).`,
    item: {
      ...gearItem,
      failStackCount: newFailStack,
    },
  };
}

export function createInitialGearInventory(): GearItem[] {
  const defaultSets: SetId[] = [
    'Starfall Executioner',
    'Astral Nexus',
    'Titan',
    'Titan',
    'Overload',
    'Voidweaver',
    'Voidweaver',
    'Starfall Executioner',
    'Titan',
    'Volatus',
    'Starfall Executioner',
    'Astral Nexus',
    'Radiant Dawn',
    'Titan',
    'Overload',
    'Eclipse',
    'Starfall Executioner',
    'Voidweaver',
  ];

  const items: GearItem[] = [];
  RESONATORS.forEach((hero, idx) => {
    const set = defaultSets[idx % defaultSets.length];
    const baseLv = idx < 6 ? 3 : 0;
    const trait = SIGIL_CORE_TRAITS[idx % SIGIL_CORE_TRAITS.length];

    items.push(
      {
        id: `G_${hero.id}_W`,
        name: `${set} Blade`,
        slot: 'Weapon',
        set,
        level: baseLv,
        failStackCount: 0,
        mainStatKey: 'ATK%',
        baseMainValue: 10,
        baseFlatStat: 125,
        substats: baseLv >= 3 ? [{ stat: 'CRIT RATE%', value: 3.5, minRoll: 2.5, maxRoll: 3.8 }] : [],
        equippedBy: hero.id,
      },
      {
        id: `G_${hero.id}_A`,
        name: `${set} Cuirass`,
        slot: 'Armor',
        set,
        level: baseLv,
        failStackCount: 0,
        mainStatKey: 'DEF%',
        baseMainValue: 10,
        baseFlatStat: 880,
        substats: baseLv >= 3 ? [{ stat: 'HP%', value: 5.0, minRoll: 3.5, maxRoll: 5.5 }] : [],
        equippedBy: hero.id,
      },
      {
        id: `G_${hero.id}_R1`,
        name: `${set} Signet I`,
        slot: 'Ring I',
        set,
        level: baseLv,
        failStackCount: 0,
        mainStatKey: 'CRIT RATE%',
        baseMainValue: 8,
        substats: baseLv >= 3 ? [{ stat: 'ATK%', value: 4.8, minRoll: 3.5, maxRoll: 5.5 }] : [],
        equippedBy: hero.id,
      },
      {
        id: `G_${hero.id}_R2`,
        name: `${set} Signet II`,
        slot: 'Ring II',
        set,
        level: baseLv,
        failStackCount: 0,
        mainStatKey: 'CRIT DMG%',
        baseMainValue: 16,
        substats: baseLv >= 3 ? [{ stat: 'BREAK POWER%', value: 5.2, minRoll: 4.0, maxRoll: 6.0 }] : [],
        equippedBy: hero.id,
      },
      {
        id: `G_${hero.id}_S`,
        name: `Exotic ${trait.name} Sigil`,
        slot: 'Core Sigil',
        set,
        isExoticSigil: true,
        sigilTrait: trait,
        level: baseLv,
        failStackCount: 0,
        mainStatKey: 'BREAK POWER%',
        baseMainValue: 15,
        substats: baseLv >= 3 ? [{ stat: 'EFFECT HIT RATE%', value: 5.4, minRoll: 4.0, maxRoll: 6.0 }] : [],
        equippedBy: hero.id,
      }
    );
  });

  return items;
}

export type BlessingCardSpec = MajorArcanaTarotSpec;
export const BLESSING_CARDS: readonly BlessingCardSpec[] = MAJOR_ARCANA_TAROT;

export interface ConstellationNode {
  id: string;
  name: string;
  desc: string;
  maxLevel: number;
  baseCost: number;
  perLevelVal: number;
  unit: string;
}

export const CONSTELLATION_NODES: readonly ConstellationNode[] = GRAND_CONSTELLATIONS.map((g) => ({
  id: g.id,
  name: g.name,
  desc: g.theme,
  maxLevel: 10,
  baseCost: 25,
  perLevelVal: 5,
  unit: '%',
}));

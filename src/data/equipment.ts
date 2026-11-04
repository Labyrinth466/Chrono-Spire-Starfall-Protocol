export type GearSlot = 'Weapon' | 'Armor' | 'Ring' | 'Core Sigil';

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
  | 'HEALING BONUS%';

export interface SubstatLine {
  stat: StatKey;
  value: number;
  isMasterwork?: boolean;
}

export interface GearItem {
  id: string;
  name: string;
  slot: GearSlot;
  set: SetId;
  level: number; // 0 to 15
  failStackCount: number; // resets on success
  mainStatKey: StatKey;
  baseMainValue: number;
  baseFlatStat?: number; // ATK for Weapon, HP for Armor
  substats: SubstatLine[];
  equippedBy?: string; // Resonator ID
}

export interface EquipmentSetSpec {
  id: SetId;
  recommendedRole: string;
  twoPieceDesc: string;
  fourPieceDesc: string;
  twoPieceStat: Partial<Record<StatKey, number>>;
}

export const EQUIPMENT_SETS: EquipmentSetSpec[] = [
  {
    id: 'Starfall Executioner',
    recommendedRole: 'Melee / Ranged Crit DPS',
    twoPieceDesc: 'Crit Rate +15%',
    fourPieceDesc: 'Crit DMG +35% & Critical Hits ignore 15% enemy DEF',
    twoPieceStat: { 'CRIT RATE%': 15 },
  },
  {
    id: 'Astral Nexus',
    recommendedRole: 'Gambit Chain Combo',
    twoPieceDesc: 'Tactical Chain Skill DMG +25%',
    fourPieceDesc: 'Using a Tactical Chain grants all allies ATK +15% for 4.0s',
    twoPieceStat: { 'ATK%': 12 },
  },
  {
    id: 'Eclipse',
    recommendedRole: 'Stagger Breaker & Burst',
    twoPieceDesc: 'Break Power +25%',
    fourPieceDesc: 'While Boss is Staggered, Ultimate Crit DMG +60%',
    twoPieceStat: { 'BREAK POWER%': 25 },
  },
  {
    id: 'Overload',
    recommendedRole: 'Energy Battery & Ultimate',
    twoPieceDesc: 'Energy Charge +10%',
    fourPieceDesc: 'Ultimate Skill DMG +40%',
    twoPieceStat: { 'ENERGY CHARGE%': 10 },
  },
  {
    id: 'Titan',
    recommendedRole: 'Frontline Tank',
    twoPieceDesc: 'Max HP +15%',
    fourPieceDesc: 'When HP drops below 50%, gain a 20% Max HP Shield for 5s (15s CD)',
    twoPieceStat: { 'HP%': 15 },
  },
  {
    id: 'Volatus',
    recommendedRole: 'High-SPD & Basic Attackers',
    twoPieceDesc: 'SPD +20%',
    fourPieceDesc: 'Basic Attack DMG +40%',
    twoPieceStat: { 'SPD': 20 },
  },
  {
    id: 'Radiant Dawn',
    recommendedRole: 'Healer & Shielder',
    twoPieceDesc: 'Healing Bonus +15%',
    fourPieceDesc: 'Converts Overheal into a protective Shield for 6s (up to 30% Max HP)',
    twoPieceStat: { 'HEALING BONUS%': 15 },
  },
  {
    id: 'Voidweaver',
    recommendedRole: 'Debuffer & Status Applier',
    twoPieceDesc: 'Effect Hit Rate +20%',
    fourPieceDesc: 'Inflicting a debuff applies 1 Void stack (+5% DMG taken per stack, max 5 stacks / +25%)',
    twoPieceStat: { 'EFFECT HIT RATE%': 20 },
  },
];

export interface EnhanceTierRule {
  targetLevel: number;
  baseRate: number; // %
  failStackBonus: number; // +% per fail
  maxAttemptsGuarantee: number;
  mainStatMultiplier: number; // e.g., +10% to +300% (1.10 to 4.00)
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

export function calculateCurrentSuccessRate(nextLevel: number, failStackCount: number): number {
  const rule = getEnhanceRule(nextLevel);
  return Math.min(100, Number((rule.baseRate + failStackCount * rule.failStackBonus).toFixed(1)));
}

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

const SUBSTAT_POOL: { stat: StatKey; val: number }[] = [
  { stat: 'CRIT RATE%', val: 4.5 },
  { stat: 'CRIT DMG%', val: 9.0 },
  { stat: 'ATK%', val: 6.0 },
  { stat: 'HP%', val: 6.0 },
  { stat: 'DEF%', val: 6.0 },
  { stat: 'BREAK POWER%', val: 7.5 },
  { stat: 'EFFECT HIT RATE%', val: 7.5 },
  { stat: 'ENERGY CHARGE%', val: 5.5 },
  { stat: 'SPD', val: 4.0 },
];

export function rollMilestoneSubstat(gear: GearItem, newLevel: number): GearItem {
  const updated = { ...gear, substats: [...gear.substats] };
  if ((newLevel === 3 || newLevel === 6 || newLevel === 9 || newLevel === 12) && updated.substats.length < 4) {
    const existingKeys = new Set(updated.substats.map((s) => s.stat));
    const candidates = SUBSTAT_POOL.filter((p) => !existingKeys.has(p.stat));
    const pick = candidates[Math.floor(Math.random() * candidates.length)] || SUBSTAT_POOL[0];
    updated.substats.push({ stat: pick.stat, value: pick.val });
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

export function createInitialGearInventory(): GearItem[] {
  const starterConfig: { heroId: string; set: SetId; ringStat: StatKey; sigilStat: StatKey }[] = [
    { heroId: 'H01', set: 'Starfall Executioner', ringStat: 'CRIT RATE%', sigilStat: 'BREAK POWER%' },
    { heroId: 'H02', set: 'Titan', ringStat: 'HP%', sigilStat: 'BREAK POWER%' },
    { heroId: 'H03', set: 'Voidweaver', ringStat: 'ATK%', sigilStat: 'EFFECT HIT RATE%' },
    { heroId: 'H04', set: 'Volatus', ringStat: 'CRIT DMG%', sigilStat: 'SPD' },
    { heroId: 'H05', set: 'Radiant Dawn', ringStat: 'HEALING BONUS%', sigilStat: 'ENERGY CHARGE%' },
    { heroId: 'H06', set: 'Eclipse', ringStat: 'CRIT DMG%', sigilStat: 'EFFECT HIT RATE%' },
  ];

  const items: GearItem[] = [];
  starterConfig.forEach((cfg, idx) => {
    const baseLv = idx < 5 ? 3 : 0;
    items.push(
      {
        id: `G_${cfg.heroId}_W`,
        name: `${cfg.set} Blade`,
        slot: 'Weapon',
        set: cfg.set,
        level: baseLv,
        failStackCount: 0,
        mainStatKey: 'ATK%',
        baseMainValue: 10,
        baseFlatStat: 120,
        substats: baseLv >= 3 ? [{ stat: 'CRIT RATE%', value: 4.5 }] : [],
        equippedBy: cfg.heroId,
      },
      {
        id: `G_${cfg.heroId}_A`,
        name: `${cfg.set} Cuirass`,
        slot: 'Armor',
        set: cfg.set,
        level: baseLv,
        failStackCount: 0,
        mainStatKey: 'DEF%',
        baseMainValue: 10,
        baseFlatStat: 850,
        substats: baseLv >= 3 ? [{ stat: 'HP%', value: 6.0 }] : [],
        equippedBy: cfg.heroId,
      },
      {
        id: `G_${cfg.heroId}_R`,
        name: `${cfg.set} Signet`,
        slot: 'Ring',
        set: cfg.set,
        level: baseLv,
        failStackCount: 0,
        mainStatKey: cfg.ringStat,
        baseMainValue: cfg.ringStat === 'CRIT DMG%' ? 16 : 10,
        substats: baseLv >= 3 ? [{ stat: 'ATK%', value: 6.0 }] : [],
        equippedBy: cfg.heroId,
      },
      {
        id: `G_${cfg.heroId}_S`,
        name: `${cfg.set} Core Sigil`,
        slot: 'Core Sigil',
        set: cfg.set,
        level: baseLv,
        failStackCount: 0,
        mainStatKey: cfg.sigilStat,
        baseMainValue: cfg.sigilStat === 'SPD' ? 6 : 12,
        substats: baseLv >= 3 ? [{ stat: 'EFFECT HIT RATE%', value: 7.5 }] : [],
        equippedBy: cfg.heroId,
      }
    );
  });
  return items;
}

export interface BlessingCardSpec {
  id: string;
  name: string;
  rarity: 'Common' | 'Rare' | 'Epic';
  desc: string;
  tiers: [number, number, number];
  secondaryTiers?: [number, number, number];
}

export const BLESSING_CARDS: BlessingCardSpec[] = [
  { id: 'B01', name: "The Sun's Wrath", rarity: 'Common', desc: 'All Allies ATK +15% / +30% / +50%', tiers: [15, 30, 50] },
  { id: 'B02', name: "The Tower's Sunder", rarity: 'Common', desc: 'All Allies Break Power +20% / +40% / +65%', tiers: [20, 40, 65] },
  { id: 'B03', name: "The Chariot's Gale", rarity: 'Common', desc: 'All Allies SPD +12% / +24% / +40%', tiers: [12, 24, 40] },
  { id: 'B04', name: "The Empress's Grace", rarity: 'Common', desc: 'Max HP +15% & heal 15% / 30% / 50% HP on floor clear', tiers: [15, 30, 50] },
  { id: 'B05', name: "The Magician's Spark", rarity: 'Rare', desc: 'All Allies Effect Hit Rate +15% / +30% / +45%', tiers: [15, 30, 45] },
  { id: 'B06', name: 'Wheel of Fortune', rarity: 'Rare', desc: 'Crit Rate +12%/24%/36% & Crit DMG +25%/50%/80%', tiers: [12, 24, 36], secondaryTiers: [25, 50, 80] },
  { id: 'B07', name: "The Star's Conduit", rarity: 'Rare', desc: 'Start every new floor with 25% / 50% / 75% Ultimate Energy', tiers: [25, 50, 75] },
  { id: 'B08', name: "The Hermit's Bastion", rarity: 'Rare', desc: 'Frontline gains 20% / 35% / 50% Max HP Shield on wave start & 15% Thorns', tiers: [20, 35, 50] },
  { id: 'B09', name: 'Judgement of Ruin', rarity: 'Epic', desc: 'Staggered Bosses take +35% / +70% / +110% bonus DMG', tiers: [35, 70, 110] },
  { id: 'B10', name: "The Lovers' Resonance", rarity: 'Epic', desc: 'All 4 Elemental Reactions deal +40% / +80% / +130% DMG', tiers: [40, 80, 130] },
  { id: 'B11', name: "Death's Execution", rarity: 'Epic', desc: 'Enemies below 25% HP take +20% / +40% / +65% bonus True DMG', tiers: [20, 40, 65] },
  { id: 'B12', name: "The World's Chrono Loop", rarity: 'Epic', desc: 'Casting an Ultimate has 25% / 45% / 65% chance to refund 50% Energy', tiers: [25, 45, 65] },
];

export interface ConstellationNode {
  id: string;
  name: string;
  desc: string;
  maxLevel: number;
  baseCost: number;
  perLevelVal: number;
  unit: string;
}

export const CONSTELLATION_NODES: ConstellationNode[] = [
  { id: 'C_ATK', name: 'Aries Starforge', desc: 'Permanent Account-Wide ATK Bonus', maxLevel: 10, baseCost: 25, perLevelVal: 5, unit: '%' },
  { id: 'C_BREAK', name: 'Taurus Sunderer', desc: 'Permanent Account-Wide Break Power', maxLevel: 10, baseCost: 25, perLevelVal: 6, unit: '%' },
  { id: 'C_EHR', name: 'Gemini Weaver', desc: 'Permanent Account-Wide Effect Hit Rate', maxLevel: 10, baseCost: 30, perLevelVal: 4, unit: '%' },
  { id: 'C_HP', name: 'Leo Bastion', desc: 'Permanent Account-Wide Max HP & DEF', maxLevel: 10, baseCost: 25, perLevelVal: 6, unit: '%' },
  { id: 'C_CRIT', name: 'Sagittarius Edge', desc: 'Permanent Account-Wide Crit Rate', maxLevel: 10, baseCost: 35, perLevelVal: 2.5, unit: '%' },
  { id: 'C_SHARDS', name: 'Chronos Hourglass', desc: 'Bonus Time Shards & Gold Earned', maxLevel: 10, baseCost: 40, perLevelVal: 12, unit: '%' },
];

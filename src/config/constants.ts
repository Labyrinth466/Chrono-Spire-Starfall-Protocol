/**
 * CHRONO SPIRE: STARFALL PROTOCOL — Master SSOT v2.1 (Unified TypeScript)
 * File 1: src/config/constants.ts
 */

export type ElementType = 'Fire' | 'Cryo' | 'Electro' | 'Wind' | 'Light' | 'Dark';
export type RoleType = 'Tank / Breaker' | 'Melee DPS' | 'Ranged DPS' | 'Support & Healer' | 'Debuffer';
export type FormationCode = 'SOLO_BASTION' | 'BALANCED' | 'VANGUARD' | 'HYPER_CARRY';
export type FormationRatioId = '1-4' | '2-3' | '3-2' | '4-1';

export type DebuffType =
  | 'Burn'
  | 'Freeze'
  | 'Shock'
  | 'Bleed'
  | 'Luminous Mark'
  | 'Corrosion'
  | 'Slow'
  | 'Defenseless'
  | 'Conductive';

export type ReactionType =
  | 'MELTDOWN'
  | 'SUPERCONDUCT'
  | 'FIRESTORM'
  | 'OVERLOAD PLASMA'
  | 'BLIZZARD'
  | 'THUNDER GALE'
  | 'TWILIGHT EXECUTION'
  | 'RADIANT INFUSION'
  | 'ABYSSAL DECAY';

export interface SystemConstantsSpec {
  readonly VERSION: string;
  readonly PARTY_SIZE: number;
  readonly BOSS_STAGGER_SEGMENTS: number;
  readonly BOSS_STAGGER_BP_PER_SEGMENT: number;
  readonly BOSS_STAGGER_DURATION_SEC: number;
  readonly BOSS_STAGGER_DMG_BONUS_PCT: number;
  readonly ANTI_STAGGER_LOCK_SEC: number;
  readonly BERSERK_PHASE_TIME_SEC: number;
  readonly GUILD_RAID_DURATION_SEC: number;
  readonly GUILD_RAID_DAILY_ATTEMPTS: number;
  readonly WEEKLY_DOMAIN_KEYS: number;
  readonly WISHLIST_SIZE: number;
  readonly WISHLIST_SSR_RATE_SHARE: number;
  readonly STARFALL_SHARDS_PER_PULL: number;
}

export const SYSTEM_CONSTANTS: SystemConstantsSpec = Object.freeze({
  VERSION: '2.1.0',
  PARTY_SIZE: 5,
  BOSS_STAGGER_SEGMENTS: 5,
  BOSS_STAGGER_BP_PER_SEGMENT: 100,
  BOSS_STAGGER_DURATION_SEC: 5.5,
  BOSS_STAGGER_DMG_BONUS_PCT: 50,
  ANTI_STAGGER_LOCK_SEC: 8.0,
  BERSERK_PHASE_TIME_SEC: 60.0,
  GUILD_RAID_DURATION_SEC: 90.0,
  GUILD_RAID_DAILY_ATTEMPTS: 3,
  WEEKLY_DOMAIN_KEYS: 15,
  WISHLIST_SIZE: 5,
  WISHLIST_SSR_RATE_SHARE: 0.70,
  STARFALL_SHARDS_PER_PULL: 1,
});

export const ELEMENTS: Readonly<Record<Uppercase<ElementType>, ElementType>> = Object.freeze({
  FIRE: 'Fire',
  CRYO: 'Cryo',
  ELECTRO: 'Electro',
  WIND: 'Wind',
  LIGHT: 'Light',
  DARK: 'Dark',
});

export interface ElementMetaSpec {
  id: ElementType;
  name: ElementType;
  icon: string;
  color: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
  debuff: DebuffType;
  duration: number;
  effectDesc: string;
}

export const ELEMENT_META: Readonly<Record<ElementType, ElementMetaSpec>> = Object.freeze({
  Fire: {
    id: 'Fire',
    name: 'Fire',
    icon: '🔥',
    color: '#ef4444',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/40',
    bgClass: 'bg-red-500/15',
    debuff: 'Burn',
    duration: 4.0,
    effectDesc: '30% ATK Fire DoT/s & -15% DEF',
  },
  Cryo: {
    id: 'Cryo',
    name: 'Cryo',
    icon: '❄️',
    color: '#38bdf8',
    textClass: 'text-sky-400',
    borderClass: 'border-sky-500/40',
    bgClass: 'bg-sky-500/15',
    debuff: 'Freeze',
    duration: 2.0,
    effectDesc: 'Halts enemy action & cast bar for 2.0s (8s Boss Freeze Resist after)',
  },
  Electro: {
    id: 'Electro',
    name: 'Electro',
    icon: '⚡',
    color: '#c084fc',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/40',
    bgClass: 'bg-purple-500/15',
    debuff: 'Shock',
    duration: 4.0,
    effectDesc: 'Target takes +35% Break Damage to Stagger Gauge',
  },
  Wind: {
    id: 'Wind',
    name: 'Wind',
    icon: '🌪️',
    color: '#34d399',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/40',
    bgClass: 'bg-emerald-500/15',
    debuff: 'Bleed',
    duration: 4.0,
    effectDesc: 'Stacks up to 5x (20% ATK Wind DoT/s per stack)',
  },
  Light: {
    id: 'Light',
    name: 'Light',
    icon: '☀️',
    color: '#fbbf24',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-400/40',
    bgClass: 'bg-amber-400/15',
    debuff: 'Luminous Mark',
    duration: 4.0,
    effectDesc: 'Attackers gain +20% Crit Rate & 8% Lifesteal',
  },
  Dark: {
    id: 'Dark',
    name: 'Dark',
    icon: '🌑',
    color: '#f43f5e',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/40',
    bgClass: 'bg-rose-500/15',
    debuff: 'Corrosion',
    duration: 4.0,
    effectDesc: 'Target takes +35% Ultimate Skill Damage',
  },
});

export const COMBAT_ROLES: Readonly<Record<string, RoleType>> = Object.freeze({
  TANK: 'Tank / Breaker',
  MELEE_DPS: 'Melee DPS',
  RANGED_DPS: 'Ranged DPS',
  SUPPORT_HEALER: 'Support & Healer',
  DEBUFFER: 'Debuffer',
});

export const REGIONS = Object.freeze({
  VERDANT_WILDS: 'The Verdant Wilds',
  CENTRAL_IMPERIUM: 'The Central Imperium',
  TECHNO_SAVANT: 'The Techno-Savant Realm',
  FROSTBOUND_TUNDRA: 'The Frostbound Tundra',
  AETHERIAL_SANCTUARY: 'The Aetherial Sanctuary',
  ABYSSAL_SHADOWLANDS: 'The Abyssal Shadowlands',
});

export interface FormationSpec {
  id: FormationCode;
  ratioId: FormationRatioId;
  name: string;
  structure: string;
  frontCount: number;
  backCount: number;
  frontBonusRangePct: [number, number];
  backBonusRangePct: [number, number];
  desc: string;
}

export const FORMATIONS: readonly FormationSpec[] = Object.freeze([
  {
    id: 'HYPER_CARRY',
    ratioId: '4-1',
    name: '1. Hyper-Carry (4-1)',
    structure: 'Front 4 / Back 1',
    frontCount: 4,
    backCount: 1,
    frontBonusRangePct: [3.0, 7.5],
    backBonusRangePct: [12.0, 30.0],
    desc: 'Frontline 4 allies share +DEF% pool while 1 hyper-carry in the back receives full +12% to +30% ATK.',
  },
  {
    id: 'SOLO_BASTION',
    ratioId: '1-4',
    name: '2. Solo Bastion (1-4)',
    structure: 'Front 1 / Back 4',
    frontCount: 1,
    backCount: 4,
    frontBonusRangePct: [12.0, 30.0],
    backBonusRangePct: [3.0, 7.5],
    desc: '1 main Tank absorbs the full +12% to +30% DEF pool in front while 4 ranged/support allies fire from behind.',
  },
  {
    id: 'BALANCED',
    ratioId: '2-3',
    name: '3. Balanced (2-3)',
    structure: 'Front 2 / Back 3',
    frontCount: 2,
    backCount: 3,
    frontBonusRangePct: [6.0, 15.0],
    backBonusRangePct: [4.0, 10.0],
    desc: 'Standard 5-Role synergy: 2 frontline bruisers (+6% to +15% DEF each) and 3 backline specialists (+4% to +10% ATK each).',
  },
  {
    id: 'VANGUARD',
    ratioId: '3-2',
    name: '4. Vanguard (3-2)',
    structure: 'Front 3 / Back 2',
    frontCount: 3,
    backCount: 2,
    frontBonusRangePct: [4.0, 10.0],
    backBonusRangePct: [6.0, 15.0],
    desc: 'Aggressive 3-man frontline assault (+4% to +10% DEF each) with 2 backline anchors (+6% to +15% ATK each).',
  },
]);

export const TACTICAL_FORMATIONS: Readonly<Record<FormationCode, FormationSpec>> = Object.freeze({
  HYPER_CARRY: FORMATIONS[0],
  SOLO_BASTION: FORMATIONS[1],
  BALANCED: FORMATIONS[2],
  VANGUARD: FORMATIONS[3],
});

export function getFormationRowBonuses(
  formation: FormationSpec | FormationCode | FormationRatioId,
  level: number = 1
): {
  formationId: FormationRatioId;
  code: FormationCode;
  name: string;
  frontCount: number;
  backCount: number;
  frontDefPct: number;
  backAtkPct: number;
  frontDefPctPerHero: number;
  backAtkPctPerHero: number;
} {
  const clampedLv = Math.max(1, Math.min(10, level));
  const totalRowBudget = 12 + (clampedLv - 1) * 2;
  const spec =
    typeof formation === 'string'
      ? FORMATIONS.find((f) => f.id === formation || f.ratioId === formation) || FORMATIONS[2]
      : formation;

  const frontDefPct = Number((totalRowBudget / spec.frontCount).toFixed(2));
  const backAtkPct = Number((totalRowBudget / spec.backCount).toFixed(2));

  return {
    formationId: spec.ratioId,
    code: spec.id,
    name: spec.name,
    frontCount: spec.frontCount,
    backCount: spec.backCount,
    frontDefPct,
    backAtkPct,
    frontDefPctPerHero: frontDefPct,
    backAtkPctPerHero: backAtkPct,
  };
}

export const getFormationBonuses = getFormationRowBonuses;

export interface MajorArcanaTarotSpec {
  id: string;
  number: string;
  name: string;
  rarity: 'Common' | 'Rare' | 'Epic';
  desc: string;
  tiers: [number, number, number];
  secondaryTiers?: [number, number, number];
}

export const MAJOR_ARCANA_TAROT: readonly MajorArcanaTarotSpec[] = Object.freeze([
  { id: 'ARCANA_00', number: '0', name: 'The Fool', rarity: 'Epic', desc: 'At floor start, randomly grant +25% / +40% / +50% ATK, Crit Rate, or Break Power.', tiers: [25, 40, 50] },
  { id: 'ARCANA_01', number: 'I', name: 'The Magician', rarity: 'Rare', desc: 'Team Effect Hit Rate +15%/+25%/+40% and Elemental Reaction DMG +25%/+40%/+65%.', tiers: [15, 25, 40], secondaryTiers: [25, 40, 65] },
  { id: 'ARCANA_02', number: 'II', name: 'The High Priestess', rarity: 'Rare', desc: 'Healing Bonus +15%/+30%/+45% and shielded allies gain Energy Charge +15%.', tiers: [15, 30, 45] },
  { id: 'ARCANA_03', number: 'III', name: 'The Empress', rarity: 'Common', desc: 'Team Max HP +20% and restore 15% / 30% / 50% HP upon clearing each floor.', tiers: [15, 30, 50] },
  { id: 'ARCANA_04', number: 'IV', name: 'The Emperor', rarity: 'Common', desc: 'Frontline allies gain DEF +20%/+35%/+50% and take 20% less AoE damage.', tiers: [20, 35, 50] },
  { id: 'ARCANA_05', number: 'V', name: 'The Hierophant', rarity: 'Rare', desc: 'Gambit Slot 1 & Slot 2 Tactical Chain skills deal +20%/+30%/+50% bonus DMG/Heal.', tiers: [20, 30, 50] },
  { id: 'ARCANA_06', number: 'VI', name: 'The Lovers', rarity: 'Epic', desc: 'Elemental Resonance and Reaction DMG increased by +40% / +80% / +130%.', tiers: [40, 80, 130] },
  { id: 'ARCANA_07', number: 'VII', name: 'The Chariot', rarity: 'Common', desc: 'Team SPD +12% / +20% / +35%.', tiers: [12, 20, 35] },
  { id: 'ARCANA_08', number: 'VIII', name: 'Strength', rarity: 'Common', desc: 'Team Break Power +20% / +35% / +60% for faster Boss Stagger depletion.', tiers: [20, 35, 60] },
  { id: 'ARCANA_09', number: 'IX', name: 'The Hermit', rarity: 'Rare', desc: 'Frontline gains 20% / 25% / 45% Max HP Shield at wave start and reflects 20% DMG.', tiers: [20, 25, 45] },
  { id: 'ARCANA_10', number: 'X', name: 'Wheel of Fortune', rarity: 'Rare', desc: 'Team Crit Rate +12%/+15%/+30% and Crit DMG +25%/+40%/+75%.', tiers: [12, 15, 30], secondaryTiers: [25, 40, 75] },
  { id: 'ARCANA_11', number: 'XI', name: 'Justice', rarity: 'Rare', desc: 'Attacks against Defenseless bosses ignore an additional 15% / 20% / 35% DEF.', tiers: [15, 20, 35] },
  { id: 'ARCANA_12', number: 'XII', name: 'The Hanged Man', rarity: 'Rare', desc: 'Any hero below 30% HP gains ATK +30% / +50% / +80%.', tiers: [30, 50, 80] },
  { id: 'ARCANA_13', number: 'XIII', name: 'Death', rarity: 'Epic', desc: 'Deal +20% / +30% / +60% bonus True DMG to enemies below 25% HP.', tiers: [20, 30, 60] },
  { id: 'ARCANA_14', number: 'XIV', name: 'Temperance', rarity: 'Common', desc: 'Extend the duration of all elemental debuffs on the boss by +1.0s / +1.5s / +2.5s.', tiers: [10, 15, 25] },
  { id: 'ARCANA_15', number: 'XV', name: 'The Devil', rarity: 'Epic', desc: 'Team ATK +25% / +35% / +60%, but Team Max HP -10%.', tiers: [25, 35, 60] },
  { id: 'ARCANA_16', number: 'XVI', name: 'The Tower', rarity: 'Epic', desc: 'Breaking 1 Boss Stagger bar triggers a 100% / 150% / 250% Boss ATK explosion.', tiers: [100, 150, 250] },
  { id: 'ARCANA_17', number: 'XVII', name: 'The Star', rarity: 'Rare', desc: 'At battle start, all allies immediately gain +25% / +30% / +60% Ultimate Energy.', tiers: [25, 30, 60] },
  { id: 'ARCANA_18', number: 'XVIII', name: 'The Moon', rarity: 'Rare', desc: 'Backline bypass and piercing attacks deal +25% / +40% / +70% bonus DMG.', tiers: [25, 40, 70] },
  { id: 'ARCANA_19', number: 'XIX', name: 'The Sun', rarity: 'Common', desc: 'Team ATK +15% / +25% / +45% and Basic Attacks have 20% chance to inflict Burn.', tiers: [15, 25, 45] },
  { id: 'ARCANA_20', number: 'XX', name: 'Judgement', rarity: 'Epic', desc: 'While Boss is Staggered, all allies deal +35% / +60% / +100% bonus DMG.', tiers: [35, 60, 100] },
  { id: 'ARCANA_21', number: 'XXI', name: 'The World', rarity: 'Epic', desc: 'Casting an Ultimate has 25% / 35% / 60% chance to immediately refund 50% Energy.', tiers: [25, 35, 60] },
]);

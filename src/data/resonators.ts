/**
 * CHRONO SPIRE: STARFALL PROTOCOL — Master SSOT v2.1 (Unified TypeScript)
 * File 2: src/data/resonators.ts
 * Unifies all 18 Day-1 Resonators (12 SSR + 6 SR) across 6 Continents, 6 Elements, and 5 Roles
 * with full 8+3 Base Stats, 4+1 Skill Kits, Gambit Presets, and 60fps Canvas Sprite Configurations.
 */

import {
  COMBAT_ROLES,
  DebuffType,
  ELEMENT_META,
  ELEMENTS,
  ElementType,
  FORMATIONS,
  FormationSpec,
  getFormationRowBonuses,
  ReactionType,
  REGIONS,
  RoleType,
} from '../config/constants';

export {
  ELEMENT_META,
  FORMATIONS,
  getFormationRowBonuses,
};
export type {
  DebuffType,
  ElementType,
  FormationSpec,
  ReactionType,
  RoleType,
};

export type GambitConditionSlot1 =
  | 'BOSS_STAGGER_OPEN'
  | 'ALLY_HP_BELOW_50'
  | 'BOSS_SHIELD_ACTIVE'
  | 'ALWAYS_READY';

export type GambitConditionSlot2 =
  | 'TARGET_HAS_FREEZE'
  | 'TARGET_HAS_SHOCK'
  | 'TARGET_HAS_BURN'
  | 'TARGET_HAS_LUMINOUS'
  | 'TARGET_HAS_WIND'
  | 'TARGET_HAS_ELECTRO'
  | 'TARGET_HAS_CRYO'
  | 'ANY_DEBUFF';

export interface SkillSpec {
  type: 'Basic' | 'Active' | 'Chain' | 'Ultimate';
  name: string;
  targetDesc: string;
  targetRule:
    | 'FRONT'
    | 'FRONT_CLEAVE'
    | 'ALL_AOE'
    | 'BACKLINE_BYPASS'
    | 'LOWEST_HP_ENEMY'
    | 'TEAM_HEAL_AOE'
    | 'BOSS_MAIN';
  cooldown: number;
  multLv1: number;
  multLv10: number;
  hits?: number;
  isHeal?: boolean;
  breakPower: number;
  breakBp: number;
  debuff?: DebuffType;
  debuffStacks?: number;
  debuffDuration: number;
  procLv1: number;
  procLv10: number;
  reactionTrigger?: ReactionType;
  specialDesc: string;
}

export interface GambitPresetItem {
  slot: 1 | 2;
  condition: GambitConditionSlot1 | GambitConditionSlot2;
  action: string;
  desc: string;
}

export interface ResonatorBaseStats {
  hpLv1: number;
  hpLv100: number;
  atkLv1: number;
  atkLv100: number;
  defLv1: number;
  defLv100: number;
  critRate: number;
  critDmg: number;
  effectHitRate: number;
  effectRes: number;
  healingBonus: number;
  spd: number;
  breakPower: number;
  energyCharge: number;
}

export type HeroRarity = 'SSR' | 'SR' | 'R' | 'N';

export interface ResonatorData {
  id: string;
  name: string;
  title: string;
  rarity: HeroRarity;
  element: ElementType;
  regionId: string;
  regionName: string;
  region: string;
  regionLore: string;
  role: RoleType;
  recommendedRow: 'Front' | 'Back' | 'Front/Back';
  highlight: string;
  hpLv1: number;
  hpLv100: number;
  atkLv1: number;
  atkLv100: number;
  defLv1: number;
  defLv100: number;
  spd: number;
  baseCritRate: number;
  baseCritDmg: number;
  baseBreakPower: number;
  baseStats: ResonatorBaseStats;
  star5BonusDesc: string;
  passiveName: string;
  passive3Star: string;
  passive4Star: string;
  passive5Star: string;
  defaultGambit1: GambitConditionSlot1;
  defaultGambit2: GambitConditionSlot2;
  gambitPresets: [GambitPresetItem, GambitPresetItem];
  colors: {
    primary: string;
    secondary: string;
    hair: string;
    weapon: string;
    glow: string;
  };
  skills: {
    basic: SkillSpec;
    active: SkillSpec;
    chain: SkillSpec;
    ultimate: SkillSpec;
  };
}

function makeSkill(
  type: SkillSpec['type'],
  name: string,
  targetDesc: string,
  targetRule: SkillSpec['targetRule'],
  cooldown: number,
  multLv1: number,
  multLv10: number,
  breakBp: number,
  _debuffDuration: number,
  _procLv1: number,
  _procLv10: number,
  specialDesc: string,
  extra: Partial<SkillSpec> = {}
): SkillSpec {
  // SSOT v2.1 Module 4.2: Basic Attack cannot inflict Freeze; Freeze lasts 2.0s, all other statuses last 4.0s
  const debuff = type === 'Basic' && extra.debuff === 'Freeze' ? undefined : extra.debuff;
  const debuffDuration = debuff === 'Freeze' ? 2.0 : 4.0;
  const isFreeze = debuff === 'Freeze';
  const procLv1 =
    type === 'Basic' ? 10 : type === 'Active' ? (isFreeze ? 25 : 35) : type === 'Ultimate' ? 65 : 100;
  const procLv10 =
    type === 'Basic' ? 10 : type === 'Active' ? (isFreeze ? 40 : 55) : type === 'Ultimate' ? 80 : 100;

  return {
    type,
    name,
    targetDesc,
    targetRule,
    cooldown: type === 'Active' ? 7.0 : cooldown,
    multLv1,
    multLv10,
    breakPower: breakBp,
    breakBp,
    debuffDuration,
    procLv1,
    procLv10,
    specialDesc,
    ...extra,
    debuff,
  };
}

function createResonator(cfg: {
  id: string;
  name: string;
  title: string;
  rarity: 'SSR' | 'SR';
  element: ElementType;
  regionId: string;
  regionName: string;
  regionLore: string;
  role: RoleType;
  recommendedRow: 'Front' | 'Back' | 'Front/Back';
  highlight: string;
  baseStats: ResonatorBaseStats;
  star5BonusDesc: string;
  passiveName: string;
  passive3Star: string;
  passive4Star: string;
  passive5Star: string;
  defaultGambit1: GambitConditionSlot1;
  defaultGambit2: GambitConditionSlot2;
  gambitPresets: [GambitPresetItem, GambitPresetItem];
  colors: ResonatorData['colors'];
  skills: ResonatorData['skills'];
}): ResonatorData {
  return {
    ...cfg,
    region: cfg.regionName,
    hpLv1: cfg.baseStats.hpLv1,
    hpLv100: cfg.baseStats.hpLv100,
    atkLv1: cfg.baseStats.atkLv1,
    atkLv100: cfg.baseStats.atkLv100,
    defLv1: cfg.baseStats.defLv1,
    defLv100: cfg.baseStats.defLv100,
    spd: cfg.baseStats.spd,
    baseCritRate: cfg.baseStats.critRate,
    baseCritDmg: cfg.baseStats.critDmg,
    baseBreakPower: cfg.baseStats.breakPower,
  };
}

export const RESONATORS: readonly ResonatorData[] = Object.freeze([
  // =========================================================================
  // FIRE (H01 - H03)
  // =========================================================================
  createResonator({
    id: 'H01',
    name: 'Kallen Vermillion',
    title: 'Crimson Blade of the Imperium',
    rarity: 'SSR',
    element: ELEMENTS.FIRE,
    regionId: 'Region 2',
    regionName: REGIONS.CENTRAL_IMPERIUM,
    regionLore: 'Grand human empire of high chivalry, ornate plate armor, and imperial flame broadswords.',
    role: COMBAT_ROLES.MELEE_DPS,
    recommendedRow: 'Front',
    highlight: 'Cleaves 2 frontline targets, reduces Boss DEF by 15%, detonates Meltdown.',
    baseStats: {
      hpLv1: 1250, hpLv100: 18125,
      atkLv1: 165, atkLv100: 2392,
      defLv1: 75, defLv100: 1087,
      critRate: 10, critDmg: 150,
      effectHitRate: 0, effectRes: 0, healingBonus: 0,
      spd: 108, breakPower: 100, energyCharge: 100,
    },
    star5BonusDesc: 'Crit Rate +12%, SPD +10',
    passiveName: 'Heart of the Imperium',
    passive3Star: 'ATK +12%',
    passive4Star: '+20% Crit Rate against Burned targets',
    passive5Star: 'Boss Staggered resets Active Skill cooldown',
    defaultGambit1: 'BOSS_STAGGER_OPEN',
    defaultGambit2: 'TARGET_HAS_FREEZE',
    gambitPresets: [
      { slot: 1, condition: 'BOSS_STAGGER_OPEN', action: 'Blazing Lotus Cleave', desc: 'Strike front 2 targets when Stagger Gauge opens' },
      { slot: 2, condition: 'TARGET_HAS_FREEZE', action: 'Meltdown Execution', desc: 'Detonate Freeze into MELTDOWN (1.8x DMG & -25% DEF)' },
    ],
    colors: { primary: '#dc2626', secondary: '#f59e0b', hair: '#fecdd3', weapon: '#fb923c', glow: 'rgba(239, 68, 68, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Imperial Ember Slash', 'Frontmost Enemy (1 Target)', 'FRONT', 0, 100, 130, 15, 4.0, 10, 10, 'Restores Ultimate Energy +4%', { debuff: 'Burn' }),
      active: makeSkill('Active', 'Blazing Lotus Cleave', 'Frontline Enemies (2 Targets)', 'FRONT_CLEAVE', 7.0, 210, 300, 40, 4.0, 35, 55, 'Reduces target DEF by 15% for 4.0s', { debuff: 'Burn' }),
      chain: makeSkill('Chain', 'Meltdown Execution', 'Gambit Target (Frozen Priority)', 'BOSS_MAIN', 9.0, 320, 460, 60, 4.0, 100, 100, 'Detonates Freeze for MELTDOWN (1.8x DMG + -25% DEF for 4s)', { reactionTrigger: 'MELTDOWN' }),
      ultimate: makeSkill('Ultimate', 'Scarlet Imperial Horizon', 'All Enemies (AoE)', 'ALL_AOE', 0, 580, 850, 150, 4.0, 65, 80, 'Grants +30% Crit DMG before slash; +25% bonus DMG vs Burned targets', { debuff: 'Burn' }),
    },
  }),

  createResonator({
    id: 'H02',
    name: 'Ignis Vance',
    title: 'Magitek Artillery Sovereign',
    rarity: 'SSR',
    element: ELEMENTS.FIRE,
    regionId: 'Region 3',
    regionName: REGIONS.TECHNO_SAVANT,
    regionLore: 'Magitek artillery division specializing in orbital napalm cannons and plasma fusion.',
    role: COMBAT_ROLES.RANGED_DPS,
    recommendedRow: 'Back',
    highlight: 'Heavy thermal cannon bombards all enemies (AoE) and stacks continuous Burn.',
    baseStats: {
      hpLv1: 1080, hpLv100: 15660,
      atkLv1: 172, atkLv100: 2494,
      defLv1: 64, defLv100: 928,
      critRate: 10, critDmg: 150,
      effectHitRate: 10, effectRes: 0, healingBonus: 0,
      spd: 101, breakPower: 105, energyCharge: 105,
    },
    star5BonusDesc: 'ATK +15%, Effect Hit Rate +15%',
    passiveName: 'Thermal Reactor Core',
    passive3Star: 'ATK +12%',
    passive4Star: 'Burn DoT deals +25% bonus damage',
    passive5Star: 'Triggering Overload Plasma restores +15% Ultimate Energy',
    defaultGambit1: 'BOSS_SHIELD_ACTIVE',
    defaultGambit2: 'TARGET_HAS_SHOCK',
    gambitPresets: [
      { slot: 1, condition: 'BOSS_SHIELD_ACTIVE', action: 'Magitek Napalm Volley', desc: 'Bombard enemy barrier with heavy thermal shells' },
      { slot: 2, condition: 'TARGET_HAS_SHOCK', action: 'Overload Plasma Cannon', desc: 'Detonate Shock into OVERLOAD PLASMA AoE' },
    ],
    colors: { primary: '#ea580c', secondary: '#fde047', hair: '#fed7aa', weapon: '#f97316', glow: 'rgba(249, 115, 22, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Thermal Shell', 'Frontmost Enemy', 'FRONT', 0, 102, 132, 15, 4.0, 15, 15, 'High-heat shell with 15% Burn chance', { debuff: 'Burn' }),
      active: makeSkill('Active', 'Magitek Napalm Volley', 'All Enemies (AoE)', 'ALL_AOE', 7.5, 205, 295, 45, 4.0, 40, 60, 'Blankets the battlefield in napalm Burn', { debuff: 'Burn' }),
      chain: makeSkill('Chain', 'Overload Plasma Cannon', 'Gambit Target (Shocked)', 'ALL_AOE', 8.5, 315, 455, 65, 4.0, 100, 100, 'Detonates Shock/Burn for OVERLOAD PLASMA (220% AoE & Interrupt)', { reactionTrigger: 'OVERLOAD PLASMA' }),
      ultimate: makeSkill('Ultimate', 'Starfall Orbital Bombardment', 'All Enemies (AoE)', 'ALL_AOE', 0, 600, 880, 150, 4.0, 70, 85, 'Calls down orbital thermal lasers across all targets', { debuff: 'Burn' }),
    },
  }),

  createResonator({
    id: 'H03',
    name: 'Pyra',
    title: 'Emberhorn Guardian of the Wilds',
    rarity: 'SR',
    element: ELEMENTS.FIRE,
    regionId: 'Region 1',
    regionName: REGIONS.VERDANT_WILDS,
    regionLore: 'Beastkin flame-warden who channels volcanic spirit fire into a molten greatshield.',
    role: COMBAT_ROLES.TANK,
    recommendedRow: 'Front',
    highlight: 'Fire frontline tank who reflects damage and inflicts Burn when struck.',
    baseStats: {
      hpLv1: 1520, hpLv100: 22040,
      atkLv1: 112, atkLv100: 1624,
      defLv1: 112, defLv100: 1624,
      critRate: 10, critDmg: 150,
      effectHitRate: 5, effectRes: 12, healingBonus: 0,
      spd: 95, breakPower: 115, energyCharge: 100,
    },
    star5BonusDesc: 'Max HP +20%, DEF +15%',
    passiveName: 'Molten Hide',
    passive3Star: 'DEF +15%',
    passive4Star: 'Reflects 15% of melee damage taken as Fire DMG',
    passive5Star: 'When HP drops below 40%, gain 25% Max HP Shield',
    defaultGambit1: 'ALLY_HP_BELOW_50',
    defaultGambit2: 'TARGET_HAS_FREEZE',
    gambitPresets: [
      { slot: 1, condition: 'ALLY_HP_BELOW_50', action: 'Molten Carapace Taunt', desc: 'Taunt enemies and raise Flame Reflection shield' },
      { slot: 2, condition: 'TARGET_HAS_FREEZE', action: 'Volcanic Crash', desc: 'Shatter frozen enemies for Meltdown' },
    ],
    colors: { primary: '#b91c1c', secondary: '#fca5a5', hair: '#fecaca', weapon: '#ef4444', glow: 'rgba(185, 28, 28, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Cinder Bash', 'Frontmost Enemy', 'FRONT', 0, 95, 125, 20, 4.0, 12, 12, 'Shield slam that sears armor', { debuff: 'Burn' }),
      active: makeSkill('Active', 'Molten Carapace Taunt', 'Frontline Enemies', 'FRONT_CLEAVE', 7.0, 170, 245, 45, 4.0, 35, 55, 'Taunts enemies and increases own DEF +25%', { debuff: 'Burn' }),
      chain: makeSkill('Chain', 'Volcanic Crash', 'Boss Main Core', 'BOSS_MAIN', 8.5, 265, 385, 90, 4.0, 100, 100, 'Triggers MELTDOWN on Frozen bosses with 90 BP shatter', { reactionTrigger: 'MELTDOWN' }),
      ultimate: makeSkill('Ultimate', 'Wildfire Eruption Bastion', 'All Enemies (AoE)', 'ALL_AOE', 0, 450, 660, 140, 4.0, 65, 80, 'Grants 15% Max HP Shield to frontline & burns all foes', { debuff: 'Burn' }),
    },
  }),

  // =========================================================================
  // ELECTRO (H04 - H06)
  // =========================================================================
  createResonator({
    id: 'H04',
    name: 'Caelum Vance',
    title: 'Aegis Vanguard of Magitek',
    rarity: 'SSR',
    element: ELEMENTS.ELECTRO,
    regionId: 'Region 3',
    regionName: REGIONS.TECHNO_SAVANT,
    regionLore: 'Magitek civilization fusing arcane reactor cores with railgun lances and heavy bastion shields.',
    role: COMBAT_ROLES.TANK,
    recommendedRow: 'Front',
    highlight: 'Shatters 120 BP Boss Stagger in a single strike, taunts frontline, deploys magnetic shield.',
    baseStats: {
      hpLv1: 1680, hpLv100: 24360,
      atkLv1: 115, atkLv100: 1667,
      defLv1: 120, defLv100: 1740,
      critRate: 10, critDmg: 150,
      effectHitRate: 0, effectRes: 10, healingBonus: 0,
      spd: 96, breakPower: 125, energyCharge: 100,
    },
    star5BonusDesc: 'DEF +25%, Effect RES +20%',
    passiveName: 'Aegis Core Reactor',
    passive3Star: 'Break Power +20%',
    passive4Star: 'Self Damage Taken -18%',
    passive5Star: 'Breaking 1 Boss Stagger bar heals all allies for 10% HP',
    defaultGambit1: 'BOSS_STAGGER_OPEN',
    defaultGambit2: 'ANY_DEBUFF',
    gambitPresets: [
      { slot: 1, condition: 'BOSS_STAGGER_OPEN', action: 'Overdrive Armor Shatter', desc: 'Inflict 120 BP instant Stagger break' },
      { slot: 2, condition: 'TARGET_HAS_BURN', action: 'Overdrive Armor Shatter', desc: 'Trigger OVERLOAD PLASMA to interrupt boss cast' },
    ],
    colors: { primary: '#9333ea', secondary: '#38bdf8', hair: '#e2e8f0', weapon: '#c084fc', glow: 'rgba(192, 132, 252, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Volt Lance Thrust', 'Frontmost Enemy (1 Target)', 'FRONT', 0, 95, 125, 20, 4.0, 10, 10, 'Grants self 5% Max HP Electro Shield', { debuff: 'Shock' }),
      active: makeSkill('Active', 'Magitek Thunder Guard', 'Frontline Enemies + Ally Buff', 'FRONT_CLEAVE', 7.0, 180, 260, 50, 4.0, 35, 55, 'Taunts enemies & buffs frontline allies DEF +25% for 4.0s', { debuff: 'Shock' }),
      chain: makeSkill('Chain', 'Overdrive Armor Shatter', 'Boss Stagger Gauge', 'BOSS_MAIN', 8.0, 280, 400, 120, 4.0, 50, 70, 'Massive 120 BP shatter & shields lowest-HP ally for 15% Max HP', { debuff: 'Shock' }),
      ultimate: makeSkill('Ultimate', 'Heavenfall Railgun Dive', 'All Enemies (AoE)', 'ALL_AOE', 0, 480, 700, 180, 4.0, 65, 80, 'Instantly shatters Boss Aegis Barrier & buffs team Break Power +25% for 5s', { debuff: 'Shock' }),
    },
  }),

  createResonator({
    id: 'H05',
    name: 'Raiden Thorne',
    title: 'Thunderbolt Dragoon of the Imperium',
    rarity: 'SSR',
    element: ELEMENTS.ELECTRO,
    regionId: 'Region 2',
    regionName: REGIONS.CENTRAL_IMPERIUM,
    regionLore: 'Imperial sky-dragoon who channels high-voltage arc spears from the spire clouds.',
    role: COMBAT_ROLES.RANGED_DPS,
    recommendedRow: 'Back',
    highlight: 'Ricochets chain lightning across multiple targets while accelerating own SPD.',
    baseStats: {
      hpLv1: 1090, hpLv100: 15805,
      atkLv1: 168, atkLv100: 2436,
      defLv1: 66, defLv100: 957,
      critRate: 12, critDmg: 150,
      effectHitRate: 0, effectRes: 0, healingBonus: 0,
      spd: 118, breakPower: 105, energyCharge: 105,
    },
    star5BonusDesc: 'Crit DMG +25%, SPD +12',
    passiveName: 'Fulmination Crest',
    passive3Star: 'SPD +12%',
    passive4Star: '+25% DMG against Shocked enemies',
    passive5Star: 'Critical Hits chain 40% ATK Electro DMG to a random enemy',
    defaultGambit1: 'BOSS_STAGGER_OPEN',
    defaultGambit2: 'TARGET_HAS_BURN',
    gambitPresets: [
      { slot: 1, condition: 'BOSS_STAGGER_OPEN', action: 'Imperial Chain Lightning', desc: 'Rapid multi-target lightning barrage' },
      { slot: 2, condition: 'TARGET_HAS_WIND', action: 'Thunder Gale Surge', desc: 'Trigger THUNDER GALE scaling with Bleed stacks' },
    ],
    colors: { primary: '#7e22ce', secondary: '#facc15', hair: '#f3e8ff', weapon: '#a855f7', glow: 'rgba(168, 85, 247, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Flash Bolt Shot', 'Frontmost Enemy', 'FRONT', 0, 100, 130, 15, 4.0, 10, 10, 'High-velocity lightning bolt', { debuff: 'Shock' }),
      active: makeSkill('Active', 'Imperial Chain Lightning', 'All Enemies (AoE)', 'ALL_AOE', 6.5, 215, 310, 45, 4.0, 35, 55, 'Ricochets across all enemies and boosts own SPD +15%', { debuff: 'Shock' }),
      chain: makeSkill('Chain', 'Thunder Gale Surge', 'All Enemies (AoE)', 'ALL_AOE', 8.5, 325, 470, 65, 4.0, 100, 100, 'Triggers THUNDER GALE (+15% DMG per Bleed stack)', { reactionTrigger: 'THUNDER GALE' }),
      ultimate: makeSkill('Ultimate', 'Tempest Sovereign Spear', 'All Enemies (AoE)', 'ALL_AOE', 0, 590, 860, 150, 4.0, 65, 80, 'Calls down a sovereign thunder spear across the arena', { debuff: 'Shock' }),
    },
  }),

  createResonator({
    id: 'H06',
    name: 'Sparky',
    title: 'Overclocked Arc Automaton',
    rarity: 'SR',
    element: ELEMENTS.ELECTRO,
    regionId: 'Region 3',
    regionName: REGIONS.TECHNO_SAVANT,
    regionLore: 'Autonomous Tesla-coil drone engineered to overload Old God barriers with 100% precision.',
    role: COMBAT_ROLES.DEBUFFER,
    recommendedRow: 'Back',
    highlight: 'Active Skill guarantees 100% Shock application to prime Superconduct & Overload.',
    baseStats: {
      hpLv1: 1020, hpLv100: 14790,
      atkLv1: 138, atkLv100: 2001,
      defLv1: 68, defLv100: 986,
      critRate: 10, critDmg: 150,
      effectHitRate: 20, effectRes: 0, healingBonus: 0,
      spd: 112, breakPower: 115, energyCharge: 110,
    },
    star5BonusDesc: 'Effect Hit Rate +25%, Energy Charge +15%',
    passiveName: 'Overclocked Capacitor',
    passive3Star: 'Effect Hit Rate +15%',
    passive4Star: 'Shocked targets take +10% extra Break Damage',
    passive5Star: 'Start every wave with +35% Ultimate Energy',
    defaultGambit1: 'BOSS_STAGGER_OPEN',
    defaultGambit2: 'TARGET_HAS_BURN',
    gambitPresets: [
      { slot: 1, condition: 'BOSS_STAGGER_OPEN', action: 'Guaranteed Tesla Coil', desc: 'Apply guaranteed Shock for +35% Stagger Break efficiency' },
      { slot: 2, condition: 'TARGET_HAS_BURN', action: 'Short-Circuit Discharge', desc: 'Detonate Burn into OVERLOAD PLASMA' },
    ],
    colors: { primary: '#6b21a8', secondary: '#38bdf8', hair: '#bae6fd', weapon: '#e879f9', glow: 'rgba(217, 70, 239, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Taser Zap', 'Frontmost Enemy', 'FRONT', 0, 95, 125, 15, 4.0, 20, 20, 'Quick electric jolt', { debuff: 'Shock' }),
      active: makeSkill('Active', 'Guaranteed Tesla Coil', 'Boss Main Core', 'BOSS_MAIN', 6.5, 185, 265, 50, 4.0, 100, 100, '100% base Shock application chance for reliable Superconduct', { debuff: 'Shock' }),
      chain: makeSkill('Chain', 'Short-Circuit Discharge', 'All Enemies (AoE)', 'ALL_AOE', 8.0, 280, 405, 75, 4.0, 100, 100, 'Triggers OVERLOAD PLASMA to interrupt enemy channeling', { reactionTrigger: 'OVERLOAD PLASMA' }),
      ultimate: makeSkill('Ultimate', 'Gigawatt EMP Nova', 'All Enemies (AoE)', 'ALL_AOE', 0, 490, 710, 150, 4.0, 80, 100, 'EMP blast that strips enemy shields and inflicts Shock', { debuff: 'Shock' }),
    },
  }),

  // =========================================================================
  // CRYO (H07 - H09)
  // =========================================================================
  createResonator({
    id: 'H07',
    name: 'Yuzuki Hoshino',
    title: 'Astral Oracle of the Permafrost',
    rarity: 'SSR',
    element: ELEMENTS.CRYO,
    regionId: 'Region 4',
    regionName: REGIONS.FROSTBOUND_TUNDRA,
    regionLore: 'Eternal snowfield of resilient monster hunters and winter starlight diviners.',
    role: COMBAT_ROLES.DEBUFFER,
    recommendedRow: 'Back',
    highlight: 'AoE 2.0s Freeze control and reduces all enemies Effect RES by 25%.',
    baseStats: {
      hpLv1: 1050, hpLv100: 15225,
      atkLv1: 145, atkLv100: 2102,
      defLv1: 65, defLv100: 942,
      critRate: 10, critDmg: 150,
      effectHitRate: 15, effectRes: 5, healingBonus: 0,
      spd: 104, breakPower: 110, energyCharge: 105,
    },
    star5BonusDesc: 'Effect Hit Rate +20%, Break Power +20%',
    passiveName: 'Oracle of the Tundra',
    passive3Star: 'Effect Hit Rate +15%',
    passive4Star: 'Debuffed enemies deal 15% less DMG',
    passive5Star: 'Triggering any Elemental Reaction restores +15% Ultimate Energy',
    defaultGambit1: 'BOSS_STAGGER_OPEN',
    defaultGambit2: 'TARGET_HAS_SHOCK',
    gambitPresets: [
      { slot: 1, condition: 'BOSS_STAGGER_OPEN', action: 'Permafrost Nova', desc: 'Freeze enemy formation and halt boss charge bar' },
      { slot: 2, condition: 'TARGET_HAS_SHOCK', action: 'Superconduct Zero', desc: 'Detonate Shock into SUPERCONDUCT (+80 BP & +35% Team Break)' },
    ],
    colors: { primary: '#0284c7', secondary: '#bae6fd', hair: '#e0f2fe', weapon: '#38bdf8', glow: 'rgba(56, 189, 248, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Rime Star Shard', 'Frontmost Enemy (1 Target)', 'FRONT', 0, 100, 130, 15, 2.0, 20, 20, 'Slows target attack speed by 15% for 2.0s', { debuff: 'Slow' }),
      active: makeSkill('Active', 'Permafrost Nova', 'All Enemies (AoE)', 'ALL_AOE', 7.0, 190, 275, 40, 2.0, 25, 40, '+30% bonus Freeze proc chance against Shocked targets', { debuff: 'Freeze' }),
      chain: makeSkill('Chain', 'Superconduct Zero', 'Gambit Target (Shocked Priority)', 'BOSS_MAIN', 9.0, 290, 420, 80, 4.0, 100, 100, 'Detonates Shock for SUPERCONDUCT (+80 bonus BP & Team Break Power +35%)', { reactionTrigger: 'SUPERCONDUCT' }),
      ultimate: makeSkill('Ultimate', 'Absolute Zero Nebula', 'All Enemies (AoE)', 'ALL_AOE', 0, 520, 760, 150, 2.0, 65, 80, 'Reduces all enemies Effect RES by 25% for 5.0s before Freeze check', { debuff: 'Freeze' }),
    },
  }),

  createResonator({
    id: 'H08',
    name: 'Freya Wintergard',
    title: 'Frostfang Valkyrie of the North',
    rarity: 'SSR',
    element: ELEMENTS.CRYO,
    regionId: 'Region 4',
    regionName: REGIONS.FROSTBOUND_TUNDRA,
    regionLore: 'Noble northern swordmaster wielding a crystalline glacier greatsword.',
    role: COMBAT_ROLES.MELEE_DPS,
    recommendedRow: 'Front',
    highlight: 'Cryo claymore duelist who deals +50% bonus damage against Frozen targets.',
    baseStats: {
      hpLv1: 1290, hpLv100: 18705,
      atkLv1: 162, atkLv100: 2349,
      defLv1: 80, defLv100: 1160,
      critRate: 12, critDmg: 155,
      effectHitRate: 0, effectRes: 5, healingBonus: 0,
      spd: 106, breakPower: 105, energyCharge: 100,
    },
    star5BonusDesc: 'Crit DMG +30%, ATK +12%',
    passiveName: 'Shatterfrost Edge',
    passive3Star: 'Crit Rate +12%',
    passive4Star: '+50% DMG against Frozen enemies',
    passive5Star: 'Landing a Critical Hit on a Frozen target refunds 20% Ultimate Energy',
    defaultGambit1: 'BOSS_STAGGER_OPEN',
    defaultGambit2: 'TARGET_HAS_SHOCK',
    gambitPresets: [
      { slot: 1, condition: 'BOSS_STAGGER_OPEN', action: 'Glacier Rend', desc: 'Heavy frontline frost slash' },
      { slot: 2, condition: 'TARGET_HAS_WIND', action: 'Blizzard Execution', desc: 'Trigger BLIZZARD to slow enemy SPD by 30%' },
    ],
    colors: { primary: '#0369a1', secondary: '#7dd3fc', hair: '#f0f9ff', weapon: '#0ea5e9', glow: 'rgba(14, 165, 233, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Icicle Fang Slash', 'Frontmost Enemy', 'FRONT', 0, 102, 132, 15, 2.0, 10, 10, 'Frost-imbued greatsword cleave', { debuff: 'Freeze' }),
      active: makeSkill('Active', 'Glacier Rend', 'Frontline Enemies (2 Targets)', 'FRONT_CLEAVE', 6.5, 220, 315, 45, 2.0, 30, 45, 'Deals +50% bonus damage if target is Frozen', { debuff: 'Freeze' }),
      chain: makeSkill('Chain', 'Blizzard Execution', 'Boss Main Core', 'BOSS_MAIN', 8.5, 330, 475, 65, 4.0, 100, 100, 'Triggers BLIZZARD to chill enemy attack speed by 30%', { reactionTrigger: 'BLIZZARD' }),
      ultimate: makeSkill('Ultimate', 'Niflheim Shatter Blade', 'All Enemies (AoE)', 'ALL_AOE', 0, 610, 890, 150, 2.0, 65, 80, 'Shatters frozen air into a lethal glacial execution', { debuff: 'Freeze' }),
    },
  }),

  createResonator({
    id: 'H09',
    name: 'Frostguard Olin',
    title: 'Glacial Bulwark of Tundra',
    rarity: 'SR',
    element: ELEMENTS.CRYO,
    regionId: 'Region 4',
    regionName: REGIONS.FROSTBOUND_TUNDRA,
    regionLore: 'Veteran shield-bearer of the northern wall who intercepts lethal blows for his squad.',
    role: COMBAT_ROLES.TANK,
    recommendedRow: 'Front',
    highlight: 'Deploys a snowflake barrier that intercepts damage aimed at backline allies.',
    baseStats: {
      hpLv1: 1580, hpLv100: 22910,
      atkLv1: 108, atkLv100: 1566,
      defLv1: 118, defLv100: 1711,
      critRate: 10, critDmg: 150,
      effectHitRate: 5, effectRes: 15, healingBonus: 0,
      spd: 94, breakPower: 115, energyCharge: 100,
    },
    star5BonusDesc: 'DEF +25%, Max HP +15%',
    passiveName: 'Glacial Wall',
    passive3Star: 'Max HP +15%',
    passive4Star: 'Reduces backline allies damage taken by 15%',
    passive5Star: 'Taking damage has 25% chance to inflict Slow on attacker',
    defaultGambit1: 'ALLY_HP_BELOW_50',
    defaultGambit2: 'TARGET_HAS_SHOCK',
    gambitPresets: [
      { slot: 1, condition: 'ALLY_HP_BELOW_50', action: 'Snowflake Intercept Wall', desc: 'Shield party and absorb backline damage' },
      { slot: 2, condition: 'TARGET_HAS_SHOCK', action: 'Avalanche Slam', desc: 'Trigger SUPERCONDUCT to break boss armor' },
    ],
    colors: { primary: '#1d4ed8', secondary: '#93c5fd', hair: '#dbeafe', weapon: '#60a5fa', glow: 'rgba(59, 130, 246, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Frost Shield Bash', 'Frontmost Enemy', 'FRONT', 0, 95, 125, 20, 2.0, 10, 10, 'Heavy ice shield strike', { debuff: 'Freeze' }),
      active: makeSkill('Active', 'Snowflake Intercept Wall', 'Frontline + Party Shield', 'FRONT_CLEAVE', 7.5, 170, 245, 45, 2.0, 25, 40, 'Grants 15% Max HP ice barrier to allies', { debuff: 'Freeze' }),
      chain: makeSkill('Chain', 'Avalanche Slam', 'Boss Main Core', 'BOSS_MAIN', 8.5, 270, 390, 85, 4.0, 100, 100, 'Triggers SUPERCONDUCT (+80 BP & +35% Team Break)', { reactionTrigger: 'SUPERCONDUCT' }),
      ultimate: makeSkill('Ultimate', 'Eternal Citadel of Ice', 'All Enemies (AoE)', 'ALL_AOE', 0, 440, 640, 145, 2.0, 65, 80, 'Fortifies squad DEF +30% and freezes enemies', { debuff: 'Freeze' }),
    },
  }),

  // =========================================================================
  // WIND (H10 - H12)
  // =========================================================================
  createResonator({
    id: 'H10',
    name: 'Kahori Amakusa',
    title: 'Nine-Tailed Gale of the Wilds',
    rarity: 'SSR',
    element: ELEMENTS.WIND,
    regionId: 'Region 1',
    regionName: REGIONS.VERDANT_WILDS,
    regionLore: 'Ancient world-tree forests where Beastkin and spirit-blade rangers guard nature.',
    role: COMBAT_ROLES.MELEE_DPS,
    recommendedRow: 'Front/Back',
    highlight: 'Highest SPD in the game, bypasses frontline to assassinate backline, detonates 5x Bleed.',
    baseStats: {
      hpLv1: 1120, hpLv100: 16240,
      atkLv1: 158, atkLv100: 2291,
      defLv1: 68, defLv100: 986,
      critRate: 10, critDmg: 150,
      effectHitRate: 0, effectRes: 0, healingBonus: 0,
      spd: 125, breakPower: 100, energyCharge: 100,
    },
    star5BonusDesc: 'Crit Rate +12%, SPD +10',
    passiveName: 'Spirit of the Wilds',
    passive3Star: 'SPD +15%',
    passive4Star: 'Basic Attack has 30% chance to strike an extra time',
    passive5Star: 'Targets with 5x Bleed stacks take +50% Crit DMG',
    defaultGambit1: 'BOSS_SHIELD_ACTIVE',
    defaultGambit2: 'TARGET_HAS_BURN',
    gambitPresets: [
      { slot: 1, condition: 'BOSS_SHIELD_ACTIVE', action: 'Verdant Shadow Step', desc: 'Bypass frontline Taunt to snipe Eye of Madness' },
      { slot: 2, condition: 'TARGET_HAS_BURN', action: 'Firestorm Whirlwind', desc: 'Detonate Burn into FIRESTORM (+10 Team Ult Energy)' },
    ],
    colors: { primary: '#059669', secondary: '#a7f3d0', hair: '#fef08a', weapon: '#34d399', glow: 'rgba(52, 211, 153, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Gale Fox Twin-Cut', 'Frontmost Enemy (2 Hits)', 'FRONT', 0, 110, 144, 15, 4.0, 10, 10, 'Fastest twin-strike in the Spire; rapidly stacks Wind Bleed', { hits: 2, debuff: 'Bleed', debuffStacks: 1 }),
      active: makeSkill('Active', 'Verdant Shadow Step', 'Backline Bypass (Eye of Madness)', 'BACKLINE_BYPASS', 6.0, 235, 340, 40, 4.0, 35, 55, 'Bypasses frontline Taunt to assassinate backline support parts directly', { debuff: 'Bleed', debuffStacks: 2 }),
      chain: makeSkill('Chain', 'Firestorm Whirlwind', 'All Enemies (AoE 3 Hits)', 'ALL_AOE', 8.5, 310, 450, 60, 4.0, 100, 100, 'Detonates Burn for FIRESTORM (spreads Burn+Bleed & +10 Team Ult Energy)', { hits: 3, reactionTrigger: 'FIRESTORM' }),
      ultimate: makeSkill('Ultimate', 'Nine-Tailed Tempest Dance', 'Lowest HP & Full Field Cleave', 'ALL_AOE', 0, 620, 900, 150, 4.0, 65, 80, 'Instantly detonates all active Bleed stacks on targets for 150% burst DMG', { debuff: 'Bleed', debuffStacks: 3 }),
    },
  }),

  createResonator({
    id: 'H11',
    name: 'Zephyr Gale',
    title: 'Emerald Windrunner Archer',
    rarity: 'SSR',
    element: ELEMENTS.WIND,
    regionId: 'Region 1',
    regionName: REGIONS.VERDANT_WILDS,
    regionLore: 'Master sylph-bow sniper who fires gale-force arrows through entire enemy columns.',
    role: COMBAT_ROLES.RANGED_DPS,
    recommendedRow: 'Back',
    highlight: 'Piercing tempest arrows strike from front to back while reducing enemy ATK.',
    baseStats: {
      hpLv1: 1060, hpLv100: 15370,
      atkLv1: 164, atkLv100: 2378,
      defLv1: 64, defLv100: 928,
      critRate: 12, critDmg: 150,
      effectHitRate: 5, effectRes: 0, healingBonus: 0,
      spd: 119, breakPower: 105, energyCharge: 105,
    },
    star5BonusDesc: 'ATK +15%, SPD +10',
    passiveName: 'Eye of the Hurricane',
    passive3Star: 'ATK +12%',
    passive4Star: 'Piercing shots deal +20% DMG to backline parts',
    passive5Star: 'Applies 2 stacks of Bleed on Critical Hits',
    defaultGambit1: 'BOSS_STAGGER_OPEN',
    defaultGambit2: 'TARGET_HAS_FREEZE',
    gambitPresets: [
      { slot: 1, condition: 'BOSS_STAGGER_OPEN', action: 'Cyclone Piercer', desc: 'Pierce all boss parts in a line' },
      { slot: 2, condition: 'TARGET_HAS_CRYO', action: 'Squall Vortex Arrow', desc: 'Trigger BLIZZARD to chill enemy attack speed' },
    ],
    colors: { primary: '#10b981', secondary: '#6ee7b7', hair: '#d1fae5', weapon: '#059669', glow: 'rgba(16, 185, 129, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Feather Gust Arrow', 'Frontmost Enemy', 'FRONT', 0, 100, 130, 15, 4.0, 12, 12, 'Swift wind-feathered arrow', { debuff: 'Bleed' }),
      active: makeSkill('Active', 'Cyclone Piercer', 'All Enemies (Piercing Line)', 'ALL_AOE', 6.5, 215, 310, 40, 4.0, 40, 60, 'Pierces front to back and reduces enemy ATK by 15%', { debuff: 'Bleed' }),
      chain: makeSkill('Chain', 'Squall Vortex Arrow', 'All Enemies (AoE)', 'ALL_AOE', 8.5, 315, 455, 65, 4.0, 100, 100, 'Triggers BLIZZARD to slow enemy SPD by 30%', { reactionTrigger: 'BLIZZARD' }),
      ultimate: makeSkill('Ultimate', 'World-Tree Hurricane Volley', 'All Enemies (AoE)', 'ALL_AOE', 0, 585, 855, 150, 4.0, 70, 85, 'Rains emerald tempest arrows across the entire Spire', { debuff: 'Bleed', debuffStacks: 2 }),
    },
  }),

  createResonator({
    id: 'H12',
    name: 'Gale Swift',
    title: 'Harmonic Bard of the Canopy',
    rarity: 'SR',
    element: ELEMENTS.WIND,
    regionId: 'Region 1',
    regionName: REGIONS.VERDANT_WILDS,
    regionLore: 'Wandering wind-minstrel whose melodies accelerate allies and shatter elemental barriers.',
    role: COMBAT_ROLES.SUPPORT_HEALER,
    recommendedRow: 'Back',
    highlight: 'Accelerates full-party SPD and boosts team Break Power.',
    baseStats: {
      hpLv1: 1210, hpLv100: 17545,
      atkLv1: 124, atkLv100: 1798,
      defLv1: 78, defLv100: 1131,
      critRate: 10, critDmg: 150,
      effectHitRate: 0, effectRes: 10, healingBonus: 12,
      spd: 120, breakPower: 110, energyCharge: 115,
    },
    star5BonusDesc: 'SPD +14, Energy Charge +15%',
    passiveName: 'Verdant Sonata',
    passive3Star: 'Team SPD +8%',
    passive4Star: 'Team Break Power +15%',
    passive5Star: 'Casting Ultimate grants +10% Ultimate Energy to all allies',
    defaultGambit1: 'BOSS_STAGGER_OPEN',
    defaultGambit2: 'TARGET_HAS_SHOCK',
    gambitPresets: [
      { slot: 1, condition: 'BOSS_STAGGER_OPEN', action: 'Tailwind Cadence', desc: 'Grant +20% SPD and +25% Break Power to party' },
      { slot: 2, condition: 'TARGET_HAS_ELECTRO', action: 'Resonant Storm Chord', desc: 'Trigger THUNDER GALE across all targets' },
    ],
    colors: { primary: '#0d9488', secondary: '#99f6e4', hair: '#ccfbf1', weapon: '#14b8a6', glow: 'rgba(20, 184, 166, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Breeze Note', 'Frontmost Enemy', 'FRONT', 0, 92, 120, 15, 4.0, 10, 10, 'Sonic wind chord', { debuff: 'Bleed' }),
      active: makeSkill('Active', 'Tailwind Cadence', 'Boss Main + Team Buff', 'BOSS_MAIN', 6.5, 165, 240, 40, 4.0, 35, 55, 'Buffs party Break Power +20% for 4.0s', { debuff: 'Bleed' }),
      chain: makeSkill('Chain', 'Resonant Storm Chord', 'All Enemies (AoE)', 'ALL_AOE', 8.0, 270, 390, 70, 4.0, 100, 100, 'Triggers THUNDER GALE chain lightning', { reactionTrigger: 'THUNDER GALE' }),
      ultimate: makeSkill('Ultimate', 'Symphony of the Emerald Gale', 'All Allies Heal + AoE', 'TEAM_HEAL_AOE', 0, 280, 400, 140, 4.0, 65, 80, 'Heals party and accelerates team action speed', { isHeal: true, debuff: 'Bleed' }),
    },
  }),

  // =========================================================================
  // LIGHT (H13 - H15)
  // =========================================================================
  createResonator({
    id: 'H13',
    name: 'Aurelia Solis',
    title: 'Seraphic Valkyrie of Sanctuary',
    rarity: 'SSR',
    element: ELEMENTS.LIGHT,
    regionId: 'Region 5',
    regionName: REGIONS.AETHERIAL_SANCTUARY,
    regionLore: 'Floating sky-island cathedrals of golden light, Valkyrie orders, and divine grace.',
    role: COMBAT_ROLES.SUPPORT_HEALER,
    recommendedRow: 'Back',
    highlight: 'Emergency party-wide burst heal, 20% Max HP Holy Shield, prevents fatal death at 5★.',
    baseStats: {
      hpLv1: 1380, hpLv100: 20010,
      atkLv1: 130, atkLv100: 1885,
      defLv1: 88, defLv100: 1276,
      critRate: 10, critDmg: 150,
      effectHitRate: 0, effectRes: 10, healingBonus: 15,
      spd: 102, breakPower: 105, energyCharge: 115,
    },
    star5BonusDesc: 'Healing Bonus +15%, Energy Charge +15%',
    passiveName: 'Seraphic Halo',
    passive3Star: 'Healing Bonus +15%',
    passive4Star: 'Shielded allies gain +15% ATK',
    passive5Star: 'Prevents 1 fatal death per wave (revives ally at 30% HP)',
    defaultGambit1: 'ALLY_HP_BELOW_50',
    defaultGambit2: 'ANY_DEBUFF',
    gambitPresets: [
      { slot: 1, condition: 'ALLY_HP_BELOW_50', action: "Valkyrie's Benediction", desc: 'Emergency AoE heal & 80 BP Stagger strike' },
      { slot: 2, condition: 'ANY_DEBUFF', action: "Valkyrie's Benediction", desc: 'Trigger RADIANT INFUSION to cleanse & heal 8% HP' },
    ],
    colors: { primary: '#d97706', secondary: '#fef3c7', hair: '#fde68a', weapon: '#fbbf24', glow: 'rgba(251, 191, 36, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Radiant Feather Arrow', 'Frontmost Enemy + Lowest Ally Heal', 'FRONT', 0, 95, 125, 15, 4.0, 10, 10, 'Heals lowest-HP ally for 35% of Aurelia ATK on every shot', { debuff: 'Luminous Mark' }),
      active: makeSkill('Active', 'Sanctuary Sunburst', 'Boss Main + Team Buff', 'BOSS_MAIN', 6.5, 175, 250, 40, 4.0, 35, 55, 'Cleanses 1 ally debuff & buffs all allies Crit Rate +15% for 4.0s', { debuff: 'Luminous Mark' }),
      chain: makeSkill('Chain', "Valkyrie's Benediction", 'All Allies Heal + Boss Strike', 'TEAM_HEAL_AOE', 8.0, 180, 260, 80, 4.0, 50, 70, 'Emergency party heal when ally HP < 50% + deals 80 BP Stagger damage', { isHeal: true, debuff: 'Luminous Mark', reactionTrigger: 'RADIANT INFUSION' }),
      ultimate: makeSkill('Ultimate', 'Aetherial Dawn Chorus', 'All Allies Heal + AoE Light Judgment', 'TEAM_HEAL_AOE', 0, 320, 460, 150, 4.0, 65, 80, 'Grants 20% Max HP Holy Shield to party & +15% Ultimate Energy to all allies', { isHeal: true, debuff: 'Luminous Mark' }),
    },
  }),

  createResonator({
    id: 'H14',
    name: 'Solarius Vance',
    title: 'Grand Paladin of the Golden Aegis',
    rarity: 'SSR',
    element: ELEMENTS.LIGHT,
    regionId: 'Region 5',
    regionName: REGIONS.AETHERIAL_SANCTUARY,
    regionLore: 'High Templar of the Sun Spire whose golden bastion turns enemy fury into restorative light.',
    role: COMBAT_ROLES.TANK,
    recommendedRow: 'Front',
    highlight: 'Holy Paladin barrier absorbs incoming damage and converts it into party-wide healing.',
    baseStats: {
      hpLv1: 1720, hpLv100: 24940,
      atkLv1: 114, atkLv100: 1653,
      defLv1: 124, defLv100: 1798,
      critRate: 10, critDmg: 150,
      effectHitRate: 0, effectRes: 15, healingBonus: 10,
      spd: 95, breakPower: 120, energyCharge: 105,
    },
    star5BonusDesc: 'Max HP +20%, Healing Bonus +15%',
    passiveName: 'Golden Sanctuary',
    passive3Star: 'DEF +20%',
    passive4Star: 'When shielded, restores 4% HP per second to frontline',
    passive5Star: 'Ultimate grants +25% DEF to entire squad for 6.0s',
    defaultGambit1: 'ALLY_HP_BELOW_50',
    defaultGambit2: 'ANY_DEBUFF',
    gambitPresets: [
      { slot: 1, condition: 'ALLY_HP_BELOW_50', action: 'Aegis of the Seraphim', desc: 'Erect damage-to-healing conversion barrier' },
      { slot: 2, condition: 'ANY_DEBUFF', action: 'Radiant Reckoning', desc: 'Trigger RADIANT INFUSION to heal squad 8% HP' },
    ],
    colors: { primary: '#ca8a04', secondary: '#fef08a', hair: '#fef9c3', weapon: '#facc15', glow: 'rgba(234, 179, 8, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Sunforge Mace', 'Frontmost Enemy', 'FRONT', 0, 96, 126, 20, 4.0, 10, 10, 'Sacred warhammer strike', { debuff: 'Luminous Mark' }),
      active: makeSkill('Active', 'Aegis of the Seraphim', 'Frontline + Party Shield', 'FRONT_CLEAVE', 7.0, 175, 255, 50, 4.0, 35, 55, 'Shields frontline and marks target with Luminous Mark', { debuff: 'Luminous Mark' }),
      chain: makeSkill('Chain', 'Radiant Reckoning', 'Boss Main Core', 'BOSS_MAIN', 8.5, 275, 395, 95, 4.0, 100, 100, 'Triggers RADIANT INFUSION to heal party for 8% Max HP', { reactionTrigger: 'RADIANT INFUSION' }),
      ultimate: makeSkill('Ultimate', 'Sanctuary Immortal Bastion', 'All Allies Shield + AoE', 'ALL_AOE', 0, 460, 670, 160, 4.0, 70, 85, 'Erects an unbreakable golden sanctuary across all 5 allies', { debuff: 'Luminous Mark' }),
    },
  }),

  createResonator({
    id: 'H15',
    name: 'Lumina',
    title: 'Prism Starlight Archer',
    rarity: 'SR',
    element: ELEMENTS.LIGHT,
    regionId: 'Region 5',
    regionName: REGIONS.AETHERIAL_SANCTUARY,
    regionLore: 'Aetherial sentinel who refracts starlight into high-crit marking beams.',
    role: COMBAT_ROLES.RANGED_DPS,
    recommendedRow: 'Back',
    highlight: 'Fires prism light arrows that apply Luminous Mark and boost party Crit Rate.',
    baseStats: {
      hpLv1: 1040, hpLv100: 15080,
      atkLv1: 148, atkLv100: 2146,
      defLv1: 62, defLv100: 899,
      critRate: 15, critDmg: 150,
      effectHitRate: 10, effectRes: 0, healingBonus: 0,
      spd: 110, breakPower: 100, energyCharge: 105,
    },
    star5BonusDesc: 'Crit Rate +15%, Crit DMG +20%',
    passiveName: 'Prism Refraction',
    passive3Star: 'Crit Rate +10%',
    passive4Star: 'Luminous Mark grants +10% extra Crit DMG to allies',
    passive5Star: 'Active Skill fires an additional prism beam',
    defaultGambit1: 'BOSS_STAGGER_OPEN',
    defaultGambit2: 'ANY_DEBUFF',
    gambitPresets: [
      { slot: 1, condition: 'BOSS_STAGGER_OPEN', action: 'Prism Flare Barrage', desc: 'Mark boss with Luminous Mark (+20% Crit Rate)' },
      { slot: 2, condition: 'ANY_DEBUFF', action: 'Starlight Purify Shot', desc: 'Trigger RADIANT INFUSION on elemental debuffs' },
    ],
    colors: { primary: '#f59e0b', secondary: '#fde68a', hair: '#fffbeb', weapon: '#fbbf24', glow: 'rgba(245, 158, 11, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Lightbeam Shot', 'Frontmost Enemy', 'FRONT', 0, 100, 130, 15, 4.0, 15, 15, 'Focused photon arrow', { debuff: 'Luminous Mark' }),
      active: makeSkill('Active', 'Prism Flare Barrage', 'All Enemies (AoE)', 'ALL_AOE', 6.5, 205, 295, 40, 4.0, 45, 65, 'Marks enemies with Luminous Mark and boosts team Crit Rate', { debuff: 'Luminous Mark' }),
      chain: makeSkill('Chain', 'Starlight Purify Shot', 'Boss Main Core', 'BOSS_MAIN', 8.5, 300, 435, 60, 4.0, 100, 100, 'Triggers RADIANT INFUSION to cleanse & heal squad', { reactionTrigger: 'RADIANT INFUSION' }),
      ultimate: makeSkill('Ultimate', 'Solar Eclipse Ray', 'Boss Main Core', 'BOSS_MAIN', 0, 560, 810, 145, 4.0, 75, 90, 'Concentrated solar lance that pierces boss defenses', { debuff: 'Luminous Mark' }),
    },
  }),

  // =========================================================================
  // DARK (H16 - H18)
  // =========================================================================
  createResonator({
    id: 'H16',
    name: 'Noctis Ravenlock',
    title: 'Abyssal Reaper of the Shadowlands',
    rarity: 'SR',
    element: ELEMENTS.DARK,
    regionId: 'Region 6',
    regionName: REGIONS.ABYSSAL_SHADOWLANDS,
    regionLore: 'Sunless realm of dark mana crystals, mutated horrors, and hooded chain-scythe reapers.',
    role: COMBAT_ROLES.RANGED_DPS,
    recommendedRow: 'Back',
    highlight: 'Snipes lowest-HP enemy appendage; 1,050% ATK single-target Ultimate execution.',
    baseStats: {
      hpLv1: 980, hpLv100: 14210,
      atkLv1: 152, atkLv100: 2204,
      defLv1: 58, defLv100: 841,
      critRate: 10, critDmg: 150,
      effectHitRate: 0, effectRes: 0, healingBonus: 0,
      spd: 115, breakPower: 100, energyCharge: 105,
    },
    star5BonusDesc: 'Crit Rate +15%, Crit DMG +25%',
    passiveName: 'Covenant of Shadows',
    passive3Star: 'Crit DMG +25%',
    passive4Star: '+25% DMG against targets below 50% HP',
    passive5Star: 'Defeating any enemy part restores +50% Ultimate Energy',
    defaultGambit1: 'BOSS_SHIELD_ACTIVE',
    defaultGambit2: 'TARGET_HAS_LUMINOUS',
    gambitPresets: [
      { slot: 1, condition: 'BOSS_SHIELD_ACTIVE', action: 'Abyssal Reap', desc: 'Snipe lowest-HP boss part or Eye of Madness' },
      { slot: 2, condition: 'TARGET_HAS_LUMINOUS', action: 'Twilight Execution', desc: 'Detonate Luminous Mark for TWILIGHT EXECUTION' },
    ],
    colors: { primary: '#e11d48', secondary: '#fda4af', hair: '#cbd5e1', weapon: '#f43f5e', glow: 'rgba(244, 63, 94, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Shadow Chain Scythe', 'Frontmost Enemy (1 Target)', 'FRONT', 0, 100, 130, 15, 4.0, 10, 10, 'Siphons +5% Ultimate Energy on hit from backline', { debuff: 'Corrosion' }),
      active: makeSkill('Active', 'Abyssal Reap', 'Lowest HP% Enemy Part', 'LOWEST_HP_ENEMY', 6.5, 220, 320, 40, 4.0, 35, 55, 'Automatically snipes the weakest boss appendage or low-HP minion', { debuff: 'Corrosion' }),
      chain: makeSkill('Chain', 'Twilight Execution', 'Gambit Target (Luminous Mark)', 'BOSS_MAIN', 8.5, 340, 490, 60, 4.0, 100, 100, 'Detonates Luminous Mark for TWILIGHT EXECUTION (40% Ignore DEF, or 100% True DMG <25% HP)', { reactionTrigger: 'TWILIGHT EXECUTION' }),
      ultimate: makeSkill('Ultimate', 'Oblivion Guillotine', 'Boss Main Core (Single-Target Burst)', 'BOSS_MAIN', 0, 720, 1050, 150, 4.0, 65, 80, 'Highest single-target nuke; guarantees 100% Critical Hit if target HP < 30%', { debuff: 'Corrosion' }),
    },
  }),

  createResonator({
    id: 'H17',
    name: 'Malakor the Fallen',
    title: 'Blood-Oath Dreadknight',
    rarity: 'SSR',
    element: ELEMENTS.DARK,
    regionId: 'Region 6',
    regionName: REGIONS.ABYSSAL_SHADOWLANDS,
    regionLore: 'Immortal dreadknight who sacrifices his own lifeblood to cleave dimensional rifts.',
    role: COMBAT_ROLES.MELEE_DPS,
    recommendedRow: 'Front',
    highlight: 'Dark frontline berserker whose ATK & True DMG scale higher the lower his HP drops.',
    baseStats: {
      hpLv1: 1420, hpLv100: 20590,
      atkLv1: 170, atkLv100: 2465,
      defLv1: 82, defLv100: 1189,
      critRate: 12, critDmg: 160,
      effectHitRate: 0, effectRes: 10, healingBonus: 0,
      spd: 105, breakPower: 110, energyCharge: 100,
    },
    star5BonusDesc: 'Crit DMG +35%, Lifesteal +12%',
    passiveName: 'Undying Blood Pact',
    passive3Star: 'ATK +15%',
    passive4Star: 'Gains +1% ATK for every 1% missing HP',
    passive5Star: 'Attacks deal +25% bonus True DMG when below 50% HP',
    defaultGambit1: 'ALLY_HP_BELOW_50',
    defaultGambit2: 'TARGET_HAS_LUMINOUS',
    gambitPresets: [
      { slot: 1, condition: 'ALLY_HP_BELOW_50', action: 'Blood-Oath Frenzy', desc: 'Unleash True DMG strike when HP drops low' },
      { slot: 2, condition: 'TARGET_HAS_LUMINOUS', action: 'Eclipse Doomblade', desc: 'Trigger TWILIGHT EXECUTION True DMG nuke' },
    ],
    colors: { primary: '#9f1239', secondary: '#fb7185', hair: '#f1f5f9', weapon: '#be123c', glow: 'rgba(190, 18, 60, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Dread Greatsword', 'Frontmost Enemy', 'FRONT', 0, 105, 138, 18, 4.0, 10, 10, 'Heavy dark greatsword cleave', { debuff: 'Corrosion' }),
      active: makeSkill('Active', 'Blood-Oath Frenzy', 'Frontline Enemies (2 Targets)', 'FRONT_CLEAVE', 6.5, 235, 340, 45, 4.0, 35, 55, 'Deals bonus damage based on missing HP and leeches 10% HP', { debuff: 'Corrosion' }),
      chain: makeSkill('Chain', 'Eclipse Doomblade', 'Boss Main Core', 'BOSS_MAIN', 8.5, 350, 505, 70, 4.0, 100, 100, 'Triggers TWILIGHT EXECUTION (40% Ignore DEF or 100% True DMG)', { reactionTrigger: 'TWILIGHT EXECUTION' }),
      ultimate: makeSkill('Ultimate', 'Cataclysm of the Fallen God', 'All Enemies (AoE)', 'ALL_AOE', 0, 660, 960, 160, 4.0, 70, 85, 'Splits the abyssal floor for massive AoE Dark devastation', { debuff: 'Corrosion' }),
    },
  }),

  createResonator({
    id: 'H18',
    name: 'Vespera Shadowveil',
    title: 'Arch-Weaver of the Void Sanctum',
    rarity: 'SSR',
    element: ELEMENTS.DARK,
    regionId: 'Region 6',
    regionName: REGIONS.ABYSSAL_SHADOWLANDS,
    regionLore: 'High sorceress of the Abyssal Shadowlands who bends entropy to prolong enemy suffering.',
    role: COMBAT_ROLES.DEBUFFER,
    recommendedRow: 'Back',
    highlight: 'Deploys Abyssal Zone that corrodes enemy armor, reduces Boss DMG by 20%, and extends debuffs.',
    baseStats: {
      hpLv1: 1110, hpLv100: 16095,
      atkLv1: 146, atkLv100: 2117,
      defLv1: 70, defLv100: 1015,
      critRate: 10, critDmg: 150,
      effectHitRate: 18, effectRes: 10, healingBonus: 0,
      spd: 109, breakPower: 105, energyCharge: 110,
    },
    star5BonusDesc: 'Effect Hit Rate +25%, SPD +10',
    passiveName: 'Entropy Weaver',
    passive3Star: 'Effect Hit Rate +15%',
    passive4Star: 'Corroded enemies deal 20% less damage to the party',
    passive5Star: 'Abyssal Decay increases all active debuff stacks by +1',
    defaultGambit1: 'BOSS_STAGGER_OPEN',
    defaultGambit2: 'ANY_DEBUFF',
    gambitPresets: [
      { slot: 1, condition: 'BOSS_STAGGER_OPEN', action: 'Shadowveil Corrosion Domain', desc: 'Weaken boss ATK by 20% & inflict Corrosion' },
      { slot: 2, condition: 'ANY_DEBUFF', action: 'Abyssal Decay Curse', desc: 'Trigger ABYSSAL DECAY to extend debuff durations +2.0s' },
    ],
    colors: { primary: '#881337', secondary: '#c084fc', hair: '#e9d5ff', weapon: '#db2777', glow: 'rgba(219, 39, 119, 0.55)' },
    skills: {
      basic: makeSkill('Basic', 'Void Bolt', 'Frontmost Enemy', 'FRONT', 0, 98, 128, 15, 4.0, 15, 15, 'Entropic dark orb', { debuff: 'Corrosion' }),
      active: makeSkill('Active', 'Shadowveil Corrosion Domain', 'All Enemies (AoE)', 'ALL_AOE', 7.0, 195, 280, 40, 4.0, 45, 65, 'Inflicts Corrosion (+35% Ult DMG taken) and weakens Boss ATK by 20%', { debuff: 'Corrosion' }),
      chain: makeSkill('Chain', 'Abyssal Decay Curse', 'Boss Main Core', 'BOSS_MAIN', 8.5, 295, 430, 65, 4.0, 100, 100, 'Triggers ABYSSAL DECAY to extend all active debuffs on Boss by +2.0s', { reactionTrigger: 'ABYSSAL DECAY' }),
      ultimate: makeSkill('Ultimate', 'Event Horizon Singularity', 'All Enemies (AoE)', 'ALL_AOE', 0, 540, 780, 150, 4.0, 75, 90, 'Collapses a dark singularity on all enemies, shredding Stagger & DEF', { debuff: 'Corrosion' }),
    },
  }),
]);

export const RESONATORS_V21 = RESONATORS;

export function getResonatorById(id: string): ResonatorData | null {
  return RESONATORS.find((r) => r.id === id) || null;
}

export function interpolateSkillMult(skill: SkillSpec, skillLv: number): number {
  const clamped = Math.max(1, Math.min(10, skillLv));
  return Math.round(skill.multLv1 + ((skill.multLv10 - skill.multLv1) * (clamped - 1)) / 9);
}

export function interpolateSkillProc(skill: SkillSpec, skillLv: number): number {
  const clamped = Math.max(1, Math.min(10, skillLv));
  if (skill.type === 'Basic') {
    return skill.debuff === 'Freeze' ? 0 : 10;
  }
  if (skill.type === 'Active') {
    if (skill.debuff === 'Freeze') {
      return Math.round(25 + ((40 - 25) * (clamped - 1)) / 9);
    }
    // 35% (Lv.1) -> 41% (Lv.4) -> 47% (Lv.7) -> 55% (Lv.10)
    if (clamped <= 7) {
      return Math.round(35 + (clamped - 1) * 2);
    }
    return Math.round(47 + ((55 - 47) * (clamped - 7)) / 3);
  }
  if (skill.type === 'Ultimate') {
    return Math.round(65 + ((80 - 65) * (clamped - 1)) / 9);
  }
  return Math.round(skill.procLv1 + ((skill.procLv10 - skill.procLv1) * (clamped - 1)) / 9);
}

export type ElementType = 'Fire' | 'Cryo' | 'Electro' | 'Wind' | 'Light' | 'Dark';
export type RoleType = 'Tank / Breaker' | 'Melee DPS' | 'Ranged DPS' | 'Support & Healer' | 'Debuffer';
export type DebuffType = 'Burn' | 'Freeze' | 'Shock' | 'Bleed' | 'Luminous Mark' | 'Corrosion' | 'Slow' | 'Defenseless' | 'Conductive';
export type ReactionType = 'MELTDOWN' | 'SUPERCONDUCT' | 'TWILIGHT EXECUTION' | 'FIRESTORM';

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
  | 'ANY_DEBUFF';

export interface SkillSpec {
  type: 'Basic' | 'Active' | 'Chain' | 'Ultimate';
  name: string;
  targetDesc: string;
  targetRule: 'FRONT' | 'FRONT_CLEAVE' | 'ALL_AOE' | 'BACKLINE_BYPASS' | 'LOWEST_HP_ENEMY' | 'TEAM_HEAL_AOE' | 'BOSS_MAIN';
  cooldown: number; // 0 for Basic (uses SPD) or Ultimate (uses 100% energy)
  multLv1: number; // % ATK
  multLv10: number; // % ATK
  hits?: number;
  isHeal?: boolean;
  breakPower: number; // Base BP
  debuff?: DebuffType;
  debuffStacks?: number;
  debuffDuration: number;
  procLv1: number; // %
  procLv10: number; // %
  reactionTrigger?: ReactionType;
  specialDesc: string;
}

export interface ResonatorData {
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
  star5BonusDesc: string;
  passiveName: string;
  passive3Star: string;
  passive4Star: string;
  passive5Star: string;
  defaultGambit1: GambitConditionSlot1;
  defaultGambit2: GambitConditionSlot2;
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

export const ELEMENT_META: Record<ElementType, {
  color: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
  debuff: DebuffType;
  duration: number;
  effectDesc: string;
}> = {
  Fire: {
    color: '#ef4444',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/40',
    bgClass: 'bg-red-500/15',
    debuff: 'Burn',
    duration: 4.0,
    effectDesc: '30% ATK Fire DoT/s & -15% DEF',
  },
  Cryo: {
    color: '#38bdf8',
    textClass: 'text-sky-400',
    borderClass: 'border-sky-500/40',
    bgClass: 'bg-sky-500/15',
    debuff: 'Freeze',
    duration: 2.0,
    effectDesc: 'Halts enemy action & cast bar (8s Boss Freeze Resist after)',
  },
  Electro: {
    color: '#c084fc',
    textClass: 'text-purple-400',
    borderClass: 'border-purple-500/40',
    bgClass: 'bg-purple-500/15',
    debuff: 'Shock',
    duration: 4.0,
    effectDesc: 'Target takes +35% Break Damage to Stagger Gauge',
  },
  Wind: {
    color: '#34d399',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/40',
    bgClass: 'bg-emerald-500/15',
    debuff: 'Bleed',
    duration: 4.0,
    effectDesc: 'Stacks up to 5x (20% ATK Wind DoT/s per stack)',
  },
  Light: {
    color: '#fbbf24',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-400/40',
    bgClass: 'bg-amber-400/15',
    debuff: 'Luminous Mark',
    duration: 4.0,
    effectDesc: 'Attackers gain +20% Crit Rate & 8% Lifesteal',
  },
  Dark: {
    color: '#f43f5e',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/40',
    bgClass: 'bg-rose-500/15',
    debuff: 'Corrosion',
    duration: 4.0,
    effectDesc: 'Target takes +35% Ultimate Skill Damage',
  },
};

export interface FormationSpec {
  id: 'HYPER_CARRY' | 'SOLO_BASTION' | 'BALANCED' | 'VANGUARD';
  name: string;
  structure: string;
  frontCount: number;
  backCount: number;
  desc: string;
}

export const FORMATIONS: FormationSpec[] = [
  {
    id: 'HYPER_CARRY',
    name: '1. Hyper-Carry (4-1)',
    structure: 'Front 4 / Back 1',
    frontCount: 4,
    backCount: 1,
    desc: 'Frontline 4 allies share +DEF% pool while 1 hyper-carry in the back receives full +12% to +30% ATK.',
  },
  {
    id: 'SOLO_BASTION',
    name: '2. Solo Bastion (1-4)',
    structure: 'Front 1 / Back 4',
    frontCount: 1,
    backCount: 4,
    desc: '1 main Tank absorbs the full +12% to +30% DEF pool in front while 4 ranged/support allies fire from behind.',
  },
  {
    id: 'BALANCED',
    name: '3. Balanced (2-3)',
    structure: 'Front 2 / Back 3',
    frontCount: 2,
    backCount: 3,
    desc: 'Standard 5-Role synergy: 2 frontline bruisers (+6% to +15% DEF each) and 3 backline specialists (+4% to +10% ATK each).',
  },
  {
    id: 'VANGUARD',
    name: '4. Vanguard (3-2)',
    structure: 'Front 3 / Back 2',
    frontCount: 3,
    backCount: 2,
    desc: 'Aggressive 3-man frontline assault (+4% to +10% DEF each) with 2 backline anchors (+6% to +15% ATK each).',
  },
];

export function getFormationRowBonuses(formation: FormationSpec, level: number): { frontDefPct: number; backAtkPct: number } {
  // Pool budget starts at 12% at Lv.1 and scales linearly to 30% at Lv.10 (+2% per level)
  const clampedLv = Math.max(1, Math.min(10, level));
  const totalRowBudget = 12 + (clampedLv - 1) * 2;
  return {
    frontDefPct: Number((totalRowBudget / formation.frontCount).toFixed(2)),
    backAtkPct: Number((totalRowBudget / formation.backCount).toFixed(2)),
  };
}

export const RESONATORS: ResonatorData[] = [
  {
    id: 'H01',
    name: 'Kallen Vermillion',
    title: 'Crimson Blade of the Imperium',
    rarity: 'SSR',
    element: 'Fire',
    regionId: 'Region 2',
    regionName: 'The Central Imperium',
    regionLore: 'Grand human empire of high chivalry, ornate plate armor, and imperial flame broadswords.',
    role: 'Melee DPS',
    recommendedRow: 'Front',
    hpLv1: 1250,
    hpLv100: 18125,
    atkLv1: 165,
    atkLv100: 2392,
    defLv1: 75,
    defLv100: 1087,
    spd: 108,
    baseCritRate: 10,
    baseCritDmg: 150,
    baseBreakPower: 100,
    star5BonusDesc: 'Crit Rate +12%, SPD +10',
    passiveName: 'Heart of the Imperium',
    passive3Star: 'ATK +12%',
    passive4Star: '+20% Crit Rate against Burned targets',
    passive5Star: 'Boss Staggered resets Active Skill cooldown',
    defaultGambit1: 'BOSS_STAGGER_OPEN',
    defaultGambit2: 'TARGET_HAS_FREEZE',
    colors: {
      primary: '#dc2626',
      secondary: '#f59e0b',
      hair: '#fecdd3',
      weapon: '#fb923c',
      glow: 'rgba(239, 68, 68, 0.55)',
    },
    skills: {
      basic: {
        type: 'Basic',
        name: 'Imperial Ember Slash',
        targetDesc: 'Frontmost Enemy (1 Target)',
        targetRule: 'FRONT',
        cooldown: 0,
        multLv1: 100,
        multLv10: 130,
        breakPower: 15,
        debuff: 'Burn',
        debuffDuration: 4.0,
        procLv1: 10,
        procLv10: 10,
        specialDesc: 'Restores Ultimate Energy +4%',
      },
      active: {
        type: 'Active',
        name: 'Blazing Lotus Cleave',
        targetDesc: 'Frontline Enemies (2 Targets)',
        targetRule: 'FRONT_CLEAVE',
        cooldown: 7.0,
        multLv1: 210,
        multLv10: 300,
        breakPower: 40,
        debuff: 'Burn',
        debuffDuration: 4.0,
        procLv1: 35,
        procLv10: 55,
        specialDesc: 'Reduces target DEF by 15% for 4.0s',
      },
      chain: {
        type: 'Chain',
        name: 'Meltdown Execution',
        targetDesc: 'Gambit Target (Frozen Priority)',
        targetRule: 'BOSS_MAIN',
        cooldown: 9.0,
        multLv1: 320,
        multLv10: 460,
        breakPower: 60,
        debuffDuration: 4.0,
        procLv1: 100,
        procLv10: 100,
        reactionTrigger: 'MELTDOWN',
        specialDesc: 'Detonates Freeze for MELTDOWN (1.8x DMG + -25% DEF for 4s)',
      },
      ultimate: {
        type: 'Ultimate',
        name: 'Scarlet Imperial Horizon',
        targetDesc: 'All Enemies (AoE)',
        targetRule: 'ALL_AOE',
        cooldown: 0,
        multLv1: 580,
        multLv10: 850,
        breakPower: 150,
        debuff: 'Burn',
        debuffDuration: 4.0,
        procLv1: 65,
        procLv10: 80,
        specialDesc: 'Grants +30% Crit DMG before slash; +25% bonus DMG vs Burned targets',
      },
    },
  },
  {
    id: 'H02',
    name: 'Caelum Vance',
    title: 'Aegis Vanguard of Magitek',
    rarity: 'SSR',
    element: 'Electro',
    regionId: 'Region 3',
    regionName: 'The Techno-Savant Realm',
    regionLore: 'Magitek civilization fusing arcane reactor cores with railgun lances and heavy bastion shields.',
    role: 'Tank / Breaker',
    recommendedRow: 'Front',
    hpLv1: 1680,
    hpLv100: 24360,
    atkLv1: 115,
    atkLv100: 1667,
    defLv1: 120,
    defLv100: 1740,
    spd: 96,
    baseCritRate: 10,
    baseCritDmg: 150,
    baseBreakPower: 125,
    star5BonusDesc: 'DEF +25%, Effect RES +20%',
    passiveName: 'Aegis Core Reactor',
    passive3Star: 'Break Power +20%',
    passive4Star: 'Self Damage Taken -18%',
    passive5Star: 'Breaking 1 Boss Stagger bar heals all allies for 10% HP',
    defaultGambit1: 'BOSS_STAGGER_OPEN',
    defaultGambit2: 'ANY_DEBUFF',
    colors: {
      primary: '#9333ea',
      secondary: '#38bdf8',
      hair: '#e2e8f0',
      weapon: '#c084fc',
      glow: 'rgba(192, 132, 252, 0.55)',
    },
    skills: {
      basic: {
        type: 'Basic',
        name: 'Volt Lance Thrust',
        targetDesc: 'Frontmost Enemy (1 Target)',
        targetRule: 'FRONT',
        cooldown: 0,
        multLv1: 95,
        multLv10: 125,
        breakPower: 20,
        debuff: 'Shock',
        debuffDuration: 4.0,
        procLv1: 10,
        procLv10: 10,
        specialDesc: 'Grants self 5% Max HP Electro Shield',
      },
      active: {
        type: 'Active',
        name: 'Magitek Thunder Guard',
        targetDesc: 'Frontline Enemies + Ally Buff',
        targetRule: 'FRONT_CLEAVE',
        cooldown: 7.0,
        multLv1: 180,
        multLv10: 260,
        breakPower: 50,
        debuff: 'Shock',
        debuffDuration: 4.0,
        procLv1: 35,
        procLv10: 55,
        specialDesc: 'Taunts enemies & buffs frontline allies DEF +25% for 4.0s',
      },
      chain: {
        type: 'Chain',
        name: 'Overdrive Armor Shatter',
        targetDesc: 'Boss Stagger Gauge',
        targetRule: 'BOSS_MAIN',
        cooldown: 8.0,
        multLv1: 280,
        multLv10: 400,
        breakPower: 120,
        debuff: 'Shock',
        debuffDuration: 4.0,
        procLv1: 50,
        procLv10: 70,
        specialDesc: 'Massive 120 BP shatter & shields lowest-HP ally for 15% Max HP',
      },
      ultimate: {
        type: 'Ultimate',
        name: 'Heavenfall Railgun Dive',
        targetDesc: 'All Enemies (AoE)',
        targetRule: 'ALL_AOE',
        cooldown: 0,
        multLv1: 480,
        multLv10: 700,
        breakPower: 180,
        debuff: 'Shock',
        debuffDuration: 4.0,
        procLv1: 65,
        procLv10: 80,
        specialDesc: 'Instantly shatters Boss Aegis Barrier & buffs team Break Power +25% for 5s',
      },
    },
  },
  {
    id: 'H03',
    name: 'Yuzuki Hoshino',
    title: 'Astral Oracle of the Permafrost',
    rarity: 'SSR',
    element: 'Cryo',
    regionId: 'Region 4',
    regionName: 'The Frostbound Tundra',
    regionLore: 'Eternal snowfield of resilient monster hunters and winter starlight diviners.',
    role: 'Debuffer',
    recommendedRow: 'Back',
    hpLv1: 1050,
    hpLv100: 15225,
    atkLv1: 145,
    atkLv100: 2102,
    defLv1: 65,
    defLv100: 942,
    spd: 104,
    baseCritRate: 10,
    baseCritDmg: 150,
    baseBreakPower: 110,
    star5BonusDesc: 'Effect Hit Rate +20%, Break Power +20%',
    passiveName: 'Oracle of the Tundra',
    passive3Star: 'Effect Hit Rate +15%',
    passive4Star: 'Debuffed enemies deal 15% less DMG',
    passive5Star: 'Triggering any Elemental Reaction restores +15% Ultimate Energy',
    defaultGambit1: 'BOSS_STAGGER_OPEN',
    defaultGambit2: 'TARGET_HAS_SHOCK',
    colors: {
      primary: '#0284c7',
      secondary: '#bae6fd',
      hair: '#e0f2fe',
      weapon: '#38bdf8',
      glow: 'rgba(56, 189, 248, 0.55)',
    },
    skills: {
      basic: {
        type: 'Basic',
        name: 'Rime Star Shard',
        targetDesc: 'Frontmost Enemy (1 Target)',
        targetRule: 'FRONT',
        cooldown: 0,
        multLv1: 100,
        multLv10: 130,
        breakPower: 15,
        debuff: 'Slow',
        debuffDuration: 2.0,
        procLv1: 20,
        procLv10: 20,
        specialDesc: 'Slows target attack speed by 15% for 2.0s',
      },
      active: {
        type: 'Active',
        name: 'Permafrost Nova',
        targetDesc: 'All Enemies (AoE)',
        targetRule: 'ALL_AOE',
        cooldown: 7.0,
        multLv1: 190,
        multLv10: 275,
        breakPower: 40,
        debuff: 'Freeze',
        debuffDuration: 2.0,
        procLv1: 25,
        procLv10: 40,
        specialDesc: '+30% bonus Freeze proc chance against Shocked targets',
      },
      chain: {
        type: 'Chain',
        name: 'Superconduct Zero',
        targetDesc: 'Gambit Target (Shocked Priority)',
        targetRule: 'BOSS_MAIN',
        cooldown: 9.0,
        multLv1: 290,
        multLv10: 420,
        breakPower: 80,
        debuffDuration: 4.0,
        procLv1: 100,
        procLv10: 100,
        reactionTrigger: 'SUPERCONDUCT',
        specialDesc: 'Detonates Shock for SUPERCONDUCT (+80 bonus BP & Team Break Power +35%)',
      },
      ultimate: {
        type: 'Ultimate',
        name: 'Absolute Zero Nebula',
        targetDesc: 'All Enemies (AoE)',
        targetRule: 'ALL_AOE',
        cooldown: 0,
        multLv1: 520,
        multLv10: 760,
        breakPower: 150,
        debuff: 'Freeze',
        debuffDuration: 2.0,
        procLv1: 65,
        procLv10: 80,
        specialDesc: 'Reduces all enemies Effect RES by 25% for 5.0s before Freeze check',
      },
    },
  },
  {
    id: 'H04',
    name: 'Kahori Amakusa',
    title: 'Nine-Tailed Gale of the Wilds',
    rarity: 'SSR',
    element: 'Wind',
    regionId: 'Region 1',
    regionName: 'The Verdant Wilds',
    regionLore: 'Ancient world-tree forests where Beastkin and spirit-blade rangers guard nature.',
    role: 'Melee DPS',
    recommendedRow: 'Front/Back',
    hpLv1: 1120,
    hpLv100: 16240,
    atkLv1: 158,
    atkLv100: 2291,
    defLv1: 68,
    defLv100: 986,
    spd: 125,
    baseCritRate: 10,
    baseCritDmg: 150,
    baseBreakPower: 100,
    star5BonusDesc: 'Crit Rate +12%, SPD +10',
    passiveName: 'Spirit of the Wilds',
    passive3Star: 'SPD +15%',
    passive4Star: 'Basic Attack has 30% chance to strike an extra time',
    passive5Star: 'Targets with 5x Bleed stacks take +50% Crit DMG',
    defaultGambit1: 'BOSS_SHIELD_ACTIVE',
    defaultGambit2: 'TARGET_HAS_BURN',
    colors: {
      primary: '#059669',
      secondary: '#a7f3d0',
      hair: '#fef08a',
      weapon: '#34d399',
      glow: 'rgba(52, 211, 153, 0.55)',
    },
    skills: {
      basic: {
        type: 'Basic',
        name: 'Gale Fox Twin-Cut',
        targetDesc: 'Frontmost Enemy (2 Hits)',
        targetRule: 'FRONT',
        cooldown: 0,
        multLv1: 110, // 55% x 2
        multLv10: 144, // 72% x 2
        hits: 2,
        breakPower: 15,
        debuff: 'Bleed',
        debuffStacks: 1,
        debuffDuration: 4.0,
        procLv1: 10,
        procLv10: 10,
        specialDesc: 'Fastest twin-strike in the Spire; rapidly stacks Wind Bleed',
      },
      active: {
        type: 'Active',
        name: 'Verdant Shadow Step',
        targetDesc: 'Backline Bypass (Eye of Madness)',
        targetRule: 'BACKLINE_BYPASS',
        cooldown: 6.0,
        multLv1: 235,
        multLv10: 340,
        breakPower: 40,
        debuff: 'Bleed',
        debuffStacks: 2,
        debuffDuration: 4.0,
        procLv1: 35,
        procLv10: 55,
        specialDesc: 'Bypasses frontline Taunt to assassinate backline support parts directly',
      },
      chain: {
        type: 'Chain',
        name: 'Firestorm Whirlwind',
        targetDesc: 'All Enemies (AoE 3 Hits)',
        targetRule: 'ALL_AOE',
        cooldown: 8.5,
        multLv1: 310,
        multLv10: 450,
        hits: 3,
        breakPower: 60,
        debuffDuration: 4.0,
        procLv1: 100,
        procLv10: 100,
        reactionTrigger: 'FIRESTORM',
        specialDesc: 'Detonates Burn for FIRESTORM (spreads Burn+Bleed & +10 Team Ult Energy)',
      },
      ultimate: {
        type: 'Ultimate',
        name: 'Nine-Tailed Tempest Dance',
        targetDesc: 'Lowest HP & Full Field Cleave',
        targetRule: 'ALL_AOE',
        cooldown: 0,
        multLv1: 620,
        multLv10: 900,
        breakPower: 150,
        debuff: 'Bleed',
        debuffStacks: 3,
        debuffDuration: 4.0,
        procLv1: 65,
        procLv10: 80,
        specialDesc: 'Instantly detonates all active Bleed stacks on targets for 150% burst DMG',
      },
    },
  },
  {
    id: 'H05',
    name: 'Aurelia Solis',
    title: 'Seraphic Valkyrie of Sanctuary',
    rarity: 'SSR',
    element: 'Light',
    regionId: 'Region 5',
    regionName: 'The Aetherial Sanctuary',
    regionLore: 'Floating sky-island cathedrals of golden light, Valkyrie orders, and divine grace.',
    role: 'Support & Healer',
    recommendedRow: 'Back',
    hpLv1: 1380,
    hpLv100: 20010,
    atkLv1: 130,
    atkLv100: 1885,
    defLv1: 88,
    defLv100: 1276,
    spd: 102,
    baseCritRate: 10,
    baseCritDmg: 150,
    baseBreakPower: 105,
    star5BonusDesc: 'Healing Bonus +15%, Energy Charge +15%',
    passiveName: 'Seraphic Halo',
    passive3Star: 'Healing Bonus +15%',
    passive4Star: 'Shielded allies gain +15% ATK',
    passive5Star: 'Prevents 1 fatal death per wave (revives ally at 30% HP)',
    defaultGambit1: 'ALLY_HP_BELOW_50',
    defaultGambit2: 'ANY_DEBUFF',
    colors: {
      primary: '#d97706',
      secondary: '#fef3c7',
      hair: '#fde68a',
      weapon: '#fbbf24',
      glow: 'rgba(251, 191, 36, 0.55)',
    },
    skills: {
      basic: {
        type: 'Basic',
        name: 'Radiant Feather Arrow',
        targetDesc: 'Frontmost Enemy + Lowest Ally Heal',
        targetRule: 'FRONT',
        cooldown: 0,
        multLv1: 95,
        multLv10: 125,
        breakPower: 15,
        debuff: 'Luminous Mark',
        debuffDuration: 4.0,
        procLv1: 10,
        procLv10: 10,
        specialDesc: 'Heals lowest-HP ally for 35% of Aurelia ATK on every shot',
      },
      active: {
        type: 'Active',
        name: 'Sanctuary Sunburst',
        targetDesc: 'Boss Main + Team Buff',
        targetRule: 'BOSS_MAIN',
        cooldown: 6.5,
        multLv1: 175,
        multLv10: 250,
        breakPower: 40,
        debuff: 'Luminous Mark',
        debuffDuration: 4.0,
        procLv1: 35,
        procLv10: 55,
        specialDesc: 'Cleanses 1 ally debuff & buffs all allies Crit Rate +15% for 4.0s',
      },
      chain: {
        type: 'Chain',
        name: "Valkyrie's Benediction",
        targetDesc: 'All Allies Heal + Boss Strike',
        targetRule: 'TEAM_HEAL_AOE',
        cooldown: 8.0,
        multLv1: 180,
        multLv10: 260,
        isHeal: true,
        breakPower: 80,
        debuff: 'Luminous Mark',
        debuffDuration: 4.0,
        procLv1: 50,
        procLv10: 70,
        specialDesc: 'Emergency party heal when ally HP < 50% + deals 80 BP Stagger damage',
      },
      ultimate: {
        type: 'Ultimate',
        name: 'Aetherial Dawn Chorus',
        targetDesc: 'All Allies Heal + AoE Light Judgment',
        targetRule: 'TEAM_HEAL_AOE',
        cooldown: 0,
        multLv1: 320,
        multLv10: 460,
        isHeal: true,
        breakPower: 150,
        debuff: 'Luminous Mark',
        debuffDuration: 4.0,
        procLv1: 65,
        procLv10: 80,
        specialDesc: 'Grants 20% Max HP Holy Shield to party & +15% Ultimate Energy to all allies',
      },
    },
  },
  {
    id: 'H06',
    name: 'Noctis Ravenlock',
    title: 'Abyssal Reaper of the Shadowlands',
    rarity: 'SR',
    element: 'Dark',
    regionId: 'Region 6',
    regionName: 'The Abyssal Shadowlands',
    regionLore: 'Sunless realm of dark mana crystals, mutated horrors, and hooded chain-scythe reapers.',
    role: 'Ranged DPS',
    recommendedRow: 'Back',
    hpLv1: 980,
    hpLv100: 14210,
    atkLv1: 152,
    atkLv100: 2204,
    defLv1: 58,
    defLv100: 841,
    spd: 115,
    baseCritRate: 10,
    baseCritDmg: 150,
    baseBreakPower: 100,
    star5BonusDesc: 'Crit Rate +15%, Crit DMG +25%',
    passiveName: 'Covenant of Shadows',
    passive3Star: 'Crit DMG +25%',
    passive4Star: '+25% DMG against targets below 50% HP',
    passive5Star: 'Defeating any enemy part restores +50% Ultimate Energy',
    defaultGambit1: 'BOSS_SHIELD_ACTIVE',
    defaultGambit2: 'TARGET_HAS_LUMINOUS',
    colors: {
      primary: '#e11d48',
      secondary: '#fda4af',
      hair: '#cbd5e1',
      weapon: '#f43f5e',
      glow: 'rgba(244, 63, 94, 0.55)',
    },
    skills: {
      basic: {
        type: 'Basic',
        name: 'Shadow Chain Scythe',
        targetDesc: 'Frontmost Enemy (1 Target)',
        targetRule: 'FRONT',
        cooldown: 0,
        multLv1: 100,
        multLv10: 130,
        breakPower: 15,
        debuff: 'Corrosion',
        debuffDuration: 4.0,
        procLv1: 10,
        procLv10: 10,
        specialDesc: 'Siphons +5% Ultimate Energy on hit from backline',
      },
      active: {
        type: 'Active',
        name: 'Abyssal Reap',
        targetDesc: 'Lowest HP% Enemy Part',
        targetRule: 'LOWEST_HP_ENEMY',
        cooldown: 6.5,
        multLv1: 220,
        multLv10: 320,
        breakPower: 40,
        debuff: 'Corrosion',
        debuffDuration: 4.0,
        procLv1: 35,
        procLv10: 55,
        specialDesc: 'Automatically snipes the weakest boss appendage or low-HP minion',
      },
      chain: {
        type: 'Chain',
        name: 'Twilight Execution',
        targetDesc: 'Gambit Target (Luminous Mark)',
        targetRule: 'BOSS_MAIN',
        cooldown: 8.5,
        multLv1: 340,
        multLv10: 490,
        breakPower: 60,
        debuffDuration: 4.0,
        procLv1: 100,
        procLv10: 100,
        reactionTrigger: 'TWILIGHT EXECUTION',
        specialDesc: 'Detonates Luminous Mark for TWILIGHT EXECUTION (40% Ignore DEF, or 100% True DMG <25% HP)',
      },
      ultimate: {
        type: 'Ultimate',
        name: 'Oblivion Guillotine',
        targetDesc: 'Boss Main Core (Single-Target Burst)',
        targetRule: 'BOSS_MAIN',
        cooldown: 0,
        multLv1: 720,
        multLv10: 1050,
        breakPower: 150,
        debuff: 'Corrosion',
        debuffDuration: 4.0,
        procLv1: 65,
        procLv10: 80,
        specialDesc: 'Highest single-target nuke; guarantees 100% Critical Hit if target HP < 30%',
      },
    },
  },
];

export function interpolateSkillMult(skill: SkillSpec, skillLv: number): number {
  const clamped = Math.max(1, Math.min(10, skillLv));
  return Math.round(skill.multLv1 + ((skill.multLv10 - skill.multLv1) * (clamped - 1)) / 9);
}

export function interpolateSkillProc(skill: SkillSpec, skillLv: number): number {
  const clamped = Math.max(1, Math.min(10, skillLv));
  return Math.round(skill.procLv1 + ((skill.procLv10 - skill.procLv1) * (clamped - 1)) / 9);
}

/**
 * CHRONO SPIRE: STARFALL PROTOCOL — Master SSOT v2.1 (Unified TypeScript)
 * File 4: src/data/constellations.ts
 * 4 Grand Constellations — 40 Total Nodes (7 Hybrid Minor Stars + 2 Major Stars + 1 Keystone Core each)
 */

export type ConstellationTier = 'Minor' | 'Major' | 'Keystone';
export type KeystoneId = 'DRAGONS_CATACLYSM' | 'TITANS_BULWARK' | 'ASTRAL_RESONANCE' | 'ETERNAL_CHRONO_LOOP';

export interface ConstellationStarNode {
  id: string;
  index: number;
  tier: ConstellationTier;
  name: string;
  shardCost: number;
  stats: Record<string, number | undefined>;
  keystoneId?: KeystoneId;
  desc: string;
}

export interface GrandConstellationGroup {
  id: 'STAR_DRAGON' | 'TITAN_BASTION' | 'ASTRAL_NEXUS' | 'CHRONOS_HOURGLASS';
  name: string;
  theme: string;
  color: string;
  nodes: readonly ConstellationStarNode[];
}

export const GRAND_CONSTELLATIONS: readonly GrandConstellationGroup[] = Object.freeze([
  // 1. THE STAR DRAGON (Offense & Critical — 10 Nodes)
  {
    id: 'STAR_DRAGON',
    name: '1. The Star Dragon',
    theme: 'Offensive Destruction & Critical Precision',
    color: '#ef4444',
    nodes: [
      { id: 'SD_01', index: 1, tier: 'Minor', name: 'Draconis Alpha', shardCost: 20, stats: { 'ATK%': 3.0, 'Max HP%': 1.5 }, desc: 'ATK +3% / Max HP +1.5%' },
      { id: 'SD_02', index: 2, tier: 'Minor', name: 'Draconis Beta', shardCost: 25, stats: { 'Flat ATK': 45, 'DEF%': 2.0 }, desc: 'Flat ATK +45 / DEF +2%' },
      { id: 'SD_03', index: 3, tier: 'Minor', name: 'Draconis Gamma', shardCost: 30, stats: { 'Crit DMG%': 6.0, 'Max HP%': 2.0 }, desc: 'Crit DMG +6% / Max HP +2%' },
      { id: 'SD_04', index: 4, tier: 'Minor', name: 'Draconis Delta', shardCost: 35, stats: { 'ATK%': 4.0, 'SPD': 3 }, desc: 'ATK +4% / SPD +3' },
      { id: 'SD_05', index: 5, tier: 'Minor', name: 'Draconis Epsilon', shardCost: 40, stats: { 'Flat HP': 500, 'Crit Rate%': 1.5 }, desc: 'Flat HP +500 / Crit Rate +1.5%' },
      { id: 'SD_06', index: 6, tier: 'Minor', name: 'Draconis Zeta', shardCost: 45, stats: { 'Crit DMG%': 8.0, 'DEF%': 3.0 }, desc: 'Crit DMG +8% / DEF +3%' },
      { id: 'SD_07', index: 7, tier: 'Minor', name: 'Draconis Eta', shardCost: 50, stats: { 'ATK%': 5.0, 'Break Power%': 4.0 }, desc: 'ATK +5% / Break Power +4%' },
      { id: 'SD_08', index: 8, tier: 'Major', name: 'Eye of the Dragon', shardCost: 80, stats: { 'Crit Rate%': 5.0, 'Crit DMG%': 15.0 }, desc: 'Crit Rate +5% & Crit DMG +15%' },
      { id: 'SD_09', index: 9, tier: 'Major', name: 'Dragon Claws', shardCost: 90, stats: { 'Crit Ignore DEF%': 10.0 }, desc: 'Critical Hits ignore 10% Boss DEF' },
      {
        id: 'SD_10',
        index: 10,
        tier: 'Keystone',
        name: "Dragon's Cataclysm",
        shardCost: 150,
        stats: {},
        keystoneId: 'DRAGONS_CATACLYSM',
        desc: 'When the squad lands 10 cumulative Critical Hits, all allies gain ATK +20% for 6.0s.',
      },
    ],
  },

  // 2. THE TITAN BASTION (Defense, Shields & Resilience — 10 Nodes)
  {
    id: 'TITAN_BASTION',
    name: '2. The Titan Bastion',
    theme: 'Frontline Durability, Shields & Status Resistance',
    color: '#38bdf8',
    nodes: [
      { id: 'TB_01', index: 1, tier: 'Minor', name: 'Titanis Alpha', shardCost: 20, stats: { 'Max HP%': 4.0, 'Flat DEF': 30 }, desc: 'Max HP +4% / Flat DEF +30' },
      { id: 'TB_02', index: 2, tier: 'Minor', name: 'Titanis Beta', shardCost: 25, stats: { 'DEF%': 4.0, 'ATK%': 2.0 }, desc: 'DEF +4% / ATK +2%' },
      { id: 'TB_03', index: 3, tier: 'Minor', name: 'Titanis Gamma', shardCost: 30, stats: { 'Healing Bonus%': 4.0, 'Max HP%': 2.0 }, desc: 'Healing Bonus +4% / Max HP +2%' },
      { id: 'TB_04', index: 4, tier: 'Minor', name: 'Titanis Delta', shardCost: 35, stats: { 'Effect RES%': 5.0, 'Flat HP': 400 }, desc: 'Effect RES +5% / Flat HP +400' },
      { id: 'TB_05', index: 5, tier: 'Minor', name: 'Titanis Epsilon', shardCost: 40, stats: { 'Break Power%': 5.0, 'DEF%': 3.0 }, desc: 'Break Power +5% / DEF +3%' },
      { id: 'TB_06', index: 6, tier: 'Minor', name: 'Titanis Zeta', shardCost: 45, stats: { 'Max HP%': 5.0, 'SPD': 2 }, desc: 'Max HP +5% / SPD +2' },
      { id: 'TB_07', index: 7, tier: 'Minor', name: 'Titanis Eta', shardCost: 50, stats: { 'DEF%': 5.0, 'Effect RES%': 4.0 }, desc: 'DEF +5% / Effect RES +4%' },
      { id: 'TB_08', index: 8, tier: 'Major', name: 'Titan Aegis', shardCost: 80, stats: { 'Shield Strength%': 25.0 }, desc: 'Increases the strength of all shields created by +25%' },
      { id: 'TB_09', index: 9, tier: 'Major', name: 'Unyielding Heart', shardCost: 90, stats: { 'Low HP DMG Reduction%': 15.0 }, desc: 'When HP is below 30%, reduce damage taken by 15%' },
      {
        id: 'TB_10',
        index: 10,
        tier: 'Keystone',
        name: "Titan's Bulwark",
        shardCost: 150,
        stats: {},
        keystoneId: 'TITANS_BULWARK',
        desc: 'At the start of every floor wave, all Frontline allies gain a 15% Max HP Shield for 8.0s.',
      },
    ],
  },

  // 3. THE ASTRAL NEXUS (Stagger Break & Elemental Mastery — 10 Nodes)
  {
    id: 'ASTRAL_NEXUS',
    name: '3. The Astral Nexus',
    theme: 'Boss Stagger Sunder & Elemental Reaction Mastery',
    color: '#c084fc',
    nodes: [
      { id: 'AN_01', index: 1, tier: 'Minor', name: 'Nexus Alpha', shardCost: 20, stats: { 'Break Power%': 5.0, 'Flat ATK': 35 }, desc: 'Break Power +5% / Flat ATK +35' },
      { id: 'AN_02', index: 2, tier: 'Minor', name: 'Nexus Beta', shardCost: 25, stats: { 'Effect Hit Rate%': 4.0, 'Max HP%': 2.0 }, desc: 'Effect Hit Rate +4% / Max HP +2%' },
      { id: 'AN_03', index: 3, tier: 'Minor', name: 'Nexus Gamma', shardCost: 30, stats: { 'Tactical Chain DMG%': 6.0, 'DEF%': 2.0 }, desc: 'Tactical Chain DMG +6% / DEF +2%' },
      { id: 'AN_04', index: 4, tier: 'Minor', name: 'Nexus Delta', shardCost: 35, stats: { 'Break Power%': 6.0, 'Flat HP': 450 }, desc: 'Break Power +6% / Flat HP +450' },
      { id: 'AN_05', index: 5, tier: 'Minor', name: 'Nexus Epsilon', shardCost: 40, stats: { 'ATK%': 3.0, 'Effect Hit Rate%': 4.0 }, desc: 'ATK +3% / Effect Hit Rate +4%' },
      { id: 'AN_06', index: 6, tier: 'Minor', name: 'Nexus Zeta', shardCost: 45, stats: { 'Elemental Reaction DMG%': 8.0, 'SPD': 3 }, desc: 'Elemental Reaction DMG +8% / SPD +3' },
      { id: 'AN_07', index: 7, tier: 'Minor', name: 'Nexus Eta', shardCost: 50, stats: { 'Break Power%': 7.0, 'DEF%': 3.0 }, desc: 'Break Power +7% / DEF +3%' },
      { id: 'AN_08', index: 8, tier: 'Major', name: 'Sunder Reality', shardCost: 80, stats: { 'Stagger Duration Bonus Sec': 1.5 }, desc: 'Boss Staggered duration increased by +1.5s (from 5.5s to 7.0s)' },
      { id: 'AN_09', index: 9, tier: 'Major', name: 'Elemental Catalyst', shardCost: 90, stats: { 'Elemental Reaction DMG%': 30.0 }, desc: 'All Elemental Reactions deal +30% bonus DMG' },
      {
        id: 'AN_10',
        index: 10,
        tier: 'Keystone',
        name: 'Astral Resonance',
        shardCost: 150,
        stats: {},
        keystoneId: 'ASTRAL_RESONANCE',
        desc: 'Every Elemental Reaction triggered immediately shatters 30 BP of Boss Stagger and restores +5% Ultimate Energy to the team.',
      },
    ],
  },

  // 4. THE CHRONOS HOURGLASS (Time, AFK Economy & Ultimate Loop — 10 Nodes)
  {
    id: 'CHRONOS_HOURGLASS',
    name: '4. The Chronos Hourglass',
    theme: 'Temporal Acceleration, AFK Yield & Ultimate Energy',
    color: '#fbbf24',
    nodes: [
      { id: 'CH_01', index: 1, tier: 'Minor', name: 'Chronos Alpha', shardCost: 20, stats: { 'Energy Charge%': 3.0, 'Max HP%': 2.0 }, desc: 'Energy Charge +3% / Max HP +2%' },
      { id: 'CH_02', index: 2, tier: 'Minor', name: 'Chronos Beta', shardCost: 25, stats: { 'Gold Drop%': 6.0, 'Flat ATK': 30 }, desc: 'Gold Drop +6% / Flat ATK +30' },
      { id: 'CH_03', index: 3, tier: 'Minor', name: 'Chronos Gamma', shardCost: 30, stats: { 'Energy Charge%': 4.0, 'DEF%': 2.0 }, desc: 'Energy Charge +4% / DEF +2%' },
      { id: 'CH_04', index: 4, tier: 'Minor', name: 'Chronos Delta', shardCost: 35, stats: { 'AFK Chest Loot%': 8.0, 'Max HP%': 2.0 }, desc: 'AFK Chest Loot +8% / Max HP +2%' },
      { id: 'CH_05', index: 5, tier: 'Minor', name: 'Chronos Epsilon', shardCost: 40, stats: { 'Break Power%': 4.0, 'Energy Charge%': 3.0 }, desc: 'Break Power +4% / Energy Charge +3%' },
      { id: 'CH_06', index: 6, tier: 'Minor', name: 'Chronos Zeta', shardCost: 45, stats: { 'EXP Drop%': 8.0, 'Flat HP': 400 }, desc: 'EXP Drop +8% / Flat HP +400' },
      { id: 'CH_07', index: 7, tier: 'Minor', name: 'Chronos Eta', shardCost: 50, stats: { 'Energy Charge%': 5.0, 'ATK%': 3.0 }, desc: 'Energy Charge +5% / ATK +3%' },
      { id: 'CH_08', index: 8, tier: 'Major', name: 'Time Warp Leap', shardCost: 80, stats: { 'Starting Floor Bonus': 15 }, desc: 'Upon Chrono Rewind, immediately advance starting floor by +15 floors' },
      { id: 'CH_09', index: 9, tier: 'Major', name: 'Chronos Surge', shardCost: 90, stats: { 'Starting Ultimate Energy%': 20.0 }, desc: 'At the start of every wave, all allies gain +20% Ultimate Energy' },
      {
        id: 'CH_10',
        index: 10,
        tier: 'Keystone',
        name: 'Eternal Chrono Loop',
        shardCost: 150,
        stats: {},
        keystoneId: 'ETERNAL_CHRONO_LOOP',
        desc: 'The first ally to cast an Ultimate Skill in each wave immediately receives a 50% Ultimate Energy refund.',
      },
    ],
  },
]);

export function aggregateConstellationBonuses(unlockedNodeIds: string[] = []): {
  stats: Record<string, number>;
  keystones: KeystoneId[];
} {
  const unlockedSet = new Set(unlockedNodeIds);
  const totals: Record<string, number> = {};
  const activeKeystones: KeystoneId[] = [];

  GRAND_CONSTELLATIONS.forEach((group) => {
    group.nodes.forEach((node) => {
      if (!unlockedSet.has(node.id)) return;
      Object.entries(node.stats).forEach(([statKey, val]) => {
        if (typeof val === 'number') {
          totals[statKey] = Number(((totals[statKey] || 0) + val).toFixed(2));
        }
      });
      if (node.keystoneId) {
        activeKeystones.push(node.keystoneId);
      }
    });
  });

  return { stats: totals, keystones: activeKeystones };
}

/**
 * CHRONO SPIRE: STARFALL PROTOCOL — Master SSOT v2.3 (12 Unique Zodiac Trees & Seasonal Observatory)
 * File 4: src/data/constellations.ts
 * - 12 Clickable Zodiac Wheel Sectors (Aries..Pisces) + 1 Active Center Seasonal Constellation (13 total)
 * - Each Zodiac has its own UNIQUE asymmetric row structure (21-23 nodes across 7 rows) & custom star coordinates
 * - Strict node-by-node connected line unlocking + 1-of-3 Split Keystone lock per constellation
 */

export type ConstellationTier = 'Minor' | 'Medium' | 'Major' | 'Keystone';

export type ZodiacConstellationId =
  | 'ARIES'
  | 'TAURUS'
  | 'GEMINI'
  | 'CANCER'
  | 'LEO'
  | 'VIRGO'
  | 'LIBRA'
  | 'SCORPIO'
  | 'SAGITTARIUS'
  | 'CAPRICORN'
  | 'AQUARIUS'
  | 'PISCES';

export type ConstellationGroupId = ZodiacConstellationId | 'SEASONAL_CROWN';

export type KeystoneId =
  | 'DRAGONS_FURY_KEYSTONE'
  | 'DRAGONS_CATACLYSM'
  | 'DRAGONS_EXECUTION_KEYSTONE'
  | 'TITANS_AEGIS_KEYSTONE'
  | 'TITANS_BULWARK'
  | 'TITANS_FORTRESS_KEYSTONE'
  | 'ASTRAL_SUNDER_KEYSTONE'
  | 'ASTRAL_RESONANCE'
  | 'ASTRAL_CATALYST_KEYSTONE'
  | 'CHRONOS_OVERDRIVE_KEYSTONE'
  | 'ETERNAL_CHRONO_LOOP'
  | 'CHRONOS_BOUNTY_KEYSTONE'
  | 'SEASONAL_APEX_LEFT'
  | 'SEASONAL_APEX_CENTER'
  | 'SEASONAL_APEX_RIGHT';

export interface ConstellationStarNode {
  id: string;
  index: number;
  row: number;
  tier: ConstellationTier;
  name: string;
  shardCost: number;
  stats: Record<string, number | undefined>;
  keystoneId?: KeystoneId;
  desc: string;
}

export interface GrandConstellationGroup {
  id: ConstellationGroupId;
  name: string;
  symbol: string;
  zodiacTitle: string;
  theme: string;
  color: string;
  isSeasonal?: boolean;
  rowCounts: readonly number[];
  pts: readonly [number, number][];
  edges: readonly [number, number][];
  nodes: readonly ConstellationStarNode[];
}

export interface ZodiacWheelSectorSpec {
  id: ZodiacConstellationId;
  name: string;
  symbol: string;
  angleDeg: number;
  groupId: ZodiacConstellationId;
  color: string;
  theme: string;
  stars: readonly [number, number][]; // [angleOffsetDeg, radiusRatio 0..1] inside the 30° wedge
  edges: readonly [number, number][];
}

export interface SeasonalEventSpec {
  seasonNumber: number;
  code: string;
  name: string;
  symbol: string;
  periodLabel: string;
  theme: string;
  color: string;
  rowCounts: readonly number[];
}

export const SEASONAL_EVENTS: readonly SeasonalEventSpec[] = Object.freeze([
  {
    seasonNumber: 1,
    code: 'SS1_OPHIUCHUS',
    name: 'Season I: Ophiuchus Serpent Crown',
    symbol: '⛎',
    periodLabel: 'Active Season Event · Wipes Old Season on Rotation',
    theme: 'All-Elemental Ascension & True Damage Convergence',
    color: '#34d399',
    rowCounts: [1, 3, 2, 4, 4, 6, 3],
  },
  {
    seasonNumber: 2,
    code: 'SS2_PHOENIX',
    name: 'Season II: Solar Phoenix Supernova',
    symbol: '🐦‍🔥',
    periodLabel: 'Active Season Event · Wipes Old Season on Rotation',
    theme: 'Sovereign Critical Ignition & Revival Wards',
    color: '#fb923c',
    rowCounts: [1, 4, 2, 3, 4, 6, 3],
  },
  {
    seasonNumber: 3,
    code: 'SS3_LEVIATHAN',
    name: 'Season III: Abyssal Void Leviathan',
    symbol: '🐉',
    periodLabel: 'Active Season Event · Wipes Old Season on Rotation',
    theme: 'Stagger Shatter Overdrive & Ultimate Surge',
    color: '#38bdf8',
    rowCounts: [1, 2, 4, 3, 4, 6, 3],
  },
]);

export const ZODIAC_WHEEL_SECTORS: readonly ZodiacWheelSectorSpec[] = Object.freeze([
  {
    id: 'ARIES',
    name: 'Aries',
    symbol: '♈',
    angleDeg: -120,
    groupId: 'ARIES',
    color: '#f87171',
    theme: 'Vanguard ATK% & Critical Strike Ferocity',
    stars: [[-8, 0.28], [-3, 0.52], [4, 0.68], [9, 0.45], [6, 0.82]],
    edges: [[0, 1], [1, 2], [1, 3], [2, 4]],
  },
  {
    id: 'TAURUS',
    name: 'Taurus',
    symbol: '♉',
    angleDeg: -90,
    groupId: 'TAURUS',
    color: '#fbbf24',
    theme: 'Colossus Max HP% & Unbreakable Bastion DEF%',
    stars: [[-9, 0.78], [-5, 0.56], [0, 0.34], [6, 0.55], [10, 0.76], [2, 0.82]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5]],
  },
  {
    id: 'GEMINI',
    name: 'Gemini',
    symbol: '♊',
    angleDeg: -60,
    groupId: 'GEMINI',
    color: '#38bdf8',
    theme: 'Twin Chain Action SPD & Dual-Cast Tempo',
    stars: [[-7, 0.32], [-7, 0.62], [-6, 0.85], [6, 0.32], [6, 0.62], [7, 0.85]],
    edges: [[0, 1], [1, 2], [3, 4], [4, 5], [0, 3], [1, 4]],
  },
  {
    id: 'CANCER',
    name: 'Cancer',
    symbol: '♋',
    angleDeg: -30,
    groupId: 'CANCER',
    color: '#60a5fa',
    theme: 'Carapace Barrier Shielding & Effect RES%',
    stars: [[-8, 0.38], [0, 0.52], [8, 0.36], [-5, 0.78], [6, 0.80]],
    edges: [[0, 1], [2, 1], [1, 3], [1, 4]],
  },
  {
    id: 'LEO',
    name: 'Leo',
    symbol: '♌',
    angleDeg: 0,
    groupId: 'LEO',
    color: '#fb923c',
    theme: 'Solar Sovereign Crit DMG% & Burst Execution',
    stars: [[-9, 0.35], [-4, 0.26], [3, 0.42], [8, 0.68], [-2, 0.72], [-8, 0.82]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
  },
  {
    id: 'VIRGO',
    name: 'Virgo',
    symbol: '♍',
    angleDeg: 30,
    groupId: 'VIRGO',
    color: '#a3e635',
    theme: 'Precision Break Power% & Weakpoint Analysis',
    stars: [[-8, 0.30], [-2, 0.48], [5, 0.38], [0, 0.72], [8, 0.76], [-6, 0.82]],
    edges: [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5]],
  },
  {
    id: 'LIBRA',
    name: 'Libra',
    symbol: '♎',
    angleDeg: 60,
    groupId: 'LIBRA',
    color: '#c084fc',
    theme: 'Equilibrium All-Stat Synergy & Party Resonance',
    stars: [[0, 0.28], [-8, 0.58], [8, 0.58], [-6, 0.84], [6, 0.84]],
    edges: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4]],
  },
  {
    id: 'SCORPIO',
    name: 'Scorpio',
    symbol: '♏',
    angleDeg: 90,
    groupId: 'SCORPIO',
    color: '#f43f5e',
    theme: 'Venomous Effect Hit Rate% & Elemental Reaction DoT',
    stars: [[-9, 0.30], [-4, 0.42], [0, 0.56], [4, 0.70], [9, 0.82], [2, 0.86]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]],
  },
  {
    id: 'SAGITTARIUS',
    name: 'Sagittarius',
    symbol: '♐',
    angleDeg: 120,
    groupId: 'SAGITTARIUS',
    color: '#e879f9',
    theme: 'Astral Bow Piercing ATK% & Long-Range Crit Rate%',
    stars: [[-8, 0.42], [0, 0.32], [7, 0.48], [-3, 0.68], [5, 0.78], [-7, 0.82]],
    edges: [[0, 1], [1, 2], [1, 3], [3, 4], [3, 5], [0, 3]],
  },
  {
    id: 'CAPRICORN',
    name: 'Capricorn',
    symbol: '♑',
    angleDeg: 150,
    groupId: 'CAPRICORN',
    color: '#34d399',
    theme: 'Mountain Peak Stagger Break & Frontline Armor',
    stars: [[-8, 0.34], [0, 0.44], [8, 0.36], [5, 0.76], [-5, 0.78]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]],
  },
  {
    id: 'AQUARIUS',
    name: 'Aquarius',
    symbol: '♒',
    angleDeg: 180,
    groupId: 'AQUARIUS',
    color: '#2dd4bf',
    theme: 'Etheric Flood Energy Charge% & Ultimate Surge',
    stars: [[-7, 0.32], [-2, 0.46], [5, 0.38], [-6, 0.72], [1, 0.78], [8, 0.74]],
    edges: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5]],
  },
  {
    id: 'PISCES',
    name: 'Pisces',
    symbol: '♓',
    angleDeg: -150,
    groupId: 'PISCES',
    color: '#818cf8',
    theme: 'Celestial Tide Healing Bonus% & Time Shard Bounty',
    stars: [[-8, 0.76], [-4, 0.52], [0, 0.28], [5, 0.54], [9, 0.78]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4]],
  },
]);

/**
 * Generates a unique, deterministic multi-row star graph (pts + connected parent-child edges + balanced nodes)
 * for each Zodiac constellation based on its unique rowCounts array and seed.
 */
function buildUniqueZodiacConstellation(config: {
  id: ConstellationGroupId;
  name: string;
  symbol: string;
  zodiacTitle: string;
  theme: string;
  color: string;
  isSeasonal?: boolean;
  seed: number;
  rowCounts: readonly number[];
  primaryStatA: { key: string; label: string; minor: number; med: number; maj: number };
  primaryStatB: { key: string; label: string; minor: number; med: number; maj: number };
  secondaryStatA: { key: string; label: string; med: number; maj: number };
  secondaryStatB: { key: string; label: string; med: number; maj: number };
  keystones: [
    { name: string; id: KeystoneId; stats: Record<string, number>; desc: string },
    { name: string; id: KeystoneId; stats: Record<string, number>; desc: string },
    { name: string; id: KeystoneId; stats: Record<string, number>; desc: string }
  ];
}): GrandConstellationGroup {
  const { rowCounts, seed } = config;
  const numRows = rowCounts.length;

  // Compute node index ranges per row (1-based)
  const rowNodeIndices: number[][] = [];
  let nextIdx = 1;
  for (let r = 0; r < numRows; r++) {
    const count = rowCounts[r];
    const rowArr: number[] = [];
    for (let c = 0; c < count; c++) {
      rowArr.push(nextIdx++);
    }
    rowNodeIndices.push(rowArr);
  }

  // Compute SVG coordinates [x, y] in a 1000x380 viewBox with deterministic organic offsets per Zodiac
  const pts: [number, number][] = [];
  const yBottom = 340;
  const yTop = 44;
  for (let r = 0; r < numRows; r++) {
    const count = rowCounts[r];
    const baseY = Math.round(yBottom - (r / (numRows - 1)) * (yBottom - yTop));
    const spanX = count === 1 ? 0 : Math.min(540, 140 * count + ((seed * 17 + r * 31) % 50));
    for (let c = 0; c < count; c++) {
      const frac = count === 1 ? 0 : c / (count - 1) - 0.5;
      const jitterX =
        count === 1 || r === numRows - 1
          ? 0
          : (((seed * 23 + r * 41 + c * 19) % 29) - 14);
      const jitterY =
        r === 0 || r === numRows - 1
          ? 0
          : (((seed * 13 + r * 29 + c * 37) % 15) - 7);
      const x = Math.round(500 + frac * spanX + jitterX);
      const y = Math.round(baseY + jitterY);
      pts.push([x, y]);
    }
  }

  // Build connected parent-child edges between consecutive rows so every node is reachable and has children
  const edgeSet = new Set<string>();
  const edges: [number, number][] = [];
  const addEdge = (u: number, v: number) => {
    const key = `${u}_${v}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push([u, v]);
    }
  };

  for (let r = 0; r < numRows - 1; r++) {
    const parents = rowNodeIndices[r];
    const children = rowNodeIndices[r + 1];
    const pLen = parents.length;
    const cLen = children.length;

    if (r === numRows - 2 && cLen === 3) {
      // Penultimate Major row -> 3 Split Keystones: partition Majors cleanly across the 3 Keystones
      parents.forEach((pIdx, i) => {
        const kSlot = Math.min(2, Math.floor((i * 3) / pLen));
        addEdge(pIdx, children[kSlot]);
      });
      // Ensure each of the 3 Keystones has at least 2 Major prerequisites when pLen >= 4
      if (pLen >= 4) {
        addEdge(parents[0], children[0]);
        addEdge(parents[1], children[0]);
        addEdge(parents[Math.floor((pLen - 1) / 2)], children[1]);
        addEdge(parents[Math.min(pLen - 1, Math.floor(pLen / 2))], children[1]);
        addEdge(parents[pLen - 2], children[2]);
        addEdge(parents[pLen - 1], children[2]);
      }
    } else {
      // Connect each child to its nearest parent by normalized horizontal position
      children.forEach((cIdx, ci) => {
        const normC = cLen === 1 ? 0.5 : ci / (cLen - 1);
        const mappedP = pLen === 1 ? 0 : Math.round(normC * (pLen - 1));
        addEdge(parents[mappedP], cIdx);
        // Add a second diagonal branch on alternating nodes for build variety
        if (pLen > 1 && (ci + r + seed) % 2 === 0) {
          const altP = mappedP > 0 ? mappedP - 1 : mappedP + 1;
          addEdge(parents[altP], cIdx);
        }
      });
      // Guarantee every parent connects upward to at least one child
      parents.forEach((pIdx, pi) => {
        const hasChild = children.some((cIdx) => edgeSet.has(`${pIdx}_${cIdx}`));
        if (!hasChild) {
          const normP = pLen === 1 ? 0.5 : pi / (pLen - 1);
          const mappedC = cLen === 1 ? 0 : Math.round(normP * (cLen - 1));
          addEdge(pIdx, children[mappedC]);
        }
      });
    }
  }

  // Build the balanced ConstellationStarNode list
  const nodes: ConstellationStarNode[] = [];
  const A = config.primaryStatA;
  const B = config.primaryStatB;
  const SA = config.secondaryStatA;
  const SB = config.secondaryStatB;

  for (let r = 0; r < numRows; r++) {
    const rowIndices = rowNodeIndices[r];
    rowIndices.forEach((nodeIndex, posInRow) => {
      const isRoot = r === 0;
      const isKeystoneRow = r === numRows - 1;
      const isMajorRow = r === numRows - 2;
      const isMinorRow = r <= 1;

      if (isKeystoneRow) {
        const kSpec = config.keystones[Math.min(2, posInRow)];
        const reqMajors = edges
          .filter(([, to]) => to === nodeIndex)
          .map(([from]) => `#${from}`)
          .join(' & ');
        nodes.push({
          id: `${config.id}_${nodeIndex}`,
          index: nodeIndex,
          row: r + 1,
          tier: 'Keystone',
          name: kSpec.name,
          shardCost: 45,
          stats: kSpec.stats,
          keystoneId: kSpec.id,
          desc: `${kSpec.desc} (Requires Major ${reqMajors}; locks other Keystones)`,
        });
      } else if (isMajorRow) {
        const useA = posInRow % 2 === 0;
        const pStat = useA ? A : B;
        const sStat = posInRow % 3 === 0 ? SA : SB;
        nodes.push({
          id: `${config.id}_${nodeIndex}`,
          index: nodeIndex,
          row: r + 1,
          tier: 'Major',
          name: `Major Star #${nodeIndex}`,
          shardCost: 26,
          stats: { [pStat.key]: pStat.maj, [sStat.key]: sStat.maj },
          desc: `+${pStat.maj}% ${pStat.label} & +${sStat.maj}% ${sStat.label} to all Resonators`,
        });
      } else if (isMinorRow) {
        const useA = (nodeIndex + seed) % 2 === 0;
        const pStat = useA ? A : B;
        nodes.push({
          id: `${config.id}_${nodeIndex}`,
          index: nodeIndex,
          row: r + 1,
          tier: 'Minor',
          name: isRoot ? `${config.name} Root Star` : `Minor Star #${nodeIndex}`,
          shardCost: isRoot ? 8 : 10,
          stats: { [pStat.key]: pStat.minor },
          desc: `+${pStat.minor}% ${pStat.label} to all Resonators`,
        });
      } else {
        // Middle rows (Row 3..5): Medium nodes
        const mode = (posInRow + r) % 3;
        if (mode === 0) {
          nodes.push({
            id: `${config.id}_${nodeIndex}`,
            index: nodeIndex,
            row: r + 1,
            tier: 'Medium',
            name: `Medium Star #${nodeIndex}`,
            shardCost: 15 + (r - 2) * 3,
            stats: { [A.key]: A.med, [SA.key]: SA.med },
            desc: `+${A.med}% ${A.label} & +${SA.med}% ${SA.label}`,
          });
        } else if (mode === 1) {
          nodes.push({
            id: `${config.id}_${nodeIndex}`,
            index: nodeIndex,
            row: r + 1,
            tier: 'Medium',
            name: `Medium Star #${nodeIndex}`,
            shardCost: 15 + (r - 2) * 3,
            stats: { [B.key]: B.med, [SB.key]: SB.med },
            desc: `+${B.med}% ${B.label} & +${SB.med}% ${SB.label}`,
          });
        } else {
          nodes.push({
            id: `${config.id}_${nodeIndex}`,
            index: nodeIndex,
            row: r + 1,
            tier: 'Medium',
            name: `Medium Star #${nodeIndex}`,
            shardCost: 15 + (r - 2) * 3,
            stats: { [A.key]: A.med, [B.key]: B.med },
            desc: `+${A.med}% ${A.label} & +${B.med}% ${B.label}`,
          });
        }
      }
    });
  }

  return {
    id: config.id,
    name: config.name,
    symbol: config.symbol,
    zodiacTitle: config.zodiacTitle,
    theme: config.theme,
    color: config.color,
    isSeasonal: config.isSeasonal,
    rowCounts: config.rowCounts,
    pts,
    edges,
    nodes,
  };
}

export const GRAND_CONSTELLATIONS: readonly GrandConstellationGroup[] = Object.freeze([
  buildUniqueZodiacConstellation({
    id: 'ARIES',
    name: 'Aries',
    symbol: '♈',
    zodiacTitle: '1st House · The Astral Ram',
    theme: 'Vanguard ATK% & Critical Strike Ferocity',
    color: '#f87171',
    seed: 11,
    rowCounts: [1, 3, 2, 4, 3, 5, 3], // 21 Nodes
    primaryStatA: { key: 'ATK%', label: 'ATK', minor: 2, med: 3, maj: 5 },
    primaryStatB: { key: 'Crit Rate%', label: 'Crit Rate', minor: 1, med: 2, maj: 3 },
    secondaryStatA: { key: 'Crit DMG%', label: 'Crit DMG', med: 4, maj: 8 },
    secondaryStatB: { key: 'ATK%', label: 'ATK', med: 2, maj: 4 },
    keystones: [
      {
        name: 'Keystone I: Ram Blitz',
        id: 'DRAGONS_FURY_KEYSTONE',
        stats: { 'ATK%': 10, 'Crit Rate%': 5 },
        desc: '+10% ATK, +5% Crit Rate, and +20% Opening Skill DMG',
      },
      {
        name: 'Keystone II: Aries Cataclysm',
        id: 'DRAGONS_CATACLYSM',
        stats: { 'Crit DMG%': 18, 'ATK%': 6 },
        desc: '+18% Crit DMG & Ultimate hits ignite True Burn (25% ATK)',
      },
      {
        name: 'Keystone III: Bloodhorn Execution',
        id: 'DRAGONS_EXECUTION_KEYSTONE',
        stats: { 'Crit DMG%': 14, 'Crit Rate%': 6 },
        desc: '+14% Crit DMG, +6% Crit Rate, +30% DMG vs targets below 50% HP',
      },
    ],
  }),
  buildUniqueZodiacConstellation({
    id: 'TAURUS',
    name: 'Taurus',
    symbol: '♉',
    zodiacTitle: '2nd House · The Golden Bull',
    theme: 'Colossus Max HP% & Unbreakable Bastion DEF%',
    color: '#fbbf24',
    seed: 23,
    rowCounts: [1, 2, 4, 3, 4, 5, 3], // 22 Nodes
    primaryStatA: { key: 'Max HP%', label: 'Max HP', minor: 3, med: 4, maj: 7 },
    primaryStatB: { key: 'DEF%', label: 'DEF', minor: 3, med: 4, maj: 7 },
    secondaryStatA: { key: 'Effect RES%', label: 'Effect RES', med: 3, maj: 6 },
    secondaryStatB: { key: 'Healing Bonus%', label: 'Healing Bonus', med: 3, maj: 5 },
    keystones: [
      {
        name: 'Keystone I: Bull Aegis',
        id: 'TITANS_AEGIS_KEYSTONE',
        stats: { 'Max HP%': 12, 'DEF%': 8 },
        desc: '+12% Max HP, +8% DEF, and 20% Max HP Shield at wave start',
      },
      {
        name: 'Keystone II: Taurus Bulwark',
        id: 'TITANS_BULWARK',
        stats: { 'DEF%': 14, 'Effect RES%': 10 },
        desc: '+14% DEF, +10% Effect RES, and -15% Boss AoE DMG taken',
      },
      {
        name: 'Keystone III: Earthshaker Stampede',
        id: 'TITANS_FORTRESS_KEYSTONE',
        stats: { 'Max HP%': 10, 'Healing Bonus%': 10 },
        desc: '+10% Max HP, +10% Healing Bonus, and Thorns counter-damage',
      },
    ],
  }),
  buildUniqueZodiacConstellation({
    id: 'GEMINI',
    name: 'Gemini',
    symbol: '♊',
    zodiacTitle: '3rd House · The Celestial Twins',
    theme: 'Twin Chain Action SPD & Dual-Cast Tempo',
    color: '#38bdf8',
    seed: 37,
    rowCounts: [1, 4, 2, 4, 2, 6, 3], // 22 Nodes
    primaryStatA: { key: 'ATK%', label: 'ATK', minor: 2, med: 3, maj: 5 },
    primaryStatB: { key: 'Energy Charge%', label: 'Energy Charge', minor: 2, med: 3, maj: 5 },
    secondaryStatA: { key: 'Crit Rate%', label: 'Crit Rate', med: 2, maj: 4 },
    secondaryStatB: { key: 'Break Power%', label: 'Break Power', med: 3, maj: 6 },
    keystones: [
      {
        name: 'Keystone I: Twin Echo',
        id: 'CHRONOS_OVERDRIVE_KEYSTONE',
        stats: { 'ATK%': 8, 'Energy Charge%': 10 },
        desc: '+8% ATK, +10% Energy Charge, and Chain Skills echo for +25% DMG',
      },
      {
        name: 'Keystone II: Gemini Paradox',
        id: 'ETERNAL_CHRONO_LOOP',
        stats: { 'Energy Charge%': 12, 'Crit Rate%': 5 },
        desc: '+12% Energy Charge & -20% Active/Chain Cooldown duration',
      },
      {
        name: 'Keystone III: Dual Starlight',
        id: 'DRAGONS_FURY_KEYSTONE',
        stats: { 'ATK%': 10, 'Crit DMG%': 12 },
        desc: '+10% ATK & +12% Crit DMG when Front and Back rows are active',
      },
    ],
  }),
  buildUniqueZodiacConstellation({
    id: 'CANCER',
    name: 'Cancer',
    symbol: '♋',
    zodiacTitle: '4th House · The Abyssal Crab',
    theme: 'Carapace Barrier Shielding & Effect RES%',
    color: '#60a5fa',
    seed: 49,
    rowCounts: [1, 3, 4, 2, 4, 4, 3], // 21 Nodes
    primaryStatA: { key: 'DEF%', label: 'DEF', minor: 3, med: 4, maj: 7 },
    primaryStatB: { key: 'Effect RES%', label: 'Effect RES', minor: 2, med: 3, maj: 6 },
    secondaryStatA: { key: 'Max HP%', label: 'Max HP', med: 4, maj: 7 },
    secondaryStatB: { key: 'Healing Bonus%', label: 'Healing Bonus', med: 3, maj: 6 },
    keystones: [
      {
        name: 'Keystone I: Tidal Shell',
        id: 'TITANS_AEGIS_KEYSTONE',
        stats: { 'DEF%': 12, 'Max HP%': 10 },
        desc: '+12% DEF, +10% Max HP, and immunity to first debuff each wave',
      },
      {
        name: 'Keystone II: Lunar Sanctuary',
        id: 'TITANS_BULWARK',
        stats: { 'Healing Bonus%': 12, 'Effect RES%': 10 },
        desc: '+12% Healing Bonus & +10% Effect RES for all deployed allies',
      },
      {
        name: 'Keystone III: Reef Bastion',
        id: 'TITANS_FORTRESS_KEYSTONE',
        stats: { 'Max HP%': 14, 'DEF%': 8 },
        desc: '+14% Max HP & +8% DEF when any ally has an active Shield',
      },
    ],
  }),
  buildUniqueZodiacConstellation({
    id: 'LEO',
    name: 'Leo',
    symbol: '♌',
    zodiacTitle: '5th House · The Solar Lion',
    theme: 'Solar Sovereign Crit DMG% & Burst Execution',
    color: '#fb923c',
    seed: 61,
    rowCounts: [1, 2, 3, 5, 3, 6, 3], // 23 Nodes
    primaryStatA: { key: 'Crit DMG%', label: 'Crit DMG', minor: 3, med: 5, maj: 9 },
    primaryStatB: { key: 'ATK%', label: 'ATK', minor: 2, med: 3, maj: 6 },
    secondaryStatA: { key: 'Crit Rate%', label: 'Crit Rate', med: 2, maj: 4 },
    secondaryStatB: { key: 'Break Power%', label: 'Break Power', med: 3, maj: 6 },
    keystones: [
      {
        name: 'Keystone I: Lionheart Roar',
        id: 'DRAGONS_FURY_KEYSTONE',
        stats: { 'ATK%': 12, 'Crit DMG%': 14 },
        desc: '+12% ATK & +14% Crit DMG during Boss Berserk or Stagger phases',
      },
      {
        name: 'Keystone II: Regulus Crown',
        id: 'DRAGONS_CATACLYSM',
        stats: { 'Crit DMG%': 20, 'Crit Rate%': 5 },
        desc: '+20% Crit DMG, +5% Crit Rate, and +25% Ultimate Burst DMG',
      },
      {
        name: 'Keystone III: Sunfire Sovereign',
        id: 'DRAGONS_EXECUTION_KEYSTONE',
        stats: { 'ATK%': 10, 'Crit Rate%': 6 },
        desc: '+10% ATK, +6% Crit Rate, and Crits shred 10% Enemy DEF',
      },
    ],
  }),
  buildUniqueZodiacConstellation({
    id: 'VIRGO',
    name: 'Virgo',
    symbol: '♍',
    zodiacTitle: '6th House · The Star Maiden',
    theme: 'Precision Break Power% & Weakpoint Analysis',
    color: '#a3e635',
    seed: 73,
    rowCounts: [1, 3, 3, 2, 5, 5, 3], // 22 Nodes
    primaryStatA: { key: 'Break Power%', label: 'Break Power', minor: 3, med: 4, maj: 7 },
    primaryStatB: { key: 'Effect Hit Rate%', label: 'Status Hit', minor: 2, med: 3, maj: 6 },
    secondaryStatA: { key: 'ATK%', label: 'ATK', med: 3, maj: 5 },
    secondaryStatB: { key: 'Crit Rate%', label: 'Crit Rate', med: 2, maj: 4 },
    keystones: [
      {
        name: 'Keystone I: Spica Sunder',
        id: 'ASTRAL_SUNDER_KEYSTONE',
        stats: { 'Break Power%': 14, 'ATK%': 8 },
        desc: '+14% Break Power, +8% ATK, and +25% Stagger gauge depletion',
      },
      {
        name: 'Keystone II: Maiden Verdict',
        id: 'ASTRAL_RESONANCE',
        stats: { 'Break Power%': 10, 'Crit DMG%': 14 },
        desc: '+10% Break Power & +14% Crit DMG against Staggered bosses',
      },
      {
        name: 'Keystone III: Immaculate Order',
        id: 'ASTRAL_CATALYST_KEYSTONE',
        stats: { 'Effect Hit Rate%': 12, 'Energy Charge%': 8 },
        desc: '+12% Status Hit Rate & +8% Energy Charge on Weakpoint hits',
      },
    ],
  }),
  buildUniqueZodiacConstellation({
    id: 'LIBRA',
    name: 'Libra',
    symbol: '♎',
    zodiacTitle: '7th House · The Astral Scales',
    theme: 'Equilibrium All-Stat Synergy & Party Resonance',
    color: '#c084fc',
    seed: 89,
    rowCounts: [1, 4, 3, 4, 3, 4, 3], // 22 Nodes
    primaryStatA: { key: 'ATK%', label: 'ATK', minor: 2, med: 3, maj: 5 },
    primaryStatB: { key: 'DEF%', label: 'DEF', minor: 2, med: 4, maj: 6 },
    secondaryStatA: { key: 'Max HP%', label: 'Max HP', med: 3, maj: 6 },
    secondaryStatB: { key: 'Crit Rate%', label: 'Crit Rate', med: 2, maj: 4 },
    keystones: [
      {
        name: 'Keystone I: Golden Equilibrium',
        id: 'ASTRAL_RESONANCE',
        stats: { 'ATK%': 9, 'DEF%': 9, 'Max HP%': 9 },
        desc: '+9% ATK, +9% DEF, and +9% Max HP to all 5 squad slots',
      },
      {
        name: 'Keystone II: Judgement Scale',
        id: 'DRAGONS_CATACLYSM',
        stats: { 'Crit Rate%': 6, 'Crit DMG%': 14 },
        desc: '+6% Crit Rate & +14% Crit DMG balanced across Front and Back rows',
      },
      {
        name: 'Keystone III: Harmonic Covenant',
        id: 'TITANS_BULWARK',
        stats: { 'Energy Charge%': 10, 'Healing Bonus%': 10 },
        desc: '+10% Energy Charge & +10% Healing Bonus for the entire party',
      },
    ],
  }),
  buildUniqueZodiacConstellation({
    id: 'SCORPIO',
    name: 'Scorpio',
    symbol: '♏',
    zodiacTitle: '8th House · The Crimson Scorpion',
    theme: 'Venomous Effect Hit Rate% & Elemental Reaction DoT',
    color: '#f43f5e',
    seed: 103,
    rowCounts: [1, 2, 4, 2, 5, 6, 3], // 23 Nodes
    primaryStatA: { key: 'Effect Hit Rate%', label: 'Status Hit', minor: 2, med: 4, maj: 7 },
    primaryStatB: { key: 'ATK%', label: 'ATK', minor: 2, med: 3, maj: 5 },
    secondaryStatA: { key: 'Crit DMG%', label: 'Crit DMG', med: 4, maj: 8 },
    secondaryStatB: { key: 'Break Power%', label: 'Break Power', med: 3, maj: 6 },
    keystones: [
      {
        name: 'Keystone I: Antares Sting',
        id: 'ASTRAL_CATALYST_KEYSTONE',
        stats: { 'Effect Hit Rate%': 14, 'ATK%': 8 },
        desc: '+14% Status Hit, +8% ATK, and +30% Burn/Bleed DoT tick damage',
      },
      {
        name: 'Keystone II: Venom Supernova',
        id: 'ASTRAL_RESONANCE',
        stats: { 'Effect Hit Rate%': 10, 'Crit DMG%': 16 },
        desc: '+10% Status Hit & +16% Crit DMG against debuffed Boss Parts',
      },
      {
        name: 'Keystone III: Abyssal Neurotoxin',
        id: 'DRAGONS_EXECUTION_KEYSTONE',
        stats: { 'ATK%': 10, 'Break Power%': 12 },
        desc: '+10% ATK, +12% Break Power, and Elemental Reactions reduce Boss ATK',
      },
    ],
  }),
  buildUniqueZodiacConstellation({
    id: 'SAGITTARIUS',
    name: 'Sagittarius',
    symbol: '♐',
    zodiacTitle: '9th House · The Centaur Archer',
    theme: 'Astral Bow Piercing ATK% & Long-Range Crit Rate%',
    color: '#e879f9',
    seed: 117,
    rowCounts: [1, 3, 2, 5, 2, 5, 3], // 21 Nodes
    primaryStatA: { key: 'Crit Rate%', label: 'Crit Rate', minor: 1, med: 2, maj: 4 },
    primaryStatB: { key: 'Crit DMG%', label: 'Crit DMG', minor: 3, med: 5, maj: 8 },
    secondaryStatA: { key: 'ATK%', label: 'ATK', med: 3, maj: 6 },
    secondaryStatB: { key: 'Energy Charge%', label: 'Energy Charge', med: 2, maj: 5 },
    keystones: [
      {
        name: 'Keystone I: Starlight Arrow',
        id: 'DRAGONS_FURY_KEYSTONE',
        stats: { 'Crit Rate%': 7, 'Crit DMG%': 15 },
        desc: '+7% Crit Rate, +15% Crit DMG, and Ranged attacks ignore 15% DEF',
      },
      {
        name: 'Keystone II: Galactic Volley',
        id: 'DRAGONS_CATACLYSM',
        stats: { 'ATK%': 11, 'Crit DMG%': 12 },
        desc: '+11% ATK & +12% Crit DMG for Back Row Resonators',
      },
      {
        name: 'Keystone III: Deadeye Horizon',
        id: 'DRAGONS_EXECUTION_KEYSTONE',
        stats: { 'Crit Rate%': 8, 'Energy Charge%': 8 },
        desc: '+8% Crit Rate & +8% Energy Charge on every Critical Hit',
      },
    ],
  }),
  buildUniqueZodiacConstellation({
    id: 'CAPRICORN',
    name: 'Capricorn',
    symbol: '♑',
    zodiacTitle: '10th House · The Iron Sea-Goat',
    theme: 'Mountain Peak Stagger Break & Frontline Armor',
    color: '#34d399',
    seed: 131,
    rowCounts: [1, 4, 2, 3, 4, 5, 3], // 22 Nodes
    primaryStatA: { key: 'Break Power%', label: 'Break Power', minor: 3, med: 4, maj: 7 },
    primaryStatB: { key: 'DEF%', label: 'DEF', minor: 3, med: 4, maj: 7 },
    secondaryStatA: { key: 'Max HP%', label: 'Max HP', med: 3, maj: 6 },
    secondaryStatB: { key: 'ATK%', label: 'ATK', med: 2, maj: 5 },
    keystones: [
      {
        name: 'Keystone I: Horn of Amalthea',
        id: 'ASTRAL_SUNDER_KEYSTONE',
        stats: { 'Break Power%': 15, 'DEF%': 10 },
        desc: '+15% Break Power, +10% DEF, and +2.0s Boss Stagger duration',
      },
      {
        name: 'Keystone II: Granite Citadel',
        id: 'TITANS_BULWARK',
        stats: { 'DEF%': 14, 'Max HP%': 10 },
        desc: '+14% DEF & +10% Max HP for Front Row Breakers and Tanks',
      },
      {
        name: 'Keystone III: Avalanche Crusher',
        id: 'TITANS_FORTRESS_KEYSTONE',
        stats: { 'Break Power%': 12, 'ATK%': 9 },
        desc: '+12% Break Power & +9% ATK against shielded Boss Parts',
      },
    ],
  }),
  buildUniqueZodiacConstellation({
    id: 'AQUARIUS',
    name: 'Aquarius',
    symbol: '♒',
    zodiacTitle: '11th House · The Star Bearer',
    theme: 'Etheric Flood Energy Charge% & Ultimate Surge',
    color: '#2dd4bf',
    seed: 149,
    rowCounts: [1, 2, 5, 3, 3, 6, 3], // 23 Nodes
    primaryStatA: { key: 'Energy Charge%', label: 'Energy Charge', minor: 2, med: 3, maj: 6 },
    primaryStatB: { key: 'ATK%', label: 'ATK', minor: 2, med: 3, maj: 5 },
    secondaryStatA: { key: 'Effect Hit Rate%', label: 'Status Hit', med: 3, maj: 5 },
    secondaryStatB: { key: 'Healing Bonus%', label: 'Healing Bonus', med: 3, maj: 5 },
    keystones: [
      {
        name: 'Keystone I: Astral Deluge',
        id: 'CHRONOS_OVERDRIVE_KEYSTONE',
        stats: { 'Energy Charge%': 15, 'ATK%': 8 },
        desc: '+15% Energy Charge, +8% ATK, and +20 Starting Energy per wave',
      },
      {
        name: 'Keystone II: Eternal Amphora',
        id: 'ETERNAL_CHRONO_LOOP',
        stats: { 'Energy Charge%': 12, 'Crit DMG%': 14 },
        desc: '+12% Energy Charge & Ultimate casts refund 20 Energy immediately',
      },
      {
        name: 'Keystone III: Starstream Cascade',
        id: 'CHRONOS_BOUNTY_KEYSTONE',
        stats: { 'Energy Charge%': 10, 'Healing Bonus%': 12 },
        desc: '+10% Energy Charge & Ultimates heal all allies for 8% Max HP',
      },
    ],
  }),
  buildUniqueZodiacConstellation({
    id: 'PISCES',
    name: 'Pisces',
    symbol: '♓',
    zodiacTitle: '12th House · The Astral Fishes',
    theme: 'Celestial Tide Healing Bonus% & Time Shard Bounty',
    color: '#818cf8',
    seed: 163,
    rowCounts: [1, 3, 4, 3, 2, 6, 3], // 22 Nodes
    primaryStatA: { key: 'Healing Bonus%', label: 'Healing Bonus', minor: 2, med: 4, maj: 6 },
    primaryStatB: { key: 'Max HP%', label: 'Max HP', minor: 3, med: 4, maj: 7 },
    secondaryStatA: { key: 'Effect RES%', label: 'Effect RES', med: 3, maj: 6 },
    secondaryStatB: { key: 'Energy Charge%', label: 'Energy Charge', med: 3, maj: 5 },
    keystones: [
      {
        name: 'Keystone I: Twin Current',
        id: 'CHRONOS_BOUNTY_KEYSTONE',
        stats: { 'Healing Bonus%': 14, 'Max HP%': 10 },
        desc: '+14% Healing Bonus, +10% Max HP, and +25% Time Shards on Rewind',
      },
      {
        name: 'Keystone II: Miracle Undertow',
        id: 'ETERNAL_CHRONO_LOOP',
        stats: { 'Max HP%': 12, 'Energy Charge%': 10 },
        desc: '+12% Max HP, +10% Energy Charge, and Overhealing grants a Shield',
      },
      {
        name: 'Keystone III:Pisces Nirvana',
        id: 'TITANS_AEGIS_KEYSTONE',
        stats: { 'Effect RES%': 14, 'DEF%': 10 },
        desc: '+14% Effect RES, +10% DEF, and +20% Gold dropped per Spire floor',
      },
    ],
  }),
  buildUniqueZodiacConstellation({
    id: 'SEASONAL_CROWN',
    name: 'Seasonal Astral Crown',
    symbol: '⛎',
    zodiacTitle: 'Center Sanctuary · Active Season Event',
    theme: 'All-Elemental Ascension & Seasonal Convergence (Resets on New Season)',
    color: '#34d399',
    isSeasonal: true,
    seed: 199,
    rowCounts: [1, 3, 2, 4, 4, 6, 3], // 23 Nodes
    primaryStatA: { key: 'ATK%', label: 'Seasonal ATK', minor: 2, med: 3, maj: 6 },
    primaryStatB: { key: 'Max HP%', label: 'Seasonal HP', minor: 3, med: 4, maj: 7 },
    secondaryStatA: { key: 'Crit DMG%', label: 'Seasonal Crit DMG', med: 4, maj: 8 },
    secondaryStatB: { key: 'Break Power%', label: 'Seasonal Break', med: 3, maj: 6 },
    keystones: [
      {
        name: 'Keystone I: Serpent Ascendant',
        id: 'SEASONAL_APEX_LEFT',
        stats: { 'ATK%': 12, 'Crit DMG%': 15 },
        desc: 'Seasonal Apex: +12% Squad ATK & +15% Crit DMG during active Season',
      },
      {
        name: 'Keystone II: Supernova Crown',
        id: 'SEASONAL_APEX_CENTER',
        stats: { 'ATK%': 10, 'Max HP%': 12, 'Break Power%': 12 },
        desc: 'Seasonal Apex: +10% ATK, +12% Max HP & +12% Break Power to all Resonators',
      },
      {
        name: 'Keystone III: Void Horizon',
        id: 'SEASONAL_APEX_RIGHT',
        stats: { 'Energy Charge%': 12, 'Effect Hit Rate%': 12 },
        desc: 'Seasonal Apex: +12% Energy Charge & +12% Status Hit Rate',
      },
    ],
  }),
]);

export const TOTAL_CHRONO_STARS: number = GRAND_CONSTELLATIONS.reduce(
  (sum, g) => sum + g.nodes.length,
  0
);

function getConstellationGroup(groupId: ConstellationGroupId = 'ARIES'): GrandConstellationGroup {
  return GRAND_CONSTELLATIONS.find((g) => g.id === groupId) || GRAND_CONSTELLATIONS[0];
}

export function hasUnlockedKeystone(
  unlockedIndices: number[],
  groupId: ConstellationGroupId = 'ARIES'
): boolean {
  const group = getConstellationGroup(groupId);
  return group.nodes.some((n) => n.tier === 'Keystone' && unlockedIndices.includes(n.index));
}

export function canUnlockConstellationNode(
  nodeIndex: number,
  unlockedIndices: number[],
  groupId: ConstellationGroupId = 'ARIES'
): boolean {
  if (unlockedIndices.includes(nodeIndex)) return false;
  const group = getConstellationGroup(groupId);
  const node = group.nodes.find((n) => n.index === nodeIndex);
  if (!node) return false;
  if (nodeIndex === 1) return true;

  const parentIndices = group.edges
    .filter(([, to]) => to === nodeIndex)
    .map(([from]) => from);
  if (parentIndices.length === 0) return false;

  if (node.tier === 'Keystone') {
    if (hasUnlockedKeystone(unlockedIndices, groupId)) return false;
    return parentIndices.every((p) => unlockedIndices.includes(p));
  }

  return parentIndices.some((p) => unlockedIndices.includes(p));
}

export function canUndoConstellationNode(
  nodeIndex: number,
  unlockedIndices: number[],
  groupId: ConstellationGroupId = 'ARIES'
): boolean {
  if (!unlockedIndices.includes(nodeIndex)) return false;
  const remaining = unlockedIndices.filter((idx) => idx !== nodeIndex);
  if (remaining.length === 0) return true;
  if (!remaining.includes(1)) return false;

  const group = getConstellationGroup(groupId);
  return remaining.every((idx) => {
    if (idx === 1) return true;
    const node = group.nodes.find((n) => n.index === idx);
    const parents = group.edges.filter(([, to]) => to === idx).map(([from]) => from);
    if (node?.tier === 'Keystone') {
      return parents.every((p) => remaining.includes(p));
    }
    return parents.some((p) => remaining.includes(p));
  });
}

export function getConstellationPrereqLabel(
  nodeIndex: number,
  unlockedIndices: number[],
  groupId: ConstellationGroupId = 'ARIES'
): string {
  const group = getConstellationGroup(groupId);
  const node = group.nodes.find((n) => n.index === nodeIndex);
  if (!node || nodeIndex === 1) return 'Root Star #1';

  const parents = group.edges.filter(([, to]) => to === nodeIndex).map(([from]) => `#${from}`);
  if (node.tier === 'Keystone') {
    if (hasUnlockedKeystone(unlockedIndices, groupId) && !unlockedIndices.includes(nodeIndex)) {
      return 'Path Locked: Another Keystone is active (Reset to switch)';
    }
    return `Requires Major ${parents.join(' & ')} (Max 1 Keystone)`;
  }

  return `Requires Connected Star ${parents.join(' or ')}`;
}

export function aggregateConstellationBonuses(unlockedNodeIds: string[]): {
  stats: Record<string, number>;
  keystones: KeystoneId[];
} {
  const stats: Record<string, number> = {};
  const keystones = new Set<KeystoneId>();
  const unlockedSet = new Set(unlockedNodeIds);

  GRAND_CONSTELLATIONS.forEach((group) => {
    group.nodes.forEach((node) => {
      if (unlockedSet.has(node.id)) {
        Object.entries(node.stats).forEach(([k, v]) => {
          if (typeof v === 'number') {
            stats[k] = (stats[k] || 0) + v;
          }
        });
        if (node.keystoneId) {
          keystones.add(node.keystoneId);
        }
      }
    });
  });

  return { stats, keystones: Array.from(keystones) };
}

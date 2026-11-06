import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  DebuffType,
  ELEMENT_META,
  FORMATIONS,
  GambitConditionSlot1,
  GambitConditionSlot2,
  getFormationRowBonuses,
  HeroRarity,
  interpolateSkillMult,
  interpolateSkillProc,
  ReactionType,
  RESONATORS,
  ResonatorData,
  SkillSpec,
} from './data/resonators.ts';
import {
  ALL_GEAR_SLOTS,
  BLESSING_CARDS,
  BlessingCardSpec,
  calculateCurrentSuccessRate,
  createInitialGearInventory,
  EQUIPMENT_SETS,
  GEAR_DOMAINS,
  GearItem,
  GearSlot,
  getEnhanceRule,
  getGearMainStatValue,
  rollMilestoneSubstat,
  SetId,
  SIGIL_CORE_TRAITS,
  StatKey,
} from './data/equipment.ts';
import {
  canUndoConstellationNode,
  canUnlockConstellationNode,
  ConstellationGroupId,
  getConstellationPrereqLabel,
  GRAND_CONSTELLATIONS,
  hasUnlockedKeystone,
  SEASONAL_EVENTS,
  TOTAL_CHRONO_STARS,
  ZODIAC_WHEEL_SECTORS,
} from './data/constellations.ts';
import {
  BattleSubMode,
  BgmEngineStatus,
  BgmThemeMode,
  BossPartId,
  BossPartUnit,
  calculateTotalStatusProcChance,
  CombatHeroUnit,
  computeHeroCP,
  computeHeroCPBreakdown,
  computeHeroStats,
  computePartyResonance,
  computeSquadCP,
  CPBreakdownItem,
  createFloorEncounter,
  CutInBannerState,
  evaluateElementalCounter,
  FloatingText,
  getFloorSegmentBp,
  getRecommendedCounterElement,
  getRecommendedFloorCP,
  HeroProgress,
  ImpactShockwave,
  runBalanceSelfChecks,
  sfx,
} from './engine/combatEngine.ts';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Particle, renderBattlefieldCanvas, ZONE_PARALLAX_ASSETS } from './engine/pixelRenderer.ts';
import {
  ElementalWheelBadge,
  PixelPreviewCanvas,
  PixelTarotCardBackCanvas,
  PixelTarotCardCanvas,
  ResonatorSplashArt,
  WikiModal,
} from './components/ResonatorArtAndWiki.tsx';

type GameShellState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type MainTab = 'BATTLE' | 'HEROES' | 'FORGE' | 'SUMMON' | 'REWIND';
type SanctuaryTabId = 'BOUNTY' | 'STRIKER' | 'DEFENDER' | 'TACTICIAN' | 'ARENA' | 'GUILD_RAID';
type MerchantTabId = 'GOLD' | 'STARFALL' | 'ARENA' | 'GUILD';
type GuildRaidDiff = 'EASY' | 'NORMAL' | 'HARD';

interface GachaRevealCard {
  uid: string;
  hero: ResonatorData;
  actualRarity: HeroRarity;
  displayRarity: HeroRarity;
  isFakeOut: boolean;
  flipped: boolean;
  shattering: boolean;
  note: string;
  bonusRelicName?: string;
}

const RARITY_BADGE_META: Record<
  HeroRarity,
  { label: HeroRarity; bgClass: string; textClass: string; borderClass: string }
> = {
  SSR: {
    label: 'SSR',
    bgClass: 'bg-gradient-to-r from-amber-500 to-yellow-300',
    textClass: 'text-slate-950',
    borderClass: 'border-amber-100',
  },
  SR: {
    label: 'SR',
    bgClass: 'bg-gradient-to-r from-purple-600 to-fuchsia-400',
    textClass: 'text-white',
    borderClass: 'border-purple-200',
  },
  R: {
    label: 'R',
    bgClass: 'bg-gradient-to-r from-sky-500 to-blue-400',
    textClass: 'text-slate-950',
    borderClass: 'border-sky-200',
  },
  N: {
    label: 'N',
    bgClass: 'bg-slate-700',
    textClass: 'text-slate-100',
    borderClass: 'border-slate-400',
  },
};

const SQUAD_CP_FORMULA =
  '• Active 5-Hero Sum: Total individual CP of all 5 deployed Resonators\n• Hero CP: [(HP×0.2)+(ATK×2.5)+(DEF×2)+(SPD×8)] × SubstatMult + Skill/Set Flat\n• Formation Mastery: +750 Squad CP per Mastery Lv (+7,500 CP at Lv.10)';
const DEFAULT_CP_OPTIMIZE_TIPS =
  '• Mastery Level: +750 flat Squad CP/Lv (up to +7,500 CP) + boosts Front DEF% & Back ATK%.\n• Chrono Rewind Stars: Unlock 3-branch Minor/Medium/Major stars & 1 of 3 Keystones per group.\n• Relic Sets & Skills: Equip a 4-PC Set (+2,100 CP) + Exotic Core Sigil (+1,200 CP) & enhance to +15.';

function CPInfoTooltip({
  title,
  formula,
  tips = DEFAULT_CP_OPTIMIZE_TIPS,
}: {
  title: string;
  formula: string;
  tips?: string;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const vpW = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vpH = typeof window !== 'undefined' ? window.innerHeight : 768;
  const boxW = Math.min(280, vpW - 16);
  const estH = 212;

  return (
    <span
      onMouseEnter={(e) => setRect(e.currentTarget.getBoundingClientRect())}
      onMouseLeave={() => setRect(null)}
      onClick={(e) => {
        e.stopPropagation();
        setRect((r) => (r ? null : e.currentTarget.getBoundingClientRect()));
      }}
      title={`${title}\n${formula}\n\nHow to optimize CP:\n${tips}`}
      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-amber-400/20 hover:bg-amber-400/40 border border-amber-300/60 text-[9px] font-mono font-bold text-amber-100 leading-none cursor-help select-none shrink-0 transition-colors"
    >
      ⓘ
      {rect && (
        <div
          style={{
            width: `${boxW}px`,
            top: rect.bottom + 8 + estH > vpH ? Math.max(8, rect.top - estH - 6) : rect.bottom + 6,
            left: Math.min(Math.max(8, rect.left + rect.width / 2 - boxW / 2), vpW - boxW - 8),
          }}
          className="fixed z-[100] p-2.5 rounded-xl bg-slate-950/95 backdrop-blur-md border border-slate-700/90 ring-1 ring-amber-400/35 shadow-[0_10px_28px_rgba(2,6,23,0.9)] text-left pointer-events-none font-sans normal-case tracking-normal space-y-2"
        >
          <div className="flex items-center justify-between border-b border-slate-800/90 pb-1">
            <span className="text-[10px] font-bold text-amber-300 tracking-wider uppercase">
              {title}
            </span>
            <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-200 border border-amber-400/35">
              CP GUIDE
            </span>
          </div>
          <div className="text-[9px] font-mono text-slate-200 whitespace-pre-line leading-[1.45] tracking-tight">
            {formula}
          </div>
          <div className="p-2 rounded-lg bg-slate-900/95 border border-amber-400/30 shadow-inner space-y-1">
            <div className="text-[9px] font-semibold text-amber-300 tracking-wide flex items-center gap-1">
              <span>💡 How to optimize CP</span>
            </div>
            <div className="text-[8.5px] text-slate-300 whitespace-pre-line leading-[1.5] tracking-tight font-normal">
              {tips}
            </div>
          </div>
        </div>
      )}
    </span>
  );
}

function CPDetailedBreakdown({
  hero,
  totalCp,
  items,
  onClose,
}: {
  hero: ResonatorData;
  totalCp: number;
  items: CPBreakdownItem[];
  onClose: () => void;
}) {
  const rarityMeta = RARITY_BADGE_META[hero.rarity] || RARITY_BADGE_META.N;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[90] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0a0d18] border-2 border-amber-400/60 rounded-2xl p-5 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span
              className={`px-2 py-0.5 rounded border text-[10px] font-mono font-extrabold ${rarityMeta.bgClass} ${rarityMeta.textClass} ${rarityMeta.borderClass}`}
            >
              {rarityMeta.label}
            </span>
            <div>
              <div className="text-[10px] font-mono text-amber-300 uppercase tracking-wider">
                Combat Power Attribution · 4-Source Breakdown
              </div>
              <h2 className="text-lg font-bold text-white font-display">
                {hero.name} — {hero.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-amber-400/15 border border-amber-400/50 text-amber-300 font-mono font-bold text-xs">
              ⚡ TOTAL CP: {totalCp.toLocaleString()}
            </span>
            <button
              onClick={onClose}
              className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white cursor-pointer"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* TOP: 4-Card Summary Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
          {items.map((item) => (
            <div
              key={item.category}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-1"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold truncate" style={{ color: item.color }}>
                  {item.category}
                </span>
                <span className="text-[10px] font-bold text-white">{item.pct}%</span>
              </div>
              <div className="text-sm font-extrabold text-slate-100">
                +{item.cp.toLocaleString()} CP
              </div>
              <div className="text-[9px] text-slate-400 leading-tight truncate" title={item.detail}>
                {item.detail}
              </div>
            </div>
          ))}
        </div>

        {/* BOTTOM: Horizontal Bar Chart + Radial Pie Chart Side-by-Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Left: Horizontal Bar Chart */}
          <div className="h-56 bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col">
            <div className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider mb-1">
              Horizontal CP Contribution (%)
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={items}
                  layout="vertical"
                  margin={{ top: 4, right: 18, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis
                    type="number"
                    unit="%"
                    domain={[0, 100]}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={112}
                    tick={{ fill: '#cbd5e1', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={false}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }}
                    contentStyle={{
                      backgroundColor: '#020617',
                      borderColor: 'rgba(251, 191, 36, 0.5)',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      fontFamily: 'JetBrains Mono, monospace',
                      color: '#f8fafc',
                    }}
                    formatter={(_value, _name, props) => {
                      const payload = props.payload as CPBreakdownItem;
                      return [`${payload.pct}% (${payload.cp.toLocaleString()} CP)`, payload.detail];
                    }}
                  />
                  <Bar dataKey="pct" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {items.map((entry) => (
                      <Cell key={entry.category} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right: Comparative Radial Pie Chart */}
          <div className="h-56 bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex flex-col">
            <div className="text-[10px] font-mono font-bold text-sky-300 uppercase tracking-wider mb-1">
              Radial Share (Base vs Gear vs Skills vs Stars)
            </div>
            <div className="flex-1 min-h-0 flex items-center">
              <div className="w-3/5 h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={items}
                      dataKey="pct"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={38}
                      outerRadius={66}
                      paddingAngle={3}
                      stroke="#020617"
                      strokeWidth={2}
                    >
                      {items.map((entry) => (
                        <Cell key={entry.category} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#020617',
                        borderColor: 'rgba(56, 189, 248, 0.5)',
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                        color: '#f8fafc',
                      }}
                      formatter={(_value, _name, props) => {
                        const payload = props.payload as CPBreakdownItem;
                        return [`${payload.pct}% (+${payload.cp.toLocaleString()} CP)`, payload.category];
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-2/5 space-y-1.5 font-mono text-[10px] pr-1">
                {items.map((item) => (
                  <div key={item.category} className="flex items-center justify-between gap-1">
                    <span className="flex items-center gap-1.5 truncate text-slate-300">
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.category.split(' ')[0]}</span>
                    </span>
                    <span className="font-bold text-white shrink-0">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const INITIAL_HERO_PROGRESS: Record<string, HeroProgress> = Object.fromEntries(
  RESONATORS.map((r) => [
    r.id,
    {
      id: r.id,
      unlocked: r.rarity === 'R',
      level: r.rarity === 'SSR' ? 25 : r.rarity === 'SR' ? 20 : 15,
      stars: r.rarity === 'SSR' ? 3 : r.rarity === 'SR' ? 2 : 1,
      skillLevels:
        r.rarity === 'SSR'
          ? { basic: 3, active: 4, chain: 4, ultimate: 3 }
          : r.rarity === 'SR'
          ? { basic: 2, active: 3, chain: 3, ultimate: 2 }
          : { basic: 1, active: 2, chain: 2, ultimate: 1 },
      gambit1: r.defaultGambit1,
      gambit2: r.defaultGambit2,
    },
  ])
);

const ARENA_RIVALS: {
  rank: number;
  name: string;
  title: string;
  cp: number;
  tokenReward: number;
  gemReward: number;
  teamIds: string[];
}[] = [
  {
    rank: 5,
    name: 'Novice Watcher Elian',
    title: 'Bronze Sentinel · Vanguard Trial',
    cp: 14500,
    tokenReward: 25,
    gemReward: 80,
    teamIds: ['R01', 'R05', 'R02', 'R03', 'R04'],
  },
  {
    rank: 4,
    name: 'Frostblade Captain Sera',
    title: 'Silver Glider · Stormcrag Outpost',
    cp: 26000,
    tokenReward: 35,
    gemReward: 110,
    teamIds: ['H06', 'R01', 'H08', 'H12', 'R04'],
  },
  {
    rank: 3,
    name: 'Inquisitor Vaelen',
    title: 'Gold Judicator · Sanctum Order',
    cp: 42000,
    tokenReward: 50,
    gemReward: 150,
    teamIds: ['H04', 'H03', 'H09', 'H15', 'H18'],
  },
  {
    rank: 2,
    name: 'Archon Lady Lycoris',
    title: 'Diamond Sovereign · Eclipse Covenant',
    cp: 64000,
    tokenReward: 70,
    gemReward: 210,
    teamIds: ['H04', 'H01', 'H07', 'H11', 'H14'],
  },
  {
    rank: 1,
    name: 'Grand Sovereign Astralis',
    title: 'Apex Chronomancer · Throne of Stars',
    cp: 88000,
    tokenReward: 100,
    gemReward: 300,
    teamIds: ['H04', 'H01', 'H10', 'H13', 'H16'],
  },
];

const GUILD_RAID_DIFF_SPECS: Record<
  GuildRaidDiff,
  {
    id: GuildRaidDiff;
    label: string;
    minGuildLv: number;
    recCp: number;
    bossDmgMult: number;
    scoreMult: number;
    desc: string;
  }
> = {
  EASY: {
    id: 'EASY',
    label: 'Easy · Outer Gate',
    minGuildLv: 1,
    recCp: 15000,
    bossDmgMult: 1.0,
    scoreMult: 1.0,
    desc: 'Unlocks Guild Lv.1 · Boss DMG 1.0x · Score & Medals 1.0x',
  },
  NORMAL: {
    id: 'NORMAL',
    label: 'Normal · Dimensional Rift',
    minGuildLv: 2,
    recCp: 40000,
    bossDmgMult: 1.8,
    scoreMult: 2.2,
    desc: 'Unlocks Guild Lv.2 · Boss DMG 1.8x · Score & Medals 2.2x',
  },
  HARD: {
    id: 'HARD',
    label: 'Hard · Singularity Core',
    minGuildLv: 3,
    recCp: 75000,
    bossDmgMult: 3.2,
    scoreMult: 4.5,
    desc: 'Unlocks Guild Lv.3 · Boss DMG 3.2x · Score & Medals 4.5x (0.5x Penalty if Wiped before 90s!)',
  },
};

export default function App() {
  // Run SSOT math verification once
  useMemo(() => {
    console.assert(runBalanceSelfChecks(), 'Chrono Spire SSOT balance verification failed');
  }, []);

  // --- PERSISTENT GAME STATE ---
  const [shellState, setShellState] = useState<GameShellState>('TITLE_MENU');
  const [activeTab, setActiveTab] = useState<MainTab>('BATTLE');
  const [battleSubMode, setBattleSubMode] = useState<BattleSubMode>('SPIRE');
  const [showWiki, setShowWiki] = useState(false);
  const [muted, setMuted] = useState(false);

  // Currencies & Progression
  const [gold, setGold] = useState(18500);
  const [starlightGems, setStarlightGems] = useState(3200);
  const [timeShards, setTimeShards] = useState(120);
  const [starfallShards, setStarfallShards] = useState(85);
  const [weeklyKeys, setWeeklyKeys] = useState(15);
  const [guildAttempts, setGuildAttempts] = useState(3);
  const [guildMedals, setGuildMedals] = useState(60);
  const [guildTotalDamage, setGuildTotalDamage] = useState(0);
  const [arenaTokens, setArenaTokens] = useState(120);
  const [arenaRankPts, setArenaRankPts] = useState(1250);
  const [sweepTickets, setSweepTickets] = useState(5);
  const [saltCrystals, setSaltCrystals] = useState(0);
  const [selectedDomainTiers, setSelectedDomainTiers] = useState<
    Record<'BOUNTY' | 'STRIKER' | 'DEFENDER' | 'TACTICIAN', 1 | 2 | 3 | 4 | 5>
  >({ BOUNTY: 1, STRIKER: 1, DEFENDER: 1, TACTICIAN: 1 });
  const [clearedDomainTiers, setClearedDomainTiers] = useState<Record<string, boolean>>({
    BOUNTY_1: true,
  });
  const [activeDomainChallenge, setActiveDomainChallenge] = useState<{
    domainId: 'BOUNTY' | 'STRIKER' | 'DEFENDER' | 'TACTICIAN';
    tier: 1 | 2 | 3 | 4 | 5;
  } | null>(null);
  const activeDomainChallengeRef = useRef<typeof activeDomainChallenge>(null);
  useEffect(() => {
    activeDomainChallengeRef.current = activeDomainChallenge;
  }, [activeDomainChallenge]);
  const [domainFeedback, setDomainFeedback] = useState<string | null>(null);
  const [floor, setFloor] = useState(1);
  const [highestFloor, setHighestFloor] = useState(1);

  // Squad & Formation (Default 5-Hero Starter R Squad: R01 Vanguard Guard, R05 Shadow Blade, R02 Gale Archer, R03 Frost Acolyte, R04 Dawn Cleric)
  const [partyIds, setPartyIds] = useState<string[]>(['R01', 'R05', 'R02', 'R03', 'R04']);
  const [formationId, setFormationId] = useState<'HYPER_CARRY' | 'SOLO_BASTION' | 'BALANCED' | 'VANGUARD'>('BALANCED');
  const [formationLevel, setFormationLevel] = useState(3);
  const [heroProgress, setHeroProgress] = useState<Record<string, HeroProgress>>(INITIAL_HERO_PROGRESS);
  const [gearInventory, setGearInventory] = useState<GearItem[]>(() => createInitialGearInventory());
  const [blessings, setBlessings] = useState<Record<string, number>>({ ARCANA_19: 1, ARCANA_08: 1 });
  const [constellations, setConstellations] = useState<Record<string, number>>({
    ARIES: 2,
    TAURUS: 1,
    GEMINI: 1,
    CANCER: 0,
    LEO: 1,
    VIRGO: 0,
    LIBRA: 1,
    SCORPIO: 0,
    SAGITTARIUS: 0,
    CAPRICORN: 0,
    AQUARIUS: 0,
    PISCES: 1,
    SEASONAL_CROWN: 1,
  });
  const [unlockedConstellationNodes, setUnlockedConstellationNodes] = useState<
    Record<ConstellationGroupId, number[]>
  >({
    ARIES: [1, 2],
    TAURUS: [1],
    GEMINI: [1],
    CANCER: [],
    LEO: [1],
    VIRGO: [],
    LIBRA: [1],
    SCORPIO: [],
    SAGITTARIUS: [],
    CAPRICORN: [],
    AQUARIUS: [],
    PISCES: [1],
    SEASONAL_CROWN: [1],
  });
  const [activeSeasonIndex, setActiveSeasonIndex] = useState<number>(0);
  const [zoomedConstellationId, setZoomedConstellationId] = useState<ConstellationGroupId | null>(null);
  const [hoveredConstellationId, setHoveredConstellationId] = useState<ConstellationGroupId>('ARIES');

  // UI Selection States & v2.3 Modals
  const [selectedHeroId, setSelectedHeroId] = useState<string>('R01');
  const [heroDetailMode, setHeroDetailMode] = useState<boolean>(false);
  const [selectedGearId, setSelectedGearId] = useState<string>('G_R01_W');
  const [forgeFeedback, setForgeFeedback] = useState<{ text: string; success: boolean } | null>(null);
  const [activeBannerId, setActiveBannerId] = useState<'RATE_UP' | 'STANDARD'>('RATE_UP');
  const [exchangeShopOpen, setExchangeShopOpen] = useState<boolean>(false);
  const [sanctuariesModalOpen, setSanctuariesModalOpen] = useState<boolean>(false);
  const [sanctuaryTab, setSanctuaryTab] = useState<SanctuaryTabId>('BOUNTY');
  const [merchantHubOpen, setMerchantHubOpen] = useState<boolean>(false);
  const [merchantTab, setMerchantTab] = useState<MerchantTabId>('GOLD');
  const [hasDoneFirstFreePull, setHasDoneFirstFreePull] = useState<boolean>(false);
  const [gachaRevealCards, setGachaRevealCards] = useState<GachaRevealCard[] | null>(null);
  const [guildState, setGuildState] = useState<{
    joined: boolean;
    name: string;
    level: number;
    exp: number;
  }>({ joined: false, name: 'Starfall Knights', level: 1, exp: 0 });
  const [guildRaidDiff, setGuildRaidDiff] = useState<GuildRaidDiff>('EASY');
  const guildRaidDiffRef = useRef<GuildRaidDiff>('EASY');
  useEffect(() => {
    guildRaidDiffRef.current = guildRaidDiff;
  }, [guildRaidDiff]);
  const [activeArenaRivalIndex, setActiveArenaRivalIndex] = useState<number>(0);
  const activeArenaRivalRef = useRef<number>(0);
  useEffect(() => {
    activeArenaRivalRef.current = activeArenaRivalIndex;
  }, [activeArenaRivalIndex]);

  const [featuredBannerHeroId, setFeaturedBannerHeroId] = useState<string>('H01');
  const [wishlistIds, setWishlistIds] = useState<string[]>(['H01', 'H04', 'H07', 'H10', 'H13']);
  const [wishlistSlotPicker, setWishlistSlotPicker] = useState<number | null>(null);
  const [shopFeedback, setShopFeedback] = useState<string | null>(null);
  const [gachaPity, setGachaPity] = useState<number>(12);
  const [recentPulls, setRecentPulls] = useState<{ name: string; rarity: string; note: string }[]>([]);
  const [ultTestPulse, setUltTestPulse] = useState<boolean>(false);
  const [cpBreakdownOpen, setCpBreakdownOpen] = useState<boolean>(false);
  const [selectedStarNode, setSelectedStarNode] = useState<{
    groupId: ConstellationGroupId;
    nodeIdx: number;
  } | null>({ groupId: 'ARIES', nodeIdx: 1 });

  // Hold-to-Drag 2D Combat Sprite Deployment & Slot Switching in Heroes Tab
  const [draggingHero, setDraggingHero] = useState<{
    heroId: string;
    sourceSlot: number | null;
    x: number;
    y: number;
  } | null>(null);
  const [hoveredDropSlot, setHoveredDropSlot] = useState<number | null>(null);
  const holdDragTimerRef = useRef<number | null>(null);
  const pointerDownInfoRef = useRef<{
    heroId: string;
    sourceSlot: number | null;
    startX: number;
    startY: number;
  } | null>(null);
  const suppressNextCardClickRef = useRef<boolean>(false);

  const assignOrSwapHeroAtFormationSlot = useCallback((heroId: string, targetSlot: number) => {
    setPartyIds((prev) => {
      const next = [...prev];
      while (next.length < 5) {
        const fallback = RESONATORS.find((r) => !next.includes(r.id))?.id || 'R01';
        next.push(fallback);
      }
      const existingIdx = next.indexOf(heroId);
      if (existingIdx !== -1) {
        if (existingIdx === targetSlot) return prev;
        const temp = next[targetSlot];
        next[targetSlot] = heroId;
        next[existingIdx] = temp;
      } else {
        next[targetSlot] = heroId;
      }
      return next;
    });
    sfx.play('forge_ok');
  }, []);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const info = pointerDownInfoRef.current;
      if (!info && !draggingHero) return;

      if (info && !draggingHero) {
        const dist = Math.hypot(e.clientX - info.startX, e.clientY - info.startY);
        if (dist > 6) {
          if (holdDragTimerRef.current) {
            window.clearTimeout(holdDragTimerRef.current);
            holdDragTimerRef.current = null;
          }
          suppressNextCardClickRef.current = true;
          setDraggingHero({
            heroId: info.heroId,
            sourceSlot: info.sourceSlot,
            x: e.clientX,
            y: e.clientY,
          });
          sfx.play('hit');
        }
      } else if (draggingHero) {
        setDraggingHero((prev) => (prev ? { ...prev, x: e.clientX, y: e.clientY } : null));
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const slotEl = el?.closest('[data-formation-slot]') as HTMLElement | null;
        if (slotEl && slotEl.dataset.formationSlot !== undefined) {
          setHoveredDropSlot(Number(slotEl.dataset.formationSlot));
        } else {
          setHoveredDropSlot(null);
        }
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (holdDragTimerRef.current) {
        window.clearTimeout(holdDragTimerRef.current);
        holdDragTimerRef.current = null;
      }
      pointerDownInfoRef.current = null;

      if (draggingHero) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const slotEl = el?.closest('[data-formation-slot]') as HTMLElement | null;
        const dropIdx =
          slotEl && slotEl.dataset.formationSlot !== undefined
            ? Number(slotEl.dataset.formationSlot)
            : hoveredDropSlot;
        if (dropIdx !== null && dropIdx >= 0 && dropIdx < 5) {
          assignOrSwapHeroAtFormationSlot(draggingHero.heroId, dropIdx);
        }
        setDraggingHero(null);
        setHoveredDropSlot(null);
        setTimeout(() => {
          suppressNextCardClickRef.current = false;
        }, 60);
      }
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [draggingHero, hoveredDropSlot, assignOrSwapHeroAtFormationSlot]);

  const startHoldToDragHero = (
    e: React.PointerEvent,
    heroId: string,
    isUnlocked: boolean,
    sourceSlot: number | null = null
  ) => {
    if (!isUnlocked || e.button !== 0) return;
    const clientX = e.clientX;
    const clientY = e.clientY;
    pointerDownInfoRef.current = { heroId, sourceSlot, startX: clientX, startY: clientY };
    if (holdDragTimerRef.current) window.clearTimeout(holdDragTimerRef.current);
    holdDragTimerRef.current = window.setTimeout(() => {
      suppressNextCardClickRef.current = true;
      setDraggingHero({ heroId, sourceSlot, x: clientX, y: clientY });
      sfx.play('hit');
    }, 160);
  };

  // Combat Settings & HUD Sync State
  const [cutInEnabled, setCutInEnabled] = useState(true);
  const [autoUltimate, setAutoUltimate] = useState(true);
  const [blessingChoices, setBlessingChoices] = useState<BlessingCardSpec[] | null>(null);
  const [tarotFlipped, setTarotFlipped] = useState<[boolean, boolean, boolean]>([false, false, false]);
  const [tarotAutoTimer, setTarotAutoTimer] = useState<number>(6.0);
  const [bgmStatus, setBgmStatus] = useState<BgmEngineStatus>(sfx.bgmStatus);
  const [bgmTheme, setBgmTheme] = useState<BgmThemeMode>(sfx.bgmTheme);

  useEffect(() => {
    return sfx.subscribe(() => {
      setBgmStatus(sfx.bgmStatus);
      setBgmTheme(sfx.bgmTheme);
    });
  }, []);

  // Computed Party Resonance & All Hero Stats
  const partyResonance = useMemo(() => computePartyResonance(partyIds), [partyIds]);

  const unlockedNodeIdsList = useMemo(() => {
    const ids: string[] = [];
    GRAND_CONSTELLATIONS.forEach((group) => {
      const unlockedIndices = unlockedConstellationNodes[group.id] || [];
      group.nodes.forEach((n) => {
        if (unlockedIndices.includes(n.index)) ids.push(n.id);
      });
    });
    return ids;
  }, [unlockedConstellationNodes]);

  const computedStatsMap = useMemo(() => {
    const map: Record<string, ReturnType<typeof computeHeroStats>> = {};
    RESONATORS.forEach((r) => {
      const prog = heroProgress[r.id];
      const idx = partyIds.indexOf(r.id);
      map[r.id] = computeHeroStats(
        r,
        prog,
        gearInventory,
        formationId,
        formationLevel,
        idx,
        partyResonance,
        blessings,
        constellations,
        unlockedNodeIdsList
      );
    });
    return map;
  }, [
    heroProgress,
    gearInventory,
    formationId,
    formationLevel,
    partyIds,
    partyResonance,
    blessings,
    constellations,
    unlockedNodeIdsList,
  ]);

  // Live Hero CP & Squad CP Calculation
  const heroCpMap = useMemo(() => {
    const map: Record<string, number> = {};
    RESONATORS.forEach((r) => {
      map[r.id] = computeHeroCP(computedStatsMap[r.id], heroProgress[r.id], gearInventory, r.id);
    });
    return map;
  }, [heroProgress, computedStatsMap, gearInventory]);

  const squadCP = useMemo(
    () => computeSquadCP(partyIds, heroCpMap, formationLevel),
    [partyIds, heroCpMap, formationLevel]
  );

  // Track green +CP delta badge on hero/gear/skill upgrades
  const prevCpMapRef = useRef<Record<string, number>>({});
  const [cpDeltaToast, setCpDeltaToast] = useState<{ heroId: string; delta: number } | null>(null);
  useEffect(() => {
    const prev = prevCpMapRef.current[selectedHeroId];
    const curr = heroCpMap[selectedHeroId];
    if (prev !== undefined && curr > prev) {
      setCpDeltaToast({ heroId: selectedHeroId, delta: curr - prev });
    }
    prevCpMapRef.current = { ...heroCpMap };
  }, [heroCpMap, selectedHeroId]);

  // --- REALTIME 60FPS COMBAT ENGINE REF ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<{
    mode: BattleSubMode;
    floor: number;
    waveElapsed: number;
    guildRaidDamage: number;
    isBerserk: boolean;
    staggerSegments: number;
    currentSegmentBp: number;
    maxSegmentBp: number;
    isStaggered: boolean;
    staggerTimer: number;
    staggerWarningTimer: number;
    antiStaggerTimer: number;
    manualFocusId: BossPartId | null;
    firestormCd: number;
    hitstopTimer: number;
    shakeMag: number;
    heroes: CombatHeroUnit[];
    bossParts: BossPartUnit[];
    floatingTexts: FloatingText[];
    particles: Particle[];
    shockwaves: ImpactShockwave[];
    cutIn: CutInBannerState | null;
    combatLog: string[];
  }>({
    mode: 'SPIRE',
    floor: 1,
    waveElapsed: 0,
    guildRaidDamage: 0,
    isBerserk: false,
    staggerSegments: 5,
    currentSegmentBp: 120,
    maxSegmentBp: 120,
    isStaggered: false,
    staggerTimer: 0,
    staggerWarningTimer: 0,
    antiStaggerTimer: 0,
    manualFocusId: null,
    firestormCd: 0,
    hitstopTimer: 0,
    shakeMag: 0,
    heroes: [],
    bossParts: [],
    floatingTexts: [],
    particles: [],
    shockwaves: [],
    cutIn: null,
    combatLog: ['Entered Chrono Spire Floor 1 — Old God Remnant Detected.'],
  });

  // React HUD snapshot updated at ~15fps so React never bottlenecks 60fps Canvas
  const [hudState, setHudState] = useState(() => ({
    waveElapsed: 0,
    guildRaidDamage: 0,
    isBerserk: false,
    staggerSegments: 5,
    currentSegmentBp: 120,
    maxSegmentBp: 120,
    isStaggered: false,
    staggerTimer: 0,
    staggerWarningTimer: 0,
    manualFocusId: null as BossPartId | null,
    cutIn: null as CutInBannerState | null,
    heroes: [] as CombatHeroUnit[],
    bossParts: [] as BossPartUnit[],
    combatLog: [] as string[],
  }));

  // Initialize / Reset a Floor Wave or Sub-Mode Encounter
  const initFloorWave = useCallback(
    (targetFloor: number, preserveHpRatio = false, overrideMode?: BattleSubMode) => {
      const activeMode = overrideMode || battleSubMode;
      const encounterMode: BattleSubMode = activeMode === 'DOMAINS' ? 'SPIRE' : activeMode;
      const form = FORMATIONS.find((f) => f.id === formationId) || FORMATIONS[2];
      // XVII. The Star (ARCANA_17): Wave-start Ultimate Energy (+25% / +30% / +60%)
      const starEnergyTier = blessings['ARCANA_17'] || 0;
      const startEnergy =
        starEnergyTier > 0
          ? BLESSING_CARDS.find((b) => b.id === 'ARCANA_17')!.tiers[Math.min(2, starEnergyTier - 1)]
          : 15;
      // IX. The Hermit (ARCANA_09): Frontline Wave-Start Shield (20% / 25% / 45% Max HP)
      const hermitShieldTier = blessings['ARCANA_09'] || 0;
      const frontShieldPct =
        hermitShieldTier > 0
          ? BLESSING_CARDS.find((b) => b.id === 'ARCANA_09')!.tiers[Math.min(2, hermitShieldTier - 1)]
          : 0;
      // III. The Empress (ARCANA_03): Floor Clear Heal
      const empressTier = blessings['ARCANA_03'] || 0;
      const floorHealPct = empressTier > 0 ? BLESSING_CARDS.find((b) => b.id === 'ARCANA_03')!.tiers[Math.min(2, empressTier - 1)] : 0;

      const prevHeroes = simRef.current.heroes;
      const newHeroes: CombatHeroUnit[] = partyIds.map((id, idx) => {
        const data = RESONATORS.find((r) => r.id === id)!;
        const prog = heroProgress[id];
        const st = computedStatsMap[id];
        const isFront = idx < form.frontCount;
        const rowCount = isFront ? form.frontCount : form.backCount;
        const rowIdx = isFront ? idx : idx - form.frontCount;

        const x = isFront ? 290 : 150;
        const ySpan = 140;
        const baseY = 275;
        const yOffset = rowCount === 1 ? 0 : ((rowIdx / (rowCount - 1)) - 0.5) * ySpan;

        const prev = prevHeroes.find((h) => h.id === id);
        let startHp = st.hp;
        if (preserveHpRatio && prev && prev.hp > 0) {
          const ratio = Math.min(1, prev.hp / prev.maxHp + floorHealPct / 100);
          startHp = Math.round(st.hp * ratio);
        }

        const titanWaveShield = st.fourPieceSet === 'Titan' ? Math.round(st.hp * 0.2) : 0;

        return {
          id,
          data,
          prog,
          stats: st,
          hp: startHp,
          maxHp: st.hp,
          shield: (isFront && frontShieldPct > 0 ? Math.round((st.hp * frontShieldPct) / 100) : 0) + titanWaveShield,
          energy: preserveHpRatio && prev ? Math.max(startEnergy, prev.energy) : startEnergy,
          basicTimer: 0.3 + idx * 0.18,
          activeCd: 1.5 + idx * 0.4,
          chainCd: 0,
          titanShieldCd: 0,
          reviveUsed: false,
          buffs: { atkPct: 0, atkTimer: 0, defPct: 0, defTimer: 0, critRatePct: 0, critTimer: 0, breakPct: 0, breakTimer: 0 },
          x,
          y: Math.round(baseY + yOffset),
          animOffset: 0,
          animState: 'IDLE',
          animTimer: 0,
          targetX: 705,
          targetY: 215,
          hitFlash: 0,
          lastActionLabel: '',
          lastActionTimer: 0,
        };
      });

        const domainMap: Record<string, string> = {
          BOUNTY: 'GOLD_VAULT',
          STRIKER: 'DOMAIN_I',
          DEFENDER: 'DOMAIN_II',
          TACTICIAN: 'DOMAIN_III',
        };
        const activeChallenge = activeDomainChallengeRef.current;
        const mappedDomainId = activeChallenge ? domainMap[activeChallenge.domainId] : undefined;
        const encounter = createFloorEncounter(targetFloor, encounterMode, mappedDomainId);

        const nextTheme: BgmThemeMode =
          encounter.isBossFloor || encounterMode === 'GUILD_RAID' ? 'BOSS' : 'CORRIDOR';
        sfx.setBgmTheme(nextTheme);

        simRef.current = {
          ...simRef.current,
          mode: encounterMode,
          floor: targetFloor,
          waveElapsed: 0,
          guildRaidDamage: 0,
          isBerserk: false,
          staggerSegments: encounter.staggerSegments,
          currentSegmentBp: encounter.maxSegmentBp,
          maxSegmentBp: encounter.maxSegmentBp,
          isStaggered: false,
          staggerTimer: 0,
          staggerWarningTimer: 0,
          antiStaggerTimer: 0,
          manualFocusId: null,
          firestormCd: 0,
          heroes: newHeroes,
          bossParts: encounter.bossParts,
          shockwaves: [],
        };
      },
      [partyIds, formationId, blessings, heroProgress, computedStatsMap, battleSubMode]
    );

  // Re-initialize wave when changing formation/party or switching live combat sub-modes
  useEffect(() => {
    if (battleSubMode !== 'DOMAINS') {
      initFloorWave(floor, false, battleSubMode);
    }
  }, [formationId, partyIds, battleSubMode]);

  // Helper to push floating combat text, particles & shockwaves
  const spawnFloatingText = (text: string, x: number, y: number, color: string, scale = 1.0, subtext?: string) => {
    simRef.current.floatingTexts.push({
      id: Math.random(),
      text,
      subtext,
      x: x + (Math.random() - 0.5) * 26,
      y: y - 20,
      vy: -34,
      color,
      scale,
      life: 1.05,
      maxLife: 1.05,
    });
  };

  const spawnBurstParticles = (x: number, y: number, color: string, count = 14) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = 50 + Math.random() * 110;
      simRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 3 + Math.floor(Math.random() * 4),
        color,
        alpha: 1,
        life: 0.48,
        maxLife: 0.48,
      });
    }
  };

  const spawnShockwave = (x: number, y: number, color: string, secondaryColor = '#fde047', maxRadius = 68) => {
    simRef.current.shockwaves.push({
      id: Math.random(),
      x,
      y,
      color,
      secondaryColor,
      maxRadius,
      life: 0.42,
      maxLife: 0.42,
    });
  };

  const pushLog = (msg: string) => {
    simRef.current.combatLog = [msg, ...simRef.current.combatLog.slice(0, 14)];
  };

  // Manual Ultimate Trigger from HUD Card Click
  const triggerManualUltimate = (heroId: string) => {
    const sim = simRef.current;
    const u = sim.heroes.find((h) => h.id === heroId);
    if (!u || u.hp <= 0 || u.energy < 99) return;
    u.energy = 100;
    executeHeroUltimateImmediate(u);
  };

  const executeHeroUltimateImmediate = (u: CombatHeroUnit) => {
    const sim = simRef.current;
    u.animState = 'ULTIMATE_CAST';
    u.animTimer = 0.65;
    if (cutInEnabled) {
      sim.cutIn = {
        heroId: u.id,
        heroName: u.data.name,
        skillName: u.data.skills.ultimate.name,
        element: u.data.element,
        primaryColor: u.data.colors.primary,
        remaining: 0.65,
      };
    }
  };

  // --- MAIN 60FPS GAME LOOP ---
  useEffect(() => {
    let animId = 0;
    let lastTime = performance.now();
    let hudSyncAccum = 0;

    const selectTargetsForSkill = (skill: SkillSpec, sim: typeof simRef.current): BossPartUnit[] => {
      const aliveParts = sim.bossParts.filter((b) => b.alive);
      if (aliveParts.length === 0) return [];

      if (skill.targetRule === 'ALL_AOE' || skill.targetRule === 'TEAM_HEAL_AOE') {
        return aliveParts;
      }
      if (skill.targetRule === 'BACKLINE_BYPASS') {
        const backEye = aliveParts.find((b) => b.id === 'EYE_BACK');
        return [backEye || aliveParts[aliveParts.length - 1]];
      }
      if (skill.targetRule === 'LOWEST_HP_ENEMY') {
        const sorted = [...aliveParts].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
        return [sorted[0]];
      }

      // Layer 1: Check Frontline Guard Taunt first
      const frontTentacle = aliveParts.find((b) => b.id === 'TENTACLE_FRONT');
      if (frontTentacle && frontTentacle.tauntTimer > 0 && skill.targetRule !== 'FRONT_CLEAVE') {
        return [frontTentacle];
      }

      // Layer 3: Check Manual Tap-to-Focus if not Taunt-locked
      if (sim.manualFocusId) {
        const focused = aliveParts.find((b) => b.id === sim.manualFocusId);
        if (focused) {
          if (skill.targetRule === 'FRONT_CLEAVE') {
            const others = aliveParts.filter((b) => b.id !== focused.id);
            return others.length > 0 ? [focused, others[0]] : [focused];
          }
          return [focused];
        }
      }

      if (skill.targetRule === 'BOSS_MAIN') {
        const main = aliveParts.find((b) => b.id === 'BOSS_MAIN');
        return [main || aliveParts[0]];
      }

      if (skill.targetRule === 'FRONT_CLEAVE') {
        return aliveParts.slice(0, 2);
      }

      // Default Front-to-Back
      return [aliveParts[0]];
    };

    const applyBreakDamage = (sim: typeof simRef.current, bpAmount: number) => {
      if (sim.staggerWarningTimer <= 0 || sim.isStaggered || sim.antiStaggerTimer > 0 || bpAmount <= 0) return;
      let rem = bpAmount;
      while (rem > 0 && sim.staggerSegments > 0) {
        if (rem >= sim.currentSegmentBp) {
          rem -= sim.currentSegmentBp;
          sim.staggerSegments -= 1;
          // XVI. The Tower (ARCANA_16): Breaking 1 Boss Stagger bar triggers a 100%/150%/250% Boss ATK explosion
          const towerTier = blessings['ARCANA_16'] || 0;
          if (towerTier > 0) {
            const towerMult =
              BLESSING_CARDS.find((b) => b.id === 'ARCANA_16')!.tiers[Math.min(2, towerTier - 1)] / 100;
            sim.bossParts.forEach((bp) => {
              if (!bp.alive) return;
              const expDmg = Math.round(bp.atk * towerMult);
              bp.hp = Math.max(0, bp.hp - expDmg);
              if (sim.mode === 'GUILD_RAID') sim.guildRaidDamage += expDmg;
              spawnFloatingText(`TOWER -${expDmg.toLocaleString()}`, bp.x, bp.y - 26, '#fb923c', 1.1);
            });
          }
          // Check Caelum (H04) 5-star passive: Breaking 1 bar heals team 10% HP
          const caelum = sim.heroes.find((h) => h.id === 'H04' && h.hp > 0 && h.prog.stars >= 5);
          if (caelum) {
            sim.heroes.forEach((ally) => {
              if (ally.hp > 0) ally.hp = Math.min(ally.maxHp, ally.hp + Math.round(ally.maxHp * 0.1));
            });
            spawnFloatingText('AEGIS +10% HP', caelum.x, caelum.y - 15, '#10b981', 0.9);
          }

          if (sim.staggerSegments > 0) {
            sim.currentSegmentBp = sim.maxSegmentBp;
          } else {
            // FULL 5-BAR STAGGER ACHIEVED!
            sim.isStaggered = true;
            sim.staggerTimer = 5.5;
            sim.staggerWarningTimer = 0;
            sim.shakeMag = 10;
            sim.hitstopTimer = 0.06;
            sfx.play('stagger');
            pushLog('BOSS STAGGERED (5.5s)! Cataclysmic Supernova canceled & Boss takes +50% DMG!');
            const mainBoss = sim.bossParts.find((b) => b.id === 'BOSS_MAIN');
            if (mainBoss) {
              spawnFloatingText('STAGGERED! +50% DMG', mainBoss.x, mainBoss.y - 45, '#fbbf24', 1.35);
              spawnBurstParticles(mainBoss.x, mainBoss.y, '#fbbf24', 22);
            }
            // Check Kallen (H01) 5-star passive: Reset Active Skill CD
            const kallen = sim.heroes.find((h) => h.id === 'H01' && h.hp > 0 && h.prog.stars >= 5);
            if (kallen) kallen.activeCd = 0;
          }
        } else {
          sim.currentSegmentBp -= rem;
          rem = 0;
        }
      }
    };

    const executeHeroSkill = (sim: typeof simRef.current, hero: CombatHeroUnit, skill: SkillSpec, skillLv: number) => {
      hero.animOffset = 0.28;
      hero.animState =
        skill.type === 'Ultimate'
          ? 'ULTIMATE_CAST'
          : skill.type === 'Chain' || skill.type === 'Active'
          ? 'SKILL_CAST'
          : hero.stats.rowPosition === 'Front'
          ? 'ATTACK_COMBO'
          : 'RUN_DASH';
      hero.animTimer = skill.type === 'Ultimate' ? 0.55 : 0.32;
      hero.lastActionLabel = skill.name;
      hero.lastActionTimer = 1.15;

      const multPct = interpolateSkillMult(skill, skillLv);
      const baseProcPct = interpolateSkillProc(skill, skillLv);
      const effAtk = Math.round(
        hero.stats.atk *
          (1 + hero.buffs.atkPct / 100) *
          (hero.shield > 0 && sim.heroes.some((h) => h.id === 'H13' && h.hp > 0 && h.prog.stars >= 4) ? 1.15 : 1)
      );

      // Handle Ultimate Cut-In & Energy Refund (Tarot ARCANA_21 XXI. The World)
      if (skill.type === 'Ultimate') {
        hero.energy = 0;
        const worldTier = blessings['ARCANA_21'] || 0;
        if (worldTier > 0) {
          const chance = BLESSING_CARDS.find((b) => b.id === 'ARCANA_21')!.tiers[Math.min(2, worldTier - 1)];
          if (Math.random() * 100 < chance) {
            hero.energy = 50;
            spawnFloatingText('THE WORLD +50% EN', hero.x, hero.y - 25, '#38bdf8', 0.95);
          }
        }
        // Full-Screen 0.55s+ Splash Cut-In Override rule (Module 2.4)
        if (cutInEnabled) {
          sim.cutIn = {
            heroId: hero.id,
            heroName: hero.data.name,
            skillName: skill.name,
            element: hero.data.element,
            primaryColor: hero.data.colors.primary,
            remaining: 0.65,
          };
        }
        sim.hitstopTimer = 0.045;
        sim.shakeMag = 8;
        sfx.play('ult');
      } else if (skill.type === 'Chain') {
        sfx.play('chain');
        if (hero.stats.fourPieceSet === 'Astral Nexus') {
          sim.heroes.forEach((ally) => {
            ally.buffs.atkPct = 15;
            ally.buffs.atkTimer = 4.0;
          });
        }
      } else if (skill.type === 'Active') {
        sfx.play('skill');
      }

      // Party Heals & Shields (Aurelia H13 Chain & Ultimate, Lumina H15)
      if (skill.isHeal) {
        sfx.play('heal');
        const healMult = (multPct / 100) * (1 + hero.stats.healingBonus / 100);
        const rawHeal = Math.round(effAtk * healMult);
        sim.heroes.forEach((ally) => {
          if (ally.hp <= 0) return;
          const overheal = Math.max(0, ally.hp + rawHeal - ally.maxHp);
          ally.hp = Math.min(ally.maxHp, ally.hp + rawHeal);
          if (overheal > 0 && hero.stats.fourPieceSet === 'Radiant Dawn') {
            ally.shield = Math.min(Math.round(ally.maxHp * 0.3), ally.shield + overheal);
          }
          if (skill.type === 'Ultimate' && hero.id === 'H13') {
            ally.shield = Math.max(ally.shield, Math.round(ally.maxHp * 0.2));
            ally.energy = Math.min(100, ally.energy + 15);
          }
          spawnFloatingText(`+${rawHeal}`, ally.x, ally.y - 10, '#34d399', 0.95);
        });
      }

      // Specific Utility Effects
      if (hero.id === 'H01' && skill.type === 'Basic') {
        hero.energy = Math.min(100, hero.energy + 4 * (hero.stats.energyCharge / 100));
      }
      if (hero.id === 'H04' && skill.type === 'Basic') {
        hero.shield = Math.min(Math.round(hero.maxHp * 0.35), hero.shield + Math.round(hero.maxHp * 0.05));
      }
      if (hero.id === 'H04' && skill.type === 'Active') {
        sim.heroes.forEach((ally) => {
          if (ally.stats.rowPosition === 'Front') {
            ally.buffs.defPct = 25;
            ally.buffs.defTimer = 4.0;
          }
        });
      }
      if (hero.id === 'H04' && skill.type === 'Chain') {
        const aliveAllies = sim.heroes.filter((a) => a.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
        if (aliveAllies[0]) {
          aliveAllies[0].shield += Math.round(aliveAllies[0].maxHp * 0.15);
        }
      }
      if (hero.id === 'H04' && skill.type === 'Ultimate') {
        sim.bossParts.forEach((b) => { b.shield = 0; });
        sim.heroes.forEach((ally) => {
          ally.buffs.breakPct = 25;
          ally.buffs.breakTimer = 5.0;
        });
      }
      if (hero.id === 'H13' && skill.type === 'Basic') {
        const lowest = sim.heroes.filter((a) => a.hp > 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (lowest) {
          const hAmt = Math.round(effAtk * 0.35 * (1 + hero.stats.healingBonus / 100));
          lowest.hp = Math.min(lowest.maxHp, lowest.hp + hAmt);
        }
      }
      if (hero.id === 'H13' && skill.type === 'Active') {
        sim.heroes.forEach((ally) => {
          ally.buffs.critRatePct = 15;
          ally.buffs.critTimer = 4.0;
        });
      }
      if (hero.id === 'H16' && skill.type === 'Basic') {
        hero.energy = Math.min(100, hero.energy + 5 * (hero.stats.energyCharge / 100));
      }

      // Gain Ultimate Energy on Basic/Active/Chain
      if (skill.type !== 'Ultimate') {
        const baseGain = skill.type === 'Basic' ? 7 : skill.type === 'Active' ? 14 : 18;
        hero.energy = Math.min(100, hero.energy + baseGain * (hero.stats.energyCharge / 100));
      }

      // [4-PC Overload]: Refund 25% Ultimate Energy immediately after casting Ultimate
      if (skill.type === 'Ultimate' && hero.stats.fourPieceSet === 'Overload') {
        hero.energy = Math.min(100, hero.energy + 25);
      }

      const targets = selectTargetsForSkill(skill, sim);
      targets.forEach((target) => {
        if (!target.alive) return;

        // COMPLETE 9-REACTION ELEMENTAL DETONATION MATRIX (SSOT v2.1 Module 4)
        // Rule: Only Gambit Tactical Chain Skills detonate Elemental Reactions and immediately consume the setup status!
        let reactionTriggered: ReactionType | null = null;
        let reactionDmgMult = 1.0;
        let ignoreDefPct = 0;
        let forceTrueDmg = false;

        const loverTier = blessings['ARCANA_06'] || 0;
        const reactionBlessBonus =
          loverTier > 0
            ? 1 + BLESSING_CARDS.find((b) => b.id === 'ARCANA_06')!.tiers[Math.min(2, loverTier - 1)] / 100
            : 1.0;
        const omen4Bonus = hero.stats.fourPieceSet === 'Voidweaver' ? 1.4 : 1.0;
        const trigEl = hero.data.element;
        const hasDebuff = (t: DebuffType) => target.debuffs.some((d) => d.type === t);
        const upsertDebuff = (unit: BossPartUnit, type: DebuffType, remaining: number, stacks: number) => {
          const ex = unit.debuffs.find((d) => d.type === type);
          if (ex) {
            ex.remaining = Math.max(ex.remaining, remaining);
            ex.stacks = type === 'Bleed' ? Math.min(5, ex.stacks + stacks) : Math.max(ex.stacks, stacks);
            ex.sourceAtk = Math.max(ex.sourceAtk, effAtk);
          } else {
            unit.debuffs.push({ type, remaining, stacks, sourceAtk: effAtk });
          }
        };

        if (skill.type === 'Chain') {
          if (trigEl === 'Fire' && hasDebuff('Freeze')) {
            // 1. MELTDOWN (Cryo -> Fire): Consume Freeze -> grant 8.0s Freeze Immunity
            target.debuffs = target.debuffs.filter((d) => d.type !== 'Freeze');
            target.freezeResistTimer = 8.0;
            reactionTriggered = 'MELTDOWN';
            reactionDmgMult = 1.8 * reactionBlessBonus * omen4Bonus;
            upsertDebuff(target, 'Defenseless', 4.0, 1);
          } else if (trigEl === 'Cryo' && hasDebuff('Shock')) {
            // 2. SUPERCONDUCT (Electro -> Cryo): Consume Shock
            target.debuffs = target.debuffs.filter((d) => d.type !== 'Shock');
            reactionTriggered = 'SUPERCONDUCT';
            reactionDmgMult = 1.35 * reactionBlessBonus * omen4Bonus;
            applyBreakDamage(sim, Math.round(80 * reactionBlessBonus));
            sim.heroes.forEach((ally) => {
              ally.buffs.breakPct = 35;
              ally.buffs.breakTimer = 4.0;
            });
          } else if (trigEl === 'Wind' && hasDebuff('Burn')) {
            // 3. FIRESTORM (Fire -> Wind): Consume Burn
            target.debuffs = target.debuffs.filter((d) => d.type !== 'Burn');
            reactionTriggered = 'FIRESTORM';
            reactionDmgMult = 1.45 * reactionBlessBonus * omen4Bonus;
            sim.bossParts.forEach((bp) => {
              if (!bp.alive) return;
              upsertDebuff(bp, 'Burn', 4.0, 1);
              upsertDebuff(bp, 'Bleed', 4.0, 2);
            });
            if (sim.firestormCd <= 0) {
              sim.firestormCd = 6.0;
              sim.heroes.forEach((ally) => {
                ally.energy = Math.min(100, ally.energy + 10);
              });
            }
          } else if (trigEl === 'Electro' && hasDebuff('Burn')) {
            // 4. OVERLOAD PLASMA (Fire -> Electro): Consume Burn
            target.debuffs = target.debuffs.filter((d) => d.type !== 'Burn');
            reactionTriggered = 'OVERLOAD PLASMA';
            reactionDmgMult = 2.2 * reactionBlessBonus * omen4Bonus;
            applyBreakDamage(sim, 50);
          } else if (trigEl === 'Wind' && hasDebuff('Freeze')) {
            // 5. BLIZZARD (Cryo -> Wind): Consume Freeze -> grant 8.0s Freeze Immunity
            target.debuffs = target.debuffs.filter((d) => d.type !== 'Freeze');
            target.freezeResistTimer = 8.0;
            reactionTriggered = 'BLIZZARD';
            reactionDmgMult = 1.5 * reactionBlessBonus * omen4Bonus;
            upsertDebuff(target, 'Slow', 4.0, 1);
            applyBreakDamage(sim, 40);
          } else if (trigEl === 'Wind' && hasDebuff('Shock')) {
            // 6. THUNDER GALE (Electro -> Wind): Consume Shock
            target.debuffs = target.debuffs.filter((d) => d.type !== 'Shock');
            reactionTriggered = 'THUNDER GALE';
            const bleedStacks = target.debuffs.find((d) => d.type === 'Bleed')?.stacks || 1;
            reactionDmgMult = 1.5 * (1 + bleedStacks * 0.15) * reactionBlessBonus * omen4Bonus;
            applyBreakDamage(sim, 45);
          } else if (trigEl === 'Dark' && hasDebuff('Luminous Mark')) {
            // 7. TWILIGHT EXECUTION (Light -> Dark): Consume Luminous Mark
            target.debuffs = target.debuffs.filter((d) => d.type !== 'Luminous Mark');
            reactionTriggered = 'TWILIGHT EXECUTION';
            reactionDmgMult = 1.6 * reactionBlessBonus * omen4Bonus;
            if (target.hp / target.maxHp < 0.25) forceTrueDmg = true;
            else ignoreDefPct = 40;
            applyBreakDamage(sim, 40);
          } else if (
            trigEl === 'Light' &&
            target.debuffs.some((d) => d.type === 'Burn' || d.type === 'Freeze' || d.type === 'Shock' || d.type === 'Bleed')
          ) {
            // 8. RADIANT INFUSION (Core 4 -> Light): Consume 1 Core Debuff
            const idx = target.debuffs.findIndex(
              (d) => d.type === 'Burn' || d.type === 'Freeze' || d.type === 'Shock' || d.type === 'Bleed'
            );
            if (idx >= 0) {
              if (target.debuffs[idx].type === 'Freeze') target.freezeResistTimer = 8.0;
              target.debuffs.splice(idx, 1);
            }
            reactionTriggered = 'RADIANT INFUSION';
            reactionDmgMult = 1.25 * reactionBlessBonus * omen4Bonus;
            sim.heroes.forEach((ally) => {
              if (ally.hp > 0) ally.hp = Math.min(ally.maxHp, ally.hp + Math.round(ally.maxHp * 0.08));
            });
          } else if (
            trigEl === 'Dark' &&
            target.debuffs.some((d) => d.type === 'Burn' || d.type === 'Freeze' || d.type === 'Shock' || d.type === 'Bleed')
          ) {
            // 9. ABYSSAL DECAY (Core 4 -> Dark: Extend debuff duration +2.0s without consuming)
            target.debuffs.forEach((d) => {
              if (d.type === 'Burn' || d.type === 'Freeze' || d.type === 'Shock' || d.type === 'Bleed') {
                d.remaining += 2.0;
              }
            });
            reactionTriggered = 'ABYSSAL DECAY';
            reactionDmgMult = 1.35 * reactionBlessBonus * omen4Bonus;
          }
        }

        if (reactionTriggered) {
          sim.hitstopTimer = 0.05;
          sim.shakeMag = Math.max(sim.shakeMag, 7);
          pushLog(`${hero.data.name} triggered ${reactionTriggered} on ${target.name}!`);
          spawnBurstParticles(target.x, target.y, ELEMENT_META[hero.data.element].color, 22);
          spawnShockwave(target.x, target.y, ELEMENT_META[hero.data.element].color, '#fde047', 78);
          // Yuzuki (H07) 5-star passive: +15% Energy on any reaction
          const yuzuki = sim.heroes.find((h) => h.id === 'H07' && h.hp > 0 && h.prog.stars >= 5);
          if (yuzuki) yuzuki.energy = Math.min(100, yuzuki.energy + 15);
        }

        // Elemental Advantage / Counter Evaluation (WEAK! +30% DMG / +25% BP / +15% Crit vs RESIST -25% DMG / -20% BP)
        const counterInfo = evaluateElementalCounter(hero.data.element, target.element || 'Dark');

        // Crit Rate & Crit DMG calculation
        const hasBurn = target.debuffs.some((d) => d.type === 'Burn');
        const hasLuminous = target.debuffs.some((d) => d.type === 'Luminous Mark');
        const hasCorrosion = target.debuffs.some((d) => d.type === 'Corrosion');
        const bleedEntry = target.debuffs.find((d) => d.type === 'Bleed');

        let critChance =
          hero.stats.critRate +
          hero.buffs.critRatePct +
          counterInfo.bonusCritRate +
          (hasLuminous ? 20 : 0);
        if (hero.id === 'H01' && hero.prog.stars >= 4 && hasBurn) critChance += 20;
        if (hero.id === 'H16' && skill.type === 'Ultimate' && target.hp / target.maxHp < 0.3) critChance = 100;

        const isCrit = Math.random() * 100 < critChance;
        let critMult = 1.0;
        if (isCrit) {
          let cDmg = hero.stats.critDmg;
          if (hero.id === 'H01' && skill.type === 'Ultimate') cDmg += 30;
          if (hero.id === 'H10' && hero.prog.stars >= 5 && bleedEntry && bleedEntry.stacks >= 5) cDmg += 50;
          if (sim.isStaggered && skill.type === 'Ultimate' && hero.stats.fourPieceSet === 'Eclipse') cDmg += 60;
          critMult = cDmg / 100;
          if (hero.stats.fourPieceSet === 'Starfall Executioner') ignoreDefPct = Math.min(100, ignoreDefPct + 15);
        }

        // DEF Mitigation Formula (Module 4.1): Damage = RawDmg * (100 / (100 + EffectiveDEF))
        let defMod = 1.0;
        if (hasBurn) defMod -= 0.15;
        if (target.debuffs.some((d) => d.type === 'Defenseless')) defMod -= 0.25;
        const effectiveDef = forceTrueDmg ? 0 : Math.max(0, target.def * Math.max(0.2, defMod) * (1 - ignoreDefPct / 100));
        const defMitigation = 100 / (100 + effectiveDef * 0.25);

        // Skill Type & Set Multipliers
        let bonusMult = reactionDmgMult * counterInfo.dmgMult;
        if (skill.type === 'Basic' && hero.stats.fourPieceSet === 'Volatus') bonusMult *= 1.4;
        if (skill.type === 'Chain') bonusMult *= 1 + (partyResonance.chainDmgPct + (hero.stats.activeSets.some((s) => s.set === 'Astral Nexus') ? 25 : 0)) / 100;
        if (skill.type === 'Ultimate') {
          if (hero.stats.fourPieceSet === 'Overload') bonusMult *= 1.4;
          if (hasCorrosion) bonusMult *= 1.35;
          if (hero.id === 'H01' && hasBurn) bonusMult *= 1.25;
        }
        if (hero.id === 'H16' && hero.prog.stars >= 4 && target.hp / target.maxHp < 0.5) bonusMult *= 1.25;
        if (target.voidStacks > 0) bonusMult *= 1 + target.voidStacks * 0.05;

        // Staggered Multiplier (+50% base + Tarot ARCANA_20 XX. Judgement)
        if (sim.isStaggered) {
          const judgeTier = blessings['ARCANA_20'] || 0;
          const judgeBonus =
            judgeTier > 0
              ? BLESSING_CARDS.find((b) => b.id === 'ARCANA_20')!.tiers[Math.min(2, judgeTier - 1)] / 100
              : 0;
          bonusMult *= 1.5 + judgeBonus;
        }

        // Kahori (H10) 4* Double Basic Attack proc & Ultimate Bleed Detonation
        let totalMult = multPct / 100;
        if (hero.id === 'H10' && skill.type === 'Basic' && hero.prog.stars >= 4 && Math.random() < 0.3) {
          totalMult *= 1.5;
        }
        if (hero.id === 'H10' && skill.type === 'Ultimate' && bleedEntry) {
          totalMult += bleedEntry.stacks * 1.5;
        }

        let finalDmg = Math.max(1, Math.round(effAtk * totalMult * critMult * defMitigation * bonusMult));

        // Tarot ARCANA_13: Death's Execution True DMG below 25% HP
        const deathTier = blessings['ARCANA_13'] || 0;
        if (deathTier > 0 && target.hp / target.maxHp < 0.25) {
          const extraPct = BLESSING_CARDS.find((b) => b.id === 'ARCANA_13')!.tiers[Math.min(2, deathTier - 1)];
          finalDmg = Math.round(finalDmg * (1 + extraPct / 100));
        }

        if (sim.mode === 'GUILD_RAID') {
          sim.guildRaidDamage += finalDmg;
        }

        // Apply Damage to Boss Part Shield then HP ([4-PC Omen / Voidweaver] ignores Boss Shield)
        const ignoresShield = hero.stats.fourPieceSet === 'Voidweaver';
        if (target.shield > 0 && !ignoresShield) {
          const absorbed = Math.min(target.shield, finalDmg);
          target.shield -= absorbed;
          finalDmg -= absorbed;
        }
        target.hp = Math.max(0, target.hp - finalDmg);
        target.hitFlash = 0.08;

        // Luminous Mark Lifesteal (8%)
        if (hasLuminous && hero.hp > 0) {
          hero.hp = Math.min(hero.maxHp, hero.hp + Math.round(finalDmg * 0.08));
        }

        if (skill.type === 'Basic') sfx.play(isCrit ? 'crit' : 'hit');
        const elColor = ELEMENT_META[hero.data.element].color;
        const isWeak = counterInfo.tag === 'WEAK!';
        const isResist = counterInfo.tag === 'RESIST';
        const floatColor = reactionTriggered
          ? '#fde047'
          : isWeak
          ? '#f59e0b'
          : isResist
          ? '#94a3b8'
          : isCrit
          ? elColor
          : '#f8fafc';
        const floatScale = reactionTriggered
          ? 1.42
          : isWeak
          ? 1.26
          : isResist
          ? 0.88
          : isCrit
          ? 1.2
          : 0.98;
        const counterTagLabel =
          counterInfo.tag === 'WEAK!'
            ? 'WEAK! +30%'
            : counterInfo.tag === 'RESIST'
            ? 'RESIST -20%'
            : undefined;
        const floatSubtext =
          reactionTriggered && counterTagLabel
            ? `${reactionTriggered} · ${counterTagLabel}`
            : reactionTriggered || counterTagLabel;

        spawnFloatingText(
          `${finalDmg.toLocaleString()}${isCrit ? '!' : ''}`,
          target.x,
          target.y,
          floatColor,
          floatScale,
          floatSubtext
        );
        spawnBurstParticles(
          target.x,
          target.y,
          isWeak ? '#fbbf24' : elColor,
          skill.type === 'Ultimate' ? 20 : isCrit || isWeak ? 10 : 5
        );

        // Break Damage Formula (Module 2.3): BP = Base * (BreakPower% / 100) * ShockMultiplier * CounterBpMult
        const shockMult = target.debuffs.some((d) => d.type === 'Shock') ? 1.35 : 1.0;
        const totalBreakPct = hero.stats.breakPower + hero.buffs.breakPct;
        const bpDealt = Math.round(skill.breakPower * (totalBreakPct / 100) * shockMult * counterInfo.bpMult);
        applyBreakDamage(sim, bpDealt);

        // Status Proc Chance Budget (SSOT v2.1 Module 3.2):
        // Total Proc Chance = Base Skill Chance + Gear Status Chance Bonus (Ring +25% + 2-PC Omen +20%) - Boss Effect RES
        if (skill.debuff) {
          const isShocked = target.debuffs.some((d) => d.type === 'Shock');
          const effRes = skill.type === 'Ultimate' && hero.id === 'H07' ? Math.max(0, target.effectRes - 25) : target.effectRes;
          const freezeBonus = skill.debuff === 'Freeze' && isShocked ? 30 : 0;
          const procChance = calculateTotalStatusProcChance(baseProcPct, hero.stats.effectHitRate, freezeBonus, effRes);

          if (skill.debuff === 'Freeze' && (target.freezeResistTimer > 0 || target.debuffs.some((d) => d.type === 'Freeze'))) {
            // Target is currently Frozen or in 8.0s Freeze Immunity window
          } else if (Math.random() * 100 < procChance) {
            const dur = skill.debuff === 'Freeze' ? 2.0 : 4.0;
            const existing = target.debuffs.find((d) => d.type === skill.debuff);
            if (existing) {
              existing.remaining = dur;
              if (skill.debuff === 'Bleed') {
                existing.stacks = Math.min(5, existing.stacks + (skill.debuffStacks || 1));
              }
            } else {
              target.debuffs.push({
                type: skill.debuff,
                remaining: dur,
                stacks: skill.debuffStacks || 1,
                sourceAtk: effAtk,
              });
            }
            if (hero.stats.fourPieceSet === 'Voidweaver') {
              target.voidStacks = Math.min(5, target.voidStacks + 1);
              target.voidTimer = 5.0;
            }
          }
        }

        // Check if Part Destroyed
        if (target.hp <= 0 && target.alive) {
          target.alive = false;
          target.debuffs = [];
          spawnBurstParticles(target.x, target.y, '#f43f5e', 26);
          spawnShockwave(target.x, target.y, '#f43f5e', '#fde047', 90);
          pushLog(`${target.name} destroyed!`);
          // Eye of Madness destruction penalty: Boss loses 1 full Stagger bar immediately (Module 6.3)
          if (target.id === 'EYE_BACK') {
            applyBreakDamage(sim, sim.maxSegmentBp);
            pushLog('Eye of Madness shattered! Old God Core loses 1 Stagger Segment!');
          }
          // Noctis (H16) 5-star passive: +50% Energy on kill
          const noctis = sim.heroes.find((h) => h.id === 'H16' && h.hp > 0 && h.prog.stars >= 5);
          if (noctis) noctis.energy = Math.min(100, noctis.energy + 50);
        }
      });
    };

    const canFireGambitChain = (hero: CombatHeroUnit, sim: typeof simRef.current): boolean => {
      const aliveParts = sim.bossParts.filter((b) => b.alive);
      if (aliveParts.length === 0) return false;

      const g1 = hero.prog.gambit1;
      if (g1 === 'BOSS_STAGGER_OPEN' && !sim.isStaggered && sim.staggerSegments > 0) return true;
      if (g1 === 'ALLY_HP_BELOW_50' && sim.heroes.some((a) => a.hp > 0 && a.hp / a.maxHp < 0.5)) return true;
      if (g1 === 'BOSS_SHIELD_ACTIVE' && aliveParts.some((b) => b.shield > 0)) return true;
      if (g1 === 'ALWAYS_READY') return true;

      const g2 = hero.prog.gambit2;
      if (g2 === 'TARGET_HAS_FREEZE' && aliveParts.some((b) => b.debuffs.some((d) => d.type === 'Freeze'))) return true;
      if (g2 === 'TARGET_HAS_SHOCK' && aliveParts.some((b) => b.debuffs.some((d) => d.type === 'Shock'))) return true;
      if (g2 === 'TARGET_HAS_BURN' && aliveParts.some((b) => b.debuffs.some((d) => d.type === 'Burn'))) return true;
      if (g2 === 'TARGET_HAS_LUMINOUS' && aliveParts.some((b) => b.debuffs.some((d) => d.type === 'Luminous Mark'))) return true;
      if (g2 === 'ANY_DEBUFF' && aliveParts.some((b) => b.debuffs.length > 0)) return true;

      return false;
    };

    const tickSimulation = (dt: number) => {
      const sim = simRef.current;

      if (sim.hitstopTimer > 0) {
        sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
        return;
      }

      sim.waveElapsed += dt;
      sim.shakeMag = Math.max(0, sim.shakeMag - dt * 18);
      if (sim.firestormCd > 0) sim.firestormCd = Math.max(0, sim.firestormCd - dt);
      if (sim.cutIn) {
        sim.cutIn.remaining -= dt;
        if (sim.cutIn.remaining <= 0) sim.cutIn = null;
      }

      // Check 90s Guild Raid Completion (Scaled by Easy / Normal / Hard Score Multiplier)
      if (sim.mode === 'GUILD_RAID' && sim.waveElapsed >= 90) {
        const diffSpec = GUILD_RAID_DIFF_SPECS[guildRaidDiffRef.current];
        const scoredDamage = Math.round(sim.guildRaidDamage * diffSpec.scoreMult);
        const medalsEarned = Math.max(25, Math.round(scoredDamage / 12000));
        setGuildMedals((m) => m + medalsEarned);
        setGuildTotalDamage((d) => d + scoredDamage);
        setGuildAttempts((a) => Math.max(0, a - 1));
        pushLog(
          `90s GUILD RAID [${diffSpec.id}] COMPLETE! Scored DMG: ${scoredDamage.toLocaleString()} (${diffSpec.scoreMult}x) · +${medalsEarned} Guild Medals!`
        );
        initFloorWave(sim.floor, false, 'GUILD_RAID');
        return;
      }

      // Check 60s Berserk Phase (Mental Corruption - Module 2.3 & 6.3)
      if (!sim.isBerserk && sim.waveElapsed >= 60) {
        sim.isBerserk = true;
        const newSegBp = getFloorSegmentBp(sim.floor, true);
        sim.maxSegmentBp = newSegBp;
        sim.currentSegmentBp = Math.min(newSegBp, Math.round(sim.currentSegmentBp * 1.5));
        sim.shakeMag = 12;
        pushLog('60s ELAPSED — MENTAL CORRUPTION! Old God enters BERSERK PHASE (ATK +100%, SPD +50%, Stagger BP +50%)!');
      }

      // Stagger & Anti-Stagger Timers
      if (sim.isStaggered) {
        sim.staggerTimer -= dt;
        if (sim.staggerTimer <= 0) {
          sim.isStaggered = false;
          sim.staggerSegments = sim.floor % 5 === 0 || sim.mode === 'GUILD_RAID' ? 5 : 2;
          sim.currentSegmentBp = sim.maxSegmentBp;
          sim.antiStaggerTimer = 8.0;
          pushLog('Enemy recovered from Stagger (8s Anti-Stagger Lock active).');
        }
      } else if (sim.antiStaggerTimer > 0) {
        sim.antiStaggerTimer = Math.max(0, sim.antiStaggerTimer - dt);
      }

      // Update Heroes (4+1 Skill Queue: Ultimate -> Gambit Chain -> Active -> Basic)
      sim.heroes.forEach((u) => {
        if (u.hp <= 0) return;
        u.animOffset = Math.max(0, u.animOffset - dt);
        if (u.animTimer > 0) {
          u.animTimer = Math.max(0, u.animTimer - dt);
          if (u.animTimer <= 0) u.animState = 'IDLE';
        }
        u.hitFlash = Math.max(0, u.hitFlash - dt);
        u.lastActionTimer = Math.max(0, u.lastActionTimer - dt);
        if (u.titanShieldCd > 0) u.titanShieldCd = Math.max(0, u.titanShieldCd - dt);

        if (u.buffs.atkTimer > 0) { u.buffs.atkTimer -= dt; if (u.buffs.atkTimer <= 0) u.buffs.atkPct = 0; }
        if (u.buffs.defTimer > 0) { u.buffs.defTimer -= dt; if (u.buffs.defTimer <= 0) u.buffs.defPct = 0; }
        if (u.buffs.critTimer > 0) { u.buffs.critTimer -= dt; if (u.buffs.critTimer <= 0) u.buffs.critRatePct = 0; }
        if (u.buffs.breakTimer > 0) { u.buffs.breakTimer -= dt; if (u.buffs.breakTimer <= 0) u.buffs.breakPct = 0; }

        u.activeCd = Math.max(0, u.activeCd - dt);
        u.chainCd = Math.max(0, u.chainCd - dt);
        u.basicTimer = Math.max(0, u.basicTimer - dt);

        // 1. Ultimate Check
        if (u.energy >= 100 && (autoUltimate || u.animState === 'ULTIMATE_CAST')) {
          executeHeroSkill(sim, u, u.data.skills.ultimate, u.prog.skillLevels.ultimate);
          return;
        }

        // 2 & 3. Gambit Slot 1 & Slot 2 Check
        if (u.chainCd <= 0 && canFireGambitChain(u, sim)) {
          u.chainCd = u.data.skills.chain.cooldown;
          executeHeroSkill(sim, u, u.data.skills.chain, u.prog.skillLevels.chain);
          return;
        }

        // 4a. Core Active Skill
        if (u.activeCd <= 0) {
          u.activeCd = u.data.skills.active.cooldown;
          executeHeroSkill(sim, u, u.data.skills.active, u.prog.skillLevels.active);
          return;
        }

        // 4b. Basic Attack (Interval = 115 / SPD seconds - Module 4.1)
        if (u.basicTimer <= 0) {
          u.basicTimer = 115 / Math.max(50, u.stats.spd);
          executeHeroSkill(sim, u, u.data.skills.basic, u.prog.skillLevels.basic);
        }
      });

      // Update Boss Parts & DoTs
      const yuzuki4StarActive = sim.heroes.some((h) => h.id === 'H07' && h.hp > 0 && h.prog.stars >= 4);
      const raidDiffDmgMult =
        sim.mode === 'GUILD_RAID' ? GUILD_RAID_DIFF_SPECS[guildRaidDiffRef.current].bossDmgMult : 1.0;
      const berserkMult = (sim.isBerserk ? 2.0 : 1.0) * raidDiffDmgMult;
      const berserkSpdMult = sim.isBerserk ? 1.5 : 1.0;

      sim.bossParts.forEach((b) => {
        if (!b.alive) return;
        b.hitFlash = Math.max(0, b.hitFlash - dt);
        if (b.tauntTimer > 0) b.tauntTimer = Math.max(0, b.tauntTimer - dt);
        if (b.freezeResistTimer > 0) b.freezeResistTimer = Math.max(0, b.freezeResistTimer - dt);
        if (b.voidTimer > 0) {
          b.voidTimer -= dt;
          if (b.voidTimer <= 0) b.voidStacks = 0;
        }

        // Berserk Tentacle self-heal 5%/s
        if (sim.isBerserk && b.id === 'TENTACLE_FRONT') {
          b.hp = Math.min(b.maxHp, b.hp + Math.round(b.maxHp * 0.05 * dt));
        }

        // Tick DoTs (Burn: 30% ATK/s, Bleed: 20% ATK/s per stack) + Freeze Expiry -> 8.0s Freeze Immunity
        b.debuffs.forEach((d) => {
          d.remaining -= dt;
          if (d.type === 'Burn') {
            const dotDmg = Math.round(d.sourceAtk * 0.3 * dt);
            b.hp = Math.max(0, b.hp - dotDmg);
            if (sim.mode === 'GUILD_RAID') sim.guildRaidDamage += dotDmg;
          } else if (d.type === 'Bleed') {
            const dotDmg = Math.round(d.sourceAtk * 0.2 * d.stacks * dt);
            b.hp = Math.max(0, b.hp - dotDmg);
            if (sim.mode === 'GUILD_RAID') sim.guildRaidDamage += dotDmg;
          }
          if (d.type === 'Freeze' && d.remaining <= 0) {
            b.freezeResistTimer = 8.0;
            spawnFloatingText('FREEZE IMMUNE 8.0s', b.x, b.y - 24, '#38bdf8', 0.9);
          }
        });
        b.debuffs = b.debuffs.filter((d) => d.remaining > 0);

        if (b.hp <= 0 && b.alive) {
          b.alive = false;
          return;
        }

        // Frozen or Staggered halts boss actions
        if (sim.isStaggered || b.debuffs.some((d) => d.type === 'Freeze')) return;

        const slowMod = b.debuffs.some((d) => d.type === 'Slow') ? 0.7 : 1.0;
        const effDt = dt * berserkSpdMult * slowMod;

        b.attackTimer -= effDt;
        b.specialTimer -= effDt;

        const dealDamageToHero = (targetHero: CombatHeroUnit, rawBossDmg: number) => {
          if (targetHero.hp <= 0) return;
          const effDef = targetHero.stats.def * (1 + targetHero.buffs.defPct / 100);
          let dmg = Math.round(rawBossDmg * (100 / (100 + effDef * 0.22)));
          if (targetHero.id === 'H04' && targetHero.prog.stars >= 4) dmg = Math.round(dmg * 0.82);
          if (yuzuki4StarActive && b.debuffs.length > 0) dmg = Math.round(dmg * 0.85);

          // Tarot ARCANA_09 IX. The Hermit Thorns (20% Damage Reflection)
          if ((blessings['ARCANA_09'] || 0) > 0 && targetHero.stats.rowPosition === 'Front') {
            b.hp = Math.max(1, b.hp - Math.round(dmg * 0.2));
          }

          if (targetHero.shield > 0) {
            const abs = Math.min(targetHero.shield, dmg);
            targetHero.shield -= abs;
            dmg -= abs;
          }
          targetHero.hp = Math.max(0, targetHero.hp - dmg);
          targetHero.hitFlash = 0.16;
          if (targetHero.animState === 'IDLE') {
            targetHero.animState = 'STAGGER_HIT';
            targetHero.animTimer = 0.2;
          }
          spawnFloatingText(`-${dmg}`, targetHero.x, targetHero.y, '#f43f5e', 0.9);

          // Titan 4-PC Shield below 50% HP
          if (
            targetHero.hp > 0 &&
            targetHero.hp / targetHero.maxHp < 0.5 &&
            targetHero.stats.fourPieceSet === 'Titan' &&
            targetHero.titanShieldCd <= 0
          ) {
            targetHero.titanShieldCd = 15.0;
            targetHero.shield += Math.round(targetHero.maxHp * 0.2);
            spawnFloatingText('TITAN SHIELD', targetHero.x, targetHero.y - 18, '#38bdf8', 0.9);
          }

          // Aurelia (H13) 5-Star Seraphic Halo Revive (once per wave)
          if (targetHero.hp <= 0) {
            const aurelia = sim.heroes.find((h) => h.id === 'H13' && h.hp > 0 && h.prog.stars >= 5 && !h.reviveUsed);
            if (aurelia) {
              aurelia.reviveUsed = true;
              targetHero.hp = Math.round(targetHero.maxHp * 0.3);
              spawnFloatingText('SERAPHIC REVIVE!', targetHero.x, targetHero.y - 22, '#fbbf24', 1.15);
              pushLog(`Aurelia's Seraphic Halo prevented ${targetHero.data.name}'s death!`);
            }
          }
        };

        const aliveHeroes = sim.heroes.filter((h) => h.hp > 0);
        if (aliveHeroes.length === 0) return;
        const frontHeroes = aliveHeroes.filter((h) => h.stats.rowPosition === 'Front');
        const targetPool = frontHeroes.length > 0 ? frontHeroes : aliveHeroes;

        // Basic Attack (every 2.5s)
        if (b.attackTimer <= 0) {
          b.attackTimer = 2.5;
          if (b.id === 'BOSS_MAIN') {
            targetPool.forEach((h) => dealDamageToHero(h, b.atk * 1.2 * berserkMult));
          } else if (b.id === 'TENTACLE_FRONT') {
            dealDamageToHero(targetPool[0], b.atk * 0.9 * berserkMult);
          } else if (b.id === 'RIGHT_ARM') {
            targetPool.slice(0, 2).forEach((h) => dealDamageToHero(h, b.atk * 1.0 * berserkMult));
          } else if (b.id === 'EYE_BACK') {
            const byAtk = [...aliveHeroes].sort((x, y) => y.stats.atk - x.stats.atk);
            dealDamageToHero(byAtk[0], b.atk * 1.1 * berserkMult);
            if (sim.isBerserk && byAtk[1]) dealDamageToHero(byAtk[1], b.atk * 1.1 * berserkMult);
          } else {
            // Void Minion or Arena Rival strike
            dealDamageToHero(targetPool[0], b.atk * 0.85 * berserkMult);
          }
        }

        // Special Skill (every 8s / 10s / 12s)
        if (b.specialTimer <= 0) {
          if (b.id === 'BOSS_MAIN') {
            b.specialTimer = 8.0;
            aliveHeroes.forEach((h) => dealDamageToHero(h, b.atk * 1.85 * berserkMult));
            if (sim.staggerWarningTimer <= 0 && !sim.isStaggered) {
              sim.staggerWarningTimer = 4.0;
              sim.staggerSegments = 5;
              sim.currentSegmentBp = sim.maxSegmentBp;
              pushLog('WARNING: Old God charging Cataclysmic Supernova (4.0s)! Break Stagger Gauge now!');
            }
          } else if (b.id === 'TENTACLE_FRONT') {
            b.specialTimer = 10.0;
            b.tauntTimer = 4.0;
            spawnFloatingText('ELDRITCH TAUNT', b.x, b.y - 25, '#fbbf24', 1.05);
          } else if (b.id === 'RIGHT_ARM') {
            b.specialTimer = 9.5;
            frontHeroes.forEach((h) => dealDamageToHero(h, b.atk * 1.45 * berserkMult));
            spawnFloatingText('ABYSSAL CRUSH', b.x, b.y - 25, '#f43f5e', 1.05);
          } else if (b.id === 'EYE_BACK') {
            b.specialTimer = 12.0;
            const mainCore = sim.bossParts.find((p) => p.id === 'BOSS_MAIN' && p.alive);
            if (mainCore) {
              mainCore.shield = Math.round(mainCore.maxHp * 0.15);
              spawnFloatingText('AEGIS BARRIER +15%', mainCore.x, mainCore.y - 30, '#38bdf8', 1.1);
            }
          } else {
            b.specialTimer = 9.0;
            targetPool.slice(0, 2).forEach((h) => dealDamageToHero(h, b.atk * 1.15 * berserkMult));
            spawnFloatingText(b.rivalHeroId ? 'RIVAL CHAIN BURST' : 'VOID SLASH', b.x, b.y - 25, '#c084fc', 0.95);
          }
        }
      });

      // Stagger Check 4.0s Countdown for Cataclysmic Supernova (Module 6.3)
      if (sim.staggerWarningTimer > 0 && !sim.isStaggered) {
        sim.staggerWarningTimer = Math.max(0, sim.staggerWarningTimer - dt);
        if (sim.staggerWarningTimer <= 0) {
          sim.staggerSegments = 5;
          sim.currentSegmentBp = sim.maxSegmentBp;
          const mainCore = sim.bossParts.find((p) => p.id === 'BOSS_MAIN' && p.alive);
          if (mainCore) {
            sim.shakeMag = 15;
            pushLog('CATACLYSMIC SUPERNOVA UNLEASHED (550% Boss ATK)!');
            sim.heroes.forEach((h) => {
              if (h.hp <= 0) return;
              const effDef = h.stats.def * (1 + h.buffs.defPct / 100);
              const dmg = Math.round(mainCore.atk * 5.5 * berserkMult * (100 / (100 + effDef * 0.22)));
              h.hp = Math.max(0, h.hp - dmg);
              spawnFloatingText(`-${dmg}!`, h.x, h.y, '#ef4444', 1.3);
            });
          }
        }
      }

      // Update Floating Texts, Particles & Shockwaves
      sim.floatingTexts.forEach((ft) => {
        ft.y += ft.vy * dt;
        ft.life -= dt;
      });
      sim.floatingTexts = sim.floatingTexts.filter((ft) => ft.life > 0);

      sim.particles.forEach((pt) => {
        pt.x += pt.vx * dt;
        pt.y += pt.vy * dt;
        pt.life -= dt;
        pt.alpha = pt.life / pt.maxLife;
      });
      sim.particles = sim.particles.filter((pt) => pt.life > 0);

      sim.shockwaves.forEach((sw) => {
        sw.life -= dt;
      });
      sim.shockwaves = sim.shockwaves.filter((sw) => sw.life > 0);

      // Check Wave Victory (Spire vs 1v1 Async Arena)
      if (sim.mode === 'ARENA') {
        if (sim.bossParts.length > 0 && sim.bossParts.every((b) => !b.alive)) {
          const rival = ARENA_RIVALS[activeArenaRivalRef.current] || ARENA_RIVALS[0];
          setArenaTokens((t) => t + rival.tokenReward);
          setStarlightGems((s) => s + rival.gemReward);
          setArenaRankPts((r) => r + 25);
          pushLog(
            `1v1 ARENA VICTORY vs ${rival.name}! +${rival.tokenReward} Arena Tokens · +${rival.gemReward} Starlight Gems · +25 RP!`
          );
          setBattleSubMode('SPIRE');
          initFloorWave(floor, true, 'SPIRE');
        }
      } else if (sim.mode === 'SPIRE') {
        const mainCore = sim.bossParts.find((b) => b.id === 'BOSS_MAIN');
        const isWaveCleared = mainCore ? !mainCore.alive : sim.bossParts.length > 0 && sim.bossParts.every((b) => !b.alive);
        if (isWaveCleared) {
          const activeChallenge = activeDomainChallengeRef.current;
          if (activeChallenge) {
            const clearKey = `${activeChallenge.domainId}_${activeChallenge.tier}`;
            setClearedDomainTiers((prev) => ({ ...prev, [clearKey]: true }));
            grantDomainTierReward(activeChallenge.domainId, activeChallenge.tier, false);
            setActiveDomainChallenge(null);
            activeDomainChallengeRef.current = null;
            setBattleSubMode('SPIRE');
            setSanctuariesModalOpen(true);
            initFloorWave(floor, true, 'SPIRE');
            pushLog(`DOMAIN TIER ${activeChallenge.tier} CLEARED! Sweep unlocked for ${activeChallenge.domainId} Tier ${activeChallenge.tier}!`);
            return;
          }

          const nextFl = sim.floor + 1;
          const piscesStars = (constellations['PISCES'] || 0) + (constellations['AQUARIUS'] || 0);
          const shardMult = 1 + (piscesStars * 6) / 100;
          const earnedGold = Math.round((850 + sim.floor * 240) * shardMult);
          const earnedGems = sim.floor % 5 === 0 ? 160 : 40;
          setGold((g) => g + earnedGold);
          setStarlightGems((s) => s + earnedGems);
          setFloor(nextFl);
          setHighestFloor((hf) => Math.max(hf, nextFl));
          pushLog(`Floor ${sim.floor} Cleared! +${earnedGold.toLocaleString()} Gold · +${earnedGems} Starlight.`);

          // Every 5 floors: Open Roguelite Tarot Blessing Modal (Face-Down 3-Card Flip + 6s Auto-Card Timer)
          if (sim.floor % 5 === 0) {
            const shuffled = [...BLESSING_CARDS].sort(() => Math.random() - 0.5).slice(0, 3);
            setTarotFlipped([false, false, false]);
            setTarotAutoTimer(6.0);
            setBlessingChoices(shuffled);
          }
          initFloorWave(nextFl, true, 'SPIRE');
        }
      }

      // Check Total Party Wipe
      if (sim.heroes.every((h) => h.hp <= 0)) {
        if (sim.mode === 'GUILD_RAID') {
          const diffSpec = GUILD_RAID_DIFF_SPECS[guildRaidDiffRef.current];
          const wipePenalty = diffSpec.id === 'HARD' ? 0.5 : 1.0;
          const scoredDamage = Math.round(sim.guildRaidDamage * diffSpec.scoreMult * wipePenalty);
          const medalsEarned = Math.max(10, Math.round(scoredDamage / 12000));
          setGuildMedals((m) => m + medalsEarned);
          setGuildTotalDamage((d) => d + scoredDamage);
          setGuildAttempts((a) => Math.max(0, a - 1));
          pushLog(
            diffSpec.id === 'HARD'
              ? `SQUAD WIPED BEFORE 90s ON HARD RAID! Score & Medals Halved (0.5x): +${scoredDamage.toLocaleString()} Score · +${medalsEarned} Medals!`
              : `Guild Raid Attempt Ended — +${scoredDamage.toLocaleString()} Score · +${medalsEarned} Medals.`
          );
          setBattleSubMode('SPIRE');
          initFloorWave(floor, false, 'SPIRE');
        } else if (sim.mode === 'ARENA') {
          pushLog('1v1 Arena Squad Defeated — Returning to Spire.');
          setBattleSubMode('SPIRE');
          initFloorWave(floor, false, 'SPIRE');
        } else {
          setShellState('GAME_OVER');
        }
      }
    };

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      const isSimActive =
        shellState === 'PLAYING' &&
        !blessingChoices &&
        !showWiki &&
        !sanctuariesModalOpen &&
        !merchantHubOpen &&
        !gachaRevealCards &&
        battleSubMode !== 'DOMAINS';
      if (isSimActive) {
        tickSimulation(dt);
      }

      if (canvasRef.current && battleSubMode !== 'DOMAINS') {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const sim = simRef.current;
          renderBattlefieldCanvas(
            ctx,
            canvasRef.current.width,
            canvasRef.current.height,
            now / 1000,
            sim.heroes,
            sim.bossParts,
            sim.floatingTexts,
            sim.particles,
            sim.manualFocusId,
            sim.isStaggered,
            sim.isBerserk,
            sim.shakeMag,
            sim.staggerSegments,
            sim.currentSegmentBp,
            sim.maxSegmentBp,
            sim.shockwaves,
            sim.staggerWarningTimer,
            sim.floor
          );
        }
      }

      // Sync React HUD at ~15Hz
      hudSyncAccum += dt;
      if (hudSyncAccum >= 0.065) {
        hudSyncAccum = 0;
        const sim = simRef.current;
        setHudState({
          waveElapsed: sim.waveElapsed,
          isBerserk: sim.isBerserk,
          staggerSegments: sim.staggerSegments,
          currentSegmentBp: sim.currentSegmentBp,
          maxSegmentBp: sim.maxSegmentBp,
          isStaggered: sim.isStaggered,
          staggerTimer: sim.staggerTimer,
          staggerWarningTimer: sim.staggerWarningTimer,
          manualFocusId: sim.manualFocusId,
          cutIn: sim.cutIn ? { ...sim.cutIn } : null,
          heroes: sim.heroes.map((h) => ({ ...h })),
          bossParts: sim.bossParts.map((b) => ({ ...b })),
          combatLog: sim.combatLog,
          guildRaidDamage: sim.guildRaidDamage,
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    shellState,
    blessingChoices,
    showWiki,
    sanctuariesModalOpen,
    merchantHubOpen,
    gachaRevealCards,
    autoUltimate,
    cutInEnabled,
    blessings,
    constellations,
    partyResonance,
    battleSubMode,
    initFloorWave,
    floor,
  ]);

  // 6.0s Auto-Card Countdown for Every-5-Floor Tarot Pop-up (Auto-flips at <= 2.0s, selects Card #1 at 0.0s)
  useEffect(() => {
    if (!blessingChoices || blessingChoices.length === 0) return;
    const iv = setInterval(() => {
      setTarotAutoTimer((prev) => {
        if (prev <= 2.2) {
          setTarotFlipped([true, true, true]);
        }
        if (prev <= 0.2) {
          const card = blessingChoices[0];
          if (card) {
            setBlessings((b) => ({ ...b, [card.id]: Math.min(3, (b[card.id] || 0) + 1) }));
          }
          setBlessingChoices(null);
          sfx.play('gacha');
          return 6.0;
        }
        return Number((prev - 0.2).toFixed(1));
      });
    }, 200);
    return () => clearInterval(iv);
  }, [blessingChoices]);

  // Keyboard shortcuts for Title Screen & Pause
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (shellState === 'TITLE_MENU' && (e.code === 'Enter' || e.code === 'Space')) {
        e.preventDefault();
        setShellState('PLAYING');
      } else if (e.code === 'Escape') {
        if (showWiki) setShowWiki(false);
        else if (shellState === 'PLAYING') setShellState('PAUSED');
        else if (shellState === 'PAUSED') setShellState('PLAYING');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shellState, showWiki]);

  // Handle Canvas Click for Manual Tap-to-Focus (Module 2.2)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    const sim = simRef.current;
    for (const part of sim.bossParts) {
      if (!part.alive) continue;
      const dist = Math.hypot(cx - part.x, cy - part.y);
      if (dist <= 65) {
        sim.manualFocusId = sim.manualFocusId === part.id ? null : part.id;
        sfx.play('hit');
        return;
      }
    }
  };

  // --- ACTIONS FOR HEROES, FORGE, SUMMON, DOMAINS & CHRONO REWIND ---
  const handleLevelUpHero = (heroId: string, levels = 5) => {
    const prog = heroProgress[heroId];
    if (!prog || prog.level >= 100) return;
    const cost = prog.level * 120;
    if (gold < cost) return;
    setGold((g) => g - cost);
    sfx.play('forge_ok');
    setHeroProgress((prev) => ({
      ...prev,
      [heroId]: { ...prev[heroId], level: Math.min(100, prev[heroId].level + levels) },
    }));
  };

  const handleAscendStar = (heroId: string) => {
    const prog = heroProgress[heroId];
    if (!prog || prog.stars >= 5) return;
    const gemCost = (prog.stars - 1) * 400;
    if (starlightGems < gemCost) return;
    setStarlightGems((s) => s - gemCost);
    sfx.play('gacha');
    setHeroProgress((prev) => ({
      ...prev,
      [heroId]: { ...prev[heroId], stars: prev[heroId].stars + 1 },
    }));
  };

  const handleUpgradeSkill = (heroId: string, key: 'basic' | 'active' | 'chain' | 'ultimate') => {
    const prog = heroProgress[heroId];
    const curLv = prog.skillLevels[key];
    if (curLv >= 10) return;
    const cost = curLv * 350;
    if (gold < cost) return;
    setGold((g) => g - cost);
    sfx.play('forge_ok');
    setHeroProgress((prev) => ({
      ...prev,
      [heroId]: {
        ...prev[heroId],
        skillLevels: { ...prev[heroId].skillLevels, [key]: curLv + 1 },
      },
    }));
  };

  const handleEnhanceGear = (gearId: string) => {
    const gear = gearInventory.find((g) => g.id === gearId);
    if (!gear || gear.level >= 15) return;
    const nextLv = gear.level + 1;
    const cost = nextLv * 250;
    if (gold < cost) return;
    setGold((g) => g - cost);

    const successRate = calculateCurrentSuccessRate(nextLv, gear.failStackCount);
    const roll = Math.random() * 100;
    const isSuccess = roll < successRate;

    if (isSuccess) {
      sfx.play('forge_ok');
      setForgeFeedback({ text: `SUCCESS! Enhanced to +${nextLv} (Fail Stack reset to 0%)`, success: true });
      setGearInventory((prev) =>
        prev.map((item) => {
          if (item.id !== gearId) return item;
          const baseUpdated: GearItem = { ...item, level: nextLv, failStackCount: 0 };
          return rollMilestoneSubstat(baseUpdated, nextLv);
        })
      );
    } else {
      sfx.play('forge_fail');
      const rule = getEnhanceRule(nextLv);
      const newFailCount = gear.failStackCount + 1;
      const nextRate = calculateCurrentSuccessRate(nextLv, newFailCount);
      setForgeFeedback({
        text: `FAILED (+${nextLv}) — Artisan's Pity +${rule.failStackBonus}% stacked! Next chance: ${nextRate}%`,
        success: false,
      });
      setGearInventory((prev) =>
        prev.map((item) => (item.id === gearId ? { ...item, failStackCount: newFailCount } : item))
      );
    }
  };

  const handleForgeNewRelic = (set: SetId, slot: GearSlot) => {
    const cost = 900;
    if (gold < cost) return;
    setGold((g) => g - cost);
    sfx.play('forge_ok');

    const ringPool: StatKey[] = [
      'CRIT RATE%',
      'CRIT DMG%',
      'ATK%',
      'HP%',
      'DEF%',
      'EFFECT HIT RATE%',
      'HEALING BONUS%',
    ];
    const sigilPool: StatKey[] = ['BREAK POWER%', 'ENERGY CHARGE%', 'EFFECT HIT RATE%', 'SPD'];
    const mainKey: StatKey =
      slot === 'Weapon'
        ? 'ATK%'
        : slot === 'Armor'
        ? 'DEF%'
        : slot === 'Ring I' || slot === 'Ring II'
        ? ringPool[Math.floor(Math.random() * ringPool.length)]
        : sigilPool[Math.floor(Math.random() * sigilPool.length)];

    const setSpec = EQUIPMENT_SETS.find((s) => s.id === set);
    const sigilTrait =
      slot === 'Core Sigil'
        ? SIGIL_CORE_TRAITS[Math.floor(Math.random() * SIGIL_CORE_TRAITS.length)]
        : undefined;

    const newGear: GearItem = {
      id: `G_FORGED_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      name: `${setSpec?.displayName || set} ${slot}`,
      slot,
      set,
      level: 0,
      failStackCount: 0,
      mainStatKey: mainKey,
      baseMainValue: mainKey === 'CRIT DMG%' ? 16 : mainKey === 'SPD' ? 6 : 10,
      baseFlatStat: slot === 'Weapon' ? 125 : slot === 'Armor' ? 880 : undefined,
      substats: [],
      sigilTrait,
      equippedBy: selectedHeroId,
    };

    setGearInventory((prev) => {
      const unequipped = prev.map((it) =>
        it.equippedBy === selectedHeroId && it.slot === slot ? { ...it, equippedBy: undefined } : it
      );
      return [newGear, ...unequipped];
    });
    setSelectedGearId(newGear.id);
  };

  const DOMAIN_TIER_SPECS: Record<
    1 | 2 | 3 | 4 | 5,
    {
      roman: string;
      name: string;
      minFloor: number;
      minCp: number;
      bossFloor: number;
      goldReward: number;
      gemReward: number;
      baseGearLv: number;
      fiveStarChance: number;
      sigilChance: number;
      exoticSigil: boolean;
      dropSummary: string;
    }
  > = {
    1: {
      roman: 'Tier I',
      name: 'Novice',
      minFloor: 1,
      minCp: 10000,
      bossFloor: 5,
      goldReward: 12500,
      gemReward: 200,
      baseGearLv: 0,
      fiveStarChance: 0,
      sigilChance: 0,
      exoticSigil: false,
      dropSummary: '3★–4★ Gear · 12,500 Gold',
    },
    2: {
      roman: 'Tier II',
      name: 'Adept',
      minFloor: 10,
      minCp: 22000,
      bossFloor: 10,
      goldReward: 28000,
      gemReward: 320,
      baseGearLv: 1,
      fiveStarChance: 0.15,
      sigilChance: 0,
      exoticSigil: false,
      dropSummary: 'Guaranteed 4★ (15% 5★) · 28,000 Gold',
    },
    3: {
      roman: 'Tier III',
      name: 'Master',
      minFloor: 20,
      minCp: 38000,
      bossFloor: 20,
      goldReward: 55000,
      gemReward: 480,
      baseGearLv: 2,
      fiveStarChance: 0.45,
      sigilChance: 0.1,
      exoticSigil: false,
      dropSummary: '45% 5★ · 10% Core Sigil · 55,000 Gold',
    },
    4: {
      roman: 'Tier IV',
      name: 'Grandmaster',
      minFloor: 35,
      minCp: 60000,
      bossFloor: 35,
      goldReward: 95000,
      gemReward: 650,
      baseGearLv: 2,
      fiveStarChance: 1.0,
      sigilChance: 0.25,
      exoticSigil: false,
      dropSummary: 'Guaranteed 5★ · 25% Core Sigil · 95,000 Gold',
    },
    5: {
      roman: 'Tier V',
      name: 'Abyssal',
      minFloor: 50,
      minCp: 90000,
      bossFloor: 50,
      goldReward: 160000,
      gemReward: 900,
      baseGearLv: 3,
      fiveStarChance: 1.0,
      sigilChance: 0.5,
      exoticSigil: true,
      dropSummary: 'Guaranteed 5★ (+3) · 50% Exotic Core Sigil · 160,000 Gold',
    },
  };

  function grantDomainTierReward(
    domainId: 'BOUNTY' | 'STRIKER' | 'DEFENDER' | 'TACTICIAN',
    tier: 1 | 2 | 3 | 4 | 5,
    viaSweep: boolean
  ) {
    const spec = DOMAIN_TIER_SPECS[tier];
    sfx.play('forge_ok');

    if (domainId === 'BOUNTY') {
      setGold((g) => g + spec.goldReward);
      setStarlightGems((s) => s + spec.gemReward);
      setDomainFeedback(
        `${viaSweep ? '⚡ SWEEP' : '🏆 BOSS CLEARED'} [Bounty ${spec.roman}]: +${spec.goldReward.toLocaleString()} Gold & +${spec.gemReward} Starlight Gems!`
      );
      return;
    }

    const setsByDomain: Record<'STRIKER' | 'DEFENDER' | 'TACTICIAN', SetId[]> = {
      STRIKER: ['Starfall Executioner', 'Eclipse', 'Volatus'],
      DEFENDER: ['Titan', 'Radiant Dawn'],
      TACTICIAN: ['Astral Nexus', 'Overload', 'Voidweaver'],
    };
    const pool = setsByDomain[domainId];
    const pickedSet = pool[Math.floor(Math.random() * pool.length)];
    const dropSigil = Math.random() < spec.sigilChance;
    const slots: GearSlot[] = ['Weapon', 'Armor', 'Ring I', 'Ring II'];
    const pickedSlot: GearSlot = dropSigil ? 'Core Sigil' : slots[Math.floor(Math.random() * slots.length)];
    const isFiveStar = Math.random() < spec.fiveStarChance;
    const setSpec = EQUIPMENT_SETS.find((s) => s.id === pickedSet);
    const mainKey: StatKey =
      pickedSlot === 'Weapon'
        ? 'ATK%'
        : pickedSlot === 'Armor'
        ? 'DEF%'
        : pickedSlot === 'Core Sigil'
        ? 'BREAK POWER%'
        : pickedSet === 'Voidweaver'
        ? 'EFFECT HIT RATE%'
        : 'CRIT RATE%';

    const sigilTrait =
      pickedSlot === 'Core Sigil' && (spec.exoticSigil || isFiveStar)
        ? SIGIL_CORE_TRAITS[Math.floor(Math.random() * SIGIL_CORE_TRAITS.length)]
        : undefined;

    const starPrefix = isFiveStar ? '5★ ' : tier >= 2 ? '4★ ' : '3★ ';
    const lootedGear: GearItem = {
      id: `G_DOMAIN_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      name: `${starPrefix}${sigilTrait ? 'Exotic ' : ''}${setSpec?.displayName || pickedSet} ${pickedSlot}`,
      slot: pickedSlot,
      set: pickedSet,
      level: spec.baseGearLv + (isFiveStar ? 1 : 0),
      failStackCount: 0,
      mainStatKey: mainKey,
      baseMainValue: isFiveStar ? 12 : 10,
      baseFlatStat: pickedSlot === 'Weapon' ? 125 : pickedSlot === 'Armor' ? 880 : undefined,
      substats: isFiveStar
        ? [
            { stat: 'CRIT RATE%', value: 6 },
            { stat: 'EFFECT HIT RATE%', value: 6 },
          ]
        : [{ stat: 'EFFECT HIT RATE%', value: 5 }],
      sigilTrait,
      equippedBy: selectedHeroId,
    };

    setGearInventory((prev) => {
      const unequipped = prev.map((it) =>
        it.equippedBy === selectedHeroId && it.slot === pickedSlot ? { ...it, equippedBy: undefined } : it
      );
      return [lootedGear, ...unequipped];
    });
    setSelectedGearId(lootedGear.id);
    const bonusGold = Math.round(spec.goldReward * 0.35);
    setGold((g) => g + bonusGold);
    setDomainFeedback(
      `${viaSweep ? '⚡ SWEEP' : '🏆 BOSS CLEARED'} [${domainId} ${spec.roman}]: Looted ${lootedGear.name} (+${lootedGear.level}) & +${bonusGold.toLocaleString()} Gold!`
    );
  }

  const handleChallengeDomainBoss = (
    domainId: 'BOUNTY' | 'STRIKER' | 'DEFENDER' | 'TACTICIAN',
    tier: 1 | 2 | 3 | 4 | 5
  ) => {
    const spec = DOMAIN_TIER_SPECS[tier];
    if (weeklyKeys <= 0 || highestFloor < spec.minFloor || squadCP < spec.minCp) return;
    setWeeklyKeys((k) => k - 1);
    const challenge = { domainId, tier };
    setActiveDomainChallenge(challenge);
    activeDomainChallengeRef.current = challenge;
    setBattleSubMode('SPIRE');
    initFloorWave(spec.bossFloor, false, 'SPIRE');
    pushLog(`ENTERED ${domainId} ${spec.roman} (${spec.name}) BOSS CHALLENGE! Defeat the Guardian to unlock Sweep!`);
  };

  const handleSweepDomain = (
    domainId: 'BOUNTY' | 'STRIKER' | 'DEFENDER' | 'TACTICIAN',
    tier: 1 | 2 | 3 | 4 | 5
  ) => {
    const clearKey = `${domainId}_${tier}`;
    if (weeklyKeys <= 0 || sweepTickets <= 0 || !clearedDomainTiers[clearKey]) return;
    setWeeklyKeys((k) => k - 1);
    setSweepTickets((t) => t - 1);
    grantDomainTierReward(domainId, tier, true);
  };

  const handleBuySweepTickets = (count: 1 | 10) => {
    const cost = count === 1 ? 15000 : 135000;
    if (gold < cost) return;
    setGold((g) => g - cost);
    setSweepTickets((t) => t + count);
    sfx.play('gacha');
    setDomainFeedback(`🛒 Purchased +${count} 🎫 Sweep Ticket${count > 1 ? 's' : ''} for ${cost.toLocaleString()} Gold!`);
  };

  const handleRedeemGuildSigil = () => {
    if (guildMedals < 100) return;
    setGuildMedals((m) => m - 100);
    sfx.play('gacha');
    const trait = SIGIL_CORE_TRAITS[Math.floor(Math.random() * SIGIL_CORE_TRAITS.length)];
    const sigil: GearItem = {
      id: `G_SIGIL_${Date.now()}`,
      name: `Exotic Voidweaver Core Sigil`,
      slot: 'Core Sigil',
      set: 'Voidweaver',
      level: 6,
      failStackCount: 0,
      mainStatKey: 'EFFECT HIT RATE%',
      baseMainValue: 10,
      substats: [
        { stat: 'SPD', value: 6 },
        { stat: 'BREAK POWER%', value: 12 },
      ],
      sigilTrait: trait,
      equippedBy: selectedHeroId,
    };
    setGearInventory((prev) => {
      const unequipped = prev.map((it) =>
        it.equippedBy === selectedHeroId && it.slot === 'Core Sigil' ? { ...it, equippedBy: undefined } : it
      );
      return [sigil, ...unequipped];
    });
    setSelectedGearId(sigil.id);
  };

  const handleSummonPull = (count: 1 | 10, forceFreeFirstPull = false) => {
    const isFreeFirst = forceFreeFirstPull || (!hasDoneFirstFreePull && count === 1);
    const cost = isFreeFirst ? 0 : count * 160;
    if (starlightGems < cost) return;
    if (cost > 0) setStarlightGems((s) => s - cost);
    if (isFreeFirst) setHasDoneFirstFreePull(true);

    // 1 Pull = 1 Starfall Shard
    setStarfallShards((sh) => sh + count);
    sfx.play('gacha');

    const results: { name: string; rarity: string; note: string }[] = [];
    const revealCards: GachaRevealCard[] = [];
    const bonusRelics: GearItem[] = [];
    let curPity = gachaPity;
    const updatedProg = { ...heroProgress };

    const ssrPool = RESONATORS.filter((r) => r.rarity === 'SSR');
    const srPool = RESONATORS.filter((r) => r.rarity === 'SR');
    const rPool = RESONATORS.filter((r) => r.rarity === 'R');

    for (let i = 0; i < count; i++) {
      // Tutorial First Pull Guarantee: 100% SR Unlock!
      if (isFreeFirst && i === 0) {
        const lockedSr = srPool.filter((r) => !updatedProg[r.id]?.unlocked);
        const pickSr =
          lockedSr.length > 0
            ? lockedSr[Math.floor(Math.random() * lockedSr.length)]
            : srPool[Math.floor(Math.random() * srPool.length)];
        const p = updatedProg[pickSr.id];
        const wasLocked = !p.unlocked;
        updatedProg[pickSr.id] = {
          ...p,
          unlocked: true,
          stars: wasLocked ? 2 : Math.min(5, p.stars + 1),
          level: wasLocked ? p.level : Math.min(100, p.level + 3),
        };
        const noteText = wasLocked ? 'NEW SR UNLOCKED! (Tutorial 100% SR)' : `Promoted to ${updatedProg[pickSr.id].stars}★!`;
        results.push({ name: pickSr.name, rarity: 'SR', note: noteText });
        revealCards.push({
          uid: `PULL_${Date.now()}_${i}`,
          hero: pickSr,
          actualRarity: 'SR',
          displayRarity: 'SR',
          isFakeOut: false,
          flipped: false,
          shattering: false,
          note: noteText,
        });
        continue;
      }

      curPity += 1;
      const roll = Math.random();
      const isSSR = curPity >= 30 || roll < 0.08;
      if (isSSR) {
        curPity = 0;
        const wishlistPool = ssrPool.filter((r) => wishlistIds.includes(r.id));
        const nonWishlistPool = ssrPool.filter((r) => !wishlistIds.includes(r.id));

        let picked = ssrPool[Math.floor(Math.random() * ssrPool.length)];
        if (activeBannerId === 'RATE_UP' && Math.random() < 0.65) {
          picked = RESONATORS.find((r) => r.id === featuredBannerHeroId) || picked;
        } else if (activeBannerId === 'STANDARD' && wishlistPool.length > 0) {
          if (Math.random() < 0.7 || nonWishlistPool.length === 0) {
            picked = wishlistPool[Math.floor(Math.random() * wishlistPool.length)];
          } else {
            picked = nonWishlistPool[Math.floor(Math.random() * nonWishlistPool.length)];
          }
        }

        const p = updatedProg[picked.id];
        const wasLocked = !p.unlocked;
        let noteText = '';
        if (wasLocked) {
          updatedProg[picked.id] = { ...p, unlocked: true, stars: 3 };
          noteText = 'NEW SSR SOVEREIGN UNLOCKED!';
        } else if (p.stars < 5) {
          updatedProg[picked.id] = { ...p, stars: p.stars + 1 };
          noteText = `Promoted to ${p.stars + 1}★!`;
        } else {
          updatedProg[picked.id] = { ...p, level: Math.min(100, p.level + 5) };
          noteText = 'Max 5★ Resonance (+5 Lv)';
        }
        results.push({ name: picked.name, rarity: 'SSR', note: noteText });

        // 25% Fake-Out Shatter Chance (SR Purple Aura -> Shatters into Gold SSR!)
        const isFakeOut = Math.random() < 0.25;
        revealCards.push({
          uid: `PULL_${Date.now()}_${i}`,
          hero: picked,
          actualRarity: 'SSR',
          displayRarity: isFakeOut ? 'SR' : 'SSR',
          isFakeOut,
          flipped: false,
          shattering: false,
          note: noteText,
        });
      } else if (roll < 0.4) {
        const picked = srPool[Math.floor(Math.random() * srPool.length)] || RESONATORS[0];
        const p = updatedProg[picked.id];
        const wasLocked = !p.unlocked;
        let noteText = '';
        if (wasLocked) {
          updatedProg[picked.id] = { ...p, unlocked: true, stars: 2 };
          noteText = 'NEW SR RESONATOR UNLOCKED!';
        } else if (p.stars < 5) {
          updatedProg[picked.id] = { ...p, stars: p.stars + 1, level: Math.min(100, p.level + 2) };
          noteText = `Promoted to ${p.stars + 1}★ (+2 Lv)!`;
        } else {
          updatedProg[picked.id] = { ...p, level: Math.min(100, p.level + 4) };
          noteText = '+4 Resonator Lv & +1 Starfall Shard';
        }
        results.push({ name: picked.name, rarity: 'SR', note: noteText });
        revealCards.push({
          uid: `PULL_${Date.now()}_${i}`,
          hero: picked,
          actualRarity: 'SR',
          displayRarity: 'SR',
          isFakeOut: false,
          flipped: false,
          shattering: false,
          note: noteText,
        });
      } else {
        // Normal Roll: Drops an R Resonator Card (upgrades R stars/levels) + a 3★–4★ Relic
        const pickedR = rPool[Math.floor(Math.random() * rPool.length)] || RESONATORS[RESONATORS.length - 1];
        const p = updatedProg[pickedR.id];
        const nextStars = p.stars < 5 ? p.stars + 1 : p.stars;
        updatedProg[pickedR.id] = {
          ...p,
          unlocked: true,
          stars: nextStars,
          level: Math.min(100, p.level + 2),
        };
        const randSet = EQUIPMENT_SETS[Math.floor(Math.random() * EQUIPMENT_SETS.length)];
        const slots: GearSlot[] = ['Weapon', 'Armor', 'Ring I', 'Ring II'];
        const randSlot = slots[Math.floor(Math.random() * slots.length)];
        const isFourStar = Math.random() < 0.45;
        const relicName = `${isFourStar ? '4★' : '3★'} ${randSet.displayName} ${randSlot}`;
        bonusRelics.push({
          id: `G_PULL_${Date.now()}_${i}_${Math.floor(Math.random() * 999)}`,
          name: relicName,
          slot: randSlot,
          set: randSet.id,
          level: isFourStar ? 1 : 0,
          failStackCount: 0,
          mainStatKey: randSlot === 'Weapon' ? 'ATK%' : randSlot === 'Armor' ? 'DEF%' : 'CRIT RATE%',
          baseMainValue: isFourStar ? 10 : 8,
          baseFlatStat: randSlot === 'Weapon' ? 125 : randSlot === 'Armor' ? 880 : undefined,
          substats: [{ stat: 'ATK%', value: 4 }],
        });
        const noteText = `${p.stars < 5 ? `Promoted to ${nextStars}★` : '+2 Lv'} · +${relicName}`;
        results.push({
          name: pickedR.name,
          rarity: 'R',
          note: noteText,
        });
        revealCards.push({
          uid: `PULL_${Date.now()}_${i}`,
          hero: pickedR,
          actualRarity: 'R',
          displayRarity: 'R',
          isFakeOut: false,
          flipped: false,
          shattering: false,
          note: noteText,
          bonusRelicName: relicName,
        });
      }
    }

    if (bonusRelics.length > 0) {
      setGearInventory((prev) => [...bonusRelics, ...prev]);
    }
    setGold((g) => g + count * 500);
    setGachaPity(curPity);
    setHeroProgress(updatedProg);
    setRecentPulls(results);
    setGachaRevealCards(revealCards);
  };

  const handleChronoRewind = () => {
    const piscesStars = (constellations['PISCES'] || 0) + (constellations['AQUARIUS'] || 0);
    const shardMult = 1 + (piscesStars * 6) / 100;
    const earned = Math.max(25, Math.round(floor * 28 * shardMult));
    setTimeShards((t) => t + earned);
    setFloor(1);
    setBlessings({ ARCANA_19: 1 });
    sfx.play('stagger');
    setBattleSubMode('SPIRE');
    initFloorWave(1, false, 'SPIRE');
    if (shellState === 'GAME_OVER') setShellState('PLAYING');
    setActiveTab('BATTLE');
  };

  const selectedHeroData = RESONATORS.find((r) => r.id === selectedHeroId) || RESONATORS[0];
  const selectedHeroProg = heroProgress[selectedHeroData.id];
  const selectedHeroStats = computedStatsMap[selectedHeroData.id];
  const selectedGear = gearInventory.find((g) => g.id === selectedGearId) || gearInventory[0];
  const featuredBannerHero = RESONATORS.find((r) => r.id === featuredBannerHeroId) || RESONATORS[0];

  // --- TITLE SCREEN SHELL ---
  if (shellState === 'TITLE_MENU') {
    return (
      <div className="relative w-screen h-screen bg-[#05070f] overflow-hidden flex flex-col justify-between p-8 select-none">
        {/* Atmospheric Starfall Backdrop */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 32%, rgba(56, 189, 248, 0.16) 0%, rgba(147, 51, 234, 0.12) 38%, rgba(5, 7, 15, 0.98) 78%)',
          }}
        />

        {/* Top Bar Info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400">
          <span>Chrono Spire: Starfall Protocol · Master Blueprint Build v2.1</span>
        </div>

        {/* Center Bespoke SVG Title Lockup & Hero Centerpiece */}
        <div className="relative z-10 max-w-4xl mx-auto text-center my-auto space-y-6">
          <svg viewBox="0 0 680 150" className="w-full max-w-2xl mx-auto">
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#fef08a" />
              </linearGradient>
            </defs>
            <polygon points="340,8 354,48 395,55 354,62 340,102 326,62 285,55 326,48" fill="url(#goldGrad)" opacity="0.28" />
            <circle cx="340" cy="55" r="42" fill="none" stroke="url(#goldGrad)" strokeWidth="1.2" strokeDasharray="4 4" />
            <text
              x="340"
              y="72"
              textAnchor="middle"
              fill="url(#goldGrad)"
              fontFamily="Cinzel, Georgia, serif"
              fontWeight="700"
              fontSize="44"
              letterSpacing="5"
            >
              CHRONO SPIRE
            </text>
            <text
              x="340"
              y="108"
              textAnchor="middle"
              fill="#bae6fd"
              fontFamily="Plus Jakarta Sans, sans-serif"
              fontWeight="600"
              fontSize="14"
              letterSpacing="8"
            >
              STARFALL PROTOCOL
            </text>
          </svg>

          <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed">
            Ascend the spire, break the ancient gods, and reclaim destiny through the sands of time.
          </p>

          <div className="pt-2 flex items-center justify-center gap-4">
            <button
              onClick={() => setShellState('PLAYING')}
              className="px-8 py-3.5 text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-lg shadow-amber-500/20 transition-colors cursor-pointer"
            >
              Enter the Spire
            </button>
            <button
              onClick={() => setShowWiki(true)}
              className="px-6 py-3.5 text-sm font-medium text-slate-200 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Game Wiki & Balance
            </button>
          </div>
        </div>

        {/* Single Flat Control-Hint Line */}
        <div className="relative z-10 text-center text-xs text-slate-400 font-mono">
          Enter / Space Start · Click Enemy Part Tap-to-Focus · Esc Pause
        </div>

        {showWiki && <WikiModal onClose={() => setShowWiki(false)} />}
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#05070f] text-slate-100 select-none">
      {/* TOP BAR: Spire Floor, Zone Name, Primary Sanctuaries & Merchant Hub Buttons, Currencies & Audio */}
      <header className="flex items-center justify-between gap-3 px-4 py-2 bg-[#0a0d18] border-b border-slate-800/90 text-xs font-mono tabular-nums shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-base font-bold tracking-wider text-amber-300 font-display whitespace-nowrap">
            Chrono Spire
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-300 whitespace-nowrap">
            Floor <strong className="text-amber-300">F{floor}</strong>{' '}
            <span className="text-slate-400">
              ({ZONE_PARALLAX_ASSETS[Math.min(4, Math.floor((floor - 1) / 20))]?.name || 'Void Corridor'} ·{' '}
              {floor % 5 === 0 ? 'Old God Boss' : `Boss at F${Math.ceil(floor / 5) * 5}`})
            </span>
          </span>
          <button
            onClick={() => setSanctuariesModalOpen(true)}
            className="ml-1 px-2.5 py-1 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/70 text-amber-200 font-bold text-[11px] cursor-pointer whitespace-nowrap shadow-sm"
          >
            [🏰 Sanctuaries &amp; Challenges]
          </button>
          <button
            onClick={() => setMerchantHubOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/70 text-rose-200 font-bold text-[11px] cursor-pointer whitespace-nowrap shadow-sm"
          >
            [🛒 Merchant Hub]
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <span>
            Gold: <strong className="text-amber-300">{gold.toLocaleString()}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Starlight: <strong className="text-sky-300">{starlightGems.toLocaleString()}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Shards: <strong className="text-rose-300">{starfallShards}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Time: <strong className="text-purple-300">{timeShards.toLocaleString()}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => setCutInEnabled((v) => !v)}
            className={`px-2 py-1 rounded border text-[11px] cursor-pointer whitespace-nowrap ${
              cutInEnabled
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            Cut-In: {cutInEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => setAutoUltimate((v) => !v)}
            className={`px-2 py-1 rounded border text-[11px] cursor-pointer whitespace-nowrap ${
              autoUltimate
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                : 'bg-slate-900 border-slate-800 text-slate-400'
            }`}
          >
            Auto-Ult: {autoUltimate ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={() => {
              sfx.generateLyriaBgm(bgmTheme);
            }}
            title={
              bgmStatus === 'LYRIA_ACTIVE'
                ? `Lyria 3 AI BGM Active (${bgmTheme} Theme)`
                : 'Generate Lyria 3 AI BGM Track (Procedural Web Audio synth plays automatically while loading)'
            }
            className={`px-2 py-1 rounded border text-[11px] cursor-pointer whitespace-nowrap ${
              bgmStatus === 'LYRIA_ACTIVE'
                ? 'bg-purple-500/20 border-purple-400/60 text-purple-200'
                : bgmStatus === 'LYRIA_LOADING'
                ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            {bgmStatus === 'LYRIA_ACTIVE'
              ? `🎵 Lyria 3 (${bgmTheme === 'BOSS' ? 'Boss' : 'Spire'})`
              : bgmStatus === 'LYRIA_LOADING'
              ? '⏳ Lyria 3...'
              : '🎵 Lyria BGM'}
          </button>
          <button
            onClick={() => {
              const next = !muted;
              setMuted(next);
              sfx.setMuted(next);
            }}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer whitespace-nowrap"
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            onClick={() => setShellState((s) => (s === 'PAUSED' ? 'PLAYING' : 'PAUSED'))}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white cursor-pointer whitespace-nowrap"
          >
            {shellState === 'PAUSED' ? '▶ Resume' : '⏸ Pause'}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT VIEWPORT */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {/* ============================================================
            TAB 1: TOWER BATTLE (HD-2D 5-HERO TACTICAL ARENA + SUB-MODES)
           ============================================================ */}
        {activeTab === 'BATTLE' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between relative bg-[#05070f]">
            {/* PINNED TOP-RIGHT SANCTUARIES & MERCHANT HUB DOCK */}
            <div className="absolute top-2 right-3 z-40 flex items-center gap-2">
              {battleSubMode !== 'SPIRE' && (
                <button
                  onClick={() => {
                    setBattleSubMode('SPIRE');
                    initFloorWave(floor, false, 'SPIRE');
                  }}
                  className="px-2.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-bold text-[10px] shadow-xl cursor-pointer whitespace-nowrap"
                >
                  ↩ Return to Spire F{floor}
                </button>
              )}
              <button
                onClick={() => setSanctuariesModalOpen(true)}
                className="py-1.5 px-2.5 rounded-xl border border-amber-400/70 bg-[#0a0d18]/90 hover:bg-amber-500/20 text-amber-300 backdrop-blur-sm flex flex-col items-center justify-center gap-0.5 shadow-xl cursor-pointer"
              >
                <span className="text-sm leading-none">🏰</span>
                <span className="text-[10px] font-display font-bold tracking-tight whitespace-nowrap">
                  Sanctuaries
                </span>
                <span className="text-[8px] font-mono text-slate-300 tabular-nums whitespace-nowrap">
                  {weeklyKeys}/15🗝️ · {guildAttempts}/3🐉
                </span>
              </button>
              <button
                onClick={() => setMerchantHubOpen(true)}
                className="py-1.5 px-2.5 rounded-xl border border-rose-400/70 bg-[#0a0d18]/90 hover:bg-rose-500/20 text-rose-200 backdrop-blur-sm flex flex-col items-center justify-center gap-0.5 shadow-xl cursor-pointer"
              >
                <span className="text-sm leading-none">🛒</span>
                <span className="text-[10px] font-display font-bold tracking-tight whitespace-nowrap">
                  Merchant Hub
                </span>
                <span className="text-[8px] font-mono text-slate-300 tabular-nums whitespace-nowrap">
                  {starfallShards}🌟 · {arenaTokens}🏆 · {guildMedals}🎖️
                </span>
              </button>
            </div>

            {battleSubMode === 'DOMAINS' ? (
              /* SUB-MODE: 5-TIER GEAR & GOLD DUNGEON (CHALLENGE BOSS + SWEEP TICKET GOLD SINK) */
              <div className="flex-1 min-h-0 p-4 pt-16 overflow-y-auto max-w-7xl mx-auto w-full flex flex-col justify-between gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0a0d18] border border-slate-800 rounded-xl px-4 py-2.5">
                  <div>
                    <div className="text-[10px] font-mono text-amber-300 uppercase flex items-center gap-1.5">
                      <span>
                        5-Tier Sanctuaries · Clear Boss First to Unlock Sweep · ⚔️ Squad CP: {squadCP.toLocaleString()}
                      </span>
                      <CPInfoTooltip title="How Squad CP Works" formula={SQUAD_CP_FORMULA} />
                    </div>
                    <h2 className="text-base font-bold text-white font-display">
                      Gear &amp; Gold Dungeon — Weekly Keys: <span className="text-amber-300">{weeklyKeys}/15</span> · 🎫 Sweep Tickets:{' '}
                      <span className="text-emerald-300">{sweepTickets}</span>
                    </h2>
                  </div>

                  {/* Gold Sink Sweep Ticket Purchase Bar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      disabled={gold < 15000}
                      onClick={() => handleBuySweepTickets(1)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/60 disabled:opacity-40 text-amber-200 text-xs font-mono font-bold cursor-pointer"
                    >
                      [🛒 Buy 1x 🎫: 15,000 Gold]
                    </button>
                    <button
                      disabled={gold < 135000}
                      onClick={() => handleBuySweepTickets(10)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 text-xs font-mono font-bold cursor-pointer"
                    >
                      [Buy 10x 🎫: 135,000 Gold]
                    </button>
                    <button
                      onClick={() => setWeeklyKeys(15)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-sky-300 cursor-pointer"
                    >
                      [Reset Keys 15/15]
                    </button>
                  </div>
                </div>

                {domainFeedback && (
                  <div className="bg-emerald-500/15 border border-emerald-400/50 rounded-lg px-4 py-1.5 text-xs font-mono text-emerald-200 flex items-center justify-between">
                    <span>{domainFeedback}</span>
                    <button onClick={() => setDomainFeedback(null)} className="text-slate-400 hover:text-white cursor-pointer">
                      ✕
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 flex-1 min-h-0">
                  {(
                    [
                      {
                        id: 'BOUNTY' as const,
                        title: 'Gold & Starlight Bounty',
                        subtitle: 'Treasury Sanctuary',
                        setsDesc: 'High-Yield Gold & Starlight Gems',
                        color: 'border-amber-400/60',
                        accentText: 'text-amber-300',
                      },
                      {
                        id: 'STRIKER' as const,
                        title: 'Domain I: Striker',
                        subtitle: 'Offensive Sanctuary',
                        setsDesc: 'Sets: Starfall · Eclipse · Volatus',
                        color: 'border-rose-400/60',
                        accentText: 'text-rose-300',
                      },
                      {
                        id: 'DEFENDER' as const,
                        title: 'Domain II: Defender',
                        subtitle: 'Fortress Sanctuary',
                        setsDesc: 'Sets: Titan · Radiant Dawn',
                        color: 'border-sky-400/60',
                        accentText: 'text-sky-300',
                      },
                      {
                        id: 'TACTICIAN' as const,
                        title: 'Domain III: Tactician',
                        subtitle: 'Reaction Sanctuary',
                        setsDesc: 'Sets: Astral Nexus · Overload · Omen',
                        color: 'border-purple-400/60',
                        accentText: 'text-purple-300',
                      },
                    ]
                  ).map((dom) => {
                    const selTier = selectedDomainTiers[dom.id];
                    const spec = DOMAIN_TIER_SPECS[selTier];
                    const clearKey = `${dom.id}_${selTier}`;
                    const isCleared = !!clearedDomainTiers[clearKey];
                    const reqMet = highestFloor >= spec.minFloor && squadCP >= spec.minCp;

                    return (
                      <div
                        key={dom.id}
                        className={`bg-[#0a0d18] border-2 ${dom.color} rounded-xl p-3.5 flex flex-col justify-between gap-2`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono text-slate-400 uppercase">{dom.subtitle}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                                isCleared
                                  ? 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-300'
                                  : 'bg-slate-900 border border-slate-700 text-slate-400'
                              }`}
                            >
                              {isCleared ? '✅ CLEARED' : '🔒 UNCLEARED'}
                            </span>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white font-display">{dom.title}</h3>
                            <p className="text-[11px] text-slate-400">{dom.setsDesc}</p>
                          </div>

                          {/* 5-Tier Selector Bar (Tier I - V) */}
                          <div className="grid grid-cols-5 gap-1 pt-0.5">
                            {([1, 2, 3, 4, 5] as const).map((t) => {
                              const tSpec = DOMAIN_TIER_SPECS[t];
                              const tCleared = !!clearedDomainTiers[`${dom.id}_${t}`];
                              const tUnlocked = highestFloor >= tSpec.minFloor && squadCP >= tSpec.minCp;
                              const active = selTier === t;
                              return (
                                <button
                                  key={t}
                                  onClick={() =>
                                    setSelectedDomainTiers((prev) => ({ ...prev, [dom.id]: t }))
                                  }
                                  className={`py-1 rounded border text-[10px] font-mono font-bold transition-all cursor-pointer ${
                                    active
                                      ? 'bg-amber-400 text-slate-950 border-amber-200 shadow'
                                      : tCleared
                                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                                      : tUnlocked
                                      ? 'bg-slate-900 border-slate-700 text-slate-200 hover:border-slate-500'
                                      : 'bg-slate-950 border-slate-800/80 text-slate-500'
                                  }`}
                                >
                                  {['I', 'II', 'III', 'IV', 'V'][t - 1]}
                                </button>
                              );
                            })}
                          </div>

                          {/* Selected Tier Requirements & Drops */}
                          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/90 space-y-1 text-[11px] font-mono">
                            <div className="flex items-center justify-between">
                              <span className={`font-bold ${dom.accentText}`}>
                                {spec.roman} ({spec.name})
                              </span>
                              <span className={`inline-flex items-center gap-1 ${reqMet ? 'text-emerald-400' : 'text-rose-400'}`}>
                                <span>F{spec.minFloor}+ · {spec.minCp.toLocaleString()} CP</span>
                              </span>
                            </div>
                            <div className="text-slate-300 text-[10px] leading-snug">{spec.dropSummary}</div>
                          </div>
                        </div>

                        {/* Two Action Buttons: Challenge Boss (-1 Key) & Sweep (-1 Key & -1 Ticket) */}
                        <div className="space-y-1.5 pt-1">
                          <button
                            disabled={weeklyKeys <= 0 || !reqMet}
                            onClick={() => handleChallengeDomainBoss(dom.id, selTier)}
                            className="w-full py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider bg-rose-500 hover:bg-rose-400 disabled:opacity-35 text-white cursor-pointer"
                          >
                            [⚔️ CHALLENGE BOSS (-1 KEY)]
                          </button>
                          <button
                            disabled={weeklyKeys <= 0 || sweepTickets <= 0 || !isCleared}
                            onClick={() => handleSweepDomain(dom.id, selTier)}
                            className="w-full py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider bg-amber-400 hover:bg-amber-300 disabled:opacity-35 text-slate-950 cursor-pointer"
                          >
                            {isCleared
                              ? '[⚡ SWEEP (-1 KEY & -1 🎫)]'
                              : '[🔒 CLEAR BOSS TO UNLOCK SWEEP]'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Guild Raid Medal Exchange & 1v1 Arena Token Bar */}
                <div className="bg-[#0a0d18] border border-amber-500/40 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-mono text-amber-300 uppercase">
                      Guild Raid &amp; Arena Armory · Exotic Core Sigil Forge
                    </div>
                    <div className="text-xs text-slate-300">
                      Guild Total Raid DMG:{' '}
                      <strong className="text-white">{guildTotalDamage.toLocaleString()}</strong> ·
                      Redeem <strong>100 Guild Medals ({guildMedals})</strong> for an Exotic +6{' '}
                      <strong className="text-purple-300">Core Sigil (with Sigil Core Trait)</strong>.
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <button
                      disabled={guildMedals < 100}
                      onClick={handleRedeemGuildSigil}
                      className="px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      [Redeem Exotic Core Sigil (100 Medals)]
                    </button>
                    <button
                      disabled={arenaTokens < 50}
                      onClick={() => {
                        if (arenaTokens < 50) return;
                        setArenaTokens((t) => t - 50);
                        setStarlightGems((g) => g + 480);
                        sfx.play('gacha');
                      }}
                      className="px-4 py-2 rounded-lg bg-sky-400 hover:bg-sky-300 disabled:opacity-40 text-slate-950 font-bold text-xs cursor-pointer"
                    >
                      [Exchange 50 Arena Tokens ({arenaTokens}) → 480 💎]
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Isolated 60FPS 2D Pixel Art HD-2D Canvas Arena (Spire Climber / 90s Guild Raid / 1v1 Async Arena) */
              <div className="relative flex-1 min-h-0 w-full overflow-hidden">
                <canvas
                  ref={canvasRef}
                  width={1040}
                  height={430}
                  onClick={handleCanvasClick}
                  style={{ imageRendering: 'pixelated' }}
                  className="w-full h-full object-fill cursor-crosshair block"
                />

                {/* 3-LAYER VERTICAL ENEMY / BOSS PART CONTAINERS ANCHORED TO 2D CANVAS */}
                <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
                  {hudState.bossParts
                    .filter((b) => b.alive && b.hp > 0)
                    .map((part) => {
                      const leftPct = (part.x / 1040) * 100;
                      const topPct = (part.y / 430) * 100;
                      const isMain = part.id === 'BOSS_MAIN';
                      const isFocused = hudState.manualFocusId === part.id;
                      const hpPct = Math.max(0, Math.min(100, (part.hp / Math.max(1, part.maxHp)) * 100));
                      const counterEl = getRecommendedCounterElement(part.element);
                      const elIcons: Record<string, string> = {
                        Fire: '🔥',
                        Cryo: '❄️',
                        Wind: '🌪️',
                        Electro: '⚡',
                        Light: '☀️',
                        Dark: '🌑',
                      };

                      // Merge identical status types into a single badge with stack count or remaining seconds
                      const mergedMap = new Map<
                        string,
                        { type: string; stacks: number; remaining: number }
                      >();
                      part.debuffs.forEach((d) => {
                        const prev = mergedMap.get(d.type);
                        if (prev) {
                          prev.stacks += d.stacks;
                          prev.remaining = Math.max(prev.remaining, d.remaining);
                        } else {
                          mergedMap.set(d.type, {
                            type: d.type,
                            stacks: d.stacks,
                            remaining: d.remaining,
                          });
                        }
                      });
                      if (part.freezeResistTimer > 0) {
                        mergedMap.set('FreezeImmunity', {
                          type: 'FreezeImmunity',
                          stacks: 1,
                          remaining: part.freezeResistTimer,
                        });
                      }
                      const mergedStatuses = Array.from(mergedMap.values());

                      const statusMeta: Record<string, { color: string; label: string }> = {
                        Burn: { color: '#f97316', label: 'Burn' },
                        Freeze: { color: '#38bdf8', label: 'Freeze' },
                        FreezeImmunity: { color: '#38bdf8', label: 'Freeze Immunity' },
                        Shock: { color: '#a855f7', label: 'Shock' },
                        Bleed: { color: '#10b981', label: 'Bleed' },
                        'Luminous Mark': { color: '#fbbf24', label: 'Luminous Mark' },
                        Corrosion: { color: '#9333ea', label: 'Corrosion' },
                        Defenseless: { color: '#ef4444', label: 'Defenseless' },
                        Slow: { color: '#38bdf8', label: 'Slow' },
                      };

                      return (
                        <div
                          key={part.id}
                          style={{
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            width: isMain ? '124px' : '92px',
                            height: isMain ? '118px' : '82px',
                          }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-between select-none"
                        >
                          {/* LAYER 1 (ABOVE HEAD -top-7): 22x22px SVG Status Badges ONLY (Zero Text Labels) */}
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center justify-center gap-1 whitespace-nowrap">
                            {mergedStatuses.map((st) => {
                              const meta = statusMeta[st.type] || {
                                color: '#94a3b8',
                                label: st.type,
                              };
                              const badgeSub =
                                st.stacks > 1
                                  ? `x${st.stacks}`
                                  : `${st.remaining.toFixed(1)}s`;
                              return (
                                <div
                                  key={st.type}
                                  title={`${meta.label} (${badgeSub})`}
                                  style={{ borderColor: meta.color, color: meta.color }}
                                  className="relative w-[22px] h-[22px] rounded bg-slate-950/95 border flex items-center justify-center shadow-md"
                                >
                                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
                                    {st.type === 'Burn' && (
                                      <path d="M8 1.5C5.5 5 3.5 6.8 3.5 10a4.5 4.5 0 009 0c0-3.2-2-5-4.5-8.5zm0 10.5a2 2 0 01-2-2c0-1.2.8-2.2 2-3.8 1.2 1.6 2 2.6 2 3.8a2 2 0 01-2 2z" />
                                    )}
                                    {(st.type === 'Freeze' || st.type === 'Slow') && (
                                      <path d="M7.2 1h1.6v5.1l3.6-3.6 1.1 1.1-3.6 3.6H15v1.6H9.9l3.6 3.6-1.1 1.1-3.6-3.6V15H7.2V9.9l-3.6 3.6-1.1-1.1 3.6-3.6H1V7.2h5.1L2.5 3.6l1.1-1.1 3.6 3.6V1z" />
                                    )}
                                    {st.type === 'FreezeImmunity' && (
                                      <path d="M8 1L2.5 3.5v4.2C2.5 11.5 4.9 14.3 8 15c3.1-.7 5.5-3.5 5.5-7.3V3.5L8 1zm0 3l1.2 2.4L11.6 7l-2 1.8.5 2.6L8 10.1 5.9 11.4l.5-2.6-2-1.8 2.4-.6L8 4z" />
                                    )}
                                    {st.type === 'Shock' && (
                                      <polygon points="9.5,1 3,9 7.8,9 6.2,15 13,7 8.2,7" />
                                    )}
                                    {st.type === 'Bleed' && (
                                      <path d="M8 1.5C5.2 6 3.8 8.2 3.8 10.5a4.2 4.2 0 008.4 0C12.2 8.2 10.8 6 8 1.5z" />
                                    )}
                                    {st.type === 'Luminous Mark' && (
                                      <path d="M8 3.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zM8 0.5l1.2 2.2H6.8L8 0.5zm0 15l-1.2-2.2h2.4L8 15.5zM0.5 8l2.2-1.2v2.4L0.5 8zm15 0l-2.2 1.2V6.8L15.5 8z" />
                                    )}
                                    {st.type === 'Corrosion' && (
                                      <path d="M8 2a5 5 0 00-5 5c0 1.8.9 3.3 2.2 4.1V14h5.6v-2.9C12.1 10.3 13 8.8 13 7a5 5 0 00-5-5zm-2 5.5a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4zm4 0a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4z" />
                                    )}
                                    {st.type === 'Defenseless' && (
                                      <path d="M8 1L2.5 3.5v4.2C2.5 11.5 4.9 14.3 8 15c3.1-.7 5.5-3.5 5.5-7.3V3.5L8 1zm-.6 2.5h1.5L7.4 7.5h2.1L6.8 13l.8-4.2H5.8l1.6-5.3z" />
                                    )}
                                  </svg>
                                  <span className="absolute bottom-0 right-0.5 text-[7px] font-mono font-extrabold leading-none text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.95)]">
                                    {badgeSub}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* LAYER 2 (CENTER): 100% Unobstructed 2D Pixel Art Sprite Click Box (Zero Overlapping UI/Text) */}
                          <button
                            type="button"
                            onClick={() => {
                              simRef.current.manualFocusId =
                                simRef.current.manualFocusId === part.id ? null : part.id;
                              sfx.play('hit');
                            }}
                            title={`Target ${part.name} (Weak to ${counterEl})`}
                            className="pointer-events-auto w-full h-full bg-transparent border-0 cursor-crosshair focus:outline-none"
                          />

                          {/* LAYER 3 (BELOW FEET -bottom-8): HP Bar + 5-Segment Stagger Bar + Name & WEAK Element Badge */}
                          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-28 bg-slate-950/92 border border-slate-800 rounded px-1.5 py-1 space-y-0.5 shadow-md">
                            {/* HP Bar */}
                            <div className="relative h-1.5 w-full bg-slate-900 rounded-sm overflow-hidden border border-slate-700/80">
                              <div
                                className={`h-full transition-all duration-75 ${
                                  hudState.isStaggered
                                    ? 'bg-amber-400'
                                    : isMain
                                    ? 'bg-rose-500'
                                    : 'bg-purple-500'
                                }`}
                                style={{ width: `${hpPct}%` }}
                              />
                            </div>

                            {/* 5-Segment Stagger Bar */}
                            <div className="grid grid-cols-5 gap-0.5">
                              {[0, 1, 2, 3, 4].map((segIdx) => {
                                const filledBars = hudState.staggerSegments;
                                let segFill = 0;
                                if (segIdx < filledBars - 1) segFill = 100;
                                else if (segIdx === filledBars - 1) {
                                  segFill =
                                    (hudState.currentSegmentBp /
                                      Math.max(1, hudState.maxSegmentBp)) *
                                    100;
                                }
                                return (
                                  <div
                                    key={segIdx}
                                    className="h-1 bg-slate-900 border border-amber-500/40 rounded-xs overflow-hidden"
                                  >
                                    <div
                                      className="h-full bg-amber-400"
                                      style={{ width: `${segFill}%` }}
                                    />
                                  </div>
                                );
                              })}
                            </div>

                            {/* Name + Elemental Weakness Badge */}
                            <div className="flex items-center justify-between gap-1 text-[8px] font-mono leading-none">
                              <span
                                className={`truncate font-bold ${
                                  isFocused ? 'text-amber-300' : 'text-slate-200'
                                }`}
                              >
                                {part.name}
                              </span>
                              <span className="shrink-0 text-amber-300 font-bold">
                                WEAK: {elIcons[counterEl]}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* TOP-LEFT SQUAD CP VS RECOMMENDED CP & ELEMENTAL COUNTER CYCLE ON BATTLEFIELD */}
                {(() => {
                  const recCp = activeDomainChallenge
                    ? DOMAIN_TIER_SPECS[activeDomainChallenge.tier].minCp
                    : getRecommendedFloorCP(floor);
                  const cpReady = squadCP >= recCp;
                  return (
                    <div className="pointer-events-auto absolute top-2 left-3 z-30 flex flex-wrap items-center gap-1.5 max-w-[360px]">
                      <div className="px-2.5 py-1 rounded-lg bg-slate-950/90 border border-amber-400/60 shadow-lg text-[11px] font-mono font-bold text-amber-300 inline-flex items-center gap-1.5">
                        <span>
                          ⚔️ SQUAD CP: {squadCP.toLocaleString()} · REC: {recCp.toLocaleString()}
                        </span>
                        <span
                          className={`px-1 py-0.2 rounded text-[9px] ${
                            cpReady
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-400/50'
                          }`}
                        >
                          {cpReady ? 'CLEAR READY' : 'UNDER-GEARED'}
                        </span>
                        <CPInfoTooltip title="How Squad CP Works" formula={SQUAD_CP_FORMULA} />
                      </div>
                      <ElementalWheelBadge
                        activeBossElement={
                          hudState.bossParts.find((b) => b.alive)?.element ||
                          hudState.bossParts[0]?.element
                        }
                        compact
                      />
                      {activeDomainChallenge && (
                        <div className="px-2.5 py-1 rounded-lg bg-rose-950/90 border border-rose-400/70 text-[11px] font-mono font-bold text-rose-200">
                          🏰 {activeDomainChallenge.domainId} · Tier {activeDomainChallenge.tier} Boss
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* COMPACT CENTERED TOP BOSS HUD BAR (Name + Element & Counter + HP + Stagger + SVG Debuff Badges) */}
                {(() => {
                  const mainBoss = hudState.bossParts.find((b) => b.id === 'BOSS_MAIN');
                  const focusedPart =
                    hudState.bossParts.find((b) => b.id === hudState.manualFocusId && b.alive) ||
                    mainBoss ||
                    hudState.bossParts.find((b) => b.alive) ||
                    hudState.bossParts[0];
                  const enemyEl = focusedPart?.element || 'Dark';
                  const counterEl = getRecommendedCounterElement(enemyEl);
                  const elIcons: Record<string, string> = {
                    Fire: '🔥',
                    Cryo: '❄️',
                    Wind: '🌪️',
                    Electro: '⚡',
                    Light: '☀️',
                    Dark: '🌑',
                  };

                  const totalHp = mainBoss
                    ? mainBoss.hp
                    : hudState.bossParts.reduce((acc, b) => acc + b.hp, 0);
                  const totalMaxHp = mainBoss
                    ? mainBoss.maxHp
                    : Math.max(1, hudState.bossParts.reduce((acc, b) => acc + b.maxHp, 0));
                  const hpPct = Math.max(0, Math.min(100, (totalHp / totalMaxHp) * 100));
                  const berserkRem = Math.max(0, 60 - hudState.waveElapsed);
                  const raidRem = Math.max(0, 90 - hudState.waveElapsed);
                  const aliveCount = hudState.bossParts.filter((b) => b.alive).length;
                  const isChargingSkill = hudState.staggerWarningTimer > 0 && !hudState.isStaggered;
                  const castPct = isChargingSkill
                    ? Math.max(0, Math.min(100, ((4.0 - hudState.staggerWarningTimer) / 4.0) * 100))
                    : 0;

                  const activeDebuffs = focusedPart ? focusedPart.debuffs : [];
                  const freezeImmuneRem = focusedPart ? focusedPart.freezeResistTimer : 0;

                  return (
                    <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 w-[370px] origin-top scale-[0.82] sm:scale-90 md:scale-100 z-30 bg-slate-950/92 border border-slate-800 rounded-md px-2.5 py-1.5 space-y-1 shadow-lg">
                      <div className="flex items-center justify-between gap-1.5 text-[10px] font-mono tabular-nums">
                        <span className="font-sans font-bold text-slate-100 truncate">
                          {battleSubMode === 'GUILD_RAID'
                            ? `🐉 Yog-Sothoth · ${hudState.guildRaidDamage.toLocaleString()}`
                            : battleSubMode === 'ARENA'
                            ? `⚔️ Arena Squad (${aliveCount}/5)`
                            : mainBoss
                            ? `${mainBoss.name} · F${floor}`
                            : `Void Minions (${aliveCount}) · F${floor}`}
                        </span>
                        <span className={`shrink-0 ${hudState.isBerserk ? 'text-rose-400 font-bold' : 'text-amber-300'}`}>
                          {battleSubMode === 'GUILD_RAID'
                            ? `${raidRem.toFixed(1)}s`
                            : mainBoss
                            ? hudState.isBerserk
                              ? 'BERSERK'
                              : `${berserkRem.toFixed(1)}s`
                            : `Boss F${Math.ceil(floor / 5) * 5}`}
                        </span>
                      </div>

                      {/* Enemy Elemental Affinity & Recommended Counter Element Row */}
                      <div className="flex items-center justify-between gap-1 text-[9px] font-mono">
                        <span
                          className="px-1.5 py-0.2 rounded border bg-slate-900/95 font-bold"
                          style={{
                            borderColor: `${ELEMENT_META[enemyEl].color}88`,
                            color: ELEMENT_META[enemyEl].color,
                          }}
                        >
                          {elIcons[enemyEl]} Enemy: {enemyEl}
                        </span>
                        <span
                          className="px-1.5 py-0.2 rounded border bg-amber-500/15 border-amber-400/60 text-amber-200 font-bold"
                        >
                          WEAK TO: {elIcons[counterEl]} {counterEl} (+30% DMG)
                        </span>
                      </div>

                      {/* Compact HP Bar */}
                      <div className="relative h-3 bg-slate-900 rounded overflow-hidden border border-slate-700">
                        <div
                          className={`h-full transition-all duration-100 ${
                            hudState.isStaggered
                              ? 'bg-amber-400'
                              : mainBoss
                              ? 'bg-rose-600'
                              : 'bg-purple-600'
                          }`}
                          style={{ width: `${hpPct}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-1.5 text-[9px] font-mono tabular-nums text-white">
                          <span>
                            {battleSubMode === 'GUILD_RAID'
                              ? `DMG: ${hudState.guildRaidDamage.toLocaleString()}`
                              : `${totalHp.toLocaleString()} / ${totalMaxHp.toLocaleString()} (${hpPct.toFixed(0)}%)`}
                          </span>
                          {hudState.isStaggered && (
                            <span className="font-bold text-slate-950 bg-amber-300 px-1 rounded">
                              STAGGER {hudState.staggerTimer.toFixed(1)}s
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 22x22px SVG Status Badges on Top Boss HUD (No Text String Overlap) */}
                      {(activeDebuffs.length > 0 || freezeImmuneRem > 0) && (
                        <div className="flex flex-wrap items-center gap-1 pt-0.5">
                          {activeDebuffs.map((d) => {
                            const debuffColors: Record<string, string> = {
                              Burn: '#f97316',
                              Freeze: '#38bdf8',
                              Shock: '#a855f7',
                              Bleed: '#10b981',
                              'Luminous Mark': '#fbbf24',
                              Corrosion: '#9333ea',
                              Defenseless: '#ef4444',
                              Slow: '#38bdf8',
                            };
                            const col = debuffColors[d.type] || '#94a3b8';
                            const badgeSub =
                              d.stacks > 1 ? `x${d.stacks}` : `${d.remaining.toFixed(1)}s`;
                            return (
                              <div
                                key={d.type}
                                title={`${d.type} (${badgeSub})`}
                                style={{ borderColor: col, color: col }}
                                className="relative w-[22px] h-[22px] rounded bg-slate-950 border flex items-center justify-center"
                              >
                                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0 fill-current">
                                  {d.type === 'Burn' && (
                                    <path d="M8 1.5C5.5 5 3.5 6.8 3.5 10a4.5 4.5 0 009 0c0-3.2-2-5-4.5-8.5z" />
                                  )}
                                  {(d.type === 'Freeze' || d.type === 'Slow') && (
                                    <polygon points="8,1 15,8 8,15 1,8" />
                                  )}
                                  {d.type === 'Shock' && (
                                    <polygon points="9.5,1 3,9 7.8,9 6.2,15 13,7 8.2,7" />
                                  )}
                                  {d.type === 'Bleed' && (
                                    <path d="M8 1.5C5.2 6 3.8 8.2 3.8 10.5a4.2 4.2 0 008.4 0C12.2 8.2 10.8 6 8 1.5z" />
                                  )}
                                  {d.type === 'Luminous Mark' && <circle cx="8" cy="8" r="5" />}
                                  {d.type === 'Corrosion' && (
                                    <path d="M8 2a5 5 0 00-5 5c0 1.8.9 3.3 2.2 4.1V14h5.6v-2.9C12.1 10.3 13 8.8 13 7a5 5 0 00-5-5z" />
                                  )}
                                  {d.type === 'Defenseless' && (
                                    <path d="M8 1L2.5 3.5v4.2C2.5 11.5 4.9 14.3 8 15c3.1-.7 5.5-3.5 5.5-7.3V3.5L8 1z" />
                                  )}
                                </svg>
                                <span className="absolute bottom-0 right-0.5 text-[7px] font-mono font-extrabold leading-none text-white">
                                  {badgeSub}
                                </span>
                              </div>
                            );
                          })}
                          {freezeImmuneRem > 0 && (
                            <div
                              title={`Freeze Immunity (${freezeImmuneRem.toFixed(1)}s)`}
                              className="relative w-[22px] h-[22px] rounded bg-sky-950/90 border border-sky-400/70 text-sky-300 flex items-center justify-center"
                            >
                              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0 fill-current">
                                <path d="M8 1L2.5 3.5v4.2C2.5 11.5 4.9 14.3 8 15c3.1-.7 5.5-3.5 5.5-7.3V3.5L8 1z" />
                              </svg>
                              <span className="absolute bottom-0 right-0.5 text-[7px] font-mono font-extrabold leading-none text-white">
                                {freezeImmuneRem.toFixed(0)}s
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Conditional Boss Skill Charge Bar + 5-Segment Stagger Gauge (Shown ONLY when staggerWarningTimer > 0) */}
                      {hudState.staggerWarningTimer > 0 && !hudState.isStaggered && (
                        <div className="space-y-1 pt-0.5">
                          <div className="relative h-2.5 bg-slate-900 rounded overflow-hidden border border-rose-500/70">
                            <div
                              className="h-full bg-gradient-to-r from-fuchsia-600 to-rose-500 transition-all duration-75"
                              style={{ width: `${castPct}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-between px-1.5 text-[8px] font-mono font-bold tabular-nums text-white">
                              <span>SKILL CHARGE · CATACLYSMIC SUPERNOVA</span>
                              <span>{hudState.staggerWarningTimer.toFixed(1)}s</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-5 gap-1">
                            {[0, 1, 2, 3, 4].map((barIdx) => {
                              const filledBars = hudState.staggerSegments;
                              let fillPct = 0;
                              if (barIdx < filledBars - 1) fillPct = 100;
                              else if (barIdx === filledBars - 1) {
                                fillPct = (hudState.currentSegmentBp / Math.max(1, hudState.maxSegmentBp)) * 100;
                              }
                              return (
                                <div key={barIdx} className="h-1.5 bg-slate-900 border border-amber-500/50 rounded overflow-hidden">
                                  <div
                                    className="h-full bg-amber-400 transition-all duration-75"
                                    style={{ width: `${fillPct}%` }}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Bottom-Right: Compact Live Combat Reaction Log (Below Top-Right Dungeon/Raid/Arena Icons) */}
                <div className="pointer-events-auto hidden xl:block absolute bottom-2 right-3 z-20 w-60 bg-slate-950/85 border border-slate-800 rounded-lg p-2 text-[10px] font-mono space-y-0.5 max-h-24 overflow-y-auto">
                  <div className="text-slate-400 font-semibold">Tactical Combat Log</div>
                  {hudState.combatLog.slice(0, 3).map((entry, idx) => (
                    <div key={idx} className="text-slate-300 truncate">
                      {entry}
                    </div>
                  ))}
                </div>

                {/* Full-Screen 0.5s+ Splash Cut-In Override Banner (Module 2.4) */}
                {cutInEnabled && hudState.cutIn && (
                  <div
                    key={`${hudState.cutIn.heroId}_${hudState.cutIn.skillName}`}
                    className="pointer-events-none absolute inset-0 bg-slate-950/55 flex items-center justify-center z-20"
                  >
                    <div
                      className="w-full h-36 bg-slate-950/95 border-y-2 flex items-center justify-between px-14 overflow-hidden shadow-2xl"
                      style={{ borderColor: hudState.cutIn.primaryColor }}
                    >
                      <div className="space-y-1.5 z-10">
                        <div className="text-xs font-mono tracking-widest text-amber-300">
                          ULTIMATE BURST UNLEASHED · {hudState.cutIn.element.toUpperCase()} RESONANCE
                        </div>
                        <div className="text-3xl font-bold text-white font-display tracking-wide">
                          {hudState.cutIn.heroName} — {hudState.cutIn.skillName}
                        </div>
                      </div>
                      <div className="w-52 h-52 -my-10 opacity-95">
                        <ResonatorSplashArt
                          hero={RESONATORS.find((r) => r.id === hudState.cutIn!.heroId) || RESONATORS[0]}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* FLOATING BOTTOM-CENTER 5-HERO LIQUID-FILL ULTIMATE PORTRAIT CARDS (No BG Bar, Top HP + White Shield Bar, Stars at Bottom) */}
            <div
              className={`pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-30 ${
                battleSubMode === 'DOMAINS' ? 'hidden' : ''
              }`}
            >
              <div className="flex items-center justify-center gap-2.5 sm:gap-4">
                {hudState.heroes.map((u) => {
                  const hpPct = Math.max(0, Math.min(100, (u.hp / u.maxHp) * 100));
                  const shPct = Math.max(0, Math.min(100, (u.shield / u.maxHp) * 100));
                  const enPct = Math.max(0, Math.min(100, u.energy));
                  const elMeta = ELEMENT_META[u.data.element];
                  const isUltReady = u.hp > 0 && enPct >= 99;
                  const isDead = u.hp <= 0;

                  return (
                    <button
                      key={u.id}
                      type="button"
                      disabled={isDead}
                      onClick={() => triggerManualUltimate(u.id)}
                      title={`${u.data.name} (${u.data.element}) · HP: ${Math.ceil(hpPct)}% · ULT: ${Math.floor(enPct)}% · Click to unleash Ultimate`}
                      style={
                        isUltReady
                          ? {
                              borderColor: '#fbbf24',
                              boxShadow: `0 0 18px ${elMeta.color}, 0 0 8px #fbbf24, inset 0 0 14px ${elMeta.color}88`,
                            }
                          : {
                              borderColor: isDead ? '#334155' : `${elMeta.color}99`,
                              boxShadow: '0 8px 20px rgba(2, 6, 23, 0.75)',
                            }
                      }
                      className={`pointer-events-auto group relative w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-xl bg-slate-950/90 backdrop-blur-sm border-2 overflow-hidden transition-all select-none ${
                        isDead
                          ? 'opacity-40 grayscale cursor-not-allowed'
                          : isUltReady
                          ? 'scale-105 cursor-pointer animate-pulse'
                          : 'hover:scale-105 cursor-pointer'
                      }`}
                    >
                      {/* 1. PROMINENT TOP HP + WHITE SHIELD BAR */}
                      <div className="absolute inset-x-0 top-0 h-2 bg-slate-950/95 border-b border-slate-900 z-30 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-100 ${
                            hpPct > 35 ? 'bg-emerald-400' : 'bg-rose-500'
                          }`}
                          style={{ width: `${hpPct}%` }}
                        />
                        {u.shield > 0 && (
                          <div
                            className="absolute inset-y-0 left-0 bg-white/95 shadow-[0_0_6px_rgba(255,255,255,0.95)] transition-all duration-100"
                            style={{ width: `${shPct}%` }}
                          />
                        )}
                      </div>

                      {/* 2. RISING LIQUID-IN-GLASS ULTIMATE GAUGE (0% -> 100% from bottom to top) */}
                      {!isDead && (
                        <div
                          className="absolute inset-x-0 bottom-0 transition-all duration-150 pointer-events-none"
                          style={{
                            height: `${enPct}%`,
                            background: isUltReady
                              ? `linear-gradient(to top, ${elMeta.color}cc, rgba(251, 191, 36, 0.65))`
                              : `linear-gradient(to top, ${elMeta.color}88, ${elMeta.color}33)`,
                          }}
                        >
                          {/* Glowing liquid surface wave meniscus */}
                          {enPct > 2 && (
                            <div
                              className="w-full h-[2px]"
                              style={{
                                backgroundColor: isUltReady ? '#fde047' : elMeta.color,
                                boxShadow: `0 0 6px ${isUltReady ? '#fde047' : elMeta.color}`,
                              }}
                            />
                          )}
                        </div>
                      )}

                      {/* 3. HERO PORTRAIT SVG */}
                      <div className="relative z-10 w-full h-full flex items-center justify-center pt-1.5 pb-1.5">
                        <svg viewBox="0 0 40 40" className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow">
                          <path d="M6,40 L12,26 L28,26 L34,40 Z" fill={u.data.colors.primary} />
                          <rect x="13" y="11" width="14" height="14" rx="2" fill="#fde68a" />
                          <rect x="16" y="17" width="2.5" height="3" fill={elMeta.color} />
                          <rect x="22" y="17" width="2.5" height="3" fill={elMeta.color} />
                          <path d="M11,15 L13,7 L27,7 L29,15 L26,12 L14,12 Z" fill={u.data.colors.hair} />
                        </svg>
                      </div>

                      {/* 4. ELEMENT DOT & ULT% / READY BADGE BELOW TOP HP BAR */}
                      <span
                        className="absolute top-2.5 left-1.5 z-20 w-2 h-2 rounded-full border border-slate-950"
                        style={{ backgroundColor: elMeta.color }}
                      />
                      <span
                        className={`absolute top-2 right-1 z-20 text-[9px] font-mono font-bold tabular-nums drop-shadow ${
                          isDead
                            ? 'text-rose-400'
                            : isUltReady
                            ? 'text-amber-200'
                            : 'text-slate-100'
                        }`}
                      >
                        {isDead ? 'KO' : isUltReady ? 'ULT!' : `${Math.floor(enPct)}%`}
                      </span>

                      {/* 5. BOTTOM STARS ROW INSIDE ICON (Does not cover character's face) */}
                      <div className="absolute inset-x-0 bottom-1 z-20 flex items-center justify-center pointer-events-none">
                        <span className="text-[9px] leading-none tracking-tighter text-amber-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                          {'★'.repeat(u.prog.stars)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 2: HEROES & GAMBIT (CARD GRID + FORMATION / 3-COL DETAIL)
           ============================================================ */}
        {activeTab === 'HEROES' && (
          <div className="flex-1 min-h-0 flex flex-col p-4 overflow-hidden max-w-7xl mx-auto w-full">
            {!heroDetailMode ? (
              /* MODE A: ROSTER PORTRAIT GRID (LEFT 60%) & ACTIVE SQUAD FORMATION (RIGHT 40%) */
              <div className="flex-1 min-h-0 grid grid-cols-12 gap-4 overflow-hidden">
                {/* LEFT 60% (7 Cols): Portrait Card Grid (4 Columns) */}
                <div className="col-span-12 lg:col-span-7 bg-[#0a0d18] border border-slate-800 rounded-xl p-3.5 flex flex-col min-h-0">
                  <div className="flex items-center justify-between mb-2.5 shrink-0">
                    <div>
                      <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
                        Resonator Roster · 23 Heroes (12 SSR · 6 SR · 5 Starter R)
                      </h2>
                      <p className="text-[11px] text-slate-400">
                        Hold &amp; Drag any unlocked card to deploy/swap in Formation · Click to inspect Details &amp; Gambits
                      </p>
                    </div>
                    <span className="text-xs font-mono text-amber-300">
                      Unlocked: {RESONATORS.filter((r) => heroProgress[r.id]?.unlocked).length}/23 · Deployed: {partyIds.length}/5
                    </span>
                  </div>

                  <div className="flex-1 flex-grow min-h-0 overflow-y-auto pr-1.5 pb-2">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
                      {RESONATORS.map((r) => {
                        const p = heroProgress[r.id];
                        const isUnlocked = Boolean(p?.unlocked);
                        const inParty = partyIds.includes(r.id);
                        const partySlotIdx = partyIds.indexOf(r.id);
                        const isBeingDragged = draggingHero?.heroId === r.id;
                        const elMeta = ELEMENT_META[r.element];
                        const rarityMeta = RARITY_BADGE_META[r.rarity] || RARITY_BADGE_META.N;
                        const elIconMap: Record<string, string> = {
                          Fire: '🔥',
                          Cryo: '❄️',
                          Electro: '⚡',
                          Wind: '🌪️',
                          Light: '☀️',
                          Dark: '🌑',
                        };
                        const roleIconMap: Record<string, string> = {
                          'Melee DPS': '⚔️',
                          'Ranged DPS': '🏹',
                          'Tank / Breaker': '🛡️',
                          Debuffer: '✨',
                          'Support & Healer': '💚',
                        };

                        return (
                          <div
                            key={r.id}
                            onPointerDown={(e) =>
                              startHoldToDragHero(e, r.id, isUnlocked, inParty ? partySlotIdx : null)
                            }
                            onClick={() => {
                              if (suppressNextCardClickRef.current) return;
                              setSelectedHeroId(r.id);
                              setHeroDetailMode(true);
                            }}
                            style={{
                              borderColor: inParty ? '#fbbf24' : isUnlocked ? elMeta.color : '#334155',
                              background: isUnlocked
                                ? `linear-gradient(180deg, ${elMeta.color}38 0%, #0b1020 58%, #040711 100%)`
                                : 'linear-gradient(180deg, #0f172a 0%, #05070f 100%)',
                            }}
                            className={`group relative w-full aspect-[3/4] rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing overflow-hidden select-none touch-none ${
                              isBeingDragged
                                ? 'opacity-45 scale-95'
                                : inParty
                                ? 'ring-2 ring-amber-400/60 shadow-lg shadow-amber-500/15'
                                : 'hover:brightness-110'
                            }`}
                          >
                            {/* IN-FLOW 3:4 SPACER TO GUARANTEE NON-OVERLAPPING GRID ROW TRACK HEIGHT */}
                            <div className="w-full pt-[133.33%] pointer-events-none" />

                            {/* BUST-UP PORTRAIT FULL CENTER (Dark Silhouette if Locked) */}
                            <div
                              className={`absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden ${
                                isUnlocked ? '' : 'brightness-[0.14] contrast-150 grayscale'
                              }`}
                            >
                              <ResonatorSplashArt
                                hero={r}
                                className="w-full h-full object-cover scale-[1.38] translate-y-3 transition-transform duration-300 group-hover:scale-[1.44]"
                              />
                            </div>

                            {/* TOP-LEFT: RARITY BADGE (SSR/SR/R/N) + ELEMENT & ROLE CIRCLES */}
                            <div className="absolute top-2 left-2 z-20 flex flex-col items-start gap-1">
                              <span
                                className={`px-1.5 py-0.5 rounded border text-[9px] font-mono font-extrabold leading-none tracking-wider shadow-md ${rarityMeta.bgClass} ${rarityMeta.textClass} ${rarityMeta.borderClass}`}
                              >
                                {rarityMeta.label}
                              </span>
                              <div
                                title={`Element: ${r.element}`}
                                style={{ borderColor: elMeta.color }}
                                className="w-6 h-6 rounded-full bg-slate-950/90 border flex items-center justify-center text-[11px] shadow-md"
                              >
                                {elIconMap[r.element] || '✦'}
                              </div>
                              <div
                                title={`Role: ${r.role}`}
                                className="w-6 h-6 rounded-full bg-slate-950/90 border border-slate-600 flex items-center justify-center text-[10px] shadow-md"
                              >
                                {roleIconMap[r.role] || '⚔️'}
                              </div>
                            </div>

                            {/* TOP-CENTER: GOLDEN STARS ROW (1★ to 5★) */}
                            <div className="absolute top-2 inset-x-0 z-20 flex items-center justify-center pointer-events-none">
                              <span className="text-xs font-mono text-amber-300 tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)]">
                                {'★'.repeat(p.stars)}
                              </span>
                            </div>

                            {/* TOP-RIGHT: QUICK DEPLOY OR LOCKED BADGE */}
                            {isUnlocked ? (
                              <button
                                type="button"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (inParty) {
                                    if (partyIds.length <= 1) return;
                                    setPartyIds((ids) => ids.filter((id) => id !== r.id));
                                  } else if (partyIds.length < 5) {
                                    setPartyIds((ids) => [...ids, r.id]);
                                  } else {
                                    setPartyIds((ids) => [...ids.slice(0, 4), r.id]);
                                  }
                                }}
                                title={inParty ? 'Remove from Squad' : 'Deploy to Squad'}
                                className={`absolute top-2 right-2 z-30 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-colors cursor-pointer ${
                                  inParty
                                    ? 'bg-amber-400 text-slate-950 border-amber-200'
                                    : 'bg-slate-950/85 text-slate-300 border-slate-700 hover:border-amber-400 hover:text-white'
                                }`}
                              >
                                {inParty ? `#${partySlotIdx + 1}` : '+'}
                              </button>
                            ) : (
                              <span className="absolute top-2 right-2 z-30 px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700 text-[9px] font-mono font-bold text-slate-400">
                                🔒
                              </span>
                            )}

                            {/* CHEST CENTER: HORIZONTAL "SELECTED" OR "LOCKED" BANNER SASH */}
                            {inParty ? (
                              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 bg-gradient-to-r from-slate-950/80 via-amber-400/95 to-slate-950/80 border-y border-amber-200 py-0.5 flex items-center justify-center shadow-lg pointer-events-none">
                                <span className="text-[10px] font-mono font-extrabold tracking-[0.22em] text-slate-950 uppercase">
                                  SELECTED
                                </span>
                              </div>
                            ) : !isUnlocked ? (
                              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-20 bg-slate-950/85 border-y border-slate-700/80 py-0.5 flex items-center justify-center pointer-events-none">
                                <span className="text-[9px] font-mono font-bold tracking-[0.18em] text-slate-400 uppercase">
                                  🔒 LOCKED
                                </span>
                              </div>
                            ) : null}

                            {/* BOTTOM DARK GRADIENT OVERLAY */}
                            <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pt-7 pb-2 px-2.5 flex flex-col items-center text-center">
                              <div className="w-full flex items-center justify-between -mb-0.5">
                                <span className="text-[10px] font-mono font-extrabold text-amber-300 drop-shadow">
                                  ⚡ CP {(heroCpMap[r.id] || 0).toLocaleString()}
                                </span>
                                <span className="text-[10px] font-mono font-extrabold text-white drop-shadow">
                                  {isUnlocked ? `LV ${p.level}` : 'LOCKED'}
                                </span>
                              </div>
                              <div className="w-full text-xs font-extrabold text-white tracking-wide uppercase truncate font-display drop-shadow">
                                {r.name}
                              </div>
                              <div
                                className="w-full text-[10px] font-semibold truncate"
                                style={{ color: isUnlocked ? elMeta.color : '#64748b' }}
                              >
                                {r.title}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* RIGHT 40% (5 Cols): Active Tower Squad & Pre-Battle Formation Lock */}
                <div className="col-span-12 lg:col-span-5 bg-[#0a0d18] border border-slate-800 rounded-xl p-4 flex flex-col justify-between min-h-0">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h2 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                          Active Tower Squad &amp; Formation
                        </h2>
                        <span className="text-[10px] font-mono text-emerald-300">
                          ✋ Hold &amp; Drag Heroes to Assign or Swap Slots
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/50 text-amber-300 font-mono font-bold text-[11px] inline-flex items-center gap-1.5">
                          <span>⚔️ SQUAD CP: {squadCP.toLocaleString()}</span>
                          <CPInfoTooltip title="How Squad CP Works" formula={SQUAD_CP_FORMULA} />
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Mastery Lv.{formationLevel}/10 (+{(formationLevel * 750).toLocaleString()} CP)
                        </span>
                      </div>
                    </div>

                    {(() => {
                      const form = FORMATIONS.find((f) => f.id === formationId) || FORMATIONS[2];
                      const frontIndices = Array.from({ length: form.frontCount }, (_, i) => i);
                      const backIndices = Array.from({ length: form.backCount }, (_, i) => form.frontCount + i);

                      const renderSlotPedestal = (
                        slotIdx: number,
                        rowTag: 'FRONT' | 'BACK',
                        rowPosIdx: number,
                        rowTotal: number
                      ) => {
                        const hid = partyIds[slotIdx];
                        const h = RESONATORS.find((r) => r.id === hid) || RESONATORS[0];
                        const elColor = ELEMENT_META[h.element].color;
                        const isDropHover = hoveredDropSlot === slotIdx && Boolean(draggingHero);
                        const isBeingDragged = draggingHero?.heroId === h.id;
                        // Match Tower Battle 2.5D perspective slant (top units slightly right, bottom units slightly left)
                        const slantRatio = rowTotal <= 1 ? 0 : rowPosIdx / (rowTotal - 1) - 0.5;
                        const slantPx = Math.round(-slantRatio * 18);

                        return (
                          <div
                            key={`slot-${slotIdx}`}
                            data-formation-slot={slotIdx}
                            onPointerDown={(e) => startHoldToDragHero(e, h.id, true, slotIdx)}
                            onClick={() => {
                              if (suppressNextCardClickRef.current) return;
                              setSelectedHeroId(h.id);
                              setHeroDetailMode(true);
                            }}
                            style={{ transform: `translateX(${slantPx}px)` }}
                            className={`relative px-1.5 py-0.5 rounded-xl transition-transform flex flex-col items-center cursor-grab active:cursor-grabbing group touch-none ${
                              isDropHover ? 'scale-110 z-20' : 'hover:scale-105 z-10'
                            } ${isBeingDragged ? 'opacity-40' : ''}`}
                          >
                            <div className="relative flex flex-col items-center">
                              <span className="text-[8px] font-mono text-slate-400/90 leading-none mb-0.5 drop-shadow">
                                #{slotIdx + 1} {rowTag}
                              </span>
                              <PixelPreviewCanvas
                                hero={h}
                                compact
                                className="w-11 h-11 -mb-3 relative z-10 group-hover:scale-110 transition-transform"
                              />
                              <div
                                style={{
                                  borderColor: isDropHover ? '#fde047' : elColor,
                                  boxShadow: isDropHover
                                    ? '0 0 16px #fde047, inset 0 0 8px #fde047'
                                    : `0 0 10px ${elColor}80, inset 0 0 6px ${elColor}66`,
                                  background: isDropHover
                                    ? 'radial-gradient(ellipse at center, rgba(253,224,71,0.55) 0%, rgba(15,23,42,0.95) 75%)'
                                    : `radial-gradient(ellipse at center, ${elColor}55 0%, rgba(15,23,42,0.95) 75%)`,
                                }}
                                className="w-14 h-3.5 rounded-full border-2 transition-all"
                              />
                            </div>
                            <span className="mt-0.5 px-1.5 py-0.2 rounded bg-slate-950/90 text-[9px] font-semibold text-slate-100 whitespace-nowrap drop-shadow">
                              {h.name}
                            </span>
                          </div>
                        );
                      };

                      return (
                        <div className="relative h-60 bg-[#050814] border border-slate-800 rounded-xl px-3 py-2 flex flex-col justify-between overflow-hidden select-none">
                          {/* Tower Battle 2.5D Horizon & Perspective Tactical Floor Ring */}
                          <div
                            className="absolute inset-x-0 top-0 h-12 pointer-events-none opacity-60"
                            style={{
                              background:
                                'linear-gradient(180deg, rgba(15, 23, 42, 0.9) 0%, rgba(5, 8, 20, 0) 100%)',
                            }}
                          />
                          <svg
                            viewBox="0 0 400 220"
                            preserveAspectRatio="none"
                            className="absolute inset-0 w-full h-full pointer-events-none"
                          >
                            {/* Horizon line */}
                            <line
                              x1="0"
                              y1="38"
                              x2="400"
                              y2="38"
                              stroke="rgba(148, 163, 184, 0.16)"
                              strokeWidth="1"
                            />
                            {/* 2.5D Perspective Arena Floor Ellipse matching Tower Battle */}
                            <ellipse
                              cx="205"
                              cy="132"
                              rx="182"
                              ry="74"
                              fill="rgba(15, 23, 42, 0.42)"
                              stroke="rgba(56, 189, 248, 0.24)"
                              strokeWidth="1.5"
                            />
                            {/* Slanted Tactical Front/Back Midline Divider matching Tower Battle */}
                            <line
                              x1="215"
                              y1="48"
                              x2="182"
                              y2="208"
                              stroke="rgba(250, 204, 21, 0.28)"
                              strokeWidth="1.5"
                              strokeDasharray="6 6"
                            />
                            {/* Direction Indicator toward Enemy/Boss side on the Right */}
                            <text
                              x="386"
                              y="134"
                              textAnchor="end"
                              fill="rgba(248, 113, 113, 0.45)"
                              fontSize="9"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              BOSS ➔
                            </text>
                          </svg>

                          {/* Row Headers aligned with Left (Back Row) and Right (Front Row) */}
                          <div className="relative z-10 flex items-center justify-around px-2 pt-0.5">
                            <span className="text-[10px] font-mono font-bold text-sky-300 uppercase tracking-wider">
                              Back Row (+ATK%)
                            </span>
                            <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
                              Front Row (+DEF%)
                            </span>
                          </div>

                          {/* 2.5D Battlefield Columns: Back Row Vertically Stacked on Left, Front Row Vertically Stacked on Right */}
                          <div className="relative z-10 flex-1 grid grid-cols-2 items-center px-2">
                            {/* Left Column: Back Row (x = 150 in Tower Battle) */}
                            <div className="h-full flex flex-col items-center justify-evenly py-1">
                              {backIndices.map((slotIdx, rIdx) =>
                                renderSlotPedestal(slotIdx, 'BACK', rIdx, backIndices.length)
                              )}
                            </div>

                            {/* Right Column: Front Row (x = 290 in Tower Battle) */}
                            <div className="h-full flex flex-col items-center justify-evenly py-1">
                              {frontIndices.map((slotIdx, rIdx) =>
                                renderSlotPedestal(slotIdx, 'FRONT', rIdx, frontIndices.length)
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="mt-2.5 space-y-2">
                      {/* HIGH-VISIBILITY TACTICAL FORMATION MASTERY UPGRADE BUTTON */}
                      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-amber-500/10 border border-amber-400/50 shadow-md">
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-amber-200 font-display flex items-center gap-1.5">
                            <span>⬆️ Tactical Formation Mastery</span>
                            <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-mono text-[10px] font-extrabold">
                              Lv.{formationLevel}/10
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-300 truncate">
                            +750 Squad CP/Lv &amp; Boosts Front DEF% / Back ATK%
                          </div>
                        </div>
                        <button
                          disabled={formationLevel >= 10 || gold < formationLevel * 600}
                          onClick={() => {
                            const cost = formationLevel * 600;
                            if (gold < cost || formationLevel >= 10) return;
                            setGold((g) => g - cost);
                            setFormationLevel((lv) => lv + 1);
                            sfx.play('forge_ok');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-300 hover:brightness-110 disabled:opacity-40 text-slate-950 font-mono font-extrabold text-[11px] uppercase tracking-wide shadow-md shadow-amber-500/25 cursor-pointer shrink-0"
                        >
                          {formationLevel >= 10
                            ? '★ MAX Lv.10'
                            : `[+UPGRADE Lv.${formationLevel + 1} · ${(formationLevel * 600).toLocaleString()}G]`}
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {FORMATIONS.map((f) => (
                          <button
                            key={f.id}
                            onClick={() => setFormationId(f.id)}
                            className={`p-2 rounded-lg border text-left text-xs transition-colors cursor-pointer ${
                              formationId === f.id
                                ? 'bg-amber-400/20 border-amber-400 text-amber-200 font-bold'
                                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="truncate">{f.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {f.frontCount} Front / {f.backCount} Back
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-2">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-amber-500/40 space-y-0.5">
                      <div className="text-[10px] font-mono text-amber-300 uppercase">
                        Active Resonance Synergy
                      </div>
                      <div className="text-xs font-bold text-white">{partyResonance.title}</div>
                      <div className="text-[11px] text-slate-300">{partyResonance.desc}</div>
                    </div>

                    <button
                      onClick={() => {
                        const unlockedHeroes = RESONATORS.filter((r) => heroProgress[r.id]?.unlocked);
                        const sorted = [...unlockedHeroes].sort(
                          (a, b) => (heroCpMap[b.id] || 0) - (heroCpMap[a.id] || 0)
                        );
                        const top5 = sorted.slice(0, 5);
                        const frontPref = top5.filter((r) => r.recommendedRow === 'Front').map((r) => r.id);
                        const backPref = top5.filter((r) => r.recommendedRow !== 'Front').map((r) => r.id);
                        setPartyIds([...frontPref, ...backPref].slice(0, 5));
                        setFormationId('BALANCED');
                        sfx.play('gacha');
                      }}
                      className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-amber-500/20 cursor-pointer"
                    >
                      [AUTO-DEPLOY BEST COMBO (UNLOCKED)]
                    </button>
                  </div>
                </div>

                {/* FLOATING BORDERLESS 2D COMBAT PIXEL SPRITE GHOST WHILE HOLDING/DRAGGING */}
                {draggingHero && (() => {
                  const draggedData = RESONATORS.find((r) => r.id === draggingHero.heroId) || RESONATORS[0];
                  const elColor = ELEMENT_META[draggedData.element].color;
                  return (
                    <div
                      style={{
                        left: `${draggingHero.x}px`,
                        top: `${draggingHero.y}px`,
                        transform: 'translate(-50%, -65%)',
                      }}
                      className="fixed z-[100] pointer-events-none flex flex-col items-center select-none"
                    >
                      <div className="px-2 py-0.5 mb-0.5 rounded-full bg-amber-400 text-slate-950 font-mono font-extrabold text-[9px] uppercase tracking-wider shadow-lg whitespace-nowrap">
                        {hoveredDropSlot !== null
                          ? `Drop to Slot #${hoveredDropSlot + 1}`
                          : 'Drag to Formation Slot'}
                      </div>
                      <div
                        style={{
                          filter: `drop-shadow(0 0 14px ${elColor})`,
                        }}
                        className="flex flex-col items-center"
                      >
                        <PixelPreviewCanvas hero={draggedData} className="w-20 h-20" />
                        <span className="-mt-1 px-2 py-0.5 rounded-full bg-slate-950/85 text-[10px] font-display font-bold text-white whitespace-nowrap shadow">
                          {draggedData.name}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* MODE B: 3-COLUMN HERO VISUAL DETAIL VIEW (8 Core + 3 Secondary Attributes) */
              <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
                <div className="flex items-center justify-between shrink-0">
                  <button
                    onClick={() => setHeroDetailMode(false)}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-amber-300 cursor-pointer"
                  >
                    ← Back to Roster &amp; Formation
                  </button>
                  <div className="flex items-center gap-2">
                    {!selectedHeroProg.unlocked ? (
                      <button
                        onClick={() => setActiveTab('SUMMON')}
                        className="px-4 py-1.5 rounded-lg bg-purple-500/25 border border-purple-400 text-purple-200 font-bold text-xs cursor-pointer"
                      >
                        🔒 LOCKED — Go to Summon / Starfall Exchange to Unlock
                      </button>
                    ) : (
                      <>
                        <button
                          disabled={selectedHeroProg.level >= 100 || gold < selectedHeroProg.level * 120}
                          onClick={() => handleLevelUpHero(selectedHeroData.id, 5)}
                          className="px-3.5 py-1.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                        >
                          {selectedHeroProg.level >= 100
                            ? 'Lv.100 MAX'
                            : `Level Up +5 (${(selectedHeroProg.level * 120).toLocaleString()}G)`}
                        </button>
                        <button
                          disabled={
                            selectedHeroProg.stars >= 5 || starlightGems < Math.max(1, selectedHeroProg.stars) * 400
                          }
                          onClick={() => handleAscendStar(selectedHeroData.id)}
                          className="px-3.5 py-1.5 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                        >
                          {selectedHeroProg.stars >= 5
                            ? '5★ MAX'
                            : `Ascend ${selectedHeroProg.stars + 1}★ (${Math.max(1, selectedHeroProg.stars) * 400} Gems)`}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-1 min-h-0 grid grid-cols-12 gap-4 overflow-hidden">
                  {/* LEFT (4 Cols): Full-Body Character Art + 2D Sprite Inset */}
                  <div className="col-span-12 lg:col-span-4 bg-[#0a0d18] border border-slate-800 rounded-xl p-3 relative flex flex-col justify-between overflow-hidden">
                    <div className="absolute top-3 left-3 z-10 pointer-events-none bg-slate-950/75 px-2.5 py-1 rounded-lg border border-slate-800/80">
                      <div className="text-[10px] text-amber-300 font-mono">
                        {selectedHeroData.rarity} · {selectedHeroData.element} · {selectedHeroData.role}
                      </div>
                      <h2 className="text-lg font-bold text-white font-display leading-tight">
                        {selectedHeroData.name}
                      </h2>
                      <p className="text-[10px] text-slate-400">{selectedHeroData.title}</p>
                    </div>

                    <div className="flex-1 min-h-0 w-full h-full flex items-center justify-center p-1">
                      <ResonatorSplashArt hero={selectedHeroData} className="max-h-full w-auto scale-105" />
                    </div>

                    <div className="absolute bottom-2.5 left-2.5 z-10 bg-slate-950/90 border border-amber-500/40 rounded-lg p-1.5 w-32 shadow-xl flex flex-col items-center">
                      <div className="text-[8px] font-mono text-amber-300 leading-none mb-0.5 text-center">
                        2D Pixel Sprite
                      </div>
                      <PixelPreviewCanvas hero={selectedHeroData} />
                    </div>
                  </div>

                  {/* CENTER (4 Cols): 8 Core + 3 Secondary Attributes + 4-Skill Kit */}
                  <div className="col-span-12 lg:col-span-4 bg-[#0a0d18] border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between min-h-0 overflow-hidden">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                          Attributes (Lv.{selectedHeroProg.level} · {selectedHeroProg.stars}★)
                        </h3>
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/50 text-amber-300 font-bold">
                            ⚡ CP: {(heroCpMap[selectedHeroData.id] || 0).toLocaleString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCpBreakdownOpen(true)}
                            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-amber-400/50 text-[10px] font-mono font-semibold text-amber-200 hover:text-white transition-colors cursor-pointer"
                          >
                            Inspect CP
                          </button>
                          {cpDeltaToast && cpDeltaToast.heroId === selectedHeroData.id && (
                            <span className="text-emerald-400 font-bold text-[11px]">
                              +{cpDeltaToast.delta.toLocaleString()} CP
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5 font-mono tabular-nums">
                        {[
                          { k: 'HP', v: selectedHeroStats.hp.toLocaleString() },
                          { k: 'ATK', v: selectedHeroStats.atk.toLocaleString() },
                          { k: 'DEF', v: selectedHeroStats.def.toLocaleString() },
                          { k: 'SPD', v: `${selectedHeroStats.spd}` },
                          { k: 'CRIT%', v: `${selectedHeroStats.critRate}%` },
                          { k: 'CDMG%', v: `${selectedHeroStats.critDmg}%` },
                          { k: 'BREAK%', v: `${selectedHeroStats.breakPower}%` },
                          { k: 'EN.CHG', v: `${selectedHeroStats.energyCharge}%` },
                        ].map((st) => (
                          <div
                            key={st.k}
                            className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-center"
                          >
                            <div className="text-[9px] text-slate-400">{st.k}</div>
                            <div className="text-xs font-bold text-white truncate">{st.v}</div>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 font-mono tabular-nums mt-1.5">
                        {[
                          { k: 'STATUS HIT%', v: `+${selectedHeroStats.effectHitRate}%` },
                          { k: 'EFFECT RES%', v: `${selectedHeroStats.effectRes}%` },
                          { k: 'HEAL BONUS%', v: `+${selectedHeroStats.healingBonus}%` },
                        ].map((st) => (
                          <div
                            key={st.k}
                            className="p-1 bg-slate-950 border border-amber-500/30 rounded-lg text-center"
                          >
                            <div className="text-[9px] text-amber-300">{st.k}</div>
                            <div className="text-[11px] font-bold text-white">{st.v}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex-1 min-h-0 mt-2.5 flex flex-col justify-between space-y-1.5 overflow-y-auto pr-1">
                      <h3 className="text-xs font-bold text-sky-300 uppercase tracking-wider">
                        4-Skill Kit &amp; Proc Chances (Active CD 7.0s)
                      </h3>
                      {(['basic', 'active', 'chain', 'ultimate'] as const).map((skKey, idx) => {
                        const sk = selectedHeroData.skills[skKey];
                        const lv = selectedHeroProg.skillLevels[skKey];
                        const mult = interpolateSkillMult(sk, lv);
                        const baseProc = interpolateSkillProc(sk, lv);
                        const totalProc = sk.debuff ? Math.min(100, baseProc + selectedHeroStats.effectHitRate) : 0;
                        const icons = ['🗡️', '⚡', '🔗', '🌟'];

                        return (
                          <div
                            key={skKey}
                            className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-xs shrink-0">
                                {icons[idx]}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">
                                  {sk.name}{' '}
                                  <span className="text-[10px] font-mono text-amber-300">Lv.{lv}</span>
                                </div>
                                <div className="text-[10px] text-slate-400 truncate font-mono">
                                  {sk.type} · {mult}% ATK · {sk.breakPower} BP
                                  {sk.debuff ? ` · ${sk.debuff} ${totalProc}% (${sk.debuffDuration}s)` : ''}
                                </div>
                              </div>
                            </div>
                            <button
                              disabled={lv >= 10 || gold < lv * 350}
                              onClick={() => handleUpgradeSkill(selectedHeroData.id, skKey)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-300 text-[10px] font-mono rounded shrink-0 cursor-pointer"
                            >
                              {lv >= 10 ? 'MAX' : `+Lv`}
                            </button>
                          </div>
                        );
                      })}

                      <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[10px] text-amber-200">
                        <strong>Passive — {selectedHeroData.passiveName}:</strong>{' '}
                        {selectedHeroData.passive5Star}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT (4 Cols): Gold-Framed 2-Slot Gambit Priority */}
                  <div className="col-span-12 lg:col-span-4 bg-[#0a0d18] border-2 border-amber-500/60 rounded-xl p-4 flex flex-col justify-between shadow-lg shadow-amber-500/5">
                    <div className="space-y-4">
                      <div className="border-b border-amber-500/30 pb-2">
                        <div className="text-[11px] font-mono text-amber-300 uppercase tracking-widest">
                          Autonomous Tactical Logic
                        </div>
                        <h3 className="text-base font-bold text-white font-display">
                          2-Slot Gambit Priority
                        </h3>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950 border-2 border-amber-400/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono font-bold text-[11px]">
                            SLOT 1 · PRIMARY TRIGGER
                          </span>
                          <span className="text-[11px] font-mono text-amber-300">Priority #1</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Emergency survival, Boss Shield breaker, or Stagger burst condition:
                        </p>
                        <select
                          value={selectedHeroProg.gambit1}
                          onChange={(e) =>
                            setHeroProgress((prev) => ({
                              ...prev,
                              [selectedHeroData.id]: {
                                ...prev[selectedHeroData.id],
                                gambit1: e.target.value as GambitConditionSlot1,
                              },
                            }))
                          }
                          className="w-full bg-slate-900 border border-amber-400/50 rounded-lg px-3 py-2 text-xs text-amber-100 font-semibold"
                        >
                          <option value="BOSS_STAGGER_OPEN">IF Boss Stagger Gauge is Open</option>
                          <option value="ALLY_HP_BELOW_50">IF Any Ally HP Drops Below 50%</option>
                          <option value="BOSS_SHIELD_ACTIVE">IF Boss Aegis Shield is Active</option>
                          <option value="ALWAYS_READY">IF Chain Skill Off Cooldown (Immediate)</option>
                        </select>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950 border-2 border-amber-500/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-amber-500/30 border border-amber-400 text-amber-200 font-mono font-bold text-[11px]">
                            SLOT 2 · REACTION DETONATOR
                          </span>
                          <span className="text-[11px] font-mono text-sky-300">Priority #2</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Detonates &amp; consumes elemental status on target for 9-Reaction Matrix burst:
                        </p>
                        <select
                          value={selectedHeroProg.gambit2}
                          onChange={(e) =>
                            setHeroProgress((prev) => ({
                              ...prev,
                              [selectedHeroData.id]: {
                                ...prev[selectedHeroData.id],
                                gambit2: e.target.value as GambitConditionSlot2,
                              },
                            }))
                          }
                          className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-3 py-2 text-xs text-amber-100 font-semibold"
                        >
                          <option value="TARGET_HAS_FREEZE">IF Target Has Freeze (MELTDOWN)</option>
                          <option value="TARGET_HAS_SHOCK">IF Target Has Shock (SUPERCONDUCT)</option>
                          <option value="TARGET_HAS_BURN">IF Target Has Burn (FIRESTORM)</option>
                          <option value="TARGET_HAS_LUMINOUS">IF Target Has Luminous Mark (TWILIGHT)</option>
                          <option value="ANY_DEBUFF">IF Target Has Any Elemental Debuff</option>
                        </select>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono">
                      Chain Skill: <strong className="text-amber-300">{selectedHeroData.skills.chain.name}</strong> (CD {selectedHeroData.skills.chain.cooldown}s)
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 3: EQUIPMENT & FORGE (5 GEAR SLOTS + ALL 8 SETS + FAIL STACK)
           ============================================================ */}
        {activeTab === 'FORGE' && (
          <div className="flex-1 min-h-0 grid grid-cols-12 gap-4 p-4 overflow-hidden max-w-7xl mx-auto w-full">
            {/* LEFT 55% (7 Cols): Character Centerpiece Flanked by All 5 Equipment Slots (Weapon, Armor, Ring I, Ring II, Core Sigil) */}
            <div className="col-span-12 lg:col-span-7 bg-[#0a0d18] border border-slate-800 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden">
              <div className="flex items-center justify-between z-10">
                <div>
                  <div className="text-xs font-mono text-amber-300 uppercase">
                    5-Slot Relic Loadout &amp; Artisan Forge (8 Sets · +15 Fail Stack)
                  </div>
                  <h2 className="text-lg font-bold text-white font-display">
                    {selectedHeroData.name} — {selectedHeroData.title}
                  </h2>
                </div>
                <select
                  value={selectedHeroId}
                  onChange={(e) => {
                    const nextHero = e.target.value;
                    setSelectedHeroId(nextHero);
                    const firstGear = gearInventory.find((g) => g.equippedBy === nextHero);
                    if (firstGear) setSelectedGearId(firstGear.id);
                  }}
                  className="bg-slate-950 border border-amber-500/40 rounded-lg px-3 py-1.5 text-xs text-amber-200 font-semibold"
                >
                  {RESONATORS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.element})
                    </option>
                  ))}
                </select>
              </div>

              {/* Symmetrical Center Stage: Left 2 Equal Slots (Weapon, Armor) + Center Splash Art & Bottom Core Sigil + Right 2 Equal Slots (Ring I, Ring II) */}
              <div className="flex-1 min-h-0 grid grid-cols-12 items-stretch gap-3 my-2">
                {/* Left 2 Slots: Weapon & Armor (Equal Height & Styling) */}
                <div className="col-span-3 flex flex-col justify-center gap-3 z-10">
                  {(['Weapon', 'Armor'] as GearSlot[]).map((slot) => {
                    const item = gearInventory.find(
                      (g) => g.equippedBy === selectedHeroId && g.slot === slot
                    );
                    const isSelected = item && selectedGearId === item.id;
                    const mainVals = item ? getGearMainStatValue(item) : null;
                    const icon = slot === 'Weapon' ? '⚔️' : '🛡️';

                    return (
                      <div
                        key={slot}
                        onClick={() => item && setSelectedGearId(item.id)}
                        className={`h-24 p-2.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 border-amber-400 shadow-md shadow-amber-500/15'
                            : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-300">
                            {icon} {slot}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/50 text-amber-300 font-mono font-bold text-[10px]">
                            +{item ? item.level : 0}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-white truncate">
                          {item ? item.name : `Empty ${slot}`}
                        </div>
                        {item && mainVals ? (
                          <div className="text-[10px] font-mono text-emerald-400 truncate">
                            {item.mainStatKey} +{mainVals.pct}%
                            {mainVals.flat ? ` (+${mainVals.flat})` : ''}
                          </div>
                        ) : (
                          <div className="text-[10px] font-mono text-slate-500 truncate">No Relic Equipped</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Center Column: Character Art + Bottom-Center Core Sigil Slot */}
                <div className="col-span-6 h-full min-h-0 flex flex-col items-center justify-between relative py-1 gap-2">
                  <div className="flex-1 min-h-0 w-full flex items-center justify-center p-1">
                    <ResonatorSplashArt hero={selectedHeroData} className="max-h-full w-auto scale-105" />
                  </div>

                  {/* Bottom-Center Slot: Exotic Core Sigil */}
                  {(() => {
                    const slot: GearSlot = 'Core Sigil';
                    const item = gearInventory.find(
                      (g) => g.equippedBy === selectedHeroId && g.slot === slot
                    );
                    const isSelected = item && selectedGearId === item.id;
                    const mainVals = item ? getGearMainStatValue(item) : null;

                    return (
                      <div
                        onClick={() => item && setSelectedGearId(item.id)}
                        className={`w-full max-w-[250px] p-2.5 rounded-xl border transition-all cursor-pointer z-10 ${
                          isSelected
                            ? 'bg-slate-900 border-amber-400 shadow-md shadow-amber-500/20'
                            : 'bg-slate-950/95 border-purple-500/50 hover:border-purple-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-purple-300 font-semibold">
                            🔮 Core Sigil
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/50 text-amber-300 font-mono font-bold text-[10px]">
                            +{item ? item.level : 0}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-white truncate mt-0.5">
                          {item ? item.name : 'Empty Core Sigil'}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          {item && mainVals && (
                            <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                              {item.mainStatKey} +{mainVals.pct}%
                            </span>
                          )}
                          {item?.sigilTrait && (
                            <span className="text-[9px] font-mono text-purple-300 truncate">
                              ★ {item.sigilTrait.name}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Right 2 Slots: Ring I & Ring II (Equal Height & Symmetrical to Left 2 Slots) */}
                <div className="col-span-3 flex flex-col justify-center gap-3 z-10">
                  {(['Ring I', 'Ring II'] as GearSlot[]).map((slot) => {
                    const item = gearInventory.find(
                      (g) => g.equippedBy === selectedHeroId && g.slot === slot
                    );
                    const isSelected = item && selectedGearId === item.id;
                    const mainVals = item ? getGearMainStatValue(item) : null;

                    return (
                      <div
                        key={slot}
                        onClick={() => item && setSelectedGearId(item.id)}
                        className={`h-24 p-2.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 border-amber-400 shadow-md shadow-amber-500/15'
                            : 'bg-slate-950/90 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-slate-300">
                            💍 {slot}
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-400/50 text-amber-300 font-mono font-bold text-[10px]">
                            +{item ? item.level : 0}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-white truncate">
                          {item ? item.name : `Empty ${slot}`}
                        </div>
                        {item && mainVals ? (
                          <div className="text-[10px] font-mono text-emerald-400 truncate">
                            {item.mainStatKey} +{mainVals.pct}%
                          </div>
                        ) : (
                          <div className="text-[10px] font-mono text-slate-500 truncate">No Relic Equipped</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Strip: Forge Any of the 8 SSOT v2.1 Sets */}
              <div className="z-10 pt-1.5 border-t border-slate-800/80 space-y-1">
                <div className="text-[10px] font-mono text-slate-400">
                  Forge 8 Relic Sets into Selected Slot ({selectedGear ? selectedGear.slot : 'Weapon'} · 900G):
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {EQUIPMENT_SETS.map((s) => (
                    <button
                      key={s.id}
                      disabled={gold < 900}
                      onClick={() =>
                        handleForgeNewRelic(s.id, selectedGear ? selectedGear.slot : 'Weapon')
                      }
                      className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-200 truncate cursor-pointer"
                    >
                      ⚒️ {s.displayName}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT 45% (5 Cols): Combat Stat Readout + Gold SET BONUS ACTIVE + AUTO-EQUIP & ENHANCE +1 */}
            <div className="col-span-12 lg:col-span-5 bg-[#0a0d18] border border-slate-800 rounded-xl p-4 flex flex-col justify-between min-h-0">
              <div className="space-y-3">
                <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-mono text-slate-400 uppercase">
                      Combat Attribute Summary
                    </div>
                    <h3 className="text-base font-bold text-white font-display">
                      Resonator Power &amp; 8-Set Synergy
                    </h3>
                  </div>
                  <div className="flex flex-col items-end font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-400/15 border border-amber-400/50 text-amber-300 font-bold text-xs">
                        ⚡ CP: {(heroCpMap[selectedHeroData.id] || 0).toLocaleString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCpBreakdownOpen(true)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-400/50 text-[11px] font-mono font-semibold text-amber-200 hover:text-white transition-colors cursor-pointer"
                      >
                        Inspect CP
                      </button>
                    </div>
                    {cpDeltaToast && cpDeltaToast.heroId === selectedHeroData.id && (
                      <span className="text-emerald-400 font-bold text-[11px] mt-0.5">
                        +{cpDeltaToast.delta.toLocaleString()} CP
                      </span>
                    )}
                  </div>
                </div>

                {/* 6 Key Stat Cards including Status Chance (Effect Hit%) */}
                <div className="grid grid-cols-3 gap-2 font-mono tabular-nums">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">ATK</div>
                    <div className="text-base font-bold text-amber-300">
                      {selectedHeroStats.atk.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">BREAK POWER</div>
                    <div className="text-base font-bold text-sky-300">
                      {selectedHeroStats.breakPower}%
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">CRIT DMG</div>
                    <div className="text-base font-bold text-rose-400">
                      {selectedHeroStats.critDmg}%
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">STATUS CHANCE</div>
                    <div className="text-base font-bold text-purple-300">
                      +{selectedHeroStats.effectHitRate}%
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">ENERGY CHARGE</div>
                    <div className="text-base font-bold text-emerald-400">
                      {selectedHeroStats.energyCharge}%
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">SPD</div>
                    <div className="text-base font-bold text-white">
                      {selectedHeroStats.spd}
                    </div>
                  </div>
                </div>

                {/* Gold Box: SET BONUS ACTIVE ([2-PC] / [4-PC]) */}
                <div className="p-3 rounded-xl bg-amber-500/10 border-2 border-amber-400/70 space-y-1">
                  <div className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                    ✦ SET BONUS ACTIVE (2-PC / 4-PC)
                  </div>
                  {selectedHeroStats.activeSets.length > 0 ? (
                    selectedHeroStats.activeSets.map((act) => {
                      const spec = EQUIPMENT_SETS.find((s) => s.id === act.set);
                      return (
                        <div key={act.set} className="text-xs text-slate-200 space-y-0.5">
                          <div>
                            <strong className="text-amber-200">[2-PC {spec?.displayName || act.set}]:</strong>{' '}
                            {spec?.twoPieceDesc}
                          </div>
                          {act.count >= 4 && (
                            <div>
                              <strong className="text-amber-300">[4-PC {spec?.displayName || act.set}]:</strong>{' '}
                              {spec?.fourPieceDesc}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-xs text-slate-400">
                      Equip 2 or 4 matching set pieces to activate Set Bonuses.
                    </div>
                  )}
                </div>

                {/* Selected Gear Artisan's Pity Preview */}
                {selectedGear && (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold truncate">
                        {selectedGear.slot}: {selectedGear.name} (+{selectedGear.level}/15)
                      </span>
                      <span className="text-emerald-400 shrink-0">
                        {selectedGear.level < 15
                          ? `Success: ${calculateCurrentSuccessRate(
                              selectedGear.level + 1,
                              selectedGear.failStackCount
                            )}%`
                          : 'MASTERWORK +15'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Fail Stack Pity: +{selectedGear.failStackCount} tries (No Break / No Downgrade)
                      {forgeFeedback ? ` · ${forgeFeedback.text}` : ''}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    const recSet: SetId =
                      selectedHeroData.role === 'Tank / Breaker'
                        ? 'Titan'
                        : selectedHeroData.role === 'Support & Healer'
                        ? 'Radiant Dawn'
                        : selectedHeroData.role === 'Debuffer'
                        ? 'Voidweaver'
                        : 'Starfall Executioner';
                    setGearInventory((prev) =>
                      prev.map((item) =>
                        item.equippedBy === selectedHeroId ? { ...item, set: recSet } : item
                      )
                    );
                    sfx.play('forge_ok');
                    setForgeFeedback({
                      text: `Auto-equipped 4-PC ${recSet === 'Voidweaver' ? 'Omen (Voidweaver)' : recSet} for ${selectedHeroData.name}!`,
                      success: true,
                    });
                  }}
                  className="py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-sky-500/20 cursor-pointer"
                >
                  [AUTO-EQUIP BEST]
                </button>
                <button
                  disabled={!selectedGear || selectedGear.level >= 15 || gold < (selectedGear.level + 1) * 250}
                  onClick={() => selectedGear && handleEnhanceGear(selectedGear.id)}
                  className="py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-bold text-xs tracking-wider uppercase shadow-lg shadow-rose-500/25 cursor-pointer"
                >
                  {selectedGear && selectedGear.level < 15
                    ? `[ENHANCE +1] (${(selectedGear.level + 1) * 250}G)`
                    : '[MAX +15]'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 4: SUMMON & STARFALL EXCHANGE SHOP (WITH 5-PORTRAIT WISHLIST)
           ============================================================ */}
        {activeTab === 'SUMMON' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between p-4 overflow-hidden max-w-7xl mx-auto w-full gap-3">
            {/* Upper 3-Column Showcase (Left 2 Cols Permanent Sub-Tabs / Center 8 Cols Showcase or Exchange Shop / Right 2 Cols Preview) */}
            <div className="flex-1 min-h-0 grid grid-cols-12 gap-3 overflow-hidden">
              {/* LEFT (2 Cols): 2 Permanent Vertical Sub-Tabs (Limited Hero Banner + Standard Summon; No Weapon Banner) */}
              <div className="col-span-12 lg:col-span-2 flex flex-col justify-between gap-2.5 min-h-0">
                <button
                  onClick={() => setActiveBannerId('RATE_UP')}
                  className={`flex-1 p-3 rounded-xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
                    activeBannerId === 'RATE_UP'
                      ? 'bg-amber-500/15 border-amber-400 shadow-lg shadow-amber-500/15'
                      : 'bg-[#0a0d18] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-amber-400 text-slate-950 rounded">
                      RATE-UP FOCUS
                    </span>
                    <div className="text-xs font-bold text-amber-200 mt-1.5 font-display">
                      LIMITED HERO BANNER
                    </div>
                    <div className="text-[10px] text-slate-300 truncate mt-0.5">
                      {featuredBannerHero.name} · 65%
                    </div>
                  </div>
                  <div className="text-[9px] font-mono text-amber-300">★ Featured Sovereign</div>
                </button>

                <button
                  onClick={() => setActiveBannerId('STANDARD')}
                  className={`flex-1 p-3 rounded-xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
                    activeBannerId === 'STANDARD'
                      ? 'bg-sky-500/15 border-sky-400 shadow-lg shadow-sky-500/15'
                      : 'bg-[#0a0d18] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-sky-400 text-slate-950 rounded">
                      70% WISHLIST
                    </span>
                    <div className="text-xs font-bold text-sky-200 mt-1.5 font-display">
                      STANDARD SUMMON
                    </div>
                    <div className="text-[10px] text-slate-300 truncate mt-0.5">5-SSR Portrait Wishlist</div>
                  </div>
                  <div className="text-[9px] font-mono text-sky-300">
                    ✦ 14% Each · 🧂 Salt: {saltCrystals}
                  </div>
                </button>
              </div>

              {/* CENTER (8 Cols): Clean Full-Bleed Splash Art + Bottom-Left Title + Bottom-Right Floating 5 Wishlist Icons */}
              <div className="col-span-12 lg:col-span-8 bg-[#0a0d18] border border-slate-800 rounded-xl p-3 relative flex flex-col justify-center overflow-hidden">
                {/* Wishlist Portrait Slot Picker Popover */}
                {wishlistSlotPicker !== null && (
                  <div className="z-30 absolute bottom-20 right-4 left-4 bg-slate-950/95 border-2 border-amber-400 rounded-xl p-3 shadow-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-amber-300 font-bold">
                        Select SSR Resonator for Wishlist Slot #{wishlistSlotPicker + 1} (14% Rate):
                      </span>
                      <button
                        onClick={() => setWishlistSlotPicker(null)}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        ✕ Close
                      </button>
                    </div>
                    <div className="grid grid-cols-6 gap-2">
                      {RESONATORS.filter((r) => r.rarity === 'SSR').map((ssr) => (
                        <button
                          key={ssr.id}
                          onClick={() => {
                            setWishlistIds((prev) => {
                              const next = [...prev];
                              next[wishlistSlotPicker] = ssr.id;
                              return next;
                            });
                            setWishlistSlotPicker(null);
                            sfx.play('forge_ok');
                          }}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 flex flex-col items-center gap-1 cursor-pointer"
                        >
                          <div className="w-11 h-11 rounded overflow-hidden">
                            <ResonatorSplashArt hero={ssr} />
                          </div>
                          <span className="text-[10px] font-bold text-white truncate w-full text-center">
                            {ssr.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Centerpiece Full-Body Splash Art */}
                <div className="flex-1 min-h-0 flex items-center justify-center p-1">
                  <ResonatorSplashArt hero={featuredBannerHero} className="max-h-full w-auto scale-105" />
                </div>

                {/* Recent Pulls Overlay Toast */}
                {recentPulls.length > 0 && (
                  <div className="z-20 absolute top-3 left-3 right-3 bg-slate-950/95 border border-amber-400/60 rounded-xl p-2 shadow-2xl">
                    <div className="flex items-center justify-between text-[10px] font-mono text-amber-300 mb-1">
                      <span>SUMMON RESULTS ({recentPulls.length}x · +{recentPulls.length} Starfall Shards)</span>
                      <button
                        onClick={() => setRecentPulls([])}
                        className="text-slate-400 hover:text-white cursor-pointer"
                      >
                        ✕ Close
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                      {recentPulls.map((p, idx) => (
                        <span
                          key={idx}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                            p.rarity === 'SSR'
                              ? 'bg-amber-400/20 border-amber-400 text-amber-200 font-bold'
                              : p.rarity === 'SR'
                              ? 'bg-sky-500/20 border-sky-400/60 text-sky-200'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          [{p.rarity}] {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bottom-Left Hero Typography (Clean Floating Text, No Opaque Container Box) */}
                <div className="absolute bottom-6 left-6 z-10 text-left pointer-events-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
                  <div className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-widest">
                    {featuredBannerHero.rarity} · {featuredBannerHero.element} · {featuredBannerHero.role}
                  </div>
                  <div className="text-2xl font-extrabold text-white font-display tracking-wider leading-tight">
                    {featuredBannerHero.name}
                  </div>
                  <div
                    className="text-xs font-semibold"
                    style={{ color: ELEMENT_META[featuredBannerHero.element].color }}
                  >
                    {featuredBannerHero.title}
                  </div>
                </div>

                {/* Bottom-Right Floating 5 Wishlist Portrait Squares (No Background Container or Text Label) */}
                <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5">
                  {wishlistIds.map((wId, slotIdx) => {
                    const wHero = RESONATORS.find((r) => r.id === wId) || RESONATORS[0];
                    const elColor = ELEMENT_META[wHero.element].color;
                    const isEditing = wishlistSlotPicker === slotIdx;
                    return (
                      <button
                        key={slotIdx}
                        onClick={() => {
                          setFeaturedBannerHeroId(wHero.id);
                          setWishlistSlotPicker(isEditing ? null : slotIdx);
                        }}
                        title={`Wishlist #${slotIdx + 1}: ${wHero.name} (14% SSR Rate) — Click to change`}
                        className={`w-11 h-11 rounded-lg border-2 bg-slate-950/85 relative overflow-hidden cursor-pointer transition-transform hover:scale-105 shadow-lg ${
                          isEditing ? 'ring-2 ring-amber-300' : ''
                        }`}
                        style={{ borderColor: isEditing ? '#fde047' : elColor }}
                      >
                        <ResonatorSplashArt hero={wHero} className="w-full h-full object-cover scale-125" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT (2 Cols — Compact): IN-COMBAT 2D PIXEL PREVIEW + [TEST ULTIMATE] Button */}
              <div className="col-span-12 lg:col-span-2 bg-[#0a0d18] border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between items-center text-center">
                <div className="w-full">
                  <div className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
                    2D PIXEL PREVIEW
                  </div>
                  <p className="text-[9px] text-slate-400 mt-0.5">16-Bit HD-2D Sprite</p>
                </div>

                <div
                  className={`w-full bg-slate-950 border rounded-xl py-2 flex flex-col items-center justify-center relative transition-all ${
                    ultTestPulse ? 'border-purple-400 ring-2 ring-purple-500/40' : 'border-slate-800'
                  }`}
                >
                  <PixelPreviewCanvas hero={featuredBannerHero} />
                  {ultTestPulse && (
                    <div className="mt-1 text-[10px] font-mono font-bold text-purple-300">
                      ⚡ {featuredBannerHero.skills.ultimate.name}!
                    </div>
                  )}
                </div>

                <div className="w-full space-y-1.5">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[10px] text-slate-300 text-left">
                    <div className="font-bold text-amber-300 truncate">
                      Ult: {featuredBannerHero.skills.ultimate.name}
                    </div>
                    <div className="text-slate-400 truncate text-[9px]">
                      {featuredBannerHero.skills.ultimate.specialDesc}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      sfx.play('ult');
                      setUltTestPulse(true);
                      setTimeout(() => setUltTestPulse(false), 1200);
                    }}
                    className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] tracking-wider uppercase shadow-md shadow-purple-600/30 cursor-pointer"
                  >
                    [TEST ULTIMATE]
                  </button>
                </div>
              </div>
            </div>

            {/* BOTTOM BAR ABOVE DOCK: Pity Guarantee Left + Exchange Button & [1x / 10x SUMMON] Right */}
            <div className="bg-[#0a0d18] border border-amber-500/30 rounded-xl px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-4">
                <div className="text-sm font-mono font-bold text-amber-300 tracking-wide">
                  5-STAR GUARANTEED IN: <span className="text-white text-base">{Math.max(1, 30 - gachaPity)}</span> PULLS
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  (Pity: {gachaPity}/30 · Starfall Shards: <strong className="text-rose-300">{starfallShards}</strong>)
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    setMerchantTab('STARFALL');
                    setMerchantHubOpen(true);
                  }}
                  title={`Starfall Exchange Shop (${starfallShards} Shards)`}
                  className="relative w-10 h-10 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400 text-rose-200 flex items-center justify-center shadow-md transition-transform active:scale-95 cursor-pointer"
                >
                  <span className="text-base leading-none">🏛️</span>
                  <span className="absolute -top-1.5 -right-1.5 px-1 py-0.2 rounded-full bg-rose-500 text-white font-mono font-bold text-[9px] leading-tight">
                    {starfallShards}
                  </span>
                </button>
                {!hasDoneFirstFreePull ? (
                  <button
                    onClick={() => handleSummonPull(1)}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-500 via-fuchsia-500 to-amber-400 hover:brightness-110 text-slate-950 font-extrabold text-xs tracking-wider uppercase shadow-lg shadow-purple-500/30 ring-2 ring-amber-300/80 cursor-pointer animate-pulse"
                  >
                    [✨ FREE FIRST SUMMON (100% SR)] (0 💎)
                  </button>
                ) : (
                  <button
                    disabled={starlightGems < 160}
                    onClick={() => handleSummonPull(1)}
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 disabled:opacity-40 text-slate-100 font-bold text-xs tracking-wider uppercase cursor-pointer"
                  >
                    [1x SUMMON] (160 💎)
                  </button>
                )}
                <button
                  disabled={starlightGems < 1600}
                  onClick={() => handleSummonPull(10)}
                  className="px-7 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-amber-500/25 cursor-pointer"
                >
                  [10x SUMMON] (1,600 💎)
                </button>
              </div>
            </div>

            {/* STARFALL EXCHANGE POPUP MODAL WINDOW WITH UNIFORM MOCKUP ITEM SLOTS */}
            {exchangeShopOpen && (
              <div
                onClick={() => setExchangeShopOpen(false)}
                className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-5xl bg-[#0a0d18] border-2 border-rose-500/60 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <div className="text-[11px] font-mono text-rose-300 uppercase tracking-wider">
                        Starfall Exchange Sanctuary · 1 Gacha Pull = 1 Starfall Shard
                      </div>
                      <h2 className="text-xl font-bold text-white font-display">
                        🏛️ Starfall Exchange Sanctuary
                      </h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-rose-400/50 text-xs font-mono text-rose-200">
                        Starfall Shards: <strong className="text-white text-sm">{starfallShards}</strong>
                      </div>
                      <button
                        onClick={() => setExchangeShopOpen(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white cursor-pointer"
                      >
                        ✕ Close
                      </button>
                    </div>
                  </div>

                  {/* Uniform 4-Column Exchange Item Slots with Square Mockup Visuals */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    {[
                      {
                        id: 'SIG_WEAPON',
                        tag: '5★ SIGNATURE RELIC',
                        name: `${featuredBannerHero.name}'s Astral Edge`,
                        cost: 80,
                        accent: 'border-amber-400/60 from-amber-500/20 to-rose-500/10',
                        badgeBg: 'bg-amber-400 text-slate-950',
                        desc: '+9 Masterwork Weapon (+20% ATK & CRIT Substats)',
                        mockupType: 'WEAPON' as const,
                        onBuy: () => {
                          if (starfallShards < 80) return;
                          setStarfallShards((s) => s - 80);
                          const sigWep: GearItem = {
                            id: `G_SIGWEP_${Date.now()}`,
                            name: `${featuredBannerHero.name}'s Astral Edge`,
                            slot: 'Weapon',
                            set: 'Starfall Executioner',
                            level: 9,
                            failStackCount: 0,
                            mainStatKey: 'ATK%',
                            baseMainValue: 10,
                            baseFlatStat: 125,
                            substats: [
                              { stat: 'CRIT RATE%', value: 10 },
                              { stat: 'CRIT DMG%', value: 18 },
                            ],
                            equippedBy: featuredBannerHero.id,
                          };
                          setGearInventory((prev) => [
                            sigWep,
                            ...prev.map((it) =>
                              it.equippedBy === featuredBannerHero.id && it.slot === 'Weapon'
                                ? { ...it, equippedBy: undefined }
                                : it
                            ),
                          ]);
                          sfx.play('gacha');
                        },
                      },
                      {
                        id: 'LIMITED_HERO',
                        tag: 'LIMITED SOVEREIGN',
                        name: `${featuredBannerHero.name} Soul Shard`,
                        cost: 100,
                        accent: 'border-rose-400/60 from-rose-500/20 to-purple-500/10',
                        badgeBg: 'bg-rose-400 text-slate-950',
                        desc: 'Ascends Featured Sovereign by +1★ & +5 Lv immediately.',
                        mockupType: 'HERO_FEATURED' as const,
                        onBuy: () => {
                          if (starfallShards < 100) return;
                          setStarfallShards((s) => s - 100);
                          setHeroProgress((prev) => {
                            const cur = prev[featuredBannerHero.id];
                            return {
                              ...prev,
                              [featuredBannerHero.id]: {
                                ...cur,
                                stars: Math.min(5, cur.stars + 1),
                                level: Math.min(100, cur.level + 5),
                              },
                            };
                          });
                          sfx.play('gacha');
                        },
                      },
                      {
                        id: 'ROTATING_SSR',
                        tag: 'WISHLIST SSR',
                        name: `${RESONATORS.find((r) => r.id === wishlistIds[0])?.name || 'Ignis'} Crest`,
                        cost: 75,
                        accent: 'border-sky-400/60 from-sky-500/20 to-indigo-500/10',
                        badgeBg: 'bg-sky-400 text-slate-950',
                        desc: 'Promotes your #1 Wishlist SSR Resonator by +1★ & +5 Lv.',
                        mockupType: 'HERO_WISHLIST' as const,
                        onBuy: () => {
                          if (starfallShards < 75) return;
                          const targetId = wishlistIds[0] || 'H01';
                          setStarfallShards((s) => s - 75);
                          setHeroProgress((prev) => {
                            const cur = prev[targetId];
                            return {
                              ...prev,
                              [targetId]: {
                                ...cur,
                                stars: Math.min(5, cur.stars + 1),
                                level: Math.min(100, cur.level + 5),
                              },
                            };
                          });
                          sfx.play('gacha');
                        },
                      },
                      {
                        id: 'CATALYST_BUNDLE',
                        tag: 'FORGE CATALYST',
                        name: 'Reforge & Fail Stack Chest',
                        cost: 15,
                        accent: 'border-purple-400/60 from-purple-500/20 to-amber-500/10',
                        badgeBg: 'bg-purple-400 text-slate-950',
                        desc: 'Grants +15,000 Gold & upgrades Selected Relic by +1 Lv.',
                        mockupType: 'CHEST' as const,
                        onBuy: () => {
                          if (starfallShards < 15) return;
                          setStarfallShards((s) => s - 15);
                          setGold((g) => g + 15000);
                          if (selectedGear && selectedGear.level < 15) {
                            setGearInventory((prev) =>
                              prev.map((it) =>
                                it.id === selectedGear.id ? { ...it, level: Math.min(15, it.level + 1) } : it
                              )
                            );
                          }
                          sfx.play('forge_ok');
                        },
                      },
                    ].map((item) => {
                      const wishHero = RESONATORS.find((r) => r.id === wishlistIds[0]) || RESONATORS[0];
                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-xl bg-slate-950 border ${item.accent} flex flex-col justify-between gap-2.5`}
                        >
                          {/* Uniform Square Mockup Preview Box */}
                          <div
                            className={`relative w-full aspect-square rounded-lg bg-gradient-to-br ${item.accent} border border-slate-800 flex flex-col items-center justify-center overflow-hidden p-2`}
                          >
                            <span
                              className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${item.badgeBg}`}
                            >
                              {item.tag}
                            </span>
                            <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-950/85 border border-slate-700 text-[8px] font-mono text-slate-300">
                              MOCKUP
                            </span>

                            {item.mockupType === 'WEAPON' && (
                              <svg viewBox="0 0 80 80" className="w-24 h-24 drop-shadow-[0_0_12px_rgba(251,191,36,0.5)]">
                                <defs>
                                  <linearGradient id="mockBlade" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#fef08a" />
                                    <stop offset="50%" stopColor="#f59e0b" />
                                    <stop offset="100%" stopColor="#ef4444" />
                                  </linearGradient>
                                </defs>
                                <circle cx="40" cy="40" r="28" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="4 3" />
                                <path d="M58,16 L64,22 L32,54 L22,58 L26,48 Z" fill="url(#mockBlade)" />
                                <rect x="18" y="52" width="14" height="4" rx="2" transform="rotate(45 25 54)" fill="#fde047" />
                                <path d="M16,64 L23,57" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
                              </svg>
                            )}
                            {item.mockupType === 'HERO_FEATURED' && (
                              <div className="w-28 h-28">
                                <ResonatorSplashArt hero={featuredBannerHero} />
                              </div>
                            )}
                            {item.mockupType === 'HERO_WISHLIST' && (
                              <div className="w-28 h-28">
                                <ResonatorSplashArt hero={wishHero} />
                              </div>
                            )}
                            {item.mockupType === 'CHEST' && (
                              <svg viewBox="0 0 80 80" className="w-24 h-24 drop-shadow-[0_0_12px_rgba(192,132,252,0.5)]">
                                <rect x="16" y="30" width="48" height="32" rx="4" fill="#3b0764" stroke="#c084fc" strokeWidth="2" />
                                <path d="M14,32 L22,20 L58,20 L66,32 Z" fill="#581c87" stroke="#e9d5ff" strokeWidth="2" />
                                <rect x="35" y="28" width="10" height="12" rx="2" fill="#fbbf24" />
                                <circle cx="40" cy="34" r="2.5" fill="#090d16" />
                              </svg>
                            )}

                            <div className="absolute bottom-1.5 inset-x-1.5 bg-slate-950/90 border border-rose-500/40 rounded px-2 py-0.5 flex items-center justify-between text-[10px] font-mono">
                              <span className="text-slate-300">Price</span>
                              <span className="text-rose-300 font-bold">{item.cost} Shards</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="text-xs font-bold text-white font-display truncate">{item.name}</div>
                            <p className="text-[10px] text-slate-400 line-clamp-2 leading-snug">{item.desc}</p>
                          </div>

                          <button
                            disabled={starfallShards < item.cost}
                            onClick={item.onBuy}
                            className="w-full py-2 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
                          >
                            [Exchange · {item.cost} Shards]
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================
            TAB 5: CHRONO REWIND (12 CLICKABLE ZODIAC SECTORS + CENTER SEASONAL CONSTELLATION + UNIQUE ASYMMETRIC TREES)
           ============================================================ */}
        {activeTab === 'REWIND' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between p-3 overflow-hidden max-w-7xl mx-auto w-full gap-2">
            {(() => {
              const currentSeason = SEASONAL_EVENTS[activeSeasonIndex] || SEASONAL_EVENTS[0];
              const totalUnlockedStars = Object.values(unlockedConstellationNodes).reduce(
                (sum, arr) => sum + (arr ? arr.length : 0),
                0
              );

              // Helper to build an SVG annular sector wedge path so the ENTIRE 30° pie slice is clickable/tappable
              const describeAnnularWedge = (
                cx: number,
                cy: number,
                rIn: number,
                rOut: number,
                startDeg: number,
                endDeg: number
              ): string => {
                const startRad = (startDeg * Math.PI) / 180;
                const endRad = (endDeg * Math.PI) / 180;
                const x1 = cx + rIn * Math.cos(startRad);
                const y1 = cy + rIn * Math.sin(startRad);
                const x2 = cx + rOut * Math.cos(startRad);
                const y2 = cy + rOut * Math.sin(startRad);
                const x3 = cx + rOut * Math.cos(endRad);
                const y3 = cy + rOut * Math.sin(endRad);
                const x4 = cx + rIn * Math.cos(endRad);
                const y4 = cy + rIn * Math.sin(endRad);
                return `M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} A ${rOut} ${rOut} 0 0 1 ${x3.toFixed(2)} ${y3.toFixed(2)} L ${x4.toFixed(2)} ${y4.toFixed(2)} A ${rIn} ${rIn} 0 0 0 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
              };

              const unlockStarNode = (
                groupId: ConstellationGroupId,
                nodeIndex: number,
                cost: number
              ) => {
                const unlockedList = unlockedConstellationNodes[groupId] || [];
                if (!canUnlockConstellationNode(nodeIndex, unlockedList, groupId) || timeShards < cost)
                  return;
                const nextList = [...unlockedList, nodeIndex];
                setTimeShards((t) => t - cost);
                setUnlockedConstellationNodes((prev) => ({
                  ...prev,
                  [groupId]: nextList,
                }));
                setConstellations((prev) => ({
                  ...prev,
                  [groupId]: nextList.length,
                }));
                sfx.play('forge_ok');
              };

              const handleUndoSingleNode = (
                groupId: ConstellationGroupId,
                nodeIndex: number,
                refundShards: number
              ) => {
                const unlockedList = unlockedConstellationNodes[groupId] || [];
                const goldCost = 2500;
                if (!canUndoConstellationNode(nodeIndex, unlockedList, groupId) || gold < goldCost)
                  return;
                const nextList = unlockedList.filter((idx) => idx !== nodeIndex);
                setGold((g) => g - goldCost);
                setTimeShards((t) => t + refundShards);
                setUnlockedConstellationNodes((prev) => ({
                  ...prev,
                  [groupId]: nextList,
                }));
                setConstellations((prev) => ({
                  ...prev,
                  [groupId]: nextList.length,
                }));
                sfx.play('gacha');
              };

              const handleResetConstellationGroup = (groupId: ConstellationGroupId) => {
                const group = GRAND_CONSTELLATIONS.find((g) => g.id === groupId);
                const unlockedList = unlockedConstellationNodes[groupId] || [];
                if (!group || unlockedList.length === 0) return;
                const goldCost = unlockedList.length * 2500;
                if (gold < goldCost) return;
                const refundShards = group.nodes
                  .filter((n) => unlockedList.includes(n.index))
                  .reduce((sum, n) => sum + n.shardCost, 0);
                setGold((g) => g - goldCost);
                setTimeShards((t) => t + refundShards);
                setUnlockedConstellationNodes((prev) => ({
                  ...prev,
                  [groupId]: [],
                }));
                setConstellations((prev) => ({
                  ...prev,
                  [groupId]: 0,
                }));
                sfx.play('gacha');
              };

              const handleStartNewSeasonEvent = () => {
                // Only 1 season displayed during each season period; starting a new season deletes old seasonal progress
                const nextIdx = (activeSeasonIndex + 1) % SEASONAL_EVENTS.length;
                setActiveSeasonIndex(nextIdx);
                setUnlockedConstellationNodes((prev) => ({
                  ...prev,
                  SEASONAL_CROWN: [],
                }));
                setConstellations((prev) => ({
                  ...prev,
                  SEASONAL_CROWN: 0,
                }));
                sfx.play('gacha');
              };

              const inspectedGroup =
                GRAND_CONSTELLATIONS.find((g) => g.id === hoveredConstellationId) ||
                GRAND_CONSTELLATIONS[0];
              const inspectedUnlocked = unlockedConstellationNodes[inspectedGroup.id] || [];
              const inspectedResetCost = inspectedUnlocked.length * 2500;

              return (
                <>
                  {/* Top Header Bar */}
                  <div className="bg-[#0a0d18] border border-slate-800 rounded-xl px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-3">
                      {zoomedConstellationId !== null && (
                        <button
                          onClick={() => setZoomedConstellationId(null)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-400/60 text-amber-300 font-mono font-bold text-xs cursor-pointer"
                        >
                          ← Back to Full Zodiac Map
                        </button>
                      )}
                      <div>
                        <div className="text-[10px] font-mono text-purple-300 uppercase">
                          Astral Zodiac Observatory · {totalUnlockedStars}/{TOTAL_CHRONO_STARS}★ Total Unlocked · Active Season: {currentSeason.code}
                        </div>
                        <h2 className="text-base font-bold text-white font-display">
                          {zoomedConstellationId
                            ? (() => {
                                const zg =
                                  GRAND_CONSTELLATIONS.find((g) => g.id === zoomedConstellationId) ||
                                  GRAND_CONSTELLATIONS[0];
                                return zg.id === 'SEASONAL_CROWN'
                                  ? `${currentSeason.symbol} ${currentSeason.name} — Unique ${zg.nodes.length}-Node Tree (Rows: ${zg.rowCounts.join('→')})`
                                  : `${zg.symbol} ${zg.name} (${zg.zodiacTitle}) — Unique ${zg.nodes.length}-Node Tree (Rows: ${zg.rowCounts.join('→')})`;
                              })()
                            : '12-Zodiac Interactive Wheel & Center Seasonal Constellation (Click or Tap Any Sector Wedge to Zoom)'}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={handleStartNewSeasonEvent}
                        title="Start the next Season Event period (deletes old seasonal constellation nodes so you start fresh for the new season)"
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/60 text-emerald-200 font-mono font-bold text-[10px] cursor-pointer"
                      >
                        ↻ New Season Event (S{currentSeason.seasonNumber} → Next)
                      </button>
                      <div className="text-xs font-mono text-slate-300">
                        Claimable:{' '}
                        <strong className="text-purple-300">
                          +{Math.max(25, Math.round(floor * 28 * (1 + (((constellations['PISCES'] || 0) + (constellations['AQUARIUS'] || 0)) * 6) / 100)))} Shards
                        </strong>
                      </div>
                      <button
                        onClick={handleChronoRewind}
                        className="px-3.5 py-1.5 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-purple-500/20 cursor-pointer"
                      >
                        [Trigger Chrono Rewind]
                      </button>
                    </div>
                  </div>

                  {/* MAIN STAGE: FULL ZODIAC WHEEL OVERVIEW vs ZOOMED UNIQUE TREE VIEW */}
                  {zoomedConstellationId === null ? (
                    <div className="flex-1 min-h-0 flex flex-col justify-between gap-2 overflow-hidden">
                      <div className="flex-1 min-h-0 bg-[#040714] border border-slate-800 rounded-xl relative overflow-hidden flex items-center justify-center">
                        <svg viewBox="0 0 940 440" className="w-full h-full select-none">
                          <defs>
                            <radialGradient id="zodiacSpaceBg" cx="50%" cy="50%" r="55%">
                              <stop offset="0%" stopColor="rgba(30, 64, 175, 0.35)" />
                              <stop offset="55%" stopColor="rgba(15, 23, 42, 0.88)" />
                              <stop offset="100%" stopColor="rgba(2, 6, 23, 1)" />
                            </radialGradient>
                            <radialGradient id="starFlare" cx="50%" cy="50%" r="50%">
                              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                              <stop offset="40%" stopColor="#bae6fd" stopOpacity="0.85" />
                              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                            </radialGradient>
                          </defs>

                          <rect width="940" height="440" fill="url(#zodiacSpaceBg)" />

                          {/* Background Starfield */}
                          {Array.from({ length: 64 }).map((_, idx) => (
                            <circle
                              key={idx}
                              cx={(idx * 143) % 920 + 10}
                              cy={(idx * 83) % 420 + 10}
                              r={(idx % 2) * 0.7 + 0.6}
                              fill="#cbd5e1"
                              opacity={0.35}
                            />
                          ))}

                          {/* Base Concentric Rings Centered at (470, 220) */}
                          <circle
                            cx={470}
                            cy={220}
                            r={206}
                            fill="rgba(7, 12, 28, 0.65)"
                            stroke="#475569"
                            strokeWidth="1.6"
                          />
                          <circle
                            cx={470}
                            cy={220}
                            r={120}
                            fill="rgba(10, 18, 40, 0.78)"
                            stroke="#475569"
                            strokeWidth="1.4"
                          />

                          {/* 12 FULL-WEDGE CLICKABLE / TAPPABLE ZODIAC SECTORS */}
                          {ZODIAC_WHEEL_SECTORS.map((sector) => {
                            const startDeg = sector.angleDeg - 15;
                            const endDeg = sector.angleDeg + 15;
                            const midRad = (sector.angleDeg * Math.PI) / 180;

                            // Full-sector SVG annular path (r = 72 to r = 206) so clicking anywhere in the wedge works
                            const outerWedgePath = describeAnnularWedge(470, 220, 120, 206, startDeg, endDeg);
                            const symbolWedgePath = describeAnnularWedge(470, 220, 72, 120, startDeg, endDeg);

                            const symX = 470 + 96 * Math.cos(midRad);
                            const symY = 220 + 96 * Math.sin(midRad);
                            const labelX = 470 + 191 * Math.cos(midRad);
                            const labelY = 220 + 191 * Math.sin(midRad);
                            const countX = 470 + 131 * Math.cos(midRad);
                            const countY = 220 + 131 * Math.sin(midRad);

                            const group = GRAND_CONSTELLATIONS.find((g) => g.id === sector.groupId)!;
                            const unlockedCount = (unlockedConstellationNodes[sector.groupId] || []).length;
                            const isHovered = hoveredConstellationId === sector.groupId;

                            const starCoords = sector.stars.map(([aOff, rFrac]) => {
                              const r = 136 + rFrac * 44;
                              const a = ((sector.angleDeg + aOff) * Math.PI) / 180;
                              return [470 + r * Math.cos(a), 220 + r * Math.sin(a)] as [number, number];
                            });

                            return (
                              <g
                                key={sector.id}
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredConstellationId(sector.groupId)}
                                onClick={() => {
                                  setHoveredConstellationId(sector.groupId);
                                  setZoomedConstellationId(sector.groupId);
                                  setSelectedStarNode({ groupId: sector.groupId, nodeIdx: 0 });
                                }}
                              >
                                {/* Outer Constellation Wedge Hitbox & Highlight */}
                                <path
                                  d={outerWedgePath}
                                  pointerEvents="all"
                                  fill={
                                    isHovered
                                      ? `${sector.color}33`
                                      : unlockedCount > 0
                                      ? `${sector.color}14`
                                      : 'rgba(15, 23, 42, 0.02)'
                                  }
                                  stroke={isHovered ? sector.color : '#334155'}
                                  strokeWidth={isHovered ? 1.8 : 1.1}
                                />

                                {/* Inner Zodiac Symbol Ring Wedge Hitbox & Highlight */}
                                <path
                                  d={symbolWedgePath}
                                  pointerEvents="all"
                                  fill={
                                    isHovered
                                      ? `${sector.color}44`
                                      : unlockedCount > 0
                                      ? 'rgba(30, 41, 59, 0.65)'
                                      : 'rgba(10, 18, 40, 0.45)'
                                  }
                                  stroke={isHovered ? sector.color : '#334155'}
                                  strokeWidth={isHovered ? 1.6 : 1}
                                />

                                {/* Constellation Lines Inside Wedge */}
                                {sector.edges.map(([s1, s2], eIdx) => {
                                  const p1 = starCoords[s1];
                                  const p2 = starCoords[s2];
                                  if (!p1 || !p2) return null;
                                  return (
                                    <line
                                      key={eIdx}
                                      x1={p1[0]}
                                      y1={p1[1]}
                                      x2={p2[0]}
                                      y2={p2[1]}
                                      stroke={isHovered ? '#fde047' : unlockedCount > 0 ? '#bae6fd' : '#64748b'}
                                      strokeWidth={isHovered ? 1.6 : 1.15}
                                      opacity={0.9}
                                      pointerEvents="none"
                                    />
                                  );
                                })}

                                {/* Glowing Star Nodes Inside Wedge */}
                                {starCoords.map(([sx, sy], sIdx) => (
                                  <g key={sIdx} pointerEvents="none">
                                    {(sIdx === 0 || isHovered) && (
                                      <circle cx={sx} cy={sy} r={isHovered ? 8 : 6.5} fill="url(#starFlare)" />
                                    )}
                                    <circle
                                      cx={sx}
                                      cy={sy}
                                      r={sIdx === 0 ? 2.9 : 2.1}
                                      fill={isHovered ? '#fef08a' : '#ffffff'}
                                      stroke={sector.color}
                                      strokeWidth="0.9"
                                    />
                                  </g>
                                ))}

                                {/* Inner Ring Astrological Zodiac Symbol */}
                                <text
                                  x={symX}
                                  y={symY + 5}
                                  textAnchor="middle"
                                  fill={isHovered ? '#fef08a' : '#f1f5f9'}
                                  fontSize="14.5"
                                  fontFamily="serif"
                                  pointerEvents="none"
                                >
                                  {sector.symbol}
                                </text>

                                {/* Unlocked Star Counter Inside Sector Rim */}
                                <text
                                  x={countX}
                                  y={countY + 3}
                                  textAnchor="middle"
                                  fill={unlockedCount > 0 ? '#fde047' : '#64748b'}
                                  fontSize="7"
                                  fontWeight="700"
                                  fontFamily="JetBrains Mono, monospace"
                                  pointerEvents="none"
                                >
                                  {unlockedCount}/{group.nodes.length}★
                                </text>

                                {/* Outer Rim Zodiac Name */}
                                <text
                                  x={labelX}
                                  y={labelY + 3}
                                  textAnchor="middle"
                                  fill={isHovered ? '#ffffff' : sector.color}
                                  fontSize="8.5"
                                  fontWeight="700"
                                  fontFamily="Cinzel, serif"
                                  pointerEvents="none"
                                >
                                  {sector.name}
                                </text>
                              </g>
                            );
                          })}

                          {/* CENTER CIRCLE: ACTIVE SEASONAL CONSTELLATION (Full-Circle Hitbox) */}
                          {(() => {
                            const seasonGroup = GRAND_CONSTELLATIONS.find(
                              (g) => g.id === 'SEASONAL_CROWN'
                            )!;
                            const seasonUnlocked = (unlockedConstellationNodes.SEASONAL_CROWN || []).length;
                            const isSeasonHovered = hoveredConstellationId === 'SEASONAL_CROWN';
                            const seasonPts: [number, number][] = [
                              [470, 182],
                              [442, 202],
                              [498, 202],
                              [452, 234],
                              [488, 234],
                              [470, 212],
                            ];
                            const seasonEdges: [number, number][] = [
                              [0, 1],
                              [0, 2],
                              [1, 5],
                              [2, 5],
                              [5, 3],
                              [5, 4],
                              [3, 4],
                            ];

                            return (
                              <g
                                className="cursor-pointer"
                                onMouseEnter={() => setHoveredConstellationId('SEASONAL_CROWN')}
                                onClick={() => {
                                  setHoveredConstellationId('SEASONAL_CROWN');
                                  setZoomedConstellationId('SEASONAL_CROWN');
                                  setSelectedStarNode({ groupId: 'SEASONAL_CROWN', nodeIdx: 0 });
                                }}
                              >
                                <circle
                                  cx={470}
                                  cy={220}
                                  r={72}
                                  pointerEvents="all"
                                  fill={
                                    isSeasonHovered
                                      ? 'rgba(16, 185, 129, 0.28)'
                                      : 'rgba(6, 24, 36, 0.94)'
                                  }
                                  stroke={currentSeason.color}
                                  strokeWidth={isSeasonHovered ? 2.6 : 2}
                                />
                                {seasonEdges.map(([a, b], idx) => (
                                  <line
                                    key={idx}
                                    x1={seasonPts[a][0]}
                                    y1={seasonPts[a][1]}
                                    x2={seasonPts[b][0]}
                                    y2={seasonPts[b][1]}
                                    stroke={currentSeason.color}
                                    strokeWidth="1.4"
                                    strokeDasharray="2 2"
                                    pointerEvents="none"
                                  />
                                ))}
                                {seasonPts.map(([px, py], idx) => (
                                  <circle
                                    key={idx}
                                    cx={px}
                                    cy={py}
                                    r={idx === 0 ? 4 : 2.6}
                                    fill="#fef08a"
                                    stroke={currentSeason.color}
                                    strokeWidth="1.2"
                                    pointerEvents="none"
                                  />
                                ))}
                                <text
                                  x={470}
                                  y={170}
                                  textAnchor="middle"
                                  fill="#6ee7b7"
                                  fontSize="7.5"
                                  fontFamily="JetBrains Mono, monospace"
                                  fontWeight="700"
                                  pointerEvents="none"
                                >
                                  S{currentSeason.seasonNumber} · {currentSeason.symbol}
                                </text>
                                <text
                                  x={470}
                                  y={251}
                                  textAnchor="middle"
                                  fill="#ffffff"
                                  fontSize="8"
                                  fontFamily="Cinzel, serif"
                                  fontWeight="700"
                                  pointerEvents="none"
                                >
                                  {currentSeason.name.replace(/^Season [I]+:\s*/, '')}
                                </text>
                                <text
                                  x={470}
                                  y={263}
                                  textAnchor="middle"
                                  fill="#fde047"
                                  fontSize="8"
                                  fontFamily="JetBrains Mono, monospace"
                                  pointerEvents="none"
                                >
                                  {seasonUnlocked}/{seasonGroup.nodes.length}★ [Tap to Zoom]
                                </text>
                              </g>
                            );
                          })()}
                        </svg>

                        {/* LEFT OVERLAY CARD: Live Hovered / Selected Sector Inspector */}
                        <div className="absolute top-3 left-3 z-20 w-60 bg-slate-950/92 border border-slate-700/90 rounded-xl p-3 shadow-2xl space-y-1.5 backdrop-blur-md">
                          <div className="flex items-center justify-between">
                            <span
                              className="text-xs font-bold font-display"
                              style={{ color: inspectedGroup.color }}
                            >
                              {inspectedGroup.symbol} {inspectedGroup.name}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-amber-300">
                              {inspectedUnlocked.length}/{inspectedGroup.nodes.length}★
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-300">
                            {inspectedGroup.zodiacTitle}
                          </div>
                          <div className="text-[9.5px] text-emerald-300 leading-snug">
                            {inspectedGroup.theme}
                          </div>
                          <div className="text-[9px] font-mono text-slate-400">
                            Unique Tree Rows: {inspectedGroup.rowCounts.join(' → ')} ({inspectedGroup.nodes.length} nodes)
                          </div>
                          <div className="pt-1 flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setZoomedConstellationId(inspectedGroup.id);
                                setSelectedStarNode({ groupId: inspectedGroup.id, nodeIdx: 0 });
                              }}
                              className="flex-1 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-bold text-[10px] cursor-pointer"
                            >
                              Zoom Star Tree →
                            </button>
                            <button
                              disabled={inspectedUnlocked.length === 0 || gold < inspectedResetCost}
                              onClick={() => handleResetConstellationGroup(inspectedGroup.id)}
                              className="px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/50 disabled:opacity-35 text-rose-200 font-mono font-bold text-[9.5px] cursor-pointer"
                            >
                              reset({inspectedResetCost.toLocaleString()}G)
                            </button>
                          </div>
                        </div>

                        {/* RIGHT OVERLAY CARD: Active Seasonal Constellation Event & Instructions */}
                        <div className="absolute top-3 right-3 z-20 w-60 bg-slate-950/92 border border-emerald-500/50 rounded-xl p-3 shadow-2xl space-y-1.5 backdrop-blur-md">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase">
                              {currentSeason.symbol} Active Season Center
                            </span>
                            <span className="text-[9px] font-mono text-amber-300">
                              {(unlockedConstellationNodes.SEASONAL_CROWN || []).length}/23★
                            </span>
                          </div>
                          <div className="text-xs font-bold text-white font-display">
                            {currentSeason.name}
                          </div>
                          <div className="text-[9.5px] text-slate-300 leading-snug">
                            {currentSeason.theme}
                          </div>
                          <button
                            onClick={() => {
                              setZoomedConstellationId('SEASONAL_CROWN');
                              setSelectedStarNode({ groupId: 'SEASONAL_CROWN', nodeIdx: 0 });
                            }}
                            className="w-full py-1 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono font-bold text-[10px] cursor-pointer"
                          >
                            Open Center Season Tree →
                          </button>
                        </div>
                      </div>

                      {/* Aligned Bottom Strip: All 12 Zodiacs + Active Season with Small reset($$$$G) Buttons */}
                      <div className="grid grid-cols-7 lg:grid-cols-13 gap-1 shrink-0">
                        {GRAND_CONSTELLATIONS.map((group) => {
                          const unlockedList = unlockedConstellationNodes[group.id] || [];
                          const resetGoldCost = unlockedList.length * 2500;
                          const shortLabel =
                            group.id === 'SEASONAL_CROWN'
                              ? `${currentSeason.symbol} S${currentSeason.seasonNumber}`
                              : `${group.symbol} ${group.name.slice(0, 3)}`;

                          return (
                            <div
                              key={group.id}
                              onMouseEnter={() => setHoveredConstellationId(group.id)}
                              className={`bg-[#0a0d18] border rounded-lg px-1 py-1 flex flex-col items-center justify-between gap-0.5 text-center transition-colors ${
                                hoveredConstellationId === group.id
                                  ? 'border-amber-400/80'
                                  : 'border-slate-800'
                              }`}
                            >
                              <button
                                onClick={() => {
                                  setZoomedConstellationId(group.id);
                                  setSelectedStarNode({ groupId: group.id, nodeIdx: 0 });
                                }}
                                style={{ color: group.color }}
                                className="text-[9px] font-bold font-mono truncate w-full hover:underline cursor-pointer"
                                title={`${group.name} (${unlockedList.length}/${group.nodes.length}★) — Click to Zoom`}
                              >
                                {shortLabel} {unlockedList.length}/{group.nodes.length}
                              </button>
                              <button
                                disabled={unlockedList.length === 0 || gold < resetGoldCost}
                                onClick={() => handleResetConstellationGroup(group.id)}
                                className="w-full py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/50 disabled:opacity-30 text-rose-200 text-[8px] font-mono font-bold truncate cursor-pointer"
                                title={`Reset ${group.name} (${resetGoldCost.toLocaleString()}G)`}
                              >
                                reset({resetGoldCost}G)
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    /* ZOOMED INTERACTIVE UNIQUE ASYMMETRIC TREE VIEW */
                    (() => {
                      const activeGroup =
                        GRAND_CONSTELLATIONS.find((g) => g.id === zoomedConstellationId) ||
                        GRAND_CONSTELLATIONS[0];
                      const unlockedList = unlockedConstellationNodes[activeGroup.id] || [];
                      const groupHasKeystone = hasUnlockedKeystone(unlockedList, activeGroup.id);
                      const resetGoldCost = unlockedList.length * 2500;
                      const pts = activeGroup.pts;
                      const edges = activeGroup.edges;
                      const groupTitle =
                        activeGroup.id === 'SEASONAL_CROWN'
                          ? `${currentSeason.symbol} ${currentSeason.name} (${currentSeason.code} · ${currentSeason.theme})`
                          : `${activeGroup.symbol} ${activeGroup.name} (${activeGroup.zodiacTitle} · ${activeGroup.theme})`;

                      return (
                        <div className="flex-1 min-h-0 flex flex-col justify-between gap-2 overflow-hidden">
                          {/* Quick 13-Constellation Switcher Strip (All 12 Zodiacs + Center Season) */}
                          <div className="flex items-center justify-between gap-2 shrink-0 overflow-x-auto pb-0.5">
                            <div className="flex items-center gap-1">
                              {GRAND_CONSTELLATIONS.map((g) => {
                                const isCurrent = g.id === activeGroup.id;
                                const count = (unlockedConstellationNodes[g.id] || []).length;
                                const label =
                                  g.id === 'SEASONAL_CROWN'
                                    ? `${currentSeason.symbol} S${currentSeason.seasonNumber}`
                                    : `${g.symbol} ${g.name}`;
                                return (
                                  <button
                                    key={g.id}
                                    onClick={() => {
                                      setZoomedConstellationId(g.id);
                                      setSelectedStarNode({ groupId: g.id, nodeIdx: 0 });
                                    }}
                                    className={`px-2 py-1 rounded-lg border text-[9.5px] font-mono font-bold whitespace-nowrap transition-colors cursor-pointer ${
                                      isCurrent
                                        ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    {label} ({count}/{g.nodes.length}★)
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Unique Multi-Row Asymmetric Interactive SVG Canvas */}
                          <div className="flex-1 min-h-0 bg-[#050814] border border-slate-800 rounded-xl relative overflow-hidden flex">
                            <svg viewBox="0 0 1000 380" className="w-full h-full select-none">
                              <defs>
                                <radialGradient id="zoomNebula" cx="50%" cy="50%" r="55%">
                                  <stop offset="0%" stopColor="rgba(56, 189, 248, 0.14)" />
                                  <stop offset="60%" stopColor="rgba(168, 85, 247, 0.08)" />
                                  <stop offset="100%" stopColor="rgba(5, 8, 20, 0)" />
                                </radialGradient>
                              </defs>
                              <rect width="1000" height="380" fill="url(#zoomNebula)" />

                              <text
                                x={500}
                                y={19}
                                textAnchor="middle"
                                fill={activeGroup.color}
                                fontSize="11.5"
                                fontWeight="700"
                                fontFamily="Cinzel, serif"
                              >
                                {groupTitle} — {unlockedList.length}/{activeGroup.nodes.length}★
                              </text>

                              {/* UNIQUE CONNECTED NODE-BY-NODE EDGES FOR THIS ZODIAC */}
                              {edges.map(([fromIdx, toIdx]) => {
                                const p1 = pts[fromIdx - 1];
                                const p2 = pts[toIdx - 1];
                                if (!p1 || !p2) return null;
                                const bothUnlocked =
                                  unlockedList.includes(fromIdx) && unlockedList.includes(toIdx);
                                const canReach =
                                  unlockedList.includes(fromIdx) &&
                                  canUnlockConstellationNode(toIdx, unlockedList, activeGroup.id);

                                return (
                                  <line
                                    key={`edge_${fromIdx}_${toIdx}`}
                                    x1={p1[0]}
                                    y1={p1[1]}
                                    x2={p2[0]}
                                    y2={p2[1]}
                                    stroke={
                                      bothUnlocked
                                        ? '#fbbf24'
                                        : canReach
                                        ? '#38bdf8'
                                        : '#334155'
                                    }
                                    strokeWidth={bothUnlocked ? 2.5 : canReach ? 1.8 : 1.2}
                                    strokeDasharray={bothUnlocked ? undefined : '4 4'}
                                  />
                                );
                              })}

                              {/* STAR NODES */}
                              {activeGroup.nodes.map((node, idx) => {
                                const [cx, cy] = pts[idx] || [500, 190];
                                const unlocked = unlockedList.includes(node.index);
                                const isUnlockable = canUnlockConstellationNode(
                                  node.index,
                                  unlockedList,
                                  activeGroup.id
                                );
                                const isLockedOtherKeystone =
                                  node.tier === 'Keystone' && !unlocked && groupHasKeystone;
                                const isSelected =
                                  selectedStarNode?.groupId === activeGroup.id &&
                                  selectedStarNode?.nodeIdx === idx;
                                const radius =
                                  node.tier === 'Keystone'
                                    ? 10
                                    : node.tier === 'Major'
                                    ? 8
                                    : node.tier === 'Medium'
                                    ? 7
                                    : 6;

                                return (
                                  <g
                                    key={node.id}
                                    className="cursor-pointer"
                                    onMouseEnter={() =>
                                      setSelectedStarNode({ groupId: activeGroup.id, nodeIdx: idx })
                                    }
                                    onClick={() => {
                                      setSelectedStarNode({ groupId: activeGroup.id, nodeIdx: idx });
                                      if (isUnlockable && timeShards >= node.shardCost) {
                                        unlockStarNode(activeGroup.id, node.index, node.shardCost);
                                      }
                                    }}
                                  >
                                    {isUnlockable && (
                                      <circle
                                        cx={cx}
                                        cy={cy}
                                        r={radius + 4.5}
                                        fill="none"
                                        stroke="#38bdf8"
                                        strokeWidth="1.5"
                                        strokeDasharray="3 3"
                                      />
                                    )}
                                    {isSelected && (
                                      <circle
                                        cx={cx}
                                        cy={cy}
                                        r={radius + 2.8}
                                        fill="none"
                                        stroke="#fde047"
                                        strokeWidth="2"
                                      />
                                    )}
                                    <circle
                                      cx={cx}
                                      cy={cy}
                                      r={radius}
                                      fill={
                                        unlocked
                                          ? '#fbbf24'
                                          : isLockedOtherKeystone
                                          ? '#450a0a'
                                          : isUnlockable
                                          ? '#38bdf8'
                                          : node.tier === 'Medium'
                                          ? '#1e1b4b'
                                          : '#1e293b'
                                      }
                                      stroke={
                                        unlocked
                                          ? '#fef08a'
                                          : isLockedOtherKeystone
                                          ? '#f43f5e'
                                          : isUnlockable
                                          ? '#bae6fd'
                                          : node.tier === 'Keystone'
                                          ? '#f59e0b'
                                          : node.tier === 'Major'
                                          ? '#c084fc'
                                          : node.tier === 'Medium'
                                          ? '#818cf8'
                                          : '#475569'
                                      }
                                      strokeWidth="1.8"
                                    />
                                    <text
                                      x={cx}
                                      y={cy - radius - 3}
                                      textAnchor="middle"
                                      fill={
                                        unlocked
                                          ? '#fde68a'
                                          : isLockedOtherKeystone
                                          ? '#fda4af'
                                          : isUnlockable
                                          ? '#bae6fd'
                                          : '#64748b'
                                      }
                                      fontSize="8"
                                      fontFamily="JetBrains Mono, monospace"
                                    >
                                      {node.tier === 'Keystone' ? `★#${node.index}` : `#${node.index}`}
                                    </text>
                                  </g>
                                );
                              })}
                            </svg>

                            {/* COMPACT MINI-POPOVER (w-48 p-2 text-[10px]) SO IT NEVER COVERS ADJACENT NODES */}
                            {selectedStarNode && (() => {
                              const activeNode =
                                activeGroup.nodes[selectedStarNode.nodeIdx] || activeGroup.nodes[0];
                              const [nodeX, nodeY] = pts[selectedStarNode.nodeIdx] || [500, 200];
                              const isNodeUnlocked = unlockedList.includes(activeNode.index);
                              const isNodeUnlockable = canUnlockConstellationNode(
                                activeNode.index,
                                unlockedList,
                                activeGroup.id
                              );
                              const canUndoThisNode = canUndoConstellationNode(
                                activeNode.index,
                                unlockedList,
                                activeGroup.id
                              );

                              const clampedLeftPct = Math.max(11, Math.min(89, (nodeX / 1000) * 100));
                              const topPct = (nodeY / 380) * 100;
                              const showBelow = nodeY < 140;

                              return (
                                <div
                                  style={{
                                    left: `${clampedLeftPct}%`,
                                    top: `${topPct}%`,
                                    transform: showBelow
                                      ? 'translate(-50%, 14px)'
                                      : 'translate(-50%, calc(-100% - 14px))',
                                  }}
                                  className="absolute z-30 w-48 p-2 text-[10px] bg-slate-950/95 border border-amber-400/75 rounded-lg shadow-xl space-y-1 backdrop-blur-md"
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-white truncate">
                                      #{activeNode.index} {activeNode.name}
                                    </span>
                                    <span className="px-1 py-0.2 rounded bg-slate-900 border border-amber-400/40 text-[8px] font-mono text-amber-300 shrink-0">
                                      {activeNode.tier}
                                    </span>
                                  </div>

                                  <div className="text-[9.5px] text-emerald-300 font-mono leading-tight">
                                    {activeNode.desc}
                                  </div>

                                  <div className="pt-0.5">
                                    {isNodeUnlocked ? (
                                      <div className="flex items-center gap-1">
                                        <span className="flex-1 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-[9px] text-center">
                                          ✦ UNLOCKED
                                        </span>
                                        {canUndoThisNode && (
                                          <button
                                            disabled={gold < 2500}
                                            onClick={() =>
                                              handleUndoSingleNode(
                                                activeGroup.id,
                                                activeNode.index,
                                                activeNode.shardCost
                                              )
                                            }
                                            className="px-1.5 py-0.5 rounded bg-rose-500/25 hover:bg-rose-500/40 border border-rose-400/60 disabled:opacity-40 text-rose-200 font-mono font-bold text-[9px] cursor-pointer"
                                          >
                                            Undo(2.5kG)
                                          </button>
                                        )}
                                      </div>
                                    ) : isNodeUnlockable ? (
                                      <button
                                        disabled={timeShards < activeNode.shardCost}
                                        onClick={() =>
                                          unlockStarNode(
                                            activeGroup.id,
                                            activeNode.index,
                                            activeNode.shardCost
                                          )
                                        }
                                        className="w-full py-1 rounded bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-mono font-bold text-[9.5px] cursor-pointer"
                                      >
                                        Unlock ({activeNode.shardCost} Shards)
                                      </button>
                                    ) : (
                                      <span className="block w-full py-0.5 px-1 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono text-[8.5px] text-center truncate">
                                        🔒 {getConstellationPrereqLabel(activeNode.index, unlockedList, activeGroup.id)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Small Aligned Bottom reset($$$$G) Bar Directly Below the Constellation */}
                          <div className="flex items-center justify-center gap-3 shrink-0 py-0.5">
                            <span className="text-[10px] font-mono text-slate-400">
                              {activeGroup.symbol} {activeGroup.name} (Rows: {activeGroup.rowCounts.join(' → ')}): {unlockedList.length}/{activeGroup.nodes.length}★
                            </span>
                            <button
                              disabled={unlockedList.length === 0 || gold < resetGoldCost}
                              onClick={() => handleResetConstellationGroup(activeGroup.id)}
                              className="px-2.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/60 disabled:opacity-35 text-rose-200 text-[10px] font-mono font-bold cursor-pointer"
                            >
                              reset({resetGoldCost.toLocaleString()}G)
                            </button>
                          </div>
                        </div>
                      );
                    })()
                  )}
                </>
              );
            })()}
          </div>
        )}
      </main>

      {/* BOTTOM DOCK BAR: Fixed 5-Tab Navigation */}
      <nav className="h-16 w-full bg-[#0a0d18]/95 border-t border-amber-500/30 flex justify-around items-center z-50 shrink-0">
        {(
          [
            { id: 'BATTLE', icon: '⚔️', label: 'Tower Battle' },
            { id: 'HEROES', icon: '👥', label: 'Heroes & Gambit' },
            { id: 'FORGE', icon: '🔨', label: 'Equipment & Forge' },
            { id: 'SUMMON', icon: '🔮', label: 'Summon' },
            { id: 'REWIND', icon: '⏳', label: 'Chrono Rewind' },
          ] as { id: MainTab; icon: string; label: string }[]
        ).map((tab) => {
          const isActive =
            tab.id === 'BATTLE'
              ? activeTab === 'BATTLE' && battleSubMode === 'SPIRE'
              : activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'BATTLE' && battleSubMode !== 'SPIRE') {
                  setBattleSubMode('SPIRE');
                  initFloorWave(floor, false, 'SPIRE');
                }
              }}
              className={`flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? 'text-amber-300 bg-amber-500/15 border border-amber-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="text-[11px] tracking-wide whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ROGUELITE 22 MAJOR ARCANA TAROT 3-CARD 3D FLIP MODAL (EVERY 5 FLOORS) */}
      {blessingChoices && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0d18] border-2 border-amber-500/50 rounded-2xl max-w-4xl w-full p-6 space-y-5 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs font-mono text-amber-300">
                  Every 5th Floor Boss Cleared · 22 Major Arcana Sanctuary · Click Face-Down Card to Flip!
                </div>
                <h2 className="text-xl font-bold text-white font-display">
                  Select 1 Major Arcana Tarot Blessing (Tier I → II → III)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setTarotFlipped([true, true, true]);
                    sfx.play('gacha');
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-bold text-xs cursor-pointer"
                >
                  [✨ REVEAL ALL 3 CARDS]
                </button>
                <span className="px-3 py-1.5 rounded-lg bg-amber-400/20 border border-amber-400 text-xs font-mono font-bold text-amber-300">
                  [AUTO CARD: {tarotAutoTimer.toFixed(1)}s]
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {blessingChoices.map((card, idx) => {
                const curTier = blessings[card.id] || 0;
                const nextTier = Math.min(3, curTier + 1);
                const isFlipped = tarotFlipped[idx];
                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      if (!isFlipped) {
                        setTarotFlipped((prev) => {
                          const next: [boolean, boolean, boolean] = [prev[0], prev[1], prev[2]];
                          next[idx] = true;
                          return next;
                        });
                        sfx.play('hit');
                        return;
                      }
                      setBlessings((prev) => ({ ...prev, [card.id]: nextTier }));
                      setBlessingChoices(null);
                      sfx.play('gacha');
                    }}
                    className={`group relative rounded-2xl border-2 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between p-4 min-h-[340px] ${
                      !isFlipped
                        ? 'bg-gradient-to-b from-[#130d26] to-[#070a14] border-purple-400/60 hover:border-amber-400 hover:-translate-y-1 shadow-lg shadow-purple-500/15'
                        : idx === 0
                        ? 'bg-slate-950 border-amber-400 ring-2 ring-amber-400/30 hover:-translate-y-1 shadow-xl shadow-amber-500/20'
                        : 'bg-slate-950 border-slate-700 hover:border-amber-400 hover:-translate-y-1'
                    }`}
                  >
                    {!isFlipped ? (
                      <div className="flex-1 flex flex-col items-center justify-between py-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-purple-300">
                          Mystery Major Arcana #{idx + 1}
                        </span>
                        <div className="my-2 p-2 rounded-xl border border-amber-400/40 bg-slate-950/80 shadow-[0_0_25px_rgba(168,85,247,0.35)] group-hover:scale-105 transition-transform">
                          <PixelTarotCardBackCanvas className="w-36 h-44" />
                        </div>
                        <div className="w-full py-2 text-center rounded-lg bg-purple-500/20 border border-purple-400/50 text-xs font-mono font-bold text-amber-200">
                          [🃏 Click to Flip Card]
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="text-amber-300 font-bold">{card.id}</span>
                            <span className="px-2 py-0.5 rounded bg-amber-400/15 border border-amber-400/40 text-amber-200">
                              {card.rarity} · Tier {nextTier}/3
                            </span>
                          </div>
                          <div className="flex justify-center py-1">
                            <div className="p-1.5 rounded-xl bg-slate-900 border border-amber-400/50 shadow-inner">
                              <PixelTarotCardCanvas arcanaId={card.id} className="w-36 h-44" />
                            </div>
                          </div>
                          <h3 className="text-base font-bold text-white font-display text-center">
                            {card.name}
                          </h3>
                          <p className="text-xs text-slate-300 leading-relaxed text-center bg-slate-900/90 border border-slate-800 rounded-lg p-2">
                            {card.desc}
                          </p>
                        </div>
                        <div className="mt-3 py-2 text-center bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold uppercase tracking-wider rounded-lg">
                          {idx === 0
                            ? `[Select Tarot · Auto in ${tarotAutoTimer.toFixed(0)}s]`
                            : '[Select Tarot Blessing]'}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* STARFALL CARD REVEAL MODAL & SR ➔ SSR SHATTER FAKE-OUT (25% CHANCE) */}
      <AnimatePresence>
        {gachaRevealCards && (
          <motion.div
            key="starfall-reveal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.96 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              className="max-w-6xl w-full bg-[#090d1a] border-2 border-amber-400/60 rounded-2xl p-6 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="text-xs font-mono text-amber-300 uppercase tracking-wider">
                    Starfall Altar Summon · Blue = R · Purple = SR · Gold = SSR (Watch for ⚡ SR ➔ SSR Golden Shatter!)
                  </div>
                  <h2 className="text-xl font-bold text-white font-display">
                    ✨ Starfall Card Reveal ({gachaRevealCards.filter((c) => c.flipped).length}/
                    {gachaRevealCards.length} Revealed)
                  </h2>
                </div>
                <div className="flex items-center gap-2.5">
                  {gachaRevealCards.some((c) => !c.flipped) && (
                    <button
                      onClick={() => {
                        const hasFakeOut = gachaRevealCards.some((c) => !c.flipped && c.isFakeOut);
                        if (hasFakeOut) {
                          sfx.play('ult');
                          setGachaRevealCards((prev) =>
                            prev
                              ? prev.map((c) =>
                                  !c.flipped && c.isFakeOut ? { ...c, shattering: true } : { ...c, flipped: true }
                                )
                              : null
                          );
                          setTimeout(() => {
                            setGachaRevealCards((prev) =>
                              prev
                                ? prev.map((c) => ({
                                    ...c,
                                    shattering: false,
                                    displayRarity: c.actualRarity,
                                    flipped: true,
                                  }))
                                : null
                            );
                          }, 650);
                        } else {
                          sfx.play('gacha');
                          setGachaRevealCards((prev) =>
                            prev ? prev.map((c) => ({ ...c, flipped: true, displayRarity: c.actualRarity })) : null
                          );
                        }
                      }}
                      className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-extrabold text-xs uppercase tracking-wider cursor-pointer shadow-lg shadow-amber-500/25"
                    >
                      [✨ REVEAL ALL]
                    </button>
                  )}
                  <button
                    onClick={() => setGachaRevealCards(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-mono font-bold text-white cursor-pointer"
                  >
                    {gachaRevealCards.every((c) => c.flipped) ? '[✓ CONFIRM & CONTINUE]' : '✕ Skip / Close'}
                  </button>
                </div>
              </div>

              <motion.div
                variants={{
                  hidden: { opacity: 1 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.075,
                      delayChildren: 0.05,
                    },
                  },
                }}
                initial="hidden"
                animate="visible"
                className={`grid gap-3.5 ${
                  gachaRevealCards.length === 1
                    ? 'grid-cols-1 max-w-xs mx-auto'
                    : 'grid-cols-2 sm:grid-cols-5'
                }`}
              >
                {gachaRevealCards.map((card, i) => {
                  const hero = card.hero;
                  const auraStyles =
                    card.displayRarity === 'SSR'
                      ? 'border-amber-300 shadow-[0_0_28px_rgba(251,191,36,0.65)] bg-gradient-to-b from-amber-500/25 via-slate-950 to-slate-950'
                      : card.displayRarity === 'SR'
                      ? 'border-purple-400 shadow-[0_0_22px_rgba(168,85,247,0.55)] bg-gradient-to-b from-purple-500/25 via-slate-950 to-slate-950'
                      : 'border-sky-400 shadow-[0_0_16px_rgba(56,189,248,0.45)] bg-gradient-to-b from-sky-500/20 via-slate-950 to-slate-950';

                  return (
                    <motion.div
                      key={card.uid}
                      variants={{
                        hidden: { opacity: 0, y: 160, scale: 0.88 },
                        visible: {
                          opacity: 1,
                          y: 0,
                          scale: 1,
                          transition: {
                            type: 'spring',
                            stiffness: 260,
                            damping: 20,
                          },
                        },
                      }}
                      onClick={() => {
                        if (card.flipped || card.shattering) return;
                        if (card.isFakeOut) {
                          sfx.play('ult');
                          setGachaRevealCards((prev) =>
                            prev
                              ? prev.map((c, idx) => (idx === i ? { ...c, shattering: true } : c))
                              : null
                          );
                          setTimeout(() => {
                            setGachaRevealCards((prev) =>
                              prev
                                ? prev.map((c, idx) =>
                                    idx === i
                                      ? {
                                          ...c,
                                          shattering: false,
                                          displayRarity: 'SSR',
                                          flipped: true,
                                        }
                                      : c
                                  )
                                : null
                            );
                          }, 650);
                        } else {
                          sfx.play('gacha');
                          setGachaRevealCards((prev) =>
                            prev
                              ? prev.map((c, idx) =>
                                  idx === i ? { ...c, flipped: true, displayRarity: c.actualRarity } : c
                                )
                              : null
                          );
                        }
                      }}
                      className={`relative rounded-xl border-2 p-3 flex flex-col items-center justify-between min-h-[250px] transition-colors cursor-pointer select-none overflow-hidden ${auraStyles} ${
                        card.shattering ? 'animate-bounce ring-4 ring-amber-300 scale-105' : 'hover:-translate-y-1'
                      }`}
                    >
                      {card.shattering && (
                        <div className="absolute inset-0 z-30 bg-amber-400/30 backdrop-blur-[1px] flex flex-col items-center justify-center p-2 text-center">
                          <svg viewBox="0 0 100 100" className="w-24 h-24 stroke-amber-300 fill-none stroke-[3]">
                            <path d="M50,5 L35,45 L62,48 L25,95 M15,25 L50,50 L85,20 M20,75 L52,52 L85,80" />
                          </svg>
                          <span className="text-[11px] font-mono font-extrabold text-amber-200 bg-slate-950/90 px-2 py-0.5 rounded border border-amber-300">
                            ⚡ SR ➔ SSR SHATTER!
                          </span>
                        </div>
                      )}

                      {!card.flipped ? (
                        <div className="flex-1 flex flex-col items-center justify-between w-full py-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold ${
                              card.displayRarity === 'SSR'
                                ? 'bg-amber-400 text-slate-950'
                                : card.displayRarity === 'SR'
                                ? 'bg-purple-400 text-slate-950'
                                : 'bg-sky-400 text-slate-950'
                            }`}
                          >
                            {card.displayRarity} AURA
                          </span>
                          <div className="my-2">
                            <PixelTarotCardBackCanvas className="w-28 h-36" />
                          </div>
                          <span className="text-[10px] font-mono text-slate-300">Click to Flip</span>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-between w-full">
                          <div className="w-full flex items-center justify-between">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-extrabold ${
                                card.actualRarity === 'SSR'
                                  ? 'bg-amber-400 text-slate-950'
                                  : card.actualRarity === 'SR'
                                  ? 'bg-purple-400 text-slate-950'
                                  : 'bg-sky-400 text-slate-950'
                              }`}
                            >
                              {card.actualRarity}
                            </span>
                            <span className="text-[9px] font-mono text-amber-200 truncate max-w-[110px]">
                              {card.isFakeOut ? '⚡ FAKE-OUT!' : card.note}
                            </span>
                          </div>

                          <div className="w-28 h-28 my-1 flex items-center justify-center overflow-hidden rounded-lg bg-slate-900/80 border border-slate-800">
                            <ResonatorSplashArt hero={hero} className="w-full h-full object-cover scale-125 translate-y-2" />
                          </div>

                          <div className="text-center w-full space-y-0.5">
                            <div className="text-xs font-extrabold text-white font-display truncate">
                              {hero.name}
                            </div>
                            <div className="text-[10px] font-mono text-amber-300 truncate">
                              {card.bonusRelicName ? `+ ${card.bonusRelicName}` : hero.title}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* UNIFIED [🏰 SANCTUARIES & CHALLENGES] SPLIT-VIEW MODAL (6 MODES) */}
      {sanctuariesModalOpen && (
        <div
          onClick={() => setSanctuariesModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-6xl h-[84vh] bg-[#0a0d18] border-2 border-amber-400/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Modal Top Header */}
            <div className="flex items-center justify-between px-5 py-3 bg-[#060913] border-b border-slate-800 shrink-0">
              <div>
                <div className="text-[10px] font-mono text-amber-300 uppercase tracking-wider">
                  Unified Challenge Hub · Squad CP: {squadCP.toLocaleString()} · Weekly Keys: {weeklyKeys}/15🗝️ · Sweep Tickets: {sweepTickets}🎫
                </div>
                <h2 className="text-lg font-bold text-white font-display">
                  🏰 Sanctuaries &amp; Challenges
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSanctuariesModalOpen(false);
                    setMerchantHubOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/60 text-xs font-mono font-bold text-rose-200 cursor-pointer"
                >
                  [🛒 Open Merchant Hub]
                </button>
                <button
                  onClick={() => setSanctuariesModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white cursor-pointer"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Split-View Body: Left Sidebar (6 Modes) + Right Content Area */}
            <div className="flex-1 min-h-0 grid grid-cols-12 overflow-hidden">
              {/* LEFT SIDEBAR: 6 MODES */}
              <div className="col-span-12 md:col-span-4 lg:col-span-3 bg-[#070a14] border-r border-slate-800 p-3 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-1.5">
                  {(
                    [
                      {
                        id: 'BOUNTY' as SanctuaryTabId,
                        icon: '🪙',
                        name: 'Golden Bounty Vault',
                        sub: 'Massive Gold & Sweep Chests',
                      },
                      {
                        id: 'STRIKER' as SanctuaryTabId,
                        icon: '⚔️',
                        name: 'Striker Sanctum',
                        sub: 'Starfall Executioner Set',
                      },
                      {
                        id: 'DEFENDER' as SanctuaryTabId,
                        icon: '🛡️',
                        name: 'Bastion Foundry',
                        sub: 'Aegis of Dawn & Vanguard',
                      },
                      {
                        id: 'TACTICIAN' as SanctuaryTabId,
                        icon: '🔮',
                        name: 'Astral Observatory',
                        sub: 'Chrono Weaver & Scholar',
                      },
                      {
                        id: 'ARENA' as SanctuaryTabId,
                        icon: '🏟️',
                        name: '1v1 Async Arena',
                        sub: `${arenaRankPts} RP · ${arenaTokens}🏆 Tokens`,
                      },
                      {
                        id: 'GUILD_RAID' as SanctuaryTabId,
                        icon: '🐉',
                        name: 'Guild Raid: Yog-Sothoth',
                        sub: `Guild Lv.${guildState.level} · ${guildAttempts}/3 Tries`,
                      },
                    ]
                  ).map((tab) => {
                    const active = sanctuaryTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setSanctuaryTab(tab.id)}
                        className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                          active
                            ? 'bg-amber-400/20 border-amber-400 text-white shadow-md'
                            : 'bg-slate-950/80 border-slate-800/90 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-xl leading-none">{tab.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold font-display truncate">{tab.name}</div>
                          <div className="text-[10px] font-mono text-slate-400 truncate">{tab.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-[10px] font-mono">
                  <div className="text-amber-300 font-bold">Quick Resource Refill</div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setWeeklyKeys(15)}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 cursor-pointer"
                    >
                      Refill 15🗝️
                    </button>
                    <button
                      onClick={() => setGuildAttempts(3)}
                      className="flex-1 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 cursor-pointer"
                    >
                      Refill 3🐉
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT CONTENT AREA */}
              <div className="col-span-12 md:col-span-8 lg:col-span-9 p-5 overflow-y-auto flex flex-col gap-4">
                {domainFeedback && (
                  <div className="px-3.5 py-2 rounded-xl bg-emerald-950/90 border border-emerald-400/60 text-xs font-mono text-emerald-200 flex items-center justify-between">
                    <span>{domainFeedback}</span>
                    <button
                      onClick={() => setDomainFeedback(null)}
                      className="text-slate-400 hover:text-white ml-2 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* CASE 1: 4 DUNGEON DOMAINS (BOUNTY, STRIKER, DEFENDER, TACTICIAN) */}
                {(sanctuaryTab === 'BOUNTY' ||
                  sanctuaryTab === 'STRIKER' ||
                  sanctuaryTab === 'DEFENDER' ||
                  sanctuaryTab === 'TACTICIAN') &&
                  (() => {
                    const domainMetaList = [
                      {
                        id: 'BOUNTY' as const,
                        tag: 'GOLD & SWEEP VAULT',
                        name: '🪙 Golden Bounty Vault',
                        sets: ['+2.5x Gold Bounty', 'Bonus Relics'],
                      },
                      {
                        id: 'STRIKER' as const,
                        tag: 'OFFENSIVE SANCTUARY',
                        name: '⚔️ Striker Sanctum',
                        sets: ['Vanguard of the Eclipse', 'Berserker of the Pale Moon'],
                      },
                      {
                        id: 'DEFENDER' as const,
                        tag: 'FORTRESS SANCTUARY',
                        name: '🛡️ Bastion Foundry',
                        sets: ['Colossus of the Iron Wall', 'Aegis of the Starlight'],
                      },
                      {
                        id: 'TACTICIAN' as const,
                        tag: 'ARCANA SANCTUARY',
                        name: '🔮 Astral Observatory',
                        sets: ['Breaker of the Void', 'Scholar of the Astral Spire'],
                      },
                    ];
                    const dom = domainMetaList.find((d) => d.id === sanctuaryTab) || domainMetaList[0];
                    return (
                      <>
                        {/* Top Pixel Art Mode Banner */}
                        <div className="relative rounded-2xl border border-amber-400/50 bg-gradient-to-r from-[#17112b] via-[#0e172a] to-[#090d18] p-4 flex flex-wrap items-center justify-between gap-3">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/40 text-[10px] font-mono text-amber-300">
                              {dom.tag} · Weekly Keys: {weeklyKeys}/15🗝️
                            </span>
                            <h3 className="text-xl font-bold text-white font-display">{dom.name}</h3>
                            <p className="text-xs text-slate-300">
                              Drops: <strong className="text-amber-300">{dom.sets.join(' · ')}</strong> · Defeat the Tier Boss once to unlock instant Sweep!
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              disabled={gold < 15000}
                              onClick={() => handleBuySweepTickets(1)}
                              className="px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/60 disabled:opacity-40 text-amber-200 text-xs font-mono font-bold cursor-pointer"
                            >
                              [+1🎫 15,000G]
                            </button>
                            <button
                              disabled={gold < 135000}
                              onClick={() => handleBuySweepTickets(10)}
                              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 text-xs font-mono font-bold cursor-pointer"
                            >
                              [+10🎫 135,000G]
                            </button>
                          </div>
                        </div>

                        {/* 5 Difficulty Rows (Tier I – V) with Right-Aligned Action Buttons */}
                        <div className="space-y-2.5">
                          {([1, 2, 3, 4, 5] as const).map((t) => {
                            const spec = DOMAIN_TIER_SPECS[t];
                            const unlocked = highestFloor >= spec.minFloor && squadCP >= spec.minCp;
                            const bossCleared = Boolean(clearedDomainTiers[`${dom.id}_${t}`]);
                            return (
                              <div
                                key={t}
                                className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                                  unlocked
                                    ? 'bg-slate-950/90 border-slate-800 hover:border-amber-400/60'
                                    : 'bg-slate-950/40 border-slate-900 opacity-60'
                                }`}
                              >
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-400/50 text-xs font-mono font-bold text-amber-300">
                                      Tier {spec.roman}
                                    </span>
                                    <span className="text-sm font-bold text-white font-display">
                                      {dom.name} — {spec.dropSummary}
                                    </span>
                                    {bossCleared && (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-mono text-emerald-300">
                                        ✓ Sweep Unlocked
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs font-mono text-slate-400">
                                    Req: Floor F{spec.minFloor}+ &amp; {spec.minCp.toLocaleString()} Squad CP · Gold Reward: +{spec.goldReward.toLocaleString()}G
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 ml-auto">
                                  <button
                                    disabled={!unlocked || weeklyKeys <= 0}
                                    onClick={() => {
                                      setSanctuariesModalOpen(false);
                                      setActiveTab('BATTLE');
                                      handleChallengeDomainBoss(dom.id, t);
                                    }}
                                    className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-mono font-extrabold text-xs cursor-pointer whitespace-nowrap"
                                  >
                                    [⚔️ Fight (1🗝️)]
                                  </button>
                                  <button
                                    disabled={!unlocked || !bossCleared || weeklyKeys <= 0 || sweepTickets <= 0}
                                    onClick={() => handleSweepDomain(dom.id, t)}
                                    className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-mono font-extrabold text-xs cursor-pointer whitespace-nowrap"
                                  >
                                    [⚡ Sweep (1🗝️+1🎫)]
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}

                {/* CASE 2: 1V1 ASYNC ARENA (5 RANKED AI RIVALS SORTED BY SQUAD CP) */}
                {sanctuaryTab === 'ARENA' && (
                  <>
                    <div className="rounded-2xl border border-sky-400/50 bg-gradient-to-r from-[#0c1e35] via-[#0c1526] to-[#090d18] p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded bg-sky-400/20 border border-sky-400/40 text-[10px] font-mono text-sky-300">
                          Async Mirror PvP · Rank Points: {arenaRankPts} RP · Arena Tokens: {arenaTokens}🏆
                        </span>
                        <h3 className="text-xl font-bold text-white font-display">
                          🏟️ 1v1 Async Arena — Challenger Ladder
                        </h3>
                        <p className="text-xs text-slate-300">
                          Challenge 5 Ranked AI Squads sorted by Squad CP to earn Arena Tokens &amp; Starlight Gems.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setSanctuariesModalOpen(false);
                          setMerchantTab('ARENA');
                          setMerchantHubOpen(true);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-mono font-extrabold text-xs cursor-pointer"
                      >
                        [🛒 Arena Shop ({arenaTokens}🏆)]
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {ARENA_RIVALS.map((rival, rIdx) => (
                        <div
                          key={rival.rank}
                          className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-sky-400/60 flex flex-wrap items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-xs font-mono font-bold text-sky-300">
                                Rank #{rival.rank}
                              </span>
                              <span className="text-sm font-bold text-white font-display">{rival.name}</span>
                              <span className="text-xs font-mono text-slate-400">({rival.title})</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-mono">
                              <span className="text-amber-300 font-bold">
                                ⚔️ Rival CP: {rival.cp.toLocaleString()}
                              </span>
                              <span className="text-slate-500">·</span>
                              <span className="text-emerald-300">
                                Reward: +{rival.tokenReward}🏆 Tokens &amp; +{rival.gemReward}💎 Gems
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              {rival.teamIds.map((hid: string) => {
                                const h = RESONATORS.find((r) => r.id === hid);
                                return (
                                  <span
                                    key={hid}
                                    className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-200"
                                  >
                                    {h?.name || hid}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              setActiveArenaRivalIndex(rIdx);
                              setSanctuariesModalOpen(false);
                              setActiveTab('BATTLE');
                              setBattleSubMode('ARENA');
                              initFloorWave(floor, false, 'ARENA');
                            }}
                            className="px-4 py-2 rounded-lg bg-sky-400 hover:bg-sky-300 text-slate-950 font-mono font-extrabold text-xs cursor-pointer ml-auto"
                          >
                            [⚔️ Battle]
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* CASE 3: GUILD RAID (YOG-SOTHOTH + GUILD HALL JOIN/DONATE + EASY/NORMAL/HARD) */}
                {sanctuaryTab === 'GUILD_RAID' && (
                  <>
                    <div className="rounded-2xl border border-rose-400/50 bg-gradient-to-r from-[#2c0f1e] via-[#171026] to-[#090d18] p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-400/40 text-[10px] font-mono text-rose-300">
                          90s DPS Race · Attempts: {guildAttempts}/3 · Total DMG: {guildTotalDamage.toLocaleString()} · Medals: {guildMedals}🎖️
                        </span>
                        <h3 className="text-xl font-bold text-white font-display">
                          🐉 Guild Raid: Outer God Yog-Sothoth
                        </h3>
                        <p className="text-xs text-slate-300">
                          {guildState.joined
                            ? `Active Guild: ${guildState.name} (Lv.${guildState.level}/5 · EXP ${guildState.exp}/${guildState.level * 100})`
                            : 'Join or Create a Guild to unlock Yog-Sothoth Raid difficulties!'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {guildState.joined && (
                          <button
                            disabled={gold < 10000 || guildState.level >= 5}
                            onClick={() => {
                              if (gold < 10000 || guildState.level >= 5) return;
                              setGold((g) => g - 10000);
                              setGuildState((prev) => {
                                const nextExp = prev.exp + 50;
                                const req = prev.level * 100;
                                if (nextExp >= req && prev.level < 5) {
                                  return { ...prev, level: prev.level + 1, exp: nextExp - req };
                                }
                                return { ...prev, exp: nextExp };
                              });
                              setGuildMedals((m) => m + 15);
                              sfx.play('forge_ok');
                            }}
                            className="px-3 py-2 rounded-xl bg-amber-400/20 hover:bg-amber-400/30 border border-amber-400/60 disabled:opacity-40 text-amber-200 font-mono font-bold text-xs cursor-pointer"
                          >
                            [🪙 Donate 10,000G (+50 Guild EXP &amp; +15🎖️)]
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSanctuariesModalOpen(false);
                            setMerchantTab('GUILD');
                            setMerchantHubOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-mono font-extrabold text-xs cursor-pointer"
                        >
                          [🛒 Guild Shop ({guildMedals}🎖️)]
                        </button>
                      </div>
                    </div>

                    {!guildState.joined ? (
                      <div className="p-6 rounded-2xl bg-slate-950 border border-rose-500/40 text-center space-y-4">
                        <h4 className="text-base font-bold text-white font-display">
                          🛡️ Guild Hall — Join or Create a Starfall Guild
                        </h4>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          You must belong to an active Guild to challenge Yog-Sothoth and earn Guild Medals.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => {
                              setGuildState({ joined: true, name: 'Starfall Vanguard', level: 1, exp: 0 });
                              sfx.play('gacha');
                            }}
                            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-extrabold text-xs cursor-pointer"
                          >
                            [🛡️ Join &quot;Starfall Vanguard&quot; (Free)]
                          </button>
                          <button
                            onClick={() => {
                              setGuildState({ joined: true, name: 'Chrono Sovereigns', level: 2, exp: 0 });
                              sfx.play('gacha');
                            }}
                            className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-mono font-extrabold text-xs cursor-pointer"
                          >
                            [👑 Create &quot;Chrono Sovereigns&quot; (Starts Lv.2)]
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {(['EASY', 'NORMAL', 'HARD'] as GuildRaidDiff[]).map((diffKey) => {
                          const spec = GUILD_RAID_DIFF_SPECS[diffKey];
                          const unlocked = guildState.level >= spec.minGuildLv;
                          return (
                            <div
                              key={diffKey}
                              className={`p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                                unlocked
                                  ? 'bg-slate-950/90 border-slate-800 hover:border-rose-400/60'
                                  : 'bg-slate-950/40 border-slate-900 opacity-60'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-400/50 text-xs font-mono font-bold text-rose-300">
                                    {spec.label}
                                  </span>
                                  <span className="text-xs font-mono text-amber-300">
                                    Unlocks Guild Lv.{spec.minGuildLv} · Rec. CP {spec.recCp.toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-xs font-mono text-slate-300">
                                  Boss DMG: <strong>{spec.bossDmgMult}x</strong> · Score &amp; Medal Multiplier:{' '}
                                  <strong className="text-emerald-300">{spec.scoreMult}x</strong>
                                  {diffKey === 'HARD' && (
                                    <span className="text-rose-400 ml-2">
                                      (⚠️ Wipe before 90s halves score/medals 0.5x!)
                                    </span>
                                  )}
                                </div>
                              </div>

                              <button
                                disabled={!unlocked || guildAttempts <= 0}
                                onClick={() => {
                                  setGuildRaidDiff(diffKey);
                                  setSanctuariesModalOpen(false);
                                  setActiveTab('BATTLE');
                                  setBattleSubMode('GUILD_RAID');
                                  initFloorWave(floor, false, 'GUILD_RAID');
                                }}
                                className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-mono font-extrabold text-xs cursor-pointer ml-auto"
                              >
                                [⚔️ Fight (1 Attempt)]
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* UNIFIED 4-TAB [🛒 MERCHANT HUB] MODAL */}
      {merchantHubOpen && (
        <div
          onClick={() => setMerchantHubOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl bg-[#0a0d18] border-2 border-rose-400/60 rounded-2xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <div className="text-[11px] font-mono text-rose-300 uppercase tracking-wider">
                  Unified 4-Tab Merchant Hub · Gold: {gold.toLocaleString()}🪙 · Shards: {starfallShards}🌟 · Arena: {arenaTokens}🏆 · Guild: {guildMedals}🎖️
                </div>
                <h2 className="text-xl font-bold text-white font-display">🛒 Grand Merchant Hub</h2>
              </div>
              <button
                onClick={() => setMerchantHubOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 hover:text-white cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* 4 Shop Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  { id: 'GOLD' as MerchantTabId, label: '1. 🪙 General Gold Shop' },
                  { id: 'STARFALL' as MerchantTabId, label: '2. 🌟 Starfall Exchange' },
                  { id: 'ARENA' as MerchantTabId, label: '3. 🏆 Arena Armory' },
                  { id: 'GUILD' as MerchantTabId, label: '4. 🎖️ Guild Treasury' },
                ]
              ).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setMerchantTab(t.id)}
                  className={`py-2 px-3 rounded-xl border font-mono font-bold text-xs cursor-pointer transition-colors ${
                    merchantTab === t.id
                      ? 'bg-amber-400 text-slate-950 border-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB 1: GENERAL GOLD SHOP */}
            {merchantTab === 'GOLD' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div className="p-4 rounded-xl bg-slate-950 border border-amber-400/50 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-amber-300">INSTANT SWEEP</span>
                    <h3 className="text-sm font-bold text-white font-display">🎫 1x Dungeon Sweep Ticket</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Instantly sweeps any cleared Dungeon Tier without fighting the boss.
                    </p>
                  </div>
                  <button
                    disabled={gold < 15000}
                    onClick={() => handleBuySweepTickets(1)}
                    className="w-full py-2 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-mono font-bold text-xs cursor-pointer"
                  >
                    [Buy 1x 🎫 · 15,000 Gold]
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-amber-400/50 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-emerald-300">10% BULK DISCOUNT</span>
                    <h3 className="text-sm font-bold text-white font-display">🎫 10x Dungeon Sweep Bundle</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Adds +10 Sweep Tickets at a 10% Gold discount (saves 15,000 Gold).
                    </p>
                  </div>
                  <button
                    disabled={gold < 135000}
                    onClick={() => handleBuySweepTickets(10)}
                    className="w-full py-2 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-mono font-bold text-xs cursor-pointer"
                  >
                    [Buy 10x 🎫 · 135,000 Gold]
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-purple-400/50 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-purple-300">ANVIL ENHANCEMENT</span>
                    <h3 className="text-sm font-bold text-white font-display">⚒️ Masterwork Forge Catalyst</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Guaranteed +1 Level to your currently selected Relic in the Gear &amp; Forge tab.
                    </p>
                  </div>
                  <button
                    disabled={gold < 25000 || !selectedGear || selectedGear.level >= 15}
                    onClick={() => {
                      if (gold < 25000 || !selectedGear || selectedGear.level >= 15) return;
                      setGold((g) => g - 25000);
                      setGearInventory((prev) =>
                        prev.map((it) =>
                          it.id === selectedGear.id ? { ...it, level: Math.min(15, it.level + 1) } : it
                        )
                      );
                      sfx.play('forge_ok');
                    }}
                    className="w-full py-2 rounded-lg bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-white font-mono font-bold text-xs cursor-pointer"
                  >
                    [Enhance Selected Relic · 25,000 Gold]
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: STARFALL EXCHANGE (UNLOCKS LOCKED SSR HEROES!) */}
            {merchantTab === 'STARFALL' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                <div className="p-4 rounded-xl bg-slate-950 border border-amber-400/60 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-amber-300">5★ SIGNATURE RELIC</span>
                    <h3 className="text-sm font-bold text-white font-display">
                      {featuredBannerHero.name}&apos;s Astral Edge (+9)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      +9 Masterwork Weapon (+20% ATK &amp; CRIT Substats) equipped to {featuredBannerHero.name}.
                    </p>
                  </div>
                  <button
                    disabled={starfallShards < 80}
                    onClick={() => {
                      if (starfallShards < 80) return;
                      setStarfallShards((s) => s - 80);
                      const sigWep: GearItem = {
                        id: `G_SIGWEP_${Date.now()}`,
                        name: `${featuredBannerHero.name}'s Astral Edge`,
                        slot: 'Weapon',
                        set: 'Starfall Executioner',
                        level: 9,
                        failStackCount: 0,
                        mainStatKey: 'ATK%',
                        baseMainValue: 10,
                        baseFlatStat: 125,
                        substats: [
                          { stat: 'CRIT RATE%', value: 10 },
                          { stat: 'CRIT DMG%', value: 18 },
                        ],
                        equippedBy: featuredBannerHero.id,
                      };
                      setGearInventory((prev) => [
                        sigWep,
                        ...prev.map((it) =>
                          it.equippedBy === featuredBannerHero.id && it.slot === 'Weapon'
                            ? { ...it, equippedBy: undefined }
                            : it
                        ),
                      ]);
                      sfx.play('gacha');
                    }}
                    className="w-full py-2 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-mono font-bold text-xs cursor-pointer"
                  >
                    [Exchange · 80 Shards]
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-rose-400/60 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-rose-300">FEATURED SOVEREIGN</span>
                    <h3 className="text-sm font-bold text-white font-display">
                      {featuredBannerHero.name} Contract
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Unlocks {featuredBannerHero.name} immediately (or ascends +1★ &amp; +5 Lv if owned).
                    </p>
                  </div>
                  <button
                    disabled={starfallShards < 100}
                    onClick={() => {
                      if (starfallShards < 100) return;
                      setStarfallShards((s) => s - 100);
                      setHeroProgress((prev) => {
                        const cur = prev[featuredBannerHero.id];
                        return {
                          ...prev,
                          [featuredBannerHero.id]: {
                            ...cur,
                            unlocked: true,
                            stars: cur.unlocked ? Math.min(5, cur.stars + 1) : cur.stars,
                            level: cur.unlocked ? Math.min(100, cur.level + 5) : cur.level,
                          },
                        };
                      });
                      sfx.play('gacha');
                    }}
                    className="w-full py-2 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-mono font-bold text-xs cursor-pointer"
                  >
                    [Exchange · 100 Shards]
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-sky-400/60 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-sky-300">WISHLIST #1 SSR</span>
                    <h3 className="text-sm font-bold text-white font-display">
                      {RESONATORS.find((r) => r.id === wishlistIds[0])?.name || 'Ignis'} Crest
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Unlocks your #1 Wishlist SSR Resonator (or ascends +1★ &amp; +5 Lv if owned).
                    </p>
                  </div>
                  <button
                    disabled={starfallShards < 75}
                    onClick={() => {
                      if (starfallShards < 75) return;
                      const targetId = wishlistIds[0] || 'H01';
                      setStarfallShards((s) => s - 75);
                      setHeroProgress((prev) => {
                        const cur = prev[targetId];
                        return {
                          ...prev,
                          [targetId]: {
                            ...cur,
                            unlocked: true,
                            stars: cur.unlocked ? Math.min(5, cur.stars + 1) : cur.stars,
                            level: cur.unlocked ? Math.min(100, cur.level + 5) : cur.level,
                          },
                        };
                      });
                      sfx.play('gacha');
                    }}
                    className="w-full py-2 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-mono font-bold text-xs cursor-pointer"
                  >
                    [Exchange · 75 Shards]
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-purple-400/60 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-purple-300">CATALYST CHEST</span>
                    <h3 className="text-sm font-bold text-white font-display">Reforge &amp; Catalyst Chest</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Grants +15,000 Gold &amp; upgrades your Selected Relic by +1 Level.
                    </p>
                  </div>
                  <button
                    disabled={starfallShards < 15}
                    onClick={() => {
                      if (starfallShards < 15) return;
                      setStarfallShards((s) => s - 15);
                      setGold((g) => g + 15000);
                      if (selectedGear && selectedGear.level < 15) {
                        setGearInventory((prev) =>
                          prev.map((it) =>
                            it.id === selectedGear.id ? { ...it, level: Math.min(15, it.level + 1) } : it
                          )
                        );
                      }
                      sfx.play('forge_ok');
                    }}
                    className="w-full py-2 rounded-lg bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-white font-mono font-bold text-xs cursor-pointer"
                  >
                    [Exchange · 15 Shards]
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: ARENA ARMORY */}
            {merchantTab === 'ARENA' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-xl bg-slate-950 border border-sky-400/60 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-sky-300">STARLIGHT GEM SUPPLY</span>
                    <h3 className="text-sm font-bold text-white font-display">💎 480 Starlight Gems (3 Summons)</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Exchange 50 Arena Tokens earned from 1v1 Challenger victories for 480 Starlight Gems.
                    </p>
                  </div>
                  <button
                    disabled={arenaTokens < 50}
                    onClick={() => {
                      if (arenaTokens < 50) return;
                      setArenaTokens((t) => t - 50);
                      setStarlightGems((g) => g + 480);
                      sfx.play('gacha');
                    }}
                    className="w-full py-2 rounded-lg bg-sky-400 hover:bg-sky-300 disabled:opacity-40 text-slate-950 font-mono font-bold text-xs cursor-pointer"
                  >
                    [Exchange 50🏆 ➔ +480 💎 Gems]
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-amber-400/60 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-amber-300">CHAMPION BOUNTY</span>
                    <h3 className="text-sm font-bold text-white font-display">🪙 35,000 Gold + 2🎫 Sweep Tickets</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Exchange 30 Arena Tokens for a war chest of Gold and Dungeon Sweep Tickets.
                    </p>
                  </div>
                  <button
                    disabled={arenaTokens < 30}
                    onClick={() => {
                      if (arenaTokens < 30) return;
                      setArenaTokens((t) => t - 30);
                      setGold((g) => g + 35000);
                      setSweepTickets((s) => s + 2);
                      sfx.play('forge_ok');
                    }}
                    className="w-full py-2 rounded-lg bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-mono font-bold text-xs cursor-pointer"
                  >
                    [Exchange 30🏆 ➔ 35,000G + 2🎫]
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: GUILD TREASURY */}
            {merchantTab === 'GUILD' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-4 rounded-xl bg-slate-950 border border-rose-400/60 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-rose-300">EXOTIC RAID RELIC</span>
                    <h3 className="text-sm font-bold text-white font-display">
                      🌌 Exotic Voidweaver Core Sigil +6
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Crafts an Exotic +6 Voidweaver Core Sigil (+32% Skill DMG on Break) from Yog-Sothoth Medals.
                    </p>
                  </div>
                  <button
                    disabled={guildMedals < 100}
                    onClick={() => {
                      if (guildMedals < 100) return;
                      setGuildMedals((m) => m - 100);
                      const raidRelic: GearItem = {
                        id: `G_RAID_${Date.now()}`,
                        name: 'Yog-Sothoth Voidweaver Core',
                        slot: 'Core Sigil',
                        set: 'Starfall Executioner',
                        level: 6,
                        failStackCount: 0,
                        mainStatKey: 'CRIT RATE%',
                        baseMainValue: 10,
                        baseFlatStat: 280,
                        substats: [
                          { stat: 'CRIT DMG%', value: 16 },
                          { stat: 'ATK%', value: 11 },
                          { stat: 'BREAK POWER%', value: 14 },
                        ],
                        isExoticSigil: true,
                        sigilTrait: SIGIL_CORE_TRAITS[2],
                      };
                      setGearInventory((prev) => [raidRelic, ...prev]);
                      sfx.play('gacha');
                    }}
                    className="w-full py-2 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-mono font-bold text-xs cursor-pointer"
                  >
                    [Exchange 100🎖️ ➔ Exotic Voidweaver Core +6]
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-purple-400/60 flex flex-col justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-purple-300">TIME SHARD PACT</span>
                    <h3 className="text-sm font-bold text-white font-display">⏳ +120 Chrono Time Shards</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Exchange 60 Guild Medals to empower your Zodiac Constellations in the Chrono Rewind tab.
                    </p>
                  </div>
                  <button
                    disabled={guildMedals < 60}
                    onClick={() => {
                      if (guildMedals < 60) return;
                      setGuildMedals((m) => m - 60);
                      setTimeShards((s) => s + 120);
                      sfx.play('ult');
                    }}
                    className="w-full py-2 rounded-lg bg-purple-500 hover:bg-purple-400 disabled:opacity-40 text-white font-mono font-bold text-xs cursor-pointer"
                  >
                    [Exchange 60🎖️ ➔ +120 Time Shards]
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PAUSE / GAME OVER MODAL */}
      {(shellState === 'PAUSED' || shellState === 'GAME_OVER') && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 text-center space-y-4">
            <h2 className="text-xl font-bold text-white font-display">
              {shellState === 'GAME_OVER' ? 'Squad Consumed by Mental Corruption' : 'Simulation Paused'}
            </h2>
            <p className="text-xs text-slate-400">
              {shellState === 'GAME_OVER'
                ? 'Trigger Chrono Rewind to claim Time Shards and empower your Constellations, or retry the current floor.'
                : `Currently on Spire Floor F${floor}.`}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              {shellState === 'PAUSED' ? (
                <button
                  onClick={() => setShellState('PLAYING')}
                  className="px-5 py-2.5 bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg cursor-pointer"
                >
                  Resume Battle
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      initFloorWave(floor, false, battleSubMode === 'DOMAINS' ? 'SPIRE' : battleSubMode);
                      setShellState('PLAYING');
                    }}
                    className="px-4 py-2.5 bg-slate-800 text-slate-100 font-semibold text-xs rounded-lg cursor-pointer"
                  >
                    Retry Floor {floor}
                  </button>
                  <button
                    onClick={handleChronoRewind}
                    className="px-5 py-2.5 bg-purple-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Chrono Rewind (+Shards)
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {cpBreakdownOpen && (() => {
        const breakdown = computeHeroCPBreakdown(
          selectedHeroData,
          selectedHeroProg,
          gearInventory,
          formationId,
          formationLevel,
          partyIds.indexOf(selectedHeroData.id),
          partyResonance,
          blessings,
          constellations,
          unlockedNodeIdsList
        );
        return (
          <CPDetailedBreakdown
            hero={selectedHeroData}
            totalCp={breakdown.totalCp}
            items={breakdown.items}
            onClose={() => setCpBreakdownOpen(false)}
          />
        );
      })()}

      {showWiki && <WikiModal onClose={() => setShowWiki(false)} />}
    </div>
  );
}

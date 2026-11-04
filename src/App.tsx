import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DebuffType,
  ELEMENT_META,
  FORMATIONS,
  GambitConditionSlot1,
  GambitConditionSlot2,
  getFormationRowBonuses,
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
  CONSTELLATION_NODES,
  createInitialGearInventory,
  EQUIPMENT_SETS,
  GearItem,
  GearSlot,
  getEnhanceRule,
  getGearMainStatValue,
  rollMilestoneSubstat,
  SetId,
  StatKey,
} from './data/equipment.ts';
import {
  BossPartUnit,
  CombatHeroUnit,
  computeHeroStats,
  computePartyResonance,
  CutInBannerState,
  FloatingText,
  getFloorSegmentBp,
  HeroProgress,
  runBalanceSelfChecks,
  sfx,
} from './engine/combatEngine.ts';
import { Particle, renderBattlefieldCanvas } from './engine/pixelRenderer.ts';
import { PixelPreviewCanvas, ResonatorSplashArt, WikiModal } from './components/ResonatorArtAndWiki.tsx';
import { V21SystemsWorkbench } from './components/V21ArchitecturePanel.tsx';

type GameShellState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type MainTab = 'BATTLE' | 'HEROES' | 'FORGE' | 'SUMMON' | 'REWIND';

const INITIAL_HERO_PROGRESS: Record<string, HeroProgress> = Object.fromEntries(
  RESONATORS.map((r) => [
    r.id,
    {
      id: r.id,
      unlocked: true,
      level: r.rarity === 'SSR' ? 25 : 20,
      stars: r.rarity === 'SSR' ? 3 : 2,
      skillLevels: r.rarity === 'SSR' ? { basic: 3, active: 4, chain: 4, ultimate: 3 } : { basic: 2, active: 3, chain: 3, ultimate: 2 },
      gambit1: r.defaultGambit1,
      gambit2: r.defaultGambit2,
    },
  ])
);

export default function App() {
  // Run SSOT math verification once
  useMemo(() => {
    console.assert(runBalanceSelfChecks(), 'Chrono Spire SSOT balance verification failed');
  }, []);

  // --- PERSISTENT GAME STATE ---
  const [shellState, setShellState] = useState<GameShellState>('TITLE_MENU');
  const [activeTab, setActiveTab] = useState<MainTab>('BATTLE');
  const [showWiki, setShowWiki] = useState(false);
  const [showV21Workbench, setShowV21Workbench] = useState(false);
  const [muted, setMuted] = useState(false);

  // Currencies & Progression
  const [gold, setGold] = useState(18500);
  const [starlightGems, setStarlightGems] = useState(3200);
  const [timeShards, setTimeShards] = useState(120);
  const [floor, setFloor] = useState(1);
  const [highestFloor, setHighestFloor] = useState(1);

  // Squad & Formation (Default 5-Hero Squad: Caelum H04, Kallen H01, Kahori H10, Yuzuki H07, Aurelia H13)
  const [partyIds, setPartyIds] = useState<string[]>(['H04', 'H01', 'H10', 'H07', 'H13']);
  const [formationId, setFormationId] = useState<'HYPER_CARRY' | 'SOLO_BASTION' | 'BALANCED' | 'VANGUARD'>('BALANCED');
  const [formationLevel, setFormationLevel] = useState(3);
  const [heroProgress, setHeroProgress] = useState<Record<string, HeroProgress>>(INITIAL_HERO_PROGRESS);
  const [gearInventory, setGearInventory] = useState<GearItem[]>(() => createInitialGearInventory());
  const [blessings, setBlessings] = useState<Record<string, number>>({ ARCANA_19: 1, ARCANA_08: 1 });
  const [constellations, setConstellations] = useState<Record<string, number>>({ C_ATK: 1, C_BREAK: 1 });

  // UI Selection States
  const [selectedHeroId, setSelectedHeroId] = useState<string>('H01');
  const [selectedGearId, setSelectedGearId] = useState<string>('G_H01_W');
  const [forgeFeedback, setForgeFeedback] = useState<{ text: string; success: boolean } | null>(null);
  const [activeBannerId, setActiveBannerId] = useState<'RATE_UP' | 'STANDARD'>('RATE_UP');
  const [featuredBannerHeroId, setFeaturedBannerHeroId] = useState<string>('H01');
  const [gachaPity, setGachaPity] = useState<number>(12);
  const [recentPulls, setRecentPulls] = useState<{ name: string; rarity: string; note: string }[]>([]);

  // Combat Settings & HUD Sync State
  const [cutInEnabled, setCutInEnabled] = useState(true);
  const [autoUltimate, setAutoUltimate] = useState(true);
  const [blessingChoices, setBlessingChoices] = useState<BlessingCardSpec[] | null>(null);

  // Computed Party Resonance & All Hero Stats
  const partyResonance = useMemo(() => computePartyResonance(partyIds), [partyIds]);

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
        constellations
      );
    });
    return map;
  }, [heroProgress, gearInventory, formationId, formationLevel, partyIds, partyResonance, blessings, constellations]);

  // --- REALTIME 60FPS COMBAT ENGINE REF ---
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<{
    floor: number;
    waveElapsed: number;
    isBerserk: boolean;
    staggerSegments: number;
    currentSegmentBp: number;
    maxSegmentBp: number;
    isStaggered: boolean;
    staggerTimer: number;
    staggerWarningTimer: number;
    antiStaggerTimer: number;
    manualFocusId: 'BOSS_MAIN' | 'TENTACLE_FRONT' | 'EYE_BACK' | null;
    firestormCd: number;
    hitstopTimer: number;
    shakeMag: number;
    heroes: CombatHeroUnit[];
    bossParts: BossPartUnit[];
    floatingTexts: FloatingText[];
    particles: Particle[];
    cutIn: CutInBannerState | null;
    combatLog: string[];
  }>({
    floor: 1,
    waveElapsed: 0,
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
    cutIn: null,
    combatLog: ['Entered Chrono Spire Floor 1 — Old God Remnant Detected.'],
  });

  // React HUD snapshot updated at ~15fps so React never bottlenecks 60fps Canvas
  const [hudState, setHudState] = useState(() => ({
    waveElapsed: 0,
    isBerserk: false,
    staggerSegments: 5,
    currentSegmentBp: 120,
    maxSegmentBp: 120,
    isStaggered: false,
    staggerTimer: 0,
    staggerWarningTimer: 0,
    manualFocusId: null as 'BOSS_MAIN' | 'TENTACLE_FRONT' | 'EYE_BACK' | null,
    cutIn: null as CutInBannerState | null,
    heroes: [] as CombatHeroUnit[],
    bossParts: [] as BossPartUnit[],
    combatLog: [] as string[],
  }));

  // Initialize / Reset a Floor Wave
  const initFloorWave = useCallback(
    (targetFloor: number, preserveHpRatio = false) => {
      const form = FORMATIONS.find((f) => f.id === formationId) || FORMATIONS[2];
      const startEnergyTier = blessings['ARCANA_07'] || 0;
      const startEnergy = startEnergyTier > 0 ? BLESSING_CARDS.find((b) => b.id === 'ARCANA_07')!.tiers[Math.min(2, startEnergyTier - 1)] : 15;
      const frontShieldTier = blessings['ARCANA_08'] || 0;
      const frontShieldPct = frontShieldTier > 0 ? BLESSING_CARDS.find((b) => b.id === 'ARCANA_08')!.tiers[Math.min(2, frontShieldTier - 1)] : 0;
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
        const ySpan = 165;
        const baseY = 235;
        const yOffset = rowCount === 1 ? 0 : ((rowIdx / (rowCount - 1)) - 0.5) * ySpan;

        const prev = prevHeroes.find((h) => h.id === id);
        let startHp = st.hp;
        if (preserveHpRatio && prev && prev.hp > 0) {
          const ratio = Math.min(1, prev.hp / prev.maxHp + floorHealPct / 100);
          startHp = Math.round(st.hp * ratio);
        }

        return {
          id,
          data,
          prog,
          stats: st,
          hp: startHp,
          maxHp: st.hp,
          shield: isFront && frontShieldPct > 0 ? Math.round((st.hp * frontShieldPct) / 100) : 0,
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
          hitFlash: 0,
          lastActionLabel: '',
          lastActionTimer: 0,
        };
      });

      // Scale Old God Boss Stats by Floor
      const floorScale = Math.pow(1.11, targetFloor - 1);
      const baseBossHp = Math.round(26000 * floorScale);
      const baseBossAtk = Math.round(280 * floorScale);
      const baseBossDef = Math.round(140 + targetFloor * 12);
      const segBp = getFloorSegmentBp(targetFloor, false);

      const newBossParts: BossPartUnit[] = [
        {
          id: 'TENTACLE_FRONT',
          name: 'Void Tentacle Pillar',
          roleLabel: 'Front Guard (Taunt)',
          hp: Math.round(baseBossHp * 0.35),
          maxHp: Math.round(baseBossHp * 0.35),
          atk: Math.round(baseBossAtk * 0.9),
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
          x: 560,
          y: 255,
          hitFlash: 0,
        },
        {
          id: 'BOSS_MAIN',
          name: "Old God Core: Azathoth's Remnant",
          roleLabel: 'Cosmic Core Boss',
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
          x: 705,
          y: 215,
          hitFlash: 0,
        },
        {
          id: 'EYE_BACK',
          name: 'Eye of Madness',
          roleLabel: 'Backline Support (Aegis)',
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
          x: 835,
          y: 175,
          hitFlash: 0,
        },
      ];

      simRef.current = {
        ...simRef.current,
        floor: targetFloor,
        waveElapsed: 0,
        isBerserk: false,
        staggerSegments: 5,
        currentSegmentBp: segBp,
        maxSegmentBp: segBp,
        isStaggered: false,
        staggerTimer: 0,
        staggerWarningTimer: 0,
        antiStaggerTimer: 0,
        firestormCd: 0,
        heroes: newHeroes,
        bossParts: newBossParts,
      };
    },
    [partyIds, formationId, blessings, heroProgress, computedStatsMap]
  );

  // Re-initialize wave when starting game or changing formation/party
  useEffect(() => {
    initFloorWave(floor, true);
  }, [formationId, partyIds]);

  // Helper to push floating combat text & particles
  const spawnFloatingText = (text: string, x: number, y: number, color: string, scale = 1.0, subtext?: string) => {
    simRef.current.floatingTexts.push({
      id: Math.random(),
      text,
      subtext,
      x: x + (Math.random() - 0.5) * 26,
      y: y - 20,
      vy: -32,
      color,
      scale,
      life: 0.95,
      maxLife: 0.95,
    });
  };

  const spawnBurstParticles = (x: number, y: number, color: string, count = 12) => {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const spd = 45 + Math.random() * 95;
      simRef.current.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: 3 + Math.floor(Math.random() * 4),
        color,
        alpha: 1,
        life: 0.45,
        maxLife: 0.45,
      });
    }
  };

  const pushLog = (msg: string) => {
    simRef.current.combatLog = [msg, ...simRef.current.combatLog.slice(0, 14)];
  };

  // Manual Ultimate Trigger from HUD Card Click
  const triggerManualUltimate = (heroId: string) => {
    const sim = simRef.current;
    const u = sim.heroes.find((h) => h.id === heroId);
    if (!u || u.hp <= 0 || u.energy < 100) return;
    u.energy = 99.9; // Will fire on next frame tick
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
      if (sim.isStaggered || sim.antiStaggerTimer > 0 || bpAmount <= 0) return;
      let rem = bpAmount;
      while (rem > 0 && sim.staggerSegments > 0) {
        if (rem >= sim.currentSegmentBp) {
          rem -= sim.currentSegmentBp;
          sim.staggerSegments -= 1;
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
      hero.animOffset = 0.22;
      hero.lastActionLabel = skill.name;
      hero.lastActionTimer = 1.1;

      const multPct = interpolateSkillMult(skill, skillLv);
      const baseProcPct = interpolateSkillProc(skill, skillLv);
      const effAtk = Math.round(
        hero.stats.atk *
          (1 + hero.buffs.atkPct / 100) *
          (hero.shield > 0 && sim.heroes.some((h) => h.id === 'H13' && h.hp > 0 && h.prog.stars >= 4) ? 1.15 : 1)
      );

      // Handle Ultimate Cut-In & Energy Refund (Tarot ARCANA_10 Wheel of Fortune)
      if (skill.type === 'Ultimate') {
        hero.energy = 0;
        const loopTier = blessings['ARCANA_10'] || 0;
        if (loopTier > 0) {
          const chance = BLESSING_CARDS.find((b) => b.id === 'ARCANA_10')!.tiers[Math.min(2, loopTier - 1)];
          if (Math.random() * 100 < chance) {
            hero.energy = 50;
            spawnFloatingText('CHRONO LOOP +50% EN', hero.x, hero.y - 25, '#38bdf8', 0.95);
          }
        }
        // Instant Cut-In Override rule (Module 2.4)
        if (cutInEnabled) {
          sim.cutIn = {
            heroId: hero.id,
            heroName: hero.data.name,
            skillName: skill.name,
            element: hero.data.element,
            primaryColor: hero.data.colors.primary,
            remaining: 1.55,
          };
        }
        sim.hitstopTimer = 0.045;
        sim.shakeMag = 7;
        sfx.play('ult');
      } else if (skill.type === 'Chain') {
        sfx.play('chain');
        // Astral Nexus 4-PC Bonus: Team ATK +15% for 4s
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

      const targets = selectTargetsForSkill(skill, sim);
      targets.forEach((target) => {
        if (!target.alive) return;

        // Check Elemental Reaction Detonation (Module 3.1 & 3.3: Consume Status on Reaction!)
        let reactionTriggered: ReactionType | null = null;
        let reactionDmgMult = 1.0;
        let ignoreDefPct = 0;
        let forceTrueDmg = false;

        const loverTier = blessings['ARCANA_06'] || 0;
        const reactionBlessBonus = loverTier > 0 ? 1 + BLESSING_CARDS.find((b) => b.id === 'ARCANA_06')!.tiers[Math.min(2, loverTier - 1)] / 100 : 1.0;

        if (skill.reactionTrigger === 'MELTDOWN' && target.debuffs.some((d) => d.type === 'Freeze')) {
          target.debuffs = target.debuffs.filter((d) => d.type !== 'Freeze');
          reactionTriggered = 'MELTDOWN';
          reactionDmgMult = 1.8 * reactionBlessBonus;
          target.debuffs.push({ type: 'Defenseless', remaining: 4.0, stacks: 1, sourceAtk: effAtk });
        } else if (skill.reactionTrigger === 'SUPERCONDUCT' && target.debuffs.some((d) => d.type === 'Shock')) {
          target.debuffs = target.debuffs.filter((d) => d.type !== 'Shock');
          reactionTriggered = 'SUPERCONDUCT';
          reactionDmgMult = 1.35 * reactionBlessBonus;
          applyBreakDamage(sim, Math.round(80 * reactionBlessBonus));
          sim.heroes.forEach((ally) => {
            ally.buffs.breakPct = 35;
            ally.buffs.breakTimer = 4.0;
          });
        } else if (skill.reactionTrigger === 'TWILIGHT EXECUTION' && target.debuffs.some((d) => d.type === 'Luminous Mark')) {
          target.debuffs = target.debuffs.filter((d) => d.type !== 'Luminous Mark');
          reactionTriggered = 'TWILIGHT EXECUTION';
          reactionDmgMult = 1.45 * reactionBlessBonus;
          if (target.hp / target.maxHp < 0.25) forceTrueDmg = true;
          else ignoreDefPct = 40;
        } else if (skill.reactionTrigger === 'FIRESTORM' && target.debuffs.some((d) => d.type === 'Burn')) {
          target.debuffs = target.debuffs.filter((d) => d.type !== 'Burn');
          reactionTriggered = 'FIRESTORM';
          reactionDmgMult = 1.4 * reactionBlessBonus;
          // Spread Burn + Bleed to all alive parts
          sim.bossParts.forEach((bp) => {
            if (!bp.alive) return;
            bp.debuffs.push({ type: 'Burn', remaining: 4.0, stacks: 1, sourceAtk: effAtk });
            bp.debuffs.push({ type: 'Bleed', remaining: 4.0, stacks: 2, sourceAtk: effAtk });
          });
          if (sim.firestormCd <= 0) {
            sim.firestormCd = 6.0;
            sim.heroes.forEach((ally) => {
              ally.energy = Math.min(100, ally.energy + 10);
            });
          }
        }

        if (reactionTriggered) {
          pushLog(`${hero.data.name} triggered ${reactionTriggered} on ${target.name}!`);
          spawnBurstParticles(target.x, target.y, hero.data.colors.primary, 18);
          // Yuzuki (H07) 5-star passive: +15% Energy on any reaction
          const yuzuki = sim.heroes.find((h) => h.id === 'H07' && h.hp > 0 && h.prog.stars >= 5);
          if (yuzuki) yuzuki.energy = Math.min(100, yuzuki.energy + 15);
        }

        // Crit Rate & Crit DMG calculation
        const hasBurn = target.debuffs.some((d) => d.type === 'Burn');
        const hasLuminous = target.debuffs.some((d) => d.type === 'Luminous Mark');
        const hasCorrosion = target.debuffs.some((d) => d.type === 'Corrosion');
        const bleedEntry = target.debuffs.find((d) => d.type === 'Bleed');

        let critChance = hero.stats.critRate + hero.buffs.critRatePct + (hasLuminous ? 20 : 0);
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
        let bonusMult = reactionDmgMult;
        if (skill.type === 'Basic' && hero.stats.fourPieceSet === 'Volatus') bonusMult *= 1.4;
        if (skill.type === 'Chain') bonusMult *= 1 + (partyResonance.chainDmgPct + (hero.stats.activeSets.some((s) => s.set === 'Astral Nexus') ? 25 : 0)) / 100;
        if (skill.type === 'Ultimate') {
          if (hero.stats.fourPieceSet === 'Overload') bonusMult *= 1.4;
          if (hasCorrosion) bonusMult *= 1.35;
          if (hero.id === 'H01' && hasBurn) bonusMult *= 1.25;
        }
        if (hero.id === 'H16' && hero.prog.stars >= 4 && target.hp / target.maxHp < 0.5) bonusMult *= 1.25;
        if (target.voidStacks > 0) bonusMult *= 1 + target.voidStacks * 0.05;

        // Staggered Multiplier (+50% base + Tarot ARCANA_16 The Tower)
        if (sim.isStaggered) {
          const ruinTier = blessings['ARCANA_16'] || 0;
          const ruinBonus = ruinTier > 0 ? BLESSING_CARDS.find((b) => b.id === 'ARCANA_16')!.tiers[Math.min(2, ruinTier - 1)] / 100 : 0;
          bonusMult *= 1.5 + ruinBonus;
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

        // Apply Damage to Boss Part Shield then HP
        if (target.shield > 0) {
          const absorbed = Math.min(target.shield, finalDmg);
          target.shield -= absorbed;
          finalDmg -= absorbed;
        }
        target.hp = Math.max(0, target.hp - finalDmg);
        target.hitFlash = 0.14;

        // Luminous Mark Lifesteal (8%)
        if (hasLuminous && hero.hp > 0) {
          hero.hp = Math.min(hero.maxHp, hero.hp + Math.round(finalDmg * 0.08));
        }

        if (skill.type === 'Basic') sfx.play(isCrit ? 'crit' : 'hit');
        spawnFloatingText(
          `${finalDmg.toLocaleString()}${isCrit ? '!' : ''}`,
          target.x,
          target.y,
          reactionTriggered ? '#fde047' : isCrit ? '#fb923c' : '#f8fafc',
          reactionTriggered ? 1.35 : isCrit ? 1.18 : 0.95,
          reactionTriggered || undefined
        );

        // Break Damage Formula (Module 2.3): BP = Base * (BreakPower% / 100) * ShockMultiplier
        const shockMult = target.debuffs.some((d) => d.type === 'Shock') ? 1.35 : 1.0;
        const totalBreakPct = hero.stats.breakPower + hero.buffs.breakPct;
        const bpDealt = Math.round(skill.breakPower * (totalBreakPct / 100) * shockMult);
        applyBreakDamage(sim, bpDealt);

        // Status Proc Chance Budget (Module 3.2): Base + Gear Effect Hit Rate - Boss Effect RES
        if (skill.debuff) {
          const isShocked = target.debuffs.some((d) => d.type === 'Shock');
          const effRes = skill.type === 'Ultimate' && hero.id === 'H07' ? Math.max(0, target.effectRes - 25) : target.effectRes;
          const freezeBonus = skill.debuff === 'Freeze' && isShocked ? 30 : 0;
          const procChance = baseProcPct + hero.stats.effectHitRate + freezeBonus - effRes;

          if (skill.debuff === 'Freeze' && target.freezeResistTimer > 0) {
            // Boss has 8s Freeze immunity after recovering from Freeze
          } else if (Math.random() * 100 < procChance) {
            const existing = target.debuffs.find((d) => d.type === skill.debuff);
            if (existing) {
              existing.remaining = skill.debuffDuration;
              if (skill.debuff === 'Bleed') {
                existing.stacks = Math.min(5, existing.stacks + (skill.debuffStacks || 1));
              }
            } else {
              target.debuffs.push({
                type: skill.debuff,
                remaining: skill.debuffDuration,
                stacks: skill.debuffStacks || 1,
                sourceAtk: effAtk,
              });
            }
            if (skill.debuff === 'Freeze') {
              target.freezeResistTimer = 10.0; // 2s freeze + 8s resist
            }
            // Voidweaver 4-PC Bonus
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
          spawnBurstParticles(target.x, target.y, '#f43f5e', 24);
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

      // Slot 1: Emergency / Break / Shield
      const g1 = hero.prog.gambit1;
      if (g1 === 'BOSS_STAGGER_OPEN' && !sim.isStaggered && sim.staggerSegments > 0 && hero.id === 'H04') return true;
      if (g1 === 'ALLY_HP_BELOW_50' && sim.heroes.some((a) => a.hp > 0 && a.hp / a.maxHp < 0.5)) return true;
      if (g1 === 'BOSS_SHIELD_ACTIVE' && aliveParts.some((b) => b.shield > 0)) return true;
      if (g1 === 'ALWAYS_READY') return true;

      // Slot 2: Elemental Chain Combo
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
          sim.staggerSegments = 5;
          sim.currentSegmentBp = sim.maxSegmentBp;
          sim.antiStaggerTimer = 8.0;
          pushLog('Old God recovered from Stagger (8s Anti-Stagger Lock active).');
        }
      } else if (sim.antiStaggerTimer > 0) {
        sim.antiStaggerTimer = Math.max(0, sim.antiStaggerTimer - dt);
      }

      // Update Heroes (4+1 Skill Queue: Ultimate -> Gambit Chain -> Active -> Basic)
      sim.heroes.forEach((u) => {
        if (u.hp <= 0) return;
        u.animOffset = Math.max(0, u.animOffset - dt);
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
        if (u.energy >= 100 && autoUltimate) {
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
      const berserkMult = sim.isBerserk ? 2.0 : 1.0;
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

        // Tick DoTs (Burn: 30% ATK/s, Bleed: 20% ATK/s per stack)
        b.debuffs.forEach((d) => {
          d.remaining -= dt;
          if (d.type === 'Burn') {
            b.hp = Math.max(0, b.hp - Math.round(d.sourceAtk * 0.3 * dt));
          } else if (d.type === 'Bleed') {
            b.hp = Math.max(0, b.hp - Math.round(d.sourceAtk * 0.2 * d.stacks * dt));
          }
        });
        b.debuffs = b.debuffs.filter((d) => d.remaining > 0);

        if (b.hp <= 0 && b.alive) {
          b.alive = false;
          return;
        }

        // Frozen or Staggered halts boss actions
        if (sim.isStaggered || b.debuffs.some((d) => d.type === 'Freeze')) return;

        const slowMod = b.debuffs.some((d) => d.type === 'Slow') ? 0.85 : 1.0;
        const effDt = dt * berserkSpdMult * slowMod;

        b.attackTimer -= effDt;
        b.specialTimer -= effDt;

        const dealDamageToHero = (targetHero: CombatHeroUnit, rawBossDmg: number) => {
          if (targetHero.hp <= 0) return;
          const effDef = targetHero.stats.def * (1 + targetHero.buffs.defPct / 100);
          let dmg = Math.round(rawBossDmg * (100 / (100 + effDef * 0.22)));
          if (targetHero.id === 'H04' && targetHero.prog.stars >= 4) dmg = Math.round(dmg * 0.82);
          if (yuzuki4StarActive && b.debuffs.length > 0) dmg = Math.round(dmg * 0.85);

          // Tarot ARCANA_08 Strength Thorns (15%)
          if ((blessings['ARCANA_08'] || 0) > 0 && targetHero.stats.rowPosition === 'Front') {
            b.hp = Math.max(1, b.hp - Math.round(dmg * 0.15));
          }

          if (targetHero.shield > 0) {
            const abs = Math.min(targetHero.shield, dmg);
            targetHero.shield -= abs;
            dmg -= abs;
          }
          targetHero.hp = Math.max(0, targetHero.hp - dmg);
          targetHero.hitFlash = 0.14;
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
            // Void Cleave: Hits all Frontline heroes for 120% Boss ATK
            targetPool.forEach((h) => dealDamageToHero(h, b.atk * 1.2 * berserkMult));
          } else if (b.id === 'TENTACLE_FRONT') {
            // Abyssal Slam: Hits frontmost hero for 90% Boss ATK
            dealDamageToHero(targetPool[0], b.atk * 0.9 * berserkMult);
          } else if (b.id === 'EYE_BACK') {
            // Mind Laser: Hits highest ATK hero (2 targets in Berserk)
            const byAtk = [...aliveHeroes].sort((x, y) => y.stats.atk - x.stats.atk);
            dealDamageToHero(byAtk[0], b.atk * 1.1 * berserkMult);
            if (sim.isBerserk && byAtk[1]) dealDamageToHero(byAtk[1], b.atk * 1.1 * berserkMult);
          }
        }

        // Special Skill (every 8s / 10s / 12s)
        if (b.specialTimer <= 0) {
          if (b.id === 'BOSS_MAIN') {
            b.specialTimer = 8.0;
            // Mental Corruption Wave: AoE 185% Boss ATK + triggers 4.0s Stagger Check Warning!
            aliveHeroes.forEach((h) => dealDamageToHero(h, b.atk * 1.85 * berserkMult));
            if (sim.staggerWarningTimer <= 0 && !sim.isStaggered) {
              sim.staggerWarningTimer = 4.0;
              pushLog('WARNING: Azathoth charging Cataclysmic Supernova (4.0s)! Break Stagger Gauge now!');
            }
          } else if (b.id === 'TENTACLE_FRONT') {
            b.specialTimer = 10.0;
            b.tauntTimer = 4.0;
            spawnFloatingText('ELDRITCH TAUNT', b.x, b.y - 25, '#fbbf24', 1.05);
          } else if (b.id === 'EYE_BACK') {
            b.specialTimer = 12.0;
            const mainCore = sim.bossParts.find((p) => p.id === 'BOSS_MAIN' && p.alive);
            if (mainCore) {
              mainCore.shield = Math.round(mainCore.maxHp * 0.15);
              spawnFloatingText('AEGIS BARRIER +15%', mainCore.x, mainCore.y - 30, '#38bdf8', 1.1);
            }
          }
        }
      });

      // Stagger Check 4.0s Countdown for Cataclysmic Supernova (Module 6.3)
      if (sim.staggerWarningTimer > 0 && !sim.isStaggered) {
        sim.staggerWarningTimer -= dt;
        if (sim.staggerWarningTimer <= 0) {
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

      // Update Floating Texts & Particles
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

      // Check Wave Victory (Main Boss Core defeated)
      const mainCore = sim.bossParts.find((b) => b.id === 'BOSS_MAIN');
      if (mainCore && !mainCore.alive) {
        const nextFl = sim.floor + 1;
        const shardMult = 1 + ((constellations['C_SHARDS'] || 0) * 12) / 100;
        const earnedGold = Math.round((850 + sim.floor * 240) * shardMult);
        const earnedGems = sim.floor % 5 === 0 ? 160 : 40;
        setGold((g) => g + earnedGold);
        setStarlightGems((s) => s + earnedGems);
        setFloor(nextFl);
        setHighestFloor((hf) => Math.max(hf, nextFl));
        pushLog(`Floor ${sim.floor} Cleared! +${earnedGold.toLocaleString()} Gold · +${earnedGems} Starlight.`);

        // Every 5 floors: Open Roguelite Tarot Blessing Modal (Module 1.1 & 5)
        if (sim.floor % 5 === 0) {
          const shuffled = [...BLESSING_CARDS].sort(() => Math.random() - 0.5).slice(0, 3);
          setBlessingChoices(shuffled);
        }
        initFloorWave(nextFl, true);
      }

      // Check Total Party Wipe
      if (sim.heroes.every((h) => h.hp <= 0)) {
        setShellState('GAME_OVER');
      }
    };

    const loop = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(rawDt, 0.05); // Clamp frame delta time per game craft guidelines

      const isSimActive = shellState === 'PLAYING' && !blessingChoices && !showWiki;
      if (isSimActive) {
        tickSimulation(dt);
      }

      // Render Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const sim = simRef.current;
          renderBattlefieldCanvas(
            ctx,
            canvas.width,
            canvas.height,
            now / 1000,
            sim.heroes,
            sim.bossParts,
            sim.floatingTexts,
            sim.particles,
            sim.manualFocusId,
            sim.isStaggered,
            sim.isBerserk,
            sim.shakeMag
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
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [shellState, blessingChoices, showWiki, autoUltimate, cutInEnabled, blessings, constellations, partyResonance, initFloorWave]);

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

  // --- ACTIONS FOR HEROES, FORGE, SUMMON & CHRONO REWIND ---
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

    const ringPool: StatKey[] = ['CRIT RATE%', 'CRIT DMG%', 'ATK%', 'HP%', 'HEALING BONUS%'];
    const sigilPool: StatKey[] = ['BREAK POWER%', 'ENERGY CHARGE%', 'EFFECT HIT RATE%', 'SPD'];
    const mainKey: StatKey =
      slot === 'Weapon'
        ? 'ATK%'
        : slot === 'Armor'
        ? 'DEF%'
        : slot === 'Ring I' || slot === 'Ring II'
        ? ringPool[Math.floor(Math.random() * ringPool.length)]
        : sigilPool[Math.floor(Math.random() * sigilPool.length)];

    const newGear: GearItem = {
      id: `G_FORGED_${Date.now()}_${Math.floor(Math.random() * 999)}`,
      name: `${set} ${slot}`,
      slot,
      set,
      level: 0,
      failStackCount: 0,
      mainStatKey: mainKey,
      baseMainValue: mainKey === 'CRIT DMG%' ? 16 : mainKey === 'SPD' ? 6 : 10,
      baseFlatStat: slot === 'Weapon' ? 125 : slot === 'Armor' ? 880 : undefined,
      substats: [],
      equippedBy: selectedHeroId,
    };

    setGearInventory((prev) => {
      // Unequip existing item in same slot on selectedHeroId
      const unequipped = prev.map((it) =>
        it.equippedBy === selectedHeroId && it.slot === slot ? { ...it, equippedBy: undefined } : it
      );
      return [newGear, ...unequipped];
    });
    setSelectedGearId(newGear.id);
  };

  const handleSummonPull = (count: 1 | 10) => {
    const cost = count * 160;
    if (starlightGems < cost) return;
    setStarlightGems((s) => s - cost);
    sfx.play('gacha');

    const results: { name: string; rarity: string; note: string }[] = [];
    let curPity = gachaPity;
    const updatedProg = { ...heroProgress };

    for (let i = 0; i < count; i++) {
      curPity += 1;
      const isSSR = curPity >= 30 || Math.random() < 0.08;
      if (isSSR) {
        curPity = 0;
        const ssrPool = RESONATORS.filter((r) => r.rarity === 'SSR');
        const picked =
          activeBannerId === 'RATE_UP' && Math.random() < 0.65
            ? RESONATORS.find((r) => r.id === featuredBannerHeroId)!
            : ssrPool[Math.floor(Math.random() * ssrPool.length)];

        const p = updatedProg[picked.id];
        if (p.stars < 5) {
          updatedProg[picked.id] = { ...p, stars: p.stars + 1 };
          results.push({ name: picked.name, rarity: 'SSR', note: `Promoted to ${p.stars + 1}★!` });
        } else {
          updatedProg[picked.id] = { ...p, level: Math.min(100, p.level + 5) };
          results.push({ name: picked.name, rarity: 'SSR', note: 'Max 5★ Resonance (+5 Lv)' });
        }
      } else {
        const picked = RESONATORS[Math.floor(Math.random() * RESONATORS.length)];
        const p = updatedProg[picked.id];
        updatedProg[picked.id] = { ...p, level: Math.min(100, p.level + 2) };
        results.push({
          name: `${picked.name} Echo`,
          rarity: picked.rarity,
          note: '+2 Resonator Lv & +500 Gold',
        });
      }
    }

    setGold((g) => g + count * 500);
    setGachaPity(curPity);
    setHeroProgress(updatedProg);
    setRecentPulls(results);
  };

  const handleChronoRewind = () => {
    const shardMult = 1 + ((constellations['C_SHARDS'] || 0) * 12) / 100;
    const earned = Math.max(25, Math.round(floor * 28 * shardMult));
    setTimeShards((t) => t + earned);
    setFloor(1);
    setBlessings({ ARCANA_19: 1 });
    sfx.play('stagger');
    initFloorWave(1, false);
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
      <div className="relative w-screen h-screen bg-slate-950 overflow-hidden flex flex-col justify-between p-8 select-none">
        {/* Atmospheric Starfall Backdrop */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 32%, rgba(56, 189, 248, 0.16) 0%, rgba(147, 51, 234, 0.12) 38%, rgba(2, 6, 23, 0.98) 78%)',
          }}
        />

        {/* Top Bar Info */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400">
          <span>Chrono Spire: Starfall Protocol · Master Blueprint Build v2.1 (Pure TypeScript)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowV21Workbench(true)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-400/20 border border-amber-400/50 text-amber-200 hover:bg-amber-400/30 transition-colors cursor-pointer font-semibold"
            >
              SSOT v2.1 Systems Workbench
            </button>
            <button
              onClick={() => setShowWiki(true)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Official Game Wiki & Balance Sheets
            </button>
          </div>
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
            Command a 5-Resonator squad across 6 Continents (18 Day-1 Resonators), shatter the 5-bar Stagger Gauge of the cosmic Old Gods before the 60-second Berserk Corruption, and detonate 9 Elemental Reactions.
          </p>

          <div className="pt-2 flex items-center justify-center gap-4">
            <button
              onClick={() => setShellState('PLAYING')}
              className="px-8 py-3.5 text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-lg shadow-amber-500/20 transition-colors cursor-pointer"
            >
              Enter the Spire
            </button>
            <button
              onClick={() => setShowV21Workbench(true)}
              className="px-6 py-3.5 text-sm font-medium text-amber-200 bg-slate-900 border border-amber-400/50 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              v2.1 Systems Workbench
            </button>
            <button
              onClick={() => setShowWiki(true)}
              className="px-6 py-3.5 text-sm font-medium text-slate-200 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Inspect Balance Wiki
            </button>
          </div>
        </div>

        {/* Single Flat Control-Hint Line */}
        <div className="relative z-10 text-center text-xs text-slate-400 font-mono">
          Enter / Space Start · Click Boss Part Tap-to-Focus · 1–4 Switch Formation · Esc Pause
        </div>

        {showWiki && <WikiModal onClose={() => setShowWiki(false)} />}
        {showV21Workbench && <V21SystemsWorkbench onClose={() => setShowV21Workbench(false)} />}
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
      {/* STRICT 3-ZONE TOP BAR CONTRACT */}
      <header className="flex items-center justify-between gap-8 px-6 py-3 bg-slate-950 border-b border-slate-800 shrink-0">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('BATTLE');
          }}
          className="text-base font-bold tracking-wider text-amber-300 font-display whitespace-nowrap shrink-0"
        >
          Chrono Spire
        </a>

        {/* Zone 2: 5 Main Navigation Links */}
        <nav className="flex items-center gap-6 text-xs font-medium text-slate-400 overflow-x-auto">
          {(
            [
              { id: 'BATTLE', label: '1. Tower Battle' },
              { id: 'HEROES', label: '2. Heroes & Gambit' },
              { id: 'FORGE', label: '3. Equipment & Forge' },
              { id: 'SUMMON', label: '4. Summon' },
              { id: 'REWIND', label: '5. Chrono Rewind' },
            ] as { id: MainTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-1 transition-colors whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                activeTab === tab.id
                  ? 'text-amber-300 border-amber-400 font-semibold'
                  : 'text-slate-400 border-transparent hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setShowV21Workbench(true)}
            className="px-3 py-1.5 text-xs font-semibold text-amber-200 bg-slate-900 border border-amber-400/50 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            v2.1 Workbench
          </button>
          <button
            onClick={() => setShowWiki(true)}
            className="px-3.5 py-1.5 text-xs font-medium text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Game Wiki
          </button>
        </div>
      </header>

      {/* SUB-HEADER CURRENCY & FLOOR TELEMETRY STRIP */}
      <div className="flex items-center justify-between px-6 py-2 bg-slate-900/80 border-b border-slate-800/80 text-xs font-mono tabular-nums shrink-0">
        <div className="flex items-center gap-4 text-slate-300">
          <span>
            Spire Floor: <strong className="text-amber-300">F{floor}</strong> ({floor <= 20 ? 'Early Spire' : floor <= 50 ? 'Mid Spire' : floor <= 80 ? 'High Spire' : 'Abyss Spire'})
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Resonance: <strong className="text-sky-300 font-sans">{partyResonance.title}</strong>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>
            Gold: <strong className="text-amber-300">{gold.toLocaleString()}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Starlight: <strong className="text-sky-300">{starlightGems.toLocaleString()}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Time Shards: <strong className="text-purple-300">{timeShards.toLocaleString()}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <button
            onClick={() => {
              const next = !muted;
              setMuted(next);
              sfx.muted = next;
            }}
            className="text-slate-400 hover:text-slate-100 cursor-pointer whitespace-nowrap"
          >
            {muted ? 'Audio: Muted' : 'Audio: On'}
          </button>
          <button
            onClick={() => setShellState((s) => (s === 'PAUSED' ? 'PLAYING' : 'PAUSED'))}
            className="text-slate-400 hover:text-slate-100 cursor-pointer whitespace-nowrap"
          >
            {shellState === 'PAUSED' ? 'Resume' : 'Pause'}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT VIEWPORT */}
      <main className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {/* ============================================================
            TAB 1: TOWER BATTLE (HD-2D 5-HERO TACTICAL ARENA)
           ============================================================ */}
        {activeTab === 'BATTLE' && (
          <div className="flex-1 min-h-0 flex flex-col justify-between relative bg-slate-950">
            {/*Isolated 60FPS Canvas Stage */}
            <div className="relative flex-1 min-h-0 w-full overflow-hidden">
              <canvas
                ref={canvasRef}
                width={1040}
                height={430}
                onClick={handleCanvasClick}
                className="w-full h-full object-cover cursor-crosshair"
              />

              {/* Low-Occlusion Top Battlefield HUD Overlay (pointer-events-none wrapper) */}
              <div className="absolute inset-x-0 top-0 p-4 pointer-events-none flex items-start justify-between gap-6">
                {/* Left: Formation Switcher & Cut-In Controls */}
                <div className="pointer-events-auto bg-slate-950/85 border border-slate-800 rounded-lg p-2.5 space-y-2 max-w-xs">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-200">Formation (Lv.{formationLevel})</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCutInEnabled((v) => !v)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer border ${
                          cutInEnabled
                            ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        Cut-In: {cutInEnabled ? 'ON' : 'OFF'}
                      </button>
                      <button
                        onClick={() => setAutoUltimate((v) => !v)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer border ${
                          autoUltimate
                            ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        Auto-Ult: {autoUltimate ? 'ON' : 'OFF'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {FORMATIONS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFormationId(f.id)}
                        className={`px-2 py-1 text-[11px] text-left rounded transition-colors cursor-pointer whitespace-nowrap truncate ${
                          formationId === f.id
                            ? 'bg-amber-400 text-slate-950 font-semibold'
                            : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Center: Boss Main HP, 5-Bar Stagger Check Gauge & Berserk Countdown */}
                {(() => {
                  const mainBoss = hudState.bossParts.find((b) => b.id === 'BOSS_MAIN');
                  if (!mainBoss) return null;
                  const hpPct = Math.max(0, Math.min(100, (mainBoss.hp / mainBoss.maxHp) * 100));
                  const berserkRem = Math.max(0, 60 - hudState.waveElapsed);

                  return (
                    <div className="pointer-events-auto flex-1 max-w-xl bg-slate-950/90 border border-slate-800 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                        <span className="font-sans font-bold text-slate-100">
                          {mainBoss.name} · F{floor}
                        </span>
                        <span className={hudState.isBerserk ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {hudState.isBerserk
                            ? 'BERSERK PHASE ACTIVE (ATK +100% · SPD +50%)'
                            : `Berserk Corruption in ${berserkRem.toFixed(1)}s`}
                        </span>
                      </div>

                      {/* Boss HP Bar (Glows Gold when Staggered per Module 2.3) */}
                      <div className="relative h-4 bg-slate-900 rounded overflow-hidden border border-slate-700">
                        <div
                          className={`h-full transition-all duration-100 ${
                            hudState.isStaggered ? 'bg-amber-400 animate-pulse' : 'bg-rose-600'
                          }`}
                          style={{ width: `${hpPct}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-2 text-[11px] font-mono tabular-nums text-white">
                          <span>
                            HP: {mainBoss.hp.toLocaleString()} / {mainBoss.maxHp.toLocaleString()} ({hpPct.toFixed(0)}%)
                          </span>
                          {hudState.isStaggered && (
                            <span className="font-bold text-slate-950 bg-amber-300 px-1.5 rounded">
                              STAGGERED {hudState.staggerTimer.toFixed(1)}s (+50% DMG)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 5-Segment Stagger Check Gauge */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
                          <span>
                            5-Segment Stagger Gauge: {hudState.staggerSegments}/5 Bars ({hudState.currentSegmentBp}/{hudState.maxSegmentBp} BP)
                          </span>
                          {hudState.staggerWarningTimer > 0 && !hudState.isStaggered && (
                            <span className="text-amber-300 font-bold">
                              SUPERNOVA CAST: {hudState.staggerWarningTimer.toFixed(1)}s
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[0, 1, 2, 3, 4].map((barIdx) => {
                            const filledBars = hudState.staggerSegments;
                            let fillPct = 0;
                            if (barIdx < filledBars - 1) fillPct = 100;
                            else if (barIdx === filledBars - 1) {
                              fillPct = (hudState.currentSegmentBp / Math.max(1, hudState.maxSegmentBp)) * 100;
                            }
                            return (
                              <div key={barIdx} className="h-2 bg-slate-900 border border-slate-700 rounded overflow-hidden">
                                <div
                                  className="h-full bg-amber-400 transition-all duration-75"
                                  style={{ width: `${fillPct}%` }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Multi-Part Tap-to-Focus Selector Buttons */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[11px] text-slate-400">Tap-to-Focus:</span>
                        {hudState.bossParts.map((bp) => (
                          <button
                            key={bp.id}
                            disabled={!bp.alive}
                            onClick={() => {
                              simRef.current.manualFocusId =
                                simRef.current.manualFocusId === bp.id ? null : bp.id;
                            }}
                            className={`px-2 py-0.5 text-[11px] rounded font-mono transition-colors cursor-pointer ${
                              !bp.alive
                                ? 'bg-slate-900 text-slate-600 line-through cursor-not-allowed'
                                : hudState.manualFocusId === bp.id
                                ? 'bg-amber-400 text-slate-950 font-bold'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {bp.id === 'TENTACLE_FRONT'
                              ? 'Front Tentacle'
                              : bp.id === 'BOSS_MAIN'
                              ? 'Old God Core'
                              : 'Eye of Madness'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Right: Live Combat Reaction Log */}
                <div className="pointer-events-auto hidden xl:block w-72 bg-slate-950/85 border border-slate-800 rounded-lg p-2.5 text-[11px] font-mono space-y-1 max-h-36 overflow-y-auto">
                  <div className="text-slate-400 font-semibold mb-1">Tactical Combat Log</div>
                  {hudState.combatLog.slice(0, 5).map((entry, idx) => (
                    <div key={idx} className="text-slate-300 truncate">
                      {entry}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instant Cut-In Override Banner (Module 2.4) */}
              {cutInEnabled && hudState.cutIn && (
                <div
                  key={`${hudState.cutIn.heroId}_${hudState.cutIn.skillName}`}
                  className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 h-28 bg-slate-950/90 border-y-2 flex items-center justify-between px-12 overflow-hidden"
                  style={{ borderColor: hudState.cutIn.primaryColor }}
                >
                  <div className="space-y-1 z-10">
                    <div className="text-xs font-mono uppercase tracking-widest text-amber-300">
                      Ultimate Resonance Unleashed · {hudState.cutIn.element}
                    </div>
                    <div className="text-2xl font-bold text-white font-display tracking-wide">
                      {hudState.cutIn.heroName} — {hudState.cutIn.skillName}
                    </div>
                  </div>
                  <div className="w-44 h-44 -my-8 opacity-90">
                    <ResonatorSplashArt
                      hero={RESONATORS.find((r) => r.id === hudState.cutIn!.heroId) || RESONATORS[0]}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom 5-Hero Tactical Squad Card Dock */}
            <div className="bg-slate-900 border-t border-slate-800 px-6 py-3 shrink-0">
              <div className="grid grid-cols-5 gap-3 max-w-7xl mx-auto">
                {hudState.heroes.map((u) => {
                  const hpPct = Math.max(0, Math.min(100, (u.hp / u.maxHp) * 100));
                  const enPct = Math.max(0, Math.min(100, u.energy));
                  const elMeta = ELEMENT_META[u.data.element];

                  return (
                    <div
                      key={u.id}
                      onClick={() => triggerManualUltimate(u.id)}
                      className={`p-2.5 rounded-lg bg-slate-950 border transition-colors cursor-pointer ${
                        u.hp <= 0
                          ? 'border-rose-900/50 opacity-50'
                          : enPct >= 99
                          ? 'border-amber-400 shadow-sm shadow-amber-500/20'
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-100 truncate">{u.data.name}</div>
                          <div className="text-[11px] text-slate-400">
                            {u.data.element} · {u.stats.rowPosition} Row · {u.prog.stars}★
                          </div>
                        </div>
                        <span className={`text-[11px] font-mono ${elMeta.textClass}`}>Lv.{u.prog.level}</span>
                      </div>

                      {/* HP & Shield Bar */}
                      <div className="space-y-1 font-mono tabular-nums text-[11px]">
                        <div className="flex justify-between text-slate-300">
                          <span>HP</span>
                          <span>
                            {u.hp.toLocaleString()}
                            {u.shield > 0 ? ` (+${u.shield.toLocaleString()})` : ''}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-900 rounded overflow-hidden">
                          <div
                            className={`h-full ${hpPct > 35 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                            style={{ width: `${hpPct}%` }}
                          />
                        </div>

                        {/* Ultimate Energy Bar */}
                        <div className="flex justify-between text-slate-400 pt-0.5">
                          <span>ULT</span>
                          <span className="text-amber-300">{Math.floor(enPct)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-900 rounded overflow-hidden">
                          <div className="h-full bg-amber-400" style={{ width: `${enPct}%` }} />
                        </div>

                        {/* Skill Cooldowns */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span>Skill: {u.activeCd > 0 ? `${u.activeCd.toFixed(1)}s` : 'READY'}</span>
                          <span>Gambit: {u.chainCd > 0 ? `${u.chainCd.toFixed(1)}s` : 'ARMED'}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 2: HEROES & GAMBIT (ROSTER, 8+3 STATS, SKILLS & GAMBIT)
           ============================================================ */}
        {activeTab === 'HEROES' && (
          <div className="flex-1 min-h-0 grid grid-cols-12 gap-6 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
            {/* Left 4 Cols: 6 Continents Roster & Squad Selector */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-100">Resonator Roster (6 Continents)</h2>
                  <span className="text-xs font-mono text-slate-400">Party: {partyIds.length}/5</span>
                </div>

                <div className="space-y-2">
                  {RESONATORS.map((r) => {
                    const p = heroProgress[r.id];
                    const inParty = partyIds.includes(r.id);
                    const isSelected = selectedHeroId === r.id;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedHeroId(r.id)}
                        className={`p-3 rounded-lg border transition-colors cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-slate-800 border-amber-400/60'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-bold text-slate-100">
                            {r.name} <span className="text-amber-300 font-mono">{p.stars}★</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {r.rarity} · {r.element} · {r.role} · {r.regionName}
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (inParty) {
                              if (partyIds.length <= 1) return;
                              setPartyIds((ids) => ids.filter((id) => id !== r.id));
                            } else if (partyIds.length < 5) {
                              setPartyIds((ids) => [...ids, r.id]);
                            } else {
                              // Swap with the 5th slot
                              setPartyIds((ids) => [...ids.slice(0, 4), r.id]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                            inParty
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {inParty ? `Slot #${partyIds.indexOf(r.id) + 1}` : 'Deploy'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Formation Upgrade Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-100">
                    Tactical Formation Mastery (Lv.{formationLevel}/10)
                  </span>
                  <button
                    disabled={formationLevel >= 10 || gold < formationLevel * 600}
                    onClick={() => {
                      const cost = formationLevel * 600;
                      if (gold < cost || formationLevel >= 10) return;
                      setGold((g) => g - cost);
                      setFormationLevel((lv) => lv + 1);
                      sfx.play('forge_ok');
                    }}
                    className="px-3 py-1 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-semibold text-xs rounded cursor-pointer"
                  >
                    {formationLevel >= 10 ? 'MAX Lv.10' : `Upgrade (${formationLevel * 600}G)`}
                  </button>
                </div>
                <p className="text-xs text-slate-400">
                  Increases total Front Row DEF% and Back Row ATK% pool from 12% (Lv.1) up to 30% (Lv.10).
                </p>
              </div>
            </div>

            {/* Right 8 Cols: Selected Hero 8+3 Stats, Skills & 2-Slot Gambit */}
            <div className="col-span-12 lg:col-span-8 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
                  <div>
                    <div className="text-xs text-amber-300 font-medium">
                      {selectedHeroData.regionId} · {selectedHeroData.regionName} · {selectedHeroData.role}
                    </div>
                    <h2 className="text-xl font-bold text-white font-display">
                      {selectedHeroData.name} — {selectedHeroData.title}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedHeroData.regionLore}</p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <button
                      disabled={selectedHeroProg.level >= 100 || gold < selectedHeroProg.level * 120}
                      onClick={() => handleLevelUpHero(selectedHeroData.id, 5)}
                      className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-semibold text-xs rounded-lg cursor-pointer"
                    >
                      {selectedHeroProg.level >= 100
                        ? 'Lv.100 MAX'
                        : `Level Up +5 (${(selectedHeroProg.level * 120).toLocaleString()}G)`}
                    </button>
                    <button
                      disabled={
                        selectedHeroProg.stars >= 5 || starlightGems < (selectedHeroProg.stars - 1) * 400
                      }
                      onClick={() => handleAscendStar(selectedHeroData.id)}
                      className="px-3.5 py-2 bg-sky-400 hover:bg-sky-300 disabled:opacity-40 text-slate-950 font-semibold text-xs rounded-lg cursor-pointer"
                    >
                      {selectedHeroProg.stars >= 5
                        ? '5★ MAX'
                        : `Ascend ${selectedHeroProg.stars + 1}★ (${(selectedHeroProg.stars - 1) * 400} Gems)`}
                    </button>
                  </div>
                </div>

                {/* 8 Core + 3 Secondary Stats Grid */}
                <div>
                  <h3 className="text-xs font-semibold text-slate-300 mb-2.5">
                    8 Core + 3 Secondary Combat Attributes (Lv.{selectedHeroProg.level} · {selectedHeroProg.stars}★)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono tabular-nums text-xs">
                    {[
                      { k: '1. Max HP', v: selectedHeroStats.hp.toLocaleString() },
                      { k: '2. ATK', v: selectedHeroStats.atk.toLocaleString() },
                      { k: '3. DEF', v: selectedHeroStats.def.toLocaleString() },
                      { k: '4. SPD', v: `${selectedHeroStats.spd} (${(115 / selectedHeroStats.spd).toFixed(2)}s)` },
                      { k: '5. Crit Rate', v: `${selectedHeroStats.critRate}%` },
                      { k: '6. Crit DMG', v: `${selectedHeroStats.critDmg}%` },
                      { k: '7. Break Power', v: `${selectedHeroStats.breakPower}%` },
                      { k: '8. Energy Charge', v: `${selectedHeroStats.energyCharge}%` },
                      { k: '9. Effect Hit Rate', v: `${selectedHeroStats.effectHitRate}%` },
                      { k: '10. Effect RES', v: `${selectedHeroStats.effectRes}%` },
                      { k: '11. Healing Bonus', v: `${selectedHeroStats.healingBonus}%` },
                      {
                        k: 'Active Gear Sets',
                        v:
                          selectedHeroStats.activeSets.map((s) => `${s.set} (${s.count})`).join(', ') ||
                          'None',
                      },
                    ].map((st) => (
                      <div key={st.k} className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg">
                        <div className="text-[11px] text-slate-400 font-sans">{st.k}</div>
                        <div className="text-slate-100 font-semibold truncate">{st.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2-Slot Gambit AI Configuration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2">
                    <label className="block text-xs font-semibold text-amber-300">
                      Gambit Slot 1 (Emergency / Break / Shield Priority)
                    </label>
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
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                    >
                      <option value="BOSS_STAGGER_OPEN">When Boss Stagger Gauge is Open</option>
                      <option value="ALLY_HP_BELOW_50">When Any Ally HP Drops Below 50%</option>
                      <option value="BOSS_SHIELD_ACTIVE">When Boss Aegis Shield is Active</option>
                      <option value="ALWAYS_READY">Fire Immediately on Cooldown</option>
                    </select>
                  </div>

                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-lg space-y-2">
                    <label className="block text-xs font-semibold text-sky-300">
                      Gambit Slot 2 (Elemental Reaction Detonator)
                    </label>
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
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100"
                    >
                      <option value="TARGET_HAS_FREEZE">Target Affected by Freeze (MELTDOWN)</option>
                      <option value="TARGET_HAS_SHOCK">Target Affected by Shock (SUPERCONDUCT)</option>
                      <option value="TARGET_HAS_BURN">Target Affected by Burn (FIRESTORM)</option>
                      <option value="TARGET_HAS_LUMINOUS">Target Affected by Luminous Mark (TWILIGHT)</option>
                      <option value="ANY_DEBUFF">Target Has Any Elemental Debuff</option>
                    </select>
                  </div>
                </div>

                {/* 4+1 Skills & Star Passives Breakdown */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-semibold text-slate-300">
                    4+1 Skill Kit & Proc Chance Scaling (Lv.1 to Lv.10)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(['basic', 'active', 'chain', 'ultimate'] as const).map((skKey) => {
                      const sk = selectedHeroData.skills[skKey];
                      const lv = selectedHeroProg.skillLevels[skKey];
                      const mult = interpolateSkillMult(sk, lv);
                      const proc = interpolateSkillProc(sk, lv);

                      return (
                        <div key={skKey} className="p-3 bg-slate-950/80 border border-slate-800 rounded-lg space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-slate-100">{sk.name}</span>
                              <span className="text-[11px] text-slate-400 ml-2">
                                ({sk.type} · Lv.{lv}/10)
                              </span>
                            </div>
                            <button
                              disabled={lv >= 10 || gold < lv * 350}
                              onClick={() => handleUpgradeSkill(selectedHeroData.id, skKey)}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-amber-300 text-[11px] font-mono rounded cursor-pointer"
                            >
                              {lv >= 10 ? 'MAX' : `+Lv (${lv * 350}G)`}
                            </button>
                          </div>
                          <div className="text-[11px] font-mono text-emerald-400">
                            Multiplier: {mult}% ATK · Break: {sk.breakPower} BP
                            {sk.debuff ? ` · ${sk.debuff} Base Proc: ${proc}%` : ''}
                          </div>
                          <p className="text-[11px] text-slate-400">{sk.specialDesc}</p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Passive 3/4/5 Star Milestone Row */}
                  <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-xs">
                    <div className="font-semibold text-amber-300 mb-1">
                      Signature Passive: {selectedHeroData.passiveName}
                    </div>
                    <div className="flex flex-wrap gap-4 text-slate-300">
                      <span className={selectedHeroProg.stars >= 3 ? 'text-emerald-300' : 'text-slate-500'}>
                        3★: {selectedHeroData.passive3Star}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className={selectedHeroProg.stars >= 4 ? 'text-emerald-300' : 'text-slate-500'}>
                        4★: {selectedHeroData.passive4Star}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className={selectedHeroProg.stars >= 5 ? 'text-emerald-300' : 'text-slate-500'}>
                        5★: {selectedHeroData.passive5Star}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 3: EQUIPMENT & FORGE (+15 FAIL STACK PITY & 8 SETS)
           ============================================================ */}
        {activeTab === 'FORGE' && (
          <div className="flex-1 min-h-0 grid grid-cols-12 gap-6 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
            {/* Left 5 Cols: Equipped 5 Slots & Inventory */}
            <div className="col-span-12 lg:col-span-5 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-100">Resonator Gear Loadout (5 Slots)</h2>
                  <select
                    value={selectedHeroId}
                    onChange={(e) => setSelectedHeroId(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-100"
                  >
                    {RESONATORS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.element})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {ALL_GEAR_SLOTS.map((slot) => {
                    const item = gearInventory.find(
                      (g) => g.equippedBy === selectedHeroId && g.slot === slot
                    );
                    const isSelected = item && selectedGearId === item.id;
                    const mainVals = item ? getGearMainStatValue(item) : null;

                    return (
                      <div
                        key={slot}
                        onClick={() => item && setSelectedGearId(item.id)}
                        className={`p-3 rounded-lg border transition-colors cursor-pointer ${
                          slot === 'Core Sigil' ? 'col-span-2 ' : ''
                        }${
                          isSelected
                            ? 'bg-slate-800 border-amber-400'
                            : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>{slot === 'Core Sigil' ? 'Core Sigil (Exotic — Independent of Set)' : slot}</span>
                          {item && <span className="font-mono text-amber-300">+{item.level}</span>}
                        </div>
                        {item && mainVals ? (
                          <>
                            <div className="text-xs font-bold text-slate-100 truncate mt-0.5">
                              {item.name}
                            </div>
                            <div className="text-[11px] font-mono text-emerald-400">
                              {item.mainStatKey} +{mainVals.pct}%
                              {mainVals.flat > 0 ? ` (+${mainVals.flat})` : ''}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              Fail Stack: +{item.failStackCount} tries
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-slate-500 py-2">Empty Slot</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Forge New Canonical Set Piece */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-slate-200">
                  Craft Canonical Set Equipment (900 Gold — Auto-Equips to {selectedHeroData.name})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {EQUIPMENT_SETS.map((s) => (
                    <div
                      key={s.id}
                      className="p-2.5 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-100">{s.id}</span>
                        <span className="text-[11px] text-slate-400">{s.recommendedRole}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        2-PC: {s.twoPieceDesc} · 4-PC: {s.fourPieceDesc}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {ALL_GEAR_SLOTS.map((slot) => (
                          <button
                            key={slot}
                            disabled={gold < 900}
                            onClick={() => handleForgeNewRelic(s.id, slot)}
                            className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded cursor-pointer"
                          >
                            Forge {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right 7 Cols: Artisan's Pity (+0 to +15 Fail Stack Enhancer) */}
            <div className="col-span-12 lg:col-span-7 space-y-4">
              {selectedGear && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
                  <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                    <div>
                      <div className="text-xs text-amber-300 font-medium">
                        {selectedGear.set} Set · {selectedGear.slot}
                      </div>
                      <h2 className="text-xl font-bold text-white font-display">
                        {selectedGear.name} (+{selectedGear.level} / +15)
                      </h2>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      Equipped: {RESONATORS.find((r) => r.id === selectedGear.equippedBy)?.name || 'Unequipped'}
                    </span>
                  </div>

                  {/* Artisan's Pity Fail Stack Gauge */}
                  {selectedGear.level < 15 ? (
                    (() => {
                      const nextLv = selectedGear.level + 1;
                      const rule = getEnhanceRule(nextLv);
                      const currentRate = calculateCurrentSuccessRate(nextLv, selectedGear.failStackCount);
                      const bonusRate = Number((selectedGear.failStackCount * rule.failStackBonus).toFixed(1));
                      const cost = nextLv * 250;

                      return (
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                          <div className="flex items-center justify-between text-xs font-mono tabular-nums">
                            <span className="text-slate-300">
                              Target Step: <strong className="text-amber-300">+{selectedGear.level} → +{nextLv}</strong>
                            </span>
                            <span className="text-emerald-400 font-bold">
                              Total Success Chance: {currentRate}% (Base {rule.baseRate}% + Pity {bonusRate}%)
                            </span>
                          </div>

                          {/* Visual Fail Stack Progress Bar */}
                          <div className="h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 flex">
                            <div
                              className="h-full bg-emerald-500"
                              style={{ width: `${rule.baseRate}%` }}
                            />
                            <div
                              className="h-full bg-amber-400"
                              style={{ width: `${Math.min(100 - rule.baseRate, bonusRate)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                            <span>
                              Artisan&apos;s Pity Stacks: {selectedGear.failStackCount} fails (+{rule.failStackBonus}% / fail)
                            </span>
                            <span>100% Guarantee within {rule.maxAttemptsGuarantee} attempts</span>
                          </div>

                          <div className="pt-2 flex items-center gap-4">
                            <button
                              disabled={gold < cost}
                              onClick={() => handleEnhanceGear(selectedGear.id)}
                              className="px-6 py-2.5 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-semibold text-xs rounded-lg cursor-pointer"
                            >
                              Enhance to +{nextLv} ({cost.toLocaleString()} Gold)
                            </button>
                            {rule.milestoneDesc && (
                              <span className="text-xs text-sky-300 font-medium">
                                Milestone: {rule.milestoneDesc}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 font-semibold">
                      MASTERWORK +15 ACHIEVED — Maximum 4.00x Main Stat Multiplier & Masterwork Substat Unlocked!
                    </div>
                  )}

                  {forgeFeedback && (
                    <div
                      className={`p-3 rounded-lg text-xs font-mono ${
                        forgeFeedback.success
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
                      }`}
                    >
                      {forgeFeedback.text}
                    </div>
                  )}

                  {/* Main Stat & 4 Substat Milestones */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-slate-300">
                      Main Attribute & Substat Milestones (+3 / +6 / +9 / +12 / +15 Masterwork)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
                      {selectedGear.substats.map((sub, i) => (
                        <div
                          key={i}
                          className={`p-2.5 rounded-lg border ${
                            sub.isMasterwork
                              ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                              : 'bg-slate-950 border-slate-800 text-slate-200'
                          }`}
                        >
                          Line {i + 1}: {sub.stat} +{sub.value}% {sub.isMasterwork ? '★ MASTERWORK' : ''}
                        </div>
                      ))}
                      {Array.from({ length: Math.max(0, 4 - selectedGear.substats.length) }).map((_, idx) => {
                        const unlockLv = (selectedGear.substats.length + idx + 1) * 3;
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/60 text-slate-500"
                          >
                            Locked Substat — Unlocks at +{unlockLv}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 4: SUMMON (NON-OVERLAPPING 3-ZONE GACHA SHOWCASE)
           ============================================================ */}
        {activeTab === 'SUMMON' && (
          <div className="flex-1 min-h-0 grid grid-cols-12 gap-6 p-6 overflow-y-auto max-w-7xl mx-auto w-full">
            {/* ZONE 1 (LEFT 3 COLS): BANNER SELECTOR & RATE-UP ROSTER */}
            <div className="col-span-12 lg:col-span-3 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                <h2 className="text-sm font-bold text-slate-100">Zone 1 · Summon Banners</h2>
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveBannerId('RATE_UP')}
                    className={`w-full p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      activeBannerId === 'RATE_UP'
                        ? 'bg-amber-500/15 border-amber-400 text-amber-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">Starfall Sovereign Rate-Up</div>
                    <div className="text-[11px] text-slate-400">65% Featured SSR Focus · 30-Pull Pity</div>
                  </button>

                  <button
                    onClick={() => setActiveBannerId('STANDARD')}
                    className={`w-full p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                      activeBannerId === 'STANDARD'
                        ? 'bg-sky-500/15 border-sky-400 text-sky-200'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">Six Continents Standard</div>
                    <div className="text-[11px] text-slate-400">All 6 Resonators Equal Weight</div>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-800 space-y-1.5">
                  <div className="text-xs font-semibold text-slate-300">Select Featured Rate-Up Hero:</div>
                  {RESONATORS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setFeaturedBannerHeroId(r.id)}
                      className={`w-full px-2.5 py-1.5 rounded text-xs text-left flex items-center justify-between cursor-pointer ${
                        featuredBannerHeroId === r.id
                          ? 'bg-slate-800 text-amber-300 font-semibold'
                          : 'text-slate-400 hover:bg-slate-950'
                      }`}
                    >
                      <span>{r.name}</span>
                      <span className="font-mono text-[11px]">{r.rarity} · {r.element}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ZONE 2 (CENTER 5 COLS): FULL-BODY SPLASH ART SHOWCASE */}
            <div className="col-span-12 lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-amber-300 font-medium">
                    {featuredBannerHero.rarity} · {featuredBannerHero.element} · {featuredBannerHero.regionName}
                  </div>
                  <h2 className="text-xl font-bold text-white font-display">{featuredBannerHero.name}</h2>
                  <p className="text-xs text-slate-400">{featuredBannerHero.title}</p>
                </div>
                <span className="text-xs font-mono text-slate-300">
                  Current: {heroProgress[featuredBannerHero.id].stars}★
                </span>
              </div>

              <div className="h-72 my-2">
                <ResonatorSplashArt hero={featuredBannerHero} />
              </div>

              <div className="space-y-3 border-t border-slate-800 pt-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">SSR Guarantee Pity:</span>
                  <span className="text-amber-300 font-bold">{gachaPity} / 30 Pulls</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={starlightGems < 160}
                    onClick={() => handleSummonPull(1)}
                    className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-100 font-semibold text-xs rounded-lg cursor-pointer"
                  >
                    Summon 1x (160 Gems)
                  </button>
                  <button
                    disabled={starlightGems < 1600}
                    onClick={() => handleSummonPull(10)}
                    className="py-2.5 px-4 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 font-semibold text-xs rounded-lg cursor-pointer"
                  >
                    Summon 10x (1,600 Gems)
                  </button>
                </div>
              </div>
            </div>

            {/* ZONE 3 (RIGHT 4 COLS): IN-COMBAT PIXEL 2D PREVIEW & PULL RESULTS */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 text-center">
                <div className="text-xs font-bold text-slate-200">
                  Zone 3 · In-Combat HD-2D Pixel Preview
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg py-2">
                  <PixelPreviewCanvas hero={featuredBannerHero} />
                </div>
                <div className="text-[11px] text-slate-400">
                  5★ Bonus: <strong className="text-amber-300">{featuredBannerHero.star5BonusDesc}</strong>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="text-xs font-bold text-slate-200">Recent Summon Telemetry</div>
                {recentPulls.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    No pulls recorded this session. Spend Starlight Gems to summon Resonators.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs font-mono">
                    {recentPulls.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between"
                      >
                        <span className={p.rarity === 'SSR' ? 'text-amber-300 font-bold' : 'text-slate-200'}>
                          [{p.rarity}] {p.name}
                        </span>
                        <span className="text-emerald-400 text-[11px]">{p.note}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            TAB 5: CHRONO REWIND (PRESTIGE & PERMANENT CONSTELLATION)
           ============================================================ */}
        {activeTab === 'REWIND' && (
          <div className="flex-1 min-h-0 p-6 overflow-y-auto max-w-6xl mx-auto w-full space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-wrap items-center justify-between gap-6">
              <div className="space-y-1 max-w-2xl">
                <div className="text-xs text-purple-300 font-medium">
                  Module 5 · Persistent Roguelite Progression
                </div>
                <h2 className="text-2xl font-bold text-white font-display">
                  Chrono Rewind Protocol — Astral Constellations
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  When the Old Gods&apos; Mental Corruption overwhelms your squad, activate Chrono Rewind to return to Floor 1 while crystallizing your timeline into permanent Time Shards. All Resonator levels, stars, and +15 Equipment persist across rewinds.
                </p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-xs font-mono text-slate-300">
                  Highest Spire Floor: <strong className="text-amber-300">F{highestFloor}</strong> · Claimable:{' '}
                  <strong className="text-purple-300">
                    +{Math.max(25, Math.round(floor * 28 * (1 + ((constellations['C_SHARDS'] || 0) * 12) / 100)))} Time Shards
                  </strong>
                </div>
                <button
                  onClick={handleChronoRewind}
                  className="px-6 py-3 bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                >
                  Trigger Chrono Rewind Now
                </button>
              </div>
            </div>

            {/* 6 Constellation Nodes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {CONSTELLATION_NODES.map((node) => {
                const lv = constellations[node.id] || 0;
                const cost = node.baseCost * (lv + 1);
                return (
                  <div
                    key={node.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-100">{node.name}</span>
                        <span className="text-xs font-mono text-purple-300">
                          Lv.{lv}/{node.maxLevel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{node.desc}</p>
                      <div className="text-xs font-mono text-emerald-400 mt-2">
                        Current Bonus: +{(lv * node.perLevelVal).toFixed(1)}
                        {node.unit}
                      </div>
                    </div>

                    <button
                      disabled={lv >= node.maxLevel || timeShards < cost}
                      onClick={() => {
                        if (lv >= node.maxLevel || timeShards < cost) return;
                        setTimeShards((t) => t - cost);
                        setConstellations((prev) => ({ ...prev, [node.id]: lv + 1 }));
                        sfx.play('forge_ok');
                      }}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-purple-200 font-semibold text-xs rounded-lg cursor-pointer"
                    >
                      {lv >= node.maxLevel ? 'MAX CONSTELLATION' : `Unlock Star (${cost} Shards)`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ROGUELITE TAROT BLESSING MODAL (EVERY 5 FLOORS) */}
      {blessingChoices && (
        <div className="fixed inset-0 z-40 bg-slate-950/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="text-xs font-mono text-amber-300">
                Floor Milestone Reached · Tarot Blessing Sanctuary
              </div>
              <h2 className="text-xl font-bold text-white font-display">
                Select 1 Roguelite Spire Blessing (Upgrades Tier I → II → III)
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {blessingChoices.map((card) => {
                const curTier = blessings[card.id] || 0;
                const nextTier = Math.min(3, curTier + 1);
                return (
                  <div
                    key={card.id}
                    onClick={() => {
                      setBlessings((prev) => ({ ...prev, [card.id]: nextTier }));
                      setBlessingChoices(null);
                      sfx.play('gacha');
                    }}
                    className="p-4 bg-slate-950 border border-slate-800 hover:border-amber-400 rounded-xl flex flex-col justify-between cursor-pointer transition-colors space-y-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-amber-300">{card.id}</span>
                        <span className="text-slate-400">
                          {card.rarity} · Tier {nextTier}/3
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white font-display">{card.name}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">{card.desc}</p>
                    </div>
                    <div className="py-1.5 text-center bg-amber-400/15 text-amber-300 text-xs font-semibold rounded">
                      Select Tarot Blessing
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PAUSE / GAME OVER MODAL */}
      {(shellState === 'PAUSED' || shellState === 'GAME_OVER') && (
        <div className="fixed inset-0 z-40 bg-slate-950/85 flex items-center justify-center p-4">
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
                      initFloorWave(floor, false);
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

      {showWiki && <WikiModal onClose={() => setShowWiki(false)} />}
      {showV21Workbench && <V21SystemsWorkbench onClose={() => setShowV21Workbench(false)} />}
    </div>
  );
}

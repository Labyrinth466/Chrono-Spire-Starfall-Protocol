import React, { useMemo, useState } from 'react';
import {
  FormationRatioId,
  SYSTEM_CONSTANTS,
  TACTICAL_FORMATIONS,
  MAJOR_ARCANA_TAROT,
  getFormationBonuses,
} from '../config/constants.ts';
import { RESONATORS_V21 } from '../data/resonators.ts';
import {
  EQUIPMENT_SLOTS,
  UNIVERSAL_RING_MAIN_STAT_POOL,
  EXOTIC_SIGIL_MAIN_STATS,
  SIGIL_CORE_TRAITS,
  GEAR_DOMAINS,
  SubstatLine,
  attemptGearEnhancement,
  getEffectiveEnhanceSuccessRate,
} from '../data/equipment.ts';
import { GRAND_CONSTELLATIONS, aggregateConstellationBonuses } from '../data/constellations.ts';
import { ChronoCombatEngine } from '../engine/combatEngine.ts';
import { StarfallGachaEngine, STARFALL_EXCHANGE_CATALOG } from '../engine/gachaEngine.ts';

export const V21SystemsWorkbench: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [subTab, setSubTab] = useState<'ROSTER_18' | 'DEPLOY_LOCK' | 'EQUIP_5SLOT' | 'CONSTELLATIONS_40' | 'WISHLIST_SHOP'>('ROSTER_18');

  // 1. Pre-Battle Deployment & Combat Lock Interactive State
  const [combatMode, setCombatMode] = useState<'SPIRE' | 'GUILD_RAID'>('SPIRE');
  const [deployFormation, setDeployFormation] = useState<FormationRatioId>('2-3');
  const [deployParty, setDeployParty] = useState<string[]>(['H04', 'H01', 'H10', 'H07', 'H13']);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockMessage, setLockMessage] = useState<string>('PRE_BATTLE_DEPLOYMENT: Drag/Swap slots & select formation before locking.');
  const [reactionLog, setReactionLog] = useState<string[]>([]);

  const engineInstance = useMemo(() => {
    const eng = new ChronoCombatEngine({
      mode: combatMode,
      floor: 25,
      formationId: deployFormation,
      formationLevel: 5,
      partyHeroIds: deployParty,
      unlockedConstellations: ['SD_01', 'SD_10', 'TB_10', 'AN_10', 'CH_10'],
    });
    if (isLocked) eng.startCombatAndLockFormation();
    return eng;
  }, [combatMode, deployFormation, deployParty, isLocked]);

  // 2. 5-Slot Equipment Interactive State (Ring I & Ring II Universal Pool + Exotic Core Sigil)
  const [ring1Stat, setRing1Stat] = useState<string>('Crit DMG%');
  const [ring2Stat, setRing2Stat] = useState<string>('Crit DMG%'); // Double stack demonstration!
  const [sigilTraitId, setSigilTraitId] = useState<string>('TRAIT_AEGIS_PULSE');
  const [weeklyKeys, setWeeklyKeys] = useState<number>(SYSTEM_CONSTANTS.WEEKLY_DOMAIN_KEYS);
  const [sampleWeapon, setSampleWeapon] = useState<{
    name: string;
    slot: typeof EQUIPMENT_SLOTS.WEAPON;
    level: number;
    failStackCount: number;
    substats: SubstatLine[];
  }>({
    name: 'Starfall Executioner Greatsword',
    slot: EQUIPMENT_SLOTS.WEAPON,
    level: 6,
    failStackCount: 1,
    substats: [
      { stat: 'CRIT RATE%', value: 3.6, minRoll: 2.5, maxRoll: 3.8, isMasterwork: false },
      { stat: 'CRIT DMG%', value: 7.2, minRoll: 5.0, maxRoll: 7.6, isMasterwork: false },
    ],
  });
  const [enhanceMsg, setEnhanceMsg] = useState<string>('');

  // 3. 4 Grand Constellations (40 Nodes) State
  const [unlockedNodes, setUnlockedNodes] = useState<string[]>([
    'SD_01', 'SD_02', 'SD_08', 'SD_10',
    'TB_01', 'TB_08', 'TB_10',
    'AN_01', 'AN_09', 'AN_10',
    'CH_01', 'CH_08', 'CH_10',
  ]);
  const constTotals = useMemo(() => aggregateConstellationBonuses(unlockedNodes), [unlockedNodes]);

  // 4. Gacha Wishlist (5 SSRs = 70%) & Starfall Exchange Shop State
  const [wishlist, setWishlist] = useState<string[]>(['H01', 'H04', 'H07', 'H10', 'H13']);
  const [starfallShards, setStarfallShards] = useState<number>(85);
  const [gachaPity, setGachaPity] = useState<number>(15);
  const [gachaHistory, setGachaHistory] = useState<
    { id: string; name: string; rarity: string; fromWishlist: boolean }[]
  >([]);
  const [shopLog, setShopLog] = useState<string>('');

  const handleTestReaction = (setupDebuff: string, triggerEl: string) => {
    engineInstance.boss.debuffs = [{ type: setupDebuff, element: 'Setup', remaining: 4.0, stacks: 3 }];
    const res = engineInstance.resolveElementalReaction(triggerEl, 2400);
    if (res) {
      setReactionLog((prev) => [
        `[${res.reactionId}] Setup: ${setupDebuff} + Trigger: ${triggerEl} -> Mult: ${res.dmgMultiplier}x (Remaining Boss Debuffs: ${engineInstance.boss.debuffs.map((d: { type: string; remaining: number }) => `${d.type} ${d.remaining}s`).join(', ') || 'CONSUMED'})`,
        ...prev.slice(0, 7),
      ]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-7xl w-full h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div>
            <div className="text-xs font-mono text-amber-300">
              SSOT v2.1 Engine Architecture · 6 Production ES Modules Active
            </div>
            <h2 className="text-lg font-bold text-white font-display">
              Chrono Spire: Starfall Protocol — v2.1 Major Overhaul Systems
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {(
              [
                { id: 'ROSTER_18', label: '1. 18 Resonators' },
                { id: 'DEPLOY_LOCK', label: '2. Combat Lock & 9 Reactions' },
                { id: 'EQUIP_5SLOT', label: '3. 5-Slot Gear & Domains' },
                { id: 'CONSTELLATIONS_40', label: '4. 40 Constellation Nodes' },
                { id: 'WISHLIST_SHOP', label: '5. Wishlist (70%) & Mileage Shop' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  subTab === t.id
                    ? 'bg-amber-400 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}

            <button
              onClick={onClose}
              className="ml-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg cursor-pointer"
            >
              Return to Battle
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 text-xs text-slate-200 space-y-6">
          {/* 1. 18 DAY-1 RESONATORS (12 SSR + 6 SR) */}
          {subTab === 'ROSTER_18' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-300">
                  Module 1.2 · Complete Day-1 Roster: 18 Resonators (12 SSR + 6 SR across 6 Continents & 6 Elements)
                </h3>
                <span className="font-mono text-slate-400">Source: src/data/resonators.ts</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {RESONATORS_V21.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">
                        {r.id} · {r.name}
                      </span>
                      <span
                        className={`font-mono font-bold ${
                          r.rarity === 'SSR' ? 'text-amber-300' : 'text-sky-300'
                        }`}
                      >
                        {r.rarity} · {r.element}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {r.region} · {r.role} · Rec: {r.recommendedRow}
                    </div>
                    <p className="text-[11px] text-slate-300">{r.highlight}</p>
                    <div className="font-mono text-[11px] text-emerald-400 pt-1 border-t border-slate-800/80">
                      Lv.100 HP: {r.baseStats.hpLv100.toLocaleString()} · ATK: {r.baseStats.atkLv100.toLocaleString()} · DEF: {r.baseStats.defLv100.toLocaleString()} · SPD: {r.baseStats.spd}
                    </div>
                    <div className="text-[10px] text-slate-400 space-y-0.5">
                      {r.gambitPresets.map((g) => (
                        <div key={g.slot}>
                          Gambit {g.slot} [{g.condition}]: <span className="text-slate-200">{g.action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. PRE-BATTLE DEPLOYMENT LOCK, 9 REACTIONS & 90S GUILD RAID */}
          {subTab === 'DEPLOY_LOCK' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-300">
                    Module 6.3 · Pre-Battle Deployment & Permanent Combat Lock
                  </h3>
                  <span className="font-mono text-slate-400">src/engine/combatEngine.ts</span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (isLocked) {
                        setLockMessage('ERROR: COMBAT_LOCK_ACTIVE — Cannot change mode or formation mid-battle!');
                        return;
                      }
                      setCombatMode((m) => (m === 'SPIRE' ? 'GUILD_RAID' : 'SPIRE'));
                    }}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-xs font-mono cursor-pointer"
                  >
                    Mode: {combatMode} ({combatMode === 'GUILD_RAID' ? '90s Infinite HP Boss' : '60s Berserk Timer'})
                  </button>

                  {Object.values(TACTICAL_FORMATIONS).map((f) => (
                    <button
                      key={f.ratioId}
                      onClick={() => {
                        if (isLocked) {
                          setLockMessage('BLOCKED BY COMBAT LOCK: Formation cannot be switched once battle begins!');
                          return;
                        }
                        setDeployFormation(f.ratioId);
                        setLockMessage(`Formation updated to ${f.name} in Pre-Battle Deployment.`);
                      }}
                      className={`px-2.5 py-1.5 rounded text-xs font-mono cursor-pointer ${
                        deployFormation === f.ratioId
                          ? 'bg-amber-400 text-slate-950 font-bold'
                          : 'bg-slate-900 border border-slate-700 text-slate-300'
                      }`}
                    >
                      {f.ratioId}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-slate-400">
                    Click two slots to swap hero Front/Back row order (Blocked when Combat Lock is active):
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {deployParty.map((hid, idx) => {
                      const h = RESONATORS_V21.find((r) => r.id === hid)!;
                      const fb = getFormationBonuses(deployFormation, 5);
                      const isFront = idx < fb.frontCount;
                      return (
                        <button
                          key={hid}
                          onClick={() => {
                            if (isLocked) {
                              setLockMessage('BLOCKED BY COMBAT LOCK: Unit positions are locked during battle!');
                              return;
                            }
                            const nextIdx = (idx + 1) % 5;
                            const copy = [...deployParty];
                            const tmp = copy[idx];
                            copy[idx] = copy[nextIdx];
                            copy[nextIdx] = tmp;
                            setDeployParty(copy);
                            setLockMessage(`Swapped Slot #${idx + 1} with Slot #${nextIdx + 1}.`);
                          }}
                          className={`p-2.5 rounded-lg border text-left cursor-pointer ${
                            isFront
                              ? 'bg-sky-500/10 border-sky-500/40'
                              : 'bg-amber-500/10 border-amber-500/40'
                          }`}
                        >
                          <div className="font-mono text-[10px] text-slate-400">
                            Slot #{idx + 1} · {isFront ? 'FRONT' : 'BACK'}
                          </div>
                          <div className="font-bold text-slate-100 truncate">{h.name}</div>
                          <div className="text-[10px] text-emerald-400 font-mono">
                            {isFront ? `+${fb.frontDefPctPerHero}% DEF` : `+${fb.backAtkPctPerHero}% ATK`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => {
                      const next = !isLocked;
                      setIsLocked(next);
                      setLockMessage(
                        next
                          ? 'COMBAT STARTED & FORMATION LOCKED PERMANENTLY FOR THIS BATTLE!'
                          : 'Returned to Pre-Battle Deployment (Unlocked).'
                      );
                    }}
                    className={`px-5 py-2.5 rounded-lg font-bold text-xs cursor-pointer ${
                      isLocked
                        ? 'bg-rose-500 text-white'
                        : 'bg-emerald-400 text-slate-950'
                    }`}
                  >
                    {isLocked ? 'Locked in Combat (Click to Reset Battle)' : 'Start Battle & Lock Formation'}
                  </button>
                </div>

                <div className="p-3 rounded bg-slate-900 border border-slate-800 font-mono text-xs text-amber-300">
                  {lockMessage}
                </div>
              </div>

              {/* Complete 9-Reaction Elemental Matrix Tester */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-amber-300">
                  Module 4 · Complete 9-Reaction Elemental Matrix (Live Simulator)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { label: 'Cryo -> Fire: MELTDOWN', setup: 'Freeze', trig: 'Fire' },
                    { label: 'Electro -> Cryo: SUPERCONDUCT', setup: 'Shock', trig: 'Cryo' },
                    { label: 'Fire -> Wind: FIRESTORM', setup: 'Burn', trig: 'Wind' },
                    { label: 'Fire -> Electro: OVERLOAD PLASMA', setup: 'Burn', trig: 'Electro' },
                    { label: 'Cryo -> Wind: BLIZZARD', setup: 'Freeze', trig: 'Wind' },
                    { label: 'Electro -> Wind: THUNDER GALE', setup: 'Shock', trig: 'Wind' },
                    { label: 'Light -> Dark: TWILIGHT EXECUTION', setup: 'Luminous Mark', trig: 'Dark' },
                    { label: 'Burn -> Light: RADIANT INFUSION', setup: 'Burn', trig: 'Light' },
                    { label: 'Burn -> Dark: ABYSSAL DECAY (+2s)', setup: 'Burn', trig: 'Dark' },
                  ].map((rx) => (
                    <button
                      key={rx.label}
                      onClick={() => handleTestReaction(rx.setup, rx.trig)}
                      className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-left font-mono text-[11px] text-slate-200 cursor-pointer"
                    >
                      ▶ {rx.label}
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1 font-mono text-[11px] max-h-40 overflow-y-auto">
                  <div className="text-slate-400 font-bold">Reaction Execution Output:</div>
                  {reactionLog.length === 0 ? (
                    <div className="text-slate-500">Click any reaction pair above to test engine calculation.</div>
                  ) : (
                    reactionLog.map((l, i) => (
                      <div key={i} className="text-emerald-300">
                        {l}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. 5-SLOT EQUIPMENT, SHARED UNIVERSAL RING POOL, EXOTIC SIGIL & WEEKLY DOMAINS */}
          {subTab === 'EQUIP_5SLOT' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-amber-300">
                  Module 3.1 · 5-Slot Equipment (Universal Ring I & II + Exotic Core Sigil)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="font-bold text-slate-100">Slot 3: Ring I (Universal Pool)</div>
                    <select
                      value={ring1Stat}
                      onChange={(e) => setRing1Stat(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs"
                    >
                      {UNIVERSAL_RING_MAIN_STAT_POOL.map((s) => (
                        <option key={s.stat} value={s.stat}>
                          {s.stat} (Base +{s.baseValue})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="font-bold text-slate-100">Slot 4: Ring II (Universal Pool)</div>
                    <select
                      value={ring2Stat}
                      onChange={(e) => setRing2Stat(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs"
                    >
                      {UNIVERSAL_RING_MAIN_STAT_POOL.map((s) => (
                        <option key={s.stat} value={s.stat}>
                          {s.stat} (Base +{s.baseValue})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {ring1Stat === ring2Stat && (
                  <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/40 rounded-lg text-emerald-300 font-mono text-xs">
                    DOUBLE STACK ACTIVE: Both Ring I & Ring II are stacking [{ring1Stat}]!
                  </div>
                )}

                {/* Slot 5: Exotic Core Sigil */}
                <div className="p-3.5 bg-purple-950/30 border border-purple-500/40 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-200">
                      Slot 5: Core Sigil (Exotic Artifact — Independent of Set Bonus)
                    </span>
                    <span className="font-mono text-amber-300">Main: {EXOTIC_SIGIL_MAIN_STATS[0].stat}</span>
                  </div>
                  <select
                    value={sigilTraitId}
                    onChange={(e) => setSigilTraitId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-100"
                  >
                    {SIGIL_CORE_TRAITS.map((t) => (
                      <option key={t.id} value={t.id}>
                        Sigil Core Trait: {t.name} — {t.desc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Substat RNG Min-Max Table & +15 Fail Stack Tester */}
                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-100">
                      {sampleWeapon.name} (+{sampleWeapon.level}/15 · Fail Stack: {sampleWeapon.failStackCount})
                    </span>
                    <button
                      onClick={() => {
                        const res = attemptGearEnhancement(sampleWeapon, false);
                        setSampleWeapon(res.item);
                        setEnhanceMsg(res.message);
                      }}
                      className="px-3 py-1 bg-amber-400 text-slate-950 font-bold rounded cursor-pointer"
                    >
                      Enhance (Chance: {getEffectiveEnhanceSuccessRate(sampleWeapon.level + 1, sampleWeapon.failStackCount)}%)
                    </button>
                  </div>
                  {enhanceMsg && <div className="font-mono text-[11px] text-amber-300">{enhanceMsg}</div>}
                  <div className="space-y-1 font-mono text-[11px]">
                    {sampleWeapon.substats.map((s, i) => (
                      <div key={i} className="text-slate-300">
                        Substat {i + 1}: {s.stat} +{s.value} (RNG Range: {s.minRoll}–{s.maxRoll}){' '}
                        {s.isMasterwork ? '★ MASTERWORK' : ''}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3 Weekly Key Gear Domains with Instant Sweep */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-300">
                    Module 3.4 · 3 Gear Domains & Weekly Keys (Anti-FOMO Sweep)
                  </h3>
                  <span className="font-mono text-emerald-400">
                    Weekly Keys: {weeklyKeys} / {SYSTEM_CONSTANTS.WEEKLY_DOMAIN_KEYS} (Resets Monday 04:00)
                  </span>
                </div>

                <div className="space-y-3">
                  {GEAR_DOMAINS.map((dom) => (
                    <div
                      key={dom.id}
                      className="p-3.5 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-100">{dom.name}</div>
                        <div className="text-[11px] text-amber-300 font-mono">
                          Drops: {dom.dropsSets.join(' · ')}
                        </div>
                        <div className="text-[11px] text-slate-400">{dom.desc}</div>
                      </div>
                      <button
                        disabled={weeklyKeys <= 0}
                        onClick={() => setWeeklyKeys((k) => Math.max(0, k - 1))}
                        className="px-3.5 py-2 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-slate-950 font-bold rounded-lg shrink-0 cursor-pointer"
                      >
                        Instant Sweep (-1 Key)
                      </button>
                    </div>
                  ))}
                </div>

                {/* 22 Public Domain Major Arcana Tarot Preview */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="font-bold text-slate-200 mb-2">
                    Module 7 · 22 Major Arcana Tarot Blessings (100% Public Domain)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1 text-[11px]">
                    {MAJOR_ARCANA_TAROT.map((c) => (
                      <div key={c.id} className="p-2 bg-slate-900 border border-slate-800 rounded">
                        <strong className="text-amber-300">
                          {c.number}. {c.name}:
                        </strong>{' '}
                        <span className="text-slate-400">{c.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 4. 4 GRAND CONSTELLATIONS (40 NODES) */}
          {subTab === 'CONSTELLATIONS_40' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <div>
                  <h3 className="text-sm font-bold text-amber-300">
                    Module 5 · 4 Grand Constellations (40 Total Nodes: 7 Hybrid Minor + 2 Major + 1 Keystone Core each)
                  </h3>
                  <div className="text-[11px] text-slate-400 font-mono mt-1">
                    Active Keystones: {constTotals.keystones.join(' · ') || 'None'}
                  </div>
                </div>
                <div className="font-mono text-xs text-emerald-400">
                  Unlocked Nodes: {unlockedNodes.length} / 40
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {GRAND_CONSTELLATIONS.map((group) => (
                  <div
                    key={group.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div>
                        <div className="font-bold text-sm text-white">{group.name}</div>
                        <div className="text-[11px] text-slate-400">{group.theme}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {group.nodes.map((node) => {
                        const isUnlocked = unlockedNodes.includes(node.id);
                        return (
                          <div
                            key={node.id}
                            onClick={() => {
                              setUnlockedNodes((prev) =>
                                prev.includes(node.id)
                                  ? prev.filter((id) => id !== node.id)
                                  : [...prev, node.id]
                              );
                            }}
                            className={`p-2.5 rounded-lg border cursor-pointer transition-colors ${
                              node.tier === 'Keystone'
                                ? 'sm:col-span-2 bg-amber-500/10 border-amber-400/60'
                                : isUnlocked
                                ? 'bg-slate-900 border-emerald-500/50'
                                : 'bg-slate-900/40 border-slate-800 opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[11px] font-mono">
                              <span className="font-bold text-slate-100">
                                Node {node.index} ({node.tier}): {node.name}
                              </span>
                              <span className={isUnlocked ? 'text-emerald-400' : 'text-slate-500'}>
                                {isUnlocked ? 'ACTIVE' : `${node.shardCost} Shards`}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300 mt-0.5">{node.desc}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 5. 5-HERO WISHLIST GACHA (70% RATE LOCK) & STARFALL EXCHANGE SHOP */}
          {subTab === 'WISHLIST_SHOP' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-300">
                    Module 2.1 · 5-Resonator Squad Wishlist (70% SSR Rate Lock = 14% Each)
                  </h3>
                  <span className="font-mono text-slate-400">src/engine/gachaEngine.ts</span>
                </div>

                <p className="text-xs text-slate-400">
                  Select exactly 5 SSR Resonators for your Standard Banner Wishlist. Whenever an SSR drops, there is a locked 70% chance it is one of your 5 chosen squad members:
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {RESONATORS_V21.filter((r) => r.rarity === 'SSR').map((ssr) => {
                    const inWish = wishlist.includes(ssr.id);
                    return (
                      <button
                        key={ssr.id}
                        onClick={() => {
                          if (inWish) return;
                          setWishlist((prev) => [...prev.slice(1), ssr.id]);
                        }}
                        className={`p-2 rounded border text-left cursor-pointer ${
                          inWish
                            ? 'bg-amber-400/20 border-amber-400 text-amber-200 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="truncate">{ssr.name}</div>
                        <div className="text-[10px] font-mono">
                          {ssr.element} · {inWish ? '14% SSR Share' : 'Off-Wishlist'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="font-mono text-xs">
                    Pity: <strong className="text-amber-300">{gachaPity}/80</strong> · Non-Expiring Starfall Shards:{' '}
                    <strong className="text-purple-300">{starfallShards}</strong>
                  </div>
                  <button
                    onClick={() => {
                      const eng = new StarfallGachaEngine({
                        wishlistHeroIds: wishlist,
                        starfallShards,
                        pityCounter: gachaPity,
                      });
                      const out = eng.summon(10);
                      setStarfallShards(out.totalStarfallShards);
                      setGachaPity(out.pityCounter);
                      setGachaHistory(out.pulls);
                    }}
                    className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg cursor-pointer"
                  >
                    Simulate 10x Pull (+10 Starfall Shards)
                  </button>
                </div>

                <div className="space-y-1 font-mono text-[11px] max-h-44 overflow-y-auto">
                  {gachaHistory.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between"
                    >
                      <span className={p.rarity === 'SSR' ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                        [{p.rarity}] {p.name}
                      </span>
                      {p.rarity === 'SSR' && (
                        <span className={p.fromWishlist ? 'text-emerald-400' : 'text-rose-400'}>
                          {p.fromWishlist ? '★ WISHLIST HIT (70% Pool)' : 'Off-Wishlist (30% Pool)'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Starfall Exchange Mileage Shop */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-300">
                    Module 2.2 · Starfall Exchange Mileage Shop (1 Pull = 1 Shard · Never Expires)
                  </h3>
                  <span className="font-mono text-purple-300 font-bold">{starfallShards} Shards</span>
                </div>

                {shopLog && (
                  <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/40 rounded text-emerald-300 font-mono text-xs">
                    {shopLog}
                  </div>
                )}

                <div className="space-y-2.5">
                  {STARFALL_EXCHANGE_CATALOG.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between gap-4"
                    >
                      <div>
                        <div className="font-bold text-slate-100">{item.name}</div>
                        <div className="text-[11px] text-slate-400">{item.desc}</div>
                      </div>
                      <button
                        disabled={starfallShards < item.costShards}
                        onClick={() => {
                          const eng = new StarfallGachaEngine({ starfallShards });
                          const res = eng.redeemStarfallItem(item.id, wishlist[0]);
                          if (res.success) {
                            setStarfallShards(res.remainingShards!);
                          }
                          setShopLog(res.message);
                        }}
                        className="px-3.5 py-2 bg-purple-400 hover:bg-purple-300 disabled:opacity-40 text-slate-950 font-bold rounded-lg shrink-0 font-mono cursor-pointer"
                      >
                        {item.costShards} Shards
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

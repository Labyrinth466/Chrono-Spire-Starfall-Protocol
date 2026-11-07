import React, { useEffect, useRef, useState } from 'react';
import { ELEMENT_META, ElementType, FORMATIONS, getFormationRowBonuses, RESONATORS, ResonatorData } from '../data/resonators.ts';
import { BLESSING_CARDS, EQUIPMENT_SETS, getEnhanceRule } from '../data/equipment.ts';
import { drawPixelHeroSprite } from '../engine/pixelRenderer.ts';
import { getRecommendedCounterElement } from '../engine/combatEngine.ts';

export const ResonatorSplashArt: React.FC<{ hero: ResonatorData; className?: string }> = ({ hero, className = '' }) => {
  const elMeta = ELEMENT_META[hero.element];
  return (
    <svg
      viewBox="0 0 360 460"
      className={`w-full h-full select-none ${className}`}
       aria-label={`${hero.name} Full Illustration`}
    >
      <defs>
        <radialGradient id={`aura_${hero.id}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor={hero.colors.primary} stopOpacity="0.48" />
          <stop offset="60%" stopColor={hero.colors.secondary} stopOpacity="0.14" />
          <stop offset="100%" stopColor="#020617" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`cape_${hero.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={hero.colors.primary} />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* Background Cosmic Mandala & Continent Crest */}
      <rect width="360" height="460" fill={`url(#aura_${hero.id})`} />
      <circle cx="180" cy="200" r="138" fill="none" stroke={elMeta.color} strokeOpacity="0.22" strokeWidth="1.5" strokeDasharray="6 6" />
      <circle cx="180" cy="200" r="108" fill="none" stroke={hero.colors.secondary} strokeOpacity="0.2" strokeWidth="1" />
      <polygon
        points="180,48 215,155 322,185 215,215 180,322 145,215 38,185 145,155"
        fill={elMeta.color}
        fillOpacity="0.08"
        stroke={elMeta.color}
        strokeOpacity="0.3"
        strokeWidth="1"
      />

      {/* Character Silhouette & Flowing Cloak */}
      <path
        d="M110,190 L70,395 L155,375 L205,375 L290,395 L250,190 Z"
        fill={`url(#cape_${hero.id})`}
        stroke={hero.colors.secondary}
        strokeWidth="1.5"
      />

      {/* Special Back Silhouettes (Nine Tails for Kahori H10 / Valkyrie Wings for Aurelia H13) */}
      {hero.id === 'H10' && (
        <g fill="#fde047" fillOpacity="0.82" stroke="#ca8a04" strokeWidth="1.2">
          <path d="M125,240 Q45,170 65,120 Q110,155 135,220 Z" />
          <path d="M120,255 Q30,220 40,165 Q95,195 130,240 Z" />
          <path d="M235,240 Q315,170 295,120 Q250,155 225,220 Z" />
          <path d="M240,255 Q330,220 320,165 Q265,195 230,240 Z" />
        </g>
      )}
      {hero.id === 'H13' && (
        <g fill="#fef3c7" fillOpacity="0.88" stroke="#f59e0b" strokeWidth="1.5">
          <path d="M135,190 Q40,110 30,175 Q70,215 135,225 Z" />
          <path d="M225,190 Q320,110 330,175 Q290,215 225,225 Z" />
          <ellipse cx="180" cy="78" rx="38" ry="8" fill="none" stroke="#fbbf24" strokeWidth="3" />
        </g>
      )}

      {/* Torso & Ornate Armor */}
      <path
        d="M138,175 L222,175 L236,285 L124,285 Z"
        fill="#0f172a"
        stroke={hero.colors.secondary}
        strokeWidth="2"
      />
      <path
        d="M150,185 L210,185 L198,275 L162,275 Z"
        fill={hero.colors.primary}
      />

      {/* Head & Anime Hair */}
      <circle cx="180" cy="134" r="28" fill="#fde68a" />
      {/* Eyes */}
      <ellipse cx="170" cy="136" rx="3.5" ry="4.5" fill={elMeta.color} />
      <ellipse cx="190" cy="136" rx="3.5" ry="4.5" fill={elMeta.color} />
      {/* Hair Crown */}
      <path
        d="M144,132 Q146,92 180,92 Q214,92 216,132 L226,168 L206,142 L195,122 L180,130 L165,122 L154,142 L134,168 Z"
        fill={hero.colors.hair}
        stroke="#0f172a"
        strokeWidth="1.2"
      />

      {/* Signature Weapon Foreground */}
      {hero.id === 'H01' && (
        <g>
          <line x1="85" y1="315" x2="285" y2="115" stroke="#fb923c" strokeWidth="10" strokeLinecap="round" />
          <line x1="85" y1="315" x2="285" y2="115" stroke="#fef08a" strokeWidth="4" />
        </g>
      )}
      {hero.id === 'H04' && (
        <g>
          <rect x="215" y="165" width="58" height="135" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" />
          <line x1="75" y1="245" x2="255" y2="195" stroke="#c084fc" strokeWidth="8" />
        </g>
      )}
      {hero.id === 'H07' && (
        <g>
          <line x1="255" y1="105" x2="225" y2="355" stroke="#38bdf8" strokeWidth="5" />
          <polygon points="255,75 275,105 255,135 235,105" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
        </g>
      )}
      {hero.id === 'H10' && (
        <g>
          <path d="M90,260 Q180,210 275,245" fill="none" stroke="#34d399" strokeWidth="6" />
          <path d="M105,280 Q185,235 265,265" fill="none" stroke="#a7f3d0" strokeWidth="3" />
        </g>
      )}
      {hero.id === 'H13' && (
        <g>
          <path d="M115,135 Q75,220 115,305" fill="none" stroke="#fbbf24" strokeWidth="5" />
          <line x1="115" y1="135" x2="115" y2="305" stroke="#fef3c7" strokeWidth="1.5" />
        </g>
      )}
      {hero.id === 'H16' && (
        <g>
          <line x1="105" y1="340" x2="245" y2="110" stroke="#cbd5e1" strokeWidth="6" />
          <path d="M245,110 Q315,125 285,195 Q255,155 230,135 Z" fill="#f43f5e" />
        </g>
      )}
      {(hero.id === 'H19' || hero.id === 'H22') && (
        <g>
          <line x1="252" y1="95" x2="235" y2="360" stroke="#bae6fd" strokeWidth="5" />
          <polygon points="252,65 272,95 252,125 232,95" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="252" cy="95" r="22" fill="none" stroke="#7dd3fc" strokeWidth="1.5" strokeDasharray="3 3" />
        </g>
      )}
      {hero.id === 'H20' && (
        <g>
          <line x1="250" y1="100" x2="232" y2="360" stroke="#6ee7b7" strokeWidth="5.5" />
          <circle cx="250" cy="92" r="20" fill="#10b981" fillOpacity="0.35" stroke="#a7f3d0" strokeWidth="2" />
          <path d="M235,88 Q250,62 265,88 Q250,110 235,88 Z" fill="#ecfdf5" />
        </g>
      )}
      {hero.id === 'H21' && (
        <g>
          <line x1="250" y1="96" x2="235" y2="358" stroke="#fb7185" strokeWidth="5.5" />
          <polygon points="250,64 268,94 250,120 232,94" fill="#f43f5e" stroke="#fecdd3" strokeWidth="2" />
        </g>
      )}
    </svg>
  );
};

export const PixelPreviewCanvas: React.FC<{ hero: ResonatorData; compact?: boolean; className?: string }> = ({
  hero,
  compact = false,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId = 0;
    const start = performance.now();
    const render = (now: number) => {
      const t = (now - start) / 1000;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const isAtk = Math.floor(t * 1.5) % 3 === 0 && (t % 0.6) < 0.2;
          drawPixelHeroSprite(ctx, hero, canvas.width / 2 - 6, canvas.height / 2 + 12, compact ? 1.45 : 1.7, t, isAtk, 0);
        }
      }
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [hero, compact]);

  return (
    <canvas
      ref={canvasRef}
      width={160}
      height={160}
      className={className || (compact ? 'w-16 h-16 mx-auto' : 'w-28 h-28 mx-auto')}
    />
  );
};

export const PixelTarotCardCanvas: React.FC<{
  arcanaId: string;
  className?: string;
}> = ({ arcanaId, className = 'w-16 h-20' }) => {
  const cardSpec = BLESSING_CARDS.find((b) => b.id === arcanaId);
  const numStr = arcanaId.replace('ARCANA_', '').padStart(2, '0');
  const artUrl = cardSpec?.artUrl || `/assets/tarot/arcana_${numStr}.webp`;

  return (
    <img
      src={artUrl}
      alt={cardSpec?.name || arcanaId}
      style={{ imageRendering: 'pixelated' }}
      className={`select-none shrink-0 rounded-sm shadow-md object-contain ${className}`}
    />
  );
};

export const PixelTarotCardBackCanvas: React.FC<{
  className?: string;
}> = ({ className = 'w-16 h-20' }) => {
  return (
    <img
      src="/assets/tarot/card_back.webp"
      alt="Tarot Card Back"
      style={{ imageRendering: 'pixelated' }}
      className={`select-none shrink-0 rounded-sm shadow-md object-contain ${className}`}
    />
  );
};

export const ElementalWheelBadge: React.FC<{
  activeBossElement?: ElementType;
  compact?: boolean;
}> = ({ activeBossElement = 'Fire', compact = false }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const counterEl = getRecommendedCounterElement(activeBossElement);

  useEffect(() => {
    if (!open) return;
    const onDocDown = (ev: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', onDocDown);
    return () => window.removeEventListener('pointerdown', onDocDown);
  }, [open]);

  const cycleNodes: { el: ElementType; icon: string; color: string; x: number; y: number }[] = [
    { el: 'Fire', icon: '🔥', color: '#f97316', x: 38, y: 14 },
    { el: 'Cryo', icon: '❄️', color: '#38bdf8', x: 64, y: 40 },
    { el: 'Wind', icon: '🌪️', color: '#34d399', x: 38, y: 66 },
    { el: 'Electro', icon: '⚡', color: '#a855f7', x: 12, y: 40 },
  ];
  const dualNodes: { el: ElementType; icon: string; color: string; x: number; y: number }[] = [
    { el: 'Light', icon: '☀️', color: '#fbbf24', x: 96, y: 18 },
    { el: 'Dark', icon: '🌑', color: '#c084fc', x: 96, y: 62 },
  ];

  const reactionChart = [
    {
      name: '💥 Melt',
      combo: '❄️ Freeze + 🔥 Fire / 🔥 Burn + ❄️ Cryo',
      effect: '2.0x Hit DMG + Consumes Freeze',
      color: 'text-orange-300 border-orange-500/40 bg-orange-950/30',
    },
    {
      name: '⚡ Superconduct',
      combo: '❄️ Freeze + ⚡ Electro',
      effect: '1.5x Hit DMG + Applies 🛡️💔 Defenseless (-30% DEF)',
      color: 'text-sky-300 border-sky-500/40 bg-sky-950/30',
    },
    {
      name: '🔥 Overload',
      combo: '🔥 Burn + ⚡ Electro / ⚡ Shock + 🔥 Fire',
      effect: '1.75x AoE Blast + +60 Bonus Stagger Break',
      color: 'text-purple-300 border-purple-500/40 bg-purple-950/30',
    },
    {
      name: '🌪️ Swirl',
      combo: '🌪️ Wind Hit on 🔥/❄️/⚡/🩸 Debuff',
      effect: '1.35x DMG + Spreads & Refreshes Debuff to All Parts',
      color: 'text-emerald-300 border-emerald-500/40 bg-emerald-950/30',
    },
    {
      name: '☀️ Solar Eclipse',
      combo: '☀️ Luminous Mark + 🌑 Dark Hit',
      effect: '1.8x Burst DMG + Heals Squad for 12% Max HP',
      color: 'text-amber-300 border-amber-500/40 bg-amber-950/30',
    },
    {
      name: '🌑 Abyssal Rupture',
      combo: '🌑 Corrosion + ☀️ Light Hit',
      effect: '1.85x True Burst + +50 Stagger Break Power',
      color: 'text-fuchsia-300 border-fuchsia-500/40 bg-fuchsia-950/30',
    },
  ];

  const renderWheelSvg = (sizeClass: string) => (
    <svg viewBox="0 0 114 80" className={sizeClass}>
      <defs>
        <marker id="elArrow" markerWidth="4" markerHeight="4" refX="2.5" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4 Z" fill="#94a3b8" />
        </marker>
        <marker id="elArrowGold" markerWidth="4" markerHeight="4" refX="2.5" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4 Z" fill="#fbbf24" />
        </marker>
      </defs>
      {/* Left: 4-Element Outer Cycle Ring */}
      <circle cx="38" cy="40" r="26" fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 2" />
      {/* Directional Arrows: Fire(top)->Cryo(right)->Wind(bottom)->Electro(left)->Fire(top) */}
      <path d="M47,17 L60,30" stroke="#f97316" strokeWidth="1.6" markerEnd="url(#elArrow)" />
      <path d="M60,50 L47,63" stroke="#38bdf8" strokeWidth="1.6" markerEnd="url(#elArrow)" />
      <path d="M29,63 L16,50" stroke="#34d399" strokeWidth="1.6" markerEnd="url(#elArrow)" />
      <path d="M16,30 L29,17" stroke="#a855f7" strokeWidth="1.6" markerEnd="url(#elArrow)" />

      {cycleNodes.map((n) => {
        const isBoss = activeBossElement === n.el;
        const isCounter = counterEl === n.el;
        return (
          <g key={n.el}>
            <circle
              cx={n.x}
              cy={n.y}
              r={isCounter || isBoss ? 10.5 : 8.5}
              fill="#090d16"
              stroke={isCounter ? '#fde047' : isBoss ? '#f43f5e' : n.color}
              strokeWidth={isCounter || isBoss ? '2.2' : '1.3'}
            />
            <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize="10">
              {n.icon}
            </text>
          </g>
        );
      })}

      {/* Divider between 4-Element Ring and Vertical Light/Dark Pair */}
      <line x1="78" y1="10" x2="78" y2="70" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 2" />

      {/* Right: Vertical Light ↕ Dark Mutual Counter Pair */}
      <path d="M93,30 L93,50" stroke="#fbbf24" strokeWidth="1.4" markerEnd="url(#elArrowGold)" />
      <path d="M99,50 L99,30" stroke="#c084fc" strokeWidth="1.4" markerEnd="url(#elArrow)" />

      {dualNodes.map((n) => {
        const isBoss = activeBossElement === n.el;
        const isCounter = counterEl === n.el;
        return (
          <g key={n.el}>
            <circle
              cx={n.x}
              cy={n.y}
              r={isCounter || isBoss ? 10.5 : 8.5}
              fill="#090d16"
              stroke={isCounter ? '#fde047' : isBoss ? '#f43f5e' : n.color}
              strokeWidth={isCounter || isBoss ? '2.2' : '1.3'}
            />
            <text x={n.x} y={n.y + 3.5} textAnchor="middle" fontSize="10">
              {n.icon}
            </text>
          </g>
        );
      })}
    </svg>
  );

  return (
    <div ref={wrapRef} className="relative inline-block select-none">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="Click to inspect full Elemental Advantage & Reaction System Chart"
        className={`flex items-center justify-center rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-700/80 hover:border-amber-400/70 shadow-lg backdrop-blur-sm cursor-pointer transition-colors ${
          compact ? 'p-1' : 'p-1.5'
        }`}
      >
        {renderWheelSvg(compact ? 'w-14 h-10 shrink-0' : 'w-16 h-12 shrink-0')}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-0 top-full mt-1.5 z-50 w-80 sm:w-96 p-3.5 rounded-2xl bg-slate-950/98 backdrop-blur-md border border-amber-400/60 shadow-[0_14px_38px_rgba(0,0,0,0.92)] text-left space-y-2.5"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="text-[11px] font-mono font-extrabold text-amber-300 uppercase tracking-wider">
              Elemental Advantage &amp; Reaction Chart
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-12 gap-2.5 items-center bg-slate-900/80 p-2 rounded-xl border border-slate-800">
            <div className="col-span-5 flex justify-center">
              {renderWheelSvg('w-32 h-22')}
            </div>
            <div className="col-span-7 text-[10px] font-mono space-y-1">
              <div className="text-slate-100 font-bold">
                🔥 ▸ ❄️ ▸ 🌪️ ▸ ⚡ ▸ 🔥 &nbsp;|&nbsp; ☀️ ↕ 🌑
              </div>
              <div className="px-2 py-1 rounded bg-slate-950 border border-amber-400/40">
                Active Enemy: <strong className="text-rose-300">{activeBossElement}</strong> ➔ Counter:{' '}
                <strong className="text-amber-300">{counterEl}</strong>
              </div>
              <div className="text-emerald-300">
                • Advantage: <strong>+30% DMG · +25% Break · +15% Crit</strong>
              </div>
              <div className="text-rose-300">
                • Disadvantage: <strong>-20% DMG · -15% Break</strong>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] font-mono font-bold text-sky-300 uppercase tracking-wider">
              ⚡ Elemental Reaction Combos (Status + Element Trigger)
            </div>
            <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-0.5">
              {reactionChart.map((rx) => (
                <div
                  key={rx.name}
                  className={`px-2.5 py-1.5 rounded-lg border text-[10px] font-mono flex flex-col gap-0.5 ${rx.color}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold">{rx.name}</span>
                    <span className="text-[9px] text-slate-200">{rx.combo}</span>
                  </div>
                  <div className="text-[9.5px] text-slate-300">{rx.effect}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const WikiModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-6xl w-full max-h-[88vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-slate-100 font-display">
              Chrono Spire: Starfall Protocol — Official Game Wiki & Balance Sheet (v2.3)
            </h2>
            <p className="text-xs text-slate-400">
              Single Source of Truth: 27 Resonators (5 R Starter · 7 SR · 15 SSR) · 10-Star Shard Ascension (5★ Gold ➔ A5★ Awakened) · Single-Tier 5-Floor Tarot
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Close Wiki
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 text-xs text-slate-300">
          {/* Section 1: 27 Resonators Base Stats Table */}
          <section>
            <h3 className="text-sm font-semibold text-amber-300 mb-3">
              01. Base Stats &amp; 27 Resonator Roster (5 Starter R · 7 SR · 15 SSR including Single/AoE Healers)
            </h3>
            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse font-mono tabular-nums">
                <thead>
                  <tr className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
                    <th className="p-2.5">ID</th>
                    <th className="p-2.5">Resonator</th>
                    <th className="p-2.5">Rarity · Element</th>
                    <th className="p-2.5">Continent</th>
                    <th className="p-2.5">Role</th>
                    <th className="p-2.5">HP (1/100)</th>
                    <th className="p-2.5">ATK (1/100)</th>
                    <th className="p-2.5">DEF (1/100)</th>
                    <th className="p-2.5">SPD</th>
                    <th className="p-2.5">5★ Bonus</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {RESONATORS.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/30">
                      <td className="p-2.5 text-slate-400">{r.id}</td>
                      <td className="p-2.5 font-sans font-semibold text-slate-100">{r.name}</td>
                      <td className="p-2.5">
                        {r.rarity} · {r.element}
                      </td>
                      <td className="p-2.5 font-sans text-slate-300">{r.regionName}</td>
                      <td className="p-2.5 font-sans">{r.role}</td>
                      <td className="p-2.5">{r.hpLv1.toLocaleString()} / {r.hpLv100.toLocaleString()}</td>
                      <td className="p-2.5">{r.atkLv1.toLocaleString()} / {r.atkLv100.toLocaleString()}</td>
                      <td className="p-2.5">{r.defLv1.toLocaleString()} / {r.defLv100.toLocaleString()}</td>
                      <td className="p-2.5">{r.spd}</td>
                      <td className="p-2.5 font-sans text-amber-300">{r.star5BonusDesc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 2: 4 Tactical Formations */}
          <section>
            <h3 className="text-sm font-semibold text-amber-300 mb-3">
              02. 5-Hero Tactical Formations (Symmetric Row Budget: 12% Lv.1 to 30% Lv.10)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FORMATIONS.map((f) => {
                const lv1 = getFormationRowBonuses(f, 1);
                const lv10 = getFormationRowBonuses(f, 10);
                return (
                  <div key={f.id} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-100">{f.name}</span>
                      <span className="font-mono text-slate-400">{f.structure}</span>
                    </div>
                    <p className="text-slate-400 mb-2">{f.desc}</p>
                    <div className="font-mono text-xs text-emerald-400">
                      Front Row: +{lv1.frontDefPct}% to +{lv10.frontDefPct}% DEF/hero · Back Row: +{lv1.backAtkPct}% to +{lv10.backAtkPct}% ATK/hero
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 3: +15 Fail Stack Table & 8 Equipment Sets */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-amber-300 mb-3">
                03. Artisan&apos;s Pity (+0 to +15 Fail Stack Rules)
              </h3>
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left font-mono tabular-nums">
                  <thead>
                    <tr className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
                      <th className="p-2">Tier</th>
                      <th className="p-2">Base Rate</th>
                      <th className="p-2">Fail Stack</th>
                      <th className="p-2">Max Cap</th>
                      <th className="p-2">Main Mult</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {[3, 6, 9, 12, 15].map((lv) => {
                      const r = getEnhanceRule(lv);
                      return (
                        <tr key={lv}>
                          <td className="p-2 text-slate-200">+{lv - 2} to +{lv}</td>
                          <td className="p-2 text-emerald-400">{r.baseRate}%</td>
                          <td className="p-2 text-amber-300">+{r.failStackBonus}% / fail</td>
                          <td className="p-2">{r.maxAttemptsGuarantee} tries</td>
                          <td className="p-2">{r.mainStatMultiplier.toFixed(2)}x</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-amber-300 mb-3">
                04. 8 Canonical Equipment Sets &amp; 22 Major Arcana 16-Bit Pixel Tarot Cards
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {EQUIPMENT_SETS.map((s) => (
                  <div key={s.id} className="p-2.5 bg-slate-950/60 border border-slate-800 rounded">
                    <div className="font-semibold text-slate-100">
                      {s.id} <span className="text-slate-400 font-normal">· {s.recommendedRole}</span>
                    </div>
                    <div className="text-slate-400">
                      2-PC: {s.twoPieceDesc} · 4-PC: {s.fourPieceDesc}
                    </div>
                  </div>
                ))}
                {BLESSING_CARDS.map((b) => (
                  <div
                    key={b.id}
                    className="p-2.5 bg-slate-950/60 border border-slate-800/80 rounded flex items-center gap-3"
                  >
                    <PixelTarotCardCanvas arcanaId={b.id} className="w-12 h-15" />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-amber-200">
                        {b.number}. {b.name}{' '}
                        <span className="text-slate-400 font-normal">
                          · {b.id} · {b.rarity}
                        </span>
                      </div>
                      <div className="text-slate-400">{b.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

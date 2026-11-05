# Chrono Rewind 12-Zodiac Interactive Sector Wheel & Single Inspect CP Button

This update removes the duplicate `📊` CP Breakdown button next to Hero CP (keeping only the single `Inspect CP` button) and upgrades the Chrono Rewind Astral Observatory so that every one of the **12 Zodiac Wheel Sectors** (`Aries ♈` through `Pisces ♓`) plus the **Center Seasonal Constellation** has a full-area clickable/tappable SVG wedge hitbox and its own dedicated **22-Node Asymmetric Star Tree**.

## User Review & Critical Decisions

> [!IMPORTANT]
> Both design choices have been confirmed with your selections:

- **Confirmed Decision 1 (12 Dedicated Zodiac Trees + 1 Center Season Tree)**: Clicking or tapping anywhere inside any of the 12 Zodiac wheel wedges (`Aries ♈` to `Pisces ♓`) or the Center Seasonal circle zooms into that specific Zodiac's own dedicated 22-node asymmetric constellation tree (13 zoomable trees total: 12 Zodiacs + 1 Active Season).
- **Confirmed Decision 2 (Single `Inspect CP` Button)**: Removed the duplicate `📊` icon button selected in Focus Mode and kept only the `Inspect CP` button in both the Hero Detail and Equipment & Forge screens.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Clean Single `Inspect CP` Trigger**: Eliminates the redundant `📊` button next to the Hero `⚡ CP` badge so only the `Inspect CP` button remains.
  2. **Full-Sector Click/Tap SVG Annular Wedges**: Renders an SVG annular wedge path (`<path d="M ... A ... L ... A ... Z" />`) spanning the full 30° slice (`r = 74` to `r = 212`) for each of the 12 Zodiac sectors, plus a full circle hitbox (`r = 74`) for the Center Seasonal Constellation. Players can click or tap anywhere inside a star sector, its constellation stars, or its inner Zodiac symbol to zoom in.
  3. **12 Dedicated Zodiac 22-Node Trees + 1 Seasonal Tree**: Each Zodiac sign (`Aries`, `Taurus`, `Gemini`, `Cancer`, `Leo`, `Virgo`, `Libra`, `Scorpio`, `Sagittarius`, `Capricorn`, `Aquarius`, `Pisces`) and the active Center Season (`SEASONAL_CROWN`) has its own independent 22-node asymmetric tree, unlock state, and bottom `reset($$$$G)` button.

---

## 2. User Experience & Visual Design

- **Interactive Zodiac Wheel UX Enhancements**:
  - **Full-Wedge Hover & Tap Feedback**: Hovering or tapping any 30° Zodiac wedge highlights the entire sector slice with a subtle astral radial glow, brightens its constellation lines and stars, and displays a live floating HUD pill with the Zodiac's name, symbol, theme bonus, and `unlocked/22★` progress.
  - **On-Wheel Progress Indicators**: Each Zodiac sector displays its unlocked star count (`X/22★`) along the rim so players can see their progression across all 12 Zodiacs at a glance.
  - **Aligned Bottom `reset($$$$G)` Strip**: Below the Zodiac Wheel (and directly below the zoomed tree), compact `reset($$$$G)` buttons allow resetting any Zodiac or Seasonal constellation without cluttering the star map.
- **Zoomed 22-Node Constellation View**:
  - Includes a `← Back to Full Zodiac Map` button, a compact 13-constellation quick-switcher strip (`♈`..`♓` + `⛎ Season`), a 7-row asymmetric 22-node connected star tree (`1 → 3 → 2 → 4 → 3 → 6 → 3`), a compact node popover (`w-48 p-2 text-[10px]`), and a centered bottom `reset($$$$G)` button.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: SVG Annular Wedge `<path>` Hitboxes vs. Point/Text-Only Clicks**
  - *Chosen Approach*: Compute the exact polar-to-Cartesian SVG arc path (`M x1 y1 L x2 y2 A rOut rOut 0 0 1 x3 y3 L x4 y4 A rIn rIn 0 0 0 x1 y1 Z`) for each 30° Zodiac sector with `pointer-events="all"`.
  - *Why*: Previously, only the thin `<line>`, tiny `<circle>`, and `<text>` elements captured pointer events, leaving 90% of the wedge empty and unclickable. A filled annular `<path>` makes the entire pie slice responsive to mouse clicks and touch taps.
- **Decision 2: Balanced Per-Node Stat Scaling Across 12 Zodiac Trees**
  - *Chosen Approach*: Each of the 12 Zodiac constellations specializes in an archetype attribute (`Aries` Crit/ATK, `Taurus` HP/DEF, `Gemini` SPD/Chain, `Cancer` Shield/RES, `Leo` Fire/Crit DMG, `Virgo` Skill/Break, `Libra` Balanced All-Stat, `Scorpio` Debuff/DoT, `Sagittarius` Ranged/Pierce, `Capricorn` Stagger/Armor, `Aquarius` Energy/Ult, `Pisces` Heal/Shard Bounty) with balanced node values so unlocking across all 12 Zodiacs scales smoothly.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   App.tsx (State & Interactive Views)                      │
├───────────────────────────────────┬────────────────────────────────────────┤
│ Hero Detail & Forge Header        │ Chrono Rewind Tab (REWIND)             │
│  ├─ ⚡ CP: XX,XXX                  │  ├─ Overview: 12-Sector Zodiac Wheel   │
│  └─ [Inspect CP] (📊 removed)     │  │   ├─ 12 SVG Annular <path> Wedges   │
│      └─ Opens CPDetailedBreakdown │  │   ├─ Center Circle Seasonal Event   │
│          ├─ 4 Top Stat Boxes      │  │   └─ Bottom Aligned reset($$$$G)    │
│          ├─ Horizontal BarChart   │  └─ Zoomed View (zoomedConstellationId)│
│          └─ Radial PieChart       │      ├─ [← Back to Full Zodiac Map]    │
│                                   │      ├─ 13-Zodiac Quick Switcher Bar   │
│                                   │      ├─ 22-Node Asymmetric Connected   │
│                                   │      │  Star Tree + Compact Popover    │
│                                   │      └─ Bottom Centered reset($$$$G)   │
└───────────────────────────────────┴────────────────────────────────────────┘
```

- **State & Data Model**:
  - `ConstellationGroupId`: Expanded to include all 12 Zodiac IDs (`'ARIES' | 'TAURUS' | 'GEMINI' | 'CANCER' | 'LEO' | 'VIRGO' | 'LIBRA' | 'SCORPIO' | 'SAGITTARIUS' | 'CAPRICORN' | 'AQUARIUS' | 'PISCES'`) plus `'SEASONAL_CROWN'` (with backward-compatible support in `computeHeroStats`).
  - `ZODIAC_WHEEL_SECTORS`: Maps each of the 12 30° sectors directly to its own `ConstellationGroupId` (`sector.groupId = sector.id`), so clicking any wedge zooms into that exact Zodiac's 22-node tree.

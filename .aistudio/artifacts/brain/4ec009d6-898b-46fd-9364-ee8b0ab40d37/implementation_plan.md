# Chrono Spire: Starfall Protocol — 2D Pixel Art Engine, 3-Layer Monster HUD & 16-Bit Pixel Art Tarot Cards

This plan restores the classic **2D Pixel Art (HD-2D Canvas)** engine (replacing Three.js), fixes monster HP and status text overlapping enemy sprites by introducing a strict **3-Layer Vertical Enemy Container** (`-top-7` 22×22px SVG status badges, unobstructed 2D pixel sprite center, `-bottom-8` HP + 5-Segment Stagger + `WEAK` badge under feet), and upgrades all **22 Major Arcana Tarot Cards** to animated **`32×40` 16-Bit Pixel Art Tarot Cards** (`drawPixelTarotCard`).

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions were confirmed during Phase 1 clarification:

- **Confirmed Decision 1 (3-Layer Enemy HUD Architecture)**: Render each enemy/boss part's 3-layer stack as a crisp **DOM overlay container anchored to the enemy's 2D canvas coordinates**, while stripping all overlapping in-canvas enemy HP bars and status text from `renderBattlefieldCanvas` so the 2D Pixel Art sprite is 100% unobstructed.
- **Confirmed Decision 2 (16-Bit Pixel Art Tarot Card Placement)**: Render the `32×40` (`image-rendering: pixelated`) 16-Bit Pixel Art Tarot Card illustrations (`0. The Fool` through `XXI. The World`) in **both** the Every-5-Floor Tarot Blessing Modal (`[AUTO CARD: 6.0s]`) and the **Official Game Wiki Arcana Compendium**.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Keep 2D Pixel Art Engine (`HD-2D Canvas`)**:
     - Uses `renderBattlefieldCanvas` on the 2D `<canvas>` (`1040×430`) for the Tower Battle arena and `PixelPreviewCanvas` for the Hero/Summon sprite preview, removing Three.js `VoxelBattlefield3D` and `VoxelPreview3D` usage.
  2. **Fix Monster HP/Status Overlap with 3-Layer Vertical Enemy Stack**:
     - Prohibits any HP bar or status text at `top-1/2` (center of the monster sprite).
     - Each Enemy / Boss Part container (`flex flex-col items-center justify-between`) is structured into 3 vertical layers:
       - **Layer 1 (Above Head `-top-7`)**: Horizontal row (`flex gap-1`) of **`22×22px` SVG Status Badges ONLY** (never text strings like `Bleed · Burn...`). Merges duplicate status types and renders a bottom-right corner badge showing the stack count (`x2`, `x5`) or remaining timer (`3.8s`) for:
         - 🔥 `Burn` (`#f97316`), ❄️ `Freeze` (`#38bdf8`), 🛡️❄️ `Freeze Immunity` (`8s`), ⚡ `Shock` (`#a855f7`), 🩸 `Bleed` (`#10b981`), ☀️ `Luminous Mark` (`#fbbf24`), 🌑 `Corrosion` (`#9333ea`), 🛡️💔 `Defenseless` (`#ef4444`).
       - **Layer 2 (Center Sprite Zone)**: 100% unobstructed 2D Pixel Art monster/boss sprite (`drawEldritchBossPart`) with zero overlapping UI or text. Clicking/tapping the sprite body sets `manualFocusId`.
       - **Layer 3 (Below Feet `-bottom-8`)**: Enemy HP Bar + 5-Segment Stagger Bar + Name & Elemental Weakness badge (`WEAK: 🔥`) placed strictly beneath the monster's feet, while the main Boss HUD remains pinned at the top edge of the battlefield (`top-2`).
  3. **Upgrade All 22 Major Arcana Cards to 16-Bit Pixel Art Tarot Cards**:
     - Implements `drawPixelTarotCard(canvas, arcanaId, tick)` on a `32×40` pixel grid (`image-rendering: pixelated`) with a pixel gold border, twinkling stars, Roman numeral header, and unique 16-bit pixel art iconography for all 22 cards (`0. The Fool` through `XXI. The World`).

---

## 2. User Experience & Visual Design

- **3-Layer Enemy / Boss Part Container Layout**:
  ```
  ┌──────────────────────────────────────────────────────┐
  │  Layer 1 (-top-7): [🔥 3.8s] [🩸 x5] [🛡️💔 2.4s]     │  ← 22×22px SVG Status Badges ONLY
  ├──────────────────────────────────────────────────────┤
  │                                                      │
  │  Layer 2 (Center):   100% Unobstructed 2D Pixel Art  │  ← Zero UI/Text Over Sprite Body
  │                      Monster / Boss Part Sprite      │
  │                                                      │
  ├──────────────────────────────────────────────────────┤
  │  Layer 3 (-bottom-8): [████████░░] HP Bar            │
  │                       [▪][▪][▪][▫][▫] 5-Bar Stagger  │  ← Below Monster Feet Only
  │                       Left Arm · WEAK: 🔥            │
  └──────────────────────────────────────────────────────┘
  ```
- **16-Bit Pixel Art Tarot Cards (`32×40` Grid)**:
  - Each of the 22 Major Arcana cards (`ARCANA_00` to `ARCANA_21`) renders on a `32×40` HTML5 `<canvas>` scaled up with `image-rendering: pixelated`:
    - Outer 2px ornate pixel gold frame (`#fbbf24` / `#ca8a04` with `#fde047` corner studs).
    - Animated twinkling star pixels (`tick`-driven) in the card night sky backdrop.
    - Distinct 16-bit pixel art centerpiece for every card (`0. The Fool` cliff & star, `I. The Magician` infinity wand, `II. The High Priestess` crescent veil, `III. The Empress` emerald crown, `IV. The Emperor` crimson throne, `V. The Hierophant` triple cross keys, `VI. The Lovers` twin solar/lunar hearts, `VII. The Chariot` winged war wheel, `VIII. Strength` golden lion jaws, `IX. The Hermit` astral lantern, `X. Wheel of Fortune` 8-spoke destiny wheel, `XI. Justice` balanced scales & sword, `XII. The Hanged Man` inverted halo rune, `XIII. Death` pale reaper scythe, `XIV. Temperance` twin alchemy chalices, `XV. The Devil` abyssal horned sigil, `XVI. The Tower` lightning-struck spire, `XVII. The Star` 8-pointed polar star, `XVIII. The Moon` twin towers & eclipse, `XIX. The Sun` radiant solar face, `XX. Judgement` archangel horn, `XXI. The World` cosmic laurel wreath).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Remove In-Canvas Enemy Bars & Render 3-Layer DOM Overlay**
  - *Chosen Approach*: Remove the old canvas-drawn HP/name/debuff rectangles from `renderBattlefieldCanvas` and render positioned DOM containers over each alive enemy's `(x, y)` percentage coordinates (`left: ${(b.x / 1040) * 100}%`, `top: ${(b.y / 430) * 100}%`).
  - *Why*: Guarantees crisp `22×22px` SVG status badges above the head (`-top-7`), a 100% clean pixel sprite in the center, and sharp HP + 5-bar Stagger + `WEAK` badges below the feet (`-bottom-8`) at any screen resolution.
- **Decision 2: Unify 22 Major Arcana Pixel Art Cards Across Combat & Wiki**
  - *Chosen Approach*: Sync `BLESSING_CARDS` with all 22 Major Arcana (`ARCANA_00` through `ARCANA_21`) and render `<PixelTarotCardCanvas>` in both the Every-5-Floor Tarot popup (`[AUTO CARD: 6.0s]`) and the Wiki Compendium.
  - *Why*: Ensures every card drawn during a Spire run has its authentic 16-bit pixel art illustration and can also be inspected anytime in the Wiki.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────────┐
│            2D PIXEL ENGINE + 3-LAYER MONSTER HUD + PIXEL TAROT             │
├────────────────────────────────────────────────────────────────────────────┤
│  1. 2D Pixel Art Canvas (src/engine/pixelRenderer.ts)                      │
│     ├─ renderBattlefieldCanvas(): Draws parallax sky/ruins, 5 Hero sprites,│
│     │    and 100% clean Boss/Minion sprites (no overlapping bars on body)  │
│     └─ drawPixelTarotCard(canvas, arcanaId, tick): 32x40 pixelated canvas  │
│          with gold pixel frame, twinkling stars & 22 unique Arcana sprites │
├────────────────────────────────────────────────────────────────────────────┤
│  2. 3-Layer Enemy DOM Container Overlay (src/App.tsx)                      │
│     ├─ Layer 1 (-top-7):   flex gap-1 of 22x22px SVG Status Badges         │
│     │                      (Burn, Freeze, Freeze Immune, Shock, Bleed,     │
│     │                       Luminous Mark, Corrosion, Defenseless)         │
│     ├─ Layer 2 (Center):   Transparent sprite hit-box (100% clean sprite)  │
│     └─ Layer 3 (-bottom-8): HP Bar + 5-Segment Stagger + Name & WEAK icon  │
├────────────────────────────────────────────────────────────────────────────┤
│  3. 22 Major Arcana Tarot Modal & Wiki Compendium                          │
│     ├─ Every-5-Floor Modal: 3 cards with <PixelTarotCardCanvas /> + 6.0s   │
│     └─ WikiModal: Full 22-card 16-Bit Pixel Art Arcana gallery             │
└────────────────────────────────────────────────────────────────────────────┘
```

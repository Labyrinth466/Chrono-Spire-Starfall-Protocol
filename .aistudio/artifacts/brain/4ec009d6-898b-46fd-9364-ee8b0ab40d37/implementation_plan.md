# Implementation Plan — SSOT v2.3 Refinement

## 1. Starter `R` Roster (5 Units), `SR/SSR` Lock & Tutorial Free `100% SR` Pull
- **`src/data/resonators.ts`**:
  - Add 5 `R` (Rare, 1★ Blue Frame) starter Resonators to `RESONATORS` (total 23 Resonators: 12 SSR, 6 SR, 5 R):
    1. `R01 Vanguard Guard` (`Fire` · `Tank / Breaker` · Front)
    2. `R02 Gale Archer` (`Wind` · `Ranged DPS` · Back)
    3. `R03 Frost Acolyte` (`Cryo` · `Debuffer` · Back)
    4. `R04 Dawn Cleric` (`Light` · `Support & Healer` · Back)
    5. `R05 Shadow Blade` (`Dark` · `Melee DPS` · Front)
  - Update `runBalanceSelfChecks()` in `src/engine/combatEngine.ts` to validate the expanded 23-Resonator roster (12 SSR + 6 SR + 5 R) and the updated elemental counter cycle.
- **`src/App.tsx`**:
  - Set initial party (`partyIds`) to `['R01', 'R05', 'R02', 'R03', 'R04']` and `INITIAL_HERO_PROGRESS` so only `R01–R05` start with `unlocked: true` (`1★`, `Lv.10`), while all 6 `SR` and 12 `SSR` start with `unlocked: false`.
  - Render locked `SR/SSR` heroes in the `HEROES` tab and squad pickers with a dark silhouette overlay and `🔒 LOCKED (Summon or Exchange to Unlock)` badge; prevent deploying locked heroes until unlocked via Summon or Merchant Hub Exchange.
  - Add `hasDoneFirstFreePull: boolean` (initial `false`). In the `SUMMON` tab, display **`[✨ FREE FIRST SUMMON (100% SR)] (0 💎)`** when `!hasDoneFirstFreePull`, guaranteeing 1 random `SR` Resonator unlock on first press.
  - On subsequent normal pulls that do not roll `SSR` or `SR`, grant an `R` Resonator duplicate card (`R01–R05`, upgrading their Stars up to 5★ and Level) paired with a 3★–4★ Relic drop.

## 2. `Starfall Card Reveal Modal` & `SR ➔ SSR Shatter Fake-Out` (25% Chance)
- **`src/App.tsx`**:
  - When triggering `1x` or `10x Summon` (or the free first pull), open a full-screen **Starfall Card Reveal Overlay** displaying 1 or 10 floating astral cards with rarity-colored back auras (`Blue = R`, `Purple = SR`, `Gold = SSR`).
  - Support clicking individual cards to flip or clicking **`[✨ REVEAL ALL]`**.
  - **Fake-Out Shatter (`SR ➔ SSR`)**: When a pull is `SSR`, roll a **25% chance** (`isFakeOut: true`) to initially render the card back with a **Purple (`SR`) aura**. Upon flipping that card, play a violent card shake + golden lightning bolt + spiderweb crack shatter animation (`⚡ GOLDEN ASCENSION!`) that bursts into the **Gold `SSR` card** with a golden chime SFX.

## 3. Unified `[🏰 Sanctuaries & Challenges]` Modal & 4-Tab `[🛒 Merchant Hub]`
- **Top Header / Battle Bar (`src/App.tsx`)**:
  - Keep the Tower `Spire Battle` canvas as the central main screen and add two primary buttons on the top bar: **`[🏰 Sanctuaries & Challenges]`** and **`[🛒 Merchant Hub]`**.
- **`[🏰 Sanctuaries & Challenges]` Split-View Modal**:
  - **Left Sidebar (6 Modes with Icons)**:
    1. `🪙 Golden Bounty Vault`
    2. `⚔️ Striker Sanctum`
    3. `🛡️ Bastion Foundry`
    4. `🔮 Astral Observatory`
    5. `🏟️ 1v1 Async Arena`
    6. `🐉 Guild Raid: Yog-Sothoth`
  - **Right Content Area (Top Pixel Art Mode Banner + Action Rows)**:
    - **Dungeons (4 Domains)**: 5 difficulty rows (`Tier I – V`) showing Floor/CP requirements and drops, with right-aligned **`[⚔️ Fight (1🗝️)]`** and **`[⚡ Sweep (1🗝️+1🎫)]`** buttons.
    - **1v1 Async Arena**: 5 ranked AI Rival challengers sorted by Squad CP (displaying Rival name, 5-hero portrait icons, `Squad CP`, and rewards) with a right-aligned **`[⚔️ Battle]`** button per row + top-right **`[🛒 Arena Shop]`** shortcut.
    - **Guild Raid (`Yog-Sothoth`)**:
      - If `!guildState.joined`: show **`[🛡️ Guild Hall — Join or Create Guild]`** (create custom guild name or join a preset guild) + **`[Donate 10,000 Gold (+Guild EXP)]`** button to level up **Guild Level (`Lv.1–5`)**.
      - Once joined: show Guild info header + **3 Raid Difficulty rows (`Easy / Normal / Hard`)** with right-aligned **`[⚔️ Fight (1 Attempt)]`**:
        - `Easy (Guild Lv.1 | Rec. CP 15,000)`: Boss DMG `1.0x`, Score/Medal Multiplier `1.0x`
        - `Normal (Guild Lv.2 | Rec. CP 40,000)`: Boss DMG `1.8x`, Score/Medal Multiplier `2.2x`
        - `Hard (Guild Lv.3 | Rec. CP 75,000)`: Boss DMG `3.2x`, Score/Medal Multiplier `4.5x` (if the squad wipes before 90s, final score/medals are halved `0.5x`).
- **`[🛒 Merchant Hub]` 4-Tab Unified Shop Modal**:
  - **Tab 1 (`🪙 General Gold Shop`)**: `1x 🎫 Sweep Ticket` (15,000G), `10x 🎫 Sweep Tickets` (135,000G), and Forge Enhancement Catalysts.
  - **Tab 2 (`🌟 Starfall Exchange`)**: Featured 5★ Signature Weapon (`80 Shards`), Featured SSR Unlock/Ascend (`100 Shards`), Wishlist #1 SSR Unlock/Ascend (`75 Shards`), Reforge & Catalyst Chest (`15 Shards`).
  - **Tab 3 (`🏆 Arena Armory`)**: Exchange `50 Arena Tokens` for `480 💎 Starlight Gems` and Arena gear rewards.
  - **Tab 4 (`🎖️ Guild Treasury`)**: Exchange `100 Guild Medals` for `Exotic Voidweaver Core Sigil (+6)`.
  - Wire shop shortcuts in Summon, Arena, and Guild Raid to open `Merchant Hub` directly on the matching tab.

## 4. Natural Elemental Counter Cycle & `<ElementalWheelBadge />` SVG
- **`src/engine/combatEngine.ts`**:
  - Update `PRIMARY_ADVANTAGE_MAP` and `getRecommendedCounterElement` to the natural 4-element cycle:
    - **`🔥 Fire > ❄️ Cryo > 🌪️ Wind > ⚡ Electro > 🔥 Fire`**
    - **`☀️ Light ↔ 🌑 Dark`** (mutual `+30% DMG`, `+25% Break Power`, `+15% Crit Rate`).
- **`src/components/ResonatorArtAndWiki.tsx` & `src/App.tsx`**:
  - Create `<ElementalWheelBadge activeBossElement={...} />` rendering a crisp SVG 4-element directional ring + Light/Dark dual-axis badge, highlighting the active enemy's element and its recommended counter element. Display in the top-right of the battlefield HUD and in the Squad Deployment / Heroes header.

## 5. Tarot 3-Card 3D Flip Reveal & 5-Zone 4-Layer Swappable Parallax Battlefield
- **Every-5-Floor Tarot 3-Card Flip (`src/App.tsx`)**:
  - Start all 3 Tarot cards face-down (`flippedCards: [false, false, false]`) showing an ornate **Astral Pixel Card Back** (`32×40` pixel art back or SVG gold-violet celestial pattern) + **`[✨ REVEAL ALL 3 CARDS]`** button.
  - Clicking a face-down card flips it (`rotateY(180deg)` 3D CSS perspective transition) to reveal the full-bleed `32×40` 16-Bit Pixel Art illustration and blessing description; clicking a face-up card selects that blessing (`[SELECT BLESSING]`).
  - When the AFK countdown timer reaches `<= 2.0s`, automatically flip all 3 cards face-up; at `0.0s`, automatically select Card #1.
- **5-Zone Swappable Parallax Battlefield (`src/engine/pixelRenderer.ts`)**:
  - Export `ZONE_PARALLAX_ASSETS` with 5 zone slots (`Zone 0` to `Zone 4`), each supporting optional `HTMLImageElement | null` overrides for `{ skyImg, farBgImg, midArchImg, floorImg }` plus a helper `setZoneParallaxAsset(zoneIdx, layer, imageUrl)`.
  - Compute `zoneIdx = Math.min(4, Math.floor((floor - 1) / 20))` in `renderBattlefieldCanvas` (pass `floor` into `renderBattlefieldCanvas`) and render 4 distinct parallax layers (`0.1x Sky`, `0.35x Far BG`, `0.65x Mid Arch & Weather Particles`, `1.0x Foreground Battle Floor`):
    - **Zone 0 (F1–20)**: `Starfall Forest Base` (bioluminescent pines, cyan glowing mushrooms, fireflies, ancient rune stones)
    - **Zone 1 (F21–40)**: `Stormcrag Frost Peaks` (jagged snow peaks, drifting mist, braziers, purple lightning)
    - **Zone 2 (F41–60)**: `Aether Cloudsea Sanctum` (golden cloudsea temple, floating sanctuary arches, celestial rays)
    - **Zone 3 (F61–80)**: `Astral Stratosphere Orbit` (curved planetary horizon, Saturn-like astral rings, drifting meteors)
    - **Zone 4 (F81–100+)**: `Abyssal Singularity Summit` (deep-space violet-gold black hole accretion vortex, floating runic obelisks)

## 6. Hook Fixes & Codebase Cleanup
- **Gambit `BOSS_STAGGER_OPEN`**: Remove `&& hero.id === 'H04'` in `canFireGambitChain` (`src/App.tsx`) so any Resonator configured with `BOSS_STAGGER_OPEN` can trigger their Chain skill when the boss Stagger gauge is open.
- **Tarot Blessing Hooks (`src/engine/combatEngine.ts` & `src/App.tsx`)**:
  - `ARCANA_07 (The Chariot)`: Team SPD `+12% / +20% / +35%`
  - `ARCANA_08 (Strength)`: Team Break Power `+20% / +35% / +60%`
  - `ARCANA_09 (The Hermit)`: Frontline wave-start Shield (`20% / 25% / 45% Max HP`) + `20%` Thorns damage reflection
  - `ARCANA_10 (Wheel of Fortune)`: Team Crit Rate (`+12% / +15% / +30%`) & Crit DMG (`+25% / +40% / +75%`)
  - `ARCANA_16 (The Tower)`: Breaking 1 Boss Stagger bar triggers a `100% / 150% / 250%` Boss ATK explosion on all boss parts
  - `ARCANA_17 (The Star)`: Wave-start Ultimate Energy `+25% / +30% / +60%`
  - `ARCANA_20 (Judgement)`: While Boss is Staggered, all allies deal `+35% / +60% / +100%` bonus DMG
  - `ARCANA_21 (The World)`: Casting an Ultimate has `25% / 35% / 60%` chance to immediately refund `50%` Energy
- **Delete Unused File**: Delete `/src/components/VoxelScene3D.tsx` via `delete_file`.

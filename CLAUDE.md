# 🌌 CHRONO SPIRE: STARFALL PROTOCOL — MASTER GAME DESIGN DOCUMENT (GDD v3.0)
**Single Source of Truth (SSOT) for Claude Code (Web Prototype & Godot 4.x Engine Migration)**

---

## 🎯 SECTION 0: CLAUDE STARTER PROMPT & VISUAL/THEME GUARDRAILS (ห้ามหลุดธีมเด็ดขาด)

> **Copy-Paste Starter Prompt สำหรับสั่งงาน Claude ตอนเริ่มโปรเจกต์หรือเปิด Session ใหม่:**
>
> ```text
> You are the Lead Game Architect for "Chrono Spire: Starfall Protocol", a Dark Cosmic Fantasy HD-2D Pixel Art Tactical Auto-Battler RPG.
> Before writing or modifying any code, read this entire GDD (CLAUDE.md / GDD v3.0) as your strict Single Source of Truth (SSOT).
>
> STRICT THEME & DESIGN GUARDRAILS (NEVER VIOLATE):
> 1. VISUAL THEME: Dark Cosmic Fantasy / Eldritch Astral Gothic (16-Bit HD-2D Pixel Art with crisp nearest-neighbor filtering, deep obsidian-slate UI `#090d16`, antique gold `#f59e0b` & astral cyan/crimson accents, dynamic bloom/glow, and 4-layer parallax environments). Never use generic bright mobile cartoon UI or blurry bilinear scaling on pixel art.
> 2. IN-GAME LANGUAGE: 100% English for all in-game UI labels, skill names, combat floaters, and tooltips.
> 3. ZERO CONTRADICTIONS:
>    - Elemental Counter Loop is strictly: Fire > Cryo > Wind > Electro > Fire, and Light <-> Dark (mutual +30% DMG).
>    - Hero Ascension uses ONLY Character Duplicate Shards (`heroShards[heroId]`), NEVER Starlight Gems. Stars progress from 1★–5★ Gold (`star_gold.webp`) to A1★–A5★ Awakened (`star_awakened.webp`, 6★–10★ total).
>    - Weapons are strictly Role-Restricted across 3 weapon archetypes (`MELEE`, `RANGED`, `MAGIC`) with a 16x16 Role Badge in the top-left corner of every weapon slot. Forge 900G crafting is permanently removed.
>    - Major Arcana Tarot Blessings have a SINGLE flat potency tier (no Tier I/II/III) and last strictly for the NEXT 5 FLOORS ONLY (`expiresAtFloor = currentFloor + 5`, non-stacking).
>    - Every floor clear triggers a 2.8-second `WAVE_TRANSITION` party march (4.0x parallax scroll + running bob) before spawning the next floor.
> 4. ASSET INTEGRITY: Always load the 99 pre-generated transparent `.webp` assets from `/assets/` (or `res://assets/` in Godot 4) using nearest-neighbor (`pixelated`) rendering.
> ```

---

## 🏛️ SECTION 1: GAME OVERVIEW, CORE LOOP & ART DIRECTION

### 1.1 High-Concept Pitch
- **Title:** Chrono Spire: Starfall Protocol
- **Genre:** Tactical Party-Based Semi-Idle / Auto-Battler RPG with Programmable 2-Slot Gambit AI, 9 Elemental Reactions, Multi-Part Eldritch Bosses, and Roguelite Constellation/Tarot Progression.
- **Setting & Lore:** The **Chrono Spire** stands at the center of the world, sealing away the **Old Gods (Azathoth & Yog-Sothoth)**. When the seal fractured, **Mental Corruption** pulled all **6 Continents** into overlapping spatial strata inside the Spire. Players command a 5-Resonator squad, ascending the Spire and invoking **Chrono Rewind** to convert temporal collapse into permanent Constellation power.

### 1.2 Art Direction & Palette Lock (ป้องกันเกมหลุดธีม)
- **Aesthetic Style:** 16-Bit HD-2D Pixel Art (`Octopath Traveler` / Dark Eldritch Fantasy vibe) paired with sleek Frosted Obsidian Glass HUD (`#090d16` / `#0f172a` backgrounds, `#f59e0b` gold borders, `#38bdf8` astral blue, `#f43f5e` crimson).
- **Pixel Rendering Rule:** Every `.webp` sprite, icon, tarot card, and parallax layer MUST use `image-rendering: pixelated` (Web) or `TEXTURE_FILTER_NEAREST` (Godot 4).
- **Camera & Combat Feel:** Fixed 2.5D Side-View battle arena (Player 5-hero formation on the left, enemies/multi-part Old God boss on the right) with **60ms Hitstop** on critical/break hits, **Camera Shake**, **Damage/Reaction Popups**, and **Physical Loot Drop with Rarity Light Pillars**.

### 1.3 Core Gameplay Loop
1. **Climb the Spire:** Fight 4 Corridor Waves (`F1–F4`, `F6–F9`) + 1 Multi-Part Boss Floor every 5th floor (`F5, F10, F15...`).
2. **2.8s Wave March:** Upon clearing each floor, the 5 heroes run forward for `2.8s` while the 4-layer Parallax background scrolls at `4.0x` speed before the next floor spawns.
3. **5-Floor Tarot Blessing:** Defeating a Boss every 5 floors presents 3 face-down Major Arcana Tarot cards. Hold-to-charge (`Hold-to-Flip 3D`) to reveal and pick 1 blessing that buffs the party for the **next 5 floors only**.
4. **Sanctuaries & Farming:** Spend regenerating **Weekly Keys (`15/15`)** and **Sweep Tickets (`15,000 Gold`)** in **5-Tier Domains** to farm Role-Restricted 8-Set Relics, challenge the **1v1 Async Arena**, or fight the **90s Guild Raid Boss (Yog-Sothoth)**.
5. **Chrono Rewind (Prestige):** When progress stalls at a high floor, trigger **Chrono Rewind** to earn **Time Shards** and unlock permanent nodes across the **13 Zodiac Constellations (287 Stars)**.

---

## 👥 SECTION 2: COMPLETE 27-RESONATOR ROSTER, ROLES & SHARD ASCENSION

### 2.1 5 Combat Roles & 6 Elements
- **5 Combat Roles (แสดงด้วยไอคอน `/assets/ui/role_*.webp`):**
  1. `Melee DPS` (`/assets/ui/role_melee.webp`) — Frontline physical/elemental striker
  2. `Ranged DPS` (`/assets/ui/role_ranged.webp`) — Backline artillery & multi-hit carry
  3. `Tank / Breaker` (`/assets/ui/role_tank.webp`) — Frontline shielder, taunter & Stagger Gauge breaker
  4. `Support & Healer` (`/assets/ui/role_healer.webp`) — Divided into **Single-Target Burst Lifesavers** and **Party-Wide AoE Healers**
  5. `Debuffer` (`/assets/ui/role_debuffer.webp`) — Elemental status applier (`Effect Hit Rate`) & reaction primer
- **6 Elements & Canonical Counter Loop (แสดงด้วยไอคอน `/assets/ui/elem_*.webp`):**
  - **4-Element Cycle:** `🔥 Fire > ❄️ Cryo > 🌪️ Wind > ⚡ Electro > 🔥 Fire`
  - **2-Element Astral Duality:** `☀️ Light ↔ 🌑 Dark` (Mutual weakness against each other)
  - **Counter Multiplier (`WEAK!`):** `1.30x Final DMG (+30%)`, `1.25x Break Power (+25%)`, `+15% Crit Rate`
  - **Resist Multiplier (`RESIST`):** `0.80x Final DMG (-20%)`, `0.85x Break Power (-15%)`

### 2.2 Starter 5 Rare (`R`) Heroes (Unlocked Free from Minute 1)
All new accounts start with these **5 Starter `R` (1★ Gold) Heroes** unlocked (`unlocked: true`) and deployed as the initial 5-hero squad:

| ID | Name | Rarity | Element | Role | Row | Base HP (L1➔L100) | Base ATK (L1➔L100) | Base DEF (L1➔L100) | SPD | Signature Role Summary |
| :--- | :--- | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **R01** | **Vanguard Guard** | R (1★) | 🔥 Fire | Tank / Breaker | Front | 1,350 ➔ 18,900 | 95 ➔ 1,330 | 105 ➔ 1,470 | 94 | Frontline shield & Burn taunter |
| **R02** | **Gale Archer** | R (1★) | 🌪️ Wind | Ranged DPS | Back | 920 ➔ 12,880 | 132 ➔ 1,848 | 58 ➔ 812 | 112 | Backline Wind arrow volley & Bleed |
| **R03** | **Frost Acolyte** | R (1★) | ❄️ Cryo | Debuffer | Back | 940 ➔ 13,160 | 125 ➔ 1,750 | 60 ➔ 840 | 103 | Cryo Chilled/Freeze primer |
| **R04** | **Dawn Cleric** | R (1★) | ☀️ Light | Support & Healer | Back | 1,050 ➔ 14,700 | 110 ➔ 1,540 | 72 ➔ 1,008 | 100 | Starter single/party light healer |
| **R05** | **Shadow Blade** | R (1★) | 🌑 Dark | Melee DPS | Front | 1,020 ➔ 14,280 | 140 ➔ 1,960 | 64 ➔ 896 | 114 | Fast frontline Dark assassin |

### 2.3 Complete 22 Gacha Heroes (`15 SSR + 7 SR` — Start Locked `unlocked: false`)
All `SR` (start at `2★ Gold`) and `SSR` (start at `3★ Gold`) heroes begin locked and are obtained via Gacha Summon or Starfall Exchange:

| ID | Name | Rarity | Element | Role | Row | Base HP (L1➔L100) | Base ATK (L1➔L100) | Base DEF (L1➔L100) | SPD | Tactical Identity & Core Kit |
| :--- | :--- | :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **H01** | **Kallen Vermillion** | SSR | 🔥 Fire | Melee DPS | Front | 1,250 ➔ 18,125 | 165 ➔ 2,392 | 75 ➔ 1,087 | 108 | Frontline 2-target cleave, -15% Boss DEF, Meltdown detonator |
| **H02** | **Ignis Vance** | SSR | 🔥 Fire | Ranged DPS | Back | 1,080 ➔ 15,660 | 172 ➔ 2,494 | 64 ➔ 928 | 101 | AoE Magitek artillery, high Burn application |
| **H03** | **Pyra** | SR | 🔥 Fire | Tank / Breaker | Front | 1,520 ➔ 22,040 | 112 ➔ 1,624 | 112 ➔ 1,624 | 95 | Flame tank, reflects DMG & inflicts Burn when hit |
| **H04** | **Caelum Vance** | SSR | ⚡ Electro | Tank / Breaker | Front | 1,680 ➔ 24,360 | 115 ➔ 1,667 | 120 ➔ 1,740 | 96 | Heavy 120 BP Stagger breaker, Taunt & magnetic shield |
| **H05** | **Raiden Thorne** | SSR | ⚡ Electro | Ranged DPS | Back | 1,090 ➔ 15,805 | 168 ➔ 2,436 | 66 ➔ 957 | 118 | Multi-bounce lightning spear, self SPD acceleration |
| **H06** | **Sparky** | SR | ⚡ Electro | Debuffer | Back | 1,020 ➔ 14,790 | 138 ➔ 2,001 | 68 ➔ 986 | 112 | High-proc Shock applier for Superconduct/Overload |
| **H07** | **Yuzuki Hoshino** | SSR | ❄️ Cryo | Debuffer | Back | 1,050 ➔ 15,225 | 145 ➔ 2,102 | 65 ➔ 942 | 104 | AoE Freeze (2.0s) & -25% Enemy Effect RES |
| **H08** | **Freya Wintergard** | SSR | ❄️ Cryo | Melee DPS | Front | 1,290 ➔ 18,705 | 162 ➔ 2,349 | 80 ➔ 1,160 | 106 | Cryo Valkyrie, +50% Crit DMG against Frozen targets |
| **H09** | **Frostguard Olin** | SR | ❄️ Cryo | Tank / Breaker | Front | 1,580 ➔ 22,910 | 108 ➔ 1,566 | 118 ➔ 1,711 | 94 | Ice barrier protector absorbing backline damage |
| **H10** | **Kahori Amakusa** | SSR | 🌪️ Wind | Melee DPS | Front | 1,120 ➔ 16,240 | 158 ➔ 2,291 | 68 ➔ 986 | 125 | Fastest SPD (125), backline dive & 5-stack Bleed burst |
| **H11** | **Zephyr Gale** | SSR | 🌪️ Wind | Ranged DPS | Back | 1,060 ➔ 15,370 | 164 ➔ 2,378 | 64 ➔ 928 | 119 | Piercing Wind bow & enemy ATK reduction |
| **H12** | **Gale Swift** | SR | 🌪️ Wind | Support & Healer | Back | 1,210 ➔ 17,545 | 124 ➔ 1,798 | 78 ➔ 1,131 | 120 | Team SPD +20% & Break Power buffer + light heal |
| **H13** | **Aurelia Solis** | SSR | ☀️ Light | Support & Healer | Back | 1,380 ➔ 20,010 | 130 ➔ 1,885 | 88 ➔ 1,276 | 102 | Hybrid Shield Healer (20% Max HP barrier + Cheat Death) |
| **H14** | **Solarius Vance** | SSR | ☀️ Light | Tank / Breaker | Front | 1,720 ➔ 24,940 | 114 ➔ 1,653 | 124 ➔ 1,798 | 95 | Solar Paladin converting absorbed DMG into party heal |
| **H15** | **Lumina** | SR | ☀️ Light | Ranged DPS | Back | 1,040 ➔ 15,080 | 148 ➔ 2,146 | 62 ➔ 899 | 110 | Applies Luminous Mark & buffs team Crit Rate |
| **H16** | **Noctis Ravenlock** | SR | 🌑 Dark | Ranged DPS | Back | 980 ➔ 14,210 | 152 ➔ 2,204 | 58 ➔ 841 | 115 | Single-target executioner (1,050% ATK Ultimate) |
| **H17** | **Malakor the Fallen** | SSR | 🌑 Dark | Melee DPS | Front | 1,420 ➔ 20,590 | 170 ➔ 2,465 | 82 ➔ 1,189 | 105 | Low-HP Berserker dealing True DMG below 35% HP |
| **H18** | **Vespera Shadowveil** | SSR | 🌑 Dark | Debuffer | Back | 1,110 ➔ 16,095 | 146 ➔ 2,117 | 70 ➔ 1,015 | 109 | Abyssal Corrosion zone (-20% Boss ATK & DEF shred) |
| **H19** | **Seraphina Vale** | SSR | ❄️ Cryo | Support & Healer | Back | 1,410 ➔ 20,445 | 136 ➔ 1,972 | 86 ➔ 1,247 | 106 | **Single-Target Burst Healer:** Active 240%➔360% ATK single heal + cleanse + 20% Shield; Gambit 280%➔420% emergency heal + 2.5s Frost Immortality; Ult 350%➔520% single heal + 2.0s AoE Freeze |
| **H20** | **Sylvanus Faye** | SSR | 🌪️ Wind | Support & Healer | Back | 1,450 ➔ 21,025 | 132 ➔ 1,914 | 90 ➔ 1,305 | 108 | **Full-Party AoE Healer:** Active 150%➔225% ATK 5-ally heal + 6% HP/s Regen (4s); Gambit 165%➔245% AoE heal + 15% SPD; Ult 220%➔330% AoE heal + full party cleanse + 25% Overheal Shield |
| **H21** | **Carmilla Vane** | SSR | 🔥 Fire | Support & Healer | Back | 1,340 ➔ 19,430 | 142 ➔ 2,059 | 82 ➔ 1,189 | 107 | **Single-Target Offensive Healer:** Active 260%➔390% ATK single heal on lowest-HP ally + grants target +35% ATK & +40% Crit DMG for 5.0s |
| **H22** | **Celeste Noel** | SR | ❄️ Cryo | Support & Healer | Back | 1,260 ➔ 18,270 | 122 ➔ 1,769 | 78 ➔ 1,131 | 104 | **SR Party AoE Healer:** Active 130%➔195% ATK 5-ally heal + grants +25% Effect RES for 4.0s |

### 2.4 Character Duplicate Shard Ascension (`1★–5★ Gold` ➔ `A1★–A5★ Awakened`)
- **CRITICAL RULE:** Ascending a hero **NEVER costs Starlight Gems**. It strictly consumes **that hero's Duplicate Shards (`heroShards[heroId]`)**.
- **Duplicate Shard Grants on Gacha Pull:**
  - Duplicate `R` Hero = `+15 Shards` of that hero
  - Duplicate `SR` Hero = `+30 Shards` of that hero
  - Duplicate `SSR` Hero = `+50 Shards` of that hero
- **10-Tier Star Progression (5 Gold Stars `star_gold.webp` ➔ 5 Awakened Stars `star_awakened.webp`):**
  - **Phase 1 — Gold Stars (`starTier 1..5`, rendered with 1 to 5 `/assets/ui/star_gold.webp` icons):**
    - `1★ ➔ 2★`: Costs **`20 Shards`** (`+12% Base HP/ATK/DEF`)
    - `2★ ➔ 3★`: Costs **`40 Shards`** (`+15% Base HP/ATK/DEF` & Passive Tier 2)
    - `3★ ➔ 4★`: Costs **`80 Shards`** (`+18% Base HP/ATK/DEF`)
    - `4★ ➔ 5★`: Costs **`120 Shards`** (`+25% Base HP/ATK/DEF` & Ultimate Tier 2)
  - **Phase 2 — Awakened Supernova Stars (`starTier 6..10` [Awakened `A1★..A5★`], converting Gold Stars one-by-one from left to right into `/assets/ui/star_awakened.webp`):**
    - `5★ ➔ A1★ (6★)`: Costs **`150 Shards`** (`+20% All Stats` • Displays `1 Awakened Star + 4 Gold Stars`)
    - `A1★ ➔ A2★ (7★)`: Costs **`180 Shards`** (`+22% All Stats` • Displays `2 Awakened Stars + 3 Gold Stars`)
    - `A2★ ➔ A3★ (8★)`: Costs **`220 Shards`** (`+25% All Stats` • Displays `3 Awakened Stars + 2 Gold Stars`)
    - `A3★ ➔ A4★ (9★)`: Costs **`260 Shards`** (`+28% All Stats` • Displays `4 Awakened Stars + 1 Gold Star`)
    - `A4★ ➔ A5★ (10★ MAX)`: Costs **`300 Shards`** (`+35% All Stats` • Displays **all 5 `star_awakened.webp` icons**!)
- **UI Representation (Mockup Character Shard Component):**
  - **Heroes Tab Button:** Render **`[⭐ Ascend X★ (currentShards/requiredShards)]`** (or **`[🌟 Awaken AX★ (currentShards/requiredShards)]`** for tiers 6–10).
  - **Inventory Bag `[🧩 Hero Shards]` Tab:** Render a dedicated filter tab in the Inventory Bag showing all owned hero shards using a **Mockup Character Shard Card** (Element-colored crystal frame + `/assets/ui/elem_*.webp` emblem + Hero initials + `currentShards / requiredShards`).

---

## ⚔️ SECTION 3: COMBAT ENGINE, 2-SLOT GAMBIT AI & 9 ELEMENTAL REACTIONS

### 3.1 Combat Power (`Hero CP` & `Squad CP`) Formulas
- **`Base & Gear Score`** = `(MaxHP * 0.2) + (ATK * 2.5) + (DEF * 2.0) + (SPD * 8)`
- **`Multiplier Factor`** = `1 + (CritRate * 0.8) + ((CritDMG - 1.5) * 0.4) + ((BreakPower - 1.0) * 0.5) + ((EnergyCharge - 1.0) * 0.5) + (EffectHitRate * 0.5)`
- **`Flat Skill & Set Score`** = `(Sum of 4 Skill Levels * 180) + (2-PC Set: +600) + (4-PC Set: +1,500) + (Exotic Core Sigil: +1,200)`
- **`Hero CP`** = `round((Base & Gear Score * Multiplier Factor) + Flat Skill & Set Score)`
- **`Squad CP`** = `Sum of 5 Deployed Heroes' CP + (Formation Mastery Level * 750)`

### 3.2 4+1 Skill Kit & Status Proc Math
1. **Basic Attack (`Interval = 115 / SPD` sec):** `100% ➔ 145% ATK` | `15 BP` | `+4% Ultimate Energy` | `10% Base Status Chance` (cannot proc Freeze).
2. **Active Skill (`CD 7.0s–8.0s`):** `220% ➔ 340% ATK` | `40 BP` | Base Status Chance: `35% (Lv.1) ➔ 55% (Lv.10)` (`Freeze`: `25% ➔ 40%`).
3. **Tactical Chain Skill (`2-Slot Gambit AI`, `CD 8.0s–11.0s`):** `320% ➔ 480% ATK` | `60–120 BP` | Detonates Elemental Reactions.
4. **Ultimate Skill (`100 Energy`):** `580% ➔ 850% AoE ATK` (or `1,050% Single-Target`) | `150 BP` | Base Status Chance: `65% ➔ 80%`.
- **Total Status Proc Formula:** `Total Proc% = Base Skill Proc% + Gear Effect Hit Rate% - Target Effect RES%` (Max Skill `55%` + Ring/Sigil `+25%` + 2-PC Voidweaver `+20%` = `100% Guaranteed Proc`).

### 3.3 2-Slot Autonomous Gambit Priority System
Each hero configures 2 Gambit Trigger Slots evaluated in real time when their Tactical Chain Skill is off cooldown:
- **Slot 1 (Primary Emergency / Tactical Trigger — Priority #1):**
  - `ALLY_HP_BELOW_50`: Trigger immediately when any ally drops below `50% HP` (Default for Healers/Shielders).
  - `BOSS_STAGGER_OPEN`: Trigger when Boss is `STAGGERED` (`+50% DMG window`).
  - `BOSS_CHARGING_SUPERNOVA`: Trigger when Boss is charging a lethal AoE cast to break Stagger in time.
  - `BOSS_SHIELD_ACTIVE`: Trigger when Boss has an active barrier.
- **Slot 2 (Elemental Reaction Detonator — Priority #2):**
  - `TARGET_HAS_BURN`, `TARGET_HAS_CRYO`, `TARGET_HAS_SHOCK`, `TARGET_HAS_BLEED`, `TARGET_HAS_LUMINOUS`, `TARGET_HAS_CORROSION`, or `ALWAYS_ON_COOLDOWN`.

### 3.4 Complete 9-Elemental Reaction Matrix (Consumes Target Status on Detonation)
When a Gambit Chain Skill or elemental hit strikes a target carrying a prerequisite elemental status, it **consumes that status immediately** and triggers one of the 9 canonical reactions:

| Primer Status + Detonator Element | Reaction Name | Exact Combat Effect |
| :--- | :--- | :--- |
| **❄️ Cryo + 🔥 Fire (or vice versa)** | **MELTDOWN** | Deals `1.8x Burst DMG` (can Crit) and inflicts `Defenseless (-25% DEF for 4.0s)` |
| **❄️ Cryo + ⚡ Electro** | **SUPERCONDUCT** | Deals `+80 BP Instant Stagger DMG` and grants party `+35% Break Power for 4.0s` |
| **🔥 Fire + 🌪️ Wind** | **FIRESTORM** | 3-hit fiery tempest spreading `Burn + Bleed` and restoring `+10 Ultimate Energy` to all 5 allies |
| **🔥 Fire + ⚡ Electro** | **OVERLOAD PLASMA** | Interrupts enemy cast animation immediately and deals `220% ATK AoE Electro DMG` |
| **❄️ Cryo + 🌪️ Wind** | **BLIZZARD** | Extends Freeze/Chill and reduces enemy `SPD by -30% for 4.0s` |
| **⚡ Electro + 🌪️ Wind** | **THUNDER GALE** | Chain lightning across all enemies, dealing `+15% bonus DMG per Bleed stack` |
| **☀️ Light + 🌑 Dark** | **TWILIGHT EXECUTION** | Ignores `40% DEF` normally; converts to `100% True DMG` if target HP is below `25%` |
| **☀️ Light + Any 4 Core Elements** | **RADIANT INFUSION** | Cleanses 1 debuff from all allies and heals the entire party for `8% Max HP` |
| **🌑 Dark + Any 4 Core Elements** | **ABYSSAL DECAY** | Corrodes the target, extending active debuff durations by `+2.0s` and dealing `140% Dark DMG` |

---

## 🗡️ SECTION 4: 5-SLOT EQUIPMENT, 44 ROLE-RESTRICTED GEARS & INVENTORY BAG

### 4.1 5 Equipment Slots & Role-Restricted Weapons (No Forge Crafting)
- **Zero Gold Crafting Rule:** Equipment can NEVER be crafted with Gold. Gear drops exclusively from **5-Tier Domains**, **Spire Bosses**, **Gacha Non-Hero Pulls (3★–4★ Relics)**, and **Merchant Hub Exchanges**.
- **Slot 1 — Role-Restricted Weapon (`Flat ATK` Main Stat + 16×16 Role Badge at Top-Left):**
  Every equipment set has **3 distinct Weapon Types** (`24 Weapons` total across 8 sets):
  1. **`MELEE Weapon` (`/assets/gear/<set>_weapon_melee.webp`):** Wearable ONLY by `Melee DPS` and `Tank / Breaker` heroes (shows `/assets/ui/role_melee.webp` badge).
  2. **`RANGED Weapon` (`/assets/gear/<set>_weapon_ranged.webp`):** Wearable ONLY by `Ranged DPS` heroes (shows `/assets/ui/role_ranged.webp` badge).
  3. **`MAGIC Weapon` (`/assets/gear/<set>_weapon_magic.webp`):** Wearable ONLY by `Support & Healer` and `Debuffer` heroes (shows `/assets/ui/role_healer.webp` badge).
- **Slot 2 — Armor (`Flat HP + Flat DEF`):** Wearable by all roles (`/assets/gear/<set>_armor.webp`).
- **Slot 3 & Slot 4 — Ring I & Ring II (`Universal Ring Pool`):** Wearable by all roles (`/assets/gear/<set>_ring.webp`). Can roll `ATK%`, `Crit Rate%`, `Crit DMG%`, `Max HP%`, `DEF%`, `Break Power%`, `Effect Hit Rate%`, `Healing Bonus%` (Double-stacking identical stats on both rings is allowed).
- **Slot 5 — Exotic Core Sigil (Set-Independent 5th Slot):** Wearable by all roles (`/assets/gear/sigil_*.webp`).

### 4.2 Complete 8 Equipment Sets (`2-PC` & `4-PC` Bonuses)
| Set ID | Set Name | Drop Domain | 2-PC Bonus | 4-PC Bonus | Asset Prefix (`/assets/gear/`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **Starfall Executioner** | Striker Sanctum | `Crit Rate +15%` | `Crit DMG +35%` & Crits ignore `15% DEF` | `starfall_` |
| **2** | **Astral Nexus** | Astral Observatory | `Tactical Chain DMG +25%` | Casting Chain Skill buffs party `ATK +15% (4s)` | `astral_` |
| **3** | **Eclipse** | Astral Observatory | `Break Power +25%` | `+60% Ultimate Crit DMG` against Staggered targets | `eclipse_` |
| **4** | **Overload** | Striker Sanctum | `Energy Charge +20%` | Casting Ultimate immediately refunds `25% Energy` | `overload_` |
| **5** | **Titan** | Bastion Foundry | `Max HP +20%` | Wave start grants `20% Max HP Shield` & `-15% DMG Taken` | `titan_` |
| **6** | **Volatus** | Striker Sanctum | `SPD +12%` | Every 3rd Basic Attack fires a `80% ATK True DMG` wind slash | `volatus_` |
| **7** | **Radiant Dawn** | Bastion Foundry | `Healing Bonus +25%` | Overheal converts to Shield & buffs healed ally `ATK +15% (4s)` | `radiant_` |
| **8** | **Voidweaver (Omen)** | Astral Observatory | `Effect Hit Rate +20%` | Elemental Reaction & DoT DMG `+40%` (pierces barriers) | `voidweaver_` |

### 4.3 4 Exotic Core Sigils (Slot 5)
1. **Exotic Chrono Sprint Sigil (`sigil_chrono_sprint.webp`):** Main `Break Power +19.5%` | **Trait:** Wave start grants `+15 SPD` for `6.0s`.
2. **Exotic Aetherial Heart Sigil (`sigil_aetherial_heart.webp`):** Main `Energy Charge +24.0%` | **Trait:** Breaking a Boss Stagger bar heals the entire party for `10% Max HP`.
3. **Exotic Cataclysmic Core Sigil (`sigil_cataclysmic_core.webp`):** Main `All-Element DMG +18.0%` | **Trait:** Elemental Reactions gain `+20% Crit Rate`.
4. **Exotic Immortal Bulwark Sigil (`sigil_immortal_bulwark.webp`):** Main `SPD +14` | **Trait:** When frontline HP drops below `30%`, grants an emergency `25% Max HP Shield` (`20s CD`).

### 4.4 `+0 to +15` Artisan Fail-Stack Enhancement & 100% Borderless Bag Dragging
- **Zero Break / Zero Downgrade:** Enhancing from `+0` to `+15` never destroys or downgrades an item. Failed attempts accumulate permanent **Fail Stack Pity (`+8.5% to +12.5%` per fail)** until the next tier succeeds, unlocking/upgrading 1 of 4 Substats every 3 levels (`+3, +6, +9, +12, +15 Masterwork`).
- **Inventory Bag (`All / Weapon / Armor / Ring I / Ring II / Sigil / 🧩 Hero Shards`):**
  - Supports **Click-to-Compare & Equip** AND **100% Borderless Floating Sprite Drag-and-Drop** (hides default browser drag box via `1x1` transparent canvas / custom Godot drag preview so only the crisp pixel weapon/armor/ring floats under the cursor).

---

## 🃏 SECTION 5: 22 MAJOR ARCANA TAROT BLESSINGS (SINGLE-TIER, 5-FLOOR DURATION & 3D HOLD-TO-FLIP)

### 5.1 Core Tarot Rules
- **Trigger:** Appears after defeating every 5th-floor Boss (`F5, F10, F15...`).
- **Hold-to-Charge 3D Card Flip:** Displays 3 face-down Tarot cards (`/assets/tarot/card_back.webp`). Players **press and hold (`Hold-to-Flip`)** on a card to charge the 3D tilt, shake with golden particles, and snap `180°` face-up (or click `[✨ Reveal All]`).
- **Single Flat Tier & Non-Stacking 5-Floor Duration:**
  - Every Tarot card has **1 unified potency value** (NO Tier I/II/III).
  - The chosen Tarot card stays active **strictly for the next 5 floors (`expiresAtFloor = currentFloor + 5`)** and is replaced when choosing the next Boss Tarot card (prevents infinite runaway stat stacking).

### 5.2 Complete 22 Major Arcana Tarot Table (`arcana_00.webp` – `arcana_21.webp`)
| ID | File (`/assets/tarot/`) | Arcana Name | Unified 5-Floor Blessing Effect |
| :--- | :--- | :--- | :--- |
| `ARCANA_00` | `arcana_00.webp` | **0. The Fool** | At the start of each floor, grants a random `+40% ATK`, `+40% Crit DMG`, or `+40% Break Power` buff |
| `ARCANA_01` | `arcana_01.webp` | **I. The Magician** | Increases party `Effect Hit Rate +25%` and `Elemental Reaction DMG +40%` |
| `ARCANA_02` | `arcana_02.webp` | **II. The High Priestess** | Increases `Healing Bonus +30%` and shielded allies gain `+20% Energy Charge` |
| `ARCANA_03` | `arcana_03.webp` | **III. The Empress** | Increases party `Max HP +25%` and restores `30% HP` after clearing each floor |
| `ARCANA_04` | `arcana_04.webp` | **IV. The Emperor** | Frontline allies gain `+35% DEF` and take `-20% DMG` from Boss AoE attacks |
| `ARCANA_05` | `arcana_05.webp` | **V. The Hierophant** | Increases `Tactical Chain Skill (Gambit) DMG +35%` |
| `ARCANA_06` | `arcana_06.webp` | **VI. The Lovers** | Doubles active Elemental Resonance Squad Synergy bonuses (`2.0x`) |
| `ARCANA_07` | `arcana_07.webp` | **VII. The Chariot** | Increases party `SPD +22` |
| `ARCANA_08` | `arcana_08.webp` | **VIII. Strength** | Increases party `Break Power +35%` against Stagger Gauges |
| `ARCANA_09` | `arcana_09.webp` | **IX. The Hermit** | Frontline gains a `25% Max HP Shield` at wave start and reflects `25% DMG` |
| `ARCANA_10` | `arcana_10.webp` | **X. Wheel of Fortune** | Increases party `Crit Rate +15%` and `Crit DMG +40%` |
| `ARCANA_11` | `arcana_11.webp` | **XI. Justice** | Attacks against `Defenseless` or debuffed targets ignore `25% DEF` |
| `ARCANA_12` | `arcana_12.webp` | **XII. The Hanged Man** | Allies below `35% HP` gain `+55% ATK` and `+20% Lifesteal` |
| `ARCANA_13` | `arcana_13.webp` | **XIII. Death** | Deals `+35% bonus True DMG` against enemies below `25% HP` |
| `ARCANA_14` | `arcana_14.webp` | **XIV. Temperance** | Extends all elemental status durations on enemies by `+2.0s` |
| `ARCANA_15` | `arcana_15.webp` | **XV. The Devil** | Increases party `ATK +45%` at the cost of `-10% Max HP` |
| `ARCANA_16` | `arcana_16.webp` | **XVI. The Tower** | Breaking a Boss Stagger bar triggers an instant `180% ATK` explosion |
| `ARCANA_17` | `arcana_17.webp` | **XVII. The Star** | Allies start each floor with `+35% initial Ultimate Energy` |
| `ARCANA_18` | `arcana_18.webp` | **XVIII. The Moon** | Ranged & backline-targeting skills deal `+40% Piercing DMG` |
| `ARCANA_19` | `arcana_19.webp` | **XIX. The Sun** | Increases party `ATK +25%` and Basic Attacks have a `25% chance` to inflict `Burn` |
| `ARCANA_20` | `arcana_20.webp` | **XX. Judgement** | Increases all party DMG against `STAGGERED` bosses by `+65%` |
| `ARCANA_21` | `arcana_21.webp` | **XXI. The World** | Casting an Ultimate has a `35% chance` to refund `50% Ultimate Energy` |

---

## 🏰 SECTION 6: SPIRE BOSSES, 5-ZONE PARALLAX ARENA, SANCTUARIES HUB & MERCHANT HUB

### 6.1 5-Zone Swappable 4-Layer Parallax Backgrounds (`F1` to `F100+`)
Every 20 floors, the Spire transitions to a higher cosmic stratum, rendered with **4 independent `.webp` layers** scrolling at `0.1x / 0.35x / 0.65x / 1.0x` speeds (`4.0x` during the `2.8s` floor-clear march):
1. **Zone 1 (`Floors 1–20`): Starfall Forest Base** (`/assets/backgrounds/zone1_forest/layer1..4.webp`)
2. **Zone 2 (`Floors 21–40`): Frostbound Mountain Peaks** (`/assets/backgrounds/zone2_peaks/layer1..4.webp`)
3. **Zone 3 (`Floors 41–60`): Astral Cloudsea Sanctuary** (`/assets/backgrounds/zone3_cloudsea/layer1..4.webp`)
4. **Zone 4 (`Floors 61–80`): Shattered Starfield Orbit** (`/assets/backgrounds/zone4_orbit/layer1..4.webp`)
5. **Zone 5 (`Floors 81–100+`): Deep Space Singularity** (`/assets/backgrounds/zone5_space/layer1..4.webp`)

### 6.2 Multi-Part Old God Bosses (`Every 5th Floor & Domains`)
Bosses spawn with **4 interactive targetable parts** (players can click/tap any part to focus-fire) and a **5-Segment Stagger Gauge**:
1. **Old God Core (`Azathoth's Remnant` — 100% HP):** Casts AoE pulse every `8.0s` and charges `Cataclysmic Supernova (4.0s cast)` — breaking Stagger interrupts Supernova and triggers `STAGGERED (5.5s, +50% DMG taken)`.
2. **Left Void Arm (`32% HP`):** Grants `-30% DMG taken` barrier to Core; destroying it removes the barrier and deals `60 BP` Stagger DMG to Core.
3. **Right Abyssal Crusher (`30% HP`):** Heavy frontline slam; destroying it permanently reduces Boss `ATK by -25%`.
4. **Cosmic Eye of Madness (`25% HP`):** Inflicts debuffs & shields Core; destroying it grants `+30% Ultimate Energy` to all 5 heroes and breaks `1 full Stagger bar`.

### 6.3 `[🏰 Sanctuaries & Challenges]` Modal (6 Farming & Competitive Modes)
- **Left Sidebar Navigation (6 Modes):**
  1. `🪙 Golden Bounty Vault` (5 Tiers: `12,500G` ➔ `160,000G`)
  2. `⚔️ Striker Sanctum` (5 Tiers: Drops `Starfall`, `Volatus`, `Overload`)
  3. `🛡️ Bastion Foundry` (5 Tiers: Drops `Titan`, `Radiant Dawn`)
  4. `🔮 Astral Observatory` (5 Tiers: Drops `Astral Nexus`, `Eclipse`, `Voidweaver`)
  5. `🏟️ 1v1 Async Arena` (5 opponent rows ranked by Squad CP; awards `Arena Tokens` & `Starlight Gems`)
  6. `🐉 Guild Raid: Yog-Sothoth` (Includes **Guild Hall Creation/Donation Lv.1–5** + **3 Difficulties: Easy / Normal / Hard** in a 90s DPS race for `Guild Medals`)
- **Challenge vs. Sweep Rule:** Players must defeat a Domain Tier once via `[⚔️ Fight (1 Key)]` (triggers a `1.4s Dimensional Rift Entry` animation) before unlocking `[⚡ Sweep (1 Key + 1 Sweep Ticket)]`.

### 6.4 `[🛒 Merchant Hub]` (4-Tab Unified Exchange Shop)
1. **🪙 General Store:** Buy `Sweep Tickets` (`15,000G` / `10x for 135,000G`), `Reforge Stones`, and `Failstack Catalysts`.
2. **🌟 Starfall Exchange:** Spend non-expiring `Starfall Shards` (`1 Pull = 1 Shard`) on **5★ Role-Specific Signature Weapons (`80 Shards`)** or **SSR Hero Shards (`100 Shards`)**.
3. **🏆 Arena Armory:** Spend `Arena Tokens` on `Starlight Gems` and `Hero Soul Shard Chests`.
4. **🎖️ Guild Treasury:** Spend `Guild Medals` on **Exotic Core Sigils (`+6`)** and `Relic Chests`.

---

## 🌌 SECTION 7: GACHA SUMMON (HOLD-TO-FLIP + SR➔SSR FAKE-OUT) & CHRONO REWIND CONSTELLATIONS

### 7.1 2-Banner Character Summon (No Weapon Banner)
- **Tutorial First Pull Guarantee:** The account's very first summon button (`[✨ FREE FIRST SUMMON (100% SR)]`) costs `0 Gems` and guarantees unlocking an `SR` Hero immediately.
- **2 Hero Banners Only (`Limited Rate-Up` & `Standard Summon` with 5-SSR Frameless Wishlist):** Non-hero pulls automatically drop `3★–4★ Equipment Relics` into the Inventory Bag.
- **Interactive Hold-to-Flip Reveal & `25%` SR➔SSR Shatter Fake-Out:**
  - Players hold-to-flip summoned cards in 3D (`Hold-to-Charge`) or click `[Reveal All]`.
  - `25%` of SSR pulls initially glow Purple (`SR`), then violently crack with golden lightning (`⚡ GOLDEN ASCENSION!`) and shatter into a Gold `SSR` reveal.

### 7.2 Chrono Rewind & 13 Constellations (`12 Zodiacs + 1 Seasonal Crown = 287 Nodes`)
- Rewinding from Floor 10+ grants **Time Shards** without losing Hero Levels, Stars, or Equipment.
- **13 Branching Constellations:** 12 Zodiacs (`Offense`: Aries/Leo/Sagittarius; `Bastion`: Taurus/Cancer/Capricorn; `Nexus`: Virgo/Libra/Scorpio; `Chrono`: Gemini/Aquarius/Pisces) + `Seasonal Crown` (`Ophiuchus / Phoenix / Leviathan`), featuring **Anchored Mini-Popovers** on hover/tap and **Single-Node Gold Refund (`2,500G`)**.

---

## 📂 SECTION 8: COMPLETE 99-FILE ASSET MANIFEST (`public/assets/` & `res://assets/`)

All 99 transparent/layered `.webp` pixel-art assets are pre-generated and organized in these exact paths:

```text
assets/
├── backgrounds/                  # 20 Files (5 Zones × 4 Parallax Layers, 640×360 WebP)
│   ├── zone1_forest/             # layer1_sky.webp, layer2_far_bg.webp, layer3_mid_arch.webp, layer4_floor.webp
│   ├── zone2_peaks/              # layer1_sky.webp, layer2_far_bg.webp, layer3_mid_arch.webp, layer4_floor.webp
│   ├── zone3_cloudsea/           # layer1_sky.webp, layer2_far_bg.webp, layer3_mid_arch.webp, layer4_floor.webp
│   ├── zone4_orbit/              # layer1_sky.webp, layer2_far_bg.webp, layer3_mid_arch.webp, layer4_floor.webp
│   └── zone5_space/              # layer1_sky.webp, layer2_far_bg.webp, layer3_mid_arch.webp, layer4_floor.webp
├── tarot/                        # 23 Files (256×384 WebP)
│   ├── card_back.webp
│   └── arcana_00.webp .. arcana_21.webp
├── gear/                         # 44 Files (128×128 Transparent WebP — Zero Checkerboard)
│   ├── <set>_weapon_melee.webp   # For all 8 sets: starfall, astral, eclipse, overload, titan, volatus, radiant, voidweaver
│   ├── <set>_weapon_ranged.webp  # For all 8 sets
│   ├── <set>_weapon_magic.webp   # For all 8 sets
│   ├── <set>_armor.webp          # For all 8 sets
│   ├── <set>_ring.webp           # For all 8 sets
│   ├── sigil_chrono_sprint.webp
│   ├── sigil_aetherial_heart.webp
│   ├── sigil_cataclysmic_core.webp
│   └── sigil_immortal_bulwark.webp
└── ui/                           # 32 Files (128×128 Transparent WebP — Zero Checkerboard)
    ├── Currencies (8):           gold.webp, starlight_gem.webp, starfall_shard.webp, time_shard.webp, weekly_key.webp, sweep_ticket.webp, guild_medal.webp, arena_token.webp
    ├── Elements (6):             elem_fire.webp, elem_cryo.webp, elem_wind.webp, elem_electro.webp, elem_light.webp, elem_dark.webp
    ├── Roles (5):                role_melee.webp, role_ranged.webp, role_tank.webp, role_healer.webp, role_debuffer.webp
    ├── Stars & Rarity (5):       star_gold.webp, star_awakened.webp, rarity_r.webp, rarity_sr.webp, rarity_ssr.webp
    ├── Shop Items (4):           shop_reforge_stone.webp, shop_failstack_catalyst.webp, shop_hero_shard_chest.webp, shop_relic_chest.webp
    └── Nav Buttons (8):          nav_battle.webp, nav_heroes.webp, nav_forge.webp, nav_summon.webp, nav_rewind.webp, nav_sanctuary.webp, nav_shop.webp, nav_wiki.webp
```

---

## 🛠️ SECTION 9: GODOT 4.x ARCHITECTURE BLUEPRINT (FOR CLAUDE x GODOT MIGRATION)

When migrating from the TypeScript Web Prototype in this repo to **Godot 4.3+ (`GDScript`)**, Claude should structure the Godot project as follows:

1. **Autoload Singletons (`res://autoload/`):**
   - `GameData.gd`: Port `resonators.ts` (27 heroes), `equipment.ts` (8 sets × 3 weapon roles + 4 sigils), `constellations.ts`, and `MAJOR_ARCANA_TAROT` directly as static dictionaries/resources.
   - `SaveState.gd`: Stores owned heroes, `heroShards[heroId]`, `starTier (1..10)`, inventory relics, currencies, and current Spire floor.
   - `CombatMath.gd`: Ports `evaluateElementalCounter()`, `ELEMENTAL_REACTION_MATRIX`, and `calculateHeroCP()` 1:1 from `combatEngine.ts`.
2. **Core Scene Tree (`res://scenes/`):**
   - `MainGame.tscn` ➔ Contains Top Currency/Nav HUD, `BattleArena2D.tscn` (with `Parallax2D` 4-layer background, `HeroActor2D.tscn` × 5, `BossMultiPartActor2D.tscn`, and `LootDropItem2D.tscn` with light-pillar shaders), and Modal Overlays (`HeroesModal.tscn`, `ForgeBagModal.tscn`, `Summon3DFlipModal.tscn`, `SanctuariesModal.tscn`, `MerchantHubModal.tscn`, `ChronoRewindModal.tscn`).
3. **Replacing Geometric Placeholders with Animated Sprites:**
   - In `HeroActor2D.tscn` and `BossMultiPartActor2D.tscn`, use `AnimatedSprite2D` (`TEXTURE_FILTER_NEAREST`) with state machines (`IDLE`, `RUN_MARCH`, `ATTACK`, `SKILL_CAST`, `HIT_FLASH`, `KO`) while keeping the exact hitbox, floating status badge, and Gambit trigger hooks from the web prototype.

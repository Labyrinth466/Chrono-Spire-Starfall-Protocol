# Fix UI `.webp` Asset Sources & 5-Zone Battle Background Rendering

Resolves all mismatched `.webp` icon paths across the Merchant Hub, Summon Exchange, Sanctuary Modal, and Equipment/Forge views, while upgrading the 5-Zone Battle Canvas to render each zone's clean `full_reference.webp` artwork with atmospheric parallax effects.

## User Review & Critical Decisions

> [!IMPORTANT]
> Confirmed decisions from clarification:
> - **Fix Every Wrong `.webp` Path in App**: Audit and correct all mismatched or missing `.webp` icon bindings across Merchant Hub (`GOLD`, `STARFALL`, `ARENA`, `GUILD`), Summon Starfall Exchange Modal, Sanctuaries & Challenges Modal, and Equipment/Forge `getGearItemIconUrl` resolution, plus clean baked-in checkerboard/matte artifacts on the navigation `.webp` icons.
> - **5-Zone Battle Background Rendering**: Render each zone's clean `full_reference.webp` (`/assets/backgrounds/zone1_forest..zone5_space/full_reference.webp`) across the full canvas with horizontal parallax scrolling and procedural atmospheric effects instead of the cutout/smeared `layer1..4.webp` slices.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. Fixes the 5-Zone Spire Battle background in the canvas renderer so each zone (`zone1_forest`, `zone2_mountain`, `zone3_cloudsea`, `zone4_orbit`, `zone5_space`) loads and renders its seamless `full_reference.webp` scene with parallax motion and zone-specific atmospheric particles, eliminating rectangular sky/cloud cutout boxes, inpainting smears, and squished vertical slices.
  2. Fixes all wrong `.webp` icon sources across the UI so every currency, shop item, weapon, armor, ring, core sigil, dungeon sanctuary, and navigation button displays its exact matching `.webp` asset.
- **Target Audience / Persona**: Players navigating Spire combat, equipping/forging relics, and trading in the Merchant Hub & Starfall Exchange.
- **Key Value**: Eliminates visual background glitches in combat and ensures 100% accurate `.webp` icon representation across every modal and tab.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  - **5-Zone Spire Combat Background**: As players progress through Floors 1–500 (Zone 1 Forest -> Zone 2 Mountain -> Zone 3 Cloudsea -> Zone 4 Orbit -> Zone 5 Space), the battle canvas renders `full_reference.webp` at full canvas aspect ratio with smooth horizontal parallax wrapping and atmospheric particle overlays.
  - **Merchant Hub (4 Tabs)**:
    - *General Gold Shop*: `1x Dungeon Sweep Ticket` and `10x Dungeon Sweep Bundle` both use `/assets/ui/sweep_ticket.webp`; `Masterwork Forge Catalyst` uses `/assets/ui/shop_failstack_catalyst.webp`; `Hero Soul Shard Chest` uses `/assets/ui/shop_hero_shard_chest.webp`.
    - *Starfall Exchange*: `5★ Signature Relic` uses the featured hero's role-matched Starfall weapon `.webp` (`getGearIconUrl('Starfall Executioner', 'Weapon', role)`); `Featured Sovereign Contract` and `Wishlist #1 SSR Crest` use `/assets/ui/shop_hero_shard_chest.webp`; `Reforge & Catalyst Chest` uses `/assets/ui/shop_reforge_stone.webp` & `/assets/ui/shop_relic_chest.webp`.
    - *Arena Armory & Guild Treasury*: All 4 cards display their matching `.webp` icons (`starlight_gem.webp`, `gold.webp` + `sweep_ticket.webp`, `sigil_cataclysmic_core.webp`, and `time_shard.webp`), and the 4 shop tab headers display their `.webp` currency icons.
  - **Equipment & Forge (`[AUTO-EQUIP BEST]` & Inventory Bag)**:
    - `getGearItemIconUrl` dynamically resolves from `(gear.set, gear.slot, gear.weaponRole, gear.sigilTrait?.id)` so changing an item's set (e.g., via `[AUTO-EQUIP BEST]` or Guild Raid Exotic Voidweaver Core) immediately updates its `.webp` icon.
    - Clean fallback weapon `.webp` selection (`radiant_weapon_ranged.webp` and `volatus_weapon_melee.webp`) avoids solid-black interior fills.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Crisp 16-bit dark-fantasy pixel art (`image-rendering: pixelated`) over deep astral slate (`#070a14` / `#0a0d18`) with luminous gold (`#fbbf24`) and arcane violet (`#a855f7`) accents.
  - *Typography & Hierarchy*: `Cinzel` display headers, `Plus Jakarta Sans` UI body, and `JetBrains Mono` (`tabular-nums`) for all counters, timers, and stat readouts.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Full-Reference 16:9 Zone Background with Parallax & Atmospheric FX**
  - *Chosen Approach*: Load `/assets/backgrounds/${folder}/full_reference.webp` as the primary full-canvas background for Zones 1–5 with horizontal parallax tiling and procedural atmospheric particles/lighting.
  - *Why*: The individual `layer1..3.webp` files contain rectangular sky/cloud bounding boxes around foreground pillars and vertical inpainting smears that clash when scrolled at different speeds, while `layer4_floor.webp` has 70% top transparency that squishes when drawn into `horizonY..height`. `full_reference.webp` is crisp, complete, and artifact-free across all 5 zones.
- **Decision 2: Dynamic Gear `.webp` Resolution in `getGearItemIconUrl`**
  - *Chosen Approach*: Compute the canonical `.webp` path from `getGearIconUrl(gear.set, gear.slot, gear.weaponRole, gear.sigilTrait?.id)` first rather than returning a cached `gear.iconUrl` property.
  - *Why*: Ensures that existing items in `localStorage`, items mutated by `[AUTO-EQUIP BEST]`, and shop-crafted relics always render the exact `.webp` icon matching their current set, slot, weapon role, and sigil trait.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     ASSET MANIFEST & ICON RESOLVERS                      │
│  • UI_ICONS (elem, role, rarity, nav, shop, currency, stars)             │
│  • getGearIconUrl(set, slot, weaponRole, sigilTraitId)                   │
│  • ZONE_PARALLAX_ASSETS (zone1..zone5 -> full_reference.webp)            │
└───────────────────┬──────────────────────────────────┬───────────────────┘
                    │                                  │
                    ▼                                  ▼
┌──────────────────────────────────────┐  ┌────────────────────────────────┐
│       5-ZONE BATTLE CANVAS           │  │     REACT UI VIEWS & MODALS    │
│  • Draws full_reference.webp across  │  │  • Top Bar & Bottom Nav Dock   │
│    full (0, 0, width, height)        │  │  • Forge Paper Doll & Bag      │
│  • Smooth horizontal parallax loop   │  │  • Grand Merchant Hub (4 Tabs) │
│  • Zone atmospheric particle FX      │  │  • Summon & Sanctuary Modals   │
└──────────────────────────────────────┘  └────────────────────────────────┘
```

- **Interactive Component & State Mapping**:
  - **5-Zone Parallax Preloader & Renderer**: Preloads `full_reference.webp` for all 5 zones at startup and draws the active zone's scene at full canvas height with seamless horizontal parallax wrapping during wave transitions.
  - **Merchant Hub & Summon Exchange**: Binds each shop card and tab header to its exact `UI_ICONS` or `getGearIconUrl` `.webp` asset, and sets `set: 'Voidweaver'` on the Guild Treasury's `Yog-Sothoth Voidweaver Core`.
  - **Equipment & Forge Auto-Equip**: Updates both `set` and `iconUrl` when `[AUTO-EQUIP BEST]` is clicked and resolves icons dynamically via `getGearIconUrl`.

// Unified Asset Registry for Chrono Spire: Starfall Protocol (v2.3)
// Place extracted `public/assets/...` folders at the project root `public/assets/`

export const CURRENCY_ICON_PATHS = {
  gold: '/assets/ui/gold.webp',
  starlightGem: '/assets/ui/starlight_gem.webp',
  starfallShard: '/assets/ui/starfall_shard.webp',
  timeShard: '/assets/ui/time_shard.webp',
  weeklyKey: '/assets/ui/weekly_key.webp',
  sweepTicket: '/assets/ui/sweep_ticket.webp',
  guildMedal: '/assets/ui/guild_medal.webp',
  arenaToken: '/assets/ui/arena_token.webp',
} as const;

export const ELEMENT_ICON_PATHS = {
  Fire: '/assets/ui/elem_fire.webp',
  Cryo: '/assets/ui/elem_cryo.webp',
  Wind: '/assets/ui/elem_wind.webp',
  Electro: '/assets/ui/elem_electro.webp',
} as const;

export const TAROT_CARD_PATHS: Record<string, string> = {
  CARD_BACK: '/assets/tarot/card_back.webp',
  ARCANA_00: '/assets/tarot/arcana_00.webp',
  ARCANA_01: '/assets/tarot/arcana_01.webp',
  ARCANA_02: '/assets/tarot/arcana_02.webp',
  ARCANA_03: '/assets/tarot/arcana_03.webp',
  ARCANA_04: '/assets/tarot/arcana_04.webp',
  ARCANA_05: '/assets/tarot/arcana_05.webp',
  ARCANA_06: '/assets/tarot/arcana_06.webp',
  ARCANA_07: '/assets/tarot/arcana_07.webp',
  ARCANA_08: '/assets/tarot/arcana_08.webp',
  ARCANA_09: '/assets/tarot/arcana_09.webp',
  ARCANA_10: '/assets/tarot/arcana_10.webp',
  ARCANA_11: '/assets/tarot/arcana_11.webp',
  ARCANA_12: '/assets/tarot/arcana_12.webp',
  ARCANA_13: '/assets/tarot/arcana_13.webp',
  ARCANA_14: '/assets/tarot/arcana_14.webp',
  ARCANA_15: '/assets/tarot/arcana_15.webp',
  ARCANA_16: '/assets/tarot/arcana_16.webp',
  ARCANA_17: '/assets/tarot/arcana_17.webp',
  ARCANA_18: '/assets/tarot/arcana_18.webp',
  ARCANA_19: '/assets/tarot/arcana_19.webp',
  ARCANA_20: '/assets/tarot/arcana_20.webp',
  ARCANA_21: '/assets/tarot/arcana_21.webp',
};

export const GEAR_ICON_PATHS: Record<string, Record<'Weapon' | 'Armor' | 'Ring', string>> = {
  STARFALL: {
    Weapon: '/assets/gear/starfall_weapon.webp',
    Armor: '/assets/gear/starfall_armor.webp',
    Ring: '/assets/gear/starfall_ring.webp',
  },
  ASTRAL: {
    Weapon: '/assets/gear/astral_weapon.webp',
    Armor: '/assets/gear/astral_armor.webp',
    Ring: '/assets/gear/astral_ring.webp',
  },
  ECLIPSE: {
    Weapon: '/assets/gear/eclipse_weapon.webp',
    Armor: '/assets/gear/eclipse_armor.webp',
    Ring: '/assets/gear/eclipse_ring.webp',
  },
  OVERLOAD: {
    Weapon: '/assets/gear/overload_weapon.webp',
    Armor: '/assets/gear/overload_armor.webp',
    Ring: '/assets/gear/overload_ring.webp',
  },
  TITAN: {
    Weapon: '/assets/gear/titan_weapon.webp',
    Armor: '/assets/gear/titan_armor.webp',
    Ring: '/assets/gear/titan_ring.webp',
  },
  VOLATUS: {
    Weapon: '/assets/gear/volatus_weapon_melee.webp',
    Armor: '/assets/gear/volatus_armor.webp',
    Ring: '/assets/gear/volatus_ring.webp',
  },
  RADIANT: {
    Weapon: '/assets/gear/radiant_weapon_ranged.webp',
    Armor: '/assets/gear/radiant_armor.webp',
    Ring: '/assets/gear/radiant_ring.webp',
  },
  VOIDWEAVER: {
    Weapon: '/assets/gear/voidweaver_weapon.webp',
    Armor: '/assets/gear/voidweaver_armor.webp',
    Ring: '/assets/gear/voidweaver_ring.webp',
  },
};

export const SIGIL_ICON_PATHS: Record<string, string> = {
  TRAIT_CHRONO_SPRINT: '/assets/gear/sigil_chrono_sprint.webp',
  TRAIT_AETHERIAL_HEART: '/assets/gear/sigil_aetherial_heart.webp',
  TRAIT_CATACLYSMIC_CORE: '/assets/gear/sigil_cataclysmic_core.webp',
  TRAIT_IMMORTAL_BULWARK: '/assets/gear/sigil_immortal_bulwark.webp',
};

export const ZONE_PARALLAX_PATHS = [
  {
    id: 'zone1_forest',
    floors: [1, 20],
    name: 'Starfall Forest Base',
    skyUrl: '/assets/backgrounds/zone1_forest/full_reference.webp',
    farBgUrl: '/assets/backgrounds/zone1_forest/full_reference.webp',
    midArchUrl: '/assets/backgrounds/zone1_forest/full_reference.webp',
    floorUrl: '/assets/backgrounds/zone1_forest/full_reference.webp',
  },
  {
    id: 'zone2_mountain',
    floors: [21, 40],
    name: 'Stormcrag Frost Peaks',
    skyUrl: '/assets/backgrounds/zone2_mountain/full_reference.webp',
    farBgUrl: '/assets/backgrounds/zone2_mountain/full_reference.webp',
    midArchUrl: '/assets/backgrounds/zone2_mountain/full_reference.webp',
    floorUrl: '/assets/backgrounds/zone2_mountain/full_reference.webp',
  },
  {
    id: 'zone3_cloudsea',
    floors: [41, 60],
    name: 'Aether Cloudsea Sanctum',
    skyUrl: '/assets/backgrounds/zone3_cloudsea/full_reference.webp',
    farBgUrl: '/assets/backgrounds/zone3_cloudsea/full_reference.webp',
    midArchUrl: '/assets/backgrounds/zone3_cloudsea/full_reference.webp',
    floorUrl: '/assets/backgrounds/zone3_cloudsea/full_reference.webp',
  },
  {
    id: 'zone4_orbit',
    floors: [61, 80],
    name: 'Astral Stratosphere Orbit',
    skyUrl: '/assets/backgrounds/zone4_orbit/full_reference.webp',
    farBgUrl: '/assets/backgrounds/zone4_orbit/full_reference.webp',
    midArchUrl: '/assets/backgrounds/zone4_orbit/full_reference.webp',
    floorUrl: '/assets/backgrounds/zone4_orbit/full_reference.webp',
  },
  {
    id: 'zone5_space',
    floors: [81, 999],
    name: 'Abyssal Singularity Summit',
    skyUrl: '/assets/backgrounds/zone5_space/full_reference.webp',
    farBgUrl: '/assets/backgrounds/zone5_space/full_reference.webp',
    midArchUrl: '/assets/backgrounds/zone5_space/full_reference.webp',
    floorUrl: '/assets/backgrounds/zone5_space/full_reference.webp',
  },
];

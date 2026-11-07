// Drop-in 4-Layer Parallax Asset Loader for Chrono Spire (src/data/zoneParallaxAssets.ts)
export interface ZoneParallaxLayerSet {
  id: string;
  name: string;
  floors: string;
  skyUrl: string;
  farBgUrl: string;
  midArchUrl: string;
  floorUrl: string;
}

export const ZONE_PARALLAX_ASSETS: ZoneParallaxLayerSet[] = [
  {
    id: 'zone1_forest',
    name: 'Starfall Forest Base',
    floors: 'F1-F20',
    skyUrl: '/assets/backgrounds/zone1_forest/full_reference.webp',
    farBgUrl: '/assets/backgrounds/zone1_forest/full_reference.webp',
    midArchUrl: '/assets/backgrounds/zone1_forest/full_reference.webp',
    floorUrl: '/assets/backgrounds/zone1_forest/full_reference.webp',
  },
  {
    id: 'zone2_mountain',
    name: 'Stormcrag Frost Peaks',
    floors: 'F21-F40',
    skyUrl: '/assets/backgrounds/zone2_mountain/full_reference.webp',
    farBgUrl: '/assets/backgrounds/zone2_mountain/full_reference.webp',
    midArchUrl: '/assets/backgrounds/zone2_mountain/full_reference.webp',
    floorUrl: '/assets/backgrounds/zone2_mountain/full_reference.webp',
  },
  {
    id: 'zone3_cloudsea',
    name: 'Aether Cloudsea Sanctum',
    floors: 'F41-F60',
    skyUrl: '/assets/backgrounds/zone3_cloudsea/full_reference.webp',
    farBgUrl: '/assets/backgrounds/zone3_cloudsea/full_reference.webp',
    midArchUrl: '/assets/backgrounds/zone3_cloudsea/full_reference.webp',
    floorUrl: '/assets/backgrounds/zone3_cloudsea/full_reference.webp',
  },
  {
    id: 'zone4_orbit',
    name: 'Astral Stratosphere Orbit',
    floors: 'F61-F80',
    skyUrl: '/assets/backgrounds/zone4_orbit/full_reference.webp',
    farBgUrl: '/assets/backgrounds/zone4_orbit/full_reference.webp',
    midArchUrl: '/assets/backgrounds/zone4_orbit/full_reference.webp',
    floorUrl: '/assets/backgrounds/zone4_orbit/full_reference.webp',
  },
  {
    id: 'zone5_space',
    name: 'Abyssal Singularity Summit',
    floors: 'F81-F100+',
    skyUrl: '/assets/backgrounds/zone5_space/full_reference.webp',
    farBgUrl: '/assets/backgrounds/zone5_space/full_reference.webp',
    midArchUrl: '/assets/backgrounds/zone5_space/full_reference.webp',
    floorUrl: '/assets/backgrounds/zone5_space/full_reference.webp',
  },
];

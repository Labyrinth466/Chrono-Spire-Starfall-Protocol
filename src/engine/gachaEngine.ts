/**
 * CHRONO SPIRE: STARFALL PROTOCOL — Master SSOT v2.1 (Unified TypeScript)
 * File 6: src/engine/gachaEngine.ts
 * 5-Hero Permanent Wishlist (70% SSR Rate Lock = 14% each) &
 * Starfall Exchange Mileage Shop (1 Pull = 1 Non-Expiring Starfall Shard).
 */

import { ElementType, RoleType, SYSTEM_CONSTANTS } from '../config/constants';
import { RESONATORS } from '../data/resonators';

export interface StarfallExchangeItem {
  id: string;
  name: string;
  costShards: number;
  limitPerBanner: number;
  category: 'Signature Weapon' | 'Limited Dupe' | 'Weekly Rotation' | 'Forge Material';
  desc: string;
}

export const STARFALL_EXCHANGE_CATALOG: readonly StarfallExchangeItem[] = Object.freeze([
  {
    id: 'SHOP_LIMITED_5STAR_WEAPON',
    name: 'Featured Limited 5★ Signature Weapon',
    costShards: 80,
    limitPerBanner: 1,
    category: 'Signature Weapon',
    desc: 'Guarantees the 5★ Signature Weapon for the featured rate-up Resonator at 80 pulls.',
  },
  {
    id: 'SHOP_LIMITED_HERO_SHARDS_50',
    name: 'Featured Limited Resonator Shards (x50 — 1 Full Copy)',
    costShards: 100,
    limitPerBanner: 2,
    category: 'Limited Dupe',
    desc: '50 Shards equivalent to 1 full duplicate ascension copy of the featured Resonator.',
  },
  {
    id: 'SHOP_WEEKLY_SSR_FULL_50',
    name: 'Weekly Rotating Standard SSR (x50 Shards — Full Copy)',
    costShards: 75,
    limitPerBanner: 1,
    category: 'Weekly Rotation',
    desc: 'Rotates 3 Standard SSRs every Monday (Kallen, Caelum, Yuzuki).',
  },
  {
    id: 'SHOP_WEEKLY_SSR_HALF_25',
    name: 'Weekly Rotating Standard SSR (x25 Shards — Half Copy)',
    costShards: 40,
    limitPerBanner: 2,
    category: 'Weekly Rotation',
    desc: '25 SSR Shards for steady constellation & star progression.',
  },
  {
    id: 'SHOP_REFORGE_STONE',
    name: 'Astral Reforge Stone',
    costShards: 15,
    limitPerBanner: 10,
    category: 'Forge Material',
    desc: 'Rerolls all 4 Substat lines with fresh Min-Max RNG ranges on any equipment.',
  },
  {
    id: 'SHOP_FAIL_STACK_CATALYST',
    name: 'Starfall Fail Stack Catalyst (+10% Rate)',
    costShards: 10,
    limitPerBanner: 20,
    category: 'Forge Material',
    desc: 'Adds +10% bonus enhancement success rate on your next +4 to +15 forge attempt.',
  },
]);

export interface GachaPullResult {
  id: string;
  name: string;
  rarity: 'SSR' | 'SR';
  element: ElementType;
  role: RoleType;
  fromWishlist: boolean;
  shardsGranted: number;
}

export interface GachaInventoryState {
  signatureWeapons: string[];
  heroShards: Record<string, number>;
  reforgeStones: number;
  failStackCatalysts: number;
}

export class StarfallGachaEngine {
  public wishlistHeroIds: string[];
  public starfallShards: number;
  public pityCounter: number;
  public readonly hardPityLimit: number = 80;
  public readonly baseSsrRate: number = 0.03;
  public purchaseCounts: Record<string, number>;
  public inventory: GachaInventoryState;

  constructor(initialState: {
    wishlistHeroIds?: string[];
    starfallShards?: number;
    pityCounter?: number;
    purchaseCounts?: Record<string, number>;
    signatureWeapons?: string[];
    heroShards?: Record<string, number>;
    reforgeStones?: number;
    failStackCatalysts?: number;
  } = {}) {
    this.wishlistHeroIds = initialState.wishlistHeroIds || ['H01', 'H04', 'H07', 'H10', 'H13'];
    this.starfallShards = initialState.starfallShards || 0;
    this.pityCounter = initialState.pityCounter || 0;
    this.purchaseCounts = { ...(initialState.purchaseCounts || {}) };
    this.inventory = {
      signatureWeapons: [...(initialState.signatureWeapons || [])],
      heroShards: { ...(initialState.heroShards || {}) },
      reforgeStones: initialState.reforgeStones ?? 2,
      failStackCatalysts: initialState.failStackCatalysts ?? 2,
    };
  }

  public setWishlist(heroIds: string[]): string[] {
    if (!Array.isArray(heroIds) || heroIds.length !== SYSTEM_CONSTANTS.WISHLIST_SIZE) {
      throw new Error(`Wishlist must contain exactly ${SYSTEM_CONSTANTS.WISHLIST_SIZE} SSR Resonators.`);
    }
    const uniqueIds = Array.from(new Set(heroIds));
    if (uniqueIds.length !== SYSTEM_CONSTANTS.WISHLIST_SIZE) {
      throw new Error('All 5 Wishlist slots must contain distinct SSR Resonators.');
    }
    const allSSR = RESONATORS.filter((r) => r.rarity === 'SSR').map((r) => r.id);
    uniqueIds.forEach((id) => {
      if (!allSSR.includes(id)) {
        throw new Error(`Resonator ${id} is not an SSR unit eligible for the Wishlist.`);
      }
    });
    this.wishlistHeroIds = uniqueIds;
    return [...this.wishlistHeroIds];
  }

  public summon(pullCount: number = 1): {
    pulls: GachaPullResult[];
    starfallShardsEarned: number;
    totalStarfallShards: number;
    pityCounter: number;
  } {
    const allSSRs = RESONATORS.filter((r) => r.rarity === 'SSR');
    const allSRs = RESONATORS.filter((r) => r.rarity === 'SR');
    const wishlistSet = new Set(this.wishlistHeroIds);

    const wishlistPool = allSSRs.filter((r) => wishlistSet.has(r.id));
    const offWishlistPool = allSSRs.filter((r) => !wishlistSet.has(r.id));

    const pulls: GachaPullResult[] = [];

    for (let i = 0; i < pullCount; i++) {
      this.pityCounter += 1;
      this.starfallShards += SYSTEM_CONSTANTS.STARFALL_SHARDS_PER_PULL;

      const isGuaranteedPity = this.pityCounter >= this.hardPityLimit;
      const isSSR = isGuaranteedPity || Math.random() < this.baseSsrRate;

      if (isSSR) {
        this.pityCounter = 0;
        const hitWishlist = Math.random() < SYSTEM_CONSTANTS.WISHLIST_SSR_RATE_SHARE;
        const pool = hitWishlist && wishlistPool.length > 0 ? wishlistPool : offWishlistPool;
        const unit = pool[Math.floor(Math.random() * pool.length)] || allSSRs[0];

        this.inventory.heroShards[unit.id] = (this.inventory.heroShards[unit.id] || 0) + 50;
        pulls.push({
          id: unit.id,
          name: unit.name,
          rarity: 'SSR',
          element: unit.element,
          role: unit.role,
          fromWishlist: wishlistSet.has(unit.id),
          shardsGranted: 50,
        });
      } else {
        const unit = allSRs[Math.floor(Math.random() * allSRs.length)];
        this.inventory.heroShards[unit.id] = (this.inventory.heroShards[unit.id] || 0) + 20;
        pulls.push({
          id: unit.id,
          name: unit.name,
          rarity: 'SR',
          element: unit.element,
          role: unit.role,
          fromWishlist: false,
          shardsGranted: 20,
        });
      }
    }

    return {
      pulls,
      starfallShardsEarned: pullCount * SYSTEM_CONSTANTS.STARFALL_SHARDS_PER_PULL,
      totalStarfallShards: this.starfallShards,
      pityCounter: this.pityCounter,
    };
  }

  public redeemStarfallItem(
    shopItemId: string,
    targetHeroId: string = 'H01'
  ): {
    success: boolean;
    message: string;
    remainingShards?: number;
    inventory?: GachaInventoryState;
  } {
    const item = STARFALL_EXCHANGE_CATALOG.find((it) => it.id === shopItemId);
    if (!item) {
      return { success: false, message: `Unknown shop item: ${shopItemId}` };
    }
    const bought = this.purchaseCounts[shopItemId] || 0;
    if (bought >= item.limitPerBanner) {
      return {
        success: false,
        message: `Purchase limit (${item.limitPerBanner}) reached for ${item.name}.`,
      };
    }
    if (this.starfallShards < item.costShards) {
      return {
        success: false,
        message: `Insufficient Starfall Shards (${this.starfallShards}/${item.costShards}).`,
      };
    }

    this.starfallShards -= item.costShards;
    this.purchaseCounts[shopItemId] = bought + 1;

    if (shopItemId === 'SHOP_LIMITED_5STAR_WEAPON') {
      const hero = RESONATORS.find((r) => r.id === targetHeroId) || RESONATORS[0];
      const weaponName = `${hero.name}'s 5★ Astral Signature Weapon`;
      this.inventory.signatureWeapons.push(weaponName);
    } else if (
      shopItemId === 'SHOP_LIMITED_HERO_SHARDS_50' ||
      shopItemId === 'SHOP_WEEKLY_SSR_FULL_50'
    ) {
      this.inventory.heroShards[targetHeroId] = (this.inventory.heroShards[targetHeroId] || 0) + 50;
    } else if (shopItemId === 'SHOP_WEEKLY_SSR_HALF_25') {
      this.inventory.heroShards[targetHeroId] = (this.inventory.heroShards[targetHeroId] || 0) + 25;
    } else if (shopItemId === 'SHOP_REFORGE_STONE') {
      this.inventory.reforgeStones += 1;
    } else if (shopItemId === 'SHOP_FAIL_STACK_CATALYST') {
      this.inventory.failStackCatalysts += 1;
    }

    return {
      success: true,
      message: `Redeemed ${item.name} for ${item.costShards} Starfall Shards!`,
      remainingShards: this.starfallShards,
      inventory: { ...this.inventory },
    };
  }
}

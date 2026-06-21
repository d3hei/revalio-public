// Registry mapping on-chain Move object types to DeFi protocols/categories,

// used to classify a wallet's owned objects into positions.

//

// Two match modes:

//   * EXACT  — full `pkg::module::Struct` (pin when the origin package is known

//              and the module/struct names aren't distinctive enough).

//   * SUFFIX — `module::Struct` only (package-agnostic). On-chain object types

//              keep their *origin* package id, which is stable across package

//              upgrades; matching on the distinctive module+struct suffix is

//              therefore robust without hardcoding (upgradeable) package ids.

//

// To add a protocol: drop a new entry below — no other code changes needed.



export type PositionCategory =

  | "staking"

  | "liquid_staking"

  | "lending"

  | "amm_lp"

  | "vault"

  /** Perpetual futures position (e.g. Bluefin Pro). */

  | "perp"

  /** Collateralized debt position / CDP (e.g. Bucket "Bottle"). */

  | "cdp"

  /** Reserved: DeepBook open orders (post-MVP V1). @see docs/deepbook-post-mvp.md */

  | "order"

  /** Reserved: DeepBook trade history rows (post-MVP V1.1+). */

  | "trade";



export interface ProtocolEntry {

  protocol: string; // display name, e.g. "Cetus"

  category: PositionCategory;

  label: string; // short human label for the position row

}



/** Cetus CLMM package ids (origin + current SDK call target). */

export const CETUS_CLMM_PACKAGES = [

  "0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666",

  "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb",

] as const;



/** Cetus DLMM package id (mainnet). */

export const CETUS_DLMM_PACKAGE =

  "0x5664f9d3fd82c84023870cfbda8ea84e14c8dd56ce557ad2116e0668581a682b";



/** Cetus Farms package id (mainnet). */

export const CETUS_FARMS_PACKAGE =

  "0x11ea791d82b5742cc8cab0bf7946035c97d9001d7c3803a93f119753da66f526";



/** Turbos CLMM package ids (mainnet published-at + origin). */

export const TURBOS_CLMM_PACKAGES = [

  "0xa5a0c25c79e428eba04fb98b3fb2a34db45ab26d4c8faf0d7e39d66a63891e64",

  "0x91bfbc386a41afcfd9b2533058d7e915a1d3829089cc268ff4333d54d6339ca1",

] as const;



// EXACT: keyed by full type (generics stripped).

const REGISTRY_EXACT: Record<string, ProtocolEntry> = {

  "0x0868b71c0cba55bf0faf6c40df8c179c67a4d0ba0e79965b68b3d72d7dfbf666::position::Position": {

    protocol: "Cetus",

    category: "amm_lp",

    label: "Cetus CLMM LP",

  },

  "0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::position::Position": {

    protocol: "Cetus",

    category: "amm_lp",

    label: "Cetus CLMM LP",

  },

  "0x5664f9d3fd82c84023870cfbda8ea84e14c8dd56ce557ad2116e0668581a682b::position::Position": {

    protocol: "Cetus",

    category: "amm_lp",

    label: "Cetus DLMM LP",

  },

  [`${CETUS_FARMS_PACKAGE}::pool::WrappedPositionNFT`]: {

    protocol: "Cetus",

    category: "amm_lp",

    label: "Cetus Farms LP",

  },

  "0x3492c874c1e3b3e2984e8c41b589e642d4d0a5d6459e5a9cfc2d52fd7c89c267::position::Position": {

    protocol: "Bluefin",

    category: "amm_lp",

    label: "Bluefin Spot LP",

  },

  // AlphaFi auto-compounding vaults — user owns an AlphaFiReceipt (+ legacy per-pool Receipts).

  "0x18533807391b15db5f1f530f54b32553372e5c204d179928d8da0a1753cbb63c::alphafi_receipt::AlphaFiReceipt": {

    protocol: "AlphaFi",

    category: "vault",

    label: "AlphaFi Vault",

  },

  "0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphapool::Receipt": {

    protocol: "AlphaFi",

    category: "vault",

    label: "AlphaFi Vault",

  },

  "0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_pool::Receipt": {

    protocol: "AlphaFi",

    category: "vault",

    label: "AlphaFi Cetus Vault",

  },

  // AlphaLend money market — user owns a PositionCap (collateral/debt live in a shared table).

  "0xd631cd66138909636fc3f73ed75820d0c5b76332d1644608ed1c85ea2b8219b4::position::PositionCap": {

    protocol: "AlphaFi",

    category: "lending",

    label: "AlphaLend",

  },

  // Haedal delayed-unstake tickets (claimable SUI / WAL) — owned, soulbound.

  "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::staking::UnstakeTicket": {

    protocol: "Haedal",

    category: "staking",

    label: "Haedal Unstaking",

  },

  "0x8b4d553839b219c3fd47608a0cc3d5fcc572cb25d41b7df3833208586a8d2470::walstaking::UnstakeTicket": {

    protocol: "Haedal",

    category: "staking",

    label: "Haedal WAL Unstaking",

  },

  // DeepBook Margin — a lender owns a SupplierCap; supply shares live in the shared MarginPool.

  "0x97d9473771b01f77b0940c589484184b49f6444627ec121314fae6a6d36fb86b::margin_pool::SupplierCap": {

    protocol: "DeepBook",

    category: "lending",

    label: "DeepBook Margin Supply",

  },

};



// SUFFIX: keyed by `module::Struct`. These struct names are distinctive enough

// to identify the protocol without pinning a (mutable) package id.

const REGISTRY_SUFFIX: Record<string, ProtocolEntry> = {

  // Scallop: users hold an ObligationKey proving ownership of a shared Obligation.

  "obligation::ObligationKey": { protocol: "Scallop", category: "lending", label: "Scallop Lending" },

  // Suilend: users hold an ObligationOwnerCap for their lending obligation.

  "lending_market::ObligationOwnerCap": {

    protocol: "Suilend",

    category: "lending",

    label: "Suilend Lending",

  },

  // Turbos CLMM position NFT.

  "position_nft::TurbosPositionNFT": { protocol: "Turbos", category: "amm_lp", label: "Turbos LP" },

  // Native Sui staking (system `StakedSui` object).

  "staking_pool::StakedSui": {

    protocol: "sui-system",

    category: "staking",

    label: "Sui Staking",

  },

  // Cetus CLMM/DLMM position NFT (package-agnostic fallback).

  "position::Position": { protocol: "Cetus", category: "amm_lp", label: "Cetus LP" },

  // Cetus Farms wrapped CLMM position.

  "pool::WrappedPositionNFT": { protocol: "Cetus", category: "amm_lp", label: "Cetus Farms LP" },

  // DeepBook v3: users own a BalanceManager that custodies trading balances + orders.
  // Surfaces the DeepBook account; per-order decoding is a follow-up. @see docs/deepbook-post-mvp.md

  "balance_manager::BalanceManager": { protocol: "DeepBook", category: "order", label: "DeepBook Account" },

  // Protocols requested for coverage — add the VERIFIED mainnet `module::Struct` of the owned
  // position object as a new entry above (discovery matches by suffix). Left as TODO rather than
  // guessed type strings:
  //   AlphaFi (vault / AlphaLend receipt) — https://docs.alphafi.xyz/.../contract-and-object-ids
  //     (stSUI is an LST *coin* -> already a token balance.)
  //   Bluefin (spot CLMM / perps position) — https://suiscan.xyz/mainnet/directory/Bluefin
  //   Bucket (CDP): "Bottles" live in SHARED storage -> needs a native decoder (cf. naviRpc.ts).
  //     (BUCK / sBUCK are *coins* -> already token balances.)
  //   Haedal: haSUI is an LST *coin* -> already a token balance; tag via a coin->protocol map.

};



export interface OwnedObjectFilter {

  label: string;

  filter: Record<string, unknown>;

}



/** RPC StructType / MoveModule filters used for targeted position discovery. */

export function listOwnedObjectFilters(): OwnedObjectFilter[] {

  const filters: OwnedObjectFilter[] = [

    {

      label: "sui-native-staking",

      filter: { StructType: "0x3::staking_pool::StakedSui" },

    },

    {

      label: "sui-staking-module",

      filter: { MoveModule: { package: "0x3", module: "staking_pool" } },

    },

  ];



  for (const pkg of CETUS_CLMM_PACKAGES) {

    filters.push({

      label: `cetus-clmm-struct:${pkg.slice(2, 10)}`,

      filter: { StructType: `${pkg}::position::Position` },

    });

    filters.push({

      label: `cetus-clmm-module:${pkg.slice(2, 10)}`,

      filter: { MoveModule: { package: pkg, module: "position" } },

    });

  }



  filters.push({

    label: "cetus-dlmm-struct",

    filter: { StructType: `${CETUS_DLMM_PACKAGE}::position::Position` },

  });

  filters.push({

    label: "cetus-dlmm-module",

    filter: { MoveModule: { package: CETUS_DLMM_PACKAGE, module: "position" } },

  });

  filters.push({

    label: "cetus-farms-wrapped",

    filter: { StructType: `${CETUS_FARMS_PACKAGE}::pool::WrappedPositionNFT` },

  });



  for (const pkg of TURBOS_CLMM_PACKAGES) {

    filters.push({

      label: `turbos-nft-struct:${pkg.slice(2, 10)}`,

      filter: { StructType: `${pkg}::position_nft::TurbosPositionNFT` },

    });

    filters.push({

      label: `turbos-nft-module:${pkg.slice(2, 10)}`,

      filter: { MoveModule: { package: pkg, module: "position_nft" } },

    });

  }

  filters.push({

    label: "bluefin-spot-struct",

    filter: {

      StructType:

        "0x3492c874c1e3b3e2984e8c41b589e642d4d0a5d6459e5a9cfc2d52fd7c89c267::position::Position",

    },

  });

  filters.push({

    label: "bluefin-spot-module",

    filter: {

      MoveModule: {

        package: "0x3492c874c1e3b3e2984e8c41b589e642d4d0a5d6459e5a9cfc2d52fd7c89c267",

        module: "position",

      },

    },

  });

  // AlphaFi / AlphaLend / Haedal owned position objects (verified mainnet types).

  for (const [label, structType] of [

    ["alphafi-receipt", "0x18533807391b15db5f1f530f54b32553372e5c204d179928d8da0a1753cbb63c::alphafi_receipt::AlphaFiReceipt"],

    ["alphafi-legacy-receipt", "0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphapool::Receipt"],

    ["alphafi-cetus-receipt", "0x9bbd650b8442abb082c20f3bc95a9434a8d47b4bef98b0832dab57c1a8ba7123::alphafi_cetus_pool::Receipt"],

    ["alphalend-position-cap", "0xd631cd66138909636fc3f73ed75820d0c5b76332d1644608ed1c85ea2b8219b4::position::PositionCap"],

    ["haedal-unstake-ticket", "0xbde4ba4c2e274a60ce15c1cfff9e5c42e41654ac8b6d906a57efa4bd3c29f47d::staking::UnstakeTicket"],

    ["haedal-wal-unstake-ticket", "0x8b4d553839b219c3fd47608a0cc3d5fcc572cb25d41b7df3833208586a8d2470::walstaking::UnstakeTicket"],

    ["deepbook-margin-supplier", "0x97d9473771b01f77b0940c589484184b49f6444627ec121314fae6a6d36fb86b::margin_pool::SupplierCap"],

  ] as const) {

    filters.push({ label, filter: { StructType: structType } });

  }



  return filters;

}



/** Full Move struct types used for RPC StructType filters (exact registry keys). */

export function listExactStructTypes(): string[] {

  return Object.keys(REGISTRY_EXACT);

}



/** Strip generic type parameters: `a::b::C<...>` -> `a::b::C`. */

export function baseType(type: string): string {

  const lt = type.indexOf("<");

  return lt === -1 ? type : type.slice(0, lt);

}



/** Classify a Move object type into a protocol entry, or null if unknown. */

export function classifyType(type: string): ProtocolEntry | null {

  const base = baseType(type.trim());

  const exact = REGISTRY_EXACT[base];

  if (exact) return exact;



  const parts = base.split("::");

  if (parts.length >= 3) {

    const suffix = `${parts[parts.length - 2]}::${parts[parts.length - 1]}`;

    const bySuffix = REGISTRY_SUFFIX[suffix];

    if (bySuffix) return bySuffix;

  }

  return null;

}



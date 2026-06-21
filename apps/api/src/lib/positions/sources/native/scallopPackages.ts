/** Known Scallop mainnet package publishes (obligation keys + open_obligation events). */
export const SCALLOP_OBLIGATION_KEY_TYPES = [
  "0xde5c09ad171544aa3724dc67216668c80e754860f419136a68d78504eb2e2805::obligation::ObligationKey",
  "0x07871c4b3c847a0f674510d4978d5cf6f960452795e8ff6f189fd2088a3f6ac7::obligation::ObligationKey",
  "0xd384ded6b9e7f4d2c4c9007b0291ef88fbfed8e709bce83d2da69de2d79d013d::obligation::ObligationKey",
] as const;

export const SCALLOP_PROTOCOL_PACKAGES = [
  "0xde5c09ad171544aa3724dc67216668c80e754860f419136a68d78504eb2e2805",
  "0xefe8b36d5b2e43728cc323298626b83177803521d195cfb11e15b910e892fddf",
  "0xd384ded6b9e7f4d2c4c9007b0291ef88fbfed8e709bce83d2da69de2d79d013d",
] as const;

/** Scallop market coin (sCoin) → underlying asset type (mainnet). */
export const SCALLOP_SCOIN_UNDERLYING: Record<string, string> = {
  "0xaafc4f740de0dd0dde642a31148fb94517087052f19afb0f7bed1dc41a50c77b::scallop_sui::SCALLOP_SUI":
    "0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI",
  "0x854950aa624b1df59fe64e630b2ba7c550642e9342267a33061d59fb31582da5::scallop_usdc::SCALLOP_USDC":
    "0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC",
  "0xad4d71551d31092230db1fd482008ea42867dbf27b286e9c70a79d2a6191d58d::scallop_wormhole_usdc::SCALLOP_WORMHOLE_USDC":
    "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d56ebf89::wormhole::USDC",
  "0xe6e5a012ec20a49a3d1d57bd2b67140b96cd4d3400b9d79e541f7bdbab661f95::scallop_wormhole_usdt::SCALLOP_WORMHOLE_USDT":
    "0xc060006111016b8a160020d8121c86d207b97e9c7eb0408c697da5de7ed817b0::coin::COIN",
  "0x67540ceb850d418679e69f1fb6b2093d6df78a2a699ffc733f7646096d552e9b::scallop_wormhole_eth::SCALLOP_WORMHOLE_ETH":
    "0xc060006111016b8a160020d8121c86d207b97e9c7eb0408c697da5de7ed817b0::coin::COIN",
  "0x5ca17430c1d046fae9edeaa8fd76c7b4193a00d764a0ecfa9418d733ad27bc1e::scallop_sca::SCALLOP_SCA":
    "0x7016ffcb1500dcff057e1c9eceb2087dd62777b6b31fb4f1f99c472b6039c643::sca::SCA",
  "0xea346ce428f91ab007210443efcea5f5cdbbb3aae7e9affc0ca93f9203c31f0c::scallop_cetus::SCALLOP_CETUS":
    "0x686163a4822672575d00dd4f57e0e7ec561b575a0885b34844c9ad0edd763721::cetus::CETUS",
  "0xeb7a05a3224837c5e5503575aed0be73c091d1ce5e43aa3c3e716e0ae614608f::scallop_deep::SCALLOP_DEEP":
    "0xdeeb7a4662eec9f2d29598cc93a339c904941179de1140a2732e7a7a793d2d43::deep::DEEP",
};

export function scallopObligationKeyFilter(): Record<string, unknown> {
  if ((SCALLOP_OBLIGATION_KEY_TYPES.length as number) === 1) {
    return { StructType: SCALLOP_OBLIGATION_KEY_TYPES[0] };
  }
  return {
    MatchAny: SCALLOP_OBLIGATION_KEY_TYPES.map((StructType) => ({ StructType })),
  };
}

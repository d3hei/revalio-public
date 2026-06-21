import "dotenv/config";

function env(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  nodeEnv: env("NODE_ENV", "development"),
  api: {
    host: env("API_HOST", "0.0.0.0"),
    port: Number(env("API_PORT", "3001")),
  },
  databaseUrl: env("DATABASE_URL", "postgres://revalio:revalio@localhost:5432/revalio"),
  redisUrl: env("REDIS_URL", "redis://localhost:6379"),
  sui: {
    network: env("SUI_NETWORK", "testnet"),
    rpcUrl: env("SUI_RPC_URL", "https://fullnode.testnet.sui.io:443"),
    // RPC used for on-demand DeFi position discovery (suix_getOwnedObjects).
    // DeFi discovery is a MAINNET read-only feature, so this defaults to mainnet
    // directly — independent of the (testnet) indexer RPC above. Cetus SDK
    // recommends dedicated indexers over the public fullnode for owned-object queries.
    defiRpcUrl: env(
      "SUI_DEFI_RPC_URL",
      "https://cetus-mainnet-endpoint.blockvision.org",
    ),
    defiRpcFallbacks: env(
      "SUI_DEFI_RPC_FALLBACKS",
      "https://fullnode.mainnet.sui.io:443,https://rpc-mainnet.suiscan.xyz:443,https://cetus-suimain-e31f.mainnet.sui.rpcpool.com",
    )
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  },
  prices: {
    hermesUrl: env("PYTH_HERMES_URL", "https://hermes.pyth.network"),
    coingeckoUrl: env("COINGECKO_API_BASE", "https://api.coingecko.com/api/v3"),
  },
  /** Ember Protocol vault metadata + account positions (mainnet). */
  ember: {
    apiBase: env("EMBER_VAULTS_API_BASE", "https://vaults.api.sui-prod.bluefin.io"),
  },
  /** Temporary DeFi enrichment (Cetus/Navi/…); swap adapters to native decoders later. */
  blockvision: {
    apiKey: env("BLOCKVISION_API_KEY", ""),
    baseUrl: env("BLOCKVISION_API_BASE", "https://api.blockvision.org/v2"),
    // Comma-separated protocols to query (each costs 1 API call). Empty = native only.
    protocols: env("BLOCKVISION_PROTOCOLS", "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  },
} as const;

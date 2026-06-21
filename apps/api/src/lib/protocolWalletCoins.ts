import { getEmberReceiptCoinTypes } from "./positions/sources/ember/emberVaults.js";
import { getScallopMarketCoinTypes } from "./positions/sources/native/scallopScoin.js";

/** Coin types held as DeFi position receipts — hide from Wallet token list. */
export async function getWalletHiddenCoinTypes(): Promise<Set<string>> {
  const [ember, scallop] = await Promise.all([
    getEmberReceiptCoinTypes(),
    getScallopMarketCoinTypes(),
  ]);
  return new Set([...ember, ...scallop]);
}

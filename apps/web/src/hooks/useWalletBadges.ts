import { useCallback, useEffect, useState } from "react";
import {
  BADGES_CHANGED_EVENT,
  BADGES_STORAGE_KEY,
  readWalletBadges,
  type MintedBadge,
} from "../lib/badges.js";
import { normalizeSuiAddress } from "../lib/sui.js";

export function useWalletBadges(address: string): MintedBadge[] {
  const normalized = normalizeSuiAddress(address);
  const [badges, setBadges] = useState(() => readWalletBadges(normalized));

  const sync = useCallback(() => {
    setBadges(readWalletBadges(normalized));
  }, [normalized]);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    window.addEventListener(BADGES_CHANGED_EVENT, sync);
    const onStorage = (event: StorageEvent) => {
      if (event.key === BADGES_STORAGE_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(BADGES_CHANGED_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, [sync]);

  return badges;
}

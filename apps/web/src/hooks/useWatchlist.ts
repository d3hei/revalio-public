import { useCallback, useEffect, useState } from "react";
import {
  readWatchlist,
  WATCHLIST_CHANGED_EVENT,
  WATCHLIST_STORAGE_KEY,
} from "../lib/watchlist.js";

export function useWatchlist(): string[] {
  const [list, setList] = useState(readWatchlist);

  const sync = useCallback(() => {
    setList(readWatchlist());
  }, []);

  useEffect(() => {
    window.addEventListener(WATCHLIST_CHANGED_EVENT, sync);
    const onStorage = (event: StorageEvent) => {
      if (event.key === WATCHLIST_STORAGE_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(WATCHLIST_CHANGED_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, [sync]);

  return list;
}

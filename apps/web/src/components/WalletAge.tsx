import { useQuery } from "@tanstack/react-query";
import { getWalletAge } from "../api/client.js";

/** Wallet age (first transaction) — Revalio-style metric. */
export function WalletAge({ address }: { address: string }) {
  const { data } = useQuery({
    queryKey: ["age", address],
    queryFn: () => getWalletAge(address),
    staleTime: 10 * 60_000,
  });

  const ts = data?.firstTimestampMs ? Number(data.firstTimestampMs) : null;
  if (!ts || !Number.isFinite(ts) || ts <= 0) return null;

  const days = Math.floor((Date.now() - ts) / 86_400_000);
  return (
    <p className="wallet-age">
      wallet age: <b>{days}d</b>
    </p>
  );
}

import { useQuery } from "@tanstack/react-query";
import { getWallet } from "../api/client.js";
import { symbolFromCoinType } from "../lib/coinType.js";
import { formatAmount, formatUsd } from "../lib/format.js";
import { resolveTokenIconUrl } from "../lib/tokenIcons.js";
import { CopyClipboardButton } from "./CopyClipboardButton.js";
import { TokenSymbolLine } from "./TokenSymbolLine.js";

interface Props {
  address: string;
}

export function WalletView({ address }: Props) {
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["wallet", address],
    queryFn: () => getWallet(address),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-header">Wallet</div>
        <div className="state">
          <div className="spinner" />
          Loading wallet…
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card">
        <div className="card-header">Wallet</div>
        <div className="state error">
          Failed to load wallet: {(error as Error).message}
          <button className="retry" onClick={() => void refetch()} disabled={isFetching}>
            {isFetching ? "Retrying…" : "Retry"}
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.tokens.length === 0) {
    return null;
  }

  return (
    <div className="card">
      <div className="card-header portfolio-header">
        <span>Wallet</span>
        <span className="portfolio-total">{formatUsd(data.totalUsd)}</span>
      </div>
      {data.tokens.map((t) => {
        const symbol = t.symbol ?? symbolFromCoinType(t.coinType) ?? "Unknown";
        const displayName = t.name && t.name !== symbol ? t.name : null;
        return (
          <div className="token-row" key={t.coinType}>
            <div className="token-info">
              <TokenSymbolLine
                className="token-symbol"
                iconUrl={resolveTokenIconUrl(symbol)}
                label={
                  <>
                    {symbol}
                    {displayName ? <span className="token-name-muted"> · {displayName}</span> : null}
                  </>
                }
                trailing={
                  <CopyClipboardButton
                    text={t.coinType}
                    ariaLabel="Copy coin type"
                    title="Copy coin type"
                  />
                }
              />
            </div>
            <div className="token-values">
              <div className="token-amount">
                {formatAmount(t.amount, t.decimals)} {symbol !== "Unknown" ? symbol : ""}
              </div>
              <div className="token-usd">
                {t.valueUsd !== null ? formatUsd(t.valueUsd) : "—"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

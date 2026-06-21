import { useQuery } from "@tanstack/react-query";
import { LabChart } from "./LabChart.js";
import { LabPositions } from "./LabPositions.js";
import { getWalletOverview, overviewErrorMessage } from "../api/client.js";
import { symbolFromCoinType } from "../lib/coinType.js";
import { formatAmount, formatUsd } from "../lib/format.js";
import { resolveTokenIconUrl } from "../lib/tokenIcons.js";
import { resolveWalletAvatarUrl, isDefaultWalletAvatar, walletDisplayName } from "../lib/walletProfile.js";
import { CopyClipboardButton } from "../components/CopyClipboardButton.js";
import { TokenSymbolLine } from "../components/TokenSymbolLine.js";

interface Props {
  address: string;
}

export function LabDashboard({ address }: Props) {
  const { data: overview, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["overview", address],
    queryFn: () => getWalletOverview(address),
    staleTime: 30_000,
  });

  const wallet = overview?.wallet;
  const profile = overview?.profile;
  const portfolio = overview?.portfolio;
  const positions = overview?.positions;

  const displayName = walletDisplayName(profile?.nickname);
  const avatarSrc = resolveWalletAvatarUrl(profile?.avatar);
  const defaultAvatar = isDefaultWalletAvatar(profile?.avatar);

  if (isLoading && !overview) {
    return <div className="lab-muted lab-dashboard-loading">Loading portfolio…</div>;
  }

  if (isError && !overview) {
    return (
      <div className="lab-muted lab-dashboard-loading">
        {overviewErrorMessage(error)}{" "}
        <button type="button" className="lab-link-btn" onClick={() => void refetch()} disabled={isFetching}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="lab-dashboard">
      <div className="lab-card lab-profile">
        <div className={`lab-avatar${defaultAvatar ? " lab-avatar--default" : ""}`}>
          <img src={avatarSrc} alt="" />
        </div>
        <div>
          <div className="lab-profile-name">{displayName}</div>
          <div className="lab-profile-addr">{address}</div>
          {profile?.bio ? (
            <p style={{ margin: "10px 0 0", fontSize: 14, color: "var(--lab-text-dim)", maxWidth: 560 }}>
              {profile.bio}
            </p>
          ) : null}
        </div>
      </div>

      <LabChart address={address} portfolio={portfolio} />

      <div className="lab-card">
        <div className="lab-card-header">
          <span className="lab-card-title">Tokens</span>
          <span className="lab-card-value">{formatUsd(wallet?.totalUsd ?? null)}</span>
        </div>
        {!wallet ? (
          <div className="lab-muted">Loading tokens…</div>
        ) : wallet.tokens.length === 0 ? (
          <div className="lab-muted">No tokens found.</div>
        ) : (
          wallet.tokens.map((t) => {
            const sym = t.symbol ?? symbolFromCoinType(t.coinType) ?? "?";
            const displayName = t.name && t.name !== sym ? t.name : null;
            return (
              <div className="lab-row" key={t.coinType}>
                <div className="lab-row-main">
                  <TokenSymbolLine
                    className="lab-row-symbol"
                    iconUrl={resolveTokenIconUrl(sym)}
                    label={
                      <>
                        {sym}
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
                <div className="lab-row-values">
                  <div className="lab-row-amount">
                    {formatAmount(t.amount, t.decimals)} {sym}
                  </div>
                  <div className="lab-row-usd">{formatUsd(t.valueUsd)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <LabPositions
        positions={positions?.positions}
        totalUsd={positions?.totalUsd}
        isLoading={!positions && isFetching}
        isError={isError && !positions}
        onRetry={() => void refetch()}
        isRetrying={isFetching}
      />
    </div>
  );
}

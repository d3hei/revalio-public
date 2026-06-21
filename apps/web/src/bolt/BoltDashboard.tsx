import { useQuery } from "@tanstack/react-query";
import {
  getActivity,
  getPortfolio,
  getPositions,
  getWallet,
  getWalletProfile,
} from "../api/client.js";
import { formatUsd } from "../lib/format.js";
import { shortenAddress } from "../lib/sui.js";
import { resolveWalletAvatarUrl, isDefaultWalletAvatar, walletDisplayName } from "../lib/walletProfile.js";
import { BoltBarChart } from "./BoltBarChart.js";
import { BoltCompositionGauge } from "./BoltCompositionGauge.js";
import { BoltKpiCards } from "./BoltKpiCards.js";
import { BoltTokensTable } from "./BoltTokensTable.js";

type Tab = "portfolio" | "positions" | "activity";

interface Props {
  address: string;
  tab: Tab;
}

export function BoltDashboard({ address, tab }: Props) {
  const { data: portfolio } = useQuery({
    queryKey: ["portfolio", address],
    queryFn: () => getPortfolio(address),
  });
  const { data: wallet } = useQuery({
    queryKey: ["wallet", address],
    queryFn: () => getWallet(address),
  });
  const { data: positions } = useQuery({
    queryKey: ["positions", address],
    queryFn: () => getPositions(address),
  });
  const { data: profile } = useQuery({
    queryKey: ["profile", address],
    queryFn: () => getWalletProfile(address),
  });
  const { data: activity } = useQuery({
    queryKey: ["activity", address],
    queryFn: () => getActivity(address, undefined, 12),
    enabled: tab === "activity",
  });

  const displayName = walletDisplayName(profile?.nickname);
  const avatarSrc = resolveWalletAvatarUrl(profile?.avatar);
  const defaultAvatar = isDefaultWalletAvatar(profile?.avatar);
  const protocolCount = new Set(positions?.positions.map((p) => p.protocol) ?? []).size;

  if (tab === "positions") {
    return (
      <div className="bolt-dashboard">
        <div className="bolt-page-head">
          <h2>DeFi positions</h2>
          <p>{shortenAddress(address)} · {formatUsd(positions?.totalUsd ?? null)} total</p>
        </div>
        <div className="bolt-card bolt-table-card">
          {!positions?.positions.length ? (
            <div className="bolt-empty">No positions found for this wallet.</div>
          ) : (
            <table className="bolt-table">
              <thead>
                <tr>
                  <th>Protocol</th>
                  <th>Type</th>
                  <th>Label</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {positions.positions.map((p, i) => (
                  <tr key={p.objectId ?? `${p.protocol}-${i}`}>
                    <td>
                      <span className="bolt-table-primary">{p.protocol}</span>
                    </td>
                    <td>{p.positionType}</td>
                    <td className="bolt-table-muted">{p.label}</td>
                    <td className="bolt-table-value">{formatUsd(p.valueUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  if (tab === "activity") {
    return (
      <div className="bolt-dashboard">
        <div className="bolt-page-head">
          <h2>Recent activity</h2>
          <p>{shortenAddress(address)}</p>
        </div>
        <div className="bolt-card bolt-table-card">
          {!activity?.items.length ? (
            <div className="bolt-empty">No recent transactions.</div>
          ) : (
            <table className="bolt-table">
              <thead>
                <tr>
                  <th>Kind</th>
                  <th>Digest</th>
                  <th>Checkpoint</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {activity.items.map((item) => (
                  <tr key={item.txDigest}>
                    <td>
                      <span className="bolt-status bolt-status-ok">{item.kind ?? "tx"}</span>
                    </td>
                    <td className="bolt-table-muted">{item.txDigest.slice(0, 18)}…</td>
                    <td>{item.checkpoint}</td>
                    <td className="bolt-table-muted">
                      {item.timestampMs
                        ? new Date(Number(item.timestampMs)).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bolt-dashboard">
      <div className="bolt-profile-banner">
        <div className={`bolt-profile-banner-avatar${defaultAvatar ? " bolt-profile-banner-avatar--default" : ""}`}>
          <img src={avatarSrc} alt="" />
        </div>
        <div>
          <h2>{displayName}</h2>
          <p className="bolt-profile-banner-addr">{address}</p>
          {profile?.bio ? <p className="bolt-profile-banner-bio">{profile.bio}</p> : null}
        </div>
      </div>

      <BoltKpiCards
        totalUsd={portfolio?.totalUsd ?? wallet?.totalUsd ?? null}
        tokensUsd={portfolio?.tokensUsd ?? wallet?.totalUsd ?? null}
        positionsUsd={portfolio?.positionsUsd ?? positions?.totalUsd ?? null}
        protocolCount={protocolCount}
        tokenCount={wallet?.tokens.length ?? 0}
      />

      <div className="bolt-charts-row">
        <BoltBarChart address={address} />
        <BoltCompositionGauge
          tokensUsd={portfolio?.tokensUsd ?? wallet?.totalUsd ?? 0}
          positionsUsd={portfolio?.positionsUsd ?? positions?.totalUsd ?? 0}
        />
      </div>

      <BoltTokensTable tokens={wallet?.tokens ?? []} loading={!wallet} />
    </div>
  );
}

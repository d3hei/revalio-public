import { BADGE_CATALOG } from "../lib/badges.js";
import { BadgeCard } from "../components/BadgeCard.js";

/** Badge gallery — claim Revalio badges to your connected wallet. */
export function BadgesPage() {
  const badge = BADGE_CATALOG[0]!;

  return (
    <div className="dashboard badges-page">
      <div className="card badges-page-card">
        <div className="card-header">Badges</div>
        <div className="badges-page-inner">
          <p className="badges-page-lead">
            Collect on-chain identity badges for exploring Sui with Revalio.
          </p>
          <BadgeCard badge={badge} showMint />
        </div>
      </div>
    </div>
  );
}

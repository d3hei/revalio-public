import { useOutletContext } from "react-router-dom";
import { Link } from "react-router-dom";
import { BadgeCard } from "../components/BadgeCard.js";
import { useWalletBadges } from "../hooks/useWalletBadges.js";
import { BADGE_CATALOG, getBadgeDefinition } from "../lib/badges.js";
import { shortenAddress } from "../lib/sui.js";

export function ProfileBadgesPage() {
  const { address } = useOutletContext<{ address: string }>();
  const minted = useWalletBadges(address);
  const owned = minted
    .map((entry) => getBadgeDefinition(entry.badgeId))
    .filter((badge): badge is NonNullable<typeof badge> => badge !== undefined);

  return (
    <div className="card">
      <div className="card-header">Badges</div>
      {owned.length === 0 ? (
        <div className="state">
          No badges minted for {shortenAddress(address)} yet.
        </div>
      ) : (
        <div className="profile-badges-grid">
          {owned.map((badge) => (
            <BadgeCard key={badge.id} badge={badge} />
          ))}
        </div>
      )}
      {owned.length === 0 && BADGE_CATALOG.length > 0 ? (
        <p className="badges-profile-hint">
          Visit <Link to="/badges">Other → Badges</Link> to mint the Revalio mainnet badge.
        </p>
      ) : null}
    </div>
  );
}

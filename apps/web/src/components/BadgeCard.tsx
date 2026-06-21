import type { BadgeDefinition } from "../lib/badges.js";
import { BadgeMintButton } from "./BadgeMintButton.js";

interface Props {
  badge: BadgeDefinition;
  showMint?: boolean;
}

export function BadgeCard({ badge, showMint = false }: Props) {
  return (
    <article className="badge-card">
      <div className="badge-card-media">
        <img src={badge.imageUrl} alt={badge.name} width={220} height={242} loading="lazy" />
      </div>
      <h3 className="badge-card-title">{badge.name}</h3>
      <p className="badge-card-desc">{badge.description}</p>
      {showMint ? <BadgeMintButton badge={badge} className="pagination-btn badge-mint-btn" /> : null}
    </article>
  );
}

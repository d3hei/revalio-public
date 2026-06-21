import type { ReactNode } from "react";
import type { Position } from "../api/client.js";
import { positionTitleIconUrl } from "../lib/positionDisplay.js";
import { PositionAssetLine } from "./PositionAssetLine.js";

interface Props {
  position: Position;
  badge: ReactNode;
  titleClassName?: string;
}

export function PositionRowInfo({
  position,
  badge,
  titleClassName = "token-symbol",
}: Props) {
  const titleIconUrl = positionTitleIconUrl(position);

  return (
    <>
      <div className={titleClassName}>
        {titleIconUrl ? (
          <img className="token-coin-icon" src={titleIconUrl} alt="" width={18} height={18} />
        ) : null}
        <span>{position.label}</span>
        {badge}
      </div>
      <PositionAssetLine position={position} />
    </>
  );
}

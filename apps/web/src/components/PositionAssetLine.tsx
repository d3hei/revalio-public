import { positionCoinIconUrl, positionSubtitle } from "../lib/positionDisplay.js";
import type { Position } from "../api/client.js";
import { TokenSymbolLine } from "./TokenSymbolLine.js";

interface Props {
  position: Position;
}

export function PositionAssetLine({ position }: Props) {
  return (
    <TokenSymbolLine
      label={positionSubtitle(position)}
      iconUrl={positionCoinIconUrl(position)}
    />
  );
}

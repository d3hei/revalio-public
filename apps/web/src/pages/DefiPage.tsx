import { useOutletContext } from "react-router-dom";
import { PositionsView } from "../components/PositionsView.js";

export function DefiPage() {
  const { address } = useOutletContext<{ address: string }>();
  return <PositionsView address={address} />;
}

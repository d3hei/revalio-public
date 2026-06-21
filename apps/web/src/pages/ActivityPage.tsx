import { useOutletContext } from "react-router-dom";
import { ActivityFeed } from "../components/ActivityFeed.js";

export function ActivityPage() {
  const { address } = useOutletContext<{ address: string }>();
  return <ActivityFeed address={address} />;
}

import { useOutletContext } from "react-router-dom";
import { NftGallery } from "../components/NftGallery.js";

export function NftsPage() {
  const { address } = useOutletContext<{ address: string }>();
  return <NftGallery address={address} />;
}

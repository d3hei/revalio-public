import { useCurrentAccount } from "@mysten/dapp-kit";
import { Outlet, useParams } from "react-router-dom";
import { ProfileTabs } from "../components/ProfileTabs.js";
import { WalletProfile } from "../components/WalletProfile.js";
import { isValidSuiAddress, normalizeSuiAddress } from "../lib/sui.js";

/** Profile shell: header card + wallet age + tab bar, with nested tab pages. */
export function ProfileLayout() {
  const { address: raw } = useParams();
  const account = useCurrentAccount();

  if (!raw || !isValidSuiAddress(raw)) {
    return (
      <div className="state error">
        Invalid Sui address — use 0x + 64 hex characters.
      </div>
    );
  }

  const address = normalizeSuiAddress(raw);
  const connected = account?.address ? normalizeSuiAddress(account.address) : null;
  const canEdit = connected === address;

  return (
    <div className="dashboard">
      <WalletProfile address={address} canEdit={canEdit} />
      <ProfileTabs address={address} />
      <Outlet context={{ address }} />
    </div>
  );
}

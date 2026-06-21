import { NavLink } from "react-router-dom";

const TABS = [
  { to: "", label: "Overview", end: true },
  { to: "tokens", label: "Tokens" },
  { to: "defi", label: "DeFi" },
  { to: "analysis", label: "Analysis" },
  { to: "nfts", label: "NFTs" },
  { to: "activity", label: "Activity" },
  { to: "badges", label: "Badges" },
];

/** Hiro-style tab bar for the profile pages (violet underline on active). */
export function ProfileTabs({ address }: { address: string }) {
  return (
    <nav className="profile-tabs" aria-label="Profile sections">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to ? `/${address}/${t.to}` : `/${address}`}
          end={t.end}
          className={({ isActive }) => "profile-tab" + (isActive ? " active" : "")}
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

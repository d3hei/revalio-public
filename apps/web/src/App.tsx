import { Route, Routes } from "react-router-dom";
import { Layout } from "./pages/Layout.js";
import { LandingPage } from "./pages/LandingPage.js";
import { ProfileLayout } from "./pages/ProfileLayout.js";
import { OverviewPage } from "./pages/OverviewPage.js";
import { TokensPage } from "./pages/TokensPage.js";
import { DefiPage } from "./pages/DefiPage.js";
import { AnalysisPage } from "./pages/AnalysisPage.js";
import { NftsPage } from "./pages/NftsPage.js";
import { ActivityPage } from "./pages/ActivityPage.js";
import { BadgesPage } from "./pages/BadgesPage.js";
import { ProfileBadgesPage } from "./pages/ProfileBadgesPage.js";
import { WatchlistPage } from "./pages/WatchlistPage.js";
import { WhalesPage } from "./pages/WhalesPage.js";
import { ComparePage } from "./pages/ComparePage.js";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/whales" element={<WhalesPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/compare/:a/:b" element={<ComparePage />} />
        <Route path="/badges" element={<BadgesPage />} />
        <Route path="/:address" element={<ProfileLayout />}>
          <Route index element={<OverviewPage />} />
          <Route path="tokens" element={<TokensPage />} />
          <Route path="defi" element={<DefiPage />} />
          <Route path="analysis" element={<AnalysisPage />} />
          <Route path="nfts" element={<NftsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="badges" element={<ProfileBadgesPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

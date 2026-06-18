import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { api } from "./api";
import { Closet } from "./pages/Closet";
import { Upload } from "./pages/Upload";
import { OutfitDetail } from "./pages/OutfitDetail";
import { Compare } from "./pages/Compare";
import { Leaderboard } from "./pages/Leaderboard";
import { GuidedRanking } from "./pages/GuidedRanking";
import { Requests } from "./pages/Requests";
import { Feed } from "./pages/Feed";
import { Profile } from "./pages/Profile";
import { StyleDna } from "./pages/StyleDna";
import { Stylist } from "./pages/Stylist";
import { Search } from "./pages/Search";
import { Challenges } from "./pages/Challenges";
import { ChallengeDetail } from "./pages/ChallengeDetail";
import type { UserProfile } from "../shared/types";

// App shell: loads the signed-in profile, then renders the routed views with a
// mobile-first bottom nav. More tabs (rankings, feed, search) arrive later.
export function App() {
  const [me, setMe] = useState<UserProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    api
      .me()
      .then(setMe)
      .catch(() => setMe(null))
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return <div className="boot">…</div>;
  }

  return (
    <HashRouter>
      <div className="shell">
        <header className="topbar">
          <span className="logo">Outfittr</span>
          {me && (
            <a className="handle" href={`#/u/${me.handle}`}>
              @{me.handle}
            </a>
          )}
        </header>

        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/feed" replace />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/closet" element={<Closet />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/outfit/:id" element={<OutfitDetail />} />
            <Route path="/rank" element={<Compare />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/guided" element={<GuidedRanking />} />
            <Route path="/requests" element={<Requests />} />
            <Route path="/u/:handle" element={<Profile />} />
            <Route path="/style-dna" element={<StyleDna />} />
            <Route path="/stylist" element={<Stylist />} />
            <Route path="/search" element={<Search />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/challenge/:id" element={<ChallengeDetail />} />
            <Route path="*" element={<Navigate to="/feed" replace />} />
          </Routes>
        </main>

        <nav className="tabbar">
          <NavLink to="/feed">Feed</NavLink>
          <NavLink to="/search">Search</NavLink>
          <NavLink to="/closet">Closet</NavLink>
          <NavLink to="/rank">Rank</NavLink>
          <NavLink to="/upload">Upload</NavLink>
        </nav>
      </div>
    </HashRouter>
  );
}

import { useEffect, useState } from "react";
import { HashRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { api } from "./api";
import { Closet } from "./pages/Closet";
import { Upload } from "./pages/Upload";
import { OutfitDetail } from "./pages/OutfitDetail";
import { Compare } from "./pages/Compare";
import { Leaderboard } from "./pages/Leaderboard";
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
          {me && <span className="handle">@{me.handle}</span>}
        </header>

        <main className="content">
          <Routes>
            <Route path="/" element={<Navigate to="/closet" replace />} />
            <Route path="/closet" element={<Closet />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/outfit/:id" element={<OutfitDetail />} />
            <Route path="/rank" element={<Compare />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="*" element={<Navigate to="/closet" replace />} />
          </Routes>
        </main>

        <nav className="tabbar">
          <NavLink to="/closet">Closet</NavLink>
          <NavLink to="/rank">Rank</NavLink>
          <NavLink to="/leaderboard">Ranks</NavLink>
          <NavLink to="/upload">Upload</NavLink>
        </nav>
      </div>
    </HashRouter>
  );
}

import { useEffect, useState } from "react";
import { api } from "../api";
import { outfitImageUrl, type Outfit } from "../../shared/types";

type Tab = "following" | "trending";

// Social discovery: switch between the following feed (accounts you follow) and
// the trending feed (top public outfits). Both are KV-cached server-side.
export function Feed() {
  const [tab, setTab] = useState<Tab>("following");
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const load = tab === "following" ? api.followingFeed() : api.trendingFeed();
    load.then(setOutfits).finally(() => setLoading(false));
  }, [tab]);

  return (
    <section className="feed">
      <div className="chips">
        <button
          className={tab === "following" ? "chip active" : "chip"}
          onClick={() => setTab("following")}
        >
          Following
        </button>
        <button
          className={tab === "trending" ? "chip active" : "chip"}
          onClick={() => setTab("trending")}
        >
          Trending
        </button>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : outfits.length === 0 ? (
        <p className="muted">
          {tab === "following"
            ? "Follow people to see their looks here."
            : "Nothing trending yet."}
        </p>
      ) : (
        <div className="feed-list">
          {outfits.map((o) => (
            <a key={o.id} className="feed-card" href={`#/outfit/${o.id}`}>
              <img src={outfitImageUrl(o.id)} alt={o.caption ?? "outfit"} loading="lazy" />
              {o.caption && <p className="feed-caption">{o.caption}</p>}
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

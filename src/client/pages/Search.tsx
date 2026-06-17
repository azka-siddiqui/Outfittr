import { useState } from "react";
import { api } from "../api";
import { outfitImageUrl, type Outfit, type UserSummary } from "../../shared/types";

type Scope = "world" | "following" | "closet";
const SCOPES: Scope[] = ["world", "following", "closet"];

// Search people, brands, and outfits. Server-side this blends keyword matching
// with Vectorize semantic search, scoped to world / following / your closet.
export function Search() {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState<Scope>("world");
  const [people, setPeople] = useState<UserSummary[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [searched, setSearched] = useState(false);

  async function run() {
    if (!q.trim()) return;
    const res = await api.search(q.trim(), scope);
    setPeople(res.people);
    setOutfits(res.outfits);
    setSearched(true);
  }

  return (
    <section className="search">
      <h2>Search</h2>

      <div className="search-bar">
        <input
          placeholder="Brands, aesthetics, people…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
        />
        <button onClick={run} disabled={!q.trim()}>
          Go
        </button>
      </div>

      <div className="chips">
        {SCOPES.map((s) => (
          <button
            key={s}
            className={scope === s ? "chip active" : "chip"}
            onClick={() => setScope(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {people.length > 0 && (
        <ul className="user-list">
          {people.map((p) => (
            <li key={p.id}>
              <a href={`#/u/${p.handle}`}>
                <strong>{p.displayName}</strong> <span className="muted">@{p.handle}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {outfits.length > 0 ? (
        <div className="grid">
          {outfits.map((o) => (
            <a key={o.id} className="tile" href={`#/outfit/${o.id}`}>
              <img src={outfitImageUrl(o.id)} alt={o.caption ?? "outfit"} loading="lazy" />
            </a>
          ))}
        </div>
      ) : (
        searched && people.length === 0 && <p className="muted">No results.</p>
      )}
    </section>
  );
}

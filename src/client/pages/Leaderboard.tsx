import { useEffect, useState } from "react";
import { api } from "../api";
import { outfitImageUrl, DIMENSION_LABELS, type Outfit, type Dimension } from "../../shared/types";

const DIMENSIONS: Dimension[] = ["overall", "aesthetic", "occasion"];

function eloFor(o: Outfit, d: Dimension): number {
  if (d === "overall") return o.eloOverall;
  if (d === "aesthetic") return o.eloAesthetic;
  return o.eloOccasion;
}

// Per-dimension leaderboards of the caller's outfits, ranked by Elo.
export function Leaderboard() {
  const [dimension, setDimension] = useState<Dimension>("overall");
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .leaderboard(dimension)
      .then((r) => setOutfits(r.outfits))
      .finally(() => setLoading(false));
  }, [dimension]);

  return (
    <section className="leaderboard">
      <h2>Leaderboard</h2>

      <div className="chips">
        {DIMENSIONS.map((d) => (
          <button
            key={d}
            className={dimension === d ? "chip active" : "chip"}
            onClick={() => setDimension(d)}
          >
            {DIMENSION_LABELS[d]}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : outfits.length === 0 ? (
        <p className="muted">No ranked outfits yet.</p>
      ) : (
        <ol className="ranked">
          {outfits.map((o, i) => (
            <li key={o.id}>
              <span className="rank">{i + 1}</span>
              <a className="ranked-thumb" href={`#/outfit/${o.id}`}>
                <img src={outfitImageUrl(o.id)} alt={o.caption ?? "outfit"} loading="lazy" />
              </a>
              <span className="rank-elo">{Math.round(eloFor(o, dimension))}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

import { useEffect, useState } from "react";
import { api } from "../api";
import type { StyleDna as Dna } from "../../shared/types";

// The Style DNA view: a narrative summary plus wardrobe breakdowns (aesthetics,
// occasions, favorite brands).
export function StyleDna() {
  const [dna, setDna] = useState<Dna | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .styleDna()
      .then(setDna)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="muted">Analyzing your wardrobe…</p>;
  if (!dna) return <p className="muted">Couldn't load your Style DNA.</p>;

  return (
    <section className="dna">
      <h2>Style DNA</h2>
      <p className="dna-summary">{dna.summary}</p>
      <p className="muted">{dna.outfitCount} outfits analyzed</p>

      {dna.aesthetics.length > 0 && (
        <div className="dna-block">
          <h3>Aesthetics</h3>
          {dna.aesthetics.map((a) => (
            <div key={a.aesthetic} className="bar-row">
              <span className="bar-label">{a.aesthetic}</span>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${a.percent}%` }} />
              </div>
              <span className="bar-pct">{a.percent}%</span>
            </div>
          ))}
        </div>
      )}

      {dna.occasions.length > 0 && (
        <div className="dna-block">
          <h3>Occasions</h3>
          {dna.occasions.map((o) => (
            <div key={o.occasion} className="bar-row">
              <span className="bar-label">{o.occasion}</span>
              <div className="bar">
                <div className="bar-fill alt" style={{ width: `${o.percent}%` }} />
              </div>
              <span className="bar-pct">{o.percent}%</span>
            </div>
          ))}
        </div>
      )}

      {dna.favoriteBrands.length > 0 && (
        <div className="dna-block">
          <h3>Favorite brands</h3>
          <div className="brand-tags">
            {dna.favoriteBrands.map((b) => (
              <span key={b.brand} className="brand-tag">
                {b.brand} <em>×{b.count}</em>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

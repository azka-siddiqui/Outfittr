import { useEffect, useState } from "react";
import { api } from "../api";
import { outfitImageUrl, type Outfit, type Collection } from "../../shared/types";

type Facets = { aesthetics: string[]; occasions: string[] };

// The digital closet: the signed-in user's outfits, filterable by collection,
// aesthetic, and occasion. Tapping an outfit opens its detail (garment pins).
export function Closet() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [facets, setFacets] = useState<Facets>({ aesthetics: [], occasions: [] });
  const [collection, setCollection] = useState<string | undefined>();
  const [aesthetic, setAesthetic] = useState<string | undefined>();
  const [occasion, setOccasion] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  // Static filter lists load once; the grid reloads whenever a filter changes.
  useEffect(() => {
    Promise.all([api.collections(), api.facets()]).then(([cols, f]) => {
      setCollections(cols);
      setFacets(f);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .closet({ collection, aesthetic, occasion })
      .then(setOutfits)
      .finally(() => setLoading(false));
  }, [collection, aesthetic, occasion]);

  function toggle(
    value: string,
    current: string | undefined,
    set: (v: string | undefined) => void
  ) {
    set(current === value ? undefined : value);
  }

  return (
    <section className="closet">
      <header className="closet-head">
        <h2>Closet</h2>
      </header>

      <div className="chips">
        <button className={!collection ? "chip active" : "chip"} onClick={() => setCollection(undefined)}>
          All
        </button>
        {collections.map((col) => (
          <button
            key={col.id}
            className={collection === col.id ? "chip active" : "chip"}
            onClick={() => toggle(col.id, collection, setCollection)}
          >
            {col.name}
          </button>
        ))}
      </div>

      {(facets.aesthetics.length > 0 || facets.occasions.length > 0) && (
        <div className="chips filters">
          {facets.aesthetics.map((a) => (
            <button
              key={`a-${a}`}
              className={aesthetic === a ? "chip active" : "chip"}
              onClick={() => toggle(a, aesthetic, setAesthetic)}
            >
              {a}
            </button>
          ))}
          {facets.occasions.map((o) => (
            <button
              key={`o-${o}`}
              className={occasion === o ? "chip active occasion" : "chip occasion"}
              onClick={() => toggle(o, occasion, setOccasion)}
            >
              {o}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : outfits.length === 0 ? (
        <p className="muted">No outfits match these filters.</p>
      ) : (
        <div className="grid">
          {outfits.map((o) => (
            <a key={o.id} className="tile" href={`#/outfit/${o.id}`}>
              <img src={outfitImageUrl(o.id)} alt={o.caption ?? "outfit"} loading="lazy" />
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

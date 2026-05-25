import { useEffect, useState } from "react";
import { api } from "../api";
import { outfitImageUrl, type Outfit, type Collection } from "../../shared/types";

// The digital closet: the signed-in user's outfits, optionally scoped to a
// collection. Tapping an outfit opens its detail (garment pins) in a later
// commit; for now it's a responsive grid.
export function Closet() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeCollection, setActiveCollection] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.closet(activeCollection), api.collections()])
      .then(([o, cols]) => {
        setOutfits(o);
        setCollections(cols);
      })
      .finally(() => setLoading(false));
  }, [activeCollection]);

  return (
    <section className="closet">
      <header className="closet-head">
        <h2>Closet</h2>
      </header>

      <div className="chips">
        <button
          className={!activeCollection ? "chip active" : "chip"}
          onClick={() => setActiveCollection(undefined)}
        >
          All
        </button>
        {collections.map((col) => (
          <button
            key={col.id}
            className={activeCollection === col.id ? "chip active" : "chip"}
            onClick={() => setActiveCollection(col.id)}
          >
            {col.name}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : outfits.length === 0 ? (
        <p className="muted">No outfits yet. Upload your first look.</p>
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

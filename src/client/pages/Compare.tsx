import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { outfitImageUrl, DIMENSION_LABELS, type Outfit, type Dimension } from "../../shared/types";

const DIMENSIONS: Dimension[] = ["overall", "aesthetic", "occasion"];

// Head-to-head comparison. Pick a dimension, then choose the better of two
// outfits; each choice updates Elo and loads a fresh pair.
export function Compare() {
  const [dimension, setDimension] = useState<Dimension>("overall");
  const [pair, setPair] = useState<Outfit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notEnough, setNotEnough] = useState(false);

  const loadPair = useCallback(() => {
    setBusy(true);
    api
      .rankPair()
      .then((p) => {
        setPair(p);
        setNotEnough(false);
      })
      .catch(() => setNotEnough(true))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    loadPair();
  }, [loadPair]);

  async function choose(winner: Outfit, loser: Outfit) {
    if (busy) return;
    setBusy(true);
    await api.vote(dimension, winner.id, loser.id);
    loadPair();
  }

  return (
    <section className="compare">
      <h2>Rank</h2>

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

      {notEnough ? (
        <p className="muted">Upload at least two outfits to start ranking.</p>
      ) : !pair ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="versus">
          {pair.map((o) => (
            <button
              key={o.id}
              className="versus-card"
              disabled={busy}
              onClick={() => choose(o, pair.find((x) => x.id !== o.id)!)}
            >
              <img src={outfitImageUrl(o.id)} alt={o.caption ?? "outfit"} />
            </button>
          ))}
          <div className="versus-vs">vs</div>
        </div>
      )}
    </section>
  );
}

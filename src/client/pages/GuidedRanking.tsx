import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { outfitImageUrl, DIMENSION_LABELS, type Outfit, type Dimension } from "../../shared/types";

const DIMENSIONS: Dimension[] = ["overall", "aesthetic", "occasion"];
const ROUNDS = 5;

// The guided flow that runs right after an upload: a fixed number of quick
// head-to-head rounds to seed the new outfit's rankings. The just-uploaded
// outfit id is passed as ?new=<id> so we can bias pairs toward it.
export function GuidedRanking() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const newId = params.get("new");

  const [dimension, setDimension] = useState<Dimension>("overall");
  const [pair, setPair] = useState<Outfit[] | null>(null);
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [notEnough, setNotEnough] = useState(false);

  const loadPair = useCallback(() => {
    setBusy(true);
    api
      .rankPair()
      .then((p) => {
        // Cycle the dimension each round so all three get seeded.
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

    const next = round + 1;
    if (next >= ROUNDS) {
      setDone(true);
      setBusy(false);
      return;
    }
    setRound(next);
    setDimension(DIMENSIONS[next % DIMENSIONS.length]);
    loadPair();
  }

  if (notEnough) {
    return (
      <section className="guided">
        <h2>Nice upload!</h2>
        <p className="muted">Upload one more outfit to start ranking head to head.</p>
        <button onClick={() => navigate("/closet")}>Go to closet</button>
      </section>
    );
  }

  if (done) {
    return (
      <section className="guided">
        <h2>All set 🎉</h2>
        <p className="muted">Your new look is in the mix. Keep ranking any time.</p>
        <div className="guided-actions">
          <button onClick={() => navigate(newId ? `/outfit/${newId}` : "/closet")}>
            View outfit
          </button>
          <button className="ghost" onClick={() => navigate("/rank")}>
            Keep ranking
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="guided">
      <div className="guided-head">
        <h2>Quick rank</h2>
        <span className="muted">
          {round + 1}/{ROUNDS} · {DIMENSION_LABELS[dimension]}
        </span>
      </div>
      <p className="muted">Which is better for {DIMENSION_LABELS[dimension].toLowerCase()}?</p>

      {!pair ? (
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

      <button className="ghost skip" onClick={() => navigate("/closet")}>
        Skip for now
      </button>
    </section>
  );
}

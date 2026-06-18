import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { outfitImageUrl, type ChallengeDetail as Detail, type Outfit } from "../../shared/types";

// A single challenge: its entries ranked by challenge Elo, plus a way to enter
// one of your own outfits. Head-to-head voting is added in the next commit.
export function ChallengeDetail() {
  const { id = "" } = useParams();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [myOutfits, setMyOutfits] = useState<Outfit[]>([]);
  const [picking, setPicking] = useState(false);
  const [pair, setPair] = useState<{ id: string; outfitId: string }[] | null>(null);
  const [voteBusy, setVoteBusy] = useState(false);

  const load = useCallback(() => {
    api.challenge(id).then(setDetail).catch(() => setDetail(null));
  }, [id]);

  useEffect(() => {
    load();
    api.closet().then(setMyOutfits).catch(() => setMyOutfits([]));
  }, [load]);

  if (!detail) return <p className="muted">Loading…</p>;

  async function enter(outfitId: string) {
    await api.enterChallenge(id, outfitId);
    setPicking(false);
    load();
  }

  function loadPair() {
    api
      .challengePair(id)
      .then(setPair)
      .catch(() => setPair(null));
  }

  async function vote(winner: { id: string }, loser: { id: string }) {
    if (voteBusy) return;
    setVoteBusy(true);
    await api.challengeVote(id, winner.id, loser.id);
    setVoteBusy(false);
    loadPair();
    load();
  }

  const ended = detail.endsAt < Date.now();

  return (
    <section className="challenge-detail">
      <h2>{detail.title}</h2>
      {detail.description && <p className="muted">{detail.description}</p>}
      <p className="muted">
        {detail.type}
        {detail.aesthetic ? ` · ${detail.aesthetic}` : ""} · {ended ? "ended" : "active"}
      </p>

      {!ended && (
        <button className="secondary" onClick={() => setPicking((p) => !p)}>
          {picking ? "Cancel" : "Enter an outfit"}
        </button>
      )}

      {picking && (
        <div className="grid picker">
          {myOutfits.map((o) => (
            <button key={o.id} className="tile" onClick={() => enter(o.id)}>
              <img src={outfitImageUrl(o.id)} alt={o.caption ?? "outfit"} />
            </button>
          ))}
        </div>
      )}

      {detail.entries.length >= 2 && (
        <div className="challenge-vote">
          <h3 className="section-h">Vote</h3>
          {!pair ? (
            <button className="ghost" onClick={loadPair}>
              Start voting
            </button>
          ) : (
            <div className="versus">
              {pair.map((e) => (
                <button
                  key={e.id}
                  className="versus-card"
                  disabled={voteBusy}
                  onClick={() => vote(e, pair.find((x) => x.id !== e.id)!)}
                >
                  <img src={outfitImageUrl(e.outfitId)} alt="entry" />
                </button>
              ))}
              <div className="versus-vs">vs</div>
            </div>
          )}
        </div>
      )}

      <h3 className="section-h">Standings</h3>
      {detail.entries.length === 0 ? (
        <p className="muted">No entries yet. Be first!</p>
      ) : (
        <ol className="ranked">
          {detail.entries.map((e, i) => (
            <li key={e.id}>
              <span className="rank">{i + 1}</span>
              <a className="ranked-thumb" href={`#/outfit/${e.outfitId}`}>
                <img src={outfitImageUrl(e.outfitId)} alt="entry" loading="lazy" />
              </a>
              <span className="rank-elo">{Math.round(e.elo)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

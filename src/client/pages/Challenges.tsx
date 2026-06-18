import { useEffect, useState } from "react";
import { api } from "../api";
import type { Challenge } from "../../shared/types";

// Lists active challenges and lets the user spin up a community one.
export function Challenges() {
  const [list, setList] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");

  function load() {
    setLoading(true);
    api
      .challenges()
      .then(setList)
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function create() {
    if (!title.trim()) return;
    await api.createChallenge({ title: title.trim() });
    setTitle("");
    setCreating(false);
    load();
  }

  return (
    <section className="challenges">
      <div className="closet-head">
        <h2>Challenges</h2>
        <button className="ghost small" onClick={() => setCreating((v) => !v)}>
          {creating ? "Cancel" : "New"}
        </button>
      </div>

      {creating && (
        <div className="challenge-create">
          <input
            placeholder="Challenge title (e.g. Best monochrome fit)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <button onClick={create} disabled={!title.trim()}>
            Create
          </button>
        </div>
      )}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : list.length === 0 ? (
        <p className="muted">No active challenges. Start one!</p>
      ) : (
        <ul className="challenge-list">
          {list.map((ch) => (
            <li key={ch.id}>
              <a href={`#/challenge/${ch.id}`}>
                <span className={`tag ${ch.type}`}>{ch.type}</span>
                <strong>{ch.title}</strong>
                {ch.aesthetic && <span className="muted"> · {ch.aesthetic}</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

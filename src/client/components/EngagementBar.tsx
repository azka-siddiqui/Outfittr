import { useEffect, useState } from "react";
import { api } from "../api";
import { HYPE_EMOJIS, type Engagement, type Comment } from "../../shared/types";

// Like / save / hype controls plus a comment thread for one outfit. Loads its
// own state so it can drop into any outfit view.
export function EngagementBar({ outfitId }: { outfitId: string }) {
  const [state, setState] = useState<Engagement | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    api.engagement(outfitId).then(setState).catch(() => setState(null));
    api.comments(outfitId).then(setComments).catch(() => setComments([]));
  }, [outfitId]);

  if (!state) return null;

  async function like() {
    const { liked } = await api.toggleLike(outfitId);
    setState((s) =>
      s ? { ...s, liked, likes: s.likes + (liked ? 1 : -1) } : s
    );
  }

  async function save() {
    const { saved } = await api.toggleSave(outfitId);
    setState((s) => (s ? { ...s, saved } : s));
  }

  async function hype(emoji: string) {
    const next = state?.hype === emoji ? "" : emoji;
    const { hype } = await api.setHype(outfitId, next);
    setState((s) => (s ? { ...s, hype } : s));
  }

  async function addComment() {
    if (!draft.trim()) return;
    const c = await api.addComment(outfitId, draft.trim());
    setComments((list) => [...list, c]);
    setDraft("");
  }

  return (
    <div className="engagement">
      <div className="engage-row">
        <button className={state.liked ? "engage on" : "engage"} onClick={like}>
          ♥ {state.likes}
        </button>
        <button className={state.saved ? "engage on" : "engage"} onClick={save}>
          {state.saved ? "Saved" : "Save"}
        </button>
        <div className="hypes">
          {HYPE_EMOJIS.map((e) => (
            <button
              key={e}
              className={state.hype === e ? "hype-btn on" : "hype-btn"}
              onClick={() => hype(e)}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="comments">
        {comments.map((c) => (
          <div key={c.id} className="comment">
            <span className="c-handle">@{c.handle}</span> {c.body}
          </div>
        ))}
        <div className="comment-form">
          <input
            placeholder="Add a comment…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addComment()}
          />
          <button onClick={addComment} disabled={!draft.trim()}>
            Post
          </button>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { api } from "../api";

interface Turn {
  question: string;
  answer: string;
}

// AI stylist chat. Answers are grounded in the user's real closet server-side,
// so suggestions reference outfits they actually own.
export function Stylist() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask() {
    const q = question.trim();
    if (!q || busy) return;
    setBusy(true);
    setQuestion("");
    try {
      const { answer } = await api.askStylist(q);
      setTurns((t) => [...t, { question: q, answer }]);
    } catch {
      setTurns((t) => [...t, { question: q, answer: "Something went wrong. Try again." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stylist">
      <h2>Stylist</h2>
      <p className="muted">Ask about outfits from your closet.</p>

      <div className="chat">
        {turns.map((t, i) => (
          <div key={i} className="turn">
            <p className="q">{t.question}</p>
            <p className="a">{t.answer}</p>
          </div>
        ))}
        {busy && <p className="muted">Thinking…</p>}
      </div>

      <div className="ask-form">
        <input
          placeholder="What should I wear to a dinner?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
        />
        <button onClick={ask} disabled={busy || !question.trim()}>
          Ask
        </button>
      </div>
    </section>
  );
}

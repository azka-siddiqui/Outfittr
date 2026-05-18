import { useEffect, useState } from "react";

// Placeholder shell. Routing, the closet, rankings and social feeds get built
// out in later commits — for now this just confirms the Worker is reachable.
export function App() {
  const [status, setStatus] = useState<string>("…");

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: { status: string }) => setStatus(d.status))
      .catch(() => setStatus("unreachable"));
  }, []);

  return (
    <main className="app">
      <h1>Outfittr</h1>
      <p className="tagline">Your closet, ranked.</p>
      <p className="status">api: {status}</p>
    </main>
  );
}

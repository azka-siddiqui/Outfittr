import { useEffect, useState } from "react";
import { api } from "../api";
import type { FollowRequest } from "../../shared/types";

// Incoming follow requests for a private account. Approve grants access;
// decline removes the pending row.
export function Requests() {
  const [requests, setRequests] = useState<FollowRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .followRequests()
      .then(setRequests)
      .finally(() => setLoading(false));
  }, []);

  async function approve(followerId: string) {
    await api.approveRequest(followerId);
    setRequests((r) => r.filter((x) => x.followerId !== followerId));
  }

  async function decline(followerId: string) {
    await api.declineRequest(followerId);
    setRequests((r) => r.filter((x) => x.followerId !== followerId));
  }

  return (
    <section className="requests">
      <h2>Requests</h2>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="muted">No pending requests.</p>
      ) : (
        <ul className="request-list">
          {requests.map((r) => (
            <li key={r.followerId}>
              <div className="who">
                <strong>{r.displayName}</strong>
                <span className="muted">@{r.handle}</span>
              </div>
              <div className="req-actions">
                <button onClick={() => approve(r.followerId)}>Approve</button>
                <button className="ghost" onClick={() => decline(r.followerId)}>
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

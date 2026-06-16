import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import {
  outfitImageUrl,
  type ProfileView,
  type UserSummary,
  type Compatibility,
} from "../../shared/types";

// A user's profile: header with counts + follow button, their outfit grid (when
// visible), and expandable followers/following lists.
export function Profile() {
  const { handle = "" } = useParams();
  const [profile, setProfile] = useState<ProfileView | null>(null);
  const [list, setList] = useState<{ kind: "followers" | "following"; users: UserSummary[] } | null>(
    null
  );
  const [compat, setCompat] = useState<Compatibility | null>(null);

  const load = useCallback(() => {
    api.profile(handle).then(setProfile).catch(() => setProfile(null));
  }, [handle]);

  useEffect(() => {
    // Compatibility is only meaningful for other people's profiles.
    api
      .compatibility(handle)
      .then(setCompat)
      .catch(() => setCompat(null));
  }, [handle]);

  useEffect(() => {
    load();
    setList(null);
  }, [load]);

  if (!profile) return <p className="muted">Loading…</p>;

  async function toggleFollow() {
    if (!profile) return;
    if (profile.followStatus === "none") {
      await api.follow(profile.id);
    } else {
      await api.unfollow(profile.id);
    }
    load();
  }

  async function showList(kind: "followers" | "following") {
    if (!profile) return;
    if (list?.kind === kind) {
      setList(null);
      return;
    }
    const users = kind === "followers" ? await api.followers(profile.id) : await api.following(profile.id);
    setList({ kind, users });
  }

  const followLabel =
    profile.followStatus === "accepted"
      ? "Following"
      : profile.followStatus === "pending"
        ? "Requested"
        : profile.isPrivate
          ? "Request"
          : "Follow";

  return (
    <section className="profile">
      <header className="profile-head">
        <div>
          <h2>{profile.displayName}</h2>
          <p className="muted">@{profile.handle}</p>
          {profile.bio && <p className="bio">{profile.bio}</p>}
        </div>
        {!profile.isSelf && (
          <button
            className={profile.followStatus === "none" ? "" : "ghost"}
            onClick={toggleFollow}
          >
            {followLabel}
          </button>
        )}
      </header>

      {profile.isSelf && (
        <div className="self-links">
          <a className="chip" href="#/style-dna">
            Style DNA
          </a>
          <a className="chip" href="#/stylist">
            Ask stylist
          </a>
          <a className="chip" href="#/requests">
            Requests
          </a>
        </div>
      )}

      {!profile.isSelf && compat && (
        <div className="compat">
          <span className="compat-score">{compat.score}%</span>
          <span className="compat-label">
            style match
            {compat.sharedAesthetics.length > 0 &&
              ` · ${compat.sharedAesthetics.slice(0, 3).join(", ")}`}
          </span>
        </div>
      )}

      <div className="profile-stats">
        <button className="stat-btn" onClick={() => showList("followers")}>
          <strong>{profile.followers}</strong> followers
        </button>
        <button className="stat-btn" onClick={() => showList("following")}>
          <strong>{profile.following}</strong> following
        </button>
      </div>

      {list && (
        <ul className="user-list">
          {list.users.length === 0 && <li className="muted">Nobody yet.</li>}
          {list.users.map((u) => (
            <li key={u.id}>
              <a href={`#/u/${u.handle}`}>
                <strong>{u.displayName}</strong> <span className="muted">@{u.handle}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {!profile.canView ? (
        <p className="muted locked">🔒 This account is private.</p>
      ) : profile.outfits.length === 0 ? (
        <p className="muted">No outfits yet.</p>
      ) : (
        <div className="grid">
          {profile.outfits.map((o) => (
            <a key={o.id} className="tile" href={`#/outfit/${o.id}`}>
              <img src={outfitImageUrl(o.id)} alt={o.caption ?? "outfit"} loading="lazy" />
            </a>
          ))}
        </div>
      )}
    </section>
  );
}

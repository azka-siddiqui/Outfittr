import type {
  UserProfile,
  Outfit,
  Collection,
  Garment,
  OutfitDetail,
  Dimension,
  FollowStatus,
  FollowRequest,
  Engagement,
  Comment,
} from "../shared/types";

// Thin fetch wrapper. All API routes are same-origin and rely on the Access
// cookie (or the local dev identity), so no auth headers are needed here.
async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

const postJson = <T>(path: string, body: unknown) => send<T>("POST", path, body);

export const api = {
  me: () => get<UserProfile>("/api/me"),
  closet: (filters?: { collection?: string; aesthetic?: string; occasion?: string }) => {
    const q = new URLSearchParams();
    if (filters?.collection) q.set("collection", filters.collection);
    if (filters?.aesthetic) q.set("aesthetic", filters.aesthetic);
    if (filters?.occasion) q.set("occasion", filters.occasion);
    const qs = q.toString();
    return get<Outfit[]>(`/api/outfits${qs ? `?${qs}` : ""}`);
  },
  facets: () => get<{ aesthetics: string[]; occasions: string[] }>("/api/outfits/facets"),
  collections: () => get<Collection[]>("/api/collections"),
  createCollection: (name: string) =>
    postJson<Collection>("/api/collections", { name }),

  outfit: (id: string) => get<OutfitDetail>(`/api/outfits/${id}`),
  editOutfit: (
    id: string,
    patch: { caption?: string | null; aesthetic?: string | null; occasion?: string | null }
  ) => send<{ ok: true }>("PATCH", `/api/outfits/${id}`, patch),
  deleteOutfit: (id: string) => send<{ ok: true }>("DELETE", `/api/outfits/${id}`),
  addGarment: (outfitId: string, g: Partial<Garment> & { name: string }) =>
    postJson<Garment>(`/api/garments/outfit/${outfitId}`, g),
  updateGarment: (id: string, g: Partial<Garment>) =>
    send<{ ok: true }>("PUT", `/api/garments/${id}`, g),
  deleteGarment: (id: string) => send<{ ok: true }>("DELETE", `/api/garments/${id}`),

  rankPair: () => get<Outfit[]>("/api/rankings/pair"),
  vote: (dimension: Dimension, winnerId: string, loserId: string) =>
    postJson<{ winner: number; loser: number }>("/api/rankings/vote", {
      dimension,
      winnerId,
      loserId,
    }),
  leaderboard: (dimension: Dimension) =>
    get<{ dimension: Dimension; outfits: Outfit[] }>(
      `/api/rankings/leaderboard/${dimension}`
    ),

  followingFeed: () => get<Outfit[]>("/api/feed/following"),
  trendingFeed: () => get<Outfit[]>("/api/feed/trending"),

  engagement: (outfitId: string) => get<Engagement>(`/api/engage/${outfitId}`),
  toggleLike: (outfitId: string) =>
    postJson<{ liked: boolean }>(`/api/engage/${outfitId}/like`, {}),
  toggleSave: (outfitId: string) =>
    postJson<{ saved: boolean }>(`/api/engage/${outfitId}/save`, {}),
  setHype: (outfitId: string, emoji: string) =>
    postJson<{ hype: string | null }>(`/api/engage/${outfitId}/hype`, { emoji }),
  comments: (outfitId: string) => get<Comment[]>(`/api/engage/${outfitId}/comments`),
  addComment: (outfitId: string, body: string) =>
    postJson<Comment>(`/api/engage/${outfitId}/comments`, { body }),
  deleteComment: (id: string) => send<{ ok: true }>("DELETE", `/api/engage/comments/${id}`),
  savedOutfits: () => get<Outfit[]>("/api/engage/saved/list"),

  follow: (userId: string) => postJson<{ status: FollowStatus }>(`/api/follows/${userId}`, {}),
  unfollow: (userId: string) => send<{ ok: true }>("DELETE", `/api/follows/${userId}`),
  followStatus: (userId: string) =>
    get<{ status: FollowStatus }>(`/api/follows/status/${userId}`),
  followRequests: () => get<FollowRequest[]>("/api/follows/requests"),
  approveRequest: (followerId: string) =>
    postJson<{ ok: true }>(`/api/follows/requests/${followerId}/approve`, {}),
  declineRequest: (followerId: string) =>
    postJson<{ ok: true }>(`/api/follows/requests/${followerId}/decline`, {}),
  updateMe: (patch: { displayName?: string; bio?: string | null; isPrivate?: boolean }) =>
    send<{ ok: true }>("PATCH", "/api/me", patch),

  // Upload uses multipart, so it bypasses the JSON helper.
  async upload(form: FormData): Promise<{ id: string }> {
    const res = await fetch("/api/outfits", { method: "POST", body: form });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json() as Promise<{ id: string }>;
  },
};

import type { UserProfile, Outfit, Collection } from "../shared/types";

// Thin fetch wrapper. All API routes are same-origin and rely on the Access
// cookie (or the local dev identity), so no auth headers are needed here.
async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  me: () => get<UserProfile>("/api/me"),
  closet: (collectionId?: string) =>
    get<Outfit[]>(`/api/outfits${collectionId ? `?collection=${collectionId}` : ""}`),
  collections: () => get<Collection[]>("/api/collections"),
  createCollection: (name: string) =>
    postJson<Collection>("/api/collections", { name }),

  // Upload uses multipart, so it bypasses the JSON helper.
  async upload(form: FormData): Promise<{ id: string }> {
    const res = await fetch("/api/outfits", { method: "POST", body: form });
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json() as Promise<{ id: string }>;
  },
};

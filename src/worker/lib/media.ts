import type { Env } from "../env";

// Object-key helpers for R2. Photos are namespaced per user so listing and
// cleanup stay simple, and so a leaked key can't be trivially enumerated.
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB

export function isAllowedImage(type: string, size: number): boolean {
  return ALLOWED_TYPES.has(type) && size > 0 && size <= MAX_BYTES;
}

function extFor(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export function photoKey(userId: string, outfitId: string, type: string): string {
  return `photos/${userId}/${outfitId}.${extFor(type)}`;
}

export function cutoutKey(userId: string, outfitId: string): string {
  return `cutouts/${userId}/${outfitId}.png`;
}

// Streams an R2 object back as a Response, or 404 if missing. Callers are
// responsible for authorization before calling this.
export async function serveObject(env: Env, key: string): Promise<Response> {
  const object = await env.MEDIA.get(key);
  if (!object) return new Response("not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  // Media is immutable per key (a new upload gets a new key), so cache hard.
  headers.set("cache-control", "private, max-age=31536000, immutable");
  return new Response(object.body, { headers });
}

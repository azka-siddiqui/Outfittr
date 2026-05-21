import type { Env } from "../env";

// Verifies a Cloudflare Access JWT. Access sits in front of the Worker in
// production and forwards the signed identity in the Cf-Access-Jwt-Assertion
// header. We validate it against the team's public keys (JWKS) and check the
// audience matches our Access application.
//
// Locally there is no Access in front of the Worker, so we trust ACCESS_DEV_EMAIL.

interface AccessIdentity {
  email: string;
}

interface Jwk {
  kid: string;
  kty: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

// JWKS are stable; cache them for the lifetime of the isolate.
let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 60 * 60 * 1000;

async function getJwks(teamDomain: string): Promise<Jwk[]> {
  if (jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const url = `https://${teamDomain}/cdn-cgi/access/certs`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`failed to fetch Access JWKS: ${res.status}`);
  const body = (await res.json()) as { keys: Jwk[] };
  jwksCache = { keys: body.keys, fetchedAt: Date.now() };
  return body.keys;
}

function base64UrlToUint8(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(b64url.length / 4) * 4,
    "="
  );
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importKey(jwk: Jwk): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

/**
 * Returns the authenticated identity, or null if the request isn't
 * authenticated. Throws only on malformed/invalid tokens.
 */
export async function verifyAccess(
  req: Request,
  env: Env
): Promise<AccessIdentity | null> {
  // Local development: no Access layer, trust the configured dev email.
  if (env.ACCESS_DEV_EMAIL) {
    return { email: env.ACCESS_DEV_EMAIL };
  }

  const token = req.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(new TextDecoder().decode(base64UrlToUint8(headerB64))) as {
    kid: string;
  };

  const jwks = await getJwks(env.TEAM_DOMAIN);
  const jwk = jwks.find((k) => k.kid === header.kid);
  if (!jwk) return null;

  const key = await importKey(jwk);
  const signed = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    base64UrlToUint8(signatureB64) as BufferSource,
    signed as BufferSource
  );
  if (!valid) return null;

  const payload = JSON.parse(new TextDecoder().decode(base64UrlToUint8(payloadB64))) as {
    email?: string;
    aud?: string | string[];
    exp?: number;
  };

  // Audience must match our Access application, and the token must be fresh.
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.POLICY_AUD)) return null;
  if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  if (!payload.email) return null;

  return { email: payload.email };
}

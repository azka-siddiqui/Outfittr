// Derives a starting handle from an email local-part, sanitized to
// [a-z0-9_]. Uniqueness is enforced by the caller (append a suffix on clash).
export function handleFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "user";
  const cleaned = local.toLowerCase().replace(/[^a-z0-9_]/g, "");
  return cleaned.length >= 2 ? cleaned : `user${cleaned}`;
}

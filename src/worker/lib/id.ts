// Ids are generated in the Worker so inserts don't need to read back a
// generated key. crypto.randomUUID() is available in the Workers runtime.
export function newId(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}

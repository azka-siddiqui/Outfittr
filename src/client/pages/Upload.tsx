import { useState } from "react";
import { api } from "../api";

// Minimal upload form. Garment tagging and the guided ranking flow that follow
// an upload are layered on in later commits.
export function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [aesthetic, setAesthetic] = useState("");
  const [occasion, setOccasion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("photo", file);
      if (caption) form.set("caption", caption);
      if (aesthetic) form.set("aesthetic", aesthetic);
      if (occasion) form.set("occasion", occasion);
      const { id } = await api.upload(form);
      // Send the user into the guided ranking flow to seed the new outfit.
      window.location.hash = `#/guided?new=${id}`;
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="upload">
      <h2>Upload</h2>
      <form onSubmit={submit}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <input
          placeholder="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <input
          placeholder="Aesthetic (e.g. streetwear)"
          value={aesthetic}
          onChange={(e) => setAesthetic(e.target.value)}
        />
        <input
          placeholder="Occasion (e.g. work)"
          value={occasion}
          onChange={(e) => setOccasion(e.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={!file || busy}>
          {busy ? "Uploading…" : "Upload outfit"}
        </button>
      </form>
    </section>
  );
}

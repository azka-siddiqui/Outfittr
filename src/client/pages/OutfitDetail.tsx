import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api";
import { outfitImageUrl, type OutfitDetail as Detail, type Garment } from "../../shared/types";

function priceLabel(cents: number | null): string {
  return cents == null ? "" : `$${(cents / 100).toFixed(0)}`;
}

// Outfit detail: tap the photo to reveal interactive garment pins. If you own
// the outfit, tapping an empty spot drops a new pin to tag a garment there.
export function OutfitDetail() {
  const { id = "" } = useParams();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [showPins, setShowPins] = useState(true);
  const [me, setMe] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [name, setName] = useState("");
  const imgWrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.outfit(id).then(setDetail).catch(() => setDetail(null));
    api.me().then((u) => setMe(u.id)).catch(() => setMe(null));
  }, [id]);

  if (!detail) return <p className="muted">Loading…</p>;
  const owner = me === detail.userId;

  function onPhotoClick(e: React.MouseEvent) {
    if (!owner || !imgWrap.current) return;
    const rect = imgWrap.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDraft({ x, y });
  }

  async function saveDraft() {
    if (!draft || !name.trim()) return;
    const g = await api.addGarment(id, { name: name.trim(), pinX: draft.x, pinY: draft.y });
    setDetail((d) => (d ? { ...d, garments: [...d.garments, g] } : d));
    setDraft(null);
    setName("");
  }

  async function removeGarment(gid: string) {
    await api.deleteGarment(gid);
    setDetail((d) =>
      d ? { ...d, garments: d.garments.filter((x: Garment) => x.id !== gid) } : d
    );
  }

  return (
    <section className="detail">
      <div className="photo-wrap" ref={imgWrap} onClick={onPhotoClick}>
        <img src={outfitImageUrl(detail.id)} alt={detail.caption ?? "outfit"} />

        {showPins &&
          detail.garments
            .filter((g) => g.pinX != null && g.pinY != null)
            .map((g) => (
              <div
                key={g.id}
                className="pin"
                style={{ left: `${(g.pinX ?? 0) * 100}%`, top: `${(g.pinY ?? 0) * 100}%` }}
              >
                <span className="pin-dot" />
                <span className="pin-label">
                  {g.brand ? `${g.brand} · ` : ""}
                  {g.name} {priceLabel(g.priceCents)}
                  {owner && (
                    <button className="pin-x" onClick={() => removeGarment(g.id)}>
                      ×
                    </button>
                  )}
                </span>
              </div>
            ))}

        {draft && (
          <div className="pin draft" style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%` }}>
            <span className="pin-dot" />
          </div>
        )}
      </div>

      <div className="detail-actions">
        <button className="ghost" onClick={() => setShowPins((s) => !s)}>
          {showPins ? "Hide tags" : "Show tags"}
        </button>
      </div>

      {draft && owner && (
        <div className="tag-form">
          <input
            placeholder="Garment name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <button onClick={saveDraft} disabled={!name.trim()}>
            Add tag
          </button>
          <button className="ghost" onClick={() => setDraft(null)}>
            Cancel
          </button>
        </div>
      )}

      {detail.caption && <p className="caption">{detail.caption}</p>}
    </section>
  );
}

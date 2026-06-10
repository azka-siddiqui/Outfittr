import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api";
import { outfitImageUrl, type OutfitDetail as Detail, type Garment } from "../../shared/types";
import { EngagementBar } from "../components/EngagementBar";

function priceLabel(cents: number | null): string {
  return cents == null ? "" : `$${(cents / 100).toFixed(0)}`;
}

// Outfit detail: tap the photo to reveal interactive garment pins. If you own
// the outfit, tapping an empty spot drops a new pin to tag a garment there.
export function OutfitDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [showPins, setShowPins] = useState(true);
  const [me, setMe] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
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

  async function saveEdits(patch: {
    caption: string;
    aesthetic: string;
    occasion: string;
  }) {
    await api.editOutfit(id, {
      caption: patch.caption || null,
      aesthetic: patch.aesthetic || null,
      occasion: patch.occasion || null,
    });
    setDetail((d) => (d ? { ...d, ...patch } : d));
    setEditing(false);
  }

  async function removeOutfit() {
    if (!confirm("Delete this outfit?")) return;
    await api.deleteOutfit(id);
    navigate("/closet");
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
        {owner && (
          <>
            <button className="ghost" onClick={() => setEditing((e) => !e)}>
              Edit
            </button>
            <button className="ghost danger" onClick={removeOutfit}>
              Delete
            </button>
          </>
        )}
      </div>

      {editing && owner && (
        <EditForm
          initial={{
            caption: detail.caption ?? "",
            aesthetic: detail.aesthetic ?? "",
            occasion: detail.occasion ?? "",
          }}
          onSave={saveEdits}
          onCancel={() => setEditing(false)}
        />
      )}

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

      <EngagementBar outfitId={detail.id} />
    </section>
  );
}

function EditForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: { caption: string; aesthetic: string; occasion: string };
  onSave: (patch: { caption: string; aesthetic: string; occasion: string }) => void;
  onCancel: () => void;
}) {
  const [caption, setCaption] = useState(initial.caption);
  const [aesthetic, setAesthetic] = useState(initial.aesthetic);
  const [occasion, setOccasion] = useState(initial.occasion);

  return (
    <div className="edit-form">
      <input placeholder="Caption" value={caption} onChange={(e) => setCaption(e.target.value)} />
      <input
        placeholder="Aesthetic"
        value={aesthetic}
        onChange={(e) => setAesthetic(e.target.value)}
      />
      <input
        placeholder="Occasion"
        value={occasion}
        onChange={(e) => setOccasion(e.target.value)}
      />
      <div className="edit-actions">
        <button onClick={() => onSave({ caption, aesthetic, occasion })}>Save</button>
        <button className="ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

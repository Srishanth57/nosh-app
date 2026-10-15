"use client";
import { isDirty } from "@/hooks/useDishes";
import ConflictBanner from "./ConflictBanner";

export default function DishCard({
  item,
  edit,
  discard,
  save,
  reloadLatest,
  loadNewer,
}) {
  const { saved, draft, saving, error, conflict, newer } = item;
  const id = saved.dishId;
  const dirty = isDirty(item);
  const savedLabel = saved.isPublished ? "Published" : "Unpublished";

  return (
    <article
      className={`card dish-card${dirty ? " is-dirty" : ""}`}
      aria-busy={saving}
    >
      <div className="dish-img">
        <img
          src={saved.imageUrl}
          alt={saved.dishName || "Dish image"}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
        <span className="chip mono">{id}</span>
        {dirty && (
          <span className="chip chip-accent mono">Unsaved changes</span>
        )}
      </div>

      <label className="field">
        <span className="mono label">Dish name</span>
        <input
          value={draft.dishName}
          disabled={saving}
          onChange={(e) => edit(id, { dishName: e.target.value })}
        />
      </label>

      <label className={`switch${saving ? " is-disabled" : ""}`}>
        <input
          type="checkbox"
          checked={draft.isPublished}
          disabled={saving}
          onChange={(e) => edit(id, { isPublished: e.target.checked })}
        />
        <span className="track" aria-hidden />
        <span>{draft.isPublished ? "Published" : "Unpublished"}</span>
        <span
          className={`mono badge ${saved.isPublished ? "badge-pub" : "badge-unpub"}`}
        >
          Saved: {savedLabel}
        </span>
        <span className="mono version">v{saved.version}</span>
      </label>

      {error && (
        <div className="banner banner-err" role="alert">
          {error}
        </div>
      )}
      {conflict && <ConflictBanner onReload={() => reloadLatest(id)} />}
      {newer && !conflict && (
        <div className="banner banner-info" role="status">
          <p>Newer data available (v{newer.version}). Your draft is kept.</p>
          <button
            className="btn-text"
            disabled={saving}
            onClick={() => loadNewer(id)}
          >
            Load latest (discards draft)
          </button>
        </div>
      )}

      <div className="actions">
        <button
          className="btn-arrow"
          disabled={!dirty || saving}
          onClick={() => save(id)}
        >
          <span className="arrow">→</span>
          <span>{saving ? "Saving…" : "Save"}</span>
        </button>
        <button
          className="btn-text"
          disabled={!dirty || saving}
          onClick={() => discard(id)}
        >
          Discard
        </button>
      </div>
    </article>
  );
}

'use client';
import { isDirty } from '@/hooks/useDishes';
import ConflictBanner from './ConflictBanner';

export default function DishCard({ item, edit, discard, save, reloadLatest }) {
  const { saved, draft, saving, error, conflict } = item;
  const id = saved.dishId;
  const dirty = isDirty(item);

  return (
    <article className={`card dish-card${dirty ? ' is-dirty' : ''}`}>
      <div className="dish-img">
        <img
          src={saved.imageUrl}
          alt={saved.dishName || 'Dish image'}
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/placeholder.svg'; }}
        />
        <span className="chip mono">{id}</span>
        {dirty && <span className="chip chip-accent mono">Unsaved changes</span>}
      </div>

      <label className="field">
        <span className="mono label">Dish name</span>
        <input value={draft.dishName} onChange={(e) => edit(id, { dishName: e.target.value })} />
      </label>

      <label className="switch">
        <input type="checkbox" checked={draft.isPublished} onChange={(e) => edit(id, { isPublished: e.target.checked })} />
        <span className="track" aria-hidden />
        <span>{draft.isPublished ? 'Published' : 'Unpublished'}</span>
        <span className="mono version">v{saved.version}</span>
      </label>

      {error && <div className="banner banner-err" role="alert">{error}</div>}
      {conflict && <ConflictBanner onReload={() => reloadLatest(id)} />}

      <div className="actions">
        <button className="btn-arrow" disabled={!dirty || saving} onClick={() => save(id)}>
          <span className="arrow">→</span>
          <span>{saving ? 'Saving…' : 'Save'}</span>
        </button>
        <button className="btn-text" disabled={!dirty || saving} onClick={() => discard(id)}>Discard</button>
      </div>
    </article>
  );
}

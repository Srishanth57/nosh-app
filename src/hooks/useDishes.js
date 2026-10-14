'use client';
import { useCallback, useEffect, useState } from 'react';
import { getDishes, updateDish } from '@/api/dishesApi';

const wrap = (d) => ({
  saved: d,
  draft: { dishName: d.dishName, isPublished: d.isPublished },
  saving: false,
  error: null,
  conflict: null,
});

export const isDirty = (it) =>
  it.draft.dishName !== it.saved.dishName || it.draft.isPublished !== it.saved.isPublished;

export function useDishes() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | error | ready
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setItems((await getDishes()).map(wrap));
      setStatus('ready');
    } catch (e) {
      setLoadError(e.message || 'Could not reach the server');
      setStatus('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const patch = (id, fn) =>
    setItems((list) => list.map((it) => (it.saved.dishId === id ? fn(it) : it)));

  const edit = (id, changes) =>
    patch(id, (it) => ({ ...it, draft: { ...it.draft, ...changes }, error: null }));

  const discard = (id) =>
    patch(id, (it) => ({ ...it, draft: { dishName: it.saved.dishName, isPublished: it.saved.isPublished }, error: null, conflict: null }));

  async function save(id) {
    const it = items.find((x) => x.saved.dishId === id);
    if (!it || it.saving) return;
    patch(id, (i) => ({ ...i, saving: true, error: null }));
    try {
      const { ok, status: code, body } = await updateDish(id, {
        dishName: it.draft.dishName,
        isPublished: it.draft.isPublished,
        expectedVersion: it.saved.version, // originally loaded version
      });
      if (ok) patch(id, () => wrap(body));
      else if (code === 409) patch(id, (i) => ({ ...i, saving: false, conflict: body.currentDish }));
      else patch(id, (i) => ({ ...i, saving: false, error: body.message || 'Save failed' }));
    } catch {
      patch(id, (i) => ({ ...i, saving: false, error: 'Could not reach the server. Try again.' }));
    }
  }

  function reloadLatest(id) {
    if (!window.confirm('This will discard your unsaved changes and load the latest saved version. Continue?')) return;
    patch(id, (i) => wrap(i.conflict));
  }

  return { items, status, loadError, load, edit, discard, save, reloadLatest };
}

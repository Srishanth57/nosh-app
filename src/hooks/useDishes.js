"use client";
import { useCallback, useEffect, useState } from "react";
import { getDishes, updateDish } from "@/api/dishesApi";

const wrap = (d) => ({
  saved: d,
  draft: { dishName: d.dishName, isPublished: d.isPublished },
  saving: false,
  error: null,
  conflict: null,
});

export const isDirty = (it) =>
  it.draft.dishName !== it.saved.dishName ||
  it.draft.isPublished !== it.saved.isPublished;

export function useDishes() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [loadError, setLoadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      setItems((await getDishes()).map(wrap));
      setStatus("ready");
    } catch (e) {
      setLoadError(e.message || "Could not reach the server");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError("");
    try {
      const fresh = await getDishes();
      setItems((current) => {
        const byId = new Map(current.map((it) => [it.saved.dishId, it]));
        return fresh.map((d) => {
          const existing = byId.get(d.dishId);
          if (!existing) return wrap(d);
          if (existing.saving) return existing;
          // A save finished while this request was in flight; don't go backwards.
          if (existing.saved.version > d.version) return existing;
          if (!isDirty(existing)) return wrap(d);
          if (d.version !== existing.saved.version)
            return { ...existing, conflict: d };
          return existing;
        });
      });
    } catch (e) {
      setRefreshError(e.message || "Could not refresh. Try again.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  const patch = (id, fn) =>
    setItems((list) =>
      list.map((it) => (it.saved.dishId === id ? fn(it) : it)),
    );

  const edit = (id, changes) =>
    patch(id, (it) =>
      it.saving
        ? it
        : { ...it, draft: { ...it.draft, ...changes }, error: null },
    );

  const discard = (id) =>
    patch(id, (it) => ({
      ...it,
      draft: { dishName: it.saved.dishName, isPublished: it.saved.isPublished },
      error: null,
      conflict: null,
    }));

  async function save(id) {
    const it = items.find((x) => x.saved.dishId === id);
    if (!it || it.saving) return;
    patch(id, (i) => ({ ...i, saving: true, error: null }));
    try {
      const {
        ok,
        status: code,
        body,
      } = await updateDish(id, {
        dishName: it.draft.dishName,
        isPublished: it.draft.isPublished,
        expectedVersion: it.saved.version, // originally loaded version
      });
      if (ok) patch(id, () => wrap(body));
      else if (code === 409)
        patch(id, (i) => ({ ...i, saving: false, conflict: body.currentDish }));
      else
        patch(id, (i) => ({
          ...i,
          saving: false,
          error: body.message || "Save failed",
        }));
    } catch {
      patch(id, (i) => ({
        ...i,
        saving: false,
        error: "Could not reach the server. Try again.",
      }));
    }
  }

  function reloadLatest(id) {
    if (
      !window.confirm(
        "This will discard your unsaved changes and load the latest saved version. Continue?",
      )
    )
      return;
    patch(id, (i) => wrap(i.conflict));
  }

  return {
    items,
    status,
    loadError,
    load,
    refresh,
    refreshing,
    refreshError,
    edit,
    discard,
    save,
    reloadLatest,
  };
}

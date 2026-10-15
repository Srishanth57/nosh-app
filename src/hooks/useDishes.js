"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { getDishes, updateDish } from "@/api/dishesApi";

const POLL_MS = 4000; // keep <= 5000

const wrap = (d) => ({
  saved: d,
  draft: { dishName: d.dishName, isPublished: d.isPublished },
  saving: false,
  error: null,
  conflict: null, // set only by a real 409 on Save
  newer: null,
});

export const isDirty = (it) =>
  it.draft.dishName !== it.saved.dishName ||
  it.draft.isPublished !== it.saved.isPublished;

function mergeFresh(current, fresh) {
  const byId = new Map(current.map((it) => [it.saved.dishId, it]));
  let changed = fresh.length !== current.length;

  const next = fresh.map((d, i) => {
    const existing = byId.get(d.dishId);
    let result;
    if (!existing)
      result = wrap(d); // new dish
    else if (existing.saving)
      result = existing; // mid-save: leave alone
    else if (existing.saved.version > d.version)
      result = existing; // stale response: don't go backwards
    else if (!isDirty(existing)) {
      result = existing.saved.version === d.version ? existing : wrap(d); // clean: take latest silently
    } else if (d.version !== existing.saved.version) {
      // dirty + newer on server: keep draft and base version, just flag it
      result =
        existing.newer?.version === d.version
          ? existing
          : { ...existing, newer: d };
    } else result = existing; // dirty, same version

    if (result !== current[i]) changed = true;
    return result;
  });

  return changed ? next : current;
}

export function useDishes() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | error | ready
  const [loadError, setLoadError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  const pollInFlight = useRef(false);

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

  // Manual refresh: visible button state + error message.
  const refresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError("");
    try {
      const fresh = await getDishes();
      setItems((current) => mergeFresh(current, fresh));
    } catch (e) {
      setRefreshError(e.message || "Could not refresh. Try again.");
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Silent polling: same merge, no loading state, errors ignored (retries next tick).
  useEffect(() => {
    if (status !== "ready") return undefined;

    const tick = async () => {
      if (document.hidden || pollInFlight.current) return;
      pollInFlight.current = true;
      try {
        const fresh = await getDishes();
        setItems((current) => mergeFresh(current, fresh));
      } catch {
        /* ignore: next tick will try again */
      } finally {
        pollInFlight.current = false;
      }
    };

    const id = setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status]);

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
      newer: null, // card is clean again; the next poll will load the latest silently
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
      // 409: show the conflict banner only (hide the softer "newer" notice)
      else if (code === 409)
        patch(id, (i) => ({
          ...i,
          saving: false,
          conflict: body.currentDish,
          newer: null,
        }));
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

  function loadNewer(id) {
    if (
      !window.confirm(
        "This will discard your unsaved changes and load the newer version. Continue?",
      )
    )
      return;
    patch(id, (i) => (i.newer ? wrap(i.newer) : i));
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
    loadNewer,
  };
}

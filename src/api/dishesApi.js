const parse = (res) => res.json().catch(() => ({}));

export async function getDishes() {
  const res = await fetch('/api/dishes', { cache: 'no-store' });
  const body = await parse(res);
  if (!res.ok) throw new Error(body.message || 'Failed to load dishes');
  return body;
}

// Returns { status, ok, body } for every HTTP response; throws only on network failure.
export async function updateDish(dishId, payload) {
  const res = await fetch(`/api/dishes/${encodeURIComponent(dishId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return { status: res.status, ok: res.ok, body: await parse(res) };
}

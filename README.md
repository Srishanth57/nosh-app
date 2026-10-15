# Dish Management Dashboard (Next.js + Supabase Postgres)

Full-stack app: local drafts, backend validation, optimistic locking (409).

## Prerequisites

- **Node.js 20.9 or newer** (Next.js 16 requirement) and npm.
- **PostgreSQL**, either:
  - a free [Supabase](https://supabase.com) project (used for development), or
  - any local Postgres 13+ instance.

## Setup

```bash
npm install
cp .env.example .env      # then edit DATABASE_URL and DB_SSL (see below)
npm run migrate           # creates the dishes table (safe to rerun)
npm run seed              # idempotent: ON CONFLICT DO NOTHING
npm run dev               # http://localhost:3000
```

### Environment variables

| Variable       | Purpose                                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | Postgres connection string. For Supabase: Project Settings > Database > Connection string (URI).                        |
| `DB_SSL`       | `true` for Supabase / hosted Postgres, `false` for local Postgres without SSL. Only the exact value `true` enables SSL. |

Notes:

- With `DB_SSL=true` the connection uses TLS with `rejectUnauthorized: false`, which is fine for development but not a hardening choice for production.
- If your network has no IPv6 and the direct Supabase host does not connect, use the pooler connection string from the Supabase dashboard instead.
- `npm run seed -- --reset` truncates the table first and reloads the 5 seed dishes (useful to get back to version 1 for every dish).

## API

Base URL in development: `http://localhost:3000`

- `GET /dishes` -> 200 `[{dishId, dishName, imageUrl, isPublished, version}]`
- `PATCH /dishes/:dishId` body `{dishName, isPublished, expectedVersion}` -> 200 | 400 | 404 | 409 (with `currentDish`) | 500

### How `/dishes` maps to the handlers

The handlers live in the Next.js App Router at `src/app/api/dishes/route.js` and `src/app/api/dishes/[dishId]/route.js`. To expose them at the public path `/dishes` without moving any files, `next.config.mjs` uses `rewrites()`:

```js
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/dishes/:path*", destination: "/api/dishes/:path*" },
      { source: "/dishes", destination: "/api/dishes" },
    ];
  },
};
export default nextConfig;
```

A request to `/dishes` or `/dishes/:dishId` is served by the existing `/api/dishes` handlers (the URL in the client does not change). The `/api/dishes` paths keep working too, and the frontend itself calls `/api/dishes`.

### curl examples

Start from a clean state so the versions below match: `npm run seed -- --reset`.
Run the commands in order. On Windows, use Git Bash (PowerShell quotes JSON differently).

**List dishes (200)**

```bash
curl -s http://localhost:3000/dishes
```

```json
[
  {
    "dishId": "1",
    "dishName": "Jeera Rice",
    "imageUrl": "https://nosh-assignment.s3.ap-south-1.amazonaws.com/jeera-rice.jpg",
    "isPublished": true,
    "version": 1
  },
  "..."
]
```

**Successful update (200)** - version goes 1 -> 2

```bash
curl -s -i -X PATCH http://localhost:3000/dishes/1 \
  -H "Content-Type: application/json" \
  -d '{"dishName":"Jeera Rice Special","isPublished":true,"expectedVersion":1}'
```

```json
{
  "dishId": "1",
  "dishName": "Jeera Rice Special",
  "imageUrl": "https://nosh-assignment.s3.ap-south-1.amazonaws.com/jeera-rice.jpg",
  "isPublished": true,
  "version": 2
}
```

**Stale version (409)** - same request again; dish 1 is already at version 2

```bash
curl -s -i -X PATCH http://localhost:3000/dishes/1 \
  -H "Content-Type: application/json" \
  -d '{"dishName":"Jeera Rice Special","isPublished":true,"expectedVersion":1}'
```

```json
{
  "error": "VERSION_CONFLICT",
  "message": "This dish was updated by someone else",
  "currentDish": {
    "dishId": "1",
    "dishName": "Jeera Rice Special",
    "imageUrl": "https://nosh-assignment.s3.ap-south-1.amazonaws.com/jeera-rice.jpg",
    "isPublished": true,
    "version": 2
  }
}
```

**Empty name on publish (400)**

```bash
curl -s -i -X PATCH http://localhost:3000/dishes/2 \
  -H "Content-Type: application/json" \
  -d '{"dishName":"   ","isPublished":true,"expectedVersion":1}'
```

```json
{
  "error": "VALIDATION_ERROR",
  "message": "A published dish needs a non-empty name"
}
```

**Unknown dish (404)**

```bash
curl -s -i -X PATCH http://localhost:3000/dishes/999 \
  -H "Content-Type: application/json" \
  -d '{"dishName":"Ghost","isPublished":false,"expectedVersion":1}'
```

```json
{ "error": "NOT_FOUND", "message": "Dish 999 not found" }
```

## Architecture

route handlers -> `services` (business rules) -> `repositories` (all SQL) ; `validators` for type checks.
Frontend: `hooks/useDishes.js` (saved vs draft state), `components/`, GSAP motion in `Hero` and `DishList`.

## Decisions

- All three PATCH fields required. Empty name allowed while unpublished. Name is stored trimmed.
- Version check + write is ONE `UPDATE ... WHERE dish_id=$3 AND version=$4`, so concurrent requests cannot both win.
- On 409 the latest dish is kept in `conflict`, not copied into `saved`, until the user confirms Reload.
- The **Refresh** button reloads from the server but keeps unsaved drafts. A dirty card keeps its draft and the version it was based on; if the server has a newer version it is stored as a conflict, so a later Save still gets a 409 instead of silently overwriting.
- A published dish must have a non-empty name and a valid http/https `imageUrl` (checked in the service, not only in the UI).
- Drafts live only in browser memory. Nothing is written until Save.
- Public API paths (`/dishes`, `/dishes/:dishId`) are provided by `rewrites()` in `next.config.mjs`, so the route handlers stay in `src/app/api/dishes` and no files are moved.

## Verification

Open the app at `http://localhost:3000`. For database checks use `psql "$DATABASE_URL"` (or the Supabase SQL editor). Start each test from a known state with `npm run seed -- --reset` unless the test says otherwise.

Useful query:

```sql
SELECT dish_id, dish_name, is_published, version FROM dishes ORDER BY length(dish_id), dish_id;
```

### 1. Reseed twice: no duplicates, edits kept

1. `npm run seed -- --reset`, then in the UI rename dish 1 to `Jeera Rice Special` and Save (version 2).
2. Run `npm run seed` twice more (no `--reset`).
3. Run `SELECT count(*) FROM dishes;` and the query above.

**Expected:** each `seed` run prints `Seed complete (5 dishes processed)`. The count is 5, no `dish_id` appears twice, and dish 1 is still `Jeera Rice Special` at version 2 (seed uses `ON CONFLICT DO NOTHING`, so it never overwrites).

### 2. Edit, then refresh before saving: DB unchanged

1. Edit a dish name in the UI but do not click Save. Note the dish's row in the DB.
2. Reload the browser page (F5).
3. Query the DB again.

**Expected:** the page shows the saved name again (drafts are in-memory only) and the DB row, including `version`, is identical. No PATCH request appears in DevTools > Network.
Optional: click the in-page **Refresh** button instead of reloading. The draft is **kept**, and the DB is still unchanged.

### 3. Discard resets the draft

1. Change the name and flip the toggle on one card. The "Unsaved changes" chip and orange border appear.
2. Click **Discard**.

**Expected:** name and toggle return to the saved values, the chip and border disappear, Save and Discard become disabled, and no network request is sent.

### 4. Save, restart the server, data persists

1. Rename a dish and click Save. Note the new version in the badge.
2. Stop the dev server (Ctrl+C) and run `npm run dev` again.
3. Reload the page.

**Expected:** the card shows the saved name and version, matching the DB row.

### 5. Two-tab test (409, draft kept)

1. Open the app in tab A and tab B. Both show dish 1 at `v1`.
2. Tab A: rename dish 1 to `From tab A` and Save. A shows `v2`.
3. Tab B (still on `v1`): rename dish 1 to `From tab B` and Save.

**Expected in tab B:** the yellow conflict banner appears ("Another update was saved while you were editing..."), the input still shows `From tab B`, the Saved badge/version still shows `v1`, and the DB still holds `From tab A` at version 2. Clicking **Reload latest** and confirming replaces the draft with `From tab A` / `v2`.

### 6. Failed save: draft stays, retry works

Option A (recommended):

1. Load the page, edit a dish name.
2. DevTools > Network > set throttling to **Offline**, then click Save.
3. Set throttling back to **No throttling** and click Save again.

**Expected:** while offline the red banner shows "Could not reach the server. Try again.", the draft is still in the input, the "Unsaved changes" chip stays, and Save is enabled again. After going online the retry succeeds, the version increases by 1, and the chip disappears.

Option B (server-side failure):

1. Load the page, edit a dish name.
2. Put a wrong `DATABASE_URL` in `.env`, restart `npm run dev` (do not reload the page), click Save, and wait for the 10 s connection timeout.
3. Restore the correct `DATABASE_URL`, restart the server, click Save again.

**Expected:** the red banner shows "Something went wrong while saving the dish" (HTTP 500), the draft is kept, and the retry succeeds after the fix.

### 7. Image URL check (bad URL cannot be published)

How the bad-URL test case is created: set dish 5 to an invalid image URL and unpublished directly in the database.

```sql
UPDATE dishes SET image_url = 'not-a-url', is_published = false WHERE dish_id = '5';
SELECT dish_id, image_url, is_published, version FROM dishes WHERE dish_id = '5';
```

Then try to publish it:

```bash
curl -s -i -X PATCH http://localhost:3000/dishes/5 \
  -H "Content-Type: application/json" \
  -d '{"dishName":"Alfredo Pasta","isPublished":true,"expectedVersion":1}'
```

(Use the version shown by the SELECT if it is not 1.)

**Expected:** HTTP 400 with `{"error":"VALIDATION_ERROR","message":"A published dish needs a valid http/https image URL"}`. Re-run the SELECT: the row is unchanged (`is_published = false`, same `version`).

Restore the data afterwards:

```sql
UPDATE dishes SET image_url = 'https://nosh-assignment.s3.ap-south-1.amazonaws.com/alfredo-pasta.jpg' WHERE dish_id = '5';
```

(or run `npm run seed -- --reset`).

### 8. Polling and "Newer data available"

1. Open the app. In psql run: `UPDATE dishes SET dish_name = 'Changed in DB', version = version + 1 WHERE dish_id = '1';`
2. Without touching card 1, wait up to 5 seconds.
3. Reset, then start typing in card 1's name field (do not save) and run the same UPDATE again.
4. Click Save on that card, then repeat step 3 and click **Discard** instead.
   **Expected:** (2) card 1 updates to `Changed in DB` / `v2` with no reload. (3) your draft stays, the saved badge still shows the old version, and "Newer data available (v2)" appears. (4) Save returns a 409 and the conflict banner replaces the notice; after Discard the card shows the new data within a few seconds. Stopping the dev server for a few ticks shows no error banner and polling resumes when it is back. While the tab is hidden, DevTools > Network shows no requests.

## Known limitations

- No real-time updates: other people's changes only show up after **Refresh**/reload, or as a 409 when you save.
- Conflict detection is per dish (one version for name and publish status together), so two people editing different fields of the same dish still conflict.
- Drafts are held in browser memory only; reloading the page loses them.
- Requires a running Postgres database (Supabase or local); there is no in-memory fallback.
- No authentication or authorization: anyone who can reach the API can edit dishes.
- Image URLs cannot be edited from the UI; they come from the database.
- No automated tests; verification is manual (see above).
- No pagination, rate limiting or audit log.
- `DB_SSL=true` skips certificate verification (`rejectUnauthorized: false`).

## Time spent and AI disclosure

**Total time:** about 2 hours. Of this, roughly 1 hour was designing and building the first version.

**AI used:**

- **Claude (chat)** wrote the frontend fixes: the "Saved: ..." status badge, disabling the name input and toggle while saving, and the Refresh button that keeps drafts. It also drafted this README and `.env.example`. Include GSAP animations and image-to-code skills where added to improve the UI/UX.
- **Written/reviewed by me:** fixing codebase, remove unwanted files and structured logic

**Reused code:** No external code copied; only the npm dependencies in `package.json` are used.

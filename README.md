# Dish Management Dashboard (Next.js + Supabase Postgres)

Full-stack app: local drafts, backend validation, optimistic locking (409).

## Prerequisites
Node 20+, a Supabase project (Postgres).

## Setup
```bash
npm install
cp .env.example .env      # paste your Supabase connection string as DATABASE_URL
npm run migrate           # creates the dishes table (safe to rerun)
npm run seed              # idempotent: ON CONFLICT DO NOTHING
npm run dev               # http://localhost:3000
```
> `db/dishes.json` holds sample data. Replace it with the supplied seed JSON (map field names if they differ).

## API
- `GET /api/dishes` -> 200 `[{dishId, dishName, imageUrl, isPublished, version}]`
- `PATCH /api/dishes/:dishId` body `{dishName, isPublished, expectedVersion}` -> 200 | 400 | 404 | 409 (with `currentDish`) | 500

## Architecture
route handlers -> `services` (business rules) -> `repositories` (all SQL) ; `validators` for type checks.
Frontend: `hooks/useDishes.js` (saved vs draft state), `components/`, GSAP motion in `Hero` and `DishList`.

## Decisions
- All three PATCH fields required. Empty name allowed while unpublished. Name is stored trimmed.
- Version check + write is ONE `UPDATE ... WHERE dish_id=$3 AND version=$4`, so concurrent requests cannot both win.
- On 409 the latest dish is kept in `conflict`, not copied into `saved`, until the user confirms Reload.

## Verification
See assignment Section 15 (replace `localhost:4000` with `localhost:3000/api`). Document how you created the bad-URL test case here.

## Known limitations / Time spent / AI disclosure
TODO: fill in before submitting. AI tools were used to scaffold this project.

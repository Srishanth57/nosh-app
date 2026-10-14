CREATE TABLE IF NOT EXISTS dishes (
  dish_id      TEXT PRIMARY KEY,
  dish_name    TEXT NOT NULL,
  image_url    TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  version      INTEGER NOT NULL DEFAULT 1
);

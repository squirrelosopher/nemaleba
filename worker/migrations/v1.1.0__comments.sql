CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  city_id TEXT NOT NULL,
  body TEXT NOT NULL,
  author_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS comments_by_city ON comments (city_id, created_at);

CREATE INDEX IF NOT EXISTS comments_by_author ON comments (author_hash, created_at);

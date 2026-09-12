ALTER TABLE comments ADD COLUMN address_hash TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS comments_by_address ON comments (address_hash, created_at);

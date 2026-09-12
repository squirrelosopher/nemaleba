-- One subscription is one endpoint watching one city, so a reader watching four cities is
-- four rows sharing an endpoint. The index answers the only question the collector asks:
-- who is watching this city.
CREATE TABLE IF NOT EXISTS subscriptions (
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  city_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (endpoint, city_id)
);

CREATE INDEX IF NOT EXISTS subscriptions_by_city ON subscriptions (city_id);

-- Per endpoint rather than per subscription: these are how a reader wants to be told,
-- not what about. `notify_grouped` off means one notification per city, each opening the
-- city it is about; on means one card for the run, opening the list.
CREATE TABLE IF NOT EXISTS user_preferences (
  endpoint TEXT PRIMARY KEY,
  locale TEXT NOT NULL DEFAULT 'sr-latn',
  notify_electricity INTEGER NOT NULL DEFAULT 1,
  notify_water INTEGER NOT NULL DEFAULT 1,
  notify_grouped INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Anonymous, one municipality at a time, kept for twenty-four hours. Two hashes, because
-- they answer different questions: the author hash carries a token the browser keeps, so
-- clearing site data starts the allowance over and the wall stays usable behind a shared
-- address; the address hash carries nothing the caller chooses, which is what makes it a
-- limit. Neither stores what it was made from.
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  city_id TEXT NOT NULL,
  body TEXT NOT NULL,
  author_hash TEXT NOT NULL,
  address_hash TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS comments_by_city ON comments (city_id, created_at);

CREATE INDEX IF NOT EXISTS comments_by_author ON comments (author_hash, created_at);

CREATE INDEX IF NOT EXISTS comments_by_address ON comments (address_hash, created_at);

-- Readers confirming an outage is real. The control was taken out of the UI; the routes
-- and this table remain, so bringing it back is a client component and nothing else.
CREATE TABLE IF NOT EXISTS confirmations (
  outage_id TEXT NOT NULL,
  voter_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (outage_id, voter_id)
);

CREATE INDEX IF NOT EXISTS confirmations_by_outage ON confirmations (outage_id);

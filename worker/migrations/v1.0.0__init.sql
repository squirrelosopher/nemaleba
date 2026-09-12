CREATE TABLE IF NOT EXISTS subscriptions (
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  city_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (endpoint, city_id)
);

CREATE INDEX IF NOT EXISTS subscriptions_by_city ON subscriptions (city_id);

CREATE TABLE IF NOT EXISTS user_preferences (
  endpoint TEXT PRIMARY KEY,
  locale TEXT NOT NULL DEFAULT 'sr-latn',
  notify_electricity INTEGER NOT NULL DEFAULT 1,
  notify_water INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS confirmations (
  outage_id TEXT NOT NULL,
  voter_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  PRIMARY KEY (outage_id, voter_id)
);

CREATE INDEX IF NOT EXISTS confirmations_by_outage ON confirmations (outage_id);

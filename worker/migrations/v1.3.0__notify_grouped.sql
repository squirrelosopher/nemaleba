-- Off by default, so a subscriber gets one notification per city and each can open the
-- city it is about. Existing rows take the default, which is the behaviour they had
-- before only in so far as they were never asked.
ALTER TABLE user_preferences ADD COLUMN notify_grouped INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS source_gap_requests (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  website TEXT NOT NULL,
  category TEXT NOT NULL,
  competitors_json TEXT NOT NULL,
  buyer_question TEXT NOT NULL,
  consent_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS source_gap_requests_created_at_idx
ON source_gap_requests(created_at DESC);

CREATE TABLE IF NOT EXISTS intake_rate_limits (
  fingerprint TEXT PRIMARY KEY,
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL
);

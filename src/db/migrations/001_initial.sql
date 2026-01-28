-- Google accounts with OAuth tokens
CREATE TABLE IF NOT EXISTS google_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry INTEGER NOT NULL,
  calendar_id TEXT DEFAULT 'primary',
  is_active INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_active_account ON google_accounts(is_active);

-- Booked appointments
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  google_event_id TEXT UNIQUE,
  caller_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT,
  service_address TEXT,
  issue_description TEXT,
  start_time INTEGER NOT NULL,
  end_time INTEGER NOT NULL,
  account_email TEXT NOT NULL,
  call_id TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_appointments_time ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_google_event ON appointments(google_event_id);

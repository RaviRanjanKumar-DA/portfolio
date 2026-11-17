-- Portfolio admin schema (Cloudflare D1 / SQLite). All timestamps are UTC ISO-8601 strings.
PRAGMA foreign_keys = ON;

CREATE TABLE applications (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  company       TEXT NOT NULL,
  role          TEXT NOT NULL,
  platform      TEXT NOT NULL DEFAULT 'Other',
  job_url       TEXT,
  jd_text       TEXT,
  location      TEXT,
  work_mode     TEXT,
  salary        TEXT,
  contact_name  TEXT,
  contact_email TEXT,
  status        TEXT NOT NULL DEFAULT 'saved',
  applied_at    TEXT,
  follow_up_at  TEXT,
  match_score   INTEGER,
  notes         TEXT,
  tags          TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX idx_app_status  ON applications(status);
CREATE INDEX idx_app_applied ON applications(applied_at);

CREATE TABLE events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  type           TEXT NOT NULL,
  from_status    TEXT,
  to_status      TEXT,
  detail         TEXT,
  created_at     TEXT NOT NULL
);
CREATE INDEX idx_events_app ON events(application_id, created_at);

CREATE TABLE templates (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  kind       TEXT NOT NULL,
  subject    TEXT,
  body       TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE documents (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL,
  content        TEXT NOT NULL,
  created_at     TEXT NOT NULL
);

CREATE TABLE profile (
  id   INTEGER PRIMARY KEY CHECK (id = 1),
  json TEXT NOT NULL
);

CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE cv_master (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  json       TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE cv_versions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER REFERENCES applications(id) ON DELETE SET NULL,
  label          TEXT NOT NULL,
  template       TEXT NOT NULL DEFAULT 'classic',
  json           TEXT NOT NULL,
  created_at     TEXT NOT NULL
);

CREATE TABLE messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT,
  email        TEXT,
  phone        TEXT,
  organization TEXT,
  message      TEXT,
  read         INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  username   TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip         TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_login_ip ON login_attempts(ip, created_at);

-- RankFootprint D1 schema (Cloudflare D1 free tier). Apply: npx wrangler d1 execute rankfootprint --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS magic_tokens (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL, expires_at INTEGER NOT NULL, used INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions (id_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS scans (id TEXT PRIMARY KEY, user_id TEXT, email TEXT, business TEXT NOT NULL, keyword TEXT NOT NULL,
  location TEXT, center_lat REAL, center_lng REAL, grid_size INTEGER NOT NULL, radius_km REAL NOT NULL,
  provider TEXT NOT NULL, demo INTEGER NOT NULL, results TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS leads (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL, business TEXT, keyword TEXT,
  location TEXT, note TEXT, scan_id TEXT, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS free_scan_limits (k TEXT PRIMARY KEY, n INTEGER NOT NULL, day TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS scans_user ON scans(user_id);
CREATE TABLE IF NOT EXISTS paid_samples (session_id TEXT PRIMARY KEY, email TEXT, created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'available', used_at TEXT);
-- existing DBs (27 Oct 2026): ALTER TABLE paid_samples ADD COLUMN status TEXT NOT NULL DEFAULT 'available'; ALTER TABLE paid_samples ADD COLUMN used_at TEXT;

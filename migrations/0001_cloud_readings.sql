CREATE TABLE IF NOT EXISTS readings (
  id TEXT PRIMARY KEY, device_id TEXT NOT NULL, idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, expires_at TEXT NOT NULL,
  category TEXT NOT NULL, question TEXT NOT NULL, background TEXT NOT NULL,
  risk_level TEXT NOT NULL, risk_categories_json TEXT NOT NULL, status TEXT NOT NULL,
  payload_json TEXT NOT NULL, ai_reading_json TEXT, provider_response_id TEXT,
  provider_model TEXT, error_code TEXT, UNIQUE(device_id, idempotency_key)
);
CREATE TABLE IF NOT EXISTS ai_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT, reading_id TEXT NOT NULL, created_at TEXT NOT NULL,
  outcome TEXT NOT NULL, error_code TEXT, provider_response_id TEXT,
  FOREIGN KEY (reading_id) REFERENCES readings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_readings_device ON readings(device_id);
CREATE INDEX IF NOT EXISTS idx_readings_status ON readings(status);
CREATE INDEX IF NOT EXISTS idx_readings_category ON readings(category);
CREATE INDEX IF NOT EXISTS idx_readings_created ON readings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_readings_expires ON readings(expires_at);
CREATE INDEX IF NOT EXISTS idx_attempts_reading ON ai_attempts(reading_id, created_at DESC);

CREATE TABLE IF NOT EXISTS guest_profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_key TEXT NOT NULL,
  tag TEXT NOT NULL CHECK (length(tag) = 4 AND tag NOT GLOB '*[^0-9]*'),
  token_hash TEXT NOT NULL UNIQUE,
  plants_grown INTEGER NOT NULL DEFAULT 0 CHECK (plants_grown BETWEEN 0 AND 1000000),
  correct_answers INTEGER NOT NULL DEFAULT 0 CHECK (correct_answers BETWEEN 0 AND 10000000),
  -- Legacy aggregate stays capped at ten. Discoveries hold the full catalogue.
  unique_plants INTEGER NOT NULL DEFAULT 0 CHECK (unique_plants BETWEEN 0 AND 10),
  highest_level INTEGER NOT NULL DEFAULT 1 CHECK (highest_level BETWEEN 1 AND 7),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (name_key, tag),
  CHECK (plants_grown * 3 <= correct_answers),
  CHECK (unique_plants <= plants_grown)
);
CREATE INDEX IF NOT EXISTS guest_profiles_ranking
  ON guest_profiles (plants_grown DESC, correct_answers DESC, id ASC);
CREATE TABLE IF NOT EXISTS guest_plant_discoveries (
  profile_id TEXT NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
  plant_id TEXT NOT NULL,
  PRIMARY KEY (profile_id, plant_id)
);
CREATE TABLE IF NOT EXISTS tutor_rate_limits (
  profile_id TEXT PRIMARY KEY REFERENCES guest_profiles(id) ON DELETE CASCADE,
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL CHECK (request_count BETWEEN 1 AND 10)
);

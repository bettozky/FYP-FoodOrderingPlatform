-- Job applications (customers apply to shop vacancies) and announcements (admin / shop notices for customers).
-- Same layout as the other tables: indexed columns + a `data` JSONB column with the full record.

CREATE TABLE IF NOT EXISTS job_applications (
  seq         BIGSERIAL,
  id          TEXT PRIMARY KEY,
  job_id      TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  user_id     TEXT NOT NULL,                -- the applicant
  status      TEXT NOT NULL,                -- submitted | viewed | shortlisted | interview | hired | rejected | withdrawn
  created_at  BIGINT NOT NULL,              -- epoch milliseconds
  data        JSONB NOT NULL,               -- form answers, document references (private bucket), history, shop note
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_applications_job_idx ON job_applications (job_id);
CREATE INDEX IF NOT EXISTS job_applications_merchant_idx ON job_applications (merchant_id);
CREATE INDEX IF NOT EXISTS job_applications_user_idx ON job_applications (user_id);

CREATE TABLE IF NOT EXISTS announcements (
  seq         BIGSERIAL,
  id          TEXT PRIMARY KEY,
  merchant_id TEXT,                         -- NULL = posted by the ScootMeal admin
  created_at  BIGINT NOT NULL,
  data        JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements    ENABLE ROW LEVEL SECURITY;

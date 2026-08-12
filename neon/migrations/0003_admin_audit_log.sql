CREATE TABLE IF NOT EXISTS product_audit_log (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS product_audit_log_product_created_idx
  ON product_audit_log (product_id, created_at DESC, id DESC);

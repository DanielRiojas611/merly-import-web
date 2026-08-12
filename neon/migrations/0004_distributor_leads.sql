CREATE TABLE IF NOT EXISTS distributor_leads (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  correo TEXT,
  departamento TEXT NOT NULL,
  negocio TEXT NOT NULL,
  objetivo TEXT NOT NULL,
  categorias TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  fuente TEXT NOT NULL DEFAULT 'web-distribuidor',
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS distributor_leads_created_idx
  ON distributor_leads (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS distributor_leads_phone_idx
  ON distributor_leads (telefono);

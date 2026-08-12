CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  presentation TEXT NOT NULL,
  category TEXT NOT NULL,
  own_brand BOOLEAN NOT NULL DEFAULT FALSE,
  image_url TEXT NOT NULL,
  quote_only BOOLEAN NOT NULL DEFAULT TRUE,
  badge TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_price_tiers (
  id BIGSERIAL PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL CHECK (min_quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  UNIQUE (product_id, min_quantity)
);

CREATE TABLE IF NOT EXISTS banners (
  id TEXT PRIMARY KEY,
  kicker TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  cta_label TEXT NOT NULL,
  cta_href TEXT NOT NULL,
  theme TEXT NOT NULL,
  image_url TEXT,
  mobile_image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_drafts (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  batch_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_public_order_idx
  ON products (is_active, sort_order, brand, name);

CREATE INDEX IF NOT EXISTS product_price_tiers_product_idx
  ON product_price_tiers (product_id, min_quantity);

CREATE INDEX IF NOT EXISTS product_drafts_updated_idx
  ON product_drafts (updated_at DESC, id);

INSERT INTO products (
  id, brand, name, description, presentation, category, own_brand,
  image_url, quote_only, badge, is_featured, sort_order
) VALUES
  ('promil-doctor-max-204', 'PROMIL', 'Doctor Max Triple Acción', 'Crema dental de presentación mayorista.', 'Crema dental 204 g · caja por confirmar', 'Higiene', TRUE, '/products/promil-doctor-max-204g.webp', TRUE, 'Marca propia', TRUE, 10),
  ('pibe-panitos-100', 'PIBE', 'Pañitos húmedos antibacteriales', 'Pañitos húmedos para higiene diaria.', 'Paquete x 100 unidades · caja por confirmar', 'Higiene', FALSE, '/products/pibe-panitos-humedos-100.webp', TRUE, 'Alta rotación', TRUE, 20),
  ('tonito-super-glue', 'TOÑITO', 'Super Glue', 'Adhesivo instantáneo en formato de exhibición mayorista.', 'Exhibidor mayorista · contenido por confirmar', 'Hogar', TRUE, '/products/tonito-super-glue-exhibidor.webp', TRUE, 'Marca propia', TRUE, 30),
  ('tonito-venditas', 'TOÑITO', 'Venditas resistentes al agua', 'Venditas resistentes al agua para boticas y bodegas.', 'Caja x 100 + 10 unidades', 'Higiene', TRUE, '/products/tonito-venditas-100-10.webp', TRUE, 'Marca propia', TRUE, 40),
  ('hicell-aa-12-blisters', 'HICELL', 'Pilas AA Extra Long Life', 'Pilas AA para productos de consumo cotidiano.', 'Caja x 12 blísteres · 2 pilas por blíster', 'Hogar', FALSE, '/products/hicell-aa-12-blisters.webp', TRUE, 'Alta rotación', TRUE, 50),
  ('tonito-hisopos-100', 'TOÑITO', 'Hisopos 100% puro algodón', 'Hisopos de algodón para higiene personal.', 'Envase x 100 unidades · caja por confirmar', 'Higiene', TRUE, '/products/tonito-hisopos-100.webp', TRUE, 'Marca propia', TRUE, 60)
ON CONFLICT (id) DO NOTHING;

INSERT INTO banners (
  id, kicker, title, body, cta_label, cta_href, theme,
  image_url, mobile_image_url, sort_order
) VALUES
  ('marcas-propias', 'Marcas propias', 'Más margen para tu negocio', 'Conoce nuestras líneas de alta rotación y cotiza mejores escalas por volumen.', 'Ver marcas propias', '/catalogo', 'brand', '/banners/portafolio-marcas-propias-v2.webp', '/banners/portafolio-marcas-propias-mobile-v12.webp', 10),
  ('higiene-oral', 'Higiene oral', 'Una categoría que rota todos los días', 'Abastece tu negocio con presentaciones mayoristas y cotiza la escala que necesitas.', 'Ver higiene oral', '/catalogo', 'offers', '/banners/preventa-logistica-marcas-v12.webp', NULL, 20),
  ('cobertura-nacional', 'Cobertura nacional', 'Abastecemos Lima y provincias', 'Delivery coordinado en Lima o entrega mediante agencia para pedidos a provincias.', 'Conocer entregas', '#entregas', 'delivery', '/banners/entrega-nacional-vinil-v10.webp', NULL, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO site_settings (key, value)
VALUES
  ('whatsapp_number', '"51991212263"'::jsonb),
  ('catalog_version', '1'::jsonb)
ON CONFLICT (key) DO NOTHING;

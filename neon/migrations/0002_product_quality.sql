-- P0 product quality and image cleanup.
-- Tested first on Neon branch audit-p0-data-20260804.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_status text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sales_unit text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS internal_note text;

UPDATE public.products
SET image_status = CASE
  WHEN image_url LIKE 'data:image/svg+xml,%'
    OR image_url = '/products/product-placeholder.svg' THEN 'pending'
  WHEN image_url LIKE 'data:image/webp;base64,%'
    OR image_url LIKE '/products/recovered/%' THEN 'recovered'
  ELSE 'approved'
END
WHERE image_status IS NULL
   OR image_status NOT IN ('pending', 'recovered', 'approved');

UPDATE public.products
SET sales_unit = CASE
  WHEN upper(presentation) LIKE '%DOC%' THEN 'docena'
  WHEN upper(presentation) LIKE '%BLISTER%' THEN 'blister'
  WHEN upper(presentation) LIKE '%KG%' THEN 'kilogramo'
  WHEN upper(presentation) LIKE '%BOX%'
    OR upper(presentation) LIKE '%EXHIB%' THEN 'exhibidor'
  WHEN upper(presentation) LIKE '%PAQ%' THEN 'paquete'
  WHEN upper(presentation) LIKE '%UND%'
    OR upper(presentation) LIKE '%UNIDAD%' THEN 'unidad'
  WHEN upper(presentation) LIKE 'CAJA%' THEN 'caja'
  ELSE 'otro'
END
WHERE sales_unit IS NULL OR sales_unit = '';

UPDATE public.products AS product
SET internal_note = NULLIF(draft.payload->>'internalReview', '')
FROM public.product_drafts AS draft
WHERE draft.id = product.id
  AND NULLIF(draft.payload->>'internalReview', '') IS NOT NULL
  AND product.internal_note IS NULL;

UPDATE public.products
SET image_url = '/products/product-placeholder.svg',
    image_status = 'pending',
    updated_at = NOW()
WHERE image_url LIKE 'data:image/svg+xml,%';

UPDATE public.products
SET image_url = '/products/recovered/' || id || '.webp',
    image_status = 'recovered',
    updated_at = NOW()
WHERE image_url LIKE 'data:image/webp;base64,%';

UPDATE public.product_drafts
SET payload = jsonb_set(
      jsonb_set(
        jsonb_set(
          payload,
          '{imageUrl}',
          to_jsonb('/products/product-placeholder.svg'::text),
          true
        ),
        '{imageStatus}',
        to_jsonb('pending'::text),
        true
      ),
      '{salesUnit}',
      to_jsonb(CASE
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%DOC%' THEN 'docena'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%BLISTER%' THEN 'blister'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%KG%' THEN 'kilogramo'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%BOX%'
          OR upper(COALESCE(payload->>'presentation', '')) LIKE '%EXHIB%' THEN 'exhibidor'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%PAQ%' THEN 'paquete'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%UND%'
          OR upper(COALESCE(payload->>'presentation', '')) LIKE '%UNIDAD%' THEN 'unidad'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE 'CAJA%' THEN 'caja'
        ELSE 'otro'
      END),
      true
    ),
    updated_at = NOW()
WHERE payload->>'imageUrl' LIKE 'data:image/svg+xml,%';

UPDATE public.product_drafts
SET payload = jsonb_set(
      jsonb_set(
        jsonb_set(
          payload,
          '{imageUrl}',
          to_jsonb('/products/recovered/' || id || '.webp'),
          true
        ),
        '{imageStatus}',
        to_jsonb('recovered'::text),
        true
      ),
      '{salesUnit}',
      to_jsonb(CASE
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%DOC%' THEN 'docena'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%BLISTER%' THEN 'blister'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%KG%' THEN 'kilogramo'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%BOX%'
          OR upper(COALESCE(payload->>'presentation', '')) LIKE '%EXHIB%' THEN 'exhibidor'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%PAQ%' THEN 'paquete'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%UND%'
          OR upper(COALESCE(payload->>'presentation', '')) LIKE '%UNIDAD%' THEN 'unidad'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE 'CAJA%' THEN 'caja'
        ELSE 'otro'
      END),
      true
    ),
    updated_at = NOW()
WHERE payload->>'imageUrl' LIKE 'data:image/webp;base64,%';

UPDATE public.product_drafts
SET payload = jsonb_set(
      jsonb_set(
        payload,
        '{imageStatus}',
        to_jsonb(CASE
          WHEN COALESCE(payload->>'imageUrl', '') = '/products/product-placeholder.svg' THEN 'pending'
          WHEN COALESCE(payload->>'imageUrl', '') LIKE '/products/recovered/%' THEN 'recovered'
          ELSE 'approved'
        END),
        true
      ),
      '{salesUnit}',
      to_jsonb(CASE
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%DOC%' THEN 'docena'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%BLISTER%' THEN 'blister'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%KG%' THEN 'kilogramo'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%BOX%'
          OR upper(COALESCE(payload->>'presentation', '')) LIKE '%EXHIB%' THEN 'exhibidor'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%PAQ%' THEN 'paquete'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE '%UND%'
          OR upper(COALESCE(payload->>'presentation', '')) LIKE '%UNIDAD%' THEN 'unidad'
        WHEN upper(COALESCE(payload->>'presentation', '')) LIKE 'CAJA%' THEN 'caja'
        ELSE 'otro'
      END),
      true
    ),
    updated_at = NOW()
WHERE NOT (payload ? 'imageStatus') OR NOT (payload ? 'salesUnit');

UPDATE public.products
SET is_active = FALSE,
    internal_note = concat_ws(
      E'\n',
      NULLIF(internal_note, ''),
      'Desactivado por duplicidad exacta; conservar como registro histórico. Producto canónico: promil-doctor-max-204.'
    ),
    updated_at = NOW()
WHERE id = 'pd-pm-0002';

UPDATE public.product_drafts
SET payload = jsonb_set(
      jsonb_set(payload, '{isActive}', 'false'::jsonb, true),
      '{internalReview}',
      to_jsonb(concat_ws(
        E'\n',
        NULLIF(payload->>'internalReview', ''),
        'Duplicado exacto. No publicar; usar promil-doctor-max-204.'
      )),
      true
    ),
    updated_at = NOW()
WHERE id = 'pd-pm-0002';

ALTER TABLE public.products ALTER COLUMN image_status SET DEFAULT 'pending';
ALTER TABLE public.products ALTER COLUMN image_status SET NOT NULL;
ALTER TABLE public.products ALTER COLUMN sales_unit SET DEFAULT 'otro';
ALTER TABLE public.products ALTER COLUMN sales_unit SET NOT NULL;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_image_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_image_status_check
  CHECK (image_status IN ('pending', 'recovered', 'approved'));

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_sales_unit_check;
ALTER TABLE public.products ADD CONSTRAINT products_sales_unit_check
  CHECK (sales_unit IN (
    'caja', 'unidad', 'docena', 'exhibidor',
    'paquete', 'blister', 'kilogramo', 'otro'
  ));

CREATE UNIQUE INDEX IF NOT EXISTS products_active_semantic_uidx
ON public.products (
  lower(regexp_replace(trim(brand), '\s+', ' ', 'g')),
  lower(regexp_replace(trim(name), '\s+', ' ', 'g')),
  lower(regexp_replace(trim(presentation), '\s+', ' ', 'g'))
)
WHERE is_active;

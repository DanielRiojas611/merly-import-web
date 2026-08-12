# Merly Import Web

Sitio corporativo, catalogo mayorista, formulario de distribuidores y panel administrativo de Merly Import, construido con Next.js, React, Neon Postgres y Vercel Blob.

## Requisitos

- Node.js 22.13 o superior.
- npm.
- `DATABASE_URL` del proyecto Neon independiente de Merly.
- `BLOB_READ_WRITE_TOKEN` del proyecto de almacenamiento propio de Merly.
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET` para el panel administrativo.
- `NEXT_PUBLIC_SITE_URL` para previews o dominio oficial.

Variables opcionales:

- `ENABLE_CONTENT_PREVIEW`.
- `DELIVERY_OWN_BRANDS_MINIMUM`.
- `DELIVERY_MIXED_MINIMUM`.
- `SITE_LAST_UPDATED_AT`.

## Desarrollo

```bash
npm ci
npm run dev
```

## Validacion

```bash
npm run check
npm audit --omit=dev --audit-level=high
```

`npm run check` ejecuta TypeScript, ESLint, pruebas de regresion y build de produccion.

## Arquitectura

- `app/`: paginas, componentes, API Routes y logica de servidor.
- `app/admin/`: panel autenticado para productos, precios y contenido.
- `app/api/distribuidor/route.ts`: registro de leads de distribuidores en la BD de Merly.
- `public/`: assets estaticos propios de Merly, incluyendo logo y favicon.
- `neon/migrations/`: esquema SQL independiente para Merly.
- `scripts/migrate-catalog-to-merly.mjs`: migracion controlada de catalogo desde una BD fuente hacia Merly.
- `tests/`: pruebas automaticas.

## Migraciones

Aplicar en orden en la base `neondb` del proyecto Neon `solitary-recipe-80594074`:

1. `0001_catalog.sql`: productos, precios, banners, configuracion y borradores.
2. `0002_product_quality.sql`: estado de imagen, unidad de venta y revision interna.
3. `0003_admin_audit_log.sql`: historial restaurable de productos.
4. `0004_distributor_leads.sql`: leads del formulario de distribuidores.

## Migracion De Catalogo

El script requiere URLs separadas y una confirmacion explicita del destino:

```bash
SOURCE_DATABASE_URL="postgresql://source" \
DATABASE_URL="postgresql://merly" \
CONFIRM_TARGET_PROJECT="solitary-recipe-80594074" \
node scripts/migrate-catalog-to-merly.mjs
```

Nunca uses la misma URL para origen y destino. El script aborta si ambas variables son iguales.

## Administracion

El panel permite:

- editar, ocultar y reactivar productos;
- preparar y publicar borradores;
- restaurar versiones publicadas;
- importar CSV con validacion;
- administrar banners, textos, enlaces sociales y contacto;
- revisar y conservar datos en la BD propia de Merly.

No existe modulo de atencion personal individual en Merly.

## Despliegue

El proyecto debe desplegarse como Vercel Preview independiente de `merly-import-web`. No conectar `merlyimport.com` ni cambiar DNS hasta validacion explicita del preview.

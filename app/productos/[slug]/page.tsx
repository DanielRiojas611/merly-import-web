/* eslint-disable @next/next/no-img-element */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Product } from "../../catalogo/products";
import { BRAND_NAME, LOGO_PATH } from "../../lib/brand";
import { getPublishedProductsByIds } from "../../lib/neon-catalog";
import {
  absoluteProductImage,
  productIdFromSlug,
  productPageSummary,
  productPath,
  productSeoDescription,
  productSlug,
} from "../../lib/product-seo";
import { siteUrl } from "../../lib/site-url";
import { displayProductName, productQuoteName } from "../../lib/product-utils";
import ProductQuoteButton from "./ProductQuoteButton";
import "../products.css";

export const revalidate = 120;

type ProductPageProps = { params: Promise<{ slug: string }> };

async function loadProduct(slug: string): Promise<Product | null> {
  const id = productIdFromSlug(slug);
  if (!id) return null;
  try {
    return (await getPublishedProductsByIds([id]))[0] ?? null;
  } catch (error) {
    console.error("No se pudo cargar la ficha de producto", error);
    return null;
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) return { title: "Producto no disponible", robots: { index: false, follow: false } };

  const canonical = productPath(product);
  const description = productSeoDescription(product);
  const image = absoluteProductImage(product, siteUrl());
  const title = `${productQuoteName(product)} mayorista`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${title} | ${BRAND_NAME}`,
      description,
      url: canonical,
      type: "website",
      images: [{ url: image, alt: productQuoteName(product) }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${BRAND_NAME}`,
      description,
      images: [image],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();
  if (slug !== productSlug(product)) permanentRedirect(productPath(product));

  const base = siteUrl();
  const canonical = new URL(productPath(product), base).toString();
  const image = absoluteProductImage(product, base);
  const name = displayProductName(product.brand, product.name);
  const fullName = productQuoteName(product);
  const description = productSeoDescription(product);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${canonical}#producto`,
    name: fullName,
    image: [image],
    description,
    sku: product.id,
    category: product.category,
    url: canonical,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    audience: { "@type": "BusinessAudience", audienceType: "Mayoristas, distribuidores y comercios" },
    additionalProperty: [{ "@type": "PropertyValue", name: "Presentación mayorista", value: product.presentation }],
  };

  return <main className="products-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <header className="products-header">
      <div className="products-shell products-header-inner">
        <Link href="/" aria-label={`${BRAND_NAME}, inicio`}><img className="products-logo" src={LOGO_PATH} alt={BRAND_NAME} /></Link>
        <nav aria-label="Navegación de producto"><Link href="/productos">Productos</Link><Link href="/catalogo">Ver catálogo</Link></nav>
      </div>
    </header>
    <div className="products-shell product-detail-wrap">
      <nav className="product-breadcrumbs" aria-label="Ruta de navegación"><Link href="/">Inicio</Link><span>›</span><Link href="/productos">Productos</Link><span>›</span><span>{name}</span></nav>
      <article className="product-detail">
        <div className="product-detail-image"><img src={product.image} alt={fullName} width="640" height="640" /></div>
        <div className="product-detail-copy">
          <p className="products-eyebrow">{product.brand || "Producto mayorista"}</p>
          <h1>{name}</h1>
          <p className="product-detail-lead">{productPageSummary(product)}</p>
          <dl className="product-facts">
            <div><dt>Presentación</dt><dd>{product.presentation}</dd></div>
            <div><dt>Categoría</dt><dd>{product.category}</dd></div>
            <div><dt>Modalidad</dt><dd>Venta mayorista y cotización por volumen</dd></div>
            <div><dt>Cobertura</dt><dd>Lima y envíos a todo el Perú</dd></div>
          </dl>
          <div className="product-actions">
            <ProductQuoteButton productId={product.id} productLabel={fullName} />
            <Link className="product-secondary-action" href="/catalogo">Seguir viendo el catálogo</Link>
          </div>
          <p className="product-commercial-note">El precio y la disponibilidad se confirman por WhatsApp antes de cerrar el pedido.</p>
        </div>
      </article>
      <section className="product-value">
        <h2>Abastecimiento para negocios</h2>
        <p>Merly Import atiende a mayoristas, distribuidores, bodegas, minimarkets, boticas y farmacias. Coordinamos delivery en Lima o entrega mediante agencia para pedidos a provincias.</p>
      </section>
    </div>
  </main>;
}

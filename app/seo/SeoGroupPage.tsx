/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BRAND_NAME, LOGO_PATH, WHATSAPP_NUMBER } from "../lib/brand";
import { getPublishedProducts } from "../lib/neon-catalog";
import { activeSeoGroups, findSeoGroup, productsForSeoGroup, type SeoGroup } from "../lib/seo-groups";
import { productPath, productSeoName } from "../lib/product-seo";
import { siteUrl } from "../lib/site-url";
import "../productos/products.css";
import "./groups.css";

const catalog = cache(async () => (await getPublishedProducts()) ?? []);

export async function seoGroupMetadata(kind: SeoGroup["kind"], slug: string): Promise<Metadata> {
  const group = findSeoGroup(kind, slug);
  if (!group) return { title: "Página no disponible", robots: { index: false, follow: false } };
  const products = productsForSeoGroup(await catalog(), group);
  return {
    title: group.title,
    description: group.description,
    alternates: { canonical: group.path },
    ...(products.length === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: group.title + " | " + BRAND_NAME, description: group.description, url: group.path, type: "website" },
    twitter: { title: group.title + " | " + BRAND_NAME, description: group.description },
  };
}

export default async function SeoGroupPage({ kind, slug }: { kind: SeoGroup["kind"]; slug: string }) {
  const group = findSeoGroup(kind, slug);
  if (!group) notFound();
  const all = await catalog();
  const products = productsForSeoGroup(all, group);
  const others = activeSeoGroups(all).filter(item => item.path !== group.path);
  const base = siteUrl();
  const absolute = (path: string) => new URL(path, base).toString();
  const canonical = absolute(group.path);
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "CollectionPage", "@id": canonical + "#pagina", url: canonical, name: group.title, description: group.description, mainEntity: { "@id": canonical + "#productos" } },
      { "@type": "ItemList", "@id": canonical + "#productos", numberOfItems: products.length, itemListElement: products.map((product, index) => ({ "@type": "ListItem", position: index + 1, url: absolute(productPath(product)), name: productSeoName(product) })) },
      { "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: absolute("/") },
        { "@type": "ListItem", position: 2, name: "Productos", item: absolute("/productos") },
        { "@type": "ListItem", position: 3, name: group.label, item: canonical },
      ] },
    ],
  };
  const whatsapp = "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent("Hola, quiero cotizar productos al por mayor de " + group.label + " de Merly Import.");
  return <main className="products-page">
    {products.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />}
    <header className="products-header"><div className="products-shell products-header-inner">
      <Link href="/" aria-label={BRAND_NAME + ", inicio"}><img className="products-logo" src={LOGO_PATH} alt={BRAND_NAME} /></Link>
      <nav aria-label="Navegación"><Link href="/productos">Productos</Link><Link href="/catalogo">Ver catálogo</Link></nav>
    </div></header>
    <section className="products-shell products-hero">
      <nav className="product-breadcrumbs" aria-label="Ruta de navegación"><Link href="/">Inicio</Link><span>›</span><Link href="/productos">Productos</Link><span>›</span><span>{group.label}</span></nav>
      <p className="products-eyebrow">Distribución mayorista · Perú</p>
      <h1>{group.title}</h1><p>{group.intro}</p>
      <div className="product-actions seo-group-actions"><a className="product-primary-action" href={whatsapp} target="_blank" rel="noopener noreferrer">Cotizar por WhatsApp</a><Link className="product-secondary-action" href="/catalogo">Ver catálogo completo</Link></div>
    </section>
    <section className="products-shell" aria-label="Productos de la selección">
      <h2>{products.length ? products.length + " productos para cotizar" : "Selección temporalmente sin productos publicados"}</h2>
      {products.length > 0 ? <div className="products-grid">{products.map(product => <article className="products-card" key={product.id}><Link href={productPath(product)}>
        <div className="products-card-image"><img src={product.image} alt={productSeoName(product)} loading="lazy" width="420" height="420" /></div>
        <div className="products-card-copy"><small>{product.brand || product.category}</small><h3>{productSeoName(product)}</h3><p>{product.presentation}</p><strong>Ver ficha y cotizar →</strong></div>
      </Link></article>)}</div> : <p>Consulta el catálogo general o escríbenos para conocer la disponibilidad.</p>}
    </section>
    <section className="products-shell seo-group-information">
      <h2>Cómo comprar al por mayor</h2>
      <h3>¿Cómo consulto el precio?</h3><p>Selecciona las referencias y cantidades, y solicita una cotización. El precio y la disponibilidad se confirman antes de cerrar el pedido.</p>
      <h3>¿Cómo se realiza la entrega?</h3><p>Coordinamos la entrega en Lima o el despacho mediante agencia para provincias. Confirma cobertura y condiciones con nuestro equipo comercial.</p>
      <h3>¿Puedo distribuir estos productos?</h3><p>Si buscas abastecer tu negocio o distribuir en tu ciudad, solicita <Link href="/distribuidor">atención para distribuidores</Link>.</p>
      {others.length > 0 && <><h2>Explora otras categorías y marcas</h2><nav className="seo-group-links" aria-label="Otras selecciones">{others.map(item => <Link href={item.path} key={item.path}>{item.label} al por mayor</Link>)}</nav></>}
    </section>
  </main>;
}

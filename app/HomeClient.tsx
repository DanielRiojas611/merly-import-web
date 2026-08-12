"use client";
/* eslint-disable @next/next/no-img-element */

import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Product } from "./catalogo/products";
import type { CommercialRules } from "./lib/commercial-rules";
import { BRAND_NAME, FACEBOOK_URL, LOGO_PATH, SITE_DOMAIN } from "./lib/brand";
import { displayProductName, displayProductPresentation, productUnitLabel } from "./lib/product-utils";
import type { SiteContent } from "./lib/site-content-db";
import { siteAssets } from "./site-content";

type SegmentKey = "bodega" | "minimarket" | "farmacia" | "distribuidor";

const PLACEHOLDER_IMAGE = "/products/product-placeholder.svg";
const SEGMENT_KEY = "merly-business-segment";
const segmentOptions: Array<{ key: SegmentKey; label: string; note: string }> = [
  { key: "bodega", label: "Bodega", note: "Productos de rotación diaria" },
  { key: "minimarket", label: "Minimarket", note: "Surtido para distintas categorías" },
  { key: "farmacia", label: "Botica o farmacia", note: "Higiene y cuidado personal" },
  { key: "distribuidor", label: "Distribuidor", note: "Volumen y marcas propias" },
];
const categoryStories = [
  { kicker: "Higiene oral", title: "Productos de alta rotación", href: "/catalogo?buscar=crema+dental", image: siteAssets.categoryStories.oralCare, product: "/products/cutouts/promil-doctor-max-204g.png", theme: "oral" },
  { kicker: "Cuidado personal", title: "Abastece tu mostrador", href: "/catalogo?filtro=higiene", image: siteAssets.categoryStories.pharmacies, product: "/products/cutouts/tonito-venditas-100-10-v12.png", theme: "pharmacy" },
  { kicker: "Limpieza y hogar", title: "Productos para el día a día", href: "/catalogo?filtro=limpieza", image: siteAssets.categoryStories.cleaning, product: "/products/cutouts/merly-detergente.png", theme: "cleaning" },
];

function track(event: string, data: Record<string, string | number> = {}) {
  if (typeof window === "undefined") return;
  const dataLayer = (window as typeof window & { dataLayer?: Array<Record<string, unknown>> }).dataLayer;
  dataLayer?.push({ event, ...data });
}
function money(value: number) { return new Intl.NumberFormat("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value); }
function WhatsAppIcon() { return <svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.05 3A12.8 12.8 0 0 0 5.1 22.43L3.4 28.7l6.4-1.68A12.87 12.87 0 1 0 16.05 3Zm0 23.48a10.6 10.6 0 0 1-5.4-1.48l-.38-.23-3.8 1 1.01-3.7-.25-.4a10.61 10.61 0 1 1 8.82 4.81Z" /></svg>; }
function SearchIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" /></svg>; }
function TikTokIcon() { return <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16.6 3c.3 2.1 1.5 3.4 3.4 3.8v3.1c-1.3 0-2.5-.4-3.5-1.1v6.1a6 6 0 1 1-5.2-5.9v3.2a2.8 2.8 0 1 0 2.1 2.7V3h3.2Z" /></svg>; }
function BrandLockup() { return <span className="brand-lockup merly-lockup" aria-hidden="true"><img src={siteAssets.logo || LOGO_PATH} alt="" /></span>; }
function imageFallback(event: React.SyntheticEvent<HTMLImageElement>) { event.currentTarget.onerror = null; event.currentTarget.src = PLACEHOLDER_IMAGE; }
function matchesSegment(product: Product, segment: SegmentKey) {
  const category = product.category.toLocaleLowerCase("es");
  if (segment === "farmacia") return category.includes("higiene") || category.includes("personal") || category.includes("salud");
  if (segment === "distribuidor") return product.ownBrand || Boolean(product.isFeatured);
  if (segment === "bodega") return !category.includes("industrial");
  return true;
}
function ProductCard({ product }: { product: Product }) {
  const name = displayProductName(product.brand, product.name);
  const search = new URLSearchParams({ buscar: [product.brand, name].filter(Boolean).join(" ") });
  const tiers = [...product.tiers].sort((a, b) => a.min - b.min);
  const base = !product.quoteOnly ? tiers[0] : undefined;
  const best = !product.quoteOnly ? tiers.at(-1) : undefined;
  return <article className="home-product-card">
    <div className="home-product-art"><img src={product.image || PLACEHOLDER_IMAGE} alt={`${product.brand ? `${product.brand} ` : ""}${name}`} loading="lazy" decoding="async" onError={imageFallback} /></div>
    {product.brand ? <p>{product.brand}</p> : null}<h3>{name}</h3><small>{displayProductPresentation(product.presentation)}</small>
    {base ? <div className="home-price"><strong>S/ {base.price.toFixed(2)}</strong><span>por {productUnitLabel(product, 1).replace(/^1\s+/, "")}</span>{best && best.min > base.min ? <em>Desde S/ {best.price.toFixed(2)} llevando {productUnitLabel(product, best.min)}</em> : null}</div> : <div className="home-price pending"><span>Precio mayorista según volumen</span></div>}
    <Link href={`/catalogo?${search}`} onClick={() => track("product_view", { product: `${product.brand} ${name}`.trim() })}>Cotizar <span>→</span></Link>
  </article>;
}

export default function HomeClient({ content, featuredProducts, whatsappNumber, commercialRules, previewMode = false }: { content: SiteContent; featuredProducts: Product[]; whatsappNumber: string; commercialRules: CommercialRules; previewMode?: boolean }) {
  const [slide, setSlide] = useState(0);
  const [segment, setSegment] = useState<SegmentKey>("bodega");
  const banners = useMemo(() => content.banners.filter((banner) => banner.isActive).sort((a, b) => a.sortOrder - b.sortOrder), [content.banners]);
  const products = useMemo(() => {
    const direct = featuredProducts.filter((product) => matchesSegment(product, segment));
    const remainder = featuredProducts.filter((product) => !direct.some((item) => item.id === product.id));
    return [...direct, ...remainder].slice(0, 6);
  }, [featuredProducts, segment]);
  const safeSlide = banners.length ? slide % banners.length : 0;
  const currentBanner = banners[safeSlide] ?? banners[0];
  const settings = content.settings;
  const contact = settings.contact;
  const ownBrandDelivery = money(commercialRules.freeDeliveryOwnBrands);
  const mixedDelivery = money(commercialRules.freeDeliveryMixed);

  useEffect(() => {
    const saved = window.localStorage.getItem(SEGMENT_KEY) as SegmentKey | null;
    if (!saved || !segmentOptions.some((item) => item.key === saved)) return;
    const timer = window.setTimeout(() => setSegment(saved), 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (banners.length < 2) return; const timer = window.setInterval(() => setSlide((current) => (current + 1) % banners.length), 8000); return () => window.clearInterval(timer); }, [banners.length]);

  function chooseSegment(value: SegmentKey) {
    setSegment(value);
    window.localStorage.setItem(SEGMENT_KEY, value);
    track("segment_selected", { segment: value });
  }
  function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim().slice(0, 100);
    const location = String(data.get("location") ?? "").trim().slice(0, 100);
    const product = String(data.get("product") ?? "").trim().slice(0, 180);
    const quantity = String(data.get("quantity") ?? "").trim().slice(0, 60);
    const message = [`Hola, equipo de ${BRAND_NAME}`, "Quiero una cotizacion mayorista:", "", `Nombre o negocio: ${name}`, `Ubicacion: ${location}`, `Producto: ${product}`, `Cantidad: ${quantity || "Por definir"}`, "", "Por favor, confirmen disponibilidad, precio y entrega. Gracias."].join("\n");
    track("lead_submit", { product });
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  if (!currentBanner) return null;
  return <main className="home-page">
    {previewMode ? <span className="preview-chip">Vista previa</span> : null}
    <div className="commercial-topbar"><div className="shell"><span><b>Lima:</b> delivery coordinado desde S/{ownBrandDelivery} en marcas propias o S/{mixedDelivery} en pedidos mixtos, sujeto a cobertura</span><span><b>Provincias:</b> despacho mediante agencia previa coordinacion</span><span><b>Atencion:</b> cotizaciones por WhatsApp</span></div></div>
    <header className="pro-header"><div className="shell pro-header-main"><Link className="real-brand" href="/" aria-label={`${BRAND_NAME}, inicio`}><BrandLockup /></Link><form className="header-search" action="/catalogo" role="search"><SearchIcon /><input name="buscar" aria-label="Buscar en el catalogo" placeholder="¿Que producto necesitas?" maxLength={100} /><button type="submit">{settings.labels.searchButton}</button></form><div className="pro-header-actions"><Link className="header-quote" href="#cotizar">{settings.labels.headerQuote}</Link><a className="header-whatsapp" href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" aria-label="Cotizar por WhatsApp" onClick={() => track("whatsapp_click", { placement: "header" })}><WhatsAppIcon /><span>{settings.labels.headerWhatsapp}</span></a></div></div><nav className="category-nav" aria-label="Navegacion principal"><div className="shell category-nav-inner"><Link className="all-products" href="/catalogo"><span>☰</span> Catalogo</Link><Link href="/catalogo?filtro=propias">Marcas propias</Link><a href="#preventa">Preventa</a><a href="#entregas">Entregas</a><Link href="/distribuidor">Distribuidores</Link><span className="nav-spacer" /><a href={`tel:+${contact.phone}`}>{contact.phoneLabel}</a></div></nav></header>

    <section className="banner-zone" aria-label="Campañas destacadas" id="ofertas"><div className="shell banner-layout"><article className={`main-banner banner-${currentBanner.theme}${currentBanner.imageUrl ? " has-banner-image" : ""}`} style={currentBanner.imageUrl ? ({ "--banner-image": `url(${currentBanner.imageUrl})`, "--banner-mobile-image": `url(${currentBanner.mobileImageUrl || currentBanner.imageUrl})` } as CSSProperties) : undefined} aria-roledescription="carrusel" aria-label={`${safeSlide + 1} de ${banners.length}`}><div className="banner-content"><span className="banner-kicker">{currentBanner.kicker}</span><h1>{currentBanner.title}</h1><p>{currentBanner.body}</p><div className="banner-actions"><Link href={currentBanner.ctaHref} className="banner-cta" onClick={() => track("banner_click", { banner: currentBanner.kicker })}>{currentBanner.ctaLabel} <span>→</span></Link><a className="banner-secondary" href="/api/catalogo/lista" download onClick={() => track("price_list_download", { placement: "hero" })}>Descargar lista mayorista</a></div></div>{banners.length > 1 ? <><button className="banner-arrow prev" type="button" aria-label="Banner anterior" onClick={() => setSlide((safeSlide - 1 + banners.length) % banners.length)}>‹</button><button className="banner-arrow next" type="button" aria-label="Banner siguiente" onClick={() => setSlide((safeSlide + 1) % banners.length)}>›</button><div className="banner-dots">{banners.map((item, index) => <button key={item.id} type="button" className={index === safeSlide ? "active" : ""} aria-label={`Ver banner ${index + 1}`} aria-pressed={index === safeSlide} onClick={() => setSlide(index)} />)}</div></> : null}</article><div className="side-banners">{([settings.sideBanners.presale, settings.sideBanners.delivery] as const).map((side, index) => <a key={`${index}-${side.title}`} className={`side-banner ${index === 0 ? "presale-banner" : "delivery-banner"}${side.imageUrl ? " has-banner-image" : ""}`} style={side.imageUrl ? ({ "--banner-image": `url(${side.imageUrl})` } as CSSProperties) : undefined} href={side.ctaHref}><div><span>{side.kicker}</span><h2>{side.title}</h2><p>{side.body}</p><b>{side.ctaLabel} →</b></div></a>)}</div></div></section>

    <section className="business-segment" aria-labelledby="business-segment-title"><div className="shell business-segment-inner"><div><span>Catálogo para tu negocio</span><h2 id="business-segment-title">¿Qué tipo de negocio abasteces?</h2><p>La selección cambia los productos recomendados; las categorías sirven para explorar el catálogo completo.</p></div><div className="business-segment-options">{segmentOptions.map((item) => <button key={item.key} type="button" className={segment === item.key ? "active" : ""} onClick={() => chooseSegment(item.key)}><strong>{item.label}</strong><small>{item.note}</small></button>)}</div></div></section>

    <section className="category-stories" aria-labelledby="category-stories-title"><div className="shell"><div className="pro-section-heading category-stories-heading"><div><span>Categorías</span><h2 id="category-stories-title">Explora por necesidad</h2></div></div><div className="category-story-grid">{categoryStories.map((story) => <Link className={`category-story story-${story.theme}`} href={story.href} key={story.title}><img className="category-story-bg" src={story.image} alt="" loading="lazy" /><span className="category-story-shade" /><div className="category-story-copy"><small>{story.kicker}</small><h3>{story.title}</h3><b>Ver productos <i>→</i></b></div><img className="category-story-product" src={story.product} alt="" loading="lazy" /></Link>)}</div></div></section>

    {products.length ? <section className="product-showcase" aria-labelledby="recommended-title"><div className="shell"><div className="pro-section-heading"><div><span>Selección para {segmentOptions.find((item) => item.key === segment)?.label.toLocaleLowerCase("es")}</span><h2 id="recommended-title">Productos recomendados</h2></div><Link href="/catalogo">{settings.labels.catalogButton} <b>→</b></Link></div><div className="home-product-row">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></div></section> : null}

    <section className="presale-section" id="preventa"><div className="shell presale-grid"><div className="presale-visual has-photo" style={{ "--section-image": `url(${siteAssets.sections.presale})` } as CSSProperties} aria-hidden="true" /><div className="presale-copy"><span>Preventa mayorista</span><h2>Planifica compras grandes.</h2><p>Confirmamos producto, volumen y fecha estimada antes de cerrar el pedido.</p><a className="pro-button dark" href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola, quiero conocer las campañas de preventa de ${BRAND_NAME}.`)}`} target="_blank" rel="noreferrer">Consultar preventa <WhatsAppIcon /></a></div></div></section>

    <section className="delivery-section" id="entregas"><div className="shell"><div className="pro-section-heading delivery-heading"><div><span>Entregas</span><h2>Coordina la entrega de tu pedido</h2></div></div><div className="delivery-cards"><article><span>Lima</span><h3>Delivery coordinado</h3><p>Sin costo desde S/{ownBrandDelivery} en marcas propias o S/{mixedDelivery} en pedidos mixtos, sujeto a cobertura.</p></article><article><span>Provincias</span><h3>Entrega en agencia</h3><p>Coordinamos el despacho con la agencia elegida; el flete interprovincial lo paga el cliente.</p></article><article><span>WhatsApp</span><h3>Confirmacion antes de enviar</h3><p>Validamos disponibilidad, cantidades y datos de entrega antes de cerrar cada pedido.</p></article></div></div></section>

    <section className="quote-section" id="cotizar"><div className="shell quote-grid"><div className="quote-copy"><span>Cotización mayorista</span><h2>Cuéntanos qué necesitas.</h2></div><form className="lead-form" onSubmit={submitLead}><label>Nombre o negocio<input name="name" required maxLength={100} placeholder="Tu nombre o negocio" autoComplete="organization" /></label><label>Distrito o provincia<input name="location" required maxLength={100} placeholder="Ej. Comas, Lima" autoComplete="address-level2" /></label><label>Producto<input name="product" required maxLength={180} placeholder="Ej. Paños húmedos por caja" /></label><label>Cantidad <span>(opcional)</span><input name="quantity" maxLength={60} placeholder="Ej. 20 cajas" /></label><button type="submit">{settings.labels.quoteButton} <WhatsAppIcon /></button></form></div></section>

    <footer className="pro-footer"><div className="shell footer-grid"><div className="footer-brand"><BrandLockup /><p>Distribucion mayorista para negocios de Lima y todo el Peru.</p>{settings.tiktokUrl ? <a className="footer-social" href={settings.tiktokUrl} target="_blank" rel="noreferrer"><TikTokIcon />{settings.labels.tiktok}</a> : null}{settings.facebookUrl || FACEBOOK_URL ? <a className="footer-social" href={settings.facebookUrl || FACEBOOK_URL} target="_blank" rel="noreferrer">Facebook</a> : null}</div><div><h3>Compra</h3><Link href="/catalogo">Catalogo</Link><Link href="/catalogo?filtro=propias">Marcas propias</Link><a href="/api/catalogo/lista" download>Lista mayorista</a><a href="#preventa">Preventa</a></div><div><h3>Atencion</h3><a href="#cotizar">Cotizar</a><a href="#entregas">Entregas</a><Link href="/distribuidor">Distribuidores</Link></div><div><h3>Empresa</h3><p>{BRAND_NAME}</p><p>{SITE_DOMAIN}</p><a href={`mailto:${contact.email}`}>{contact.email}</a><Link href="/privacidad">Privacidad</Link></div></div><div className="shell footer-bottom"><span>© 2026 {BRAND_NAME}</span></div></footer>
    <a className="official-floating-wa" href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola, quiero una cotizacion mayorista de ${BRAND_NAME}.`)}`} target="_blank" rel="noreferrer" aria-label="Cotizar por WhatsApp"><WhatsAppIcon /><span>Cotizar</span></a>
  </main>;
}

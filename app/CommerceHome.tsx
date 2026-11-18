"use client";
/* eslint-disable @next/next/no-img-element */
import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import type { Product } from "./catalogo/products";
import type { CommercialRules } from "./lib/commercial-rules";
import type { SiteContent } from "./lib/site-content-db";
import { BRAND_NAME, FACEBOOK_URL, SITE_DOMAIN } from "./lib/brand";
import { displayProductName, displayProductPresentation, productUnitLabel } from "./lib/product-utils";
import { withLeadOrigin } from "./lib/lead-origin";
import { siteAssets } from "./site-content";

type Segment = "bodega" | "minimarket" | "farmacia" | "distribuidor";
const segments: { key: Segment; label: string; short: string }[] = [
  { key: "bodega", label: "Bodegas", short: "Alta rotación" },
  { key: "minimarket", label: "Minimarkets", short: "Surtido completo" },
  { key: "farmacia", label: "Boticas y farmacias", short: "Cuidado e higiene" },
  { key: "distribuidor", label: "Distribuidores", short: "Compra por volumen" },
];
const categories = [
  { name: "Higiene oral", tagline: "Para tu negocio", href: "/catalogo?buscar=crema+dental", image: siteAssets.categoryStories.oralCare, style: "oral" },
  { name: "Cuidado personal", tagline: "Productos esenciales", href: "/catalogo?filtro=higiene", image: siteAssets.categoryStories.pharmacies, style: "personal" },
  { name: "Limpieza y hogar", tagline: "Abastecimiento diario", href: "/catalogo?filtro=limpieza", image: siteAssets.categoryStories.cleaning, style: "clean" },
  { name: "Marcas propias", tagline: "Conoce el portafolio", href: "/catalogo?filtro=propias", image: siteAssets.banners.ownBrands, style: "brands" },
];

function money(value: number) {
  return new Intl.NumberFormat("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
}
function tracking(event: string, data: Record<string, string | number> = {}) {
  if (typeof window !== "undefined") {
    (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag?.("event", event, data);
  }
}
function matchesSegment(product: Product, segment: Segment) {
  const category = product.category.toLocaleLowerCase("es");
  if (segment === "farmacia") return category.includes("higiene") || category.includes("personal") || category.includes("salud");
  if (segment === "distribuidor") return product.ownBrand || Boolean(product.isFeatured);
  if (segment === "bodega") return !category.includes("industrial");
  return true;
}
function productFallback(event: React.SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.onerror = null;
  event.currentTarget.src = "/products/product-placeholder.svg";
}
function FeaturedProduct({ product }: { product: Product }) {
  const name = displayProductName(product.brand, product.name);
  const tier = product.quoteOnly ? null : [...product.tiers].sort((a, b) => a.min - b.min)[0] ?? null;
  const search = new URLSearchParams({ buscar: [product.brand, name].filter(Boolean).join(" ") });
  return (
    <article className="mx-product">
      <div className="mx-product-photo">
        {product.ownBrand ? <span className="mx-product-tag">Marca propia</span> : null}
        <img src={product.image || "/products/product-placeholder.svg"} alt={[product.brand, name].filter(Boolean).join(" ")} onError={productFallback} loading="lazy" />
      </div>
      <div className="mx-product-content">
        <span className="mx-product-brand">{product.brand || "Merly Import"}</span>
        <h3>{name}</h3>
        <p>{displayProductPresentation(product.presentation)}</p>
        {tier
          ? <div className="mx-product-price"><strong>S/ {tier.price.toFixed(2)}</strong><span>por {productUnitLabel(product, 1).replace(/^1\s+/, "")}</span></div>
          : <span className="mx-product-quote">Precio a consultar según volumen</span>}
        <Link href={"/catalogo?" + search.toString()} onClick={() => tracking("product_view", { product: name })}>Ver y cotizar <span aria-hidden="true">↗</span></Link>
      </div>
    </article>
  );
}
export default function CommerceHome({
  content, featuredProducts, whatsappNumber, commercialRules, previewMode = false,
}: {
  content: SiteContent;
  featuredProducts: Product[];
  whatsappNumber: string;
  commercialRules: CommercialRules;
  previewMode?: boolean;
}) {
  const [slide, setSlide] = useState(0);
  const [segment, setSegment] = useState<Segment>("bodega");
  const [menuOpen, setMenuOpen] = useState(false);
  const banners = useMemo(() => content.banners.filter((item) => item.isActive).sort((a, b) => a.sortOrder - b.sortOrder), [content.banners]);
  const current = banners[slide % Math.max(banners.length, 1)] ?? banners[0];
  const shown = useMemo(() => {
    const matched = featuredProducts.filter((item) => matchesSegment(item, segment));
    const others = featuredProducts.filter((item) => !matched.some((found) => found.id === item.id));
    return [...matched, ...others].slice(0, 8);
  }, [featuredProducts, segment]);
  const settings = content.settings;
  const contact = settings.contact;
  const waRoot = "https://wa.me/" + whatsappNumber;
  const waQuote = waRoot + "?text=" + encodeURIComponent(withLeadOrigin("Hola, equipo de Merly Import. Quiero cotizar productos al por mayor."));
  const freeOwn = money(commercialRules.freeDeliveryOwnBrands);
  const freeMixed = money(commercialRules.freeDeliveryMixed);
  function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim().slice(0, 100);
    const location = String(form.get("location") ?? "").trim().slice(0, 100);
    const product = String(form.get("product") ?? "").trim().slice(0, 180);
    const quantity = String(form.get("quantity") ?? "").trim().slice(0, 60);
    const message = [
      "Hola, equipo de " + BRAND_NAME, "Quiero una cotización mayorista:", "",
      "Nombre o negocio: " + name, "Ubicación: " + location, "Producto: " + product,
      "Cantidad: " + (quantity || "Por definir"), "",
      "Por favor, confirmen disponibilidad, precio y condiciones de entrega.",
    ].join("\n");
    tracking("lead_submit", { product, placement: "redesign_form" });
    window.open(waRoot + "?text=" + encodeURIComponent(withLeadOrigin(message)), "_blank", "noopener,noreferrer");
  }
  const linkClose = () => setMenuOpen(false);
  if (!current) return null;
  return (
    <main className="merly-next">
      {previewMode ? <div className="mx-preview-chip">Vista previa de contenido · sin publicar</div> : null}
      <div className="mx-announcement">
        <div className="mx-container">
          <span><i aria-hidden="true" /> Mayoristas de higiene, limpieza y cuidado personal</span>
          <span>Entregas coordinadas a Lima y provincias</span>
          <a href={waQuote} target="_blank" rel="noreferrer" onClick={() => tracking("whatsapp_click", { placement: "announcement" })}>Cotiza por WhatsApp ↗</a>
        </div>
      </div>
      <header className="mx-header">
        <div className="mx-container mx-header-main">
          <Link className="mx-logo" href="/" aria-label="Merly Import, inicio"><img src={siteAssets.logo} alt="Merly Import" /></Link>
          <form className="mx-search" action="/catalogo" role="search">
            <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 5 5" /></svg>
            <input name="buscar" maxLength={100} aria-label="Buscar productos en el catálogo" placeholder="Busca productos, marcas o presentaciones..." />
            <button type="submit" aria-label="Buscar en catálogo">{settings.labels.searchButton}</button>
          </form>
          <a className="mx-header-contact" href={waQuote} target="_blank" rel="noreferrer" onClick={() => tracking("whatsapp_click", { placement: "header" })}>
            <span>¿Necesitas ayuda?</span><strong>Habla con ventas ↗</strong>
          </a>
          <button className="mx-menu-toggle" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)} type="button">☰</button>
        </div>
        <nav className={"mx-nav" + (menuOpen ? " mx-nav-open" : "")} aria-label="Menú principal">
          <div className="mx-container">
            <Link href="/catalogo" onClick={linkClose} className="mx-nav-primary">☷ &nbsp; Todo el catálogo</Link>
            <Link href="/catalogo?filtro=propias" onClick={linkClose}>Marcas propias</Link>
            <a href="#categorias" onClick={linkClose}>Categorías</a>
            <a href="#destacados" onClick={linkClose}>Más pedidos</a>
            <a href="#entregas" onClick={linkClose}>Entregas</a>
            <a href="#preventa" onClick={linkClose}>Preventa</a>
            <a className="mx-nav-mobile-quote" href="#cotizar" onClick={linkClose}>{settings.labels.headerQuote}</a>
          </div>
        </nav>
      </header>
      <section className="mx-hero" aria-label="Portada comercial">
        <div className="mx-container mx-hero-grid">
          <div className="mx-hero-editorial">
            <div className="mx-hero-copy">
              <span className="mx-eyebrow"><i aria-hidden="true" /> IMPORTADORA Y DISTRIBUIDORA MAYORISTA</span>
              <h1>{current.title}</h1>
              <p>{current.body}</p>
              <div className="mx-hero-actions">
                <Link href={current.ctaHref} className="mx-primary-action" onClick={() => tracking("banner_click", { banner: current.kicker })}> {current.ctaLabel} <span aria-hidden="true">↗</span></Link>
                <a href="#cotizar" className="mx-outline-action">Cotizar para mi negocio</a>
              </div>
              <div className="mx-hero-footnote"><b>✓</b> Atención directa <b>✓</b> Precios sujetos a cotización <b>✓</b> Despacho coordinado</div>
            </div>
            <div className="mx-hero-image"><img src={current.imageUrl || siteAssets.banners.ownBrands} alt="Productos del catálogo mayorista de Merly Import" onError={productFallback} /></div>
            {banners.length > 1 ? (
              <div className="mx-hero-slider" aria-label="Cambiar campaña">
                <button aria-label="Campaña anterior" type="button" onClick={() => setSlide((slide + banners.length - 1) % banners.length)}>←</button>
                <span> {slide % banners.length + 1} / {banners.length} </span>
                <button aria-label="Campaña siguiente" type="button" onClick={() => setSlide((slide + 1) % banners.length)}>→</button>
              </div>
            ) : null}
          </div>
          <div className="mx-hero-aside">
            <a href={settings.sideBanners.presale.ctaHref} className="mx-feature-tile mx-tile-one">
              <div><small>{settings.sideBanners.presale.kicker}</small><h2>{settings.sideBanners.presale.title}</h2><span>{settings.sideBanners.presale.ctaLabel} ↗</span></div>
              <img src={settings.sideBanners.presale.imageUrl || siteAssets.banners.presale} alt="" loading="lazy" />
            </a>
            <a href={settings.sideBanners.delivery.ctaHref} className="mx-feature-tile mx-tile-two">
              <div><small>{settings.sideBanners.delivery.kicker}</small><h2>{settings.sideBanners.delivery.title}</h2><span>{settings.sideBanners.delivery.ctaLabel} ↗</span></div>
              <img src={settings.sideBanners.delivery.imageUrl || siteAssets.banners.coordinatedDelivery} alt="" loading="lazy" />
            </a>
          </div>
        </div>
      </section>
      <section className="mx-benefits" aria-label="Cómo comprarnos">
        <div className="mx-container mx-benefits-grid">
          <article><span>01</span><div><strong>Compra mayorista</strong><p>Portafolio para bodegas, boticas y distribuidores.</p></div></article>
          <article><span>02</span><div><strong>Cotiza por WhatsApp</strong><p>Confirma cantidades, precios y disponibilidad.</p></div></article>
          <article><span>03</span><div><strong>Entregas coordinadas</strong><p>Lima y despacho a agencia en provincias.</p></div></article>
        </div>
      </section>
      <section className="mx-categories mx-section" id="categorias">
        <div className="mx-container">
          <div className="mx-section-head"><div><span className="mx-section-label">COMPRA POR CATEGORÍA</span><h2>Todo para abastecer tu negocio.</h2><p>Encuentra productos por familia antes de preparar tu cotización.</p></div><Link href="/catalogo" className="mx-text-action">{settings.labels.catalogButton} ↗</Link></div>
          <div className="mx-category-grid">
            {categories.map((item) => (
              <Link className={"mx-category mx-cat-" + item.style} key={item.name} href={item.href}>
                <img src={item.image} alt="" loading="lazy" />
                <div><small>{item.tagline}</small><h3>{item.name}</h3><span>Explorar ↗</span></div>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-discovery mx-section" id="destacados">
        <div className="mx-container">
          <div className="mx-section-head"><div><span className="mx-section-label">SELECCIÓN MAYORISTA</span><h2>Productos para tu próxima compra.</h2><p>Un surtido que se adapta a tu tipo de negocio.</p></div><Link href="/catalogo" className="mx-text-action">Ver catálogo completo ↗</Link></div>
          <div className="mx-audience" aria-label="Tipo de negocio">{segments.map((item) => (
            <button key={item.key} type="button" className={segment === item.key ? "active" : ""} aria-pressed={segment === item.key} onClick={() => { setSegment(item.key); tracking("segment_selected", { segment: item.key }); }}><strong>{item.label}</strong><small>{item.short}</small></button>
          ))}</div>
          {shown.length ? <div className="mx-product-grid">{shown.map((product) => <FeaturedProduct key={product.id} product={product} />)}</div> : <p className="mx-empty">Explora el catálogo para consultar nuestros productos disponibles.</p>}
          <div className="mx-browse-more"><Link href="/catalogo" className="mx-primary-action">Explorar todos los productos <span>↗</span></Link></div>
        </div>
      </section>
      <section className="mx-promo" id="preventa">
        <div className="mx-container mx-promo-grid">
          <div className="mx-promo-photo"><img src={siteAssets.sections.presale} alt="Campaña de preventa mayorista" loading="lazy" /></div>
          <div><span className="mx-section-label">COMPRA PLANIFICADA</span><h2>¿Compras por volumen? Planifiquemos tu pedido.</h2><p>Consulta campañas de preventa y coordina producto, volumen y fecha estimada antes de cerrar la operación.</p><a href={waRoot + "?text=" + encodeURIComponent(withLeadOrigin("Hola, quiero conocer las campañas de preventa mayorista de Merly Import."))} target="_blank" rel="noreferrer" className="mx-primary-action">Consultar preventa <span>↗</span></a></div>
        </div>
      </section>
      <section className="mx-how mx-section" aria-labelledby="mx-how-title">
        <div className="mx-container">
          <div className="mx-section-head"><div><span className="mx-section-label">COMPRA FÁCIL</span><h2 id="mx-how-title">Tu pedido en tres pasos.</h2><p>Sin crear una cuenta ni pasar por una pasarela de pagos.</p></div></div>
          <div className="mx-steps">
            <article><span>01</span><h3>Encuentra tus productos</h3><p>Busca marcas, presentaciones y categorías en el catálogo.</p></article>
            <article><span>02</span><h3>Arma tu cotización</h3><p>Agrega productos y cantidades a tu selección mayorista.</p></article>
            <article><span>03</span><h3>Confirma por WhatsApp</h3><p>El equipo confirma precios, disponibilidad y entrega antes del cierre.</p></article>
          </div>
        </div>
      </section>
      <section className="mx-delivery mx-section" id="entregas">
        <div className="mx-container mx-delivery-grid">
          <div><span className="mx-section-label">LOGÍSTICA Y ENTREGAS</span><h2>Llevamos tus pedidos más lejos.</h2><p>Coordinamos contigo el destino y la modalidad de entrega antes de cerrar tu compra.</p><a className="mx-text-action" href="#cotizar">Quiero coordinar un pedido ↗</a></div>
          <div className="mx-delivery-cards">
            <article><span>📍 LIMA</span><h3>Delivery coordinado</h3><p>Sin costo desde S/ {freeOwn} en marcas propias o S/ {freeMixed} en pedidos mixtos, sujeto a cobertura.</p></article>
            <article><span>🚚 PROVINCIAS</span><h3>Despacho a agencia</h3><p>Coordinamos la entrega a la agencia elegida. El flete interprovincial lo paga el cliente.</p></article>
          </div>
        </div>
      </section>
      <section className="mx-quote mx-section" id="cotizar">
        <div className="mx-container mx-quote-grid">
          <div><span className="mx-section-label">COTIZACIÓN MAYORISTA</span><h2>Tu próxima compra empieza aquí.</h2><p>Cuéntanos qué necesitas. Preparamos tu solicitud por WhatsApp para que el equipo confirme condiciones.</p>
            <div className="mx-quote-contact"><strong>Atención directa</strong><span>WhatsApp: {contact.phoneLabel}</span></div>
          </div>
          <form onSubmit={submitLead} className="mx-lead-form">
            <h3>Solicita tu cotización</h3>
            <div className="mx-form-row"><label>Nombre o negocio<input name="name" required maxLength={100} autoComplete="organization" placeholder="Nombre o razón comercial" /></label><label>Distrito o provincia<input name="location" required maxLength={100} autoComplete="address-level2" placeholder="Ej. Comas, Lima" /></label></div>
            <label>¿Qué producto necesitas?<input name="product" required maxLength={180} placeholder="Ej. Shampoo por caja" /></label>
            <label>Cantidad aproximada (opcional)<input name="quantity" maxLength={60} placeholder="Ej. 20 cajas" /></label>
            <button type="submit">{settings.labels.quoteButton} <span>↗</span></button>
            <p>El envío abre WhatsApp para que revises tu mensaje antes de enviarlo.</p>
          </form>
        </div>
      </section>
      <footer className="mx-footer">
        <div className="mx-container mx-footer-grid">
          <div className="mx-footer-brand"><img src={siteAssets.logo} alt="Merly Import" /><p>Distribución mayorista de higiene, limpieza y cuidado personal para negocios de Lima y provincias.</p></div>
          <div><strong>Comprar</strong><Link href="/catalogo">Catálogo mayorista</Link><Link href="/catalogo?filtro=propias">Marcas propias</Link><Link href="/distribuidor">Distribuidores</Link></div>
          <div><strong>Información</strong><a href="#entregas">Entregas</a><a href="#preventa">Preventa</a><Link href="/privacidad">Privacidad</Link></div>
          <div><strong>Contáctanos</strong><a href={waQuote} target="_blank" rel="noreferrer">{contact.phoneLabel}</a><a href={"mailto:" + contact.email}>{contact.email}</a><a href={settings.facebookUrl || FACEBOOK_URL} target="_blank" rel="noreferrer">Facebook ↗</a>{settings.tiktokUrl ? <a href={settings.tiktokUrl} target="_blank" rel="noreferrer">TikTok ↗</a> : null}</div>
        </div>
        <div className="mx-container mx-footer-bottom"><span>© 2026 {BRAND_NAME} · {SITE_DOMAIN}</span><span>Los precios y existencias se confirman antes de cerrar cada pedido.</span></div>
      </footer>
      <a className="mx-floating-wa" href={waQuote} target="_blank" rel="noreferrer" aria-label="Cotizar por WhatsApp" onClick={() => tracking("whatsapp_click", { placement: "floating" })}><span aria-hidden="true">✆</span> Cotizar</a>
    </main>
  );
}
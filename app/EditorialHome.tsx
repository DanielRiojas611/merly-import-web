"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useState, type FormEvent, type SyntheticEvent } from "react";
import Link from "next/link";
import type { Product } from "./catalogo/products";
import type { CommercialRules } from "./lib/commercial-rules";
import type { SiteContent } from "./lib/site-content-db";
import { BRAND_NAME, FACEBOOK_URL, SITE_DOMAIN } from "./lib/brand";
import { displayProductName, displayProductPresentation, productUnitLabel } from "./lib/product-utils";
import { withLeadOrigin } from "./lib/lead-origin";
import { siteAssets } from "./site-content";

type Segment = "bodega" | "minimarket" | "farmacia" | "distribuidor";
const SEGMENT_STORAGE = "merly-editorial-segment";
const segments: Array<{ key: Segment; label: string; hint: string }> = [
  { key: "bodega", label: "Bodegas", hint: "Lo esencial de cada día" },
  { key: "minimarket", label: "Minimarkets", hint: "Variedad para tus clientes" },
  { key: "farmacia", label: "Boticas", hint: "Cuidado e higiene" },
  { key: "distribuidor", label: "Distribuidores", hint: "Compra por volumen" },
];
const families = [
  { number: "01", title: "Cuidado personal", subtitle: "Higiene y bienestar diario", href: "/catalogo?filtro=higiene", image: siteAssets.categoryStories.pharmacies, className: "personal" },
  { number: "02", title: "Limpieza y hogar", subtitle: "Soluciones para cada espacio", href: "/catalogo?filtro=limpieza", image: siteAssets.categoryStories.cleaning, className: "clean" },
  { number: "03", title: "Higiene oral", subtitle: "Marcas para tu mostrador", href: "/catalogo?buscar=crema+dental", image: siteAssets.categoryStories.oralCare, className: "oral" },
];
function track(event: string, fields: Record<string, string | number> = {}) {
  if (typeof window !== "undefined") {
    (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag?.("event", event, fields);
  }
}
function money(value: number) {
  return new Intl.NumberFormat("es-PE", { maximumFractionDigits: 2 }).format(value);
}
function imageFallback(event: SyntheticEvent<HTMLImageElement>) {
  event.currentTarget.onerror = null;
  event.currentTarget.src = "/products/product-placeholder.svg";
}
function matchesSegment(product: Product, segment: Segment) {
  const category = product.category.toLocaleLowerCase("es");
  if (segment === "farmacia") return category.includes("higiene") || category.includes("personal") || category.includes("salud");
  if (segment === "distribuidor") return product.ownBrand || Boolean(product.isFeatured);
  if (segment === "bodega") return !category.includes("industrial");
  return true;
}
function ProductTile({ product }: { product: Product }) {
  const name = displayProductName(product.brand, product.name);
  const tiers = product.quoteOnly ? [] : [...product.tiers].sort((a, b) => a.min - b.min);
  const price = tiers[0];
  const search = new URLSearchParams({ buscar: [product.brand, name].filter(Boolean).join(" ") });
  return (
    <article className="ed-product">
      <div className="ed-product-image">
        {product.ownBrand ? <span className="ed-product-label">Marca propia</span> : null}
        <img src={product.image || "/products/product-placeholder.svg"} alt={[product.brand, name].filter(Boolean).join(" ")} onError={imageFallback} loading="lazy" />
      </div>
      <div className="ed-product-body">
        <span className="ed-product-brand">{product.brand || "Merly Import"}</span>
        <h3>{name}</h3>
        <p>{displayProductPresentation(product.presentation)}</p>
        <div className="ed-product-bottom">
          {price
            ? <div className="ed-product-price"><strong>S/ {price.price.toFixed(2)}</strong><small>por {productUnitLabel(product, 1).replace(/^1\s+/, "")}</small></div>
            : <div className="ed-product-price"><strong>Por cotizar</strong><small>Precio según volumen</small></div>}
          <Link href={"/catalogo?" + search.toString()} aria-label={"Cotizar " + name} onClick={() => track("product_view", { product: name })}>↗</Link>
        </div>
      </div>
    </article>
  );
}

export default function EditorialHome({
  content, featuredProducts, whatsappNumber, commercialRules, previewMode = false,
}: {
  content: SiteContent;
  featuredProducts: Product[];
  whatsappNumber: string;
  commercialRules: CommercialRules;
  previewMode?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [segment, setSegment] = useState<Segment>("bodega");
  const [campaignIndex, setCampaignIndex] = useState(0);
  const campaigns = useMemo(
    () => content.banners.filter((banner) => banner.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [content.banners]
  );
  const campaign = campaigns[campaignIndex % Math.max(campaigns.length, 1)] ?? campaigns[0];
  const products = useMemo(() => {
    const direct = featuredProducts.filter((product) => matchesSegment(product, segment));
    const others = featuredProducts.filter((product) => !direct.some((match) => match.id === product.id));
    return [...direct, ...others].slice(0, 8);
  }, [featuredProducts, segment]);
  const settings = content.settings;
  const contact = settings.contact;
  const waRoot = "https://wa.me/" + whatsappNumber;
  const waQuote = waRoot + "?text=" + encodeURIComponent(withLeadOrigin("Hola, Merly Import. Quiero cotizar productos al por mayor."));
  const ownDelivery = money(commercialRules.freeDeliveryOwnBrands);
  const mixedDelivery = money(commercialRules.freeDeliveryMixed);

  useEffect(() => {
    const stored = window.localStorage.getItem(SEGMENT_STORAGE);
    if (segments.some((item) => item.key === stored)) setSegment(stored as Segment);
  }, []);

  function chooseSegment(next: Segment) {
    setSegment(next);
    window.localStorage.setItem(SEGMENT_STORAGE, next);
    track("segment_selected", { segment: next });
  }
  function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim().slice(0, 100);
    const location = String(data.get("location") ?? "").trim().slice(0, 100);
    const product = String(data.get("product") ?? "").trim().slice(0, 180);
    const quantity = String(data.get("quantity") ?? "").trim().slice(0, 60);
    const message = [
      "Hola, equipo de " + BRAND_NAME, "Quiero una cotización mayorista:", "",
      "Nombre o negocio: " + name,
      "Ubicación: " + location,
      "Producto: " + product,
      "Cantidad: " + (quantity || "Por definir"), "",
      "Por favor, confirmen disponibilidad, precio y condiciones de entrega.",
    ].join("\n");
    track("lead_submit", { product, placement: "editorial_form" });
    window.open(waRoot + "?text=" + encodeURIComponent(withLeadOrigin(message)), "_blank", "noopener,noreferrer");
  }
  if (!campaign) return null;
  return (
    <main className="merly-editorial">
      {previewMode ? <div className="ed-preview-notice">Vista previa del editor · contenido sin publicar</div> : null}
      <div className="ed-announcement">
        <div className="ed-container"><span>M E R L Y &nbsp; I M P O R T</span><span>Distribución mayorista para negocios que crecen.</span><a href={waQuote} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click", { placement: "announcement" })}>Consulta por WhatsApp ↗</a></div>
      </div>
      <header className="ed-header">
        <div className="ed-container ed-header-main">
          <Link href="/" className="ed-brand" aria-label="Merly Import — inicio">
            <img src={siteAssets.logo} alt="Merly Import" />
          </Link>
          <nav className={"ed-main-nav" + (menuOpen ? " ed-open" : "")} aria-label="Navegación principal">
            <Link href="/catalogo" onClick={() => setMenuOpen(false)}>Productos</Link>
            <a href="#colecciones" onClick={() => setMenuOpen(false)}>Colecciones</a>
            <a href="#destacados" onClick={() => setMenuOpen(false)}>Destacados</a>
            <a href="#entregas" onClick={() => setMenuOpen(false)}>Entregas</a>
            <a href="#cotizar" onClick={() => setMenuOpen(false)}>Cotizar</a>
          </nav>
          <a className="ed-header-cta" href={waQuote} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click", { placement: "header" })}>Hablar con ventas <span aria-hidden="true">↗</span></a>
          <button className="ed-menu-button" type="button" aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? "✕" : "☰"}</button>
        </div>
      </header>

      <section className="ed-hero" aria-labelledby="ed-hero-title">
        <div className="ed-container ed-hero-grid">
          <div className="ed-hero-content">
            <div className="ed-hero-topline"><span className="ed-sunburst">✳</span> PARA NEGOCIOS, GRANDES IDEAS.</div>
            <h1 id="ed-hero-title">Que nunca falte <em>lo esencial.</em></h1>
            <p>Productos de higiene, limpieza y cuidado personal para abastecer tu negocio. Compra al por mayor y coordina cada pedido directamente.</p>
            <div className="ed-hero-actions">
              <Link className="ed-action ed-action-dark" href="/catalogo">Explorar productos <span>↗</span></Link>
              <a className="ed-action ed-action-outline" href="#cotizar">Cotizar mi pedido</a>
            </div>
            <div className="ed-hero-assurance"><span>✳ Precios por volumen</span><span>✳ Lima y provincias</span><span>✳ Atención directa</span></div>
          </div>
          <div className="ed-hero-art" aria-label="Fotografías de categorías del catálogo">
            <div className="ed-photo-large"><img src={siteAssets.categoryStories.cleaning} alt="Productos de limpieza y hogar" /></div>
            <div className="ed-photo-small"><img src={siteAssets.categoryStories.pharmacies} alt="Productos de cuidado personal" /></div>
            <span className="ed-photo-sticker">Tu negocio<br />siempre en<br /><strong>movimiento.</strong></span>
            <span className="ed-photo-caption">HIGIENE · LIMPIEZA · CUIDADO PERSONAL</span>
          </div>
        </div>
        <div className="ed-hero-side-word" aria-hidden="true">MAYORISTA</div>
      </section>

      <section className="ed-ticker" aria-label="Nuestro enfoque">
        <div className="ed-ticker-inner"><span>PRODUCTOS PARA CRECER</span><b>✳</b><span>COMPRA MAYORISTA</span><b>✳</b><span>ATENCIÓN PERSONALIZADA</span><b>✳</b><span>ENTREGAS COORDINADAS</span></div>
      </section>

      <section className="ed-intro ed-section" aria-labelledby="ed-intro-title">
        <div className="ed-container ed-intro-grid">
          <div className="ed-intro-label"><span>01 / NUESTRA PROPUESTA</span><i aria-hidden="true">↘</i></div>
          <div><h2 id="ed-intro-title">Un buen negocio empieza con un <em>buen surtido.</em></h2></div>
          <div className="ed-intro-aside"><p>Descubre presentaciones, prepara tu selección y recibe una cotización comercial sin crear cuentas ni realizar pagos en la web.</p><Link href="/catalogo">Conocer el catálogo <span>↗</span></Link></div>
        </div>
      </section>

      <section className="ed-collections ed-section" id="colecciones" aria-labelledby="ed-collections-title">
        <div className="ed-container">
          <div className="ed-section-heading"><div><span className="ed-overline">COLECCIONES / POR NECESIDAD</span><h2 id="ed-collections-title">Explora lo que <em>más se mueve.</em></h2></div><Link href="/catalogo">Ver todas las categorías ↗</Link></div>
          <div className="ed-collections-grid">
            {families.map((item, index) => (
              <Link className={"ed-collection ed-collection-" + item.className} href={item.href} key={item.number}>
                <img src={item.image} alt="" loading="lazy" />
                <div className="ed-collection-copy">
                  <span>{item.number} — {item.subtitle}</span>
                  <h3>{item.title}</h3>
                  <b>Explorar colección <span>↗</span></b>
                </div>
                <span className="ed-collection-index">0{index + 1}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="ed-campaign ed-section" aria-label="Campañas destacadas">
        <div className="ed-container ed-campaign-grid">
          <div className="ed-campaign-left">
            <span className="ed-overline">EN PORTADA / {campaign.kicker.toUpperCase()}</span>
            <h2>{campaign.title}</h2>
            <p>{campaign.body}</p>
            <Link href={campaign.ctaHref} className="ed-action ed-action-dark" onClick={() => track("banner_click", { banner: campaign.kicker })}>{campaign.ctaLabel} <span>↗</span></Link>
            <div className="ed-campaign-controls">
              <span>CAMPAÑA {String(campaignIndex % campaigns.length + 1).padStart(2, "0")} / {String(campaigns.length).padStart(2, "0")}</span>
              {campaigns.length > 1 ? <div><button type="button" aria-label="Campaña anterior" onClick={() => setCampaignIndex((i) => (i + campaigns.length - 1) % campaigns.length)}>←</button><button type="button" aria-label="Campaña siguiente" onClick={() => setCampaignIndex((i) => (i + 1) % campaigns.length)}>→</button></div> : null}
            </div>
          </div>
          <div className="ed-campaign-image"><img src={campaign.imageUrl || siteAssets.banners.ownBrands} onError={imageFallback} alt={"Campaña destacada: " + campaign.title} /></div>
          <div className="ed-campaign-caption"><span>PORTAFOLIO</span><strong>MERLY<br />IMPORT</strong></div>
        </div>
      </section>

      <section className="ed-featured ed-section" id="destacados" aria-labelledby="ed-featured-title">
        <div className="ed-container">
          <div className="ed-section-heading"><div><span className="ed-overline">PRODUCTOS / SELECCIÓN COMERCIAL</span><h2 id="ed-featured-title">Para tu próxima <em>reposición.</em></h2></div><Link href="/catalogo">Ir al catálogo completo ↗</Link></div>
          <div className="ed-segment-tabs" role="group" aria-label="Tu tipo de negocio">{segments.map((item) => <button type="button" key={item.key} className={segment === item.key ? "active" : ""} aria-pressed={segment === item.key} onClick={() => chooseSegment(item.key)}><strong>{item.label}</strong><small>{item.hint}</small></button>)}</div>
          {products.length ? <div className="ed-products-grid">{products.map((product) => <ProductTile key={product.id} product={product} />)}</div> : <p className="ed-no-results">Consulta nuestro catálogo para conocer las opciones disponibles.</p>}
          <div className="ed-featured-footer"><span>Consulta precios finales y disponibilidad al solicitar tu cotización.</span><Link href="/catalogo" className="ed-action ed-action-dark">Ver todos los productos <span>↗</span></Link></div>
        </div>
      </section>

      <section className="ed-story ed-section" id="preventa" aria-labelledby="ed-story-title">
        <div className="ed-container ed-story-grid">
          <div className="ed-story-photo"><img src={settings.sideBanners.presale.imageUrl || siteAssets.sections.presale} alt="Campañas de preventa mayorista" loading="lazy" /></div>
          <div className="ed-story-copy"><span className="ed-overline">{settings.sideBanners.presale.kicker.toUpperCase()}</span><h2 id="ed-story-title">Piensa en grande.<br /><em>Compra con tiempo.</em></h2><p>{settings.sideBanners.presale.body}</p><a href={waRoot + "?text=" + encodeURIComponent(withLeadOrigin("Hola, quiero conocer las campañas de preventa mayorista de Merly Import."))} target="_blank" rel="noreferrer" className="ed-action ed-action-light" onClick={() => track("whatsapp_click", { placement: "presale" })}>Consultar preventa <span>↗</span></a></div>
        </div>
      </section>

      <section className="ed-how ed-section" aria-labelledby="ed-how-title">
        <div className="ed-container ed-how-grid">
          <div className="ed-how-heading"><span className="ed-overline">ASÍ FUNCIONA</span><h2 id="ed-how-title">Comprar al por mayor, <em>sin vueltas.</em></h2><p>Tres pasos para preparar tu pedido.</p></div>
          <div className="ed-how-steps">
            <article><span>01</span><div><h3>Descubre</h3><p>Busca productos por categoría, marca o presentación.</p></div></article>
            <article><span>02</span><div><h3>Selecciona</h3><p>Agrega los productos y las cantidades que necesitas.</p></div></article>
            <article><span>03</span><div><h3>Cotiza</h3><p>Confirma precios, disponibilidad y entrega con el equipo por WhatsApp.</p></div></article>
          </div>
        </div>
      </section>

      <section className="ed-logistics ed-section" id="entregas" aria-labelledby="ed-logistics-title">
        <div className="ed-container">
          <div className="ed-section-heading"><div><span className="ed-overline">ENTREGAS / A TU RITMO</span><h2 id="ed-logistics-title">Tú vendes. <em>Nos coordinamos.</em></h2></div><a href="#cotizar">Consultar entregas ↗</a></div>
          <div className="ed-logistics-grid">
            <article className="ed-logistic-main"><span>LIMA</span><h3>Delivery coordinado.</h3><p>Sin costo desde S/ {ownDelivery} en marcas propias o S/ {mixedDelivery} en pedidos mixtos, sujeto a cobertura.</p><b>COORDINA TU DISTRITO ↗</b></article>
            <article className="ed-logistic-secondary"><span>PROVINCIAS</span><h3>Tu agencia, tu destino.</h3><p>Coordinamos el despacho a la agencia elegida. El flete interprovincial lo asume el cliente.</p><img src={settings.sideBanners.delivery.imageUrl || siteAssets.banners.coordinatedDelivery} alt="Logística de pedidos" loading="lazy" /></article>
          </div>
        </div>
      </section>

      <section className="ed-contact ed-section" id="cotizar" aria-labelledby="ed-contact-title">
        <div className="ed-container ed-contact-grid">
          <div className="ed-contact-copy"><span className="ed-overline">HABLEMOS DE TU NEGOCIO</span><h2 id="ed-contact-title">¿Qué necesitas <em>reponer hoy?</em></h2><p>Dinos qué producto buscas y te ayudamos a preparar tu solicitud de cotización. El mensaje se revisa en WhatsApp antes de enviarlo.</p><a href={waQuote} target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click", { placement: "contact" })}>O escríbenos directamente ↗</a><span className="ed-contact-number">{contact.phoneLabel}</span></div>
          <form className="ed-form" onSubmit={submitLead}>
            <div className="ed-form-top"><span>FORMULARIO DE COTIZACIÓN</span><i>✳</i></div>
            <div className="ed-form-row"><label>Nombre o negocio<input name="name" required maxLength={100} autoComplete="organization" placeholder="Nombre o razón comercial" /></label><label>Distrito o provincia<input name="location" required maxLength={100} autoComplete="address-level2" placeholder="Ej. Comas, Lima" /></label></div>
            <label>Producto que necesitas<input name="product" required maxLength={180} placeholder="Ej. Shampoo por caja" /></label>
            <label>Cantidad aproximada <small>(opcional)</small><input name="quantity" maxLength={60} placeholder="Ej. 20 cajas" /></label>
            <button type="submit">{settings.labels.quoteButton} <span>↗</span></button>
            <p>No se realiza ningún pago desde este formulario.</p>
          </form>
        </div>
      </section>
      <footer className="ed-footer">
        <div className="ed-container ed-footer-head"><div><img src={siteAssets.logo} alt="Merly Import" /><p>Tu aliado para abastecer negocios en Lima y provincias.</p></div><h2>Hagamos que tu<br /><em>negocio crezca.</em></h2></div>
        <div className="ed-container ed-footer-columns">
          <div><span>EXPLORAR</span><Link href="/catalogo">Catálogo mayorista</Link><Link href="/catalogo?filtro=propias">Marcas propias</Link><Link href="/distribuidor">Distribuidores</Link></div>
          <div><span>INFORMACIÓN</span><a href="#entregas">Entregas</a><a href="#preventa">Preventa</a><Link href="/privacidad">Privacidad</Link></div>
          <div><span>CONVERSEMOS</span><a href={waQuote} target="_blank" rel="noreferrer">WhatsApp: {contact.phoneLabel}</a><a href={"mailto:" + contact.email}>{contact.email}</a><a href={settings.facebookUrl || FACEBOOK_URL} target="_blank" rel="noreferrer">Facebook ↗</a>{settings.tiktokUrl ? <a href={settings.tiktokUrl} target="_blank" rel="noreferrer">{settings.labels.tiktok} ↗</a> : null}</div>
        </div>
        <div className="ed-container ed-footer-bottom"><span>© 2026 {BRAND_NAME} · {SITE_DOMAIN}</span><span>Precios y existencias sujetos a confirmación comercial.</span></div>
      </footer>
      <a href={waQuote} className="ed-whatsapp-float" target="_blank" rel="noreferrer" onClick={() => track("whatsapp_click", { placement: "floating" })} aria-label="Cotizar por WhatsApp"><span aria-hidden="true">✳</span> Cotizar</a>
    </main>
  );
}
"use client";

import { withLeadOrigin } from "../lib/lead-origin";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BRAND_NAME } from "../lib/brand";
import type { CommercialRules } from "../lib/commercial-rules";
import { displayProductName, normalizeQuantity, productQuoteName } from "../lib/product-utils";
import type { CatalogFilter } from "../lib/neon-catalog";
import type { Product, ProductSalesUnit } from "./products";

type Delivery = "lima" | "provincia";
type CartQuantities = Record<string, number>;
type QuantityDrafts = Record<string, string>;

const CART_KEY = "merly-catalog-cart-v2";
const QUOTE_HISTORY_KEY = "merlyQuoteOpen";
const unitNames: Record<ProductSalesUnit, [string, string]> = {
  caja: ["caja", "cajas"], unidad: ["unidad", "unidades"], docena: ["docena", "docenas"],
  exhibidor: ["exhibidor", "exhibidores"], paquete: ["paquete", "paquetes"], blister: ["blíster", "blísteres"],
  kilogramo: ["kilogramo", "kilogramos"], otro: ["unidad", "unidades"],
};

function digits(value: string) { return value.replace(/\D/g, ""); }
function filterParam(value: string) { return value === "Marcas propias" ? "propias" : value.toLocaleLowerCase("es"); }
function unitPrice(product: Product, quantity: number) {
  if (product.quoteOnly || !product.tiers.length) return null;
  const tier = [...product.tiers].sort((a, b) => b.min - a.min).find((item) => quantity >= item.min);
  return tier?.price ?? product.tiers[0]?.price ?? null;
}
function unitLabel(product: Product, quantity = 1) {
  const unit = product.salesUnit && unitNames[product.salesUnit] ? product.salesUnit : "otro";
  return quantity === 1 ? unitNames[unit][0] : unitNames[unit][1];
}
function quantityLabel(product: Product, quantity: number) { return `${quantity} ${unitLabel(product, quantity)}`; }
function parseStoredCart(value: string | null): CartQuantities {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const quantities: CartQuantities = {};
    for (const [id, quantity] of Object.entries(parsed as Record<string, unknown>)) {
      if (!/^[a-zA-Z0-9._-]{1,120}$/.test(id)) continue;
      const normalized = normalizeQuantity(quantity);
      if (normalized) quantities[id] = normalized;
    }
    return quantities;
  } catch { return {}; }
}
function productImageFallback(event: React.SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (!image.src.endsWith("/products/product-placeholder.svg")) image.src = "/products/product-placeholder.svg";
}

export default function CatalogClient({ initialProducts, initialTotal, catalogTotal, initialQuery, initialFilter, initialCategories, whatsappNumber, commercialRules }: {
  initialProducts: Product[];
  initialTotal: number;
  catalogTotal: number;
  initialQuery: string;
  initialFilter: CatalogFilter;
  initialCategories: string[];
  whatsappNumber: string;
  commercialRules: CommercialRules;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [total, setTotal] = useState(initialTotal);
  const [query, setQuery] = useState(initialQuery);
  const [sortMode, setSortMode] = useState<"default" | "name-asc" | "name-desc">("default");
  const [filter, setFilter] = useState<CatalogFilter>(initialFilter);
  const [categories, setCategories] = useState(initialCategories);
  const [quantities, setQuantities] = useState<CartQuantities>({});
  const [cartProducts, setCartProducts] = useState<Record<string, Product>>({});
  const [quantityDrafts, setQuantityDrafts] = useState<QuantityDrafts>({});
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [loadMoreError, setLoadMoreError] = useState("");
  const [notice, setNotice] = useState("");
  const [delivery, setDelivery] = useState<Delivery>("lima");
  const [quoteOpen, setQuoteOpen] = useState(false);
  const searchSequence = useRef(0);
  const loadSequence = useRef(0);
  const quotePanel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const quoteTrigger = useRef<HTMLElement | null>(null);
  const browseArea = useRef<HTMLDivElement>(null);

  const filters = useMemo(() => ["Todos", "Marcas propias", ...categories.filter((category) => !["Todos", "Marcas propias"].includes(category))], [categories]);
  const visibleProducts = useMemo(() => {
    if (sortMode === "default") return products;
    return [...products].sort((a, b) => {
      const left = `${a.brand} ${displayProductName(a.brand, a.name)}`;
      const right = `${b.brand} ${displayProductName(b.brand, b.name)}`;
      const order = left.localeCompare(right, "es", { sensitivity: "base" });
      return sortMode === "name-asc" ? order : -order;
    });
  }, [products, sortMode]);
  const catalogCountText = query.trim() || filter !== "Todos"
    ? `${total} resultado${total === 1 ? "" : "s"} en esta selección · ${catalogTotal} productos en el catálogo.`
    : `${catalogTotal} productos en el catálogo.`;

  useEffect(() => {
    let cancelled = false;
    async function hydrateCart() {
      const stored = parseStoredCart(window.localStorage.getItem(CART_KEY));
      const ids = Object.keys(stored);
      if (!ids.length) { if (!cancelled) setHydrated(true); return; }
      try {
        const response = await fetch(`/api/catalogo?ids=${encodeURIComponent(ids.join(","))}`, { cache: "no-store" });
        const body = await response.json() as { products?: Product[] };
        const current = response.ok && Array.isArray(body.products) ? body.products : [];
        const byId = Object.fromEntries(current.map((product) => [product.id, product]));
        const validQuantities = Object.fromEntries(Object.entries(stored).filter(([id]) => Boolean(byId[id])));
        const removed = ids.length - Object.keys(validQuantities).length;
        if (!cancelled) {
          setQuantities(validQuantities);
          setCartProducts(byId);
          if (removed) setNotice(`${removed} producto${removed === 1 ? " dejó" : "s dejaron"} de estar disponible y se retiró de la cotización.`);
        }
      } catch {
        if (!cancelled) setNotice("No se pudo recuperar la cotización guardada. Agrega los productos nuevamente.");
      } finally { if (!cancelled) setHydrated(true); }
    }
    void hydrateCart();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => { if (hydrated) window.localStorage.setItem(CART_KEY, JSON.stringify(quantities)); }, [hydrated, quantities]);

  useEffect(() => {
    const closeFromHistory = (event: PopStateEvent) => {
      if (!(event.state && event.state[QUOTE_HISTORY_KEY])) setQuoteOpen(false);
    };
    window.addEventListener("popstate", closeFromHistory);
    return () => window.removeEventListener("popstate", closeFromHistory);
  }, []);

  useEffect(() => {
    const sequence = ++searchSequence.current;
    loadSequence.current += 1;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setSearchError("");
      try {
        const params = new URLSearchParams({ q: query.trim(), filter, limit: "24", offset: "0" });
        const response = await fetch(`/api/catalogo?${params}`, { signal: controller.signal });
        const body = await response.json() as { products?: Product[]; total?: number; categories?: string[] };
        if (!response.ok || !Array.isArray(body.products)) throw new Error("CATALOG_FAILED");
        if (sequence !== searchSequence.current) return;
        setProducts(body.products);
        setTotal(Number(body.total) || body.products.length);
        if (Array.isArray(body.categories) && body.categories.length) setCategories(body.categories);
        setLoadMoreError("");
        const browserParams = new URLSearchParams();
        if (query.trim()) browserParams.set("buscar", query.trim());
        if (filter !== "Todos") browserParams.set("filtro", filterParam(filter));
        window.history.replaceState(window.history.state, "", `/catalogo${browserParams.size ? `?${browserParams}` : ""}`);
      } catch {
        if (!controller.signal.aborted && sequence === searchSequence.current) setSearchError("No se pudo actualizar el catálogo. Reintenta la búsqueda.");
      } finally { if (sequence === searchSequence.current) setLoading(false); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [filter, query]);

  useEffect(() => {
    if (!quoteOpen) return;
    const panel = quotePanel.current;
    const browse = browseArea.current;
    browse?.setAttribute("inert", "");
    closeButton.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeQuote(); return; }
      if (event.key !== "Tab" || !panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [href]')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { browse?.removeAttribute("inert"); document.removeEventListener("keydown", handleKey); quoteTrigger.current?.focus(); };
  }, [quoteOpen]);

  const selected = useMemo(() => Object.entries(quantities).flatMap(([id, quantity]) => cartProducts[id] ? [{ product: cartProducts[id], quantity }] : []), [cartProducts, quantities]);
  const totalPrice = selected.reduce((sum, item) => { const price = unitPrice(item.product, item.quantity); return price === null ? sum : sum + price * item.quantity; }, 0);
  const hasPendingPrices = selected.some((item) => unitPrice(item.product, item.quantity) === null);
  const onlyOwnBrands = Boolean(selected.length) && selected.every((item) => item.product.ownBrand);
  const deliveryGoal = onlyOwnBrands ? commercialRules.freeDeliveryOwnBrands : commercialRules.freeDeliveryMixed;
  const remaining = Math.max(0, deliveryGoal - totalPrice);
  const hasMore = products.length < total;
  const mobileTotal = hasPendingPrices ? "Enviar" : `S/ ${totalPrice.toFixed(2)}`;

  function addProduct(product: Product) {
    setCartProducts((current) => ({ ...current, [product.id]: product }));
    setQuantities((current) => ({ ...current, [product.id]: Math.max(1, current[product.id] ?? 0) }));
    setNotice(`${displayProductName(product.brand, product.name)} agregado a la cotización.`);
  }
  function setQuantity(product: Product, value: number) {
    const quantity = Math.min(999, Math.max(1, normalizeQuantity(value) || 1));
    setCartProducts((current) => ({ ...current, [product.id]: product }));
    setQuantities((current) => ({ ...current, [product.id]: quantity }));
    setQuantityDrafts((current) => { const next = { ...current }; delete next[product.id]; return next; });
  }
  function removeProduct(id: string) {
    setQuantities((current) => { const next = { ...current }; delete next[id]; return next; });
    setCartProducts((current) => { const next = { ...current }; delete next[id]; return next; });
    setQuantityDrafts((current) => { const next = { ...current }; delete next[id]; return next; });
  }
  function editQuantity(id: string, value: string) { if (value === "" || /^\d{1,3}$/.test(value)) setQuantityDrafts((current) => ({ ...current, [id]: value })); }
  function commitQuantity(product: Product) {
    const draft = quantityDrafts[product.id];
    if (draft === undefined) return;
    setQuantity(product, draft === "" ? quantities[product.id] ?? 1 : Number(draft));
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return;
    const sequence = ++loadSequence.current;
    const signature = `${query.trim()}|${filter}|${products.length}`;
    setLoadingMore(true);
    setLoadMoreError("");
    try {
      const params = new URLSearchParams({ q: query.trim(), filter, limit: "24", offset: String(products.length) });
      const response = await fetch(`/api/catalogo?${params}`);
      const body = await response.json() as { products: Product[]; total?: number; categories?: string[] };
      if (!response.ok || !Array.isArray(body.products)) throw new Error("LOAD_MORE_FAILED");
      if (sequence !== loadSequence.current || signature !== `${query.trim()}|${filter}|${products.length}`) return;
      setProducts((current) => [...current, ...body.products.filter((product) => !current.some((existing) => existing.id === product.id))]);
      setTotal(Number(body.total) || total);
      if (Array.isArray(body.categories) && body.categories.length) setCategories(body.categories);
    } catch { if (sequence === loadSequence.current) setLoadMoreError("No se pudieron cargar más productos."); }
    finally { if (sequence === loadSequence.current) setLoadingMore(false); }
  }

  function openQuote(trigger: HTMLElement) {
    quoteTrigger.current = trigger;
    window.history.pushState({ ...(window.history.state ?? {}), [QUOTE_HISTORY_KEY]: true }, "");
    setQuoteOpen(true);
  }
  function closeQuote() {
    if (window.history.state?.[QUOTE_HISTORY_KEY]) window.history.back();
    else setQuoteOpen(false);
  }
  function sendQuote() {
    if (!selected.length) return;
    (window as typeof window & { gtag?: (...args: unknown[]) => void }).gtag?.("event", "quote_whatsapp", { item_count: selected.length, delivery });
    const phone = digits(whatsappNumber);
    const cartEmoji = String.fromCodePoint(0x1f6d2);
    const locationEmoji = String.fromCodePoint(0x1f4cd);
    const moneyEmoji = String.fromCodePoint(0x1f4b0);
    const greeting = `Hola, equipo de ${BRAND_NAME}`;
    const lines = selected.map(({ product, quantity }) => `- ${quantityLabel(product, quantity)} de ${productQuoteName(product)}`);
    const deliveryText = delivery === "lima" ? "Entrega en Lima" : "Envio a provincia";
    const priceText = hasPendingPrices ? `${moneyEmoji} *Me confirman precios y disponibilidad, por favor.*` : `${moneyEmoji} *Total referencial:* S/ ${totalPrice.toFixed(2)}`;
    const message = [greeting, "", `${cartEmoji} *Quiero cotizar:*`, "", ...lines, "", `${locationEmoji} *Entrega:* ${deliveryText}`, priceText, "", "Gracias."].join("\n");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(withLeadOrigin(message))}`, "_blank", "noopener,noreferrer");
  }

  return <main className="catalog-page merly-catalog-next">
    <div className="mc-topline"><div className="mc-width"><span>MERLY IMPORT · CATÁLOGO MAYORISTA</span><span>Precios y disponibilidad sujetos a confirmación comercial</span></div></div>
    <div className="mc-header"><div className="mc-width mc-header-inner">
      <Link href="/" className="mc-logo"><img src="/brand/merly-import-logo.png" alt="Merly Import" /></Link>
      <nav aria-label="Navegación del catálogo"><Link href="/">Inicio</Link><span aria-hidden="true">/</span><strong>Catálogo mayorista</strong></nav>
      <Link href="/" className="mc-back">← Volver a la tienda</Link>
    </div></div>
    <section className="mc-cover" aria-labelledby="mc-cover-title"><div className="mc-width mc-cover-inner">
      <div className="mc-cover-copy"><span className="mc-kicker">PORTAFOLIO MAYORISTA</span>
      <h1 id="mc-cover-title">Todo lo que tu negocio necesita, en un solo lugar.</h1>
      <p>Explora productos de higiene, limpieza y cuidado personal. Arma tu selección y solicita una cotización sin registrarte.</p>
      <a href="#catalog-browse" className="mc-cover-action">Explorar productos <span aria-hidden="true">↓</span></a></div>
      <div className="mc-cover-image"><img src="/banners/portafolio-marcas-propias-v2.webp" alt="Portafolio de productos de Merly Import" /></div>
    </div></section>
    <div className="mc-trust-row"><div className="mc-width"><span>✓ Cotización sin registro</span><span>✓ Atención comercial por WhatsApp</span><span>✓ Entrega coordinada</span></div></div>
    {notice ? <div className="catalog-notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Cerrar aviso">×</button></div> : null}
    <div className="catalog-shell"><div id="catalog-browse" ref={browseArea} className="catalog-browse">
      <header className="catalog-heading mc-catalog-heading"><div><p>ENCUENTRA TU PRODUCTO</p><h2>Explora nuestro portafolio</h2><span>{catalogCountText}</span></div><div className="mc-catalog-hint"><strong>Compra mayorista</strong><small>Selecciona cantidades y cotiza fácilmente.</small></div></header>
      <section className="catalog-tools" aria-label="Buscar y filtrar"><label className="mc-search-label"><span>Buscar en catálogo</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="¿Qué producto necesitas? Busca por nombre o marca" /></label><div className="mc-filter-area"><span>Filtrar por categoría</span><div role="group" aria-label="Categorías">{filters.map((item) => <button type="button" key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div></div><div className="catalog-sort"><label>Ordenar productos mostrados<select value={sortMode} onChange={(event) => setSortMode(event.target.value as "default" | "name-asc" | "name-desc")}><option value="default">Recomendados</option><option value="name-asc">Nombre A–Z</option><option value="name-desc">Nombre Z–A</option></select></label></div></section>
      {searchError ? <div className="catalog-error" role="alert"><span>{searchError}</span><button type="button" onClick={() => { setSearchError(""); setQuery((current) => `${current} `); window.setTimeout(() => setQuery((current) => current.trimEnd()), 0); }}>Reintentar</button></div> : null}
      {loading ? <p className="catalog-loading" role="status">Actualizando catálogo…</p> : null}
      {!loading && !products.length ? <div className="catalog-empty"><h2>Sin resultados</h2><p>Prueba otra palabra o categoría.</p><button type="button" onClick={() => { setQuery(""); setFilter("Todos"); }}>Limpiar filtros</button></div> : null}
      <div className="mc-results-head"><div><strong>Productos disponibles para cotizar</strong><span>{visibleProducts.length} mostrados de {total} resultados</span></div><span className="mc-results-hint">Selecciona un producto para añadirlo a tu cotización</span></div>
      <section className="product-grid" aria-busy={loading}>{visibleProducts.map((product) => {
        const quantity = quantities[product.id] ?? 0;
        const name = displayProductName(product.brand, product.name);
        return <article className="product-card" key={product.id}><div className="product-image"><img src={product.image} alt={productQuoteName(product)} loading="lazy" width="420" height="420" onError={productImageFallback} /></div>{product.ownBrand ? <span className="mc-own-brand">MARCA PROPIA</span> : null}<div className="product-info">{product.brand ? <p className="product-brand">{product.brand}</p> : null}<h2>{name}</h2><small className="product-presentation">{product.presentation}</small><small className="refresh-price-note">{product.quoteOnly || !product.tiers.length ? "Precio a confirmar según volumen" : "Precio referencial sujeto a confirmación"}</small>{quantity ? <div className="product-added"><button type="button" onClick={() => setQuantity(product, quantity - 1)} aria-label={`Reducir ${product.name}`}>−</button><input type="text" inputMode="numeric" aria-label={`Cantidad de ${product.name}`} value={quantityDrafts[product.id] ?? String(quantity)} onChange={(event) => editQuantity(product.id, event.target.value)} onBlur={() => commitQuantity(product)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitQuantity(product); event.currentTarget.blur(); } }} /><button type="button" onClick={() => setQuantity(product, quantity + 1)} aria-label={`Aumentar ${product.name}`}>+</button><button type="button" className="quote-remove" onClick={() => removeProduct(product.id)}>Quitar</button></div> : <button className="add-product" type="button" onClick={() => addProduct(product)}>Añadir a mi cotización</button>}</div></article>;
      })}</section>
      {hasMore ? <div className="catalog-more"><button type="button" disabled={loadingMore} onClick={loadMore}>{loadingMore ? "Cargando…" : "Mostrar más"}</button>{loadMoreError ? <p role="alert">{loadMoreError} <button type="button" onClick={loadMore}>Reintentar</button></p> : null}</div> : null}
    </div>
    <aside ref={quotePanel} id="quote-panel" role={quoteOpen ? "dialog" : "complementary"} aria-modal={quoteOpen ? true : undefined} className={`quote-panel${quoteOpen ? " mobile-open" : ""}`} aria-label="Resumen de cotización">
      <button ref={closeButton} className="mobile-quote-close" type="button" onClick={closeQuote} aria-label="Cerrar cotización">×</button>
      <div className="quote-panel-title"><div><small>TU PEDIDO MAYORISTA</small><h2>Resumen de cotización</h2></div><span>{selected.length}</span></div><p className="mc-quote-explainer">Agrega productos y continúa por WhatsApp. Tu pedido todavía no se ha confirmado.</p>
      {!selected.length ? <div className="empty-cart"><p>Agrega productos para cotizar.</p></div> : <><div className="quote-items">{selected.map(({ product, quantity }) => {
        const price = unitPrice(product, quantity);
        const name = displayProductName(product.brand, product.name);
        return <div key={product.id} className="quote-item"><p>{product.brand ? <strong>{product.brand}</strong> : null}<span>{name}</span></p><div className="quote-item-row"><small>{quantityLabel(product, quantity)}</small>{price === null ? null : <b>S/ {(quantity * price).toFixed(2)}</b>}</div><div className="quote-item-actions"><button type="button" onClick={() => setQuantity(product, quantity - 1)} aria-label={`Reducir ${name}`}>−</button><input aria-label={`Cantidad de ${name}`} type="text" inputMode="numeric" value={quantityDrafts[product.id] ?? String(quantity)} onChange={(event) => editQuantity(product.id, event.target.value)} onBlur={() => commitQuantity(product)} /><button type="button" onClick={() => setQuantity(product, quantity + 1)} aria-label={`Aumentar ${name}`}>+</button><button type="button" className="quote-remove" onClick={() => removeProduct(product.id)}>Quitar</button></div></div>;
      })}</div>
      <label className="delivery-select"><span>Entrega</span><select value={delivery} onChange={(event) => setDelivery(event.target.value as Delivery)}><option value="lima">Lima</option><option value="provincia">Provincia</option></select></label>
      {delivery === "lima" && !hasPendingPrices ? <div className={remaining === 0 ? "delivery-progress achieved" : "delivery-progress"}><div><span>{remaining === 0 ? "Delivery gratuito alcanzado" : `Faltan S/ ${remaining.toFixed(2)} para delivery gratuito`}</span><b>Meta S/ {deliveryGoal.toFixed(2)}</b></div><i><span style={{ width: `${Math.min(100, (totalPrice / deliveryGoal) * 100)}%` }} /></i></div> : null}
      {delivery === "provincia" ? <p className="province-note">Entregamos el pedido en la agencia elegida. El flete interprovincial lo paga el cliente.</p> : null}
      {hasPendingPrices ? <p className="quote-price-note">Los precios finales y la disponibilidad se confirman por WhatsApp antes de cerrar el pedido.</p> : null}
      <div className="quote-total"><span>{hasPendingPrices ? "Cotizacion" : "Total referencial"}</span><strong>{hasPendingPrices ? "Por confirmar" : `S/ ${totalPrice.toFixed(2)}`}</strong></div><p className="quote-recipient-note">Revisarás tu solicitud en WhatsApp antes de enviarla al equipo de Merly Import.</p><button className="send-quote" type="button" onClick={sendQuote}>Revisar solicitud en WhatsApp ↗</button></>}
    </aside></div>
    <button className={`mobile-quote-overlay${quoteOpen ? " visible" : ""}`} type="button" aria-label="Cerrar cotización" onClick={closeQuote} />
    {selected.length ? <button className="mobile-quote-bar" type="button" onClick={(event) => openQuote(event.currentTarget)}><span><b>{selected.length}</b><small>{selected.length === 1 ? "producto" : "productos"}</small></span><strong>Ver cotización</strong><em>{mobileTotal}</em></button> : null}
  </main>;
}

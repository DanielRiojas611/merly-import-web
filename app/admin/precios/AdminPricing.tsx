"use client";

import { useMemo, useState } from "react";
import type { ProductDraft } from "../../lib/admin-drafts";
import type { AdminProductInput, ProductPriceTier } from "../../lib/admin-products";

type ProductRow = {
  id: string;
  published: AdminProductInput | null;
  draft: ProductDraft | null;
  effective: AdminProductInput;
};

function normalizedText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es").replace(/\s+/g, " ").trim();
}

function normalizeTiers(value: ProductPriceTier[] | undefined) {
  return [...(value ?? [])]
    .map((tier) => ({ min: Math.trunc(Number(tier.min) || 0), price: Math.round((Number(tier.price) || 0) * 100) / 100 }))
    .sort((a, b) => a.min - b.min);
}

function unitLabel(product: AdminProductInput) {
  const labels: Record<string, string> = {
    caja: "caja", unidad: "unidad", docena: "docena", exhibidor: "exhibidor",
    paquete: "paquete", blister: "blíster", kilogramo: "kilogramo", otro: "unidad comercial",
  };
  return labels[product.salesUnit ?? "otro"] ?? "unidad comercial";
}

function validatePricing(quoteOnly: boolean, tiers: ProductPriceTier[]) {
  if (quoteOnly) return "";
  if (!tiers.length) return "Agrega al menos una escala antes de mostrar el precio públicamente.";
  const quantities = new Set<number>();
  for (const tier of tiers) {
    if (!Number.isInteger(tier.min) || tier.min <= 0) return "Cada cantidad mínima debe ser un número entero mayor que cero.";
    if (!Number.isFinite(tier.price) || tier.price <= 0) return "Cada precio debe ser mayor que cero.";
    if (quantities.has(tier.min)) return "No puede haber dos escalas con la misma cantidad mínima.";
    quantities.add(tier.min);
  }
  const ordered = [...tiers].sort((a, b) => a.min - b.min);
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index].price > ordered[index - 1].price) return "El precio no puede aumentar cuando el cliente compra más volumen.";
  }
  return "";
}

export default function AdminPricing({ initialProducts, initialDrafts }: { initialProducts: AdminProductInput[]; initialDrafts: ProductDraft[] }) {
  const [products, setProducts] = useState(initialProducts);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [selectedId, setSelectedId] = useState(initialProducts[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [quoteOnly, setQuoteOnly] = useState(initialProducts[0]?.quoteOnly ?? true);
  const [tiers, setTiers] = useState<ProductPriceTier[]>(normalizeTiers(initialProducts[0]?.tiers));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const publishedById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const draftById = useMemo(() => new Map(drafts.map((draft) => [draft.id, draft])), [drafts]);
  const rows = useMemo<ProductRow[]>(() => {
    const result: ProductRow[] = products.map((published) => {
      const draft = draftById.get(published.id) ?? null;
      return { id: published.id, published, draft, effective: draft?.payload ?? published };
    });
    for (const draft of drafts) {
      if (!publishedById.has(draft.id)) result.push({ id: draft.id, published: null, draft, effective: draft.payload });
    }
    return result.sort((a, b) => a.effective.brand.localeCompare(b.effective.brand, "es") || a.effective.name.localeCompare(b.effective.name, "es"));
  }, [draftById, drafts, products, publishedById]);
  const visibleRows = useMemo(() => {
    const term = normalizedText(query);
    if (!term) return rows;
    return rows.filter((row) => normalizedText(`${row.id} ${row.effective.brand} ${row.effective.name} ${row.effective.presentation}`).includes(term));
  }, [query, rows]);
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null;
  const orderedTiers = normalizeTiers(tiers);
  const error = selectedRow ? validatePricing(quoteOnly, orderedTiers) : "Selecciona un producto.";

  function openProduct(row: ProductRow) {
    setSelectedId(row.id);
    setQuoteOnly(row.effective.quoteOnly);
    setTiers(normalizeTiers(row.effective.tiers));
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function addTier() {
    const last = orderedTiers.at(-1);
    setTiers([...orderedTiers, { min: last ? last.min + 1 : 1, price: last?.price ?? 0 }]);
  }

  function updateTier(index: number, field: keyof ProductPriceTier, value: number) {
    setTiers((current) => current.map((tier, position) => position === index ? { ...tier, [field]: value } : tier));
  }

  function removeTier(index: number) {
    setTiers((current) => current.filter((_, position) => position !== index));
  }

  async function refresh() {
    const [productResponse, draftResponse] = await Promise.all([
      fetch("/api/admin/products", { cache: "no-store" }),
      fetch("/api/admin/drafts", { cache: "no-store" }),
    ]);
    if (!productResponse.ok || !draftResponse.ok) throw new Error("REFRESH_FAILED");
    const productBody = await productResponse.json() as { products: AdminProductInput[] };
    const draftBody = await draftResponse.json() as { drafts: ProductDraft[] };
    setProducts(productBody.products);
    setDrafts(draftBody.drafts);
  }

  async function saveDraft() {
    if (!selectedRow || error) return setMessage(error);
    setBusy(true);
    setMessage("Guardando precios como borrador...");
    try {
      const payload: AdminProductInput = { ...selectedRow.effective, quoteOnly, tiers: orderedTiers };
      const response = await fetch("/api/admin/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: [payload], source: "pricing" }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "SAVE_FAILED");
      await refresh();
      setMessage("Precios guardados como borrador. La web pública todavía no cambió.");
    } catch {
      setMessage("No se pudo guardar el borrador de precios. Revisa las cantidades y los importes.");
    } finally {
      setBusy(false);
    }
  }

  async function publishDraft() {
    if (!selectedRow?.draft) return setMessage("Primero guarda los precios como borrador.");
    if (!window.confirm("Se publicará el borrador completo de este producto, incluidos otros cambios pendientes. ¿Continuar?")) return;
    setBusy(true);
    setMessage("Publicando precios...");
    try {
      const response = await fetch("/api/admin/drafts/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [selectedRow.id] }),
      });
      if (!response.ok) throw new Error("PUBLISH_FAILED");
      await refresh();
      setMessage(quoteOnly ? "Producto publicado sin precio visible." : "Precios publicados correctamente.");
    } catch {
      setMessage("No se pudieron publicar los precios. El borrador se conserva.");
    } finally {
      setBusy(false);
    }
  }

  const baseTier = orderedTiers[0];
  const bestTier = orderedTiers.at(-1);

  return <section className="pricing-admin">
    {message ? <div className="pricing-message" role="status">{message}</div> : null}
    <div className="pricing-layout">
      <aside className="pricing-products">
        <div className="pricing-products-head"><div><span>Productos</span><strong>{rows.length}</strong></div><input type="search" placeholder="Buscar por producto o código" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <div className="pricing-product-list">{visibleRows.map((row) => <button key={row.id} type="button" className={row.id === selectedId ? "active" : ""} onClick={() => openProduct(row)}><span>{row.effective.brand || "Sin marca"}</span><strong>{row.effective.name}</strong><small>{row.effective.presentation}</small><em>{row.draft ? "Borrador pendiente" : row.effective.quoteOnly ? "Solo cotización" : `${normalizeTiers(row.effective.tiers).length} escalas publicadas`}</em></button>)}</div>
      </aside>

      <div className="pricing-editor">
        {selectedRow ? <>
          <header><div><span>Configuración comercial</span><h2>{selectedRow.effective.brand ? `${selectedRow.effective.brand} ` : ""}{selectedRow.effective.name}</h2><p>SKU: {selectedRow.id.toUpperCase()} · Precio por {unitLabel(selectedRow.effective)}</p></div>{selectedRow.draft ? <b>Borrador pendiente</b> : null}</header>

          <div className="pricing-mode">
            <label><input type="radio" name="price-mode" checked={quoteOnly} onChange={() => setQuoteOnly(true)} /><span><strong>Precio por cotización</strong><small>No muestra importes al cliente.</small></span></label>
            <label><input type="radio" name="price-mode" checked={!quoteOnly} onChange={() => setQuoteOnly(false)} /><span><strong>Mostrar precios mayoristas</strong><small>Activa los importes únicamente después de publicar.</small></span></label>
          </div>

          <section className={`pricing-tiers${quoteOnly ? " disabled" : ""}`}>
            <div className="pricing-tiers-head"><div><h3>Escalas por volumen</h3><p>La primera cantidad funciona como pedido mínimo. El precio debe mantenerse o disminuir al aumentar el volumen.</p></div><button type="button" onClick={addTier} disabled={quoteOnly}>+ Agregar escala</button></div>
            <div className="pricing-tier-labels"><span>Cantidad mínima</span><span>Precio por {unitLabel(selectedRow.effective)}</span><span></span></div>
            {orderedTiers.map((tier, index) => <div className="pricing-tier-row" key={`${tier.min}-${index}`}><label><span className="sr-only">Cantidad mínima</span><input type="number" min="1" step="1" value={tier.min || ""} disabled={quoteOnly} onChange={(event) => updateTier(index, "min", Number(event.target.value))} /><small>{unitLabel(selectedRow.effective)}{tier.min === 1 ? "" : "s"}</small></label><label><span>S/</span><input type="number" min="0.01" step="0.01" value={tier.price || ""} disabled={quoteOnly} onChange={(event) => updateTier(index, "price", Number(event.target.value))} /></label><button type="button" aria-label={`Eliminar escala ${index + 1}`} disabled={quoteOnly} onClick={() => removeTier(index)}>Eliminar</button></div>)}
            {!orderedTiers.length ? <div className="pricing-empty">Aún no hay escalas. Agrega la primera para definir el pedido mínimo y el precio base.</div> : null}
          </section>

          <section className="pricing-preview">
            <span>Vista previa comercial</span>
            <div><strong>{selectedRow.effective.brand}</strong><h3>{selectedRow.effective.name}</h3><p>{selectedRow.effective.presentation}</p>{quoteOnly || !baseTier ? <b>Precio por cotización</b> : <><b>S/ {baseTier.price.toFixed(2)} por {unitLabel(selectedRow.effective)}</b>{bestTier && bestTier.min > baseTier.min ? <small>Desde S/ {bestTier.price.toFixed(2)} comprando {bestTier.min} {unitLabel(selectedRow.effective)}s</small> : null}<em>Pedido mínimo: {baseTier.min} {unitLabel(selectedRow.effective)}{baseTier.min === 1 ? "" : "s"}</em></>}</div>
          </section>

          {error && !quoteOnly ? <p className="pricing-error" role="alert">{error}</p> : null}
          <div className="pricing-actions"><button type="button" onClick={saveDraft} disabled={busy || Boolean(error)}>{busy ? "Procesando..." : "Guardar borrador"}</button><button type="button" className="publish" onClick={publishDraft} disabled={busy || !selectedRow.draft}>Publicar borrador</button></div>
          <p className="pricing-safety">Guardar no modifica la web pública. Solo “Publicar borrador” aplica el cambio al cliente.</p>
        </> : <div className="pricing-no-selection">Selecciona un producto para configurar sus precios.</div>}
      </div>
    </div>
  </section>;
}

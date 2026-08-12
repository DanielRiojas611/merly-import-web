"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import type { ProductDraft } from "../lib/admin-drafts";
import type { AdminProductInput, ProductAuditEntry, ProductImageStatus, ProductSalesUnit } from "../lib/admin-products";

type Category = AdminProductInput["category"];
type Tab = "products" | "import";
type ProductRow = { id: string; published: AdminProductInput | null; draft: ProductDraft | null; effective: AdminProductInput };
type ImportRow = { row: number; product: AdminProductInput; errors: string[]; duplicate: boolean };

const defaultCategories: Category[] = ["Higiene", "Limpieza", "Hogar"];
const salesUnits: ProductSalesUnit[] = ["caja", "unidad", "docena", "exhibidor", "paquete", "blister", "kilogramo", "otro"];
const imageStatuses: ProductImageStatus[] = ["pending", "recovered", "approved"];
const placeholder = "/products/product-placeholder.svg";
const emptyProduct: AdminProductInput = { id: "", brand: "", name: "", description: "", presentation: "", category: "Higiene", ownBrand: false, imageUrl: "", imageStatus: "pending", salesUnit: "otro", quoteOnly: true, badge: null, isActive: true, isFeatured: false, sortOrder: 0, internalReview: null };

function cloneProduct(product: AdminProductInput) { return JSON.parse(JSON.stringify(product)) as AdminProductInput; }
function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120); }
function normalizedText(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim(); }
function cleanCategory(value: string): Category { return value.replace(/\s+/g, " ").trim().slice(0, 60); }
function semanticKey(product: Pick<AdminProductInput, "brand" | "name" | "presentation">) { return [product.brand, product.name, product.presentation].map(normalizedText).join("|"); }
function parseBoolean(value: string, fallback = false) { const normalized = normalizedText(value); if (!normalized) return fallback; return ["si", "sí", "true", "1", "x", "yes", "activo", "publicado"].includes(normalized); }
function normalizeCategory(value: string): Category | null { const cleaned = cleanCategory(value); if (!cleaned) return null; return cleaned.charAt(0).toLocaleUpperCase("es") + cleaned.slice(1); }
function validImageReference(value: string) { const image = value.trim(); return !image || image.startsWith("/") || image.startsWith("https://") || /^data:image\/(?:jpeg|png|webp);base64,/i.test(image); }
function inferredImageStatus(value: string): ProductImageStatus { const image = value.trim(); if (!image || image === placeholder) return "pending"; if (image.startsWith("/products/recovered/") || image.startsWith("data:image/")) return "recovered"; return "approved"; }
function parseCsv(text: string, delimiter: string) {
  const records: string[][] = []; let record: string[] = []; let field = ""; let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') { if (quoted && text[index + 1] === '"') { field += '"'; index += 1; } else quoted = !quoted; }
    else if (character === delimiter && !quoted) { record.push(field.trim()); field = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) { if (character === "\r" && text[index + 1] === "\n") index += 1; record.push(field.trim()); field = ""; if (record.some(Boolean)) records.push(record); record = []; }
    else field += character;
  }
  record.push(field.trim()); if (record.some(Boolean)) records.push(record); return records;
}
function headerKey(value: string) { return slugify(value).replace(/-/g, ""); }
function cell(record: Record<string, string>, aliases: string[]) { for (const alias of aliases) if (record[alias] !== undefined) return record[alias]; return ""; }
async function prepareImage(file: File) {
  if (!/image\/(jpeg|png|webp)/i.test(file.type)) throw new Error("INVALID_TYPE");
  if (file.size > 4_000_000) throw new Error("TOO_LARGE");
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => { const element = new Image(); element.onload = () => resolve(element); element.onerror = reject; element.src = source; });
    if (image.naturalWidth < 300 || image.naturalHeight < 300) throw new Error("LOW_RESOLUTION");
    const ratio = image.naturalWidth / image.naturalHeight; if (ratio < 0.35 || ratio > 3) throw new Error("INVALID_RATIO");
    const scale = Math.min(1, 1200 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d"); if (!context) throw new Error("CANVAS_UNAVAILABLE");
    context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/webp", 0.86);
  } finally { URL.revokeObjectURL(source); }
}

export default function AdminCatalog({ initialProducts, initialDrafts }: { initialProducts: AdminProductInput[]; initialDrafts: ProductDraft[] }) {
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState(initialProducts);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [editor, setEditor] = useState(cloneProduct(emptyProduct));
  const [savedEditor, setSavedEditor] = useState(JSON.stringify(emptyProduct));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDrafts, setSelectedDrafts] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [history, setHistory] = useState<ProductAuditEntry[]>([]);
  const dirty = JSON.stringify(editor) !== savedEditor;

  useEffect(() => { const guard = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); }; window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard); }, [dirty]);

  const publishedById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const draftById = useMemo(() => new Map(drafts.map((draft) => [draft.id, draft])), [drafts]);
  const rows = useMemo<ProductRow[]>(() => {
    const result: ProductRow[] = products.map((published) => { const draft = draftById.get(published.id) ?? null; return { id: published.id, published, draft, effective: draft?.payload ?? published }; });
    for (const draft of drafts) if (!publishedById.has(draft.id)) result.push({ id: draft.id, published: null, draft, effective: draft.payload });
    return result.sort((a, b) => a.effective.sortOrder - b.effective.sortOrder || a.effective.name.localeCompare(b.effective.name, "es"));
  }, [draftById, drafts, products, publishedById]);
  const availableCategories = useMemo(() => [...new Set([...defaultCategories, ...rows.map((row) => cleanCategory(row.effective.category)).filter(Boolean)])].sort((a, b) => a.localeCompare(b, "es")), [rows]);
  const visibleRows = useMemo(() => { const term = normalizedText(query); if (!term) return rows; return rows.filter((row) => normalizedText(`${row.id} ${row.effective.brand} ${row.effective.name} ${row.effective.presentation}`).includes(term)); }, [query, rows]);
  const validImportRows = importRows.filter((row) => !row.errors.length && !row.duplicate);
  const editingPublished = Boolean(selectedId && publishedById.has(selectedId));

  async function refresh() {
    const [productResponse, draftResponse] = await Promise.all([fetch("/api/admin/products", { cache: "no-store" }), fetch("/api/admin/drafts", { cache: "no-store" })]);
    if (!productResponse.ok || !draftResponse.ok) throw new Error("REFRESH_FAILED");
    const productBody = await productResponse.json() as { products: AdminProductInput[] }; const draftBody = await draftResponse.json() as { drafts: ProductDraft[] };
    setProducts(productBody.products); setDrafts(draftBody.drafts);
  }
  function openEditor(row?: ProductRow) { const next = cloneProduct(row?.effective ?? emptyProduct); setEditor(next); setSavedEditor(JSON.stringify(next)); setSelectedId(row?.id ?? null); setHistory([]); setTab("products"); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function validateEditor() {
    if (!editor.id.trim() || !editor.name.trim() || !editor.presentation.trim()) return "Completa código, producto y presentación.";
    if (!cleanCategory(editor.category)) return "Escribe una categoría válida.";
    if (editingPublished && editor.id !== selectedId) return "El ID de un producto publicado no puede modificarse.";
    if (!validImageReference(editor.imageUrl)) return "La imagen debe ser una ruta local o una URL HTTPS.";
    return "";
  }
  async function saveDraft(event: React.FormEvent) {
    event.preventDefault(); const error = validateEditor(); if (error) return setMessage(error);
    const normalized: AdminProductInput = { ...editor, id: slugify(editor.id), brand: editor.brand.trim(), name: editor.name.trim(), description: editor.description.trim(), presentation: editor.presentation.trim(), category: cleanCategory(editor.category), imageUrl: editor.imageUrl.trim(), imageStatus: editor.imageStatus ?? inferredImageStatus(editor.imageUrl), salesUnit: editor.salesUnit ?? "otro", badge: editor.badge?.trim() || null, internalReview: editor.internalReview?.trim() || null, sortOrder: Math.trunc(Number(editor.sortOrder) || 0) };
    setBusy(true); setMessage("Guardando borrador...");
    try {
      const response = await fetch("/api/admin/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ products: [normalized], source: "manual" }) });
      const body = await response.json() as { error?: string }; if (!response.ok) throw new Error(body.error || "SAVE_FAILED");
      await refresh(); setEditor(normalized); setSavedEditor(JSON.stringify(normalized)); setSelectedId(normalized.id); setSelectedDrafts((current) => current.includes(normalized.id) ? current : [...current, normalized.id]); setMessage("Borrador guardado. Publícalo cuando termine la revisión.");
    } catch { setMessage("No se pudo guardar el borrador. Revisa los datos y la imagen."); } finally { setBusy(false); }
  }
  async function chooseImage(file?: File) {
    if (!file) return; setBusy(true);
    try { const imageUrl = await prepareImage(file); setEditor((current) => ({ ...current, imageUrl, imageStatus: "recovered" })); setMessage("Imagen preparada. Guarda el borrador para subirla."); }
    catch (error) { const code = error instanceof Error ? error.message : ""; setMessage(code === "TOO_LARGE" ? "La imagen supera 4 MB." : code === "LOW_RESOLUTION" ? "La imagen debe tener al menos 300 × 300 px." : code === "INVALID_RATIO" ? "La proporción de la imagen no es adecuada para una tarjeta de producto." : "Usa una imagen JPG, PNG o WEBP válida."); }
    finally { setBusy(false); }
  }
  async function discardDraft(id: string) { if (!window.confirm("¿Descartar este cambio pendiente?")) return; const response = await fetch(`/api/admin/drafts/${encodeURIComponent(id)}`, { method: "DELETE" }); if (!response.ok) return setMessage("No se pudo descartar el borrador."); setSelectedDrafts((current) => current.filter((value) => value !== id)); await refresh(); const published = publishedById.get(id); if (published) openEditor({ id, published, draft: null, effective: published }); else openEditor(); setMessage("Cambio pendiente descartado."); }
  async function publishSelected() { const ids = selectedDrafts.filter((id) => draftById.has(id)); if (!ids.length) return setMessage("Selecciona al menos un borrador."); if (!window.confirm(`Se publicarán ${ids.length} cambios. ¿Continuar?`)) return; setBusy(true); try { const response = await fetch("/api/admin/drafts/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) }); if (!response.ok) throw new Error("PUBLISH_FAILED"); setSelectedDrafts([]); await refresh(); setMessage("Cambios publicados correctamente."); } catch { setMessage("No se pudo publicar. Los borradores se conservaron."); } finally { setBusy(false); } }
  async function toggleActive(row: ProductRow) { if (!row.published) return; const next = !row.published.isActive; if (!window.confirm(`${next ? "Reactivar" : "Ocultar"} ${row.published.name}?`)) return; const response = await fetch(`/api/admin/products/${encodeURIComponent(row.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: next }) }); if (!response.ok) return setMessage("No se pudo cambiar la visibilidad."); await refresh(); setMessage(next ? "Producto reactivado." : "Producto ocultado del catálogo."); }
  async function loadHistory(id: string) { const response = await fetch(`/api/admin/products/${encodeURIComponent(id)}/history`, { cache: "no-store" }); if (!response.ok) return setMessage("No se pudo cargar el historial."); const body = await response.json() as { history: ProductAuditEntry[] }; setHistory(body.history); }
  async function restoreHistory(entry: ProductAuditEntry) { if (!window.confirm("¿Restaurar esta versión publicada?")) return; const response = await fetch(`/api/admin/products/${encodeURIComponent(entry.productId)}/history/${entry.id}/restore`, { method: "POST", headers: { "Content-Type": "application/json" } }); if (!response.ok) return setMessage("No se pudo restaurar la versión."); await refresh(); await loadHistory(entry.productId); setMessage("Versión restaurada correctamente."); }
  async function readCsv(file?: File) {
    if (!file) return; const text = (await file.text()).replace(/^\uFEFF/, ""); const semicolon = parseCsv(text, ";"); const comma = parseCsv(text, ","); const records = (semicolon[0]?.length ?? 0) >= (comma[0]?.length ?? 0) ? semicolon : comma; if (records.length < 2) return setMessage("El CSV no contiene filas de productos.");
    const headers = records[0].map(headerKey); const known = new Map(rows.map((row) => [semanticKey(row.effective), row.id])); const seen = new Map<string, string>();
    const parsed = records.slice(1).map((values, index): ImportRow => {
      const record = Object.fromEntries(headers.map((header, position) => [header, values[position] ?? ""])); const brand = cell(record, ["marca"]).trim(); const name = cell(record, ["producto", "nombre"]).trim(); const presentation = cell(record, ["presentacion", "contenido", "formato"]).trim(); const id = slugify(cell(record, ["codigo", "id", "sku"]) || `${brand}-${name}`); const category = normalizeCategory(cell(record, ["categoria", "rubro"])); const imageUrl = cell(record, ["imagen", "imageurl", "foto", "fotografia"]).trim(); const status = cell(record, ["estadoimagen", "imagestatus"]).trim() as ProductImageStatus; const unit = cell(record, ["unidadventa", "salesunit"]).trim() as ProductSalesUnit;
      const product: AdminProductInput = { id, brand, name, description: cell(record, ["descripcion", "detalle"]).trim(), presentation, category: category ?? "Higiene", ownBrand: parseBoolean(cell(record, ["marcapropia", "propio"])), imageUrl, imageStatus: imageStatuses.includes(status) ? status : inferredImageStatus(imageUrl), salesUnit: salesUnits.includes(unit) ? unit : "otro", quoteOnly: parseBoolean(cell(record, ["cotizacion", "quoteonly"]), true), badge: cell(record, ["insignia", "badge"]).trim() || null, isActive: parseBoolean(cell(record, ["activo", "publicado"]), true), isFeatured: parseBoolean(cell(record, ["destacado"])), sortOrder: Math.trunc(Number(cell(record, ["orden", "sortorder"])) || 0), internalReview: cell(record, ["observacioninterna", "revisioninterna", "notainterna"]).trim() || null };
      const errors: string[] = []; if (!id) errors.push("Código vacío"); if (!name) errors.push("Producto vacío"); if (!presentation) errors.push("Presentación vacía"); if (!category) errors.push("Categoría inválida"); if (!validImageReference(imageUrl)) errors.push("Imagen inválida"); const key = semanticKey(product); const existingId = known.get(key); const duplicate = Boolean((existingId && existingId !== id) || (seen.has(key) && seen.get(key) !== id)); seen.set(key, id); return { row: index + 2, product, errors, duplicate };
    });
    setImportRows(parsed); setMessage(`${parsed.length} filas leídas; ${parsed.filter((row) => !row.errors.length && !row.duplicate).length} válidas.`);
  }
  async function saveImport() { if (!validImportRows.length) return setMessage("No hay filas válidas para guardar."); setBusy(true); try { const response = await fetch("/api/admin/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ products: validImportRows.map((row) => row.product), source: "csv", batchId: `csv-${Date.now()}` }) }); if (!response.ok) throw new Error("IMPORT_FAILED"); await refresh(); setSelectedDrafts(validImportRows.map((row) => row.product.id)); setTab("products"); setMessage("Carga guardada como borradores. Revísala antes de publicar."); } catch { setMessage("No se pudo guardar la carga."); } finally { setBusy(false); } }
  function downloadTemplate() { const headers = "codigo;marca;producto;presentacion;categoria;descripcion;marca_propia;imagen;estado_imagen;unidad_venta;cotizacion;insignia;activo;destacado;orden;observacion_interna"; const example = "ejemplo-001;TOÑITO;Producto de ejemplo;Caja x 12;Hogar;Descripción;Sí;/products/product-placeholder.svg;pending;caja;Sí;Marca propia;Sí;No;10;Revisar fotografía"; const url = URL.createObjectURL(new Blob([`${headers}\n${example}`], { type: "text/csv;charset=utf-8" })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "plantilla-productos-merly-import.csv"; anchor.click(); URL.revokeObjectURL(url); }

  return <section className="catalog-admin">
    <div className="catalog-admin-tabs" role="tablist" aria-label="Administrar catálogo"><button type="button" className={tab === "products" ? "active" : ""} onClick={() => setTab("products")}>Productos</button><button type="button" className={tab === "import" ? "active" : ""} onClick={() => setTab("import")}>Carga masiva</button><button type="button" onClick={() => openEditor()}>+ Nuevo producto</button></div>
    {message ? <div className="catalog-admin-message" role="status">{message}</div> : null}
    {tab === "products" ? <>
      <div className="catalog-admin-grid">
        <form className="catalog-admin-form" onSubmit={saveDraft}>
          <div className="catalog-admin-form-title"><div><span>{editingPublished ? "Producto publicado" : "Borrador nuevo"}</span><h2>{editor.name || "Editar producto"}</h2></div>{dirty ? <b>Cambios sin guardar</b> : null}</div>
          <label>Código<input required value={editor.id} readOnly={editingPublished} onChange={(event) => setEditor({ ...editor, id: slugify(event.target.value) })} /></label>
          <label>Marca<input value={editor.brand} onChange={(event) => setEditor({ ...editor, brand: event.target.value })} /></label>
          <label>Producto<input required value={editor.name} onChange={(event) => setEditor({ ...editor, name: event.target.value })} /></label>
          <label>Presentación<input required value={editor.presentation} onChange={(event) => setEditor({ ...editor, presentation: event.target.value })} /></label>
          <label>Categoría<input required list="catalog-categories" maxLength={60} value={editor.category} onChange={(event) => setEditor({ ...editor, category: event.target.value })} /><datalist id="catalog-categories">{availableCategories.map((category) => <option key={category} value={category} />)}</datalist><small>Escribe una nueva categoría para crear otro grupo en el catálogo.</small></label>
          <label>Unidad de venta<select value={editor.salesUnit ?? "otro"} onChange={(event) => setEditor({ ...editor, salesUnit: event.target.value as ProductSalesUnit })}>{salesUnits.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
          <label>Estado de imagen<select value={editor.imageStatus ?? inferredImageStatus(editor.imageUrl)} onChange={(event) => setEditor({ ...editor, imageStatus: event.target.value as ProductImageStatus })}><option value="pending">Pendiente</option><option value="recovered">Recuperada</option><option value="approved">Aprobada</option></select></label>
          <label>Orden<input type="number" value={editor.sortOrder} onChange={(event) => setEditor({ ...editor, sortOrder: Number(event.target.value) || 0 })} /></label>
          <label className="wide">Descripción<textarea value={editor.description} onChange={(event) => setEditor({ ...editor, description: event.target.value })} /></label>
          <label className="wide">Imagen<input value={editor.imageUrl} onChange={(event) => setEditor({ ...editor, imageUrl: event.target.value, imageStatus: inferredImageStatus(event.target.value) })} placeholder="/products/... o https://..." /></label>
          <div className="catalog-admin-upload wide"><label>{busy ? "Procesando..." : "Subir JPG, PNG o WEBP"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => chooseImage(event.target.files?.[0])} /></label>{editor.imageUrl ? <button type="button" onClick={() => setEditor({ ...editor, imageUrl: "", imageStatus: "pending" })}>Quitar imagen</button> : null}</div>
          <label>Insignia<input value={editor.badge ?? ""} onChange={(event) => setEditor({ ...editor, badge: event.target.value || null })} /></label>
          <label className="wide internal">Observación interna<textarea value={editor.internalReview ?? ""} onChange={(event) => setEditor({ ...editor, internalReview: event.target.value || null })} /></label>
          <div className="catalog-admin-checks wide"><label><input type="checkbox" checked={editor.ownBrand} onChange={(event) => setEditor({ ...editor, ownBrand: event.target.checked })} /> Marca propia</label><label><input type="checkbox" checked={editor.quoteOnly} onChange={(event) => setEditor({ ...editor, quoteOnly: event.target.checked })} /> Precio por cotización</label><label><input type="checkbox" checked={editor.isFeatured} onChange={(event) => setEditor({ ...editor, isFeatured: event.target.checked })} /> Destacado</label><label><input type="checkbox" checked={editor.isActive} onChange={(event) => setEditor({ ...editor, isActive: event.target.checked })} /> Activo al publicar</label></div>
          <button className="catalog-admin-primary wide" type="submit" disabled={busy || !dirty}>Guardar borrador</button>
        </form>
        <aside className="catalog-admin-preview"><span>Vista pública</span><div className="catalog-admin-card"><div>{editor.imageUrl ? <img src={editor.imageUrl} alt="" /> : <strong>Fotografía pendiente</strong>}</div>{editor.brand ? <p>{editor.brand}</p> : null}<h3>{editor.name || "Nombre del producto"}</h3><small>{editor.presentation || "Presentación"}</small><button type="button">Agregar a cotización</button></div>{selectedId && publishedById.has(selectedId) ? <button type="button" className="catalog-admin-history-button" onClick={() => loadHistory(selectedId)}>Ver historial</button> : null}{history.length ? <div className="catalog-admin-history"><h3>Historial publicado</h3>{history.map((entry) => <article key={entry.id}><div><b>{entry.action}</b><small>{new Date(entry.createdAt).toLocaleString("es-PE")} · {entry.actor}</small></div>{entry.afterData ? <button type="button" onClick={() => restoreHistory(entry)}>Restaurar</button> : null}</article>)}</div> : null}</aside>
      </div>
      <div className="catalog-admin-list-head"><div><h2>Catálogo completo</h2><p>{products.length} publicados · {drafts.length} cambios pendientes</p></div><div><input type="search" placeholder="Buscar producto" value={query} onChange={(event) => setQuery(event.target.value)} /><button type="button" className="catalog-admin-primary" onClick={publishSelected} disabled={busy}>Publicar seleccionados ({selectedDrafts.length})</button></div></div>
      <div className="catalog-admin-table-wrap"><table><thead><tr><th></th><th>Imagen</th><th>Producto</th><th>Estado</th><th>Imagen</th><th>Acciones</th></tr></thead><tbody>{visibleRows.map((row) => <tr key={row.id} className={!row.effective.isActive ? "inactive" : ""}><td>{row.draft ? <input type="checkbox" checked={selectedDrafts.includes(row.id)} onChange={() => setSelectedDrafts((current) => current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id])} aria-label={`Seleccionar ${row.effective.name}`} /> : null}</td><td>{row.effective.imageUrl ? <img src={row.effective.imageUrl} alt="" /> : <span>Sin foto</span>}</td><td><b>{row.effective.name}</b><small>{row.effective.brand || "Sin marca"} · {row.effective.presentation}</small></td><td><span className={row.draft ? "pending" : row.effective.isActive ? "active" : "inactive"}>{row.draft ? "Cambio pendiente" : row.effective.isActive ? "Publicado" : "Oculto"}</span></td><td>{row.effective.imageStatus ?? inferredImageStatus(row.effective.imageUrl)}</td><td><button type="button" onClick={() => openEditor(row)}>Editar</button>{row.published ? <button type="button" onClick={() => toggleActive(row)}>{row.published.isActive ? "Ocultar" : "Reactivar"}</button> : null}{row.draft ? <button type="button" onClick={() => discardDraft(row.id)}>Descartar</button> : null}</td></tr>)}</tbody></table></div>
    </> : null}
    {tab === "import" ? <div className="catalog-admin-import"><div><span>Carga masiva</span><h2>Importar CSV con validación</h2><p>Admite campos entre comillas, separadores y saltos de línea. Las filas inválidas nunca se guardan.</p></div><div className="catalog-admin-import-actions"><button type="button" onClick={downloadTemplate}>Descargar plantilla</button><label>Seleccionar CSV<input type="file" accept=".csv,text/csv" onChange={(event) => readCsv(event.target.files?.[0])} /></label><button type="button" className="catalog-admin-primary" disabled={!validImportRows.length || busy} onClick={saveImport}>Guardar {validImportRows.length} borradores</button></div>{importRows.length ? <div className="catalog-admin-table-wrap"><table><thead><tr><th>Fila</th><th>Código</th><th>Producto</th><th>Resultado</th></tr></thead><tbody>{importRows.map((row) => <tr key={`${row.row}-${row.product.id}`}><td>{row.row}</td><td>{row.product.id}</td><td>{row.product.name}</td><td>{row.duplicate ? "Duplicado semántico" : row.errors.length ? row.errors.join(", ") : "Válida"}</td></tr>)}</tbody></table></div> : null}</div> : null}
  </section>;
}

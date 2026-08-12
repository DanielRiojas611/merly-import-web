"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import type { HomepageSettings, SiteBanner, SiteContent, SideBannerContent } from "../../lib/site-content-db";

type Section = "principales" | "laterales" | "botones";
type ImageKind = "desktop" | "mobile" | "side";
type ImageQuality = { width: number; height: number; originalKb: number; warnings: string[] };

function qualityWarnings(kind: ImageKind, width: number, height: number, bytes: number) {
  const warnings: string[] = [];
  const ratio = width / Math.max(1, height);
  if (kind === "desktop") {
    if (width < 1400 || height < 600) warnings.push("Recomendado: mínimo 1400 × 600 px.");
    if (ratio < 1.6 || ratio > 3.4) warnings.push("La proporción puede recortar información en computadora.");
  } else if (kind === "mobile") {
    if (width < 800 || height < 800) warnings.push("Recomendado: mínimo 800 × 800 px.");
    if (ratio < 0.65 || ratio > 1.2) warnings.push("Usa una imagen vertical o casi cuadrada para celular.");
  } else {
    if (width < 900 || height < 500) warnings.push("Recomendado: mínimo 900 × 500 px.");
    if (ratio < 1.2 || ratio > 2.5) warnings.push("La proporción puede recortarse en el banner lateral.");
  }
  if (bytes > 4_000_000) warnings.push("El archivo original supera 4 MB; será reducido antes de guardarse.");
  return warnings;
}

async function compressImage(file: File, kind: ImageKind) {
  if (!file.type.startsWith("image/")) throw new Error("INVALID_IMAGE");
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("IMAGE_READ_FAILED"));
      element.src = source;
    });
    const maxWidth = kind === "mobile" ? 1200 : 1920;
    const maxHeight = kind === "mobile" ? 1600 : 1100;
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("CANVAS_UNAVAILABLE");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return {
      dataUrl: canvas.toDataURL("image/webp", 0.84),
      quality: {
        width: image.naturalWidth,
        height: image.naturalHeight,
        originalKb: Math.round(file.size / 1024),
        warnings: qualityWarnings(kind, image.naturalWidth, image.naturalHeight, file.size),
      } satisfies ImageQuality,
    };
  } finally {
    URL.revokeObjectURL(source);
  }
}

function ImageField({ label, kind, value, onChange }: { label: string; kind: ImageKind; value: string; onChange: (value: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [quality, setQuality] = useState<ImageQuality | null>(null);

  async function choose(file: File) {
    setBusy(true);
    try {
      const result = await compressImage(file, kind);
      setQuality(result.quality);
      onChange(result.dataUrl);
    } catch {
      window.alert("No se pudo procesar la imagen. Usa un archivo JPG, PNG o WEBP.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="content-image-field">
    <div className="content-image-label"><b>{label}</b><small>JPG, PNG o WEBP. Se optimiza automáticamente antes de almacenarse.</small></div>
    <div className="content-image-controls"><label className="content-upload-button">{busy ? "Procesando..." : value ? "Reemplazar imagen" : "Subir imagen"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => event.target.files?.[0] && choose(event.target.files[0])} /></label>{value ? <button type="button" onClick={() => { onChange(""); setQuality(null); }}>Quitar</button> : null}</div>
    <input value={value} placeholder="/banners/imagen.webp o https://..." onChange={(event) => { onChange(event.target.value); setQuality(null); }} />
    {quality ? <div className={quality.warnings.length ? "content-quality warning" : "content-quality ready"}><b>{quality.width} × {quality.height} px · {quality.originalKb} KB</b>{quality.warnings.length ? quality.warnings.map((warning) => <span key={warning}>{warning}</span>) : <span>Dimensiones adecuadas para esta ubicación.</span>}</div> : null}
    <div className="content-image-preview">{value ? <img src={value} alt="Vista previa" /> : <span>Sin imagen</span>}</div>
  </div>;
}

function updateBanner(banners: SiteBanner[], id: string, patch: Partial<SiteBanner>) {
  return banners.map((banner) => banner.id === id ? { ...banner, ...patch } : banner);
}

function BannerEditor({ banner, onChange }: { banner: SiteBanner; onChange: (patch: Partial<SiteBanner>) => void }) {
  return <article className="content-editor-card">
    <div className="content-card-heading"><div><span>Banner principal</span><h2>{banner.kicker || banner.id}</h2></div><label className="content-switch"><input type="checkbox" checked={banner.isActive} onChange={(event) => onChange({ isActive: event.target.checked })} /><span>Activo</span></label></div>
    <div className="content-form-grid"><label>Texto superior<input value={banner.kicker} onChange={(event) => onChange({ kicker: event.target.value })} /></label><label>Orden<input type="number" value={banner.sortOrder} onChange={(event) => onChange({ sortOrder: Number(event.target.value) || 0 })} /></label><label className="wide">Título<input value={banner.title} onChange={(event) => onChange({ title: event.target.value })} /></label><label className="wide">Descripción<textarea value={banner.body} onChange={(event) => onChange({ body: event.target.value })} /></label><label>Texto del botón<input value={banner.ctaLabel} onChange={(event) => onChange({ ctaLabel: event.target.value })} /></label><label>Enlace del botón<input value={banner.ctaHref} onChange={(event) => onChange({ ctaHref: event.target.value })} /></label><label>Tema<select value={banner.theme} onChange={(event) => onChange({ theme: event.target.value as SiteBanner["theme"] })}><option value="brand">Marcas propias</option><option value="offers">Ofertas</option><option value="delivery">Entregas</option></select></label></div>
    <ImageField label="Imagen para computadora" kind="desktop" value={banner.imageUrl} onChange={(imageUrl) => onChange({ imageUrl })} />
    <ImageField label="Imagen para celular" kind="mobile" value={banner.mobileImageUrl} onChange={(mobileImageUrl) => onChange({ mobileImageUrl })} />
    <div className="content-public-preview"><span>{banner.kicker}</span><h3>{banner.title}</h3><p>{banner.body}</p><b>{banner.ctaLabel} →</b></div>
  </article>;
}

function SideEditor({ name, value, onChange }: { name: string; value: SideBannerContent; onChange: (patch: Partial<SideBannerContent>) => void }) {
  return <article className="content-editor-card"><div className="content-card-heading"><div><span>Banner lateral</span><h2>{name}</h2></div></div><div className="content-form-grid"><label>Texto superior<input value={value.kicker} onChange={(event) => onChange({ kicker: event.target.value })} /></label><label>Texto del botón<input value={value.ctaLabel} onChange={(event) => onChange({ ctaLabel: event.target.value })} /></label><label className="wide">Título<input value={value.title} onChange={(event) => onChange({ title: event.target.value })} /></label><label className="wide">Descripción<textarea value={value.body} onChange={(event) => onChange({ body: event.target.value })} /></label><label className="wide">Enlace del botón<input value={value.ctaHref} onChange={(event) => onChange({ ctaHref: event.target.value })} /></label></div><ImageField label="Imagen del banner" kind="side" value={value.imageUrl} onChange={(imageUrl) => onChange({ imageUrl })} /><div className="content-public-preview side"><span>{value.kicker}</span><h3>{value.title}</h3><p>{value.body}</p><b>{value.ctaLabel} →</b></div></article>;
}

export default function AdminSiteContent({ initialContent }: { initialContent: SiteContent }) {
  const [content, setContent] = useState(initialContent);
  const [section, setSection] = useState<Section>("principales");
  const [message, setMessage] = useState("");
  const [busyAction, setBusyAction] = useState<"draft" | "preview" | "publish" | "restore" | "">("");
  const sortedBanners = useMemo(() => [...content.banners].sort((a, b) => a.sortOrder - b.sortOrder), [content.banners]);

  function patchSettings(patch: Partial<HomepageSettings>) { setContent((current) => ({ ...current, settings: { ...current.settings, ...patch } })); }
  function patchLabels(patch: Partial<HomepageSettings["labels"]>) { setContent((current) => ({ ...current, settings: { ...current.settings, labels: { ...current.settings.labels, ...patch } } })); }
  function patchSide(key: "presale" | "delivery", patch: Partial<SideBannerContent>) { setContent((current) => ({ ...current, settings: { ...current.settings, sideBanners: { ...current.settings.sideBanners, [key]: { ...current.settings.sideBanners[key], ...patch } } } })); }

  function serverMessage(error: string | undefined) {
    if (error === "image_storage_not_configured") return "La imagen está preparada, pero falta activar el almacenamiento gratuito de Vercel Blob desde la PC.";
    if (error === "image_too_large") return "La imagen sigue siendo demasiado pesada. Usa otra con menor resolución.";
    return "No se pudo completar la acción. Revisa textos, enlaces e imágenes.";
  }

  async function saveDraft(openPreview = false) {
    setBusyAction(openPreview ? "preview" : "draft");
    setMessage(openPreview ? "Guardando borrador para abrir la vista previa..." : "Guardando borrador...");
    try {
      const response = await fetch("/api/admin/content/draft", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content) });
      const payload = await response.json() as { content?: SiteContent; error?: string };
      if (!response.ok || !payload.content) throw new Error(payload.error || "SAVE_FAILED");
      setContent(payload.content);
      setMessage(openPreview ? "Borrador guardado. Abriendo la portada de prueba." : "Borrador guardado. Los clientes todavía no ven estos cambios.");
      if (openPreview) window.open("/admin/contenido/vista-previa", "_blank", "noopener,noreferrer");
    } catch (error) {
      setMessage(serverMessage(error instanceof Error ? error.message : undefined));
    } finally {
      setBusyAction("");
    }
  }

  async function publish() {
    if (!window.confirm("¿Publicar estos cambios en la portada que ven los clientes?")) return;
    setBusyAction("publish");
    setMessage("Publicando cambios...");
    try {
      const response = await fetch("/api/admin/content/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(content) });
      const payload = await response.json() as { content?: SiteContent; error?: string };
      if (!response.ok || !payload.content) throw new Error(payload.error || "PUBLISH_FAILED");
      setContent(payload.content);
      setMessage("Portada publicada. La versión anterior quedó disponible para restaurarla.");
    } catch (error) {
      setMessage(serverMessage(error instanceof Error ? error.message : undefined));
    } finally {
      setBusyAction("");
    }
  }

  async function restore() {
    if (!window.confirm("¿Restaurar la versión publicada anteriormente? La versión actual quedará disponible como respaldo.")) return;
    setBusyAction("restore");
    setMessage("Restaurando versión anterior...");
    try {
      const response = await fetch("/api/admin/content/restore", { method: "POST" });
      const payload = await response.json() as { content?: SiteContent; error?: string };
      if (!response.ok || !payload.content) throw new Error(payload.error || "RESTORE_FAILED");
      setContent(payload.content);
      setMessage("Versión anterior restaurada correctamente.");
    } catch (error) {
      setMessage(error instanceof Error && error.message === "no_previous_version" ? "Todavía no existe una versión anterior para restaurar." : "No se pudo restaurar la versión anterior.");
    } finally {
      setBusyAction("");
    }
  }

  return <div className="content-admin-layout">
    <aside className="content-admin-nav"><h2>Contenido editable</h2><p>Guarda un borrador, revisa la portada completa y recien despues publica.</p><button className={section === "principales" ? "active" : ""} onClick={() => setSection("principales")}><b>Banners principales</b><span>Titulos, imagenes y botones</span></button><button className={section === "laterales" ? "active" : ""} onClick={() => setSection("laterales")}><b>Banners laterales</b><span>Preventa y entregas</span></button><button className={section === "botones" ? "active" : ""} onClick={() => setSection("botones")}><b>Botones y redes</b><span>Etiquetas y enlaces sociales</span></button><a href="/admin">Volver a productos</a></aside>
    <section className="content-admin-main">
      <div className="content-actions"><div>{message ? <p>{message}</p> : <p>Los cambios no se muestran al público hasta presionar Publicar.</p>}</div><div className="content-action-buttons"><button className="secondary" disabled={Boolean(busyAction)} onClick={() => saveDraft(false)}>{busyAction === "draft" ? "Guardando..." : "Guardar borrador"}</button><button className="secondary" disabled={Boolean(busyAction)} onClick={() => saveDraft(true)}>{busyAction === "preview" ? "Abriendo..." : "Vista previa completa"}</button><button className="restore" disabled={Boolean(busyAction)} onClick={restore}>{busyAction === "restore" ? "Restaurando..." : "Restaurar anterior"}</button><button disabled={Boolean(busyAction)} onClick={publish}>{busyAction === "publish" ? "Publicando..." : "Publicar cambios"}</button></div></div>
      {section === "principales" ? <div className="content-editor-list"><div className="content-section-title"><span>Portada</span><h2>Banners principales</h2><p>El botón del primer banner debe mantenerse como “Ver catálogo”, salvo una campaña específica.</p></div>{sortedBanners.map((banner) => <BannerEditor key={banner.id} banner={banner} onChange={(patch) => setContent((current) => ({ ...current, banners: updateBanner(current.banners, banner.id, patch) }))} />)}</div> : null}
      {section === "laterales" ? <div className="content-editor-list"><div className="content-section-title"><span>Portada</span><h2>Banners laterales</h2><p>Edita preventa y cobertura sin alterar el diseño.</p></div><SideEditor name="Preventa" value={content.settings.sideBanners.presale} onChange={(patch) => patchSide("presale", patch)} /><SideEditor name="Entrega coordinada" value={content.settings.sideBanners.delivery} onChange={(patch) => patchSide("delivery", patch)} /></div> : null}
      {section === "botones" ? <div className="content-editor-list"><div className="content-section-title"><span>Portada</span><h2>Botones y redes</h2><p>Usa textos breves, claros y orientados a la accion.</p></div><article className="content-editor-card"><div className="content-card-heading"><div><span>Etiquetas</span><h2>Botones principales</h2></div></div><div className="content-form-grid"><label>Boton Buscar<input value={content.settings.labels.searchButton} onChange={(event) => patchLabels({ searchButton: event.target.value })} /></label><label>Boton Cotizar del encabezado<input value={content.settings.labels.headerQuote} onChange={(event) => patchLabels({ headerQuote: event.target.value })} /></label><label>Boton WhatsApp del encabezado<input value={content.settings.labels.headerWhatsapp} onChange={(event) => patchLabels({ headerWhatsapp: event.target.value })} /></label><label>Enlace al catalogo<input value={content.settings.labels.catalogButton} onChange={(event) => patchLabels({ catalogButton: event.target.value })} /></label><label className="wide">Boton del formulario de cotizacion<input value={content.settings.labels.quoteButton} onChange={(event) => patchLabels({ quoteButton: event.target.value })} /></label></div></article><article className="content-editor-card"><div className="content-card-heading"><div><span>Redes sociales</span><h2>Facebook y TikTok</h2></div></div><div className="content-form-grid"><label>Texto visible TikTok<input value={content.settings.labels.tiktok} onChange={(event) => patchLabels({ tiktok: event.target.value })} /></label><label>Enlace de TikTok<input value={content.settings.tiktokUrl} onChange={(event) => patchSettings({ tiktokUrl: event.target.value })} /></label><label className="wide">Enlace de Facebook<input value={content.settings.facebookUrl} onChange={(event) => patchSettings({ facebookUrl: event.target.value })} /></label></div><div className="content-tiktok-preview"><span>♪</span><b>{content.settings.labels.tiktok}</b></div></article></div> : null}
    </section>
  </div>;
}

"use client";
import { useState } from "react";
export default function RefreshCatalog() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return <div><button type="button" disabled={busy} onClick={async () => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/catalogo/publicar", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const body = await response.json() as { total?: number; error?: string };
      setMessage(response.ok ? `Catálogo público actualizado: ${body.total} productos.` : body.error || "No se pudo actualizar el catálogo.");
    } catch { setMessage("No se pudo conectar. La última publicación se conserva."); }
    finally { setBusy(false); }
  }}>{busy ? "Actualizando…" : "Actualizar catálogo público"}</button>{message ? <p role="status">{message}</p> : null}</div>;
}

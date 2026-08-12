"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export default function CatalogCommercialPortal() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const heading = document.querySelector<HTMLElement>(".catalog-heading");
    if (!heading) return;
    const copy = heading.querySelector<HTMLElement>("span");
    const normalizeCopy = () => {
      if (!copy?.textContent) return;
      const next = copy.textContent.replace(/productos disponibles para cotizar\.?/i, "productos en el catálogo.");
      if (next !== copy.textContent) copy.textContent = next;
    };
    normalizeCopy();
    const observer = new MutationObserver(normalizeCopy);
    if (copy) observer.observe(copy, { childList: true, characterData: true, subtree: true });

    const host = document.createElement("div");
    host.className = "catalog-commercial-host";
    heading.appendChild(host);
    const timer = window.setTimeout(() => setTarget(host), 0);
    return () => { window.clearTimeout(timer); observer.disconnect(); host.remove(); };
  }, []);

  if (!target) return null;
  return createPortal(
    <a className="catalog-list-download" href="/api/catalogo/lista" download>
      Descargar lista mayorista
    </a>,
    target,
  );
}

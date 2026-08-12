"use client";

import Link from "next/link";
import { BRAND_NAME, WHATSAPP_NUMBER } from "./lib/brand";
import "./status-pages.css";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="status-page"><section><span>{BRAND_NAME}</span><h1>No pudimos cargar esta pagina</h1><p>La conexion puede haberse interrumpido. Reintenta o continua con el catalogo.</p><div><button type="button" onClick={reset}>Reintentar</button><Link href="/catalogo">Ir al catalogo</Link><a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">WhatsApp</a></div></section></main>;
}

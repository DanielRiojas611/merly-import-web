import Link from "next/link";
import { BRAND_NAME, WHATSAPP_NUMBER } from "./lib/brand";
import "./status-pages.css";

export default function NotFound() {
  return <main className="status-page"><section><span>{BRAND_NAME} · 404</span><h1>Esta pagina no existe</h1><p>Puede que el enlace haya cambiado. Regresa al catalogo o solicita ayuda por WhatsApp.</p><div><Link href="/">Ir al inicio</Link><Link href="/catalogo">Ver catalogo</Link><a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">WhatsApp</a></div></section></main>;
}

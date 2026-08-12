import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME, CONTACT_EMAIL } from "../lib/brand";
export const metadata: Metadata = { title: "Privacidad", alternates: { canonical: "/privacidad" } };
export default function PrivacyPage() { return <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 22px", fontFamily: "var(--font-geist-sans), sans-serif", lineHeight: 1.65 }}><Link href="/">Volver al inicio</Link><h1>Privacidad</h1><p>{BRAND_NAME} utiliza los datos que el cliente proporciona voluntariamente para responder consultas, preparar cotizaciones y coordinar pedidos.</p><p>El formulario de la web abre una conversacion en WhatsApp; la informacion enviada se procesa tambien conforme a las condiciones de esa plataforma. No solicitamos datos bancarios ni contrasenas desde la web.</p><p>Para consultar, corregir o solicitar la eliminacion de informacion de contacto, escribe a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p></main>; }

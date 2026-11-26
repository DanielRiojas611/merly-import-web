import type { Metadata } from "next";

const title = "Distribuidores mayoristas de higiene y limpieza en Perú";
const description = "Solicita atención comercial para distribuir productos de higiene, limpieza y hogar. Cotiza por volumen para tu negocio en Lima o provincias.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/distribuidor" },
  openGraph: { title: `${title} | Merly Import`, description, url: "/distribuidor", type: "website" },
  twitter: { title: `${title} | Merly Import`, description },
};

export { default } from "../tiktok-distribuidores/page";

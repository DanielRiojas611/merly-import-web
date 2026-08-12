import type { Metadata, Viewport } from "next";
import {
  BRAND_NAME,
  CONTACT_EMAIL,
  FACEBOOK_URL,
  FAVICON_PATH,
  LOGO_PATH,
  TIKTOK_URL,
  WHATSAPP_DISPLAY,
} from "./lib/brand";
import { siteUrl } from "./lib/site-url";
import "./globals.css";
import "./visual-polish.css";
import "./commercial-improvements.css";

const publicProduction = process.env.VERCEL_ENV === "production";
const seoTitle = "Merly Import | Catalogo mayorista en Peru";
const seoDescription = "Catalogo mayorista de productos de higiene, limpieza, hogar y alta rotacion para negocios, con cotizacion por WhatsApp y entregas coordinadas en Peru.";

export const viewport: Viewport = { width: "device-width", initialScale: 1, colorScheme: "light", themeColor: "#102b4e" };
export const metadata: Metadata = {
  metadataBase: siteUrl(),
  title: { default: seoTitle, template: `%s | ${BRAND_NAME}` },
  description: seoDescription,
  alternates: { canonical: "/" },
  icons: { icon: FAVICON_PATH, shortcut: FAVICON_PATH },
  openGraph: {
    title: seoTitle,
    description: seoDescription,
    url: "/",
    siteName: BRAND_NAME,
    locale: "es_PE",
    type: "website",
    images: [{
      url: "/api/social-card?v=6",
      width: 1200,
      height: 630,
      alt: "Merly Import, catalogo mayorista",
      type: "image/png",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: seoTitle,
    description: seoDescription,
    images: ["/api/social-card?v=6"],
  },
  robots: publicProduction ? { index: true, follow: true } : { index: false, follow: false, nocache: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const base = siteUrl();
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": new URL("/#empresa", base).toString(),
    name: BRAND_NAME,
    url: base.toString(),
    logo: new URL(LOGO_PATH, base).toString(),
    image: new URL("/api/social-card?v=6", base).toString(),
    description: seoDescription,
    telephone: WHATSAPP_DISPLAY,
    email: CONTACT_EMAIL,
    currenciesAccepted: "PEN",
    areaServed: {
      "@type": "Country",
      name: "Peru",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: WHATSAPP_DISPLAY,
      contactType: "sales",
      areaServed: "PE",
      availableLanguage: "es",
    },
    sameAs: [FACEBOOK_URL, TIKTOK_URL],
  };

  return <html lang="es"><body>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
    {children}
  </body></html>;
}

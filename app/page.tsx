import { products as fallbackProducts } from "./catalogo/products";
import CommerceHome from "./CommerceHome";
import { WHATSAPP_NUMBER } from "./lib/brand";
import { getCommercialRules } from "./lib/commercial-rules";
import { getFeaturedProducts } from "./lib/neon-catalog";
import { getSiteContent } from "./lib/site-content-db";
import "./home-surgical.css";
import "./next-commerce.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const contentPromise = getSiteContent();
  const featuredPromise = getFeaturedProducts(12).catch(() => null);
  const [content, featured] = await Promise.all([contentPromise, featuredPromise]);
  return <CommerceHome content={content} featuredProducts={featured?.length ? featured : fallbackProducts} whatsappNumber={WHATSAPP_NUMBER} commercialRules={getCommercialRules()} />;
}

import { products as fallbackProducts } from "./catalogo/products";
import EditorialHome from "./EditorialHome";
import { WHATSAPP_NUMBER } from "./lib/brand";
import { getCommercialRules } from "./lib/commercial-rules";
import { getFeaturedProducts } from "./lib/neon-catalog";
import { getSiteContent } from "./lib/site-content-db";
import "./editorial-home.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const contentPromise = getSiteContent();
  const featuredPromise = getFeaturedProducts(12).catch(() => null);
  const [content, featured] = await Promise.all([contentPromise, featuredPromise]);
  return <EditorialHome content={content} featuredProducts={featured?.length ? featured : fallbackProducts} whatsappNumber={WHATSAPP_NUMBER} commercialRules={getCommercialRules()} />;
}

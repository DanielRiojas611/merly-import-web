import { products as fallbackProducts } from "./catalogo/products";
import WholesaleHome from "./WholesaleHome";
import { WHATSAPP_NUMBER } from "./lib/brand";
import { getCommercialRules } from "./lib/commercial-rules";
import { getFeaturedProducts } from "./lib/neon-catalog";
import { getSiteContent } from "./lib/site-content-db";
import "./wholesale-home.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const contentPromise = getSiteContent();
  const featuredPromise = getFeaturedProducts(12).catch(() => null);
  const [content, featured] = await Promise.all([contentPromise, featuredPromise]);
  return <WholesaleHome content={content} featuredProducts={featured?.length ? featured : fallbackProducts} whatsappNumber={WHATSAPP_NUMBER} commercialRules={getCommercialRules()} />;
}

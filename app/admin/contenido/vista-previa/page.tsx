import { notFound } from "next/navigation";

import { products as fallbackProducts } from "../../../catalogo/products";
import HomeClient from "../../../HomeClient";
import { WHATSAPP_NUMBER } from "../../../lib/brand";
import { getCommercialRules } from "../../../lib/commercial-rules";
import { getFeaturedProducts } from "../../../lib/neon-catalog";
import { getSiteContentDraft } from "../../../lib/site-content-db";

function isPreviewEnabled() {
  const value = process.env.ENABLE_CONTENT_PREVIEW?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

export const dynamic = "force-dynamic";

export default async function ContentPreviewPage() {
  if (!isPreviewEnabled()) {
    notFound();
  }

  const [content, featured] = await Promise.all([
    getSiteContentDraft(),
    getFeaturedProducts(6).catch(() => null),
  ]);

  return (
    <HomeClient
      content={content}
      featuredProducts={featured?.length ? featured : fallbackProducts}
      whatsappNumber={WHATSAPP_NUMBER}
      commercialRules={getCommercialRules()}
      previewMode
    />
  );
}

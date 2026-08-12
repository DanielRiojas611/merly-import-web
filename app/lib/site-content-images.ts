import { persistAdminImage } from "./blob-images";
import type { SiteContent } from "./site-content-db";

export async function persistSiteContentImages(content: SiteContent): Promise<SiteContent> {
  const banners = await Promise.all(
    content.banners.map(async (banner) => ({
      ...banner,
      imageUrl: await persistAdminImage(banner.imageUrl, "banners", `${banner.id}-desktop`),
      mobileImageUrl: await persistAdminImage(banner.mobileImageUrl, "banners", `${banner.id}-mobile`),
    })),
  );

  const presale = content.settings.sideBanners.presale;
  const delivery = content.settings.sideBanners.delivery;

  return {
    ...content,
    banners,
    settings: {
      ...content.settings,
      sideBanners: {
        presale: {
          ...presale,
          imageUrl: await persistAdminImage(presale.imageUrl, "banners", "preventa-lateral"),
        },
        delivery: {
          ...delivery,
          imageUrl: await persistAdminImage(delivery.imageUrl, "banners", "entrega-lateral"),
        },
      },
    },
  };
}

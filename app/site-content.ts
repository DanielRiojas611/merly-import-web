/**
 * Punto único para cambiar los recursos visuales del sitio.
 * Las rutas vacías mantienen las composiciones provisionales construidas en CSS.
 * Cuando exista una pieza final, colócala en /public/banners y registra aquí su ruta.
 */
export const siteAssets = {
  logo: "/brand/merly-import-logo.png",
  banners: {
    ownBrands: "/banners/portafolio-marcas-propias-v2.webp",
    ownBrandsMobile: "/banners/portafolio-marcas-propias-mobile-v12.webp",
    offers: "/category-stories/higiene-oral.webp",
    nationwideDelivery: "/banners/entrega-nacional-vinil-v10.webp",
    presale: "/banners/preventa-logistica-marcas-v12.webp",
    coordinatedDelivery: "/banners/entrega-nacional-vinil-v10.webp",
  },
  categoryStories: {
    oralCare: "/category-stories/higiene-oral.webp",
    pharmacies: "/category-stories/boticas.webp",
    cleaning: "/category-stories/limpieza-hogar.webp",
  },
  sections: {
    presale: "/banners/preventa-logistica-marcas-v12.webp",
  },
} as const;

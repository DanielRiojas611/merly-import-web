export type ProductTier = { min: number; price: number };
export type ProductSalesUnit = "caja" | "unidad" | "docena" | "exhibidor" | "paquete" | "blister" | "kilogramo" | "otro";

export type Product = {
  id: string;
  brand: string;
  name: string;
  description?: string;
  presentation: string;
  category: string;
  ownBrand: boolean;
  tiers: ProductTier[];
  image: string;
  salesUnit?: ProductSalesUnit;
  quoteOnly?: boolean;
  badge?: string;
  isFeatured?: boolean;
  sortOrder?: number;
};

export const products: Product[] = [
  { id: "tonito-venditas", brand: "TOÑITO", name: "Venditas resistentes al agua", description: "Caja promocional para boticas, bodegas y distribuidores.", presentation: "Caja x 100 + 10 unidades", category: "Higiene", ownBrand: true, tiers: [], image: "/products/tonito-venditas-100-10.webp", salesUnit: "caja", quoteOnly: true, badge: "Marca propia", isFeatured: true, sortOrder: 1 },
  { id: "hicell-aa-12-blisters", brand: "HICELL", name: "Pilas AA Extra Long Life", description: "Caja mayorista con blísteres de pilas AA.", presentation: "Caja x 12 blísteres · 2 pilas por blíster", category: "Hogar", ownBrand: true, tiers: [], image: "/products/hicell-aa-12-blisters.webp", salesUnit: "caja", quoteOnly: true, badge: "Marca propia", isFeatured: true, sortOrder: 2 },
];

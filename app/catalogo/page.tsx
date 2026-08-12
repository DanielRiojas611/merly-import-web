import type { Metadata } from "next";
import { products as fallbackProducts, type Product } from "./products";
import { WHATSAPP_NUMBER } from "../lib/brand";
import { getCatalogCategories, getPublishedProductsPage, type CatalogFilter } from "../lib/neon-catalog";
import { getCommercialRules } from "../lib/commercial-rules";
import { comparableText, displayProductName, displayProductPresentation, isOwnBrand, isPublicProductComplete, normalizeBrand, publicProductBadge, publicProductImage, productSemanticKey } from "../lib/product-utils";
import CatalogClient from "./CatalogClient";
import CatalogCommercialPortal from "./CatalogCommercialPortal";
import "./catalog.css";
import "./catalog-surgical.css";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Catálogo mayorista",
  description: "Catálogo mayorista de higiene, limpieza y hogar para bodegas, boticas, distribuidores y empresas.",
  alternates: { canonical: "/catalogo" },
  openGraph: { title: "Catalogo mayorista | Merly Import", description: "Encuentra productos de alta rotacion y solicita una cotizacion por volumen.", url: "/catalogo", type: "website" },
};
function valueOf(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }
function cleanCategory(value: string) { return value.replace(/\s+/g, " ").trim().slice(0, 60); }
function resolveFilter(value: string, categories: string[]): CatalogFilter {
  const requested = cleanCategory(value);
  if (!requested) return "Todos";
  if (["propias", "marca propia", "marcas propias"].includes(comparableText(requested))) return "Marcas propias";
  return categories.find((category) => comparableText(category) === comparableText(requested)) ?? "Todos";
}
function publicFallbackProducts() {
  const unique = new Map<string, Product>();
  for (const product of fallbackProducts) {
    const brand = normalizeBrand(product.brand); const ownBrand = isOwnBrand(brand, product.ownBrand);
    const normalized: Product = { ...product, brand, name: displayProductName(brand, product.name), presentation: displayProductPresentation(product.presentation), ownBrand, image: publicProductImage(product.id, product.image), badge: publicProductBadge(product.badge, ownBrand) || undefined };
    if (!isPublicProductComplete(normalized)) continue;
    const key = productSemanticKey(normalized); if (!unique.has(key)) unique.set(key, normalized);
  }
  return [...unique.values()];
}
function fallbackCategories() { return [...new Set(publicFallbackProducts().map((product) => cleanCategory(product.category)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es")); }
function fallbackPage(query: string, filter: CatalogFilter) {
  const term = comparableText(query);
  const products = publicFallbackProducts().filter((product) => {
    const matchesQuery = !term || comparableText(`${product.brand} ${product.name} ${product.description ?? ""} ${product.presentation} ${product.category}`).includes(term);
    const matchesFilter = filter === "Todos" || (filter === "Marcas propias" ? product.ownBrand : comparableText(product.category) === comparableText(filter));
    return matchesQuery && matchesFilter;
  });
  return { products: products.slice(0, 24), total: products.length };
}
export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = valueOf(params.buscar).replace(/\s+/g, " ").trim().slice(0, 100);
  let categories = fallbackCategories();
  try { categories = (await getCatalogCategories()) ?? categories; }
  catch (error) { console.error("No se pudieron cargar las categorías", error); }
  const filter = resolveFilter(valueOf(params.filtro), categories);
  let page = fallbackPage(query, filter);
  try { page = (await getPublishedProductsPage({ limit: 24, query, filter })) ?? page; }
  catch (error) { console.error("No se pudo renderizar el catálogo desde la base", error); }
  let catalogTotal = page.total;
  if (query || filter !== "Todos") {
    try { catalogTotal = (await getPublishedProductsPage({ limit: 1 }))?.total ?? publicFallbackProducts().length; }
    catch (error) { console.error("No se pudo cargar el total completo del catálogo", error); catalogTotal = publicFallbackProducts().length; }
  }
  return <>
    <CatalogClient initialProducts={page.products} initialTotal={page.total} catalogTotal={catalogTotal} initialQuery={query} initialFilter={filter} initialCategories={categories} whatsappNumber={WHATSAPP_NUMBER} commercialRules={getCommercialRules()} />
    <CatalogCommercialPortal />
  </>;
}

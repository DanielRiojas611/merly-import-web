import type { Product } from "../catalogo/products";
import { comparableText, normalizeBrand, isOwnBrand } from "./product-utils";

export type SeoGroup = {
  kind: "category" | "brand";
  slug: string;
  label: string;
  title: string;
  description: string;
  intro: string;
  path: string;
};

const category = (slug: string, label: string, title: string, description: string, intro: string): SeoGroup =>
  ({ kind: "category", slug, label, title, description, intro, path: "/mayorista/" + slug });
const brand = (slug: string, label: string, description: string, intro: string): SeoGroup =>
  ({ kind: "brand", slug, label, title: label + " al por mayor en Perú", description, intro, path: "/marcas/" + slug });

export const SEO_GROUPS: SeoGroup[] = [
  category("higiene", "Higiene", "Productos de higiene al por mayor en Perú",
    "Cotiza productos de higiene personal al por mayor para bodegas, boticas, farmacias y distribuidores. Consulta presentaciones y entregas en Perú.",
    "Abastece tu negocio con productos de higiene personal. Compara las presentaciones de cuidado oral, capilar y corporal que figuran en nuestro catálogo y solicita una cotización por volumen."),
  category("limpieza", "Limpieza", "Productos de limpieza al por mayor en Perú",
    "Encuentra detergentes, esponjas y otros productos de limpieza para abastecer negocios. Consulta presentaciones y precios mayoristas con Merly Import.",
    "Revisa los productos de limpieza publicados para reponer el surtido de tu tienda o distribuir a otros comercios. Consulta la presentación, cantidad y condiciones de entrega antes de confirmar tu pedido."),
  category("hogar", "Hogar", "Productos para el hogar al por mayor en Perú",
    "Consulta productos para el hogar y artículos de uso cotidiano por volumen. Cotiza para tu negocio en Lima o provincias.",
    "Explora artículos de uso cotidiano para bodegas, bazares, minimarkets y distribuidores. Revisa las fichas de los productos publicados para elegir las presentaciones que necesita tu negocio."),
  brand("tonito", "TOÑITO", "Consulta productos TOÑITO al por mayor, presentaciones y disponibilidad para tu negocio. Solicita atención comercial en Merly Import.",
    "Explora el surtido publicado de TOÑITO, incluidas las presentaciones de venditas y otros artículos de la marca. Selecciona las referencias que necesitas y consulta condiciones por volumen."),
  brand("merly", "MERLY", "Consulta el catálogo mayorista MERLY y solicita una cotización por volumen en Lima o provincias.",
    "Revisa las referencias publicadas de MERLY y sus presentaciones. Solicita información comercial para reponer el surtido de tu negocio."),
  brand("hicell", "HICELL", "Cotiza pilas y otros productos HICELL del catálogo mayorista de Merly Import. Consulta presentaciones por caja o blíster según cada ficha.",
    "Encuentra las referencias HICELL publicadas, incluidas las pilas del catálogo. Revisa sus características y presentaciones para decidir qué referencias cotizar."),
  brand("promil", "PROMIL", "Consulta productos PROMIL disponibles en el catálogo mayorista y cotiza presentaciones para tu negocio en Perú.",
    "Explora las referencias PROMIL de higiene publicadas. Compara las presentaciones de cada ficha y solicita condiciones mayoristas."),
  brand("merlita", "MERLITA", "Consulta productos MERLITA al por mayor y sus presentaciones en el catálogo de Merly Import.",
    "Revisa los productos MERLITA publicados y sus presentaciones comerciales. Consulta cantidades, disponibilidad y condiciones de despacho."),
  brand("pibe", "PIBE", "Consulta pañitos húmedos PIBE al por mayor, presentaciones y condiciones de cotización en Perú.",
    "Encuentra los pañitos húmedos PIBE publicados en nuestro catálogo. Revisa la presentación de la ficha y solicita una cotización para tu negocio."),
];

export function findSeoGroup(kind: SeoGroup["kind"], slug: string) {
  return SEO_GROUPS.find(group => group.kind === kind && group.slug === slug);
}

export function matchesSeoGroup(product: Product, group: SeoGroup) {
  if (group.kind === "category") return comparableText(product.category) === comparableText(group.label);
  const brandName = normalizeBrand(product.brand);
  return isOwnBrand(brandName, product.ownBrand) && comparableText(brandName) === comparableText(group.label);
}

export function productsForSeoGroup(products: Product[], group: SeoGroup) {
  return [...new Map(products.filter(product => matchesSeoGroup(product, group)).map(product => [product.id, product])).values()];
}

export function activeSeoGroups(products: Product[]) {
  return SEO_GROUPS.filter(group => products.some(product => matchesSeoGroup(product, group)));
}

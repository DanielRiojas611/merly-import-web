/* eslint-disable @next/next/no-img-element */

import type { Metadata } from "next";
import Link from "next/link";
import type { Product } from "../catalogo/products";
import { BRAND_NAME, LOGO_PATH } from "../lib/brand";
import { getPublishedProductsByIds } from "../lib/neon-catalog";
import { SEO_PILOT_PRODUCT_IDS, productPath } from "../lib/product-seo";
import { displayProductName, productQuoteName } from "../lib/product-utils";
import "./products.css";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Productos mayoristas",
  description: "Fichas de productos mayoristas de higiene, limpieza y hogar disponibles para cotizar con envíos a todo el Perú.",
  alternates: { canonical: "/productos" },
  openGraph: {
    title: "Productos mayoristas | Merly Import",
    description: "Consulta presentaciones y solicita una cotizacion mayorista para Lima o provincias.",
    url: "/productos",
    type: "website",
  },
};

export default async function ProductsPage() {
  let products: Product[] = [];
  try {
    products = await getPublishedProductsByIds([...SEO_PILOT_PRODUCT_IDS]);
  } catch (error) {
    console.error("No se pudieron cargar las fichas de productos", error);
  }

  return <main className="products-page">
    <header className="products-header">
      <div className="products-shell products-header-inner">
        <Link href="/" aria-label={`${BRAND_NAME}, inicio`}><img className="products-logo" src={LOGO_PATH} alt={BRAND_NAME} /></Link>
        <nav aria-label="Navegación de productos"><Link href="/">Inicio</Link><Link href="/catalogo">Ver catálogo</Link></nav>
      </div>
    </header>
    <section className="products-shell products-hero">
      <p className="products-eyebrow">Venta mayorista</p>
      <h1>Productos disponibles para cotizar</h1>
      <p>Consulta la presentacion de cada producto y agregalo al flujo de cotizacion existente. Atendemos negocios en Lima y coordinamos envios a todo el Peru.</p>
    </section>
    <section className="products-shell" aria-label="Fichas de productos">
      {products.length ? <div className="products-grid">{products.map((product) => {
        const name = displayProductName(product.brand, product.name);
        return <article className="products-card" key={product.id}>
          <Link href={productPath(product)}>
            <div className="products-card-image"><img src={product.image} alt={productQuoteName(product)} loading="lazy" width="420" height="420" /></div>
            <div className="products-card-copy">
              <small>{product.brand || product.category}</small>
              <h2>{name}</h2>
              <p>{product.presentation}</p>
              <strong>Ver ficha y cotizar →</strong>
            </div>
          </Link>
        </article>;
      })}</div> : <div className="products-empty"><h2>Las fichas están temporalmente en actualización</h2><p>El catálogo general continúa disponible para buscar y cotizar productos.</p><Link className="product-secondary-action" href="/catalogo">Ir al catálogo</Link></div>}
    </section>
  </main>;
}

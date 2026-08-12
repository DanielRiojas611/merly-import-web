import { redirect } from "next/navigation";
import { BRAND_NAME } from "../../lib/brand";
import { isAdminAuthenticated } from "../../lib/admin-auth";
import { listProductDrafts } from "../../lib/admin-drafts";
import { listAdminProducts } from "../../lib/admin-products";
import AdminPricing from "./AdminPricing";
import "./pricing-admin.css";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const [products, drafts] = await Promise.all([listAdminProducts(), listProductDrafts()]);

  return <main className="admin-page">
    <header className="admin-header">
      <div><p className="admin-eyebrow">{BRAND_NAME}</p><h1>Administracion de precios</h1><span>Escalas mayoristas con borrador y publicacion controlada.</span></div>
      <nav className="admin-module-links" aria-label="Modulos administrativos">
        <a href="/admin">Productos</a>
        <a aria-current="page" href="/admin/precios">Precios</a>
        <a href="/admin/contenido">Contenido</a>
        <a href="/admin/leads">Leads</a>
        <a href="/catalogo" target="_blank" rel="noreferrer">Vista publica</a>
        <form action="/api/admin/logout" method="post"><button type="submit">Cerrar sesion</button></form>
      </nav>
    </header>
    <AdminPricing initialProducts={products} initialDrafts={drafts} />
  </main>;
}

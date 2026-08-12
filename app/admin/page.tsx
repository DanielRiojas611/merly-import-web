import { redirect } from "next/navigation";
import { BRAND_NAME } from "../lib/brand";
import { isAdminAuthenticated } from "../lib/admin-auth";
import { listAdminProducts } from "../lib/admin-products";
import { listProductDrafts } from "../lib/admin-drafts";
import AdminCatalog from "./AdminCatalog";
import "./catalog-admin.css";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const [products, drafts] = await Promise.all([listAdminProducts(), listProductDrafts()]);

  return <main className="admin-page">
    <header className="admin-header">
      <div><p className="admin-eyebrow">{BRAND_NAME}</p><h1>Administracion del sitio web</h1><span>Productos, precios, contenido y leads comerciales.</span></div>
      <nav className="admin-module-links" aria-label="Modulos administrativos">
        <a aria-current="page" href="/admin">Productos</a>
        <a href="/admin/precios">Precios</a>
        <a href="/admin/contenido">Contenido</a>
        <a href="/admin/leads">Leads</a>
        <a href="/catalogo" target="_blank" rel="noreferrer">Vista publica</a>
        <form action="/api/admin/logout" method="post"><button type="submit">Cerrar sesion</button></form>
      </nav>
    </header>
    <AdminCatalog initialProducts={products} initialDrafts={drafts} />
  </main>;
}

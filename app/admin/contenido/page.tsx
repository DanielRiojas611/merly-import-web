import { redirect } from "next/navigation";
import { BRAND_NAME } from "../../lib/brand";
import { isAdminAuthenticated } from "../../lib/admin-auth";
import { getSiteContentDraft } from "../../lib/site-content-db";
import AdminSiteContent from "./AdminSiteContent";
import "./content-admin.css";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const content = await getSiteContentDraft();

  return (
    <main className="content-admin-page">
      <header className="content-admin-header">
        <div>
          <p>{BRAND_NAME}</p>
          <h1>Banners, textos y botones</h1>
          <span>Guarda un borrador, revisa la portada completa y publica cuando esté lista.</span>
        </div>
        <nav>
          <a href="/admin">Productos</a>
          <a href="/admin/precios">Precios</a>
          <a href="/admin/leads">Leads</a>
          <a href="/admin/contenido/vista-previa" target="_blank" rel="noreferrer">Vista previa</a>
          <form action="/api/admin/logout" method="post"><button type="submit">Cerrar sesion</button></form>
        </nav>
      </header>
      <AdminSiteContent initialContent={content} />
    </main>
  );
}

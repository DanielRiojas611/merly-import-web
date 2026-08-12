import { redirect } from "next/navigation";
import { BRAND_NAME } from "../../lib/brand";
import { isAdminAuthenticated } from "../../lib/admin-auth";
import { listDistributorLeads } from "../../lib/distributor-leads";
import "../admin.css";

export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(new Date(value));
}

export default async function AdminLeadsPage() {
  if (!(await isAdminAuthenticated())) redirect("/admin/login");
  const leads = await listDistributorLeads();

  return (
    <main className="admin-page">
      <header className="admin-header">
        <div>
          <p className="admin-eyebrow">{BRAND_NAME}</p>
          <h1>Leads de distribuidores</h1>
          <span>Solicitudes capturadas desde el formulario comercial.</span>
        </div>
        <nav className="admin-module-links" aria-label="Modulos administrativos">
          <a href="/admin">Productos</a>
          <a href="/admin/precios">Precios</a>
          <a href="/admin/contenido">Contenido</a>
          <a aria-current="page" href="/admin/leads">Leads</a>
          <a href="/catalogo" target="_blank" rel="noreferrer">Vista publica</a>
          <form action="/api/admin/logout" method="post"><button type="submit">Cerrar sesion</button></form>
        </nav>
      </header>

      <section className="admin-card admin-leads-card">
        <div className="admin-section-heading">
          <div>
            <span>Distribuidores</span>
            <h2>{leads.length} registros recientes</h2>
          </div>
        </div>

        {leads.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table admin-leads-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Contacto</th>
                  <th>Ubicacion</th>
                  <th>Negocio</th>
                  <th>Interes</th>
                  <th>Origen</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const utm = [lead.utmSource, lead.utmMedium, lead.utmCampaign, lead.utmContent].filter(Boolean);
                  return (
                    <tr key={lead.id}>
                      <td>
                        <time dateTime={lead.createdAt}>{formatDate(lead.createdAt)}</time>
                        <small>#{lead.id}</small>
                      </td>
                      <td>
                        <strong>{lead.nombre}</strong>
                        <a href={`https://wa.me/${lead.telefono.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                          {lead.telefono}
                        </a>
                        {lead.correo ? <small>{lead.correo}</small> : null}
                      </td>
                      <td>{lead.departamento}</td>
                      <td>{lead.negocio}</td>
                      <td>
                        <strong>{lead.objetivo}</strong>
                        {lead.categorias.length ? <small>{lead.categorias.join(", ")}</small> : null}
                      </td>
                      <td>
                        <strong>{lead.fuente}</strong>
                        {utm.length ? <small>{utm.join(" / ")}</small> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="admin-empty">Todavia no hay solicitudes registradas.</p>
        )}
      </section>
    </main>
  );
}

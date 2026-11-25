import Link from "next/link";
import { BRAND_NAME } from "../lib/brand";

export default function AdminUnavailable({ moduleName }: { moduleName: string }) {
  return <main className="admin-page">
    <header className="admin-header">
      <div><p className="admin-eyebrow">{BRAND_NAME}</p><h1>Administración del sitio web</h1></div>
      <nav className="admin-module-links" aria-label="Módulos administrativos">
        <Link href="/admin">Productos</Link><Link href="/admin/precios">Precios</Link>
        <Link href="/admin/contenido">Contenido</Link><Link href="/admin/leads">Leads</Link>
        <Link href="/catalogo">Vista pública</Link>
        <form action="/api/admin/logout" method="post"><button type="submit">Cerrar sesión</button></form>
      </nav>
    </header>
    <section className="admin-card" role="status">
      <h2>{moduleName}: datos temporalmente no disponibles</h2>
      <p>No podemos consultar la base de datos en este momento. No se ha cargado una lista vacía ni se han reemplazado tus registros.</p>
      <p>La edición y publicación estarán disponibles cuando se restablezca la conexión.</p>
      <a href="">Volver a consultar</a>
    </section>
  </main>;
}

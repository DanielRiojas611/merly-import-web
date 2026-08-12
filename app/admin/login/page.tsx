import { BRAND_NAME } from "../../lib/brand";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error === "blocked"
    ? "Acceso bloqueado temporalmente por varios intentos fallidos. Espera 15 minutos y vuelve a intentarlo."
    : error
      ? "Usuario o contraseña incorrectos."
      : "";

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <p className="admin-eyebrow">{BRAND_NAME}</p>
        <h1>Panel administrativo</h1>
        <p>Acceso exclusivo para gestionar el catalogo y contenido del sitio.</p>
        {errorMessage ? <div className="admin-error">{errorMessage}</div> : null}
        <form action="/api/admin/login" method="post">
          <label>
            Usuario
            <input name="username" autoComplete="username" required />
          </label>
          <label>
            Contrasena
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit">Ingresar</button>
        </form>
      </section>
    </main>
  );
}

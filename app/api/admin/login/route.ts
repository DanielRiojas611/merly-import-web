import { adminCookieOptions, createAdminSession, validAdminCredentials } from "../../../lib/admin-auth";
import { clearLoginFailures, loginBlockSeconds, loginIdentifier, recordLoginFailure } from "../../../lib/admin-login-guard";
import { adminRedirect, isFormMutation } from "../../../lib/admin-request";

export async function POST(request: Request) {
  if (!isFormMutation(request)) return adminRedirect("/admin/login?error=request", request);
  const identifier = loginIdentifier(request);
  try {
    const blockedSeconds = await loginBlockSeconds(identifier);
    if (blockedSeconds > 0) return adminRedirect("/admin/login?error=blocked", request);
  } catch (error) { console.error("No se pudo consultar el control de acceso", error); }

  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim().slice(0, 120);
  const password = String(form.get("password") ?? "").slice(0, 500);
  if (!validAdminCredentials(username, password)) {
    try { await recordLoginFailure(identifier); }
    catch (error) { console.error("No se pudo registrar el intento fallido", error); }
    return adminRedirect("/admin/login?error=1", request);
  }

  try { await clearLoginFailures(identifier); }
  catch (error) { console.error("No se pudo limpiar el control de acceso", error); }
  const response = adminRedirect("/admin", request);
  response.cookies.set({ ...adminCookieOptions(), value: createAdminSession(username) });
  return response;
}

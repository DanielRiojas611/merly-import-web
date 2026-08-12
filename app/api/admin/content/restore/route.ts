import { isAdminAuthenticated } from "../../../../lib/admin-auth";
import { adminJson, isSameOrigin } from "../../../../lib/admin-request";
import { restorePreviousSiteContent } from "../../../../lib/site-content-db";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return adminJson({ error: "unauthorized" }, 401);
  if (!isSameOrigin(request)) return adminJson({ error: "invalid_origin" }, 403);
  try {
    const content = await restorePreviousSiteContent();
    if (!content) return adminJson({ error: "no_previous_version" }, 404);
    return adminJson({ ok: true, content });
  } catch (error) {
    const eventId = crypto.randomUUID();
    console.error("No se pudo restaurar la portada anterior", { eventId, error });
    return adminJson({ error: "restore_failed", eventId }, 500);
  }
}

import { isAdminAuthenticated } from "../../../../lib/admin-auth";
import { adminJson, isJsonMutation } from "../../../../lib/admin-request";
import { persistSiteContentImages } from "../../../../lib/site-content-images";
import { publishSiteContent, type SiteContent } from "../../../../lib/site-content-db";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return adminJson({ error: "unauthorized" }, 401);
  if (!isJsonMutation(request)) return adminJson({ error: "invalid_request" }, 400);
  try {
    const stored = await persistSiteContentImages(await request.json() as SiteContent);
    return adminJson({ ok: true, content: await publishSiteContent(stored) });
  } catch (error) {
    const eventId = crypto.randomUUID();
    const code = error instanceof Error ? error.message : "invalid_content";
    console.error("No se pudo publicar la portada", { eventId, error });
    if (code === "BLOB_STORAGE_NOT_CONFIGURED") return adminJson({ error: "image_storage_not_configured", eventId }, 503);
    if (code === "BLOB_IMAGE_SIZE_INVALID") return adminJson({ error: "image_too_large", eventId }, 413);
    return adminJson({ error: code, eventId }, 400);
  }
}

import { isAdminAuthenticated } from "../../../../lib/admin-auth";
import { adminJson, isJsonMutation } from "../../../../lib/admin-request";
import { persistSiteContentImages } from "../../../../lib/site-content-images";
import { getSiteContentDraft, saveSiteContentDraft, type SiteContent } from "../../../../lib/site-content-db";

function contentError(error: unknown) {
  const code = error instanceof Error ? error.message : "invalid_content";
  if (code === "BLOB_STORAGE_NOT_CONFIGURED") return adminJson({ error: "image_storage_not_configured" }, 503);
  if (code === "BLOB_IMAGE_SIZE_INVALID") return adminJson({ error: "image_too_large" }, 413);
  return adminJson({ error: code }, 400);
}

export async function GET() {
  if (!(await isAdminAuthenticated())) return adminJson({ error: "unauthorized" }, 401);
  return adminJson({ content: await getSiteContentDraft() });
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) return adminJson({ error: "unauthorized" }, 401);
  if (!isJsonMutation(request)) return adminJson({ error: "invalid_request" }, 400);
  try {
    const stored = await persistSiteContentImages(await request.json() as SiteContent);
    return adminJson({ ok: true, content: await saveSiteContentDraft(stored) });
  } catch (error) {
    const eventId = crypto.randomUUID();
    console.error("No se pudo guardar el borrador de la portada", { eventId, error });
    return contentError(error);
  }
}

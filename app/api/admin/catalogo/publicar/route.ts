import { getAdminSession } from "../../../../lib/admin-auth";
import { adminJson, isJsonMutation } from "../../../../lib/admin-request";
import { publishCatalogSnapshot } from "../../../../lib/publish-catalog";

export async function POST(request: Request) {
  if (!(await getAdminSession())) return adminJson({ error: "unauthorized" }, 401);
  if (!isJsonMutation(request)) return adminJson({ error: "invalid_request" }, 400);
  try { return adminJson({ ok: true, total: await publishCatalogSnapshot() }); }
  catch (error) { console.error("Catalog refresh failed", error); return adminJson({ error: "No se pudo actualizar el catálogo público. La última versión publicada se conserva." }, 503); }
}

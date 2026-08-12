import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/admin-auth";
import { setAdminProductActive } from "../../../../lib/admin-products";

const noStore = { "Cache-Control": "no-store" };
function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: noStore }); }

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return json({ error: "unauthorized" }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "invalid_origin" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({ error: "invalid_content_type" }, 415);
  const { id } = await context.params;
  if (!/^[a-z0-9][a-z0-9._-]{0,119}$/.test(id)) return json({ error: "invalid_id" }, 400);
  const body = await request.json() as { isActive?: unknown };
  if (typeof body.isActive !== "boolean") return json({ error: "invalid_state" }, 400);
  try {
    await setAdminProductActive(id, body.isActive, session.username);
    return json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "product_update_failed";
    return json({ error: code }, code === "PRODUCT_NOT_FOUND" ? 404 : 500);
  }
}

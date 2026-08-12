import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../../../lib/admin-auth";
import { restoreProductFromHistory } from "../../../../../../../lib/admin-products";

const noStore = { "Cache-Control": "no-store" };
function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: noStore }); }

export async function POST(request: Request, context: { params: Promise<{ id: string; auditId: string }> }) {
  const session = await getAdminSession();
  if (!session) return json({ error: "unauthorized" }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "invalid_origin" }, 403);
  const { id, auditId } = await context.params;
  const numericAuditId = Number(auditId);
  if (!/^[a-z0-9][a-z0-9._-]{0,119}$/.test(id) || !Number.isSafeInteger(numericAuditId) || numericAuditId <= 0) {
    return json({ error: "invalid_request" }, 400);
  }
  try {
    const product = await restoreProductFromHistory(id, numericAuditId, session.username);
    return json({ ok: true, product });
  } catch (error) {
    const code = error instanceof Error ? error.message : "restore_failed";
    return json({ error: code }, code === "AUDIT_SNAPSHOT_NOT_FOUND" ? 404 : 500);
  }
}

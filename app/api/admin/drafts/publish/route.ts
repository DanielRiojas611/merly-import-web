import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/admin-auth";
import { publishProductDrafts } from "../../../../lib/admin-drafts";

const noStore = { "Cache-Control": "no-store" };
function json(data: unknown, status = 200) { return NextResponse.json(data, { status, headers: noStore }); }

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) return json({ error: "unauthorized" }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return json({ error: "invalid_origin" }, 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return json({ error: "invalid_content_type" }, 415);

  const body = await request.json() as { ids?: string[] };
  const ids = Array.isArray(body.ids)
    ? [...new Set(body.ids.map((id) => String(id).trim()).filter((id) => /^[a-z0-9][a-z0-9._-]{0,119}$/.test(id)))].slice(0, 500)
    : [];
  if (!ids.length) return json({ error: "empty_selection" }, 400);

  try {
    const published = await publishProductDrafts(ids, session.username);
    return json({ ok: true, published });
  } catch (error) {
    const eventId = crypto.randomUUID();
    console.error("Product publish failed", { eventId, error });
    return json({ error: "publish_failed", eventId }, 500);
  }
}

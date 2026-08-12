import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/admin-auth";
import { listProductHistory } from "../../../../../lib/admin-products";

const noStore = { "Cache-Control": "no-store" };

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  const { id } = await context.params;
  if (!/^[a-z0-9][a-z0-9._-]{0,119}$/.test(id)) return NextResponse.json({ error: "invalid_id" }, { status: 400, headers: noStore });
  return NextResponse.json({ history: await listProductHistory(id) }, { headers: noStore });
}

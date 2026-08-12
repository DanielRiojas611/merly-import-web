import { NextResponse } from "next/server";
import { getAdminSession } from "../../../lib/admin-auth";
import { listAdminProducts } from "../../../lib/admin-products";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  if (!(await getAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }
  return NextResponse.json({ products: await listAdminProducts() }, { headers: noStore });
}

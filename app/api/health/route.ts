import { catalogDatabaseErrorCode, pingCatalogDatabase } from "../../lib/neon-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const database = await pingCatalogDatabase();
    return Response.json(
      { ok: true, database },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        database: {
          configured: true,
          reachable: false,
          error: catalogDatabaseErrorCode(error),
        },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

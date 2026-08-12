import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const allowedBusinesses = new Set(["Distribuidor", "Mayorista", "Bodega", "Minimarket", "Botica / Farmacia", "Otro"]);
const allowedObjectives = new Set(["Comprar productos al por mayor", "Distribuir productos en mi ciudad", "Conocer catálogo y precios"]);
const allowedCategories = new Set(["Higiene", "Limpieza", "Hogar", "Ferreteria", "Utiles de oficina", "Mundo Bebe", "Otros"]);
const allowedDepartments = new Set([
  "Amazonas","Áncash","Apurímac","Arequipa","Ayacucho","Cajamarca","Callao","Cusco",
  "Huancavelica","Huánuco","Ica","Junín","La Libertad","Lambayeque","Lima","Loreto",
  "Madre de Dios","Moquegua","Pasco","Piura","Puno","San Martín","Tacna","Tumbes","Ucayali",
]);

function clean(value: unknown, max = 200) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(length) && length > 20_000) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  try {
    const body = await request.json() as Record<string, unknown>;
    const nombre = clean(body.nombre, 160);
    const telefono = clean(body.telefono, 32);
    const correo = clean(body.correo, 200);
    const departamento = clean(body.departamento, 80);
    const negocio = clean(body.negocio, 80);
    const objetivo = clean(body.objetivo, 200);
    const categorias = Array.isArray(body.categorias)
      ? body.categorias.map((item) => clean(item, 60)).filter((item) => allowedCategories.has(item)).slice(0, 4)
      : [];

    if (nombre.length < 3 || !/^\+?[0-9\s-]{9,15}$/.test(telefono) ||
        (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) ||
        !allowedDepartments.has(departamento) || !allowedBusinesses.has(negocio) || !allowedObjectives.has(objetivo)) {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }

    const url = process.env.DATABASE_URL;
    if (!url) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });
    const sql = neon(url);

    const rows = await sql.query(
      `INSERT INTO distributor_leads (
        nombre, telefono, correo, departamento, negocio, objetivo, categorias,
        fuente, utm_source, utm_medium, utm_campaign, utm_content
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id`,
      [
        nombre, telefono, correo || null, departamento, negocio, objetivo, categorias,
        clean(body.fuente, 80) || "web-distribuidor",
        clean(body.utm_source, 200) || null,
        clean(body.utm_medium, 200) || null,
        clean(body.utm_campaign, 200) || null,
        clean(body.utm_content, 200) || null,
      ],
    );

    return NextResponse.json({ ok: true, id: Number((rows[0] as { id: number | string }).id) }, { status: 201 });
  } catch (error) {
    console.error("distributor_lead_error", error);
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}

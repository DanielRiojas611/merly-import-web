import { neon } from "@neondatabase/serverless";

export type DistributorLead = {
  id: number;
  nombre: string;
  telefono: string;
  correo: string | null;
  departamento: string;
  negocio: string;
  objetivo: string;
  categorias: string[];
  fuente: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  createdAt: string;
};

function db() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL_MISSING");
  return neon(url);
}

export async function listDistributorLeads(limit = 200): Promise<DistributorLead[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
  const rows = await db().query(
    `SELECT
       id,
       nombre,
       telefono,
       correo,
       departamento,
       negocio,
       objetivo,
       categorias,
       fuente,
       utm_source AS "utmSource",
       utm_medium AS "utmMedium",
       utm_campaign AS "utmCampaign",
       utm_content AS "utmContent",
       created_at AS "createdAt"
     FROM distributor_leads
     ORDER BY created_at DESC, id DESC
     LIMIT $1`,
    [safeLimit],
  );

  return rows as unknown as DistributorLead[];
}

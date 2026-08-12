import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

const MAX_FAILURES = 5;
const WINDOW_SECONDS = 15 * 60;
const RETENTION_SECONDS = 2 * 24 * 60 * 60;

type GuardState = { failures: number; lastFailure: number; blockedUntil: number };

function database() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL_MISSING");
  return neon(url);
}
function keyFor(identifier: string) {
  const secret = process.env.ADMIN_SESSION_SECRET?.trim();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET_MISSING");
  const digest = createHash("sha256").update(`${secret}:${identifier}`).digest("hex").slice(0, 24);
  return `admin_login_guard_${digest}`;
}
function normalizeState(value: unknown): GuardState {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return { failures: Number(source.failures) || 0, lastFailure: Number(source.lastFailure) || 0, blockedUntil: Number(source.blockedUntil) || 0 };
}

export function loginIdentifier(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

async function cleanupOldStates() {
  const cutoff = new Date(Date.now() - RETENTION_SECONDS * 1000).toISOString();
  await database().query(`DELETE FROM site_settings WHERE key LIKE 'admin_login_guard_%' AND updated_at < $1::timestamptz`, [cutoff]);
}

export async function loginBlockSeconds(identifier: string) {
  await cleanupOldStates();
  const rows = await database().query(`SELECT value FROM site_settings WHERE key=$1 LIMIT 1`, [keyFor(identifier)]);
  const state = normalizeState((rows[0] as { value?: unknown } | undefined)?.value);
  const now = Math.floor(Date.now() / 1000);
  return state.blockedUntil > now ? state.blockedUntil - now : 0;
}

export async function recordLoginFailure(identifier: string) {
  const key = keyFor(identifier);
  const now = Math.floor(Date.now() / 1000);
  await database().query(
    `WITH locked AS (
       SELECT pg_advisory_xact_lock(hashtext($1))
     ), previous AS (
       SELECT value FROM site_settings, locked WHERE key=$1
     ), calculated AS (
       SELECT CASE
         WHEN COALESCE((value->>'lastFailure')::bigint, 0) > $2 - $3
         THEN COALESCE((value->>'failures')::int, 0) + 1 ELSE 1 END AS failures
       FROM locked LEFT JOIN previous ON TRUE
     )
     INSERT INTO site_settings (key, value, updated_at)
     SELECT $1, jsonb_build_object(
       'failures', failures,
       'lastFailure', $2,
       'blockedUntil', CASE WHEN failures >= $4 THEN $2 + $3 ELSE 0 END
     ), NOW()
     FROM calculated
     ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`,
    [key, now, WINDOW_SECONDS, MAX_FAILURES],
  );
}

export async function clearLoginFailures(identifier: string) {
  await database().query(`DELETE FROM site_settings WHERE key=$1`, [keyFor(identifier)]);
}

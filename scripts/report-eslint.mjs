import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";

const file = process.argv[2] ?? "/tmp/eslint-results.json";

if (!existsSync(file)) {
  console.error(`No se generó el reporte de ESLint: ${file}`);
  process.exit(1);
}

const escapeCommand = (value) =>
  String(value)
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");

const results = JSON.parse(readFileSync(file, "utf8"));
let errors = 0;
let warnings = 0;

for (const result of results) {
  const path = relative(process.cwd(), result.filePath).replaceAll("\\", "/");

  for (const message of result.messages) {
    const level = message.severity === 2 ? "error" : "warning";
    const rule = message.ruleId ? ` (${message.ruleId})` : "";
    const text = escapeCommand(`${message.message}${rule}`);
    const line = message.line ?? 1;
    const column = message.column ?? 1;

    console.log(`::${level} file=${path},line=${line},col=${column}::${text}`);

    if (message.severity === 2) errors += 1;
    else if (message.severity === 1) warnings += 1;
  }
}

console.log(`ESLint: ${errors} error(es), ${warnings} advertencia(s).`);
process.exitCode = errors > 0 || warnings > 0 ? 1 : 0;

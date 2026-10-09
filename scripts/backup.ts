/**
 * Saves a copy of every table as a JSON file, so the union's data does not depend on one database.
 *
 *   npx tsx scripts/backup.ts [folder]
 *
 * The default folder is ../nrmu-backups/<date-time> (next to the project, never inside it, so it can
 * not be committed by mistake). Password hashes are left out; the files still hold members' phone
 * numbers and grievances, so keep them private.
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

config({ path: path.resolve(__dirname, "..", ".env.local") });

const SECRET_COLUMNS = new Set(["password_hash"]);

async function main() {
  const db = getDb();
  const rows = (r: unknown) => ((r as { rows?: unknown[] }).rows ?? r) as Record<string, unknown>[];
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
  const dir = path.resolve(process.argv[2] ?? path.join(__dirname, "..", "..", "nrmu-backups", stamp));
  fs.mkdirSync(dir, { recursive: true });

  const tables = rows(await db.execute(sql`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1`)).map((r) => String(r.table_name));
  let total = 0;
  const summary: Record<string, number> = {};
  for (const table of tables) {
    if (table.startsWith("__drizzle")) continue;
    const data = rows(await db.execute(sql.raw(`select * from "${table}"`))).map((row) => Object.fromEntries(Object.entries(row).filter(([k]) => !SECRET_COLUMNS.has(k))));
    fs.writeFileSync(path.join(dir, `${table}.json`), JSON.stringify(data));
    summary[table] = data.length;
    total += data.length;
  }
  fs.writeFileSync(path.join(dir, "_summary.json"), JSON.stringify({ takenAt: new Date().toISOString(), tables: summary }, null, 2));
  console.log(`\nBackup saved: ${dir}\n${Object.keys(summary).length} tables, ${total} rows.\n`);
}

main().catch((e) => {
  console.error("\nBackup failed:", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});

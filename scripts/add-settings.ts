/**
 * Adds any site text from scripts/data/extra-settings.json that the database does not have yet.
 * It never changes or removes text that already exists, so edits made in the admin are kept.
 * Run: npx tsx scripts/add-settings.ts
 */
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
config({ path: ".env.local" });

async function main() {
  const { getDb, schema } = await import("../src/db");
  const file = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts/data/extra-settings.json"), "utf8")) as Record<string, { en: string; hi: string; group: string }>;
  const rows = Object.entries(file).map(([key, v]) => ({ key, valueEn: v.en, valueHi: v.hi || null, group: v.group }));
  const db = getDb();
  const inserted = await db.insert(schema.siteSettings).values(rows).onConflictDoNothing().returning({ key: schema.siteSettings.key });
  console.log(`${inserted.length} new text item(s) added, ${rows.length - inserted.length} already present and left as they are.`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Fills the privacy, terms and accessibility pages from scripts/data/policy-pages.json, but only where the page is still empty,
 * so text edited in the admin is never overwritten.   Run: npx tsx scripts/add-policy-pages.ts
 */
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
config({ path: ".env.local" });

async function main() {
  const { getDb } = await import("../src/db");
  const pages = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts/data/policy-pages.json"), "utf8")) as Record<string, { en: string; hi: string }>;
  const db = getDb();
  for (const [slug, c] of Object.entries(pages)) {
    const r = await db.execute(
      sql`update pages set content_html = ${c.en}, content_html_hi = ${c.hi}, updated_at = now() where slug = ${slug} and length(trim(content_html)) = 0 returning slug`,
    );
    console.log(slug, (r.rows ?? []).length ? "filled" : "already has text, left as it is");
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

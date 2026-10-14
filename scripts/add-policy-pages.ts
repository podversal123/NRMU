/**
 * Fills the policy pages (privacy, terms, accessibility, disclaimer, copyright, hyperlinking, help) from
 * scripts/data/policy-pages.json. A page that does not exist yet is created; an existing page is filled only while it
 * is still empty, so text edited in the admin is never overwritten.   Run: npx tsx scripts/add-policy-pages.ts
 */
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
config({ path: ".env.local" });

type PageText = { en: string; hi: string; titleEn?: string; titleHi?: string };

async function main() {
  const { getDb } = await import("../src/db");
  const pages = JSON.parse(fs.readFileSync(path.join(process.cwd(), "scripts/data/policy-pages.json"), "utf8")) as Record<string, PageText>;
  const db = getDb();
  for (const [slug, c] of Object.entries(pages)) {
    if (c.titleEn) {
      const made = await db.execute(
        sql`insert into pages (slug, title_en, title_hi, content_html, content_html_hi) values (${slug}, ${c.titleEn}, ${c.titleHi ?? null}, ${c.en}, ${c.hi})
            on conflict (slug) do nothing returning slug`,
      );
      if ((made.rows ?? []).length) {
        console.log(slug, "created");
        continue;
      }
    }
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

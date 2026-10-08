import type { MetadataRoute } from "next";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { locales } from "@/lib/i18n";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.nrmu.net";

/** Every public address in both languages, generated from the database. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const db = getDb();
  const rows = (r: unknown) => ((r as { rows?: unknown[] }).rows ?? r) as { path: string; at: string | null }[];
  const [posts, divisions, pages, nav] = await Promise.all([
    db.execute(sql`select '/orders/' || id as path, updated_at::text as at from posts where status = 'published'`),
    db.execute(sql`select '/divisions/' || slug as path, null as at from divisions where active`),
    // a page with no text yet (privacy, terms...) is not worth indexing
    db.execute(sql`select '/pages/' || slug as path, updated_at::text as at from pages where length(trim(content_html)) > 0 or length(trim(coalesce(content_html_hi, ''))) > 0`),
    // dropdown parents have no page of their own (their link is "#")
    db.execute(sql`select href as path, null as at from nav_items where area = 'header' and active and href like '/%' and href not like '%#%'`),
  ]);
  const all = [{ path: "", at: null }, ...rows(nav), ...rows(divisions), ...rows(pages), ...rows(posts), { path: "/join", at: null }, { path: "/grievance", at: null }];
  const seen = new Set<string>();
  return locales.flatMap((lang) =>
    all
      .filter((x) => !seen.has(lang + x.path) && seen.add(lang + x.path))
      .map((x) => ({ url: `${base}/${lang}${x.path}`, lastModified: x.at ? new Date(x.at) : undefined })),
  );
}

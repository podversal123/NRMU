import { cacheLife, cacheTag } from "next/cache";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { UI_KEYS, type Dict, type Lang } from "./i18n";

const { categories, designations, divisions, navItems, officeBearers, postCategories, posts, quickLinks, searchChips, siteSettings } = schema;

/** Pick the Hindi value when the language is Hindi and a translation exists. */
export const pick = (lang: Lang, en: string | null | undefined, hi: string | null | undefined) =>
  lang === "hi" && hi ? hi : (en ?? "");

/* ----------------------------- Site config ----------------------------- */

export type Settings = Record<string, { en: string; hi: string | null }>;

export async function getSettings(): Promise<Settings> {
  "use cache";
  cacheLife("hours");
  cacheTag("settings");
  const rows = await getDb().select().from(siteSettings);
  return Object.fromEntries(rows.map((r) => [r.key, { en: r.valueEn, hi: r.valueHi }]));
}

export const setting = (s: Settings, key: string, lang: Lang) => pick(lang, s[key]?.en, s[key]?.hi);

export async function getNav(area: "header" | "footer") {
  "use cache";
  cacheLife("hours");
  cacheTag("nav");
  return getDb()
    .select()
    .from(navItems)
    .where(and(eq(navItems.area, area), eq(navItems.active, true)))
    .orderBy(asc(navItems.sort));
}

export async function getQuickLinks() {
  "use cache";
  cacheLife("hours");
  cacheTag("nav");
  return getDb().select().from(quickLinks).where(eq(quickLinks.active, true)).orderBy(asc(quickLinks.sort));
}

export async function getSearchChips() {
  "use cache";
  cacheLife("hours");
  cacheTag("nav");
  return getDb().select().from(searchChips).orderBy(asc(searchChips.sort));
}

/* ----------------------------- Organisation ---------------------------- */

export async function getDivisions() {
  "use cache";
  cacheLife("hours");
  cacheTag("divisions");
  return getDb().select().from(divisions).where(eq(divisions.active, true)).orderBy(asc(divisions.sort));
}

export async function getFeaturedLeaders() {
  "use cache";
  cacheLife("hours");
  cacheTag("officials");
  return getDb()
    .select({
      id: officeBearers.id,
      nameEn: officeBearers.nameEn,
      nameHi: officeBearers.nameHi,
      photoUrl: officeBearers.photoUrl,
      placeLabel: officeBearers.placeLabel,
      designationEn: designations.nameEn,
      designationHi: designations.nameHi,
    })
    .from(officeBearers)
    .leftJoin(designations, eq(designations.id, officeBearers.designationId))
    .where(and(eq(officeBearers.featured, true), eq(officeBearers.active, true)))
    .orderBy(asc(officeBearers.sort));
}

/* ------------------------------- Content ------------------------------- */

export async function getCategories() {
  "use cache";
  cacheLife("hours");
  cacheTag("categories");
  return getDb().select().from(categories);
}


export type PostCard = {
  id: number;
  titleEn: string;
  titleHi: string | null;
  publishedAt: string;
  files: number;
  label: { en: string; hi: string | null } | null;
};

export async function getLatestPosts(limit: number): Promise<PostCard[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  const db = getDb();
  const rows = await db
    .select({ id: posts.id, titleEn: posts.titleEn, titleHi: posts.titleHi, publishedAt: posts.publishedAt, files: sql<number>`(select count(*) from post_files pf where pf.post_id = ${posts.id})` })
    .from(posts)
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.publishedAt), desc(posts.id))
    .limit(limit);
  if (!rows.length) return [];

  const [links, cats] = await Promise.all([
    db.select().from(postCategories).where(inArray(postCategories.postId, rows.map((r) => r.id))),
    getCategories(),
  ]);
  const byId = new Map(cats.map((c) => [c.id, c]));
  const depth = (id: number) => {
    let d = 0;
    let cur = byId.get(id);
    while (cur?.parentId) {
      d++;
      cur = byId.get(cur.parentId);
    }
    return d;
  };
  return rows.map((r) => {
    const best = links
      .filter((l) => l.postId === r.id && byId.has(l.categoryId) && !byId.get(l.categoryId)!.hidden)
      .sort((a, b) => depth(b.categoryId) - depth(a.categoryId))[0];
    const cat = best ? byId.get(best.categoryId)! : null;
    return {
      id: r.id,
      titleEn: r.titleEn,
      titleHi: r.titleHi,
      publishedAt: r.publishedAt,
      files: Number(r.files),
      label: cat ? { en: cat.nameEn, hi: cat.nameHi } : null,
    };
  });
}

export async function getArchiveStats() {
  "use cache";
  cacheLife("hours");
  cacheTag("posts");
  const db = getDb();
  const [[row], [b]] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        since: sql<string>`extract(year from min(${posts.publishedAt}))::int::text`,
      })
      .from(posts)
      .where(eq(posts.status, "published")),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.branches)
      .innerJoin(divisions, eq(divisions.id, schema.branches.divisionId))
      .where(eq(divisions.active, true)),
  ]);
  return { ...row, branches: b.n };
}

export function formatDate(iso: string, lang: Lang) {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

/* ------------------------- Interface wording (database) ------------------------- */


/** Interface wording for a language, read from the "ui.*" settings. Missing keys come back empty (never hardcoded text). */
export async function getUi(lang: Lang): Promise<Dict> {
  const s = await getSettings();
  const out = {} as Dict;
  for (const k of UI_KEYS) out[k] = pick(lang, s[`ui.${k}`]?.en, s[`ui.${k}`]?.hi);
  return out;
}

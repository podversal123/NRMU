import { cacheLife, cacheTag } from "next/cache";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { UI_KEYS, intlLocale, type Dict, type ExtraLang, type I18n, type Lang } from "./i18n";
import { noEmDash } from "./text";

const { categories, designations, divisions, navItems, officeBearers, postCategories, posts, searchChips, siteSettings } = schema;

/** One field's text in the languages other than English and Hindi (one entry of an `i18n` column). */
export type Tr = Partial<Record<ExtraLang, string>> | null | undefined;

/**
 * The text for the visitor's language: Hindi from the Hindi column, the other languages from the `i18n` column
 * (pass `row.i18n.<field>`). Text not translated yet is shown in English.
 */
export const pick = (lang: Lang, en: string | null | undefined, hi: string | null | undefined, tr: Tr) => {
  const own = lang === "en" ? en : lang === "hi" ? hi : tr?.[lang];
  return noEmDash(own || (en ?? ""));
};

/** `pick` for a row with `<field>En`, `<field>Hi` and `i18n` (for example `tr(lang, division, "name")`). */
export function tr<F extends string>(lang: Lang, row: { [K in `${F}En` | `${F}Hi`]?: string | null } & { i18n?: I18n | null }, field: F) {
  const r = row as Record<string, string | null | undefined>;
  return pick(lang, r[`${field}En`], r[`${field}Hi`], row.i18n?.[field]);
}

/* ----------------------------- Site config ----------------------------- */

export type Settings = Record<string, { en: string; hi: string | null; tr: Tr }>;

export async function getSettings(): Promise<Settings> {
  "use cache";
  cacheLife("hours");
  cacheTag("settings");
  const rows = await getDb().select().from(siteSettings);
  return Object.fromEntries(rows.map((r) => [r.key, { en: r.valueEn, hi: r.valueHi, tr: r.i18n.value }]));
}

export const setting = (s: Settings, key: string, lang: Lang) => pick(lang, s[key]?.en, s[key]?.hi, s[key]?.tr);

/** `withHidden` also returns items switched off in the admin (used for page titles of sections taken out of the menu). */
export async function getNav(area: "header" | "footer" | "quick", withHidden = false) {
  "use cache";
  cacheLife("hours");
  cacheTag("nav");
  return getDb()
    .select()
    .from(navItems)
    .where(withHidden ? eq(navItems.area, area) : and(eq(navItems.area, area), eq(navItems.active, true)))
    .orderBy(asc(navItems.sort));
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

/** Every branch (sub-division) with the division it belongs to, for the registration form. */
export async function getBranches() {
  "use cache";
  cacheLife("hours");
  cacheTag("divisions");
  return getDb()
    .select({ id: schema.branches.id, divisionId: schema.branches.divisionId, nameEn: schema.branches.nameEn, nameHi: schema.branches.nameHi, i18n: schema.branches.i18n })
    .from(schema.branches)
    .orderBy(asc(schema.branches.divisionId), asc(schema.branches.sort));
}

/** The fields a member can work in. */
export async function getDepartments() {
  "use cache";
  cacheLife("hours");
  cacheTag("departments");
  return getDb().select().from(schema.departments).where(eq(schema.departments.active, true)).orderBy(asc(schema.departments.sort));
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
      i18n: officeBearers.i18n,
      photoUrl: officeBearers.photoUrl,
      placeLabel: officeBearers.placeLabel,
      designationEn: designations.nameEn,
      designationHi: designations.nameHi,
      designationI18n: designations.i18n,
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
  i18n: I18n;
  publishedAt: string;
  files: number;
  label: { en: string; hi: string | null; tr: Tr } | null;
};

export async function getLatestPosts(limit: number): Promise<PostCard[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  const db = getDb();
  const rows = await db
    .select({ id: posts.id, titleEn: posts.titleEn, titleHi: posts.titleHi, i18n: posts.i18n, publishedAt: posts.publishedAt, files: sql<number>`(select count(*) from post_files pf where pf.post_id = ${posts.id})` })
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
      i18n: r.i18n,
      publishedAt: r.publishedAt,
      files: Number(r.files),
      label: cat ? { en: cat.nameEn, hi: cat.nameHi, tr: cat.i18n.name } : null,
    };
  });
}

export function formatDate(iso: string, lang: Lang) {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat(intlLocale(lang), { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

/* ------------------------- Interface wording (database) ------------------------- */


/** Interface wording for a language, read from the "ui.*" settings. Missing keys come back empty (never hardcoded text). */
export async function getUi(lang: Lang): Promise<Dict> {
  const s = await getSettings();
  const out = {} as Dict;
  for (const k of UI_KEYS) out[k] = setting(s, `ui.${k}`, lang);
  return out;
}

/* ------------------------------ Portal layout ------------------------------ */

export type MenuItem = { id: number; labelEn: string; labelHi: string | null; i18n: I18n; href: string; children: MenuItem[] };

/** Header menu as a tree: top-level items, each with its dropdown entries. */
export async function getMenu(): Promise<MenuItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("nav");
  const rows = await getDb()
    .select()
    .from(navItems)
    .where(and(eq(navItems.area, "header"), eq(navItems.active, true)))
    .orderBy(asc(navItems.sort), asc(navItems.id));
  const byParent = new Map<number | null, typeof rows>();
  for (const r of rows) byParent.set(r.parentId, [...(byParent.get(r.parentId) ?? []), r]);
  const build = (parent: number | null): MenuItem[] =>
    (byParent.get(parent) ?? []).map((r) => ({ id: r.id, labelEn: r.labelEn, labelHi: r.labelHi, i18n: r.i18n, href: r.href, children: build(r.id) }));
  return build(null);
}

/** "links" = important links (usually external), "policy" = footer legal links. Policy pages without content are left out. */
export async function getFooterLinks(area: "links" | "policy") {
  "use cache";
  cacheLife("hours");
  cacheTag("nav", "pages");
  const db = getDb();
  const rows = await db
    .select()
    .from(navItems)
    .where(and(eq(navItems.area, area), eq(navItems.active, true)))
    .orderBy(asc(navItems.sort), asc(navItems.id));
  if (area === "links") return rows;
  const filled = new Set(
    (await db.execute(sql`select slug from pages where length(trim(content_html)) > 0`)).rows.map((r) => String((r as { slug: string }).slug)),
  );
  return rows.filter((r) => !r.href.startsWith("/pages/") || filled.has(r.href.slice("/pages/".length)));
}

/** Most recent change to published content, shown as "Last updated" in the footer. */
export async function getLastUpdated() {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts", "pages");
  const r = await getDb().execute(sql`select greatest((select max(updated_at) from posts where status = 'published'), (select max(updated_at) from pages))::date::text as d`);
  return String((r.rows[0] as { d: string | null } | undefined)?.d ?? "");
}

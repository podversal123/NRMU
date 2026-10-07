import { cacheLife, cacheTag } from "next/cache";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";

const { categories, designations, divisions, officeBearers, postCategories, posts } = schema;

const rowsOf = <T,>(r: unknown) => ((r as { rows?: unknown[] }).rows ?? r) as T[];

/* ------------------------- Orders: list, search, detail ------------------------- */

export type ListParams = { q?: string; cat?: string; year?: number; page?: number };
export const PAGE_SIZE = 20;

/** "mutual transfer" -> "mutual:* & transfer:*" (prefix search, safe characters only). */
function toTsQuery(q: string) {
  const words = q.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return words
    .slice(0, 8)
    .map((w) => `${w}:*`)
    .join(" & ");
}

export type ListRow = {
  id: number;
  titleEn: string;
  titleHi: string | null;
  publishedAt: string;
  files: number;
  labelEn: string | null;
};

export async function queryPosts({ q, cat, year, page = 1 }: ListParams) {
  const db = getDb();
  const conds = [sql`p.status = 'published'`];
  if (year) conds.push(sql`extract(year from p.published_at) = ${year}`);
  if (cat) {
    conds.push(sql`exists (
      select 1 from post_categories pc
      where pc.post_id = p.id and pc.category_id in (
        with recursive tree as (
          select id from categories where slug = ${cat}
          union all
          select c.id from categories c join tree t on c.parent_id = t.id
        ) select id from tree
      )
    )`);
  }
  const tsq = q ? toTsQuery(q) : "";
  if (tsq) conds.push(sql`p.search @@ to_tsquery('simple', ${tsq})`);
  const where = sql.join(conds, sql` and `);
  const order = tsq
    ? sql`ts_rank(p.search, to_tsquery('simple', ${tsq})) desc, p.published_at desc, p.id desc`
    : sql`p.published_at desc, p.id desc`;
  const offset = (Math.max(1, page) - 1) * PAGE_SIZE;

  const [rows, count] = await Promise.all([
    db.execute(sql`
      select p.id, p.title_en as "titleEn", p.title_hi as "titleHi", p.published_at::text as "publishedAt",
             (select count(*)::int from post_files pf where pf.post_id = p.id) as files,
             (select c.name_en from post_categories pc join categories c on c.id = pc.category_id
               where pc.post_id = p.id and not c.hidden
               order by c.parent_id is null, c.id desc limit 1) as "labelEn"
      from posts p where ${where} order by ${order} limit ${PAGE_SIZE} offset ${offset}`),
    db.execute(sql`select count(*)::int as n from posts p where ${where}`),
  ]);
  return { rows: rowsOf<ListRow>(rows), total: Number(rowsOf<{ n: number }>(count)[0].n) };
}

/** Un-searched listings are the common case, so they are cached; free-text searches go straight to the database. */
export async function listPostsCached(params: Omit<ListParams, "q">) {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  return queryPosts(params);
}

export type CategoryNode = { id: number; slug: string; parentId: number | null; nameEn: string; nameHi: string | null; hidden: boolean; n: number; total: number };

export async function getCategoryTree() {
  "use cache";
  cacheLife("hours");
  cacheTag("categories", "posts");
  const rows = await getDb().execute(sql`
    with recursive closure(ancestor, id) as (
      select id, id from categories
      union all
      select cl.ancestor, k.id from closure cl join categories k on k.parent_id = cl.id
    )
    select c.id, c.slug, c.parent_id as "parentId", c.name_en as "nameEn", c.name_hi as "nameHi", c.hidden,
           (select count(*)::int from post_categories pc where pc.category_id = c.id) as n,
           (select count(distinct pc.post_id)::int from closure cl join post_categories pc on pc.category_id = cl.id where cl.ancestor = c.id) as total
    from categories c order by c.sort`);
  return rowsOf<CategoryNode>(rows);
}

export async function getYears() {
  "use cache";
  cacheLife("hours");
  cacheTag("posts");
  const rows = await getDb().execute(sql`
    select extract(year from published_at)::int as y, count(*)::int as n from posts where status = 'published' group by 1 order by 1 desc`);
  return rowsOf<{ y: number; n: number }>(rows);
}

export async function getPost(id: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("posts", `post-${id}`);
  const db = getDb();
  const [post] = await db
    .select()
    .from(posts)
    .where(and(eq(posts.id, id), eq(posts.status, "published")))
    .limit(1);
  if (!post) return null;
  const cats = await db
    .select({ slug: categories.slug, nameEn: categories.nameEn, nameHi: categories.nameHi, id: categories.id })
    .from(postCategories)
    .innerJoin(categories, eq(categories.id, postCategories.categoryId))
    .where(and(eq(postCategories.postId, id), eq(categories.hidden, false)));
  const files = await db.select().from(schema.postFiles).where(eq(schema.postFiles.postId, id)).orderBy(asc(schema.postFiles.sort), asc(schema.postFiles.id));
  return {
    id: post.id,
    titleEn: post.titleEn,
    titleHi: post.titleHi,
    publishedAt: post.publishedAt,
    contentHtml: post.contentHtml,
    files: files.map((f) => ({ url: f.url, name: f.name, kind: f.kind })),
    cats,
  };
}

export async function getRecentPostIds(limit: number) {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  const rows = await getDb().select({ id: posts.id }).from(posts).orderBy(desc(posts.publishedAt)).limit(limit);
  return rows.map((r) => r.id);
}

/* ------------------------- Officials, divisions, pages ------------------------- */

export async function getOfficials() {
  "use cache";
  cacheLife("hours");
  cacheTag("officials");
  return getDb()
    .select({
      id: officeBearers.id,
      scope: officeBearers.scope,
      nameEn: officeBearers.nameEn,
      nameHi: officeBearers.nameHi,
      designationEn: designations.nameEn,
      designationHi: designations.nameHi,
      placeLabel: officeBearers.placeLabel,
      addressEn: officeBearers.addressEn,
      phone: officeBearers.phone,
      photoUrl: officeBearers.photoUrl,
      sort: officeBearers.sort,
      divisionSlug: divisions.slug,
      divisionEn: divisions.nameEn,
      divisionHi: divisions.nameHi,
    })
    .from(officeBearers)
    .leftJoin(divisions, eq(divisions.id, officeBearers.divisionId))
    .leftJoin(designations, eq(designations.id, officeBearers.designationId))
    .where(eq(officeBearers.active, true))
    .orderBy(asc(officeBearers.scope), asc(designations.sort), asc(officeBearers.sort), asc(officeBearers.id));
}

export async function getDivisionDetail(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("divisions", "officials");
  const db = getDb();
  const [d] = await db
    .select()
    .from(divisions)
    .where(and(eq(divisions.slug, slug), eq(divisions.active, true)))
    .limit(1);
  if (!d) return null;
  const [people, branchRows] = await Promise.all([
    db
      .select({
        id: officeBearers.id,
        scope: officeBearers.scope,
        nameEn: officeBearers.nameEn,
        nameHi: officeBearers.nameHi,
        designationEn: designations.nameEn,
        designationHi: designations.nameHi,
        placeLabel: officeBearers.placeLabel,
        addressEn: officeBearers.addressEn,
        phone: officeBearers.phone,
        photoUrl: officeBearers.photoUrl,
      })
      .from(officeBearers)
      .leftJoin(designations, eq(designations.id, officeBearers.designationId))
      .where(and(eq(officeBearers.divisionId, d.id), eq(officeBearers.active, true)))
      .orderBy(asc(designations.sort), asc(officeBearers.sort), asc(officeBearers.id)),
    db.select().from(schema.branches).where(eq(schema.branches.divisionId, d.id)).orderBy(asc(schema.branches.sort)),
  ]);
  return { division: d, people, branches: branchRows };
}

export async function getPages(pattern: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("pages");
  const rows = await getDb().execute(
    sql`select slug, title_en as "titleEn", title_hi as "titleHi" from pages where slug ~* ${pattern} order by title_en`,
  );
  return rowsOf<{ slug: string; titleEn: string; titleHi: string | null }>(rows);
}

export async function getPage(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("pages");
  const [p] = await getDb().select().from(schema.pages).where(eq(schema.pages.slug, slug)).limit(1);
  return p ?? null;
}

export async function getDivisionCards() {
  "use cache";
  cacheLife("hours");
  cacheTag("divisions", "officials");
  const rows = await getDb().execute(sql`
    select d.slug, d.name_en as "nameEn", d.name_hi as "nameHi",
           (select count(*)::int from branches b where b.division_id = d.id) as branches,
           (select count(*)::int from office_bearers o where o.division_id = d.id and o.scope = 'branch_secretary' and o.active) as secretaries,
           (select o.name_en from office_bearers o where o.division_id = d.id and o.scope = 'division_secretary' and o.active order by o.sort, o.id limit 1) as "secretaryEn",
           (select o.name_hi from office_bearers o where o.division_id = d.id and o.scope = 'division_secretary' and o.active order by o.sort, o.id limit 1) as "secretaryHi",
           (select o.name_en from office_bearers o where o.division_id = d.id and o.scope = 'division_president' and o.active order by o.sort, o.id limit 1) as "presidentEn",
           (select o.name_hi from office_bearers o where o.division_id = d.id and o.scope = 'division_president' and o.active order by o.sort, o.id limit 1) as "presidentHi"
    from divisions d where d.active order by d.sort`);
  return rowsOf<{
    slug: string; nameEn: string; nameHi: string | null; branches: number; secretaries: number;
    secretaryEn: string | null; secretaryHi: string | null; presidentEn: string | null; presidentHi: string | null;
  }>(rows);
}

export type CardRow ={ id: number; titleEn: string; titleHi: string | null; publishedAt: string; thumbUrl: string | null };

export async function getPostsByCategory(slug: string, limit: number, withImage = false) {
  "use cache";
  cacheLife("hours");
  cacheTag("posts");
  const rows = await getDb().execute(sql`
    select p.id, p.title_en as "titleEn", p.title_hi as "titleHi", p.published_at::text as "publishedAt", p.thumb_url as "thumbUrl"
    from posts p
    where p.status = 'published' ${withImage ? sql`and p.thumb_url is not null` : sql``} and exists (
      select 1 from post_categories pc where pc.post_id = p.id and pc.category_id in (
        with recursive tree as (
          select id from categories where slug = ${slug}
          union all
          select c.id from categories c join tree t on c.parent_id = t.id
        ) select id from tree))
    order by p.published_at desc, p.id desc limit ${limit}`);
  return rowsOf<CardRow>(rows);
}

/* ------------------------------- Gallery ------------------------------- */

export type GalleryRow = { id: number; url: string; captionEn: string; captionHi: string | null; takenOn: string | null; featured: boolean };

export async function getGalleryPhotos(limit: number, featuredFirst = false): Promise<GalleryRow[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("gallery");
  const rows = await getDb().execute(sql`
    select id, url, caption_en as "captionEn", caption_hi as "captionHi", taken_on::text as "takenOn", featured
    from gallery_photos where active
    order by ${featuredFirst ? sql`featured desc,` : sql``} sort asc, taken_on desc nulls last, id desc
    limit ${limit}`);
  return rowsOf<GalleryRow>(rows);
}

/* -------------------------------- Events -------------------------------- */

export type EventRow = {
  id: number;
  titleEn: string;
  titleHi: string | null;
  startsAt: string;
  endsAt: string | null;
  venueEn: string | null;
  venueHi: string | null;
  descriptionEn: string | null;
  descriptionHi: string | null;
  divisionEn: string | null;
  divisionHi: string | null;
  agendaUrl: string | null;
  minutesUrl: string | null;
};

const EVENT_COLS = sql`e.id, e.title_en as "titleEn", e.title_hi as "titleHi", e.starts_at::text as "startsAt", e.ends_at::text as "endsAt",
  e.venue_en as "venueEn", e.venue_hi as "venueHi", e.description_en as "descriptionEn", e.description_hi as "descriptionHi",
  d.name_en as "divisionEn", d.name_hi as "divisionHi", e.agenda_url as "agendaUrl", e.minutes_url as "minutesUrl"`;

/** Upcoming events (soonest first) and past events (latest first). */
export async function getEvents(pastLimit = 30, upcomingLimit = 50) {
  "use cache";
  cacheLife("minutes");
  cacheTag("events");
  const db = getDb();
  const [up, past] = await Promise.all([
    db.execute(sql`select ${EVENT_COLS} from events e left join divisions d on d.id = e.division_id
                   where e.published and coalesce(e.ends_at, e.starts_at) >= now() order by e.starts_at asc limit ${upcomingLimit}`),
    db.execute(sql`select ${EVENT_COLS} from events e left join divisions d on d.id = e.division_id
                   where e.published and coalesce(e.ends_at, e.starts_at) < now() order by e.starts_at desc limit ${pastLimit}`),
  ]);
  return { upcoming: rowsOf<EventRow>(up), past: rowsOf<EventRow>(past) };
}

export async function getGrievanceTypes() {
  "use cache";
  cacheLife("hours");
  cacheTag("grievance-types");
  return getDb().select().from(schema.grievanceTypes).where(eq(schema.grievanceTypes.active, true)).orderBy(asc(schema.grievanceTypes.sort));
}

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

export type OfficePerson = {
  id: number;
  nameEn: string;
  nameHi: string | null;
  designationEn: string | null;
  designationHi: string | null;
  placeLabel: string | null;
  addressEn: string | null;
  phone: string | null;
  photoUrl: string | null;
};

/**
 * All office bearers in the three parts the union asked for: central, divisional (a part for every division)
 * and branch (a part for every branch, grouped by division). Divisions and branches without a person are
 * kept, so the page can say that their details are still to come.
 */
export async function getOfficeBearerParts() {
  "use cache";
  cacheLife("hours");
  cacheTag("officials", "divisions");
  const db = getDb();
  const [divs, branches, people] = await Promise.all([
    db.select().from(divisions).where(eq(divisions.active, true)).orderBy(asc(divisions.sort)),
    db.select().from(schema.branches).orderBy(asc(schema.branches.divisionId), asc(schema.branches.sort), asc(schema.branches.id)),
    db
      .select({
        id: officeBearers.id,
        scope: officeBearers.scope,
        divisionId: officeBearers.divisionId,
        branchId: officeBearers.branchId,
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
      .where(eq(officeBearers.active, true))
      .orderBy(asc(designations.sort), asc(officeBearers.sort), asc(officeBearers.id)),
  ]);
  const strip = ({ id, nameEn, nameHi, designationEn, designationHi, placeLabel, addressEn, phone, photoUrl }: (typeof people)[number]): OfficePerson => ({ id, nameEn, nameHi, designationEn, designationHi, placeLabel, addressEn, phone, photoUrl });
  return {
    central: people.filter((p) => p.scope === "central").map(strip),
    divisions: divs.map((d) => ({
      division: d,
      leaders: people.filter((p) => p.divisionId === d.id && (p.scope === "division_president" || p.scope === "division_secretary")).map(strip),
      branches: branches
        .filter((b) => b.divisionId === d.id)
        .map((b) => ({ branch: b, secretaries: people.filter((p) => p.scope === "branch_secretary" && p.branchId === b.id).map(strip) })),
    })),
  };
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

/** Newest posts of a category (and its sub-categories); `excludeIds` keeps a post from showing twice on the same page. */
export async function getPostsByCategory(slug: string, limit: number, withImage = false, excludeIds: number[] = []) {
  "use cache";
  cacheLife("hours");
  cacheTag("posts");
  const rows = await getDb().execute(sql`
    select p.id, p.title_en as "titleEn", p.title_hi as "titleHi", p.published_at::text as "publishedAt", p.thumb_url as "thumbUrl"
    from posts p
    where p.status = 'published' ${withImage ? sql`and p.thumb_url is not null` : sql``}
      ${excludeIds.length ? sql`and p.id not in (${sql.join(excludeIds.map((i) => sql`${i}`), sql`, `)})` : sql``} and exists (
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

/* ------------------------- Public meetings ------------------------- */

export type PublicMeetingType = { id: number; nameEn: string; nameHi: string | null; count: number };

/**
 * The public Meetings page lists these kinds as its headings. Only meetings the super admin marked public
 * are ever read here, and only the columns below: the invitees, attendance, recording and private notes never leave the admin.
 */
export async function getPublicMeetingTypes(): Promise<PublicMeetingType[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("meetings");
  const rows = await getDb().execute(sql`
    select t.id, t.name_en as "nameEn", t.name_hi as "nameHi",
           (select count(*)::int from meetings m where m.type_id = t.id and m.is_public and m.status <> 'cancelled') as count
    from meeting_types t where t.active and t.show_public order by t.sort, t.id`);
  return rowsOf<PublicMeetingType>(rows);
}

export type PublicMeeting = {
  id: number;
  typeId: number;
  titleEn: string;
  titleHi: string | null;
  startsAt: string;
  endsAt: string;
  mode: string;
  status: string;
  venueEn: string | null;
  venueHi: string | null;
  divisionEn: string | null;
  divisionHi: string | null;
  agendaEn: string | null;
  agendaHi: string | null;
  resolutionsEn: string | null;
  resolutionsHi: string | null;
  minutesUrl: string | null;
  minutesText: string | null;
  noticeUrl: string | null;
};

const MEETING_COLS = sql`m.id, m.type_id as "typeId", m.title_en as "titleEn", m.title_hi as "titleHi", m.starts_at::text as "startsAt", m.ends_at::text as "endsAt",
  m.mode, m.status, m.venue_en as "venueEn", m.venue_hi as "venueHi", d.name_en as "divisionEn", d.name_hi as "divisionHi",
  m.agenda_en as "agendaEn", m.agenda_hi as "agendaHi", m.resolutions_en as "resolutionsEn", m.resolutions_hi as "resolutionsHi",
  m.minutes_url as "minutesUrl", m.minutes_text as "minutesText", m.notice_url as "noticeUrl"`;

export async function getPublicMeetings(typeId: number): Promise<PublicMeeting[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("meetings");
  const rows = await getDb().execute(sql`
    select ${MEETING_COLS} from meetings m
    join meeting_types t on t.id = m.type_id and t.active and t.show_public
    left join divisions d on d.id = m.division_id
    where m.is_public and m.status <> 'cancelled' and m.type_id = ${typeId}
    order by m.starts_at desc, m.id desc limit 300`);
  return rowsOf<PublicMeeting>(rows);
}

export async function getPublicMeeting(id: number): Promise<PublicMeeting | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("meetings");
  const rows = await getDb().execute(sql`
    select ${MEETING_COLS} from meetings m
    join meeting_types t on t.id = m.type_id and t.active and t.show_public
    left join divisions d on d.id = m.division_id
    where m.is_public and m.status <> 'cancelled' and m.id = ${id} limit 1`);
  return rowsOf<PublicMeeting>(rows)[0] ?? null;
}

/* ---------------------------- Gallery albums ---------------------------- */

export type AlbumCard = {
  id: number;
  titleEn: string;
  titleHi: string | null;
  heldOn: string | null;
  divisionId: number | null;
  divisionEn: string | null;
  divisionHi: string | null;
  branchEn: string | null;
  branchHi: string | null;
  cover: string;
  photos: number;
};

/** Albums that have at least one visible photo, newest first. A division filter also matches albums of its branches. */
export async function getGalleryAlbums(divisionId?: number, branchId?: number): Promise<AlbumCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("gallery");
  const conds = [sql`a.active`];
  if (branchId) conds.push(sql`a.branch_id = ${branchId}`);
  else if (divisionId) conds.push(sql`(a.division_id = ${divisionId} or a.branch_id in (select id from branches where division_id = ${divisionId}))`);
  const rows = await getDb().execute(sql`
    select a.id, a.title_en as "titleEn", a.title_hi as "titleHi", a.held_on::text as "heldOn", coalesce(a.division_id, b.division_id) as "divisionId",
           d.name_en as "divisionEn", d.name_hi as "divisionHi", b.name_en as "branchEn", b.name_hi as "branchHi",
           (select p.url from gallery_photos p where p.album_id = a.id and p.active order by p.sort, p.id limit 1) as cover,
           (select count(*)::int from gallery_photos p where p.album_id = a.id and p.active) as photos
    from gallery_albums a
    left join branches b on b.id = a.branch_id
    left join divisions d on d.id = coalesce(a.division_id, b.division_id)
    where ${sql.join(conds, sql` and `)}
      and exists (select 1 from gallery_photos p where p.album_id = a.id and p.active)
    order by a.sort, a.held_on desc nulls last, a.id desc`);
  return rowsOf<AlbumCard>(rows);
}

export async function getGalleryAlbum(id: number) {
  "use cache";
  cacheLife("hours");
  cacheTag("gallery");
  const [album] = rowsOf<AlbumCard & { descriptionEn: string | null; descriptionHi: string | null }>(
    await getDb().execute(sql`
      select a.id, a.title_en as "titleEn", a.title_hi as "titleHi", a.description_en as "descriptionEn", a.description_hi as "descriptionHi",
             a.held_on::text as "heldOn", coalesce(a.division_id, b.division_id) as "divisionId", d.name_en as "divisionEn", d.name_hi as "divisionHi",
             b.name_en as "branchEn", b.name_hi as "branchHi", '' as cover, 0 as photos
      from gallery_albums a left join branches b on b.id = a.branch_id left join divisions d on d.id = coalesce(a.division_id, b.division_id)
      where a.id = ${id} and a.active limit 1`),
  );
  if (!album) return null;
  const photos = rowsOf<GalleryRow>(
    await getDb().execute(sql`
      select id, url, caption_en as "captionEn", caption_hi as "captionHi", taken_on::text as "takenOn", featured
      from gallery_photos where album_id = ${id} and active order by sort, taken_on desc nulls last, id`),
  );
  return { album, photos };
}

/** Photographs that are not in any album. */
export async function getLoosePhotos(limit: number): Promise<GalleryRow[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("gallery");
  const rows = await getDb().execute(sql`
    select id, url, caption_en as "captionEn", caption_hi as "captionHi", taken_on::text as "takenOn", featured
    from gallery_photos where active and album_id is null order by sort, taken_on desc nulls last, id desc limit ${limit}`);
  return rowsOf<GalleryRow>(rows);
}

/* ------------------------------ Wing committees ------------------------------ */

export type CommitteePerson = OfficePerson & { divisionId: number | null; divisionEn: string | null; divisionHi: string | null };

/** The committee of a wing (women or youth): central members first, then division by division. */
export async function getCommittee(wing: "women" | "youth"): Promise<CommitteePerson[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("committee", "divisions");
  const rows = await getDb().execute(sql`
    select c.id, c.name_en as "nameEn", c.name_hi as "nameHi", c.designation_en as "designationEn", c.designation_hi as "designationHi",
           null::text as "placeLabel", null::text as "addressEn", c.phone, c.photo_url as "photoUrl",
           c.division_id as "divisionId", d.name_en as "divisionEn", d.name_hi as "divisionHi"
    from committee_members c left join divisions d on d.id = c.division_id
    where c.wing = ${wing} and c.active
    order by (c.division_id is not null), d.sort nulls first, c.sort, c.id`);
  return rowsOf<CommitteePerson>(rows);
}

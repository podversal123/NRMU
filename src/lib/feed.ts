import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import type { FeedTarget } from "@/db/schema";
import type { I18n } from "./i18n";
import { getCategories, getSettings } from "./queries";
import type { Text3 } from "./text3";

/*
 * The feed: orders and circulars published by the union, and members' posts once an admin has approved them,
 * newest first, in one list.
 *
 * Built to stay quick with a large membership:
 * - the list itself is the same for every visitor, so it is cached and only rebuilt when content changes (tag "feed");
 * - likes and comments are counted once, in feed_counts, when they happen, never while a page is shown;
 * - what differs per visitor (the counts and "did I like this") is two small indexed lookups for the items on screen;
 * - pages are fetched with a cursor (the last item shown), so the hundredth page costs the same as the first.
 */

/* --------------------------------- Settings -------------------------------- */

/** Limits of the feed, all from the "feed.*" settings (admin: Site text). */
export type FeedConfig = {
  includeOrders: boolean;
  pageSize: number;
  postMax: number;
  commentMax: number;
  maxMedia: number;
  maxImageMb: number;
  maxVideoMb: number;
  postsPerDay: number;
  commentsPerHour: number;
  commentsShown: number;
  /** how many items the home page strip shows (0 hides it) */
  homeCount: number;
  /** visitors who are not signed in may like (commenting always needs a member) */
  guestLikes: boolean;
  /** likes one internet address may give per hour without signing in */
  guestLikesPerHour: number;
};

/** A whole number from a setting, kept inside sensible bounds so a typing mistake in the admin cannot break the feed. */
const whole = (v: string | undefined, min: number, max: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
};

export async function feedConfig(): Promise<FeedConfig> {
  const s = await getSettings();
  const v = (k: string) => s[`feed.${k}`]?.en;
  return {
    includeOrders: v("include_orders") !== "0",
    pageSize: whole(v("page_size"), 5, 50),
    postMax: whole(v("post_max_chars"), 100, 10000),
    commentMax: whole(v("comment_max_chars"), 50, 5000),
    maxMedia: whole(v("max_media"), 0, 10),
    maxImageMb: whole(v("max_image_mb"), 1, 50),
    maxVideoMb: whole(v("max_video_mb"), 1, 500),
    postsPerDay: whole(v("posts_per_day"), 1, 100),
    commentsPerHour: whole(v("comments_per_hour"), 1, 1000),
    commentsShown: whole(v("comments_shown"), 5, 200),
    homeCount: whole(v("home_count"), 0, 12),
    guestLikes: v("guest_likes") === "1",
    guestLikesPerHour: whole(v("guest_likes_per_hour"), 1, 10000),
  };
}

/* ---------------------------------- Types ---------------------------------- */

export type { Text3 };
export type FeedMedia = { url: string; kind: "image" | "video" | "file"; name: string | null };

export type FeedItem =
  | {
      target: "order";
      id: number;
      at: string;
      title: Text3;
      excerpt: string;
      thumbUrl: string | null;
      label: Text3 | null;
      media: FeedMedia[];
    }
  | {
      target: "member";
      id: number;
      at: string;
      body: string;
      topic: Text3 | null;
      /** null when the member chose to hide the name */
      author: string | null;
      division: Text3 | null;
      media: FeedMedia[];
    };

export type FeedFilter = { from: "all" | "union" | "members"; topic?: number };
export type FeedPage = { items: FeedItem[]; next: string | null };

/** Per visitor: totals, and whether this member liked the item. Keyed by `${target}:${id}`. */
export type FeedState = Record<string, { likes: number; comments: number; liked: boolean }>;

export type FeedComment = { id: number; memberId: number; name: string; division: Text3 | null; kind: "comment" | "suggestion"; body: string; at: string };

export const feedKey = (target: FeedTarget, id: number) => `${target}:${id}`;

/* --------------------------------- Cursor ---------------------------------- */

type Cursor = { at: string; target: FeedTarget; id: number };
const encodeCursor = (c: Cursor) => Buffer.from(`${c.at}|${c.target}|${c.id}`).toString("base64url");
export function decodeCursor(raw: string | undefined): Cursor | null {
  if (!raw || raw.length > 120) return null;
  const [at, target, id] = Buffer.from(raw, "base64url").toString().split("|");
  if (!at || !ISO_RE.test(at) || (target !== "order" && target !== "member") || !/^\d+$/.test(id ?? "")) return null;
  return { at, target, id: Number(id) };
}

const rowsOf = <T>(r: unknown) => ((r as { rows?: T[] }).rows ?? r) as T[];
/** A timestamp as ISO text with all six decimals, so a cursor matches the stored value exactly (JavaScript dates keep only three). */
const iso = (col: SQL) => sql`to_char(${col} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
const text3 = (en: string | null, hi: string | null, i18n: I18n | null | undefined, field: string): Text3 | null => (en ? { en, hi, tr: i18n?.[field] } : null);

/* ---------------------------------- Lists ---------------------------------- */

/** One page of the feed, the same for everyone, cached until content changes. */
export async function getFeedPage(filter: FeedFilter, before: string | null): Promise<FeedPage> {
  "use cache";
  cacheLife("minutes");
  cacheTag("feed");
  const cfg = await feedConfig();
  const db = getDb();
  const cur = decodeCursor(before ?? undefined);

  const orders = cfg.includeOrders && filter.from !== "members" && !filter.topic;
  const members = filter.from !== "union";
  if (!orders && !members) return { items: [], next: null };

  // An order dated today keeps the time it was saved; an older or back-dated one sorts at the start of its date (India time).
  const parts: SQL[] = [];
  if (orders)
    parts.push(sql`select 'order'::text as target, p.id, case when (p.created_at at time zone 'Asia/Kolkata')::date = p.published_at then p.created_at else (p.published_at::timestamp at time zone 'Asia/Kolkata') end as at
      from posts p where p.status = 'published'`);
  if (members)
    parts.push(sql`select 'member'::text as target, m.id, m.published_at as at from member_posts m
      where m.status = 'approved' and m.published_at is not null ${filter.topic ? sql`and m.topic_id = ${filter.topic}` : sql``}`);

  const list = rowsOf<{ target: FeedTarget; id: number; at: string }>(
    await db.execute(sql`
      select x.target, x.id, ${iso(sql`x.at`)} as at from (${sql.join(parts, sql` union all `)}) x
      ${cur ? sql`where (x.at, x.target, x.id) < (${cur.at}::timestamptz, ${cur.target}, ${cur.id})` : sql``}
      order by x.at desc, x.target desc, x.id desc
      limit ${cfg.pageSize + 1}`),
  );
  const more = list.length > cfg.pageSize;
  const page = list.slice(0, cfg.pageSize);
  const items = await hydrate(page);
  const last = page[page.length - 1];
  return { items, next: more && last ? encodeCursor({ at: last.at, target: last.target, id: Number(last.id) }) : null };
}

/** Fills in what each listed item shows, with one query per kind of content (never one per item). */
async function hydrate(list: { target: FeedTarget; id: number; at: string }[]): Promise<FeedItem[]> {
  const db = getDb();
  const orderIds = list.filter((r) => r.target === "order").map((r) => Number(r.id));
  const memberIds = list.filter((r) => r.target === "member").map((r) => Number(r.id));
  const ids = (a: number[]) => sql.join(a.map((n) => sql`${n}`), sql`, `);

  const [orders, orderFiles, orderCats, cats, posts, postMedia] = await Promise.all([
    orderIds.length
      ? db.execute(sql`select id, title_en, title_hi, i18n, excerpt, thumb_url from posts where id in (${ids(orderIds)})`)
      : Promise.resolve([]),
    orderIds.length
      ? db.execute(sql`select post_id, url, kind, name from post_files where post_id in (${ids(orderIds)}) order by sort, id`)
      : Promise.resolve([]),
    orderIds.length ? db.execute(sql`select post_id, category_id from post_categories where post_id in (${ids(orderIds)})`) : Promise.resolve([]),
    orderIds.length ? getCategories() : Promise.resolve([]),
    memberIds.length
      ? db.execute(sql`
          select mp.id, mp.body, mp.anonymous, m.name as author,
                 d.name_en as d_en, d.name_hi as d_hi, d.i18n as d_i18n,
                 t.name_en as t_en, t.name_hi as t_hi, t.i18n as t_i18n
          from member_posts mp
          join members m on m.id = mp.member_id
          left join divisions d on d.id = m.division_id
          left join feed_topics t on t.id = mp.topic_id
          where mp.id in (${ids(memberIds)})`)
      : Promise.resolve([]),
    memberIds.length
      ? db.execute(sql`select post_id, url, kind, name from member_post_media where post_id in (${ids(memberIds)}) order by sort, id`)
      : Promise.resolve([]),
  ]);

  type OrderRow = { id: number; title_en: string; title_hi: string | null; i18n: I18n; excerpt: string; thumb_url: string | null };
  type FileRow = { post_id: number; url: string; kind: string; name: string | null };
  type PostRow = { id: number; body: string; anonymous: boolean; author: string; d_en: string | null; d_hi: string | null; d_i18n: I18n | null; t_en: string | null; t_hi: string | null; t_i18n: I18n | null };

  const orderById = new Map(rowsOf<OrderRow>(orders).map((r) => [Number(r.id), r]));
  const postById = new Map(rowsOf<PostRow>(posts).map((r) => [Number(r.id), r]));
  const filesOf = (rows: FileRow[], id: number): FeedMedia[] =>
    rows
      .filter((f) => Number(f.post_id) === id)
      .map((f) => ({ url: f.url.replace(/^http:/, "https:"), kind: f.kind === "image" || f.kind === "video" ? f.kind : "file", name: f.name }));
  const oFiles = rowsOf<FileRow>(orderFiles);
  const mFiles = rowsOf<FileRow>(postMedia);

  // the most specific visible category of an order, as on the home page
  const catById = new Map(cats.map((c) => [c.id, c]));
  const depth = (id: number) => {
    let d = 0;
    for (let c = catById.get(id); c?.parentId; c = catById.get(c.parentId)) d++;
    return d;
  };
  const links = rowsOf<{ post_id: number; category_id: number }>(orderCats);
  const labelOf = (id: number): Text3 | null => {
    const best = links
      .filter((l) => Number(l.post_id) === id && catById.has(Number(l.category_id)) && !catById.get(Number(l.category_id))!.hidden)
      .sort((a, b) => depth(Number(b.category_id)) - depth(Number(a.category_id)))[0];
    const c = best ? catById.get(Number(best.category_id))! : null;
    return c ? { en: c.nameEn, hi: c.nameHi, tr: c.i18n.name } : null;
  };

  const out: FeedItem[] = [];
  for (const r of list) {
    const id = Number(r.id);
    const at = r.at;
    if (r.target === "order") {
      const o = orderById.get(id);
      if (!o) continue;
      out.push({ target: "order", id, at, title: { en: o.title_en, hi: o.title_hi, tr: o.i18n?.title }, excerpt: o.excerpt, thumbUrl: o.thumb_url, label: labelOf(id), media: filesOf(oFiles, id) });
    } else {
      const p = postById.get(id);
      if (!p) continue;
      out.push({
        target: "member",
        id,
        at,
        body: p.body,
        topic: text3(p.t_en, p.t_hi, p.t_i18n, "name"),
        author: p.anonymous ? null : p.author,
        division: text3(p.d_en, p.d_hi, p.d_i18n, "name"),
        media: filesOf(mFiles, id),
      });
    }
  }
  return out;
}

/** One approved member post (for its own page), or null. */
export async function getMemberPost(id: number): Promise<FeedItem | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("feed");
  const [row] = rowsOf<{ id: number; at: string }>(
    await getDb().execute(sql`select id, ${iso(sql`published_at`)} as at from member_posts where id = ${id} and status = 'approved' and published_at is not null`),
  );
  if (!row) return null;
  const [item] = await hydrate([{ target: "member", id: Number(row.id), at: row.at }]);
  return item ?? null;
}

/* ------------------------------ Per visitor -------------------------------- */

/**
 * Totals for the items on screen, and which of them this member liked (or, for a visitor who is not signed in, this
 * browser liked). Two indexed lookups, whatever the page size.
 */
export async function getFeedState(items: { target: FeedTarget; id: number }[], memberId: number | null, visitor: string | null = null): Promise<FeedState> {
  const state: FeedState = {};
  for (const i of items) state[feedKey(i.target, i.id)] = { likes: 0, comments: 0, liked: false };
  if (!items.length) return state;
  const pairs = sql.join(items.map((i) => sql`(${i.target}, ${i.id})`), sql`, `);
  const db = getDb();
  const [counts, liked] = await Promise.all([
    db.execute(sql`select target, target_id, likes, comments from feed_counts where (target, target_id) in (${pairs})`),
    memberId
      ? db.execute(sql`select target, target_id from feed_likes where member_id = ${memberId} and (target, target_id) in (${pairs})`)
      : visitor
        ? db.execute(sql`select target, target_id from feed_guest_likes where visitor = ${visitor} and (target, target_id) in (${pairs})`)
        : Promise.resolve([]),
  ]);
  for (const c of rowsOf<{ target: FeedTarget; target_id: number; likes: number; comments: number }>(counts)) {
    const s = state[feedKey(c.target, Number(c.target_id))];
    if (s) Object.assign(s, { likes: Number(c.likes), comments: Number(c.comments) });
  }
  for (const l of rowsOf<{ target: FeedTarget; target_id: number }>(liked)) {
    const s = state[feedKey(l.target, Number(l.target_id))];
    if (s) s.liked = true;
  }
  return state;
}

/**
 * Totals for pages everyone sees alike (the home page strip): cached for a few minutes instead of read per visitor,
 * so a busy home page never waits on them.
 */
export async function getPublicCounts(items: { target: FeedTarget; id: number }[]): Promise<FeedState> {
  "use cache";
  cacheLife("minutes");
  cacheTag("feed-counts");
  return getFeedState(items, null);
}

/* --------------------------------- Comments -------------------------------- */

/** The latest visible comments of an item, oldest first. Cached per item until someone comments there. */
export async function getComments(target: FeedTarget, id: number, limit: number): Promise<FeedComment[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(`comments-${target}-${id}`);
  const rows = rowsOf<{ id: number; member_id: number; name: string; kind: string; body: string; at: string; d_en: string | null; d_hi: string | null; d_i18n: I18n | null }>(
    await getDb().execute(sql`
      select c.id, c.member_id, m.name, c.kind, c.body, ${iso(sql`c.created_at`)} as at, d.name_en as d_en, d.name_hi as d_hi, d.i18n as d_i18n
      from feed_comments c
      join members m on m.id = c.member_id
      left join divisions d on d.id = m.division_id
      where c.target = ${target} and c.target_id = ${id} and c.status = 'visible'
      order by c.created_at desc, c.id desc
      limit ${limit}`),
  );
  return rows
    .map((r) => ({ id: Number(r.id), memberId: Number(r.member_id), name: r.name, kind: r.kind === "suggestion" ? ("suggestion" as const) : ("comment" as const), body: r.body, at: r.at, division: text3(r.d_en, r.d_hi, r.d_i18n, "name") }))
    .reverse();
}

/** True when the item can be liked, commented on or reported: a published order or an approved member post. */
export async function isOpenTarget(target: FeedTarget, id: number) {
  const q =
    target === "order"
      ? sql`select 1 from posts where id = ${id} and status = 'published'`
      : sql`select 1 from member_posts where id = ${id} and status = 'approved'`;
  return rowsOf(await getDb().execute(q)).length > 0;
}

/* ------------------------------ Member's own ------------------------------- */

export type MyPost = { id: number; body: string; status: string; reviewNote: string | null; createdAt: string; topic: Text3 | null };

/** The signed-in member's own posts with where each one stands. Not cached: it is about one person. */
export async function getMyPosts(memberId: number, limit = 50): Promise<MyPost[]> {
  const rows = rowsOf<{ id: number; body: string; status: string; review_note: string | null; created_at: string; t_en: string | null; t_hi: string | null; t_i18n: I18n | null }>(
    await getDb().execute(sql`
      select mp.id, mp.body, mp.status, mp.review_note, ${iso(sql`mp.created_at`)} as created_at, t.name_en as t_en, t.name_hi as t_hi, t.i18n as t_i18n
      from member_posts mp left join feed_topics t on t.id = mp.topic_id
      where mp.member_id = ${memberId}
      order by mp.created_at desc limit ${limit}`),
  );
  return rows.map((r) => ({ id: Number(r.id), body: r.body, status: r.status, reviewNote: r.review_note, createdAt: r.created_at, topic: text3(r.t_en, r.t_hi, r.t_i18n, "name") }));
}

/** Active topics members can post under, for the composer and the filter. */
export async function getFeedTopics() {
  "use cache";
  cacheLife("hours");
  cacheTag("feed-topics");
  return rowsOf<{ id: number; name_en: string; name_hi: string | null; i18n: I18n; icon: string }>(
    await getDb().execute(sql`select id, name_en, name_hi, i18n, icon from feed_topics where active order by sort, id`),
  ).map((t) => ({ id: Number(t.id), icon: t.icon, name: { en: t.name_en, hi: t.name_hi, tr: t.i18n?.name } as Text3 }));
}

/* ------------------------------- Clean-up ---------------------------------- */

/** Removes likes, comments, totals and reports of an item that is being deleted (they have no foreign key to it). */
export async function purgeFeedTarget(target: FeedTarget, id: number) {
  const db = getDb();
  await db.execute(sql`
    with c as (delete from feed_comments where target = ${target} and target_id = ${id} returning id),
         l as (delete from feed_likes where target = ${target} and target_id = ${id} returning 1),
         g as (delete from feed_guest_likes where target = ${target} and target_id = ${id} returning 1),
         n as (delete from feed_counts where target = ${target} and target_id = ${id} returning 1),
         r as (delete from feed_reports where target = ${target} and target_id = ${id} returning 1)
    delete from feed_reports where target = 'comment' and target_id in (select id from c)`);
}

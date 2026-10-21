"use server";

import { updateTag } from "next/cache";
import { head } from "@vercel/blob";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import type { FeedTarget } from "@/db/schema";
import { isOwnBlobUrl } from "@/lib/blob";
import { feedConfig, getComments, isOpenTarget, type FeedComment } from "@/lib/feed";
import { blobPath, memberFolder } from "@/lib/feed-paths";
import type { Dict } from "@/lib/i18n";
import { getMember } from "@/lib/member-auth";
import { clientKey, tooMany } from "@/lib/rate-limit";
import { IMAGE_TYPES, VIDEO_TYPES } from "@/lib/upload-types";
import { ensureVisitorHash } from "@/lib/visitor";

type Err = { error: keyof Dict };
const rowsOf = <T>(r: unknown) => ((r as { rows?: T[] }).rows ?? r) as T[];
const isTarget = (t: unknown): t is FeedTarget => t === "order" || t === "member";
const validId = (n: unknown) => Number.isInteger(n) && (n as number) > 0 && (n as number) < 2 ** 31;

/* ---------------------------------- Likes ---------------------------------- */

/**
 * Sets a like on an item and returns the new total; the like and the total change in one statement.
 * A signed-in member likes as themselves. A visitor who is not signed in likes as this browser (when the
 * "feed.guest_likes" setting allows it), limited per internet address; commenting still needs a member.
 */
export async function setLike(target: FeedTarget, id: number, like: boolean): Promise<{ likes: number; liked: boolean } | Err> {
  if (!isTarget(target) || !validId(id)) return { error: "fdErrGeneric" };
  const m = await getMember();
  let who: { table: "member"; id: number } | { table: "guest"; visitor: string };
  if (m) who = { table: "member", id: m.id };
  else {
    const cfg = await feedConfig();
    if (!cfg.guestLikes) return { error: "fdSignInToAct" };
    if (await tooMany("guest-like", await clientKey(), cfg.guestLikesPerHour, 3600)) return { error: "errLimit" };
    who = { table: "guest", visitor: await ensureVisitorHash() };
  }
  if (!(await isOpenTarget(target, id))) return { error: "fdErrGeneric" };

  // the like row itself, in the members' table or the visitors' one
  const add =
    who.table === "member"
      ? sql`insert into feed_likes (target, target_id, member_id) values (${target}, ${id}, ${who.id}) on conflict do nothing returning 1`
      : sql`insert into feed_guest_likes (target, target_id, visitor) values (${target}, ${id}, ${who.visitor}) on conflict do nothing returning 1`;
  const remove =
    who.table === "member"
      ? sql`delete from feed_likes where target = ${target} and target_id = ${id} and member_id = ${who.id} returning 1`
      : sql`delete from feed_guest_likes where target = ${target} and target_id = ${id} and visitor = ${who.visitor} returning 1`;
  const db = getDb();
  const changed = like
    ? await db.execute(sql`
        with ins as (${add})
        insert into feed_counts (target, target_id, likes) select ${target}, ${id}, 1 from ins
        on conflict (target, target_id) do update set likes = feed_counts.likes + 1
        returning likes`)
    : await db.execute(sql`
        with d as (${remove})
        update feed_counts set likes = greatest(likes - 1, 0)
        where target = ${target} and target_id = ${id} and exists (select 1 from d)
        returning likes`);
  let likes = rowsOf<{ likes: number }>(changed)[0]?.likes;
  // nothing changed (a double click, or the like was already in that state): read the current total
  if (likes === undefined) likes = rowsOf<{ likes: number }>(await db.execute(sql`select likes from feed_counts where target = ${target} and target_id = ${id}`))[0]?.likes ?? 0;
  return { likes: Number(likes), liked: like };
}

/* --------------------------------- Comments -------------------------------- */

export async function loadComments(target: FeedTarget, id: number): Promise<{ comments: FeedComment[] } | Err> {
  if (!isTarget(target) || !validId(id)) return { error: "fdErrGeneric" };
  const cfg = await feedConfig();
  return { comments: await getComments(target, id, cfg.commentsShown) };
}

export async function addComment(target: FeedTarget, id: number, kind: "comment" | "suggestion", body: string): Promise<{ comment: FeedComment; total: number } | Err> {
  const m = await getMember();
  if (!m) return { error: "fdSignInToAct" };
  const cfg = await feedConfig();
  const text = String(body ?? "").trim().slice(0, cfg.commentMax);
  if (!text) return { error: "fdErrBody" };
  if (!isTarget(target) || !validId(id) || (kind !== "comment" && kind !== "suggestion")) return { error: "fdErrGeneric" };
  if (await tooMany("feed-comment", `m${m.id}`, cfg.commentsPerHour, 3600)) return { error: "errLimit" };
  if (!(await isOpenTarget(target, id))) return { error: "fdErrGeneric" };

  const [row] = rowsOf<{ id: number; at: string; total: number }>(
    await getDb().execute(sql`
      with c as (
        insert into feed_comments (target, target_id, member_id, kind, body) values (${target}, ${id}, ${m.id}, ${kind}, ${text})
        returning id, created_at
      ), k as (
        insert into feed_counts (target, target_id, comments) select ${target}, ${id}, 1 from c
        on conflict (target, target_id) do update set comments = feed_counts.comments + 1
        returning comments
      )
      select c.id, to_char(c.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as at, k.comments as total from c, k`),
  );
  updateTag(`comments-${target}-${id}`);
  const [div] = m.divisionId
    ? rowsOf<{ name_en: string; name_hi: string | null; i18n: Record<string, Record<string, string>> }>(await getDb().execute(sql`select name_en, name_hi, i18n from divisions where id = ${m.divisionId}`))
    : [];
  return {
    total: Number(row.total),
    comment: { id: Number(row.id), memberId: m.id, name: m.name, kind, body: text, at: row.at, division: div ? { en: div.name_en, hi: div.name_hi, tr: div.i18n?.name } : null },
  };
}

/** A member takes back their own comment. */
export async function deleteComment(commentId: number): Promise<{ total: number } | Err> {
  const m = await getMember();
  if (!m) return { error: "fdSignInToAct" };
  if (!validId(commentId)) return { error: "fdErrGeneric" };
  const [row] = rowsOf<{ target: FeedTarget; target_id: number; total: number | null }>(
    await getDb().execute(sql`
      with d as (delete from feed_comments where id = ${commentId} and member_id = ${m.id} returning target, target_id, status)
      update feed_counts k set comments = greatest(k.comments - (case when d.status = 'visible' then 1 else 0 end), 0)
      from d where k.target = d.target and k.target_id = d.target_id
      returning d.target, d.target_id, k.comments as total`),
  );
  if (!row) return { error: "fdErrGeneric" };
  await getDb().execute(sql`delete from feed_reports where target = 'comment' and target_id = ${commentId}`);
  updateTag(`comments-${row.target}-${row.target_id}`);
  return { total: Number(row.total ?? 0) };
}

/* --------------------------------- Reports --------------------------------- */

export async function reportItem(target: FeedTarget | "comment", id: number, reason: string): Promise<{ ok: true } | Err> {
  const m = await getMember();
  if (!m) return { error: "fdSignInToAct" };
  if ((!isTarget(target) && target !== "comment") || !validId(id)) return { error: "fdErrGeneric" };
  if (await tooMany("feed-report", `m${m.id}`, 30, 86400)) return { error: "errLimit" };
  await getDb().execute(sql`
    insert into feed_reports (target, target_id, member_id, reason) values (${target}, ${id}, ${m.id}, ${String(reason ?? "").trim().slice(0, 500)})
    on conflict (target, target_id, member_id) do nothing`);
  return { ok: true };
}

/* ------------------------------ Member's post ------------------------------ */

export type PostState = { ok?: boolean; error?: keyof Dict; detail?: string; values?: { body: string; topic: string; anonymous: boolean } };

/**
 * A member's new post. It is saved as "pending" and appears in the feed only after an admin approves it.
 * Every attached file is checked again here: it must be this member's own upload, a photo or video, within the size limits.
 */
export async function createPost(_prev: PostState, form: FormData): Promise<PostState> {
  const m = await getMember();
  if (!m) return { error: "fdSignInToAct" };
  const cfg = await feedConfig();
  const body = String(form.get("body") ?? "").trim().slice(0, cfg.postMax);
  const topic = Number(form.get("topic")) || 0;
  const anonymous = form.get("anonymous") === "on";
  const values = { body, topic: topic ? String(topic) : "", anonymous };
  const urls = [...new Set(form.getAll("media").map(String))];

  if (!body) return { error: "fdErrBody", values };
  if (!topic) return { error: "fdErrTopic", values };
  if (urls.length > cfg.maxMedia) return { error: "fdErrTooMany", values };
  const [t] = rowsOf(await getDb().execute(sql`select 1 from feed_topics where id = ${topic} and active`));
  if (!t) return { error: "fdErrTopic", values };
  if (await tooMany("feed-post", `m${m.id}`, cfg.postsPerDay, 86400)) return { error: "errLimit", values };

  const media: { url: string; kind: "image" | "video"; name: string }[] = [];
  for (const url of urls) {
    const name = decodeURIComponent(blobPath(url).split("/").pop() ?? "").slice(0, 120);
    if (!isOwnBlobUrl(url) || !blobPath(url).startsWith(memberFolder(m.id))) return { error: "fdErrFile", detail: name, values };
    try {
      const meta = await head(url);
      const kind = IMAGE_TYPES.includes(meta.contentType) ? "image" : VIDEO_TYPES.includes(meta.contentType) ? "video" : null;
      const limitMb = kind === "image" ? cfg.maxImageMb : cfg.maxVideoMb;
      if (!kind || meta.size > limitMb * 1024 * 1024) return { error: "fdErrFile", detail: name, values };
      media.push({ url, kind, name });
    } catch {
      return { error: "fdErrFile", detail: name, values };
    }
  }

  const db = getDb();
  if (media.length) {
    const rows = sql.join(media.map((f, i) => sql`(${f.url}, ${f.kind}, ${f.name}, ${i}::int)`), sql`, `);
    await db.execute(sql`
      with p as (insert into member_posts (member_id, topic_id, body, anonymous) values (${m.id}, ${topic}, ${body}, ${anonymous}) returning id)
      insert into member_post_media (post_id, url, kind, name, sort)
      select p.id, f.url, f.kind, f.name, f.sort from p, (values ${rows}) as f(url, kind, name, sort)`);
  } else {
    await db.execute(sql`insert into member_posts (member_id, topic_id, body, anonymous) values (${m.id}, ${topic}, ${body}, ${anonymous})`);
  }
  updateTag("feed-queue");
  return { ok: true };
}

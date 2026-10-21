"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { ICON_NAMES } from "@/components/Icon";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { readI18n } from "@/lib/i18n-form";
import { noEmDash } from "@/lib/text";

const ROLES = ["super_admin", "editor"] as const;
const str = (f: FormData, k: string, max = 500) => String(f.get(k) ?? "").trim().slice(0, max);
const back = (f: FormData, fallback = "/admin/feed") => {
  const b = str(f, "back", 300);
  return b.startsWith("/admin/feed") ? b : fallback;
};
const withFlag = (url: string, flag: string) => `${url}${url.includes("?") ? "&" : "?"}${flag}`;
const rowsOf = <T>(r: unknown) => ((r as { rows?: T[] }).rows ?? r) as T[];

/**
 * Approves, turns down, takes down or puts back a member's post.
 * approve: pending or rejected → approved (it enters the feed now); reject: pending → rejected;
 * remove: approved → removed; restore: removed → approved. The note is shown to the member.
 */
export async function reviewPost(form: FormData) {
  const admin = await requireAdmin([...ROLES]);
  const id = Number(form.get("id"));
  const decision = str(form, "decision", 10);
  const note = noEmDash(str(form, "note", 500)) || null;
  const step: Record<string, { from: string[]; to: string }> = {
    approve: { from: ["pending", "rejected"], to: "approved" },
    reject: { from: ["pending"], to: "rejected" },
    remove: { from: ["approved"], to: "removed" },
    restore: { from: ["removed"], to: "approved" },
  };
  const s = step[decision];
  if (!id || !s) redirect(back(form));
  const done = rowsOf(
    await getDb().execute(sql`
      update member_posts set
        status = ${s.to},
        review_note = ${s.to === "approved" ? null : note},
        reviewed_by = ${admin.id}, reviewed_at = now(),
        published_at = ${s.to === "approved" ? sql`coalesce(published_at, now())` : sql`published_at`}
      where id = ${id} and status in (${sql.join(s.from.map((x) => sql`${x}`), sql`, `)})
      returning id`),
  );
  updateTag("feed");
  updateTag("feed-queue");
  redirect(withFlag(back(form), done.length ? `done=${decision}` : "stale=1"));
}

/** Hides a comment from everyone, or shows it again, keeping the item's comment total right. */
export async function setCommentStatus(form: FormData) {
  const admin = await requireAdmin([...ROLES]);
  const id = Number(form.get("id"));
  const to = str(form, "to", 10) === "visible" ? "visible" : "hidden";
  if (!id) redirect(back(form));
  const [row] = rowsOf<{ target: string; target_id: number }>(
    await getDb().execute(sql`
      with u as (
        update feed_comments set status = ${to}, hidden_by = ${to === "hidden" ? admin.id : null}
        where id = ${id} and status <> ${to} returning target, target_id
      )
      update feed_counts k set comments = greatest(k.comments + ${to === "visible" ? 1 : -1}, 0)
      from u where k.target = u.target and k.target_id = u.target_id
      returning u.target, u.target_id`),
  );
  if (row) updateTag(`comments-${row.target}-${row.target_id}`);
  redirect(withFlag(back(form), "done=comment"));
}

/**
 * Closes the reports about one thing. "act" also does what was asked: a comment is hidden and a member's post is
 * taken down (an order is changed from its own edit page). "dismiss" leaves the thing as it is.
 */
export async function resolveReports(form: FormData) {
  const admin = await requireAdmin([...ROLES]);
  const target = str(form, "target", 10);
  const targetId = Number(form.get("targetId"));
  const how = str(form, "how", 10) === "act" ? "act" : "dismiss";
  if (!["order", "member", "comment"].includes(target) || !targetId) redirect(back(form));
  const db = getDb();
  if (how === "act" && target === "comment") {
    const [row] = rowsOf<{ target: string; target_id: number }>(
      await db.execute(sql`
        with u as (update feed_comments set status = 'hidden', hidden_by = ${admin.id} where id = ${targetId} and status = 'visible' returning target, target_id)
        update feed_counts k set comments = greatest(k.comments - 1, 0) from u where k.target = u.target and k.target_id = u.target_id
        returning u.target, u.target_id`),
    );
    if (row) updateTag(`comments-${row.target}-${row.target_id}`);
  }
  if (how === "act" && target === "member") {
    await db.execute(sql`
      update member_posts set status = 'removed', review_note = ${noEmDash(str(form, "note", 500)) || null}, reviewed_by = ${admin.id}, reviewed_at = now()
      where id = ${targetId} and status = 'approved'`);
    updateTag("feed");
  }
  await db.execute(sql`
    update feed_reports set status = ${how === "act" ? "actioned" : "dismissed"}, resolved_by = ${admin.id}, resolved_at = now()
    where target = ${target} and target_id = ${targetId} and status = 'open'`);
  updateTag("feed-queue");
  redirect(withFlag(back(form), "done=report"));
}

/** Adds or changes a topic members can post under. */
export async function saveTopic(form: FormData) {
  await requireAdmin([...ROLES]);
  const id = Number(form.get("id")) || 0;
  const nameEn = noEmDash(str(form, "nameEn", 120));
  if (!nameEn) redirect("/admin/feed?tab=topics&error=name");
  const values = {
    nameEn,
    nameHi: noEmDash(str(form, "nameHi", 120)) || null,
    sort: Math.max(0, Math.min(999, Number(form.get("sort")) || 0)),
    icon: ICON_NAMES.includes(str(form, "icon", 30)) ? str(form, "icon", 30) : "chat",
    active: form.get("active") === "on",
    i18n: readI18n(form, { name: 120 }),
  };
  const db = getDb();
  if (id) await db.update(schema.feedTopics).set(values).where(eq(schema.feedTopics.id, id));
  else await db.insert(schema.feedTopics).values(values);
  updateTag("feed-topics");
  updateTag("feed");
  redirect("/admin/feed?tab=topics&done=topic");
}

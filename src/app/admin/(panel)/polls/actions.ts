"use server";

import { and, eq, inArray, notInArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { readI18n } from "@/lib/i18n-form";
import { fromIst } from "@/lib/meetings";
import { SHOW_RESULTS } from "@/lib/polls";

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const STATUSES = ["draft", "open", "closed"] as const;
const guard = () => requireAdmin(["super_admin", "editor"]);
const MAX_OPTIONS = 10;

/** Creates or updates a poll with its answers. Every field the members see is checked here, not only in the form. */
export async function savePoll(form: FormData) {
  const admin = await guard();
  const idRaw = str(form, "id", 12);
  const back = `/admin/polls/${idRaw || "new"}`;

  const titleEn = str(form, "titleEn");
  if (titleEn.length < 5) redirect(`${back}?error=title`);
  const status = STATUSES.find((s) => s === str(form, "status", 8)) ?? "draft";
  const showResults = SHOW_RESULTS.find((s) => s.value === str(form, "showResults", 12))?.value ?? "after_vote";
  const startsAt = str(form, "startsAt", 16) ? fromIst(str(form, "startsAt", 16)) : null;
  const endsAt = str(form, "endsAt", 16) ? fromIst(str(form, "endsAt", 16)) : null;
  if ((str(form, "startsAt", 16) && !startsAt) || (str(form, "endsAt", 16) && !endsAt)) redirect(`${back}?error=time`);
  if (startsAt && endsAt && endsAt <= startsAt) redirect(`${back}?error=time`);

  // the answers: rows of (id, English, Hindi); an empty English box means no answer in that row
  const ids = form.getAll("optId").map((v) => Number(v) || 0);
  const en = form.getAll("optEn").map((v) => String(v).trim().slice(0, 200));
  const hi = form.getAll("optHi").map((v) => String(v).trim().slice(0, 200));
  const rows = en.map((label, i) => ({ id: ids[i] ?? 0, labelEn: label, labelHi: hi[i] || null })).filter((r) => r.labelEn).slice(0, MAX_OPTIONS);
  if (rows.length < 2) redirect(`${back}?error=options`);
  if (new Set(rows.map((r) => r.labelEn.toLowerCase())).size !== rows.length) redirect(`${back}?error=duplicate`);
  const maxChoices = Math.min(Math.max(1, Number(str(form, "maxChoices", 2)) || 1), rows.length);

  const values = {
    titleEn,
    titleHi: str(form, "titleHi") || null,
    descriptionEn: str(form, "descriptionEn", 3000) || null,
    descriptionHi: str(form, "descriptionHi", 3000) || null,
    status,
    maxChoices,
    showResults,
    divisionId: Number(str(form, "divisionId", 10)) || null,
    startsAt,
    endsAt,
    i18n: readI18n(form, { title: 300, description: 3000 }),
  };

  const db = getDb();
  let id = Number(idRaw);
  if (id) {
    const [before] = await db.select({ voters: schema.polls.voters }).from(schema.polls).where(eq(schema.polls.id, id)).limit(1);
    if (!before) redirect("/admin/polls");
    await db.update(schema.polls).set(values).where(eq(schema.polls.id, id));
    if (before.voters === 0) {
      // nobody has voted yet, so answers can be added, reordered and removed freely
      const keep = rows.map((r) => r.id).filter(Boolean);
      if (keep.length) await db.delete(schema.pollOptions).where(and(eq(schema.pollOptions.pollId, id), notInArray(schema.pollOptions.id, keep)));
      else await db.delete(schema.pollOptions).where(eq(schema.pollOptions.pollId, id));
      for (const [sort, r] of rows.entries()) {
        if (r.id) await db.update(schema.pollOptions).set({ labelEn: r.labelEn, labelHi: r.labelHi, sort }).where(and(eq(schema.pollOptions.id, r.id), eq(schema.pollOptions.pollId, id)));
        else await db.insert(schema.pollOptions).values({ pollId: id, labelEn: r.labelEn, labelHi: r.labelHi, sort });
      }
    } else {
      // votes exist: the answers stay, only their wording may be corrected
      for (const r of rows.filter((x) => x.id)) {
        await db.update(schema.pollOptions).set({ labelEn: r.labelEn, labelHi: r.labelHi }).where(and(eq(schema.pollOptions.id, r.id), eq(schema.pollOptions.pollId, id)));
      }
    }
  } else {
    const [row] = await db.insert(schema.polls).values({ ...values, createdBy: admin.id }).returning({ id: schema.polls.id });
    id = row.id;
    await db.insert(schema.pollOptions).values(rows.map((r, sort) => ({ pollId: id, labelEn: r.labelEn, labelHi: r.labelHi, sort })));
  }
  redirect(`/admin/polls/${id}?saved=1`);
}

export async function setPollStatus(form: FormData) {
  await guard();
  const id = Number(form.get("id"));
  const status = STATUSES.find((s) => s === String(form.get("status") ?? ""));
  if (id && status) await getDb().update(schema.polls).set({ status }).where(eq(schema.polls.id, id));
  redirect(`/admin/polls/${id}?saved=1`);
}

/** A poll that has votes is a record, so it can be closed but not deleted. */
export async function deletePoll(form: FormData) {
  await guard();
  const id = Number(form.get("id"));
  if (id) {
    const db = getDb();
    const [p] = await db.select({ voters: schema.polls.voters }).from(schema.polls).where(eq(schema.polls.id, id)).limit(1);
    if (p && p.voters > 0) redirect(`/admin/polls/${id}?error=kept`);
    await db.delete(schema.polls).where(and(eq(schema.polls.id, id), inArray(schema.polls.status, ["draft", "open", "closed"])));
  }
  redirect("/admin/polls?deleted=1");
}

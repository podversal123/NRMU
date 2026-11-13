"use server";

import { redirect } from "next/navigation";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { isLang } from "@/lib/i18n";
import { getMember } from "@/lib/member-auth";
import { getPoll, pollState } from "@/lib/polls";
import { tooMany } from "@/lib/rate-limit";

const rowsOf = <T>(r: unknown) => ((r as { rows?: T[] }).rows ?? r) as T[];

/**
 * A signed-in member votes in a poll. The vote is secret: the member is noted only as "has voted" (poll_voters) and the
 * chosen answers are only counted. Everything changes in ONE statement, so a double click or two devices at once can
 * never count a member twice: the insert into poll_voters either happens (and the counts move) or it does not (and nothing moves).
 */
export async function votePoll(form: FormData) {
  const lang = String(form.get("lang") ?? "");
  const id = Number(form.get("poll"));
  if (!isLang(lang) || !Number.isInteger(id) || id < 1) redirect("/");
  const here = `/${lang}/polls/${id}`;

  const member = await getMember();
  if (!member) redirect(`/${lang}/member/login`);
  if (await tooMany("poll-vote", String(member.id), 30, 600)) redirect(`${here}?e=limit`);

  const found = await getPoll(id);
  if (!found) redirect(`/${lang}/polls`);
  const { poll, options } = found;
  if (pollState(poll, new Date()) !== "open") redirect(`${here}?e=closed`);
  if (poll.divisionId && poll.divisionId !== member.divisionId) redirect(here);

  const valid = new Set(options.map((o) => o.id));
  const chosen = [...new Set(form.getAll("option").map(Number))].filter((n) => valid.has(n));
  if (chosen.length < 1) redirect(`${here}?e=choose`);
  if (chosen.length > poll.maxChoices) redirect(`${here}?e=many`);

  const ids = sql.join(chosen.map((c) => sql`${c}`), sql`, `);
  const done = rowsOf<{ id: number }>(
    await getDb().execute(sql`
      with v as (insert into poll_voters (poll_id, member_id) values (${id}, ${member.id}) on conflict do nothing returning 1),
      o as (update poll_options set votes = votes + 1 where poll_id = ${id} and id in (${ids}) and exists (select 1 from v) returning id)
      update polls set voters = voters + 1 where id = ${id} and exists (select 1 from v) returning id`),
  );
  redirect(done.length ? `${here}?voted=1` : here);
}

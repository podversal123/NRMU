"use server";

import { and, eq, gt } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { isLang } from "@/lib/i18n";

const TOKEN = /^[0-9a-f]{64}$/;
const ANSWERS = ["yes", "maybe", "no"] as const;

/** An invitee answers from their own link. The link itself is the proof of who they are. */
export async function answerInvitation(form: FormData) {
  const lang = String(form.get("lang") ?? "");
  const token = String(form.get("token") ?? "");
  const answer = ANSWERS.find((a) => a === String(form.get("answer") ?? ""));
  if (!isLang(lang) || !TOKEN.test(token)) redirect("/");
  if (!answer) redirect(`/${lang}/meet/${token}`);

  const db = getDb();
  const [mine] = await db.select({ meetingId: schema.meetingInvitees.meetingId }).from(schema.meetingInvitees).where(eq(schema.meetingInvitees.joinToken, token)).limit(1);
  if (mine) {
    // Only for a meeting that is still to come (or on now) and not cancelled.
    const [open] = await db
      .select({ id: schema.meetings.id })
      .from(schema.meetings)
      .where(and(eq(schema.meetings.id, mine.meetingId), eq(schema.meetings.status, "scheduled"), gt(schema.meetings.endsAt, new Date())))
      .limit(1);
    if (open) await db.update(schema.meetingInvitees).set({ rsvp: answer }).where(eq(schema.meetingInvitees.joinToken, token));
  }
  redirect(`/${lang}/meet/${token}?saved=1`);
}

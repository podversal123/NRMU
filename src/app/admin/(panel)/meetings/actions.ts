"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { deleteBlobs } from "@/lib/blob";
import { fromIst, MODES, reminderOffsets, RSVPS } from "@/lib/meetings";

const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const num = (f: FormData, k: string) => Number(str(f, k, 10)) || null;
const one = <T extends string>(v: string, allowed: readonly { value: T }[], fallback: T) => (allowed.some((a) => a.value === v) ? (v as T) : fallback);
const STATUSES = ["scheduled", "completed", "cancelled"] as const;

/** Meetings, their invitees and recordings are private to the super admin. */
const guard = () => requireAdmin(["super_admin"]);

async function planReminders(meetingId: number) {
  const db = getDb();
  await db.delete(schema.meetingReminders).where(eq(schema.meetingReminders.meetingId, meetingId));
  const offsets = await reminderOffsets();
  if (offsets.length) await db.insert(schema.meetingReminders).values(offsets.map((minutesBefore) => ({ meetingId, minutesBefore })));
}

export async function saveMeeting(form: FormData) {
  const admin = await guard();
  const idRaw = str(form, "id", 12);
  const back = `/admin/meetings/${idRaw || "new"}`;
  const titleEn = str(form, "titleEn");
  const startsAt = fromIst(str(form, "startsAt", 16));
  const endsAt = fromIst(str(form, "endsAt", 16));
  if (!titleEn || !startsAt || !endsAt) redirect(`${back}?error=required`);
  if (endsAt! <= startsAt!) redirect(`${back}?error=time`);

  const mode = one(str(form, "mode", 12), MODES, "online");
  const values = {
    titleEn,
    titleHi: str(form, "titleHi") || null,
    typeId: num(form, "typeId"),
    divisionId: num(form, "divisionId"),
    startsAt: startsAt!,
    endsAt: endsAt!,
    mode,
    venueEn: mode === "online" ? null : str(form, "venueEn") || null,
    venueHi: mode === "online" ? null : str(form, "venueHi") || null,
    agendaEn: str(form, "agendaEn", 5000) || null,
    agendaHi: str(form, "agendaHi", 5000) || null,
    recordingOn: mode !== "in_person" && form.get("recordingOn") === "on",
    updatedAt: new Date(),
  };

  const db = getDb();
  let id = Number(idRaw);
  if (id) {
    const [before] = await db.select({ startsAt: schema.meetings.startsAt }).from(schema.meetings).where(eq(schema.meetings.id, id)).limit(1);
    if (!before) redirect("/admin/meetings");
    await db.update(schema.meetings).set(values).where(eq(schema.meetings.id, id));
    // A new time means every reminder is due again.
    if (before.startsAt.getTime() !== startsAt!.getTime()) await planReminders(id);
  } else {
    const [row] = await db.insert(schema.meetings).values({ ...values, createdBy: admin.id }).returning({ id: schema.meetings.id });
    id = row.id;
    await planReminders(id);
  }
  redirect(`/admin/meetings/${id}?saved=1`);
}

export async function deleteMeeting(form: FormData) {
  await guard();
  const id = Number(form.get("id"));
  if (id) {
    // Minutes, a recording or attendance are the union's record. Such a meeting can be cancelled but not deleted.
    const [kept] = await getDb()
      .select({ id: schema.meetings.id })
      .from(schema.meetings)
      .where(and(eq(schema.meetings.id, id), sql`(minutes_url is not null or minutes_text is not null or recording_url is not null or exists (select 1 from meeting_invitees i where i.meeting_id = meetings.id and i.attended))`))
      .limit(1);
    if (kept) redirect(`/admin/meetings/${id}?error=kept`);
    const [row] = await getDb().delete(schema.meetings).where(eq(schema.meetings.id, id)).returning({ minutesUrl: schema.meetings.minutesUrl });
    await deleteBlobs([row?.minutesUrl]);
  }
  redirect("/admin/meetings?deleted=1");
}

/** Minutes, the recording link, private notes and the outcome of the meeting. */
export async function saveRecord(form: FormData) {
  await guard();
  const id = Number(form.get("id"));
  if (!id) redirect("/admin/meetings");
  const db = getDb();
  const [before] = await db.select({ minutesUrl: schema.meetings.minutesUrl }).from(schema.meetings).where(eq(schema.meetings.id, id)).limit(1);
  if (!before) redirect("/admin/meetings");

  const minutesUrl = str(form, "minutes", 600) || null;
  const status = STATUSES.find((s) => s === str(form, "status", 12)) ?? "scheduled";
  await db
    .update(schema.meetings)
    .set({
      minutesUrl,
      minutesText: str(form, "minutesText", 20000) || null,
      recordingUrl: str(form, "recordingUrl", 600) || null,
      notes: str(form, "notes", 5000) || null,
      status,
      updatedAt: new Date(),
    })
    .where(eq(schema.meetings.id, id));
  if (before.minutesUrl && before.minutesUrl !== minutesUrl) await deleteBlobs([before.minutesUrl]);
  redirect(`/admin/meetings/${id}?saved=1#record`);
}

const cleanMobile = (v: string) => {
  const d = v.replace(/[^\d+]/g, "");
  return d.replace(/\D/g, "").length >= 10 ? d.slice(0, 14) : "";
};

/** One person per line: "Name, mobile, email". Mobile and email are optional. */
export async function addInvitees(form: FormData) {
  await guard();
  const meetingId = Number(form.get("meetingId"));
  if (!meetingId) redirect("/admin/meetings");
  const db = getDb();
  const existing = await db.select({ name: schema.meetingInvitees.name, mobile: schema.meetingInvitees.mobile }).from(schema.meetingInvitees).where(eq(schema.meetingInvitees.meetingId, meetingId));
  const seen = new Set(existing.map((e) => (e.mobile ? `m:${cleanMobile(e.mobile)}` : `n:${e.name.toLowerCase()}`)));

  const rows: (typeof schema.meetingInvitees.$inferInsert)[] = [];
  for (const line of String(form.get("people") ?? "").split(/\r?\n/).slice(0, 300)) {
    const parts = line.split(/[,\t]/).map((p) => p.trim());
    const name = (parts[0] ?? "").slice(0, 120);
    if (!name) continue;
    const mobile = cleanMobile(parts[1] ?? "");
    const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parts[2] ?? "") ? parts[2].toLowerCase().slice(0, 160) : null;
    const key = mobile ? `m:${mobile}` : `n:${name.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ meetingId, name, mobile: mobile || null, email });
  }
  if (rows.length) await db.insert(schema.meetingInvitees).values(rows);
  redirect(`/admin/meetings/${meetingId}?added=${rows.length}#people`);
}

/** Invites the active office bearers of one division, or the central office bearers. */
export async function addOfficeBearers(form: FormData) {
  await guard();
  const meetingId = Number(form.get("meetingId"));
  if (!meetingId) redirect("/admin/meetings");
  const group = str(form, "group", 12);
  const db = getDb();
  const where = group === "central" ? and(eq(schema.officeBearers.active, true), eq(schema.officeBearers.scope, "central")) : and(eq(schema.officeBearers.active, true), eq(schema.officeBearers.divisionId, Number(group) || -1));
  const people = await db
    .select({ id: schema.officeBearers.id, name: schema.officeBearers.nameEn, phone: schema.officeBearers.phone, designation: schema.designations.nameEn })
    .from(schema.officeBearers)
    .leftJoin(schema.designations, eq(schema.designations.id, schema.officeBearers.designationId))
    .where(where);
  const have = new Set((await db.select({ id: schema.meetingInvitees.officeBearerId }).from(schema.meetingInvitees).where(eq(schema.meetingInvitees.meetingId, meetingId))).map((r) => r.id));
  const fresh = people.filter((p) => !have.has(p.id));
  if (fresh.length) {
    await db.insert(schema.meetingInvitees).values(fresh.map((p) => ({ meetingId, officeBearerId: p.id, name: p.name, designation: p.designation, mobile: p.phone ? cleanMobile(p.phone) || null : null })));
  }
  redirect(`/admin/meetings/${meetingId}?added=${fresh.length}#people`);
}

/** Saves the reply and attendance of everyone in the list at once. */
export async function saveAttendance(form: FormData) {
  await guard();
  const meetingId = Number(form.get("meetingId"));
  if (!meetingId) redirect("/admin/meetings");
  const db = getDb();
  const ids = form.getAll("ids").map(Number).filter(Boolean);
  for (const id of ids) {
    const rsvp = one(str(form, `rsvp_${id}`, 10), RSVPS, "pending");
    const attended = form.get(`attended_${id}`) === "on";
    await db
      .update(schema.meetingInvitees)
      .set({ rsvp, attended, joinedAt: attended ? sql`coalesce(${schema.meetingInvitees.joinedAt}, now())` : null })
      .where(and(eq(schema.meetingInvitees.id, id), eq(schema.meetingInvitees.meetingId, meetingId)));
  }
  redirect(`/admin/meetings/${meetingId}?saved=1#people`);
}

export async function removeInvitees(form: FormData) {
  await guard();
  const meetingId = Number(form.get("meetingId"));
  const ids = form.getAll("remove").map(Number).filter(Boolean);
  if (meetingId && ids.length) await getDb().delete(schema.meetingInvitees).where(and(eq(schema.meetingInvitees.meetingId, meetingId), inArray(schema.meetingInvitees.id, ids)));
  redirect(`/admin/meetings/${meetingId}#people`);
}

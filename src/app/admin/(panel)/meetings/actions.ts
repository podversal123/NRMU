"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { deleteBlobs, isOwnBlobUrl } from "@/lib/blob";
import { createRoom, deleteRoom, DailyError, listRecordings, updateRoom, videoConfigured } from "@/lib/daily";
import { fromIst, MODES, reminderOffsets, RSVPS, videoEnabled } from "@/lib/meetings";

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

/**
 * Makes the video room match the meeting: created for an online or mixed meeting that is still to come,
 * moved when the time changes, removed when the meeting is cancelled or becomes in-person.
 * Never throws: a meeting must save even when the video service is down, and the admin sees a warning instead.
 */
async function syncRoom(meetingId: number): Promise<"ok" | "skipped" | "failed" | "limit"> {
  if (!videoConfigured()) return "skipped";
  const db = getDb();
  const [m] = await db.select().from(schema.meetings).where(eq(schema.meetings.id, meetingId)).limit(1);
  if (!m) return "skipped";
  const clear = { roomName: null, roomUrl: null, roomRecording: false };
  try {
    const wantsRoom = m.mode !== "in_person" && m.status === "scheduled";
    if (wantsRoom) {
      if (m.endsAt.getTime() + 2 * 3600 * 1000 <= Date.now()) return "skipped"; // already over
      if (!m.roomName && !(await videoEnabled())) return "skipped"; // switched off: no new rooms
      if (!m.roomName) {
        // A safety stop against a bug or misuse creating rooms without end: at most 40 open rooms at once.
        const [{ n }] = (await db.execute(sql`select count(*)::int as n from meetings where room_name is not null and status = 'scheduled'`)).rows as { n: number }[];
        if (Number(n) >= 40) return "limit";
      }
      const plan = { startsAt: m.startsAt, endsAt: m.endsAt, recording: m.recordingOn };
      if (m.roomName) {
        try {
          const { recording } = await updateRoom(m.roomName, plan);
          await db.update(schema.meetings).set({ roomRecording: recording }).where(eq(schema.meetings.id, meetingId));
          return "ok";
        } catch (e) {
          if (!(e instanceof DailyError && e.status === 404)) throw e; // the room was removed at the video service: make a new one
        }
      }
      const room = await createRoom(plan);
      await db.update(schema.meetings).set({ roomName: room.name, roomUrl: room.url, roomRecording: room.recording }).where(eq(schema.meetings.id, meetingId));
    } else if (m.roomName && m.status !== "completed") {
      // A finished meeting keeps its room record (it closes by itself); cancelled or in-person ones give it back.
      await deleteRoom(m.roomName);
      await db.update(schema.meetings).set(clear).where(eq(schema.meetings.id, meetingId));
    }
    return "ok";
  } catch (e) {
    console.error("Video room could not be set up", e instanceof DailyError ? `${e.status} ${e.info}` : e);
    return "failed";
  }
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
  if (endsAt!.getTime() - startsAt!.getTime() > 12 * 3600 * 1000) redirect(`${back}?error=long`);

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
    isPublic: form.get("isPublic") === "on",
    noticeUrl: isOwnBlobUrl(str(form, "notice", 600)) ? str(form, "notice", 600) : null,
    updatedAt: new Date(),
  };

  const db = getDb();
  let id = Number(idRaw);
  if (id) {
    const [before] = await db.select({ startsAt: schema.meetings.startsAt, noticeUrl: schema.meetings.noticeUrl }).from(schema.meetings).where(eq(schema.meetings.id, id)).limit(1);
    if (!before) redirect("/admin/meetings");
    await db.update(schema.meetings).set(values).where(eq(schema.meetings.id, id));
    if (before.noticeUrl && before.noticeUrl !== values.noticeUrl) await deleteBlobs([before.noticeUrl]);
    // A new time means every reminder is due again.
    if (before.startsAt.getTime() !== startsAt!.getTime()) await planReminders(id);
  } else {
    const [row] = await db.insert(schema.meetings).values({ ...values, createdBy: admin.id }).returning({ id: schema.meetings.id });
    id = row.id;
    await planReminders(id);
  }
  updateTag("meetings");
  const video = await syncRoom(id);
  redirect(`/admin/meetings/${id}?saved=1${video === "failed" ? "&video=failed" : video === "limit" ? "&video=limit" : ""}`);
}

/** Retry button: makes the video room when it could not be made while saving. */
export async function createVideoRoom(form: FormData) {
  await guard();
  const id = Number(form.get("id"));
  if (!id) redirect("/admin/meetings");
  const video = await syncRoom(id);
  redirect(`/admin/meetings/${id}${video === "failed" ? "?video=failed" : video === "limit" ? "?video=limit" : "?saved=1"}#video`);
}

/** Looks up the recording at the video service when the automatic message has not arrived. */
export async function checkRecording(form: FormData) {
  await guard();
  const id = Number(form.get("id"));
  if (!id) redirect("/admin/meetings");
  const db = getDb();
  const [m] = await db.select({ roomName: schema.meetings.roomName }).from(schema.meetings).where(eq(schema.meetings.id, id)).limit(1);
  let found = 0;
  if (m?.roomName) {
    try {
      const done = (await listRecordings(m.roomName)).filter((r) => r.status === "finished").sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))[0];
      if (done) {
        await db.update(schema.meetings).set({ recordingId: done.id, recordingSeconds: done.duration }).where(eq(schema.meetings.id, id));
        found = 1;
      }
    } catch (e) {
      console.error("Recording lookup failed", e instanceof DailyError ? `${e.status} ${e.info}` : e);
      redirect(`/admin/meetings/${id}?video=failed#video`);
    }
  }
  redirect(`/admin/meetings/${id}?${found ? "saved=1" : "norecording=1"}#video`);
}

export async function deleteMeeting(form: FormData) {
  await guard();
  const id = Number(form.get("id"));
  if (id) {
    // Minutes, a recording or attendance are the union's record. Such a meeting can be cancelled but not deleted.
    const [kept] = await getDb()
      .select({ id: schema.meetings.id })
      .from(schema.meetings)
      .where(and(eq(schema.meetings.id, id), sql`(minutes_url is not null or minutes_text is not null or recording_url is not null or resolutions_en is not null or resolutions_hi is not null or exists (select 1 from meeting_invitees i where i.meeting_id = meetings.id and i.attended))`))
      .limit(1);
    if (kept) redirect(`/admin/meetings/${id}?error=kept`);
    const [row] = await getDb().delete(schema.meetings).where(eq(schema.meetings.id, id)).returning({ minutesUrl: schema.meetings.minutesUrl, noticeUrl: schema.meetings.noticeUrl, roomName: schema.meetings.roomName });
    await deleteBlobs([row?.minutesUrl, row?.noticeUrl]);
    if (row?.roomName) await deleteRoom(row.roomName).catch(() => {});
    updateTag("meetings");
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
      resolutionsEn: str(form, "resolutionsEn", 10000) || null,
      resolutionsHi: str(form, "resolutionsHi", 10000) || null,
      recordingUrl: str(form, "recordingUrl", 600) || null,
      notes: str(form, "notes", 5000) || null,
      status,
      updatedAt: new Date(),
    })
    .where(eq(schema.meetings.id, id));
  if (before.minutesUrl && before.minutesUrl !== minutesUrl) await deleteBlobs([before.minutesUrl]);
  updateTag("meetings");
  const video = status === "completed" ? "ok" : await syncRoom(id);
  redirect(`/admin/meetings/${id}?saved=1${video === "failed" ? "&video=failed" : ""}#record`);
}

const cleanMobile = (v: string) => {
  const d = v.replace(/[^\d+]/g, "");
  return d.replace(/\D/g, "").length >= 10 ? d.slice(0, 16) : "";
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

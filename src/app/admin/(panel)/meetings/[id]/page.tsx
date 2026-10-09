import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { fmtWhen, meetingState, MODES, relative, reminderOffsets, RSVPS, toIst } from "@/lib/meetings";
import UploadField from "../../../UploadField";
import { DeleteButton, SubmitButton } from "../../../SubmitButton";
import { Card, Field, Notice, PageTitle, inputCls, td, th } from "../../../ui";
import { CopyAll, SendButtons } from "./InviteeLinks";
import { addInvitees, addOfficeBearers, deleteMeeting, removeInvitees, saveAttendance, saveMeeting, saveRecord } from "../actions";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Meeting" };

const ERRORS: Record<string, string> = {
  required: "Title, start time and end time are required.",
  time: "The meeting must end after it starts.",
  kept: "This meeting has minutes, a recording or attendance, so it is kept as a record. Set it to Cancelled or Completed instead of deleting it.",
};

const minutesLabel = (m: number) => (m % 1440 === 0 ? `${m / 1440} day${m === 1440 ? "" : "s"}` : m % 60 === 0 ? `${m / 60} hour${m === 60 ? "" : "s"}` : `${m} minutes`);

export default async function EditMeeting({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin(["super_admin"]);
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  if (!isNew && !/^\d+$/.test(id)) notFound();
  const db = getDb();
  const [m] = isNew ? [] : await db.select().from(schema.meetings).where(eq(schema.meetings.id, Number(id))).limit(1);
  if (!isNew && !m) notFound();

  const [types, divisions, invitees, offsets] = await Promise.all([
    db.select().from(schema.meetingTypes).where(eq(schema.meetingTypes.active, true)).orderBy(asc(schema.meetingTypes.sort)),
    db.select().from(schema.divisions).orderBy(asc(schema.divisions.sort)),
    isNew ? [] : db.select().from(schema.meetingInvitees).where(eq(schema.meetingInvitees.meetingId, Number(id))).orderBy(asc(schema.meetingInvitees.id)),
    reminderOffsets(),
  ]);
  const now = new Date();
  const state = m ? meetingState(m, now) : null;
  const hasRecord = Boolean(m && (m.minutesUrl || m.minutesText || m.recordingUrl || invitees.some((i) => i.attended)));
  const count = { yes: invitees.filter((i) => i.rsvp === "yes").length, attended: invitees.filter((i) => i.attended).length };
  // A new meeting starts at the next full hour and runs for an hour.
  const nextHour = new Date(Math.ceil(now.getTime() / 3600000) * 3600000);
  // each person gets a link in Hindi when the meeting has a Hindi title, otherwise in English
  const linkLang = m?.titleHi ? "hi" : "en";
  const whenText = m ? fmtWhen(m.startsAt) + " (IST)" : "";

  return (
    <>
      <PageTitle
        title={isNew ? "Schedule a meeting" : m.titleEn}
        sub={m ? `${fmtWhen(m.startsAt)} · ${state === "live" ? "Live now" : state === "upcoming" ? relative(m.startsAt, now) : state === "cancelled" ? "Cancelled" : state === "completed" ? "Completed" : "Time is over, mark it completed"}` : undefined}
        action={<Link href="/admin/meetings" className="inline-block py-2 text-sm font-semibold text-brand">← All meetings</Link>}
      />
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.added && <Notice>{Number(sp.added) ? `${sp.added} ${Number(sp.added) === 1 ? "person" : "people"} added.` : "Nobody new to add. They are already in the list."}</Notice>}
      {sp.error && <Notice kind="err">{ERRORS[sp.error] ?? "Please check the form."}</Notice>}

      <form action={saveMeeting} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <input type="hidden" name="id" value={isNew ? "" : id} />
        <Card className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field label="Title (English)"><input name="titleEn" required defaultValue={m?.titleEn} className={inputCls} /></Field>
          <Field label="Title (Hindi)"><input name="titleHi" defaultValue={m?.titleHi ?? ""} className={inputCls} /></Field>
          <Field label="Starts (India time)"><input type="datetime-local" name="startsAt" required defaultValue={toIst(m?.startsAt ?? nextHour)} className={inputCls} /></Field>
          <Field label="Ends (India time)"><input type="datetime-local" name="endsAt" required defaultValue={toIst(m?.endsAt ?? new Date(nextHour.getTime() + 3600000))} className={inputCls} /></Field>
          <Field label="Kind of meeting">
            <select name="typeId" defaultValue={m?.typeId ?? ""} className={inputCls}>
              <option value="">Not specified</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.nameEn}</option>)}
            </select>
          </Field>
          <Field label="Who is it for" hint="Leave on the whole union for a central meeting.">
            <select name="divisionId" defaultValue={m?.divisionId ?? ""} className={inputCls}>
              <option value="">Whole union</option>
              {divisions.map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
            </select>
          </Field>
          <Field label="How it is held">
            <select name="mode" defaultValue={m?.mode ?? "online"} className={inputCls}>
              {MODES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-3 self-end pb-3 text-sm font-semibold">
            <input type="checkbox" name="recordingOn" defaultChecked={m?.recordingOn ?? true} className="h-6 w-6" /> Record the video call
          </label>
          <Field label="Venue (English)" hint="For in-person and both."><input name="venueEn" defaultValue={m?.venueEn ?? ""} className={inputCls} /></Field>
          <Field label="Venue (Hindi)"><input name="venueHi" defaultValue={m?.venueHi ?? ""} className={inputCls} /></Field>
          <Field label="Agenda (English)" hint="One point per line."><textarea name="agendaEn" rows={6} defaultValue={m?.agendaEn ?? ""} className={inputCls} /></Field>
          <Field label="Agenda (Hindi)"><textarea name="agendaHi" rows={6} defaultValue={m?.agendaHi ?? ""} className={inputCls} /></Field>
        </Card>
        <Card className="space-y-5 self-start">
          <div>
            <p className="text-sm font-semibold">Reminders</p>
            <p className="mt-1 text-sm text-muted">
              {offsets.length ? `Due ${offsets.map(minutesLabel).join(", ")} before the meeting.` : "No reminders are set."} You can change this in Site text.
            </p>
          </div>
          <SubmitButton className="btn-primary w-full px-6 py-3">{isNew ? "Schedule meeting" : "Save"}</SubmitButton>
          {isNew && <p className="text-sm text-muted">After saving you can invite people and, later, record the minutes.</p>}
        </Card>
      </form>

      {m && (
        <>
          <Card className="mt-8" >
            <h2 id="people" className="font-display text-2xl font-bold">Invitees ({invitees.length})</h2>
            <p className="mt-1 text-sm text-muted">{count.yes} coming · {count.attended} attended</p>

            <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <form action={addOfficeBearers} className="space-y-3">
                <input type="hidden" name="meetingId" value={m.id} />
                <Field label="Invite office bearers" hint="Adds every active office bearer of the group you choose.">
                  <select name="group" className={inputCls} defaultValue={m.divisionId ?? "central"}>
                    <option value="central">Central office bearers</option>
                    {divisions.map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
                  </select>
                </Field>
                <SubmitButton className="rounded-full border-2 border-ink px-5 py-2.5 font-semibold hover:bg-ink hover:text-white">Add them</SubmitButton>
              </form>
              <form action={addInvitees} className="space-y-3">
                <input type="hidden" name="meetingId" value={m.id} />
                <Field label="Invite other people" hint="One per line: name, mobile, email. Mobile and email are optional.">
                  <textarea name="people" rows={4} placeholder={"Sh. Name Surname, 9876543210, name@example.com"} className={inputCls} />
                </Field>
                <SubmitButton className="rounded-full border-2 border-ink px-5 py-2.5 font-semibold hover:bg-ink hover:text-white">Add to list</SubmitButton>
              </form>
            </div>

            {invitees.length > 0 && (
              <form action={saveAttendance} className="mt-8">
                <input type="hidden" name="meetingId" value={m.id} />
                <div className="overflow-x-auto border border-line">
                  <table className="w-full text-[0.95rem]">
                    <thead className="border-b border-line bg-paper"><tr><th className={th}>Name</th><th className={th}>Mobile</th><th className={th}>Reply</th><th className={th}>Attended</th><th className={th}>Send the link</th><th className={th}>Remove</th></tr></thead>
                    <tbody className="divide-y divide-line">
                      {invitees.map((i) => (
                        <tr key={i.id}>
                          <td className={td}>
                            <input type="hidden" name="ids" value={i.id} />
                            <p className="font-semibold">{i.name}</p>
                            {i.designation && <p className="text-sm text-muted">{i.designation}</p>}
                          </td>
                          <td className={`${td} whitespace-nowrap text-sm`}>{i.mobile ?? <span className="text-muted">-</span>}</td>
                          <td className={td}>
                            <select name={`rsvp_${i.id}`} defaultValue={i.rsvp} aria-label={`Reply of ${i.name}`} className="rounded-lg border-2 border-line bg-white px-2 py-2 text-base lg:py-1 lg:text-sm">
                              {RSVPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </td>
                          <td className={td}><label className="grid h-11 w-11 cursor-pointer place-items-center"><input type="checkbox" name={`attended_${i.id}`} defaultChecked={i.attended} aria-label={`${i.name} attended`} className="h-6 w-6" /></label></td>
                          <td className={td}><SendButtons person={{ name: i.name, token: i.joinToken, mobile: i.mobile }} lang={linkLang} title={m.titleHi || m.titleEn} when={whenText} /></td>
                          <td className={td}><label className="grid h-11 w-11 cursor-pointer place-items-center"><input type="checkbox" name="remove" value={i.id} aria-label={`Remove ${i.name}`} className="h-6 w-6" /></label></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <SubmitButton className="btn-primary px-6 py-2.5">Save replies and attendance</SubmitButton>
                  <CopyAll people={invitees.map((i) => ({ name: i.name, token: i.joinToken, mobile: i.mobile }))} lang={linkLang} />
                  <button formAction={removeInvitees} className="rounded-full border-2 border-brand px-5 py-2.5 text-sm font-semibold text-brand hover:bg-brand hover:text-white">Remove ticked people</button>
                </div>
              </form>
            )}
          </Card>

          <form action={saveRecord} className="mt-8">
            <input type="hidden" name="id" value={m.id} />
            <Card className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <h2 id="record" className="font-display text-2xl font-bold sm:col-span-2">Record of the meeting</h2>
              <Field label="What happened">
                <select name="status" defaultValue={m.status} className={inputCls}>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>
              <Field label="Link to the recording" hint="Filled in automatically once video calls are connected; you can also paste a link."><input name="recordingUrl" defaultValue={m.recordingUrl ?? ""} className={inputCls} /></Field>
              <div className="sm:col-span-2"><UploadField name="minutes" label="Minutes (PDF or Word)" kind="document" folder="meetings" initial={m.minutesUrl ? [m.minutesUrl] : []} /></div>
              <Field label="Minutes in text" className="sm:col-span-2"><textarea name="minutesText" rows={8} defaultValue={m.minutesText ?? ""} className={inputCls} /></Field>
              <Field label="Private notes" hint="Only you can see these." className="sm:col-span-2"><textarea name="notes" rows={3} defaultValue={m.notes ?? ""} className={inputCls} /></Field>
              <div className="sm:col-span-2"><SubmitButton className="btn-primary px-6 py-3">Save the record</SubmitButton></div>
            </Card>
          </form>

          {hasRecord ? (
            <p className="mt-6 text-sm text-muted">This meeting has a record (minutes, recording or attendance), so it cannot be deleted. Use "Cancelled" or "Completed" above.</p>
          ) : (
            <form action={deleteMeeting} className="mt-6">
              <input type="hidden" name="id" value={m.id} />
              <DeleteButton label="Delete this meeting" confirmText="Delete this meeting and its invitee list permanently?" />
            </form>
          )}
        </>
      )}
    </>
  );
}

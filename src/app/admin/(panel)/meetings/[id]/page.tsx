import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { videoConfigured } from "@/lib/agora";
import { fmtTime, fmtWhen, meetingState, MODES, relative, reminderOffsets, RSVPS, toIst } from "@/lib/meetings";
import UploadField from "../../../UploadField";
import OtherLanguages from "../../../OtherLanguages";
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
  long: "A meeting can be at most 12 hours long. For a longer event, schedule it in parts.",
  type: "Choose the kind of meeting (for example Standing Committee).",
  agenda: "The agenda is required. Write at least one point.",
  venue: "A venue is required when the meeting is in person or both.",
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
  const hasRecord = Boolean(m && (m.minutesUrl || m.minutesText || m.recordingUrl || m.resolutionsEn || m.resolutionsHi || invitees.some((i) => i.attended)));
  const count = { yes: invitees.filter((i) => i.rsvp === "yes").length, attended: invitees.filter((i) => i.attended).length };
  // A new meeting starts at the next full hour and runs for an hour.
  const nextHour = new Date(Math.ceil(now.getTime() / 3600000) * 3600000);
  // each person gets a link in Hindi when the meeting has a Hindi title, otherwise in English
  const linkLang = m?.titleHi ? "hi" : "en";
  const whenText = m ? fmtWhen(m.startsAt) + " (IST, UTC+5:30)" : "";

  const canHost = Boolean(m) && m!.mode !== "in_person" && m!.status === "scheduled" && videoConfigured() && now.getTime() >= m!.startsAt.getTime() - 3600000 && now.getTime() <= m!.endsAt.getTime() + 3600000;
  const statusText = !m ? "" : state === "live" ? "Live now" : state === "upcoming" ? `Starts ${relative(m.startsAt, now)}` : state === "cancelled" ? "Cancelled" : state === "completed" ? "Completed" : "Time is over. Mark it completed in step 3.";
  const section = "font-display text-2xl font-bold sm:col-span-2";
  const step = "mb-3 mt-10 flex items-center gap-3 font-display text-2xl font-bold";
  const stepNo = "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-base text-light";

  return (
    <>
      <PageTitle
        title={isNew ? "Schedule a meeting" : m.titleEn}
        sub={m ? fmtWhen(m.startsAt) : "Fill in the details below and press Schedule meeting."}
        action={<Link href="/admin/meetings" className="inline-block py-2 text-sm font-semibold text-brand">← All meetings</Link>}
      />
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.added && <Notice>{Number(sp.added) ? `${sp.added} ${Number(sp.added) === 1 ? "person" : "people"} added.` : "Nobody new to add. They are already in the list."}</Notice>}
      {sp.error && <Notice kind="err">{ERRORS[sp.error] ?? "Please check the form."}</Notice>}

      {m && (
        <section aria-label="Meeting status" className={`mb-8 border-2 bg-white p-5 sm:p-6 ${state === "live" ? "border-brand" : "border-line"}`}>
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className={`inline-block rounded-full px-3 py-1 text-sm font-bold ${state === "live" ? "bg-brand text-white" : "bg-soft/60 text-ink"}`}>{statusText}</p>
              <p className="mt-2 text-muted">
                {invitees.length ? `${invitees.length} invited · ${count.yes} coming · ${count.attended} joined` : "Nobody is invited yet. Add people in step 2."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {canHost && (
                <a href={`/admin/meetings/${m.id}/room`} className="btn-primary inline-flex min-h-14 items-center px-8 text-lg">
                  ▶ Join video call
                </a>
              )}
              <form action={deleteMeeting}>
                <input type="hidden" name="id" value={m.id} />
                <DeleteButton
                  label="Delete meeting"
                  confirmText={hasRecord ? "This meeting has minutes, a recording link or attendance. Deleting it removes all of that permanently. Delete it anyway?" : "Delete this meeting and its invitee list permanently?"}
                />
              </form>
            </div>
          </div>
          {m.mode !== "in_person" && (
            <p className="mt-4 text-sm text-muted">
              {!videoConfigured()
                ? "The video service is not set up on this site yet, so there is no call."
                : m.status !== "scheduled"
                  ? "The call is closed because the meeting is not scheduled any more."
                  : canHost
                    ? "Press Join video call to start. Invitees can come in from 15 minutes before the start, using their own link. The call is not recorded by the site."
                    : "The Join video call button appears here an hour before the meeting starts. Invitees can join from 15 minutes before the start, using their own link."}
            </p>
          )}
          <nav aria-label="Steps" className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4 text-sm font-semibold">
            <a href="#details" className="rounded-full border-2 border-line px-4 py-2 hover:border-ink">1. Details</a>
            <a href="#people" className="rounded-full border-2 border-line px-4 py-2 hover:border-ink">2. Invitees</a>
            <a href="#record" className="rounded-full border-2 border-line px-4 py-2 hover:border-ink">3. After the meeting</a>
          </nav>
        </section>
      )}

      <h2 id="details" className={step}>
        {!isNew && <span className={stepNo}>1</span>} Meeting details
      </h2>
      <form action={saveMeeting}>
        <input type="hidden" name="id" value={isNew ? "" : id} />
        <Card className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <h3 className={section}>What is it</h3>
          <Field label="Title (English) *"><input name="titleEn" required maxLength={300} defaultValue={m?.titleEn} className={inputCls} /></Field>
          <Field label="Title (Hindi)"><input name="titleHi" defaultValue={m?.titleHi ?? ""} className={inputCls} /></Field>
          <Field label="Kind of meeting *">
            <select name="typeId" required defaultValue={m?.typeId ?? ""} className={inputCls}>
              <option value="">Choose…</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.nameEn}</option>)}
            </select>
          </Field>
          <Field label="Who is it for" hint="Leave on the whole union for a central meeting.">
            <select name="divisionId" defaultValue={m?.divisionId ?? ""} className={inputCls}>
              <option value="">Whole union</option>
              {divisions.map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
            </select>
          </Field>

          <h3 className={`${section} border-t border-line pt-5`}>When and where</h3>
          <Field label="Starts (India time) *"><input type="datetime-local" name="startsAt" required defaultValue={toIst(m?.startsAt ?? nextHour)} className={inputCls} /></Field>
          <Field label="Ends (India time) *"><input type="datetime-local" name="endsAt" required defaultValue={toIst(m?.endsAt ?? new Date(nextHour.getTime() + 3600000))} className={inputCls} /></Field>
          <Field label="How it is held" hint="Online meetings get a video call on this site.">
            <select name="mode" defaultValue={m?.mode ?? "online"} className={inputCls}>
              {MODES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <div className="hidden sm:block" />
          <Field label="Venue (English)" hint="Needed for in-person and both."><input name="venueEn" defaultValue={m?.venueEn ?? ""} className={inputCls} /></Field>
          <Field label="Venue (Hindi)"><input name="venueHi" defaultValue={m?.venueHi ?? ""} className={inputCls} /></Field>

          <h3 className={`${section} border-t border-line pt-5`}>Agenda</h3>
          <Field label="Agenda (English) *" hint="One point per line."><textarea name="agendaEn" required rows={6} defaultValue={m?.agendaEn ?? ""} className={inputCls} /></Field>
          <Field label="Agenda (Hindi)"><textarea name="agendaHi" rows={6} defaultValue={m?.agendaHi ?? ""} className={inputCls} /></Field>
          <OtherLanguages
            className="sm:col-span-2"
            fields={[{ name: "title", label: "Title" }, { name: "venue", label: "Venue" }, { name: "agenda", label: "Agenda", rows: 4 }]}
            value={m?.i18n}
          />

          <h3 className={`${section} border-t border-line pt-5`}>Notice and website</h3>
          <div className="sm:col-span-2"><UploadField name="notice" label="Notice of the meeting (PDF or Word)" kind="document" folder="meetings" initial={m?.noticeUrl ? [m.noticeUrl] : []} /></div>
          <label className="flex items-start gap-3 font-semibold sm:col-span-2">
            <input type="checkbox" name="isPublic" defaultChecked={m?.isPublic ?? false} className="mt-0.5 h-6 w-6 shrink-0" />
            <span>
              Show on the public website
              <span className="mt-1 block text-sm font-normal text-muted">Visitors then see the title, date, place, notice, agenda, resolutions and minutes under Meetings. The invitee list and attendance always stay private. Leave this off for a private meeting.</span>
            </span>
          </label>

          <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap items-center gap-4 border-t border-line bg-white px-5 py-4 sm:-mx-6 sm:-mb-6 sm:col-span-2 sm:px-6">
            <SubmitButton className="btn-primary min-h-12 px-10 text-lg">{isNew ? "Schedule meeting" : "Save changes"}</SubmitButton>
            <p className="text-sm text-muted">
              {offsets.length ? `Reminders go out ${offsets.map(minutesLabel).join(", ")} before the meeting.` : "No reminders are set."}
            </p>
          </div>
        </Card>
      </form>

      {m && (
        <>
          <h2 id="people" className={step}><span className={stepNo}>2</span> Invitees ({invitees.length})</h2>
          <Card>
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
                <Field label="Invite other people" hint="One per line: name, mobile, email. Mobile and email are optional. For a number outside India start with + and the country code, like +44 7911 123456.">
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
                            {i.joinedAt && <p className="text-sm font-semibold text-brand-deep">Pressed Join at {fmtTime(i.joinedAt)}</p>}
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
              <h2 id="record" className={`${step} sm:col-span-2`}><span className={stepNo}>3</span> After the meeting: minutes and record</h2>
              <Field label="What happened">
                <select name="status" defaultValue={m.status} className={inputCls}>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>
              <Field label="Link to the recording" hint="Paste the link to a recording made elsewhere."><input name="recordingUrl" defaultValue={m.recordingUrl ?? ""} className={inputCls} /></Field>
              <div className="sm:col-span-2"><UploadField name="minutes" label="Minutes (PDF or Word)" kind="document" folder="meetings" initial={m.minutesUrl ? [m.minutesUrl] : []} /></div>
              <Field label="Minutes in text" className="sm:col-span-2"><textarea name="minutesText" rows={8} defaultValue={m.minutesText ?? ""} className={inputCls} /></Field>
              <Field label="Resolutions (English)" hint="One resolution per line. Shown publicly only when the meeting is public."><textarea name="resolutionsEn" rows={5} defaultValue={m.resolutionsEn ?? ""} className={inputCls} /></Field>
              <Field label="Resolutions (Hindi)"><textarea name="resolutionsHi" rows={5} defaultValue={m.resolutionsHi ?? ""} className={inputCls} /></Field>
              <OtherLanguages className="sm:col-span-2" fields={[{ name: "resolutions", label: "Resolutions", rows: 4 }]} value={m.i18n} />
              <Field label="Private notes" hint="Only you can see these." className="sm:col-span-2"><textarea name="notes" rows={3} defaultValue={m.notes ?? ""} className={inputCls} /></Field>
              <div className="sm:col-span-2"><SubmitButton className="btn-primary px-6 py-3">Save the record</SubmitButton></div>
            </Card>
          </form>

        </>
      )}
    </>
  );
}

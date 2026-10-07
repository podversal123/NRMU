import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import UploadField from "../../../UploadField";
import { DeleteButton, SubmitButton } from "../../../SubmitButton";
import { Card, Field, Notice, PageTitle, inputCls } from "../../../ui";
import { deleteEvent, saveEvent } from "../actions";

export const metadata = { title: "Edit event" };

/** "2026-11-02T10:30" in India time, for the datetime field. */
const local = (d: Date | null | undefined) =>
  d ? new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 16) : "";

export default async function EditEvent({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  await requireAdmin(["super_admin", "editor"]);
  const { id } = await params;
  const sp = await searchParams;
  const isNew = id === "new";
  if (!isNew && !/^\d+$/.test(id)) notFound();
  const db = getDb();
  const [ev] = isNew ? [] : await db.select().from(schema.events).where(eq(schema.events.id, Number(id))).limit(1);
  if (!isNew && !ev) notFound();
  const divisions = await db.select().from(schema.divisions).orderBy(asc(schema.divisions.sort));

  return (
    <>
      <PageTitle title={isNew ? "Add event" : ev.titleEn} action={<Link href="/admin/events" className="text-sm font-semibold text-brand">← All events</Link>} />
      {sp.saved && <Notice>Saved. The public website is updated.</Notice>}
      {sp.error && <Notice kind="err">Title and start date are required.</Notice>}
      <form action={saveEvent} className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <input type="hidden" name="id" value={isNew ? "" : id} />
        <Card className="grid gap-5 sm:grid-cols-2">
          <Field label="Title (English)"><input name="titleEn" required defaultValue={ev?.titleEn} className={inputCls} /></Field>
          <Field label="Title (Hindi)"><input name="titleHi" defaultValue={ev?.titleHi ?? ""} className={inputCls} /></Field>
          <Field label="Starts (India time)"><input type="datetime-local" name="startsAt" required defaultValue={local(ev?.startsAt)} className={inputCls} /></Field>
          <Field label="Ends (optional)"><input type="datetime-local" name="endsAt" defaultValue={local(ev?.endsAt)} className={inputCls} /></Field>
          <Field label="Venue (English)"><input name="venueEn" defaultValue={ev?.venueEn ?? ""} className={inputCls} /></Field>
          <Field label="Venue (Hindi)"><input name="venueHi" defaultValue={ev?.venueHi ?? ""} className={inputCls} /></Field>
          <Field label="Details (English)"><textarea name="descriptionEn" rows={5} defaultValue={ev?.descriptionEn ?? ""} className={inputCls} /></Field>
          <Field label="Details (Hindi)"><textarea name="descriptionHi" rows={5} defaultValue={ev?.descriptionHi ?? ""} className={inputCls} /></Field>
          <UploadField name="agenda" label="Agenda (PDF)" accept=".pdf,.doc,.docx" folder="events" initial={ev?.agendaUrl ? [ev.agendaUrl] : []} />
          <UploadField name="minutes" label="Minutes (PDF), add after the meeting" accept=".pdf,.doc,.docx" folder="events" initial={ev?.minutesUrl ? [ev.minutesUrl] : []} />
        </Card>
        <Card className="space-y-5">
          <Field label="Division" hint="Leave empty for an event of the whole union.">
            <select name="divisionId" defaultValue={ev?.divisionId ?? ""} className={inputCls}>
              <option value="">All divisions</option>
              {divisions.map((d) => <option key={d.id} value={d.id}>{d.nameEn}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" name="published" defaultChecked={ev?.published ?? true} className="h-5 w-5" /> Show on website</label>
          <SubmitButton className="btn-gold w-full px-6 py-3">Save</SubmitButton>
        </Card>
      </form>
      {!isNew && (
        <form action={deleteEvent} className="mt-6">
          <input type="hidden" name="id" value={id} />
          <DeleteButton label="Delete this event" confirmText="Delete this event permanently?" />
        </form>
      )}
    </>
  );
}

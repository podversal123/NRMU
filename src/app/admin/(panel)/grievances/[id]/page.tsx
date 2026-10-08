import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, sql } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { SubmitButton } from "../../../SubmitButton";
import { Card, Field, Notice, PageTitle, inputCls } from "../../../ui";
import { addNote, setLevel, setStatus } from "../actions";

// Always depends on the signed-in admin, so it is rendered per request.
export const instant = false;
export const metadata = { title: "Grievance" };
const STATUS: Record<string, string> = { open: "Open", in_progress: "In progress", resolved: "Resolved", closed: "Closed" };

export default async function GrievanceDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  const db = getDb();
  const [row] = await db
    .select({ g: schema.grievances, division: schema.divisions.nameEn, type: schema.grievanceTypes.nameEn })
    .from(schema.grievances)
    .leftJoin(schema.divisions, eq(schema.divisions.id, schema.grievances.divisionId))
    .leftJoin(schema.grievanceTypes, eq(schema.grievanceTypes.id, schema.grievances.typeId))
    .where(eq(schema.grievances.id, Number(id)))
    .limit(1);
  if (!row) notFound();
  const { g } = row;
  if (admin.role === "division_admin" && g.divisionId !== admin.divisionId) notFound();

  const [events, settings] = await Promise.all([
    db.select({ e: schema.grievanceEvents, by: schema.adminUsers.name }).from(schema.grievanceEvents).leftJoin(schema.adminUsers, eq(schema.adminUsers.id, schema.grievanceEvents.adminId)).where(eq(schema.grievanceEvents.grievanceId, g.id)).orderBy(asc(schema.grievanceEvents.createdAt), asc(schema.grievanceEvents.id)),
    db.select().from(schema.siteSettings).where(sql`${schema.siteSettings.key} like 'grievance.level.%'`),
  ]);
  const levelName = (n: number | string | null) => settings.find((x) => x.key === `grievance.level.${n}`)?.valueEn ?? String(n);
  const canAct = admin.role !== "division_admin" || g.level === 1;
  const when = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" });

  return (
    <>
      <PageTitle title={g.ticket} sub={g.subject} action={<Link href="/admin/grievances" className="inline-block py-2 text-sm font-semibold text-brand">← All grievances</Link>} />
      {sp.saved && <Notice>Saved.</Notice>}
      {sp.denied && <Notice kind="err">This grievance has moved to a higher level; you can no longer change it.</Notice>}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card>
            <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div><dt className="text-sm text-muted">Member</dt><dd className="font-semibold">{g.name}</dd></div>
              <div><dt className="text-sm text-muted">Mobile</dt><dd><a href={`tel:${g.mobile}`} className="font-semibold text-brand">{g.mobile}</a></dd></div>
              {g.email && <div><dt className="text-sm text-muted">Email</dt><dd>{g.email}</dd></div>}
              {g.employeeId && <div><dt className="text-sm text-muted">Employee ID</dt><dd>{g.employeeId}</dd></div>}
              <div><dt className="text-sm text-muted">Division</dt><dd>{row.division ?? "–"}</dd></div>
              <div><dt className="text-sm text-muted">Type</dt><dd>{row.type ?? "–"}</dd></div>
            </dl>
            <p className="mt-6 whitespace-pre-wrap border-t border-line pt-5 leading-relaxed">{g.details}</p>
          </Card>

          <Card>
            <h2 className="font-display text-2xl font-bold">Progress</h2>
            <ol className="mt-5 border-l border-line">
              {events.map(({ e, by }) => (
                <li key={e.id} className="relative pb-5 pl-6 last:pb-0">
                  <span className={`absolute -left-[5px] top-2 h-2.5 w-2.5 rounded-full ${e.public ? "bg-signal" : "bg-muted"}`} />
                  <p className="text-sm text-muted">{when(e.createdAt)}{by ? ` · ${by}` : ""}{!e.public ? " · private" : ""}</p>
                  <p className="font-medium">
                    {e.kind === "created" && `Registered, with ${levelName(e.value)}`}
                    {e.kind === "status" && `Status: ${STATUS[e.value ?? ""] ?? e.value}`}
                    {e.kind === "level" && `Passed to ${levelName(e.value)}`}
                    {e.kind === "escalated" && `Passed up automatically to ${levelName(e.value)}`}
                    {e.kind === "note" && e.message}
                  </p>
                  {e.kind !== "note" && e.message && <p className="text-muted">{e.message}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <p className="text-sm text-muted">Status</p>
            <p className="font-display text-3xl font-semibold">{STATUS[g.status]}</p>
            <p className="mt-3 text-sm text-muted">Currently with</p>
            <p className="font-semibold">{levelName(g.level)}</p>
          </Card>
          {canAct ? (
            <>
              <Card>
                <form action={setStatus} className="space-y-4">
                  <input type="hidden" name="id" value={g.id} />
                  <Field label="Change status">
                    <select name="status" defaultValue={g.status} className={inputCls}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  </Field>
                  <Field label="Message to the member (optional)"><textarea name="message" rows={2} className={inputCls} /></Field>
                  <SubmitButton>Update status</SubmitButton>
                </form>
              </Card>
              <Card>
                <form action={setLevel} className="space-y-4">
                  <input type="hidden" name="id" value={g.id} />
                  <Field label="Pass to">
                    <select name="level" defaultValue={String(g.level)} className={inputCls}>
                      {[1, 2, 3].filter((n) => admin.role !== "division_admin" || n === 2 || n === g.level).map((n) => <option key={n} value={n}>{levelName(n)}</option>)}
                    </select>
                  </Field>
                  <SubmitButton className="rounded-full bg-ink px-6 py-2.5 font-semibold text-light hover:bg-brand">Pass on</SubmitButton>
                </form>
              </Card>
              <Card>
                <form action={addNote} className="space-y-4">
                  <input type="hidden" name="id" value={g.id} />
                  <Field label="Add a note"><textarea name="message" rows={3} required className={inputCls} /></Field>
                  <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" name="public" className="h-6 w-6" /> Show this note to the member</label>
                  <SubmitButton className="rounded-full bg-ink px-6 py-2.5 font-semibold text-light hover:bg-brand">Add note</SubmitButton>
                </form>
              </Card>
            </>
          ) : (
            <Notice>This grievance is with a higher level. You can view it but not change it.</Notice>
          )}
        </div>
      </div>
    </>
  );
}
